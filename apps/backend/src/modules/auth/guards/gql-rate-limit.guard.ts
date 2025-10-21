import { CanActivate, ExecutionContext, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerException } from '@nestjs/common';

const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number;
  ttl: number; // in seconds
}

export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class GqlRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(GqlRateLimitGuard.name);
  private readonly storage = new Map<string, RateLimitEntry>();
  
  // Tiered limits (requests per minute)
  private readonly DEFAULT_LIMITS = {
    anonymous: { limit: 10, ttl: 60 },
    authenticated: { limit: 100, ttl: 60 },
    premium: { limit: 1000, ttl: 60 },
  };

  constructor(private reflector: Reflector) {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { req } = ctx.getContext();
    
    // Get custom rate limit from decorator or use default
    const customLimit = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    // Determine user tier
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub;
    const isPremium = req.user?.isPremium || false;
    
    // Select appropriate rate limit
    let rateLimit: RateLimitOptions;
    if (customLimit) {
      rateLimit = customLimit;
    } else if (isPremium) {
      rateLimit = this.DEFAULT_LIMITS.premium;
    } else if (isAuthenticated) {
      rateLimit = this.DEFAULT_LIMITS.authenticated;
    } else {
      rateLimit = this.DEFAULT_LIMITS.anonymous;
    }

    // Generate key based on user ID or IP
    const userId = req.user?.claims?.sub;
    const key = userId || req.ip || 'unknown';
    const rateLimitKey = `${key}:${context.getHandler().name}`;

    // Check rate limit
    const now = Date.now();
    const entry = this.storage.get(rateLimitKey);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      this.storage.set(rateLimitKey, {
        count: 1,
        resetTime: now + (rateLimit.ttl * 1000),
      });
      return true;
    }

    if (entry.count >= rateLimit.limit) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      this.logger.warn(`Rate limit exceeded for ${key} on ${context.getHandler().name}. Reset in ${resetIn}s`);
      
      throw new ThrottlerException(
        `Too many requests. Please try again in ${resetIn} seconds.`
      );
    }

    // Increment count
    entry.count++;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.storage.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }
}
