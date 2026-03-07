/**
 * OpenAI Provider Implementation
 * Supports GPT-4, GPT-3.5-Turbo, and other OpenAI models
 */

import {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse
} from './base-provider';

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor(apiKey?: string, baseURL?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseURL = baseURL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options?.model || this.getDefaultModel();

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
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
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    return {
      id: data.id,
      content: data.choices[0].message.content,
      model: data.model,
      finishReason: data.choices[0].finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      metadata: {
        created: data.created,
        systemFingerprint: data.system_fingerprint,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    // Relax validation for Ollama/Localhost or if key is explicitly 'ollama'
    if (this.apiKey === 'ollama' || this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1')) {
      return true;
    }

    if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return process.env.OPENAI_DEFAULT_MODEL || 'gpt-4-turbo-preview';
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    const model = this.getDefaultModel();

    // Pricing per 1M tokens (as of 2025)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4-turbo-preview': { prompt: 10, completion: 30 },
      'gpt-4': { prompt: 30, completion: 60 },
      'gpt-3.5-turbo': { prompt: 0.5, completion: 1.5 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4-turbo-preview'];

    const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt;
    const completionCost = (completionTokens / 1_000_000) * modelPricing.completion;

    return promptCost + completionCost;
  }
}
