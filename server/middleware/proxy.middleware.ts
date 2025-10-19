import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { featureFlagsService } from '../services/feature-flags.service';
import { graphqlAdapter } from '../adapters/graphql-adapter';
import { logger } from '../logger';

/**
 * API Gateway Proxy Middleware
 * 
 * Enables gradual migration from REST to GraphQL without downtime
 * Routes requests based on feature flags to either:
 * - In-process REST handlers (current, default)
 * - NestJS GraphQL service (future, when enabled)
 * 
 * Phase 1: Infrastructure with no-op behavior (all traffic to REST)
 * Phase 3: Active proxying when NestJS GraphQL service is deployed
 */

interface ProxyMetrics {
  startTime: number;
  endpoint: string;
  method: string;
  backend: 'REST' | 'GraphQL' | 'Both';
  graphqlEnabled: boolean;
  shadowTraffic: boolean;
}

export function proxyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only intercept API routes
    if (!req.path.startsWith('/api')) {
      return next();
    }

    // Skip health checks and webhooks (should always go to REST)
    const skipPaths = [
      '/api/health',
      '/api/stripe/webhook',
      '/api/webhooks/stripe',
      '/api/meta/oauth',
    ];
    
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Start metrics tracking
    const metrics: ProxyMetrics = {
      startTime: Date.now(),
      endpoint: req.path,
      method: req.method,
      backend: 'REST',
      graphqlEnabled: false,
      shadowTraffic: false,
    };

    // Normalize endpoint for feature flag lookup (replace dynamic segments)
    const normalizedEndpoint = normalizeEndpoint(req.path);

    // Check if GraphQL is enabled for this endpoint
    const useGraphQL = featureFlagsService.isGraphQLEnabled(normalizedEndpoint);
    const useShadowTraffic = featureFlagsService.isShadowTrafficEnabled(normalizedEndpoint);

    metrics.graphqlEnabled = useGraphQL;
    metrics.shadowTraffic = useShadowTraffic;

    // Determine routing strategy
    if (useGraphQL && !useShadowTraffic) {
      // Route to GraphQL only
      metrics.backend = 'GraphQL';
      return await routeToGraphQL(req, res, next, metrics);
    } else if (useShadowTraffic) {
      // Route to both (shadow traffic for testing)
      metrics.backend = 'Both';
      return await routeToBoth(req, res, next, metrics);
    } else {
      // Route to REST (default, Phase 1 behavior)
      metrics.backend = 'REST';
      return routeToREST(req, res, next, metrics);
    }
  };
}

/**
 * Route request to in-process REST handlers
 * This is the default behavior and what Phase 1 always does
 */
function routeToREST(
  req: Request,
  res: Response,
  next: NextFunction,
  metrics: ProxyMetrics
): void {
  // Intercept response to log metrics
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalEnd = res.end.bind(res);

  let responseCaptured = false;

  const captureResponse = () => {
    if (responseCaptured) return;
    responseCaptured = true;

    const duration = Date.now() - metrics.startTime;
    
    logger.info('[Proxy] Request routed to REST', {
      method: metrics.method,
      endpoint: metrics.endpoint,
      backend: 'REST',
      statusCode: res.statusCode,
      durationMs: duration,
      graphqlEnabled: metrics.graphqlEnabled,
      shadowTraffic: metrics.shadowTraffic,
    });
  };

  res.json = function (body: any) {
    captureResponse();
    return originalJson(body);
  };

  res.send = function (body: any) {
    captureResponse();
    return originalSend(body);
  };

  res.end = function (...args: any[]) {
    captureResponse();
    return originalEnd(...args);
  };

  // Pass through to existing REST routes
  next();
}

/**
 * Route request to NestJS GraphQL service
 * Phase 1: Logs intent but falls back to REST (NestJS not deployed yet)
 * Phase 3: Actually proxies to NestJS
 */
async function routeToGraphQL(
  req: Request,
  res: Response,
  next: NextFunction,
  metrics: ProxyMetrics
): Promise<void> {
  try {
    // Phase 1: Log that we WOULD proxy to GraphQL, but fall back to REST
    logger.info('[Proxy] GraphQL enabled but service not deployed, falling back to REST', {
      method: metrics.method,
      endpoint: metrics.endpoint,
      backend: 'GraphQL (fallback to REST)',
    });

    // TODO Phase 3: Uncomment this when NestJS is deployed
    // const graphqlRequest = graphqlAdapter.restToGraphQL(req);
    // const nestJsUrl = featureFlagsService.getNestJsServiceUrl();
    // const timeout = featureFlagsService.getTimeout();
    //
    // const response = await axios.post(nestJsUrl, graphqlRequest, {
    //   timeout,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': req.headers.authorization || '',
    //   },
    // });
    //
    // const restResponse = graphqlAdapter.graphQLToRest(response.data, req);
    // const duration = Date.now() - metrics.startTime;
    //
    // logger.info('[Proxy] Request routed to GraphQL', {
    //   method: metrics.method,
    //   endpoint: metrics.endpoint,
    //   backend: 'GraphQL',
    //   statusCode: restResponse.statusCode,
    //   durationMs: duration,
    // });
    //
    // res.status(restResponse.statusCode).json(restResponse.body);

    // Phase 1: Fall back to REST
    return routeToREST(req, res, next, metrics);
  } catch (error) {
    const duration = Date.now() - metrics.startTime;
    
    logger.error('[Proxy] GraphQL routing failed, falling back to REST', {
      method: metrics.method,
      endpoint: metrics.endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: duration,
    });

    // Fall back to REST on error
    return routeToREST(req, res, next, metrics);
  }
}

/**
 * Route request to both REST and GraphQL (shadow traffic)
 * Used for testing and comparison before full migration
 */
async function routeToBoth(
  req: Request,
  res: Response,
  next: NextFunction,
  metrics: ProxyMetrics
): Promise<void> {
  // Phase 1: Log intent, route to REST only
  logger.info('[Proxy] Shadow traffic enabled but GraphQL not deployed, routing to REST only', {
    method: metrics.method,
    endpoint: metrics.endpoint,
    backend: 'Both (REST only for now)',
  });

  // TODO Phase 3: Implement shadow traffic
  // Send request to both backends, compare responses
  // Primary response: REST (stable)
  // Secondary: GraphQL (for comparison/testing)
  //
  // const [restResult, graphqlResult] = await Promise.allSettled([
  //   sendToREST(req),
  //   sendToGraphQL(req),
  // ]);
  //
  // Compare results and log differences
  // Return REST response to client

  // Phase 1: Just route to REST
  return routeToREST(req, res, next, metrics);
}

/**
 * Normalize endpoint path for feature flag lookup
 * Replaces dynamic segments like /api/products/123 -> /api/products/:id
 */
function normalizeEndpoint(path: string): string {
  // Common ID patterns
  const patterns = [
    { regex: /\/api\/products\/[^/]+$/, replacement: '/api/products/:id' },
    { regex: /\/api\/orders\/[^/]+$/, replacement: '/api/orders/:id' },
    { regex: /\/api\/seller\/products\/[^/]+$/, replacement: '/api/seller/products/:id' },
    { regex: /\/api\/seller\/orders\/[^/]+$/, replacement: '/api/seller/orders/:id' },
    { regex: /\/api\/wholesale\/orders\/[^/]+$/, replacement: '/api/wholesale/orders/:id' },
    { regex: /\/api\/users\/[^/]+$/, replacement: '/api/users/:id' },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(path)) {
      return pattern.replacement;
    }
  }

  return path;
}

/**
 * Log proxy statistics (called periodically)
 */
export function logProxyStats(): void {
  const config = featureFlagsService.getConfig();
  const enabledEndpoints = Object.entries(config.endpoints)
    .filter(([_, flags]) => flags.useGraphQL)
    .map(([endpoint]) => endpoint);

  logger.info('[Proxy] Current configuration', {
    totalEndpoints: Object.keys(config.endpoints).length,
    graphqlEnabled: enabledEndpoints.length,
    shadowTrafficGlobal: config.globalSettings.enableShadowTraffic,
    nestJsUrl: config.globalSettings.nestJsServiceUrl,
    enabledEndpoints: enabledEndpoints.length > 0 ? JSON.stringify(enabledEndpoints) : 'none',
  });
}
