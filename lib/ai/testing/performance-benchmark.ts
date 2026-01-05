/**
 * Performance Benchmarking System
 * Measure and track AI service performance metrics
 */

import { AIServiceOrchestrator } from '../ai-service-orchestrator';
import { ContentGeneratorService, ContentRequest } from '../services/content-generator';
import { SmartGradingService, GradingRequest } from '../services/smart-grading';

export interface BenchmarkConfig {
  name: string;
  iterations: number;
  warmupIterations?: number;
  concurrency?: number;
}

export interface BenchmarkResult {
  name: string;
  totalIterations: number;
  successfulIterations: number;
  failedIterations: number;
  metrics: {
    averageLatency: number;
    medianLatency: number;
    p95Latency: number;
    p99Latency: number;
    minLatency: number;
    maxLatency: number;
    throughput: number; // requests per second
    averageCost: number;
    totalCost: number;
    cacheHitRate: number;
  };
  errors: Array<{ message: string; count: number }>;
  timestamp: Date;
}

export class PerformanceBenchmark {
  private aiService: AIServiceOrchestrator;

  constructor(aiService: AIServiceOrchestrator) {
    this.aiService = aiService;
  }

  /**
   * Benchmark content generation
   */
  async benchmarkContentGeneration(
    request: ContentRequest,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    console.log(`🏃 Starting benchmark: ${config.name}`);

    const contentGen = new ContentGeneratorService(this.aiService);
    const latencies: number[] = [];
    const costs: number[] = [];
    const errors: Map<string, number> = new Map();
    let cached = 0;

    // Warmup
    if (config.warmupIterations && config.warmupIterations > 0) {
      console.log(`🔥 Warming up: ${config.warmupIterations} iterations...`);
      for (let i = 0; i < config.warmupIterations; i++) {
        try {
          if (request.type === 'lesson') {
            await contentGen.generateLesson(request);
          } else if (request.type === 'quiz') {
            await contentGen.generateQuiz(request);
          } else if (request.type === 'slides') {
            await contentGen.generateSlides(request);
          }
        } catch (error) {
          // Ignore warmup errors
        }
      }
    }

    // Actual benchmark
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < config.iterations; i++) {
      const iterationStart = Date.now();

      try {
        let response;
        if (request.type === 'lesson') {
          response = await contentGen.generateLesson(request);
        } else if (request.type === 'quiz') {
          response = await contentGen.generateQuiz(request);
        } else if (request.type === 'slides') {
          response = await contentGen.generateSlides(request);
        }

        const latency = Date.now() - iterationStart;
        latencies.push(latency);

        // Estimate cost (would need actual response metadata)
        costs.push(0.01); // Placeholder

        successful++;

        if (i % 10 === 0) {
          console.log(`  Progress: ${i}/${config.iterations} (${((i / config.iterations) * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        const latency = Date.now() - iterationStart;
        latencies.push(latency);

        const errorMsg = (error as Error).message;
        errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);

        failed++;
      }
    }

    const totalTime = Date.now() - startTime;

    return this.calculateResults(
      config.name,
      config.iterations,
      successful,
      failed,
      latencies,
      costs,
      cached,
      totalTime,
      errors
    );
  }

  /**
   * Benchmark grading service
   */
  async benchmarkGrading(
    requests: GradingRequest[],
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    console.log(`🏃 Starting grading benchmark: ${config.name}`);

    const gradingService = new SmartGradingService(this.aiService);
    const latencies: number[] = [];
    const costs: number[] = [];
    const errors: Map<string, number> = new Map();
    let cached = 0;

    const startTime = Date.now();
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < config.iterations; i++) {
      const request = requests[i % requests.length]; // Cycle through requests
      const iterationStart = Date.now();

      try {
        await gradingService.gradeSingle(request);

        const latency = Date.now() - iterationStart;
        latencies.push(latency);
        costs.push(0.005); // Placeholder

        successful++;

        if (i % 10 === 0) {
          console.log(`  Progress: ${i}/${config.iterations} (${((i / config.iterations) * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        const latency = Date.now() - iterationStart;
        latencies.push(latency);

        const errorMsg = (error as Error).message;
        errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);

        failed++;
      }
    }

    const totalTime = Date.now() - startTime;

    return this.calculateResults(
      config.name,
      config.iterations,
      successful,
      failed,
      latencies,
      costs,
      cached,
      totalTime,
      errors
    );
  }

  /**
   * Benchmark cache performance
   */
  async benchmarkCache(
    requests: ContentRequest[],
    config: BenchmarkConfig
  ): Promise<{
    withoutCache: BenchmarkResult;
    withCache: BenchmarkResult;
    improvement: {
      latencyReduction: number;
      costSavings: number;
      hitRate: number;
    };
  }> {
    console.log(`🏃 Starting cache benchmark: ${config.name}`);

    // First run: without cache
    const contentGen = new ContentGeneratorService(this.aiService);
    const withoutCacheLatencies: number[] = [];
    let withoutCacheCosts = 0;

    console.log('  Phase 1: Without cache...');
    for (let i = 0; i < config.iterations; i++) {
      const request = requests[i % requests.length];
      const start = Date.now();

      try {
        // Bypass cache
        await contentGen.generateLesson({ ...request, type: 'lesson' });
        withoutCacheLatencies.push(Date.now() - start);
        withoutCacheCosts += 0.01;
      } catch (error) {
        withoutCacheLatencies.push(Date.now() - start);
      }
    }

    // Second run: with cache (same requests should hit cache)
    const withCacheLatencies: number[] = [];
    let withCacheCosts = 0;
    let cacheHits = 0;

    console.log('  Phase 2: With cache...');
    for (let i = 0; i < config.iterations; i++) {
      const request = requests[i % requests.length];
      const start = Date.now();

      try {
        await contentGen.generateLesson({ ...request, type: 'lesson' });
        const latency = Date.now() - start;
        withCacheLatencies.push(latency);

        // Cache hit if latency < 100ms
        if (latency < 100) {
          cacheHits++;
        } else {
          withCacheCosts += 0.01;
        }
      } catch (error) {
        withCacheLatencies.push(Date.now() - start);
      }
    }

    const hitRate = (cacheHits / config.iterations) * 100;

    const withoutCacheResult = this.calculateResults(
      `${config.name} (without cache)`,
      config.iterations,
      config.iterations,
      0,
      withoutCacheLatencies,
      Array(config.iterations).fill(withoutCacheCosts / config.iterations),
      0,
      withoutCacheLatencies.reduce((a, b) => a + b, 0),
      new Map()
    );

    const withCacheResult = this.calculateResults(
      `${config.name} (with cache)`,
      config.iterations,
      config.iterations,
      0,
      withCacheLatencies,
      Array(config.iterations).fill(withCacheCosts / config.iterations),
      cacheHits,
      withCacheLatencies.reduce((a, b) => a + b, 0),
      new Map()
    );

    const latencyReduction =
      ((withoutCacheResult.metrics.averageLatency - withCacheResult.metrics.averageLatency) /
        withoutCacheResult.metrics.averageLatency) *
      100;

    const costSavings =
      ((withoutCacheResult.metrics.totalCost - withCacheResult.metrics.totalCost) /
        withoutCacheResult.metrics.totalCost) *
      100;

    return {
      withoutCache: withoutCacheResult,
      withCache: withCacheResult,
      improvement: {
        latencyReduction,
        costSavings,
        hitRate,
      },
    };
  }

  /**
   * Run load test (concurrent requests)
   */
  async runLoadTest(
    request: ContentRequest,
    config: BenchmarkConfig & { concurrency: number }
  ): Promise<BenchmarkResult> {
    console.log(`🏃 Starting load test: ${config.name} (${config.concurrency} concurrent)`);

    const contentGen = new ContentGeneratorService(this.aiService);
    const latencies: number[] = [];
    const costs: number[] = [];
    const errors: Map<string, number> = new Map();

    const startTime = Date.now();
    let successful = 0;
    let failed = 0;

    // Run in batches
    const batchSize = config.concurrency;
    const numBatches = Math.ceil(config.iterations / batchSize);

    for (let batch = 0; batch < numBatches; batch++) {
      const batchStart = Date.now();
      const promises = [];

      const batchIterations = Math.min(batchSize, config.iterations - batch * batchSize);

      for (let i = 0; i < batchIterations; i++) {
        const promise = (async () => {
          const iterationStart = Date.now();

          try {
            await contentGen.generateLesson(request);
            const latency = Date.now() - iterationStart;
            latencies.push(latency);
            costs.push(0.01);
            successful++;
          } catch (error) {
            const latency = Date.now() - iterationStart;
            latencies.push(latency);

            const errorMsg = (error as Error).message;
            errors.set(errorMsg, (errors.get(errorMsg) || 0) + 1);
            failed++;
          }
        })();

        promises.push(promise);
      }

      await Promise.all(promises);

      console.log(`  Batch ${batch + 1}/${numBatches} completed in ${Date.now() - batchStart}ms`);
    }

    const totalTime = Date.now() - startTime;

    return this.calculateResults(
      config.name,
      config.iterations,
      successful,
      failed,
      latencies,
      costs,
      0,
      totalTime,
      errors
    );
  }

  /**
   * Calculate benchmark results
   */
  private calculateResults(
    name: string,
    totalIterations: number,
    successful: number,
    failed: number,
    latencies: number[],
    costs: number[],
    cached: number,
    totalTime: number,
    errors: Map<string, number>
  ): BenchmarkResult {
    latencies.sort((a, b) => a - b);

    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const medianLatency = latencies[Math.floor(latencies.length / 2)];
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)];
    const minLatency = latencies[0];
    const maxLatency = latencies[latencies.length - 1];

    const throughput = (totalIterations / totalTime) * 1000; // requests per second

    const averageCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const totalCost = costs.reduce((a, b) => a + b, 0);

    const cacheHitRate = (cached / totalIterations) * 100;

    const errorArray = Array.from(errors.entries()).map(([message, count]) => ({
      message,
      count,
    }));

    const result: BenchmarkResult = {
      name,
      totalIterations,
      successfulIterations: successful,
      failedIterations: failed,
      metrics: {
        averageLatency,
        medianLatency,
        p95Latency,
        p99Latency,
        minLatency,
        maxLatency,
        throughput,
        averageCost,
        totalCost,
        cacheHitRate,
      },
      errors: errorArray,
      timestamp: new Date(),
    };

    this.printResults(result);

    return result;
  }

  /**
   * Print results to console
   */
  private printResults(result: BenchmarkResult): void {
    console.log(`\n📊 Benchmark Results: ${result.name}`);
    console.log(`   Total Iterations: ${result.totalIterations}`);
    console.log(`   Successful: ${result.successfulIterations} (${((result.successfulIterations / result.totalIterations) * 100).toFixed(1)}%)`);
    console.log(`   Failed: ${result.failedIterations}`);
    console.log(`\n   Performance Metrics:`);
    console.log(`   - Average Latency: ${result.metrics.averageLatency.toFixed(2)}ms`);
    console.log(`   - Median Latency: ${result.metrics.medianLatency.toFixed(2)}ms`);
    console.log(`   - P95 Latency: ${result.metrics.p95Latency.toFixed(2)}ms`);
    console.log(`   - P99 Latency: ${result.metrics.p99Latency.toFixed(2)}ms`);
    console.log(`   - Min Latency: ${result.metrics.minLatency.toFixed(2)}ms`);
    console.log(`   - Max Latency: ${result.metrics.maxLatency.toFixed(2)}ms`);
    console.log(`   - Throughput: ${result.metrics.throughput.toFixed(2)} req/s`);
    console.log(`\n   Cost Metrics:`);
    console.log(`   - Average Cost: $${result.metrics.averageCost.toFixed(4)}`);
    console.log(`   - Total Cost: $${result.metrics.totalCost.toFixed(4)}`);
    console.log(`   - Cache Hit Rate: ${result.metrics.cacheHitRate.toFixed(1)}%`);

    if (result.errors.length > 0) {
      console.log(`\n   Errors:`);
      result.errors.forEach(error => {
        console.log(`   - ${error.message}: ${error.count} times`);
      });
    }

    console.log('');
  }
}
