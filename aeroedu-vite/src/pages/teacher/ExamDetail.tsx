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
import { HostSessionModal } from '@/components/exam/HostSessionModal'

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
  const [hostModalOpen, setHostModalOpen] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)

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

            <button onClick={() => setHostModalOpen(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'linear-gradient(90deg, #ec4899, #a855f7)', border: 'none',
              borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', color: 'white',
              boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
            }}>
              <Play size={13} /> Bắt đầu phiên thi
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} style={{ color: 'hsl(var(--primary))' }} />
              Danh sách câu hỏi ({questions.length})
            </h2>
            <button
              onClick={() => setAddingQuestion(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'hsl(var(--primary))', border: 'none',
                borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', color: 'white',
              }}
            >
              + Thêm câu hỏi
            </button>
          </div>
          {questions.length === 0 && !addingQuestion ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ai-muted-text)' }}>
              Chưa có câu hỏi nào. Bấm <strong>+ Thêm câu hỏi</strong> để bắt đầu.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.map((q, idx) => (
                <QuestionRow
                  key={q.id} q={q} idx={idx} examId={exam.id}
                  totalQuestions={questions.length}
                  onSaved={refetch}
                />
              ))}
              {addingQuestion && (
                <NewQuestionEditor
                  examId={exam.id}
                  position={questions.length + 1}
                  onSaved={() => { setAddingQuestion(false); refetch() }}
                  onCancel={() => setAddingQuestion(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Student paced vs Teacher led — Wayground-style host picker */}
      <HostSessionModal
        open={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        examId={exam.id}
        examTitle={exam.title}
      />
    </div>
  )
}

function QuestionRow({
  q, idx, examId, totalQuestions, onSaved,
}: {
  q: Question; idx: number; examId: string;
  totalQuestions: number;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [content, setContent] = useState(q.content)
  const [options, setOptions] = useState<string[]>(q.options || [])
  const [correctAnswer, setCorrectAnswer] = useState(q.correctAnswer || '')
  const [explanation, setExplanation] = useState(q.explanation || '')
  const [points, setPoints] = useState<number>(Number(q.points) > 0 ? Number(q.points) : 1)

  const onDelete = async () => {
    if (!confirm(`Xoá câu ${idx + 1} khỏi đề thi?\n\n(Câu hỏi vẫn còn trong ngân hàng — chỉ gỡ khỏi đề này.)`)) return
    setDeleting(true)
    try {
      await api.delete(`/teacher/exams/${examId}/questions/${q.id}`)
      toast.success('Đã xoá câu hỏi khỏi đề')
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không xoá được')
    } finally { setDeleting(false) }
  }

  const onMove = async (dir: -1 | 1) => {
    setMoving(true)
    try {
      // Lấy danh sách hiện tại từ DOM order — đơn giản: dùng idx + dir
      // Backend sẽ swap qua reorder API nếu chỉ 2 câu thay đổi.
      // Cách đơn giản: refetch xong reorder cả mảng. Nhưng ta KHÔNG có
      // ref tới mảng questions ở đây, parent control. Trick: emit event
      // qua callback. Đơn giản nhất: gọi reorder với mảng id mới = swap idx ↔ idx+dir.
      // Tuy không có mảng nguyên — nhưng vì component này tự fetch refetch sau,
      // ta có thể call một hàm helper qua window event hoặc parent prop.
      // Để gọn: làm 2 PATCH order trực tiếp (swap).
      // — Lấy currentOrder của câu này và câu kế:
      // Backend không expose endpoint cho việc đó → dùng reorder full sau khi refetch.
      // Tạm: dùng patch points kỹ thuật khác — KHÔNG có endpoint cho 1 câu.
      // → Use reorder endpoint với array đảo. Cần biết tất cả ID, vì vậy fetch trước.
      const r = await api.get<{ exam: unknown; questions: { id: string }[] }>(
        `/teacher/exams/${examId}`
      )
      const ids = r.data.questions.map(qq => qq.id)
      const j = idx + dir
      if (j < 0 || j >= ids.length) { setMoving(false); return }
      const swapped = [...ids]
      ;[swapped[idx], swapped[j]] = [swapped[j], swapped[idx]]
      await api.post(`/teacher/exams/${examId}/questions/reorder`, { questionIds: swapped })
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không di chuyển được')
    } finally { setMoving(false) }
  }

  const startEdit = () => {
    setContent(q.content)
    setOptions(q.options || [])
    setCorrectAnswer(q.correctAnswer || '')
    setExplanation(q.explanation || '')
    setPoints(Number(q.points) > 0 ? Number(q.points) : 1)
    setEditing(true)
  }
  const cancel = () => setEditing(false)

  const save = async () => {
    if (!content.trim()) {
      toast.error('Nội dung câu hỏi không được rỗng')
      return
    }
    if (!Number.isFinite(points) || points < 0) {
      toast.error('Điểm phải là số ≥ 0')
      return
    }
    setSaving(true)
    try {
      // 1. Update question content/options/correctAnswer/explanation
      await api.put(`/questions/${q.id}`, {
        content: content.trim(),
        options: options.map(o => o.trim()).filter(Boolean),
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim() || null,
      })
      // 2. Update per-exam points (ExamQuestion.points) + auto-recalc Exam.totalScore
      if (Number(q.points) !== points) {
        await api.patch(`/teacher/exams/${examId}/questions/${q.id}`, { points })
      }
      toast.success('Đã cập nhật câu hỏi')
      setEditing(false)
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không lưu được')
    } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div style={{
        background: 'var(--ai-tabs-bg)', border: '2px solid hsl(var(--primary))',
        borderRadius: 10, padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ background: 'hsl(var(--primary))', color: '#fff', padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
            ✎ Đang sửa câu {idx + 1}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ai-muted-text)' }}>{q.questionType.replace('_', ' ')}</span>
        </div>

        <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>Nội dung câu hỏi</label>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
          style={{
            width: '100%', padding: 8, fontSize: 13, fontFamily: 'inherit',
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 6, color: 'inherit', resize: 'vertical', marginBottom: 10,
          }} />

        {q.options?.length > 0 && (
          <>
            <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>4 đáp án (tô đậm = đúng)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {options.map((opt, oi) => {
                const letter = String.fromCharCode(65 + oi)
                const isCorrect = correctAnswer.toUpperCase().startsWith(letter)
                return (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button type="button" onClick={() => setCorrectAnswer(letter)}
                      style={{
                        width: 28, height: 28, borderRadius: 6, fontWeight: 700, fontSize: 12,
                        background: isCorrect ? '#22c55e' : 'var(--ai-card-bg)',
                        color: isCorrect ? '#fff' : 'var(--ai-muted-text)',
                        border: `1px solid ${isCorrect ? '#22c55e' : 'var(--ai-card-border)'}`,
                        cursor: 'pointer', flexShrink: 0,
                      }}>{letter}</button>
                    <input type="text" value={opt}
                      onChange={e => {
                        const next = [...options]; next[oi] = e.target.value
                        setOptions(next)
                      }}
                      style={{
                        flex: 1, padding: '6px 10px', fontSize: 13,
                        background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
                        borderRadius: 6, color: 'inherit',
                      }} />
                  </div>
                )
              })}
            </div>
          </>
        )}

        {q.questionType === 'SHORT_ANSWER' && (
          <>
            <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>Đáp án đúng</label>
            <input type="text" value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)}
              style={{
                width: '100%', padding: 8, fontSize: 13,
                background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
                borderRadius: 6, color: 'inherit', marginBottom: 10,
              }} />
          </>
        )}

        {/* Points — riêng cho cặp (đề, câu) qua ExamQuestion.points; recalc totalScore auto */}
        <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
          Điểm câu này
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <input
            type="number"
            step="0.25"
            min={0}
            max={100}
            value={Number.isFinite(points) ? points : ''}
            onChange={e => setPoints(parseFloat(e.target.value) || 0)}
            style={{
              width: 110, padding: '8px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
              borderRadius: 6, color: 'inherit', textAlign: 'right',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--ai-muted-text)' }}>
            Tổng điểm đề sẽ tự cập nhật theo tổng điểm các câu.
          </span>
        </div>

        <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>Giải thích (không bắt buộc)</label>
        <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2}
          placeholder="Giải thích cách giải, công thức áp dụng…"
          style={{
            width: '100%', padding: 8, fontSize: 12, fontFamily: 'inherit',
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 6, color: 'inherit', resize: 'vertical', marginBottom: 10,
          }} />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={cancel} disabled={saving}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--ai-card-border)',
              borderRadius: 6, color: 'var(--ai-muted-text)', cursor: 'pointer',
            }}>Huỷ</button>
          <button onClick={save} disabled={saving}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              background: 'hsl(var(--primary))', border: 'none',
              borderRadius: 6, color: '#fff', cursor: 'pointer',
              opacity: saving ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    )
  }

  // ─── View mode ───────────────────────────────────────
  return (
    <div style={{
      background: 'var(--ai-tabs-bg)', border: '1px solid var(--ai-card-border)',
      borderRadius: 10, padding: 14, position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, color: 'var(--ai-muted-text)' }}>
        <span style={{ background: 'var(--ai-card-bg)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
          {String(idx + 1).padStart(2, '0')}
        </span>
        <span style={{ letterSpacing: 0.5 }}>
          {q.questionType.replace('_', ' ')} · {q.points} điểm
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button
            onClick={() => onMove(-1)}
            disabled={idx === 0 || moving}
            title="Di chuyển lên"
            style={{
              padding: '3px 6px', fontSize: 11, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--ai-card-border)',
              borderRadius: 4, color: 'var(--ai-muted-text)',
              cursor: idx === 0 || moving ? 'not-allowed' : 'pointer',
              opacity: idx === 0 ? 0.4 : 1,
            }}
          >↑</button>
          <button
            onClick={() => onMove(1)}
            disabled={idx === totalQuestions - 1 || moving}
            title="Di chuyển xuống"
            style={{
              padding: '3px 6px', fontSize: 11, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--ai-card-border)',
              borderRadius: 4, color: 'var(--ai-muted-text)',
              cursor: idx === totalQuestions - 1 || moving ? 'not-allowed' : 'pointer',
              opacity: idx === totalQuestions - 1 ? 0.4 : 1,
            }}
          >↓</button>
          <button onClick={startEdit}
            style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600,
              background: 'transparent', border: '1px solid var(--ai-card-border)',
              borderRadius: 4, color: 'var(--ai-muted-text)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <Edit3 size={11} /> Sửa
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Xoá câu khỏi đề (không xoá khỏi ngân hàng)"
            style={{
              padding: '3px 10px', fontSize: 11, fontWeight: 600,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 4, color: '#ef4444', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4,
              opacity: deleting ? 0.5 : 1,
            }}>
            <Trash2 size={11} /> {deleting ? '…' : 'Xoá'}
          </button>
        </div>
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
      {q.explanation && (
        <div style={{
          marginTop: 8, padding: '6px 10px', fontSize: 12,
          background: 'rgba(245,158,11,0.08)', borderRadius: 6,
          color: 'rgb(217 119 6)', borderLeft: '2px solid #f59e0b',
        }}>
          💡 {q.explanation}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   NewQuestionEditor — Form thêm câu hỏi mới vào đề
   POST /api/teacher/exams/:examId/questions
   ───────────────────────────────────────────────────── */
function NewQuestionEditor({
  examId, position, onSaved, onCancel,
}: {
  examId: string
  position: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [content, setContent] = useState('')
  const [qType, setQType] = useState<'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER'>('MULTIPLE_CHOICE')
  const [options, setOptions] = useState<string[]>(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('A')
  const [explanation, setExplanation] = useState('')
  const [points, setPoints] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!content.trim()) { toast.error('Nội dung không được rỗng'); return }
    setSaving(true)
    try {
      await api.post(`/teacher/exams/${examId}/questions`, {
        content: content.trim(),
        questionType: qType,
        options: qType === 'MULTIPLE_CHOICE' ? options.map(o => o.trim()).filter(Boolean) : [],
        correctAnswer: correctAnswer.trim(),
        explanation: explanation.trim() || null,
        points,
      })
      toast.success(`Đã thêm câu ${position}`)
      onSaved()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không thêm được')
    } finally { setSaving(false) }
  }

  return (
    <div style={{
      background: 'rgba(34,197,94,0.05)', border: '2px dashed #22c55e',
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ background: '#22c55e', color: '#fff', padding: '3px 10px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
          + Câu mới #{position}
        </span>
        <select
          value={qType}
          onChange={e => setQType(e.target.value as typeof qType)}
          style={{
            padding: '4px 8px', fontSize: 12,
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 4, color: 'inherit',
          }}
        >
          <option value="MULTIPLE_CHOICE">Trắc nghiệm A/B/C/D</option>
          <option value="TRUE_FALSE">Đúng/Sai (4 mệnh đề)</option>
          <option value="SHORT_ANSWER">Trả lời ngắn</option>
        </select>
      </div>

      <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
        Nội dung câu hỏi
      </label>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        placeholder="Vd: Cho mạch điện gồm R, L, C nối tiếp..."
        style={{
          width: '100%', padding: 8, fontSize: 13, fontFamily: 'inherit',
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 6, color: 'inherit', resize: 'vertical', marginBottom: 10,
        }}
      />

      {qType === 'MULTIPLE_CHOICE' && (
        <>
          <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
            4 đáp án (tô đậm = đúng)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
            {options.map((opt, oi) => {
              const letter = String.fromCharCode(65 + oi)
              const isCorrect = correctAnswer.toUpperCase().startsWith(letter)
              return (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCorrectAnswer(letter)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, fontWeight: 700, fontSize: 12,
                      background: isCorrect ? '#22c55e' : 'var(--ai-card-bg)',
                      color: isCorrect ? '#fff' : 'var(--ai-muted-text)',
                      border: `1px solid ${isCorrect ? '#22c55e' : 'var(--ai-card-border)'}`,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >{letter}</button>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => {
                      const next = [...options]; next[oi] = e.target.value
                      setOptions(next)
                    }}
                    placeholder={`Đáp án ${letter}`}
                    style={{
                      flex: 1, padding: '6px 10px', fontSize: 13,
                      background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
                      borderRadius: 6, color: 'inherit',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      {qType === 'SHORT_ANSWER' && (
        <>
          <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
            Đáp án đúng
          </label>
          <input
            type="text"
            value={correctAnswer}
            onChange={e => setCorrectAnswer(e.target.value)}
            placeholder="Vd: 0.4"
            style={{
              width: '100%', padding: 8, fontSize: 13,
              background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
              borderRadius: 6, color: 'inherit', marginBottom: 10,
            }}
          />
        </>
      )}

      {qType === 'TRUE_FALSE' && (
        <>
          <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
            Đáp án (4 ký tự T/F cho a/b/c/d, vd "TFFT")
          </label>
          <input
            type="text"
            value={correctAnswer}
            onChange={e => setCorrectAnswer(e.target.value.toUpperCase().replace(/[^TF\-]/g, '').slice(0, 4))}
            placeholder="TFFT"
            maxLength={4}
            style={{
              width: '100%', padding: 8, fontSize: 13, fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.3em', textAlign: 'center', textTransform: 'uppercase',
              background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
              borderRadius: 6, color: 'inherit', marginBottom: 10,
            }}
          />
        </>
      )}

      <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
        Điểm câu này
      </label>
      <input
        type="number"
        step="0.25"
        min={0}
        max={100}
        value={Number.isFinite(points) ? points : 1}
        onChange={e => setPoints(parseFloat(e.target.value) || 0)}
        style={{
          width: 110, padding: '8px 10px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 6, color: 'inherit', textAlign: 'right', marginBottom: 10,
        }}
      />

      <label style={{ fontSize: 11, color: 'var(--ai-muted-text)', display: 'block', marginBottom: 4 }}>
        Giải thích (không bắt buộc)
      </label>
      <textarea
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        rows={2}
        placeholder="Giải thích cách giải…"
        style={{
          width: '100%', padding: 8, fontSize: 12, fontFamily: 'inherit',
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 6, color: 'inherit', resize: 'vertical', marginBottom: 10,
        }}
      />

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600,
            background: 'transparent', border: '1px solid var(--ai-card-border)',
            borderRadius: 6, color: 'var(--ai-muted-text)', cursor: 'pointer',
          }}
        >Huỷ</button>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: '#22c55e', border: 'none',
            borderRadius: 6, color: '#fff', cursor: 'pointer',
            opacity: saving ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
          {saving ? 'Đang lưu…' : 'Thêm vào đề'}
        </button>
      </div>
    </div>
  )
}
