/**
 * AI Service Orchestrator
 * Main service that coordinates AI providers, caching, and rate limiting
 */

import { AIProvider, AIMessage, AICompletionOptions, AICompletionResponse } from './providers/base-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { OllamaProvider } from './providers/ollama-provider';
import { AICacheManager, createAICacheManager } from './cache/ai-cache-manager';
import { AIRateLimiter, createAIRateLimiter } from './rate-limiter';

export interface AIServiceConfig {
  preferredProvider?: 'openai' | 'gemini' | 'ollama' | 'auto';
  fallbackEnabled?: boolean;
  cacheEnabled?: boolean;
  rateLimitEnabled?: boolean;
}

export interface AIRequest {
  messages: AIMessage[];
  options?: AICompletionOptions;
  userId?: string;
  bypassCache?: boolean;
}

export interface AIResponse extends AICompletionResponse {
  provider: string;
  cached: boolean;
  cost: number;
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

export class AIServiceOrchestrator {
  private providers: Map<string, AIProvider> = new Map();
  private cacheManager: AICacheManager;
  private rateLimiter: AIRateLimiter;
  private config: Required<AIServiceConfig>;

  constructor(config?: AIServiceConfig) {
    this.config = {
      preferredProvider: config?.preferredProvider || 'auto',
      fallbackEnabled: config?.fallbackEnabled ?? true,
      cacheEnabled: config?.cacheEnabled ?? true,
      rateLimitEnabled: config?.rateLimitEnabled ?? true,
    };

    // Initialize providers
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('ollama', new OllamaProvider());

    // Initialize cache and rate limiter
    this.cacheManager = createAICacheManager();
    this.rateLimiter = createAIRateLimiter();
  }

  /**
   * Initialize the service with Redis
   */
  async initialize(redisClient: any) {
    await this.cacheManager.initialize(redisClient);
    await this.rateLimiter.initialize(redisClient);
    console.log('✅ AI Service Orchestrator initialized');
  }

  /**
   * Generate AI completion
   */
  async complete(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    // Check rate limits
    if (this.config.rateLimitEnabled && request.userId) {
      const limitStatus = await this.rateLimiter.checkLimit(request.userId);

      if (!limitStatus.allowed) {
        throw new Error(
          `Rate limit exceeded. Resets at ${limitStatus.resetAt.minute.toISOString()}`
        );
      }
    }

    // Try cache first
    if (this.config.cacheEnabled && !request.bypassCache) {
      const cachedResponse = await this.tryCache(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // Select provider
    const provider = await this.selectProvider();

    try {
      // Make AI request
      const response = await provider.complete(request.messages, request.options);

      // Calculate cost
      const cost = provider.estimateCost(
        response.usage.promptTokens,
        response.usage.completionTokens
      );

      // Update rate limiter
      if (this.config.rateLimitEnabled && request.userId) {
        await this.rateLimiter.incrementUsage(request.userId, cost);
      }

      // Cache the response
      if (this.config.cacheEnabled && !request.bypassCache) {
        const promptText = request.messages.map(m => m.content).join('\n');
        const model = request.options?.model || provider.getDefaultModel();
        const temperature = request.options?.temperature || 0.7;

        await this.cacheManager.set(promptText, model, temperature, response, cost);
      }

      // Log metrics
      this.logMetrics({
        provider: provider.name,
        cached: false,
        cost,
        duration: Date.now() - startTime,
        tokens: response.usage.totalTokens,
      });

      return {
        ...response,
        provider: provider.name,
        cached: false,
        cost,
      };

    } catch (error) {
      console.error(`❌ ${provider.name} error:`, error);

      // Try fallback provider
      if (this.config.fallbackEnabled) {
        return this.tryFallback(request, provider.name);
      }

      throw error;
    }
  }

  /**
   * Try to get response from cache
   */
  private async tryCache(request: AIRequest): Promise<AIResponse | null> {
    const promptText = request.messages.map(m => m.content).join('\n');
    const model = request.options?.model || 'default';
    const temperature = request.options?.temperature || 0.7;

    const cached = await this.cacheManager.get(promptText, model, temperature);

    if (cached) {
      this.cacheManager.addCostSaving(cached.cost);

      console.log(`✅ Cache HIT - Saved $${cached.cost.toFixed(4)}`);

      return {
        ...cached.response,
        provider: 'cache',
        cached: true,
        cost: 0, // No cost for cached responses
      };
    }

    return null;
  }

  /**
   * Select the best available provider
   */
  private async selectProvider(): Promise<AIProvider> {
    if (this.config.preferredProvider !== 'auto') {
      const provider = this.providers.get(this.config.preferredProvider);
      if (provider && await provider.isAvailable()) {
        return provider;
      }
    }

    // Auto-select: try providers in order of preference
    // Priority: Ollama (free, local) > OpenAI > Gemini
    const providerOrder = ['ollama', 'openai', 'gemini'];

    for (const name of providerOrder) {
      const provider = this.providers.get(name);
      if (provider && await provider.isAvailable()) {
        console.log(`🤖 Auto-selected provider: ${name}`);
        return provider;
      }
    }

    throw new Error('No AI providers available');
  }

  /**
   * Try fallback provider
   */
  private async tryFallback(request: AIRequest, failedProvider: string): Promise<AIResponse> {
    console.log(`🔄 Trying fallback provider after ${failedProvider} failed...`);

    const fallbackProviders = Array.from(this.providers.values())
      .filter(p => p.name !== failedProvider);

    for (const provider of fallbackProviders) {
      if (await provider.isAvailable()) {
        try {
          const response = await provider.complete(request.messages, request.options);
          const cost = provider.estimateCost(
            response.usage.promptTokens,
            response.usage.completionTokens
          );

          console.log(`✅ Fallback successful with ${provider.name}`);

          return {
            ...response,
            provider: provider.name,
            cached: false,
            cost,
          };
        } catch (error) {
          console.error(`❌ Fallback ${provider.name} also failed:`, error);
        }
      }
    }

    throw new Error('All AI providers failed');
  }

  /**
   * Get service statistics
   */
  async getStats() {
    const cacheStats = this.cacheManager.getStats();

    return {
      cache: cacheStats,
      providers: Array.from(this.providers.entries()).map(([name, provider]) => ({
        name,
        available: provider.isAvailable(),
      })),
    };
  }

  /**
   * Log metrics for monitoring
   */
  private logMetrics(metrics: {
    provider: string;
    cached: boolean;
    cost: number;
    duration: number;
    tokens: number;
  }) {
    console.log(`📊 AI Metrics:`, {
      provider: metrics.provider,
      cached: metrics.cached,
      cost: `$${metrics.cost.toFixed(4)}`,
      duration: `${metrics.duration}ms`,
      tokens: metrics.tokens,
    });

    // TODO: Send to monitoring service (Prometheus, CloudWatch, etc.)
  }

  /**
   * Health check
   */
  async healthCheck() {
    const providers = await Promise.all(
      Array.from(this.providers.entries()).map(async ([name, provider]) => ({
        name,
        available: await provider.isAvailable(),
      }))
    );

    return {
      status: providers.some(p => p.available) ? 'healthy' : 'unhealthy',
      providers,
      cache: this.config.cacheEnabled,
      rateLimit: this.config.rateLimitEnabled,
    };
  }
}

/**
 * Create singleton instance
 */
let instance: AIServiceOrchestrator | null = null;

export function getAIService(config?: AIServiceConfig): AIServiceOrchestrator {
  if (!instance) {
    instance = new AIServiceOrchestrator(config);
  }
  return instance;
}
