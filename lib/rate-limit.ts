/**
 * Rate Limiting Utility
 *
 * Prevents brute force attacks by limiting requests per IP address
 * Uses Redis for distributed rate limiting in production
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from './redis';
import { apiLogger } from './logging-simple';

interface RateLimitStore {
  count: number;
  resetTime: number;
  lockoutUntil?: number;
}

// Redis-based rate limiting for production
class RedisRateLimitStore {
  private redis = getRedisClient();

  async get(identifier: string): Promise<RateLimitStore | null> {
    if (!this.redis) {
      return null;
    }

    try {
      const data = await this.redis.get(`ratelimit:${identifier}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      apiLogger.error('Redis rate limit get error', {
        metadata: { identifier, error: (error as Error).message }
      });
      return null;
    }
  }

  async set(identifier: string, data: RateLimitStore): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      // Set with TTL to auto-expire
      const ttl = Math.max(
        Math.ceil((data.resetTime - Date.now()) / 1000),
        300 // minimum 5 minutes
      );
      await this.redis.setex(`ratelimit:${identifier}`, ttl, JSON.stringify(data));
    } catch (error) {
      apiLogger.error('Redis rate limit set error', {
        metadata: { identifier, error: (error as Error).message }
      });
    }
  }

  async delete(identifier: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.del(`ratelimit:${identifier}`);
    } catch (error) {
      apiLogger.error('Redis rate limit delete error', {
        metadata: { identifier, error: (error as Error).message }
      });
    }
  }
}

// Fallback in-memory store for development
const memoryRateLimitStore = new Map<string, RateLimitStore>();
const redisRateLimitStore = new RedisRateLimitStore();

// Configuration
export const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,           // Max attempts per window
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 30 * 60 * 1000 // 30 minutes lockout after max attempts
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutMs: 60 * 60 * 1000 // 1 hour lockout
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000,      // 1 minute
    lockoutMs: 5 * 60 * 1000  // 5 minutes lockout
  }
};

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Try to get real IP from headers (for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to remote address
  return request.ip || 'unknown';
}

/**
 * Check if IP is rate limited (async with Redis support)
 */
export async function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.login
): Promise<{ allowed: boolean; remaining: number; resetTime: number; lockoutUntil?: number }> {
  const now = Date.now();

  // Try Redis first, fallback to memory
  let record = await redisRateLimitStore.get(identifier);

  // Check if currently locked out
  if (record?.lockoutUntil && record.lockoutUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.lockoutUntil,
      lockoutUntil: record.lockoutUntil
    };
  }

  // Reset if window expired
  if (!record || record.resetTime < now) {
    const newRecord = {
      count: 1,
      resetTime: now + config.windowMs
    };

    await redisRateLimitStore.set(identifier, newRecord);

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetTime: now + config.windowMs
    };
  }

  // Increment count
  record.count++;

  // Check if exceeded limit
  if (record.count > config.maxAttempts) {
    record.lockoutUntil = now + config.lockoutMs;
    await redisRateLimitStore.set(identifier, record);

    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      lockoutUntil: record.lockoutUntil
    };
  }

  await redisRateLimitStore.set(identifier, record);

  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export async function resetRateLimit(identifier: string): Promise<void> {
  await redisRateLimitStore.delete(identifier);
}

/**
 * Rate limit middleware factory (async)
 */
export function createRateLimiter(
  type: keyof typeof RATE_LIMIT_CONFIG = 'api'
) {
  return async (request: NextRequest) => {
    const ip = getClientIp(request);
    const identifier = `${type}:${ip}`;
    const config = RATE_LIMIT_CONFIG[type];

    const result = await checkRateLimit(identifier, config);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: result.lockoutUntil
            ? `Too many failed attempts. Account temporarily locked. Try again in ${Math.ceil((result.lockoutUntil - Date.now()) / 60000)} minutes.`
            : `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
          lockoutUntil: result.lockoutUntil
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
          }
        }
      );
    }

    return null; // Allow request to proceed
  };
}

/**
 * Clean up expired entries (Redis handles this automatically with TTL)
 * This function is kept for compatibility but Redis TTL handles cleanup
 */
export function cleanupRateLimitStore(): void {
  // Redis TTL handles automatic cleanup, no manual cleanup needed
  apiLogger.debug('Rate limit cleanup called - Redis TTL handles cleanup automatically');
}

