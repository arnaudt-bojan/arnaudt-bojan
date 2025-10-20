/**
 * Validation Middleware
 * 
 * Express middleware using class-validator and class-transformer
 * - Validates request body against DTO class
 * - Transforms plain objects to class instances
 * - Returns 400 with clear validation errors
 */

import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { logger } from '../logger';

/**
 * Format validation errors into user-friendly messages
 */
function formatValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  
  function extractErrors(errors: ValidationError[], prefix = ''): void {
    for (const error of errors) {
      const property = prefix ? `${prefix}.${error.property}` : error.property;
      
      if (error.constraints) {
        for (const constraint of Object.values(error.constraints)) {
          messages.push(constraint);
        }
      }
      
      if (error.children && error.children.length > 0) {
        extractErrors(error.children, property);
      }
    }
  }
  
  extractErrors(errors);
  return messages;
}

/**
 * Validate request body against DTO class
 * 
 * Usage:
 * ```typescript
 * app.post('/api/orders', validateBody(CreateOrderDto), async (req, res) => {
 *   const dto: CreateOrderDto = req.body; // Typed!
 *   // ...
 * });
 * ```
 */
export function validateBody<T extends object>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to DTO class instance
      const dtoInstance = plainToInstance(dtoClass, req.body, {
        enableImplicitConversion: true, // Auto-convert strings to numbers where appropriate
        excludeExtraneousValues: false, // Allow extra fields (for backwards compatibility)
      });
      
      // Validate the DTO instance
      const errors = await validate(dtoInstance, {
        whitelist: true, // Strip extra properties that are not in the DTO
        forbidNonWhitelisted: false, // Don't error on extra properties, just strip them
        skipMissingProperties: false, // Validate all properties
        validationError: {
          target: false, // Don't include the object being validated in error
          value: false, // Don't include the value in error (can be sensitive)
        },
      });
      
      if (errors.length > 0) {
        const messages = formatValidationErrors(errors);
        
        logger.warn('[ValidationMiddleware] Validation failed', {
          endpoint: req.path,
          method: req.method,
          errors: messages,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: messages,
        });
      }
      
      // Replace req.body with validated and transformed DTO instance
      req.body = dtoInstance as any;
      
      next();
    } catch (error) {
      logger.error('[ValidationMiddleware] Unexpected error during validation', error);
      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

/**
 * Validate request query parameters against DTO class
 */
export function validateQuery<T extends object>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.query, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });
      
      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
        validationError: {
          target: false,
          value: false,
        },
      });
      
      if (errors.length > 0) {
        const messages = formatValidationErrors(errors);
        
        logger.warn('[ValidationMiddleware] Query validation failed', {
          endpoint: req.path,
          method: req.method,
          errors: messages,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: messages,
        });
      }
      
      (req as any).query = dtoInstance;
      
      next();
    } catch (error) {
      logger.error('[ValidationMiddleware] Unexpected error during query validation', error);
      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}

/**
 * Validate request params against DTO class
 */
export function validateParams<T extends object>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.params, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      });
      
      const errors = await validate(dtoInstance, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
        validationError: {
          target: false,
          value: false,
        },
      });
      
      if (errors.length > 0) {
        const messages = formatValidationErrors(errors);
        
        logger.warn('[ValidationMiddleware] Params validation failed', {
          endpoint: req.path,
          method: req.method,
          errors: messages,
        });
        
        return res.status(400).json({
          error: 'Validation failed',
          details: messages,
        });
      }
      
      (req as any).params = dtoInstance;
      
      next();
    } catch (error) {
      logger.error('[ValidationMiddleware] Unexpected error during params validation', error);
      return res.status(500).json({
        error: 'Internal server error during validation',
      });
    }
  };
}
