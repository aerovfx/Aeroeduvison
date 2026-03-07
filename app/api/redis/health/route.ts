/**
 * Redis Health Check API
 * GET /api/redis/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRedisHealth } from '@/lib/redis';
import CacheManager from '@/lib/cache';
import { getBullMQManager } from '@/lib/queue/bullmq';
import { apiLogger } from '@/lib/logging-simple';

export async function GET(request: NextRequest) {
  try {
    // Redis connection health
    const redisHealth = await checkRedisHealth();

    // Cache statistics
    const cacheStats = CacheManager.getStats();

    // Queue statistics (sample queues)
    const bullMQ = getBullMQManager();
    const queueStats = {
      email: await bullMQ.getQueueStats('email-queue').catch(() => null),
      ai: await bullMQ.getQueueStats('ai-queue').catch(() => null),
      grading: await bullMQ.getQueueStats('grading-queue').catch(() => null),
    };

    // Overall health status
    const isHealthy = redisHealth.connected && cacheStats.redis;

    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: redisHealth,
      cache: cacheStats,
      queues: queueStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return NextResponse.json(healthData, {
      status: isHealthy ? 200 : 503,
    });

  } catch (error) {
    apiLogger.error('Redis health check failed', {
      metadata: { error: (error as Error).message }
    });

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
