/**
 * vector-service.ts - Vector Service (High-level)
 * 
 * Combines embedding generation and vector storage:
 * - Generate embeddings
 * - Store in vector database
 * - Search similar content
 * - RAG (Retrieval Augmented Generation)
 */

import { getEmbeddingService } from './service';
import { getQdrantClient } from '../vector-db/qdrant';
import { apiLogger } from '../logging-simple';

interface VectorDocument {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

interface SearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, any>;
}

class VectorService {
  /**
   * Index a document (generate embedding and store)
   */
  async indexDocument(
    document: VectorDocument,
    model?: string
  ): Promise<void> {
    try {
      // Generate embedding
      const embeddingService = getEmbeddingService();
      const embeddingResult = await embeddingService.generateEmbedding(
        document.text,
        { model, cacheKey: `doc:${document.id}` }
      );

      // Store in vector database
      const qdrant = getQdrantClient();
      await qdrant.upsertPoints([
        {
          id: document.id,
          vector: embeddingResult.embedding,
          payload: {
            text: document.text,
            ...document.metadata,
          },
        },
      ]);

      apiLogger.debug('Document indexed', {
        metadata: { documentId: document.id },
      });
    } catch (error) {
      apiLogger.error('Failed to index document', {
        metadata: {
          documentId: document.id,
          error: (error as Error).message,
        },
      });
      throw error;
    }
  }

  /**
   * Index multiple documents (batch)
   */
  async indexDocuments(
    documents: VectorDocument[],
    model?: string
  ): Promise<void> {
    try {
      // Generate embeddings in batch
      const embeddingService = getEmbeddingService();
      const texts = documents.map((doc) => doc.text);
      const embeddingResults = await embeddingService.generateEmbeddings(
        texts,
        { model }
      );

      // Store in vector database
      const qdrant = getQdrantClient();
      const points = documents.map((doc, index) => ({
        id: doc.id,
        vector: embeddingResults[index].embedding,
        payload: {
          text: doc.text,
          ...doc.metadata,
        },
      }));

      await qdrant.upsertPoints(points);

      apiLogger.debug('Documents indexed', {
        metadata: { count: documents.length },
      });
    } catch (error) {
      apiLogger.error('Failed to index documents', {
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
      model?: string;
    } = {}
  ): Promise<SearchResult[]> {
    try {
      const limit = options.limit || 10;
      const scoreThreshold = options.scoreThreshold || 0.7;

      // Generate query embedding
      const embeddingService = getEmbeddingService();
      const embeddingResult = await embeddingService.generateEmbedding(
        query,
        { model: options.model }
      );

      // Search in vector database
      const qdrant = getQdrantClient();
      const results = await qdrant.search(
        embeddingResult.embedding,
        limit,
        scoreThreshold,
        options.filter
      );

      return results.map((result) => ({
        id: result.id.toString(),
        score: result.score,
        text: result.payload?.text || '',
        metadata: result.payload,
      }));
    } catch (error) {
      apiLogger.error('Vector search failed', {
        metadata: { query, error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * Delete documents
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    try {
      const qdrant = getQdrantClient();
      await qdrant.deletePoints(ids);
      apiLogger.debug('Documents deleted', { metadata: { count: ids.length } });
    } catch (error) {
      apiLogger.error('Failed to delete documents', {
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  /**
   * RAG: Retrieve relevant context for LLM
   */
  async retrieveContext(
    query: string,
    options: {
      limit?: number;
      scoreThreshold?: number;
      filter?: Record<string, any>;
      model?: string;
    } = {}
  ): Promise<string> {
    const results = await this.search(query, options);

    // Combine top results into context
    const context = results
      .map((result) => result.text)
      .join('\n\n')
      .substring(0, 4000); // Limit context length

    return context;
  }
}

// Singleton instance
let vectorService: VectorService | null = null;

export function getVectorService(): VectorService {
  if (!vectorService) {
    vectorService = new VectorService();
  }
  return vectorService;
}

export default getVectorService;

