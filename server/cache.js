"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheKeys = exports.CacheTTL = exports.CacheFactory = exports.RedisCacheService = exports.InMemoryCacheService = void 0;
exports.initializeCache = initializeCache;
exports.getCache = getCache;
const logger_1 = require("./logger");
class InMemoryCacheService {
    constructor(maxSize = 1000, defaultTTL = 300) {
        this.hits = 0;
        this.misses = 0;
        this.latencies = [];
        this.maxLatencySamples = 1000;
        this.cache = new Map();
        this.accessOrder = new Map();
        this.maxSize = maxSize;
        this.defaultTTL = defaultTTL;
        logger_1.logger.info('[InMemoryCache] Initialized', { maxSize, defaultTTL });
        setInterval(() => this.cleanupExpired(), 60000);
    }
    async get(key) {
        const startTime = Date.now();
        try {
            const entry = this.cache.get(key);
            if (!entry) {
                this.misses++;
                this.recordLatency(startTime);
                return null;
            }
            if (entry.expiresAt < Date.now()) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                this.misses++;
                this.recordLatency(startTime);
                return null;
            }
            this.accessOrder.set(key, Date.now());
            this.hits++;
            this.recordLatency(startTime);
            return entry.value;
        }
        catch (error) {
            logger_1.logger.error('[InMemoryCache] Get error:', error);
            this.misses++;
            this.recordLatency(startTime);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        const startTime = Date.now();
        try {
            if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
                this.evictLRU();
            }
            const ttl = ttlSeconds ?? this.defaultTTL;
            const expiresAt = Date.now() + ttl * 1000;
            this.cache.set(key, { value, expiresAt });
            this.accessOrder.set(key, Date.now());
            this.recordLatency(startTime);
        }
        catch (error) {
            logger_1.logger.error('[InMemoryCache] Set error:', error);
            this.recordLatency(startTime);
        }
    }
    async delete(key) {
        try {
            this.cache.delete(key);
            this.accessOrder.delete(key);
        }
        catch (error) {
            logger_1.logger.error('[InMemoryCache] Delete error:', error);
        }
    }
    async deletePattern(pattern) {
        try {
            const regexPattern = pattern
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`);
            const keysToDelete = [];
            for (const key of Array.from(this.cache.keys())) {
                if (regex.test(key)) {
                    keysToDelete.push(key);
                }
            }
            for (const key of keysToDelete) {
                await this.delete(key);
            }
            logger_1.logger.info('[InMemoryCache] Deleted pattern', {
                pattern,
                count: keysToDelete.length
            });
        }
        catch (error) {
            logger_1.logger.error('[InMemoryCache] DeletePattern error:', error);
        }
    }
    async clear() {
        try {
            this.cache.clear();
            this.accessOrder.clear();
            logger_1.logger.info('[InMemoryCache] Cache cleared');
        }
        catch (error) {
            logger_1.logger.error('[InMemoryCache] Clear error:', error);
        }
    }
    getMetrics() {
        const totalRequests = this.hits + this.misses;
        const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;
        const missRate = totalRequests > 0 ? this.misses / totalRequests : 0;
        const averageLatencyMs = this.latencies.length > 0
            ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
            : 0;
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: Math.round(hitRate * 10000) / 100,
            missRate: Math.round(missRate * 10000) / 100,
            totalRequests,
            averageLatencyMs: Math.round(averageLatencyMs * 100) / 100,
            currentSize: this.cache.size,
            maxSize: this.maxSize,
            backend: 'memory',
        };
    }
    getBackend() {
        return 'memory';
    }
    evictLRU() {
        let oldestKey = null;
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
            logger_1.logger.debug('[InMemoryCache] Evicted LRU entry', { key: oldestKey });
        }
    }
    cleanupExpired() {
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
            logger_1.logger.debug('[InMemoryCache] Cleaned up expired entries', {
                count: expiredCount
            });
        }
    }
    recordLatency(startTime) {
        const latency = Date.now() - startTime;
        this.latencies.push(latency);
        if (this.latencies.length > this.maxLatencySamples) {
            this.latencies.shift();
        }
    }
}
exports.InMemoryCacheService = InMemoryCacheService;
class RedisCacheService {
    constructor() {
        this.isAvailable = false;
        this.hits = 0;
        this.misses = 0;
        this.fallbackCache = new InMemoryCacheService();
        logger_1.logger.warn('[RedisCache] Redis not yet implemented - using in-memory fallback');
        logger_1.logger.info('[RedisCache] To enable Redis:');
        logger_1.logger.info('[RedisCache] 1. Install: npm install redis ioredis');
        logger_1.logger.info('[RedisCache] 2. Set REDIS_URL environment variable');
        logger_1.logger.info('[RedisCache] 3. Implement Redis client connection in server/cache.ts');
    }
    async get(key) {
        return this.fallbackCache.get(key);
    }
    async set(key, value, ttlSeconds) {
        return this.fallbackCache.set(key, value, ttlSeconds);
    }
    async delete(key) {
        return this.fallbackCache.delete(key);
    }
    async deletePattern(pattern) {
        return this.fallbackCache.deletePattern(pattern);
    }
    async clear() {
        return this.fallbackCache.clear();
    }
    getMetrics() {
        const fallbackMetrics = this.fallbackCache.getMetrics();
        return {
            ...fallbackMetrics,
            backend: 'redis (fallback to memory)',
        };
    }
    getBackend() {
        return this.isAvailable ? 'redis' : 'redis (fallback to memory)';
    }
}
exports.RedisCacheService = RedisCacheService;
class CacheFactory {
    static create() {
        const backend = process.env.CACHE_BACKEND?.toLowerCase() || 'memory';
        const maxSize = parseInt(process.env.CACHE_MAX_SIZE || '1000', 10);
        const defaultTTL = parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10);
        logger_1.logger.info('[CacheFactory] Creating cache service', {
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
exports.CacheFactory = CacheFactory;
exports.CacheTTL = {
    PRODUCTS: parseInt(process.env.CACHE_TTL_PRODUCTS || '300', 10),
    CURRENCY: parseInt(process.env.CACHE_TTL_CURRENCY || '3600', 10),
    PRICING: parseInt(process.env.CACHE_TTL_PRICING || '300', 10),
    SESSION: parseInt(process.env.CACHE_TTL_SESSION || '86400', 10),
};
exports.CacheKeys = {
    product: (id) => `product:${id}`,
    productList: (sellerId, filters) => `products:${sellerId}${filters ? `:${filters}` : ''}`,
    pricing: (sellerId, itemsHash) => `pricing:${sellerId}:${itemsHash}`,
    currency: () => 'currency:rates',
    currencyConversion: (from, to) => `currency:${from}:${to}`,
};
let cacheInstance = null;
function initializeCache() {
    if (!cacheInstance) {
        cacheInstance = CacheFactory.create();
        logger_1.logger.info('[Cache] Cache service initialized', {
            backend: cacheInstance.getBackend()
        });
    }
    return cacheInstance;
}
function getCache() {
    if (!cacheInstance) {
        logger_1.logger.warn('[Cache] Cache not initialized, creating new instance');
        return initializeCache();
    }
    return cacheInstance;
}
//# sourceMappingURL=cache.js.map