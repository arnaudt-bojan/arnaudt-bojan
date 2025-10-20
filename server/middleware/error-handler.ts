/**
 * Centralized Express Error Handler Middleware
 * 
 * Provides consistent error handling for all REST endpoints:
 * - Maps DomainError instances to appropriate HTTP responses
 * - Logs all errors with request context
 * - Returns structured error responses
 * 
 * Usage:
 * ```typescript
 * // In server/index.ts (MUST be registered LAST, after all routes)
 * app.use(errorHandlerMiddleware);
 * 
 * // In route handlers (delegate errors to middleware)
 * app.post('/api/endpoint', async (req, res, next) => {
 *   try {
 *     const result = await someService.doSomething();
 *     res.json(result);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 * ```
 */

import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../services/domain/errors/domain-error';
import { ConfigurationError } from '../errors';
import { logger } from '../logger';

/**
 * Centralized Error Handler Middleware
 * 
 * Handles three types of errors:
 * 1. DomainError - Business logic errors with known error codes and HTTP status
 * 2. ConfigurationError - Configuration/validation errors (400 Bad Request)
 * 3. Unexpected errors - Unknown errors logged as critical issues
 * 
 * @param error - Error thrown by route handler or upstream middleware
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function (for passing to default handler if headers sent)
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent double responses - delegate to Express default handler
  if (res.headersSent) {
    return next(error);
  }

  // Handle domain errors (business logic errors)
  if (error instanceof DomainError) {
    logger.info('Domain error handled', {
      errorCode: error.code,
      message: error.message,
      statusCode: error.httpStatus,
      path: req.path,
      method: req.method,
    });

    res.status(error.httpStatus).json({
      error: error.code,
      message: error.message,
    });
    return;
  }

  // Handle configuration errors (validation/setup errors)
  if (error instanceof ConfigurationError) {
    logger.warn('Configuration error', {
      message: error.message,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      error: 'CONFIGURATION_ERROR',
      message: error.message,
    });
    return;
  }

  // Handle unexpected errors (system/infrastructure errors)
  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Check if error has status/statusCode property (from Express or other middleware)
  const status = (error as any).status || (error as any).statusCode || 500;
  const message = error.message || 'An unexpected error occurred';

  res.status(status).json({
    error: 'INTERNAL_SERVER_ERROR',
    message,
  });
}
