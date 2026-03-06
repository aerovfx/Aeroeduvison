/**
 * redis.ts - Redis client singleton for session storage and caching
 * 
 * Provides a centralized Redis connection for:
 * - Session storage (NextAuth)
 * - Rate limiting
 * - Caching
 * - Task queues
 */

import Redis from 'ioredis';
import { apiLogger } from './logging-simple';

let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          if (times > 10) {
            return null; // Stop retrying
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      redisClient.on('connect', () => {
        apiLogger.info('Redis client connected');
      });

      redisClient.on('error', (error) => {
        apiLogger.error('Redis client error', { metadata: { error: error.message } });
      });

      redisClient.on('close', () => {
        apiLogger.warn('Redis client disconnected');
      });
    } catch (error) {
      apiLogger.error('Failed to create Redis client', { metadata: { error: (error as Error).message } });
      return null;
    }
  }

  return redisClient;
}

export function getRedisSubscriber(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisSubscriber) {
    try {
      redisSubscriber = new Redis(process.env.REDIS_URL, {
        retryStrategy: (times) => {
          if (times > 10) {
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        connectTimeout: 5000,
        commandTimeout: 3000,
      });

      redisSubscriber.on('connect', () => {
        apiLogger.info('Redis subscriber connected');
      });

      redisSubscriber.on('error', (error) => {
        apiLogger.error('Redis subscriber error', { metadata: { error: error.message } });
      });
    } catch (error) {
      apiLogger.error('Failed to create Redis subscriber', { metadata: { error: (error as Error).message } });
      return null;
    }
  }

  return redisSubscriber;
}

export async function closeRedisConnections(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (redisSubscriber) {
    await redisSubscriber.quit();
    redisSubscriber = null;
  }
}

// Health check
export async function checkRedisHealth(): Promise<{ connected: boolean; latency?: number }> {
  const client = getRedisClient();
  if (!client) {
    return { connected: false };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latency = Date.now() - start;
    return { connected: true, latency };
  } catch (error) {
    return { connected: false };
  }
}

