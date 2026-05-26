/**
 * Student StemProjects — Dự án STEM HS đang tham gia (sau khi join QR)
 *
 * Route: /student/stem-projects (+ /:id detail)
 *
 * User: "khi học sinh quét mã thì tên của học sinh xuất hiện ngay trong
 * dự án của giáo viên và trong mục stem của học sinh cũng xuất hiện giao
 * diện stem của giáo viên đồng bộ nhau để cùng thực hiện dự án chung"
 *
 * Đồng bộ với teacher StemProjectDetail:
 *   - Cùng endpoint /api/teacher/stem-projects/:id/dashboard (BE đã allow
 *     student member truy cập với isOwner=false)
 *   - Same tabs: Overview / Tasks / Logs / Feedback / Milestones
 *   - HS có thể POST log (BE đã verify isMember)
 *   - Read-only: tasks/milestones/feedback (chỉ GV tạo)
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { api } from '@/services/api'
import {
  ArrowLeft, Home, Zap, Loader2, Users, CheckCircle2, Clock,
  FileText, MessageSquare, Award, Plus, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types (mirror teacher's) ─────────────────────────────────────
interface Project {
  id: string; title: string; description?: string | null
  category: string; status: string; subject?: string | null; grade?: string | null
  difficulty?: string | null
  teacher_id: string; teacher_name?: string; teacher_image?: string | null
}
interface Member { id: string; student_id: string; name: string | null; email: string | null; image: string | null; joined_at: string; status?: string | null }
interface Task { id: string; title: string; description?: string; status: string; priority: string; due_date?: string | null; assigned_to?: string[] }
interface Log { id: string; student_id: string; student_name?: string; log_date: string; content: string; hours_spent: number; created_at: string }
interface Feedback { id: string; author_id: string; author_name?: string; target_type: string; content: string; rating?: number; created_at: string }
interface Milestone { id: string; title: string; phase_order: number; due_date?: string | null; status: string; score?: number | null; max_score?: number | null }
interface Dashboard {
  project: Project; members: Member[]; tasks: Task[]; logs: Log[]
  feedbacks: Feedback[]; milestones: Milestone[]
  stats: { members: number; totalTasks: number; completedTasks: number; totalLogs: number; totalHours: number }
  isOwner: boolean
}

// ── List page ─────────────────────────────────────────────────────
function StudentStemList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<(Project & { joined_at: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<{ projects: (Project & { joined_at: string })[] }>('/student/stem-projects')
      .then(r => setProjects(r.data.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-6xl mx-auto">
        {/* Top nav */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate('/student')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
            <ArrowLeft className="h-4 w-4" /> Trang HS
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
            <Home className="h-4 w-4" /> Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 border border-amber-500/20 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Dự án STEM của tôi</h1>
              <p className="text-sm text-muted-foreground">
                Các dự án bạn đã tham gia · đồng bộ với giao diện giáo viên
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-10 text-center">
            <Zap className="w-16 h-16 mx-auto mb-3 text-muted-foreground/30" />
            <h2 className="text-xl font-bold mb-2">Chưa tham gia dự án nào</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Quét QR mời từ giáo viên để tham gia · hoặc xin link mời
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Link key={p.id} to={`/student/stem-projects/${p.id}`}
                className="rounded-2xl bg-card border border-border p-5 hover:border-amber-500/40 hover:shadow-lg transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base truncate">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      GV: {p.teacher_name || 'Chưa rõ'}
                    </p>
                  </div>
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="px-2 py-0.5 rounded-full bg-muted/40 font-bold">{p.category}</span>
                  {p.subject && <span className="text-muted-foreground">📚 {p.subject}</span>}
                  {p.grade && <span className="text-muted-foreground">· Lớp {p.grade}</span>}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Tham gia: {new Date(p.joined_at).toLocaleDateString('vi-VN')}</span>
                  <span className="text-amber-500 font-bold group-hover:translate-x-0.5 transition-transform">Vào dự án →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Detail page (đồng bộ với teacher view) ──────────────────────
function StudentStemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'tasks' | 'logs' | 'feedback' | 'milestones'>('overview')

  // Log form
  const [logOpen, setLogOpen] = useState(false)
  const [logContent, setLogContent] = useState('')
  const [logHours, setLogHours] = useState('1')
  const [logSubmitting, setLogSubmitting] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get<Dashboard>(`/teacher/stem-projects/${id}/dashboard`)
      setDashboard(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tải được dự án')
      navigate('/student/stem-projects')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { reload() }, [reload])

  const submitLog = async () => {
    if (!logContent.trim() || logSubmitting) return
    setLogSubmitting(true)
    try {
      await api.post(`/teacher/stem-projects/${id}/logs`, {
        content: logContent,
        hoursSpent: Number(logHours) || 0,
        logDate: new Date().toISOString().slice(0, 10),
      })
      toast.success('Đã ghi log tiến trình')
      setLogContent('')
      setLogHours('1')
      setLogOpen(false)
      reload()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Lỗi ghi log')
    } finally {
      setLogSubmitting(false)
    }
  }

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }
  const { project, members, tasks, logs, feedbacks, milestones, stats } = dashboard

  return (
    <div className="min-h-screen p-4 md:p-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Top nav */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => navigate('/student/stem-projects')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
            <ArrowLeft className="h-4 w-4" /> Dự án của tôi
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm">
            <Home className="h-4 w-4" /> Dashboard
          </button>
          <span className="ml-auto text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
            👁 Chế độ HS · Đồng bộ với GV
          </span>
        </div>

        {/* Project header */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 border border-amber-500/20 p-5 mb-5">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold">{project.title}</h1>
              {project.description && <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                <span className="px-2 py-0.5 rounded-full bg-muted/40 font-bold">{project.category}</span>
                {project.subject && <span className="text-muted-foreground">📚 {project.subject}</span>}
                {project.grade && <span className="text-muted-foreground">· Lớp {project.grade}</span>}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  GV: {project.teacher_name || '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <Stat label="Thành viên" value={stats.members} icon={Users} color="cyan" />
          <Stat label="Nhiệm vụ" value={`${stats.completedTasks}/${stats.totalTasks}`} icon={CheckCircle2} color="emerald" />
          <Stat label="Log tiến trình" value={stats.totalLogs} icon={FileText} color="blue" />
          <Stat label="Giờ làm việc" value={`${stats.totalHours}h`} icon={Clock} color="amber" />
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-4 flex gap-1 overflow-x-auto">
          {[
            { id: 'overview',   label: 'Tổng quan',   icon: Award },
            { id: 'tasks',      label: 'Nhiệm vụ',    icon: CheckCircle2, badge: tasks.length },
            { id: 'logs',       label: 'Tiến trình',  icon: FileText,     badge: logs.length },
            { id: 'feedback',   label: 'Phản hồi',    icon: MessageSquare, badge: feedbacks.length },
            { id: 'milestones', label: 'Giai đoạn',   icon: Calendar,     badge: milestones.length },
          ].map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-3 py-2.5 text-xs md:text-sm font-bold flex items-center gap-1.5 border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-muted/50">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title={`Thành viên dự án (${members.length})`}>
              {members.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Chưa có thành viên khác</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      {m.image
                        ? <img src={m.image} className="w-8 h-8 rounded-full object-cover" />
                        : <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                            {(m.name || 'H')[0].toUpperCase()}
                          </div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{m.name || `HS ${m.student_id.slice(0, 6)}`}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title={`Log gần đây (${logs.length})`}
              action={
                <button onClick={() => setLogOpen(true)}
                  className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Ghi log
                </button>
              }>
              {logs.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Chưa có log tiến trình</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {logs.slice(0, 5).map(l => (
                    <div key={l.id} className="border-l-2 border-blue-500/40 pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1 text-xs">
                        <span className="font-bold">{l.student_name || 'HS'}</span>
                        <span className="text-muted-foreground text-[10px]">
                          {new Date(l.log_date).toLocaleDateString('vi-VN')} · {l.hours_spent}h
                        </span>
                      </div>
                      <p className="text-xs">{l.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Chưa có nhiệm vụ — chờ GV giao</p>
            ) : (
              tasks.map(t => (
                <div key={t.id} className="rounded-lg bg-card border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      t.status === 'completed' ? 'bg-emerald-500'
                      : t.status === 'in-progress' ? 'bg-amber-500 animate-pulse'
                      : 'bg-slate-500'
                    }`} />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{t.title}</h4>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-muted/40 uppercase">{t.priority}</span>
                        {t.due_date && (
                          <span className="text-muted-foreground">📅 {new Date(t.due_date).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'logs' && (
          <div>
            <div className="mb-3 flex justify-end">
              <button onClick={() => setLogOpen(true)}
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Ghi log hôm nay
              </button>
            </div>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">Bạn chưa ghi log nào</p>
              ) : (
                logs.map(l => (
                  <div key={l.id} className="rounded-lg bg-card border border-border p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <span className="font-bold">{l.student_name || 'HS'}</span>
                      <span className="text-muted-foreground">{new Date(l.log_date).toLocaleDateString('vi-VN')} · {l.hours_spent}h</span>
                    </div>
                    <p className="text-sm">{l.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === 'feedback' && (
          <div className="space-y-2">
            {feedbacks.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Chưa có phản hồi từ GV</p>
            ) : (
              feedbacks.map(f => (
                <div key={f.id} className="rounded-lg bg-card border border-border p-4">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="font-bold">{f.author_name || 'GV'}</span>
                    <span className="text-muted-foreground">{new Date(f.created_at).toLocaleDateString('vi-VN')}</span>
                    {f.rating != null && (
                      <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        ⭐ {f.rating}/10
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{f.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'milestones' && (
          <div className="space-y-2">
            {milestones.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-10">Chưa có giai đoạn nào</p>
            ) : (
              milestones.map(m => (
                <div key={m.id} className="rounded-lg bg-card border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm">Giai đoạn {m.phase_order}: {m.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted/40'
                    }`}>{m.status}</span>
                  </div>
                  {m.score != null && m.max_score != null && (
                    <p className="text-xs text-amber-300 font-bold">
                      ⭐ {m.score} / {m.max_score}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Log modal */}
      {logOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5">
            <h3 className="font-bold text-lg mb-3">Ghi log tiến trình hôm nay</h3>
            <textarea
              value={logContent} onChange={e => setLogContent(e.target.value)}
              placeholder="Hôm nay bạn đã làm gì cho dự án? Khó khăn? Câu hỏi?"
              rows={5}
              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm" />
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Số giờ:</label>
              <input type="number" min="0" step="0.5" value={logHours}
                onChange={e => setLogHours(e.target.value)}
                className="w-20 px-2 py-1 rounded bg-muted/30 border border-border text-sm" />
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setLogOpen(false)}
                className="px-3 py-2 rounded-lg border border-border text-sm">Huỷ</button>
              <button onClick={submitLog} disabled={!logContent.trim() || logSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
                {logSubmitting ? 'Đang lưu…' : 'Ghi log'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string
}) {
  const colorMap: Record<string, string> = {
    cyan:    'from-cyan-500/15 border-cyan-500/30 text-cyan-300',
    emerald: 'from-emerald-500/15 border-emerald-500/30 text-emerald-300',
    blue:    'from-blue-500/15 border-blue-500/30 text-blue-300',
    amber:   'from-amber-500/15 border-amber-500/30 text-amber-300',
  }
  return (
    <div className={`rounded-xl bg-gradient-to-br ${colorMap[color]} border p-3`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function StudentStemProjects() {
  const { id } = useParams<{ id?: string }>()
  return id ? <StudentStemDetail /> : <StudentStemList />
}
