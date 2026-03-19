/**
 * cache-enhanced.ts - Enhanced caching system with multi-tier support
 * 
 * Features:
 * - L1: In-memory LRU cache (fastest)
 * - L2: Redis cache (distributed)
 * - L3: Database/file cache (persistent)
 * - Smart cache invalidation
 * - Cache warming
 * - Performance metrics
 */

import { getRedisClient, getRedisSubscriber } from '../redis';
import { apiLogger } from '../logging-simple';

// Cache configuration
const CACHE_CONFIG = {
  L1_MAX_SIZE: 5000,
  L1_TTL: 60000, // 1 minute
  L2_DEFAULT_TTL: 300, // 5 minutes
  L2_LONG_TTL: 3600, // 1 hour
  L2_SHORT_TTL: 60, // 1 minute
  CLEANUP_INTERVAL: 120000, // 2 minutes
  WARMUP_DELAY: 5000, // 5 seconds
};

// LRU Cache implementation for L1
class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expires: number }>();
  private maxSize: number;

  constructor(maxSize: number = CACHE_CONFIG.L1_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: K): V | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: K, value: V, ttl: number = CACHE_CONFIG.L1_TTL): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): K[] {
    return Array.from(this.cache.keys());
  }
}

// Cache entry with metadata
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tags: string[];
}

// Cache statistics
interface CacheStats {
  l1Size: number;
  l2Connected: boolean;
  hits: number;
  misses: number;
  hitRate: number;
  avgLatency: number;
}

// Enhanced multi-tier cache
export class EnhancedCache {
  private l1Cache: LRUCache<string, any>;
  private stats = {
    hits: 0,
    misses: 0,
    latencies: [] as number[],
  };
  private tagIndex = new Map<string, Set<string>>(); // tag -> keys
  private initialized = false;

  constructor() {
    this.l1Cache = new LRUCache(CACHE_CONFIG.L1_MAX_SIZE);
    this.startCleanup();
  }

  private startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, CACHE_CONFIG.CLEANUP_INTERVAL);
  }

  private cleanup(): void {
    // L1 cleanup is handled by TTL checks in get/set
    // Could add additional cleanup logic here
  }

  /**
   * Get value from cache (L1 -> L2)
   */
  async get<T>(key: string, options?: { tags?: string[]; skipL1?: boolean }): Promise<T | null> {
    const startTime = Date.now();
    const { skipL1 = false } = options || {};

    try {
      // Try L1 cache first
      if (!skipL1) {
        const l1Value = this.l1Cache.get(key);
        if (l1Value !== null) {
          this.stats.hits++;
          this.recordLatency(Date.now() - startTime);
          apiLogger.debug('Cache hit L1', { metadata: { key, latency: Date.now() - startTime } });
          return l1Value as T;
        }
      }

      // Try L2 (Redis)
      const redis = getRedisClient();
      if (redis) {
        try {
          const l2Value = await redis.get(key);
          if (l2Value) {
            const parsed = JSON.parse(l2Value) as CacheEntry<T>['data'];
            
            // Populate L1
            this.l1Cache.set(key, parsed);
            
            this.stats.hits++;
            this.recordLatency(Date.now() - startTime);
            apiLogger.debug('Cache hit L2', { metadata: { key, latency: Date.now() - startTime } });
            return parsed;
          }
        } catch (error) {
          apiLogger.warn('Redis get error', { metadata: { key, error: (error as Error).message } });
        }
      }

      // Cache miss
      this.stats.misses++;
      this.recordLatency(Date.now() - startTime);
      apiLogger.debug('Cache miss', { metadata: { key, latency: Date.now() - startTime } });
      return null;
    } catch (error) {
      apiLogger.error('Cache get error', { metadata: { key, error: (error as Error).message } });
      return null;
    }
  }

  /**
   * Set value in cache (L1 + L2)
   */
  async set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      skipL1?: boolean;
      skipL2?: boolean;
    }
  ): Promise<void> {
    const { ttl = CACHE_CONFIG.L2_DEFAULT_TTL, tags = [], skipL1 = false, skipL2 = false } = options || {};
    const startTime = Date.now();

    try {
      // Set in L1
      if (!skipL1) {
        this.l1Cache.set(key, value, Math.min(ttl * 1000, CACHE_CONFIG.L1_TTL));
      }

      // Set in L2 (Redis)
      if (!skipL2) {
        const redis = getRedisClient();
        if (redis) {
          try {
            const entry: CacheEntry<T> = {
              data: value,
              timestamp: Date.now(),
              ttl,
              hits: 0,
              tags,
            };
            await redis.setex(key, ttl, JSON.stringify(value));

            // Update tag index
            if (tags.length > 0) {
              await this.updateTagIndex(key, tags);
            }
          } catch (error) {
            apiLogger.warn('Redis set error', { metadata: { key, error: (error as Error).message } });
          }
        }
      }

      apiLogger.debug('Cache set', { metadata: { key, ttl, latency: Date.now() - startTime } });
    } catch (error) {
      apiLogger.error('Cache set error', { metadata: { key, error: (error as Error).message } });
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string, options?: { fromL1?: boolean; fromL2?: boolean }): Promise<void> {
    const { fromL1 = true, fromL2 = true } = options || {};

    try {
      if (fromL1) {
        this.l1Cache.delete(key);
      }

      if (fromL2) {
        const redis = getRedisClient();
        if (redis) {
          await redis.del(key);
        }
      }

      apiLogger.debug('Cache delete', { metadata: { key } });
    } catch (error) {
      apiLogger.error('Cache delete error', { metadata: { key, error: (error as Error).message } });
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = this.tagIndex.get(tag);
      if (!keys) return 0;

      let deletedCount = 0;
      for (const key of keys) {
        await this.delete(key);
        deletedCount++;
      }

      this.tagIndex.delete(tag);
      apiLogger.info('Cache invalidated by tag', { metadata: { tag, deletedCount } });
      return deletedCount;
    } catch (error) {
      apiLogger.error('Cache invalidate by tag error', { metadata: { tag, error: (error as Error).message } });
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern (Redis only)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const redis = getRedisClient();
      if (!redis) return 0;

      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        apiLogger.info('Cache invalidated by pattern', { metadata: { pattern, count: keys.length } });
        return keys.length;
      }

      return 0;
    } catch (error) {
      apiLogger.error('Cache invalidate pattern error', { metadata: { pattern, error: (error as Error).message } });
      return 0;
    }
  }

  /**
   * Get or set with fallback function
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options?: {
      ttl?: number;
      tags?: string[];
      staleWhileRevalidate?: boolean;
    }
  ): Promise<T> {
    const { ttl, tags, staleWhileRevalidate = false } = options || {};

    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fallback();
    await this.set(key, value, { ttl, tags });

    return value;
  }

  /**
   * Warm up cache with precomputed values
   */
  async warmup(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    apiLogger.info('Cache warmup started', { metadata: { keyCount: keys.length } });

    const batchSize = 10;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const promises = batch.map(async (key) => {
        try {
          const value = await fetcher(key);
          await this.set(key, value, { ttl: CACHE_CONFIG.L2_LONG_TTL });
        } catch (error) {
          apiLogger.warn('Cache warmup error', { metadata: { key, error: (error as Error).message } });
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches
      if (i + batchSize < keys.length) {
        await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.WARMUP_DELAY));
      }
    }

    apiLogger.info('Cache warmup completed');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const redis = getRedisClient();
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const avgLatency = this.stats.latencies.length > 0
      ? this.stats.latencies.reduce((a, b) => a + b, 0) / this.stats.latencies.length
      : 0;

    return {
      l1Size: this.l1Cache.size(),
      l2Connected: redis !== null,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, latencies: [] };
  }

  private recordLatency(ms: number): void {
    this.stats.latencies.push(ms);
    // Keep last 1000 measurements
    if (this.stats.latencies.length > 1000) {
      this.stats.latencies.shift();
    }
  }

  private async updateTagIndex(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }
}

// Singleton instance
const globalForCache = globalThis as unknown as { enhancedCache?: EnhancedCache };
export const enhancedCache = globalForCache.enhancedCache ?? new EnhancedCache();

if (process.env.NODE_ENV !== 'production') {
  globalForCache.enhancedCache = enhancedCache;
}

// Cache decorator
export function cache(options?: { ttl?: number; key?: (...args: any[]) => string; tags?: string[] }) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = options?.key 
        ? options.key(...args)
        : `${propertyName}:${JSON.stringify(args)}`;

      const cached = await enhancedCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await enhancedCache.set(cacheKey, result, {
        ttl: options?.ttl,
        tags: options?.tags,
      });

      return result;
    };

    return descriptor;
  };
}

export default enhancedCache;
