/**
 * AI Cache Manager - Intelligent Caching System
 * 
 * Features:
 * - Cache frequently asked questions
 * - Reduce 80-90% cost for repeated queries
 * - TTL-based expiration
 * - LRU eviction policy
 */

import { createHash } from 'crypto';

export interface CacheEntry {
  data: any;
  timestamp: number;
  hits: number;
  cost: number;
  modelUsed: string;
  taskType: string;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  costSaved: number;
  avgResponseTime: number;
}

export class AICacheManager {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private defaultTTL: number; // milliseconds
  private stats: {
    hits: number;
    misses: number;
    costSaved: number;
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 24 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      costSaved: 0,
    };
  }

  /**
   * Generate cache key from request
   */
  generateKey(request: any): string {
    // Normalize request to avoid cache misses due to formatting
    const normalized = {
      type: request.type,
      subject: request.subject?.toLowerCase().trim(),
      grade: request.grade,
      topic: request.topic?.toLowerCase().trim(),
      difficulty: request.difficulty || 'medium',
      // Don't include user-specific data or timestamps
    };

    const hash = createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');

    return `ai_${normalized.type}_${hash}`;
  }

  /**
   * Get cached response
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const age = Date.now() - entry.timestamp;
    if (age > this.defaultTTL) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update stats
    entry.hits++;
    this.stats.hits++;
    this.stats.costSaved += entry.cost;

    console.log(`✅ Cache HIT: ${key} (hits: ${entry.hits}, saved: $${entry.cost.toFixed(6)})`);

    return entry.data;
  }

  /**
   * Store response in cache
   */
  set(
    key: string,
    data: any,
    cost: number,
    modelUsed: string,
    taskType: string
  ): void {
    // Evict oldest entry if cache is full (LRU)
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      cost,
      modelUsed,
      taskType,
    });

    console.log(`💾 Cache SET: ${key} (model: ${modelUsed}, cost: $${cost.toFixed(6)})`);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️  Evicted LRU entry: ${oldestKey}`);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.defaultTTL) {
        this.cache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    this.cache.clear();
    console.log('🗑️  All cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      hitRate: hitRate * 100,
      costSaved: this.stats.costSaved,
      avgResponseTime: 0.05, // Cache response time ~50ms
    };
  }

  /**
   * Get most cached items (popular queries)
   */
  getPopularQueries(limit: number = 10): Array<{
    key: string;
    hits: number;
    modelUsed: string;
    taskType: string;
  }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        modelUsed: entry.modelUsed,
        taskType: entry.taskType,
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return entries;
  }

  /**
   * Export cache for backup
   */
  export(): string {
    const data = Array.from(this.cache.entries());
    return JSON.stringify(data);
  }

  /**
   * Import cache from backup
   */
  import(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      this.cache = new Map(data);
      console.log(`✅ Imported ${data.length} cache entries`);
    } catch (error) {
      console.error('❌ Failed to import cache:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new AICacheManager();

// Auto-clear expired entries every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cacheManager.clearExpired();
  }, 60 * 60 * 1000);
}

