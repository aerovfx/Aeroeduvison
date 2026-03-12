'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import {
  Heart, Smile, Frown, Meh, TrendingUp, Calendar, Users,
  BarChart3, MapPin, Brain, Loader2, RefreshCw, Info,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/styles/neumorphic-theme.css';

const EMOTION_LABELS: Record<string, string> = {
  happy: 'Vui vẻ',
  sad: 'Buồn',
  neutral: 'Trung lập',
  angry: 'Tức giận',
  surprised: 'Ngạc nhiên',
  fearful: 'Sợ hãi',
  disgusted: 'Chán ghét',
  very_happy: 'Rất vui',
  laughing: 'Cười',
  confused: 'Bối rối',
  worried: 'Lo lắng',
  thinking: 'Suy nghĩ',
  sleepy: 'Buồn ngủ',
  bored: 'Chán',
  excited: 'Hào hứng',
  concentrating: 'Tập trung',
  poker_face: 'Bình thản',
};
const EMOTION_COLORS: Record<string, string> = {
  happy: '#10B981',
  sad: '#EF4444',
  neutral: '#6B7280',
  angry: '#DC2626',
  surprised: '#F59E0B',
  fearful: '#8B5CF6',
  disgusted: '#78716C',
  very_happy: '#059669',
  laughing: '#34D399',
  confused: '#A78BFA',
  worried: '#F97316',
  thinking: '#3B82F6',
  sleepy: '#94A3B8',
  bored: '#64748B',
  excited: '#EC4899',
  concentrating: '#06B6D4',
  poker_face: '#9CA3AF',
};

const DEFAULT_COLOR = '#94A3B8';

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

// Neumorphic card component
function NeuCard({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`neu-card ${hover ? 'neu-card-hover' : ''} ${className}`}
      style={{
        background: 'var(--neu-card-bg)',
        borderRadius: '24px',
        padding: '28px',
        boxShadow: `
          12px 12px 24px var(--neu-shadow-dark),
          -12px -12px 24px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        border: '1px solid var(--neu-border)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
}

// Neumorphic stat box component
function NeuStatBox({
  label,
  value,
  icon,
  color = 'primary',
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const colorMap = {
    primary: 'var(--neu-accent-primary)',
    success: 'var(--neu-accent-success)',
    warning: 'var(--neu-accent-warning)',
    danger: 'var(--neu-accent-danger)',
  };

  return (
    <div
      className="neu-stat-box"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.2) 100%)',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: `
          8px 8px 16px var(--neu-shadow-dark),
          -8px -8px 16px var(--neu-shadow-light),
          inset 1px 1px 2px var(--neu-shadow-inset-dark)
        `,
        border: '1px solid var(--neu-border)',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              background: `linear-gradient(135deg, ${colorMap[color]} 0%, ${colorMap[color]}80 100%)`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(0,0,0,0.2), -2px -2px 4px rgba(255,255,255,0.8)',
            }}
          >
            {icon}
          </div>
        )}
        <p className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
          {label}
        </p>
      </div>
      <p
        className="text-3xl font-bold"
        style={{
          background: `linear-gradient(135deg, ${colorMap[color]} 0%, ${colorMap[color]}cc 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        {value}
      </p>
    </div>
  );
}

// Neumorphic button component
function NeuButton({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="neu-button"
      style={{
        background: active
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'var(--neu-button-bg)',
        color: active ? 'white' : 'var(--neu-text-primary)',
        border: 'none',
        borderRadius: '14px',
        padding: '12px 24px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: active
          ? '6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px rgba(255,255,255,0.9)'
          : `
            6px 6px 12px var(--neu-shadow-dark),
            -6px -6px 12px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `,
        border: '1px solid var(--neu-border)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `
            8px 8px 16px var(--neu-shadow-dark),
            -8px -8px 16px var(--neu-shadow-light)
          `;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `
            6px 6px 12px var(--neu-shadow-dark),
            -6px -6px 12px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `;
        }
      }}
    >
      {children}
    </button>
  );
}

export default function TeacherEmotionMapPage() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [groupBy, setGroupBy] = useState<'hour' | 'day'>('hour');
  const [emotionStats, setEmotionStats] = useState<EmotionStatsResponse | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    const to = new Date();
    let from = new Date();
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

    setLoadingStats(true);
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
    setLoadingStudents(true);
    fetch('/api/teacher/students')
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => {
        const list = (data.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          averageScore: s.averageScore ?? 0,
          progress: s.progress,
          emotion: s.emotion ?? 'neutral',
          engagement: s.engagement,
        }));
        setStudents(list);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, []);

  const summary = emotionStats?.summary;
  const buckets = emotionStats?.buckets ?? [];

  const pieData = summary?.emotionDistribution
    ? Object.entries(summary.emotionDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
          name: EMOTION_LABELS[k] || k,
          value: v,
          color: EMOTION_COLORS[k] || DEFAULT_COLOR,
        }))
    : [];

  const timelineData = buckets.map((b) => {
    const label = groupBy === 'day'
      ? new Date(b.periodStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : new Date(b.periodStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return {
      period: label,
      sampleCount: b.sampleCount,
      dominantCount: b.dominantCount,
      dominantEmotion: b.dominantEmotion,
      ...b.distribution,
    };
  });

  const happyCount = students.filter((s) => s.emotion === 'happy').length;
  const neutralCount = students.filter((s) => s.emotion === 'neutral').length;
  const sadCount = students.filter((s) => s.emotion === 'sad').length;

  return (
    <div
      className="neu-container min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #e8ebf0 0%, #d8dee8 50%, #e0e5ec 100%)',
        backgroundSize: '200% 200%',
        animation: 'gradientShift 15s ease infinite',
        padding: '24px 32px',
      }}
    >
      {/* Header */}
      <div className="neu-header mb-8" style={{ animation: 'fadeIn 0.8s ease-out' }}>
        <div className="flex items-center gap-4 mb-3">
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '6px 6px 12px rgba(102, 126, 234, 0.4), -4px -4px 8px rgba(255,255,255,0.9)',
            }}
          >
            <Heart className="h-6 w-6" />
          </div>
          <div>
            <h1
              className="text-3xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-1px',
              }}
            >
              Bản đồ cảm xúc học tập
            </h1>
            <p className="text-sm" style={{ color: 'var(--neu-text-secondary)', fontWeight: 500 }}>
              Phân tích biểu cảm từ Vision Tracker và tổng quan cảm xúc lớp học
            </p>
          </div>
        </div>
      </div>

      {/* Time range selector */}
      <div
        className="mb-8 flex flex-wrap items-center gap-4"
        style={{
          background: 'var(--neu-card-bg)',
          borderRadius: '18px',
          padding: '16px 20px',
          boxShadow: `
            8px 8px 16px var(--neu-shadow-dark),
            -8px -8px 16px var(--neu-shadow-light),
            inset 1px 1px 2px var(--neu-shadow-inset-dark)
          `,
          border: '1px solid var(--neu-border)',
          maxWidth: 'fit-content',
        }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
          Khoảng thời gian:
        </span>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <NeuButton
              key={r}
              onClick={() => setTimeRange(r)}
              active={timeRange === r}
            >
              {r === '24h' ? '24 giờ' : r === '7d' ? '7 ngày' : '30 ngày'}
            </NeuButton>
          ))}
        </div>
      </div>

      {/* Section 1: Vision Tracker Stats */}
      <NeuCard className="mb-8" hover={false}>
        <div className="flex items-center gap-3 mb-6">
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4), -2px -2px 4px rgba(255,255,255,0.9)',
            }}
          >
            <Brain className="h-5 w-5" />
          </div>
          <h2
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Thống kê cảm xúc (Vision Tracker)
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--neu-text-secondary)' }}>
          Dữ liệu từ phiên sử dụng Vision Tracker
        </p>

        {loadingStats ? (
          <div
            className="flex items-center justify-center py-16"
            style={{
              background: 'var(--neu-card-bg)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
            }}
          >
            <Loader2 className="h-8 w-8 animate-spin mr-3" style={{ color: 'var(--neu-accent-primary)' }} />
            <span style={{ color: 'var(--neu-text-secondary)', fontWeight: 500 }}>Đang tải thống kê...</span>
          </div>
        ) : !summary ? (
          <div
            className="text-center py-16"
            style={{
              background: 'var(--neu-card-bg)',
              borderRadius: '16px',
              padding: '32px',
              border: '2px dashed var(--neu-border)',
              boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
            }}
          >
            <Info className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--neu-text-muted)', opacity: 0.6 }} />
            <p style={{ color: 'var(--neu-text-secondary)', fontWeight: 500 }}>
              Chưa có dữ liệu cảm xúc trong khoảng thời gian này.
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--neu-text-muted)' }}>
              Sử dụng Vision Tracker (Dashboard) để ghi nhận biểu cảm.
            </p>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <NeuStatBox
                label="Tổng mẫu"
                value={summary.totalSamples}
                icon={<BarChart3 className="h-5 w-5" />}
                color="success"
              />
              <NeuStatBox
                label="Biểu cảm nổi bật"
                value={summary.dominantEmotion ? EMOTION_LABELS[summary.dominantEmotion] || summary.dominantEmotion : '—'}
                icon={<Brain className="h-5 w-5" />}
                color="primary"
              />
              <NeuStatBox
                label="Độ tin cậy TB"
                value={`${Math.round(summary.avgConfidence * 100)}%`}
                icon={<TrendingUp className="h-5 w-5" />}
                color="warning"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pie Chart */}
              <div
                className="neu-chart-container"
                style={{
                  background: 'var(--neu-card-bg)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: `
                    inset 6px 6px 12px var(--neu-shadow-inset-dark),
                    inset -6px -6px 12px var(--neu-shadow-inset-light)
                  `,
                  border: '1px solid var(--neu-border)',
                }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--neu-text-primary)' }}>
                  Phân bố biểu cảm
                </h3>
                {pieData.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: 'var(--neu-text-muted)' }}>
                    Không có dữ liệu
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        style={{ filter: 'drop-shadow(4px 4px 8px rgba(0,0,0,0.2))' }}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'var(--neu-card-bg)',
                          borderRadius: '12px',
                          border: '1px solid var(--neu-border)',
                          boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                        }}
                        formatter={(value: number) => [value, 'Số lần']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Area Chart */}
              <div
                className="neu-chart-container"
                style={{
                  background: 'var(--neu-card-bg)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: `
                    inset 6px 6px 12px var(--neu-shadow-inset-dark),
                    inset -6px -6px 12px var(--neu-shadow-inset-light)
                  `,
                  border: '1px solid var(--neu-border)',
                }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--neu-text-primary)' }}>
                  Dòng thời gian ({groupBy === 'day' ? 'ngày' : 'giờ'})
                </h3>
                {timelineData.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: 'var(--neu-text-muted)' }}>
                    Không có dữ liệu
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="colorSample" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11, fill: 'var(--neu-text-secondary)' }}
                        stroke="var(--neu-text-muted)"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--neu-text-secondary)' }}
                        stroke="var(--neu-text-muted)"
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--neu-card-bg)',
                          borderRadius: '12px',
                          border: '1px solid var(--neu-border)',
                          boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sampleCount"
                        name="Số mẫu"
                        stroke="#667eea"
                        fill="url(#colorSample)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            {timelineData.length > 0 && (
              <div
                className="neu-chart-container"
                style={{
                  background: 'var(--neu-card-bg)',
                  borderRadius: '20px',
                  padding: '24px',
                  boxShadow: `
                    inset 6px 6px 12px var(--neu-shadow-inset-dark),
                    inset -6px -6px 12px var(--neu-shadow-inset-light)
                  `,
                  border: '1px solid var(--neu-border)',
                }}
              >
                <h3 className="font-bold mb-4" style={{ color: 'var(--neu-text-primary)' }}>
                  Biểu cảm nổi bật theo thời gian
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timelineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                      dataKey="period"
                      tick={{ fontSize: 10, fill: 'var(--neu-text-secondary)' }}
                      stroke="var(--neu-text-muted)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--neu-text-secondary)' }}
                      stroke="var(--neu-text-muted)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--neu-card-bg)',
                        borderRadius: '12px',
                        border: '1px solid var(--neu-border)',
                        boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                      }}
                    />
                    <Bar
                      dataKey="dominantCount"
                      name="Số lần (biểu cảm nổi bật)"
                      fill="url(#gradientBar)"
                      radius={[8, 8, 0, 0]}
                    >
                      <defs>
                        <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#667eea" stopOpacity={1} />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </NeuCard>

      {/* Section 2: Class Emotions */}
      <NeuCard className="mb-8" hover={false}>
        <div className="flex items-center gap-3 mb-6">
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '4px 4px 8px rgba(102, 126, 234, 0.4), -2px -2px 4px rgba(255,255,255,0.9)',
            }}
          >
            <Users className="h-5 w-5" />
          </div>
          <h2
            className="text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Cảm xúc lớp học
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--neu-text-secondary)' }}>
          Phân loại theo điểm số & tương tác (happy / neutral / sad)
        </p>

        {loadingStudents ? (
          <div
            className="flex items-center justify-center py-12"
            style={{
              background: 'var(--neu-card-bg)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'inset 6px 6px 12px var(--neu-shadow-inset-dark), inset -6px -6px 12px var(--neu-shadow-inset-light)',
            }}
          >
            <Loader2 className="h-6 w-6 animate-spin mr-3" style={{ color: 'var(--neu-accent-primary)' }} />
            <span style={{ color: 'var(--neu-text-secondary)', fontWeight: 500 }}>Đang tải...</span>
          </div>
        ) : (
          <>
            {/* Emotion counts */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div
                className="neu-emotion-card text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(72, 187, 120, 0.15) 0%, rgba(72, 187, 120, 0.05) 100%)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: `
                    8px 8px 16px var(--neu-shadow-dark),
                    -8px -8px 16px var(--neu-shadow-light),
                    inset 1px 1px 2px var(--neu-shadow-inset-dark)
                  `,
                  border: '1px solid rgba(72, 187, 120, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Smile className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--neu-accent-success)' }} />
                <p className="text-4xl font-bold mb-2" style={{ color: 'var(--neu-accent-success)' }}>
                  {happyCount}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
                  {t?.('emotion.happy') ?? 'Vui'}
                </p>
              </div>
              <div
                className="neu-emotion-card text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(237, 137, 54, 0.15) 0%, rgba(237, 137, 54, 0.05) 100%)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: `
                    8px 8px 16px var(--neu-shadow-dark),
                    -8px -8px 16px var(--neu-shadow-light),
                    inset 1px 1px 2px var(--neu-shadow-inset-dark)
                  `,
                  border: '1px solid rgba(237, 137, 54, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Meh className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--neu-accent-warning)' }} />
                <p className="text-4xl font-bold mb-2" style={{ color: 'var(--neu-accent-warning)' }}>
                  {neutralCount}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
                  Trung lập
                </p>
              </div>
              <div
                className="neu-emotion-card text-center"
                style={{
                  background: 'linear-gradient(145deg, rgba(245, 101, 101, 0.15) 0%, rgba(245, 101, 101, 0.05) 100%)',
                  borderRadius: '20px',
                  padding: '28px',
                  boxShadow: `
                    8px 8px 16px var(--neu-shadow-dark),
                    -8px -8px 16px var(--neu-shadow-light),
                    inset 1px 1px 2px var(--neu-shadow-inset-dark)
                  `,
                  border: '1px solid rgba(245, 101, 101, 0.2)',
                  transition: 'all 0.3s ease',
                }}
              >
                <Frown className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--neu-accent-danger)' }} />
                <p className="text-4xl font-bold mb-2" style={{ color: 'var(--neu-accent-danger)' }}>
                  {sadCount}
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--neu-text-secondary)' }}>
                  Buồn / Cần hỗ trợ
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            <div
              className="neu-chart-container mb-6"
              style={{
                background: 'var(--neu-card-bg)',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: `
                  inset 6px 6px 12px var(--neu-shadow-inset-dark),
                  inset -6px -6px 12px var(--neu-shadow-inset-light)
                `,
                border: '1px solid var(--neu-border)',
              }}
            >
              <h3 className="font-bold mb-4" style={{ color: 'var(--neu-text-primary)' }}>
                Emotion vs Điểm trung bình
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={students.slice(0, 20).map((s) => ({
                    name: s.name.length > 12 ? s.name.slice(0, 10) + '…' : s.name,
                    fullName: s.name,
                    điểm: s.averageScore,
                    emotion: s.emotion,
                  }))}
                  layout="vertical"
                  margin={{ left: 80, right: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: 'var(--neu-text-secondary)' }}
                    stroke="var(--neu-text-muted)"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--neu-text-secondary)' }}
                    stroke="var(--neu-text-muted)"
                    width={78}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--neu-card-bg)',
                      borderRadius: '12px',
                      border: '1px solid var(--neu-border)',
                      boxShadow: '4px 4px 8px var(--neu-shadow-dark), -4px -4px 8px var(--neu-shadow-light)',
                    }}
                    formatter={(value: number) => [value, 'Điểm TB']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
                  />
                  <Bar dataKey="điểm" name="Điểm TB" fill="url(#gradientBar)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Student Table */}
            {students.length > 0 && (
              <div
                className="neu-table-container overflow-x-auto"
                style={{
                  background: 'var(--neu-card-bg)',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: `
                    inset 6px 6px 12px var(--neu-shadow-inset-dark),
                    inset -6px -6px 12px var(--neu-shadow-inset-light)
                  `,
                  border: '1px solid var(--neu-border)',
                }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th
                        className="text-left p-3 font-bold"
                        style={{
                          color: 'var(--neu-text-primary)',
                          borderBottom: '2px solid var(--neu-border)',
                        }}
                      >
                        Học sinh
                      </th>
                      <th
                        className="text-right p-3 font-bold"
                        style={{
                          color: 'var(--neu-text-primary)',
                          borderBottom: '2px solid var(--neu-border)',
                        }}
                      >
                        Điểm TB
                      </th>
                      <th
                        className="text-center p-3 font-bold"
                        style={{
                          color: 'var(--neu-text-primary)',
                          borderBottom: '2px solid var(--neu-border)',
                        }}
                      >
                        Cảm xúc
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 15).map((s, index) => (
                      <tr
                        key={s.id}
                        className="neu-table-row"
                        style={{
                          borderBottom: index < 14 ? '1px solid var(--neu-border)' : 'none',
                          transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--neu-card-hover-bg)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td className="p-3" style={{ color: 'var(--neu-text-primary)', fontWeight: 500 }}>
                          {s.name}
                        </td>
                        <td
                          className="p-3 text-right font-bold"
                          style={{
                            color: 'var(--neu-accent-primary)',
                          }}
                        >
                          {s.averageScore}%
                        </td>
                        <td className="p-3 text-center">
                          {s.emotion === 'happy' && (
                            <span
                              style={{
                                color: 'var(--neu-accent-success)',
                                fontWeight: 600,
                                padding: '6px 14px',
                                background: 'rgba(72, 187, 120, 0.1)',
                                borderRadius: '8px',
                                boxShadow: 'inset 2px 2px 4px rgba(72, 187, 120, 0.2), inset -2px -2px 4px rgba(255,255,255,0.5)',
                              }}
                            >
                              😊 Vui
                            </span>
                          )}
                          {s.emotion === 'neutral' && (
                            <span
                              style={{
                                color: 'var(--neu-accent-warning)',
                                fontWeight: 600,
                                padding: '6px 14px',
                                background: 'rgba(237, 137, 54, 0.1)',
                                borderRadius: '8px',
                                boxShadow: 'inset 2px 2px 4px rgba(237, 137, 54, 0.2), inset -2px -2px 4px rgba(255,255,255,0.5)',
                              }}
                            >
                              😐 Trung lập
                            </span>
                          )}
                          {s.emotion === 'sad' && (
                            <span
                              style={{
                                color: 'var(--neu-accent-danger)',
                                fontWeight: 600,
                                padding: '6px 14px',
                                background: 'rgba(245, 101, 101, 0.1)',
                                borderRadius: '8px',
                                boxShadow: 'inset 2px 2px 4px rgba(245, 101, 101, 0.2), inset -2px -2px 4px rgba(255,255,255,0.5)',
                              }}
                            >
                              😢 Cần hỗ trợ
                            </span>
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
      </NeuCard>
    </div>
  );
}
