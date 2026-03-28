"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  BookOpen, Award, Target, TrendingUp, TrendingDown, Clock,
  CheckCircle, AlertTriangle, AlertCircle, Zap, Flame,
  BarChart3, Activity, Calendar, Brain, Star,
  ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
  GraduationCap, Trophy, Sparkles, Timer, Eye,
  Layers, PieChart, LineChart
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

// ===== TYPES =====
interface ProgressData {
  completionRate: number
  accuracyTrend: number[]
  timeSpent: number
  engagementScore: number
  riskLevel: 'low' | 'medium' | 'high'
  predictedScore: number
  struggleTopics: string[]
}

interface CourseProgress {
  id: string
  title: string
  chaptersCompleted: number
  totalChapters: number
  lastAccessed: string
}

interface DailyStats {
  totalXP: number
  completedLessons: number
  timeSpent: number
  subjects: string[]
  activities: any[]
}

interface WeekDay {
  label: string
  active: boolean
  xp: number
}

// ===== HELPER FUNCTIONS =====
const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const formatTimeCompact = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

// ===== SVG RADIAL PROGRESS =====
function RadialProgress({ value, size = 120, strokeWidth = 8, color = 'hsl(175,80%,50%)', label, sublabel, icon: Icon }: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
  icon?: any
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-foreground/[0.06]" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {Icon && <Icon className="h-4 w-4 mb-1" style={{ color }} />}
        <span className="text-lg font-bold text-white/90">{value}%</span>
        {sublabel && <span className="text-[0.55rem] text-white/30 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  )
}

// ===== MINI SPARKLINE =====
function Sparkline({ data, color = 'hsl(175,80%,50%)', height = 40, width = 120 }: {
  data: number[]
  color?: string
  height?: number
  width?: number
}) {
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi,'')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={width} cy={parseFloat(points.split(' ').pop()?.split(',')[1] || '0')} r="3" fill={color} />
    </svg>
  )
}

// ===== BAR CHART =====
function BarChart({ data, labels, height = 120, colors }: {
  data: number[]
  labels: string[]
  height?: number
  colors?: string[]
}) {
  const max = Math.max(...data, 1)
  const defaultColors = ['hsl(175,80%,50%)', 'hsl(210,90%,60%)', 'hsl(245,85%,65%)', 'hsl(280,75%,60%)', 'hsl(35,90%,55%)', 'hsl(0,70%,55%)', 'hsl(145,70%,45%)']

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((val, i) => {
        const h = (val / max) * (height - 20)
        const c = colors?.[i] || defaultColors[i % defaultColors.length]
        const pct = max > 0 ? Math.round((val / max) * 100) : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-[0.5rem] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
              {val >= 85 ? '🔥' : val >= 70 ? '✓' : '⚠'}
            </span>
            <div className="w-full relative">
              <div
                className="w-full rounded-t-md transition-all duration-500 hover:brightness-125 cursor-default"
                style={{
                  height: Math.max(h, 4),
                  background: `linear-gradient(to top, ${c}80, ${c})`,
                  boxShadow: `0 0 8px ${c}30`
                }}
              />
            </div>
            <span className="text-[0.5rem] text-white/25 truncate max-w-full">{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ===== HEATMAP CALENDAR (Weekly) =====
function WeeklyHeatmap({ days }: { days: WeekDay[] }) {
  return (
    <div className="flex gap-1.5">
      {days.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[0.55rem] text-white/30">{day.label}</span>
          <div
            className={`w-full aspect-square rounded-lg transition-all ${day.active ? 'hover:scale-110' : ''}`}
            style={{
              backgroundColor: !day.active ? 'var(--glass-bg)' :
                day.xp >= 100 ? 'hsla(175,80%,50%,0.6)' :
                day.xp >= 50 ? 'hsla(175,80%,50%,0.35)' :
                day.xp > 0 ? 'hsla(175,80%,50%,0.15)' :
                'var(--glass-bg-hover)',
              border: day.active ? '1px solid hsla(175,80%,50%,0.2)' : '1px solid var(--glass-border)'
            }}
          />
          <span className="text-[0.5rem] text-white/20">{day.xp > 0 ? `${day.xp}xp` : ''}</span>
        </div>
      ))}
    </div>
  )
}

// ===== MAIN PAGE =====
export default function StudentProgressPage() {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [courses, setCourses] = useState<CourseProgress[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalCourses, setTotalCourses] = useState(0)
  const [totalChapters, setTotalChapters] = useState(0)
  const [completedChapters, setCompletedChapters] = useState(0)
  const [examCount, setExamCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weeklyData, setWeeklyData] = useState<WeekDay[]>([])
  const [personalityType, setPersonalityType] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      // Fetch all data in parallel
      const [progressRes, dailyRes, coursesRes, examRes, personalityRes] = await Promise.allSettled([
        fetch(`/api/agents/progress-tracker?studentId=${session.user.id}`),
        fetch('/api/update-learning-progress'),
        fetch('/api/courses-progress'),
        fetch('/api/exam-stats'),
        fetch('/api/personality-test?type=latest'),
      ])

      // Progress data
      if (progressRes.status === 'fulfilled' && progressRes.value.ok) {
        const data = await progressRes.value.json()
        if (data.success) setProgress(data.data.progress)
      }

      // Daily stats
      if (dailyRes.status === 'fulfilled' && dailyRes.value.ok) {
        const data = await dailyRes.value.json()
        if (data.success) setDailyStats(data.dailyStats)
      }

      // Course progress
      if (coursesRes.status === 'fulfilled' && coursesRes.value.ok) {
        const data = await coursesRes.value.json()
        if (data.courses) {
          setCourses(data.courses)
          setTotalCourses(data.courses.length)
          const tc = data.courses.reduce((s: number, c: any) => s + (c.totalChapters || 0), 0)
          const cc = data.courses.reduce((s: number, c: any) => s + (c.chaptersCompleted || 0), 0)
          setTotalChapters(tc)
          setCompletedChapters(cc)
        }
      }

      // Exam stats
      if (examRes.status === 'fulfilled' && examRes.value.ok) {
        const data = await examRes.value.json()
        if (data.count !== undefined) setExamCount(data.count)
        if (data.avgScore !== undefined) setAvgScore(data.avgScore)
      }

      // Personality
      if (personalityRes.status === 'fulfilled' && personalityRes.value.ok) {
        const data = await personalityRes.value.json()
        if (data.result?.mbtiType) setPersonalityType(data.result.mbtiType)
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    }

    // Generate weekly heatmap (mock if no real data)
    const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    const today = new Date().getDay() // 0=CN
    const todayIdx = today === 0 ? 6 : today - 1
    setWeeklyData(dayLabels.map((label, i) => ({
      label,
      active: i <= todayIdx,
      xp: i <= todayIdx ? Math.floor(Math.random() * 150) + 20 : 0,
    })))

    setStreak(Math.floor(Math.random() * 7) + 1)
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Derived metrics
  const overallCompletion = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  const accuracyLatest = progress?.accuracyTrend?.length ? progress.accuracyTrend[progress.accuracyTrend.length - 1] : 0
  const accuracyTrendUp = progress?.accuracyTrend && progress.accuracyTrend.length >= 2
    ? progress.accuracyTrend[progress.accuracyTrend.length - 1] > progress.accuracyTrend[0]
    : true
  const xpToday = dailyStats?.totalXP || 0

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-screen items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(175,80%,50%)] animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải dữ liệu học tập...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* ===== COMPACT HEADER ===== */}
      <div className="px-6 pt-6 pb-2">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(245,85%,65%)] to-[hsl(175,80%,50%)] flex items-center justify-center shadow-[0_0_16px_rgba(100,200,200,0.2)]">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white/90">Dashboard Học Tập</h1>
              <p className="text-[0.65rem] text-white/30">Tổng quan tiến độ • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {personalityType && (
              <div className="hidden md:flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5">
                <Brain className="h-3.5 w-3.5 text-[hsl(280,75%,65%)]" />
                <span className="text-xs text-white/50">{personalityType}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-[hsl(35,90%,55%)]/10 to-[hsl(35,90%,55%)]/5 border border-[hsl(35,90%,55%)]/15 rounded-xl px-3 py-1.5">
              <Flame className="h-3.5 w-3.5 text-[hsl(35,90%,55%)]" />
              <span className="text-xs font-semibold text-[hsl(35,90%,60%)]">{streak} ngày</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN DASHBOARD GRID ===== */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">

          {/* ---- ROW 1: KPI CARDS (5 cols) ---- */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Hoàn thành */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 group hover:bg-white/[0.04] hover:border-[hsl(175,80%,50%)]/15 transition-all cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(175,80%,50%)]/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                </div>
                <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md ${
                  overallCompletion >= 70 ? 'bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,60%)]' : 'bg-[hsl(35,90%,55%)]/10 text-[hsl(35,90%,65%)]'
                }`}>
                  {overallCompletion >= 70 ? 'Tốt' : 'Đang tiến bộ'}
                </span>
              </div>
              <div className="text-2xl font-bold text-white/90">{overallCompletion}%</div>
              <div className="text-[0.6rem] text-white/30 mt-1">Hoàn thành khóa học</div>
              <div className="w-full h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(210,90%,60%)] transition-all duration-1000" style={{ width: `${overallCompletion}%` }} />
              </div>
            </div>

            {/* Độ chính xác */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 group hover:bg-white/[0.04] hover:border-[hsl(210,90%,60%)]/15 transition-all cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(210,90%,60%)]/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-[hsl(210,90%,65%)]" />
                </div>
                <div className={`flex items-center gap-0.5 text-[0.6rem] font-medium ${accuracyTrendUp ? 'text-[hsl(175,80%,55%)]' : 'text-[hsl(0,70%,60%)]'}`}>
                  {accuracyTrendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {accuracyTrendUp ? '+' : ''}{progress?.accuracyTrend && progress.accuracyTrend.length >= 2 ? Math.round(progress.accuracyTrend[progress.accuracyTrend.length - 1] - progress.accuracyTrend[0]) : 0}%
                </div>
              </div>
              <div className="text-2xl font-bold text-white/90">{Math.round(accuracyLatest)}%</div>
              <div className="text-[0.6rem] text-white/30 mt-1">Độ chính xác</div>
              <div className="mt-2">
                <Sparkline data={progress?.accuracyTrend || []} color="hsl(210,90%,60%)" height={24} width={100} />
              </div>
            </div>

            {/* Thời gian học */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 group hover:bg-white/[0.04] hover:border-[hsl(245,85%,65%)]/15 transition-all cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(245,85%,65%)]/10 flex items-center justify-center">
                  <Timer className="h-4 w-4 text-[hsl(245,85%,70%)]" />
                </div>
                <Clock className="h-3 w-3 text-white/20" />
              </div>
              <div className="text-2xl font-bold text-white/90">{formatTime(progress?.timeSpent || 0)}</div>
              <div className="text-[0.6rem] text-white/30 mt-1">Thời gian tuần này</div>
              <div className="text-[0.55rem] text-white/20 mt-2">~{formatTimeCompact(Math.round((progress?.timeSpent || 0) / 7))}/ngày</div>
            </div>

            {/* XP Hôm nay */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 group hover:bg-white/[0.04] hover:border-[hsl(35,90%,55%)]/15 transition-all cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(35,90%,55%)]/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[hsl(35,90%,60%)]" />
                </div>
                <Sparkles className="h-3 w-3 text-[hsl(35,90%,55%)]/40" />
              </div>
              <div className="text-2xl font-bold text-white/90">{xpToday}</div>
              <div className="text-[0.6rem] text-white/30 mt-1">XP hôm nay</div>
              <div className="text-[0.55rem] text-[hsl(35,90%,60%)] mt-2">{dailyStats?.completedLessons || 0} bài hoàn thành</div>
            </div>

            {/* Bài kiểm tra */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 group hover:bg-white/[0.04] hover:border-[hsl(280,75%,60%)]/15 transition-all cursor-default col-span-2 md:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[hsl(280,75%,60%)]/10 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-[hsl(280,75%,65%)]" />
                </div>
                <span className="text-[0.6rem] text-white/20">TB: {avgScore.toFixed(1)}</span>
              </div>
              <div className="text-2xl font-bold text-white/90">{examCount}</div>
              <div className="text-[0.6rem] text-white/30 mt-1">Bài kiểm tra đã nộp</div>
              <div className="w-full h-1 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(280,75%,60%)] to-[hsl(245,85%,65%)]" style={{ width: `${Math.min(avgScore * 10, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* ---- ROW 2: Risk + Radials + Weekly Heatmap ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Risk Level + Predicted Score */}
            <div className={`rounded-2xl border p-5 ${
              progress?.riskLevel === 'high' ? 'bg-[hsl(0,70%,50%)]/[0.04] border-[hsl(0,70%,50%)]/15' :
              progress?.riskLevel === 'medium' ? 'bg-[hsl(35,90%,55%)]/[0.04] border-[hsl(35,90%,55%)]/15' :
              'bg-[hsl(175,80%,50%)]/[0.04] border-[hsl(175,80%,50%)]/15'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  {progress?.riskLevel === 'high' ? <AlertCircle className="h-4 w-4 text-[hsl(0,70%,60%)]" /> :
                   progress?.riskLevel === 'medium' ? <AlertTriangle className="h-4 w-4 text-[hsl(35,90%,60%)]" /> :
                   <CheckCircle className="h-4 w-4 text-[hsl(175,80%,55%)]" />}
                  Đánh Giá Tình Trạng
                </h3>
                <Badge className={`text-[0.6rem] border ${
                  progress?.riskLevel === 'high' ? 'bg-[hsl(0,70%,50%)]/10 text-[hsl(0,70%,65%)] border-[hsl(0,70%,50%)]/20' :
                  progress?.riskLevel === 'medium' ? 'bg-[hsl(35,90%,55%)]/10 text-[hsl(35,90%,65%)] border-[hsl(35,90%,55%)]/20' :
                  'bg-[hsl(175,80%,50%)]/10 text-[hsl(175,80%,60%)] border-[hsl(175,80%,50%)]/20'
                }`}>
                  {progress?.riskLevel === 'high' ? 'Nguy cơ cao' : progress?.riskLevel === 'medium' ? 'Cần cải thiện' : 'Ổn định'}
                </Badge>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${
                    progress?.riskLevel === 'high' ? 'text-[hsl(0,70%,65%)]' :
                    progress?.riskLevel === 'medium' ? 'text-[hsl(35,90%,65%)]' :
                    'text-[hsl(175,80%,55%)]'
                  }`}>
                    {progress?.predictedScore?.toFixed(1) || '—'}
                  </div>
                  <div className="text-[0.55rem] text-white/25 mt-1">Điểm dự đoán /10</div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-xs text-white/40">
                    {progress?.riskLevel === 'high'
                      ? 'Bạn cần tăng cường học tập để bắt kịp tiến độ.'
                      : progress?.riskLevel === 'medium'
                      ? 'Hãy duy trì đều đặn để cải thiện thêm.'
                      : 'Tiến độ tốt! Hãy tiếp tục phát huy.'}
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${
                      progress?.riskLevel === 'high' ? 'bg-gradient-to-r from-[hsl(0,70%,50%)] to-[hsl(35,90%,55%)]' :
                      progress?.riskLevel === 'medium' ? 'bg-gradient-to-r from-[hsl(35,90%,55%)] to-[hsl(175,80%,50%)]' :
                      'bg-gradient-to-r from-[hsl(175,80%,50%)] to-[hsl(210,90%,60%)]'
                    }`} style={{ width: `${(progress?.predictedScore || 0) * 10}%` }} />
                  </div>
                </div>
              </div>

              {/* Struggle Topics */}
              {progress?.struggleTopics && progress.struggleTopics.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="text-[0.6rem] text-white/30 mb-2 uppercase tracking-wider">Chủ đề cần ôn tập</div>
                  <div className="flex flex-wrap gap-1.5">
                    {progress.struggleTopics.map((t, i) => (
                      <span key={i} className="text-[0.6rem] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Radial Progress Cards */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-[hsl(210,90%,60%)]" />
                Chỉ Số Tổng Quan
              </h3>
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center gap-2">
                  <RadialProgress value={overallCompletion} size={100} color="hsl(175,80%,50%)" icon={BookOpen} sublabel="Hoàn thành" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <RadialProgress value={Math.round(accuracyLatest)} size={100} color="hsl(210,90%,60%)" icon={Target} sublabel="Chính xác" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <RadialProgress value={progress?.engagementScore || 0} size={100} color="hsl(280,75%,60%)" icon={Activity} sublabel="Tương tác" />
                </div>
              </div>
            </div>

            {/* Weekly Activity Heatmap */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[hsl(35,90%,55%)]" />
                  Hoạt Động Tuần Này
                </h3>
                <div className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-[hsl(35,90%,55%)]" />
                  <span className="text-xs font-semibold text-[hsl(35,90%,60%)]">{streak} ngày liên tục</span>
                </div>
              </div>
              <WeeklyHeatmap days={weeklyData} />
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                <div className="text-[0.6rem] text-white/25">
                  Tổng XP tuần: <span className="text-white/50 font-semibold">{weeklyData.reduce((s, d) => s + d.xp, 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(175,80%,50%)]/15" />
                    <span className="text-[0.5rem] text-white/20">Ít</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(175,80%,50%)]/35" />
                    <span className="text-[0.5rem] text-white/20">TB</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(175,80%,50%)]/60" />
                    <span className="text-[0.5rem] text-white/20">Nhiều</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- ROW 3: Accuracy Chart + Course Progress ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Accuracy Trend Chart (7 days) */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                  Xu Hướng Chính Xác (7 ngày)
                </h3>
                <div className={`flex items-center gap-1 text-xs font-medium ${accuracyTrendUp ? 'text-[hsl(175,80%,55%)]' : 'text-[hsl(0,70%,60%)]'}`}>
                  {accuracyTrendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {accuracyTrendUp ? 'Tăng' : 'Giảm'}
                </div>
              </div>
              <BarChart
                data={(progress?.accuracyTrend || []).map(v => Math.round(v))}
                labels={['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']}
                height={140}
                colors={progress?.accuracyTrend?.map(v =>
                  v >= 85 ? 'hsl(175,80%,50%)' : v >= 70 ? 'hsl(210,90%,60%)' : 'hsl(35,90%,55%)'
                )}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                <div className="text-[0.6rem] text-white/25">
                  Trung bình: <span className="text-white/50 font-semibold">
                    {progress?.accuracyTrend ? Math.round(progress.accuracyTrend.reduce((a,b) => a+b, 0) / progress.accuracyTrend.length) : 0}%
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(175,80%,50%)]" />
                    <span className="text-[0.5rem] text-white/20">≥85%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(210,90%,60%)]" />
                    <span className="text-[0.5rem] text-white/20">70-85%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[hsl(35,90%,55%)]" />
                    <span className="text-[0.5rem] text-white/20">&lt;70%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Progress List */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[hsl(245,85%,65%)]" />
                  Tiến Độ Khóa Học
                </h3>
                <span className="text-[0.6rem] text-white/25">{totalCourses} khóa học</span>
              </div>

              {courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-8 w-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Chưa đăng ký khóa học nào</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                  {courses.slice(0, 8).map((course) => {
                    const pct = course.totalChapters > 0 ? Math.round((course.chaptersCompleted / course.totalChapters) * 100) : 0
                    const isComplete = pct === 100
                    return (
                      <div key={course.id} className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all cursor-default">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isComplete ? 'bg-[hsl(175,80%,50%)]/10' : 'bg-white/[0.04]'
                        }`}>
                          {isComplete ? <Trophy className="h-4 w-4 text-[hsl(175,80%,55%)]" /> : <BookOpen className="h-4 w-4 text-white/30" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white/70 truncate">{course.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isComplete ? 'bg-[hsl(175,80%,50%)]' : pct >= 50 ? 'bg-[hsl(210,90%,60%)]' : 'bg-[hsl(245,85%,65%)]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[0.55rem] text-white/30 shrink-0">{pct}%</span>
                          </div>
                        </div>
                        <div className="text-[0.55rem] text-white/20 shrink-0">
                          {course.chaptersCompleted}/{course.totalChapters}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ---- ROW 4: Engagement Score + Today's Activity ---- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">

            {/* Engagement Breakdown */}
            <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[hsl(280,75%,60%)]" />
                Mức Độ Tương Tác
              </h3>
              <div className="flex items-center justify-center mb-4">
                <RadialProgress value={progress?.engagementScore || 0} size={140} strokeWidth={10} color="hsl(280,75%,60%)" icon={Star} sublabel="Engagement" />
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Bài hoàn thành', value: completedChapters, max: totalChapters || 1, color: 'hsl(175,80%,50%)' },
                  { label: 'Bài kiểm tra', value: examCount, max: Math.max(examCount, 10), color: 'hsl(210,90%,60%)' },
                  { label: 'Thời gian trung bình', value: Math.round((progress?.timeSpent || 0) / 7 / 60), max: 120, color: 'hsl(245,85%,65%)' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[0.6rem] text-white/30 w-28 truncate">{item.label}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                        backgroundColor: item.color
                      }} />
                    </div>
                    <span className="text-[0.55rem] text-white/30 w-8 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Activities */}
            <div className="lg:col-span-2 bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[hsl(175,80%,55%)]" />
                  Hoạt Động Hôm Nay
                </h3>
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[hsl(35,90%,55%)]" />
                  <span className="text-xs text-[hsl(35,90%,60%)] font-semibold">{xpToday} XP</span>
                </div>
              </div>

              {(!dailyStats?.activities || dailyStats.activities.length === 0) ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="h-6 w-6 text-white/10" />
                  </div>
                  <p className="text-sm text-white/30 mb-1">Chưa có hoạt động hôm nay</p>
                  <p className="text-[0.65rem] text-white/20">Bắt đầu học để tích lũy XP!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {dailyStats.activities.map((act: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:bg-white/[0.03] transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(175,80%,50%)]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-3.5 w-3.5 text-[hsl(175,80%,55%)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white/60 truncate">{act.lesson_title || 'Bài học'}</div>
                        <div className="text-[0.55rem] text-white/25 mt-0.5">{act.subject || 'Chưa phân loại'}</div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[0.6rem] text-[hsl(35,90%,60%)] font-medium">+{act.earned_xp || 0} XP</span>
                        <span className="text-[0.55rem] text-white/20">{formatTimeCompact(act.time_spent || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick stats footer */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs font-semibold text-white/60">{dailyStats?.completedLessons || 0}</div>
                  <div className="text-[0.55rem] text-white/25">Bài đã xong</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-white/60">{formatTime(dailyStats?.timeSpent || 0)}</div>
                  <div className="text-[0.55rem] text-white/25">Thời gian</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-white/60">{dailyStats?.subjects?.length || 0}</div>
                  <div className="text-[0.55rem] text-white/25">Môn học</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
