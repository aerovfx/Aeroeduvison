
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus, FileText, Eye, Edit, Trash2, Copy,
  Grid3x3, Search, BarChart3, Sparkles, Loader2,
} from "lucide-react"
import toast from "react-hot-toast"
import { api } from "@/services/api"

// ── Dark palette ──────────────────────────────────────────────
const D = {
  bg:      '#0d0e17',
  card:    '#10111e',
  card2:   '#161728',
  border:  '#1e2033',
  border2: '#2a2b3d',
  text:    '#f1f5f9',
  muted:   '#94a3b8',
  purple:  '#7c3aed',
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
}

// ── Status badge ──────────────────────────────────────────────
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

  useEffect(() => { loadExams() }, [subjectFilter])

  // ── API calls ──────────────────────────────────────────────
  const loadExams = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/teacher/exams')
      const list = Array.isArray(data?.exams) ? data.exams : Array.isArray(data?.data) ? data.data : []
      setExams(
        list.map((e: any) => ({
          id: String(e.id),
          title: String(e.title || 'Untitled'),
          subject: e.subject ? String(e.subject) : undefined,
          examType: String(e.examType || 'N/A'),
          duration: Number(e.duration || 0),
          totalQuestions: Number(e.totalQuestions || 0),
          status: String(e.status || 'Nháp'),
          createdAt: String(e.createdAt || new Date().toISOString()),
        }))
      )
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 503 || status === 502) {
        // Service not yet deployed — show empty list silently, no error toast spam
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
                      {['Đề thi', 'Môn', 'Loại', 'Thời gian', 'SL câu', 'Trạng thái', 'Hành động'].map((h, i) => (
                        <th
                          key={h}
                          className={`p-4 text-xs font-medium uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}
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
                                <div className="font-medium text-sm" style={{ color: D.text }}>{exam.title}</div>
                                <div className="text-xs mt-0.5" style={{ color: D.muted }}>ID: {exam.id}</div>
                              </div>
                            </div>
                          </td>
                          {/* Môn */}
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.subject || 'Chưa phân môn'}</td>
                          {/* Loại */}
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.examType}</td>
                          {/* Thời gian */}
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.duration} phút</td>
                          {/* SL câu */}
                          <td className="p-4 text-sm" style={{ color: D.muted }}>{exam.totalQuestions} câu</td>
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
                              {/* Edit */}
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
                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicate(exam.id)}
                                title="Nhân bản"
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
                              {/* Delete */}
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
