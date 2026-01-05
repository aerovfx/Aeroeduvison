/**
 * Google Gemini Provider Implementation
 * Supports Gemini Pro, Gemini Pro Vision, and other Google AI models
 */

import {
  AIProvider,
  AIMessage,
  AICompletionOptions,
  AICompletionResponse
} from './base-provider';

export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
  }

  async complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options?.model || this.getDefaultModel();

    // Convert messages to Gemini format
    const contents = this.convertMessagesToGeminiFormat(messages);

    const response = await fetch(
      `${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens ?? 4000,
            topP: options?.topP ?? 1,
            stopSequences: options?.stop,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = data.candidates[0];
    const content = candidate.content.parts[0].text;

    // Estimate token usage (Gemini doesn't provide exact counts)
    const promptTokens = this.estimateTokens(messages.map(m => m.content).join(' '));
    const completionTokens = this.estimateTokens(content);

    return {
      id: `gemini-${Date.now()}`,
      content,
      model,
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      metadata: {
        safetyRatings: candidate.safetyRatings,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/models?key=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getDefaultModel(): string {
    return process.env.GEMINI_DEFAULT_MODEL || 'gemini-pro';
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    // Gemini pricing (as of 2025)
    // Free tier: 60 requests per minute
    // Pro: $0.25 per 1M input tokens, $0.50 per 1M output tokens
    const promptCost = (promptTokens / 1_000_000) * 0.25;
    const completionCost = (completionTokens / 1_000_000) * 0.50;

    return promptCost + completionCost;
  }

  private convertMessagesToGeminiFormat(messages: AIMessage[]) {
    return messages
      .filter(m => m.role !== 'system') // Gemini doesn't support system messages
      .map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));
  }

  private mapFinishReason(reason: string): AICompletionResponse['finishReason'] {
    const mapping: Record<string, AICompletionResponse['finishReason']> = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop',
    };

    return mapping[reason] || 'stop';
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
