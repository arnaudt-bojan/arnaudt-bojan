/**
 * Rate Limit Middleware
 * 
 * Express middleware for tiered rate limiting with allowlists and exemptions.
 * Integrates with the rate limiting service to enforce limits and set headers.
 */

import { Request, Response, NextFunction } from 'express';
import { getRateLimiter, RateLimitTier, RateLimitConfig } from '../rate-limiter';
import { parseAllowlist, isIPInRanges, IPRange } from '../utils/ip-utils';
import { logger } from '../logger';

/**
 * Rate Limit Middleware Options
 */
export interface RateLimitOptions {
  tier: RateLimitTier;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * Parse IP allowlist from environment
 */
const IP_ALLOWLIST: IPRange[] = parseAllowlist(
  process.env.RATE_LIMIT_ALLOWLIST || ''
);

/**
 * Check if user has admin role (bypass rate limits)
 */
function isAdminUser(req: any): boolean {
  const user = req.user;
  if (!user) return false;
  
  // Check if user has admin role
  return user.role === 'admin' || user.isAdmin === true;
}

/**
 * Check if IP is in allowlist
 */
function isAllowlistedIP(req: Request): boolean {
  if (IP_ALLOWLIST.length === 0) {
    return false;
  }
  
  const ip = getClientIP(req);
  return isIPInRanges(ip, IP_ALLOWLIST);
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIP(req: Request): string {
  // Try X-Forwarded-For header first (proxies)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' 
      ? forwarded.split(',') 
      : forwarded;
    return ips[0].trim();
  }
  
  // Try X-Real-IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }
  
  // Fall back to socket remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Generic rate limit middleware factory
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  const {
    tier,
    keyGenerator,
    skip,
    onLimitReached,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if custom skip function returns true
      if (skip && skip(req)) {
        return next();
      }

      // Bypass rate limiting for allowlisted IPs
      if (isAllowlistedIP(req)) {
        logger.debug('[RateLimit] IP allowlisted', {
          ip: getClientIP(req),
          tier,
        });
        return next();
      }

      // Bypass rate limiting for admin users
      if (isAdminUser(req)) {
        logger.debug('[RateLimit] Admin user exempted', {
          userId: (req as any).user?.id,
          tier,
        });
        return next();
      }

      // Generate rate limit key
      const key = keyGenerator ? keyGenerator(req) : getClientIP(req);

      // Check rate limit
      const rateLimiter = getRateLimiter();
      const result = await rateLimiter.checkLimit(key, tier);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      if (!result.allowed) {
        // Rate limit exceeded
        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter);
        }

        // Call custom handler if provided
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        // Log violation
        logger.warn('[RateLimit] Rate limit exceeded', {
          key,
          tier,
          ip: getClientIP(req),
          path: req.path,
          retryAfter: result.retryAfter,
        });

        // Return 429 Too Many Requests
        return res.status(429).json({
          error: 'Too Many Requests',
          message: getTierSpecificMessage(tier, result.retryAfter),
          retryAfter: result.retryAfter,
          limit: result.limit,
          resetTime: result.resetTime,
        });
      }

      // Request allowed - continue
      next();
    } catch (error) {
      // Graceful degradation - log error and allow request
      logger.error('[RateLimit] Middleware error - allowing request', error);
      next();
    }
  };
}

/**
 * Get tier-specific error message
 */
function getTierSpecificMessage(tier: RateLimitTier, retryAfter?: number): string {
  const retryText = retryAfter 
    ? ` Please try again in ${formatRetryAfter(retryAfter)}.`
    : ' Please try again later.';

  switch (tier) {
    case 'auth':
      return `Too many authentication attempts.${retryText} For security, we limit login attempts to prevent unauthorized access.`;
    
    case 'user':
      return `You've exceeded your rate limit.${retryText} Consider upgrading for higher limits.`;
    
    case 'endpoint':
      return `This endpoint has rate limits to ensure fair usage.${retryText}`;
    
    case 'global':
    default:
      return `Too many requests from your IP address.${retryText}`;
  }
}

/**
 * Format retry after duration for human readability
 */
function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Global rate limiting middleware
 * 
 * Prevents DDoS attacks by limiting requests per IP
 * Default: 1000 requests/min per IP
 */
export function globalRateLimitMiddleware() {
  return createRateLimitMiddleware({
    tier: 'global',
    keyGenerator: (req) => `global:${getClientIP(req)}`,
  });
}

/**
 * Authentication rate limiting middleware
 * 
 * Prevents brute force attacks on login endpoints
 * Default: 5 requests/15min per IP
 */
export function authRateLimitMiddleware() {
  return createRateLimitMiddleware({
    tier: 'auth',
    keyGenerator: (req) => `auth:${getClientIP(req)}`,
    onLimitReached: (req, res) => {
      // Additional logging for security events
      logger.warn('[Security] Authentication rate limit exceeded', {
        ip: getClientIP(req),
        path: req.path,
        userAgent: req.headers['user-agent'],
      });
    },
  });
}

/**
 * Per-user rate limiting middleware
 * 
 * Limits authenticated user requests
 * Default: 100 requests/min per user
 * 
 * Note: Requires authentication middleware to run first
 */
export function userRateLimitMiddleware() {
  return createRateLimitMiddleware({
    tier: 'user',
    keyGenerator: (req: any) => {
      const userId = req.user?.id || req.user?.claims?.sub;
      if (userId) {
        return `user:${userId}`;
      }
      // Fall back to IP if no user (shouldn't happen with auth middleware)
      return `user:${getClientIP(req)}`;
    },
    skip: (req: any) => {
      // Skip if user not authenticated (let auth middleware handle it)
      return !req.user;
    },
  });
}

/**
 * Per-endpoint rate limiting middleware
 * 
 * Custom rate limits for specific high-risk endpoints
 * Default: Configurable per endpoint
 */
export function endpointRateLimitMiddleware(options?: {
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const prefix = options?.keyPrefix || 'endpoint';
  const customKeyGen = options?.keyGenerator;

  return createRateLimitMiddleware({
    tier: 'endpoint',
    keyGenerator: customKeyGen || ((req) => `${prefix}:${getClientIP(req)}`),
  });
}

/**
 * Create custom rate limit middleware with specific config
 * 
 * Useful for endpoints that need different limits than the default tiers
 */
export function customRateLimitMiddleware(
  tier: RateLimitTier,
  keyPrefix: string,
  options?: {
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
  }
) {
  return createRateLimitMiddleware({
    tier,
    keyGenerator: options?.keyGenerator || ((req) => `${keyPrefix}:${getClientIP(req)}`),
    skip: options?.skip,
  });
}

/**
 * Middleware to add rate limit info to response (even when not limited)
 * 
 * Useful for debugging and monitoring
 */
export function rateLimitInfoMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rateLimiter = getRateLimiter();
      const ip = getClientIP(req);
      
      // Check global tier for info
      const result = await rateLimiter.checkLimit(`global:${ip}`, 'global');
      
      // Set informational headers
      res.setHeader('X-RateLimit-Info-Limit', result.limit);
      res.setHeader('X-RateLimit-Info-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Info-Reset', result.resetTime);
      
      next();
    } catch (error) {
      // Don't block request on error
      next();
    }
  };
}

// Export utilities for testing and custom implementations
export {
  getClientIP,
  isAllowlistedIP,
  isAdminUser,
};
