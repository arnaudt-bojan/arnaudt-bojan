import 'reflect-metadata'; // Required for class-validator decorators
import express, { type Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importQueue } from "./import-queue";
import { processShopifyImport } from "./adapters/shopify";
import { importSources } from "@shared/schema";
import { 
  securityHeadersMiddleware, 
  sanitizeInputMiddleware
} from "./security";
import { 
  globalRateLimitMiddleware,
  authRateLimitMiddleware,
  userRateLimitMiddleware
} from "./middleware/rate-limit.middleware";
import { initializeRateLimiter, getRateLimiter } from "./rate-limiter";
import { ReservationCleanupJob } from "./jobs/cleanup-reservations";
import { WholesaleBalanceReminderJob } from "./jobs/wholesale-balance-reminder.job";
import { DeliveryReminderService } from "./services/delivery-reminder.service";
import { ResendEmailProvider } from "./services/email-provider.service";
import { storage } from "./storage";
import { ConfigurationError } from "./errors";
import { createNotificationService } from "./notifications";
import { MetaJobScheduler } from "./services/meta/job-scheduler.service";
import { AnalyticsService } from "./services/meta/analytics.service";
import { BudgetService } from "./services/meta/budget.service";
import { MetaOAuthService } from "./services/meta/meta-oauth.service";
import { ShippoLabelService } from "./services/shippo-label.service";
import { domainMiddleware } from "./middleware/domain";
import { startDomainStatusChecker } from "./jobs/domain-status-checker";
import { proxyMiddleware, logProxyStats } from "./middleware/proxy.middleware";
import { featureFlagsService } from "./services/feature-flags.service";
import { correlationMiddleware } from "./middleware/correlation.middleware";
import Stripe from "stripe";
import { prisma } from "./prisma";
import { initializeCache, getCache } from "./cache";

const app = express();

// Trust proxy if behind load balancer (for rate limiting by real IP)
app.set('trust proxy', true);

// Security headers - apply to all routes
app.use(securityHeadersMiddleware);

// File upload middleware (must come before JSON parsing to handle multipart/form-data)
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size exceeds the 10MB limit',
  useTempFiles: false,
  debug: false,
}));

// Stripe webhooks need raw body for signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/api/webhooks/stripe/wholesale', express.raw({ type: 'application/json', limit: '10mb' }));

// Regular JSON parsing for all other routes with built-in size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Input sanitization - remove dangerous characters (skips raw buffers)
app.use(sanitizeInputMiddleware);

// Correlation ID middleware - establishes request context with X-Request-ID
// Mount early to ensure correlation ID available for all downstream middleware
app.use(correlationMiddleware);

// NOTE: Rate limiting middleware will be applied after routes are registered
// This allows health endpoints to be exempt from rate limiting

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ====================================================================
// HEALTH CHECK ENDPOINTS (for Docker/Kubernetes/load balancer probes)
// ====================================================================

/**
 * Basic Health Check
 * GET /api/health
 * 
 * Always returns 200 if server is running.
 * Used for load balancer health checks.
 */
app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'express-api',
  });
});

/**
 * Detailed Health Check
 * GET /api/health/detailed
 * 
 * Checks multiple subsystems:
 * - Database connectivity (Prisma query test)
 * - Cache service availability (test set/get)
 * - External services (Stripe, Resend connectivity)
 * 
 * Returns 200 if all critical services up
 * Returns 503 if any critical service down
 */
app.get('/api/health/detailed', async (_req, res) => {
  const appStartTime = Date.now();
  const checks: any = {};

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'up',
      responseTime: Date.now() - dbStart,
    };
  } catch (error: any) {
    checks.database = {
      status: 'down',
      error: error.message,
    };
  }

  // Check cache service
  const cacheStart = Date.now();
  try {
    const cache = getCache();
    const testKey = 'health-check-test';
    const testValue = 'ok';
    
    await cache.set(testKey, testValue, 10);
    const retrieved = await cache.get(testKey);
    
    if (retrieved !== testValue) {
      throw new Error('Cache value mismatch');
    }
    
    await cache.delete(testKey);
    
    checks.cache = {
      status: 'up',
      responseTime: Date.now() - cacheStart,
    };
  } catch (error: any) {
    checks.cache = {
      status: 'down',
      error: error.message,
    };
  }

  // Check Stripe (optional)
  if (process.env.STRIPE_SECRET_KEY) {
    checks.stripe = { status: 'up' };
  } else {
    checks.stripe = {
      status: 'down',
      error: 'Stripe not configured',
    };
  }

  // Check Resend email (optional)
  if (process.env.RESEND_API_KEY) {
    checks.email = { status: 'up' };
  } else {
    checks.email = {
      status: 'down',
      error: 'Email service not configured',
    };
  }

  // Determine overall status
  const criticalServices = [checks.database, checks.cache];
  const allUp = Object.values(checks).every((c: any) => c.status === 'up');
  const criticalUp = criticalServices.every(c => c.status === 'up');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (allUp) {
    status = 'healthy';
  } else if (criticalUp) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  const statusCode = status === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * Readiness Check
 * GET /api/health/ready
 * 
 * Checks if application is ready to accept traffic.
 * Verifies:
 * - Database connectivity
 * - Required env vars present
 * - All modules initialized
 * 
 * Returns 200 if ready, 503 if not ready
 */
app.get('/api/health/ready', async (_req, res) => {
  const checks: any = {};

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'up' };
  } catch (error: any) {
    checks.database = {
      status: 'down',
      error: error.message,
    };
  }

  // Check required environment variables
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingEnvVars.length > 0) {
    checks.envVars = {
      status: 'down',
      error: `Missing env vars: ${missingEnvVars.join(', ')}`,
    };
  } else {
    checks.envVars = { status: 'up' };
  }

  // Check modules initialized
  try {
    const cache = getCache();
    if (!prisma || !cache) {
      checks.modules = {
        status: 'down',
        error: 'Critical modules not initialized',
      };
    } else {
      checks.modules = { status: 'up' };
    }
  } catch (error: any) {
    checks.modules = {
      status: 'down',
      error: error.message,
    };
  }

  const isReady = Object.values(checks).every((c: any) => c.status === 'up');
  const statusCode = isReady ? 200 : 503;

  res.status(statusCode).json({
    ready: isReady,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Socket.IO metrics endpoint (for monitoring and alerting)
app.get('/api/metrics/socketio', async (_req, res) => {
  try {
    const { getConnectionMetrics } = await import('./websocket');
    const metrics = getConnectionMetrics();
    
    // Add health status based on metrics
    const healthStatus = {
      isHealthy: metrics.activeConnections >= 0 && metrics.connectionErrors < 100,
      errorRate: metrics.totalConnections > 0 
        ? (metrics.connectionErrors / metrics.totalConnections * 100).toFixed(2) + '%'
        : '0%',
      authFailureRate: metrics.totalConnections > 0
        ? (metrics.authenticationFailures / metrics.totalConnections * 100).toFixed(2) + '%'
        : '0%'
    };
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics,
      health: healthStatus
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to fetch Socket.IO metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database connection pool health check endpoint
app.get('/api/health/database', async (_req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./prisma');
    const health = await checkDatabaseHealth();
    
    if (health.healthy) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          latency: health.latency,
        },
        poolMetrics: health.metrics,
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: health.error,
        },
        poolMetrics: health.metrics,
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Cache health and metrics endpoint
app.get('/api/health/cache', (_req, res) => {
  try {
    const cache = getCache();
    const metrics = cache.getMetrics();
    
    // Determine health status based on metrics
    const isHealthy = metrics.backend !== 'unknown';
    const status = isHealthy ? 'healthy' : 'degraded';
    
    res.status(isHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      cache: {
        backend: metrics.backend,
        metrics: {
          hits: metrics.hits,
          misses: metrics.misses,
          hitRate: `${metrics.hitRate}%`,
          missRate: `${metrics.missRate}%`,
          totalRequests: metrics.totalRequests,
          averageLatencyMs: metrics.averageLatencyMs,
          currentSize: metrics.currentSize,
          maxSize: metrics.maxSize,
          utilization: metrics.maxSize > 0 
            ? `${Math.round((metrics.currentSize / metrics.maxSize) * 100)}%`
            : 'N/A',
        },
      },
      recommendations: generateCacheRecommendations(metrics),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Rate limiter health and metrics endpoint
app.get('/api/health/rate-limiter', (_req, res) => {
  try {
    const rateLimiter = getRateLimiter();
    const metrics = rateLimiter.getMetrics();
    
    // Determine health status based on metrics
    const isHealthy = metrics.backend !== 'unknown';
    const hasHighBlockRate = metrics.blockRate > 20; // More than 20% blocked
    const status = !isHealthy ? 'degraded' : hasHighBlockRate ? 'warning' : 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      status,
      timestamp: new Date().toISOString(),
      rateLimiter: {
        backend: metrics.backend,
        metrics: {
          totalRequests: metrics.totalRequests,
          allowedRequests: metrics.allowedRequests,
          blockedRequests: metrics.blockedRequests,
          blockRate: `${metrics.blockRate}%`,
          violationsByTier: metrics.violationsByTier,
        },
        config: {
          backend: process.env.RATE_LIMIT_BACKEND || 'memory',
          allowlist: process.env.RATE_LIMIT_ALLOWLIST || 'none',
          tiers: {
            global: {
              maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10),
              windowSeconds: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW || '60', 10),
            },
            auth: {
              maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
              windowSeconds: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900', 10),
            },
            user: {
              maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '100', 10),
              windowSeconds: parseInt(process.env.RATE_LIMIT_USER_WINDOW || '60', 10),
            },
            endpoint: {
              maxRequests: parseInt(process.env.RATE_LIMIT_ENDPOINT_MAX || '1000', 10),
              windowSeconds: parseInt(process.env.RATE_LIMIT_ENDPOINT_WINDOW || '60', 10),
            },
          },
        },
      },
      recommendations: generateRateLimiterRecommendations(metrics),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Generate cache performance recommendations
 */
function generateCacheRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.hitRate < 50) {
    recommendations.push('Low hit rate detected. Consider increasing CACHE_TTL values or reviewing cache key patterns.');
  }
  
  if (metrics.currentSize > metrics.maxSize * 0.9) {
    recommendations.push('Cache near capacity. Consider increasing CACHE_MAX_SIZE.');
  }
  
  if (metrics.averageLatencyMs > 10) {
    recommendations.push('High cache latency detected. Consider using Redis for better performance.');
  }
  
  if (metrics.backend.includes('fallback')) {
    recommendations.push('Running on fallback cache. Check Redis connection if Redis is configured.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Cache performance is healthy.');
  }
  
  return recommendations;
}

/**
 * Generate rate limiter performance recommendations
 */
function generateRateLimiterRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.blockRate > 20) {
    recommendations.push('High block rate detected. Consider reviewing rate limit thresholds or identifying potential attacks.');
  }
  
  if (metrics.violationsByTier.auth > 100) {
    recommendations.push('High authentication violations. Possible brute force attack - review security logs.');
  }
  
  if (metrics.violationsByTier.global > 1000) {
    recommendations.push('High global violations. Consider enabling IP allowlist or implementing DDoS protection.');
  }
  
  if (metrics.backend.includes('fallback')) {
    recommendations.push('Running on fallback rate limiter. Check Redis connection if Redis is configured.');
  }
  
  if (metrics.backend === 'memory' && metrics.totalRequests > 100000) {
    recommendations.push('High traffic detected with in-memory backend. Consider switching to Redis for better scalability.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Rate limiter performance is healthy.');
  }
  
  return recommendations;
}

(async () => {
  app.use(domainMiddleware);

  // API Gateway Proxy Middleware - routes requests to REST or GraphQL based on feature flags
  // Phase 1: All requests go to REST (no-op behavior)
  // Phase 3: Gradual migration to NestJS GraphQL via feature flags
  app.use(proxyMiddleware());
  log('[Server] Proxy middleware registered (Phase 1: all traffic to REST)');

  // Apply production-grade rate limiting middleware (after health endpoints, before routes)
  // Global rate limiting for all API routes (except health/metrics endpoints)
  app.use('/api', (req, res, next) => {
    // Skip rate limiting for health and metrics endpoints
    if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
      return next();
    }
    return globalRateLimitMiddleware()(req, res, next);
  });
  
  // Strict auth rate limiting for authentication endpoints (applied after global for stricter limits)
  app.use('/api/auth/send-code', authRateLimitMiddleware());
  app.use('/api/auth/verify-code', authRateLimitMiddleware());
  app.use('/api/auth/magic-link', authRateLimitMiddleware());
  
  // User-based rate limiting for authenticated routes (applied in routes.ts where req.user is available)
  
  log('[Server] Production-grade rate limiting enabled (token bucket algorithm)');

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Prevent double responses
    if (res.headersSent) {
      return _next(err);
    }

    // Handle ConfigurationError - always return 400
    if (err instanceof ConfigurationError) {
      res.status(400).json({ message: err.message });
      throw err;
      return;
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Background jobs
  let cleanupJob: ReservationCleanupJob | null = null;
  let balanceReminderJob: WholesaleBalanceReminderJob | null = null;
  let deliveryReminderJob: DeliveryReminderService | null = null;
  let metaJobScheduler: MetaJobScheduler | null = null;
  let shippoRefundPollInterval: NodeJS.Timeout | null = null;
  let domainStatusChecker: any = null;
  let proxyStatsInterval: NodeJS.Timeout | null = null;

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Initialize cache service
    initializeCache();
    log('[Server] Cache service initialized');
    
    // Initialize rate limiter service
    initializeRateLimiter();
    log('[Server] Rate limiter service initialized');
    
    // Start database connection warmup job to maintain minimum pool size
    const { startConnectionWarmup } = await import('./prisma');
    startConnectionWarmup();
    
    // Register platform adapters
    importQueue.registerProcessor(async (job, signal) => {
      const source = await prisma.import_sources.findUnique({
        where: { id: job.sourceId },
      });
      
      if (!source) {
        throw new Error(`Import source ${job.sourceId} not found`);
      }
      
      const platform = source.platform;
      
      switch (platform) {
        case "shopify":
          return await processShopifyImport(job, signal);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    });
    
    // Start import queue
    importQueue.start();
    
    // Start reservation cleanup job
    cleanupJob = new ReservationCleanupJob(storage);
    cleanupJob.start();
    
    // Start wholesale balance reminder job
    const notificationService = createNotificationService(storage);
    balanceReminderJob = new WholesaleBalanceReminderJob(storage, notificationService);
    balanceReminderJob.start();
    
    // Start delivery reminder job (pre-order/made-to-order 7-day reminders)
    const emailProvider = new ResendEmailProvider(process.env.RESEND_API_KEY);
    deliveryReminderJob = new DeliveryReminderService(storage, emailProvider);
    deliveryReminderJob.start();
    
    // Start domain status checker job
    domainStatusChecker = startDomainStatusChecker();
    log('[Server] Domain status checker job started (2 minute interval)');
    
    // Start Meta Ads background jobs (insights polling and budget monitoring)
    // Only initialize if Meta credentials are configured
    if (process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { 
          apiVersion: '2025-09-30.clover' 
        });
        
        const metaRedirectUri = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/api/meta/oauth/callback`;
        const metaOAuthService = new MetaOAuthService(storage, {
          appId: process.env.META_APP_ID,
          appSecret: process.env.META_APP_SECRET,
          redirectUri: metaRedirectUri
        });
        const analyticsService = new AnalyticsService(storage, metaOAuthService);
        const budgetService = new BudgetService(storage, stripe);
        
        metaJobScheduler = new MetaJobScheduler(storage, {
          analyticsService,
          budgetService,
        });
        
        await metaJobScheduler.startJobs();
        log('[Server] Meta Ads background jobs started successfully');
      } catch (error) {
        log('[Server] Failed to start Meta Ads jobs: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      log('[Server] Meta Ads background jobs skipped (META_APP_ID, META_APP_SECRET, or STRIPE_SECRET_KEY not configured)');
    }
    
    // Poll Shippo refund status every 15 minutes
    // Only initialize if Shippo API key is configured
    if (process.env.SHIPPO_API_KEY) {
      const shippoLabelService = new ShippoLabelService(storage, notificationService);
      
      // Run immediately on startup
      (async () => {
        try {
          await shippoLabelService.pollPendingRefunds();
          log('[Shippo Refund Poll] Initial poll completed');
        } catch (error) {
          log('[Shippo Refund Poll] Initial poll failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      })();
      
      // Then run every 15 minutes
      shippoRefundPollInterval = setInterval(async () => {
        try {
          await shippoLabelService.pollPendingRefunds();
          log('[Shippo Refund Poll] Poll cycle completed');
        } catch (error) {
          log('[Shippo Refund Poll] Poll cycle failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      }, 15 * 60 * 1000); // 15 minutes
      
      log('[Server] Shippo refund polling job started (15 minute interval)');
    } else {
      log('[Server] Shippo refund polling skipped (SHIPPO_API_KEY not configured)');
    }
    
    // Log proxy configuration stats every 5 minutes
    // Initial log on startup
    logProxyStats();
    
    // Then periodic logging
    proxyStatsInterval = setInterval(() => {
      logProxyStats();
    }, 5 * 60 * 1000); // 5 minutes
    
    log('[Server] Proxy stats logging started (5 minute interval)');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    log('[Server] SIGTERM received, stopping background jobs');
    
    importQueue.stop();
    if (cleanupJob) {
      cleanupJob.stop();
    }
    if (balanceReminderJob) {
      balanceReminderJob.stop();
    }
    if (deliveryReminderJob) {
      deliveryReminderJob.stop();
    }
    if (metaJobScheduler) {
      metaJobScheduler.stopJobs();
    }
    if (shippoRefundPollInterval) {
      clearInterval(shippoRefundPollInterval);
    }
    if (proxyStatsInterval) {
      clearInterval(proxyStatsInterval);
    }
    
    // Stop database connection warmup job
    const { stopConnectionWarmup } = await import('./prisma');
    stopConnectionWarmup();
    
    // Cleanup feature flags service
    featureFlagsService.destroy();
    
    // Wait a bit for jobs to cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    log('[Server] Shutdown complete');
    process.exit(0);
  });
})();
