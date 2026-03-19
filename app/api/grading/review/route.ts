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

    // 4. Fetch submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    console.log(`👤 ${session.user.name} reviewing submission ${submissionId}...`);

    // 5. Get AI grading result
    const aiGrading = submission.aiGradingResult as any;

    if (!aiGrading) {
      return NextResponse.json(
        { error: 'AI grading result not found' },
        { status: 400 }
      );
    }

    // 6. Compare human vs AI
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
        totalScore: aiGrading.totalScore,
        percentage: aiGrading.percentage,
        grade: aiGrading.grade,
        criteriaScores: aiGrading.criteriaScores,
        overallFeedback: aiGrading.overallFeedback || submission.feedback || '',
        strengths: aiGrading.strengths || [],
        improvements: aiGrading.improvements || [],
        suggestions: aiGrading.suggestions || [],
        confidence: submission.confidence || 0,
      },
      humanGrade
    );

    console.log(`📊 Human vs AI: ${comparison.agreement.overall} (Δ${comparison.scoreDifference.toFixed(1)})`);

    // 7. Update submission
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback,
        status: 'GRADED',
        reviewedBy: session.user.id,
        reviewNotes: notes,
        gradedAt: new Date(),
        humanReviewData: {
          ...humanGrade,
          comparison,
        } as any,
      },
    });

    // 8. Submit review to workflow (for stats tracking)
    try {
      // This would integrate with the review workflow
      // For now, just log the review
      await logReviewComparison({
        submissionId,
        assignmentId: submission.assignmentId,
        subject: submission.assignment.course.subject || 'unknown',
        teacherId: session.user.id,
        aiScore: aiGrading.totalScore,
        humanScore: score,
        difference: comparison.scoreDifference,
        agreement: comparison.agreement.overall,
        confidence: submission.confidence || 0,
        timeSpent: timeSpent || 0,
      });
    } catch (error) {
      console.error('Failed to log review comparison:', error);
    }

    // 9. Response
    return NextResponse.json({
      success: true,
      data: {
        submissionId: updatedSubmission.id,
        humanScore: score,
        aiScore: aiGrading.totalScore,
        comparison: {
          scoreDifference: comparison.scoreDifference,
          percentageDifference: comparison.percentageDifference,
          agreement: comparison.agreement.overall,
          agreementScore: comparison.agreement.score,
          withinTolerance: comparison.withinTolerance,
          gradeLevelMatch: comparison.gradeLevelMatch,
          feedbackSimilarity: comparison.feedback.similarity,
        },
        status: updatedSubmission.status,
        gradedAt: updatedSubmission.gradedAt,
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

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { submittedAt: 'asc' }, // Oldest first
      ],
      take: limit,
    });

    // 4. Format as review tasks
    const reviewTasks = submissions.map(s => {
      const aiGrading = s.aiGradingResult as any;

      // Calculate priority based on confidence and score
      let taskPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if ((s.confidence || 0) < 0.5 || (s.score || 0) >= 9.5 || (s.score || 0) <= 1) {
        taskPriority = 'critical';
      } else if ((s.confidence || 0) < 0.7 || Math.abs((s.score || 5) - 5) < 1) {
        taskPriority = 'high';
      } else if ((s.confidence || 0) < 0.85) {
        taskPriority = 'medium';
      } else {
        taskPriority = 'low';
      }

      return {
        id: s.id,
        submissionId: s.id,
        student: s.student,
        assignment: {
          id: s.assignment.id,
          title: s.assignment.title,
          subject: s.assignment.course.subject,
          gradeLevel: s.assignment.course.gradeLevel,
        },
        content: s.content,
        aiGrading: {
          score: s.score,
          grade: s.score ? scoreToGrade(s.score) : null,
          confidence: s.confidence,
          feedback: s.feedback,
          criteriaScores: aiGrading?.criteriaScores || [],
        },
        priority: taskPriority,
        status: s.status,
        submittedAt: s.submittedAt,
        waitTime: Math.floor((Date.now() - new Date(s.submittedAt).getTime()) / 1000), // seconds
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
  const totalReviews = await prisma.submission.count({
    where: {
      reviewedBy: reviewerId,
      status: 'GRADED',
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const reviewsToday = await prisma.submission.count({
    where: {
      reviewedBy: reviewerId,
      status: 'GRADED',
      gradedAt: {
        gte: todayStart,
      },
    },
  });

  const pendingTasks = await prisma.submission.count({
    where: {
      status: 'PENDING_REVIEW',
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
  assignmentId: string;
  subject: string;
  teacherId: string;
  aiScore: number;
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
