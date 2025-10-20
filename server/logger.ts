/**
 * Production-Grade Structured Logging with Winston
 * 
 * Features:
 * - JSON logs in production, pretty logs in development
 * - Correlation ID integration via AsyncLocalStorage
 * - Child logger support for service-specific context
 * - Environment-driven configuration (LOG_LEVEL, LOG_FORMAT)
 * - Consistent metadata schema across all logs
 * 
 * Usage:
 * ```typescript
 * import { logger } from './logger';
 * 
 * // Simple logging
 * logger.info('User logged in', { userId: '123' });
 * 
 * // Service-specific logger
 * const serviceLogger = logger.child({ service: 'OrderService' });
 * serviceLogger.info('Order created', { orderId: 'abc', amount: 100 });
 * ```
 */

import winston from 'winston';
import { getRequestId } from './request-context';

// ============================================================================
// Configuration
// ============================================================================

const isDevelopment = process.env.NODE_ENV !== 'production';

// Environment variables for configuration
const LOG_LEVEL = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const LOG_FORMAT = process.env.LOG_FORMAT || (isDevelopment ? 'pretty' : 'json');

// ============================================================================
// Custom Formats
// ============================================================================

/**
 * Add correlation ID from AsyncLocalStorage to every log
 */
const correlationIdFormat = winston.format((info) => {
  const requestId = getRequestId();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

/**
 * Pretty format for development - human-readable colored output
 */
const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  correlationIdFormat(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, ...meta } = info;

    // Color codes
    const levelColors: Record<string, string> = {
      error: '\x1b[31m',   // Red
      warn: '\x1b[33m',    // Yellow
      info: '\x1b[36m',    // Cyan
      debug: '\x1b[35m',   // Magenta
    };
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';

    const color = levelColors[level] || '';
    const levelStr = `[${level.toUpperCase()}]`.padEnd(9);
    
    // Build log line
    let logLine = `${gray}${timestamp}${reset} ${color}${levelStr}${reset}`;
    
    // Add service name if present
    if (service) {
      logLine += ` ${gray}[${service}]${reset}`;
    }
    
    // Add request ID if present
    if (requestId) {
      logLine += ` ${gray}[req:${requestId}]${reset}`;
    }
    
    // Add message
    logLine += ` ${message}`;
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      // Pretty print metadata
      const metaStr = JSON.stringify(meta, null, 2);
      if (metaStr.length < 100) {
        logLine += ` ${gray}${metaStr}${reset}`;
      } else {
        logLine += `\n${gray}${metaStr}${reset}`;
      }
    }
    
    return logLine;
  })
);

/**
 * JSON format for production - structured, machine-readable logs
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  correlationIdFormat(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================================================
// Winston Logger Instance
// ============================================================================

/**
 * Main Winston logger instance
 */
const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: LOG_FORMAT === 'json' ? jsonFormat : prettyFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface with child logger support
 */
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  child(defaultMeta: Record<string, any>): Logger;
}

/**
 * Create logger interface from Winston logger instance
 */
function createLoggerInterface(baseLogger: winston.Logger): Logger {
  return {
    debug: (message: string, meta?: Record<string, any>) => {
      baseLogger.debug(message, meta);
    },
    info: (message: string, meta?: Record<string, any>) => {
      baseLogger.info(message, meta);
    },
    warn: (message: string, meta?: Record<string, any>) => {
      baseLogger.warn(message, meta);
    },
    error: (message: string, meta?: Record<string, any>) => {
      baseLogger.error(message, meta);
    },
    child: (defaultMeta: Record<string, any>) => {
      const childLogger = baseLogger.child(defaultMeta);
      return createLoggerInterface(childLogger);
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Main logger instance
 * 
 * Use directly for general logging:
 * ```typescript
 * logger.info('Server started', { port: 3000 });
 * ```
 * 
 * Create child loggers for service-specific context:
 * ```typescript
 * const serviceLogger = logger.child({ service: 'OrderService' });
 * serviceLogger.info('Order created', { orderId: 'abc' });
 * ```
 */
export const logger = createLoggerInterface(winstonLogger);

/**
 * Default export for convenience
 */
export default logger;

// ============================================================================
// Legacy Compatibility Types
// ============================================================================

/**
 * Legacy log context type for backward compatibility
 */
export type LogContext = Record<string, any>;

/**
 * Legacy log level type for backward compatibility
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
