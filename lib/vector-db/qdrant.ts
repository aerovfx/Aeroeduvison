/**
 * qdrant.ts - Qdrant Vector Database client
 * 
 * Provides vector storage and similarity search for:
 * - Course content embeddings
 * - Student answer embeddings
 * - Semantic search
 * - RAG (Retrieval Augmented Generation)
 */

import { apiLogger } from '../logging-simple';

interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, any>;
}

interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload?: Record<string, any>;
}

class QdrantClient {
  private baseUrl: string;
  private apiKey: string | null;
  private collectionName: string;
  private vectorSize: number;

  constructor(collectionOverride?: string) {
    this.baseUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    this.apiKey = process.env.QDRANT_API_KEY || null;
    this.collectionName =
      collectionOverride ?? process.env.QDRANT_COLLECTION ?? 'lmsmath_vectors';
    this.vectorSize = parseInt(process.env.EMBEDDING_DIMENSION || '1536'); // OpenAI default
  }

  private async request(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['api-key'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Qdrant API error: ${response.status} - ${error}`);
      }

      return await response.json();
    } catch (error) {
      apiLogger.error('Qdrant request failed', {
        metadata: {
          method,
          endpoint,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Create collection if it doesn't exist
   */
  async ensureCollection(): Promise<void> {
    try {
      // Check if collection exists
      await this.request('GET', `/collections/${this.collectionName}`);
      apiLogger.info('Qdrant collection already exists', {
        metadata: { collection: this.collectionName },
      });
    } catch (error) {
      // Collection doesn't exist, create it
      try {
        await this.request('PUT', `/collections/${this.collectionName}`, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
        });
        apiLogger.info('Qdrant collection created', {
          metadata: { collection: this.collectionName },
        });
      } catch (createError) {
        apiLogger.error('Failed to create Qdrant collection', {
          metadata: {
            collection: this.collectionName,
            error: (createError as Error).message,
          },
        });
        throw createError;
      }
    }
  }

  /**
   * Upsert points (vectors) into collection
   */
  async upsertPoints(points: QdrantPoint[]): Promise<void> {
    await this.ensureCollection();

    try {
      await this.request('PUT', `/collections/${this.collectionName}/points`, {
        points: points.map((point) => ({
          id: point.id,
          vector: point.vector,
          payload: point.payload || {},
        })),
      });
      apiLogger.debug('Qdrant points upserted', {
        metadata: { count: points.length },
      });
    } catch (error) {
      apiLogger.error('Failed to upsert Qdrant points', {
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    queryVector: number[],
    limit: number = 10,
    scoreThreshold?: number,
    filter?: Record<string, any>
  ): Promise<QdrantSearchResult[]> {
    await this.ensureCollection();

    try {
      const body: any = {
        vector: queryVector,
        limit,
        with_payload: true,
      };

      if (scoreThreshold !== undefined) {
        body.score_threshold = scoreThreshold;
      }

      if (filter) {
        body.filter = filter;
      }

      const response = await this.request(
        'POST',
        `/collections/${this.collectionName}/points/search`,
        body
      );

      return response.result.map((item: any) => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
      }));
    } catch (error) {
      apiLogger.error('Qdrant search failed', {
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Delete points by IDs
   */
  async deletePoints(ids: (string | number)[]): Promise<void> {
    await this.ensureCollection();

    try {
      await this.request(
        'POST',
        `/collections/${this.collectionName}/points/delete`,
        {
          points: ids,
        }
      );
      apiLogger.debug('Qdrant points deleted', {
        metadata: { count: ids.length },
      });
    } catch (error) {
      apiLogger.error('Failed to delete Qdrant points', {
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Get point by ID
   */
  async getPoint(id: string | number): Promise<QdrantPoint | null> {
    await this.ensureCollection();

    try {
      const response = await this.request(
        'POST',
        `/collections/${this.collectionName}/points`,
        {
          ids: [id],
          with_payload: true,
          with_vector: true,
        }
      );

      if (response.result && response.result.length > 0) {
        const point = response.result[0];
        return {
          id: point.id,
          vector: point.vector,
          payload: point.payload,
        };
      }

      return null;
    } catch (error) {
      apiLogger.error('Failed to get Qdrant point', {
        metadata: { id, error: (error as Error).message },
      });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ connected: boolean; collectionExists: boolean }> {
    try {
      const response = await this.request('GET', '/health');
      const collectionExists = await this.request(
        'GET',
        `/collections/${this.collectionName}`
      )
        .then(() => true)
        .catch(() => false);

      return {
        connected: response.status === 'ok',
        collectionExists,
      };
    } catch (error) {
      return {
        connected: false,
        collectionExists: false,
      };
    }
  }
}

// Singleton instances per collection
const clientCache = new Map<string, QdrantClient>();

const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION || 'lmsmath_vectors';
const RAG_COLLECTION = process.env.QDRANT_RAG_COLLECTION || 'rag_documents';

export function getQdrantClient(collection?: string): QdrantClient {
  const key = collection || DEFAULT_COLLECTION;
  if (!clientCache.has(key)) {
    clientCache.set(key, new QdrantClient(key));
  }
  return clientCache.get(key)!;
}

/** Client for RAG vector store (collection rag_documents) */
export function getQdrantRagClient(): QdrantClient {
  return getQdrantClient(RAG_COLLECTION);
}

export default getQdrantClient;

