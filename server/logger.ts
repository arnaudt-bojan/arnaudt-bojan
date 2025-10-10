/**
 * Centralized Logging System
 * 
 * Provides structured logging with severity levels, timestamps, and context.
 * Replaces scattered console.log statements with a consistent logging interface.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  module?: string;
  userId?: string;
  orderId?: string;
  productId?: string;
  [key: string]: string | number | boolean | undefined;
}

class Logger {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Format log message with timestamp and context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(8);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} [${levelStr}] ${message}${contextStr}`;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log informational message
   */
  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = error instanceof Error 
      ? { ...context, error: error.message, stack: error.stack }
      : context;
    console.error(this.formatMessage('error', message, errorContext));
  }

  /**
   * Log critical error (system-level failures)
   */
  critical(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = error instanceof Error 
      ? { ...context, error: error.message, stack: error.stack }
      : context;
    console.error(this.formatMessage('critical', message, errorContext));
    // In production, could trigger alerts/notifications here
  }

  /**
   * Log auth-related events
   */
  auth(message: string, context?: LogContext): void {
    this.info(`[AUTH] ${message}`, context);
  }

  /**
   * Log payment-related events
   */
  payment(message: string, context?: LogContext): void {
    this.info(`[PAYMENT] ${message}`, context);
  }

  /**
   * Log database operations
   */
  database(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      this.debug(`[DATABASE] ${message}`, context);
    }
  }

  /**
   * Log HTTP requests
   */
  http(method: string, path: string, statusCode: number, duration: number, response?: unknown): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} ${statusCode} in ${duration}ms`;
    const context: LogContext = { method, path, statusCode, duration };
    
    if (response && typeof response === 'object') {
      // Don't log large responses
      const responseStr = JSON.stringify(response);
      if (responseStr.length < 500) {
        console.log(this.formatMessage(level, message, { ...context, response: responseStr }));
      } else {
        console.log(this.formatMessage(level, message, context));
      }
    } else {
      console.log(this.formatMessage(level, message, context));
    }
  }

  /**
   * Log queue/background job events
   */
  queue(message: string, context?: LogContext): void {
    this.info(`[QUEUE] ${message}`, context);
  }

  /**
   * Log notification events
   */
  notification(message: string, context?: LogContext): void {
    this.info(`[NOTIFICATION] ${message}`, context);
  }
}

export const logger = new Logger();

// Export singleton instance as default
export default logger;
