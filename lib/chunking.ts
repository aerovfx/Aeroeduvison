/**
 * chunking.ts - Production-ready chunking system for large data processing
 * 
 * Features:
 * - Data chunking for large datasets
 * - Streaming chunk processing
 * - Progress tracking
 * - Memory optimization
 * - Error recovery
 */

import { apiLogger } from './logging-simple';
import { sleep } from './utils';

// Chunking configuration
const CHUNKING_CONFIG = {
  DEFAULT_CHUNK_SIZE: 100,
  MAX_CHUNK_SIZE: 1000,
  MIN_CHUNK_SIZE: 10,
  PROCESSING_DELAY: 50, // ms between chunks
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Chunk processing result
export interface ChunkResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  chunkIndex: number;
  processedCount: number;
  totalCount: number;
}

// Chunk processing options
export interface ChunkOptions {
  chunkSize?: number;
  delay?: number;
  maxRetries?: number;
  onProgress?: (progress: ChunkProgress) => void;
  onError?: (error: ChunkError) => void;
  onComplete?: (result: ChunkComplete) => void;
}

// Progress tracking
export interface ChunkProgress {
  currentChunk: number;
  totalChunks: number;
  processedItems: number;
  totalItems: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  startTime: number;
}

// Error tracking
export interface ChunkError {
  chunkIndex: number;
  error: Error;
  retryCount: number;
  maxRetries: number;
}

// Completion result
export interface ChunkComplete {
  totalProcessed: number;
  totalErrors: number;
  totalTime: number;
  averageTimePerChunk: number;
  successRate: number;
}

// Chunk processor class
export class ChunkProcessor<T, R> {
  private options: Required<ChunkOptions>;
  private startTime: number = 0;
  private processedCount: number = 0;
  private errorCount: number = 0;

  constructor(options: ChunkOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize || CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE,
      delay: options.delay || CHUNKING_CONFIG.PROCESSING_DELAY,
      maxRetries: options.maxRetries || CHUNKING_CONFIG.MAX_RETRIES,
      onProgress: options.onProgress || (() => {}),
      onError: options.onError || (() => {}),
      onComplete: options.onComplete || (() => {})
    };

    // Validate chunk size
    if (this.options.chunkSize > CHUNKING_CONFIG.MAX_CHUNK_SIZE) {
      this.options.chunkSize = CHUNKING_CONFIG.MAX_CHUNK_SIZE;
    }
    if (this.options.chunkSize < CHUNKING_CONFIG.MIN_CHUNK_SIZE) {
      this.options.chunkSize = CHUNKING_CONFIG.MIN_CHUNK_SIZE;
    }
  }

  async process(
    data: T[],
    processor: (chunk: T[], chunkIndex: number) => Promise<R>
  ): Promise<R[]> {
    this.startTime = Date.now();
    this.processedCount = 0;
    this.errorCount = 0;

    const chunks = this.createChunks(data);
    const results: R[] = [];
    const totalChunks = chunks.length;

    apiLogger.info('Starting chunk processing', {
      metadata: {
        totalItems: data.length,
        totalChunks,
        chunkSize: this.options.chunkSize
      }
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const result = await this.processChunk(chunk, i, processor);
      
      if (result.success && result.data) {
        results.push(result.data);
        this.processedCount += result.processedCount;
      } else {
        this.errorCount++;
      }

      // Report progress
      this.reportProgress(i + 1, totalChunks, data.length);

      // Add delay between chunks to prevent overwhelming the system
      if (i < chunks.length - 1 && this.options.delay > 0) {
        await sleep(this.options.delay);
      }
    }

    // Report completion
    this.reportComplete(data.length);

    return results;
  }

  private createChunks(data: T[]): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += this.options.chunkSize) {
      chunks.push(data.slice(i, i + this.options.chunkSize));
    }
    return chunks;
  }

  private async processChunk(
    chunk: T[],
    chunkIndex: number,
    processor: (chunk: T[], chunkIndex: number) => Promise<R>
  ): Promise<ChunkResult<R>> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.options.maxRetries) {
      try {
        const result = await processor(chunk, chunkIndex);
        return {
          success: true,
          data: result,
          chunkIndex,
          processedCount: chunk.length,
          totalCount: chunk.length
        };
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        const chunkError: ChunkError = {
          chunkIndex,
          error: lastError,
          retryCount,
          maxRetries: this.options.maxRetries
        };

        this.options.onError(chunkError);

        if (retryCount <= this.options.maxRetries) {
          apiLogger.warn('Chunk processing failed, retrying', {
            metadata: {
              chunkIndex,
              retryCount,
              error: lastError.message
            }
          });
          await sleep(CHUNKING_CONFIG.RETRY_DELAY * retryCount);
        }
      }
    }

    apiLogger.error('Chunk processing failed after all retries', {
      metadata: {
        chunkIndex,
        error: lastError?.message
      }
    });

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      chunkIndex,
      processedCount: 0,
      totalCount: chunk.length
    };
  }

  private reportProgress(currentChunk: number, totalChunks: number, totalItems: number): void {
    const percentage = Math.round((currentChunk / totalChunks) * 100);
    const elapsedTime = Date.now() - this.startTime;
    const averageTimePerChunk = elapsedTime / currentChunk;
    const estimatedTimeRemaining = (totalChunks - currentChunk) * averageTimePerChunk;

    const progress: ChunkProgress = {
      currentChunk,
      totalChunks,
      processedItems: this.processedCount,
      totalItems,
      percentage,
      estimatedTimeRemaining,
      startTime: this.startTime
    };

    this.options.onProgress(progress);
  }

  private reportComplete(totalItems: number): void {
    const totalTime = Date.now() - this.startTime;
    const averageTimePerChunk = totalTime / (this.processedCount + this.errorCount);
    const successRate = totalItems > 0 ? (this.processedCount / totalItems) * 100 : 0;

    const complete: ChunkComplete = {
      totalProcessed: this.processedCount,
      totalErrors: this.errorCount,
      totalTime,
      averageTimePerChunk,
      successRate
    };

    this.options.onComplete(complete);

    apiLogger.info('Chunk processing completed', {
      metadata: {
        totalProcessed: this.processedCount,
        totalErrors: this.errorCount,
        totalTime: `${totalTime}ms`,
        successRate: `${successRate.toFixed(2)}%`
      }
    });
  }
}

// Utility functions for chunking
export class ChunkingUtils {
  static createChunks<T>(data: T[], chunkSize: number = CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static async processChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    options: ChunkOptions = {}
  ): Promise<R[]> {
    const chunkProcessor = new ChunkProcessor<T, R>(options);
    return await chunkProcessor.process(data, processor);
  }

  static async processChunksWithProgress<T, R>(
    data: T[],
    processor: (chunk: T[], chunkIndex: number) => Promise<R>,
    options: ChunkOptions = {}
  ): Promise<{ results: R[]; progress: ChunkProgress[] }> {
    const progress: ChunkProgress[] = [];
    
    const chunkProcessor = new ChunkProcessor<T, R>({
      ...options,
      onProgress: (p) => {
        progress.push(p);
        options.onProgress?.(p);
      }
    });

    const results = await chunkProcessor.process(data, processor);
    return { results, progress };
  }

  static calculateOptimalChunkSize(totalItems: number, availableMemory: number = 100 * 1024 * 1024): number {
    // Estimate memory usage per item (1KB default)
    const estimatedItemSize = 1024;
    const maxChunks = Math.floor(availableMemory / (estimatedItemSize * CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE));
    const optimalChunkSize = Math.max(
      CHUNKING_CONFIG.MIN_CHUNK_SIZE,
      Math.min(
        CHUNKING_CONFIG.MAX_CHUNK_SIZE,
        Math.floor(totalItems / maxChunks) || CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE
      )
    );

    return optimalChunkSize;
  }

  static async streamChunks<T>(
    data: T[],
    chunkSize: number = CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE,
    delay: number = CHUNKING_CONFIG.PROCESSING_DELAY
  ): AsyncGenerator<T[], void, unknown> {
    const chunks = this.createChunks(data, chunkSize);
    
    for (let i = 0; i < chunks.length; i++) {
      yield chunks[i];
      
      if (i < chunks.length - 1 && delay > 0) {
        await sleep(delay);
      }
    }
  }
}

// Database chunking utilities
export class DatabaseChunking {
  static async chunkedQuery<T>(
    query: (offset: number, limit: number) => Promise<T[]>,
    totalCount: number,
    chunkSize: number = CHUNKING_CONFIG.DEFAULT_CHUNK_SIZE,
    options: ChunkOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];
    const totalChunks = Math.ceil(totalCount / chunkSize);

    const chunkProcessor = new ChunkProcessor<T, T[]>(options);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      const limit = Math.min(chunkSize, totalCount - offset);

      const chunk = await query(offset, limit);
      results.push(...chunk);

      // Report progress
      const progress: ChunkProgress = {
        currentChunk: i + 1,
        totalChunks,
        processedItems: results.length,
        totalItems: totalCount,
        percentage: Math.round(((i + 1) / totalChunks) * 100),
        startTime: Date.now()
      };

      options.onProgress?.(progress);

      if (i < totalChunks - 1 && options.delay) {
        await sleep(options.delay);
      }
    }

    return results;
  }

  static async chunkedInsert<T>(
    data: T[],
    inserter: (chunk: T[]) => Promise<void>,
    options: ChunkOptions = {}
  ): Promise<void> {
    const chunkProcessor = new ChunkProcessor<T, void>(options);
    
    await chunkProcessor.process(data, async (chunk) => {
      await inserter(chunk);
    });
  }

  static async chunkedUpdate<T>(
    data: T[],
    updater: (chunk: T[]) => Promise<void>,
    options: ChunkOptions = {}
  ): Promise<void> {
    const chunkProcessor = new ChunkProcessor<T, void>(options);
    
    await chunkProcessor.process(data, async (chunk) => {
      await updater(chunk);
    });
  }
}

// File chunking utilities
export class FileChunking {
  static async chunkedFileRead(
    filePath: string,
    chunkSize: number = 64 * 1024, // 64KB
    options: ChunkOptions = {}
  ): Promise<Buffer[]> {
    const fs = await import('fs/promises');
    const fileHandle = await fs.open(filePath, 'r');
    const stats = await fileHandle.stat();
    const totalSize = stats.size;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const chunks: Buffer[] = [];

    const chunkProcessor = new ChunkProcessor<number, Buffer>(options);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      const length = Math.min(chunkSize, totalSize - offset);
      
      const buffer = Buffer.alloc(length);
      await fileHandle.read(buffer, 0, length, offset);
      chunks.push(buffer);

      // Report progress
      const progress: ChunkProgress = {
        currentChunk: i + 1,
        totalChunks,
        processedItems: chunks.length,
        totalItems: totalChunks,
        percentage: Math.round(((i + 1) / totalChunks) * 100),
        startTime: Date.now()
      };

      options.onProgress?.(progress);

      if (i < totalChunks - 1 && options.delay) {
        await sleep(options.delay || 0);
      }
    }

    await fileHandle.close();
    return chunks;
  }

  static async chunkedFileWrite(
    filePath: string,
    chunks: Buffer[],
    options: ChunkOptions = {}
  ): Promise<void> {
    const fs = await import('fs/promises');
    const fileHandle = await fs.open(filePath, 'w');

    const chunkProcessor = new ChunkProcessor<Buffer, void>(options);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await fileHandle.write(chunk);

      // Report progress
      const progress: ChunkProgress = {
        currentChunk: i + 1,
        totalChunks: chunks.length,
        processedItems: i + 1,
        totalItems: chunks.length,
        percentage: Math.round(((i + 1) / chunks.length) * 100),
        startTime: Date.now()
      };

      options.onProgress?.(progress);

      if (i < chunks.length - 1 && options.delay) {
        await sleep(options.delay || 0);
      }
    }

    await fileHandle.close();
  }
}

export default ChunkProcessor;
