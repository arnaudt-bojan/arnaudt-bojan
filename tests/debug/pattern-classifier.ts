export type FailurePattern = 
  | 'database_connection'
  | 'authentication'
  | 'validation'
  | 'timeout'
  | 'not_found'
  | 'type_error'
  | 'unknown';

interface PatternMatch {
  pattern: FailurePattern;
  confidence: number;
  description: string;
}

export function classifyFailure(error: string, stack: string): PatternMatch {
  const errorLower = error.toLowerCase();
  const stackLower = stack.toLowerCase();

  // Database connection errors
  if (errorLower.includes('econnrefused') || 
      errorLower.includes('database') && errorLower.includes('connect')) {
    return {
      pattern: 'database_connection',
      confidence: 0.9,
      description: 'Database connection failure - check DATABASE_URL and ensure DB is running'
    };
  }

  // Authentication errors
  if (errorLower.includes('unauthorized') || 
      errorLower.includes('401') ||
      errorLower.includes('session')) {
    return {
      pattern: 'authentication',
      confidence: 0.8,
      description: 'Authentication failure - check session management or auth headers'
    };
  }

  // Validation errors
  if (errorLower.includes('validation') || 
      errorLower.includes('invalid') ||
      stackLower.includes('zod')) {
    return {
      pattern: 'validation',
      confidence: 0.85,
      description: 'Validation failure - check input data against schema'
    };
  }

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('etimedout')) {
    return {
      pattern: 'timeout',
      confidence: 0.9,
      description: 'Request timeout - check network or increase timeout threshold'
    };
  }

  // 404 Not Found
  if (errorLower.includes('404') || errorLower.includes('not found')) {
    return {
      pattern: 'not_found',
      confidence: 0.85,
      description: 'Resource not found - check endpoint URL or resource ID'
    };
  }

  // Type errors
  if (errorLower.includes('typeerror') || 
      errorLower.includes('cannot read property')) {
    return {
      pattern: 'type_error',
      confidence: 0.8,
      description: 'Type error - check for null/undefined values'
    };
  }

  return {
    pattern: 'unknown',
    confidence: 0.0,
    description: 'Unknown error pattern'
  };
}
