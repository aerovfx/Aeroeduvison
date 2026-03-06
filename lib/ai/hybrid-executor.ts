/**
 * Hybrid AI Executor - Multi-Model Orchestration
 * 
 * Features:
 * - Combine multiple models for one task
 * - Pipeline execution (model A → model B → model C)
 * - Parallel execution & aggregation
 * - Best-of-N selection
 */

import { TaskType } from './model-selector';

export interface HybridStrategy {
  name: string;
  description: string;
  models: string[];
  executionMode: 'pipeline' | 'parallel' | 'best-of-n';
  aggregationMethod?: 'vote' | 'average' | 'first' | 'best';
  costMultiplier: number;
}

export interface HybridExecutionResult {
  finalOutput: any;
  intermediateResults: Array<{
    model: string;
    output: any;
    latency: number;
    cost: number;
  }>;
  totalCost: number;
  totalLatency: number;
  strategy: string;
  reasoning: string;
}

export class HybridAIExecutor {
  private strategies: Map<TaskType, HybridStrategy>;

  constructor() {
    this.strategies = this.initializeStrategies();
  }

  /**
   * Initialize hybrid strategies for different task types
   */
  private initializeStrategies(): Map<TaskType, HybridStrategy> {
    const strategies = new Map<TaskType, HybridStrategy>();

    // Essay Grading: Gemini analyzes → Claude writes feedback
    strategies.set(TaskType.ESSAY_GRADING, {
      name: 'Gemini-Claude Pipeline',
      description: 'Gemini phân tích bài văn, Claude viết feedback chi tiết',
      models: ['gemini-2.5-pro', 'claude-3.5-sonnet'],
      executionMode: 'pipeline',
      costMultiplier: 1.5,
    });

    // Quiz Generation: Multiple models → vote for best questions
    strategies.set(TaskType.QUIZ_GENERATION, {
      name: 'Multi-Model Quiz Generation',
      description: 'Nhiều models tạo câu hỏi, chọn câu tốt nhất',
      models: ['grok-beta', 'claude-3.5-sonnet', 'gpt-3.5-turbo'],
      executionMode: 'parallel',
      aggregationMethod: 'best',
      costMultiplier: 2.0,
    });

    // Content Generation: GPT-4 + Claude → merge best parts
    strategies.set(TaskType.CONTENT_GENERATION, {
      name: 'Dual-Model Content',
      description: 'GPT-5 và Claude tạo nội dung, merge phần tốt nhất',
      models: ['gpt-5', 'claude-3.5-sonnet'],
      executionMode: 'parallel',
      aggregationMethod: 'best',
      costMultiplier: 1.8,
    });

    // Math Solving: Best-of-3 for accuracy
    strategies.set(TaskType.MATH_SOLVING, {
      name: 'Best-of-3 Math',
      description: '3 models giải toán, chọn kết quả phổ biến nhất',
      models: ['gpt-5', 'claude-3.5-sonnet', 'grok-beta'],
      executionMode: 'best-of-n',
      aggregationMethod: 'vote',
      costMultiplier: 2.5,
    });

    return strategies;
  }

  /**
   * Execute hybrid strategy
   */
  async executeHybrid(
    taskType: TaskType,
    prompt: string,
    generateFn: (model: string, prompt: string) => Promise<any>
  ): Promise<HybridExecutionResult> {
    const strategy = this.strategies.get(taskType);

    if (!strategy) {
      throw new Error(`No hybrid strategy defined for ${taskType}`);
    }

    console.log(`🔀 Executing hybrid strategy: ${strategy.name}`);

    const intermediateResults: Array<{
      model: string;
      output: any;
      latency: number;
      cost: number;
    }> = [];

    let finalOutput: any;
    let totalLatency = 0;

    if (strategy.executionMode === 'pipeline') {
      // Pipeline: model1 → model2 → model3
      finalOutput = await this.executePipeline(
        strategy.models,
        prompt,
        generateFn,
        intermediateResults
      );
    } else if (strategy.executionMode === 'parallel') {
      // Parallel: all models run simultaneously
      finalOutput = await this.executeParallel(
        strategy.models,
        prompt,
        generateFn,
        strategy.aggregationMethod!,
        intermediateResults
      );
    } else if (strategy.executionMode === 'best-of-n') {
      // Best-of-N: run all, pick best
      finalOutput = await this.executeBestOfN(
        strategy.models,
        prompt,
        generateFn,
        strategy.aggregationMethod!,
        intermediateResults
      );
    }

    totalLatency = intermediateResults.reduce((sum, r) => sum + r.latency, 0);
    const totalCost = intermediateResults.reduce((sum, r) => sum + r.cost, 0);

    return {
      finalOutput,
      intermediateResults,
      totalCost,
      totalLatency,
      strategy: strategy.name,
      reasoning: this.generateHybridReasoning(strategy, intermediateResults),
    };
  }

  /**
   * Execute pipeline strategy
   */
  private async executePipeline(
    models: string[],
    initialPrompt: string,
    generateFn: (model: string, prompt: string) => Promise<any>,
    results: any[]
  ): Promise<any> {
    let currentPrompt = initialPrompt;
    let output: any;

    for (const model of models) {
      const startTime = Date.now();

      try {
        output = await generateFn(model, currentPrompt);
        const latency = Date.now() - startTime;

        results.push({
          model,
          output,
          latency,
          cost: 0.01, // Estimate
        });

        // Use output as input for next model
        currentPrompt = this.prepareNextPrompt(output, model);

        console.log(`✅ Pipeline step: ${model} completed in ${latency}ms`);
      } catch (error) {
        console.error(`❌ Pipeline step failed: ${model}`, error);
        throw error;
      }
    }

    return output;
  }

  /**
   * Execute parallel strategy
   */
  private async executeParallel(
    models: string[],
    prompt: string,
    generateFn: (model: string, prompt: string) => Promise<any>,
    aggregationMethod: string,
    results: any[]
  ): Promise<any> {
    const promises = models.map(async (model) => {
      const startTime = Date.now();

      try {
        const output = await generateFn(model, prompt);
        const latency = Date.now() - startTime;

        return {
          model,
          output,
          latency,
          cost: 0.01, // Estimate
        };
      } catch (error) {
        console.error(`❌ Parallel execution failed for ${model}:`, error);
        return null;
      }
    });

    const allResults = await Promise.all(promises);
    const validResults = allResults.filter((r) => r !== null) as any[];

    results.push(...validResults);

    // Aggregate results
    return this.aggregateResults(validResults, aggregationMethod);
  }

  /**
   * Execute best-of-N strategy
   */
  private async executeBestOfN(
    models: string[],
    prompt: string,
    generateFn: (model: string, prompt: string) => Promise<any>,
    aggregationMethod: string,
    results: any[]
  ): Promise<any> {
    // Same as parallel for now
    return this.executeParallel(
      models,
      prompt,
      generateFn,
      aggregationMethod,
      results
    );
  }

  /**
   * Prepare prompt for next model in pipeline
   */
  private prepareNextPrompt(previousOutput: any, previousModel: string): string {
    if (typeof previousOutput === 'string') {
      return previousOutput;
    }

    if (previousOutput && previousOutput.content) {
      return previousOutput.content;
    }

    return JSON.stringify(previousOutput);
  }

  /**
   * Aggregate results from multiple models
   */
  private aggregateResults(results: any[], method: string): any {
    if (results.length === 0) {
      throw new Error('No valid results to aggregate');
    }

    if (method === 'first') {
      return results[0].output;
    }

    if (method === 'best') {
      // Select result with longest/most detailed content
      const best = results.reduce((prev, current) => {
        const prevLength = JSON.stringify(prev.output).length;
        const currentLength = JSON.stringify(current.output).length;
        return currentLength > prevLength ? current : prev;
      });

      console.log(`🏆 Selected best result from ${best.model}`);
      return best.output;
    }

    if (method === 'vote') {
      // Voting: most common result wins
      const outputStrings = results.map((r) => JSON.stringify(r.output));
      const counts = new Map<string, number>();

      for (const output of outputStrings) {
        counts.set(output, (counts.get(output) || 0) + 1);
      }

      let maxCount = 0;
      let winner = '';

      for (const [output, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          winner = output;
        }
      }

      console.log(`🗳️  Voting result: ${maxCount}/${results.length} models agreed`);
      return JSON.parse(winner);
    }

    if (method === 'average') {
      // Merge/combine outputs (for numeric or structured data)
      return this.mergeOutputs(results.map((r) => r.output));
    }

    // Default: return first
    return results[0].output;
  }

  /**
   * Merge outputs from multiple models
   */
  private mergeOutputs(outputs: any[]): any {
    // Simple merge strategy - can be improved
    if (outputs.length === 1) return outputs[0];

    // If all outputs are objects with same structure, merge them
    if (outputs.every((o) => typeof o === 'object' && o !== null)) {
      const merged: any = {};
      const allKeys = new Set<string>();

      outputs.forEach((o) => {
        Object.keys(o).forEach((k) => allKeys.add(k));
      });

      for (const key of allKeys) {
        const values = outputs.map((o) => o[key]).filter((v) => v !== undefined);

        if (values.length > 0) {
          // Use most common value or first value
          merged[key] = values[0];
        }
      }

      return merged;
    }

    // For strings, concatenate or pick longest
    if (outputs.every((o) => typeof o === 'string')) {
      return outputs.reduce((prev, current) =>
        current.length > prev.length ? current : prev
      );
    }

    return outputs[0];
  }

  /**
   * Generate reasoning for hybrid execution
   */
  private generateHybridReasoning(
    strategy: HybridStrategy,
    results: any[]
  ): string {
    const models = results.map((r) => r.model).join(', ');
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const avgLatency =
      results.reduce((sum, r) => sum + r.latency, 0) / results.length;

    return `Sử dụng ${strategy.name}: ${models}. Tổng chi phí $${totalCost.toFixed(4)}, thời gian TB ${avgLatency.toFixed(0)}ms. ${strategy.description}`;
  }

  /**
   * Get strategy for task type
   */
  getStrategy(taskType: TaskType): HybridStrategy | null {
    return this.strategies.get(taskType) || null;
  }

  /**
   * Check if hybrid should be used
   */
  shouldUseHybrid(taskType: TaskType, priority: string[]): boolean {
    const strategy = this.strategies.get(taskType);

    if (!strategy) return false;

    // Don't use hybrid if cost is top priority
    if (priority[0] === 'cost') {
      return false;
    }

    // Use hybrid if quality is top priority
    if (priority[0] === 'quality') {
      return true;
    }

    return false;
  }
}

// Export singleton instance
export const hybridExecutor = new HybridAIExecutor();

