'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import {
  Heart, Smile, Frown, Meh, TrendingUp, Users,
  BarChart3, Brain, Loader2, Info, Activity, Eye,
  AlertTriangle, Zap, Sparkles, RefreshCw,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/* ───────────────────────────────────────────────
 * Emotion Config
 * ─────────────────────────────────────────────── */
const EMOTION_LABELS: Record<string, string> = {
  happy: 'Vui vẻ', sad: 'Buồn', neutral: 'Trung lập',
  angry: 'Tức giận', surprised: 'Ngạc nhiên', fearful: 'Sợ hãi',
  disgusted: 'Chán ghét', very_happy: 'Rất vui', laughing: 'Cười',
  confused: 'Bối rối', worried: 'Lo lắng', thinking: 'Suy nghĩ',
  sleepy: 'Buồn ngủ', bored: 'Chán', excited: 'Hào hứng',
  concentrating: 'Tập trung', poker_face: 'Bình thản',
};

const EMOTION_COLORS: Record<string, string> = {
  happy: '#10B981', sad: '#EF4444', neutral: '#6B7280',
  angry: '#DC2626', surprised: '#F59E0B', fearful: '#8B5CF6',
  disgusted: '#78716C', very_happy: '#059669', laughing: '#34D399',
  confused: '#A78BFA', worried: '#F97316', thinking: '#3B82F6',
  sleepy: '#94A3B8', bored: '#64748B', excited: '#EC4899',
  concentrating: '#06B6D4', poker_face: '#9CA3AF',
};

const POSITIVE_EMOTIONS = new Set(['happy', 'very_happy', 'laughing', 'excited', 'concentrating']);
const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'worried', 'bored', 'sleepy', 'disgusted']);
const DEFAULT_COLOR = '#94A3B8';

/* ───────────────────────────────────────────────
 * Types
 * ─────────────────────────────────────────────── */
interface EmotionStatsBucket {
  periodStart: string;
  periodEnd: string;
  sampleCount: number;
  avgConfidence: number;
  dominantEmotion: string | null;
  dominantCount: number;
  distribution: Record<string, number>;
}

interface EmotionStatsResponse {
  success: boolean;
  groupBy: string;
  buckets: EmotionStatsBucket[];
  summary: {
    from: string;
    to: string;
    totalSamples: number;
    avgConfidence: number;
    emotionDistribution: Record<string, number>;
    dominantEmotion: string | null;
  };
}

interface StudentRow {
  id: string;
  name: string;
  email?: string;
  averageScore: number;
  progress?: number;
  emotion: 'happy' | 'neutral' | 'sad';
  engagement?: number;
}

/* ───────────────────────────────────────────────
 * AI Native Glass Components - NEW LIGHT THEME
 * ─────────────────────────────────────────────── */
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

function StatBox({
  label, value, icon, color = 'primary', subtitle,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  subtitle?: string;
}) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    purple: 'text-purple-500 bg-purple-50',
    orange: 'text-orange-500 bg-orange-50',
    red: 'text-red-500 bg-red-50',
  } as const;
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${c}`}>
            {icon}
          </div>
        )}
        <p className="text-sm font-medium text-gray-600">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color === 'blue' ? 'text-blue-500' : color === 'green' ? 'text-green-500' : color === 'purple' ? 'text-purple-500' : color === 'orange' ? 'text-orange-500' : 'text-red-500'}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function TimeRangeButton({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
 * Recharts tooltip styling
 * ─────────────────────────────────────────────── */
const chartTooltipStyle = {
  contentStyle: {
    background: 'hsl(225 15% 10%)',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    padding: '10px 14px',
  },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
  labelStyle: { color: 'hsl(var(--muted-foreground))', fontWeight: 600 },
};

/* ───────────────────────────────────────────────
 * Page Component
 * ─────────────────────────────────────────────── */
export default function TeacherEmotionMapPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [groupBy, setGroupBy] = useState<'hour' | 'day'>('hour');
  const [emotionStats, setEmotionStats] = useState<EmotionStatsResponse | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  /* ── Fetch emotion stats ── */
  const fetchStats = useCallback(() => {
    const to = new Date();
    const from = new Date();
    let g: 'hour' | 'day' = 'hour';
    if (timeRange === '24h') {
      from.setTime(to.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
      from.setTime(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      from.setTime(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      g = 'day';
    }
    setGroupBy(g);

    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy: g,
      limit: g === 'day' ? '31' : '96',
    });

    fetch(`/api/vision-tracker/emotion/stats?${params}`)
      .then((res) => (res.ok ? res.json() : { success: false, buckets: [], summary: null }))
      .then((data) => {
        if (data.success && data.summary) setEmotionStats(data);
        else setEmotionStats(null);
      })
      .catch(() => setEmotionStats(null))
      .finally(() => setLoadingStats(false));
  }, [timeRange]);

  useEffect(() => {
    setLoadingStats(true);
    fetchStats();
    // Polling for live updates every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    setLoadingStudents(true);
    fetch('/api/teacher/students')
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => {
        const list = (data.students || []).map((s: any) => ({
          id: s.id, name: s.name, email: s.email,
          averageScore: s.averageScore ?? 0, progress: s.progress,
          emotion: s.emotion ?? 'neutral', engagement: s.engagement,
        }));
        setStudents(list);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, []);

  /* ── Derived data ── */
  const summary = emotionStats?.summary;
  const buckets = useMemo(() => emotionStats?.buckets ?? [], [emotionStats]);

  const pieData = useMemo(() =>
    summary?.emotionDistribution
      ? Object.entries(summary.emotionDistribution)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({
            name: EMOTION_LABELS[k] || k,
            key: k,
            value: v,
            color: EMOTION_COLORS[k] || DEFAULT_COLOR,
          }))
      : [],
    [summary]
  );

  const timelineData = useMemo(() =>
    buckets.map((b) => {
      const label = groupBy === 'day'
        ? new Date(b.periodStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        : new Date(b.periodStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      return {
        period: label,
        sampleCount: b.sampleCount,
        dominantCount: b.dominantCount,
        dominantEmotion: b.dominantEmotion,
        confidence: Math.round((b.avgConfidence || 0) * 100),
        ...b.distribution,
      };
    }),
    [buckets, groupBy]
  );

  // Sentiment analysis
  const sentimentMetrics = useMemo(() => {
    if (!summary?.emotionDistribution) return { positive: 0, negative: 0, neutral: 0, score: 50 };
    const dist = summary.emotionDistribution;
    let positive = 0, negative = 0, neutral = 0;
    for (const [k, v] of Object.entries(dist)) {
      if (POSITIVE_EMOTIONS.has(k)) positive += v;
      else if (NEGATIVE_EMOTIONS.has(k)) negative += v;
      else neutral += v;
    }
    const total = positive + negative + neutral;
    const score = total > 0 ? Math.round(((positive - negative) / total + 1) * 50) : 50;
    return { positive, negative, neutral, score };
  }, [summary]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!summary?.emotionDistribution) return [];
    const total = Object.values(summary.emotionDistribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    const categories = [
      { label: 'Vui vẻ', emotions: ['happy', 'very_happy', 'laughing', 'excited'] },
      { label: 'Tập trung', emotions: ['concentrating', 'thinking'] },
      { label: 'Bình thản', emotions: ['neutral', 'poker_face'] },
      { label: 'Căng thẳng', emotions: ['worried', 'fearful', 'angry'] },
      { label: 'Mệt mỏi', emotions: ['sleepy', 'bored'] },
      { label: 'Bối rối', emotions: ['confused', 'surprised', 'disgusted', 'sad'] },
    ];
    return categories.map(cat => {
      const count = cat.emotions.reduce((sum, e) => sum + (summary.emotionDistribution[e] || 0), 0);
      return { category: cat.label, value: Math.round((count / total) * 100) };
    });
  }, [summary]);

  const happyCount = students.filter((s) => s.emotion === 'happy').length;
  const neutralCount = students.filter((s) => s.emotion === 'neutral').length;
  const sadCount = students.filter((s) => s.emotion === 'sad').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* ═══════════════════════════════════════
       * HEADER
       * ═══════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Emotion Map</h1>
                <p className="text-sm text-gray-600">Bản đồ cảm xúc học tập</p>
              </div>
            </div>

            {/* Right: Actions */}
            <button
              onClick={() => { setLoadingStats(true); fetchStats(); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Time range selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium text-gray-600">Khoảng thời gian:</span>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <TimeRangeButton key={r} onClick={() => setTimeRange(r)} active={timeRange === r}>
                  {r === '24h' ? '24 giờ' : r === '7d' ? '7 ngày' : '30 ngày'}
                </TimeRangeButton>
              ))}
            </div>
          </div>
        </div>

      {/* ═══════════════════════════════════════
       * SECTION 1: Sentiment Overview
       * ═══════════════════════════════════════ */}
      <GlassCard className="mb-6">
        <SectionHeader
          icon={<Zap className="h-5 w-5" />}
          title="Tổng quan tâm trạng"
          subtitle="Chỉ số cảm xúc tổng hợp từ Vision Tracker & Camera AI"
        />

        {loadingStats ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <span className="text-gray-600 font-medium ml-3">Đang tải thống kê...</span>
          </div>
        ) : !summary ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
            <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-medium">Chưa có dữ liệu cảm xúc trong khoảng thời gian này.</p>
            <p className="text-sm mt-2 text-gray-500">
              Kích hoạt AI Vision trên trang Camera Management để bắt đầu ghi nhận.
            </p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
              <StatBox
                label="Tổng mẫu"
                value={summary.totalSamples.toLocaleString()}
                icon={<BarChart3 className="h-5 w-5" />}
                color="blue"
                subtitle={`${timeRange === '24h' ? '24 giờ' : timeRange === '7d' ? '7 ngày' : '30 ngày'} gần nhất`}
              />
              <StatBox
                label="Biểu cảm chính"
                value={summary.dominantEmotion ? EMOTION_LABELS[summary.dominantEmotion] || summary.dominantEmotion : '—'}
                icon={<Brain className="h-5 w-5" />}
                color="purple"
              />
              <StatBox
                label="Độ tin cậy TB"
                value={`${Math.round(summary.avgConfidence * 100)}%`}
                icon={<Eye className="h-5 w-5" />}
                color="orange"
              />
              <StatBox
                label="Sentiment Score"
                value={`${sentimentMetrics.score}/100`}
                icon={<TrendingUp className="h-5 w-5" />}
                color={sentimentMetrics.score >= 60 ? 'green' : sentimentMetrics.score >= 40 ? 'orange' : 'red'}
                subtitle={sentimentMetrics.score >= 60 ? 'Tích cực' : sentimentMetrics.score >= 40 ? 'Trung bình' : 'Cần lưu ý'}
              />
              <StatBox
                label="Loại cảm xúc"
                value={pieData.length}
                icon={<Activity className="h-5 w-5" />}
                color="blue"
                subtitle={`/ ${Object.keys(EMOTION_LABELS).length} loại nhận diện`}
              />
            </div>

            {/* Sentiment meter */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-sm font-bold text-gray-900">Thanh Sentiment</span>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Tích cực: {sentimentMetrics.positive}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /> Trung lập: {sentimentMetrics.neutral}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Tiêu cực: {sentimentMetrics.negative}</span>
                </div>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-200">
                {(() => {
                  const total = sentimentMetrics.positive + sentimentMetrics.neutral + sentimentMetrics.negative;
                  if (total === 0) return null;
                  return (
                    <>
                      <div className="h-full rounded-l-full bg-gradient-to-r from-green-600 to-green-500" style={{ width: `${(sentimentMetrics.positive / total) * 100}%` }} />
                      <div className="h-full bg-gradient-to-r from-gray-600 to-gray-500" style={{ width: `${(sentimentMetrics.neutral / total) * 100}%` }} />
                      <div className="h-full rounded-r-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${(sentimentMetrics.negative / total) * 100}%` }} />
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </GlassCard>

      {/* ═══════════════════════════════════════
       * SECTION 2: Detailed Charts
       * ═══════════════════════════════════════ */}
      {summary && (
        <GlassCard className="mb-6">
          <SectionHeader
            icon={<Brain className="h-5 w-5" />}
            title="Phân tích chi tiết"
            subtitle="Biểu đồ phân bố và dòng thời gian cảm xúc"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pie chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold mb-4 text-[hsl(var(--foreground))] flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
                Phân bố biểu cảm
              </h3>
              {pieData.length === 0 ? (
                <p className="text-sm text-center py-12 text-[hsl(var(--muted-foreground))]">Không có dữ liệu</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => [value, 'Số lần']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold mb-4 text-[hsl(var(--foreground))] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(var(--accent))]" />
                Radar cảm xúc nhóm
              </h3>
              {radarData.length === 0 ? (
                <p className="text-sm text-center py-12 text-[hsl(var(--muted-foreground))]">Không có dữ liệu</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} axisLine={false} />
                    <Radar name="Mức độ (%)" dataKey="value" stroke="hsl(245 85% 65%)" fill="hsl(245 85% 65%)" fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip {...chartTooltipStyle} formatter={(value: number) => [`${value}%`, 'Tỷ lệ']} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Timeline area chart with confidence overlay */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h3 className="font-bold mb-4 text-[hsl(var(--foreground))] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />
              Dòng thời gian ({groupBy === 'day' ? 'ngày' : 'giờ'})
            </h3>
            {timelineData.length === 0 ? (
              <p className="text-sm text-center py-12 text-[hsl(var(--muted-foreground))]">Không có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="gradientSample" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(245 85% 65%)" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="hsl(245 85% 65%)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradientConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(155 75% 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(155 75% 45%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <Tooltip {...chartTooltipStyle} />
                  <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="sampleCount" name="Số mẫu" stroke="hsl(245 85% 65%)" fill="url(#gradientSample)" strokeWidth={2} />
                  <Area type="monotone" dataKey="confidence" name="Độ tin cậy (%)" stroke="hsl(155 75% 45%)" fill="url(#gradientConfidence)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bar chart — dominant emotion by time */}
          {timelineData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold mb-4 text-[hsl(var(--foreground))] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--warning))]" />
                Biểu cảm nổi bật theo thời gian
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={timelineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <Tooltip
                    {...chartTooltipStyle}
                    formatter={(value: number, _name: string, props: any) => {
                      const emotion = props.payload?.dominantEmotion;
                      return [value, `Biểu cảm nổi bật (${EMOTION_LABELS[emotion] || emotion || '?'})`];
                    }}
                  />
                  <Bar dataKey="dominantCount" name="Số lần" fill="hsl(245 85% 65%)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      )}

      {/* ═══════════════════════════════════════
       * SECTION 3: Class Emotion Map
       * ═══════════════════════════════════════ */}
      <GlassCard className="mb-8">
        <SectionHeader
          icon={<Users className="h-5 w-5" />}
          title="Cảm xúc lớp học"
          subtitle="Phân loại theo điểm số &amp; tương tác"
        />

        {loadingStudents ? (
          <div className="flex items-center justify-center py-12 glass-panel rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin mr-3 text-[hsl(var(--primary))]" />
            <span className="text-[hsl(var(--muted-foreground))] font-medium">Đang tải...</span>
          </div>
        ) : (
          <>
            {/* Emotion counters */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center border border-[hsl(var(--success)/0.2)] hover:border-[hsl(var(--success)/0.4)] transition-colors">
                <Smile className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--success))]" />
                <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--success))]">{happyCount}</p>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mt-1">{t?.('emotion.happy') ?? 'Vui'}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center border border-[hsl(var(--warning)/0.2)] hover:border-[hsl(var(--warning)/0.4)] transition-colors">
                <Meh className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--warning))]" />
                <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--warning))]">{neutralCount}</p>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mt-1">Trung lập</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center border border-[hsl(var(--destructive)/0.2)] hover:border-[hsl(var(--destructive)/0.4)] transition-colors">
                <Frown className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--destructive))]" />
                <p className="text-3xl md:text-4xl font-bold text-[hsl(var(--destructive))]">{sadCount}</p>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))] mt-1">Cần hỗ trợ</p>
              </div>
            </div>

            {/* Alert if negative emotions > 30% */}
            {students.length > 0 && (sadCount / students.length) > 0.3 && (
              <div className="glass-panel rounded-xl p-4 mb-6 border border-[hsl(var(--destructive)/0.25)] bg-[hsl(var(--destructive)/0.05)]">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))] shrink-0" />
                  <div>
                    <p className="font-bold text-[hsl(var(--destructive))] text-sm">Cảnh báo: Tỷ lệ tiêu cực cao</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      {Math.round((sadCount / students.length) * 100)}% học sinh đang có cảm xúc tiêu cực. Cân nhắc điều chỉnh phương pháp giảng dạy.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Student score bar chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <h3 className="font-bold mb-4 text-[hsl(var(--foreground))] flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--primary))]" />
                Emotion vs Điểm trung bình
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={students.slice(0, 20).map((s) => ({
                    name: s.name.length > 12 ? s.name.slice(0, 10) + '\u2026' : s.name,
                    fullName: s.name,
                    score: s.averageScore,
                    emotion: s.emotion,
                  }))}
                  layout="vertical"
                  margin={{ left: 80, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" width={78} />
                  <Tooltip {...chartTooltipStyle} formatter={(value: number) => [value, 'Điểm TB']} labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName} />
                  <Bar dataKey="score" name="Điểm TB" fill="hsl(245 85% 65%)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Student table */}
            {students.length > 0 && (
              <div className="glass-panel rounded-xl p-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-3 font-bold text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--border))]">Học sinh</th>
                      <th className="text-right p-3 font-bold text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--border))]">Điểm TB</th>
                      <th className="text-center p-3 font-bold text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--border))]">Cảm xúc</th>
                      <th className="text-center p-3 font-bold text-[hsl(var(--foreground))] border-b-2 border-[hsl(var(--border))]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 20).map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-[hsl(var(--border))] last:border-0 transition-colors hover:bg-white/[0.04]"
                      >
                        <td className="p-3 font-medium text-[hsl(var(--foreground))]">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${
                              s.emotion === 'happy' ? 'bg-[hsl(var(--success))]' :
                              s.emotion === 'sad' ? 'bg-[hsl(var(--destructive))]' :
                              'bg-[hsl(var(--warning))]'
                            }`} />
                            {s.name}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span className={`font-bold ${
                            s.averageScore >= 80 ? 'text-[hsl(var(--success))]' :
                            s.averageScore >= 50 ? 'text-[hsl(var(--primary))]' :
                            'text-[hsl(var(--destructive))]'
                          }`}>
                            {s.averageScore}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {s.emotion === 'happy' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[hsl(var(--success))] font-semibold bg-[hsl(var(--success)/0.12)] text-xs">
                              😊 Vui
                            </span>
                          )}
                          {s.emotion === 'neutral' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[hsl(var(--warning))] font-semibold bg-[hsl(var(--warning)/0.12)] text-xs">
                              😐 Trung lập
                            </span>
                          )}
                          {s.emotion === 'sad' && (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[hsl(var(--destructive))] font-semibold bg-[hsl(var(--destructive)/0.12)] text-xs">
                              😢 Cần hỗ trợ
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {s.averageScore >= 80 && s.emotion === 'happy' ? (
                            <span className="text-xs font-bold text-[hsl(var(--success))]">Xuất sắc</span>
                          ) : s.averageScore < 50 && s.emotion === 'sad' ? (
                            <span className="text-xs font-bold text-[hsl(var(--destructive))] flex items-center justify-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Cần hỗ trợ
                            </span>
                          ) : (
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </GlassCard>
      </div>
    </div>
  );
}
