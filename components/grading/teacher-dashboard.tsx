'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Target,
  Zap,
  DollarSign
} from 'lucide-react';

interface DashboardData {
  timeRange: string;
  queue: {
    total: number;
    pending: number;
    completed: number;
    byPriority: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    averageWaitTime: number;
  };
  aiPerformance: {
    averageConfidence: number;
    reviewRate: number;
    agreementRate: number;
    accuracyTrend: 'improving' | 'stable' | 'declining';
  };
  reviewers: {
    total: number;
    available: number;
    topPerformers: Array<{
      name: string;
      accuracy: number;
      reviewsCompleted: number;
    }>;
  };
  health: {
    reviewBacklog: number;
    slaCompliance: number;
    averageTurnaround: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  subjects: Record<string, {
    count: number;
    averageScore: number;
    averageConfidence: number;
  }>;
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/grading/dashboard?range=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grading Dashboard</h1>
          <p className="text-gray-600 mt-1">AI-powered grading system overview</p>
        </div>

        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* System Health Alert */}
      {data.health.status !== 'healthy' && (
        <Card className="border-l-4 border-l-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-orange-900">System Alert</h3>
                <p className="text-sm text-orange-700 mt-1">
                  {data.health.status === 'warning'
                    ? `Review backlog is building up (${data.health.reviewBacklog} pending)`
                    : `Critical: ${data.health.reviewBacklog} reviews pending, SLA compliance at ${data.health.slaCompliance.toFixed(1)}%`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Graded"
          value={data.queue.total}
          subtitle={`${data.queue.completed} completed`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={data.queue.completed > data.queue.pending ? 'up' : 'down'}
          trendValue={`${((data.queue.completed / data.queue.total) * 100).toFixed(0)}%`}
          color="blue"
        />

        <MetricCard
          title="AI Confidence"
          value={`${(data.aiPerformance.averageConfidence * 100).toFixed(0)}%`}
          subtitle="Average confidence"
          icon={<Target className="h-5 w-5" />}
          trend={data.aiPerformance.accuracyTrend === 'improving' ? 'up' : data.aiPerformance.accuracyTrend === 'declining' ? 'down' : 'stable'}
          trendValue={data.aiPerformance.accuracyTrend}
          color="green"
        />

        <MetricCard
          title="Agreement Rate"
          value={`${data.aiPerformance.agreementRate.toFixed(1)}%`}
          subtitle="AI vs Human"
          icon={<Users className="h-5 w-5" />}
          trend={data.aiPerformance.agreementRate >= 80 ? 'up' : 'down'}
          trendValue={data.aiPerformance.agreementRate >= 80 ? 'Good' : 'Needs improvement'}
          color="purple"
        />

        <MetricCard
          title="Avg Response Time"
          value={`${(data.health.averageTurnaround / 60).toFixed(1)}m`}
          subtitle="Time to grade"
          icon={<Clock className="h-5 w-5" />}
          trend={data.health.averageTurnaround < 300 ? 'up' : 'down'}
          trendValue={`${data.health.slaCompliance.toFixed(0)}% SLA`}
          color="orange"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="reviewers">Reviewers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Queue Status */}
          <Card>
            <CardHeader>
              <CardTitle>Review Queue</CardTitle>
              <CardDescription>Current grading queue status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Pending Reviews</span>
                  <span className="text-2xl font-bold text-gray-900">{data.queue.pending}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">By Priority</span>
                  </div>
                  <div className="space-y-2">
                    <PriorityBar
                      label="Critical"
                      count={data.queue.byPriority.critical}
                      color="red"
                    />
                    <PriorityBar
                      label="High"
                      count={data.queue.byPriority.high}
                      color="orange"
                    />
                    <PriorityBar
                      label="Medium"
                      count={data.queue.byPriority.medium}
                      color="yellow"
                    />
                    <PriorityBar
                      label="Low"
                      count={data.queue.byPriority.low}
                      color="green"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Average Wait Time</span>
                    <span className="font-medium">{formatDuration(data.queue.averageWaitTime)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Performance */}
          <Card>
            <CardHeader>
              <CardTitle>AI Performance</CardTitle>
              <CardDescription>Grading system metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Average Confidence</span>
                    <span className="text-sm font-semibold">{(data.aiPerformance.averageConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.aiPerformance.averageConfidence * 100} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Human Agreement</span>
                    <span className="text-sm font-semibold">{data.aiPerformance.agreementRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.aiPerformance.agreementRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Review Rate</span>
                    <span className="text-sm font-semibold">{data.aiPerformance.reviewRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.aiPerformance.reviewRate} className="h-2" />
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <Badge variant={
                    data.aiPerformance.accuracyTrend === 'improving' ? 'default' :
                    data.aiPerformance.accuracyTrend === 'declining' ? 'destructive' : 'secondary'
                  }>
                    {data.aiPerformance.accuracyTrend === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                    {data.aiPerformance.accuracyTrend === 'declining' && <TrendingDown className="h-3 w-3 mr-1" />}
                    {data.aiPerformance.accuracyTrend.charAt(0).toUpperCase() + data.aiPerformance.accuracyTrend.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-600">Accuracy trend</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>{data.queue.pending} submissions waiting for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Review queue component will be integrated here</p>
                <p className="text-sm mt-1">View and manage pending review tasks</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
              <CardDescription>Grading metrics for each subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.subjects).map(([subject, metrics]) => (
                  <SubjectCard key={subject} subject={subject} metrics={metrics} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewers">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer Performance</CardTitle>
              <CardDescription>Top performing reviewers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{data.reviewers.total}</div>
                    <div className="text-sm text-gray-600">Total Reviewers</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{data.reviewers.available}</div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{data.reviewers.total - data.reviewers.available}</div>
                    <div className="text-sm text-gray-600">Busy</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Top Performers</h3>
                  <div className="space-y-3">
                    {data.reviewers.topPerformers.slice(0, 5).map((reviewer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{reviewer.name}</div>
                            <div className="text-sm text-gray-600">{reviewer.reviewsCompleted} reviews</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{reviewer.accuracy.toFixed(0)}%</div>
                          <div className="text-xs text-gray-500">Accuracy</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }[color];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses}`}>
            {icon}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
          <span className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trendValue}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Priority Bar Component
function PriorityBar({ label, count, color }: { label: string; count: number; color: string }) {
  const colorClasses = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  }[color];

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-16">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div className={`h-full ${colorClasses}`} style={{ width: `${Math.min(count * 10, 100)}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
    </div>
  );
}

// Subject Card Component
function SubjectCard({ subject, metrics }: {
  subject: string;
  metrics: { count: number; averageScore: number; averageConfidence: number }
}) {
  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 capitalize">{subject}</h3>
          <p className="text-sm text-gray-600">{metrics.count} submissions</p>
        </div>
        <Badge variant="secondary">{metrics.averageScore.toFixed(1)}/10</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600 mb-1">Avg Score</div>
          <Progress value={metrics.averageScore * 10} className="h-2" />
        </div>
        <div>
          <div className="text-gray-600 mb-1">Confidence</div>
          <Progress value={metrics.averageConfidence * 100} className="h-2" />
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}
