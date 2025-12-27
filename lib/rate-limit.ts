/**
 * Rate Limiting Utility
 * 
 * Prevents brute force attacks by limiting requests per IP address
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
  lockoutUntil?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitStore>();

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
 * Check if IP is rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG.login
): { allowed: boolean; remaining: number; resetTime: number; lockoutUntil?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
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
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs
    });
    
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
    rateLimitStore.set(identifier, record);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      lockoutUntil: record.lockoutUntil
    };
  }
  
  rateLimitStore.set(identifier, record);
  
  return {
    allowed: true,
    remaining: config.maxAttempts - record.count,
    resetTime: record.resetTime
  };
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(
  type: keyof typeof RATE_LIMIT_CONFIG = 'api'
) {
  return (request: NextRequest) => {
    const ip = getClientIp(request);
    const identifier = `${type}:${ip}`;
    const config = RATE_LIMIT_CONFIG[type];
    
    const result = checkRateLimit(identifier, config);
    
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
 * Clean up expired entries (run periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now && (!record.lockoutUntil || record.lockoutUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

