/**
 * AI Cost Tracking and Monitoring
 * Track and analyze AI API costs with alerts and budgets
 */

export interface CostEntry {
  timestamp: Date;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  userId?: string;
  feature: string;
  cached: boolean;
}

export interface CostSummary {
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  byProvider: Record<string, number>;
  byFeature: Record<string, number>;
  cacheHitRate: number;
  costSavedByCache: number;
}

export interface CostAlert {
  type: 'daily_limit' | 'spike' | 'budget_warning';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentCost: number;
  threshold: number;
  timestamp: Date;
}

export class CostTracker {
  private redis: any;
  private costEntries: CostEntry[] = [];
  private alerts: CostAlert[] = [];
  private dailyBudget: number;
  private monthlyBudget: number;

  constructor(config?: { dailyBudget?: number; monthlyBudget?: number }) {
    this.dailyBudget = config?.dailyBudget || parseFloat(process.env.AI_DAILY_BUDGET || '50');
    this.monthlyBudget = config?.monthlyBudget || parseFloat(process.env.AI_MONTHLY_BUDGET || '1000');
  }

  async initialize(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Track a cost entry
   */
  async track(entry: Omit<CostEntry, 'timestamp'>): Promise<void> {
    const costEntry: CostEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.costEntries.push(costEntry);

    // Store in Redis for persistence
    if (this.redis) {
      await this.storeCostEntry(costEntry);
    }

    // Check for alerts
    await this.checkAlerts();

    // Log
    console.log(`💰 Cost tracked: $${entry.cost.toFixed(4)} - ${entry.feature} (${entry.provider})`);
  }

  /**
   * Get cost summary for a time period
   */
  async getSummary(
    startDate: Date,
    endDate: Date = new Date()
  ): Promise<CostSummary> {
    const entries = await this.getCostEntries(startDate, endDate);

    const totalCost = entries.reduce((sum, e) => sum + e.cost, 0);
    const requestCount = entries.length;
    const cachedRequests = entries.filter(e => e.cached).length;
    const cacheHitRate = requestCount > 0 ? (cachedRequests / requestCount) * 100 : 0;

    const byProvider: Record<string, number> = {};
    const byFeature: Record<string, number> = {};
    let costSavedByCache = 0;

    entries.forEach(entry => {
      // By provider
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = 0;
      }
      byProvider[entry.provider] += entry.cost;

      // By feature
      if (!byFeature[entry.feature]) {
        byFeature[entry.feature] = 0;
      }
      byFeature[entry.feature] += entry.cost;

      // Cache savings (estimated)
      if (entry.cached) {
        costSavedByCache += entry.cost;
      }
    });

    return {
      totalCost,
      requestCount,
      avgCostPerRequest: requestCount > 0 ? totalCost / requestCount : 0,
      byProvider,
      byFeature,
      cacheHitRate,
      costSavedByCache,
    };
  }

  /**
   * Get today's cost
   */
  async getTodayCost(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = await this.getSummary(today);
    return summary.totalCost;
  }

  /**
   * Get this month's cost
   */
  async getMonthCost(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const summary = await this.getSummary(startOfMonth);
    return summary.totalCost;
  }

  /**
   * Get cost trend (daily costs for last N days)
   */
  async getCostTrend(days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    const trend: Array<{ date: string; cost: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const summary = await this.getSummary(date, nextDay);

      trend.push({
        date: date.toISOString().split('T')[0],
        cost: summary.totalCost,
      });
    }

    return trend;
  }

  /**
   * Get active alerts
   */
  getAlerts(): CostAlert[] {
    return this.alerts.filter(alert => {
      const age = Date.now() - alert.timestamp.getTime();
      return age < 24 * 60 * 60 * 1000; // Last 24 hours
    });
  }

  /**
   * Export cost data for analysis
   */
  async exportCostData(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const entries = await this.getCostEntries(startDate, endDate);

    if (format === 'csv') {
      const headers = [
        'Timestamp',
        'Provider',
        'Model',
        'Feature',
        'PromptTokens',
        'CompletionTokens',
        'Cost',
        'Cached',
      ];
      const rows = entries.map(e => [
        e.timestamp.toISOString(),
        e.provider,
        e.model,
        e.feature,
        e.promptTokens,
        e.completionTokens,
        e.cost.toFixed(6),
        e.cached,
      ]);

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    return JSON.stringify(entries, null, 2);
  }

  /**
   * Store cost entry in Redis
   */
  private async storeCostEntry(entry: CostEntry): Promise<void> {
    if (!this.redis) return;

    const key = `ai:cost:entry:${entry.timestamp.getTime()}`;
    await this.redis.setex(key, 60 * 60 * 24 * 90, JSON.stringify(entry)); // 90 days retention

    // Update daily total
    const dayKey = `ai:cost:day:${entry.timestamp.toISOString().split('T')[0]}`;
    await this.redis.incrbyfloat(dayKey, entry.cost);
    await this.redis.expire(dayKey, 60 * 60 * 24 * 90);
  }

  /**
   * Get cost entries from storage
   */
  private async getCostEntries(startDate: Date, endDate: Date): Promise<CostEntry[]> {
    if (!this.redis) {
      return this.costEntries.filter(
        e => e.timestamp >= startDate && e.timestamp <= endDate
      );
    }

    const entries: CostEntry[] = [];
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const pattern = 'ai:cost:entry:*';
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        const values = await this.redis.mget(...keys);

        values.forEach((value: string) => {
          if (value) {
            const entry = JSON.parse(value);
            entry.timestamp = new Date(entry.timestamp);

            if (entry.timestamp.getTime() >= startTime && entry.timestamp.getTime() <= endTime) {
              entries.push(entry);
            }
          }
        });
      }
    } while (cursor !== '0');

    return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Check for cost alerts
   */
  private async checkAlerts(): Promise<void> {
    const todayCost = await this.getTodayCost();
    const monthCost = await this.getMonthCost();

    // Daily budget warning
    if (todayCost >= this.dailyBudget * 0.8 && todayCost < this.dailyBudget) {
      this.addAlert({
        type: 'budget_warning',
        severity: 'warning',
        message: `Daily cost is at ${((todayCost / this.dailyBudget) * 100).toFixed(1)}% of budget`,
        currentCost: todayCost,
        threshold: this.dailyBudget * 0.8,
        timestamp: new Date(),
      });
    }

    // Daily budget exceeded
    if (todayCost >= this.dailyBudget) {
      this.addAlert({
        type: 'daily_limit',
        severity: 'critical',
        message: `Daily budget exceeded! Current: $${todayCost.toFixed(2)}, Limit: $${this.dailyBudget}`,
        currentCost: todayCost,
        threshold: this.dailyBudget,
        timestamp: new Date(),
      });
    }

    // Monthly budget warning
    if (monthCost >= this.monthlyBudget * 0.8 && monthCost < this.monthlyBudget) {
      this.addAlert({
        type: 'budget_warning',
        severity: 'warning',
        message: `Monthly cost is at ${((monthCost / this.monthlyBudget) * 100).toFixed(1)}% of budget`,
        currentCost: monthCost,
        threshold: this.monthlyBudget * 0.8,
        timestamp: new Date(),
      });
    }

    // Monthly budget exceeded
    if (monthCost >= this.monthlyBudget) {
      this.addAlert({
        type: 'daily_limit',
        severity: 'critical',
        message: `Monthly budget exceeded! Current: $${monthCost.toFixed(2)}, Limit: $${this.monthlyBudget}`,
        currentCost: monthCost,
        threshold: this.monthlyBudget,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Add alert
   */
  private addAlert(alert: CostAlert): void {
    // Check if similar alert exists in last hour
    const recentSimilar = this.alerts.find(
      a =>
        a.type === alert.type &&
        a.severity === alert.severity &&
        Date.now() - a.timestamp.getTime() < 60 * 60 * 1000
    );

    if (!recentSimilar) {
      this.alerts.push(alert);
      console.warn(`🚨 Cost Alert [${alert.severity}]: ${alert.message}`);

      // TODO: Send to monitoring service (email, Slack, etc.)
    }
  }
}

/**
 * Create singleton cost tracker
 */
let instance: CostTracker | null = null;

export function getCostTracker(config?: { dailyBudget?: number; monthlyBudget?: number }): CostTracker {
  if (!instance) {
    instance = new CostTracker(config);
  }
  return instance;
}
