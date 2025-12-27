/**
 * AI Load Balancer - Distributed Model Execution
 * 
 * Features:
 * - Distribute load across multiple models
 * - Auto-fallback when model fails or overloaded
 * - Circuit breaker pattern
 * - Health monitoring
 */

export interface ModelHealth {
  modelName: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailureTime: number;
  avgLatency: number;
  successRate: number;
  requestCount: number;
}

export interface LoadBalancerConfig {
  maxConsecutiveFailures: number; // Circuit breaker threshold
  circuitBreakerTimeout: number; // ms to wait before retry
  healthCheckInterval: number; // ms between health checks
  maxConcurrentRequests: number; // per model
}

export class AILoadBalancer {
  private modelHealth: Map<string, ModelHealth>;
  private activeRequests: Map<string, number>;
  private config: LoadBalancerConfig;

  constructor(config?: Partial<LoadBalancerConfig>) {
    this.modelHealth = new Map();
    this.activeRequests = new Map();
    this.config = {
      maxConsecutiveFailures: 3,
      circuitBreakerTimeout: 60000, // 1 minute
      healthCheckInterval: 30000, // 30 seconds
      maxConcurrentRequests: 10,
      ...config,
    };

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Check if model is available
   */
  isModelAvailable(modelName: string): boolean {
    const health = this.modelHealth.get(modelName);

    if (!health) {
      // First time seeing this model - assume healthy
      this.initializeModelHealth(modelName);
      return true;
    }

    // Check circuit breaker
    if (!health.isHealthy) {
      const timeSinceFailure = Date.now() - health.lastFailureTime;
      if (timeSinceFailure > this.config.circuitBreakerTimeout) {
        // Try to reset circuit breaker
        console.log(`🔄 Resetting circuit breaker for ${modelName}`);
        health.isHealthy = true;
        health.consecutiveFailures = 0;
        return true;
      }
      console.log(`⚠️  Model ${modelName} is circuit-broken, trying again in ${Math.floor((this.config.circuitBreakerTimeout - timeSinceFailure) / 1000)}s`);
      return false;
    }

    // Check concurrent requests
    const activeCount = this.activeRequests.get(modelName) || 0;
    if (activeCount >= this.config.maxConcurrentRequests) {
      console.log(
        `⚠️  Model ${modelName} is at max capacity (${activeCount}/${this.config.maxConcurrentRequests})`
      );
      return false;
    }

    return true;
  }

  /**
   * Initialize model health tracking
   */
  private initializeModelHealth(modelName: string): void {
    this.modelHealth.set(modelName, {
      modelName,
      isHealthy: true,
      consecutiveFailures: 0,
      lastFailureTime: 0,
      avgLatency: 0,
      successRate: 100,
      requestCount: 0,
    });
  }

  /**
   * Record request start
   */
  recordRequestStart(modelName: string): void {
    const currentCount = this.activeRequests.get(modelName) || 0;
    this.activeRequests.set(modelName, currentCount + 1);
  }

  /**
   * Record request end with result
   */
  recordRequestEnd(
    modelName: string,
    success: boolean,
    latency: number
  ): void {
    // Decrement active requests
    const currentCount = this.activeRequests.get(modelName) || 1;
    this.activeRequests.set(modelName, Math.max(0, currentCount - 1));

    // Update health
    const health = this.modelHealth.get(modelName);
    if (!health) {
      this.initializeModelHealth(modelName);
      return;
    }

    health.requestCount++;

    // Update latency (moving average)
    health.avgLatency =
      (health.avgLatency * (health.requestCount - 1) + latency) /
      health.requestCount;

    if (success) {
      // Success - reset consecutive failures
      health.consecutiveFailures = 0;

      // Update success rate
      const successCount = Math.floor(
        (health.successRate * (health.requestCount - 1)) / 100
      );
      health.successRate = ((successCount + 1) / health.requestCount) * 100;

      console.log(
        `✅ ${modelName} request successful (${latency}ms, ${health.successRate.toFixed(1)}% success rate)`
      );
    } else {
      // Failure
      health.consecutiveFailures++;
      health.lastFailureTime = Date.now();

      // Update success rate
      const successCount = Math.floor(
        (health.successRate * (health.requestCount - 1)) / 100
      );
      health.successRate = (successCount / health.requestCount) * 100;

      console.log(
        `❌ ${modelName} request failed (consecutive failures: ${health.consecutiveFailures})`
      );

      // Trip circuit breaker if too many failures
      if (health.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        health.isHealthy = false;
        console.log(
          `🔌 Circuit breaker tripped for ${modelName} (${health.consecutiveFailures} consecutive failures)`
        );
      }
    }
  }

  /**
   * Get fallback models
   */
  getFallbackModels(primaryModel: string, allModels: string[]): string[] {
    return allModels
      .filter((model) => model !== primaryModel)
      .filter((model) => this.isModelAvailable(model))
      .sort((a, b) => {
        const healthA = this.modelHealth.get(a);
        const healthB = this.modelHealth.get(b);

        if (!healthA) return 1;
        if (!healthB) return -1;

        // Sort by success rate and latency
        const scoreA = healthA.successRate - healthA.avgLatency / 1000;
        const scoreB = healthB.successRate - healthB.avgLatency / 1000;

        return scoreB - scoreA;
      });
  }

  /**
   * Get model health status
   */
  getModelHealthStatus(modelName?: string): ModelHealth | Map<string, ModelHealth> {
    if (modelName) {
      return this.modelHealth.get(modelName) || this.initializeModelHealth(modelName) as any;
    }
    return this.modelHealth;
  }

  /**
   * Start health monitoring (periodic)
   */
  private startHealthMonitoring(): void {
    if (typeof setInterval === 'undefined') return;

    setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
    for (const [modelName, health] of this.modelHealth.entries()) {
      // Auto-reset circuit breaker if enough time passed
      if (!health.isHealthy) {
        const timeSinceFailure = Date.now() - health.lastFailureTime;
        if (timeSinceFailure > this.config.circuitBreakerTimeout) {
          health.isHealthy = true;
          health.consecutiveFailures = 0;
          console.log(`🔄 Auto-reset circuit breaker for ${modelName}`);
        }
      }

      // Log health status
      if (health.requestCount > 0) {
        const status = health.isHealthy ? '✅' : '❌';
        console.log(
          `${status} Health: ${modelName} - ${health.successRate.toFixed(1)}% success, ${health.avgLatency.toFixed(0)}ms avg latency`
        );
      }
    }
  }

  /**
   * Reset health for a model
   */
  resetHealth(modelName: string): void {
    const health = this.modelHealth.get(modelName);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      console.log(`🔄 Manually reset health for ${modelName}`);
    }
  }

  /**
   * Get load distribution
   */
  getLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const [modelName, health] of this.modelHealth.entries()) {
      distribution[modelName] = health.requestCount;
    }

    return distribution;
  }
}

// Export singleton instance
export const loadBalancer = new AILoadBalancer();

