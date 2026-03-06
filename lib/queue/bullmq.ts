/**
 * bullmq.ts - BullMQ Task Queue
 * 
 * Provides background job processing:
 * - Email sending
 * - PDF generation
 * - Image processing
 * - Data exports
 * - Scheduled tasks
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient } from '../redis';
import { apiLogger } from '../logging-simple';

interface JobData {
  [key: string]: any;
}

interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

class BullMQManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: ReturnType<typeof getRedisClient> | null = null;

  constructor() {
    this.redis = getRedisClient();
  }

  /**
   * Get or create a queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const connection = this.redis
        ? {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
          }
        : undefined;

      const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 500, // Keep last 500 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.queues.set(name, queue);

      // Set up queue events
      const queueEvents = new QueueEvents(name, { connection });
      this.queueEvents.set(name, queueEvents);

      queueEvents.on('completed', ({ jobId }) => {
        apiLogger.debug('Job completed', { metadata: { queue: name, jobId } });
      });

      queueEvents.on('failed', ({ jobId, failedReason }) => {
        apiLogger.error('Job failed', {
          metadata: { queue: name, jobId, reason: failedReason },
        });
      });

      apiLogger.info('BullMQ queue created', { metadata: { queue: name } });
    }

    return this.queues.get(name)!;
  }

  /**
   * Add job to queue
   */
  async addJob(
    queueName: string,
    jobName: string,
    data: JobData,
    options: JobOptions = {}
  ): Promise<string> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);
    apiLogger.debug('Job added to queue', {
      metadata: { queue: queueName, jobName, jobId: job.id },
    });
    return job.id!;
  }

  /**
   * Create worker for queue
   */
  createWorker(
    queueName: string,
    processor: (job: { data: JobData; id: string }) => Promise<any>
  ): Worker {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const connection = this.redis
      ? {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
        }
      : undefined;

    const worker = new Worker(
      queueName,
      async (job) => {
        apiLogger.debug('Processing job', {
          metadata: { queue: queueName, jobId: job.id, jobName: job.name },
        });
        return await processor(job);
      },
      {
        connection,
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5'),
        limiter: {
          max: 10,
          duration: 1000,
        },
      }
    );

    worker.on('completed', (job) => {
      apiLogger.info('Job completed', {
        metadata: { queue: queueName, jobId: job.id },
      });
    });

    worker.on('failed', (job, err) => {
      apiLogger.error('Job failed', {
        metadata: {
          queue: queueName,
          jobId: job?.id,
          error: err.message,
        },
      });
    });

    this.workers.set(queueName, worker);
    apiLogger.info('BullMQ worker created', { metadata: { queue: queueName } });

    return worker;
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<{
    id: string;
    name: string;
    data: JobData;
    state: string;
    progress: number;
    returnvalue?: any;
    failedReason?: string;
  } | null> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress || 0;

    return {
      id: job.id!,
      name: job.name,
      data: job.data,
      state,
      progress: typeof progress === 'number' ? progress : 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Clean up queues and workers
   */
  async shutdown(): Promise<void> {
    // Close all workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      apiLogger.info('BullMQ worker closed', { metadata: { queue: name } });
    }
    this.workers.clear();

    // Close all queue events
    for (const [name, queueEvents] of this.queueEvents.entries()) {
      await queueEvents.close();
      apiLogger.info('BullMQ queue events closed', { metadata: { queue: name } });
    }
    this.queueEvents.clear();

    // Close all queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      apiLogger.info('BullMQ queue closed', { metadata: { queue: name } });
    }
    this.queues.clear();
  }
}

// Singleton instance
let bullMQManager: BullMQManager | null = null;

export function getBullMQManager(): BullMQManager {
  if (!bullMQManager) {
    bullMQManager = new BullMQManager();
  }
  return bullMQManager;
}

export default getBullMQManager;

