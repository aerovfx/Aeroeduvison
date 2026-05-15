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
interface RosterStudent {
  id: string
  userId: string | null
  name: string
  email: string
  avatar: string | null
  classNames: string[]
  isLinked: boolean
}

interface RosterMeta {
  fromClassStudent: number
  fromTSL: number
}

interface StudentWithAnalytics {
  id: string
  name: string
  email: string
  avatar?: string
  classNames: string[]               // lớp HS đang học (dạy bởi GV)
  isLinked: boolean                  // có User account đã kết nối hay chưa
  hasAttempts: boolean               // đã làm bài kiểm tra hay chưa
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

/** Tạo XP signal cho 1 HS (có hoặc không có attempts).
 * Khi attempts=[] (HS chưa làm bài) → trả zero state với atRisk=true,
 * riskFactor="Chưa làm bài kiểm tra nào".
 */
function buildAnalyticsForStudent(
  roster: RosterStudent,
  attempts: LeaderboardEntry[],
): StudentWithAnalytics {
  const sorted = [...attempts].sort((a, b) => {
    const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return ta - tb
  })
  const hasAttempts = sorted.length > 0
  const latest = hasAttempts ? sorted[sorted.length - 1] : null
  const avgPct = hasAttempts ? attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length : 0
  const totalXP = hasAttempts ? Math.round(attempts.reduce((s, a) => s + a.percentage * 5, 0)) : 0
  const level = Math.floor(totalXP / 500) + 1

  const now = Date.now()
  const THIRTY_D = 30 * 24 * 3600 * 1000
  const last30 = hasAttempts ? attempts.filter(a => {
    if (!a.completedAt) return false
    return now - new Date(a.completedAt).getTime() < THIRTY_D
  }).length : 0

  const motivation = Math.min(100, last30 * 12)
  const overall = hasAttempts ? trendFromAttempts(sorted) : 'stable'
  const atRisk = !hasAttempts || avgPct < 50
  const riskFactors: string[] = []
  if (!hasAttempts) {
    riskFactors.push('Chưa làm bài kiểm tra nào')
    if (!roster.isLinked) riskFactors.push('Chưa kết nối tài khoản')
  } else {
    if (avgPct < 50) riskFactors.push('Điểm trung bình dưới 50%')
    if (last30 === 0) riskFactors.push('Không hoạt động trong 30 ngày')
    if (overall === 'declining') riskFactors.push('Điểm có xu hướng giảm')
  }

  const { emotion, intensity } = hasAttempts
    ? emotionFromScore(latest!.percentage)
    : { emotion: 'neutral', intensity: 0.3 }
  const uniqExams = hasAttempts ? new Set(attempts.map(a => a.examId).filter(Boolean)).size : 0

  // Capability scores
  const accuracyScore  = avgPct
  const diversityBonus = Math.min(20, uniqExams * 5)
  const cognitive      = Math.min(100, Math.round(accuracyScore + diversityBonus * 0.3))
  const metacognitive  = Math.min(100, Math.round(motivation * 0.6 + accuracyScore * 0.4))
  const behavioral     = Math.min(100, Math.round(streakDays(sorted) * 8 + last30 * 3))
  const overallScore   = Math.round((cognitive + metacognitive + behavioral) / 3)

  const totalSec = sorted.reduce((s, a) => s + (a.durationSec || 0), 0)
  const xpPerHour = totalSec > 0 ? Math.round((totalXP / totalSec) * 3600) : 0
  const optimalPace = xpPerHour > 200 ? 'fast' : xpPerHour > 80 ? 'normal' : 'slow'

  return {
    id: roster.id,
    name: roster.name,
    email: roster.email,
    avatar: roster.avatar || undefined,
    classNames: roster.classNames,
    isLinked: roster.isLinked,
    hasAttempts,
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
    streak:           hasAttempts ? streakDays(sorted) : 0,
    lastActive:       latest?.completedAt ? new Date(latest.completedAt) : new Date(0),
    progress:         Math.round(avgPct),
    completedLessons: uniqExams,
    averageScore:     Math.round(avgPct),
  }
}

/** Match roster student → leaderboard entries.
 * Primary: studentId == roster.userId (chính xác khi HS đã link account)
 * Secondary: studentName lowercase match roster.name (best-effort cho HS chỉ
 * có trong ClassStudent, chưa link)
 */
function mergeRosterWithLeaderboard(
  roster: RosterStudent[],
  entries: LeaderboardEntry[],
): StudentWithAnalytics[] {
  const byUserId = new Map<string, LeaderboardEntry[]>()
  const byNameLower = new Map<string, LeaderboardEntry[]>()
  for (const e of entries) {
    if (e.studentId) {
      const arr = byUserId.get(e.studentId) || []
      arr.push(e); byUserId.set(e.studentId, arr)
    }
    const nk = String(e.studentName || '').toLowerCase().trim()
    if (nk) {
      const arr = byNameLower.get(nk) || []
      arr.push(e); byNameLower.set(nk, arr)
    }
  }

  const out: StudentWithAnalytics[] = roster.map(r => {
    let attempts: LeaderboardEntry[] = []
    if (r.userId && byUserId.has(r.userId)) {
      attempts = byUserId.get(r.userId)!
    } else {
      const nk = String(r.name || '').toLowerCase().trim()
      attempts = byNameLower.get(nk) || []
    }
    return buildAnalyticsForStudent(r, attempts)
  })

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
  const [rosterMeta,    setRosterMeta]    = useState<RosterMeta | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedView,  setSelectedView]  = useState<'overview' | 'heatmap' | 'emotions'>('overview')
  const [timeRange,     setTimeRange]     = useState<'today' | 'week' | 'month'>('week')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterStatus,  setFilterStatus]  = useState<'all' | 'at-risk' | 'excelling' | 'no-attempts'>('all')

  useEffect(() => { loadStudents() }, [])

  /** Load 2 nguồn data song song:
   *  1. Roster HS từ ClassStudent + TSL approved (HS GV quản lý)
   *  2. Leaderboard top 200 attempts (điểm thật từ exams)
   * Merge: mỗi HS roster ghép với attempts (by userId hoặc by name).
   * HS chưa làm bài → vẫn hiển thị với atRisk=true + riskFactor phù hợp.
   */
  async function loadStudents() {
    try {
      setLoading(true)
      setError(null)
      const [rosterRes, leaderboardRes] = await Promise.all([
        api.get<{ students: RosterStudent[]; meta: RosterMeta }>('/teacher/roster')
          .catch(e => { console.warn('[ai-dashboard:roster]', e?.response?.data || e.message); return { data: { students: [], meta: { fromClassStudent: 0, fromTSL: 0 } } } }),
        api.get<{ items: LeaderboardEntry[] }>('/teacher/leaderboard?limit=200')
          .catch(e => { console.warn('[ai-dashboard:leaderboard]', e?.response?.data || e.message); return { data: { items: [] } } }),
      ])
      const roster = Array.isArray(rosterRes.data?.students) ? rosterRes.data.students : []
      const items = Array.isArray(leaderboardRes.data?.items) ? leaderboardRes.data.items : []
      setRosterMeta(rosterRes.data?.meta || null)
      setStudents(mergeRosterWithLeaderboard(roster, items))
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
    if (filterStatus === 'at-risk'     && !student.xpSignal.trends?.atRisk) return false
    if (filterStatus === 'excelling'   && !(student.xpSignal.trends?.overall === 'improving' && (student.xpSignal.capability?.overallScore || 0) >= 80)) return false
    if (filterStatus === 'no-attempts' && student.hasAttempts) return false
    return true
  }), [students, searchQuery, filterStatus])

  const studentsNoAttempts = students.filter(s => !s.hasAttempts).length

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
              <option value="no-attempts">Chưa làm bài ({studentsNoAttempts})</option>
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

      {/* ── Data source banner ─────────────────────────────── */}
      {rosterMeta && students.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs flex items-center gap-2">
            <Brain className="w-4 h-4 flex-shrink-0" />
            <span>
              Đồng bộ dữ liệu thật từ <b>{rosterMeta.fromClassStudent}</b> HS trong lớp bạn quản lý
              {rosterMeta.fromTSL > 0 && <> + <b>{rosterMeta.fromTSL}</b> HS đã kết nối tài khoản</>}
              {studentsNoAttempts > 0 && <> · <b>{studentsNoAttempts}</b> HS chưa làm bài kiểm tra nào</>}
            </span>
          </div>
        </div>
      )}

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
