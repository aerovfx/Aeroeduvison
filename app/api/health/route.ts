/**
 * Health Check API Endpoint
 * 
 * Comprehensive health monitoring for the application
 * 
 * Endpoints:
 * - GET /api/health - Overall health
 * - GET /api/health?detailed=true - Detailed health with all services
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth } from '@/lib/redis';
import { db } from '@/lib/performance/db-optimized';
import { enhancedCache } from '@/lib/performance/cache-enhanced';

// Service check timeout
const SERVICE_TIMEOUT = 3000;

/**
 * Check database health
 */
async function checkDatabase(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

    const result = await db.healthCheck();
    clearTimeout(timeout);

    return result;
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    return await checkRedisHealth();
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check cache health
 */
async function checkCache(): Promise<{
  healthy: boolean;
  l1Size: number;
  l2Connected: boolean;
  stats?: any;
}> {
  try {
    const stats = enhancedCache.getStats();
    return {
      healthy: true,
      l1Size: stats.l1Size,
      l2Connected: stats.l2Connected,
      stats,
    };
  } catch (error) {
    return {
      healthy: false,
      l1Size: 0,
      l2Connected: false,
    };
  }
}

/**
 * Check Rust services health
 */
async function checkRustServices(): Promise<Record<string, { healthy: boolean; latency?: number }>> {
  const services = {
    vector: process.env.RUST_VECTOR_SERVICE_URL || 'http://127.0.0.1:8091',
    backend: process.env.RUST_BACKEND_URL || 'http://127.0.0.1:8090',
    auth: process.env.RUST_AUTH_URL || 'http://127.0.0.1:8092',
  };

  const results: Record<string, { healthy: boolean; latency?: number }> = {};

  await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SERVICE_TIMEOUT);

        const response = await fetch(`${url}/health`, {
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeout);

        results[name] = {
          healthy: response?.ok ?? false,
          latency: response?.ok ? Date.now() - start : undefined,
        };
      } catch {
        results[name] = { healthy: false };
      }
    })
  );

  return results;
}

/**
 * Basic health check
 */
async function getBasicHealth() {
  const [dbHealth, redisHealth, cacheHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkCache(),
  ]);

  const overallHealthy =
    dbHealth.healthy &&
    (redisHealth.healthy || !process.env.REDIS_URL) &&
    cacheHealth.healthy;

  return {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      cache: cacheHealth,
    },
  };
}

/**
 * Detailed health check
 */
async function getDetailedHealth() {
  const [basicHealth, rustServices] = await Promise.all([
    getBasicHealth(),
    checkRustServices(),
  ]);

  return {
    ...basicHealth,
    rustServices,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      redisConfigured: !!process.env.REDIS_URL,
      rustCanaryEnabled: process.env.ENABLE_RUST_CANARY_PROXY === 'true',
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };
}

/**
 * Main handler
 */
async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  try {
    const health = detailed ? await getDetailedHealth() : await getBasicHealth();

    const status = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

export const GET = handleGet;
