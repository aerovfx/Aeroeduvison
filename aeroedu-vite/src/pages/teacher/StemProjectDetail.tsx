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
  Kanban, ChevronLeft, ChevronRight, Flame, Timer,
} from 'lucide-react'
import { api } from '@/services/api'
import {
  getSprintGoal, setSprintGoal as saveSprintGoal,
  getRetro, setRetro as saveRetro,
  getStandupsForSprint, addStandup as addStandupOverlay, deleteStandup as deleteStandupOverlay,
  getDefinitionOfDone, setDefinitionOfDone as saveDoD,
  getReviewNotes, setReviewNote as saveReviewNote,
  type SprintRetro, type DailyStandup,
} from '@/lib/stem-scrum-overlay'

interface Project {
  id: string; teacher_id: string; title: string; description: string | null;
  category: string; status: string; subject: string | null; grade: string | null;
  difficulty: string; created_at: string;
}
interface Member { id: string; student_id: string; name: string | null; email: string | null; image: string | null; joined_at: string; status?: string | null; user_linked?: boolean }
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

type Tab = 'overview' | 'scrum' | 'tasks' | 'logs' | 'feedback' | 'milestones'

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
            { key: 'scrum' as const, label: 'Scrum Board', icon: Kanban },
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
            milestones={milestones} isOwner={isOwner}
            projectId={id || ''} onReload={reload} />
        )}
        {tab === 'scrum' && (
          <ScrumTab
            tasks={tasks} members={members} milestones={milestones} project={project}
            isOwner={isOwner}
            projectId={id || ''}
            onMoveTask={async (taskId, newStatus) => {
              try { await api.patch(`/teacher/stem-projects/${id}/tasks/${taskId}`, { status: newStatus }); reload() }
              catch (e: any) { toast.error(e?.response?.data?.error || 'Lỗi') }
            }}
            onCreate={() => setTaskModal(true)}
          />
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
function OverviewTab({ members, logs, feedbacks, milestones, isOwner, projectId, onReload }: {
  members: Member[]; logs: Log[]; feedbacks: Feedback[]; milestones: Milestone[]; isOwner: boolean;
  projectId: string; onReload: () => void;
}) {
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualEmail, setManualEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const addManual = async () => {
    if (!manualEmail.trim() || adding) return
    setAdding(true)
    try {
      const { data } = await api.post<{ ok: boolean; message: string }>(
        `/teacher/stem-projects/${projectId}/members/manual`,
        { email: manualEmail.trim() }
      )
      toast.success(data.message)
      setManualEmail('')
      setShowAddManual(false)
      onReload()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Không thêm được HS')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Thành viên ({members.length})
          </h3>
          {isOwner && (
            <button
              onClick={() => setShowAddManual(!showAddManual)}
              className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
              title="Thêm HS thủ công bằng email (cho trường hợp QR/link không hoạt động)"
            >
              + Thêm HS bằng email
            </button>
          )}
        </div>

        {/* Manual add form */}
        {showAddManual && (
          <div className="mb-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
            <p className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-wider">
              📧 Add HS có sẵn tài khoản bằng email
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={manualEmail}
                onChange={e => setManualEmail(e.target.value)}
                placeholder="aerovfx@example.com"
                className="flex-1 px-2 py-1.5 rounded bg-background border border-border text-sm"
                onKeyDown={e => { if (e.key === 'Enter') addManual() }}
              />
              <button
                onClick={addManual}
                disabled={adding || !manualEmail.trim()}
                className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {adding ? 'Đang thêm…' : 'Thêm'}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Email phải khớp với tài khoản HS đã đăng ký inphysic.com
            </p>
          </div>
        )}

        {members.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground italic mb-2">Chưa có HS tham gia.</p>
            <p className="text-[10px] text-muted-foreground">
              HS có thể tham gia qua QR/link mời ở danh sách dự án,
              hoặc bấm "Thêm HS bằng email" phía trên.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {members.map(m => {
              const isLinked = m.user_linked !== false  // default true if undefined
              const isActive = !m.status || m.status === 'active'
              return (
                <div key={m.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isLinked && isActive ? 'bg-muted/30' : 'bg-amber-500/10 border border-amber-500/30'
                  }`}>
                  {m.image
                    ? <img src={m.image} className="w-8 h-8 rounded-full object-cover" />
                    : <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        isLinked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {(m.name || 'H')[0].toUpperCase()}
                      </div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1.5">
                      {m.name || `HS ${m.student_id.slice(0, 8)}`}
                      {!isLinked && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/30 text-amber-200" title="User row không tồn tại trong DB">
                          ⚠ Không tìm thấy User
                        </span>
                      )}
                      {!isActive && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-rose-500/30 text-rose-200">
                          {m.status}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.email || `id: ${m.student_id.slice(0, 16)}...`}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )
            })}
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

// ──────────────────────────────────────────────────────────────────
// ScrumTab — Agile Scrum board cho STEM project
//
// User: "đưa quản lí dự án chuẩn agile scrum cho Stem giáo viên"
//
// Components:
//   - Sprint header: tên + dates + progress + days remaining
//   - Kanban 4 cột: Backlog · To Do · In Progress · Done
//   - Sprint stats: velocity, story points, burndown chart
//   - Daily standup quick log
//
// Status mapping:
//   Backlog       — chưa có due_date hoặc cách >14 ngày
//   To Do (pending) — pending + due_date trong sprint
//   In Progress   — in-progress
//   Done          — completed
//
// Sprint duration: 14 ngày (Scrum standard)
// Story points = task.points (đã có trong schema)
// ──────────────────────────────────────────────────────────────────

type ScrumColumn = 'backlog' | 'todo' | 'in-progress' | 'done'

interface ScrumTabProps {
  tasks: Task[]
  members: Member[]
  milestones: Milestone[]
  project: Project
  isOwner: boolean
  onMoveTask: (taskId: string, newStatus: string) => Promise<void>
  onCreate: () => void
  projectId: string
}

function ScrumTab({ tasks, members, milestones, project, isOwner, onMoveTask, onCreate, projectId }: ScrumTabProps) {
  // ── Sprint calculation ──
  // Mỗi sprint = 14 ngày. Sprint 1 bắt đầu từ phase 1 milestone hoặc project created_at.
  const SPRINT_DAYS = 14
  const projectStart = milestones[0]?.due_date
    ? new Date(milestones[0].due_date).getTime() - (14 * 86400000)
    : Date.now() - (30 * 86400000)  // fallback: 30 ngày trước

  const daysSinceStart = Math.floor((Date.now() - projectStart) / 86400000)
  const currentSprintNum = Math.max(1, Math.floor(daysSinceStart / SPRINT_DAYS) + 1)
  const [viewSprintNum, setViewSprintNum] = useState(currentSprintNum)

  const sprintStart = new Date(projectStart + (viewSprintNum - 1) * SPRINT_DAYS * 86400000)
  const sprintEnd = new Date(sprintStart.getTime() + SPRINT_DAYS * 86400000)
  const daysRemaining = Math.max(0, Math.ceil((sprintEnd.getTime() - Date.now()) / 86400000))
  const sprintProgress = Math.min(100, Math.max(0,
    ((Date.now() - sprintStart.getTime()) / (SPRINT_DAYS * 86400000)) * 100
  ))
  const isCurrentSprint = viewSprintNum === currentSprintNum

  // ── Map tasks vào columns ──
  const columns: Record<ScrumColumn, Task[]> = { backlog: [], todo: [], 'in-progress': [], done: [] }
  for (const t of tasks) {
    if (t.status === 'completed') {
      columns.done.push(t)
    } else if (t.status === 'in-progress') {
      columns['in-progress'].push(t)
    } else if (t.due_date) {
      const dueT = new Date(t.due_date).getTime()
      if (dueT >= sprintStart.getTime() && dueT <= sprintEnd.getTime()) {
        columns.todo.push(t)
      } else {
        columns.backlog.push(t)
      }
    } else {
      columns.backlog.push(t)
    }
  }

  // ── Sprint stats ──
  const sprintTasks = [...columns.todo, ...columns['in-progress'], ...columns.done]
  const totalPoints = sprintTasks.reduce((s, t) => s + (t.points || 1), 0)
  const completedPoints = columns.done.reduce((s, t) => s + (t.points || 1), 0)
  const velocityPercent = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0

  // ── Burndown calculation ──
  // Ideal: linear from totalPoints → 0 over SPRINT_DAYS
  // Actual: at each day, remaining = totalPoints - sum(completed tasks completed_at <= day)
  const burndownData: { day: number; ideal: number; actual: number | null }[] = []
  for (let d = 0; d <= SPRINT_DAYS; d++) {
    const ideal = totalPoints - (totalPoints * d / SPRINT_DAYS)
    const dayT = sprintStart.getTime() + d * 86400000
    let actual: number | null = totalPoints
    if (dayT > Date.now()) actual = null  // future
    else {
      const doneByThen = sprintTasks
        .filter(t => t.completed_at && new Date(t.completed_at).getTime() <= dayT)
        .reduce((s, t) => s + (t.points || 1), 0)
      actual = totalPoints - doneByThen
    }
    burndownData.push({ day: d, ideal, actual })
  }

  // ── Drag-drop column move ──
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const handleDragStart = (taskId: string) => setDraggedId(taskId)
  const handleDrop = async (col: ScrumColumn) => {
    if (!draggedId) return
    const statusMap: Record<ScrumColumn, string> = {
      backlog: 'pending', todo: 'pending', 'in-progress': 'in-progress', done: 'completed',
    }
    await onMoveTask(draggedId, statusMap[col])
    setDraggedId(null)
  }

  // ── Column meta ──
  const COL_META: Record<ScrumColumn, { label: string; color: string; bg: string; icon: any }> = {
    backlog:       { label: 'Backlog',       color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', icon: Circle },
    todo:          { label: 'To Do',         color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  icon: Circle },
    'in-progress': { label: 'In Progress',   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  icon: Activity },
    done:          { label: 'Done',          color: '#34d399', bg: 'rgba(52,211,153,0.08)',  icon: CheckCircle2 },
  }

  return (
    <div className="space-y-4">
      {/* ── Sprint header ── */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-purple-500/10 border border-amber-500/20 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewSprintNum(n => Math.max(1, n - 1))}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30"
              disabled={viewSprintNum <= 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Sprint {viewSprintNum}
                {isCurrentSprint && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    HIỆN TẠI
                  </span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {sprintStart.toLocaleDateString('vi-VN')} → {sprintEnd.toLocaleDateString('vi-VN')}
              </p>
            </div>
            <button onClick={() => setViewSprintNum(n => n + 1)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCurrentSprint && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                Còn {daysRemaining} ngày
              </div>
            )}
            {isOwner && (
              <button onClick={onCreate}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Thêm task
              </button>
            )}
          </div>
        </div>

        {/* Sprint progress bar */}
        <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
            style={{ width: `${sprintProgress}%` }} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="rounded-lg bg-white/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Points</div>
            <div className="text-xl font-bold text-amber-300">{totalPoints}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Completed</div>
            <div className="text-xl font-bold text-emerald-300">{completedPoints}</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Velocity</div>
            <div className="text-xl font-bold text-cyan-300">{velocityPercent}%</div>
          </div>
          <div className="rounded-lg bg-white/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tasks</div>
            <div className="text-xl font-bold text-purple-300">{sprintTasks.length}</div>
          </div>
        </div>
      </div>

      {/* ── Kanban board ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(['backlog', 'todo', 'in-progress', 'done'] as ScrumColumn[]).map(col => {
          const meta = COL_META[col]
          const colTasks = columns[col]
          return (
            <div key={col}
              className="rounded-xl p-3 min-h-[200px]"
              style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col)}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b" style={{ borderColor: `${meta.color}20` }}>
                <div className="flex items-center gap-1.5">
                  <meta.icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-4">Trống</p>
                ) : (
                  colTasks.map(t => {
                    const assignedMembers = members.filter(m => t.assigned_to?.includes(m.student_id))
                    return (
                      <div key={t.id}
                        draggable={isOwner}
                        onDragStart={() => handleDragStart(t.id)}
                        className={`rounded-lg bg-card border border-border p-2.5 cursor-${isOwner ? 'grab' : 'default'} active:cursor-grabbing hover:shadow-md transition-shadow ${draggedId === t.id ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-xs font-bold leading-tight flex-1">{t.title}</p>
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold flex-shrink-0"
                            style={{
                              background: t.priority === 'high' ? 'rgba(239,68,68,0.2)' : t.priority === 'medium' ? 'rgba(251,191,36,0.2)' : 'rgba(148,163,184,0.2)',
                              color: t.priority === 'high' ? '#fca5a5' : t.priority === 'medium' ? '#fcd34d' : '#cbd5e1',
                            }}>
                            {t.priority?.toUpperCase()}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{t.description}</p>
                        )}
                        <div className="flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" style={{ color: meta.color }} />
                            <span className="font-bold tabular-nums" style={{ color: meta.color }}>{t.points || 1} SP</span>
                          </div>
                          {t.due_date && (
                            <span className="text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(t.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {assignedMembers.length > 0 && (
                            <div className="flex -space-x-1">
                              {assignedMembers.slice(0, 3).map(m => (
                                <div key={m.id}
                                  className="w-4 h-4 rounded-full bg-emerald-500/30 border border-card text-[8px] flex items-center justify-center font-bold text-emerald-200"
                                  title={m.name || ''}>
                                  {(m.name || '?')[0].toUpperCase()}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Burndown chart ── */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            Burndown Chart · Sprint {viewSprintNum}
          </h3>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-cyan-500" />
              Lý tưởng
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-amber-500" />
              Thực tế
            </span>
          </div>
        </div>

        <svg viewBox="0 0 600 200" className="w-full h-40" preserveAspectRatio="none">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line key={p} x1="40" y1={20 + p * 160} x2="590" y2={20 + p * 160}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          {/* Y axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <text key={p} x="35" y={20 + p * 160 + 4} fill="rgba(255,255,255,0.4)"
              fontSize="10" textAnchor="end">
              {Math.round(totalPoints * (1 - p))}
            </text>
          ))}
          {/* X axis labels */}
          {[0, 7, 14].map(d => (
            <text key={d} x={40 + (d / SPRINT_DAYS) * 550} y="195"
              fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="middle">
              D{d}
            </text>
          ))}
          {/* Ideal line */}
          {totalPoints > 0 && (
            <polyline
              points={burndownData.map(p => `${40 + (p.day / SPRINT_DAYS) * 550},${20 + (1 - p.ideal / totalPoints) * 160}`).join(' ')}
              fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4,4"
            />
          )}
          {/* Actual line */}
          {totalPoints > 0 && (
            <polyline
              points={burndownData
                .filter(p => p.actual !== null)
                .map(p => `${40 + (p.day / SPRINT_DAYS) * 550},${20 + (1 - (p.actual as number) / totalPoints) * 160}`)
                .join(' ')}
              fill="none" stroke="#fbbf24" strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' }}
            />
          )}
          {/* Today marker */}
          {isCurrentSprint && (
            <line
              x1={40 + (daysSinceStart % SPRINT_DAYS / SPRINT_DAYS) * 550}
              y1="20"
              x2={40 + (daysSinceStart % SPRINT_DAYS / SPRINT_DAYS) * 550}
              y2="180"
              stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2"
            />
          )}
        </svg>

        <p className="mt-2 text-[10px] text-muted-foreground italic">
          💡 Đường thực tế nằm dưới đường lý tưởng = sprint đang trễ.
          Nằm trên = đang đi nhanh hơn kế hoạch.
        </p>
      </div>

      {/* ── Sprint Goal — Scrum essential ── */}
      <SprintGoalSection
        projectId={projectId}
        sprintNumber={viewSprintNum}
        isCurrentSprint={isCurrentSprint}
        isOwner={isOwner}
      />

      {/* ── Daily Standup — actual interactive form ── */}
      <DailyStandupSection
        projectId={projectId}
        sprintNumber={viewSprintNum}
        isCurrentSprint={isCurrentSprint}
        members={members}
      />

      {/* ── Sprint Review notes (chỉ hiện cho sprint đã qua hoặc đang chạy) ── */}
      {viewSprintNum < currentSprintNum && (
        <SprintReviewSection
          projectId={projectId}
          sprintNumber={viewSprintNum}
          totalPoints={totalPoints}
          completedPoints={completedPoints}
          isOwner={isOwner}
        />
      )}

      {/* ── Retrospective — chỉ cho sprint đã qua ── */}
      {viewSprintNum < currentSprintNum && (
        <RetrospectiveSection
          projectId={projectId}
          sprintNumber={viewSprintNum}
          isOwner={isOwner}
        />
      )}

      {/* ── Definition of Done — project-wide checklist ── */}
      <DefinitionOfDoneSection projectId={projectId} isOwner={isOwner} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Scrum essentials: Goal, Standup, Retro, DoD, Review
// (Lưu localStorage qua stem-scrum-overlay.ts — BE chưa persist các metadata
//  này, nhưng UX phong phú cho GV vẫn cần)
// ──────────────────────────────────────────────────────────────────

function SprintGoalSection({ projectId, sprintNumber, isCurrentSprint, isOwner }: {
  projectId: string; sprintNumber: number; isCurrentSprint: boolean; isOwner: boolean
}) {
  const [goal, setGoalState] = useState(getSprintGoal(projectId, sprintNumber))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(goal)

  useEffect(() => {
    setGoalState(getSprintGoal(projectId, sprintNumber))
    setDraft(getSprintGoal(projectId, sprintNumber))
    setEditing(false)
  }, [projectId, sprintNumber])

  const handleSave = () => {
    saveSprintGoal(projectId, sprintNumber, draft)
    setGoalState(draft.trim())
    setEditing(false)
    toast.success('Đã lưu sprint goal')
  }

  return (
    <div className="rounded-2xl bg-purple-500/5 border border-purple-500/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
          <Target className="w-4 h-4" />
          🎯 Sprint Goal · Sprint {sprintNumber}
          {isCurrentSprint && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">ACTIVE</span>}
        </h4>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-purple-300 hover:text-purple-200 underline">
            {goal ? 'Sửa' : 'Đặt goal'}
          </button>
        )}
      </div>
      {!editing ? (
        goal ? (
          <p className="text-sm text-foreground/90 italic leading-relaxed">"{goal}"</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Chưa đặt mục tiêu cho sprint này. VD: "Hoàn thành prototype mạch cảm biến + demo cho lớp."
          </p>
        )
      ) : (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="VD: Sprint này sẽ giao 1 sản phẩm cụ thể — prototype cảm biến PM2.5 chạy được + báo cáo demo"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:border-purple-500/40 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded">
              Lưu goal
            </button>
            <button onClick={() => { setDraft(goal); setEditing(false) }}
              className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-xs rounded">
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DailyStandupSection({ projectId, sprintNumber, isCurrentSprint, members }: {
  projectId: string; sprintNumber: number; isCurrentSprint: boolean; members: Member[]
}) {
  const [standups, setStandupsState] = useState<DailyStandup[]>(() =>
    getStandupsForSprint(projectId, sprintNumber))
  const [open, setOpen] = useState(false)
  const [author, setAuthor] = useState('')
  const [yesterday, setYesterday] = useState('')
  const [today, setToday] = useState('')
  const [blockers, setBlockers] = useState('')

  useEffect(() => {
    setStandupsState(getStandupsForSprint(projectId, sprintNumber))
  }, [projectId, sprintNumber])

  const refresh = () => setStandupsState(getStandupsForSprint(projectId, sprintNumber))

  const handleAdd = () => {
    if (!author.trim() || !today.trim()) {
      toast.error('Cần tên + "Hôm nay làm gì"')
      return
    }
    addStandupOverlay(projectId, {
      sprintNumber,
      date: new Date().toISOString().slice(0, 10),
      author: author.trim(),
      yesterday: yesterday.trim(),
      today: today.trim(),
      blockers: blockers.trim(),
    })
    setYesterday(''); setToday(''); setBlockers('')
    refresh()
    toast.success('Đã ghi nhận standup')
  }

  return (
    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
      <button onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/[0.03] transition rounded-2xl">
        <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
          <span className="text-base">☕</span>
          Daily Standup ({standups.length})
          {isCurrentSprint && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">SPRINT HIỆN TẠI</span>}
        </h4>
        {open
          ? <ChevronLeft className="w-4 h-4 rotate-90 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 rotate-90 text-muted-foreground" />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          {isCurrentSprint && (
            <div className="rounded-lg bg-card border border-border p-3 space-y-2">
              <input
                value={author} onChange={(e) => setAuthor(e.target.value)}
                placeholder="Tên (VD: Bạn An / Cô Hương)"
                list="members-dl"
                className="w-full px-2.5 py-1.5 text-sm bg-background border border-border rounded outline-none focus:border-emerald-500/40"
              />
              <datalist id="members-dl">
                {members.map((m) => <option key={m.id} value={m.name || ''} />)}
              </datalist>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <textarea
                  value={yesterday} onChange={(e) => setYesterday(e.target.value)}
                  placeholder="🟢 Hôm qua đã làm..." rows={2}
                  className="px-2 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-emerald-500/40 resize-none"
                />
                <textarea
                  value={today} onChange={(e) => setToday(e.target.value)}
                  placeholder="🎯 Hôm nay sẽ làm... *" rows={2}
                  className="px-2 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-emerald-500/40 resize-none"
                />
                <textarea
                  value={blockers} onChange={(e) => setBlockers(e.target.value)}
                  placeholder="🚧 Đang bị kẹt..." rows={2}
                  className="px-2 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-emerald-500/40 resize-none"
                />
              </div>
              <button onClick={handleAdd}
                className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Ghi standup hôm nay
              </button>
            </div>
          )}

          {standups.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              {isCurrentSprint ? 'Chưa có standup nào trong sprint này' : 'Sprint này không có standup ghi nhận'}
            </p>
          ) : (
            <div className="space-y-2">
              {standups.slice(0, 15).map((s) => (
                <div key={s.id} className="rounded-lg bg-card border border-border p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-bold">
                      <span>{s.author}</span>
                      <span className="text-muted-foreground ml-2 font-normal">
                        · {new Date(s.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <button onClick={() => { deleteStandupOverlay(projectId, s.id); refresh() }}
                      className="text-rose-400/60 hover:text-rose-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    {s.yesterday && (
                      <div>
                        <div className="text-emerald-300/70 font-bold mb-0.5">🟢 Hôm qua</div>
                        <div className="text-muted-foreground">{s.yesterday}</div>
                      </div>
                    )}
                    {s.today && (
                      <div>
                        <div className="text-blue-300/70 font-bold mb-0.5">🎯 Hôm nay</div>
                        <div className="text-muted-foreground">{s.today}</div>
                      </div>
                    )}
                    {s.blockers && (
                      <div>
                        <div className="text-rose-300/70 font-bold mb-0.5">🚧 Kẹt ở</div>
                        <div className="text-muted-foreground">{s.blockers}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SprintReviewSection({ projectId, sprintNumber, totalPoints, completedPoints, isOwner }: {
  projectId: string; sprintNumber: number; totalPoints: number; completedPoints: number; isOwner: boolean
}) {
  const [note, setNote] = useState(() => getReviewNotes(projectId)[sprintNumber] || '')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    setNote(getReviewNotes(projectId)[sprintNumber] || '')
    setEditing(false)
  }, [projectId, sprintNumber])

  const handleSave = () => {
    saveReviewNote(projectId, sprintNumber, note)
    setEditing(false)
    toast.success('Đã lưu sprint review')
  }

  return (
    <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
          <Send className="w-4 h-4" />
          🎤 Sprint Review · Sprint {sprintNumber}
        </h4>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-300 hover:text-blue-200 underline">
            {note ? 'Sửa' : 'Viết review'}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Đã bàn giao {completedPoints}/{totalPoints} story points
        {totalPoints > 0 && ` (${Math.round((completedPoints / totalPoints) * 100)}%)`}
      </p>
      {!editing ? (
        note ? (
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{note}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">Chưa có review — ghi tóm tắt demo & sản phẩm bàn giao</p>
        )
      ) : (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Demo trước lớp ngày 25/05. Sản phẩm: prototype cảm biến + báo cáo + video. Phản hồi GV: positivE, gợi ý thêm app mobile."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-card border border-border rounded-lg outline-none focus:border-blue-500/40 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded">
              Lưu review
            </button>
            <button onClick={() => setEditing(false)}
              className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-xs rounded">
              Huỷ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RetrospectiveSection({ projectId, sprintNumber, isOwner }: {
  projectId: string; sprintNumber: number; isOwner: boolean
}) {
  const [retro, setRetroState] = useState<SprintRetro>(() => getRetro(projectId, sprintNumber))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setRetroState(getRetro(projectId, sprintNumber))
    setExpanded(false)
  }, [projectId, sprintNumber])

  const total = retro.wentWell.length + retro.didNotGoWell.length + retro.improvements.length

  const addItem = (key: keyof SprintRetro, v: string) => {
    if (!v.trim()) return
    const next = { ...retro, [key]: [...retro[key], v.trim()] }
    setRetroState(next)
    saveRetro(projectId, sprintNumber, next)
  }
  const removeItem = (key: keyof SprintRetro, i: number) => {
    const next = { ...retro, [key]: retro[key].filter((_, j) => j !== i) }
    setRetroState(next)
    saveRetro(projectId, sprintNumber, next)
  }

  return (
    <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-amber-500/[0.03] transition rounded-2xl">
        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          🔍 Retrospective · Sprint {sprintNumber}
          <span className="text-[10px] font-normal text-muted-foreground">
            ({total > 0 ? `${total} điểm reflect` : 'chưa retro'})
          </span>
        </h4>
        {expanded
          ? <ChevronLeft className="w-4 h-4 rotate-90 text-muted-foreground" />
          : <ChevronRight className="w-4 h-4 rotate-90 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-3 gap-3">
          <RetroCol title="🟢 Đi tốt" color="emerald" items={retro.wentWell} canEdit={isOwner}
            onAdd={(v) => addItem('wentWell', v)} onRemove={(i) => removeItem('wentWell', i)} />
          <RetroCol title="🔴 Chưa tốt" color="rose" items={retro.didNotGoWell} canEdit={isOwner}
            onAdd={(v) => addItem('didNotGoWell', v)} onRemove={(i) => removeItem('didNotGoWell', i)} />
          <RetroCol title="🟡 Cải thiện sprint tới" color="amber" items={retro.improvements} canEdit={isOwner}
            onAdd={(v) => addItem('improvements', v)} onRemove={(i) => removeItem('improvements', i)} />
        </div>
      )}
    </div>
  )
}

function RetroCol({ title, color, items, canEdit, onAdd, onRemove }: {
  title: string; color: 'emerald' | 'rose' | 'amber'
  items: string[]; canEdit: boolean
  onAdd: (v: string) => void; onRemove: (i: number) => void
}) {
  const [input, setInput] = useState('')
  const map = {
    emerald: { bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/20', text: 'text-emerald-300' },
    rose: { bg: 'bg-rose-500/[0.06]', border: 'border-rose-500/20', text: 'text-rose-300' },
    amber: { bg: 'bg-amber-500/[0.06]', border: 'border-amber-500/20', text: 'text-amber-300' },
  }[color]
  return (
    <div className={`rounded-lg ${map.bg} border ${map.border} p-3`}>
      <h5 className={`text-xs font-bold ${map.text} mb-2`}>{title}</h5>
      <div className="space-y-1 mb-2">
        {items.length === 0 && <div className="text-[11px] text-muted-foreground italic">(chưa có)</div>}
        {items.map((it, i) => (
          <div key={i} className="text-[11px] text-foreground/85 bg-card rounded p-2 flex items-start gap-2 border border-border">
            <span className="flex-1">{it}</span>
            {canEdit && (
              <button onClick={() => onRemove(i)} className="text-rose-400/60 hover:text-rose-400 shrink-0">
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim()) { onAdd(input); setInput('') }
            }}
            placeholder="+ thêm"
            className="flex-1 px-2 py-1 text-[11px] bg-card border border-border rounded outline-none focus:border-foreground/30"
          />
          <button
            onClick={() => { if (input.trim()) { onAdd(input); setInput('') } }}
            className="px-2 py-1 text-[11px] bg-white/[0.06] hover:bg-white/[0.1] rounded">+</button>
        </div>
      )}
    </div>
  )
}

function DefinitionOfDoneSection({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [items, setItems] = useState<string[]>(() => getDefinitionOfDone(projectId))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string[]>(items)
  const [newItem, setNewItem] = useState('')

  useEffect(() => {
    setItems(getDefinitionOfDone(projectId))
    setEditing(false)
  }, [projectId])

  const handleSave = () => {
    const cleaned = draft.filter((x) => x.trim())
    saveDoD(projectId, cleaned)
    setItems(cleaned)
    setEditing(false)
    toast.success('Đã lưu Definition of Done')
  }

  if (!editing) {
    return (
      <div className="rounded-2xl bg-cyan-500/5 border border-cyan-500/20 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            ✅ Definition of Done ({items.length})
          </h4>
          {isOwner && (
            <button onClick={() => { setDraft(items); setEditing(true) }} className="text-xs text-cyan-300 hover:text-cyan-200 underline">
              {items.length ? 'Sửa' : 'Đặt DoD'}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Chưa định nghĩa "Done". Checklist áp dụng cho mọi task: VD code review xong · có demo · merge code · test pass · GV duyệt.
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((it, i) => (
              <li key={i} className="text-xs text-foreground/85 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-cyan-500/5 border-2 border-cyan-500/30 p-4">
      <h4 className="text-sm font-bold text-cyan-300 mb-3 flex items-center gap-2">
        <Edit3 className="w-4 h-4" /> Sửa Definition of Done
      </h4>
      <div className="space-y-2 mb-3">
        {draft.map((it, i) => (
          <div key={i} className="flex items-center gap-2 bg-card rounded p-2 border border-border">
            <input
              value={it}
              onChange={(e) => {
                const n = [...draft]; n[i] = e.target.value; setDraft(n)
              }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={() => setDraft(draft.filter((_, j) => j !== i))}
              className="text-rose-400/60 hover:text-rose-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-3">
        <input
          value={newItem} onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newItem.trim()) {
              setDraft([...draft, newItem.trim()]); setNewItem('')
            }
          }}
          placeholder="+ Thêm tiêu chí (VD: Code review xong · có demo)"
          className="flex-1 px-2 py-1.5 text-sm bg-card border border-border rounded outline-none focus:border-cyan-500/40"
        />
        <button
          onClick={() => { if (newItem.trim()) { setDraft([...draft, newItem.trim()]); setNewItem('') } }}
          className="px-3 py-1.5 text-xs bg-white/[0.06] hover:bg-white/[0.1] rounded">
          + Thêm
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave}
          className="flex-1 py-2 text-sm font-bold bg-cyan-500 hover:bg-cyan-600 text-white rounded flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Lưu DoD
        </button>
        <button onClick={() => setEditing(false)}
          className="px-4 py-2 text-sm bg-white/[0.06] hover:bg-white/[0.1] rounded">
          Huỷ
        </button>
      </div>
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
