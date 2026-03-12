/**
 * embeddings/service.ts - Embedding Service
 * 
 * Provides text embeddings using multiple providers:
 * - OpenAI (text-embedding-3-small, text-embedding-3-large)
 * - OpenRouter (multiple models)
 * - Local models (Ollama)
 */

import { apiLogger } from '../logging-simple';
import { CacheManager } from '../cache';

interface EmbeddingOptions {
  model?: string;
  useCache?: boolean;
  cacheKey?: string;
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  cached: boolean;
}

/** OpenAI API key is valid when set and not the placeholder "ollama" (used for local LLM) */
function hasValidOpenAIKey(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return !!(key && key !== 'ollama' && key.length > 10);
}

class EmbeddingService {
  private defaultModel: string;
  private cacheEnabled: boolean;

  constructor() {
    // EMBEDDING_MODEL wins. If OPENAI_API_KEY is real → OpenAI default; else Ollama embedding (training/RAG without OpenAI).
    const envModel = process.env.EMBEDDING_MODEL;
    if (envModel) {
      this.defaultModel = envModel;
    } else if (hasValidOpenAIKey()) {
      this.defaultModel = 'text-embedding-3-small';
    } else {
      this.defaultModel = process.env.EMBEDDING_OLLAMA_MODEL || 'ollama/nomic-embed-text';
    }
    this.cacheEnabled = process.env.EMBEDDING_CACHE_ENABLED !== 'false';
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const model = options.model || this.defaultModel;
    const useCache = options.useCache !== false && this.cacheEnabled;
    const cacheKey =
      options.cacheKey || `embedding:${model}:${this.hashText(text)}`;

    // Check cache
    if (useCache) {
      const cached = await CacheManager.get<EmbeddingResult>(cacheKey);
      if (cached) {
        apiLogger.debug('Embedding cache hit', { metadata: { model, cacheKey } });
        return { ...cached, cached: true };
      }
    }

    // Generate embedding
    let embedding: number[];
    let dimensions: number;

    if (model.startsWith('openai/') || model.includes('text-embedding')) {
      const result = await this.generateOpenAIEmbedding(text, model);
      embedding = result.embedding;
      dimensions = result.dimensions;
    } else if (model.startsWith('openrouter/')) {
      const result = await this.generateOpenRouterEmbedding(text, model);
      embedding = result.embedding;
      dimensions = result.dimensions;
    } else if (model.startsWith('ollama/')) {
      const result = await this.generateOllamaEmbedding(text, model);
      embedding = result.embedding;
      dimensions = result.dimensions;
    } else {
      // Default to OpenAI
      const result = await this.generateOpenAIEmbedding(text, model);
      embedding = result.embedding;
      dimensions = result.dimensions;
    }

    const result: EmbeddingResult = {
      embedding,
      model,
      dimensions,
      cached: false,
    };

    // Cache result
    if (useCache) {
      await CacheManager.set(cacheKey, result, 86400); // 24 hours
    }

    return result;
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateEmbeddings(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const model = options.model || this.defaultModel;

    // OpenAI supports batch embeddings
    if (model.startsWith('openai/') || model.includes('text-embedding')) {
      return this.generateOpenAIEmbeddings(texts, model, options);
    }

    // For other providers, generate sequentially
    const results: EmbeddingResult[] = [];
    for (const text of texts) {
      const result = await this.generateEmbedding(text, options);
      results.push(result);
    }
    return results;
  }

  /**
   * Generate OpenAI embedding
   */
  private async generateOpenAIEmbedding(
    text: string,
    model: string
  ): Promise<{ embedding: number[]; dimensions: number }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'ollama') {
      throw new Error(
        'OPENAI_API_KEY is missing or set to "ollama". For local training/RAG use Ollama embeddings: set EMBEDDING_MODEL=ollama/nomic-embed-text (and run `ollama run nomic-embed-text`).'
      );
    }

    // Normalize model name
    const normalizedModel = model.replace('openai/', '');

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: normalizedModel,
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        embedding: data.data[0].embedding,
        dimensions: data.data[0].embedding.length,
      };
    } catch (error) {
      apiLogger.error('OpenAI embedding generation failed', {
        metadata: {
          model,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Generate OpenAI embeddings (batch)
   */
  private async generateOpenAIEmbeddings(
    texts: string[],
    model: string,
    options: EmbeddingOptions
  ): Promise<EmbeddingResult[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'ollama') {
      throw new Error(
        'OPENAI_API_KEY is missing or set to "ollama". For local training/RAG set EMBEDDING_MODEL=ollama/nomic-embed-text.'
      );
    }

    const normalizedModel = model.replace('openai/', '');

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: normalizedModel,
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: any, index: number) => ({
        embedding: item.embedding,
        model,
        dimensions: item.embedding.length,
        cached: false,
      }));
    } catch (error) {
      apiLogger.error('OpenAI batch embedding generation failed', {
        metadata: {
          model,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Generate OpenRouter embedding
   */
  private async generateOpenRouterEmbedding(
    text: string,
    model: string
  ): Promise<{ embedding: number[]; dimensions: number }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const normalizedModel = model.replace('openrouter/', '');

    try {
      const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://inphysic.com',
          'X-Title': 'LMSMath',
        },
        body: JSON.stringify({
          model: normalizedModel,
          input: text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return {
        embedding: data.data[0].embedding,
        dimensions: data.data[0].embedding.length,
      };
    } catch (error) {
      apiLogger.error('OpenRouter embedding generation failed', {
        metadata: {
          model,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Generate Ollama embedding (local)
   */
  private async generateOllamaEmbedding(
    text: string,
    model: string
  ): Promise<{ embedding: number[]; dimensions: number }> {
    const ollamaUrl = process.env.OLLAMA_HOST || process.env.OLLAMA_URL || 'http://localhost:11434';
    const normalizedModel = model.replace('ollama/', '');

    try {
      const response = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: normalizedModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 404) {
          throw new Error(
            `Ollama embedding model "${normalizedModel}" not found. Pull it first: ollama pull ${normalizedModel}`
          );
        }
        throw new Error(`Ollama API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      return {
        embedding: data.embedding,
        dimensions: data.embedding.length,
      };
    } catch (error) {
      apiLogger.error('Ollama embedding generation failed', {
        metadata: {
          model,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Hash text for cache key
   */
  private hashText(text: string): string {
    // Simple hash function (not cryptographically secure, just for cache keys)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}

export default getEmbeddingService;

