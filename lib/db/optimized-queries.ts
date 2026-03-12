/**
 * Database Query Optimization
 * 
 * Optimized queries with proper indexing and caching
 */

import { db } from '@/lib/db';
import { getCachedQuestion, cacheQuestion, getCachedExam, cacheExam } from '@/lib/cache/redis-cache';

export async function getExamWithQuestions(examId: string) {
  // Check cache first
  const cached = await getCachedExam(examId);
  if (cached) {
    return cached;
  }

  // Query database with optimized includes
  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        orderBy: { position: 'asc' },
        select: {
          question_id: true,
          position: true,
          assigned_score: true,
          question_type: true,
        },
      },
    },
  });

  // Cache the result
  if (exam) {
    await cacheExam(examId, exam);
  }

  return exam;
}

export async function findAlternativeQuestions(
  questionId: string,
  constraints: {
    topic_id?: string;
    cognitive_level?: string;
    difficulty_min?: number;
    difficulty_max?: number;
  },
  limit = 5
) {
  // Build optimized query with indexed fields
  const where: any = {
    NOT: { id: questionId },
  };

  if (constraints.topic_id) {
    where.topic_id = constraints.topic_id;
  }

  if (constraints.cognitive_level) {
    where.cognitive_level = constraints.cognitive_level;
  }

  if (constraints.difficulty_min !== undefined || constraints.difficulty_max !== undefined) {
    where.difficulty = {};
    if (constraints.difficulty_min !== undefined) {
      where.difficulty.gte = constraints.difficulty_min;
    }
    if (constraints.difficulty_max !== undefined) {
      where.difficulty.lte = constraints.difficulty_max;
    }
  }

  // Use indexed query with limit
  const questions = await db.question.findMany({
    where,
    orderBy: {
      quality_score: 'desc',
    },
    take: limit,
    select: {
      id: true,
      topic_id: true,
      cognitive_level: true,
      difficulty: true,
      quality_score: true,
    },
  });

  // Cache each question
  for (const q of questions) {
    await cacheQuestion(q.id, q);
  }

  return questions.map(q => ({
    question_id: q.id,
    topic_name: q.topic_id,
    cognitive_level: q.cognitive_level,
    difficulty: q.difficulty,
    similarity_score: q.quality_score,
  }));
}

export async function getMatrixWithDetails(matrixId: string) {
  // Check cache
  const cached = await getCachedQuestion(`matrix:${matrixId}`);
  if (cached) {
    return cached;
  }

  const matrix = await db.examMatrix.findUnique({
    where: { id: matrixId },
    include: {
      topics: true,
      cognitiveLevels: true,
    },
  });

  // Cache the result
  if (matrix) {
    await cacheQuestion(`matrix:${matrixId}`, matrix, 7200);
  }

  return matrix;
}

export async function getTeacherExamStats(teacherId: string) {
  const stats = await Promise.all([
    db.exam.count({
      where: { created_by: teacherId },
    }),
    db.exam.aggregate({
      where: { created_by: teacherId },
      _avg: {
        total_score: true,
      },
    }),
    db.exam.findMany({
      where: { created_by: teacherId },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        created_at: true,
        questions: {
          select: {
            question_id: true,
          },
        },
      },
    }),
  ]);

  return {
    totalExams: stats[0],
    avgScore: stats[1]._avg.total_score,
    recentExams: stats[2],
  };
}

export async function bulkCacheQuestions(questionIds: string[]) {
  const questions = await db.question.findMany({
    where: {
      id: { in: questionIds },
    },
  });

  for (const q of questions) {
    await cacheQuestion(q.id, q);
  }

  return questions.length;
}

export async function invalidateExamCache(examId: string) {
  await Promise.all([
    // Invalidate exam cache
    fetch(`/api/cache/invalidate?key=exam:${examId}`, { method: 'DELETE' }),
    // Invalidate related question caches
    db.examQuestion.findMany({
      where: { exam_id: examId },
      select: { question_id: true },
    }).then(questions => 
      Promise.all(
        questions.map(q => 
          fetch(`/api/cache/invalidate?key=question:${q.question_id}`, { method: 'DELETE' })
        )
      )
    ),
  ]);
}
