/**
 * InstructorBanner — Banner "Jump Into Course Creation"
 * Ported từ elearniv: InstructorHeader component
 *
 * Dùng ở: TeacherMyCourses (đầu trang)
 */
import { Link } from 'react-router-dom'
import { PlusCircle, TrendingUp, Users, BookOpen } from 'lucide-react'

interface InstructorBannerProps {
  /** Tổng số khoá học */
  totalCourses?: number
  /** Tổng số học sinh */
  totalStudents?: number
}

export function InstructorBanner({ totalCourses = 0, totalStudents = 0 }: InstructorBannerProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-purple-900/20 border border-purple-500/20">
      {/* Decorative glow */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

      <div className="relative px-6 py-6 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: text + stats */}
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-white">Bắt đầu tạo khoá học</h2>
            <p className="text-sm text-white/50 mt-0.5">
              Chia sẻ kiến thức của bạn với hàng nghìn học sinh trên nền tảng.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-white">{totalCourses}</span>
              <span>khoá học</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-white">{totalStudents}</span>
              <span>học sinh</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-medium">Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* Right: CTA */}
        <Link
          to="/teacher/course/create"
          className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-purple-900/40"
        >
          <PlusCircle className="w-4 h-4" />
          Tạo khoá học mới
        </Link>
      </div>
    </div>
  )
}
