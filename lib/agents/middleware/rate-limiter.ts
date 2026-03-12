/**
 * Rate Limiter for Agent APIs
 * Prevents API abuse
 */

import { db } from "@/lib/db"

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  STUDENT: { windowMs: 60000, maxRequests: 20 },
  TEACHER: { windowMs: 60000, maxRequests: 50 },
  ADMIN: { windowMs: 60000, maxRequests: 100 },
  ANONYMOUS: { windowMs: 60000, maxRequests: 10 },
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/agents/llm': { windowMs: 60000, maxRequests: 10 },
  '/api/agents/exam-prep': { windowMs: 60000, maxRequests: 5 },
  '/api/agents/career-advisor': { windowMs: 60000, maxRequests: 5 },
}

export class RateLimiter {
  static async checkLimit(userId: string | null, endpoint: string, role: string = 'ANONYMOUS'): Promise<RateLimitResult> {
    const now = new Date()
    const limit = ENDPOINT_LIMITS[endpoint] || RATE_LIMITS[role] || RATE_LIMITS.ANONYMOUS
    const resetAt = new Date(now.getTime() + limit.windowMs)

    try {
      let record = await db.rateLimit.findFirst({ where: { userId: userId || 'anonymous', endpoint, resetAt: { gt: now } } })

      if (!record) {
        record = await db.rateLimit.create({ data: { userId: userId || 'anonymous', endpoint, count: 0, window: now, resetAt } })
      }

      if (record.count >= limit.maxRequests) {
        return { allowed: false, remaining: 0, resetAt: record.resetAt, retryAfter: Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000) }
      }

      await db.rateLimit.update({ where: { id: record.id }, data: { count: record.count + 1 } })
      return { allowed: true, remaining: limit.maxRequests - record.count - 1, resetAt: record.resetAt }
    } catch (error) {
      console.error('Rate limiter error:', error)
      return { allowed: true, remaining: limit.maxRequests, resetAt }
    }
  }

  static async cleanup(): Promise<void> {
    try {
      const r = await db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date() } } })
      console.log(`🧹 Cleaned ${r.count} rate limit records`)
    } catch (error) { console.error('Cleanup error:', error) }
  }
}
