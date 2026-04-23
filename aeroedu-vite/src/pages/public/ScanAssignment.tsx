/**
 * ScanAssignment — trang công khai /a/:token
 * Bất kỳ ai scan QR đều truy cập được; chỉ yêu cầu nhập tên.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, Clock, FileText, Loader2, AlertTriangle, Award } from 'lucide-react'
import { assignmentsService, type PublicAssignmentView } from '@/services/assignments.service'

const D = {
  bg:     '#0d0e17',
  card:   '#10111e',
  card2:  '#161728',
  border: 'rgba(255,255,255,0.07)',
  text:   '#f1f5f9',
  muted:  '#94a3b8',
  purple: '#7c3aed',
  purpleL:'#a78bfa',
  green:  '#10b981',
  amber:  '#f59e0b',
  red:    '#ef4444',
}

export default function ScanAssignmentPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<'loading' | 'ready' | 'submitting' | 'done' | 'not_found' | 'error'>('loading')
  const [assignment, setAssignment] = useState<PublicAssignmentView | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [answer, setAnswer] = useState('')
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null)
  const [startedAt] = useState<number>(Date.now())

  useEffect(() => {
    if (!token) return
    assignmentsService
      .publicGet(token)
      .then((data) => {
        setAssignment(data)
        setState('ready')
      })
      .catch((err) => {
        if (err?.response?.status === 404) setState('not_found')
        else {
          setState('error')
          setErrorMsg(err?.response?.data?.message || err?.message || 'Lỗi tải bài tập')
        }
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !assignment) return
    if (!name.trim()) return alert('Vui lòng nhập tên của bạn')
    setState('submitting')
    try {
      await assignmentsService.publicSubmit(token, {
        scannerName: name.trim(),
        scannerEmail: email.trim() || undefined,
        answerText: answer.trim() || undefined,
        timeSpent: Math.round((Date.now() - startedAt) / 1000),
      })
      setSubmittedAt(new Date())
      setState('done')
    } catch (err: any) {
      setState('ready')
      alert('Nộp bài thất bại: ' + (err?.response?.data?.message || err?.message || 'Lỗi không xác định'))
    }
  }

  // ─── NOT FOUND ─────
  if (state === 'not_found') {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <AlertTriangle style={{ width: 48, height: 48, color: D.amber, margin: '0 auto 16px' }} />
            <h2 style={{ margin: 0, fontSize: 20, color: D.text }}>Bài tập không tồn tại</h2>
            <p style={{ color: D.muted, marginTop: 8, fontSize: 14 }}>
              Mã QR này không còn hợp lệ hoặc đã bị xoá.
            </p>
          </div>
        </Card>
      </Shell>
    )
  }

  // ─── LOADING / ERROR ─────
  if (state === 'loading') {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: 'center', padding: 48, color: D.muted }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <div>Đang tải bài tập…</div>
          </div>
        </Card>
      </Shell>
    )
  }

  if (state === 'error') {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <AlertTriangle style={{ width: 48, height: 48, color: D.red, margin: '0 auto 16px' }} />
            <h2 style={{ margin: 0, fontSize: 18, color: D.text }}>Không tải được</h2>
            <p style={{ color: D.muted, marginTop: 8, fontSize: 13 }}>{errorMsg}</p>
          </div>
        </Card>
      </Shell>
    )
  }

  // ─── DONE — thank you ─────
  if (state === 'done' && assignment) {
    return (
      <Shell>
        <Card>
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `${D.green}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle style={{ width: 44, height: 44, color: D.green }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: D.text }}>Đã nộp bài!</h2>
            <p style={{ color: D.muted, marginTop: 10, fontSize: 14 }}>
              Cảm ơn <strong style={{ color: D.text }}>{name}</strong>. Kết quả đã được gửi tới giáo viên.
            </p>
            {submittedAt && (
              <p style={{ color: D.muted, marginTop: 4, fontSize: 12 }}>
                {submittedAt.toLocaleString('vi-VN')}
              </p>
            )}
            <div style={{ marginTop: 24, padding: 14, background: D.card2, borderRadius: 10, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: D.muted, marginBottom: 4 }}>Bài tập đã nộp</div>
              <div style={{ color: D.text, fontWeight: 600 }}>{assignment.title}</div>
              <div style={{ color: D.muted, fontSize: 12, marginTop: 2 }}>GV: {assignment.teacherName}</div>
            </div>
          </div>
        </Card>
      </Shell>
    )
  }

  // ─── READY / SUBMITTING (form) ─────
  if (!assignment) return null
  const submitting = state === 'submitting'

  return (
    <Shell>
      <Card>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: `1px solid ${D.border}`,
          background: `linear-gradient(135deg, ${D.purple}11, transparent)`,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: `${D.purple}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.purpleL,
            }}>
              <FileText style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: D.muted }}>Bài tập từ</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.text }}>{assignment.teacherName}</div>
            </div>
          </div>

          <h1 style={{ margin: '8px 0 6px', fontSize: 20, fontWeight: 800, color: D.text }}>
            {assignment.title}
          </h1>
          {assignment.description && (
            <p style={{ margin: 0, color: D.muted, fontSize: 13 }}>{assignment.description}</p>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 12, color: D.muted, flexWrap: 'wrap' }}>
            <span>📚 {assignment.subject}</span>
            <span><Clock style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />{assignment.duration} phút</span>
            <span><Award style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />Điểm TĐ: {assignment.maxScore}</span>
          </div>
        </div>

        {/* Content (đề bài) */}
        {assignment.content && (
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${D.border}` }}>
            <div style={{ fontSize: 11, color: D.muted, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Đề bài</div>
            <div style={{
              color: D.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: D.card2, padding: 14, borderRadius: 8,
            }}>
              {assignment.content}
            </div>
          </div>
        )}

        {/* Form nộp */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Tên của bạn *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                required
                autoFocus
                style={inputStyle}
              />
            </Field>

            <Field label="Email (tuỳ chọn)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@example.com"
                style={inputStyle}
              />
            </Field>

            <Field label="Bài làm của bạn">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Viết câu trả lời của bạn ở đây…"
                rows={8}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            style={{
              width: '100%', marginTop: 18, padding: '12px 20px', borderRadius: 10, border: 'none',
              background: submitting || !name.trim()
                ? `${D.purple}55`
                : `linear-gradient(135deg, ${D.purple}, ${D.purpleL})`,
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Đang nộp…
              </>
            ) : (
              <>
                <CheckCircle style={{ width: 16, height: 16 }} /> Nộp bài
              </>
            )}
          </button>
          <div style={{ textAlign: 'center', fontSize: 11, color: D.muted, marginTop: 12 }}>
            Thông tin sẽ được gửi tới giáo viên {assignment.teacherName}.
          </div>
        </form>
      </Card>
    </Shell>
  )
}

/* ─── UI helpers ─── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', background: D.bg, color: D.text,
      padding: '24px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 560, marginTop: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 20,
            background: `${D.purple}22`, color: D.purpleL, fontSize: 11, fontWeight: 700,
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            Aeroedu · Bài tập
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: D.card, border: `1px solid ${D.border}`, borderRadius: 16,
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: D.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 8, border: `1px solid ${D.border}`,
  background: D.card2, color: D.text, fontSize: 14, outline: 'none',
  boxSizing: 'border-box',
}
