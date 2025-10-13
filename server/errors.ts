/**
 * Custom Error Classes
 * 
 * Used to distinguish between different types of errors and map to appropriate HTTP status codes
 */

/**
 * ConfigurationError - Thrown when required configuration is missing
 * Maps to HTTP 400 Bad Request (client configuration issue)
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

/**
 * ValidationError - Thrown when input validation fails
 * Maps to HTTP 400 Bad Request (client input issue)
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}
