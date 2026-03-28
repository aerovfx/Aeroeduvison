/**
 * GET /api/grading/dashboard
 * Get comprehensive dashboard metrics for grading system
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

/**
 * GET /api/grading/dashboard
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

    // Only teachers/admins can view dashboard
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only teachers can access dashboard' },
        { status: 403 }
      );
    }

    console.log(`📊 Loading dashboard for ${session.user.name}...`);

    // 2. Get time range filter
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || '7d'; // 7d, 30d, 90d, all

    const since = getTimeRangeDate(timeRange);

    // 3. Fetch all metrics in parallel
    const [
      queueMetrics,
      aiPerformanceMetrics,
      reviewerMetrics,
      systemHealthMetrics,
      subjectMetrics,
      trendMetrics,
    ] = await Promise.all([
      getQueueMetrics(since),
      getAIPerformanceMetrics(since),
      getReviewerMetrics(since),
      getSystemHealthMetrics(since),
      getSubjectMetrics(since),
      getTrendMetrics(since),
    ]);

    // 4. Response
    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        generatedAt: new Date(),
        queue: queueMetrics,
        aiPerformance: aiPerformanceMetrics,
        reviewers: reviewerMetrics,
        health: systemHealthMetrics,
        subjects: subjectMetrics,
        trends: trendMetrics,
      },
    });

  } catch (error: any) {
    console.error('❌ Dashboard error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to load dashboard',
      },
      { status: 500 }
    );
  }
}

/**
 * Get queue metrics
 */
async function getQueueMetrics(since: Date) {
  const [total, pending, assigned, inReview, completed, disputed] = await Promise.all([
    prisma.gradedSheet.count({ where: { createdAt: { gte: since } } }),
    prisma.gradedSheet.count({ where: { reviewed: false, createdAt: { gte: since } } }),
    prisma.gradedSheet.count({ where: { status: 'scanning', createdAt: { gte: since } } }),
    prisma.gradedSheet.count({ where: { status: 'scanned', reviewed: false, createdAt: { gte: since } } }),
    prisma.gradedSheet.count({ where: { reviewed: true, createdAt: { gte: since } } }),
    prisma.gradedSheet.count({ where: { status: 'error', createdAt: { gte: since } } }),
  ]);

  // Get priority distribution from pending tasks
  const pendingSubmissions = await prisma.gradedSheet.findMany({
    where: {
      reviewed: false,
      createdAt: { gte: since },
    },
    select: {
      totalScore: true,
      createdAt: true,
    },
  });

  const byPriority = {
    critical: pendingSubmissions.filter(s =>
      (s.totalScore || 0) >= 9.5 || (s.totalScore || 0) <= 1
    ).length,
    high: pendingSubmissions.filter(s =>
      (s.totalScore || 0) >= 7 && (s.totalScore || 0) < 9.5
    ).length,
    medium: pendingSubmissions.filter(s =>
      (s.totalScore || 0) >= 5 && (s.totalScore || 0) < 7
    ).length,
    low: pendingSubmissions.filter(s =>
      (s.totalScore || 0) < 5
    ).length,
  };

  // Calculate average wait time
  const averageWaitTime = pendingSubmissions.length > 0
    ? pendingSubmissions.reduce((sum, s) =>
        sum + (Date.now() - new Date(s.createdAt).getTime()), 0
      ) / pendingSubmissions.length / 1000 // seconds
    : 0;

  const oldestPendingAge = pendingSubmissions.length > 0
    ? Math.max(...pendingSubmissions.map(s =>
        (Date.now() - new Date(s.createdAt).getTime()) / 1000
      ))
    : 0;

  return {
    total,
    pending,
    assigned,
    inReview,
    completed,
    disputed,
    byPriority,
    averageWaitTime: Math.round(averageWaitTime),
    oldestPendingAge: Math.round(oldestPendingAge),
  };
}

/**
 * Get AI performance metrics
 */
async function getAIPerformanceMetrics(since: Date) {
  const submissions = await prisma.gradedSheet.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      totalScore: true,
      reviewed: true,
    },
  });

  const averageConfidence = submissions.length > 0
    ? submissions.filter(s => s.reviewed).length / submissions.length
    : 0;

  const reviewRate = submissions.length > 0
    ? (submissions.filter(s => !s.reviewed).length / submissions.length) * 100
    : 0;

  // Calculate agreement rate with humans (graded sheets are human reviewed)
  const reviewedSubmissions = submissions.filter(s => s.reviewed);
  const agreementRate = reviewedSubmissions.length > 0
    ? (reviewedSubmissions.length / submissions.length) * 100
    : 0;

  // Get from Redis for more detailed stats
  let totalGraded = 0;
  let totalReviewRequired = 0;
  try {
    totalGraded = parseInt(await getRedis().get('grading:total') || '0');
    totalReviewRequired = parseInt(await getRedis().get('grading:review_required') || '0');
  } catch (error) {
    console.error('Failed to get Redis metrics:', error);
  }

  return {
    averageConfidence: parseFloat(averageConfidence.toFixed(2)),
    reviewRate: parseFloat(reviewRate.toFixed(1)),
    agreementRate: parseFloat(agreementRate.toFixed(1)),
    totalGraded,
    totalReviewRequired,
    accuracyTrend: calculateAccuracyTrend(submissions),
    commonIssues: identifyCommonIssues(submissions),
  };
}

/**
 * Get reviewer metrics
 */
async function getReviewerMetrics(since: Date) {
  const reviewers = await prisma.user.findMany({
    where: {
      role: { in: ['TEACHER', 'ADMIN'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const total = reviewers.length;

  // Get current tasks for each reviewer
  const reviewerStats = await Promise.all(
    reviewers.map(async (r) => {
      const totalReviews = await prisma.gradedSheet.count({
        where: {
          teacherId: r.id,
          updatedAt: { gte: since },
          reviewed: true,
        },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const reviewsToday = await prisma.gradedSheet.count({
        where: {
          teacherId: r.id,
          updatedAt: { gte: todayStart },
          reviewed: true,
        },
      });

      // Get agreement rate from Redis
      let agreementWithAI = 0;
      let accuracy = 0;
      try {
        const statsKey = `review:stats:${r.id}`;
        const statsData = await getRedis().get(statsKey);
        if (statsData) {
          const stats = JSON.parse(statsData);
          agreementWithAI = stats.agreementWithAI || 0;
          accuracy = stats.accuracy || 0;
        }
      } catch (error) {
        // Ignore
      }

      return {
        id: r.id,
        name: r.name || 'Unknown',
        totalReviews,
        reviewsToday,
        agreementWithAI,
        accuracy,
      };
    })
  );

  const topPerformers = reviewerStats
    .filter(r => r.totalReviews >= 5)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);

  const needsTraining = reviewerStats
    .filter(r => r.accuracy < 70 && r.totalReviews >= 10)
    .map(r => r.id);

  const available = reviewerStats.filter(r => r.reviewsToday < 20).length;
  const busy = reviewerStats.filter(r => r.reviewsToday >= 20 && r.reviewsToday < 50).length;
  const offline = total - available - busy;

  return {
    total,
    available,
    busy,
    offline,
    topPerformers,
    needsTraining,
    allReviewers: reviewerStats,
  };
}

/**
 * Get system health metrics
 */
async function getSystemHealthMetrics(since: Date) {
  const pendingReviews = await prisma.gradedSheet.count({
    where: {
      reviewed: false,
      createdAt: { gte: since },
    },
  });

  // SLA: 24 hours for review
  const slaThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalWithinSLA, totalCompleted] = await Promise.all([
    prisma.gradedSheet.count({
      where: {
        reviewed: true,
        createdAt: { gte: since },
        updatedAt: { gte: slaThreshold },
      },
    }),
    prisma.gradedSheet.count({
      where: {
        reviewed: true,
        createdAt: { gte: since },
      },
    }),
  ]);

  const slaCompliance = totalCompleted > 0
    ? (totalWithinSLA / totalCompleted) * 100
    : 100;

  // Calculate average turnaround
  const completedSubmissions = await prisma.gradedSheet.findMany({
    where: {
      reviewed: true,
      createdAt: { gte: since },
    },
    select: {
      createdAt: true,
      updatedAt: true,
    },
  });

  const averageTurnaround = completedSubmissions.length > 0
    ? completedSubmissions.reduce((sum, s) =>
        sum + (new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime()), 0
      ) / completedSubmissions.length / 1000 // seconds
    : 0;

  return {
    reviewBacklog: pendingReviews,
    slaCompliance: parseFloat(slaCompliance.toFixed(1)),
    averageTurnaround: Math.round(averageTurnaround),
    status: pendingReviews < 50 ? 'healthy' : pendingReviews < 100 ? 'warning' : 'critical',
  };
}

/**
 * Get subject metrics
 */
async function getSubjectMetrics(since: Date) {
  const submissions = await prisma.gradedSheet.findMany({
    where: {
      createdAt: { gte: since },
      reviewed: true,
    },
    select: {
      totalScore: true,
      reviewed: true,
    },
  });

  const bySubject: Record<string, {
    count: number;
    averageScore: number;
    averageConfidence: number;
    reviewRate: number;
  }> = {
    'general': {
      count: 0,
      averageScore: 0,
      averageConfidence: 0,
      reviewRate: 0,
    }
  };

  for (const s of submissions) {
    const subject = 'general';

    if (!bySubject[subject]) {
      bySubject[subject] = {
        count: 0,
        averageScore: 0,
        averageConfidence: 0,
        reviewRate: 0,
      };
    }

    bySubject[subject].count++;
    bySubject[subject].averageScore += s.totalScore || 0;
    bySubject[subject].averageConfidence += s.reviewed ? 1 : 0;
    if (s.reviewed) {
      bySubject[subject].reviewRate++;
    }
  }

  // Calculate averages
  for (const subject in bySubject) {
    const count = bySubject[subject].count;
    if (count > 0) {
      bySubject[subject].averageScore /= count;
      bySubject[subject].averageConfidence /= count;
      bySubject[subject].reviewRate = (bySubject[subject].reviewRate / count) * 100;
    }
  }

  return bySubject;
}

/**
 * Get trend metrics
 */
async function getTrendMetrics(since: Date) {
  // Get submissions grouped by day
  const submissions = await prisma.gradedSheet.findMany({
    where: {
      createdAt: { gte: since },
    },
    select: {
      createdAt: true,
      totalScore: true,
      reviewed: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by day
  const byDay: Record<string, {
    count: number;
    averageScore: number;
    averageConfidence: number;
    graded: number;
  }> = {};

  for (const s of submissions) {
    const day = new Date(s.createdAt).toISOString().split('T')[0];

    if (!byDay[day]) {
      byDay[day] = {
        count: 0,
        averageScore: 0,
        averageConfidence: 0,
        graded: 0,
      };
    }

    byDay[day].count++;
    byDay[day].averageScore += s.totalScore || 0;
    byDay[day].averageConfidence += s.reviewed ? 1 : 0;
    if (s.reviewed) {
      byDay[day].graded++;
    }
  }

  // Calculate averages
  const trends = Object.entries(byDay).map(([date, data]) => ({
    date,
    count: data.count,
    averageScore: data.count > 0 ? data.averageScore / data.count : 0,
    averageConfidence: data.count > 0 ? data.averageConfidence / data.count : 0,
    gradedRate: data.count > 0 ? (data.graded / data.count) * 100 : 0,
  }));

  return trends;
}

/**
 * Helper: Get time range date
 */
function getTimeRangeDate(range: string): Date {
  const now = new Date();

  switch (range) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case 'all':
      return new Date(0); // Beginning of time
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * Helper: Calculate accuracy trend
 */
function calculateAccuracyTrend(submissions: any[]): 'improving' | 'stable' | 'declining' {
  if (submissions.length < 10) return 'stable';

  const recent = submissions.slice(-Math.floor(submissions.length / 3));
  const older = submissions.slice(0, Math.floor(submissions.length / 3));

  const recentAvg = recent.reduce((sum, s) => sum + (s.totalScore || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + (s.totalScore || 0), 0) / older.length;

  if (recentAvg > olderAvg + 0.5) return 'improving';
  if (recentAvg < olderAvg - 0.5) return 'declining';
  return 'stable';
}

/**
 * Helper: Identify common issues
 */
function identifyCommonIssues(submissions: any[]): string[] {
  const issues: string[] = [];

  const lowScores = submissions.filter(s => (s.totalScore || 0) < 3).length;
  if (lowScores > submissions.length * 0.2) {
    issues.push(`High number of low scores (${((lowScores / submissions.length) * 100).toFixed(0)}%)`);
  }

  const unreviewedSubmissions = submissions.filter(s => !s.reviewed);
  if (unreviewedSubmissions.length > submissions.length * 0.2) {
    issues.push(`High percentage of unreviewed sheets (${((unreviewedSubmissions.length / submissions.length) * 100).toFixed(0)}%)`);
  }

  return issues.length > 0 ? issues : ['No major issues detected'];
}
