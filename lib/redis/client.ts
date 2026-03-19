/**
 * Redis Client Configuration
 */

import Redis from 'ioredis';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: process.env.REDIS_PREFIX || 'aeroedu:',
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false,
};

let _redis: Redis | null = null;

function getRedisInstance(): Redis {
  if (!_redis) {
    _redis = new Redis(REDIS_CONFIG);
    _redis.on('error', () => {}); // Suppress unhandled errors during build
  }
  return _redis;
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    const r = getRedisInstance();
    const val = (r as any)[prop];
    return typeof val === 'function' ? val.bind(r) : val;
  },
});

export const redisClient = {
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) await redis.setex(key, ttl, value);
    else await redis.set(key, value);
  },

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  },

  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  async getJson<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (!value) return null;
    try { return JSON.parse(value) as T; } catch { return null; }
  },

  async del(key: string): Promise<number> {
    return redis.del(key);
  },

  async delPattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return redis.del(...keys);
  },

  async exists(key: string): Promise<boolean> {
    return (await redis.exists(key)) > 0;
  },

  async ttl(key: string): Promise<number> {
    return redis.ttl(key);
  },

  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  async getCounter(key: string): Promise<number> {
    const value = await redis.get(key);
    return value ? parseInt(value) : 0;
  },

  async zadd(key: string, score: number, member: string): Promise<number> {
    return redis.zadd(key, score, member);
  },

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return redis.zrange(key, start, stop);
  },

  async lpush(key: string, ...values: string[]): Promise<number> {
    return redis.lpush(key, ...values);
  },

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return redis.lrange(key, start, stop);
  },

  async hset(key: string, field: string, value: string): Promise<number> {
    return redis.hset(key, field, value);
  },

  async hget(key: string, field: string): Promise<string | null> {
    return redis.hget(key, field);
  },

  async hgetall(key: string): Promise<Record<string, string>> {
    return redis.hgetall(key);
  },

  async publish(channel: string, message: string): Promise<number> {
    return redis.publish(channel, message);
  },

  async getStats(): Promise<{ connected: boolean; dbSize: number; memoryUsage?: number }> {
    try {
      const [connected, dbSize] = await Promise.all([
        redis.ping().then(() => true).catch(() => false),
        redis.dbsize(),
      ]);
      let memoryUsage: number | undefined;
      try {
        const info = await redis.info('memory');
        const match = info.match(/used_memory:(\d+)/);
        if (match) memoryUsage = parseInt(match[1]);
      } catch {}
      return { connected, dbSize, memoryUsage };
    } catch {
      return { connected: false, dbSize: 0 };
    }
  },

  async ping(): Promise<string> {
    return redis.ping();
  },
};

export default redisClient;
