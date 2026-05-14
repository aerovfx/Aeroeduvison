/**
 * AI-Driven Teacher Dashboard
 *
 * v2 — wire to REAL data from /api/teacher/leaderboard.
 * Trước đây fetch /api/plg/student_1 + /api/xp/analyze/student_1 (3 fake IDs)
 * vào 2 stub endpoint trả {} → render 3 ô zero "Student student_1". Vô dụng.
 *
 * Giờ:
 *  1. GET /teacher/leaderboard?limit=50 → tất cả attempt của học sinh trên các
 *     đề thi của giáo viên (có user.id).
 *  2. Group theo studentId, dedupe, aggregate:
 *       totalXP        = Σ percentage * 5      (≈500/đề full điểm)
 *       level          = floor(totalXP / 500) + 1
 *       averageScore   = mean(percentage)
 *       capability.*   = derived từ avg + tần suất
 *       motivation     = số attempt trong 30 ngày (cap 100)
 *       trends.atRisk  = avg < 50%
 *       trends.overall = so 3 attempt mới nhất vs 3 đầu
 *       streak         = số ngày liên tiếp có attempt (rough)
 *       lastActive     = max(completedAt)
 *       currentEmotion = derived từ điểm mới nhất
 *  3. Empty state khi chưa có data thay vì 3 student giả.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Brain, AlertTriangle,
  BarChart3, Heart, Activity,
  Settings, Search, Bell, Trophy,
} from 'lucide-react'

import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import ClassOverview     from '@/components/teacher/ClassOverview'
import StudentList       from '@/components/teacher/StudentList'
import AICoTeacherPanel  from '@/components/teacher/AICoTeacherPanel'
import EngagementHeatmap from '@/components/teacher/EngagementHeatmap'
import EmotionTimeline   from '@/components/teacher/EmotionTimeline'
import QuickActions      from '@/components/teacher/QuickActions'

// ── Types ──────────────────────────────────────────────────────
interface StudentWithAnalytics {
  id: string
  name: string
  email: string
  avatar?: string
  totalXP: number
  level: number
  xpSignal: {
    capability: { overallScore: number; cognitive: number; metacognitive: number; behavioral: number }
    learningSpeed: { xpPerHour: number; optimalPace: string }
    motivation: { score: number; trend: string }
    trends: { overall: string; atRisk: boolean; riskFactors: string[] }
  }
  currentEmotion: string
  emotionIntensity: number
  streak: number
  lastActive: Date
  progress: number
  completedLessons: number
  averageScore: number
}

interface LeaderboardEntry {
  id: string
  studentId: string | null
  studentName: string
  studentImage?: string | null
  score: number
  percentage: number
  durationSec: number | null
  completedAt: string | null
  examTitle: string
  examId: string | null
  source: 'individual' | 'group'
}

// ── Aggregation helpers ────────────────────────────────────────
function emotionFromScore(pct: number): { emotion: string; intensity: number } {
  if (pct >= 85) return { emotion: 'happy',      intensity: 0.9 }
  if (pct >= 70) return { emotion: 'confident',  intensity: 0.75 }
  if (pct >= 50) return { emotion: 'neutral',    intensity: 0.5 }
  if (pct >= 30) return { emotion: 'frustrated', intensity: 0.7 }
  return            { emotion: 'sad',         intensity: 0.85 }
}

function trendFromAttempts(attemptsAsc: LeaderboardEntry[]): string {
  if (attemptsAsc.length < 4) return 'stable'
  const head = attemptsAsc.slice(0, 3).reduce((s, a) => s + a.percentage, 0) / 3
  const tail = attemptsAsc.slice(-3).reduce((s, a) => s + a.percentage, 0) / 3
  if (tail > head + 5) return 'improving'
  if (tail < head - 5) return 'declining'
  return 'stable'
}

function streakDays(attemptsAsc: LeaderboardEntry[]): number {
  // Count distinct calendar days with at least one attempt, descending
  // streak = số ngày liên tiếp tính từ ngày gần nhất có làm bài
  const days = new Set(
    attemptsAsc
      .map(a => a.completedAt && new Date(a.completedAt).toISOString().slice(0, 10))
      .filter(Boolean) as string[],
  )
  if (days.size === 0) return 0
  const sorted = Array.from(days).sort().reverse()  // newest first YYYY-MM-DD
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const cur  = new Date(sorted[i])
    const dayDiff = Math.round((prev.getTime() - cur.getTime()) / (24 * 3600 * 1000))
    if (dayDiff === 1) streak++
    else break
  }
  return streak
}

function aggregateByStudent(entries: LeaderboardEntry[]): StudentWithAnalytics[] {
  const byId = new Map<string, LeaderboardEntry[]>()
  for (const e of entries) {
    if (!e.studentId) continue   // bỏ qua group-play (không có user account)
    const arr = byId.get(e.studentId) || []
    arr.push(e)
    byId.set(e.studentId, arr)
  }

  const now = Date.now()
  const THIRTY_D = 30 * 24 * 3600 * 1000
  const out: StudentWithAnalytics[] = []

  for (const [studentId, attempts] of byId) {
    const sorted = [...attempts].sort((a, b) => {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return ta - tb   // ascending (oldest first)
    })
    const latest = sorted[sorted.length - 1]
    const avgPct = attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length
    const totalXP = Math.round(attempts.reduce((s, a) => s + a.percentage * 5, 0))
    const level = Math.floor(totalXP / 500) + 1
    const last30 = attempts.filter(a => {
      if (!a.completedAt) return false
      return now - new Date(a.completedAt).getTime() < THIRTY_D
    }).length
    const motivation = Math.min(100, last30 * 12)   // 8+ bài/tháng = max
    const overall = trendFromAttempts(sorted)
    const atRisk = avgPct < 50
    const riskFactors: string[] = []
    if (atRisk) riskFactors.push('Điểm trung bình dưới 50%')
    if (last30 === 0) riskFactors.push('Không hoạt động trong 30 ngày')
    if (overall === 'declining') riskFactors.push('Điểm có xu hướng giảm')
    const { emotion, intensity } = emotionFromScore(latest.percentage)
    const uniqExams = new Set(attempts.map(a => a.examId).filter(Boolean)).size

    // capability: cân bằng giữa accuracy + đa dạng đề + nhịp làm bài
    const accuracyScore  = avgPct
    const diversityBonus = Math.min(20, uniqExams * 5)
    const cognitive      = Math.min(100, Math.round(accuracyScore + diversityBonus * 0.3))
    const metacognitive  = Math.min(100, Math.round(motivation * 0.6 + accuracyScore * 0.4))
    const behavioral     = Math.min(100, Math.round(streakDays(sorted) * 8 + last30 * 3))
    const overallScore   = Math.round((cognitive + metacognitive + behavioral) / 3)

    // learning speed: xpPerHour ≈ totalXP / Σdurationsec * 3600
    const totalSec = sorted.reduce((s, a) => s + (a.durationSec || 0), 0)
    const xpPerHour = totalSec > 0 ? Math.round((totalXP / totalSec) * 3600) : 0
    const optimalPace = xpPerHour > 200 ? 'fast' : xpPerHour > 80 ? 'normal' : 'slow'

    out.push({
      id: studentId,
      name: latest.studentName || 'Học sinh ẩn danh',
      email: '',
      avatar: latest.studentImage || undefined,
      totalXP,
      level,
      xpSignal: {
        capability:    { overallScore, cognitive, metacognitive, behavioral },
        learningSpeed: { xpPerHour, optimalPace },
        motivation:    { score: motivation, trend: overall },
        trends:        { overall, atRisk, riskFactors },
      },
      currentEmotion:   emotion,
      emotionIntensity: intensity,
      streak:           streakDays(sorted),
      lastActive:       latest.completedAt ? new Date(latest.completedAt) : new Date(),
      progress:         Math.round(avgPct),
      completedLessons: uniqExams,
      averageScore:     Math.round(avgPct),
    })
  }

  // Sort: at-risk lên đầu, rồi theo XP DESC
  out.sort((a, b) => {
    if (a.xpSignal.trends.atRisk !== b.xpSignal.trends.atRisk) {
      return a.xpSignal.trends.atRisk ? -1 : 1
    }
    return b.totalXP - a.totalXP
  })
  return out
}

// ── Component ──────────────────────────────────────────────────
export default function AiDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [students,      setStudents]      = useState<StudentWithAnalytics[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedView,  setSelectedView]  = useState<'overview' | 'heatmap' | 'emotions'>('overview')
  const [timeRange,     setTimeRange]     = useState<'today' | 'week' | 'month'>('week')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterStatus,  setFilterStatus]  = useState<'all' | 'at-risk' | 'excelling'>('all')

  useEffect(() => { loadStudents() }, [])

  async function loadStudents() {
    try {
      setLoading(true)
      setError(null)
      // limit=50 = top 50 attempts → đủ ~10-30 unique students
      const res = await api.get<{ items: LeaderboardEntry[] }>('/teacher/leaderboard?limit=50')
      const items = Array.isArray(res.data?.items) ? res.data.items : []
      setStudents(aggregateByStudent(items))
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } }
      if (e.response?.status === 401) {
        setError('Vui lòng đăng nhập với tài khoản giáo viên để xem dashboard.')
      } else {
        setError(e.response?.data?.error || 'Không tải được dữ liệu học sinh')
      }
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  // ── Derived stats ──────────────────────────────────────────
  const classStats = useMemo(() => ({
    totalStudents:     students.length,
    averageXP:         students.reduce((s, st) => s + st.totalXP, 0) / (students.length || 1),
    averageCapability: students.reduce((s, st) => s + (st.xpSignal.capability?.overallScore || 0), 0) / (students.length || 1),
    averageMotivation: students.reduce((s, st) => s + (st.xpSignal.motivation?.score || 0), 0) / (students.length || 1),
    atRiskCount:       students.filter(s => s.xpSignal.trends?.atRisk).length,
    excellingCount:    students.filter(s =>
      s.xpSignal.trends?.overall === 'improving' &&
      (s.xpSignal.capability?.overallScore || 0) >= 80
    ).length,
  }), [students])

  const filteredStudents = useMemo(() => students.filter(student => {
    if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus === 'at-risk'    && !student.xpSignal.trends?.atRisk) return false
    if (filterStatus === 'excelling'  && !(student.xpSignal.trends?.overall === 'improving' && (student.xpSignal.capability?.overallScore || 0) >= 80)) return false
    return true
  }), [students, searchQuery, filterStatus])

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Đang phân tích dữ liệu học sinh...</p>
        </div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">

          {/* Row 1: title + time range + actions */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-6 h-6 mr-2 text-purple-600" />
                AI Teacher Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                {user?.name ? `${user.name} — ` : ''}{students.length} học sinh đang được theo dõi
              </p>
            </div>

            {/* Time range */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              {(['today', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === 'today' ? 'Hôm nay' : range === 'week' ? 'Tuần này' : 'Tháng này'}
                </button>
              ))}
            </div>

            {/* Action icons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={loadStudents}
                title="Tải lại dữ liệu"
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {classStats.atRiskCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => navigate('/teacher/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Row 2: search + filter + view toggle */}
          <div className="mt-4 flex items-center space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tất cả ({students.length})</option>
              <option value="at-risk">Cần hỗ trợ ({classStats.atRiskCount})</option>
              <option value="excelling">Xuất sắc ({classStats.excellingCount})</option>
            </select>

            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {([
                { view: 'overview' as const, Icon: BarChart3 },
                { view: 'heatmap'  as const, Icon: Activity  },
                { view: 'emotions' as const, Icon: Heart     },
              ]).map(({ view, Icon }) => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view)}
                  className={`px-3 py-1.5 rounded text-sm font-medium ${
                    selectedView === view ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button
              onClick={loadStudents}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!error && students.length === 0 && (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <Brain className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chưa có dữ liệu học sinh để phân tích
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Dashboard sẽ hiển thị phân tích AI khi có học sinh hoàn thành ít nhất một bài thi
            của bạn (cá nhân hoặc qua phòng thi live).
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => navigate('/teacher/exams')}
              className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
            >
              Xem đề thi của tôi
            </button>
            <button
              onClick={() => navigate('/teacher/online-exam-room')}
              className="px-5 py-2.5 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 font-medium"
            >
              Tạo phòng thi mới
            </button>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────── */}
      {students.length > 0 && (
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Left column */}
          <div className="col-span-8 space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: <Users        className="w-8 h-8 text-blue-500" />,   value: classStats.totalStudents,                    label: 'Học sinh',      color: 'text-gray-900'   },
                { icon: <Trophy       className="w-8 h-8 text-yellow-500" />, value: Math.round(classStats.averageXP),             label: 'XP trung bình', color: 'text-gray-900'   },
                { icon: <Brain        className="w-8 h-8 text-purple-500" />, value: `${Math.round(classStats.averageCapability)}%`, label: 'Năng lực TB',  color: 'text-gray-900'   },
                {
                  icon:  <AlertTriangle className={`w-8 h-8 ${classStats.atRiskCount > 0 ? 'text-red-500' : 'text-green-500'}`} />,
                  value: classStats.atRiskCount,
                  label: 'Cần hỗ trợ',
                  color: classStats.atRiskCount > 0 ? 'text-red-600' : 'text-green-600',
                },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    {stat.icon}
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Main view */}
            {selectedView === 'overview' && (
              <ClassOverview students={filteredStudents} timeRange={timeRange} />
            )}
            {selectedView === 'heatmap' && (
              <EngagementHeatmap students={filteredStudents} />
            )}
            {selectedView === 'emotions' && (
              <EmotionTimeline students={filteredStudents} />
            )}

            {/* Student list */}
            <StudentList students={filteredStudents} />
          </div>

          {/* Right column */}
          <div className="col-span-4 space-y-6">
            <AICoTeacherPanel students={students} classStats={classStats} />
            <QuickActions />
          </div>

        </div>
      </div>
      )}
    </div>
  )
}
