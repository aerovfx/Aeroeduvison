/**
 * Student Dashboard — trang tổng quan của học sinh
 *
 * Dữ liệu thật từ:
 *   - studentLearningPathService.getMine()      → lộ trình GV đã giao
 *   - GET /api/student/exam-rooms               → phòng thi (active + upcoming)
 *   - GET /api/student/learning-paths           → đếm path đang học
 *
 * Fallback an toàn: nếu API lỗi/empty → hiển thị placeholder thân thiện
 * có CTA dẫn HS đến /student/teachers (kết nối GV) thay vì demo data sai.
 */
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, CheckCircle2, Clock, TrendingUp, Award, Brain, FileText,
  ArrowRight, Calendar, Loader2, Radio,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LiveLeaderboard } from '@/components/dashboard/LiveLeaderboard'
import { ConnectTeacherBanner } from '@/pages/student/MyTeachers'
import { studentLearningPathService, type StudentLearningPath } from '@/services/studentLearningPath.service'
import { api } from '@/services/api'
import usePageTitle from '@/hooks/usePageTitle'

// ─── Types ────────────────────────────────────────────────────────
interface StudentExamRoomLite {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  startTime: string
  endTime: string
  Exam: { id: string; title: string; examType: string } | null
  Teacher: { id: string; name: string } | null
  _count: { participants: number; questions: number }
  myParticipant: { score: number | null; completed: boolean } | null
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffH = diffMs / 36e5
  if (diffH < 0 && diffH > -24) return `${Math.round(-diffH)} giờ trước`
  if (diffH < 24 && diffH > 0) return `Trong ${Math.round(diffH)} giờ`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function progressOf(path: StudentLearningPath): number {
  if (typeof path.progressPct === 'number') return Math.round(path.progressPct)
  if (!path.modules?.length) return 0
  const done = Object.values(path.moduleStatus || {}).filter(s => s === 'completed').length
  return Math.round((done / path.modules.length) * 100)
}

// ─── Main component ───────────────────────────────────────────────
export default function StudentDashboard() {
  usePageTitle('Tổng quan học tập')
  const { user } = useAuth()

  // Real learning paths from teachers
  const { data: paths = [], isLoading: pathsLoading } = useQuery({
    queryKey: ['student-learning-paths-dashboard'],
    queryFn: () => studentLearningPathService.getMine(),
    staleTime: 60_000,
  })

  // Real exam rooms (active + upcoming)
  const { data: examData, isLoading: examsLoading } = useQuery({
    queryKey: ['student-exam-rooms-dashboard'],
    queryFn: async () => {
      const r = await api.get<{ rooms: StudentExamRoomLite[] }>('/student/exam-rooms')
      return r.data?.rooms ?? []
    },
    staleTime: 60_000,
  })

  const examRooms = examData ?? []
  const now = new Date()

  const activeExams = examRooms.filter(r => r.status === 'active')
  const upcomingExams = examRooms
    .filter(r => r.status === 'draft' && new Date(r.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  // In-progress paths (có progress > 0, < 100)
  const inProgressPaths = paths
    .filter(p => {
      const pct = progressOf(p)
      return pct > 0 && pct < 100
    })
    .sort((a, b) => progressOf(b) - progressOf(a))

  const completedPaths = paths.filter(p => progressOf(p) === 100).length
  const completedExams = examRooms.filter(r => r.myParticipant?.completed).length

  // Average score from completed exams
  const examScores = examRooms
    .map(r => r.myParticipant?.score)
    .filter((s): s is number => typeof s === 'number')
  const avgScore = examScores.length > 0
    ? (examScores.reduce((a, b) => a + b, 0) / examScores.length).toFixed(1)
    : null

  // Pending: active exams not yet submitted
  const pendingExamCount = activeExams.filter(r => !r.myParticipant?.completed).length

  const stats = [
    {
      label: 'Lộ trình đang học',
      value: paths.length,
      icon: BookOpen,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
      link: '/learning-paths',
    },
    {
      label: 'Bài thi đã hoàn thành',
      value: completedExams + completedPaths,
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300',
      link: '/student/exams',
    },
    {
      label: 'Bài thi đang chờ',
      value: pendingExamCount,
      icon: Clock,
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300',
      link: '/student/exams',
    },
    {
      label: 'Điểm trung bình',
      value: avgScore ? `${avgScore}/10` : '—',
      icon: TrendingUp,
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300',
      link: '/student/progress',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Xin chào, {user?.name?.split(' ').pop() ?? 'bạn'} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Đây là tổng quan học tập của bạn hôm nay.</p>
      </div>

      {/* Banner nhắc kết nối GV nếu chưa có link nào */}
      <ConnectTeacherBanner />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
          >
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tiếp tục học — lộ trình thật từ GV */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Tiếp tục học
            </h2>
            <Link to="/learning-paths" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pathsLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-60" />
              Đang tải lộ trình…
            </div>
          ) : inProgressPaths.length === 0 ? (
            <div className="py-5 text-center text-sm text-muted-foreground space-y-2">
              <p>Chưa có lộ trình nào đang học dở.</p>
              {paths.length === 0 ? (
                <Link to="/student/teachers" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  Kết nối với GV để nhận lộ trình <ArrowRight className="w-3 h-3" />
                </Link>
              ) : (
                <Link to="/learning-paths" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  Bắt đầu lộ trình mới <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {inProgressPaths.slice(0, 3).map((path) => {
                const pct = progressOf(path)
                return (
                  <Link
                    key={path.assignmentId}
                    to="/learning-paths"
                    className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{path.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {path.teacher?.name ? `GV: ${path.teacher.name}` : path.subject || 'Lộ trình học'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Sắp tới — phòng thi thật + active exam */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Sắp đến hạn
            </h2>
            <Link to="/student/exams" className="text-xs text-orange-600 hover:underline inline-flex items-center gap-0.5">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {examsLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 opacity-60" />
              Đang tải phòng thi…
            </div>
          ) : activeExams.length === 0 && upcomingExams.length === 0 ? (
            <div className="py-5 text-center text-sm text-muted-foreground">
              <p>Không có phòng thi nào sắp tới.</p>
              <p className="text-xs mt-1 opacity-70">GV sẽ tạo phòng thi khi đến lịch.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active exams first (HS có thể vào ngay) */}
              {activeExams.slice(0, 2).map((room) => (
                <Link
                  key={room.id}
                  to="/student/exams"
                  className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 hover:bg-emerald-500/10 transition-colors"
                >
                  <div className="p-1.5 rounded-md text-white text-xs bg-emerald-500 inline-flex items-center gap-1">
                    <Radio className="w-3 h-3" /> LIVE
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{room.Exam?.title || room.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.Teacher?.name ?? 'GV'} · {room._count.questions} câu · đang mở
                    </p>
                  </div>
                </Link>
              ))}
              {upcomingExams.slice(0, Math.max(1, 3 - activeExams.length)).map((room) => (
                <div key={room.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="p-1.5 rounded-md text-white text-xs bg-blue-500 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> THI
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{room.Exam?.title || room.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(room.startTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LIVE Leaderboard — real-time top học sinh dẫn đầu */}
      <LiveLeaderboard highlightUserId={user?.id} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/ai-tutor"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/25 transition-colors text-sm font-medium">
          <Brain className="w-4 h-4" /> AI Tutor
        </Link>
        <Link to="/student/exams"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors text-sm font-medium">
          <FileText className="w-4 h-4" /> Phòng thi Live
        </Link>
        <Link to="/dashboard/labtwin"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 transition-colors text-sm font-medium">
          <Award className="w-4 h-4" /> Phòng Lab
        </Link>
        <Link to="/dashboard/assignments"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-500/25 transition-colors text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" /> Bài tập
        </Link>
      </div>
    </div>
  )
}
