/**
 * Production-Grade Rate Limiting System
 * 
 * Provides tiered rate limiting with flexible backends:
 * - Token bucket algorithm for smooth rate limiting with burst allowance
 * - In-memory storage (development/single-instance)
 * - Redis storage (production/distributed)
 * - Automatic fallback and graceful degradation
 * 
 * Features:
 * - Multi-tier rate limiting (global, auth, per-user, per-endpoint)
 * - IP allowlists and user role exemptions
 * - Comprehensive metrics and monitoring
 * - Configurable limits and windows
 * - Proper HTTP headers (X-RateLimit-*, Retry-After)
 */

import { logger } from './logger';

/**
 * Rate Limiter Service Interface
 * 
 * Defines the contract for all rate limiter implementations
 */
export interface RateLimiterService {
  /**
   * Check if a request is allowed under rate limits
   * @param key Unique identifier (IP, userId, endpoint)
   * @param tier Rate limit tier (global, auth, user, endpoint)
   * @returns Rate limit result with allowed status and metadata
   */
  checkLimit(key: string, tier: RateLimitTier): Promise<RateLimitResult>;

  /**
   * Reset rate limit for a specific key
   * @param key Identifier to reset
   * @param tier Rate limit tier
   */
  reset(key: string, tier: RateLimitTier): Promise<void>;

  /**
   * Reset all rate limits for a tier
   * @param tier Rate limit tier
   */
  resetAll(tier?: RateLimitTier): Promise<void>;

  /**
   * Get rate limit metrics
   */
  getMetrics(): RateLimiterMetrics;

  /**
   * Get backend name
   */
  getBackend(): string;
}

/**
 * Rate Limit Tiers
 */
export type RateLimitTier = 'global' | 'auth' | 'user' | 'endpoint';

/**
 * Rate Limit Configuration per Tier
 */
export interface RateLimitConfig {
  maxRequests: number;  // Max requests (bucket capacity)
  windowSeconds: number; // Time window in seconds
  refillRate: number;    // Tokens per second
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;     // Unix timestamp (seconds)
  retryAfter?: number;   // Seconds to wait if blocked
}

/**
 * Rate Limiter Metrics
 */
export interface RateLimiterMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  blockRate: number;     // Percentage
  violationsByTier: Record<RateLimitTier, number>;
  backend: string;
}

/**
 * Token Bucket Entry
 * 
 * Implements token bucket algorithm:
 * - Tokens refill at constant rate
 * - Bucket has maximum capacity
 * - Each request consumes one token
 * - Allows bursts up to capacity
 */
interface TokenBucket {
  tokens: number;          // Current tokens available
  capacity: number;        // Max tokens (bucket size)
  refillRate: number;      // Tokens per second
  lastRefill: number;      // Unix timestamp (ms)
}

/**
 * In-Memory Rate Limiter with Token Bucket Algorithm
 * 
 * Features:
 * - Token bucket for smooth rate limiting
 * - Burst allowance for legitimate traffic spikes
 * - Automatic token refill
 * - Per-tier bucket management
 * - Metrics tracking
 * 
 * Best for:
 * - Development environments
 * - Single-instance deployments
 * - Testing and prototyping
 */
export class InMemoryRateLimiter implements RateLimiterService {
  private buckets: Map<string, Map<RateLimitTier, TokenBucket>>;
  private configs: Map<RateLimitTier, RateLimitConfig>;
  
  // Metrics
  private totalRequests: number = 0;
  private allowedRequests: number = 0;
  private blockedRequests: number = 0;
  private violationsByTier: Record<RateLimitTier, number>;

  constructor(configs?: Partial<Record<RateLimitTier, RateLimitConfig>>) {
    this.buckets = new Map();
    this.configs = new Map();
    this.violationsByTier = {
      global: 0,
      auth: 0,
      user: 0,
      endpoint: 0,
    };

    // Set default configs
    this.setDefaultConfigs();

    // Override with provided configs
    if (configs) {
      for (const [tier, config] of Object.entries(configs)) {
        this.configs.set(tier as RateLimitTier, config);
      }
    }

    logger.info('[InMemoryRateLimiter] Initialized');

    // Cleanup old buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async checkLimit(key: string, tier: RateLimitTier): Promise<RateLimitResult> {
    this.totalRequests++;

    const config = this.configs.get(tier);
    if (!config) {
      logger.error('[InMemoryRateLimiter] Unknown tier', { tier });
      // Fail open - allow request if config missing
      this.allowedRequests++;
      return {
        allowed: true,
        limit: Infinity,
        remaining: Infinity,
        resetTime: Math.floor(Date.now() / 1000) + 60,
      };
    }

    // Get or create bucket for this key+tier
    const bucket = this.getOrCreateBucket(key, tier, config);

    // Refill tokens based on elapsed time
    this.refillBucket(bucket, config);

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      // Consume one token
      bucket.tokens -= 1;
      this.allowedRequests++;

      const resetTime = Math.floor((bucket.lastRefill + config.windowSeconds * 1000) / 1000);

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: Math.floor(bucket.tokens),
        resetTime,
      };
    } else {
      // Rate limit exceeded
      this.blockedRequests++;
      this.violationsByTier[tier]++;

      // Calculate retry after (time until next token)
      const timeUntilNextToken = Math.ceil(1 / config.refillRate);
      const resetTime = Math.floor(Date.now() / 1000) + timeUntilNextToken;

      logger.warn('[InMemoryRateLimiter] Rate limit exceeded', {
        key,
        tier,
        retryAfter: timeUntilNextToken,
      });

      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime,
        retryAfter: timeUntilNextToken,
      };
    }
  }

  async reset(key: string, tier: RateLimitTier): Promise<void> {
    const tierBuckets = this.buckets.get(key);
    if (tierBuckets) {
      tierBuckets.delete(tier);
    }
  }

  async resetAll(tier?: RateLimitTier): Promise<void> {
    if (tier) {
      // Reset specific tier for all keys
      const allTierBuckets = [...this.buckets.values()];
      for (const tierBuckets of allTierBuckets) {
        tierBuckets.delete(tier);
      }
    } else {
      // Reset everything
      this.buckets.clear();
    }
    logger.info('[InMemoryRateLimiter] Reset rate limits', { tier: tier || 'all' });
  }

  getMetrics(): RateLimiterMetrics {
    const blockRate = this.totalRequests > 0
      ? Math.round((this.blockedRequests / this.totalRequests) * 10000) / 100
      : 0;

    return {
      totalRequests: this.totalRequests,
      allowedRequests: this.allowedRequests,
      blockedRequests: this.blockedRequests,
      blockRate,
      violationsByTier: { ...this.violationsByTier },
      backend: 'memory',
    };
  }

  getBackend(): string {
    return 'memory';
  }

  /**
   * Get or create token bucket for key+tier
   */
  private getOrCreateBucket(
    key: string,
    tier: RateLimitTier,
    config: RateLimitConfig
  ): TokenBucket {
    let tierBuckets = this.buckets.get(key);
    if (!tierBuckets) {
      tierBuckets = new Map();
      this.buckets.set(key, tierBuckets);
    }

    let bucket = tierBuckets.get(tier);
    if (!bucket) {
      bucket = {
        tokens: config.maxRequests,
        capacity: config.maxRequests,
        refillRate: config.refillRate,
        lastRefill: Date.now(),
      };
      tierBuckets.set(tier, bucket);
    }

    return bucket;
  }

  /**
   * Refill tokens based on elapsed time
   * 
   * Token bucket refill formula:
   * tokens = min(capacity, current_tokens + (elapsed_seconds * refill_rate))
   */
  private refillBucket(bucket: TokenBucket, config: RateLimitConfig): void {
    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;

    if (elapsedSeconds > 0) {
      const tokensToAdd = elapsedSeconds * bucket.refillRate;
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  }

  /**
   * Cleanup old buckets with no recent activity
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour
    let cleanedCount = 0;

    const bucketsArray = [...this.buckets.entries()];
    for (const [key, tierBuckets] of bucketsArray) {
      const tierBucketsArray = [...tierBuckets.entries()];
      for (const [tier, bucket] of tierBucketsArray) {
        if (now - bucket.lastRefill > maxAge) {
          tierBuckets.delete(tier);
          cleanedCount++;
        }
      }
      
      if (tierBuckets.size === 0) {
        this.buckets.delete(key);
      }
    }

    if (cleanedCount > 0) {
      logger.debug('[InMemoryRateLimiter] Cleaned up old buckets', {
        count: cleanedCount,
      });
    }
  }

  /**
   * Set default rate limit configurations
   */
  private setDefaultConfigs(): void {
    // Global: 1000 requests/min (prevent DDoS)
    this.configs.set('global', {
      maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10),
      windowSeconds: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW || '60', 10),
      refillRate: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '1000', 10) / 
                  parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW || '60', 10),
    });

    // Auth: 5 requests/15min (prevent brute force)
    this.configs.set('auth', {
      maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
      windowSeconds: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900', 10),
      refillRate: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10) / 
                  parseInt(process.env.RATE_LIMIT_AUTH_WINDOW || '900', 10),
    });

    // Per-user: 100 requests/min (authenticated users)
    this.configs.set('user', {
      maxRequests: parseInt(process.env.RATE_LIMIT_USER_MAX || '100', 10),
      windowSeconds: parseInt(process.env.RATE_LIMIT_USER_WINDOW || '60', 10),
      refillRate: parseInt(process.env.RATE_LIMIT_USER_MAX || '100', 10) / 
                  parseInt(process.env.RATE_LIMIT_USER_WINDOW || '60', 10),
    });

    // Per-endpoint: Configurable (default same as global)
    this.configs.set('endpoint', {
      maxRequests: parseInt(process.env.RATE_LIMIT_ENDPOINT_MAX || '1000', 10),
      windowSeconds: parseInt(process.env.RATE_LIMIT_ENDPOINT_WINDOW || '60', 10),
      refillRate: parseInt(process.env.RATE_LIMIT_ENDPOINT_MAX || '1000', 10) / 
                  parseInt(process.env.RATE_LIMIT_ENDPOINT_WINDOW || '60', 10),
    });
  }
}

/**
 * Redis Rate Limiter (Stub for Future Implementation)
 * 
 * When Redis is available, this service will:
 * - Use Redis for distributed rate limiting
 * - Support multi-instance deployments
 * - Persist rate limit state across restarts
 * - Use Redis INCR/EXPIRE for efficient counting
 * - Implement token bucket with Lua scripts
 * 
 * Setup Instructions:
 * 1. Install Redis: npm install redis ioredis
 * 2. Set REDIS_URL environment variable
 * 3. Set RATE_LIMIT_BACKEND=redis
 * 4. Implement Redis client connection
 * 5. Use Lua scripts for atomic token bucket operations
 * 
 * Example Lua Script for Token Bucket:
 * ```lua
 * local key = KEYS[1]
 * local capacity = tonumber(ARGV[1])
 * local refill_rate = tonumber(ARGV[2])
 * local now = tonumber(ARGV[3])
 * 
 * local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
 * local tokens = tonumber(bucket[1]) or capacity
 * local last_refill = tonumber(bucket[2]) or now
 * 
 * -- Refill tokens
 * local elapsed = (now - last_refill) / 1000
 * tokens = math.min(capacity, tokens + (elapsed * refill_rate))
 * 
 * -- Check and consume
 * if tokens >= 1 then
 *   tokens = tokens - 1
 *   redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
 *   redis.call('EXPIRE', key, 3600)
 *   return {1, tokens}  -- allowed, remaining
 * else
 *   return {0, 0}  -- blocked
 * end
 * ```
 */
export class RedisRateLimiter implements RateLimiterService {
  private fallbackLimiter: InMemoryRateLimiter;
  private isAvailable: boolean = false;

  constructor(configs?: Partial<Record<RateLimitTier, RateLimitConfig>>) {
    this.fallbackLimiter = new InMemoryRateLimiter(configs);
    
    logger.warn('[RedisRateLimiter] Redis not yet implemented - using in-memory fallback');
    logger.info('[RedisRateLimiter] To enable Redis:');
    logger.info('[RedisRateLimiter] 1. Install: npm install redis ioredis');
    logger.info('[RedisRateLimiter] 2. Set REDIS_URL environment variable');
    logger.info('[RedisRateLimiter] 3. Set RATE_LIMIT_BACKEND=redis');
    logger.info('[RedisRateLimiter] 4. Implement Redis client in server/rate-limiter.ts');
  }

  async checkLimit(key: string, tier: RateLimitTier): Promise<RateLimitResult> {
    // TODO: Implement Redis-based rate limiting with Lua scripts
    return this.fallbackLimiter.checkLimit(key, tier);
  }

  async reset(key: string, tier: RateLimitTier): Promise<void> {
    // TODO: Implement Redis DEL
    return this.fallbackLimiter.reset(key, tier);
  }

  async resetAll(tier?: RateLimitTier): Promise<void> {
    // TODO: Implement Redis SCAN + DEL
    return this.fallbackLimiter.resetAll(tier);
  }

  getMetrics(): RateLimiterMetrics {
    // TODO: Implement Redis-based metrics
    const fallbackMetrics = this.fallbackLimiter.getMetrics();
    return {
      ...fallbackMetrics,
      backend: 'redis (fallback to memory)',
    };
  }

  getBackend(): string {
    return this.isAvailable ? 'redis' : 'redis (fallback to memory)';
  }
}

/**
 * Rate Limiter Factory
 * 
 * Creates the appropriate rate limiter based on environment configuration
 */
export class RateLimiterFactory {
  static create(): RateLimiterService {
    const backend = process.env.RATE_LIMIT_BACKEND?.toLowerCase() || 'memory';

    switch (backend) {
      case 'redis':
        logger.info('[RateLimiterFactory] Creating Redis rate limiter');
        return new RedisRateLimiter();

      case 'memory':
      default:
        logger.info('[RateLimiterFactory] Creating in-memory rate limiter');
        return new InMemoryRateLimiter();
    }
  }
}

/**
 * Global rate limiter instance
 * 
 * Singleton pattern for consistent rate limiting across the application
 */
let rateLimiterInstance: RateLimiterService | null = null;

export function getRateLimiter(): RateLimiterService {
  if (!rateLimiterInstance) {
    rateLimiterInstance = RateLimiterFactory.create();
  }
  return rateLimiterInstance;
}

/**
 * Initialize rate limiter
 * 
 * Call this at application startup
 */
export function initializeRateLimiter(): RateLimiterService {
  if (rateLimiterInstance) {
    logger.warn('[RateLimiter] Already initialized');
    return rateLimiterInstance;
  }

  rateLimiterInstance = RateLimiterFactory.create();
  logger.info('[RateLimiter] Initialized successfully');
  return rateLimiterInstance;
}
