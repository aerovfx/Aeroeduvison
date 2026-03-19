/**
 * POST /api/grading/batch
 * Batch grade multiple submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator';
import { createEnhancedGradingService } from '@/lib/ai/services/enhanced-smart-grading';
import { createEnhancedGradingValidator } from '@/lib/ai/services/enhanced-grading-validator';
import { db as prisma } from '@/lib/db';
import Redis from 'ioredis';

let _redis: InstanceType<typeof Redis> | null = null;
function getRedis() {
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });
    _redis.on('error', () => {});
  }
  return _redis;
}

const aiOrchestrator = new AIServiceOrchestrator({
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },
  redis: getRedis(),
});

const gradingService = createEnhancedGradingService(aiOrchestrator);
const validator = createEnhancedGradingValidator();

/**
 * Batch Request Interface
 */
interface BatchGradingRequest {
  assignmentId: string;
  submissions: Array<{
    studentId: string;
    submission: string;
  }>;
  subject: string;
  gradeLevel?: string;
  assignmentType?: 'essay' | 'math' | 'science' | 'code';
}

/**
 * POST /api/grading/batch
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only teachers can batch grade
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can batch grade' },
        { status: 403 }
      );
    }

    // 2. Parse request
    const body: BatchGradingRequest = await req.json();
    const { assignmentId, submissions, subject, gradeLevel, assignmentType } = body;

    // 3. Validation
    if (!assignmentId || !submissions || submissions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (submissions.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 submissions per batch' },
        { status: 400 }
      );
    }

    // Check assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    console.log(`🎯 Batch grading ${submissions.length} submissions...`);
    const startTime = Date.now();

    // 4. Batch grade
    const batchResult = await gradingService.gradeBatch({
      submissions: submissions.map(s => ({
        id: s.studentId,
        submission: s.submission,
      })),
      subject,
      grade: gradeLevel || assignment.course.gradeLevel || '10',
      assignmentType: assignmentType || 'essay',
      maxScore: 10,
      rubricId: assignment.rubricId || undefined,
    });

    const gradingTime = Date.now() - startTime;
    console.log(`✅ Batch grading completed in ${gradingTime}ms`);

    // 5. Check consistency
    const consistencyReport = await validator.checkConsistency(
      batchResult.results.map((r, i) => ({
        submissionId: submissions[i].studentId,
        result: r,
        submission: submissions[i].submission,
      }))
    );

    console.log(`📊 Consistency Score: ${consistencyReport.consistency.score.toFixed(2)}`);
    console.log(`📊 Outliers: ${consistencyReport.outliers.length}`);

    // 6. Save to database
    const savedSubmissions = await Promise.all(
      submissions.map(async (sub, index) => {
        const result = batchResult.results[index];
        const isOutlier = consistencyReport.outliers.includes(sub.studentId);

        const submissionData = {
          assignmentId,
          studentId: sub.studentId,
          content: sub.submission,
          status: result.confidence < 0.7 || isOutlier ? 'PENDING_REVIEW' : 'GRADED',
          score: result.totalScore,
          feedback: result.overallFeedback,
          aiGradingResult: result as any,
          confidence: result.confidence,
          gradedAt: result.confidence >= 0.7 && !isOutlier ? new Date() : null,
          submittedAt: new Date(),
        };

        // Check if exists
        const existing = await prisma.submission.findFirst({
          where: {
            assignmentId,
            studentId: sub.studentId,
          },
        });

        return existing
          ? await prisma.submission.update({
              where: { id: existing.id },
              data: submissionData,
            })
          : await prisma.submission.create({
              data: submissionData,
            });
      })
    );

    // 7. Log batch metrics
    await logBatchMetrics({
      assignmentId,
      teacherId: session.user.id,
      count: submissions.length,
      averageScore: batchResult.summary.averageScore,
      averageConfidence: batchResult.summary.averageConfidence,
      gradingTime,
      consistencyScore: consistencyReport.consistency.score,
      outlierCount: consistencyReport.outliers.length,
    });

    // 8. Response
    return NextResponse.json({
      success: true,
      data: {
        totalGraded: batchResult.results.length,
        successCount: batchResult.summary.successCount,
        failureCount: batchResult.summary.failureCount,
        summary: {
          averageScore: batchResult.summary.averageScore,
          highestScore: batchResult.summary.highestScore,
          lowestScore: batchResult.summary.lowestScore,
          averageConfidence: batchResult.summary.averageConfidence,
        },
        consistency: {
          score: consistencyReport.consistency.score,
          isConsistent: consistencyReport.consistency.isConsistent,
          coefficientOfVariation: consistencyReport.consistency.coefficientOfVariation,
        },
        outliers: consistencyReport.outliers.map(id => {
          const detail = consistencyReport.outlierDetails.find(d => d.submissionId === id);
          return {
            studentId: id,
            reason: detail?.reason,
            zScore: detail?.zScore,
          };
        }),
        distribution: consistencyReport.distribution,
        gradingTime,
        recommendations: consistencyReport.recommendations,
        submissions: savedSubmissions.map((s, i) => ({
          submissionId: s.id,
          studentId: s.studentId,
          score: s.score,
          grade: scoreToGrade(s.score || 0),
          confidence: s.confidence,
          status: s.status,
          needsReview: s.status === 'PENDING_REVIEW',
        })),
      },
    });

  } catch (error: any) {
    console.error('❌ Batch grading error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to batch grade submissions',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grading/batch?assignmentId=xxx
 * Get all submissions for an assignment (teacher only)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authentication & Authorization
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can view all submissions' },
        { status: 403 }
      );
    }

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing assignmentId parameter' },
        { status: 400 }
      );
    }

    // 3. Fetch submissions
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // 4. Calculate statistics
    const gradedSubmissions = submissions.filter(s => s.status === 'GRADED');
    const scores = gradedSubmissions.map(s => s.score || 0);

    const statistics = scores.length > 0 ? {
      total: submissions.length,
      graded: gradedSubmissions.length,
      pending: submissions.filter(s => s.status === 'PENDING_REVIEW').length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      median: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)],
      standardDeviation: Math.sqrt(
        scores.reduce((sum, score) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return sum + Math.pow(score - avg, 2);
        }, 0) / scores.length
      ),
    } : null;

    // 5. Response
    return NextResponse.json({
      success: true,
      data: {
        submissions: submissions.map(s => ({
          id: s.id,
          student: s.student,
          score: s.score,
          grade: s.score ? scoreToGrade(s.score) : null,
          confidence: s.confidence,
          status: s.status,
          submittedAt: s.submittedAt,
          gradedAt: s.gradedAt,
        })),
        statistics,
      },
    });

  } catch (error: any) {
    console.error('❌ Get batch submissions error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to fetch submissions',
      },
      { status: 500 }
    );
  }
}

/**
 * Log batch grading metrics
 */
async function logBatchMetrics(metrics: {
  assignmentId: string;
  teacherId: string;
  count: number;
  averageScore: number;
  averageConfidence: number;
  gradingTime: number;
  consistencyScore: number;
  outlierCount: number;
}) {
  try {
    const metricsKey = `grading:batch:${Date.now()}`;
    await getRedis().setex(metricsKey, 60 * 60 * 24 * 30, JSON.stringify(metrics));

    await getRedis().incr('grading:batch:total');
    await getRedis().incrby('grading:batch:submissions', metrics.count);

  } catch (error) {
    console.error('Failed to log batch metrics:', error);
  }
}

/**
 * Helper: Score to grade
 */
function scoreToGrade(score: number): string {
  if (score >= 9) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5) return 'C';
  if (score >= 3) return 'D';
  return 'F';
}
