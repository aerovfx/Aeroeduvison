/**
 * A/B Testing Framework for AI Models
 * Compare different models, prompts, and parameters
 */

import { AIServiceOrchestrator, AIRequest, AIResponse } from '../ai-service-orchestrator';

export interface ABTestConfig {
  name: string;
  description: string;
  variants: ABVariant[];
  trafficSplit: number[]; // e.g., [50, 50] for 50/50 split
  duration?: number; // Test duration in days
  targetMetrics: string[]; // e.g., ['accuracy', 'cost', 'latency']
}

export interface ABVariant {
  id: string;
  name: string;
  config: {
    provider?: 'openai' | 'gemini';
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface ABTestResult {
  variantId: string;
  metrics: {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    averageCost: number;
    p95Latency: number;
    errorRate: number;
    customMetrics?: Record<string, number>;
  };
}

export interface ABTestSummary {
  testId: string;
  testName: string;
  status: 'running' | 'completed' | 'paused';
  startDate: Date;
  endDate?: Date;
  results: ABTestResult[];
  winner?: string;
  confidence: number; // Statistical significance
}

export class ABTestingFramework {
  private redis: any;
  private keyPrefix = 'ai:abtest';
  private activeTests: Map<string, ABTestConfig> = new Map();

  async initialize(redisClient: any) {
    this.redis = redisClient;
    await this.loadActiveTests();
  }

  /**
   * Create new A/B test
   */
  async createTest(config: ABTestConfig): Promise<string> {
    const testId = this.generateTestId();

    // Validate traffic split
    const totalSplit = config.trafficSplit.reduce((a, b) => a + b, 0);
    if (Math.abs(totalSplit - 100) > 0.01) {
      throw new Error('Traffic split must sum to 100');
    }

    if (config.variants.length !== config.trafficSplit.length) {
      throw new Error('Number of variants must match traffic split array');
    }

    this.activeTests.set(testId, config);

    // Store in Redis
    if (this.redis) {
      const testKey = `${this.keyPrefix}:config:${testId}`;
      await this.redis.set(
        testKey,
        JSON.stringify({
          ...config,
          id: testId,
          startDate: new Date(),
          status: 'running',
        })
      );
    }

    console.log(`🧪 Created A/B test: ${testId} - ${config.name}`);

    return testId;
  }

  /**
   * Get variant for request (traffic splitting)
   */
  async getVariant(testId: string, userId: string): Promise<ABVariant | null> {
    const config = this.activeTests.get(testId);
    if (!config) return null;

    // Consistent hashing based on userId
    const hash = this.hashString(userId + testId);
    const bucket = hash % 100;

    let cumulative = 0;
    for (let i = 0; i < config.trafficSplit.length; i++) {
      cumulative += config.trafficSplit[i];
      if (bucket < cumulative) {
        return config.variants[i];
      }
    }

    return config.variants[0];
  }

  /**
   * Execute request with A/B testing
   */
  async executeWithTest(
    testId: string,
    userId: string,
    aiService: AIServiceOrchestrator,
    request: AIRequest
  ): Promise<{ response: AIResponse; variantId: string }> {
    const variant = await this.getVariant(testId, userId);

    if (!variant) {
      throw new Error(`Test ${testId} not found`);
    }

    const startTime = Date.now();

    try {
      // Apply variant config
      const modifiedRequest = this.applyVariantConfig(request, variant);

      // Execute request
      const response = await aiService.complete(modifiedRequest);

      const latency = Date.now() - startTime;

      // Record metrics
      await this.recordMetrics(testId, variant.id, {
        success: true,
        latency,
        cost: response.cost,
      });

      return { response, variantId: variant.id };
    } catch (error) {
      const latency = Date.now() - startTime;

      await this.recordMetrics(testId, variant.id, {
        success: false,
        latency,
        cost: 0,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Get test results
   */
  async getTestResults(testId: string): Promise<ABTestSummary | null> {
    if (!this.redis) return null;

    const testKey = `${this.keyPrefix}:config:${testId}`;
    const testData = await this.redis.get(testKey);

    if (!testData) return null;

    const config = JSON.parse(testData);
    const results: ABTestResult[] = [];

    for (const variant of config.variants) {
      const metrics = await this.getVariantMetrics(testId, variant.id);
      results.push({
        variantId: variant.id,
        metrics,
      });
    }

    // Determine winner
    const winner = this.determineWinner(results, config.targetMetrics);

    return {
      testId,
      testName: config.name,
      status: config.status,
      startDate: new Date(config.startDate),
      endDate: config.endDate ? new Date(config.endDate) : undefined,
      results,
      winner: winner.variantId,
      confidence: winner.confidence,
    };
  }

  /**
   * Stop test and declare winner
   */
  async stopTest(testId: string): Promise<void> {
    if (!this.redis) return;

    const testKey = `${this.keyPrefix}:config:${testId}`;
    const testData = await this.redis.get(testKey);

    if (testData) {
      const config = JSON.parse(testData);
      config.status = 'completed';
      config.endDate = new Date();

      await this.redis.set(testKey, JSON.stringify(config));

      this.activeTests.delete(testId);

      console.log(`🏁 Stopped A/B test: ${testId}`);
    }
  }

  /**
   * List all active tests
   */
  async listActiveTests(): Promise<ABTestSummary[]> {
    if (!this.redis) return [];

    const pattern = `${this.keyPrefix}:config:*`;
    const tests: ABTestSummary[] = [];

    let cursor = '0';
    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const testData = await this.redis.get(key);
        if (testData) {
          const config = JSON.parse(testData);
          if (config.status === 'running') {
            const testId = key.split(':').pop();
            const summary = await this.getTestResults(testId);
            if (summary) {
              tests.push(summary);
            }
          }
        }
      }
    } while (cursor !== '0');

    return tests;
  }

  /**
   * Apply variant configuration to request
   */
  private applyVariantConfig(request: AIRequest, variant: ABVariant): AIRequest {
    const modifiedRequest = { ...request };

    if (variant.config.temperature !== undefined) {
      modifiedRequest.options = {
        ...modifiedRequest.options,
        temperature: variant.config.temperature,
      };
    }

    if (variant.config.maxTokens !== undefined) {
      modifiedRequest.options = {
        ...modifiedRequest.options,
        maxTokens: variant.config.maxTokens,
      };
    }

    if (variant.config.model !== undefined) {
      modifiedRequest.options = {
        ...modifiedRequest.options,
        model: variant.config.model,
      };
    }

    if (variant.config.systemPrompt !== undefined) {
      modifiedRequest.messages = [
        { role: 'system', content: variant.config.systemPrompt },
        ...modifiedRequest.messages.filter(m => m.role !== 'system'),
      ];
    }

    return modifiedRequest;
  }

  /**
   * Record metrics for variant
   */
  private async recordMetrics(
    testId: string,
    variantId: string,
    data: {
      success: boolean;
      latency: number;
      cost: number;
      error?: string;
    }
  ): Promise<void> {
    if (!this.redis) return;

    const metricsKey = `${this.keyPrefix}:metrics:${testId}:${variantId}`;

    await this.redis.rpush(
      metricsKey,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );

    // Set expiration (90 days)
    await this.redis.expire(metricsKey, 60 * 60 * 24 * 90);
  }

  /**
   * Get aggregated metrics for variant
   */
  private async getVariantMetrics(
    testId: string,
    variantId: string
  ): Promise<ABTestResult['metrics']> {
    if (!this.redis) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        averageCost: 0,
        p95Latency: 0,
        errorRate: 0,
      };
    }

    const metricsKey = `${this.keyPrefix}:metrics:${testId}:${variantId}`;
    const rawMetrics = await this.redis.lrange(metricsKey, 0, -1);

    if (rawMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        averageCost: 0,
        p95Latency: 0,
        errorRate: 0,
      };
    }

    const metrics = rawMetrics.map((m: string) => JSON.parse(m));

    const totalRequests = metrics.length;
    const successful = metrics.filter((m: any) => m.success).length;
    const successRate = (successful / totalRequests) * 100;
    const errorRate = 100 - successRate;

    const latencies = metrics.map((m: any) => m.latency).sort((a: number, b: number) => a - b);
    const averageLatency = latencies.reduce((a: number, b: number) => a + b, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || latencies[latencies.length - 1];

    const averageCost = metrics.reduce((sum: number, m: any) => sum + m.cost, 0) / totalRequests;

    return {
      totalRequests,
      successRate,
      averageLatency,
      averageCost,
      p95Latency,
      errorRate,
    };
  }

  /**
   * Determine winner based on target metrics
   */
  private determineWinner(
    results: ABTestResult[],
    targetMetrics: string[]
  ): { variantId: string; confidence: number } {
    // Simple scoring based on multiple metrics
    const scores = results.map(result => {
      let score = 0;

      if (targetMetrics.includes('accuracy')) {
        score += result.metrics.successRate;
      }

      if (targetMetrics.includes('latency')) {
        // Lower is better, invert for scoring
        const maxLatency = Math.max(...results.map(r => r.metrics.averageLatency));
        score += ((maxLatency - result.metrics.averageLatency) / maxLatency) * 100;
      }

      if (targetMetrics.includes('cost')) {
        // Lower is better, invert for scoring
        const maxCost = Math.max(...results.map(r => r.metrics.averageCost));
        score += ((maxCost - result.metrics.averageCost) / maxCost) * 100;
      }

      return { variantId: result.variantId, score };
    });

    scores.sort((a, b) => b.score - a.score);

    // Calculate confidence (simplified)
    const winner = scores[0];
    const runnerUp = scores[1];
    const confidence = winner && runnerUp
      ? Math.min(((winner.score - runnerUp.score) / winner.score) * 100, 99)
      : 50;

    return {
      variantId: winner.variantId,
      confidence,
    };
  }

  /**
   * Hash string to number
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate test ID
   */
  private generateTestId(): string {
    return `abtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load active tests from Redis
   */
  private async loadActiveTests(): Promise<void> {
    if (!this.redis) return;

    const pattern = `${this.keyPrefix}:config:*`;
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const testData = await this.redis.get(key);
        if (testData) {
          const config = JSON.parse(testData);
          if (config.status === 'running') {
            const testId = key.split(':').pop();
            this.activeTests.set(testId, config);
          }
        }
      }
    } while (cursor !== '0');

    console.log(`📊 Loaded ${this.activeTests.size} active A/B tests`);
  }
}

/**
 * Create default A/B testing framework
 */
export function createABTestingFramework(): ABTestingFramework {
  return new ABTestingFramework();
}
