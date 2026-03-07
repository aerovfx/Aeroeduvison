/**
 * Human-in-the-Loop Review Workflow
 * Manages review queue for AI grading that needs human verification
 */

import { GradingResult } from './smart-grading';
import { ValidationResult } from './grading-validator';

export interface ReviewTask {
  id: string;
  studentId: string;
  assignmentId: string;
  question: string;
  studentAnswer: string;
  aiGrading: GradingResult;
  validation: ValidationResult;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_review' | 'completed' | 'disputed';
  assignedTo?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
  finalScore?: number;
}

export interface ReviewerStats {
  reviewerId: string;
  totalReviews: number;
  averageReviewTime: number; // in seconds
  agreementRate: number; // % agreement with AI
  pendingTasks: number;
}

export class HumanReviewWorkflow {
  private redis: any;
  private reviewQueue: ReviewTask[] = [];
  private keyPrefix = 'ai:review';

  async initialize(redisClient: any) {
    this.redis = redisClient;
  }

  /**
   * Add grading to review queue
   */
  async addToReviewQueue(
    task: Omit<ReviewTask, 'id' | 'createdAt' | 'status'>
  ): Promise<string> {
    const reviewTask: ReviewTask = {
      ...task,
      id: this.generateTaskId(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.reviewQueue.push(reviewTask);

    // Store in Redis
    if (this.redis) {
      const key = `${this.keyPrefix}:task:${reviewTask.id}`;
      await this.redis.setex(
        key,
        60 * 60 * 24 * 30, // 30 days
        JSON.stringify(reviewTask)
      );

      // Add to priority queue
      const queueKey = `${this.keyPrefix}:queue:${reviewTask.priority}`;
      await this.redis.zadd(
        queueKey,
        reviewTask.createdAt.getTime(),
        reviewTask.id
      );
    }

    console.log(`📋 Added to review queue: ${reviewTask.id} (${reviewTask.priority} priority)`);

    return reviewTask.id;
  }

  /**
   * Get next task for review
   */
  async getNextTask(reviewerId: string): Promise<ReviewTask | null> {
    // Try high priority first, then medium, then low
    for (const priority of ['high', 'medium', 'low'] as const) {
      const queueKey = `${this.keyPrefix}:queue:${priority}`;

      if (this.redis) {
        const taskIds = await this.redis.zrange(queueKey, 0, 0);

        if (taskIds.length > 0) {
          const taskId = taskIds[0];
          const taskKey = `${this.keyPrefix}:task:${taskId}`;
          const taskData = await this.redis.get(taskKey);

          if (taskData) {
            const task: ReviewTask = JSON.parse(taskData);

            // Mark as in review
            task.status = 'in_review';
            task.assignedTo = reviewerId;

            await this.redis.set(taskKey, JSON.stringify(task));
            await this.redis.zrem(queueKey, taskId);

            console.log(`👤 Assigned task ${taskId} to reviewer ${reviewerId}`);

            return task;
          }
        }
      }
    }

    // Fallback to in-memory queue
    const task = this.reviewQueue.find(t => t.status === 'pending');
    if (task) {
      task.status = 'in_review';
      task.assignedTo = reviewerId;
      return task;
    }

    return null;
  }

  /**
   * Submit review
   */
  async submitReview(
    taskId: string,
    reviewerId: string,
    review: {
      finalScore: number;
      feedback?: string;
      notes?: string;
      agree: boolean;
    }
  ): Promise<void> {
    const taskKey = `${this.keyPrefix}:task:${taskId}`;

    if (this.redis) {
      const taskData = await this.redis.get(taskKey);

      if (taskData) {
        const task: ReviewTask = JSON.parse(taskData);

        if (task.assignedTo !== reviewerId) {
          throw new Error('Task not assigned to this reviewer');
        }

        task.status = 'completed';
        task.reviewedAt = new Date();
        task.finalScore = review.finalScore;
        task.reviewNotes = review.notes;

        await this.redis.set(taskKey, JSON.stringify(task));

        // Update reviewer stats
        await this.updateReviewerStats(reviewerId, task, review.agree);

        // Log for calibration
        await this.logReviewForCalibration(task, review);

        console.log(`✅ Review completed for task ${taskId} by ${reviewerId}`);
      }
    }
  }

  /**
   * Get review queue status
   */
  async getQueueStatus(): Promise<{
    total: number;
    byPriority: Record<'high' | 'medium' | 'low', number>;
    byStatus: Record<ReviewTask['status'], number>;
    averageWaitTime: number;
  }> {
    const tasks = await this.getAllTasks();

    const byPriority = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    };

    const byStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_review: tasks.filter(t => t.status === 'in_review').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      disputed: tasks.filter(t => t.status === 'disputed').length,
    };

    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const averageWaitTime = pendingTasks.length > 0
      ? pendingTasks.reduce((sum, t) => {
          return sum + (Date.now() - t.createdAt.getTime());
        }, 0) / pendingTasks.length / 1000 // Convert to seconds
      : 0;

    return {
      total: tasks.length,
      byPriority,
      byStatus,
      averageWaitTime,
    };
  }

  /**
   * Get reviewer statistics
   */
  async getReviewerStats(reviewerId: string): Promise<ReviewerStats> {
    const statsKey = `${this.keyPrefix}:stats:${reviewerId}`;

    if (this.redis) {
      const data = await this.redis.get(statsKey);

      if (data) {
        return JSON.parse(data);
      }
    }

    return {
      reviewerId,
      totalReviews: 0,
      averageReviewTime: 0,
      agreementRate: 0,
      pendingTasks: 0,
    };
  }

  /**
   * Get tasks assigned to reviewer
   */
  async getReviewerTasks(
    reviewerId: string,
    status?: ReviewTask['status']
  ): Promise<ReviewTask[]> {
    const allTasks = await this.getAllTasks();

    return allTasks.filter(task => {
      const matchesReviewer = task.assignedTo === reviewerId;
      const matchesStatus = !status || task.status === status;
      return matchesReviewer && matchesStatus;
    });
  }

  /**
   * Escalate task (e.g., from medium to high priority)
   */
  async escalateTask(taskId: string): Promise<void> {
    const taskKey = `${this.keyPrefix}:task:${taskId}`;

    if (this.redis) {
      const taskData = await this.redis.get(taskKey);

      if (taskData) {
        const task: ReviewTask = JSON.parse(taskData);

        // Remove from old queue
        const oldQueueKey = `${this.keyPrefix}:queue:${task.priority}`;
        await this.redis.zrem(oldQueueKey, taskId);

        // Increase priority
        if (task.priority === 'low') task.priority = 'medium';
        else if (task.priority === 'medium') task.priority = 'high';

        // Add to new queue
        const newQueueKey = `${this.keyPrefix}:queue:${task.priority}`;
        await this.redis.zadd(newQueueKey, task.createdAt.getTime(), taskId);

        await this.redis.set(taskKey, JSON.stringify(task));

        console.log(`⬆️  Escalated task ${taskId} to ${task.priority} priority`);
      }
    }
  }

  /**
   * Generate task ID
   */
  private generateTaskId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all tasks
   */
  private async getAllTasks(): Promise<ReviewTask[]> {
    if (!this.redis) {
      return this.reviewQueue;
    }

    const tasks: ReviewTask[] = [];
    const pattern = `${this.keyPrefix}:task:*`;

    let cursor = '0';
    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        const values = await this.redis.mget(...keys);
        values.forEach((value: string) => {
          if (value) {
            const task = JSON.parse(value);
            task.createdAt = new Date(task.createdAt);
            if (task.reviewedAt) {
              task.reviewedAt = new Date(task.reviewedAt);
            }
            tasks.push(task);
          }
        });
      }
    } while (cursor !== '0');

    return tasks;
  }

  /**
   * Update reviewer statistics
   */
  private async updateReviewerStats(
    reviewerId: string,
    task: ReviewTask,
    agree: boolean
  ): Promise<void> {
    const statsKey = `${this.keyPrefix}:stats:${reviewerId}`;

    if (!this.redis) return;

    const currentStats = await this.getReviewerStats(reviewerId);

    const reviewTime = task.reviewedAt
      ? (task.reviewedAt.getTime() - task.createdAt.getTime()) / 1000
      : 0;

    const newStats: ReviewerStats = {
      reviewerId,
      totalReviews: currentStats.totalReviews + 1,
      averageReviewTime:
        (currentStats.averageReviewTime * currentStats.totalReviews + reviewTime) /
        (currentStats.totalReviews + 1),
      agreementRate:
        (currentStats.agreementRate * currentStats.totalReviews + (agree ? 100 : 0)) /
        (currentStats.totalReviews + 1),
      pendingTasks: await this.getReviewerTasks(reviewerId, 'pending').then(t => t.length),
    };

    await this.redis.set(statsKey, JSON.stringify(newStats));
  }

  /**
   * Log review for AI calibration
   */
  private async logReviewForCalibration(
    task: ReviewTask,
    review: { finalScore: number }
  ): Promise<void> {
    if (!this.redis) return;

    const calibrationKey = `${this.keyPrefix}:calibration:${Date.now()}`;

    const calibrationData = {
      aiScore: task.aiGrading.score,
      humanScore: review.finalScore,
      difference: task.aiGrading.score - review.finalScore,
      confidence: task.aiGrading.confidence,
      timestamp: new Date(),
    };

    await this.redis.setex(
      calibrationKey,
      60 * 60 * 24 * 90, // 90 days
      JSON.stringify(calibrationData)
    );
  }
}

/**
 * Create default workflow instance
 */
export function createHumanReviewWorkflow(): HumanReviewWorkflow {
  return new HumanReviewWorkflow();
}
