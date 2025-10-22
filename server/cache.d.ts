export interface CacheService {
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    clear(): Promise<void>;
    getMetrics(): CacheMetrics;
    getBackend(): string;
}
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
export declare class InMemoryCacheService implements CacheService {
    private cache;
    private accessOrder;
    private maxSize;
    private defaultTTL;
    private hits;
    private misses;
    private latencies;
    private maxLatencySamples;
    constructor(maxSize?: number, defaultTTL?: number);
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    clear(): Promise<void>;
    getMetrics(): CacheMetrics;
    getBackend(): string;
    private evictLRU;
    private cleanupExpired;
    private recordLatency;
}
export declare class RedisCacheService implements CacheService {
    private fallbackCache;
    private isAvailable;
    private hits;
    private misses;
    constructor();
    get<T = any>(key: string): Promise<T | null>;
    set<T = any>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    clear(): Promise<void>;
    getMetrics(): CacheMetrics;
    getBackend(): string;
}
export declare class CacheFactory {
    static create(): CacheService;
}
export declare const CacheTTL: {
    PRODUCTS: number;
    CURRENCY: number;
    PRICING: number;
    SESSION: number;
};
export declare const CacheKeys: {
    product: (id: string) => string;
    productList: (sellerId: string, filters?: string) => string;
    pricing: (sellerId: string, itemsHash: string) => string;
    currency: () => string;
    currencyConversion: (from: string, to: string) => string;
};
export declare function initializeCache(): CacheService;
export declare function getCache(): CacheService;
