/**
 * AI Response Cache Manager
 * Implements intelligent caching with Redis to reduce AI API costs
 * Target: 70% cache hit rate
 */

import { createHash } from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  enabled: boolean;
  keyPrefix: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  costSaved: number;
}

export class AICacheManager {
  private redis: any;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    costSaved: 0,
  };

  constructor(private config: CacheConfig) {}

  /**
   * Initialize Redis connection
   */
  async initialize(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(
    prompt: string,
    model: string,
    temperature: number
  ): string {
    const data = JSON.stringify({ prompt, model, temperature });
    const hash = createHash('sha256').update(data).digest('hex');
    return `${this.config.keyPrefix}:${hash}`;
  }

  /**
   * Get cached response
   */
  async get(
    prompt: string,
    model: string,
    temperature: number
  ): Promise<any | null> {
    if (!this.config.enabled || !this.redis) {
      return null;
    }

    try {
      const key = this.generateCacheKey(prompt, model, temperature);
      const cached = await this.redis.get(key);

      if (cached) {
        this.stats.hits++;
        this.stats.totalRequests++;
        this.updateHitRate();

        console.log(`✅ Cache HIT for key: ${key.substring(0, 30)}...`);
        return JSON.parse(cached);
      }

      this.stats.misses++;
      this.stats.totalRequests++;
      this.updateHitRate();

      console.log(`❌ Cache MISS for key: ${key.substring(0, 30)}...`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache with response
   */
  async set(
    prompt: string,
    model: string,
    temperature: number,
    response: any,
    cost: number
  ): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      const key = this.generateCacheKey(prompt, model, temperature);
      const cacheData = {
        response,
        timestamp: Date.now(),
        cost,
      };

      await this.redis.setex(
        key,
        this.config.ttl,
        JSON.stringify(cacheData)
      );

      console.log(`💾 Cached response for key: ${key.substring(0, 30)}...`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(`${this.config.keyPrefix}:${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️  Invalidated ${keys.length} cache entries`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      costSaved: 0,
    };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.totalRequests) * 100;
    }
  }

  /**
   * Add cost savings to stats
   */
  addCostSaving(amount: number): void {
    this.stats.costSaved += amount;
  }

  /**
   * Warm up cache with common prompts
   */
  async warmUp(commonPrompts: Array<{ prompt: string; model: string }>): Promise<void> {
    console.log(`🔥 Warming up cache with ${commonPrompts.length} common prompts...`);
    // Implementation depends on your AI service
    // This is a placeholder for the warming strategy
  }
}

/**
 * Create default cache manager instance
 */
export function createAICacheManager(config?: Partial<CacheConfig>): AICacheManager {
  const defaultConfig: CacheConfig = {
    ttl: 3600 * 24 * 7, // 7 days
    enabled: process.env.AI_CACHE_ENABLED !== 'false',
    keyPrefix: 'ai:cache',
    ...config,
  };

  return new AICacheManager(defaultConfig);
}
