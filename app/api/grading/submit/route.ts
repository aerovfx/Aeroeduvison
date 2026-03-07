/**
 * POST /api/grading/submit
 * Submit a student assignment for AI grading
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AIServiceOrchestrator } from '@/lib/ai/ai-service-orchestrator';
import { createEnhancedGradingService } from '@/lib/ai/services/enhanced-smart-grading';
import { createEnhancedGradingValidator } from '@/lib/ai/services/enhanced-grading-validator';
import { createEnhancedHumanReviewWorkflow } from '@/lib/ai/services/enhanced-human-review-workflow';
import { db as prisma } from '@/lib/db';
import Redis from 'ioredis';

// Initialize services
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
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
  redis,
});

const gradingService = createEnhancedGradingService(aiOrchestrator);
const validator = createEnhancedGradingValidator();
const reviewWorkflow = createEnhancedHumanReviewWorkflow(redis, 'intelligent');

/**
 * Request Body Interface
 */
interface GradingSubmitRequest {
  assignmentId: string;
  submission: string;
  subject: string;
  gradeLevel?: string;
  assignmentType?: 'essay' | 'math' | 'science' | 'code';
  context?: string;
}

/**
 * POST /api/grading/submit
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: GradingSubmitRequest = await req.json();
    const { assignmentId, submission, subject, gradeLevel, assignmentType, context } = body;

    // 3. Validation
    if (!assignmentId || !submission || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: assignmentId, submission, subject' },
        { status: 400 }
      );
    }

    // Check if assignment exists
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

    // 4. Check for existing submission
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId,
        studentId: session.user.id,
      },
    });

    // 5. Perform AI grading
    console.log(`🎯 Grading submission for ${session.user.name}...`);
    const startTime = Date.now();

    const gradingResult = await gradingService.gradeSingle({
      submission,
      subject,
      grade: gradeLevel || assignment.course.gradeLevel || '10',
      assignmentType: assignmentType || 'essay',
      maxScore: 10,
      rubricId: assignment.rubricId || undefined,
      additionalContext: context,
    });

    const gradingTime = Date.now() - startTime;
    console.log(`✅ Grading completed in ${gradingTime}ms`);

    // 6. Validate result
    const historicalGrades = await prisma.submission.findMany({
      where: {
        assignmentId,
        status: 'GRADED',
      },
      select: {
        score: true,
      },
    });

    let outlierAnalysis = null;
    if (historicalGrades.length >= 10) {
      const historicalResults = historicalGrades.map(g => ({
        totalScore: g.score || 0,
        percentage: (g.score || 0) * 10,
        grade: validator['scoreToGrade'](g.score || 0),
        confidence: 0.8,
        criteriaScores: [],
        overallFeedback: '',
        strengths: [],
        improvements: [],
        suggestions: [],
      }));

      outlierAnalysis = validator.detectOutlier(
        gradingResult,
        historicalResults as any
      );
    }

    // 7. Determine if needs human review
    const needsReview =
      gradingResult.confidence < 0.7 ||
      (outlierAnalysis?.isOutlier && outlierAnalysis.severity === 'severe') ||
      gradingResult.totalScore >= 9.5 ||
      gradingResult.totalScore <= 2;

    // 8. Save to database
    const submissionData = {
      assignmentId,
      studentId: session.user.id,
      content: submission,
      status: needsReview ? 'PENDING_REVIEW' : 'GRADED',
      score: gradingResult.totalScore,
      feedback: gradingResult.overallFeedback,
      aiGradingResult: gradingResult as any,
      confidence: gradingResult.confidence,
      gradedAt: needsReview ? null : new Date(),
      submittedAt: new Date(),
    };

    const savedSubmission = existingSubmission
      ? await prisma.submission.update({
          where: { id: existingSubmission.id },
          data: submissionData,
        })
      : await prisma.submission.create({
          data: submissionData,
        });

    // 9. Add to review queue if needed
    let reviewTaskId = null;
    if (needsReview) {
      const reviewTask = await reviewWorkflow.addTaskForReview({
        submissionId: savedSubmission.id,
        studentId: session.user.id,
        studentName: session.user.name || 'Unknown',
        assignmentId,
        assignmentName: assignment.title,
        subject,
        gradeLevel: gradeLevel || '10',
        question: assignment.description || '',
        studentAnswer: submission,
        aiGrading: gradingResult,
        aiConfidence: gradingResult.confidence,
        priority: 'high',
      });

      reviewTaskId = reviewTask.id;

      console.log(`📋 Added to review queue: ${reviewTaskId}`);
    }

    // 10. Log metrics
    await logGradingMetrics({
      submissionId: savedSubmission.id,
      assignmentId,
      studentId: session.user.id,
      subject,
      score: gradingResult.totalScore,
      confidence: gradingResult.confidence,
      gradingTime,
      needsReview,
      isOutlier: outlierAnalysis?.isOutlier || false,
    });

    // 11. Response
    return NextResponse.json({
      success: true,
      data: {
        submissionId: savedSubmission.id,
        score: gradingResult.totalScore,
        percentage: gradingResult.percentage,
        grade: gradingResult.grade,
        confidence: gradingResult.confidence,
        feedback: {
          summary: gradingResult.overallFeedback,
          strengths: gradingResult.strengths,
          improvements: gradingResult.improvements,
          suggestions: gradingResult.suggestions,
        },
        criteriaScores: gradingResult.criteriaScores,
        needsReview,
        reviewTaskId,
        status: savedSubmission.status,
        gradingTime,
        outlierAnalysis: outlierAnalysis ? {
          isOutlier: outlierAnalysis.isOutlier,
          severity: outlierAnalysis.severity,
          zScore: outlierAnalysis.zScore,
        } : null,
      },
    });

  } catch (error: any) {
    console.error('❌ Grading submission error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to grade submission',
      },
      { status: 500 }
    );
  }
}

/**
 * Log grading metrics for analytics
 */
async function logGradingMetrics(metrics: {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  subject: string;
  score: number;
  confidence: number;
  gradingTime: number;
  needsReview: boolean;
  isOutlier: boolean;
}) {
  try {
    // Store in Redis for real-time analytics
    const metricsKey = `grading:metrics:${Date.now()}`;
    await redis.setex(metricsKey, 60 * 60 * 24 * 30, JSON.stringify(metrics)); // 30 days

    // Update counters
    await redis.incr('grading:total');
    if (metrics.needsReview) {
      await redis.incr('grading:review_required');
    }
    if (metrics.isOutlier) {
      await redis.incr('grading:outliers');
    }

    // Update subject stats
    const subjectKey = `grading:subject:${metrics.subject}`;
    await redis.hincrby(subjectKey, 'count', 1);
    await redis.hincrbyfloat(subjectKey, 'total_score', metrics.score);
    await redis.hincrbyfloat(subjectKey, 'total_confidence', metrics.confidence);
    await redis.hincrbyfloat(subjectKey, 'total_time', metrics.gradingTime);

  } catch (error) {
    console.error('Failed to log metrics:', error);
  }
}
