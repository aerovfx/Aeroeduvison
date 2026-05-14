/**
 * Student Dashboard — trang tổng quan của học sinh
 * Mapping từ: app/(dashboard)/(routes)/dashboard/page.tsx
 */
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, Clock, TrendingUp, Award, Brain } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LiveLeaderboard } from '@/components/dashboard/LiveLeaderboard'
import { ConnectTeacherBanner } from '@/pages/student/MyTeachers'

const DEMO_STATS = [
  { label: 'Khóa học đang học', value: 4, icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
  { label: 'Bài tập hoàn thành', value: 23, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
  { label: 'Bài tập chờ nộp', value: 3, icon: Clock, color: 'bg-orange-100 text-orange-600' },
  { label: 'Điểm trung bình', value: '8.1/10', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
]

const DEMO_RECENT = [
  { id: 1, title: 'Vật Lý - Chương 3: Dao động', progress: 72, subject: 'Vật Lý' },
  { id: 2, title: 'Toán - Tích phân', progress: 45, subject: 'Toán' },
  { id: 3, title: 'Hóa - Phản ứng Oxi hóa khử', progress: 88, subject: 'Hóa' },
]

const DEMO_UPCOMING = [
  { id: 1, title: 'Kiểm tra Vật Lý - Chương 3', date: '10/04/2026', type: 'exam' },
  { id: 2, title: 'Nộp bài tập Toán tuần 14', date: '12/04/2026', type: 'assignment' },
  { id: 3, title: 'Lab: Con lắc đơn', date: '14/04/2026', type: 'lab' },
]

export default function StudentDashboard() {
  const { user } = useAuth()
  const { data: stats = DEMO_STATS } = useQuery({
    queryKey: ['student-stats', user?.id],
    queryFn: async () => DEMO_STATS,
    staleTime: 1000 * 60 * 5,
  })

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
          <div key={stat.label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tiếp tục học */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-500" /> Tiếp tục học
          </h2>
          <div className="space-y-3">
            {DEMO_RECENT.map((course) => (
              <Link
                key={course.id}
                to={`/dashboard/courses`}
                className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium">{course.title}</p>
                  <span className="text-xs text-muted-foreground">{course.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sắp tới */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" /> Sắp đến hạn
          </h2>
          <div className="space-y-3">
            {DEMO_UPCOMING.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className={`p-1.5 rounded-md text-white text-xs ${
                  item.type === 'exam' ? 'bg-red-500' :
                  item.type === 'lab' ? 'bg-purple-500' : 'bg-blue-500'
                }`}>
                  {item.type === 'exam' ? 'KT' : item.type === 'lab' ? 'Lab' : 'BT'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE Leaderboard — real-time top học sinh dẫn đầu */}
      <LiveLeaderboard highlightUserId={user?.id} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/ai-tutor"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium">
          <Brain className="w-4 h-4" /> AI Tutor
        </Link>
        <Link to="/dashboard/labtwin"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium">
          <Award className="w-4 h-4" /> Phòng Lab
        </Link>
        <Link to="/dashboard/assignments"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" /> Bài tập
        </Link>
      </div>
    </div>
  )
}
