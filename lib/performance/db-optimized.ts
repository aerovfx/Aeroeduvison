/**
 * db-optimized.ts - Optimized Prisma client with connection pooling and query optimization
 * 
 * Features:
 * - Connection pooling
 * - Query timeout
 * - Slow query logging
 * - Query caching
 * - Batch operations
 * - Transaction optimization
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { apiLogger } from "../logging-simple";
import { enhancedCache } from "./cache-enhanced";

// Query timeout configuration
const QUERY_TIMEOUT = 10000; // 10 seconds
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

// Connection pool configuration
const POOL_CONFIG = {
  max: 20, // Maximum connections
  min: 5, // Minimum connections
  idleTimeout: 30000, // 30 seconds
  connectTimeout: 10000, // 10 seconds
  acquireTimeout: 10000, // 10 seconds
};

// Query metrics
const queryMetrics = {
  total: 0,
  slow: 0,
  errors: 0,
  avgLatency: 0,
  latencies: [] as number[],
};

// NOTE: Do NOT create PrismaClient instances at module load time.
// Module-level instantiation causes Prisma to load native binaries and
// attempt DB connections as soon as any route imports this module.
// Use lazy initialization (getOptimizedPrisma()) instead.

// Global instance for hot reload
declare global {
  var prismaOptimized: PrismaClientOptimized | undefined;
}

// Extended Prisma client with optimization methods
class PrismaClientOptimized extends PrismaClient {
  /**
   * Execute query with timeout and caching
   */
  async queryWithCache<T>({
    query,
    cacheKey,
    ttl = 300,
    tags = [],
  }: {
    query: () => Promise<T>;
    cacheKey: string;
    ttl?: number;
    tags?: string[];
  }): Promise<T> {
    // Try cache first
    const cached = await enhancedCache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute with timeout
    const result = await this.withTimeout(query);

    // Cache result
    await enhancedCache.set(cacheKey, result, { ttl, tags });

    return result;
  }

  /**
   * Execute query with timeout
   */
  async withTimeout<T>(
    query: () => Promise<T>,
    timeoutMs: number = QUERY_TIMEOUT
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([query(), timeoutPromise]);
  }

  /**
   * Batch multiple queries efficiently
   */
  async batch<T>(
    queries: Array<() => Promise<T>>,
    options?: {
      concurrency?: number;
      stopOnError?: boolean;
    }
  ): Promise<T[]> {
    const { concurrency = 10, stopOnError = false } = options ?? {};

    const results: T[] = [];
    const errors: Error[] = [];

    // Process in batches
    for (let i = 0; i < queries.length; i += concurrency) {
      const batch = queries.slice(i, i + concurrency);
      
      const batchResults = await Promise.allSettled(
        batch.map((query) => this.withTimeout(query))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
          if (stopOnError) {
            throw result.reason;
          }
        }
      }
    }

    if (errors.length > 0 && stopOnError) {
      throw new Error(`Batch failed with ${errors.length} errors`);
    }

    return results;
  }

  /**
   * Optimized transaction with retry logic
   */
  async transactionWithRetry<T>(
    fn: (tx: Omit<PrismaClientOptimized, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options?: {
      maxRetries?: number;
      timeout?: number;
    }
  ): Promise<T> {
    const { maxRetries = 3, timeout = 30000 } = options ?? {};
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.$transaction(fn, {
          timeout,
          maxWait: 5000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        });
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2024', 'P2028'].includes(error.code)
        ) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Transaction failed after retries');
  }

  /**
   * Get query metrics
   */
  getMetrics() {
    return {
      ...queryMetrics,
      pool: {
        max: POOL_CONFIG.max,
        min: POOL_CONFIG.min,
      },
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message,
      };
    }
  }
}

// Lazy singleton: only created on first access
function getOptimizedPrisma(): PrismaClientOptimized {
  if (globalThis.prismaOptimized) return globalThis.prismaOptimized;

  const optimizedPrisma = new PrismaClientOptimized({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  // Add event listeners
  optimizedPrisma.$on('query', (e: any) => {
    const duration = e.duration;
    queryMetrics.total++;
    queryMetrics.latencies.push(duration);

    if (queryMetrics.latencies.length > 1000) {
      queryMetrics.latencies.shift();
    }

    queryMetrics.avgLatency = queryMetrics.latencies.reduce((a, b) => a + b, 0) / queryMetrics.latencies.length;

    if (duration > SLOW_QUERY_THRESHOLD) {
      queryMetrics.slow++;
      apiLogger.warn('Slow query detected', {
        metadata: {
          query: e.query,
          params: e.params,
          duration: `${duration}ms`,
          threshold: `${SLOW_QUERY_THRESHOLD}ms`,
        },
      });
    }
  });

  optimizedPrisma.$on('error', (e: any) => {
    queryMetrics.errors++;
    apiLogger.error('Database error', {
      metadata: {
        level: e.level,
        error: e.message,
      },
    });
  });

  globalThis.prismaOptimized = optimizedPrisma;
  return optimizedPrisma;
}

// Lazy singleton export — PrismaClient is NOT created at import time.
// The Proxy ensures the instance is created only on first property access.
export const db: PrismaClientOptimized = new Proxy({} as PrismaClientOptimized, {
  get(_target, prop) {
    const client = getOptimizedPrisma();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// Query optimization helpers
export const QueryOptimizer = {
  /**
   * Add pagination with cursor for better performance
   */
  async paginate<T>(
    query: (options: { skip?: number; take: number; cursor?: any }) => Promise<T[]>,
    options: {
      page: number;
      pageSize: number;
      cursor?: any;
    }
  ): Promise<{
    data: T[];
    hasMore: boolean;
    nextCursor?: any;
  }> {
    const { page, pageSize, cursor } = options;
    const skip = cursor ? 0 : (page - 1) * pageSize;

    const results = await query({
      skip,
      take: pageSize + 1, // Fetch one extra to check if there's more
      cursor,
    });
    const hasMore = results.length > pageSize;
    const data = hasMore ? results.slice(0, pageSize) : results;
    const nextCursor = hasMore ? results[pageSize - 1] : undefined;

    return { data, hasMore, nextCursor };
  },

  /**
   * Optimize query with selective fields
   */
  selectFields<T, K extends keyof T>(
    fields: K[]
  ): any {
    return {
      select: fields.reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<string, boolean>),
    } as any;
  },

  /**
   * Batch loading helper (similar to DataLoader)
   */
  createBatchLoader<T, K>(
    loader: (ids: K[]) => Promise<Map<K, T>>,
    options?: {
      batchSize?: number;
      batchDelay?: number;
    }
  ): (id: K) => Promise<T | null> {
    const { batchSize = 100, batchDelay = 0 } = options ?? {};
    const queue = new Set<K>();
    let pendingPromise: Promise<Map<K, T>> | null = null;

    const executeBatch = () => {
      if (queue.size === 0) return;

      const ids = Array.from(queue);
      queue.clear();

      pendingPromise = loader(ids);
    };

    return async (id: K): Promise<T | null> => {
      queue.add(id);

      if (!pendingPromise) {
        if (batchDelay > 0) {
          setTimeout(executeBatch, batchDelay);
        } else {
          executeBatch();
        }
      }

      const results = await (pendingPromise ?? Promise.resolve(new Map()));
      return results.get(id) ?? null;
    };
  },
};

// Connection pool utilities
export async function warmupConnectionPool(
  minConnections: number = POOL_CONFIG.min
): Promise<void> {
  const promises = Array.from({ length: minConnections }, () =>
    db.$queryRaw`SELECT 1`
  );

  await Promise.all(promises);
  apiLogger.info('Connection pool warmed up', {
    metadata: { connections: minConnections },
  });
}

export default db;
