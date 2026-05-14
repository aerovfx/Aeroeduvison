/**
 * Teacher: My Courses — quản lý khoá học của giảng viên (LMS chuẩn elearniv)
 *
 * v2 — chuẩn LMS:
 *   - Search box + filter status (all/published/draft) + sort
 *   - Stats card đầy đủ: tổng khoá / học viên / đã đăng / doanh thu ước tính
 *   - Card hiện slug + nút "Xem trên web" (mở /courses/:slug)
 *   - Earnings = price × số học viên (ước tính)
 *
 * Inspired by elearniv: src/components/Instructor/CoursesCard.jsx
 */
import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, BookOpen, Users, MoreVertical, Edit, Upload, FileText,
  Trash2, Eye, EyeOff, TrendingUp, Search, Filter, ExternalLink,
  Wallet, Tag,
} from 'lucide-react'
import { instructorService } from '@/services/instructor.service'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import type { InstructorCourse } from '@/types'
import { InstructorBanner } from '@/components/teacher/InstructorBanner'

type StatusFilter = 'all' | 'published' | 'draft'
type SortKey = 'newest' | 'oldest' | 'students' | 'earnings'

function formatCurrency(n: number): string {
  if (n === 0) return 'Miễn phí'
  return n.toLocaleString('vi-VN') + '₫'
}

function CourseCard({ course }: { course: InstructorCourse }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const qc = useQueryClient()

  const enrolCount = course.enrollments?.length ?? 0
  const earnings = (course.regularPrice || 0) * enrolCount
  const publicUrl = `/courses/${course.slug || course.id}`

  const deleteCourse = useMutation({
    mutationFn: () => instructorService.deleteCourse(course.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success('Đã xoá khoá học')
    },
    onError: () => toast.error('Không thể xoá khoá học'),
  })

  const togglePublish = useMutation({
    mutationFn: () => instructorService.togglePublish(course.id, !course.isPublished),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructor-courses'] })
      toast.success(course.isPublished ? 'Đã ẩn khoá học' : 'Đã đăng khoá học')
    },
  })

  const confirmDelete = () => {
    if (window.confirm(`Xoá khoá học "${course.title}"? Hành động không thể hoàn tác.`)) {
      deleteCourse.mutate()
    }
    setMenuOpen(false)
  }

  return (
    <div className="group relative rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-800 overflow-hidden">
        {course.image ? (
          <img
            src={course.image}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-blue-900/40">
            <BookOpen className="w-12 h-12 text-purple-400/50" />
          </div>
        )}

        {/* Top-left: status badge */}
        <div className={cn(
          'absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-sm',
          course.isPublished
            ? 'bg-green-500/90 text-white'
            : 'bg-yellow-500/90 text-black'
        )}>
          {course.isPublished ? '✓ Đã đăng' : '◌ Nháp'}
        </div>

        {/* Top-right: action menu */}
        <div className="absolute top-2 right-2">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-52 rounded-lg bg-gray-800 border border-white/10 shadow-xl z-20 py-1">
                <Link to={`/teacher/course/${course.id}/edit`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  <Edit className="w-4 h-4" /> Chỉnh sửa
                </Link>
                <Link to={`/teacher/course/${course.id}/videos`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  <Upload className="w-4 h-4" /> Bài giảng & Video
                </Link>
                <Link to={`/teacher/course/${course.id}/assets`} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  <FileText className="w-4 h-4" /> Tài liệu đính kèm
                </Link>
                <a href={publicUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5" onClick={() => setMenuOpen(false)}>
                  <ExternalLink className="w-4 h-4" /> Xem trên web
                </a>
                <button onClick={() => { togglePublish.mutate(); setMenuOpen(false) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
                  {course.isPublished
                    ? <><EyeOff className="w-4 h-4" /> Ẩn khoá học</>
                    : <><Eye className="w-4 h-4" /> Đăng khoá học</>}
                </button>
                <div className="my-1 border-t border-white/10" />
                <button onClick={confirmDelete} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4" /> Xoá khoá học
                </button>
              </div>
            </>
          )}
        </div>

        {/* Bottom-right: price tag */}
        <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
          {course.beforePrice > 0 && (
            <div className="bg-black/70 backdrop-blur-sm text-gray-400 line-through text-xs px-2 py-0.5 rounded">
              {formatCurrency(course.beforePrice)}
            </div>
          )}
          <div className={cn(
            'backdrop-blur-sm font-bold text-sm px-2.5 py-1 rounded',
            course.regularPrice > 0 ? 'bg-purple-600/90 text-white' : 'bg-green-500/90 text-white'
          )}>
            {formatCurrency(course.regularPrice)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/teacher/course/${course.id}/edit`} className="flex-1 text-white font-semibold hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
            {course.title}
          </Link>
        </div>

        {/* Slug + category */}
        <div className="flex items-center gap-2 flex-wrap">
          {course.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
              <Tag className="w-3 h-3" />{course.category.name}
            </span>
          )}
          {course.slug && course.slug !== course.id && (
            <span className="text-xs text-gray-500 font-mono truncate max-w-[180px]" title={publicUrl}>
              /{course.slug}
            </span>
          )}
        </div>

        {/* Stats row: 3 cột */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
          <div className="text-center">
            <div className="text-xs text-gray-500">Học viên</div>
            <div className="text-sm font-bold text-blue-300">{enrolCount}</div>
          </div>
          <div className="text-center border-l border-r border-white/5">
            <div className="text-xs text-gray-500">Bài học</div>
            <div className="text-sm font-bold text-purple-300">{course.lessons || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Doanh thu</div>
            <div className="text-sm font-bold text-green-300">
              {earnings > 0 ? formatCurrency(earnings).replace('₫', '') : '—'}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 pt-1">
          <Link
            to={`/teacher/course/${course.id}/edit?step=0`}
            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium text-center transition-colors border border-white/10"
          >
            <Edit className="w-3.5 h-3.5 inline mr-1" />Sửa
          </Link>
          <Link
            to={`/teacher/course/${course.id}/edit?step=2`}
            className="flex-1 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium text-center transition-colors border border-purple-500/30"
          >
            <Upload className="w-3.5 h-3.5 inline mr-1" />Video
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TeacherMyCourses() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: instructorService.getMyCourses,
  })

  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState<StatusFilter>('all')
  const [sort, setSort]         = useState<SortKey>('newest')

  const totalStudents = courses.reduce((sum, c) => sum + (c.enrollments?.length ?? 0), 0)
  const totalEarnings = courses.reduce((sum, c) =>
    sum + ((c.regularPrice || 0) * (c.enrollments?.length ?? 0)), 0)

  const visible = useMemo(() => {
    let list = [...courses]
    // Status filter
    if (status === 'published') list = list.filter(c => c.isPublished)
    else if (status === 'draft') list = list.filter(c => !c.isPublished)
    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(s) ||
        (c.category?.name || '').toLowerCase().includes(s) ||
        (c.slug || '').toLowerCase().includes(s)
      )
    }
    // Sort
    if (sort === 'newest') list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    else if (sort === 'oldest') list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    else if (sort === 'students') list.sort((a, b) => (b.enrollments?.length || 0) - (a.enrollments?.length || 0))
    else if (sort === 'earnings') list.sort((a, b) =>
      (b.regularPrice * (b.enrollments?.length || 0)) - (a.regularPrice * (a.enrollments?.length || 0))
    )
    return list
  }, [courses, search, status, sort])

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <InstructorBanner totalCourses={courses.length} totalStudents={totalStudents} />

      {/* Stats grid — 4 cards */}
      {courses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tổng khoá học', value: courses.length,                                icon: BookOpen,    color: 'text-purple-400' },
            { label: 'Tổng học viên', value: totalStudents,                                  icon: Users,       color: 'text-blue-400'   },
            { label: 'Đã đăng',       value: courses.filter(c => c.isPublished).length,     icon: TrendingUp,  color: 'text-green-400'  },
            { label: 'Doanh thu',     value: formatCurrency(totalEarnings),                  icon: Wallet,      color: 'text-yellow-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center', color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-white truncate">{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar: search + filter + sort + create */}
      {courses.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên, danh mục, slug..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value as StatusFilter)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tất cả ({courses.length})</option>
              <option value="published">Đã đăng ({courses.filter(c => c.isPublished).length})</option>
              <option value="draft">Nháp ({courses.filter(c => !c.isPublished).length})</option>
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="students">Nhiều HV nhất</option>
              <option value="earnings">Doanh thu cao</option>
            </select>
            <Link
              to="/teacher/course/create?step=0"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />Tạo khoá
            </Link>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white/5 animate-pulse h-72" />
          ))}
        </div>
      )}

      {/* Empty (no courses at all) */}
      {!isLoading && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Chưa có khoá học nào</h2>
          <p className="text-gray-400">Tạo khoá học đầu tiên để bắt đầu chia sẻ kiến thức.</p>
          <Link
            to="/teacher/course/create?step=0"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />Tạo khoá học đầu tiên
          </Link>
        </div>
      )}

      {/* Empty (filtered) */}
      {!isLoading && courses.length > 0 && visible.length === 0 && (
        <div className="rounded-xl bg-white/5 border border-white/10 py-12 text-center text-gray-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Không có khoá học nào khớp bộ lọc.
        </div>
      )}

      {/* Grid */}
      {!isLoading && visible.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map(course => <CourseCard key={course.id} course={course} />)}
        </div>
      )}
    </div>
  )
}
