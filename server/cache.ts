/**
 * Production-Grade Caching Layer
 * 
 * Provides a unified caching interface with flexible backends:
 * - In-memory caching with LRU eviction (development/small deployments)
 * - Redis caching (production, when available)
 * - Automatic fallback to in-memory if Redis unavailable
 * 
 * Features:
 * - Cache-first strategy for high-traffic paths
 * - Configurable TTL policies per data type
 * - Automatic cache invalidation on mutations
 * - Graceful degradation (fallback to direct queries)
 * - Performance metrics (hit rate, miss rate, latency)
 */

import { logger } from './logger';

/**
 * Cache Service Interface
 * 
 * Defines the contract for all cache implementations.
 * Supports get, set, delete, and clear operations with TTL.
 */
export interface CacheService {
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in the cache with optional TTL
   * @param key Cache key
   * @param value Value to cache (will be JSON serialized)
   * @param ttlSeconds Time-to-live in seconds (default: 300 = 5 minutes)
   */
  set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Delete all keys matching a pattern
   * @param pattern Pattern to match (e.g., "product:*")
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics;

  /**
   * Get cache backend name
   */
  getBackend(): string;
}

/**
 * Cache Metrics
 * 
 * Tracks cache performance for monitoring and optimization
 */
export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageLatencyMs: number;
  currentSize: number;
  maxSize: number;
  backend: string;
}

/**
 * Cache Entry
 * 
 * Internal structure for storing cached values with expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-Memory Cache Service with LRU Eviction
 * 
 * Features:
 * - Least Recently Used (LRU) eviction when max size reached
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Performance metrics tracking
 * 
 * Best for:
 * - Development environments
 * - Small deployments
 * - Single-instance servers
 */
export class InMemoryCacheService implements CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private accessOrder: Map<string, number>; // Track access time for LRU
  private maxSize: number;
  private defaultTTL: number;

  // Metrics
  private hits: number = 0;
  private misses: number = 0;
  private latencies: number[] = [];
  private maxLatencySamples: number = 1000; // Keep last 1000 latencies

  constructor(maxSize: number = 1000, defaultTTL: number = 300) {
    this.cache = new Map();
    this.accessOrder = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;

    logger.info('[InMemoryCache] Initialized', { maxSize, defaultTTL });

    // Cleanup expired entries every minute
    setInterval(() => this.cleanupExpired(), 60000);
  }

  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.misses++;
        this.recordLatency(startTime);
        return null;
      }

      // Check if expired
      if (entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.misses++;
        this.recordLatency(startTime);
        return null;
      }

      // Update access time for LRU
      this.accessOrder.set(key, Date.now());
      this.hits++;
      this.recordLatency(startTime);

      return entry.value as T;
    } catch (error) {
      logger.error('[InMemoryCache] Get error:', error);
      this.misses++;
      this.recordLatency(startTime);
      return null;
    }
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const startTime = Date.now();

    try {
      // Evict LRU entry if at max size
      if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
        this.evictLRU();
      }

      const ttl = ttlSeconds ?? this.defaultTTL;
      const expiresAt = Date.now() + ttl * 1000;

      this.cache.set(key, { value, expiresAt });
      this.accessOrder.set(key, Date.now());

      this.recordLatency(startTime);
    } catch (error) {
      logger.error('[InMemoryCache] Set error:', error);
      this.recordLatency(startTime);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    } catch (error) {
      logger.error('[InMemoryCache] Delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(`^${regexPattern}$`);

      const keysToDelete: string[] = [];
      for (const key of Array.from(this.cache.keys())) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        await this.delete(key);
      }

      logger.info('[InMemoryCache] Deleted pattern', { 
        pattern, 
        count: keysToDelete.length 
      });
    } catch (error) {
      logger.error('[InMemoryCache] DeletePattern error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.accessOrder.clear();
      logger.info('[InMemoryCache] Cache cleared');
    } catch (error) {
      logger.error('[InMemoryCache] Clear error:', error);
    }
  }

  getMetrics(): CacheMetrics {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.misses / totalRequests : 0;
    const averageLatencyMs = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      missRate: Math.round(missRate * 10000) / 100,
      totalRequests,
      averageLatencyMs: Math.round(averageLatencyMs * 100) / 100,
      currentSize: this.cache.size,
      maxSize: this.maxSize,
      backend: 'memory',
    };
  }

  getBackend(): string {
    return 'memory';
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, accessTime] of Array.from(this.accessOrder.entries())) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      logger.debug('[InMemoryCache] Evicted LRU entry', { key: oldestKey });
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug('[InMemoryCache] Cleaned up expired entries', { 
        count: expiredCount 
      });
    }
  }

  /**
   * Record latency for metrics
   */
  private recordLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    this.latencies.push(latency);

    // Keep only last N samples to avoid memory leak
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }
}

/**
 * Redis Cache Service (Stub for Future Implementation)
 * 
 * When Redis is available, this service will:
 * - Connect to Redis server
 * - Use Redis commands (GET, SET, DEL, EXPIRE)
 * - Support pub/sub for distributed cache invalidation
 * - Provide high-performance caching for production
 * 
 * Setup Instructions:
 * 1. Install Redis: npm install redis ioredis
 * 2. Set REDIS_URL environment variable
 * 3. Set CACHE_BACKEND=redis
 * 4. Implement Redis client connection
 * 5. Handle connection errors with fallback to in-memory
 * 
 * Example Implementation:
 * ```typescript
 * import { createClient } from 'redis';
 * 
 * const redisClient = createClient({
 *   url: process.env.REDIS_URL,
 * });
 * 
 * await redisClient.connect();
 * 
 * async get(key: string) {
 *   const value = await redisClient.get(key);
 *   return value ? JSON.parse(value) : null;
 * }
 * 
 * async set(key: string, value: any, ttl: number) {
 *   await redisClient.set(key, JSON.stringify(value), {
 *     EX: ttl,
 *   });
 * }
 * ```
 */
export class RedisCacheService implements CacheService {
  private fallbackCache: InMemoryCacheService;
  private isAvailable: boolean = false;

  // Metrics (will track once Redis is implemented)
  private hits: number = 0;
  private misses: number = 0;

  constructor() {
    this.fallbackCache = new InMemoryCacheService();
    
    logger.warn('[RedisCache] Redis not yet implemented - using in-memory fallback');
    logger.info('[RedisCache] To enable Redis:');
    logger.info('[RedisCache] 1. Install: npm install redis ioredis');
    logger.info('[RedisCache] 2. Set REDIS_URL environment variable');
    logger.info('[RedisCache] 3. Implement Redis client connection in server/cache.ts');
  }

  async get<T = any>(key: string): Promise<T | null> {
    // TODO: Implement Redis GET
    // For now, fallback to in-memory
    return this.fallbackCache.get<T>(key);
  }

  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // TODO: Implement Redis SET with EXPIRE
    // For now, fallback to in-memory
    return this.fallbackCache.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    // TODO: Implement Redis DEL
    return this.fallbackCache.delete(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    // TODO: Implement Redis SCAN + DEL
    return this.fallbackCache.deletePattern(pattern);
  }

  async clear(): Promise<void> {
    // TODO: Implement Redis FLUSHDB
    return this.fallbackCache.clear();
  }

  getMetrics(): CacheMetrics {
    // TODO: Implement Redis INFO stats
    const fallbackMetrics = this.fallbackCache.getMetrics();
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
 * Cache Factory
 * 
 * Creates the appropriate cache service based on environment configuration
 */
export class CacheFactory {
  static create(): CacheService {
    const backend = process.env.CACHE_BACKEND?.toLowerCase() || 'memory';
    const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '1000', 10);
    const defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10);

    logger.info('[CacheFactory] Creating cache service', { 
      backend, 
      maxSize, 
      defaultTTL 
    });

    switch (backend) {
      case 'redis':
        return new RedisCacheService();
      
      case 'memory':
      default:
        return new InMemoryCacheService(maxSize, defaultTTL);
    }
  }
}

/**
 * Cache TTL Constants
 * 
 * Configurable TTL policies for different data types
 */
export const CacheTTL = {
  PRODUCTS: parseInt(process.env.CACHE_TTL_PRODUCTS || '300', 10), // 5 minutes
  CURRENCY: parseInt(process.env.CACHE_TTL_CURRENCY || '3600', 10), // 1 hour
  PRICING: parseInt(process.env.CACHE_TTL_PRICING || '300', 10), // 5 minutes
  SESSION: parseInt(process.env.CACHE_TTL_SESSION || '86400', 10), // 24 hours
};

/**
 * Cache Key Builders
 * 
 * Standardized key naming conventions for different data types
 */
export const CacheKeys = {
  product: (id: string) => `product:${id}`,
  productList: (sellerId: string, filters?: string) => 
    `products:${sellerId}${filters ? `:${filters}` : ''}`,
  pricing: (sellerId: string, itemsHash: string) => 
    `pricing:${sellerId}:${itemsHash}`,
  currency: () => 'currency:rates',
  currencyConversion: (from: string, to: string) => 
    `currency:${from}:${to}`,
};

/**
 * Global Cache Instance
 * 
 * Singleton instance created at server startup
 */
let cacheInstance: CacheService | null = null;

export function initializeCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = CacheFactory.create();
    logger.info('[Cache] Cache service initialized', { 
      backend: cacheInstance.getBackend() 
    });
  }
  return cacheInstance;
}

export function getCache(): CacheService {
  if (!cacheInstance) {
    logger.warn('[Cache] Cache not initialized, creating new instance');
    return initializeCache();
  }
  return cacheInstance;
}
