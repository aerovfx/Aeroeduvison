/**
 * AI Model Selector - Intelligent Model Selection System
 * 
 * Tự động lựa chọn model AI tối ưu dựa trên:
 * - Task type (lesson, quiz, essay grading, etc.)
 * - Priorities (cost, quality, speed, privacy, reliability)
 * - Context (input length, budget, privacy requirements)
 * - Model capabilities (strengths, weaknesses, performance)
 */

export enum TaskType {
  CHAT_SUPPORT = 'chat_support',
  CONTENT_GENERATION = 'content_generation',
  CODE_TEACHING = 'code_teaching',
  MATH_SOLVING = 'math_solving',
  ESSAY_GRADING = 'essay_grading',
  TRANSLATION = 'translation',
  QUIZ_GENERATION = 'quiz_generation',
  EXPLANATION = 'explanation',
  CREATIVE_WRITING = 'creative_writing',
  DATA_ANALYSIS = 'data_analysis',
  LESSON_PLANNING = 'lesson_planning',
  SLIDES_GENERATION = 'slides_generation',
}

export enum Priority {
  COST = 'cost',
  QUALITY = 'quality',
  SPEED = 'speed',
  PRIVACY = 'privacy',
  RELIABILITY = 'reliability',
}

export interface ModelCapability {
  name: string;
  provider: string;
  apiKey: string; // Environment variable name
  costPer1kTokens: number; // USD
  avgResponseTime: number; // seconds
  qualityScore: number; // 0-10
  contextWindow: number; // tokens
  supportsVietnamese: boolean;
  privacyLevel: number; // 1-5 (5 = highest)
  reliabilityScore: number; // 0-10
  strengths: TaskType[];
  weaknesses: TaskType[];
  requiresInternet: boolean;
  maxTokensOutput: number;
  endpoint: string;
}

export interface TaskContext {
  taskType: TaskType;
  priority: Priority[];
  inputLength: number; // tokens
  expectedOutputLength: number; // tokens
  requiresVietnamese: boolean;
  requiresRealtime: boolean;
  budgetConstraint?: number; // USD
  privacyRequired: boolean;
  studentAgeGroup: 'primary' | 'secondary' | 'university';
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ModelSelectionResult {
  selectedModel: string;
  provider: string;
  apiKey: string;
  endpoint: string;
  score: number;
  estimatedCost: number;
  estimatedTime: number;
  reasoning: string;
  alternatives: Array<{
    model: string;
    score: number;
    cost: number;
  }>;
  cacheKey?: string;
  useCache: boolean;
}

export class AIModelSelector {
  private models: ModelCapability[];
  private usageStats: Map<string, any>;
  private cache: Map<string, any>;

  constructor() {
    this.models = this.initializeModels();
    this.usageStats = new Map();
    this.cache = new Map();
  }

  private initializeModels(): ModelCapability[] {
    return [
      {
        name: 'nemotron-orchestrator',
        provider: 'OpenAI', // Using OpenAI provider structure for Ollama
        apiKey: 'OPENAI_API_KEY',
        costPer1kTokens: 0.0,
        avgResponseTime: 5.0,
        qualityScore: 8.5,
        contextWindow: 32768,
        supportsVietnamese: true,
        privacyLevel: 5,
        reliabilityScore: 8.0,
        strengths: [
          TaskType.CHAT_SUPPORT,
          TaskType.CONTENT_GENERATION,
          TaskType.EXPLANATION,
          TaskType.LESSON_PLANNING,
          TaskType.CODE_TEACHING
        ],
        weaknesses: [],
        requiresInternet: false,
        maxTokensOutput: 4096,
        endpoint: process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1/chat/completions',
      },
      {
        name: 'grok-beta',
        provider: 'X.AI',
        apiKey: 'GROK_API_KEY',
        costPer1kTokens: 0.002,
        avgResponseTime: 2.8,
        qualityScore: 8.5,
        contextWindow: 32768,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 8.5,
        strengths: [
          TaskType.CHAT_SUPPORT,
          TaskType.DATA_ANALYSIS,
          TaskType.CONTENT_GENERATION,
        ],
        weaknesses: [TaskType.TRANSLATION],
        requiresInternet: true,
        maxTokensOutput: 4096,
        endpoint: 'https://api.x.ai/v1/chat/completions',
      },
      {
        name: 'claude-3.5-sonnet',
        provider: 'OpenRouter',
        apiKey: 'OPENROUTER_API_KEY',
        costPer1kTokens: 0.003,
        avgResponseTime: 2.5,
        qualityScore: 9.5,
        contextWindow: 200000,
        supportsVietnamese: true,
        privacyLevel: 4,
        reliabilityScore: 9.5,
        strengths: [
          TaskType.ESSAY_GRADING,
          TaskType.EXPLANATION,
          TaskType.CREATIVE_WRITING,
          TaskType.CODE_TEACHING,
          TaskType.CONTENT_GENERATION,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 4096,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      },
      {
        name: 'gpt-5',
        provider: 'OpenRouter',
        apiKey: 'OPENROUTER_API_KEY',
        costPer1kTokens: 0.030,
        avgResponseTime: 4.0,
        qualityScore: 9.8,
        contextWindow: 128000,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 9.0,
        strengths: [
          TaskType.EXPLANATION,
          TaskType.CONTENT_GENERATION,
          TaskType.ESSAY_GRADING,
          TaskType.MATH_SOLVING,
          TaskType.LESSON_PLANNING,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 4096,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      },
      {
        name: 'gemini-2.5-pro',
        provider: 'OpenRouter',
        apiKey: 'OPENROUTER_API_KEY',
        costPer1kTokens: 0.00125,
        avgResponseTime: 2.2,
        qualityScore: 9.0,
        contextWindow: 1000000,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 8.5,
        strengths: [
          TaskType.DATA_ANALYSIS,
          TaskType.CONTENT_GENERATION,
          TaskType.TRANSLATION,
          TaskType.LESSON_PLANNING,
        ],
        weaknesses: [TaskType.CODE_TEACHING],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      },
      {
        name: 'claude-sonnet-4-20250514',
        provider: 'Anthropic',
        apiKey: 'ANTHROPIC_API_KEY',
        costPer1kTokens: 0.003,
        avgResponseTime: 2.0,
        qualityScore: 9.7,
        contextWindow: 200000,
        supportsVietnamese: true,
        privacyLevel: 4,
        reliabilityScore: 9.5,
        strengths: [
          TaskType.ESSAY_GRADING,
          TaskType.EXPLANATION,
          TaskType.CREATIVE_WRITING,
          TaskType.CODE_TEACHING,
          TaskType.CONTENT_GENERATION,
          TaskType.LESSON_PLANNING,
          TaskType.MATH_SOLVING,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://api.anthropic.com/v1/messages',
      },
      {
        name: 'gpt-4-turbo',
        provider: 'OpenAI',
        apiKey: 'OPENAI_API_KEY',
        costPer1kTokens: 0.01,
        avgResponseTime: 3.5,
        qualityScore: 9.2,
        contextWindow: 128000,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 9.0,
        strengths: [
          TaskType.EXPLANATION,
          TaskType.CONTENT_GENERATION,
          TaskType.MATH_SOLVING,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 4096,
        endpoint: 'https://api.openai.com/v1/chat/completions',
      },
      {
        name: 'gpt-3.5-turbo',
        provider: 'OpenRouter',
        apiKey: 'OPENROUTER_API_KEY',
        costPer1kTokens: 0.0005,
        avgResponseTime: 1.2,
        qualityScore: 7.5,
        contextWindow: 16385,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 9.0,
        strengths: [TaskType.CHAT_SUPPORT, TaskType.QUIZ_GENERATION],
        weaknesses: [TaskType.CODE_TEACHING, TaskType.MATH_SOLVING],
        requiresInternet: true,
        maxTokensOutput: 4096,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      },
      {
        name: 'edu-assistant:latest',
        provider: 'Ollama',
        apiKey: 'OLLAMA_URL',
        costPer1kTokens: 0.0,
        avgResponseTime: 3.5,
        qualityScore: 9.0,
        contextWindow: 32768,
        supportsVietnamese: true,
        privacyLevel: 5,
        reliabilityScore: 9.0,
        strengths: [
          TaskType.ESSAY_GRADING,
          TaskType.EXPLANATION,
          TaskType.LESSON_PLANNING,
          TaskType.CONTENT_GENERATION
        ],
        weaknesses: [],
        requiresInternet: false,
        maxTokensOutput: 4096,
        endpoint: 'http://localhost:11434/v1/chat/completions',
      },
      {
        name: 'deepseek-coder:1.3b',
        provider: 'Ollama',
        apiKey: 'OLLAMA_URL',
        costPer1kTokens: 0.0,
        avgResponseTime: 1.5,
        qualityScore: 8.2,
        contextWindow: 16384,
        supportsVietnamese: true,
        privacyLevel: 5,
        reliabilityScore: 8.5,
        strengths: [
          TaskType.CODE_TEACHING,
          TaskType.CHAT_SUPPORT,
          TaskType.DATA_ANALYSIS
        ],
        weaknesses: [TaskType.CREATIVE_WRITING],
        requiresInternet: false,
        maxTokensOutput: 4096,
        endpoint: 'http://localhost:11434/v1/chat/completions',
      },
      {
        name: 'qwen3.5:0.8b',
        provider: 'Ollama',
        apiKey: 'OLLAMA_URL',
        costPer1kTokens: 0.0,
        avgResponseTime: 0.8,
        qualityScore: 7.5,
        contextWindow: 32768,
        supportsVietnamese: true,
        privacyLevel: 5,
        reliabilityScore: 8.0,
        strengths: [
          TaskType.TRANSLATION,
          TaskType.CHAT_SUPPORT,
          TaskType.QUIZ_GENERATION
        ],
        weaknesses: [TaskType.ESSAY_GRADING, TaskType.DATA_ANALYSIS],
        requiresInternet: false,
        maxTokensOutput: 2048,
        endpoint: 'http://localhost:11434/v1/chat/completions',
      },
      {
        name: 'llama-3.2',
        provider: 'Ollama',
        apiKey: 'OLLAMA_URL',
        costPer1kTokens: 0.0,
        avgResponseTime: 2.5,
        qualityScore: 8.0,
        contextWindow: 128000,
        supportsVietnamese: true,
        privacyLevel: 5,
        reliabilityScore: 8.5,
        strengths: [TaskType.CHAT_SUPPORT, TaskType.EXPLANATION],
        weaknesses: [],
        requiresInternet: false,
        maxTokensOutput: 4096,
        endpoint: 'http://localhost:11434/v1/chat/completions',
      },
      // ─── fal.ai any-llm models ────────────────────────────────────────
      // Mỗi model fal là pass-through tới provider gốc (Anthropic/Google/OpenAI)
      // nhưng dùng FAL_API_KEY duy nhất → đơn giản hoá billing & key management.
      {
        name: 'anthropic/claude-3.5-sonnet',
        provider: 'fal.ai',
        apiKey: 'FAL_API_KEY',
        costPer1kTokens: 0.003,
        avgResponseTime: 2.5,
        qualityScore: 9.5,
        contextWindow: 200000,
        supportsVietnamese: true,
        privacyLevel: 4,
        reliabilityScore: 9.3,
        strengths: [
          TaskType.ESSAY_GRADING,
          TaskType.EXPLANATION,
          TaskType.CREATIVE_WRITING,
          TaskType.CODE_TEACHING,
          TaskType.CONTENT_GENERATION,
          TaskType.LESSON_PLANNING,
          TaskType.QUIZ_GENERATION,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://queue.fal.run/fal-ai/any-llm',
      },
      {
        name: 'anthropic/claude-3.5-haiku',
        provider: 'fal.ai',
        apiKey: 'FAL_API_KEY',
        costPer1kTokens: 0.0008,
        avgResponseTime: 1.2,
        qualityScore: 8.5,
        contextWindow: 200000,
        supportsVietnamese: true,
        privacyLevel: 4,
        reliabilityScore: 9.0,
        strengths: [
          TaskType.CHAT_SUPPORT,
          TaskType.QUIZ_GENERATION,
          TaskType.TRANSLATION,
          TaskType.EXPLANATION,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://queue.fal.run/fal-ai/any-llm',
      },
      {
        name: 'google/gemini-flash-1.5',
        provider: 'fal.ai',
        apiKey: 'FAL_API_KEY',
        costPer1kTokens: 0.000075,
        avgResponseTime: 1.0,
        qualityScore: 8.2,
        contextWindow: 1_000_000,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 9.0,
        strengths: [
          TaskType.CHAT_SUPPORT,
          TaskType.QUIZ_GENERATION,
          TaskType.TRANSLATION,
          TaskType.DATA_ANALYSIS,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://queue.fal.run/fal-ai/any-llm/vision',
      },
      {
        name: 'openai/gpt-4o',
        provider: 'fal.ai',
        apiKey: 'FAL_API_KEY',
        costPer1kTokens: 0.0025,
        avgResponseTime: 2.8,
        qualityScore: 9.4,
        contextWindow: 128000,
        supportsVietnamese: true,
        privacyLevel: 3,
        reliabilityScore: 9.2,
        strengths: [
          TaskType.MATH_SOLVING,
          TaskType.EXPLANATION,
          TaskType.CONTENT_GENERATION,
          TaskType.CODE_TEACHING,
        ],
        weaknesses: [],
        requiresInternet: true,
        maxTokensOutput: 8192,
        endpoint: 'https://queue.fal.run/fal-ai/any-llm',
      },
    ];
  }

  /**
   * Calculate score for a model based on task context
   */
  calculateScore(model: ModelCapability, context: TaskContext): number {
    let score = 0;
    const weights = this.getWeights(context.priority);

    // 1. Quality Score
    let qualityScore = model.qualityScore;
    if (context.taskType && model.strengths.includes(context.taskType)) {
      qualityScore += 1.5;
    }
    if (context.taskType && model.weaknesses.includes(context.taskType)) {
      qualityScore -= 2.0;
    }
    score += qualityScore * weights[Priority.QUALITY];

    // 2. Cost Score (inverted - lower cost = higher score)
    let costScore = 10;
    if (model.costPer1kTokens === 0) {
      costScore = 10;
    } else {
      const totalTokens = context.inputLength + context.expectedOutputLength;
      const totalCost = (totalTokens / 1000) * model.costPer1kTokens;
      costScore = Math.max(0, 10 - totalCost * 100);
    }
    score += costScore * weights[Priority.COST];

    // 3. Speed Score (inverted)
    let speedScore = Math.max(0, 10 - model.avgResponseTime);
    if (context.requiresRealtime && model.avgResponseTime > 3) {
      speedScore -= 3;
    }
    score += speedScore * weights[Priority.SPEED];

    // 4. Privacy Score
    let privacyScore = model.privacyLevel * 2;
    if (context.privacyRequired && model.privacyLevel < 4) {
      privacyScore -= 5;
    }
    score += privacyScore * weights[Priority.PRIVACY];

    // 5. Reliability Score
    score += model.reliabilityScore * weights[Priority.RELIABILITY];

    // 6. Hard Constraints
    if (context.requiresVietnamese && !model.supportsVietnamese) {
      return -1000;
    }

    if (context.budgetConstraint) {
      const totalTokens = context.inputLength + context.expectedOutputLength;
      const totalCost = (totalTokens / 1000) * model.costPer1kTokens;
      if (totalCost > context.budgetConstraint) {
        return -1000;
      }
    }

    if (context.inputLength > model.contextWindow) {
      return -1000;
    }

    if (context.expectedOutputLength > model.maxTokensOutput) {
      return -1000;
    }

    return score;
  }

  /**
   * Get weights based on priority order
   */
  private getWeights(priorities: Priority[]): Record<Priority, number> {
    const weights: Record<Priority, number> = {
      [Priority.COST]: 0,
      [Priority.QUALITY]: 0,
      [Priority.SPEED]: 0,
      [Priority.PRIVACY]: 0,
      [Priority.RELIABILITY]: 0,
    };

    let totalWeight = 1.0;

    // Allocate weights based on priority order
    priorities.forEach((priority, i) => {
      const weight = totalWeight * Math.pow(0.5, i);
      weights[priority] = weight;
      totalWeight -= weight;
    });

    // Distribute remaining weight evenly
    const remainingPriorities = Object.keys(weights).filter(
      (p) => !priorities.includes(p as Priority)
    ) as Priority[];

    if (remainingPriorities.length > 0) {
      const remainingWeight = totalWeight / remainingPriorities.length;
      remainingPriorities.forEach((p) => {
        weights[p] = remainingWeight;
      });
    }

    return weights;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(context: TaskContext, prompt: string): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify({ context, prompt }))
      .digest('hex');
    return `ai_cache_${context.taskType}_${hash}`;
  }

  /**
   * Check if response is in cache
   */
  checkCache(cacheKey: string): any | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      // 24 hours
      console.log('✅ Cache hit:', cacheKey);
      return cached.data;
    }
    return null;
  }

  /**
   * Store response in cache
   */
  storeCache(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Select optimal model
   */
  async selectModel(
    context: TaskContext,
    prompt?: string
  ): Promise<ModelSelectionResult> {
    const scores: Array<{
      model: ModelCapability;
      score: number;
      estimatedCost: number;
      estimatedTime: number;
    }> = [];

    // Check if model API keys are available
    const availableModels = this.models.filter((model) => {
      const apiKey = process.env[model.apiKey];
      return apiKey && apiKey.length > 0;
    });

    if (availableModels.length === 0) {
      throw new Error('No AI models available - please configure API keys');
    }

    // Calculate scores for each model
    for (const model of availableModels) {
      const score = this.calculateScore(model, context);
      if (score > -1000) {
        const totalTokens = context.inputLength + context.expectedOutputLength;
        scores.push({
          model,
          score,
          estimatedCost: (totalTokens / 1000) * model.costPer1kTokens,
          estimatedTime: model.avgResponseTime,
        });
      }
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      throw new Error('No model meets the requirements');
    }

    const selected = scores[0];

    // Generate cache key if prompt provided
    const cacheKey = prompt ? this.generateCacheKey(context, prompt) : undefined;
    const useCache = !!cacheKey && this.checkCache(cacheKey) !== null;

    // Track usage
    this.trackUsage(selected.model.name, context);

    return {
      selectedModel: selected.model.name,
      provider: selected.model.provider,
      apiKey: selected.model.apiKey,
      endpoint: selected.model.endpoint,
      score: selected.score,
      estimatedCost: selected.estimatedCost,
      estimatedTime: selected.estimatedTime,
      reasoning: this.generateReasoning(selected.model, context),
      alternatives: scores.slice(1, 4).map((s) => ({
        model: s.model.name,
        score: s.score,
        cost: s.estimatedCost,
      })),
      cacheKey,
      useCache,
    };
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    model: ModelCapability,
    context: TaskContext
  ): string {
    const reasons: string[] = [];

    if (context.taskType && model.strengths.includes(context.taskType)) {
      reasons.push(`Xuất sắc trong ${context.taskType}`);
    }

    if (context.priority[0] === Priority.COST && model.costPer1kTokens < 0.005) {
      reasons.push('Chi phí thấp');
    }

    if (context.priority[0] === Priority.QUALITY && model.qualityScore >= 9) {
      reasons.push('Chất lượng cao');
    }

    if (context.priority[0] === Priority.PRIVACY && model.privacyLevel >= 4) {
      reasons.push('Bảo mật tốt');
    }

    if (context.requiresRealtime && model.avgResponseTime < 2) {
      reasons.push('Tốc độ phản hồi nhanh');
    }

    if (model.contextWindow > 100000) {
      reasons.push('Context window lớn');
    }

    return reasons.length > 0
      ? reasons.join('; ')
      : 'Cân bằng tốt giữa các yếu tố';
  }

  /**
   * Track usage statistics
   */
  private trackUsage(modelName: string, context: TaskContext): void {
    const key = `${modelName}_${context.taskType}`;
    const stats = this.usageStats.get(key) || {
      count: 0,
      totalCost: 0,
      totalTime: 0,
    };

    stats.count++;
    this.usageStats.set(key, stats);
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): Map<string, any> {
    return this.usageStats;
  }

  /**
   * Get fallback model if primary fails
   */
  async getFallbackModel(
    primaryModel: string,
    context: TaskContext
  ): Promise<ModelCapability | null> {
    const result = await this.selectModel(context);
    const alternatives = result.alternatives;

    // Find first alternative that's not the primary
    for (const alt of alternatives) {
      if (alt.model !== primaryModel) {
        const model = this.models.find((m) => m.name === alt.model);
        if (model) {
          console.log(`🔄 Fallback from ${primaryModel} to ${alt.model}`);
          return model;
        }
      }
    }

    return null;
  }

  /**
   * Estimate total cost for a task
   */
  estimateCost(
    modelName: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = this.models.find((m) => m.name === modelName);
    if (!model) return 0;

    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * model.costPer1kTokens;
  }
}

// Export singleton instance
export const modelSelector = new AIModelSelector();

