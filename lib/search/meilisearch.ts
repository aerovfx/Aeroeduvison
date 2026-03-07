/**
 * meilisearch.ts - Meilisearch Client
 * 
 * Provides full-text search capabilities:
 * - Course content search
 * - User search
 * - Document search
 * - Typo tolerance
 * - Faceted search
 */

import { MeiliSearch } from 'meilisearch';
import { apiLogger } from '../logging-simple';

interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
}

interface SearchResult<T> {
  hits: T[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

class MeilisearchClient {
  private client: MeiliSearch | null = null;
  private isConnected = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
    const apiKey = process.env.MEILISEARCH_API_KEY || null;

    if (!host) {
      apiLogger.warn('Meilisearch host not configured, search disabled');
      return;
    }

    try {
      this.client = new MeiliSearch({
        host,
        apiKey: apiKey || undefined,
      });

      this.isConnected = true;
      apiLogger.info('Meilisearch client initialized', { metadata: { host } });
    } catch (error) {
      apiLogger.error('Failed to initialize Meilisearch client', {
        metadata: { error: (error as Error).message },
      });
      this.isConnected = false;
    }
  }

  /**
   * Check if client is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get or create index
   */
  async getIndex(indexName: string) {
    if (!this.client) {
      throw new Error('Meilisearch client not initialized');
    }

    try {
      const index = this.client.index(indexName);
      // Check if index exists
      await index.getRawInfo();
      return index;
    } catch (error: any) {
      // Index doesn't exist, create it
      if (error.statusCode === 404) {
        await this.client.createIndex(indexName, { primaryKey: 'id' });
        apiLogger.info('Meilisearch index created', { metadata: { indexName } });
        return this.client.index(indexName);
      }
      throw error;
    }
  }

  /**
   * Configure index settings
   */
  async configureIndex(
    indexName: string,
    settings: {
      searchableAttributes?: string[];
      filterableAttributes?: string[];
      sortableAttributes?: string[];
      displayedAttributes?: string[];
      rankingRules?: string[];
      stopWords?: string[];
      synonyms?: Record<string, string[]>;
    }
  ): Promise<void> {
    const index = await this.getIndex(indexName);

    if (settings.searchableAttributes) {
      await index.updateSearchableAttributes(settings.searchableAttributes);
    }

    if (settings.filterableAttributes) {
      await index.updateFilterableAttributes(settings.filterableAttributes);
    }

    if (settings.sortableAttributes) {
      await index.updateSortableAttributes(settings.sortableAttributes);
    }

    if (settings.displayedAttributes) {
      await index.updateDisplayedAttributes(settings.displayedAttributes);
    }

    if (settings.rankingRules) {
      await index.updateRankingRules(settings.rankingRules);
    }

    if (settings.stopWords) {
      await index.updateStopWords(settings.stopWords);
    }

    if (settings.synonyms) {
      await index.updateSynonyms(settings.synonyms);
    }

    apiLogger.debug('Meilisearch index configured', {
      metadata: { indexName, settings },
    });
  }

  /**
   * Add or update documents
   */
  async addDocuments<T extends { id: string | number }>(
    indexName: string,
    documents: T[]
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Meilisearch not available');
    }

    const index = await this.getIndex(indexName);
    await index.addDocuments(documents);
    apiLogger.debug('Meilisearch documents added', {
      metadata: { indexName, count: documents.length },
    });
  }

  /**
   * Delete documents
   */
  async deleteDocuments(
    indexName: string,
    documentIds: (string | number)[]
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Meilisearch not available');
    }

    const index = await this.getIndex(indexName);
    await index.deleteDocuments(documentIds);
    apiLogger.debug('Meilisearch documents deleted', {
      metadata: { indexName, count: documentIds.length },
    });
  }

  /**
   * Search documents
   */
  async search<T>(
    indexName: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult<T>> {
    if (!this.isAvailable()) {
      throw new Error('Meilisearch not available');
    }

    const index = await this.getIndex(indexName);

    const searchOptions: any = {
      limit: options.limit || 20,
      offset: options.offset || 0,
    };

    if (options.filter) {
      searchOptions.filter = options.filter;
    }

    if (options.sort) {
      searchOptions.sort = options.sort;
    }

    if (options.attributesToRetrieve) {
      searchOptions.attributesToRetrieve = options.attributesToRetrieve;
    }

    if (options.attributesToHighlight) {
      searchOptions.attributesToHighlight = options.attributesToHighlight;
    }

    const results = await index.search<T>(query, searchOptions);

    return {
      hits: results.hits,
      query,
      processingTimeMs: results.processingTimeMs,
      limit: searchOptions.limit,
      offset: searchOptions.offset,
      estimatedTotalHits: results.estimatedTotalHits,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ connected: boolean; version?: string }> {
    if (!this.client) {
      return { connected: false };
    }

    try {
      const health = await this.client.health();
      const version = await this.client.getVersion();
      return {
        connected: health.status === 'available',
        version: version.pkgVersion,
      };
    } catch (error) {
      return { connected: false };
    }
  }
}

// Singleton instance
let meilisearchClient: MeilisearchClient | null = null;

export function getMeilisearchClient(): MeilisearchClient {
  if (!meilisearchClient) {
    meilisearchClient = new MeilisearchClient();
  }
  return meilisearchClient;
}

export default getMeilisearchClient;

