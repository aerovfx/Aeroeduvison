/**
 * ExamDetail — xem + chỉnh sửa chi tiết 1 đề thi
 * Route: /teacher/exams/:id  và  /teacher/exams/:id/edit
 *
 * Tính năng:
 *   - Hiển thị metadata: tiêu đề, môn, lớp, số câu, thời gian, status
 *   - Toggle status: Nháp / Đang diễn ra / Đã kết thúc
 *   - Toggle isPublic (cho học sinh xem)
 *   - Chỉnh sửa tiêu đề + thời gian
 *   - Liệt kê tất cả câu hỏi với đáp án (read-only)
 *
 * Backend:
 *   GET  /api/teacher/exams/:id        → exam + questions
 *   PUT  /api/teacher/exams/:id        → update title/duration/status
 *   POST /api/teacher/exams/:id/publish → đổi status + isPublic
 *   DELETE /api/teacher/exams/:id      → xoá
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Edit3, Save, Trash2, Eye, EyeOff, Play,
  CheckCircle2, Clock, FileText, ChevronDown,
} from 'lucide-react'
import { MathText } from '@/components/common/MathText'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface Question {
  id: string
  questionType: string
  content: string
  options: string[]
  correctAnswer: string
  explanation?: string
  order: number
  points: number
}

interface Exam {
  id: string
  title: string
  subject?: string
  grade?: string
  notes?: string
  examType: string
  duration: number
  totalScore: number
  totalQuestions: number
  status: string
  isPublic?: boolean
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

const STATUSES = ['Nháp', 'Đang diễn ra', 'Đã kết thúc']

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingMeta, setEditingMeta] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDuration, setDraftDuration] = useState(45)

  // ── Load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    api.get(`/teacher/exams/${id}`)
      .then(r => {
        setExam(r.data.exam)
        setQuestions(r.data.questions || [])
        setDraftTitle(r.data.exam?.title || '')
        setDraftDuration(r.data.exam?.duration || 45)
      })
      .catch(err => {
        const msg = err?.response?.data?.error || 'Không tải được đề thi'
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }, [id])

  const refetch = async () => {
    const r = await api.get(`/teacher/exams/${id}`)
    setExam(r.data.exam)
    setQuestions(r.data.questions || [])
  }

  // ── Actions ────────────────────────────────────────────────
  const updateMeta = async () => {
    if (!exam) return
    setSaving(true)
    try {
      await api.put(`/teacher/exams/${exam.id}`, {
        title: draftTitle.trim(),
        duration: draftDuration,
      })
      await refetch()
      setEditingMeta(false)
      toast.success('Đã cập nhật')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const changeStatus = async (newStatus: string) => {
    if (!exam) return
    setSaving(true)
    try {
      if (newStatus === 'Đang diễn ra') {
        await api.post(`/teacher/exams/${exam.id}/publish`, { status: newStatus, isPublic: true })
      } else {
        await api.put(`/teacher/exams/${exam.id}`, { status: newStatus })
      }
      await refetch()
      toast.success(`Trạng thái: ${newStatus}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const togglePublic = async () => {
    if (!exam) return
    setSaving(true)
    try {
      await api.post(`/teacher/exams/${exam.id}/publish`, {
        status: exam.status, isPublic: !exam.isPublic,
      })
      await refetch()
      toast.success(exam.isPublic ? 'Đã ẩn khỏi học sinh' : 'Đã mở cho học sinh')
    } catch { toast.error('Lỗi') }
    finally { setSaving(false) }
  }

  const deleteExam = async () => {
    if (!exam) return
    if (!confirm(`Xoá đề thi "${exam.title}"?`)) return
    try {
      await api.delete(`/teacher/exams/${exam.id}`)
      toast.success('Đã xoá')
      navigate('/teacher/exams')
    } catch { toast.error('Lỗi xoá') }
  }

  // ── Render ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
    </div>
  )

  if (!exam) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--ai-muted-text)' }}>
      Không tải được đề thi. <a href="/teacher/exams" style={{ color: 'hsl(var(--primary))' }}>← Quay lại</a>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--ai-card-bg)', borderBottom: '1px solid var(--ai-card-border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/teacher/exams')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: '1px solid var(--ai-card-border)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          color: 'var(--ai-muted-text)', fontSize: 13, fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Đề thi
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exam.title}
        </div>
        <button onClick={deleteExam} style={{
          background: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Trash2 size={13} /> Xoá
        </button>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>
        {/* Meta card */}
        <div style={{
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 14, padding: 24, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
            {editingMeta ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                  style={{
                    fontSize: 18, fontWeight: 700, padding: '10px 12px',
                    border: '1px solid var(--ai-card-border)', borderRadius: 8,
                    background: 'var(--ai-tabs-bg)', color: 'hsl(var(--foreground))',
                  }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <Clock size={16} style={{ color: 'var(--ai-muted-text)' }} />
                  <span>Thời gian:</span>
                  <input type="number" min={5} max={300} value={draftDuration}
                    onChange={e => setDraftDuration(Number(e.target.value))}
                    style={{ width: 80, padding: '6px 10px', border: '1px solid var(--ai-card-border)', borderRadius: 6, background: 'var(--ai-tabs-bg)', color: 'hsl(var(--foreground))' }} />
                  <span>phút</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={updateMeta} disabled={saving} style={{
                    background: 'hsl(var(--primary))', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '8px 14px',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
                  </button>
                  <button onClick={() => { setEditingMeta(false); setDraftTitle(exam.title); setDraftDuration(exam.duration) }}
                    style={{
                      background: 'transparent', border: '1px solid var(--ai-card-border)',
                      borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', color: 'var(--ai-muted-text)',
                    }}>
                    Huỷ
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{exam.title}</h1>
                <div style={{ marginTop: 6, color: 'var(--ai-muted-text)', fontSize: 13 }}>
                  {exam.subject && `${exam.subject} · `}{exam.grade && `Lớp ${exam.grade} · `}{exam.examType} · {exam.duration} phút · {exam.totalQuestions} câu · {exam.totalScore} điểm
                </div>
              </div>
            )}
            {!editingMeta && (
              <button onClick={() => setEditingMeta(true)} style={{
                background: 'transparent', border: '1px solid var(--ai-card-border)',
                borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', color: 'var(--ai-muted-text)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Edit3 size={13} /> Sửa
              </button>
            )}
          </div>

          {/* Status + public controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--ai-muted-text)' }}>Trạng thái:</span>
            <div style={{ position: 'relative' }}>
              <select value={exam.status} onChange={e => changeStatus(e.target.value)} disabled={saving}
                style={{
                  appearance: 'none', padding: '6px 28px 6px 12px',
                  background: exam.status === 'Đang diễn ra' ? 'rgba(34,197,94,0.15)' :
                              exam.status === 'Đã kết thúc'  ? 'rgba(100,116,139,0.15)' :
                              'rgba(245,158,11,0.15)',
                  border: `1px solid ${exam.status === 'Đang diễn ra' ? 'rgba(34,197,94,0.4)' :
                                       exam.status === 'Đã kết thúc'  ? 'rgba(100,116,139,0.4)' :
                                       'rgba(245,158,11,0.4)'}`,
                  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  color: 'hsl(var(--foreground))',
                }}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--ai-muted-text)' }} />
            </div>

            <button onClick={togglePublic} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: exam.isPublic ? 'rgba(34,197,94,0.15)' : 'transparent',
              border: `1px solid ${exam.isPublic ? 'rgba(34,197,94,0.4)' : 'var(--ai-card-border)'}`,
              borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: exam.isPublic ? '#22c55e' : 'var(--ai-muted-text)',
            }}>
              {exam.isPublic ? <Eye size={13} /> : <EyeOff size={13} />}
              {exam.isPublic ? 'Công khai cho HS' : 'Ẩn khỏi HS'}
            </button>

            <button onClick={() => navigate(`/teacher/exams/${exam.id}/play`)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(90deg, #ec4899, #a855f7)', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', color: 'white',
              boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
            }}>
              <Play size={13} /> Mở phòng thi LIVE
            </button>

            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ai-muted-text)' }}>
              ID: <code style={{ background: 'var(--ai-tabs-bg)', padding: '2px 6px', borderRadius: 4 }}>{exam.id.slice(0, 8)}…</code>
            </span>
          </div>
        </div>

        {/* Questions */}
        <div style={{
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 14, padding: 20,
        }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} style={{ color: 'hsl(var(--primary))' }} />
            Danh sách câu hỏi ({questions.length})
          </h2>
          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ai-muted-text)' }}>
              Chưa có câu hỏi nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map((q, idx) => (
                <QuestionRow key={q.id} q={q} idx={idx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuestionRow({ q, idx }: { q: Question; idx: number }) {
  return (
    <div style={{
      background: 'var(--ai-tabs-bg)', border: '1px solid var(--ai-card-border)',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, color: 'var(--ai-muted-text)' }}>
        <span style={{ background: 'var(--ai-card-bg)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span style={{ letterSpacing: 0.5 }}>
          {q.questionType.replace('_', ' ')} · {q.points} điểm
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: q.options?.length ? 10 : 4, lineHeight: 1.55 }}>
        <MathText as="span">{q.content}</MathText>
      </div>
      {q.options?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {q.options.map((opt, oi) => {
            const letter = String.fromCharCode(65 + oi)
            const correct = (q.correctAnswer || '').toUpperCase().startsWith(letter)
            return (
              <div key={oi} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 6, fontSize: 13,
                background: correct ? 'rgba(34,197,94,0.15)' : 'transparent',
                border: `1px solid ${correct ? 'rgba(34,197,94,0.35)' : 'var(--ai-card-border)'}`,
              }}>
                {correct && <CheckCircle2 size={13} style={{ color: '#22c55e', flexShrink: 0 }} />}
                <MathText as="span">{opt}</MathText>
              </div>
            )
          })}
        </div>
      )}
      {q.questionType === 'SHORT_ANSWER' && (
        <div style={{
          marginTop: 6, padding: '6px 10px', fontSize: 13,
          background: 'rgba(34,197,94,0.10)', borderRadius: 6,
          color: '#22c55e', fontWeight: 600,
        }}>
          Đáp án: {q.correctAnswer}
        </div>
      )}
    </div>
  )
}
