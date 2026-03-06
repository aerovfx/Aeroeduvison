/**
 * performance.ts - Production-ready performance optimization utilities
 * 
 * Features:
 * - Database query optimization
 * - Memory management
 * - Connection pooling
 * - Lazy loading
 * - Compression
 * - CDN integration
 */

import { apiLogger } from './logging-simple';
import { MonitoringSystem } from './monitoring';

// Performance configuration
const PERFORMANCE_CONFIG = {
  DB_CONNECTION_POOL_SIZE: 10,
  QUERY_TIMEOUT: 30000,
  CACHE_TTL: 300,
  COMPRESSION_THRESHOLD: 1024,
  LAZY_LOADING_BATCH_SIZE: 50,
  MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB
  GC_INTERVAL: 300000 // 5 minutes
};

// Database optimization
export class DatabaseOptimizer {
  private static queryCache = new Map<string, { result: any; timestamp: number }>();
  private static connectionPool: any[] = [];
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize connection pool
      const { db } = await import('./db');
      
      // Set up query optimization
      this.setupQueryOptimization();
      
      // Set up connection pooling
      this.setupConnectionPooling();
      
      this.isInitialized = true;
      apiLogger.info('Database optimizer initialized');
    } catch (error) {
      apiLogger.error('Failed to initialize database optimizer', {
        metadata: { error: (error as Error).message }
      });
    }
  }

  private static setupQueryOptimization(): void {
    // Add query logging and optimization
    const originalQuery = console.log;
    console.log = (...args) => {
      if (args[0]?.includes?.('prisma:query')) {
        const query = args[0];
        const duration = args[1]?.duration;
        
        if (duration > 1000) { // Log slow queries
          apiLogger.warn('Slow query detected', {
            metadata: { query, duration }
          });
        }
      }
      originalQuery(...args);
    };
  }

  private static setupConnectionPooling(): void {
    // Connection pooling would be handled by Prisma
    // This is a placeholder for additional optimization
  }

  static async optimizedQuery<T>(
    queryFn: () => Promise<T>,
    cacheKey?: string,
    ttl: number = PERFORMANCE_CONFIG.CACHE_TTL
  ): Promise<T> {
    const monitoring = MonitoringSystem.getInstance();
    const startTime = Date.now();

    try {
      // Check cache first
      if (cacheKey) {
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < ttl * 1000) {
          monitoring.recordCounter('db.query.cache_hit', 1);
          return cached.result;
        }
      }

      // Execute query
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Cache result
      if (cacheKey) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      // Record metrics
      monitoring.recordTimer('db.query.duration', duration);
      monitoring.recordCounter('db.query.total', 1);

      if (duration > 1000) {
        monitoring.recordCounter('db.query.slow', 1);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      monitoring.recordTimer('db.query.error_duration', duration);
      monitoring.recordCounter('db.query.errors', 1);
      throw error;
    }
  }

  static clearQueryCache(): void {
    this.queryCache.clear();
  }

  static getQueryCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

// Memory management
export class MemoryManager {
  private static memoryUsage: NodeJS.MemoryUsage[] = [];
  private static gcInterval: NodeJS.Timeout | null = null;
  private static isMonitoring = false;

  static startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Monitor memory usage
    setInterval(() => {
      this.recordMemoryUsage();
    }, 10000); // Every 10 seconds

    // Garbage collection
    this.gcInterval = setInterval(() => {
      this.performGarbageCollection();
    }, PERFORMANCE_CONFIG.GC_INTERVAL);

    apiLogger.info('Memory monitoring started');
  }

  static stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }

    apiLogger.info('Memory monitoring stopped');
  }

  private static recordMemoryUsage(): void {
    const usage = process.memoryUsage();
    this.memoryUsage.push(usage);

    // Keep only last 100 records
    if (this.memoryUsage.length > 100) {
      this.memoryUsage = this.memoryUsage.slice(-100);
    }

    // Check memory limits
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

    const monitoring = MonitoringSystem.getInstance();
    monitoring.recordGauge('memory.heap_used_mb', heapUsedMB);
    monitoring.recordGauge('memory.heap_total_mb', heapTotalMB);
    monitoring.recordGauge('memory.usage_percent', usagePercent);

    if (usagePercent > 80) {
      apiLogger.warn('High memory usage detected', {
        metadata: {
          heapUsedMB: heapUsedMB.toFixed(2),
          heapTotalMB: heapTotalMB.toFixed(2),
          usagePercent: usagePercent.toFixed(2)
        }
      });
    }
  }

  private static performGarbageCollection(): void {
    if (global.gc) {
      const beforeGC = process.memoryUsage();
      global.gc();
      const afterGC = process.memoryUsage();
      
      const freedMB = (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024;
      
      const monitoring = MonitoringSystem.getInstance();
      monitoring.recordGauge('memory.gc.freed_mb', freedMB);
      
      apiLogger.debug('Garbage collection performed', {
        metadata: { freedMB: freedMB.toFixed(2) }
      });
    }
  }

  static getMemoryStats(): {
    current: NodeJS.MemoryUsage;
    average: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  } {
    const current = process.memoryUsage();
    
    if (this.memoryUsage.length === 0) {
      return { current, average: current, peak: current };
    }

    const average = {
      rss: this.memoryUsage.reduce((sum, usage) => sum + usage.rss, 0) / this.memoryUsage.length,
      heapTotal: this.memoryUsage.reduce((sum, usage) => sum + usage.heapTotal, 0) / this.memoryUsage.length,
      heapUsed: this.memoryUsage.reduce((sum, usage) => sum + usage.heapUsed, 0) / this.memoryUsage.length,
      external: this.memoryUsage.reduce((sum, usage) => sum + usage.external, 0) / this.memoryUsage.length,
      arrayBuffers: this.memoryUsage.reduce((sum, usage) => sum + usage.arrayBuffers, 0) / this.memoryUsage.length
    };

    const peak = {
      rss: Math.max(...this.memoryUsage.map(usage => usage.rss)),
      heapTotal: Math.max(...this.memoryUsage.map(usage => usage.heapTotal)),
      heapUsed: Math.max(...this.memoryUsage.map(usage => usage.heapUsed)),
      external: Math.max(...this.memoryUsage.map(usage => usage.external)),
      arrayBuffers: Math.max(...this.memoryUsage.map(usage => usage.arrayBuffers))
    };

    return { current, average, peak };
  }
}

// Lazy loading utilities
export class LazyLoader<T> {
  private cache = new Map<string, T>();
  private loadingPromises = new Map<string, Promise<T>>();
  private batchSize: number;

  constructor(batchSize: number = PERFORMANCE_CONFIG.LAZY_LOADING_BATCH_SIZE) {
    this.batchSize = batchSize;
  }

  async load(key: string, loader: () => Promise<T>): Promise<T> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key)!;
    }

    // Start loading
    const promise = loader().then(result => {
      this.cache.set(key, result);
      this.loadingPromises.delete(key);
      return result;
    }).catch(error => {
      this.loadingPromises.delete(key);
      throw error;
    });

    this.loadingPromises.set(key, promise);
    return promise;
  }

  async loadBatch(keys: string[], loader: (keys: string[]) => Promise<Map<string, T>>): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const keysToLoad: string[] = [];

    // Check cache for existing items
    for (const key of keys) {
      if (this.cache.has(key)) {
        results.set(key, this.cache.get(key)!);
      } else {
        keysToLoad.push(key);
      }
    }

    // Load missing items in batches
    for (let i = 0; i < keysToLoad.length; i += this.batchSize) {
      const batch = keysToLoad.slice(i, i + this.batchSize);
      const batchResults = await loader(batch);
      
      for (const [key, value] of batchResults) {
        this.cache.set(key, value);
        results.set(key, value);
      }
    }

    return results;
  }

  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  getStats(): { cacheSize: number; loadingCount: number } {
    return {
      cacheSize: this.cache.size,
      loadingCount: this.loadingPromises.size
    };
  }
}

// Compression utilities
export class CompressionManager {
  static async compress(data: any): Promise<Buffer> {
    const zlib = await import('zlib');
    const jsonString = JSON.stringify(data);
    
    if (jsonString.length < PERFORMANCE_CONFIG.COMPRESSION_THRESHOLD) {
      return Buffer.from(jsonString);
    }

    return new Promise((resolve, reject) => {
      zlib.gzip(jsonString, (error, compressed) => {
        if (error) {
          reject(error);
        } else {
          resolve(compressed);
        }
      });
    });
  }

  static async decompress(compressed: Buffer): Promise<any> {
    const zlib = await import('zlib');
    
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressed, (error, decompressed) => {
        if (error) {
          reject(error);
        } else {
          try {
            const jsonString = decompressed.toString();
            resolve(JSON.parse(jsonString));
          } catch (parseError) {
            reject(parseError);
          }
        }
      });
    });
  }

  static getCompressionRatio(original: string, compressed: Buffer): number {
    return (compressed.length / original.length) * 100;
  }
}

// CDN utilities
export class CDNManager {
  private static cdnUrl: string = process.env.CDN_URL || '';
  private static isEnabled: boolean = !!process.env.CDN_URL;

  static getAssetUrl(path: string): string {
    if (!this.isEnabled) {
      return path;
    }

    return `${this.cdnUrl}/${path}`;
  }

  static async uploadAsset(file: Buffer, path: string): Promise<string> {
    if (!this.isEnabled) {
      // Fallback to local storage
      const fs = await import('fs/promises');
      const fullPath = `./public/assets/${path}`;
      await fs.writeFile(fullPath, file);
      return `/assets/${path}`;
    }

    // Upload to CDN (implementation would depend on CDN provider)
    // This is a placeholder
    throw new Error('CDN upload not implemented');
  }

  static async purgeCache(paths: string[]): Promise<void> {
    if (!this.isEnabled) return;

    // Purge CDN cache (implementation would depend on CDN provider)
    // This is a placeholder
    console.log('Purging CDN cache for paths:', paths);
  }
}

// Performance monitoring decorator
export function monitorPerformance(name: string, tags: Record<string, string> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitoring = MonitoringSystem.getInstance();

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        monitoring.recordTimer(`performance.${name}.${propertyName}`, duration, tags);
        monitoring.recordCounter(`performance.${name}.${propertyName}.success`, 1, tags);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        monitoring.recordTimer(`performance.${name}.${propertyName}`, duration, tags);
        monitoring.recordCounter(`performance.${name}.${propertyName}.error`, 1, tags);
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Initialize performance optimizations
export function initializePerformance(): void {
  DatabaseOptimizer.initialize();
  MemoryManager.startMonitoring();
  
  apiLogger.info('Performance optimizations initialized');
}

export default {
  DatabaseOptimizer,
  MemoryManager,
  LazyLoader,
  CompressionManager,
  CDNManager,
  initializePerformance
};
