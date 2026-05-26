/**
 * /teacher/stem-projects/:id — GV giám sát dự án như khoá học
 *
 * User: "Giáo viên có thể giám sát như 1 khoá học dự án. Có giao nhiệm vụ,
 * theo dõi tiến trình và feedback từng ngày. Đánh giá từng giai đoạn."
 *
 * 5 tabs:
 *   1. Tổng quan: stats + members + recent logs/feedbacks
 *   2. Nhiệm vụ: list tasks + create/assign + status update
 *   3. Tiến trình: timeline logs per student per day
 *   4. Feedback: dialog GV nhận xét per-task/per-log
 *   5. Phase: milestones với criteria rubric + chấm điểm
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Zap, Users, ClipboardList, Activity, MessageSquare,
  Target, Plus, Loader2, Calendar, Clock, CheckCircle2, Circle,
  AlertCircle, Star, Trash2, Edit3, Send, X, Award, TrendingUp,
} from 'lucide-react'
import { api } from '@/services/api'

interface Project {
  id: string; teacher_id: string; title: string; description: string | null;
  category: string; status: string; subject: string | null; grade: string | null;
  difficulty: string; created_at: string;
}
interface Member { id: string; student_id: string; name: string | null; email: string | null; image: string | null; joined_at: string }
interface Task {
  id: string; title: string; description: string | null;
  assigned_to: string[]; status: string; priority: string;
  due_date: string | null; points: number; completed_at: string | null; created_at: string;
}
interface Log {
  id: string; student_id: string; student_name: string | null; student_image: string | null;
  log_date: string; content: string; hours_spent: number;
  task_id: string | null; feedback_count: number; created_at: string;
}
interface Feedback {
  id: string; author_id: string; author_name: string | null; author_image: string | null; author_role: string;
  target_type: string; target_id: string | null; content: string; rating: number | null;
  feedback_type: string; created_at: string;
}
interface Milestone {
  id: string; title: string; description: string | null; phase_order: number;
  status: string; due_date: string | null; criteria: any[];
  score: number | null; max_score: number; evaluation: string | null; evaluated_at: string | null;
}
interface Stats {
  members: number; totalTasks: number; completedTasks: number; inProgressTasks: number;
  overdueTasks: number; totalLogs: number; totalHours: number;
  completedMilestones: number; totalMilestones: number; avgPhaseScore: number | null;
}
interface Dashboard {
  project: Project; members: Member[]; tasks: Task[]; logs: Log[];
  feedbacks: Feedback[]; milestones: Milestone[]; stats: Stats; isOwner: boolean;
}

type Tab = 'overview' | 'tasks' | 'logs' | 'feedback' | 'milestones'

export default function StemProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [taskModal, setTaskModal] = useState(false)
  const [milestoneModal, setMilestoneModal] = useState<Milestone | null | 'new'>(null)
  const [logModal, setLogModal] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<{ type: string; id: string | null; label: string } | null>(null)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get<Dashboard>(`/teacher/stem-projects/${id}/dashboard`)
      setDashboard(data)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  if (loading || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }
  const { project, members, tasks, logs, feedbacks, milestones, stats, isOwner } = dashboard

  return (
    <div className="min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto">
        {/* Back + header */}
        <Link to="/teacher/stem-projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Tất cả dự án
        </Link>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 border border-amber-500/20 p-6 mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-1">{project.title}</h1>
              {project.description && <p className="text-sm text-muted-foreground mb-2">{project.description}</p>}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-muted/40 font-bold">{project.category}</span>
                {project.subject && <span className="text-muted-foreground">📚 {project.subject}</span>}
                {project.grade && <span className="text-muted-foreground">· Lớp {project.grade}</span>}
                <span className="text-muted-foreground">· {project.status}</span>
              </div>
            </div>
            {isOwner && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Chủ dự án
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            <Stat label="Thành viên" value={stats.members} icon={Users} color="cyan" />
            <Stat label="Nhiệm vụ"
              value={`${stats.completedTasks}/${stats.totalTasks}`}
              sub={stats.overdueTasks > 0 ? `${stats.overdueTasks} quá hạn` : 'Đúng tiến độ'}
              icon={ClipboardList} color={stats.overdueTasks > 0 ? 'rose' : 'emerald'} />
            <Stat label="Tiến trình" value={`${stats.totalLogs} log`}
              sub={`${stats.totalHours.toFixed(1)} giờ`} icon={Activity} color="blue" />
            <Stat label="Phase"
              value={`${stats.completedMilestones}/${stats.totalMilestones}`}
              icon={Target} color="purple" />
            <Stat label="Điểm TB"
              value={stats.avgPhaseScore != null ? `${stats.avgPhaseScore}/10` : '—'}
              icon={Award} color="amber" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border overflow-x-auto">
          {([
            { key: 'overview' as const, label: 'Tổng quan', icon: TrendingUp },
            { key: 'tasks' as const, label: `Nhiệm vụ (${tasks.length})`, icon: ClipboardList },
            { key: 'logs' as const, label: `Tiến trình (${logs.length})`, icon: Activity },
            { key: 'feedback' as const, label: `Feedback (${feedbacks.length})`, icon: MessageSquare },
            { key: 'milestones' as const, label: `Phase (${milestones.length})`, icon: Target },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        {tab === 'overview' && (
          <OverviewTab members={members} logs={logs.slice(0, 5)} feedbacks={feedbacks.slice(0, 5)}
            milestones={milestones} isOwner={isOwner} />
        )}
        {tab === 'tasks' && (
          <TasksTab tasks={tasks} members={members} isOwner={isOwner}
            onCreate={() => setTaskModal(true)}
            onUpdate={async (taskId, patch) => {
              try { await api.patch(`/teacher/stem-projects/${id}/tasks/${taskId}`, patch); reload() }
              catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
            }}
            onDelete={async (taskId) => {
              if (!confirm('Xoá nhiệm vụ này?')) return
              try { await api.delete(`/teacher/stem-projects/${id}/tasks/${taskId}`); reload() }
              catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
            }}
            onFeedback={(t) => setFeedbackTarget({ type: 'task', id: t.id, label: t.title })}
          />
        )}
        {tab === 'logs' && (
          <LogsTab logs={logs} members={members}
            onAdd={() => setLogModal(true)}
            onFeedback={(l) => setFeedbackTarget({ type: 'log', id: l.id, label: `Log ngày ${new Date(l.log_date).toLocaleDateString('vi-VN')}` })}
          />
        )}
        {tab === 'feedback' && <FeedbackTab feedbacks={feedbacks} />}
        {tab === 'milestones' && (
          <MilestonesTab milestones={milestones} isOwner={isOwner}
            onCreate={() => setMilestoneModal('new')}
            onEdit={(m) => setMilestoneModal(m)}
            onDelete={async (msId) => {
              if (!confirm('Xoá phase này?')) return
              try { await api.delete(`/teacher/stem-projects/${id}/milestones/${msId}`); reload() }
              catch { toast.error('Lỗi') }
            }}
          />
        )}
      </div>

      {/* Modals */}
      {taskModal && (
        <TaskFormModal
          members={members}
          onSave={async (payload) => {
            try {
              await api.post(`/teacher/stem-projects/${id}/tasks`, payload)
              toast.success('Đã giao nhiệm vụ')
              setTaskModal(false); reload()
            } catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
          }}
          onClose={() => setTaskModal(false)}
        />
      )}
      {milestoneModal && (
        <MilestoneFormModal
          milestone={milestoneModal === 'new' ? null : milestoneModal}
          onSave={async (payload) => {
            try {
              if (milestoneModal === 'new') {
                await api.post(`/teacher/stem-projects/${id}/milestones`, payload)
              } else {
                await api.patch(`/teacher/stem-projects/${id}/milestones/${milestoneModal.id}`, payload)
              }
              toast.success('Đã lưu phase')
              setMilestoneModal(null); reload()
            } catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
          }}
          onClose={() => setMilestoneModal(null)}
        />
      )}
      {logModal && (
        <LogFormModal
          tasks={tasks}
          onSave={async (payload) => {
            try {
              await api.post(`/teacher/stem-projects/${id}/logs`, payload)
              toast.success('Đã ghi tiến trình')
              setLogModal(false); reload()
            } catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
          }}
          onClose={() => setLogModal(false)}
        />
      )}
      {feedbackTarget && (
        <FeedbackFormModal
          target={feedbackTarget}
          onSave={async (payload) => {
            try {
              await api.post(`/teacher/stem-projects/${id}/feedbacks`, {
                ...payload, targetType: feedbackTarget.type, targetId: feedbackTarget.id,
              })
              toast.success('Đã gửi feedback')
              setFeedbackTarget(null); reload()
            } catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
          }}
          onClose={() => setFeedbackTarget(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Stat box
// ─────────────────────────────────────────────────────────────
function Stat({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: any; color: 'cyan' | 'emerald' | 'rose' | 'blue' | 'purple' | 'amber'
}) {
  const colorMap = {
    cyan: 'from-cyan-500/15 border-cyan-500/30 text-cyan-300',
    emerald: 'from-emerald-500/15 border-emerald-500/30 text-emerald-300',
    rose: 'from-rose-500/15 border-rose-500/30 text-rose-300',
    blue: 'from-blue-500/15 border-blue-500/30 text-blue-300',
    purple: 'from-purple-500/15 border-purple-500/30 text-purple-300',
    amber: 'from-amber-500/15 border-amber-500/30 text-amber-300',
  }
  return (
    <div className={`rounded-xl bg-gradient-to-br to-transparent border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="text-xl font-black">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────
function OverviewTab({ members, logs, feedbacks, milestones }: {
  members: Member[]; logs: Log[]; feedbacks: Feedback[]; milestones: Milestone[]; isOwner: boolean
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Thành viên ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Chưa có HS tham gia. Dùng nút "Mời HS" ở danh sách dự án.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                {m.image
                  ? <img src={m.image} className="w-8 h-8 rounded-full object-cover" />
                  : <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs">
                      {(m.name || 'H')[0].toUpperCase()}
                    </div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{m.name || '(chưa đặt tên)'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Tiến trình gần đây</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Chưa có log tiến trình</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.map(l => (
              <div key={l.id} className="border-l-2 border-blue-500/40 pl-3 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">{l.student_name || 'HS'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(l.log_date).toLocaleDateString('vi-VN')} · {l.hours_spent}h
                  </span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2">{l.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-5 lg:col-span-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Feedback gần đây</h3>
        {feedbacks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Chưa có feedback</p>
        ) : (
          <div className="space-y-2">
            {feedbacks.slice(0, 6).map(f => (
              <div key={f.id} className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold">{f.author_name || 'GV'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                    {f.target_type}
                  </span>
                  {f.rating != null && (
                    <span className="text-xs text-amber-400 font-bold">⭐ {f.rating}/10</span>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(f.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TasksTab({ tasks, members, isOwner, onCreate, onUpdate, onDelete, onFeedback }: {
  tasks: Task[]; members: Member[]; isOwner: boolean;
  onCreate: () => void; onUpdate: (id: string, patch: any) => void
  onDelete: (id: string) => void; onFeedback: (t: Task) => void
}) {
  const memberMap = new Map(members.map(m => [m.student_id, m]))
  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    'in-progress': 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    review: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  }
  return (
    <div>
      {isOwner && (
        <div className="flex justify-end mb-3">
          <button onClick={onCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold">
            <Plus className="w-4 h-4" /> Giao nhiệm vụ mới
          </button>
        </div>
      )}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 py-12 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-amber-400 mb-2" />
          <p className="text-sm font-bold">Chưa có nhiệm vụ nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
            return (
              <div key={t.id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-base font-bold">{t.title}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[t.status] || STATUS_COLORS.pending}`}>
                        {t.status}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ⏰ Quá hạn
                        </span>
                      )}
                      {t.points > 0 && (
                        <span className="text-[10px] font-bold text-amber-400">+{t.points} điểm</span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mb-2">{t.description}</p>}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                      {t.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(t.due_date).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                      {Array.isArray(t.assigned_to) && t.assigned_to.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {t.assigned_to.map(uid => memberMap.get(uid)?.name || '?').join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex gap-1">
                      <select
                        value={t.status}
                        onChange={e => onUpdate(t.id, { status: e.target.value })}
                        className="px-2 py-1 rounded bg-muted/30 border border-border text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button onClick={() => onFeedback(t)} className="p-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300" title="Feedback">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(t.id)} className="p-1.5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LogsTab({ logs, members: _members, onAdd, onFeedback }: {
  logs: Log[]; members: Member[]; onAdd: () => void; onFeedback: (l: Log) => void
}) {
  // Group by date
  const byDate: Record<string, Log[]> = {}
  for (const l of logs) {
    const d = new Date(l.log_date).toISOString().slice(0, 10)
    byDate[d] = byDate[d] || []
    byDate[d].push(l)
  }
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={onAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold">
          <Plus className="w-4 h-4" /> Ghi tiến trình
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-blue-500/30 bg-blue-500/5 py-12 text-center">
          <Activity className="w-12 h-12 mx-auto text-blue-400 mb-2" />
          <p className="text-sm font-bold">Chưa có tiến trình</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byDate).map(([d, dayLogs]) => (
            <div key={d}>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-3 h-3" /> {new Date(d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
              </div>
              <div className="space-y-2 ml-5 border-l-2 border-blue-500/30 pl-4">
                {dayLogs.map(l => (
                  <div key={l.id} className="rounded-lg bg-card border border-border p-3">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {l.student_image
                        ? <img src={l.student_image} className="w-6 h-6 rounded-full" />
                        : <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                            {(l.student_name || 'H')[0].toUpperCase()}
                          </div>}
                      <span className="text-xs font-bold">{l.student_name || 'HS'}</span>
                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" /> {l.hours_spent}h
                      </span>
                      {l.feedback_count > 0 && (
                        <span className="text-[10px] flex items-center gap-1 text-purple-300">
                          <MessageSquare className="w-3 h-3" /> {l.feedback_count}
                        </span>
                      )}
                      <button onClick={() => onFeedback(l)} className="ml-auto p-1 rounded hover:bg-purple-500/20 text-purple-300" title="Feedback">
                        <MessageSquare className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs whitespace-pre-wrap">{l.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackTab({ feedbacks }: { feedbacks: Feedback[] }) {
  if (feedbacks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 py-12 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-purple-400 mb-2" />
        <p className="text-sm font-bold">Chưa có feedback nào</p>
        <p className="text-xs text-muted-foreground mt-1">GV gửi feedback qua tab "Nhiệm vụ" hoặc "Tiến trình"</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {feedbacks.map(f => (
        <div key={f.id} className="rounded-xl bg-card border border-border p-4">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {f.author_image
              ? <img src={f.author_image} className="w-7 h-7 rounded-full" />
              : <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-bold">
                  {(f.author_name || 'G')[0].toUpperCase()}
                </div>}
            <span className="text-sm font-bold">{f.author_name || 'GV'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
              {f.target_type}
            </span>
            {f.rating != null && (
              <span className="text-sm text-amber-400 font-bold flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" /> {f.rating}/10
              </span>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {new Date(f.created_at).toLocaleString('vi-VN')}
            </span>
          </div>
          <p className="text-sm">{f.content}</p>
        </div>
      ))}
    </div>
  )
}

function MilestonesTab({ milestones, isOwner, onCreate, onEdit, onDelete }: {
  milestones: Milestone[]; isOwner: boolean;
  onCreate: () => void; onEdit: (m: Milestone) => void; onDelete: (id: string) => void
}) {
  return (
    <div>
      {isOwner && (
        <div className="flex justify-end mb-3">
          <button onClick={onCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-sm font-bold">
            <Plus className="w-4 h-4" /> Tạo phase đánh giá
          </button>
        </div>
      )}
      {milestones.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 py-12 text-center">
          <Target className="w-12 h-12 mx-auto text-purple-400 mb-2" />
          <p className="text-sm font-bold">Chưa có phase đánh giá</p>
          <p className="text-xs text-muted-foreground mt-1">Tạo phase với criteria rubric để chấm điểm dự án theo giai đoạn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={m.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center text-sm font-black flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold">{m.title}</h4>
                    {m.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                  {Array.isArray(m.criteria) && m.criteria.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criteria rubric:</p>
                      <ul className="text-xs space-y-0.5 ml-4 list-disc text-muted-foreground">
                        {m.criteria.map((c: any, j: number) => (
                          <li key={j}>{typeof c === 'string' ? c : c.text || JSON.stringify(c)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px] flex-wrap">
                    {m.due_date && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(m.due_date).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                    {m.score != null ? (
                      <span className="font-bold text-amber-400">⭐ {m.score}/{m.max_score} điểm</span>
                    ) : (
                      <span className="text-muted-foreground italic">Chưa chấm</span>
                    )}
                  </div>
                  {m.evaluation && (
                    <div className="mt-2 p-2 rounded bg-muted/30 border-l-2 border-amber-500/40">
                      <p className="text-[10px] font-bold text-amber-300 mb-0.5">Nhận xét GV:</p>
                      <p className="text-xs">{m.evaluation}</p>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(m)} className="p-1.5 rounded hover:bg-purple-500/20 text-purple-300" title="Đánh giá">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(m.id)} className="p-1.5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────
function TaskFormModal({ members, onSave, onClose }: {
  members: Member[]; onSave: (payload: any) => void; onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState<string[]>([])
  const [priority, setPriority] = useState('medium')
  const [points, setPoints] = useState(1)
  const [dueDate, setDueDate] = useState('')
  const toggle = (uid: string) => setAssignedTo(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid])
  return (
    <Modal title="Giao nhiệm vụ mới" onClose={onClose}>
      <Field label="Tên nhiệm vụ *">
        <input className="modal-input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="Mô tả">
        <textarea className="modal-input resize-y" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Giao cho">
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-border min-h-[42px]">
          {members.length === 0 && <span className="text-xs text-muted-foreground italic">Chưa có HS nào</span>}
          {members.map(m => {
            const active = assignedTo.includes(m.student_id)
            return (
              <button key={m.id} onClick={() => toggle(m.student_id)}
                className={`px-2 py-1 rounded-full text-[11px] font-bold transition ${
                  active ? 'bg-amber-500 text-white' : 'bg-muted/40 hover:bg-muted'
                }`}>
                {m.name || m.email}
              </button>
            )
          })}
        </div>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Ưu tiên">
          <select className="modal-input" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="low">Thấp</option><option value="medium">TB</option><option value="high">Cao</option>
          </select>
        </Field>
        <Field label="Điểm">
          <input type="number" min={0} className="modal-input" value={points} onChange={e => setPoints(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Hạn">
          <input type="date" className="modal-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </Field>
      </div>
      <ModalActions onClose={onClose}
        onSave={() => title.trim() && onSave({ title, description, assignedTo, priority, points, dueDate: dueDate || null })}
        saveDisabled={!title.trim()} />
    </Modal>
  )
}

function MilestoneFormModal({ milestone, onSave, onClose }: {
  milestone: Milestone | null; onSave: (payload: any) => void; onClose: () => void
}) {
  const [title, setTitle] = useState(milestone?.title || '')
  const [description, setDescription] = useState(milestone?.description || '')
  const [phaseOrder, setPhaseOrder] = useState(milestone?.phase_order ?? 0)
  const [dueDate, setDueDate] = useState(milestone?.due_date ? milestone.due_date.slice(0, 10) : '')
  const [maxScore, setMaxScore] = useState(milestone?.max_score || 10)
  const [criteria, setCriteria] = useState(Array.isArray(milestone?.criteria) && milestone?.criteria.length
    ? milestone.criteria.map((c: any) => typeof c === 'string' ? c : c.text || '').join('\n')
    : '')
  const [score, setScore] = useState<number | ''>(milestone?.score ?? '')
  const [evaluation, setEvaluation] = useState(milestone?.evaluation || '')
  const [status, setStatus] = useState(milestone?.status || 'pending')

  return (
    <Modal title={milestone ? 'Đánh giá phase' : 'Tạo phase mới'} onClose={onClose}>
      <Field label="Tên phase *">
        <input className="modal-input" value={title} onChange={e => setTitle(e.target.value)} />
      </Field>
      <Field label="Mô tả">
        <textarea className="modal-input resize-y" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <Field label="Criteria (mỗi tiêu chí 1 dòng)">
        <textarea className="modal-input resize-y font-mono text-xs" rows={4}
          value={criteria} onChange={e => setCriteria(e.target.value)}
          placeholder={'- Hoàn thành prototype\n- Báo cáo có đủ 5 phần\n- Demo hoạt động'} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Thứ tự">
          <input type="number" className="modal-input" value={phaseOrder} onChange={e => setPhaseOrder(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Điểm max">
          <input type="number" className="modal-input" value={maxScore} onChange={e => setMaxScore(Number(e.target.value) || 10)} />
        </Field>
        <Field label="Hạn">
          <input type="date" className="modal-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </Field>
      </div>
      {milestone && (
        <>
          <Field label="Trạng thái">
            <select className="modal-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="pending">Pending</option><option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Chấm điểm (0-${maxScore})`}>
              <input type="number" min={0} max={maxScore} step={0.5}
                className="modal-input" value={score}
                onChange={e => setScore(e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
            <Field label="Nhận xét đánh giá">
              <input className="modal-input" value={evaluation} onChange={e => setEvaluation(e.target.value)}
                placeholder="Tổng quan kết quả phase này..." />
            </Field>
          </div>
        </>
      )}
      <ModalActions onClose={onClose}
        onSave={() => title.trim() && onSave({
          title, description, phaseOrder, dueDate: dueDate || null, maxScore, status,
          criteria: criteria.split('\n').map(s => s.trim()).filter(Boolean),
          ...(milestone ? { score: score === '' ? undefined : score, evaluation } : {}),
        })}
        saveDisabled={!title.trim()} />
    </Modal>
  )
}

function LogFormModal({ tasks, onSave, onClose }: {
  tasks: Task[]; onSave: (payload: any) => void; onClose: () => void
}) {
  const [content, setContent] = useState('')
  const [hours, setHours] = useState(1)
  const [taskId, setTaskId] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  return (
    <Modal title="Ghi tiến trình hôm nay" onClose={onClose}>
      <Field label="Nội dung tiến trình *">
        <textarea className="modal-input resize-y" rows={4} value={content} onChange={e => setContent(e.target.value)}
          placeholder="VD: Hoàn thành prototype mạch điều khiển + test 3 sensor..."  autoFocus />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Ngày">
          <input type="date" className="modal-input" value={logDate} onChange={e => setLogDate(e.target.value)} />
        </Field>
        <Field label="Số giờ">
          <input type="number" min={0} step={0.5} className="modal-input" value={hours} onChange={e => setHours(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Nhiệm vụ liên quan">
          <select className="modal-input" value={taskId} onChange={e => setTaskId(e.target.value)}>
            <option value="">(không)</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title.slice(0, 30)}</option>)}
          </select>
        </Field>
      </div>
      <ModalActions onClose={onClose}
        onSave={() => content.trim() && onSave({ content, hoursSpent: hours, taskId: taskId || null, logDate })}
        saveDisabled={!content.trim()} />
    </Modal>
  )
}

function FeedbackFormModal({ target, onSave, onClose }: {
  target: { type: string; id: string | null; label: string }
  onSave: (payload: any) => void; onClose: () => void
}) {
  const [content, setContent] = useState('')
  const [rating, setRating] = useState<number | ''>('')
  const [feedbackType, setFeedbackType] = useState('suggestion')
  return (
    <Modal title={`Feedback: ${target.label}`} onClose={onClose}>
      <Field label="Nội dung feedback *">
        <textarea className="modal-input resize-y" rows={4} value={content} onChange={e => setContent(e.target.value)}
          autoFocus placeholder="Nhận xét về tiến độ, chất lượng, cải tiến..." />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Đánh giá (0-10, optional)">
          <input type="number" min={0} max={10} step={0.5} className="modal-input"
            value={rating} onChange={e => setRating(e.target.value === '' ? '' : Number(e.target.value))} />
        </Field>
        <Field label="Loại">
          <select className="modal-input" value={feedbackType} onChange={e => setFeedbackType(e.target.value)}>
            <option value="approval">Tán thành</option>
            <option value="suggestion">Gợi ý</option>
            <option value="warning">Cảnh báo</option>
            <option value="question">Câu hỏi</option>
          </select>
        </Field>
      </div>
      <ModalActions onClose={onClose}
        onSave={() => content.trim() && onSave({
          content, rating: rating === '' ? undefined : rating, feedbackType,
        })}
        saveDisabled={!content.trim()} />
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal primitives (shared)
// ─────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }: {
  title: string; children: React.ReactNode; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <style>{`.modal-input{width:100%;padding:8px 12px;border-radius:8px;background:rgba(127,127,127,0.1);border:1px solid var(--td-border,#2a2b3d);font-size:13px;outline:none}.modal-input:focus{border-color:#f59e0b}`}</style>
          {children}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

function ModalActions({ onClose, onSave, saveDisabled }: { onClose: () => void; onSave: () => void; saveDisabled?: boolean }) {
  return (
    <div className="flex gap-2 pt-3 border-t border-border">
      <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted text-sm font-bold">Huỷ</button>
      <button onClick={onSave} disabled={saveDisabled}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold disabled:opacity-50">
        <Send className="w-4 h-4" /> Lưu
      </button>
    </div>
  )
}
