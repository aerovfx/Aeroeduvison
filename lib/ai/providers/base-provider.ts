/**
 * Base AI Provider Interface
 * Defines the contract that all AI providers must implement
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface AICompletionResponse {
  id: string;
  content: string;
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AIProvider {
  name: string;

  /**
   * Generate a completion from the AI model
   */
  complete(
    messages: AIMessage[],
    options?: AICompletionOptions
  ): Promise<AICompletionResponse>;

  /**
   * Check if the provider is available (API key exists, service is up, etc.)
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string;

  /**
   * Estimate cost for a completion
   */
  estimateCost(promptTokens: number, completionTokens: number): number;
}
