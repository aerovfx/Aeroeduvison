/**
 * STEM Projects Dashboard (Vite clone)
 *
 * Clone of Next.js /dashboard/stem
 * Dark-first Tailwind, no shadcn, React Router v6, native HTML.
 */

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, Eye, Edit, Trash2, MoreHorizontal, Zap,
  FlaskConical, Cpu, Wrench, Calculator, Users, Calendar,
  Target, CheckCircle, AlertCircle, Clock, MessageSquare,
  Download, Share, UserCheck,
} from 'lucide-react'
import { loadProjects, saveProjects, type STEMProject } from '@/pages/stem/stemStore'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function getStatusLabel(status: string) {
  switch (status) {
    case 'draft': return 'Bản nháp'
    case 'in-progress': return 'Đang thực hiện'
    case 'review': return 'Chờ duyệt'
    case 'completed': return 'Hoàn thành'
    case 'published': return 'Đã xuất bản'
    default: return status
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'draft': return 'bg-white/[0.06] text-white/50 border border-white/[0.08]'
    case 'in-progress': return 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
    case 'review': return 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25'
    case 'completed': return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
    case 'published': return 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
    default: return 'bg-white/[0.06] text-white/50'
  }
}

function getProgressColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-emerald-500'
    case 'in-progress': return 'bg-blue-500'
    case 'review': return 'bg-yellow-500'
    default: return 'bg-white/30'
  }
}

function getCategoryClasses(category: string) {
  switch (category) {
    case 'Science': return { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25', icon: 'text-blue-400' }
    case 'Technology': return { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', icon: 'text-emerald-400' }
    case 'Engineering': return { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25', icon: 'text-orange-400' }
    case 'Math': return { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25', icon: 'text-purple-400' }
    default: return { badge: 'bg-white/[0.06] text-white/50 border-white/[0.08]', icon: 'text-white/50' }
  }
}

function getCategoryIcon(category: string, className = 'h-5 w-5') {
  switch (category) {
    case 'Science': return <FlaskConical className={className} />
    case 'Technology': return <Cpu className={className} />
    case 'Engineering': return <Wrench className={className} />
    case 'Math': return <Calculator className={className} />
    default: return <Zap className={className} />
  }
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 3)
}

// ─────────────────────────────────────────────
// DROPDOWN MENU (native)
// ─────────────────────────────────────────────
function ProjectMenu({ project, onDelete }: { project: STEMProject; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 w-44 rounded-xl border border-white/[0.08] bg-[hsl(260,30%,10%)] shadow-xl z-20 py-1">
          <p className="px-3 py-1.5 text-[0.65rem] uppercase tracking-wider text-white/25 font-semibold">Hành động</p>
          <Link to={`/dashboard/stem/${project.id}`} onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
            <Eye className="h-4 w-4" /> Xem chi tiết
          </Link>
          <Link to={`/dashboard/stem/${project.id}/edit`} onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
            <Edit className="h-4 w-4" /> Chỉnh sửa
          </Link>
          <Link to={`/dashboard/stem/${project.id}/timeline`} onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
            <Calendar className="h-4 w-4" /> Timeline
          </Link>
          <div className="my-1 border-t border-white/[0.06]" />
          <button onClick={() => { setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.05] transition-colors">
            <Share className="h-4 w-4" /> Chia sẻ
          </button>
          <button onClick={() => { setOpen(false); onDelete() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <Trash2 className="h-4 w-4" /> Xóa
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// PROJECT CARD
// ─────────────────────────────────────────────
function ProjectCard({ project, onDelete }: { project: STEMProject; onDelete: () => void }) {
  const catClass = getCategoryClasses(project.category)

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 flex flex-col">
      {/* Card header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${catClass.badge} border`}>
              <span className={catClass.icon}>{getCategoryIcon(project.category)}</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white/85 leading-snug line-clamp-2 mb-1.5">
                {project.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.6rem] font-semibold border ${getStatusClasses(project.status)}`}>
                  {getStatusLabel(project.status)}
                </span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.6rem] font-medium border ${catClass.badge}`}>
                  {project.category}
                </span>
              </div>
            </div>
          </div>
          <ProjectMenu project={project} onDelete={onDelete} />
        </div>

        {/* Description */}
        <p className="text-xs text-white/40 leading-relaxed line-clamp-3 mb-4">
          {project.description}
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/40">Tiến độ</span>
            <span className="font-semibold text-white/70">{project.progress}%</span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${getProgressColor(project.status)}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-white/30" />
            <span className="text-xs text-white/35">Nhóm ({project.teamMembers.length})</span>
          </div>
          <div className="flex -space-x-1.5">
            {project.teamMembers.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[hsl(260,30%,8%)] bg-blue-500/20 text-blue-300"
                title={member.name}
              >
                <span className="text-[0.55rem] font-bold">{getInitials(member.name)}</span>
              </div>
            ))}
            {project.teamMembers.length > 3 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center border-2 border-[hsl(260,30%,8%)] bg-white/[0.08] text-white/50">
                <span className="text-[0.55rem] font-bold">+{project.teamMembers.length - 3}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {project.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="px-2 py-0.5 text-[0.6rem] rounded border border-white/[0.08] text-white/35">
              {tag}
            </span>
          ))}
          {project.tags.length > 3 && (
            <span className="px-2 py-0.5 text-[0.6rem] rounded border border-white/[0.08] text-white/25">
              +{project.tags.length - 3}
            </span>
          )}
        </div>

        {/* Instructor & Due Date */}
        <div className="flex items-center justify-between text-xs text-white/35 mb-3">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            <span className="truncate max-w-[130px]">{project.instructor.name}</span>
          </div>
          {project.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(project.dueDate).toLocaleDateString('vi-VN')}</span>
            </div>
          )}
        </div>

        {/* Feedback */}
        {project.feedback.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-white/30 mb-3">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{project.feedback.length} phản hồi từ giáo viên</span>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-5 pb-5 mt-auto flex gap-2">
        <Link
          to={`/dashboard/stem/${project.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/85 transition-all"
        >
          <Eye className="h-3.5 w-3.5" />
          Xem
        </Link>
        <Link
          to={`/dashboard/stem/${project.id}/edit`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/85 transition-all"
        >
          <Edit className="h-3.5 w-3.5" />
          Sửa
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function StemPage() {
  const [projects, setProjects] = useState<STEMProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    const timer = setTimeout(() => {
      setProjects(loadProjects())
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const handleDelete = (id: string) => {
    if (!confirm('Xóa dự án này?')) return
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated)
    saveProjects(updated)
  }

  const filtered = projects.filter(p => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter
    return matchSearch && matchStatus && matchCat
  })

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in-progress').length,
    draft: projects.filter(p => p.status === 'draft').length,
    review: projects.filter(p => p.status === 'review').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(260,30%,8%)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-10 h-10 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />
          </div>
          <p className="text-white/40 text-sm">Đang tải dự án STEM...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white/90 mb-2">Dự án STEM của tôi</h1>
              <p className="text-white/40">Quản lý và theo dõi các dự án STEM mà bạn đang tham gia</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link
                to="/dashboard/stem/templates"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.1] hover:bg-white/[0.05] hover:text-white/80 transition-all"
              >
                <Download className="h-4 w-4" />
                Mẫu dự án
              </Link>
              <Link
                to="/dashboard/stem/create"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all shadow-lg shadow-purple-900/30"
              >
                <Plus className="h-4 w-4" />
                Tạo dự án mới
              </Link>
            </div>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Tổng dự án', value: stats.total, icon: <Target className="h-7 w-7 text-blue-400" />, color: 'text-blue-400' },
            { label: 'Hoàn thành', value: stats.completed, icon: <CheckCircle className="h-7 w-7 text-emerald-400" />, color: 'text-emerald-400' },
            { label: 'Đang thực hiện', value: stats.inProgress, icon: <Clock className="h-7 w-7 text-blue-400" />, color: 'text-blue-400' },
            { label: 'Bản nháp', value: stats.draft, icon: <Edit className="h-7 w-7 text-white/40" />, color: 'text-white/60' },
            { label: 'Chờ duyệt', value: stats.review, icon: <AlertCircle className="h-7 w-7 text-yellow-400" />, color: 'text-yellow-400' },
          ].map((s, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 font-medium mb-1">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
              <input
                type="text"
                placeholder="Tìm kiếm dự án..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] transition-all"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="in-progress">Đang thực hiện</option>
              <option value="review">Chờ duyệt</option>
              <option value="completed">Hoàn thành</option>
              <option value="published">Đã xuất bản</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm focus:outline-none focus:border-purple-500/50 transition-all appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="all">Tất cả lĩnh vực</option>
              <option value="Science">Khoa học</option>
              <option value="Technology">Công nghệ</option>
              <option value="Engineering">Kỹ thuật</option>
              <option value="Math">Toán học</option>
            </select>
          </div>
        </div>

        {/* ── Project Grid ── */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => handleDelete(project.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <Target className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/60 mb-2">Không tìm thấy dự án nào</h3>
            <p className="text-white/35 mb-6 text-sm">Thử thay đổi bộ lọc hoặc tạo dự án STEM mới</p>
            <Link
              to="/dashboard/stem/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              Tạo dự án mới
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
