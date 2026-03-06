/**
 * AI Analytics Dashboard API
 * 
 * Endpoints for monitoring AI usage, costs, and performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyticsTracker } from '@/lib/ai/analytics-tracker';
import { cacheManager } from '@/lib/ai/cache-manager';
import { loadBalancer } from '@/lib/ai/load-balancer';

export async function GET(req: NextRequest) {
  try {
    // Authentication - only ADMIN can view analytics
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only admins and teachers can view analytics' },
        { status: 403 }
      );
    }

    // Get comprehensive analytics
    const performanceMetrics = analyticsTracker.getPerformanceMetrics();
    const cacheStats = cacheManager.getStats();
    const popularQueries = cacheManager.getPopularQueries(10);
    const costBreakdown = analyticsTracker.getCostBreakdown();
    const modelHealth = Array.from(
      (loadBalancer.getModelHealthStatus() as Map<string, any>).entries()
    ).map(([name, health]) => ({ name, ...health }));

    // Calculate insights
    const insights = {
      totalCostSaved: cacheStats.costSaved,
      mostUsedModel: getMostUsedModel(performanceMetrics.byModel),
      mostExpensiveModel: getMostExpensiveModel(performanceMetrics.byModel),
      fastestModel: getFastestModel(performanceMetrics.byModel),
      recommendations: performanceMetrics.recommendations,
    };

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRequests: performanceMetrics.overall.totalRequests,
          totalCost: performanceMetrics.overall.totalCost,
          avgLatency: performanceMetrics.overall.avgLatency,
          successRate: performanceMetrics.overall.successRate,
          cacheHitRate: performanceMetrics.overall.cacheHitRate,
          costSavedFromCache: performanceMetrics.costSavingsFromCache,
        },
        byModel: Array.from(performanceMetrics.byModel.entries()).map(
          ([name, metrics]) => ({
            name,
            ...metrics,
          })
        ),
        byTaskType: Array.from(performanceMetrics.byTaskType.entries()).map(
          ([type, metrics]) => ({
            type,
            ...metrics,
          })
        ),
        cache: {
          stats: cacheStats,
          popularQueries: popularQueries,
        },
        modelHealth,
        costBreakdown,
        insights,
      },
    });
  } catch (error: any) {
    console.error('Analytics dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', message: error.message },
      { status: 500 }
    );
  }
}

function getMostUsedModel(byModel: Map<string, any>): string {
  let max = 0;
  let mostUsed = '';

  for (const [name, metrics] of byModel.entries()) {
    if (metrics.totalRequests > max) {
      max = metrics.totalRequests;
      mostUsed = name;
    }
  }

  return mostUsed || 'N/A';
}

function getMostExpensiveModel(byModel: Map<string, any>): string {
  let max = 0;
  let mostExpensive = '';

  for (const [name, metrics] of byModel.entries()) {
    if (metrics.avgCost > max) {
      max = metrics.avgCost;
      mostExpensive = name;
    }
  }

  return mostExpensive || 'N/A';
}

function getFastestModel(byModel: Map<string, any>): string {
  let min = Infinity;
  let fastest = '';

  for (const [name, metrics] of byModel.entries()) {
    if (metrics.avgLatency < min) {
      min = metrics.avgLatency;
      fastest = name;
    }
  }

  return fastest || 'N/A';
}

