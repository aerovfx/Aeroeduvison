/**
 * Performance Metrics API Endpoint
 * 
 * Provides comprehensive performance metrics for monitoring
 * 
 * Endpoints:
 * - GET /api/performance/metrics - All metrics
 * - GET /api/performance/metrics/cache - Cache metrics
 * - GET /api/performance/metrics/database - Database metrics
 * - GET /api/performance/metrics/requests - Request metrics
 * - POST /api/performance/metrics/cache/clear - Clear cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPerformance } from '@/lib/performance/performance-middleware';
import { enhancedCache } from '@/lib/performance/cache-enhanced';
import { db } from '@/lib/performance/db-optimized';
import { getRedisClient, checkRedisHealth } from '@/lib/redis';
import {
  getPerformanceMetrics,
  getPendingRequestCount,
  getDebounceTimerCount,
} from '@/lib/performance/request-dedup';

/**
 * Get all performance metrics
 */
async function getAllMetrics() {
  const [
    apiMetrics,
    cacheStats,
    dbMetrics,
    redisHealth,
    systemMetrics,
  ] = await Promise.allSettled([
    Promise.resolve(getPerformanceMetrics()),
    Promise.resolve(enhancedCache.getStats()),
    Promise.resolve(db.getMetrics()),
    checkRedisHealth(),
    Promise.resolve({
      pendingRequests: getPendingRequestCount(),
      debounceTimers: getDebounceTimerCount(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    }),
  ]);

  return {
    timestamp: new Date().toISOString(),
    api: apiMetrics.status === 'fulfilled' ? apiMetrics.value : null,
    cache: cacheStats.status === 'fulfilled' ? cacheStats.value : null,
    database: dbMetrics.status === 'fulfilled' ? dbMetrics.value : null,
    redis: redisHealth.status === 'fulfilled' ? redisHealth.value : null,
    system: systemMetrics.status === 'fulfilled' ? systemMetrics.value : null,
    errors: {
      api: apiMetrics.status === 'rejected' ? apiMetrics.reason : null,
      cache: cacheStats.status === 'rejected' ? cacheStats.reason : null,
      database: dbMetrics.status === 'rejected' ? dbMetrics.reason : null,
      redis: redisHealth.status === 'rejected' ? redisHealth.reason : null,
      system: systemMetrics.status === 'rejected' ? systemMetrics.reason : null,
    },
  };
}

/**
 * Get cache-specific metrics
 */
async function getCacheMetrics() {
  const cacheStats = enhancedCache.getStats();
  const redis = getRedisClient();

  let redisInfo = null;
  if (redis) {
    try {
      const info = await redis.info('stats');
      redisInfo = info;
    } catch (error) {
      redisInfo = { error: (error as Error).message };
    }
  }

  return {
    cache: cacheStats,
    redis: redisInfo,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get database-specific metrics
 */
async function getDatabaseMetrics() {
  const dbMetrics = db.getMetrics();
  const dbHealth = await db.healthCheck();

  return {
    database: dbMetrics,
    health: dbHealth,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get request-specific metrics
 */
async function getRequestMetrics() {
  const apiMetrics = getPerformanceMetrics();

  return {
    requests: apiMetrics,
    pending: getPendingRequestCount(),
    debounced: getDebounceTimerCount(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Clear cache
 */
async function clearCache() {
  try {
    await enhancedCache.clear();
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Main GET handler
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    let metrics;

    switch (type) {
      case 'cache':
        metrics = await getCacheMetrics();
        break;
      case 'database':
        metrics = await getDatabaseMetrics();
        break;
      case 'requests':
        metrics = await getRequestMetrics();
        break;
      default:
        metrics = await getAllMetrics();
    }

    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Main POST handler
 */
async function handlePost(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    let result;

    switch (action) {
      case 'clear-cache':
        result = await clearCache();
        break;
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Action failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Export handlers with performance monitoring
export const GET = withPerformance(handleGet);
export const POST = withPerformance(handlePost);
