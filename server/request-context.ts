/**
 * Request Context - AsyncLocalStorage for request-scoped data
 * 
 * Provides correlation ID tracking across async operations without
 * needing to pass requestId through every function call.
 * 
 * Usage:
 * - Middleware sets context at request start
 * - Any code in request lifecycle can retrieve correlation ID
 * - Works with async/await and promises automatically
 */

import { AsyncLocalStorage } from 'async_hooks';
import { customAlphabet } from 'nanoid';

// ============================================================================
// Types
// ============================================================================

export interface RequestContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

// ============================================================================
// AsyncLocalStorage Instance
// ============================================================================

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// ============================================================================
// Request ID Generation
// ============================================================================

// Use custom alphabet for readable, URL-safe IDs
// Format: lowercase + numbers, 12 chars (collision-resistant for request IDs)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

/**
 * Generate a unique request ID
 * Format: 12-character lowercase alphanumeric string
 * Example: "4k3j2h1g9f8d"
 */
export function generateRequestId(): string {
  return nanoid();
}

// ============================================================================
// Context Helpers
// ============================================================================

/**
 * Get current request context (correlation ID, user ID, etc.)
 * Returns undefined if called outside request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get current correlation ID
 * Returns undefined if called outside request context
 */
export function getRequestId(): string | undefined {
  return asyncLocalStorage.getStore()?.requestId;
}

/**
 * Run callback with request context
 * Used by middleware to establish request context
 * 
 * @param context - Request context to store
 * @param callback - Function to execute with context
 */
export function withRequestContext<T>(
  context: RequestContext,
  callback: () => T
): T {
  return asyncLocalStorage.run(context, callback);
}

/**
 * Add fields to current request context
 * Useful for adding userId after authentication
 * 
 * @param fields - Fields to add to context
 */
export function enrichRequestContext(fields: Partial<RequestContext>): void {
  const context = asyncLocalStorage.getStore();
  if (context) {
    Object.assign(context, fields);
  }
}
