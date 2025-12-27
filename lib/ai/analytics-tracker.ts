/**
 * AI Analytics Tracker - Monitoring & Analytics System
 * 
 * Features:
 * - Track usage, cost, latency per model
 * - Monitor success/failure rates
 * - Generate insights for optimization
 * - A/B testing support
 */

import { TaskType } from './model-selector';

export interface RequestLog {
  id: string;
  timestamp: number;
  modelName: string;
  provider: string;
  taskType: TaskType;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latency: number; // milliseconds
  success: boolean;
  errorMessage?: string;
  userId?: string;
  cacheHit: boolean;
  abTestGroup?: string;
}

export interface ModelAnalytics {
  modelName: string;
  provider: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalCost: number;
  avgCost: number;
  avgLatency: number;
  totalTokensIn: number;
  totalTokensOut: number;
  cacheHitRate: number;
  lastUsed: number;
}

export interface PerformanceMetrics {
  overall: {
    totalRequests: number;
    totalCost: number;
    avgLatency: number;
    successRate: number;
    cacheHitRate: number;
  };
  byModel: Map<string, ModelAnalytics>;
  byTaskType: Map<string, any>;
  costSavingsFromCache: number;
  recommendations: string[];
}

export class AIAnalyticsTracker {
  private logs: RequestLog[];
  private maxLogs: number;

  constructor(maxLogs: number = 10000) {
    this.logs = [];
    this.maxLogs = maxLogs;
  }

  /**
   * Log a request
   */
  logRequest(log: RequestLog): void {
    this.logs.push(log);

    // Trim old logs if exceeds max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console log for monitoring
    const status = log.success ? '✅' : '❌';
    const cache = log.cacheHit ? '💾' : '🌐';
    console.log(
      `${status} ${cache} [${log.provider}/${log.modelName}] ${log.taskType} - ${log.latency}ms - $${log.cost.toFixed(6)}`
    );
  }

  /**
   * Get analytics for a specific model
   */
  getModelAnalytics(modelName: string): ModelAnalytics | null {
    const modelLogs = this.logs.filter((log) => log.modelName === modelName);

    if (modelLogs.length === 0) return null;

    const successful = modelLogs.filter((log) => log.success);
    const cacheHits = modelLogs.filter((log) => log.cacheHit);

    return {
      modelName,
      provider: modelLogs[0].provider,
      totalRequests: modelLogs.length,
      successfulRequests: successful.length,
      failedRequests: modelLogs.length - successful.length,
      successRate: (successful.length / modelLogs.length) * 100,
      totalCost: modelLogs.reduce((sum, log) => sum + log.cost, 0),
      avgCost:
        modelLogs.reduce((sum, log) => sum + log.cost, 0) / modelLogs.length,
      avgLatency:
        modelLogs.reduce((sum, log) => sum + log.latency, 0) / modelLogs.length,
      totalTokensIn: modelLogs.reduce((sum, log) => sum + log.inputTokens, 0),
      totalTokensOut: modelLogs.reduce((sum, log) => sum + log.outputTokens, 0),
      cacheHitRate: (cacheHits.length / modelLogs.length) * 100,
      lastUsed: Math.max(...modelLogs.map((log) => log.timestamp)),
    };
  }

  /**
   * Get overall performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const successful = this.logs.filter((log) => log.success);
    const cacheHits = this.logs.filter((log) => log.cacheHit);

    const byModel = new Map<string, ModelAnalytics>();
    const byTaskType = new Map<string, any>();

    // Calculate per-model metrics
    const uniqueModels = [...new Set(this.logs.map((log) => log.modelName))];
    for (const modelName of uniqueModels) {
      const analytics = this.getModelAnalytics(modelName);
      if (analytics) {
        byModel.set(modelName, analytics);
      }
    }

    // Calculate per-task-type metrics
    const uniqueTaskTypes = [...new Set(this.logs.map((log) => log.taskType))];
    for (const taskType of uniqueTaskTypes) {
      const taskLogs = this.logs.filter((log) => log.taskType === taskType);
      const taskSuccessful = taskLogs.filter((log) => log.success);

      byTaskType.set(taskType, {
        totalRequests: taskLogs.length,
        successRate: (taskSuccessful.length / taskLogs.length) * 100,
        avgCost: taskLogs.reduce((sum, log) => sum + log.cost, 0) / taskLogs.length,
        avgLatency:
          taskLogs.reduce((sum, log) => sum + log.latency, 0) / taskLogs.length,
        mostUsedModel: this.getMostUsedModel(taskLogs),
      });
    }

    // Calculate cost savings from cache
    const costSavingsFromCache = cacheHits.reduce((sum, log) => sum + log.cost, 0);

    // Generate recommendations
    const recommendations = this.generateRecommendations(byModel, byTaskType);

    return {
      overall: {
        totalRequests: this.logs.length,
        totalCost: this.logs.reduce((sum, log) => sum + log.cost, 0),
        avgLatency:
          this.logs.reduce((sum, log) => sum + log.latency, 0) / this.logs.length,
        successRate: (successful.length / this.logs.length) * 100,
        cacheHitRate: (cacheHits.length / this.logs.length) * 100,
      },
      byModel,
      byTaskType,
      costSavingsFromCache,
      recommendations,
    };
  }

  /**
   * Get most used model for task type
   */
  private getMostUsedModel(logs: RequestLog[]): string {
    const modelCounts = new Map<string, number>();

    for (const log of logs) {
      const count = modelCounts.get(log.modelName) || 0;
      modelCounts.set(log.modelName, count + 1);
    }

    let maxCount = 0;
    let mostUsed = '';

    for (const [model, count] of modelCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostUsed = model;
      }
    }

    return mostUsed;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    byModel: Map<string, ModelAnalytics>,
    byTaskType: Map<string, any>
  ): string[] {
    const recommendations: string[] = [];

    // Check for expensive models with low usage
    for (const [modelName, analytics] of byModel.entries()) {
      if (analytics.avgCost > 0.01 && analytics.totalRequests < 10) {
        recommendations.push(
          `⚠️ Model ${modelName} has high cost ($${analytics.avgCost.toFixed(4)}) but low usage. Consider switching to cheaper alternative.`
        );
      }

      if (analytics.successRate < 90) {
        recommendations.push(
          `⚠️ Model ${modelName} has low success rate (${analytics.successRate.toFixed(1)}%). Investigate errors or use fallback.`
        );
      }

      if (analytics.avgLatency > 5000) {
        recommendations.push(
          `⚠️ Model ${modelName} is slow (avg ${(analytics.avgLatency / 1000).toFixed(1)}s). Consider faster alternative for real-time tasks.`
        );
      }
    }

    // Check cache effectiveness
    const cacheHitRate =
      this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    if (cacheHitRate < 30 && this.logs.length > 50) {
      recommendations.push(
        `💡 Cache hit rate is low (${cacheHitRate.toFixed(1)}%). Consider increasing TTL or cache size.`
      );
    }

    if (this.stats.costSaved > 1) {
      recommendations.push(
        `💰 Cache saved $${this.stats.costSaved.toFixed(2)} so far. Keep using cache!`
      );
    }

    // Task-specific recommendations
    for (const [taskType, metrics] of byTaskType.entries()) {
      if (metrics.avgCost > 0.02) {
        recommendations.push(
          `💡 Task ${taskType} is expensive (avg $${metrics.avgCost.toFixed(4)}). Consider using cheaper model like GPT-3.5 or Gemini Flash.`
        );
      }
    }

    return recommendations;
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): RequestLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Export logs for analysis
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.stats = {
      hits: 0,
      misses: 0,
      costSaved: 0,
    };
    console.log('🗑️  All logs cleared');
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown(): {
    totalCost: number;
    byModel: Record<string, number>;
    byTaskType: Record<string, number>;
    byDay: Record<string, number>;
  } {
    const byModel: Record<string, number> = {};
    const byTaskType: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const log of this.logs) {
      // By model
      byModel[log.modelName] = (byModel[log.modelName] || 0) + log.cost;

      // By task type
      byTaskType[log.taskType] = (byTaskType[log.taskType] || 0) + log.cost;

      // By day
      const date = new Date(log.timestamp).toISOString().split('T')[0];
      byDay[date] = (byDay[date] || 0) + log.cost;
    }

    return {
      totalCost: this.logs.reduce((sum, log) => sum + log.cost, 0),
      byModel,
      byTaskType,
      byDay,
    };
  }
}

// Export singleton instance
export const analyticsTracker = new AIAnalyticsTracker();

