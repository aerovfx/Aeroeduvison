/**
 * Performance Optimization Library - Index
 * 
 * Central export for all performance optimization utilities
 * 
 * @module performance
 */

// Cache system
export { enhancedCache, cache } from './performance/cache-enhanced';
export type { CacheEntry, CacheStats } from './performance/cache-enhanced';

// Request deduplication
export {
  deduplicateRequest,
  debounce,
  throttle,
  debounceAsync,
  clearDebounceTimers,
  clearThrottleState,
  queueRequest,
  globalRequestQueue,
} from './performance/request-dedup';

// Performance middleware
export {
  withPerformance,
  withCacheHeaders,
  rateLimit,
  withCompression,
  addPrefetchHints,
  getPerformanceMetrics,
  clearMetrics,
} from './performance/performance-middleware';

// Database optimization
export {
  db,
  QueryOptimizer,
  warmupConnectionPool,
} from './performance/db-optimized';

// Re-export Redis for convenience
export { getRedisClient, getRedisSubscriber, checkRedisHealth } from '../redis';
