/**
 * /dashboard/stem — HS dashboard dự án STEM (unified)
 *
 * Hub đồng bộ data với DB qua /api/student/stem-projects:
 *   - Tab "Đã tham gia"   — dự án GV khởi xướng + HS đã join qua QR/link
 *   - Tab "Tự khởi xướng" — dự án HS tự tạo (teacher_id = HS userId,
 *                            owner_role='student')
 *
 * Click 1 dự án → /student/stem-projects/:id để xem chi tiết
 * (cùng route detail như trước, không phụ thuộc origin)
 *
 * Replaced trang cũ 2000 dòng (AI Generator + templates + localStorage
 * stemStore) — 2026-05-27 user yêu cầu đồng bộ với DB.
 */
import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap, Plus, Loader2, Users, Calendar, Filter, Search,
  GraduationCap, Sparkles, Trash2, FlaskConical, Cpu,
  Wrench, Calculator, X, AlertCircle, Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

/* ─── Types ──────────────────────────────────────────────────── */
type Origin = 'joined' | 'owned'

interface StemProject {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  subject: string | null
  grade: string | null
  difficulty: string
  tags: string[]
  due_date: string | null
  owner_role: 'teacher' | 'student'
  origin: Origin
  created_at: string
  updated_at: string
  member_count?: number
  teacher_name?: string | null
  teacher_image?: string | null
  joined_at?: string
  member_role?: string
}

interface ApiResponse {
  projects: StemProject[]
  joined: StemProject[]
  owned: StemProject[]
  counts: { joined: number; owned: number }
}

/* ─── Helpers ────────────────────────────────────────────────── */
const CATEGORIES = ['Science', 'Technology', 'Engineering', 'Math'] as const
const STATUS_LABELS: Record<string, string> = {
  draft: 'Bản nháp',
  'in-progress': 'Đang thực hiện',
  review: 'Chờ duyệt',
  completed: 'Hoàn thành',
  published: 'Đã xuất bản',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/[0.06] text-white/50 border-white/[0.08]',
  'in-progress': 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  review: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  published: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
}
const CATEGORY_COLOR: Record<string, { badge: string; icon: any }> = {
  Science: { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/25', icon: FlaskConical },
  Technology: { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', icon: Cpu },
  Engineering: { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/25', icon: Wrench },
  Math: { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/25', icon: Calculator },
}

/* ─── Page ───────────────────────────────────────────────────── */
type Tab = 'joined' | 'owned'

export default function Stem() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('joined')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('all')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StemProject | null>(null)

  const reload = async () => {
    setLoading(true)
    try {
      const { data: r } = await api.get<ApiResponse>('/student/stem-projects')
      setData(r)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tải được danh sách dự án')
      setData({ projects: [], joined: [], owned: [], counts: { joined: 0, owned: 0 } })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { reload() }, [])

  const list = tab === 'joined' ? (data?.joined || []) : (data?.owned || [])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list.filter((p) => {
      if (filterCat !== 'all' && p.category !== filterCat) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.subject || '').toLowerCase().includes(q)
      )
    })
  }, [list, search, filterCat])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/student/stem-projects/${deleteTarget.id}`)
      toast.success('Đã xoá dự án')
      setDeleteTarget(null)
      reload()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không xoá được')
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-background text-foreground">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 border border-amber-500/20 p-6 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Dự án STEM của tôi</h1>
              <p className="text-sm text-muted-foreground">
                Đồng bộ với giáo viên · theo dõi tiến độ realtime · sáng tạo dự án riêng
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold shadow-lg shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tạo dự án mới
            </button>
          </div>
        </div>

        {/* Tabs + search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] shrink-0">
            {(['joined', 'owned'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === t ? 'bg-amber-500 text-black shadow' : 'text-white/40 hover:text-white/80'
                }`}
              >
                {t === 'joined' ? <GraduationCap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {t === 'joined' ? 'Đã tham gia' : 'Tự khởi xướng'}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    tab === t ? 'bg-black/15' : 'bg-white/[0.08]'
                  }`}
                >
                  {(t === 'joined' ? data?.counts.joined : data?.counts.owned) ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tiêu đề / mô tả / môn học..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
          >
            <option value="all">Tất cả</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Mobile create button */}
        <button
          onClick={() => setCreateOpen(true)}
          className="sm:hidden w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold mb-4 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo dự án mới
        </button>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState tab={tab} onCreate={() => setCreateOpen(true)} hasSearch={!!search || filterCat !== 'all'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => navigate(`/student/stem-projects/${p.id}`)}
                onDelete={tab === 'owned' ? () => setDeleteTarget(p) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && (
        <CreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); setTab('owned'); reload() }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          project={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

/* ─── Empty State ───────────────────────────────────────────── */
function EmptyState({ tab, onCreate, hasSearch }: {
  tab: Tab; onCreate: () => void; hasSearch: boolean
}) {
  if (hasSearch) {
    return (
      <div className="rounded-2xl bg-card border border-border p-10 text-center">
        <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Không tìm thấy dự án phù hợp</p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-card border border-border p-10 text-center">
      <Zap className="w-16 h-16 mx-auto mb-3 text-muted-foreground/30" />
      {tab === 'joined' ? (
        <>
          <h2 className="text-xl font-bold mb-2">Chưa tham gia dự án nào</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Quét QR mời từ giáo viên hoặc xin link tham gia
          </p>
          <p className="text-xs text-muted-foreground/70">
            Hoặc tự khởi xướng dự án riêng ở tab bên cạnh ↗
          </p>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-2">Chưa có dự án tự khởi xướng</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Tạo dự án STEM theo ý tưởng riêng của bạn — quản lý task, log, milestone như Agile
          </p>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Bắt đầu dự án đầu tiên
          </button>
        </>
      )}
    </div>
  )
}

/* ─── Project Card ──────────────────────────────────────────── */
function ProjectCard({ project, onClick, onDelete }: {
  project: StemProject; onClick: () => void; onDelete?: () => void
}) {
  const cat = CATEGORY_COLOR[project.category] || CATEGORY_COLOR.Science
  const CatIcon = cat.icon
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl bg-card border border-border p-5 hover:border-amber-500/40 hover:shadow-lg transition-all"
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{project.title}</h3>
            {project.origin === 'joined' && project.teacher_name ? (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                <GraduationCap className="w-3 h-3 inline mr-1 -mt-0.5" />
                GV: {project.teacher_name}
              </p>
            ) : (
              <p className="text-xs text-amber-400 mt-0.5">
                <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" />
                Dự án của tôi
              </p>
            )}
          </div>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
        )}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${cat.badge}`}>
            <CatIcon className="w-3 h-3" />
            {project.category}
          </span>
          <span className={`px-2 py-0.5 rounded-md border ${STATUS_COLORS[project.status] || STATUS_COLORS.draft}`}>
            {STATUS_LABELS[project.status] || project.status}
          </span>
          {project.subject && (
            <span className="text-muted-foreground text-[10px]">📚 {project.subject}</span>
          )}
          {project.grade && (
            <span className="text-muted-foreground text-[10px]">· Lớp {project.grade}</span>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {project.member_count || 1} thành viên
          </span>
          <span>
            {project.origin === 'joined' && project.joined_at
              ? `Tham gia: ${new Date(project.joined_at).toLocaleDateString('vi-VN')}`
              : `Tạo: ${new Date(project.created_at).toLocaleDateString('vi-VN')}`}
          </span>
        </div>
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-rose-600/80 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
          title="Xoá dự án"
          aria-label="Xoá dự án"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

/* ─── Create Modal ──────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('Science')
  const [subject, setSubject] = useState('')
  const [grade, setGrade] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!title.trim()) {
      toast.error('Tiêu đề không được trống')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/student/stem-projects', {
        title: title.trim(),
        description: description.trim() || null,
        category,
        subject: subject.trim() || null,
        grade: grade.trim() || null,
      })
      toast.success('🎉 Tạo dự án thành công!')
      onCreated()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tạo được')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Tự khởi xướng dự án STEM</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bạn sẽ là chủ dự án — có thể mời bạn khác qua link/QR
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">
              Tiêu đề <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Trồng rau thuỷ canh bằng cảm biến pH"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] focus:border-amber-500/40 text-sm outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) submit() }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Mô tả ý tưởng</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mục tiêu, vấn đề muốn giải quyết, công nghệ dự kiến..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] focus:border-amber-500/40 text-sm outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1.5">Lĩnh vực STEM</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const conf = CATEGORY_COLOR[c]
                const Icon = conf.icon
                return (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all ${
                      category === c ? `${conf.badge} ring-2 ring-amber-400/50` : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-bold">{c}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1">Môn học</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="VD: Hoá học"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] focus:border-amber-500/40 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/70 mb-1">Lớp</label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="VD: 11"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.10] focus:border-amber-500/40 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] hover:bg-white/[0.08] text-sm font-bold disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Tạo dự án
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Delete Confirm Modal ──────────────────────────────────── */
function DeleteConfirm({ project, onCancel, onConfirm }: {
  project: StemProject; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-md bg-card border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold">Xoá dự án "{project.title}"?</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Toàn bộ task, log, milestone, feedback sẽ bị xoá vĩnh viễn. Không thể khôi phục.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] hover:bg-white/[0.08] text-sm font-bold"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-sm font-bold transition-colors"
          >
            Xoá vĩnh viễn
          </button>
        </div>
      </div>
    </>
  )
}
