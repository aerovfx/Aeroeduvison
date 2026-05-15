/**
 * Teacher Assignments — giáo viên ra bài, tạo QR, xem thống kê
 * - Mỗi bài tập có 1 qrToken → URL công khai /a/:token
 * - Bất kỳ ai scan QR → nhập tên → nộp → thống kê hiển thị ở đây
 */
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Plus, Calendar, Users, CheckCircle, Clock, Sparkles, Eye,
  Search, X, QrCode, Copy, ExternalLink, Trash2, BarChart3, Loader2,
  Send, BookOpen, GraduationCap,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import {
  assignmentsService,
  type Assignment,
  type AssignmentStatus,
  type CreateAssignmentInput,
  type AssignmentSubmission,
  type AssignmentStats,
} from '@/services/assignments.service'

/* ─── Dark palette ─────────────────────────────────────────────────── */
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
  blue:   '#3b82f6',
}

const SUBJECTS = ['Toán', 'Vật lý', 'Hoá học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lý', 'Tin học', 'Chung']

/* ─── StatusBadge ───────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: AssignmentStatus }) {
  const m: Record<string, { label: string; color: string; icon: JSX.Element }> = {
    published:    { label: 'Đã đăng',   color: D.green,  icon: <CheckCircle style={{ width: 11, height: 11 }} /> },
    pending:      { label: 'Đã đăng',   color: D.green,  icon: <CheckCircle style={{ width: 11, height: 11 }} /> },
    'in-progress':{ label: 'Đang làm',  color: D.blue,   icon: <Clock style={{ width: 11, height: 11 }} /> },
    draft:        { label: 'Nháp',      color: D.amber,  icon: <Clock style={{ width: 11, height: 11 }} /> },
    closed:       { label: 'Đã đóng',   color: D.red,    icon: <X style={{ width: 11, height: 11 }} /> },
    completed:    { label: 'Hoàn tất',  color: D.purple, icon: <CheckCircle style={{ width: 11, height: 11 }} /> },
    recommended:  { label: 'Đề xuất',   color: D.purpleL,icon: <Sparkles style={{ width: 11, height: 11 }} /> },
  }
  const it = m[status] || m.published
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: `${it.color}26`, color: it.color, border: `1px solid ${it.color}55`,
    }}>
      {it.icon} {it.label}
    </span>
  )
}

function QRImage({ url, size = 220 }: { url: string; size?: number }) {
  // Dùng service công khai api.qrserver.com (zero-dep)
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(url)}`
  return <img src={src} width={size} height={size} alt="QR code" style={{ background: '#fff', borderRadius: 12, padding: 8 }} />
}

/* ───────────── MAIN ──────────── */
export default function AssignmentsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showFromExam, setShowFromExam] = useState(false)
  const [assignToId, setAssignToId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: assignments, isLoading, error } = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => assignmentsService.getAll('teacher'),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const list = assignments || []
    if (!search.trim()) return list
    const s = search.toLowerCase()
    return list.filter((a) =>
      a.title.toLowerCase().includes(s) ||
      a.subject.toLowerCase().includes(s) ||
      (a.description || '').toLowerCase().includes(s),
    )
  }, [assignments, search])

  const stats = useMemo(() => {
    const list = assignments || []
    const total = list.length
    const published = list.filter((a) => a.status === 'published' || a.status === 'pending').length
    const draft = list.filter((a) => a.status === 'draft').length
    const totalSubs = list.reduce((sum, a) => sum + (a.submissionCount || 0), 0)
    return { total, published, draft, totalSubs }
  }, [assignments])

  const selected = selectedId ? (assignments || []).find((a) => a.id === selectedId) : null

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Bài tập của lớp</h1>
          <p style={{ color: D.muted, margin: '4px 0 0', fontSize: 14 }}>
            Tạo bài tập, in QR, học sinh scan để nộp
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowFromExam(true)}
            title="Lấy đề thi có sẵn → giao thành bài tập"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              border: `1px solid ${D.blue}55`,
              background: `${D.blue}22`,
              color: D.blue, fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            <BookOpen style={{ width: 16, height: 16 }} /> Tạo từ đề thi
          </button>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${D.purple}, ${D.purpleL})`,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Tạo bài tập
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard icon={<FileText />} label="Tổng bài tập" value={stats.total} color={D.purpleL} />
        <StatCard icon={<CheckCircle />} label="Đã đăng" value={stats.published} color={D.green} />
        <StatCard icon={<Clock />} label="Nháp" value={stats.draft} color={D.amber} />
        <StatCard icon={<Users />} label="Tổng lượt nộp" value={stats.totalSubs} color={D.blue} />
      </div>

      {/* Search bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
        background: D.card, border: `1px solid ${D.border}`, borderRadius: 10,
        marginBottom: 16, height: 42,
      }}>
        <Search style={{ width: 16, height: 16, color: D.muted }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bài tập theo tên, môn học…"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: D.text, fontSize: 14 }}
        />
      </div>

      {/* List */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: D.muted }}>
          <Loader2 className="animate-spin" style={{ width: 20, height: 20, marginRight: 8 }} /> Đang tải…
        </div>
      )}
      {error && (
        <div style={{ padding: 16, background: `${D.red}15`, border: `1px solid ${D.red}44`, borderRadius: 10, color: D.red }}>
          Không tải được danh sách bài tập.
        </div>
      )}
      {!isLoading && !error && filtered.length === 0 && (
        <div style={{
          padding: 48, textAlign: 'center', background: D.card, borderRadius: 12,
          border: `1px dashed ${D.border}`, color: D.muted,
        }}>
          <FileText style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 15 }}>Chưa có bài tập nào.</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>Bấm "Tạo bài tập" để bắt đầu.</p>
        </div>
      )}
      {!isLoading && !error && filtered.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              onView={() => setSelectedId(a.id)}
              onAssign={() => setAssignToId(a.id)}
              onDelete={async () => {
                if (!confirm(`Xoá bài tập "${a.title}"?`)) return
                await assignmentsService.remove(a.id)
                qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
              }}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
          }}
        />
      )}

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          assignment={selected}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* From-exam modal */}
      {showFromExam && (
        <FromExamModal
          onClose={() => setShowFromExam(false)}
          onCreated={(created) => {
            setShowFromExam(false)
            qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
            // Open assign-to immediately so teacher can deliver right away
            setAssignToId(created.id)
          }}
        />
      )}

      {/* Assign-to-targets modal */}
      {assignToId && (
        <AssignToModal
          assignmentId={assignToId}
          onClose={() => setAssignToId(null)}
        />
      )}
    </div>
  )
}

/* ─── StatCard ───────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }: { icon: JSX.Element; label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ color: D.muted, fontSize: 12, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  )
}

/* ─── AssignmentCard ─────────────────────────────────────────────────── */
function AssignmentCard({ a, onView, onAssign, onDelete }: {
  a: Assignment
  onView: () => void
  onAssign: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      padding: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: `${D.purple}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: D.purpleL, flexShrink: 0,
      }}>
        <FileText style={{ width: 20, height: 20 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.title}
          </h3>
          <StatusBadge status={a.status} />
          {a.qrToken && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
              background: `${D.blue}22`, color: D.blue, border: `1px solid ${D.blue}44`,
            }}>
              <QrCode style={{ width: 10, height: 10 }} /> QR
            </span>
          )}
        </div>
        <p style={{ margin: '0 0 8px', color: D.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.description || '—'}
        </p>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: D.muted, flexWrap: 'wrap' }}>
          <span>📚 {a.subject}</span>
          <span>⏱ {a.duration} phút</span>
          {a.dueDate && (
            <span><Calendar style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
              Hạn: {new Date(a.dueDate).toLocaleDateString('vi-VN')}
            </span>
          )}
          <span style={{ color: D.green }}>
            <Users style={{ width: 11, height: 11, display: 'inline', marginRight: 4 }} />
            {a.submissionCount || 0} lượt nộp
          </span>
          {(a.avgScore || 0) > 0 && (
            <span style={{ color: D.amber }}>
              ⭐ TB {(a.avgScore || 0).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onAssign}
          title="Giao bài cho học sinh / lớp cụ thể"
          style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${D.green}55`,
            background: `${D.green}22`, color: D.green, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Send style={{ width: 14, height: 14 }} /> Giao cho
        </button>
        <button
          onClick={onView}
          style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${D.border}`,
            background: D.card2, color: D.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Eye style={{ width: 14, height: 14 }} /> Xem
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: '8px 12px', borderRadius: 8, border: `1px solid ${D.red}33`,
            background: 'transparent', color: D.red, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  )
}

/* ─── FromExamModal ──────────────────────────────────────────────────── */
function FromExamModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: Assignment) => void }) {
  const [exams, setExams] = useState<Array<{ id: string; title: string; subject?: string; totalQuestions?: number; duration?: number }>>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<{ exams: Array<{ id: string; title: string }> }>('/teacher/exams')
      .then(r => setExams(r.data?.exams || []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = exams.filter(e => !search || e.title.toLowerCase().includes(search.toLowerCase()))

  const pickExam = async (examId: string, title: string) => {
    setCreating(examId)
    try {
      const created = await assignmentsService.createFromExam({ examId })
      toast.success(`Đã tạo bài tập từ "${title}"`)
      onCreated(created)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tạo được bài tập từ đề thi')
      setCreating(null)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: D.card, border: `1px solid ${D.border}`, borderRadius: 16,
        width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 10,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen style={{ width: 18, height: 18, color: D.blue }} />
            Chọn đề thi để giao
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: D.muted, cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 38,
            background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8,
          }}>
            <Search style={{ width: 14, height: 14, color: D.muted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm đề thi…"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: D.text, fontSize: 13 }}
            />
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: D.muted }}>
              <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: D.muted, fontSize: 13 }}>
              {exams.length === 0 ? 'Bạn chưa có đề thi nào. Tạo đề tại /teacher/exams trước.' : 'Không tìm thấy đề khớp tìm kiếm.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filtered.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => pickExam(ex.id, ex.title)}
                  disabled={creating !== null}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    padding: 12, background: D.card2, border: `1px solid ${D.border}`, borderRadius: 8,
                    color: D.text, cursor: creating === null ? 'pointer' : 'wait', textAlign: 'left',
                    opacity: creating !== null && creating !== ex.id ? 0.5 : 1,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ex.title}
                    </div>
                    <div style={{ fontSize: 11, color: D.muted, display: 'flex', gap: 12 }}>
                      {ex.subject && <span>📚 {ex.subject}</span>}
                      {ex.totalQuestions != null && <span>{ex.totalQuestions} câu</span>}
                      {ex.duration != null && <span>⏱ {ex.duration}p</span>}
                    </div>
                  </div>
                  {creating === ex.id ? (
                    <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: D.purpleL }} />
                  ) : (
                    <Plus style={{ width: 16, height: 16, color: D.purpleL }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── AssignToModal ──────────────────────────────────────────────────── */
function AssignToModal({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade: string; studentCount: number }>>([])
  const [students, setStudents] = useState<Array<{ id: string; name: string; mssv: string | null; classId: string }>>([])
  const [pickedClasses, setPickedClasses] = useState<Set<string>>(new Set())
  const [pickedStudents, setPickedStudents] = useState<Set<string>>(new Set())
  const [existingTargets, setExistingTargets] = useState<Array<{ id: string; type: 'class' | 'student'; targetId: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'class' | 'student'>('class')

  // Load classes + existing targets
  useEffect(() => {
    Promise.all([
      api.get<{ classes: Array<{ id: string; name: string; grade: string; studentCount: number }> }>('/classes'),
      assignmentsService.listTargets(assignmentId),
    ])
      .then(([cRes, tRes]) => {
        setClasses(cRes.data?.classes || [])
        setExistingTargets(tRes.targets || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [assignmentId])

  // When user expands a class → fetch its students for individual picking
  const expandClass = async (classId: string) => {
    if (students.some(s => s.classId === classId)) return  // already loaded
    try {
      const r = await api.get<{ students: Array<{ id: string; name: string; mssv: string | null }> }>(`/classes/${classId}/students`)
      const enriched = (r.data?.students || []).map(s => ({ ...s, classId }))
      setStudents(prev => [...prev, ...enriched])
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tải được học sinh')
    }
  }

  const submit = async () => {
    if (pickedClasses.size === 0 && pickedStudents.size === 0) {
      toast.error('Chọn ít nhất 1 lớp hoặc học sinh')
      return
    }
    setSubmitting(true)
    try {
      const result = await assignmentsService.assignTo(assignmentId, {
        classIds:   Array.from(pickedClasses),
        studentIds: Array.from(pickedStudents),
      })
      const msgParts = []
      if (result.added > 0)    msgParts.push(`Giao bài cho ${result.added} mục tiêu`)
      if (result.notified > 0) msgParts.push(`gửi ${result.notified} thông báo`)
      toast.success(msgParts.join(' • ') || 'Đã giao bài')
      qc.invalidateQueries({ queryKey: ['teacher-assignments'] })
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không giao được bài')
    } finally {
      setSubmitting(false)
    }
  }

  const removeExisting = async (t: { id: string; type: 'class' | 'student'; targetId: string }) => {
    if (!confirm('Gỡ mục tiêu này khỏi bài tập?')) return
    try {
      await assignmentsService.removeTarget(assignmentId, t.type, t.targetId)
      setExistingTargets(prev => prev.filter(x => x.id !== t.id))
      toast.success('Đã gỡ')
    } catch {
      toast.error('Không gỡ được')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: D.card, border: `1px solid ${D.border}`, borderRadius: 16,
        width: '100%', maxWidth: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', zIndex: 10,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send style={{ width: 18, height: 18, color: D.green }} />
            Giao bài cho học sinh / lớp
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: D.muted, cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Existing targets */}
        {existingTargets.length > 0 && (
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${D.border}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: D.muted, textTransform: 'uppercase' }}>
              Đã giao ({existingTargets.length})
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {existingTargets.map(t => (
                <div key={t.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 8px', background: t.type === 'class' ? `${D.blue}22` : `${D.purpleL}22`,
                  border: `1px solid ${t.type === 'class' ? D.blue : D.purpleL}55`,
                  borderRadius: 6, fontSize: 11, color: t.type === 'class' ? D.blue : D.purpleL,
                }}>
                  {t.type === 'class' ? <Users style={{ width: 10, height: 10 }} /> : <GraduationCap style={{ width: 10, height: 10 }} />}
                  {t.label}
                  <button
                    onClick={() => removeExisting(t)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', padding: 0 }}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: '12px 20px 0', display: 'flex', gap: 4, borderBottom: `1px solid ${D.border}` }}>
          {(['class', 'student'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 14px', background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t ? D.purple : 'transparent'}`,
                color: tab === t ? D.purpleL : D.muted, fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              {t === 'class' ? 'Theo lớp' : 'Theo từng HS'}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: D.muted }}>
              <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
            </div>
          ) : classes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: D.muted, fontSize: 13 }}>
              Bạn chưa có lớp nào. Tạo lớp tại <a href="/teacher/classes" style={{ color: D.blue }}>/teacher/classes</a> trước.
            </div>
          ) : tab === 'class' ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {classes.map(c => {
                const checked = pickedClasses.has(c.id)
                return (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                    background: checked ? `${D.purple}15` : D.card2,
                    border: `1px solid ${checked ? `${D.purple}55` : D.border}`,
                    borderRadius: 8, cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const next = new Set(pickedClasses)
                        if (e.target.checked) next.add(c.id); else next.delete(c.id)
                        setPickedClasses(next)
                      }}
                      style={{ width: 16, height: 16, accentColor: D.purple }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: D.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: D.muted }}>
                        {c.grade} • {c.studentCount} học sinh
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          ) : (
            <div>
              {classes.map(c => (
                <details
                  key={c.id}
                  onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) expandClass(c.id) }}
                  style={{ marginBottom: 8 }}
                >
                  <summary style={{
                    cursor: 'pointer', padding: 8, background: D.card2, border: `1px solid ${D.border}`,
                    borderRadius: 6, color: D.text, fontSize: 13, fontWeight: 600,
                  }}>
                    {c.name} ({c.studentCount})
                  </summary>
                  <div style={{ padding: '8px 0 0 16px', display: 'grid', gap: 4 }}>
                    {students.filter(s => s.classId === c.id).map(s => {
                      const checked = pickedStudents.has(s.id)
                      return (
                        <label key={s.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
                          background: checked ? `${D.purple}15` : 'transparent',
                          borderRadius: 4, cursor: 'pointer', fontSize: 13, color: D.text,
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => {
                              const next = new Set(pickedStudents)
                              if (e.target.checked) next.add(s.id); else next.delete(s.id)
                              setPickedStudents(next)
                            }}
                            style={{ width: 14, height: 14, accentColor: D.purple }}
                          />
                          <span>{s.name}</span>
                          {/* mssv (mã định danh) đã ẨN khỏi UI để tránh lộ PII —
                              vẫn được dùng để filter/match nội bộ nhưng không hiển thị */}
                        </label>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${D.border}`, display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px 16px', background: 'transparent', border: `1px solid ${D.border}`,
              borderRadius: 8, color: D.text, fontWeight: 600, cursor: 'pointer',
            }}
          >Huỷ</button>
          <button
            onClick={submit}
            disabled={submitting || (pickedClasses.size === 0 && pickedStudents.size === 0)}
            style={{
              flex: 1, padding: '10px 16px',
              background: `linear-gradient(135deg, ${D.green}, ${D.blue})`,
              border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: submitting || (pickedClasses.size === 0 && pickedStudents.size === 0) ? 0.5 : 1,
            }}
          >
            {submitting && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
            <Send style={{ width: 14, height: 14 }} />
            Giao + thông báo ({pickedClasses.size + pickedStudents.size})
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── CreateModal ────────────────────────────────────────────────────── */
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateAssignmentInput>({
    title: '',
    description: '',
    subject: 'Toán',
    type: 'lesson',
    difficulty: 'medium',
    duration: 30,
    xpReward: 100,
    maxScore: 10,
    content: '',
    tags: [],
    dueDate: null,
    status: 'published',
    generateQr: true,
  })
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (input: CreateAssignmentInput) => assignmentsService.create(input),
    onSuccess: () => onCreated(),
    onError: (e: any) => setErr(e?.response?.data?.error || e?.message || 'Lỗi khi tạo bài'),
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
          background: D.card, border: `1px solid ${D.border}`, borderRadius: 16, padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Tạo bài tập mới</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: D.muted, cursor: 'pointer' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <Field label="Tiêu đề *">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="VD: Bài tập Chương 1 — Chuyển động"
              style={inputStyle}
            />
          </Field>

          <Field label="Mô tả ngắn">
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tóm tắt nội dung bài tập"
              style={inputStyle}
            />
          </Field>

          <Field label="Nội dung / đề bài">
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Đề chi tiết — học sinh sẽ thấy khi scan QR"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Môn học">
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                style={inputStyle}
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Loại">
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                style={inputStyle}
              >
                <option value="lesson">Bài học</option>
                <option value="quiz">Trắc nghiệm</option>
                <option value="project">Dự án</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Độ khó">
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
                style={inputStyle}
              >
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </Field>
            <Field label="Thời gian (phút)">
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) || 0 })}
                style={inputStyle}
              />
            </Field>
            <Field label="Điểm tối đa">
              <input
                type="number"
                value={form.maxScore}
                onChange={(e) => setForm({ ...form, maxScore: Number(e.target.value) || 0 })}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Hạn nộp (tuỳ chọn)">
            <input
              type="datetime-local"
              value={form.dueDate || ''}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })}
              style={inputStyle}
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: D.text, fontSize: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.generateQr !== false}
              onChange={(e) => setForm({ ...form, generateQr: e.target.checked })}
            />
            <QrCode style={{ width: 14, height: 14, color: D.blue }} />
            Tạo QR code để học sinh scan & nộp bài
          </label>

          {err && (
            <div style={{ padding: 10, background: `${D.red}15`, border: `1px solid ${D.red}44`, borderRadius: 8, color: D.red, fontSize: 13 }}>
              {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px', borderRadius: 10, border: `1px solid ${D.border}`,
                background: 'transparent', color: D.text, fontSize: 14, cursor: 'pointer',
              }}
            >
              Huỷ
            </button>
            <button
              onClick={() => {
                setErr(null)
                if (!form.title.trim()) return setErr('Vui lòng nhập tiêu đề')
                mutation.mutate(form)
              }}
              disabled={mutation.isPending}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: `linear-gradient(135deg, ${D.purple}, ${D.purpleL})`,
                color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? 'Đang tạo…' : 'Tạo bài tập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${D.border}`,
  background: D.card2, color: D.text, fontSize: 14, outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: D.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )
}

/* ─── DetailDrawer — QR + submissions + stats ────────────────────────── */
function DetailDrawer({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const { data: submissions } = useQuery({
    queryKey: ['asgn-subs', assignment.id],
    queryFn: () => assignmentsService.getSubmissions(assignment.id),
    refetchInterval: 15_000,
  })
  const { data: stats } = useQuery({
    queryKey: ['asgn-stats', assignment.id],
    queryFn: () => assignmentsService.getStats(assignment.id),
    refetchInterval: 15_000,
  })

  const scanUrl = assignment.scanUrl || (assignment.qrToken ? `${window.location.origin}/a/${assignment.qrToken}` : null)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560, height: '100%', overflowY: 'auto',
          background: D.bg, borderLeft: `1px solid ${D.border}`, padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: D.text }}>{assignment.title}</h2>
            <p style={{ margin: '4px 0 0', color: D.muted, fontSize: 13 }}>{assignment.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: D.muted, cursor: 'pointer', marginLeft: 12 }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* QR section */}
        {scanUrl ? (
          <div style={{
            padding: 20, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
            marginBottom: 16, textAlign: 'center',
          }}>
            <QRImage url={scanUrl} size={220} />
            <div style={{ marginTop: 12, fontSize: 13, color: D.muted }}>Học sinh scan mã này để làm bài</div>
            <div style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 10px', background: D.card2, borderRadius: 8,
              fontSize: 12, color: D.text, fontFamily: 'monospace',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scanUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(scanUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
                style={{ background: 'transparent', border: 'none', color: D.purpleL, cursor: 'pointer' }}
                title="Sao chép"
              >
                {copied ? <CheckCircle style={{ width: 14, height: 14, color: D.green }} /> : <Copy style={{ width: 14, height: 14 }} />}
              </button>
              <a
                href={scanUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: D.purpleL, display: 'inline-flex', alignItems: 'center' }}
                title="Mở"
              >
                <ExternalLink style={{ width: 14, height: 14 }} />
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            padding: 12, background: `${D.amber}15`, border: `1px solid ${D.amber}44`, borderRadius: 8,
            color: D.amber, fontSize: 13, marginBottom: 16,
          }}>
            Bài này chưa có QR code.
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div style={{
            padding: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BarChart3 style={{ width: 16, height: 16, color: D.purpleL }} />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Thống kê</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 12 }}>
              <Metric label="Tổng lượt" value={stats.total} color={D.blue} />
              <Metric label="Người nộp" value={stats.uniqueScanners} color={D.green} />
              <Metric label="Điểm TB" value={stats.avgScore ? stats.avgScore.toFixed(1) : '—'} color={D.amber} />
              <Metric label="Điểm cao" value={stats.maxSubmittedScore ? stats.maxSubmittedScore.toFixed(1) : '—'} color={D.purple} />
            </div>
          </div>
        )}

        {/* Submissions table */}
        <div style={{
          padding: 16, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Users style={{ width: 16, height: 16, color: D.green }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
              Học sinh đã nộp ({submissions?.length || 0})
            </h3>
          </div>
          {(!submissions || submissions.length === 0) ? (
            <div style={{ padding: 24, textAlign: 'center', color: D.muted, fontSize: 13 }}>
              Chưa có ai nộp bài.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {submissions.map((s: AssignmentSubmission) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: D.card2, borderRadius: 8, fontSize: 13,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: `${D.purple}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: D.purpleL, fontWeight: 700, fontSize: 12,
                  }}>
                    {s.scannerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.scannerName}
                    </div>
                    <div style={{ fontSize: 11, color: D.muted }}>
                      {new Date(s.submittedAt).toLocaleString('vi-VN')}
                      {s.scannerEmail && ` · ${s.scannerEmail}`}
                    </div>
                  </div>
                  {s.score != null && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: `${D.green}22`, color: D.green,
                    }}>
                      {Number(s.score).toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 8, background: D.card2, borderRadius: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ color: D.muted, fontSize: 10, marginTop: 4 }}>{label}</div>
    </div>
  )
}
