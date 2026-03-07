/**
 * AI Service Rate Limiter
 * Prevents excessive API usage and controls costs
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxCostPerDay: number; // in USD
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
  };
  resetAt: {
    minute: Date;
    hour: Date;
    day: Date;
  };
  currentCost: number;
}

export class AIRateLimiter {
  private redis: any;
  private keyPrefix = 'ai:ratelimit';

  constructor(private config: RateLimitConfig) {}

  async initialize(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkLimit(userId: string): Promise<RateLimitStatus> {
    if (!this.redis) {
      return this.createAllowedStatus();
    }

    const now = Date.now();
    const minuteKey = `${this.keyPrefix}:${userId}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `${this.keyPrefix}:${userId}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `${this.keyPrefix}:${userId}:day:${Math.floor(now / 86400000)}`;
    const costKey = `${this.keyPrefix}:${userId}:cost:${Math.floor(now / 86400000)}`;

    try {
      const [minuteCount, hourCount, dayCount, dayCost] = await Promise.all([
        this.redis.get(minuteKey),
        this.redis.get(hourKey),
        this.redis.get(dayKey),
        this.redis.get(costKey),
      ]);

      const currentMinute = parseInt(minuteCount || '0');
      const currentHour = parseInt(hourCount || '0');
      const currentDay = parseInt(dayCount || '0');
      const currentCost = parseFloat(dayCost || '0');

      const allowed =
        currentMinute < this.config.maxRequestsPerMinute &&
        currentHour < this.config.maxRequestsPerHour &&
        currentDay < this.config.maxRequestsPerDay &&
        currentCost < this.config.maxCostPerDay;

      return {
        allowed,
        remaining: {
          minute: Math.max(0, this.config.maxRequestsPerMinute - currentMinute),
          hour: Math.max(0, this.config.maxRequestsPerHour - currentHour),
          day: Math.max(0, this.config.maxRequestsPerDay - currentDay),
        },
        resetAt: {
          minute: new Date(Math.ceil(now / 60000) * 60000),
          hour: new Date(Math.ceil(now / 3600000) * 3600000),
          day: new Date(Math.ceil(now / 86400000) * 86400000),
        },
        currentCost,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return this.createAllowedStatus();
    }
  }

  /**
   * Increment usage counters
   */
  async incrementUsage(userId: string, cost: number = 0): Promise<void> {
    if (!this.redis) {
      return;
    }

    const now = Date.now();
    const minuteKey = `${this.keyPrefix}:${userId}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `${this.keyPrefix}:${userId}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `${this.keyPrefix}:${userId}:day:${Math.floor(now / 86400000)}`;
    const costKey = `${this.keyPrefix}:${userId}:cost:${Math.floor(now / 86400000)}`;

    try {
      await Promise.all([
        this.redis.incr(minuteKey),
        this.redis.incr(hourKey),
        this.redis.incr(dayKey),
        this.redis.incrbyfloat(costKey, cost),
      ]);

      // Set expiration
      await Promise.all([
        this.redis.expire(minuteKey, 60),
        this.redis.expire(hourKey, 3600),
        this.redis.expire(dayKey, 86400),
        this.redis.expire(costKey, 86400),
      ]);
    } catch (error) {
      console.error('Rate limit increment error:', error);
    }
  }

  /**
   * Get current usage for a user
   */
  async getUsage(userId: string): Promise<{
    minute: number;
    hour: number;
    day: number;
    cost: number;
  }> {
    if (!this.redis) {
      return { minute: 0, hour: 0, day: 0, cost: 0 };
    }

    const now = Date.now();
    const minuteKey = `${this.keyPrefix}:${userId}:minute:${Math.floor(now / 60000)}`;
    const hourKey = `${this.keyPrefix}:${userId}:hour:${Math.floor(now / 3600000)}`;
    const dayKey = `${this.keyPrefix}:${userId}:day:${Math.floor(now / 86400000)}`;
    const costKey = `${this.keyPrefix}:${userId}:cost:${Math.floor(now / 86400000)}`;

    try {
      const [minute, hour, day, cost] = await Promise.all([
        this.redis.get(minuteKey),
        this.redis.get(hourKey),
        this.redis.get(dayKey),
        this.redis.get(costKey),
      ]);

      return {
        minute: parseInt(minute || '0'),
        hour: parseInt(hour || '0'),
        day: parseInt(day || '0'),
        cost: parseFloat(cost || '0'),
      };
    } catch (error) {
      console.error('Get usage error:', error);
      return { minute: 0, hour: 0, day: 0, cost: 0 };
    }
  }

  private createAllowedStatus(): RateLimitStatus {
    const now = new Date();
    return {
      allowed: true,
      remaining: {
        minute: this.config.maxRequestsPerMinute,
        hour: this.config.maxRequestsPerHour,
        day: this.config.maxRequestsPerDay,
      },
      resetAt: {
        minute: new Date(now.getTime() + 60000),
        hour: new Date(now.getTime() + 3600000),
        day: new Date(now.getTime() + 86400000),
      },
      currentCost: 0,
    };
  }
}

/**
 * Create default rate limiter instance
 */
export function createAIRateLimiter(config?: Partial<RateLimitConfig>): AIRateLimiter {
  const defaultConfig: RateLimitConfig = {
    maxRequestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_MINUTE || '60'),
    maxRequestsPerHour: parseInt(process.env.AI_RATE_LIMIT_HOUR || '1000'),
    maxRequestsPerDay: parseInt(process.env.AI_RATE_LIMIT_DAY || '10000'),
    maxCostPerDay: parseFloat(process.env.AI_MAX_COST_PER_DAY || '100'),
    ...config,
  };

  return new AIRateLimiter(defaultConfig);
}
