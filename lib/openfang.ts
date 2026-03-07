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

export type OpenFangMessage = ChatMessage;

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

export interface AgentInfo {
  id: string;
  name: string;
  state: string;
  model_name: string;
  model_provider: string;
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

  constructor(config?: Partial<OpenFangConfig>) {
    // Default to proxy endpoint in Next.js which redirects to local Open Fang
    this.baseUrl = config?.baseUrl?.replace(/\/$/, '') || '/api/openfang';
    this.apiKey = config?.apiKey || process.env.OPENFANG_API_KEY;
    this.timeoutMs = config?.timeoutMs || 30000;
    this.maxRetries = config?.maxRetries || 3;
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

  async listAgents(): Promise<AgentInfo[]> {
    // Note: The proxy might need to support GET for this
    const response = await fetch(`${this.baseUrl}?action=list_agents`);
    if (!response.ok) return [];
    return response.json();
  }

  async chat(
    message: string,
    agent: string = 'tutor',
    history: ChatMessage[] = []
  ): Promise<{ response: string; raw: ChatResponse }> {
    const endpoint = this.baseUrl; // Using proxy

    const messages: ChatMessage[] = [
      ...history,
      { role: 'user', content: message }
    ];

    const request = {
      agent,
      message, // Simplify for proxy usage
      messages, // Full history if needed
    };

    const raw = await this.fetchWithRetry<ChatResponse>(endpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    return {
      response: raw.choices[0]?.message?.content || '',
      raw
    };
  }
}
