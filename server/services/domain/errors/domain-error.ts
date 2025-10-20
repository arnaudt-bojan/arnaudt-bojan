/**
 * Base Domain Error
 * 
 * All domain errors extend this class and provide:
 * - code: Machine-readable error code
 * - httpStatus: Suggested HTTP status code for REST responses
 * - message: Human-readable error message
 * 
 * Transport layers (REST/GraphQL) can map these to appropriate responses
 */

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
