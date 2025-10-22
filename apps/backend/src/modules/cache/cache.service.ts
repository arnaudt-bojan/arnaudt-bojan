import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * NestJS Cache Service
 * 
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
  private cache: Map<string, CacheEntry<any>> = new Map();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
  };

  async onModuleInit() {
    this.logger.log('Cache service initialized with in-memory backend');
    
    setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return entry.value as T;
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
  async set<T = any>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    try {
      const expiresAt = Date.now() + (ttlSeconds * 1000);
      this.cache.set(key, { value, expiresAt });
      this.metrics.sets++;
      this.metrics.size = this.cache.size;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      this.cache.delete(key);
      this.metrics.deletes++;
      this.metrics.size = this.cache.size;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Legacy method - alias for delete
   */
  async del(key: string): Promise<void> {
    return this.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Pattern to match (e.g., "product:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const keysToDelete: string[] = [];
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.cache.delete(key);
        this.metrics.deletes++;
      }
      
      this.metrics.size = this.cache.size;
      this.logger.debug(`Deleted cache pattern: ${pattern} (${keysToDelete.length} keys)`);
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Legacy method - alias for deletePattern
   */
  async delPattern(pattern: string): Promise<void> {
    return this.deletePattern(pattern);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.metrics.size = 0;
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache backend name
   */
  getBackend(): string {
    return 'in-memory';
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }

    if (keysToDelete.length > 0) {
      this.metrics.size = this.cache.size;
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

let cacheInstance: CacheService | null = null;

export function initializeCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
    cacheInstance.onModuleInit();
  }
  return cacheInstance;
}

export function getCache(): CacheService {
  if (!cacheInstance) {
    return initializeCache();
  }
  return cacheInstance;
}
