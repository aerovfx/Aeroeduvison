/**
 * CourseManagementNav — Tab navigation khi quản lý một khoá học cụ thể
 * Ported từ elearniv: PageNavigation component
 *
 * Dùng ở: CourseEditor (edit), CourseVideos, CourseAssets
 * Hiển thị: Courses → Tên khoá học → [Edit | Videos | Assets]
 */
import { NavLink, Link } from 'react-router-dom'
import { ArrowLeft, Edit3, Video, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CourseManagementNavProps {
  courseId: string
  courseTitle?: string
}

const TABS = (courseId: string) => [
  {
    to: `/teacher/course/${courseId}/edit`,
    label: 'Chỉnh sửa',
    icon: Edit3,
  },
  {
    to: `/teacher/course/${courseId}/videos`,
    label: 'Video',
    icon: Video,
  },
  {
    to: `/teacher/course/${courseId}/assets`,
    label: 'Tài liệu',
    icon: FolderOpen,
  },
]

export function CourseManagementNav({ courseId, courseTitle }: CourseManagementNavProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-3">
        <Link
          to="/teacher/my-courses"
          className="flex items-center gap-1.5 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Khoá học của tôi
        </Link>
        {courseTitle && (
          <>
            <span>/</span>
            <span className="text-white/70 truncate max-w-xs">{courseTitle}</span>
          </>
        )}
      </div>

      {/* Title */}
      {courseTitle && (
        <h1 className="text-xl font-bold text-white mb-4 truncate">{courseTitle}</h1>
      )}

      {/* Tab navigation */}
      <nav className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-px">
        {TABS(courseId).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px',
                isActive
                  ? 'text-purple-400 border-purple-500 bg-purple-500/10'
                  : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
