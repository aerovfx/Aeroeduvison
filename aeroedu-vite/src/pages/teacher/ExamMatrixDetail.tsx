/**
 * ExamMatrixDetail — Trang xem chi tiết 1 ma trận đề
 *
 * Routes:
 *   /teacher/exam-matrix/:id        → ExamMatrixDetail (xem)
 *   /teacher/exam-matrix/:id/edit   → ExamMatrixDetail (mode edit)
 *   /teacher/exam-matrix/:id/review → ExamMatrixDetail (review sau digitize)
 *
 * Trước đây tất cả 3 route dùng <PageFallback /> placeholder → blank.
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit3, Trash2, Sparkles, FileText, Loader2, Calendar, Clock, BookOpen, Hash, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface MatrixDetail {
  id: string
  name: string
  subject?: string
  grade?: string
  examType?: string
  duration?: number
  totalScore?: number
  totalQuestions?: number
  status?: string
  type?: string
  createdAt?: string
  updatedAt?: string
  description?: string
  topics?: Array<{ name: string; count: number }>
  difficulties?: { easy?: number; medium?: number; hard?: number }
  /** Raw JSON nếu có */
  data?: unknown
}

export default function ExamMatrixDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [matrix, setMatrix] = useState<MatrixDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await api.get<MatrixDetail>(`/exam-matrices/${id}`)
        if (cancelled) return
        setMatrix(r.data)
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: { error?: string } } }
        if (e.response?.status === 404) toast.error('Không tìm thấy ma trận')
        else if (e.response?.status === 401) toast.error('Cần đăng nhập lại')
        else toast.error(e.response?.data?.error || 'Không tải được ma trận')
        setTimeout(() => navigate('/teacher/exam-matrix'), 1500)
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [id, navigate])

  const handleGenerateExam = async () => {
    if (!matrix?.id) return
    setGenerating(true)
    try {
      const res = await api.post<{ success: boolean; data: { examId: string } }>(
        '/exams/generate-from-matrix',
        { matrixId: matrix.id, useAIForMissing: true }
      )
      if (res.data?.data?.examId) {
        toast.success('Đã sinh đề thi từ ma trận!')
        navigate(`/teacher/exams/${res.data.data.examId}/edit`)
      } else {
        toast.error('Không sinh được đề thi')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string | { message?: string } } } }
      const msg = typeof e.response?.data?.error === 'string'
        ? e.response.data.error
        : e.response?.data?.error?.message
      toast.error(msg || 'Lỗi sinh đề thi')
    } finally { setGenerating(false) }
  }

  const handleDelete = async () => {
    if (!matrix?.id || !confirm('Xoá ma trận đề này?')) return
    try {
      await api.delete(`/exam-matrices/${matrix.id}`)
      toast.success('Đã xoá')
      navigate('/teacher/exam-matrix')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi xoá')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!matrix) return null

  const D = {
    bg: 'hsl(var(--background))',
    card: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.08)',
    text: 'hsl(var(--foreground))',
    muted: 'hsl(var(--muted-foreground))',
    accent: '#9333ea',
  }

  return (
    <div className="min-h-screen" style={{ background: D.bg, color: D.text }}>
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/teacher/exam-matrix')}
            className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
            style={{ color: D.muted }}
          >
            <ArrowLeft className="w-4 h-4" /> Danh sách ma trận
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/teacher/exam-matrix/${matrix.id}/edit`)}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ background: D.card, border: `1px solid ${D.border}`, color: D.text }}
            >
              <Edit3 className="w-4 h-4" /> Chỉnh sửa
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
            >
              <Trash2 className="w-4 h-4" /> Xoá
            </button>
          </div>
        </div>

        {/* Title card */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-1">{matrix.name || 'Ma trận chưa đặt tên'}</h1>
              {matrix.description && (
                <p className="text-sm mb-3" style={{ color: D.muted }}>{matrix.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {matrix.status && (
                  <span className="px-2.5 py-1 rounded-md font-medium"
                    style={{
                      background: matrix.status === 'Hoạt động' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: matrix.status === 'Hoạt động' ? '#22c55e' : '#f59e0b',
                    }}>
                    {matrix.status}
                  </span>
                )}
                {matrix.type && (
                  <span className="px-2.5 py-1 rounded-md font-medium" style={{ background: D.card, border: `1px solid ${D.border}`, color: D.muted }}>
                    {matrix.type}
                  </span>
                )}
                <code className="text-[11px] font-mono" style={{ color: D.muted }}>
                  ID: {matrix.id.slice(0, 12)}…
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile icon={<BookOpen className="w-4 h-4" />} label="Môn" value={matrix.subject || '—'} />
          <StatTile icon={<GraduationCap className="w-4 h-4" />} label="Khối" value={matrix.grade || '—'} />
          <StatTile icon={<Hash className="w-4 h-4" />} label="Số câu" value={String(matrix.totalQuestions ?? 0)} />
          <StatTile icon={<Clock className="w-4 h-4" />} label="Thời gian" value={matrix.duration ? `${matrix.duration}p` : '—'} />
        </div>

        {/* Loại đề + điểm */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <StatTile icon={<FileText className="w-4 h-4" />} label="Loại đề" value={matrix.examType || '—'} />
          <StatTile icon={<Sparkles className="w-4 h-4" />} label="Tổng điểm" value={String(matrix.totalScore ?? 10)} />
        </div>

        {/* Topics distribution (nếu có) */}
        {Array.isArray(matrix.topics) && matrix.topics.length > 0 && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" /> Phân bổ theo chủ đề
            </h3>
            <div className="space-y-2">
              {matrix.topics.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="font-mono text-xs" style={{ color: D.muted }}>{t.count} câu</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty (nếu có) */}
        {matrix.difficulties && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: D.card, border: `1px solid ${D.border}` }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Phân bổ độ khó
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <DiffTile label="Dễ" count={matrix.difficulties.easy ?? 0} color="#22c55e" />
              <DiffTile label="Trung bình" count={matrix.difficulties.medium ?? 0} color="#f59e0b" />
              <DiffTile label="Khó" count={matrix.difficulties.hard ?? 0} color="#ef4444" />
            </div>
          </div>
        )}

        {/* Metadata footer */}
        <div className="rounded-2xl p-5 mb-6 text-xs" style={{ background: D.card, border: `1px solid ${D.border}`, color: D.muted }}>
          <div className="flex items-center gap-1 mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Tạo: {matrix.createdAt ? new Date(matrix.createdAt).toLocaleString('vi-VN') : '—'}
          </div>
          {matrix.updatedAt && matrix.updatedAt !== matrix.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Cập nhật: {new Date(matrix.updatedAt).toLocaleString('vi-VN')}
            </div>
          )}
        </div>

        {/* Action: Generate exam */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateExam}
            disabled={generating}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base shadow-2xl flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang sinh đề…</>
              : <><Sparkles className="w-5 h-5" /> Sinh đề thi từ ma trận này</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-1.5 mb-1 text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {icon} {label}
      </div>
      <p className="font-bold text-base">{value}</p>
    </div>
  )
}

function DiffTile({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{
      background: `${color}15`, border: `1px solid ${color}40`,
    }}>
      <p className="font-black text-2xl" style={{ color }}>{count}</p>
      <p className="text-xs mt-0.5" style={{ color }}>{label}</p>
    </div>
  )
}
