/**
 * cache.ts - Production-ready caching system for LMS
 * 
 * Features:
 * - Redis integration for distributed caching
 * - In-memory fallback
 * - TTL support
 * - Cache invalidation
 * - Performance monitoring
 */

import { apiLogger } from './logging-simple';

// Conditional Redis import for production only
let Redis: any = null;
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  try {
    // Dynamic import to avoid build errors
    Redis = eval('require("ioredis").Redis');
  } catch (error) {
    console.warn('Redis not available, using memory cache only');
  }
}

// Cache configuration
const CACHE_CONFIG = {
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  DEFAULT_TTL: 300, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  MEMORY_CACHE_SIZE: 1000,
  MEMORY_CACHE_TTL: 60000 // 1 minute
};

// In-memory cache fallback
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = CACHE_CONFIG.MEMORY_CACHE_SIZE, ttl: number = CACHE_CONFIG.MEMORY_CACHE_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: any, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl || this.ttl)
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Redis cache with fallback
class RedisCache {
  private redis: Redis | null = null;
  private memoryCache: MemoryCache;
  private isConnected = false;

  constructor() {
    this.memoryCache = new MemoryCache();
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!Redis) {
      this.isConnected = false;
      return;
    }

    try {
      this.redis = new Redis(CACHE_CONFIG.REDIS_URL, {
        retryDelayOnFailover: CACHE_CONFIG.RETRY_DELAY,
        maxRetriesPerRequest: CACHE_CONFIG.MAX_RETRIES,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        apiLogger.info('Redis cache connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        apiLogger.error('Redis cache error', { metadata: { error: error.message } });
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        apiLogger.warn('Redis cache disconnected');
      });

      await this.redis.connect();
    } catch (error) {
      apiLogger.error('Failed to initialize Redis cache', { metadata: { error: (error as Error).message } });
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      if (this.isConnected && this.redis) {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data);
        }
      }
    } catch (error) {
      apiLogger.error('Redis get error', { metadata: { key, error: (error as Error).message } });
    }

    // Fallback to memory cache
    return this.memoryCache.get(key);
  }

  async set(key: string, data: any, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(data));
      }
    } catch (error) {
      apiLogger.error('Redis set error', { metadata: { key, error: (error as Error).message } });
    }

    // Always update memory cache as fallback
    this.memoryCache.set(key, data, ttl * 1000);
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.del(key);
      }
    } catch (error) {
      apiLogger.error('Redis delete error', { metadata: { key, error: (error as Error).message } });
    }

    this.memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        await this.redis.flushdb();
      }
    } catch (error) {
      apiLogger.error('Redis clear error', { metadata: { error: (error as Error).message } });
    }

    this.memoryCache.clear();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.isConnected && this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      apiLogger.error('Redis pattern invalidation error', { metadata: { pattern, error: (error as Error).message } });
    }
  }

  getStats(): { redis: boolean; memorySize: number; memoryTtl: number } {
    return {
      redis: this.isConnected,
      memorySize: this.memoryCache.size(),
      memoryTtl: CACHE_CONFIG.MEMORY_CACHE_TTL
    };
  }
}

// Cache instance
const cache = new RedisCache();

// Cache decorator for functions
export function cached(ttl: number = CACHE_CONFIG.DEFAULT_TTL, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cache.get(key);
      if (cached !== null) {
        apiLogger.debug('Cache hit', { metadata: { key, method: propertyName } });
        return cached;
      }

      // Execute method and cache result
      const result = await method.apply(this, args);
      await cache.set(key, result, ttl);
      
      apiLogger.debug('Cache miss', { metadata: { key, method: propertyName } });
      return result;
    };

    return descriptor;
  };
}

// Cache utilities
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    return await cache.get(key);
  }

  static async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<void> {
    await cache.set(key, data, ttl);
  }

  static async delete(key: string): Promise<void> {
    await cache.delete(key);
  }

  static async clear(): Promise<void> {
    await cache.clear();
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    await cache.invalidatePattern(pattern);
  }

  static getStats() {
    return cache.getStats();
  }

  // Cache key generators
  static generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  static generateUserKey(userId: string, resource: string): string {
    return this.generateKey('user', userId, resource);
  }

  static generateCourseKey(courseId: string, resource: string): string {
    return this.generateKey('course', courseId, resource);
  }

  static generateSchoolKey(schoolId: string, resource: string): string {
    return this.generateKey('school', schoolId, resource);
  }

  // Cache invalidation helpers
  static async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`);
  }

  static async invalidateCourseCache(courseId: string): Promise<void> {
    await this.invalidatePattern(`course:${courseId}:*`);
  }

  static async invalidateSchoolCache(schoolId: string): Promise<void> {
    await this.invalidatePattern(`school:${schoolId}:*`);
  }
}

// Cache middleware for API routes
export function withCache(ttl: number = CACHE_CONFIG.DEFAULT_TTL) {
  return function (handler: Function) {
    return async function (req: any, res: any, ...args: any[]) {
      const cacheKey = CacheManager.generateKey('api', req.url, JSON.stringify(req.query || {}));
      
      try {
        // Try to get from cache
        const cached = await CacheManager.get(cacheKey);
        if (cached) {
          return res.json(cached);
        }

        // Execute handler
        const result = await handler(req, res, ...args);
        
        // Cache result if it's a successful response
        if (result && !result.error) {
          await CacheManager.set(cacheKey, result, ttl);
        }

        return result;
      } catch (error) {
        apiLogger.error('Cache middleware error', { metadata: { error: (error as Error).message } });
        return handler(req, res, ...args);
      }
    };
  };
}

export default CacheManager;
