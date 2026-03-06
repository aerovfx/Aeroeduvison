/**
 * Ollama Provider Implementation
 * Supports local LLM models via Ollama
 */

import {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse
} from './base-provider';

export class OllamaProvider implements AIProvider {
  name = 'Ollama';
  private baseURL: string;
  private defaultModel: string;

  constructor(config?: { baseURL?: string; model?: string }) {
    this.baseURL = config?.baseURL || process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
    this.defaultModel = config?.model || process.env.OPENAI_MODEL || 'nemotron-orchestrator';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    const model = options?.model || this.defaultModel;

    console.log(`🏠 [Ollama] Using model: ${model} at ${this.baseURL}`);

    try {
      // Ollama supports OpenAI-compatible API
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4000,
          top_p: options?.topP ?? 1,
          frequency_penalty: options?.frequencyPenalty ?? 0,
          presence_penalty: options?.presencePenalty ?? 0,
          stop: options?.stop,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Ollama] API error: ${response.status} - ${errorText}`);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Check if response has expected structure
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Ollama API returned no choices');
      }

      const choice = data.choices[0];
      const content = choice.message?.content || '';

      // Estimate token usage (Ollama might not provide accurate counts)
      const promptTokens = data.usage?.prompt_tokens || this.estimateTokens(
        messages.map(m => m.content).join(' ')
      );
      const completionTokens = data.usage?.completion_tokens || this.estimateTokens(content);

      console.log(`✅ [Ollama] Response received: ${content.length} chars, ${completionTokens} tokens`);

      return {
        id: data.id || `ollama-${Date.now()}`,
        content,
        model: data.model || model,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        metadata: {
          created: data.created || Date.now(),
          provider: 'ollama',
          baseURL: this.baseURL,
        },
      };
    } catch (error) {
      console.error(`❌ [Ollama] Error:`, error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if Ollama server is running
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`⚠️  [Ollama] Server not responding: ${response.status}`);
        return false;
      }

      const data = await response.json();
      console.log(`✅ [Ollama] Server available with ${data.data?.length || 0} models`);

      return true;
    } catch (error) {
      console.warn(`⚠️  [Ollama] Not available:`, (error as Error).message);
      return false;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    // Ollama is free (local), so cost is $0
    return 0;
  }

  /**
   * List available Ollama models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/models`);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error(`❌ [Ollama] Failed to list models:`, error);
      return [];
    }
  }

  /**
   * Check if specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.includes(modelName);
  }

  /**
   * Map finish reason to standard format
   */
  private mapFinishReason(reason: string | undefined): AICompletionResponse['finishReason'] {
    const mapping: Record<string, AICompletionResponse['finishReason']> = {
      'stop': 'stop',
      'length': 'length',
      'content_filter': 'content_filter',
      'tool_calls': 'tool_calls',
    };

    return mapping[reason || 'stop'] || 'stop';
  }

  /**
   * Estimate tokens (approximate: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get server info
   */
  async getServerInfo(): Promise<{
    version?: string;
    models: string[];
    status: 'online' | 'offline';
  }> {
    try {
      const isOnline = await this.isAvailable();

      if (!isOnline) {
        return {
          models: [],
          status: 'offline',
        };
      }

      const models = await this.listModels();

      return {
        models,
        status: 'online',
      };
    } catch (error) {
      return {
        models: [],
        status: 'offline',
      };
    }
  }
}
