/**
 * Correlation Middleware - Request correlation ID and context management
 * 
 * Features:
 * - Extracts or generates X-Request-ID header
 * - Stores correlation ID in AsyncLocalStorage
 * - Attaches X-Request-ID to response headers
 * - Provides req.log child logger with automatic requestId
 * 
 * Usage:
 * ```typescript
 * app.use(correlationMiddleware);
 * 
 * // In route handlers
 * req.log.info('Processing request', { userId: req.user.id });
 * ```
 */

import type { Request, Response, NextFunction } from 'express';
import { 
  generateRequestId, 
  withRequestContext, 
  enrichRequestContext 
} from '../request-context';
import { logger } from '../logger';

/**
 * Correlation middleware - establishes request context with correlation ID
 * 
 * Mount early in middleware chain (after body parsers) to ensure
 * correlation ID is available for all downstream middleware and routes.
 */
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Step 1: Extract or generate correlation ID
  const requestId = 
    (req.headers['x-request-id'] as string) || 
    generateRequestId();

  // Step 2: Set response header for client tracing
  res.setHeader('X-Request-ID', requestId);

  // Step 3: Create request context with correlation ID
  const context = {
    requestId,
    sessionId: req.session?.id,
  };

  // Step 4: Run request handler within AsyncLocalStorage context
  withRequestContext(context, () => {
    // Step 5: Attach child logger to request with automatic requestId
    req.log = logger.child({ requestId });

    // Step 6: Enrich context with user ID if authenticated
    // This happens in authentication middleware, so we set it up for later
    const originalUser = (req as any).user;
    if (originalUser) {
      enrichRequestContext({ userId: originalUser.id });
    }

    // Step 7: Proceed to next middleware
    next();
  });
}

// ============================================================================
// TypeScript Augmentation for Express Request
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      /**
       * Request-scoped logger with automatic correlation ID
       * 
       * Usage:
       * ```typescript
       * req.log.info('User action', { action: 'login', userId: '123' });
       * req.log.error('Failed to process', { error: err.message });
       * ```
       */
      log: import('../logger').Logger;
    }
  }
}
