/**
 * Rate Limiter for Agent APIs
 * Prevents API abuse with configurable limits
 */

import { db } from "@/lib/db"

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number // Seconds until reset
}

// Default rate limits by role
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Students: 20 requests per minute for agents
  STUDENT: { windowMs: 60 * 1000, maxRequests: 20 },
  
  // Teachers: 50 requests per minute
  TEACHER: { windowMs: 60 * 1000, maxRequests: 50 },
  
  // Admin: 100 requests per minute
  ADMIN: { windowMs: 60 * 1000, maxRequests: 100 },
  
  // Anonymous: 10 requests per minute
  ANONYMOUS: { windowMs: 60 * 1000, maxRequests: 10 },
}

// Special limits for specific endpoints
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/agents/llm': { windowMs: 60 * 1000, maxRequests: 10 }, // Stricter for LLM calls
  '/api/agents/exam-prep': { windowMs: 60 * 1000, maxRequests: 5 }, // Expensive operation
  '/api/agents/career-advisor': { windowMs: 60 * 1000, maxRequests: 5 }, // Expensive operation
}

export class RateLimiter {
  /**
   * Check if request is allowed
   */
  static async checkLimit(
    userId: string | null,
    endpoint: string,
    role: string = 'ANONYMOUS'
  ): Promise<RateLimitResult> {
    const now = new Date()
    
    // Get rate limit config
    const endpointLimit = ENDPOINT_LIMITS[endpoint]
    const roleLimit = RATE_LIMITS[role] || RATE_LIMITS.ANONYMOUS
    const limit = endpointLimit || roleLimit

    // Calculate window start
    const windowStart = new Date(now.getTime() - limit.windowMs)

    // Get or create rate limit record
    const key = `${userId || 'anonymous'}-${endpoint}`
    
    try {
      // Try to find existing record
      let record = await db.rateLimit.findFirst({
        where: {
          userId: userId || 'anonymous',
          endpoint,
          resetAt: { gt: now },
        },
      })

      if (!record) {
        // Create new window
        record = await db.rateLimit.create({
          data: {
            userId: userId || 'anonymous',
            endpoint,
            count: 0,
            window: now,
            resetAt: new Date(now.getTime() + limit.windowMs),
          },
        })
      }

      // Check if limit exceeded
      if (record.count >= limit.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: record.resetAt,
          retryAfter: Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000),
        }
      }

      // Increment counter
      await db.rateLimit.update({
        where: { id: record.id },
        data: { count: record.count + 1 },
      })

      return {
        allowed: true,
        remaining: limit.maxRequests - record.count - 1,
        resetAt: record.resetAt,
      }
    } catch (error) {
      // If DB fails, allow request but log error
      console.error('Rate limiter DB error:', error)
      return {
        allowed: true,
        remaining: limit.maxRequests,
        resetAt: new Date(now.getTime() + limit.windowMs),
      }
    }
  }

  /**
   * Middleware for Next.js API routes
   */
  static async middleware(
    req: Request,
    userId: string | null,
    userRole: string = 'ANONYMOUS'
  ): Promise<Response | null> {
    const url = new URL(req.url)
    const endpoint = url.pathname

    const result = await this.checkLimit(userId, endpoint, userRole)

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '0',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.resetAt.toISOString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      )
    }

    // Add rate limit headers to response
    const headers = {
      'X-RateLimit-Limit': result.remaining.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetAt.toISOString(),
    }

    return null
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanup(): Promise<void> {
    try {
      await db.rateLimit.deleteMany({
        where: {
          resetAt: { lt: new Date() },
        },
      })
      console.log('✅ Rate limit cleanup complete')
    } catch (error) {
      console.error('Rate limit cleanup error:', error)
    }
  }
}

// Export helper function for API routes
export async function withRateLimit<T>(
  handler: () => Promise<T>,
  userId: string | null,
  endpoint: string,
  role: string = 'ANONYMOUS'
): Promise<T | { error: string; retryAfter?: number }> {
  const result = await RateLimiter.checkLimit(userId, endpoint, role)
  
  if (!result.allowed) {
    return {
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    }
  }

  return handler()
}
