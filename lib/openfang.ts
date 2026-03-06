// d:\openfang\Aeroeduvison-main\lib\openfang.ts

export interface OpenFangConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenFangError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenFangError';
  }
}

export class OpenFangClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: OpenFangConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs || 30000;
    this.maxRetries = config.maxRetries || 3;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;

        if (retryCount < this.maxRetries) {
          await this.sleep(waitTime);
          return this.fetchWithRetry<T>(url, options, retryCount + 1);
        }
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new OpenFangError(
          `HTTP ${response.status}: ${errorBody}`,
          response.status
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      if (retryCount < this.maxRetries) {
        await this.sleep(Math.pow(2, retryCount) * 1000);
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  async chat(
    message: string,
    options: {
      agent?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    const endpoint = `${this.baseUrl}/v1/chat/completions`;

    const request: ChatRequest = {
      model: options.agent || 'tutor',
      messages: [{ role: 'user', content: message }],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    };

    return this.fetchWithRetry<ChatResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
  }

  async chatWithHistory(
    messages: ChatMessage[],
    options: {
      agent?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ChatResponse> {
    const endpoint = `${this.baseUrl}/v1/chat/completions`;

    const request: ChatRequest = {
      model: options.agent || 'tutor',
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    };

    return this.fetchWithRetry<ChatResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
  }
}
