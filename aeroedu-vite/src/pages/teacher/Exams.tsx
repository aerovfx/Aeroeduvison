
/**
 * Exams — Quản lý danh sách đề thi của GV.
 * Xem/sửa/xoá/nhân bản đề, tạo đề mới (thủ công / ma trận / AI), tạo thêm mã đề,
 * đưa đề vào game catalog, xuất dữ liệu LaTeX và mở phòng thi live.
 */

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, FileText, Eye, Edit, Trash2, Copy,
  Grid3x3, Search, BarChart3, Sparkles, Loader2, Swords,
  Trophy, Users, Award, TrendingUp, Crown,
} from "lucide-react"
import toast from "react-hot-toast"
import { api } from "@/services/api"
import { TeacherHelpDrawer } from '@/components/help/TeacherHelpDrawer'

// ── Dark palette ──────────────────────────────────────────────
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  wall:        'var(--td-wall)',
  topbar:      'var(--td-topbar)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  divider:     'var(--td-divider)',
  grid:        'var(--td-grid)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  muted2:      'var(--td-muted2)',
  purple:      'var(--td-purple)',
  purpleL:     'var(--td-purple-l)',
  purpleHover: 'var(--td-purple-hover)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  rose:        'var(--td-rose)',
  blue:        'var(--td-blue)',
  pink:        'var(--td-pink)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
  greenA:  (a: number) => `rgba(var(--td-green-rgb), ${a})`,
  redA:    (a: number) => `rgba(var(--td-red-rgb), ${a})`,
  cyanA:   (a: number) => `rgba(var(--td-cyan-rgb), ${a})`,
  blueA:   (a: number) => `rgba(var(--td-blue-rgb), ${a})`,
} as const


// ── Types ─────────────────────────────────────────────────────
interface Exam {
  id: string
  title: string
  subject?: string
  examType: string
  duration: number
  totalQuestions: number
  status: string
  createdAt: string
  // Community fields (chỉ có khi scope=all/public)
  isOwner?: boolean
  authorName?: string
  authorImage?: string | null
  attempts?: number
  uniqueStudents?: number
  avgScore?: number
}

interface MostAttemptedExam {
  id: string
  title: string
  subject: string
  grade: string | null
  questionCount: number
  attempts: number
  uniqueStudents: number
  avgScore: number
  teacher: { id: string; name: string; image: string | null } | null
}

interface TopTeacher {
  id: string
  name: string
  email: string
  image: string | null
  examCount: number
  totalAttempts: number
  avgScore: number
}

interface CommunityStats {
  mostAttempted: MostAttemptedExam[]
  topTeachers: TopTeacher[]
  summary: {
    total_exams?: number
    public_exams?: number
    contributing_teachers?: number
    total_attempts?: number
    active_students?: number
    avg_score?: number
  }
  updatedAt: string
}

type ScopeTab = 'mine' | 'all'

// ── Status badge ──────────────────────────────────────────────
// StatusBadge — trạng thái đề thi (Nháp/Đã xuất bản/Lưu trữ)
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    "Hoàn tất":  { bg: 'rgba(22,163,74,0.15)',  color: '#4ade80', border: 'rgba(22,163,74,0.4)'  },
    "Nháp":      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.4)' },
    "Đang thi":  { bg: 'rgba(37,99,235,0.15)',   color: '#60a5fa', border: 'rgba(37,99,235,0.4)'  },
    "Kết thúc":  { bg: 'rgba(124,58,237,0.15)',  color: '#a78bfa', border: 'rgba(124,58,237,0.4)' },
  }
  const c = map[status] ?? map["Nháp"]
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 500,
        display: 'inline-block',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────
// Component chính: danh sách đề + thao tác CRUD/nhân bản/xuất LaTeX
export default function ExamsPage() {
  const navigate = useNavigate()

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("Tất cả môn")
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [exportingLatexId, setExportingLatexId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [addingToGameId, setAddingToGameId] = useState<string | null>(null)
  const [scope, setScope] = useState<ScopeTab>('all')  // Default 'all' = hiện TẤT CẢ đề
  const [community, setCommunity] = useState<CommunityStats | null>(null)
  const [communityLoading, setCommunityLoading] = useState(true)

  useEffect(() => { loadExams() }, [subjectFilter, scope])
  useEffect(() => { loadCommunity() }, [])

  // ── API calls ──────────────────────────────────────────────
  const loadExams = async () => {
    try {
      setLoading(true)
      // Pass scope=mine/all → BE filter accordingly
      const { data } = await api.get(`/teacher/exams?scope=${scope}`)
      const list = Array.isArray(data?.exams) ? data.exams : Array.isArray(data?.data) ? data.data : []
      setExams(
        list.map((e: any) => ({
          id: String(e.id),
          title: String(e.title || 'Untitled'),
          subject: e.subject ? String(e.subject) : undefined,
          examType: String(e.examType || 'N/A'),
          duration: Number(e.duration || e.duration_min || 0),
          totalQuestions: Number(e.totalQuestions || e.question_count || 0),
          status: String(e.status || 'Nháp'),
          createdAt: String(e.createdAt || e.created_at || new Date().toISOString()),
          // Community enrichment
          isOwner: !!e.isOwner,
          authorName: e.authorName ? String(e.authorName) : undefined,
          authorImage: e.authorImage || null,
          attempts: Number(e.attempts || 0),
          uniqueStudents: Number(e.uniqueStudents || 0),
          avgScore: Number(e.avgScore || 0),
        }))
      )
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 503 || status === 502) {
        setExams([])
      } else {
        console.error(err)
        toast.error("Không tải được danh sách đề thi")
        setExams([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadCommunity = async () => {
    setCommunityLoading(true)
    try {
      const { data } = await api.get<CommunityStats>('/exams/community-stats?limit=10')
      setCommunity(data)
    } catch {
      setCommunity(null)
    } finally {
      setCommunityLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa đề thi này?')) return
    try {
      setDeletingId(id)
      await api.delete(`/teacher/exams/${id}`)
      toast.success('Đã xóa đề thi')
      if (selectedExamId === id) setSelectedExamId(null)
      loadExams()
    } catch {
      toast.error('Không thể xóa đề thi')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddToGameCatalog = async (exam: Exam) => {
    if (addingToGameId) return
    setAddingToGameId(exam.id)
    try {
      await api.post('/games/catalog', {
        examId: exam.id,
        examTitle: exam.title,
        subject: exam.subject,
        questionCount: exam.totalQuestions,
        gameType: 'keo-co',
      })
      toast.success(`Đã thêm "${exam.title}" vào danh mục trò chơi Kéo Co ⚔️`)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Không thể thêm vào danh mục trò chơi')
    } finally {
      setAddingToGameId(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      setDuplicatingId(id)
      await api.post(`/teacher/exams/${id}/duplicate`)
      toast.success('Đã nhân bản đề thi')
      loadExams()
    } catch {
      toast.error('Không thể nhân bản')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleExportLatex = async (examId: string) => {
    if (!examId || exportingLatexId) return
    setExportingLatexId(examId)
    try {
      const { data } = await api.post('/latex-projects/export-from-exam', { examId })
      // API returns { success, data: { id, ... } }
      const projectId = data.data?.id ?? data.id
      toast.success('Đã tạo tài liệu LaTeX. Đang mở...')
      navigate(`/teacher/latex-documents/${projectId}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Không thể gửi đề sang LaTeX')
    } finally {
      setExportingLatexId(null)
    }
  }

  // ── Filtered list ──────────────────────────────────────────
  const filtered = exams.filter(e => {
    const matchSearch = searchQuery
      ? e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.subject ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchSubject = subjectFilter === 'Tất cả môn'
      ? true
      : e.subject === subjectFilter
    return matchSearch && matchSubject
  })

  const selectedExam = exams.find(e => e.id === selectedExamId)

  // ── Stats ──────────────────────────────────────────────────
  const stats = [
    { label: 'Tổng số đề',  value: exams.length,                                  color: '#a78bfa', rowBg: 'rgba(124,58,237,0.12)' },
    { label: 'Hoàn tất',    value: exams.filter(e => e.status === 'Hoàn tất').length, color: '#4ade80', rowBg: 'rgba(22,163,74,0.1)'  },
    { label: 'Đang thi',    value: exams.filter(e => e.status === 'Đang thi').length,  color: '#60a5fa', rowBg: 'rgba(37,99,235,0.1)'  },
    { label: 'Nháp',        value: exams.filter(e => e.status === 'Nháp').length,     color: D.muted,   rowBg: 'rgba(100,116,139,0.1)' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: D.bg }}>
      {/* Floating help button — opens drawer với hướng dẫn module này */}
      <TeacherHelpDrawer moduleKey="exams-list" />

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ background: D.card, borderBottom: `1px solid ${D.border}` }} className="sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: D.text }}>Đề Thi</h1>
                <p className="text-sm" style={{ color: D.muted }}>Quản lý và chấm điểm tự động</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/teacher/taodethi')}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(90deg,#ec4899,#db2777)',
                  color: '#fff', boxShadow: '0 4px 12px rgba(236,72,153,0.35)',
                }}
                title="Tạo đề từ PDF bằng AI (Wayground-style)"
              >
                <Plus className="w-4 h-4" />
                Tạo đề bằng AI
              </button>
              <button
                onClick={() => navigate('/teacher/exams/create')}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ background: D.purple, color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
              >
                <Plus className="w-4 h-4" />
                Tạo thủ công
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── COMMUNITY STATS — bảng vinh danh đầu trang ──── */}
        {community && (community.summary?.total_attempts ?? 0) > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* TOP đề được làm nhiều nhất */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }}
                 className="rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <Trophy className="w-5 h-5" style={{ color: '#fbbf24' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold" style={{ color: D.text }}>🔥 Top đề được làm nhiều nhất</h3>
                  <p className="text-xs" style={{ color: D.muted }}>
                    {community.summary.total_attempts?.toLocaleString('vi-VN')} lượt thi · {community.summary.active_students?.toLocaleString('vi-VN')} HS hoạt động
                  </p>
                </div>
              </div>
              {community.mostAttempted.length === 0 ? (
                <p className="text-sm py-6 text-center italic" style={{ color: D.muted2 }}>
                  Chưa có đề nào được làm. Khi HS làm bài, đề sẽ xuất hiện ở đây.
                </p>
              ) : (
                <div className="space-y-2">
                  {community.mostAttempted.slice(0, 5).map((e, i) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/teacher/exams/${e.id}`)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left"
                      style={{ background: i === 0 ? 'rgba(245,158,11,0.08)' : D.card2 }}
                      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                      onMouseLeave={ev => (ev.currentTarget.style.background = i === 0 ? 'rgba(245,158,11,0.08)' : D.card2)}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? '#fbbf24' : i === 1 ? '#a3a3a3' : i === 2 ? '#cd7f32' : D.border2,
                          color: i < 3 ? '#000' : D.muted,
                        }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: D.text }}>{e.title}</p>
                        <p className="text-xs" style={{ color: D.muted }}>
                          {e.subject}{e.grade ? ` · Lớp ${e.grade}` : ''} · {e.teacher?.name || 'Chưa rõ tác giả'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: '#fbbf24' }}>{e.attempts.toLocaleString('vi-VN')}</p>
                        <p className="text-[10px]" style={{ color: D.muted }}>lượt thi</p>
                      </div>
                      {e.avgScore > 0 && (
                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <p className="text-sm font-bold" style={{ color: e.avgScore >= 70 ? '#4ade80' : e.avgScore >= 50 ? '#60a5fa' : '#f87171' }}>{e.avgScore}%</p>
                          <p className="text-[10px]" style={{ color: D.muted }}>điểm TB</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TOP giáo viên có đề chất lượng */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }}
                 className="rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Crown className="w-5 h-5" style={{ color: '#a78bfa' }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold" style={{ color: D.text }}>👑 Giáo viên có đề được đánh giá cao</h3>
                  <p className="text-xs" style={{ color: D.muted }}>
                    {community.summary.contributing_teachers ?? 0} GV đóng góp · {community.summary.total_exams?.toLocaleString('vi-VN')} đề
                  </p>
                </div>
              </div>
              {community.topTeachers.length === 0 ? (
                <p className="text-sm py-6 text-center italic" style={{ color: D.muted2 }}>
                  Chưa có GV nào có đề được làm. Cộng đồng vẫn còn mới!
                </p>
              ) : (
                <div className="space-y-2">
                  {community.topTeachers.slice(0, 5).map((t, i) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: i === 0 ? 'rgba(124,58,237,0.08)' : D.card2 }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? '#fbbf24' : i === 1 ? '#a3a3a3' : i === 2 ? '#cd7f32' : D.border2,
                          color: i < 3 ? '#000' : D.muted,
                        }}>
                        {i + 1}
                      </div>
                      {t.image ? (
                        <img src={t.image} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                          style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                          {(t.name || 'G')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: D.text }}>{t.name}</p>
                        <p className="text-xs" style={{ color: D.muted }}>{t.examCount} đề · {t.totalAttempts.toLocaleString('vi-VN')} lượt thi</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold" style={{ color: t.avgScore >= 70 ? '#4ade80' : t.avgScore >= 50 ? '#60a5fa' : '#f87171' }}>
                          {t.avgScore || '—'}%
                        </p>
                        <p className="text-[10px]" style={{ color: D.muted }}>điểm TB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty community state — loading */}
        {communityLoading && !community && (
          <div className="mb-6 p-4 rounded-xl flex items-center justify-center gap-3"
               style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: D.purpleL }} />
            <span className="text-sm" style={{ color: D.muted }}>Đang tải bảng vinh danh...</span>
          </div>
        )}

        {/* ── SCOPE TABS — Của tôi vs Tất cả ──── */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: D.card }}>
            {([
              { key: 'mine' as const, label: 'Đề của tôi', icon: FileText },
              { key: 'all'  as const, label: 'Tất cả đề (Cộng đồng)', icon: Users },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: scope === key ? D.purple : 'transparent',
                  color: scope === key ? '#fff' : D.muted,
                }}
              >
                <Icon className="w-4 h-4" />
                {label}
                {scope === key && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ background: 'rgba(255,255,255,0.2)' }}>
                    {exams.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: D.muted }}>
            {scope === 'mine'
              ? '👤 Chỉ hiển thị đề bạn tạo'
              : '🌍 Đề của bạn + đề public từ GV khác trong cộng đồng'}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-6">

          {/* ── Left column (8) ────────────────────────────── */}
          <div className="col-span-12 lg:col-span-8 space-y-4">

            {/* Filter bar */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: D.muted }} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm đề thi..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}
                  />
                </div>
                <select
                  value={subjectFilter}
                  onChange={e => setSubjectFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ background: D.card2, border: `1px solid ${D.border2}`, color: D.text }}
                >
                  <option value="Tất cả môn">Tất cả môn</option>
                  <option value="Toán học">Toán học</option>
                  <option value="Vật lý">Vật lý</option>
                  <option value="Hóa học">Hóa học</option>
                  <option value="Văn học">Văn học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                </select>
              </div>
            </div>

            {/* Exam table */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: D.card2, borderBottom: `1px solid ${D.border}` }}>
                    <tr>
                      {(scope === 'all'
                        ? ['Đề thi', 'Tác giả', 'Môn', 'Lượt thi', 'Điểm TB', 'Trạng thái', 'Hành động']
                        : ['Đề thi', 'Môn', 'Loại', 'Thời gian', 'SL câu', 'Trạng thái', 'Hành động']
                      ).map((h, i, arr) => (
                        <th
                          key={h}
                          className={`p-4 text-xs font-medium uppercase tracking-wide ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}
                          style={{ color: D.muted }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-purple-800 border-t-purple-400 animate-spin" />
                            <span style={{ color: D.muted }}>Đang tải...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center">
                          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: D.muted }} />
                          <p className="font-medium" style={{ color: D.text }}>Chưa có đề thi nào</p>
                          <p className="text-sm mt-1" style={{ color: D.muted }}>Tạo đề thi đầu tiên để bắt đầu</p>
                        </td>
                      </tr>
                    ) : (
                      filtered.map(exam => (
                        <tr
                          key={exam.id}
                          onClick={() => setSelectedExamId(exam.id === selectedExamId ? null : exam.id)}
                          className="cursor-pointer transition-colors"
                          style={{
                            borderBottom: `1px solid ${D.border}`,
                            background: selectedExamId === exam.id
                              ? 'rgba(124,58,237,0.1)'
                              : 'transparent',
                          }}
                          onMouseEnter={e => {
                            if (selectedExamId !== exam.id)
                              e.currentTarget.style.background = `rgba(255,255,255,0.03)`
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = selectedExamId === exam.id
                              ? 'rgba(124,58,237,0.1)'
                              : 'transparent'
                          }}
                        >
                          {/* Đề thi */}
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(124,58,237,0.15)', border: `1px solid rgba(124,58,237,0.3)` }}
                              >
                                <FileText className="w-5 h-5" style={{ color: '#a78bfa' }} />
                              </div>
                              <div>
                                <div className="font-medium text-sm flex items-center gap-1.5" style={{ color: D.text }}>
                                  {exam.title}
                                  {exam.isOwner && scope === 'all' && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                                      style={{ background: 'rgba(34,211,238,0.2)', color: '#22d3ee' }}>
                                      của bạn
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: D.muted }}>
                                  <span>{exam.duration}p · {exam.totalQuestions} câu</span>
                                  {scope === 'all' && (exam.uniqueStudents ?? 0) > 0 && (
                                    <span className="text-[10px]">· {exam.uniqueStudents} HS</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          {scope === 'all' ? (
                            <>
                              {/* Tác giả */}
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {exam.authorImage ? (
                                    <img src={exam.authorImage} alt="" className="w-6 h-6 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                      style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>
                                      {(exam.authorName || 'G')[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-sm truncate max-w-[120px]" style={{ color: D.muted }}>
                                    {exam.authorName || 'Chưa rõ'}
                                  </span>
                                </div>
                              </td>
                              {/* Môn */}
                              <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.subject || 'Chưa phân môn'}</td>
                              {/* Lượt thi */}
                              <td className="p-4 text-sm">
                                <span className="font-bold" style={{ color: (exam.attempts ?? 0) > 0 ? '#fbbf24' : D.muted2 }}>
                                  {(exam.attempts ?? 0).toLocaleString('vi-VN')}
                                </span>
                              </td>
                              {/* Điểm TB */}
                              <td className="p-4 text-sm">
                                {(exam.avgScore ?? 0) > 0 ? (
                                  <span className="font-bold" style={{
                                    color: (exam.avgScore ?? 0) >= 70 ? '#4ade80'
                                         : (exam.avgScore ?? 0) >= 50 ? '#60a5fa' : '#f87171'
                                  }}>
                                    {exam.avgScore}%
                                  </span>
                                ) : <span style={{ color: D.muted2 }}>—</span>}
                              </td>
                            </>
                          ) : (
                            <>
                              {/* Môn */}
                              <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.subject || 'Chưa phân môn'}</td>
                              {/* Loại */}
                              <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.examType}</td>
                              {/* Thời gian */}
                              <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.duration} phút</td>
                              {/* SL câu */}
                              <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.totalQuestions} câu</td>
                            </>
                          )}
                          {/* Trạng thái */}
                          <td className="p-4"><StatusBadge status={exam.status} /></td>
                          {/* Hành động */}
                          <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              {/* View */}
                              <button
                                onClick={() => navigate(`/teacher/exams/${exam.id}`)}
                                title="Xem"
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: D.muted }}
                                onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {/* Edit — chỉ owner mới sửa được */}
                              {(scope === 'mine' || exam.isOwner) && (
                                <button
                                  onClick={() => navigate(`/teacher/exams/${exam.id}/edit`)}
                                  title="Sửa"
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ color: D.muted }}
                                  onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {/* Duplicate — ai cũng nhân bản được (để dùng làm template) */}
                              <button
                                onClick={() => handleDuplicate(exam.id)}
                                title={scope === 'all' && !exam.isOwner ? 'Nhân bản về đề của tôi' : 'Nhân bản'}
                                disabled={duplicatingId === exam.id}
                                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                style={{ color: D.muted }}
                                onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {duplicatingId === exam.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Copy className="w-4 h-4" />
                                }
                              </button>
                              {/* LaTeX */}
                              <button
                                onClick={() => handleExportLatex(exam.id)}
                                title="Gửi sang LaTeX"
                                disabled={!!exportingLatexId}
                                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                style={{ color: '#60a5fa' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.15)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {exportingLatexId === exam.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Sparkles className="w-4 h-4" />
                                }
                              </button>
                              {/* Add to game catalog (Kéo Co) */}
                              <button
                                onClick={() => handleAddToGameCatalog(exam)}
                                title="Thêm vào danh mục trò chơi thi đấu đối kháng (Kéo Co)"
                                disabled={addingToGameId === exam.id}
                                className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                style={{ color: '#f59e0b' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.15)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {addingToGameId === exam.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <Swords className="w-4 h-4" />
                                }
                              </button>
                              {/* Delete — chỉ owner mới xoá */}
                              {(scope === 'mine' || exam.isOwner) && (
                                <button
                                  onClick={() => handleDelete(exam.id)}
                                  title="Xóa"
                                  disabled={deletingId === exam.id}
                                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                  style={{ color: '#f87171' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {deletingId === exam.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Trash2 className="w-4 h-4" />
                                  }
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Right column (4) ───────────────────────────── */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Stats */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: '#a78bfa' }} />
                </div>
                <h3 className="text-lg font-bold" style={{ color: D.text }}>Thống kê</h3>
              </div>
              <div className="space-y-2">
                {stats.map(s => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: s.rowBg }}
                  >
                    <span className="text-sm" style={{ color: D.muted }}>{s.label}</span>
                    <span className="text-lg font-bold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            {selectedExam ? (
              <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(124,58,237,0.15)', border: `1px solid rgba(124,58,237,0.3)` }}>
                    <FileText className="w-5 h-5" style={{ color: '#a78bfa' }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold" style={{ color: D.text }}>Chi tiết</h3>
                    <p className="text-xs truncate max-w-[180px]" style={{ color: D.muted }}>{selectedExam.title}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Môn học',      value: selectedExam.subject || 'Chưa phân môn' },
                    { label: 'Loại đề',      value: selectedExam.examType },
                    { label: 'Thời gian',    value: `${selectedExam.duration} phút` },
                    { label: 'Số câu hỏi',   value: `${selectedExam.totalQuestions} câu` },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: D.card2 }}
                    >
                      <span className="text-sm" style={{ color: D.muted }}>{row.label}</span>
                      <span className="text-sm font-medium" style={{ color: D.text }}>{row.value}</span>
                    </div>
                  ))}
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: D.card2 }}
                  >
                    <span className="text-sm" style={{ color: D.muted }}>Trạng thái</span>
                    <StatusBadge status={selectedExam.status} />
                  </div>
                </div>
                {/* Action buttons */}
                <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: `1px solid ${D.border}` }}>
                  <button
                    onClick={() => navigate(`/teacher/exams/${selectedExam.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: D.purple, color: '#fff' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                    onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
                  >
                    <Eye className="w-4 h-4" />
                    Xem đề thi
                  </button>
                  <button
                    onClick={() => handleExportLatex(selectedExam.id)}
                    disabled={exportingLatexId === selectedExam.id}
                    title="Gửi sang LaTeX"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                    style={{ background: 'transparent', border: `1px solid rgba(37,99,235,0.5)`, color: '#60a5fa' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.15)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {exportingLatexId === selectedExam.id
                      ? <><Loader2 className="w-4 h-4 animate-spin" />LaTeX</>
                      : <><Sparkles className="w-4 h-4" />LaTeX</>
                    }
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/exams/${selectedExam.id}/edit`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.muted }}
                    onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{ background: D.card, border: `1px solid ${D.border}` }}
                className="rounded-xl p-5 text-center"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: D.card2 }}
                >
                  <FileText className="w-8 h-8" style={{ color: D.muted }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: D.text }}>
                  Chọn đề thi để xem chi tiết
                </h3>
                <p className="text-sm" style={{ color: D.muted }}>
                  Click vào một đề thi trong danh sách để xem thông tin chi tiết
                </p>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ background: D.card, border: `1px solid ${D.border}` }} className="rounded-xl p-5">
              <h3 className="text-base font-bold mb-3" style={{ color: D.text }}>Thao tác nhanh</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/teacher/exams/create')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{ background: D.purple, color: '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
                  onMouseLeave={e => (e.currentTarget.style.background = D.purple)}
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-medium">Tạo đề thi mới</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Tạo từ đầu hoặc từ ma trận</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/teacher/exam-matrix')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.text }}
                  onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Grid3x3 className="w-5 h-5 shrink-0" style={{ color: D.muted }} />
                  <div>
                    <div className="font-medium">Ma trận đề thi</div>
                    <div className="text-xs" style={{ color: D.muted }}>Quản lý ma trận</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/teacher/question-bank')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left"
                  style={{ background: 'transparent', border: `1px solid ${D.border2}`, color: D.text }}
                  onMouseEnter={e => (e.currentTarget.style.background = D.card2)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <FileText className="w-5 h-5 shrink-0" style={{ color: D.muted }} />
                  <div>
                    <div className="font-medium">Ngân hàng câu hỏi</div>
                    <div className="text-xs" style={{ color: D.muted }}>Quản lý câu hỏi</div>
                  </div>
                </button>
              </div>
            </div>

          </div>{/* /right col */}
        </div>{/* /grid */}
      </div>{/* /main */}
    </div>
  )
}
