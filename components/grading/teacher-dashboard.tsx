'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Target,
  RefreshCw,
  Eye,
  Check,
  X,
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

interface ReviewItem {
  id: string;
  studentName: string;
  examName: string;
  subject: string;
  aiScore: number;
  maxScore: number;
  confidence: number;
  submittedAt: string;
}

const TREND_LABEL: Record<'improving' | 'stable' | 'declining', string> = {
  improving: 'Đang cải thiện',
  stable: 'Ổn định',
  declining: 'Giảm sút',
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/grading/dashboard?range=${timeRange}`);
      if (!response.ok) throw new Error(`Lỗi ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || 'Không thể tải dữ liệu');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchReviewQueue = useCallback(async () => {
    try {
      setReviewLoading(true);
      const response = await fetch('/api/grading/review');
      if (!response.ok) return;
      const result = await response.json();
      setReviewItems(result.items || result.data || []);
    } catch {
      // review queue is non-critical
    } finally {
      setReviewLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 font-medium mb-2">Không thể tải dữ liệu</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const timeRangeLabels: Record<string, string> = {
    '7d': '7 ngày qua',
    '30d': '30 ngày qua',
    '90d': '90 ngày qua',
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bảng chấm điểm</h1>
          <p className="text-gray-600 mt-1">Tổng quan hệ thống chấm điểm AI</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="ghost" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {timeRangeLabels[range]}
            </button>
          ))}
        </div>
      </div>

      {/* System Health Alert */}
      {data.health.status !== 'healthy' && (
        <Card className={`border-l-4 ${data.health.status === 'critical' ? 'border-l-red-500 bg-red-50' : 'border-l-orange-500 bg-orange-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${data.health.status === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
              <div>
                <h3 className={`font-semibold ${data.health.status === 'critical' ? 'text-red-900' : 'text-orange-900'}`}>
                  {data.health.status === 'critical' ? 'Cảnh báo nghiêm trọng' : 'Cảnh báo hệ thống'}
                </h3>
                <p className={`text-sm mt-1 ${data.health.status === 'critical' ? 'text-red-700' : 'text-orange-700'}`}>
                  {data.health.status === 'warning'
                    ? `Hàng đợi chờ xét duyệt đang tăng (${data.health.reviewBacklog} bài chờ)`
                    : `Nghiêm trọng: ${data.health.reviewBacklog} bài chờ xét duyệt, tỉ lệ đúng hạn ${data.health.slaCompliance.toFixed(1)}%`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Tổng bài đã chấm"
          value={data.queue.total}
          subtitle={`${data.queue.completed} hoàn tất`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend={data.queue.completed > data.queue.pending ? 'up' : 'down'}
          trendValue={`${data.queue.total > 0 ? ((data.queue.completed / data.queue.total) * 100).toFixed(0) : 0}%`}
          color="blue"
        />
        <MetricCard
          title="Độ tin cậy AI"
          value={`${(data.aiPerformance.averageConfidence * 100).toFixed(0)}%`}
          subtitle="Trung bình"
          icon={<Target className="h-5 w-5" />}
          trend={data.aiPerformance.accuracyTrend === 'improving' ? 'up' : data.aiPerformance.accuracyTrend === 'declining' ? 'down' : 'stable'}
          trendValue={TREND_LABEL[data.aiPerformance.accuracyTrend]}
          color="green"
        />
        <MetricCard
          title="Tỉ lệ đồng thuận"
          value={`${data.aiPerformance.agreementRate.toFixed(1)}%`}
          subtitle="AI so với giáo viên"
          icon={<Users className="h-5 w-5" />}
          trend={data.aiPerformance.agreementRate >= 80 ? 'up' : 'down'}
          trendValue={data.aiPerformance.agreementRate >= 80 ? 'Tốt' : 'Cần cải thiện'}
          color="purple"
        />
        <MetricCard
          title="Thời gian xử lý TB"
          value={`${(data.health.averageTurnaround / 60).toFixed(1)} phút`}
          subtitle="Thời gian chấm"
          icon={<Clock className="h-5 w-5" />}
          trend={data.health.averageTurnaround < 300 ? 'up' : 'down'}
          trendValue={`${data.health.slaCompliance.toFixed(0)}% đúng hạn`}
          color="orange"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="queue" onClick={fetchReviewQueue}>
            Chờ xét duyệt
            {data.queue.pending > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">{data.queue.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="subjects">Theo môn học</TabsTrigger>
          <TabsTrigger value="reviewers">Giáo viên chấm</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái hàng đợi</CardTitle>
              <CardDescription>Phân bổ ưu tiên trong hàng đợi chấm điểm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Bài chờ xét duyệt</span>
                  <span className="text-2xl font-bold text-gray-900">{data.queue.pending}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Phân loại theo mức độ ưu tiên</p>
                  <PriorityBar label="Khẩn cấp" count={data.queue.byPriority.critical} total={data.queue.pending} color="red" />
                  <PriorityBar label="Cao" count={data.queue.byPriority.high} total={data.queue.pending} color="orange" />
                  <PriorityBar label="Trung bình" count={data.queue.byPriority.medium} total={data.queue.pending} color="yellow" />
                  <PriorityBar label="Thấp" count={data.queue.byPriority.low} total={data.queue.pending} color="green" />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Thời gian chờ trung bình</span>
                    <span className="font-medium">{formatDuration(data.queue.averageWaitTime)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất AI</CardTitle>
              <CardDescription>Chỉ số hệ thống chấm điểm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Độ tin cậy trung bình</span>
                    <span className="text-sm font-semibold">{(data.aiPerformance.averageConfidence * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={data.aiPerformance.averageConfidence * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Đồng thuận với giáo viên</span>
                    <span className="text-sm font-semibold">{data.aiPerformance.agreementRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={data.aiPerformance.agreementRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Tỉ lệ cần xét duyệt</span>
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
                    {TREND_LABEL[data.aiPerformance.accuracyTrend]}
                  </Badge>
                  <span className="text-sm text-gray-600">Xu hướng độ chính xác</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Queue Tab */}
        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bài chờ xét duyệt</CardTitle>
                  <CardDescription>{data.queue.pending} bài đang chờ giáo viên xem lại</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchReviewQueue} disabled={reviewLoading}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${reviewLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reviewLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Đang tải...</p>
                </div>
              ) : reviewItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                  <p className="font-medium text-gray-700">Không có bài nào cần xét duyệt</p>
                  <p className="text-sm mt-1">Tất cả bài đã được AI chấm với độ tin cậy cao</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.studentName}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{item.subject}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{item.examName}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-600">
                            Điểm AI: <strong>{item.aiScore}/{item.maxScore}</strong>
                          </span>
                          <span className="text-xs text-gray-600">
                            Tin cậy: <strong className={item.confidence < 0.6 ? 'text-red-600' : 'text-green-600'}>
                              {(item.confidence * 100).toFixed(0)}%
                            </strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/teacher/grading?id=${item.id}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Xem lại
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            await fetch(`/api/grading/${item.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'approved' }),
                            });
                            setReviewItems(prev => prev.filter(r => r.id !== item.id));
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Subject Tab */}
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Kết quả theo môn học</CardTitle>
              <CardDescription>Chỉ số chấm điểm từng môn</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.subjects).length === 0 ? (
                <p className="text-center py-8 text-gray-500">Chưa có dữ liệu theo môn học</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(data.subjects).map(([subject, metrics]) => (
                    <SubjectCard key={subject} subject={subject} metrics={metrics} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviewers Tab */}
        <TabsContent value="reviewers">
          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất giáo viên chấm</CardTitle>
              <CardDescription>Top giáo viên xét duyệt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{data.reviewers.total}</div>
                    <div className="text-sm text-gray-600">Tổng giáo viên</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{data.reviewers.available}</div>
                    <div className="text-sm text-gray-600">Đang rảnh</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{data.reviewers.total - data.reviewers.available}</div>
                    <div className="text-sm text-gray-600">Đang bận</div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Top chấm điểm</h3>
                  <div className="space-y-3">
                    {data.reviewers.topPerformers.slice(0, 5).map((reviewer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{reviewer.name}</div>
                            <div className="text-sm text-gray-600">{reviewer.reviewsCompleted} bài đã xét</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{reviewer.accuracy.toFixed(0)}%</div>
                          <div className="text-xs text-gray-500">Độ chính xác</div>
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  title, value, subtitle, icon, trend, trendValue, color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
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

function PriorityBar({
  label, count, total, color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  };
  // Use percentage of total pending (not count * 10)
  const widthPct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color] || 'bg-gray-500'} transition-all`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

function SubjectCard({
  subject, metrics,
}: {
  subject: string;
  metrics: { count: number; averageScore: number; averageConfidence: number };
}) {
  return (
    <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{subject}</h3>
          <p className="text-sm text-gray-600">{metrics.count} bài nộp</p>
        </div>
        <Badge variant="secondary">{metrics.averageScore.toFixed(1)}/10</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600 mb-1">Điểm TB</div>
          <Progress value={metrics.averageScore * 10} className="h-2" />
        </div>
        <div>
          <div className="text-gray-600 mb-1">Độ tin cậy</div>
          <Progress value={metrics.averageConfidence * 100} className="h-2" />
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} giây`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} phút`;
  return `${Math.round(seconds / 3600)} giờ`;
}
