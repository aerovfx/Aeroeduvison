/**
 * POST /api/grading/review
 * Submit human review for a graded assignment
 * GET /api/grading/review
 * Get review tasks for current reviewer
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createEnhancedHumanReviewWorkflow } from '@/lib/ai/services/enhanced-human-review-workflow';
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

const reviewWorkflow = createEnhancedHumanReviewWorkflow(getRedis(), 'intelligent');
const validator = createEnhancedGradingValidator();

/**
 * POST /api/grading/review
 * Submit human review
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

    // Only teachers can review
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can submit reviews' },
        { status: 403 }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const {
      submissionId,
      score,
      criteriaScores,
      feedback,
      confidence,
      notes,
      timeSpent,
    } = body;

    // 3. Validation
    if (!submissionId || score === undefined || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionId, score, feedback' },
        { status: 400 }
      );
    }

    if (score < 0 || score > 10) {
      return NextResponse.json(
        { error: 'Score must be between 0 and 10' },
        { status: 400 }
      );
    }

    // 4. Fetch graded sheet
    const submission = await prisma.gradedSheet.findUnique({
      where: { id: submissionId },
      include: {
        answerKey: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Graded sheet not found' },
        { status: 404 }
      );
    }

    console.log(`👤 ${session.user.name} reviewing sheet ${submissionId}...`);

    // 5. Compare human vs sheet
    const humanGrade = {
      submissionId,
      teacherId: session.user.id,
      teacherName: session.user.name || 'Unknown',
      score,
      criteriaScores,
      feedback,
      gradedAt: new Date(),
      timeSpent: timeSpent || 0,
    };

    const comparison = validator.validateAgainstHuman(
      submissionId,
      {
        totalScore: submission.totalScore,
        percentage: submission.percentage,
        grade: submission.gradeLabel,
        criteriaScores: [],
        overallFeedback: feedback || '',
        strengths: [],
        improvements: [],
        suggestions: [],
        confidence: 0.8,
      },
      humanGrade
    );

    console.log(`📊 Human vs Sheet: ${comparison.agreement.overall} (Δ${comparison.scoreDifference.toFixed(1)})`);

    // 7. Update graded sheet
    const updatedSubmission = await prisma.gradedSheet.update({
      where: { id: submissionId },
      data: {
        totalScore: score,
        gradeLabel: scoreToGrade(score),
        reviewed: true,
        essayNotes: {
          feedback,
          notes,
          ...((submission.essayNotes as any) || {}),
        } as any,
        updatedAt: new Date(),
      },
    });

    // 8. Submit review to workflow (for stats tracking)
    try {
      // Log the review
      await logReviewComparison({
        submissionId,
        answerKeyId: submission.answerKeyId,
        subject: 'general',
        teacherId: session.user.id,
        sheetScore: submission.totalScore,
        humanScore: score,
        difference: comparison.scoreDifference,
        agreement: comparison.agreement.overall,
        confidence: 0.8,
        timeSpent: timeSpent || 0,
      });
    } catch (error) {
      console.error('Failed to log review comparison:', error);
    }

    // 9. Response
    return NextResponse.json({
      success: true,
      data: {
        sheetId: updatedSubmission.id,
        humanScore: score,
        sheetScore: submission.totalScore,
        comparison: {
          scoreDifference: comparison.scoreDifference,
          percentageDifference: comparison.percentageDifference,
          agreement: comparison.agreement.overall,
          agreementScore: comparison.agreement.score,
          withinTolerance: comparison.withinTolerance,
          gradeLevelMatch: comparison.gradeLevelMatch,
          feedbackSimilarity: comparison.feedback.similarity,
        },
        reviewed: updatedSubmission.reviewed,
        updatedAt: updatedSubmission.updatedAt,
      },
    });

  } catch (error: any) {
    console.error('❌ Submit review error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to submit review',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grading/review
 * Get review tasks for current reviewer
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
        { error: 'Forbidden: Only teachers can access reviews' },
        { status: 403 }
      );
    }

    // 2. Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'assigned' | 'completed' | null;
    const priority = searchParams.get('priority') as 'critical' | 'high' | 'medium' | 'low' | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    // 3. Fetch pending review submissions
    const whereClause: any = {
      status: status || 'PENDING_REVIEW',
    };

    // If status filter is provided and not pending_review, look for reviewed submissions
    if (status === 'completed') {
      whereClause.status = 'GRADED';
      whereClause.reviewedBy = session.user.id;
    }

    const submissions = await prisma.gradedSheet.findMany({
      where: whereClause,
      include: {
        answerKey: true,
      },
      orderBy: [
        { createdAt: 'asc' }, // Oldest first
      ],
      take: limit,
    });

    // 4. Format as review tasks
    const reviewTasks = submissions.map(s => {
      // Calculate priority based on score
      let taskPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if ((s.totalScore || 0) >= 9.5 || (s.totalScore || 0) <= 1) {
        taskPriority = 'critical';
      } else if ((s.totalScore || 0) >= 7 && (s.totalScore || 0) < 9.5) {
        taskPriority = 'high';
      } else if ((s.totalScore || 0) >= 5 && (s.totalScore || 0) < 7) {
        taskPriority = 'medium';
      } else {
        taskPriority = 'low';
      }

      return {
        id: s.id,
        sheetId: s.id,
        studentName: s.studentName,
        studentId: s.studentId,
        answerKey: {
          id: s.answerKey.id,
          examName: s.answerKey.examName,
          examCode: s.answerKey.examCode,
        },
        detectedAnswers: s.detectedAnswers,
        score: s.totalScore,
        grade: s.gradeLabel || scoreToGrade(s.totalScore),
        reviewed: s.reviewed,
        priority: taskPriority,
        status: s.status,
        createdAt: s.createdAt,
        waitTime: Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 1000), // seconds
      };
    });

    // 5. Filter by priority if specified
    const filteredTasks = priority
      ? reviewTasks.filter(t => t.priority === priority)
      : reviewTasks;

    // 6. Get reviewer stats
    const stats = await getReviewerStats(session.user.id);

    // 7. Response
    return NextResponse.json({
      success: true,
      data: {
        tasks: filteredTasks,
        stats,
        summary: {
          total: filteredTasks.length,
          byPriority: {
            critical: filteredTasks.filter(t => t.priority === 'critical').length,
            high: filteredTasks.filter(t => t.priority === 'high').length,
            medium: filteredTasks.filter(t => t.priority === 'medium').length,
            low: filteredTasks.filter(t => t.priority === 'low').length,
          },
          averageWaitTime: filteredTasks.length > 0
            ? filteredTasks.reduce((sum, t) => sum + t.waitTime, 0) / filteredTasks.length
            : 0,
          oldestWaitTime: filteredTasks.length > 0
            ? Math.max(...filteredTasks.map(t => t.waitTime))
            : 0,
        },
      },
    });

  } catch (error: any) {
    console.error('❌ Get review tasks error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to fetch review tasks',
      },
      { status: 500 }
    );
  }
}

/**
 * Get reviewer stats
 */
async function getReviewerStats(reviewerId: string) {
  const totalReviews = await prisma.gradedSheet.count({
    where: {
      teacherId: reviewerId,
      reviewed: true,
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const reviewsToday = await prisma.gradedSheet.count({
    where: {
      teacherId: reviewerId,
      reviewed: true,
      updatedAt: {
        gte: todayStart,
      },
    },
  });

  const pendingTasks = await prisma.gradedSheet.count({
    where: {
      reviewed: false,
    },
  });

  // Calculate agreement rate from Redis
  let agreementRate = 0;
  try {
    const statsKey = `review:stats:${reviewerId}`;
    const statsData = await getRedis().get(statsKey);
    if (statsData) {
      const stats = JSON.parse(statsData);
      agreementRate = stats.agreementWithAI || 0;
    }
  } catch (error) {
    console.error('Failed to get agreement rate:', error);
  }

  return {
    totalReviews,
    reviewsToday,
    pendingTasks,
    agreementRate,
  };
}

/**
 * Log review comparison for analytics
 */
async function logReviewComparison(data: {
  submissionId: string;
  answerKeyId: string;
  subject: string;
  teacherId: string;
  sheetScore: number;
  humanScore: number;
  difference: number;
  agreement: string;
  confidence: number;
  timeSpent: number;
}) {
  try {
    const key = `review:comparison:${Date.now()}:${data.submissionId}`;
    await getRedis().setex(key, 60 * 60 * 24 * 90, JSON.stringify(data)); // 90 days

    // Update global stats
    await getRedis().incr('review:total');
    await getRedis().hincrbyfloat('review:differences', 'total', data.difference);
    await getRedis().hincrby('review:differences', 'count', 1);

    // Update subject stats
    const subjectKey = `review:subject:${data.subject}`;
    await getRedis().hincrbyfloat(subjectKey, 'total_diff', data.difference);
    await getRedis().hincrby(subjectKey, 'count', 1);

  } catch (error) {
    console.error('Failed to log review comparison:', error);
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
