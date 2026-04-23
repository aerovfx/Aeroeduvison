/**
 * AI-Driven Teacher Dashboard
 * Port từ Next.js → Vite
 *
 * Thay thế:
 *   useRouter (next/navigation)  → useNavigate (react-router-dom)
 *   useSession (next-auth)       → useAuthContext
 *   updateButtonHandlers         → inline navigate / toast
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Brain, AlertTriangle, Sparkles,
  BarChart3, Heart, Activity,
  Settings, Search, Bell, Trophy
} from 'lucide-react'

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

// ── Component ──────────────────────────────────────────────────
export default function AiDashboard() {
  const navigate = useNavigate()

  const [students,      setStudents]      = useState<StudentWithAnalytics[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selectedView,  setSelectedView]  = useState<'overview' | 'heatmap' | 'emotions'>('overview')
  const [timeRange,     setTimeRange]     = useState<'today' | 'week' | 'month'>('week')
  const [searchQuery,   setSearchQuery]   = useState('')
  const [filterStatus,  setFilterStatus]  = useState<'all' | 'at-risk' | 'excelling'>('all')

  useEffect(() => {
    loadStudentsWithAnalytics()
  }, [])

  const loadStudentsWithAnalytics = async () => {
    try {
      setLoading(true)
      const studentIds = ['student_1', 'student_2', 'student_3']

      const studentsData = await Promise.all(
        studentIds.map(async (id) => {
          try {
            const [plgRes, xpRes] = await Promise.all([
              fetch(`/api/plg/${id}`),
              fetch(`/api/xp/analyze/${id}`),
            ])
            const plgData = await plgRes.json()
            const xpData  = await xpRes.json()

            return {
              id,
              name:  `Student ${id}`,
              email: `${id}@example.com`,
              totalXP:        xpData.data?.totalXP   || 0,
              level:          xpData.data?.level      || 1,
              xpSignal:       xpData.data             || {},
              currentEmotion: plgData.data?.currentEmotion?.primary   || 'neutral',
              emotionIntensity: plgData.data?.currentEmotion?.intensity || 0.5,
              streak:           plgData.data?.streaks?.current           || 0,
              lastActive:       new Date(plgData.data?.lastActive || Date.now()),
              progress:         0,
              completedLessons: plgData.data?.streaks?.streakHistory?.length || 0,
              averageScore:     xpData.data?.capability?.recentPerformance    || 0,
            } as StudentWithAnalytics
          } catch {
            return null
          }
        })
      )

      setStudents(studentsData.filter(Boolean) as StudentWithAnalytics[])
    } catch (err) {
      console.error('Error loading students:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Derived stats ──────────────────────────────────────────
  const classStats = {
    totalStudents:     students.length,
    averageXP:         students.reduce((s, st) => s + st.totalXP, 0) / (students.length || 1),
    averageCapability: students.reduce((s, st) => s + (st.xpSignal.capability?.overallScore || 0), 0) / (students.length || 1),
    averageMotivation: students.reduce((s, st) => s + (st.xpSignal.motivation?.score || 0), 0) / (students.length || 1),
    atRiskCount:       students.filter(s => s.xpSignal.trends?.atRisk).length,
    excellingCount:    students.filter(s =>
      s.xpSignal.trends?.overall === 'improving' &&
      (s.xpSignal.capability?.overallScore || 0) >= 80
    ).length,
  }

  const filteredStudents = students.filter(student => {
    if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterStatus === 'at-risk'    && !student.xpSignal.trends?.atRisk) return false
    if (filterStatus === 'excelling'  && student.xpSignal.trends?.overall !== 'improving') return false
    return true
  })

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Đang tải dữ liệu học sinh...</p>
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
              <p className="text-sm text-gray-600">Lớp 12A1 - Toán học</p>
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
              <button className="p-2 hover:bg-gray-100 rounded-lg relative">
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

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Left column */}
          <div className="col-span-8 space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: <Users        className="w-8 h-8 text-blue-500" />,   value: classStats.totalStudents,                    label: 'Học sinh',      color: 'text-gray-900'   },
                { icon: <Trophy       className="w-8 h-8 text-yellow-500" />, value: Math.round(classStats.averageXP),             label: 'Trung bình XP', color: 'text-gray-900'   },
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
    </div>
  )
}
