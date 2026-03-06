/**
 * Grading Performance Optimizer
 * Optimizes AI grading for speed and cost
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { EnhancedGradingResult } from '../services/enhanced-smart-grading';
import Redis from 'ioredis';

/**
 * Optimization Strategy
 */
export interface OptimizationStrategy {
  // Response Time
  maxResponseTime: number; // ms, default 5000
  useCache: boolean; // default true
  parallelProcessing: boolean; // default true

  // Cost
  maxCostPerGrading: number; // USD, default 0.05
  preferLocalModel: boolean; // default true for simple tasks

  // Quality
  minConfidence: number; // default 0.7
  accuracyThreshold: number; // default 0.8
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  responseTime: number; // ms
  cost: number; // USD
  modelUsed: string;
  cacheHit: boolean;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  timestamp: Date;
}

/**
 * Cache Entry
 */
interface CacheEntry {
  result: EnhancedGradingResult;
  metrics: PerformanceMetrics;
  expiresAt: Date;
}

/**
 * Grading Performance Optimizer
 */
export class GradingOptimizer {
  private strategy: OptimizationStrategy;
  private redis: Redis;
  private performanceLog: PerformanceMetrics[] = [];

  constructor(
    private aiService: AIServiceOrchestrator,
    redis: Redis,
    strategy?: Partial<OptimizationStrategy>
  ) {
    this.redis = redis;
    this.strategy = {
      maxResponseTime: strategy?.maxResponseTime ?? 5000,
      useCache: strategy?.useCache ?? true,
      parallelProcessing: strategy?.parallelProcessing ?? true,
      maxCostPerGrading: strategy?.maxCostPerGrading ?? 0.05,
      preferLocalModel: strategy?.preferLocalModel ?? true,
      minConfidence: strategy?.minConfidence ?? 0.7,
      accuracyThreshold: strategy?.accuracyThreshold ?? 0.8,
    };
  }

  /**
   * Optimize grading request
   */
  async optimizeGrading(
    submission: string,
    subject: string,
    options: {
      assignmentType?: string;
      complexity?: 'simple' | 'moderate' | 'complex';
      priority?: 'low' | 'normal' | 'high';
    } = {}
  ): Promise<{
    result: EnhancedGradingResult;
    metrics: PerformanceMetrics;
    optimizations: string[];
  }> {
    const startTime = Date.now();
    const optimizations: string[] = [];

    // 1. Check cache first
    if (this.strategy.useCache) {
      const cached = await this.getCachedResult(submission, subject);
      if (cached) {
        optimizations.push('Cache hit - instant response');
        return {
          result: cached.result,
          metrics: {
            ...cached.metrics,
            cacheHit: true,
            responseTime: Date.now() - startTime,
          },
          optimizations,
        };
      }
    }

    // 2. Select optimal model
    const modelSelection = this.selectOptimalModel(submission, subject, options);
    optimizations.push(`Model: ${modelSelection.model} (${modelSelection.reason})`);

    // 3. Optimize prompt length
    const optimizedSubmission = this.optimizePromptLength(submission);
    if (optimizedSubmission.length < submission.length) {
      optimizations.push(`Prompt optimized: ${submission.length} → ${optimizedSubmission.length} chars`);
    }

    // 4. Execute with timeout
    const result = await this.executeWithTimeout(
      () => this.performGrading(optimizedSubmission, subject, modelSelection.model),
      this.strategy.maxResponseTime
    );

    const responseTime = Date.now() - startTime;

    // 5. Calculate cost
    const cost = this.calculateCost(result.tokenUsage, modelSelection.model);

    // 6. Create metrics
    const metrics: PerformanceMetrics = {
      responseTime,
      cost,
      modelUsed: modelSelection.model,
      cacheHit: false,
      tokenUsage: result.tokenUsage,
      timestamp: new Date(),
    };

    // 7. Cache result if appropriate
    if (this.strategy.useCache && this.shouldCache(result.result, metrics)) {
      await this.cacheResult(submission, subject, result.result, metrics);
      optimizations.push('Result cached for future use');
    }

    // 8. Log metrics
    this.performanceLog.push(metrics);
    await this.logMetrics(metrics, subject);

    // 9. Check if meets targets
    if (responseTime > this.strategy.maxResponseTime) {
      optimizations.push(`⚠️ Response time exceeded target (${responseTime}ms > ${this.strategy.maxResponseTime}ms)`);
    }

    if (cost > this.strategy.maxCostPerGrading) {
      optimizations.push(`⚠️ Cost exceeded target ($${cost.toFixed(4)} > $${this.strategy.maxCostPerGrading})`);
    }

    return {
      result: result.result,
      metrics,
      optimizations,
    };
  }

  /**
   * Batch optimize (parallel processing)
   */
  async optimizeBatch(
    submissions: Array<{ submission: string; subject: string }>,
    batchSize: number = 5
  ): Promise<Array<{
    result: EnhancedGradingResult;
    metrics: PerformanceMetrics;
    optimizations: string[];
  }>> {
    const results = [];

    // Process in batches
    for (let i = 0; i < submissions.length; i += batchSize) {
      const batch = submissions.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(s => this.optimizeGrading(s.submission, s.subject))
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    averageCost: number;
    totalCost: number;
    cacheHitRate: number;
    modelDistribution: Record<string, number>;
    recommendations: string[];
  } {
    if (this.performanceLog.length === 0) {
      return {
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        averageCost: 0,
        totalCost: 0,
        cacheHitRate: 0,
        modelDistribution: {},
        recommendations: ['No data yet'],
      };
    }

    // Sort by response time
    const sorted = [...this.performanceLog].sort((a, b) => a.responseTime - b.responseTime);

    const averageResponseTime = this.performanceLog.reduce((sum, m) => sum + m.responseTime, 0) / this.performanceLog.length;
    const p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)]?.responseTime || 0;
    const p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)]?.responseTime || 0;

    const averageCost = this.performanceLog.reduce((sum, m) => sum + m.cost, 0) / this.performanceLog.length;
    const totalCost = this.performanceLog.reduce((sum, m) => sum + m.cost, 0);

    const cacheHits = this.performanceLog.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / this.performanceLog.length) * 100;

    const modelDistribution: Record<string, number> = {};
    for (const metric of this.performanceLog) {
      modelDistribution[metric.modelUsed] = (modelDistribution[metric.modelUsed] || 0) + 1;
    }

    const recommendations = this.generateRecommendations({
      averageResponseTime,
      p95ResponseTime,
      averageCost,
      cacheHitRate,
    });

    return {
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      averageCost,
      totalCost,
      cacheHitRate,
      modelDistribution,
      recommendations,
    };
  }

  /**
   * Select optimal model based on task
   */
  private selectOptimalModel(
    submission: string,
    subject: string,
    options: any
  ): { model: string; reason: string } {
    const wordCount = submission.split(/\s+/).length;
    const complexity = options.complexity || this.estimateComplexity(submission, subject);

    // Simple tasks → use local model (free, fast)
    if (
      this.strategy.preferLocalModel &&
      wordCount < 200 &&
      complexity === 'simple' &&
      subject !== 'math' // Math needs more accuracy
    ) {
      return {
        model: 'ollama/nemotron-orchestrator',
        reason: 'Simple task, local model sufficient (free)',
      };
    }

    // Moderate tasks → use Gemini (cheaper than GPT-4)
    if (complexity === 'moderate' || wordCount < 500) {
      return {
        model: 'gemini-1.5-flash',
        reason: 'Moderate complexity, Gemini Flash is fast and cheap',
      };
    }

    // Complex tasks or high priority → use GPT-4
    if (complexity === 'complex' || options.priority === 'high') {
      return {
        model: 'gpt-4o-mini',
        reason: 'Complex task, GPT-4 for best accuracy',
      };
    }

    // Default: Gemini Flash (good balance)
    return {
      model: 'gemini-1.5-flash',
      reason: 'Default: good balance of speed/cost/quality',
    };
  }

  /**
   * Estimate task complexity
   */
  private estimateComplexity(submission: string, subject: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = submission.split(/\s+/).length;

    // Simple: short submissions
    if (wordCount < 100) return 'simple';

    // Complex: long essays or math
    if (wordCount > 500 || subject === 'math') return 'complex';

    return 'moderate';
  }

  /**
   * Optimize prompt length (trim if too long)
   */
  private optimizePromptLength(submission: string, maxLength: number = 4000): string {
    if (submission.length <= maxLength) {
      return submission;
    }

    // Trim to max length, try to break at sentence
    const trimmed = submission.slice(0, maxLength);
    const lastPeriod = trimmed.lastIndexOf('.');

    if (lastPeriod > maxLength * 0.8) {
      return trimmed.slice(0, lastPeriod + 1);
    }

    return trimmed + '...';
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Grading timeout')), timeout)
      ),
    ]);
  }

  /**
   * Perform grading (mock - integrate with real service)
   */
  private async performGrading(
    submission: string,
    subject: string,
    model: string
  ): Promise<{
    result: EnhancedGradingResult;
    tokenUsage: { prompt: number; completion: number; total: number };
  }> {
    // This would integrate with actual grading service
    // For now, return mock data
    const promptTokens = Math.floor(submission.length / 4);
    const completionTokens = 500;

    return {
      result: {
        totalScore: 8.0,
        percentage: 80,
        grade: 'B',
        criteriaScores: [],
        overallFeedback: 'Good work',
        strengths: [],
        improvements: [],
        suggestions: [],
        confidence: 0.85,
      },
      tokenUsage: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
    };
  }

  /**
   * Calculate cost based on model and tokens
   */
  private calculateCost(
    tokens: { prompt: number; completion: number },
    model: string
  ): number {
    // Pricing (per 1M tokens)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o-mini': { input: 0.15, output: 0.60 }, // $0.15/$0.60 per 1M tokens
      'gpt-4': { input: 30.0, output: 60.0 },
      'gemini-1.5-flash': { input: 0.075, output: 0.30 },
      'gemini-1.5-pro': { input: 1.25, output: 5.0 },
      'ollama/nemotron-orchestrator': { input: 0, output: 0 }, // Free local
    };

    const modelPricing = pricing[model] || pricing['gemini-1.5-flash'];

    const inputCost = (tokens.prompt / 1_000_000) * modelPricing.input;
    const outputCost = (tokens.completion / 1_000_000) * modelPricing.output;

    return inputCost + outputCost;
  }

  /**
   * Get cached result
   */
  private async getCachedResult(
    submission: string,
    subject: string
  ): Promise<CacheEntry | null> {
    try {
      const cacheKey = this.getCacheKey(submission, subject);
      const cached = await this.redis.get(cacheKey);

      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);

      // Check expiration
      if (new Date(entry.expiresAt) < new Date()) {
        await this.redis.del(cacheKey);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Cache result
   */
  private async cacheResult(
    submission: string,
    subject: string,
    result: EnhancedGradingResult,
    metrics: PerformanceMetrics
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(submission, subject);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const entry: CacheEntry = {
        result,
        metrics,
        expiresAt,
      };

      await this.redis.setex(
        cacheKey,
        7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Get cache key
   */
  private getCacheKey(submission: string, subject: string): string {
    // Create hash of submission for cache key
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(submission + subject)
      .digest('hex');

    return `grading:cache:${hash}`;
  }

  /**
   * Should cache result?
   */
  private shouldCache(result: EnhancedGradingResult, metrics: PerformanceMetrics): boolean {
    // Cache if:
    // 1. High confidence
    // 2. Not too expensive
    // 3. Reasonable response time

    return (
      result.confidence >= 0.8 &&
      metrics.cost < this.strategy.maxCostPerGrading * 2 &&
      metrics.responseTime < this.strategy.maxResponseTime * 2
    );
  }

  /**
   * Log metrics to Redis
   */
  private async logMetrics(metrics: PerformanceMetrics, subject: string): Promise<void> {
    try {
      // Store individual metric
      const key = `grading:performance:${Date.now()}`;
      await this.redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(metrics));

      // Update aggregates
      await this.redis.hincrbyfloat('grading:perf:total_time', 'sum', metrics.responseTime);
      await this.redis.hincrby('grading:perf:total_time', 'count', 1);
      await this.redis.hincrbyfloat('grading:perf:total_cost', 'sum', metrics.cost);
      await this.redis.hincrby('grading:perf:total_cost', 'count', 1);

      // Update by subject
      const subjectKey = `grading:perf:subject:${subject}`;
      await this.redis.hincrbyfloat(subjectKey, 'time', metrics.responseTime);
      await this.redis.hincrbyfloat(subjectKey, 'cost', metrics.cost);
      await this.redis.hincrby(subjectKey, 'count', 1);
    } catch (error) {
      console.error('Failed to log metrics:', error);
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(stats: {
    averageResponseTime: number;
    p95ResponseTime: number;
    averageCost: number;
    cacheHitRate: number;
  }): string[] {
    const recommendations: string[] = [];

    if (stats.averageResponseTime > this.strategy.maxResponseTime) {
      recommendations.push(
        `⚠️ Average response time (${stats.averageResponseTime.toFixed(0)}ms) exceeds target (${this.strategy.maxResponseTime}ms)`
      );
      recommendations.push('Consider: Use faster models, increase cache hit rate, optimize prompts');
    } else {
      recommendations.push(`✅ Response time within target (${stats.averageResponseTime.toFixed(0)}ms)`);
    }

    if (stats.averageCost > this.strategy.maxCostPerGrading) {
      recommendations.push(
        `⚠️ Average cost ($${stats.averageCost.toFixed(4)}) exceeds target ($${this.strategy.maxCostPerGrading})`
      );
      recommendations.push('Consider: Use cheaper models (Gemini Flash, local Ollama), reduce token usage');
    } else {
      recommendations.push(`✅ Cost within target ($${stats.averageCost.toFixed(4)})`);
    }

    if (stats.cacheHitRate < 30) {
      recommendations.push(
        `💡 Low cache hit rate (${stats.cacheHitRate.toFixed(1)}%). Increase cache TTL or improve cache strategy`
      );
    } else if (stats.cacheHitRate > 50) {
      recommendations.push(`✅ Good cache hit rate (${stats.cacheHitRate.toFixed(1)}%)`);
    }

    if (stats.p95ResponseTime > this.strategy.maxResponseTime * 1.5) {
      recommendations.push(
        `⚠️ P95 response time (${stats.p95ResponseTime.toFixed(0)}ms) is high - investigate outliers`
      );
    }

    return recommendations;
  }
}

/**
 * Create optimizer instance
 */
export function createGradingOptimizer(
  aiService: AIServiceOrchestrator,
  redis: Redis,
  strategy?: Partial<OptimizationStrategy>
): GradingOptimizer {
  return new GradingOptimizer(aiService, redis, strategy);
}
