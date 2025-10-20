import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  CacheService as ServerCacheService,
  getCache,
  initializeCache,
  CacheMetrics,
} from '../../../../../server/cache';

/**
 * NestJS Cache Service Wrapper
 * 
 * Wraps the server/cache.ts service for use in NestJS modules.
 * Provides caching for high-frequency queries to reduce database load.
 * 
 * Cache TTL Guidelines:
 * - Products: 300s (5 min) - relatively stable data
 * - Quotations: 300s (5 min) - relatively stable data
 * - Pricing: 300s (5 min) - changes infrequently
 * - Volatile data: 60s (1 min) - frequently changing
 * 
 * Cache Key Conventions:
 * - product:{id}
 * - products:seller:{sellerId}
 * - quotation:{id}
 * - quotations:seller:{sellerId}
 * - wholesale:rules:{sellerId}
 * - store:{sellerId}
 */
@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private cache: ServerCacheService;

  async onModuleInit() {
    this.cache = initializeCache();
    this.logger.log(`Cache service initialized with backend: ${this.cache.getBackend()}`);
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      return await this.cache.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in the cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time-to-live in seconds (default: 300 = 5 minutes)
   */
  async set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlSeconds);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  async del(key: string): Promise<void> {
    try {
      await this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Pattern to match (e.g., "product:*")
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      await this.cache.deletePattern(pattern);
      this.logger.debug(`Deleted cache pattern: ${pattern}`);
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.cache.clear();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics {
    return this.cache.getMetrics();
  }

  /**
   * Get cache backend name
   */
  getBackend(): string {
    return this.cache.getBackend();
  }
}
