import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { MonitoringSystem } from '@/lib/monitoring';
import { MemoryManager } from '@/lib/performance';
import { ErrorHandler } from '@/lib/error-handling';
import { apiLogger } from '@/lib/logging-simple';

/**
 * Metrics API: /api/metrics
 * 
 * Production-ready metrics endpoint
 * - Performance metrics
 * - System metrics
 * - Application metrics
 * - Error metrics
 * - Admin only access
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { db } = await import('@/lib/db');
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const monitoring = MonitoringSystem.getInstance();
    const errorHandler = ErrorHandler.getInstance();

    // Collect all metrics
    const [
      metrics,
      systemMetrics,
      applicationMetrics,
      memoryStats,
      errorStats
    ] = await Promise.all([
      monitoring.getMetrics(),
      monitoring.getSystemMetrics(),
      monitoring.getApplicationMetrics(),
      MemoryManager.getMemoryStats(),
      errorHandler.getErrorStats()
    ]);

    // Process metrics for better visualization
    const processedMetrics = processMetrics(metrics);

    const metricsData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalMetrics: metrics.length,
        systemHealth: systemMetrics ? 'healthy' : 'unknown',
        memoryUsage: memoryStats.current.heapUsed / memoryStats.current.heapTotal * 100,
        errorCount: Object.values(errorStats.errorCounts).reduce((sum: number, count: any) => sum + count, 0)
      },
      system: {
        metrics: systemMetrics,
        memory: memoryStats
      },
      application: {
        metrics: applicationMetrics,
        errors: errorStats
      },
      metrics: {
        counters: processedMetrics.counters,
        gauges: processedMetrics.gauges,
        timers: processedMetrics.timers,
        histograms: processedMetrics.histograms
      },
      charts: {
        memoryUsage: generateMemoryChart(memoryStats),
        errorTrends: generateErrorTrends(errorStats),
        performanceTrends: generatePerformanceTrends(metrics)
      }
    };

    apiLogger.info('Metrics data retrieved', {
      metadata: {
        userId: session.user.email,
        totalMetrics: metrics.length,
        systemHealth: metricsData.summary.systemHealth
      }
    });

    return NextResponse.json(metricsData);

  } catch (error) {
    apiLogger.error('Failed to retrieve metrics', {
      metadata: { error: (error as Error).message }
    }, error as Error);

    return NextResponse.json({
      error: 'Failed to retrieve metrics',
      message: (error as Error).message
    }, { status: 500 });
  }
}

function processMetrics(metrics: any[]): {
  counters: Record<string, number>;
  gauges: Record<string, number>;
  timers: Record<string, { avg: number; min: number; max: number; count: number }>;
  histograms: Record<string, any>;
} {
  const counters: Record<string, number> = {};
  const gauges: Record<string, number> = {};
  const timers: Record<string, { values: number[]; count: number }> = {};
  const histograms: Record<string, any> = {};

  metrics.forEach(metric => {
    switch (metric.type) {
      case 'counter':
        counters[metric.name] = (counters[metric.name] || 0) + metric.value;
        break;
      case 'gauge':
        gauges[metric.name] = metric.value;
        break;
      case 'timer':
        if (!timers[metric.name]) {
          timers[metric.name] = { values: [], count: 0 };
        }
        timers[metric.name].values.push(metric.value);
        timers[metric.name].count++;
        break;
      case 'histogram':
        if (!histograms[metric.name]) {
          histograms[metric.name] = { values: [], count: 0 };
        }
        histograms[metric.name].values.push(metric.value);
        histograms[metric.name].count++;
        break;
    }
  });

  // Process timers
  const processedTimers: Record<string, { avg: number; min: number; max: number; count: number }> = {};
  Object.entries(timers).forEach(([name, data]) => {
    const values = data.values;
    processedTimers[name] = {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: data.count
    };
  });

  return {
    counters,
    gauges,
    timers: processedTimers,
    histograms
  };
}

function generateMemoryChart(memoryStats: any): any[] {
  // Generate mock chart data for memory usage over time
  const now = new Date();
  const chartData = [];
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000); // Last 24 hours
    chartData.push({
      time: time.toISOString(),
      heapUsed: memoryStats.current.heapUsed / 1024 / 1024, // Convert to MB
      heapTotal: memoryStats.current.heapTotal / 1024 / 1024
    });
  }
  
  return chartData;
}

function generateErrorTrends(errorStats: any): any[] {
  // Generate mock error trends data
  const now = new Date();
  const trends = [];
  
  for (let i = 6; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Last 7 days
    trends.push({
      date: time.toISOString().split('T')[0],
      errors: Math.floor(Math.random() * 50) + 10, // Mock data
      warnings: Math.floor(Math.random() * 100) + 20
    });
  }
  
  return trends;
}

function generatePerformanceTrends(metrics: any[]): any[] {
  // Generate performance trends from actual metrics
  const performanceMetrics = metrics.filter(m => m.name.includes('response_time') || m.name.includes('duration'));
  const trends = [];
  
  // Group by hour for the last 24 hours
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourMetrics = performanceMetrics.filter(m => {
      const metricTime = new Date(m.timestamp);
      return metricTime.getHours() === hour.getHours() && 
             metricTime.getDate() === hour.getDate();
    });
    
    const avgResponseTime = hourMetrics.length > 0 ? 
      hourMetrics.reduce((sum, m) => sum + m.value, 0) / hourMetrics.length : 0;
    
    trends.push({
      time: hour.toISOString(),
      responseTime: avgResponseTime,
      requestCount: hourMetrics.length
    });
  }
  
  return trends;
}
