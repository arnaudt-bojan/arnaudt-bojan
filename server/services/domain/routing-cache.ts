import { storage } from '../../storage';
import { logger } from '../../logger';

interface CacheEntry {
  sellerId: string;
  domain: string;
  isPrimary: boolean;
  expiresAt: number;
}

export class DomainRoutingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanExpiredEntries();
    }, this.CLEANUP_INTERVAL_MS);
  }

  stop(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned expired cache entries', {
        count: cleanedCount,
        remaining: this.cache.size,
      });
    }
  }

  async get(domain: string): Promise<string | null> {
    const normalizedDomain = domain.toLowerCase();
    const cached = this.cache.get(normalizedDomain);

    if (cached) {
      if (cached.expiresAt > Date.now()) {
        logger.debug('Domain routing cache hit', { domain: normalizedDomain });
        return cached.sellerId;
      } else {
        this.cache.delete(normalizedDomain);
      }
    }

    logger.debug('Domain routing cache miss', { domain: normalizedDomain });
    
    const domainConnection = await storage.getDomainConnectionByDomain(normalizedDomain);
    
    if (domainConnection && domainConnection.status === 'active') {
      this.set(normalizedDomain, domainConnection.sellerId, domainConnection.isPrimary === 1);
      return domainConnection.sellerId;
    }

    return null;
  }

  set(domain: string, sellerId: string, isPrimary: boolean = false): void {
    const normalizedDomain = domain.toLowerCase();
    
    this.cache.set(normalizedDomain, {
      sellerId,
      domain: normalizedDomain,
      isPrimary,
      expiresAt: Date.now() + this.TTL_MS,
    });

    logger.debug('Domain routing cached', {
      domain: normalizedDomain,
      sellerId,
      isPrimary,
    });
  }

  invalidate(domain: string): void {
    const normalizedDomain = domain.toLowerCase();
    const deleted = this.cache.delete(normalizedDomain);
    
    if (deleted) {
      logger.debug('Domain routing cache invalidated', { domain: normalizedDomain });
    }
  }

  invalidateBySeller(sellerId: string): void {
    let invalidatedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.sellerId === sellerId) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.debug('Invalidated seller domains from cache', {
      sellerId,
      count: invalidatedCount,
    });
  }

  async warm(): Promise<void> {
    logger.info('Warming up domain routing cache');

    try {
      const allDomains = await storage.getAllDomainConnections();
      const activeDomains = allDomains.filter((d) => d.status === 'active');

      for (const domain of activeDomains) {
        this.set(domain.normalizedDomain, domain.sellerId, domain.isPrimary === 1);
      }

      logger.info('Domain routing cache warmed', {
        totalDomains: allDomains.length,
        activeDomains: activeDomains.length,
      });
    } catch (error) {
      logger.error('Failed to warm domain routing cache', { error });
    }
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Domain routing cache cleared', { entriesCleared: size });
  }

  getStats(): {
    size: number;
    entries: Array<{
      domain: string;
      sellerId: string;
      isPrimary: boolean;
      expiresIn: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([domain, entry]) => ({
      domain,
      sellerId: entry.sellerId,
      isPrimary: entry.isPrimary,
      expiresIn: Math.max(0, entry.expiresAt - now),
    }));

    return {
      size: this.cache.size,
      entries,
    };
  }
}

export const domainRoutingCache = new DomainRoutingCache();
