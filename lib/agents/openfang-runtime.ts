/**
 * OpenFang Runtime - Cloned from openfang-core/openfang-runtime
 * Agent execution loop and LLM drivers
 */

import { LlmProvider, LlmRequest, LlmResponse, Message, Tool, UsageInfo, Errors } from './openfang-types';

export interface LlmDriver {
  chat(request: LlmRequest): Promise<LlmResponse>;
  provider(): LlmProvider;
}

export class OpenAiDriver implements LlmDriver {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.openai.com/v1';
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
    });

    if (!response.ok) {
      throw Errors.llmError(await response.text());
    }

    const json = await response.json();

    return {
      content: json.choices[0].message.content || '',
      finishReason: json.choices[0].finish_reason || 'stop',
      usage: {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        totalTokens: json.usage?.total_tokens || 0,
      },
      toolCalls: undefined,
    };
  }

  provider(): LlmProvider {
    return LlmProvider.OpenAI;
  }
}

export class OpenRouterDriver implements LlmDriver {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://aeroeduvison.com',
        'X-Title': 'Aeroeduvison Exam Generator',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
      }),
    });

    if (!response.ok) {
      throw Errors.llmError(await response.text());
    }

    const json = await response.json();

    return {
      content: json.choices[0].message.content || '',
      finishReason: json.choices[0].finish_reason || 'stop',
      usage: {
        promptTokens: json.usage?.prompt_tokens || 0,
        completionTokens: json.usage?.completion_tokens || 0,
        totalTokens: json.usage?.total_tokens || 0,
      },
    };
  }

  provider(): LlmProvider {
    return LlmProvider.OpenRouter;
  }
}

export class AgentRuntime {
  private drivers: Map<LlmProvider, LlmDriver> = new Map();

  constructor() {
    // Register default drivers
    if (process.env.OPENAI_API_KEY) {
      this.registerDriver(new OpenAiDriver(process.env.OPENAI_API_KEY));
    }
    if (process.env.OPENROUTER_API_KEY) {
      this.registerDriver(new OpenRouterDriver(process.env.OPENROUTER_API_KEY));
    }
  }

  registerDriver(driver: LlmDriver): void {
    this.drivers.set(driver.provider(), driver);
  }

  getDriver(provider: LlmProvider): LlmDriver | undefined {
    return this.drivers.get(provider);
  }

  async execute(request: LlmRequest): Promise<LlmResponse> {
    const driver = this.getDriver(request.provider);
    if (!driver) {
      throw Errors.llmError(`No driver found for provider: ${request.provider}`);
    }
    return driver.chat(request);
  }
}

// Export singleton
export const runtime = new AgentRuntime();
