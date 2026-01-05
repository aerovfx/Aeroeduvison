/**
 * Question Bank Management System
 *
 * Features:
 * - Store and organize AI-generated questions
 * - Search and filter by topic, subject, difficulty
 * - Track question usage and performance
 * - Quality scoring and validation
 * - Batch import/export
 * - Reusability across courses
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY' | 'CODE';
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Question {
  id: string;
  topic: string;
  subject: string;
  grade: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  content: string; // The actual question text
  options?: string[]; // For MCQ
  correctAnswer?: string | number; // Index for MCQ, value for others
  explanation: string; // Detailed explanation
  learningObjectives: string[];
  keywords: string[];

  // Quality metrics
  qualityScore?: number; // 0-100
  discriminationIndex?: number; // 0-1, measures how well it differentiates students

  // Usage tracking
  usageCount: number;
  averageScore?: number; // Average student score on this question
  averageTimeSeconds?: number; // Average time to answer

  // Metadata
  aiGenerated: boolean;
  aiModel?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuestionSearchFilter {
  topic?: string;
  subject?: string;
  grade?: string;
  difficulty?: DifficultyLevel | DifficultyLevel[];
  questionType?: QuestionType | QuestionType[];
  keywords?: string[];
  minQualityScore?: number;
  aiGenerated?: boolean;
  humanReviewed?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'qualityScore' | 'usageCount' | 'averageScore';
  sortOrder?: 'asc' | 'desc';
}

export interface QuestionBankStats {
  totalQuestions: number;
  bySubject: Record<string, number>;
  byDifficulty: Record<DifficultyLevel, number>;
  byType: Record<QuestionType, number>;
  averageQualityScore: number;
  aiGeneratedPercentage: number;
  humanReviewedPercentage: number;
  totalUsage: number;
}

export interface BulkImportResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  questionIds: string[];
}

// ============================================================================
// QUESTION BANK MANAGER
// ============================================================================

export class QuestionBankManager {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  // ==========================================================================
  // CREATE & IMPORT
  // ==========================================================================

  /**
   * Add a single question to the bank
   */
  async addQuestion(question: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>): Promise<Question> {
    try {
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(question);

      // Create question in database
      const created = await this.prisma.question.create({
        data: {
          topic: question.topic,
          subject: question.subject,
          grade: question.grade,
          questionType: question.questionType,
          difficulty: question.difficulty,
          content: question.content,
          options: question.options || [],
          correctAnswer: question.correctAnswer?.toString(),
          explanation: question.explanation,
          learningObjectives: question.learningObjectives,
          keywords: question.keywords,
          qualityScore,
          usageCount: 0,
          aiGenerated: question.aiGenerated,
          aiModel: question.aiModel,
          humanReviewed: question.humanReviewed || false,
          reviewedBy: question.reviewedBy,
          createdBy: question.createdBy,
        },
      });

      // Invalidate cache
      await this.invalidateStatsCache();

      return this.mapToQuestion(created);
    } catch (error: any) {
      throw new Error(`Failed to add question: ${error.message}`);
    }
  }

  /**
   * Bulk import questions
   */
  async bulkImport(
    questions: Array<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>,
    userId: string
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      totalProcessed: questions.length,
      successful: 0,
      failed: 0,
      errors: [],
      questionIds: [],
    };

    for (let i = 0; i < questions.length; i++) {
      try {
        const question = { ...questions[i], createdBy: userId };
        const created = await this.addQuestion(question);
        result.successful++;
        result.questionIds.push(created.id);
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Import questions from AI-generated quiz
   */
  async importFromQuiz(
    quiz: {
      title: string;
      questions: Array<{
        question: string;
        type?: string;
        options?: string[];
        correctAnswer: number | string;
        explanation: string;
        difficulty: 'easy' | 'medium' | 'hard';
        tags: string[];
        learningObjective?: string;
      }>;
      metadata?: {
        subject: string;
        grade: string;
        topic: string;
      };
    },
    userId: string,
    aiModel?: string
  ): Promise<BulkImportResult> {
    const questionsToImport = quiz.questions.map(q => ({
      topic: quiz.metadata?.topic || quiz.title,
      subject: quiz.metadata?.subject || 'General',
      grade: quiz.metadata?.grade || '10',
      questionType: (q.type?.toUpperCase() || 'MCQ') as QuestionType,
      difficulty: q.difficulty.toUpperCase() as DifficultyLevel,
      content: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      learningObjectives: q.learningObjective ? [q.learningObjective] : [],
      keywords: q.tags,
      usageCount: 0,
      aiGenerated: true,
      aiModel,
      humanReviewed: false,
      createdBy: userId,
    }));

    return this.bulkImport(questionsToImport as any, userId);
  }

  // ==========================================================================
  // READ & SEARCH
  // ==========================================================================

  /**
   * Get question by ID
   */
  async getQuestion(id: string): Promise<Question | null> {
    try {
      const question = await this.prisma.question.findUnique({
        where: { id },
      });

      return question ? this.mapToQuestion(question) : null;
    } catch (error: any) {
      throw new Error(`Failed to get question: ${error.message}`);
    }
  }

  /**
   * Search questions with filters
   */
  async searchQuestions(filter: QuestionSearchFilter): Promise<{
    questions: Question[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const {
        topic,
        subject,
        grade,
        difficulty,
        questionType,
        keywords,
        minQualityScore,
        aiGenerated,
        humanReviewed,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filter;

      // Build where clause
      const where: any = {};

      if (topic) where.topic = { contains: topic, mode: 'insensitive' };
      if (subject) where.subject = { contains: subject, mode: 'insensitive' };
      if (grade) where.grade = grade;

      if (difficulty) {
        where.difficulty = Array.isArray(difficulty)
          ? { in: difficulty }
          : difficulty;
      }

      if (questionType) {
        where.questionType = Array.isArray(questionType)
          ? { in: questionType }
          : questionType;
      }

      if (keywords && keywords.length > 0) {
        where.keywords = { hasSome: keywords };
      }

      if (minQualityScore !== undefined) {
        where.qualityScore = { gte: minQualityScore };
      }

      if (aiGenerated !== undefined) where.aiGenerated = aiGenerated;
      if (humanReviewed !== undefined) where.humanReviewed = humanReviewed;

      // Execute query
      const [questions, total] = await Promise.all([
        this.prisma.question.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
        }),
        this.prisma.question.count({ where }),
      ]);

      return {
        questions: questions.map(this.mapToQuestion),
        total,
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
      };
    } catch (error: any) {
      throw new Error(`Failed to search questions: ${error.message}`);
    }
  }

  /**
   * Get random questions matching criteria
   */
  async getRandomQuestions(
    count: number,
    filter?: Omit<QuestionSearchFilter, 'limit' | 'offset' | 'sortBy' | 'sortOrder'>
  ): Promise<Question[]> {
    try {
      // First, get all matching question IDs
      const { questions } = await this.searchQuestions({
        ...filter,
        limit: 1000, // Get a large pool to randomize from
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      // Randomly sample
      const shuffled = questions.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    } catch (error: any) {
      throw new Error(`Failed to get random questions: ${error.message}`);
    }
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update question
   */
  async updateQuestion(
    id: string,
    updates: Partial<Omit<Question, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Question> {
    try {
      const updated = await this.prisma.question.update({
        where: { id },
        data: {
          ...updates,
          correctAnswer: updates.correctAnswer?.toString(),
          updatedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.invalidateStatsCache();

      return this.mapToQuestion(updated);
    } catch (error: any) {
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  /**
   * Mark question as human-reviewed
   */
  async markAsReviewed(id: string, reviewedBy: string): Promise<Question> {
    return this.updateQuestion(id, {
      humanReviewed: true,
      reviewedBy,
      reviewedAt: new Date(),
    });
  }

  /**
   * Update question usage statistics
   */
  async recordUsage(
    id: string,
    studentScore?: number,
    timeSeconds?: number
  ): Promise<void> {
    try {
      const question = await this.getQuestion(id);
      if (!question) throw new Error('Question not found');

      const newUsageCount = question.usageCount + 1;

      // Calculate running average for score
      let newAverageScore = question.averageScore;
      if (studentScore !== undefined) {
        newAverageScore = question.averageScore
          ? (question.averageScore * question.usageCount + studentScore) / newUsageCount
          : studentScore;
      }

      // Calculate running average for time
      let newAverageTime = question.averageTimeSeconds;
      if (timeSeconds !== undefined) {
        newAverageTime = question.averageTimeSeconds
          ? (question.averageTimeSeconds * question.usageCount + timeSeconds) / newUsageCount
          : timeSeconds;
      }

      await this.prisma.question.update({
        where: { id },
        data: {
          usageCount: newUsageCount,
          averageScore: newAverageScore,
          averageTimeSeconds: newAverageTime,
        },
      });
    } catch (error: any) {
      console.error(`Failed to record usage for question ${id}:`, error);
    }
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete question
   */
  async deleteQuestion(id: string): Promise<void> {
    try {
      await this.prisma.question.delete({
        where: { id },
      });

      // Invalidate cache
      await this.invalidateStatsCache();
    } catch (error: any) {
      throw new Error(`Failed to delete question: ${error.message}`);
    }
  }

  /**
   * Bulk delete questions
   */
  async bulkDelete(ids: string[]): Promise<number> {
    try {
      const result = await this.prisma.question.deleteMany({
        where: { id: { in: ids } },
      });

      // Invalidate cache
      await this.invalidateStatsCache();

      return result.count;
    } catch (error: any) {
      throw new Error(`Failed to bulk delete: ${error.message}`);
    }
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get question bank statistics
   */
  async getStatistics(): Promise<QuestionBankStats> {
    try {
      // Try cache first
      const cacheKey = 'question-bank:stats';
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate stats
      const [
        total,
        bySubject,
        byDifficulty,
        byType,
        avgQuality,
        aiGenCount,
        reviewedCount,
        totalUsage,
      ] = await Promise.all([
        this.prisma.question.count(),
        this.prisma.question.groupBy({
          by: ['subject'],
          _count: true,
        }),
        this.prisma.question.groupBy({
          by: ['difficulty'],
          _count: true,
        }),
        this.prisma.question.groupBy({
          by: ['questionType'],
          _count: true,
        }),
        this.prisma.question.aggregate({
          _avg: { qualityScore: true },
        }),
        this.prisma.question.count({ where: { aiGenerated: true } }),
        this.prisma.question.count({ where: { humanReviewed: true } }),
        this.prisma.question.aggregate({
          _sum: { usageCount: true },
        }),
      ]);

      const stats: QuestionBankStats = {
        totalQuestions: total,
        bySubject: bySubject.reduce((acc, item) => {
          acc[item.subject] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byDifficulty: byDifficulty.reduce((acc, item) => {
          acc[item.difficulty as DifficultyLevel] = item._count;
          return acc;
        }, {} as Record<DifficultyLevel, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.questionType as QuestionType] = item._count;
          return acc;
        }, {} as Record<QuestionType, number>),
        averageQualityScore: avgQuality._avg.qualityScore || 0,
        aiGeneratedPercentage: total > 0 ? (aiGenCount / total) * 100 : 0,
        humanReviewedPercentage: total > 0 ? (reviewedCount / total) * 100 : 0,
        totalUsage: totalUsage._sum.usageCount || 0,
      };

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(stats));

      return stats;
    } catch (error: any) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  // ==========================================================================
  // QUALITY SCORING
  // ==========================================================================

  /**
   * Calculate quality score for a question (0-100)
   */
  private calculateQualityScore(question: Partial<Question>): number {
    let score = 70; // Base score

    // Content quality (+10 points)
    if (question.content && question.content.length > 20) score += 5;
    if (question.content && question.content.length > 50) score += 5;

    // Explanation quality (+10 points)
    if (question.explanation && question.explanation.length > 50) score += 5;
    if (question.explanation && question.explanation.length > 100) score += 5;

    // Learning objectives (+5 points)
    if (question.learningObjectives && question.learningObjectives.length > 0) score += 5;

    // Keywords/tags (+5 points)
    if (question.keywords && question.keywords.length >= 2) score += 5;

    // MCQ-specific quality
    if (question.questionType === 'MCQ') {
      if (question.options && question.options.length === 4) score += 5;
      if (question.options && question.options.every(opt => opt.length > 3)) score += 5;
    }

    // Human review bonus (+10 points)
    if (question.humanReviewed) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Recalculate quality scores for all questions
   */
  async recalculateAllQualityScores(): Promise<number> {
    try {
      const allQuestions = await this.prisma.question.findMany();
      let updated = 0;

      for (const question of allQuestions) {
        const newScore = this.calculateQualityScore(this.mapToQuestion(question));
        if (newScore !== question.qualityScore) {
          await this.prisma.question.update({
            where: { id: question.id },
            data: { qualityScore: newScore },
          });
          updated++;
        }
      }

      // Invalidate cache
      await this.invalidateStatsCache();

      return updated;
    } catch (error: any) {
      throw new Error(`Failed to recalculate quality scores: ${error.message}`);
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Map database record to Question interface
   */
  private mapToQuestion(record: any): Question {
    return {
      id: record.id,
      topic: record.topic,
      subject: record.subject,
      grade: record.grade,
      questionType: record.questionType,
      difficulty: record.difficulty,
      content: record.content,
      options: record.options,
      correctAnswer: record.correctAnswer,
      explanation: record.explanation,
      learningObjectives: record.learningObjectives,
      keywords: record.keywords,
      qualityScore: record.qualityScore,
      discriminationIndex: record.discriminationIndex,
      usageCount: record.usageCount,
      averageScore: record.averageScore,
      averageTimeSeconds: record.averageTimeSeconds,
      aiGenerated: record.aiGenerated,
      aiModel: record.aiModel,
      humanReviewed: record.humanReviewed,
      reviewedBy: record.reviewedBy,
      reviewedAt: record.reviewedAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      createdBy: record.createdBy,
    };
  }

  /**
   * Invalidate statistics cache
   */
  private async invalidateStatsCache(): Promise<void> {
    try {
      await this.redis.del('question-bank:stats');
    } catch (error) {
      console.error('Failed to invalidate stats cache:', error);
    }
  }

  /**
   * Export questions to JSON
   */
  async exportToJSON(filter?: QuestionSearchFilter): Promise<Question[]> {
    const { questions } = await this.searchQuestions({
      ...filter,
      limit: 10000, // Large limit for export
    });
    return questions;
  }

  /**
   * Get questions needing human review
   */
  async getQuestionsNeedingReview(limit: number = 50): Promise<Question[]> {
    const { questions } = await this.searchQuestions({
      aiGenerated: true,
      humanReviewed: false,
      minQualityScore: 70, // Only review decent quality questions
      limit,
      sortBy: 'createdAt',
      sortOrder: 'asc', // Oldest first
    });
    return questions;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let questionBankInstance: QuestionBankManager | null = null;

export function getQuestionBankManager(
  prisma?: PrismaClient,
  redis?: Redis
): QuestionBankManager {
  if (!questionBankInstance) {
    if (!prisma || !redis) {
      throw new Error('Prisma and Redis instances required for first initialization');
    }
    questionBankInstance = new QuestionBankManager(prisma, redis);
  }
  return questionBankInstance;
}
