/**
 * Teacher Emotion Map Page  — DARK THEME
 * Matches original Next.js dark design exactly.
 * bg-[#0d0e17] page / bg-[#10111e] cards / border-[#1e2033]
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts'
import {
  Heart, Smile, Frown, Meh, TrendingUp, Users,
  BarChart3, Brain, Loader2, Info, Activity, Eye,
  AlertTriangle, Zap, Sparkles, RefreshCw,
} from 'lucide-react'

// ── Emotion Config ──────────────────────────────────────────────
const EMOTION_LABELS: Record<string, string> = {
  happy: 'Vui vẻ', sad: 'Buồn', neutral: 'Trung lập',
  angry: 'Tức giận', surprised: 'Ngạc nhiên', fearful: 'Sợ hãi',
  disgusted: 'Chán ghét', very_happy: 'Rất vui', laughing: 'Cười',
  confused: 'Bối rối', worried: 'Lo lắng', thinking: 'Suy nghĩ',
  sleepy: 'Buồn ngủ', bored: 'Chán', excited: 'Hào hứng',
  concentrating: 'Tập trung', poker_face: 'Bình thản',
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#10B981', sad: '#EF4444', neutral: '#6B7280',
  angry: '#DC2626', surprised: '#F59E0B', fearful: '#8B5CF6',
  disgusted: '#78716C', very_happy: '#059669', laughing: '#34D399',
  confused: '#A78BFA', worried: '#F97316', thinking: '#3B82F6',
  sleepy: '#94A3B8', bored: '#64748B', excited: '#EC4899',
  concentrating: '#06B6D4', poker_face: '#9CA3AF',
}

const POSITIVE_EMOTIONS = new Set(['happy', 'very_happy', 'laughing', 'excited', 'concentrating'])
const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'worried', 'bored', 'sleepy', 'disgusted'])
const DEFAULT_COLOR = '#94A3B8'

// ── Dark palette ────────────────────────────────────────────────
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


// ── Types ───────────────────────────────────────────────────────
interface EmotionStatsBucket {
  periodStart: string
  periodEnd: string
  sampleCount: number
  avgConfidence: number
  dominantEmotion: string | null
  dominantCount: number
  distribution: Record<string, number>
}

interface EmotionStatsResponse {
  success: boolean
  groupBy: string
  buckets: EmotionStatsBucket[]
  summary: {
    from: string
    to: string
    totalSamples: number
    avgConfidence: number
    emotionDistribution: Record<string, number>
    dominantEmotion: string | null
  }
}

interface StudentRow {
  id: string
  name: string
  email?: string
  averageScore: number
  progress?: number
  emotion: 'happy' | 'neutral' | 'sad'
  engagement?: number
}

// ── Demo data ───────────────────────────────────────────────────
const DEMO_STUDENTS: StudentRow[] = [
  { id: '1', name: 'Nguyễn Văn A', averageScore: 92, emotion: 'happy',   engagement: 88 },
  { id: '2', name: 'Trần Thị B',   averageScore: 65, emotion: 'neutral', engagement: 55 },
  { id: '3', name: 'Lê Văn C',     averageScore: 78, emotion: 'happy',   engagement: 72 },
  { id: '4', name: 'Phạm Thị D',   averageScore: 40, emotion: 'sad',     engagement: 30 },
  { id: '5', name: 'Hoàng Văn E',  averageScore: 85, emotion: 'happy',   engagement: 80 },
]

// ── Chart tooltip (dark) ────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: 'hsl(225 15% 10%)',
    border: `1px solid ${D.border2}`,
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    color: D.text,
    fontSize: '12px',
    padding: '10px 14px',
  },
  itemStyle:  { color: D.muted },
  labelStyle: { color: D.muted, fontWeight: 600 },
}

// ── Sub-components ──────────────────────────────────────────────
function DarkCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-6 ${className}`}
      style={{ background: D.card, borderColor: D.border }}
    >
      {children}
    </div>
  )
}

function StatBox({
  label, value, icon, color = 'blue', subtitle,
}: {
  label: string; value: string | number
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  subtitle?: string
}) {
  const map = {
    blue:   { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
    green:  { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
    purple: { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa' },
    orange: { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c' },
    red:    { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
  }
  const c = map[color]
  return (
    <div
      className="rounded-xl border p-6"
      style={{ background: D.card, borderColor: D.border }}
    >
      <div className="flex items-center gap-3 mb-3">
        {icon && (
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: c.bg, color: c.text }}
          >
            {icon}
          </div>
        )}
        <p className="text-sm font-medium" style={{ color: D.muted }}>{label}</p>
      </div>
      <p className="text-2xl font-bold" style={{ color: c.text }}>{value}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: D.muted2 }}>{subtitle}</p>}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold" style={{ color: D.text }}>{title}</h2>
        <p className="text-sm mt-0.5" style={{ color: D.muted }}>{subtitle}</p>
      </div>
    </div>
  )
}

// ── Inner chart panel ───────────────────────────────────────────
function ChartPanel({ title, icon, children, className = '' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${className}`}
      style={{ background: D.card2, borderColor: D.border }}
    >
      <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: D.text }}>
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────
export default function TeacherEmotionMapPage() {
  const [timeRange,       setTimeRange]       = useState<'24h' | '7d' | '30d'>('7d')
  const [groupBy,         setGroupBy]         = useState<'hour' | 'day'>('hour')
  const [emotionStats,    setEmotionStats]    = useState<EmotionStatsResponse | null>(null)
  const [students,        setStudents]        = useState<StudentRow[]>([])
  const [loadingStats,    setLoadingStats]    = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(true)

  // ── Fetch emotion stats ────────────────────────────────────
  const fetchStats = useCallback(() => {
    const to   = new Date()
    const from = new Date()
    let g: 'hour' | 'day' = 'hour'
    if (timeRange === '24h') {
      from.setTime(to.getTime() - 24 * 60 * 60 * 1000)
    } else if (timeRange === '7d') {
      from.setTime(to.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      from.setTime(to.getTime() - 30 * 24 * 60 * 60 * 1000)
      g = 'day'
    }
    setGroupBy(g)
    const params = new URLSearchParams({
      from: from.toISOString(), to: to.toISOString(),
      groupBy: g, limit: g === 'day' ? '31' : '96',
    })
    fetch(`/api/emotion/stats?${params}`)
      .then(res => res.ok ? res.json() : { success: false, buckets: [], summary: null })
      .then(data => {
        if (data.success && data.summary) setEmotionStats(data)
        else setEmotionStats(null)
      })
      .catch(() => setEmotionStats(null))
      .finally(() => setLoadingStats(false))
  }, [timeRange])

  useEffect(() => {
    setLoadingStats(true)
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  useEffect(() => {
    setLoadingStudents(true)
    fetch('/api/teacher/students')
      .then(res => res.ok ? res.json() : { students: [] })
      .then(data => {
        const list = (data.students || []).map((s: any) => ({
          id: s.id, name: s.name, email: s.email,
          averageScore: s.averageScore ?? 0, progress: s.progress,
          emotion: s.emotion ?? 'neutral', engagement: s.engagement,
        }))
        setStudents(list.length > 0 ? list : DEMO_STUDENTS)
      })
      .catch(() => setStudents(DEMO_STUDENTS))
      .finally(() => setLoadingStudents(false))
  }, [])

  // ── Derived data ───────────────────────────────────────────
  const summary = emotionStats?.summary
  const buckets = useMemo(() => emotionStats?.buckets ?? [], [emotionStats])

  const pieData = useMemo(() =>
    summary?.emotionDistribution
      ? Object.entries(summary.emotionDistribution)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => ({
            name: EMOTION_LABELS[k] || k,
            key: k, value: v,
            color: EMOTION_COLORS[k] || DEFAULT_COLOR,
          }))
      : [],
  [summary])

  const timelineData = useMemo(() =>
    buckets.map(b => {
      const label = groupBy === 'day'
        ? new Date(b.periodStart).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        : new Date(b.periodStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      return {
        period: label, sampleCount: b.sampleCount,
        dominantCount: b.dominantCount, dominantEmotion: b.dominantEmotion,
        confidence: Math.round((b.avgConfidence || 0) * 100),
        ...b.distribution,
      }
    }),
  [buckets, groupBy])

  const sentimentMetrics = useMemo(() => {
    if (!summary?.emotionDistribution) return { positive: 0, negative: 0, neutral: 0, score: 50 }
    const dist = summary.emotionDistribution
    let positive = 0, negative = 0, neutral = 0
    for (const [k, v] of Object.entries(dist)) {
      if (POSITIVE_EMOTIONS.has(k)) positive += v
      else if (NEGATIVE_EMOTIONS.has(k)) negative += v
      else neutral += v
    }
    const total = positive + negative + neutral
    const score = total > 0 ? Math.round(((positive - negative) / total + 1) * 50) : 50
    return { positive, negative, neutral, score }
  }, [summary])

  const radarData = useMemo(() => {
    if (!summary?.emotionDistribution) return []
    const total = Object.values(summary.emotionDistribution).reduce((a, b) => a + b, 0)
    if (total === 0) return []
    const categories = [
      { label: 'Vui vẻ',     emotions: ['happy', 'very_happy', 'laughing', 'excited']      },
      { label: 'Tập trung',  emotions: ['concentrating', 'thinking']                        },
      { label: 'Bình thản',  emotions: ['neutral', 'poker_face']                            },
      { label: 'Căng thẳng', emotions: ['worried', 'fearful', 'angry']                      },
      { label: 'Mệt mỏi',   emotions: ['sleepy', 'bored']                                  },
      { label: 'Bối rối',   emotions: ['confused', 'surprised', 'disgusted', 'sad']         },
    ]
    return categories.map(cat => {
      const count = cat.emotions.reduce((sum, e) => sum + (summary.emotionDistribution[e] || 0), 0)
      return { category: cat.label, value: Math.round((count / total) * 100) }
    })
  }, [summary])

  const happyCount   = students.filter(s => s.emotion === 'happy').length
  const neutralCount = students.filter(s => s.emotion === 'neutral').length
  const sadCount     = students.filter(s => s.emotion === 'sad').length

  const scoreColor = sentimentMetrics.score >= 60 ? 'green'
    : sentimentMetrics.score >= 40 ? 'orange' : 'red'

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: D.bg }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: D.bg, borderColor: D.border }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: D.text }}>Emotion Map</h1>
              <p className="text-sm" style={{ color: D.muted }}>Bản đồ cảm xúc học tập</p>
            </div>
          </div>
          <button
            onClick={() => { setLoadingStats(true); fetchStats() }}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            style={{ color: D.muted }}
            onMouseEnter={e => (e.currentTarget.style.background = D.card)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* Setup Guide Banner — hiển thị khi chưa có dữ liệu cảm xúc */}
        {!loadingStats && (!summary || summary.totalSamples === 0) && (
          <div
            className="mb-6 rounded-xl border overflow-hidden"
            style={{ borderColor: D.border, background: D.card }}
          >
            <div className="px-5 py-4 border-b flex items-center gap-2"
              style={{ borderColor: D.border, background: `linear-gradient(90deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))` }}>
              <Sparkles className="w-5 h-5" style={{ color: '#a78bfa' }} />
              <h3 className="text-base font-bold" style={{ color: D.text }}>Hướng dẫn kích hoạt theo dõi cảm xúc</h3>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="rounded-lg p-4 border" style={{ borderColor: D.border, background: D.card2 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>1</span>
                  <h4 className="font-semibold text-sm" style={{ color: D.text }}>Cấp quyền camera</h4>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: D.muted }}>
                  Vào <a href="/teacher/camera-management" className="underline" style={{ color: '#a78bfa' }}>Quản lý camera</a> →
                  Thêm camera lớp/cá nhân → cho phép trình duyệt truy cập webcam.
                </p>
              </div>
              {/* Step 2 */}
              <div className="rounded-lg p-4 border" style={{ borderColor: D.border, background: D.card2 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #ec4899, #f472b6)' }}>2</span>
                  <h4 className="font-semibold text-sm" style={{ color: D.text }}>Bật AI Vision Tracker</h4>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: D.muted }}>
                  Trong tiết học, khởi động Vision Tracker (góc trên-phải camera) → AI sẽ phân tích
                  17 biểu cảm trên khuôn mặt HS theo thời gian thực.
                </p>
              </div>
              {/* Step 3 */}
              <div className="rounded-lg p-4 border" style={{ borderColor: D.border, background: D.card2 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #22d3ee)' }}>3</span>
                  <h4 className="font-semibold text-sm" style={{ color: D.text }}>Xem thống kê</h4>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: D.muted }}>
                  Dữ liệu cảm xúc tự động ghi vào bảng này. Lọc theo 24h/7 ngày/30 ngày để
                  phát hiện HS căng thẳng/buồn ngủ/chán nản và can thiệp sớm.
                </p>
              </div>
            </div>
            {/* Privacy notice */}
            <div className="px-5 py-3 border-t flex items-start gap-2" style={{ borderColor: D.border, background: D.card2 }}>
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: D.muted2 }} />
              <p className="text-[11px] leading-relaxed" style={{ color: D.muted }}>
                <strong>Bảo mật:</strong> AI Vision chỉ trích xuất biểu cảm (vui/buồn/tập trung), KHÔNG
                lưu ảnh/video gốc. Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
                HS có thể tắt camera bất kỳ lúc nào.
              </p>
            </div>
          </div>
        )}

        {/* Time Range Selector */}
        <div
          className="rounded-xl border p-4 mb-6"
          style={{ background: D.card, borderColor: D.border }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <span className="text-sm font-medium" style={{ color: D.muted }}>Khoảng thời gian:</span>
            <div
              className="flex items-center rounded-lg p-1"
              style={{ background: D.card2 }}
            >
              {(['24h', '7d', '30d'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
                  style={timeRange === r
                    ? { background: '#7c3aed', color: '#fff' }
                    : { color: D.muted }
                  }
                >
                  {r === '24h' ? '24 giờ' : r === '7d' ? '7 ngày' : '30 ngày'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
         * SECTION 1: Sentiment Overview
         * ══════════════════════════════════════ */}
        <DarkCard className="mb-6">
          <SectionHeader
            icon={<Zap className="w-5 h-5" />}
            title="Tổng quan tâm trạng"
            subtitle="Chỉ số cảm xúc tổng hợp từ Vision Tracker & Camera AI"
          />

          {loadingStats ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              <span className="font-medium ml-3" style={{ color: D.muted }}>Đang tải thống kê...</span>
            </div>
          ) : !summary ? (
            <div
              className="text-center py-16 border-2 border-dashed rounded-xl"
              style={{ borderColor: D.border2 }}
            >
              <Info className="w-12 h-12 mx-auto mb-4" style={{ color: D.muted2 }} />
              <p className="font-medium" style={{ color: D.muted }}>Chưa có dữ liệu cảm xúc trong khoảng thời gian này.</p>
              <p className="text-sm mt-2" style={{ color: D.muted2 }}>
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
                  icon={<BarChart3 className="w-5 h-5" />}
                  color="blue"
                  subtitle={timeRange === '24h' ? '24 giờ gần nhất' : timeRange === '7d' ? '7 ngày gần nhất' : '30 ngày gần nhất'}
                />
                <StatBox
                  label="Biểu cảm chính"
                  value={summary.dominantEmotion ? (EMOTION_LABELS[summary.dominantEmotion] || summary.dominantEmotion) : '—'}
                  icon={<Brain className="w-5 h-5" />}
                  color="purple"
                />
                <StatBox
                  label="Độ tin cậy TB"
                  value={`${Math.round(summary.avgConfidence * 100)}%`}
                  icon={<Eye className="w-5 h-5" />}
                  color="orange"
                />
                <StatBox
                  label="Sentiment Score"
                  value={`${sentimentMetrics.score}/100`}
                  icon={<TrendingUp className="w-5 h-5" />}
                  color={scoreColor}
                  subtitle={sentimentMetrics.score >= 60 ? 'Tích cực' : sentimentMetrics.score >= 40 ? 'Trung bình' : 'Cần lưu ý'}
                />
                <StatBox
                  label="Loại cảm xúc"
                  value={pieData.length}
                  icon={<Activity className="w-5 h-5" />}
                  color="blue"
                  subtitle={`/ ${Object.keys(EMOTION_LABELS).length} loại nhận diện`}
                />
              </div>

              {/* Sentiment bar */}
              <div
                className="rounded-xl border p-5"
                style={{ background: D.card2, borderColor: D.border }}
              >
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-sm font-bold" style={{ color: D.text }}>Thanh Sentiment</span>
                  <div className="flex items-center gap-4 text-xs" style={{ color: D.muted }}>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                      Tích cực: {sentimentMetrics.positive}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block" />
                      Trung lập: {sentimentMetrics.neutral}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      Tiêu cực: {sentimentMetrics.negative}
                    </span>
                  </div>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden flex"
                  style={{ background: D.border2 }}
                >
                  {(() => {
                    const total = sentimentMetrics.positive + sentimentMetrics.neutral + sentimentMetrics.negative
                    if (total === 0) return null
                    return (
                      <>
                        <div className="h-full rounded-l-full bg-gradient-to-r from-green-600 to-green-500" style={{ width: `${(sentimentMetrics.positive / total) * 100}%` }} />
                        <div className="h-full bg-gradient-to-r from-gray-600 to-gray-500" style={{ width: `${(sentimentMetrics.neutral / total) * 100}%` }} />
                        <div className="h-full rounded-r-full bg-gradient-to-r from-red-600 to-red-500" style={{ width: `${(sentimentMetrics.negative / total) * 100}%` }} />
                      </>
                    )
                  })()}
                </div>
              </div>
            </>
          )}
        </DarkCard>

        {/* ══════════════════════════════════════
         * SECTION 2: Detailed Charts
         * ══════════════════════════════════════ */}
        {summary && (
          <DarkCard className="mb-6">
            <SectionHeader
              icon={<Brain className="w-5 h-5" />}
              title="Phân tích chi tiết"
              subtitle="Biểu đồ phân bố và dòng thời gian cảm xúc"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pie chart */}
              <ChartPanel
                title="Phân bố biểu cảm"
                icon={<Sparkles className="w-4 h-4 text-purple-400" />}
              >
                {pieData.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: D.muted }}>Không có dữ liệu</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={100}
                        paddingAngle={3}
                        dataKey="value" nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [v, 'Số lần']} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>

              {/* Radar chart */}
              <ChartPanel
                title="Radar cảm xúc nhóm"
                icon={<Activity className="w-4 h-4 text-purple-400" />}
              >
                {radarData.length === 0 ? (
                  <p className="text-sm text-center py-12" style={{ color: D.muted }}>Không có dữ liệu</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke={D.border2} />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: D.muted }} />
                      <PolarRadiusAxis tick={{ fontSize: 9, fill: D.muted2 }} domain={[0, 100]} axisLine={false} />
                      <Radar name="Mức độ (%)" dataKey="value" stroke="hsl(245 85% 65%)" fill="hsl(245 85% 65%)" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Tỷ lệ']} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </div>

            {/* Timeline area chart */}
            <ChartPanel
              title={`Dòng thời gian (${groupBy === 'day' ? 'ngày' : 'giờ'})`}
              icon={<TrendingUp className="w-4 h-4 text-green-400" />}
              className="mb-6"
            >
              {timelineData.length === 0 ? (
                <p className="text-sm text-center py-12" style={{ color: D.muted }}>Không có dữ liệu</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="gradSample" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(245 85% 65%)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="hsl(245 85% 65%)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradConf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(155 75% 45%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(155 75% 45%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.grid} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: D.muted }} stroke={D.border} />
                    <YAxis tick={{ fontSize: 11, fill: D.muted }} stroke={D.border} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ color: D.muted, fontSize: '12px' }} />
                    <Area type="monotone" dataKey="sampleCount" name="Số mẫu"         stroke="hsl(245 85% 65%)" fill="url(#gradSample)" strokeWidth={2} />
                    <Area type="monotone" dataKey="confidence"  name="Độ tin cậy (%)" stroke="hsl(155 75% 45%)" fill="url(#gradConf)"   strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartPanel>

            {/* Bar chart — dominant emotion per bucket */}
            {timelineData.length > 0 && (
              <ChartPanel
                title="Biểu cảm nổi bật theo thời gian"
                icon={<BarChart3 className="w-4 h-4 text-yellow-400" />}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timelineData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={D.grid} />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: D.muted }} stroke={D.border} />
                    <YAxis tick={{ fontSize: 11, fill: D.muted }} stroke={D.border} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value: number, _name: string, props: any) => {
                        const emotion = props.payload?.dominantEmotion
                        return [value, `Biểu cảm nổi bật (${EMOTION_LABELS[emotion] || emotion || '?'})`]
                      }}
                    />
                    <Bar dataKey="dominantCount" name="Số lần" fill="hsl(245 85% 65%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            )}
          </DarkCard>
        )}

        {/* ══════════════════════════════════════
         * SECTION 3: Class Emotion Map
         * ══════════════════════════════════════ */}
        <DarkCard className="mb-8">
          <SectionHeader
            icon={<Users className="w-5 h-5" />}
            title="Cảm xúc lớp học"
            subtitle="Phân loại theo điểm số & tương tác"
          />

          {loadingStudents ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mr-3 text-purple-400" />
              <span className="font-medium" style={{ color: D.muted }}>Đang tải...</span>
            </div>
          ) : (
            <>
              {/* Emotion counters */}
              <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
                <div
                  className="rounded-xl border p-6 text-center transition-colors"
                  style={{ background: D.card2, borderColor: 'rgba(16,185,129,0.25)' }}
                >
                  <Smile className="w-10 h-10 mx-auto mb-3 text-green-400" />
                  <p className="text-3xl md:text-4xl font-bold text-green-400">{happyCount}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: D.muted }}>Vui vẻ</p>
                </div>
                <div
                  className="rounded-xl border p-6 text-center transition-colors"
                  style={{ background: D.card2, borderColor: 'rgba(251,191,36,0.25)' }}
                >
                  <Meh className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
                  <p className="text-3xl md:text-4xl font-bold text-yellow-400">{neutralCount}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: D.muted }}>Trung lập</p>
                </div>
                <div
                  className="rounded-xl border p-6 text-center transition-colors"
                  style={{ background: D.card2, borderColor: 'rgba(239,68,68,0.25)' }}
                >
                  <Frown className="w-10 h-10 mx-auto mb-3 text-red-400" />
                  <p className="text-3xl md:text-4xl font-bold text-red-400">{sadCount}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: D.muted }}>Cần hỗ trợ</p>
                </div>
              </div>

              {/* Alert: negative > 30% */}
              {students.length > 0 && (sadCount / students.length) > 0.3 && (
                <div
                  className="flex items-center gap-3 rounded-xl border p-4 mb-6"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}
                >
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <p className="font-bold text-red-400 text-sm">Cảnh báo: Tỷ lệ tiêu cực cao</p>
                    <p className="text-xs mt-0.5" style={{ color: D.muted }}>
                      {Math.round((sadCount / students.length) * 100)}% học sinh đang có cảm xúc tiêu cực. Cân nhắc điều chỉnh phương pháp giảng dạy.
                    </p>
                  </div>
                </div>
              )}

              {/* Emotion vs Score bar chart */}
              <ChartPanel
                title="Emotion vs Điểm trung bình"
                icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
                className="mb-6"
              >
                <ResponsiveContainer width="100%" height={Math.max(200, students.slice(0, 20).length * 36)}>
                  <BarChart
                    data={students.slice(0, 20).map(s => ({
                      name:     s.name.length > 12 ? s.name.slice(0, 10) + '…' : s.name,
                      fullName: s.name,
                      score:    s.averageScore,
                      emotion:  s.emotion,
                    }))}
                    layout="vertical"
                    margin={{ left: 80, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={D.grid} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: D.muted }} stroke={D.border} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: D.muted }} stroke={D.border} width={78} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number) => [v, 'Điểm TB']}
                      labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.fullName}
                    />
                    <Bar dataKey="score" name="Điểm TB" fill="hsl(245 85% 65%)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              {/* Student table */}
              {students.length > 0 && (
                <div
                  className="rounded-xl border overflow-x-auto"
                  style={{ borderColor: D.border }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: D.card2 }}>
                        <th className="text-left p-3 font-bold border-b" style={{ color: D.text, borderColor: D.border }}>Học sinh</th>
                        <th className="text-right p-3 font-bold border-b" style={{ color: D.text, borderColor: D.border }}>Điểm TB</th>
                        <th className="text-center p-3 font-bold border-b" style={{ color: D.text, borderColor: D.border }}>Cảm xúc</th>
                        <th className="text-center p-3 font-bold border-b" style={{ color: D.text, borderColor: D.border }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 20).map(s => (
                        <tr
                          key={s.id}
                          className="border-b last:border-0 transition-colors"
                          style={{ borderColor: D.border }}
                          onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td className="p-3 font-medium" style={{ color: D.text }}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background: s.emotion === 'happy' ? '#10b981'
                                    : s.emotion === 'sad' ? '#ef4444' : '#f59e0b',
                                }}
                              />
                              {s.name}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className="font-bold"
                              style={{
                                color: s.averageScore >= 80 ? '#34d399'
                                  : s.averageScore >= 50 ? '#a78bfa' : '#f87171',
                              }}
                            >
                              {s.averageScore}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {s.emotion === 'happy' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold"
                                style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
                                😊 Vui vẻ
                              </span>
                            )}
                            {s.emotion === 'neutral' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold"
                                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>
                                😐 Trung lập
                              </span>
                            )}
                            {s.emotion === 'sad' && (
                              <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                😢 Cần hỗ trợ
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {s.averageScore >= 80 && s.emotion === 'happy' ? (
                              <span className="text-xs font-bold text-green-400">Xuất sắc</span>
                            ) : s.averageScore < 50 && s.emotion === 'sad' ? (
                              <span className="text-xs font-bold text-red-400 flex items-center justify-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Cần hỗ trợ
                              </span>
                            ) : (
                              <span className="text-xs" style={{ color: D.muted2 }}>Bình thường</span>
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
        </DarkCard>

      </div>
    </div>
  )
}
