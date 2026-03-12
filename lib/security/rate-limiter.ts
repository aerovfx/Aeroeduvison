/**
 * Rate Limiting Middleware
 * Prevents API abuse by limiting requests per user/IP
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Simple in-memory rate limiter
 * Note: In production, use Redis for distributed rate limiting
 */
class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 60000, // 1 minute default
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config
    };

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), this.config.windowMs);
  }

  /**
   * Get rate limit key from request
   * Uses user ID if available, otherwise IP address
   */
  getKey(req: NextRequest): string {
    // Try to get user ID from headers (set by auth middleware)
    const userId = req.headers.get('x-user-id');
    if (userId) return `user:${userId}`;

    // Fall back to IP address
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    return `ip:${ip}`;
  }

  /**
   * Check rate limit
   * Returns true if within limit, false if exceeded
   */
  check(key: string): boolean {
    const now = Date.now();
    const record = this.store[key];

    if (!record || now >= record.resetTime) {
      // Create new record
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      return true;
    }

    // Increment existing record
    if (record.count < this.config.maxRequests) {
      record.count++;
      return true;
    }

    return false;
  }

  /**
   * Get current count for key
   */
  getCount(key: string): number {
    const record = this.store[key];
    if (!record) return 0;

    if (Date.now() >= record.resetTime) {
      delete this.store[key];
      return 0;
    }

    return record.count;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const count = this.getCount(key);
    return Math.max(0, this.config.maxRequests - count);
  }

  /**
   * Get reset time
   */
  getResetTime(key: string): number {
    const record = this.store[key];
    if (!record) return Date.now() + this.config.windowMs;
    return record.resetTime;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (now >= this.store[key].resetTime) {
        delete this.store[key];
      }
    }
  }
}

/**
 * Global rate limiters for different endpoints
 */
export const apiLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100 // 100 requests per minute
});

export const authLimiter = new RateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5 // 5 login attempts per 15 minutes
});

export const gradingLimiter = new RateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 50 // 50 grading operations per hour
});

export const searchLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 30 // 30 searches per minute
});

/**
 * Rate limit middleware for API routes
 * Usage: add to route handler at the top
 *
 * export async function POST(req: NextRequest) {
 *   const rateLimitResult = enforceRateLimit(req, apiLimiter);
 *   if (rateLimitResult) return rateLimitResult;
 *   // Continue with handler
 * }
 */
export function enforceRateLimit(
  req: NextRequest,
  limiter: RateLimiter,
  statusCode: number = 429
): NextResponse | null {
  const key = limiter.getKey(req);
  const allowed = limiter.check(key);

  if (!allowed) {
    const resetTime = limiter.getResetTime(key);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      {
        status: statusCode,
        headers: {
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': limiter['config'].maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString()
        }
      }
    );
  }

  // Add rate limit headers to successful response
  const remaining = limiter.getRemaining(key);
  const resetTime = limiter.getResetTime(key);

  // Headers will be set in response
  req.headers.set('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
  req.headers.set('X-RateLimit-Remaining', remaining.toString());
  req.headers.set('X-RateLimit-Reset', resetTime.toString());

  return null; // No error, continue processing
}

/**
 * Get rate limit status for a request
 */
export function getRateLimitStatus(
  req: NextRequest,
  limiter: RateLimiter
): {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  isExceeded: boolean;
} {
  const key = limiter.getKey(req);
  const current = limiter.getCount(key);
  const limit = limiter['config'].maxRequests;
  const remaining = limiter.getRemaining(key);
  const resetTime = new Date(limiter.getResetTime(key));
  const isExceeded = current >= limit;

  return {
    limit,
    current,
    remaining,
    resetTime,
    isExceeded
  };
}

/**
 * Custom rate limiter for specific use cases
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Rate limit presets
 */
export const RateLimitPresets = {
  strict: {
    windowMs: 60000,
    maxRequests: 10
  },
  normal: {
    windowMs: 60000,
    maxRequests: 100
  },
  generous: {
    windowMs: 60000,
    maxRequests: 500
  },
  publicAPI: {
    windowMs: 3600000,
    maxRequests: 1000
  },
  auth: {
    windowMs: 900000,
    maxRequests: 5
  }
};
