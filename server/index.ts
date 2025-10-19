import express, { type Request, Response, NextFunction } from "express";
import fileUpload from "express-fileupload";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { importQueue } from "./import-queue";
import { processShopifyImport } from "./adapters/shopify";
import { importSources } from "@shared/schema";
import { 
  securityHeadersMiddleware, 
  rateLimitMiddleware, 
  authRateLimitMiddleware,
  sanitizeInputMiddleware
} from "./security";
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
import Stripe from "stripe";
import { prisma } from "./prisma";

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

// Strict rate limiting for authentication endpoints
app.use('/api/auth/send-code', authRateLimitMiddleware());
app.use('/api/auth/verify-code', authRateLimitMiddleware());
app.use('/api/auth/magic-link', authRateLimitMiddleware());

// General rate limiting for all API routes
app.use('/api', rateLimitMiddleware({ maxRequests: 100, windowMs: 60 * 1000 }));

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

// Health check endpoint (for Docker/Kubernetes probes)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

(async () => {
  app.use(domainMiddleware);

  // API Gateway Proxy Middleware - routes requests to REST or GraphQL based on feature flags
  // Phase 1: All requests go to REST (no-op behavior)
  // Phase 3: Gradual migration to NestJS GraphQL via feature flags
  app.use(proxyMiddleware());
  log('[Server] Proxy middleware registered (Phase 1: all traffic to REST)');

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
    
    // Cleanup feature flags service
    featureFlagsService.destroy();
    
    // Wait a bit for jobs to cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    log('[Server] Shutdown complete');
    process.exit(0);
  });
})();
