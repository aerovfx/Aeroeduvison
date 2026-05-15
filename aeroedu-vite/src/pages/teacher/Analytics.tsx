/**
 * Teacher Analytics Page
 * Port từ Next.js → Vite
 *
 * Thay thế:
 *   'use client'   → bỏ
 *   useLanguage    → bỏ (t() không được gọi trong source)
 *   handleExport   → toast notification
 */

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Users, Target, Award, Brain, Zap,
  Download, ArrowUp, ArrowDown, Minus, Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

// ── Types ──────────────────────────────────────────────────────
interface AnalyticsData {
  period: 'week' | 'month' | 'semester'
  meta?: {
    fromClassStudent: number
    fromTeacherStudentLink: number
    uniqueStudents: number
    gradedSheets: number
  }
  totalStudents: number
  averageScore: number
  completionRate: number
  engagementScore: number
  topPerformingStudents: Array<{ name: string; score: number; improvement: number }>
  strugglingStudents: Array<{ name: string; score: number; issues: string[] }>
  subjectPerformance: Array<{ subject: string; averageScore: number; trend: 'up' | 'down' | 'stable'; examCount?: number }>
  weeklyProgress: Array<{ week: string; completion: number; averageScore: number }>
}

// ── Component ──────────────────────────────────────────────────
export default function TeacherAnalyticsPage() {
  const [analytics,       setAnalytics]       = useState<AnalyticsData | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [selectedPeriod,  setSelectedPeriod]  = useState<'week' | 'month' | 'semester'>('month')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Backend /api/teacher/analytics aggregate THẬT từ:
        //  • ClassStudent của TeacherClass GV quản lý (HS đã import)
        //  • TeacherStudentLink approved (HS chủ động kết nối với GV)
        //  • GradedSheet (điểm GV đã chấm)
        const r = await api.get<AnalyticsData>('/teacher/analytics', {
          params: { period: selectedPeriod },
        })
        setAnalytics(r.data)
      } catch (err: any) {
        console.error('Error loading analytics:', err?.response?.data || err.message)
        toast.error('Không tải được dữ liệu analytics — kiểm tra đăng nhập GV')
        // Fallback empty state để UI không crash
        setAnalytics({
          period: selectedPeriod,
          totalStudents: 0,
          averageScore: 0,
          completionRate: 0,
          engagementScore: 0,
          topPerformingStudents: [],
          strugglingStudents: [],
          subjectPerformance: [],
          weeklyProgress: [],
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedPeriod])

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-600">Không thể tải dữ liệu phân tích</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">Phân tích hiệu suất học tập</p>
              </div>
            </div>

            {/* Period selector + Export */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(['week', 'month', 'semester'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period === 'week' ? 'Tuần' : period === 'month' ? 'Tháng' : 'Học kỳ'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => toast.success('Đang xuất báo cáo...')}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Data source banner (meta) ─────────────────────── */}
        {analytics.meta && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-3 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-xs text-blue-800 dark:text-blue-200">
              <p className="font-medium">
                Dữ liệu thật trong kỳ {selectedPeriod === 'week' ? '7 ngày' : selectedPeriod === 'month' ? '30 ngày' : '180 ngày'} qua
              </p>
              <p className="mt-0.5 opacity-80">
                {analytics.meta.fromClassStudent} HS từ lớp bạn quản lý •{' '}
                {analytics.meta.fromTeacherStudentLink} HS đã kết nối tài khoản với bạn •{' '}
                Tổng {analytics.meta.uniqueStudents} HS duy nhất •{' '}
                {analytics.meta.gradedSheets} bài đã chấm
              </p>
            </div>
          </div>
        )}

        {/* ── Empty state khi 0 HS hoặc 0 bài chấm ─────────── */}
        {analytics.totalStudents === 0 && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-6 text-center">
            <Users className="w-12 h-12 text-amber-500/50 mx-auto mb-3" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
              Chưa có học sinh nào
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300/80 mb-4">
              Vào <a href="/teacher/classes" className="underline font-medium">/teacher/classes</a> để tạo lớp + import học sinh,
              hoặc chờ HS chủ động kết nối với bạn (tự động duyệt qua email match).
            </p>
          </div>
        )}

        {/* ── Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[
            { icon: <Users     className="w-6 h-6 text-blue-500"   />, bg: 'bg-blue-50',   value: analytics.totalStudents,          label: 'Tổng học sinh'       },
            { icon: <TrendingUp className="w-6 h-6 text-green-500" />, bg: 'bg-green-50',  value: `${analytics.averageScore}%`,     label: 'Điểm trung bình'     },
            { icon: <Target    className="w-6 h-6 text-purple-500" />, bg: 'bg-purple-50', value: `${analytics.completionRate}%`,   label: 'Tỷ lệ hoàn thành'   },
            { icon: <Zap       className="w-6 h-6 text-orange-500" />, bg: 'bg-orange-50', value: `${analytics.engagementScore}%`, label: 'Mức độ tương tác'   },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.bg}`}>
                  {card.icon}
                </div>
                <span className="text-2xl font-bold text-gray-900">{card.value}</span>
              </div>
              <div className="text-sm text-gray-600">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Top & Struggling Students ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Top Performing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Học sinh xuất sắc</h2>
            </div>
            <div className="space-y-3">
              {analytics.topPerformingStudents.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-6 text-center">
                  Chưa có dữ liệu — cần ít nhất 1 bài chấm để xếp hạng
                </p>
              ) : analytics.topPerformingStudents.map((student, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-50/50 border border-yellow-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                      #{i + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {student.improvement !== 0 && (
                      <>
                        <p className={`text-sm font-semibold ${student.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {student.improvement > 0 ? '+' : ''}{student.improvement}%
                        </p>
                        <p className="text-xs text-gray-500">Cải thiện</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Struggling Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Brain className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Học sinh cần hỗ trợ</h2>
            </div>
            <div className="space-y-3">
              {analytics.strugglingStudents.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-6 text-center">
                  ✅ Chưa có HS nào cần hỗ trợ — cả lớp đều ổn!
                </p>
              ) : analytics.strugglingStudents.map((student, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-50/50 border border-red-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                      !
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                      <p className="text-xs text-red-600">{student.issues.join(' • ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toast.success(`Đã gửi thông báo nhắc nhở đến ${student.name}`)}
                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    Nhắc nhở
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Subject Performance ──────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Hiệu suất theo môn học</h2>
          {analytics.subjectPerformance.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-6 text-center">
              Chưa có bài chấm trong kỳ — vào <a href="/teacher/exam-grading" className="text-purple-600 underline">/teacher/exam-grading</a> để chấm bài.
            </p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.subjectPerformance.map((subject, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{subject.subject}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    subject.trend === 'up'   ? 'text-green-600' :
                    subject.trend === 'down' ? 'text-red-600'   : 'text-gray-600'
                  }`}>
                    {subject.trend === 'up'   ? <ArrowUp   className="w-3 h-3" /> :
                     subject.trend === 'down' ? <ArrowDown className="w-3 h-3" /> :
                                               <Minus     className="w-3 h-3" />}
                    {subject.trend === 'up' ? 'Tăng' : subject.trend === 'down' ? 'Giảm' : 'Ổn định'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-3">{subject.averageScore}%</div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    style={{ width: `${subject.averageScore}%` }}
                  />
                </div>
                {subject.examCount != null && (
                  <p className="mt-2 text-xs text-gray-500">{subject.examCount} bài đã chấm</p>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ── Weekly Progress ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Tiến độ theo tuần</h2>
          <div className="space-y-3">
            {analytics.weeklyProgress.map((week, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{week.week}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${week.completion}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">Hoàn thành: {week.completion}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{week.averageScore}%</p>
                  <p className="text-xs text-gray-500">Điểm TB</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
