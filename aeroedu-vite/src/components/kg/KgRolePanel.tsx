/**
 * KgRolePanel — Bộ não cá nhân theo role.
 *
 * 3 workflow rõ ràng:
 *  - HS: học tập dựa vào KG (tab "Học từ KG" → mỗi node trả chapters + questions)
 *  - GV: theo dõi học sinh qua KG (tab "Lớp tôi" → drill-down + gửi recommendation)
 *  - Admin: lưu lại quy trình làm việc (tab "Quy trình" → recorder Start/Stop)
 *
 * Tab "Bộ não tôi" giữ cho mọi role để add custom node + xem recommendations
 * từ giáo viên (cho HS) hoặc workflows mình đã tạo.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Brain, Plus, X, Loader2, GraduationCap, Briefcase, Shield,
  Sparkles, Users, AlertTriangle, Workflow, Trash2, Send,
  Circle, Square, Play, BookOpen, FileQuestion, ChevronRight, Bell,
} from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'react-hot-toast'

interface RoleContext {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  userId: string
  name: string | null
  email: string | null
  stats: { visited: number; customNodes: number; workflows: number }
  capabilities: {
    canAddCustomNode: boolean
    canEditPublicNodes: boolean
    canViewAllUsers: boolean
    canManageWorkflows: boolean
    canSeeClassMastery: boolean
    canRecommendNodes?: boolean
    canSeeLearnPanel?: boolean
  }
}

interface CustomNode {
  id: string
  userId: string
  userRole: string
  type: string
  label: string
  description: string | null
  visibility: 'private' | 'class' | 'public'
  createdAt: string
}

interface ClassMasteryNode {
  id: string
  type: string
  label: string
  studentCount: number
  avgScore: number | null
  weakCount: number
}

interface WorkflowItem {
  id: string
  title: string
  description: string | null
  steps: any[]
  tags: string[]
  createdAt: string
}

interface Recommendation {
  id: string
  nodeId: string
  nodeLabel: string | null
  nodeType: string | null
  note: string | null
  status: 'pending' | 'acknowledged' | 'dismissed'
  createdAt: string
  teacherName: string | null
  teacherImage: string | null
}

const ROLE_CONFIG = {
  STUDENT: { icon: GraduationCap, label: 'Học sinh', accent: '#22d3ee', tagline: 'Học tập qua cây tri thức' },
  TEACHER: { icon: Briefcase, label: 'Giáo viên', accent: '#a78bfa', tagline: 'Theo dõi học sinh + tài liệu giảng dạy' },
  ADMIN:   { icon: Shield, label: 'Admin', accent: '#fbbf24', tagline: 'Quản lý quy trình + KG toàn hệ thống' },
} as const

interface Props {
  /** Click node trong list → focus về node đó trong graph */
  onNodeClick?: (id: string) => void
  /** Course ID nếu có (cho teacher xem mastery của lớp) */
  courseId?: string
  /** Node hiện đang focus (cho HS "Học từ KG" panel) */
  currentNodeId?: string | null
}

export default function KgRolePanel({ onNodeClick, courseId, currentNodeId }: Props) {
  const [ctx, setCtx] = useState<RoleContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mine' | 'learn' | 'class' | 'workflows'>('mine')
  const [showAddModal, setShowAddModal] = useState(false)
  const [unreadRecs, setUnreadRecs] = useState(0)

  // ── Load context + recommendations badge ──
  const reloadCtx = useCallback(() => {
    api.get<RoleContext>('/kg/role-context')
      .then(r => { setCtx(r.data) })
      .catch(() => setCtx(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { reloadCtx() }, [reloadCtx])

  useEffect(() => {
    if (ctx?.role === 'STUDENT') {
      api.get<{ unreadCount: number }>('/kg/student/recommendations')
        .then(r => setUnreadRecs(r.data.unreadCount || 0))
        .catch(() => setUnreadRecs(0))
    }
  }, [ctx?.role])

  // STUDENT: auto-switch sang Learn tab khi click 1 node mới
  useEffect(() => {
    if (currentNodeId && ctx?.capabilities.canSeeLearnPanel) {
      setActiveTab('learn')
    }
  }, [currentNodeId, ctx?.capabilities.canSeeLearnPanel])

  if (loading) {
    return (
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-4 text-center">
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" />
        <p className="text-[10px] text-zinc-500 mt-2">Đang tải bộ não…</p>
      </div>
    )
  }
  if (!ctx) {
    return (
      <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 p-3 text-center">
        <p className="text-[11px] text-zinc-500">Cần đăng nhập để xem bộ não của bạn</p>
      </div>
    )
  }

  const cfg = ROLE_CONFIG[ctx.role]
  const RoleIcon = cfg.icon

  // Tabs theo role — mỗi role có flow riêng
  const tabs: Array<{ id: 'mine' | 'learn' | 'class' | 'workflows'; label: string; icon: any; badge?: number }> = [
    { id: 'mine', label: 'Bộ não tôi', icon: Brain, badge: unreadRecs > 0 ? unreadRecs : undefined },
  ]
  if (ctx.capabilities.canSeeLearnPanel) tabs.push({ id: 'learn', label: 'Học từ KG', icon: BookOpen })
  if (ctx.capabilities.canSeeClassMastery) tabs.push({ id: 'class', label: 'Lớp tôi', icon: Users })
  if (ctx.capabilities.canManageWorkflows) tabs.push({ id: 'workflows', label: 'Quy trình', icon: Workflow })

  return (
    <div className="bg-zinc-900/60 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header: role badge */}
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2"
           style={{ background: `linear-gradient(90deg, ${cfg.accent}15, transparent)` }}>
        <div className="p-1.5 rounded-md" style={{ background: `${cfg.accent}25` }}>
          <RoleIcon className="w-4 h-4" style={{ color: cfg.accent }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-zinc-100 truncate">
            {cfg.label} · {ctx.name || ctx.email}
          </h3>
          <p className="text-[9px] text-zinc-500 leading-tight">{cfg.tagline}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          title="Thêm node vào bộ não tôi"
          className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/10"
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-zinc-800/50 text-center">
        <Stat label="Đã thăm" value={ctx.stats.visited} accent={cfg.accent} />
        <Stat label="Note tôi" value={ctx.stats.customNodes} accent={cfg.accent} />
        <Stat label="Quy trình" value={ctx.stats.workflows} accent={cfg.accent} />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-800 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{ touchAction: 'manipulation', minHeight: 44,
                ...(active ? { borderColor: cfg.accent, color: cfg.accent } : {}) }}
              className={`flex-1 min-w-fit px-2 py-1.5 text-[10px] font-bold inline-flex items-center justify-center gap-1 transition relative ${
                active ? 'bg-zinc-900/80 border-b-2' : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent'
              }`}
            >
              <Icon className="w-3 h-3" /> {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'mine' && (
        <MineTab
          role={ctx.role}
          onNodeClick={onNodeClick}
          accent={cfg.accent}
          onAck={() => setUnreadRecs(c => Math.max(0, c - 1))}
        />
      )}
      {activeTab === 'learn' && (
        <LearnTab
          currentNodeId={currentNodeId}
          onNodeClick={onNodeClick}
          accent={cfg.accent}
        />
      )}
      {activeTab === 'class' && (
        <ClassTab
          onNodeClick={onNodeClick}
          accent={cfg.accent}
          currentNodeId={currentNodeId}
        />
      )}
      {activeTab === 'workflows' && (
        <WorkflowsTab accent={cfg.accent} onReplay={onNodeClick} onChange={reloadCtx} />
      )}

      {/* Add Node modal */}
      {showAddModal && (
        <AddNodeModal
          role={ctx.role}
          courseId={courseId}
          parentNodeId={currentNodeId || undefined}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            reloadCtx()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-zinc-950/60 py-1.5 px-1">
      <div className="text-sm font-bold" style={{ color: accent }}>{value}</div>
      <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

/* ──────────────── Mine tab — custom nodes + (HS) recommendations from teacher ──────────────── */

function MineTab({ role, onNodeClick, accent, onAck }: {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  onNodeClick?: (id: string) => void
  accent: string
  onAck: () => void
}) {
  const [items, setItems] = useState<CustomNode[]>([])
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const tasks: Promise<any>[] = [
      api.get<{ items: CustomNode[] }>('/kg/custom-nodes')
        .then(r => setItems(r.data.items || []))
        .catch(() => setItems([])),
    ]
    if (role === 'STUDENT') {
      tasks.push(
        api.get<{ items: Recommendation[] }>('/kg/student/recommendations')
          .then(r => setRecs(r.data.items || []))
          .catch(() => setRecs([]))
      )
    }
    Promise.all(tasks).finally(() => setLoading(false))
  }, [role])
  useEffect(() => { load() }, [load])

  const handleDelete = (id: string) => {
    if (!confirm('Xoá node này khỏi bộ não tôi?')) return
    api.delete(`/kg/custom-nodes/${id}`).then(() => {
      toast.success('Đã xoá')
      load()
    })
  }

  const handleAckRec = (id: string, nodeId: string) => {
    api.post(`/kg/student/recommendations/${id}/ack`).then(() => {
      onAck()
      setRecs(rs => rs.map(r => r.id === id ? { ...r, status: 'acknowledged' as const } : r))
      onNodeClick?.(nodeId)
    })
  }

  if (loading) return <div className="p-3 text-center text-[10px] text-zinc-500">Đang tải…</div>

  return (
    <div className="max-h-72 overflow-y-auto">
      {/* HS: Recommendations từ giáo viên (highlight nếu unread) */}
      {role === 'STUDENT' && recs.length > 0 && (
        <div className="px-3 py-2 bg-cyan-500/10 border-b border-cyan-500/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Bell className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              GV gợi ý ({recs.filter(r => r.status === 'pending').length} mới)
            </span>
          </div>
          {recs.slice(0, 5).map(r => (
            <button
              key={r.id}
              onClick={() => handleAckRec(r.id, r.nodeId)}
              className={`w-full text-left p-1.5 rounded text-[10px] flex items-start gap-2 transition ${
                r.status === 'pending' ? 'bg-cyan-500/10 hover:bg-cyan-500/20' : 'hover:bg-white/5 opacity-60'
              }`}
            >
              {r.status === 'pending' && <Circle className="w-2 h-2 fill-cyan-400 text-cyan-400 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-100 truncate">{r.nodeLabel || r.nodeId}</div>
                {r.note && <p className="text-zinc-400 line-clamp-2 mt-0.5 italic">"{r.note}"</p>}
                <p className="text-zinc-500 text-[9px] mt-0.5">— {r.teacherName || 'GV'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom nodes của user */}
      {items.length === 0 ? (
        <p className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
          Chưa có node cá nhân nào — bấm <Plus className="inline w-3 h-3" /> để thêm
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60">
          {items.map(item => (
            <div key={item.id} className="px-3 py-2 hover:bg-zinc-800/40 group flex items-start gap-2">
              <span className="text-[9px] mt-0.5 font-mono shrink-0" style={{ color: accent }}>
                {item.type.slice(0, 4).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-100 truncate">{item.label}</div>
                {item.description && (
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{item.description}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                    item.visibility === 'public' ? 'bg-emerald-500/20 text-emerald-300'
                    : item.visibility === 'class' ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-zinc-700/40 text-zinc-400'
                  }`}>
                    {item.visibility === 'public' ? '🌍 Công khai'
                      : item.visibility === 'class' ? '👥 Lớp'
                      : '🔒 Riêng'}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition"
                title="Xoá"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────── Learn tab — HS học từ KG (mỗi node → chapters + questions + prereq) ──────────────── */

interface LearnPayload {
  node: { id: string; type: string; label: string; description: string | null }
  mastery: { score: number; attempts: number; level: string }
  chapters: Array<{ id: string; title: string; courseId: string; courseTitle: string | null; duration: number | null }>
  questions: Array<{ id: string; topic: string; questionType: string; difficulty: string; content: string }>
  prereqNodes: Array<{ id: string; label: string; type: string; masteryScore: number; isWeak: boolean }>
  nextNodes: Array<{ id: string; label: string; type: string }>
  recommendation: string
}

function LearnTab({ currentNodeId, onNodeClick, accent }: {
  currentNodeId?: string | null
  onNodeClick?: (id: string) => void
  accent: string
}) {
  const [data, setData] = useState<LearnPayload | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentNodeId) { setData(null); return }
    setLoading(true)
    api.get<LearnPayload>(`/kg/student/learn/${encodeURIComponent(currentNodeId)}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [currentNodeId])

  if (!currentNodeId) {
    return (
      <p className="px-3 py-6 text-center text-[10px] text-zinc-500 italic">
        Click vào 1 node trong cây tri thức để xem gợi ý học tập
      </p>
    )
  }
  if (loading) return <div className="p-3 text-center text-[10px] text-zinc-500">Đang phân tích…</div>
  if (!data) return <div className="p-3 text-center text-[10px] text-zinc-500">Không có dữ liệu</div>

  return (
    <div className="max-h-80 overflow-y-auto text-[11px]">
      {/* Header: node + mastery */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/50">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-zinc-100">{data.node.label}</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">{data.node.type}</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold" style={{ color: accent }}>{data.mastery.score}%</div>
            <div className="text-[8px] text-zinc-500 uppercase">{data.mastery.level}</div>
          </div>
        </div>
        <div className="mt-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[10px] flex items-start gap-1">
          <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{data.recommendation}</span>
        </div>
      </div>

      {/* Prereq cần ôn (nếu yếu) */}
      {data.prereqNodes.filter(n => n.isWeak).length > 0 && (
        <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/20">
          <div className="text-[10px] font-bold uppercase text-rose-300 mb-1">
            🔥 Cần ôn lại trước
          </div>
          {data.prereqNodes.filter(n => n.isWeak).slice(0, 4).map(n => (
            <button key={n.id} onClick={() => onNodeClick?.(n.id)}
              className="w-full text-left p-1 rounded hover:bg-white/5 flex items-center gap-2">
              <span className="text-rose-400 font-bold text-[10px]">{n.masteryScore}%</span>
              <span className="text-zinc-300 truncate flex-1">{n.label}</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </button>
          ))}
        </div>
      )}

      {/* Chapters */}
      {data.chapters.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800/50">
          <div className="text-[10px] font-bold uppercase text-emerald-300 mb-1">
            📚 Bài học liên quan ({data.chapters.length})
          </div>
          {data.chapters.slice(0, 4).map(c => (
            <a key={c.id} href={`/learning/course/${c.courseId}/chapter/${c.id}`}
              className="block p-1 rounded hover:bg-white/5">
              <div className="text-zinc-200 truncate font-medium">{c.title}</div>
              <div className="text-[9px] text-zinc-500">
                {c.courseTitle || 'Khoá học'} · {c.duration || '—'} phút
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Questions */}
      {data.questions.length > 0 && (
        <div className="px-3 py-2 border-b border-zinc-800/50">
          <div className="text-[10px] font-bold uppercase text-cyan-300 mb-1">
            ❓ Câu hỏi luyện tập ({data.questions.length})
          </div>
          {data.questions.slice(0, 3).map(q => (
            <div key={q.id} className="p-1 rounded hover:bg-white/5">
              <div className="flex items-center gap-1 mb-0.5">
                <FileQuestion className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[9px] uppercase font-bold text-zinc-500">
                  {q.difficulty} · {q.questionType}
                </span>
              </div>
              <p className="text-zinc-300 line-clamp-2">{q.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Next nodes */}
      {data.nextNodes.length > 0 && (
        <div className="px-3 py-2">
          <div className="text-[10px] font-bold uppercase text-violet-300 mb-1">
            ⏭️ Học tiếp
          </div>
          {data.nextNodes.slice(0, 5).map(n => (
            <button key={n.id} onClick={() => onNodeClick?.(n.id)}
              className="w-full text-left p-1 rounded hover:bg-white/5 flex items-center gap-2">
              <span className="text-zinc-300 truncate flex-1">{n.label}</span>
              <ChevronRight className="w-3 h-3 text-zinc-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────── Class tab — GV theo dõi học sinh ──────────────── */

interface StudentDetailPayload {
  student: { id: string; name: string; email: string | null; image: string | null }
  summary: { totalNodes: number; avgScore: number; weakCount: number; strongCount: number }
  weakNodes: Array<{ nodeId: string; label: string; type: string; score: number; attempts: number }>
  strongNodes: Array<{ nodeId: string; label: string; type: string; score: number }>
  recentVisits: Array<{ nodeId: string; label: string; visitCount: number; lastAt: string }>
}

function ClassTab({ onNodeClick, accent, currentNodeId }: {
  onNodeClick?: (id: string) => void
  accent: string
  currentNodeId?: string | null
}) {
  const [data, setData] = useState<{ items: ClassMasteryNode[]; weakTopics: ClassMasteryNode[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [drillStudentId, setDrillStudentId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/kg/teacher/class-mastery')
      .then(r => setData(r.data as any))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-3 text-center text-[10px] text-zinc-500">Đang tải…</div>
  if (!data || data.items.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
        Chưa có dữ liệu mastery của lớp — học sinh chưa tương tác với KG
      </p>
    )
  }

  return (
    <>
      <div className="max-h-72 overflow-y-auto">
        {data.weakTopics.length > 0 && (
          <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/20">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                Topics cần focus ({data.weakTopics.length})
              </span>
            </div>
            {data.weakTopics.slice(0, 5).map(n => (
              <button key={n.id} onClick={() => onNodeClick?.(n.id)}
                className="w-full text-left text-[10px] py-1 px-1 rounded hover:bg-white/5 flex items-center gap-2">
                <span className="font-bold text-rose-400">{n.avgScore}%</span>
                <span className="truncate text-zinc-300 flex-1">{n.label}</span>
                <span className="text-zinc-500">{n.weakCount}/{n.studentCount} HS</span>
              </button>
            ))}
          </div>
        )}

        <div className="divide-y divide-zinc-800/60">
          {data.items.slice(0, 30).map(n => {
            const avg = n.avgScore || 0
            const color = avg >= 70 ? '#34d399' : avg >= 50 ? '#fbbf24' : '#f87171'
            return (
              <button key={n.id} onClick={() => onNodeClick?.(n.id)}
                style={{ touchAction: 'manipulation' }}
                className="w-full px-3 py-1.5 hover:bg-zinc-800/40 text-left flex items-center gap-2">
                <div className="w-10 text-right">
                  <span className="text-xs font-mono font-bold" style={{ color }}>{avg}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-100 truncate">{n.label}</p>
                  <p className="text-[9px] text-zinc-500">{n.studentCount} HS · {n.type}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Drill-down modal — placeholder, GV nhập studentId */}
      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-950/50">
        <DrillDownLauncher onOpen={setDrillStudentId} accent={accent} />
      </div>

      {drillStudentId && (
        <StudentDetailModal
          studentId={drillStudentId}
          currentNodeId={currentNodeId}
          onClose={() => setDrillStudentId(null)}
          onNodeClick={id => { onNodeClick?.(id); setDrillStudentId(null) }}
        />
      )}
    </>
  )
}

function DrillDownLauncher({ onOpen, accent }: { onOpen: (id: string) => void; accent: string }) {
  const [sid, setSid] = useState('')
  return (
    <div className="flex gap-1.5">
      <input
        value={sid}
        onChange={e => setSid(e.target.value)}
        placeholder="ID học sinh để xem chi tiết..."
        className="flex-1 px-2 py-1 text-[10px] rounded bg-zinc-800 border border-zinc-700 text-white"
      />
      <button
        onClick={() => { if (sid.trim()) onOpen(sid.trim()) }}
        disabled={!sid.trim()}
        style={{ background: accent }}
        className="px-2 py-1 rounded text-[10px] font-bold text-zinc-950 disabled:opacity-40 inline-flex items-center gap-1"
      >
        <Users className="w-3 h-3" /> Xem
      </button>
    </div>
  )
}

function StudentDetailModal({ studentId, currentNodeId, onClose, onNodeClick }: {
  studentId: string
  currentNodeId?: string | null
  onClose: () => void
  onNodeClick: (id: string) => void
}) {
  const [data, setData] = useState<StudentDetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get<StudentDetailPayload>(`/kg/teacher/student/${encodeURIComponent(studentId)}/mastery`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [studentId])

  const sendRec = async () => {
    if (!currentNodeId) { toast.error('Chọn 1 node trước'); return }
    setSending(true)
    try {
      await api.post('/kg/teacher/recommend', { studentId, nodeId: currentNodeId, note: note.trim() || undefined })
      toast.success('Đã gửi gợi ý')
      setNote('')
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi gửi')
    } finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-lg w-full bg-zinc-950 border-2 border-purple-500/40 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">📊 Chi tiết học sinh</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1"><X className="w-4 h-4" /></button>
        </div>

        {loading ? (
          <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></div>
        ) : !data ? (
          <p className="text-sm text-zinc-400">Không tìm thấy dữ liệu</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
              {data.student.image ? <img src={data.student.image} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 rounded-full bg-purple-500/30" />}
              <div>
                <div className="text-sm font-bold text-white">{data.student.name}</div>
                <div className="text-[10px] text-zinc-500">{data.student.email || data.student.id}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              <Stat label="Nodes" value={data.summary.totalNodes} accent="#a78bfa" />
              <Stat label="TB" value={data.summary.avgScore} accent="#a78bfa" />
              <Stat label="Yếu" value={data.summary.weakCount} accent="#f87171" />
              <Stat label="Giỏi" value={data.summary.strongCount} accent="#34d399" />
            </div>

            {data.weakNodes.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase text-rose-300 mb-1">🔥 Yếu nhất</div>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {data.weakNodes.slice(0, 8).map(n => (
                    <button key={n.nodeId} onClick={() => onNodeClick(n.nodeId)}
                      className="w-full text-left p-1 rounded hover:bg-white/5 flex items-center gap-2 text-[11px]">
                      <span className="text-rose-400 font-bold w-10 text-right">{n.score}%</span>
                      <span className="text-zinc-200 flex-1 truncate">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Send recommendation */}
            <div className="pt-2 border-t border-zinc-800">
              <div className="text-[10px] font-bold uppercase text-cyan-300 mb-1">
                ✉️ Gửi gợi ý {currentNodeId ? `về "${currentNodeId.slice(0, 30)}…"` : '(chọn 1 node trước)'}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ghi chú cho HS (tùy chọn)..."
                rows={2} maxLength={500}
                disabled={!currentNodeId}
                className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-sm text-white disabled:opacity-40"
              />
              <button
                onClick={sendRec}
                disabled={sending || !currentNodeId}
                className="mt-2 w-full px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Gửi gợi ý cho HS
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────── Workflows tab — Recorder Start/Stop + replay ──────────────── */

interface RecordingStatus {
  recording: boolean
  workflowId?: string
  title?: string
  stepCount?: number
  startedAt?: string
}

function WorkflowsTab({ accent, onReplay, onChange }: {
  accent: string
  onReplay?: (id: string) => void
  onChange?: () => void
}) {
  const [items, setItems] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [rec, setRec] = useState<RecordingStatus>({ recording: false })

  const loadAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<{ items: WorkflowItem[] }>('/kg/workflows')
        .then(r => setItems(r.data.items || []))
        .catch(() => setItems([])),
      api.get<RecordingStatus>('/kg/workflows/recording/status')
        .then(r => setRec(r.data))
        .catch(() => setRec({ recording: false })),
    ]).finally(() => setLoading(false))
  }, [])
  useEffect(() => { loadAll() }, [loadAll])

  // Poll recording status mỗi 5s nếu đang ghi (để cập nhật stepCount)
  useEffect(() => {
    if (!rec.recording) return
    const t = setInterval(() => {
      api.get<RecordingStatus>('/kg/workflows/recording/status')
        .then(r => setRec(r.data))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [rec.recording])

  const startRec = async () => {
    const title = prompt('Đặt tên quy trình (để trống = tự sinh):')
    if (title === null) return  // user cancel
    try {
      await api.post('/kg/workflows/recording/start', { title: title.trim() || undefined })
      toast.success('⏺️ Bắt đầu ghi — mọi click vào node sẽ được lưu')
      loadAll()
      onChange?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi')
    }
  }

  const stopRec = async () => {
    try {
      const r = await api.post<{ workflowId: string; stepCount: number; title: string }>('/kg/workflows/recording/stop')
      toast.success(`⏹️ Đã lưu "${r.data.title}" (${r.data.stepCount} bước)`)
      loadAll()
      onChange?.()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi')
    }
  }

  const replayWf = async (wfId: string) => {
    try {
      const r = await api.get<{ steps: any[] }>(`/kg/workflows/${wfId}/replay`)
      const steps = (r.data.steps || []).filter(s => s.nodeId)
      if (!steps.length) { toast('Workflow rỗng', { icon: '📭' }); return }
      toast(`▶️ Replay ${steps.length} bước (mỗi 1.5s)`, { icon: '🎬', duration: 2000 })
      for (let i = 0; i < steps.length; i++) {
        await new Promise(res => setTimeout(res, 1500))
        onReplay?.(steps[i].nodeId)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi replay')
    }
  }

  const deleteWf = async (wfId: string) => {
    if (!confirm('Xoá workflow này?')) return
    try {
      await api.delete(`/kg/workflows/${wfId}`)
      toast.success('Đã xoá')
      loadAll()
      onChange?.()
    } catch {}
  }

  return (
    <div>
      {/* Recorder controls */}
      {rec.recording ? (
        <div className="border-b border-zinc-800 bg-rose-500/10">
          <div className="px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-rose-300 uppercase">Đang ghi</div>
              <div className="text-[10px] text-zinc-300 truncate">{rec.title} · {rec.stepCount} bước</div>
            </div>
            <button
              onClick={stopRec}
              style={{ touchAction: 'manipulation', minHeight: 36 }}
              className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-bold inline-flex items-center gap-1"
            >
              <Square className="w-3 h-3" /> Dừng
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={startRec}
          style={{ touchAction: 'manipulation', minHeight: 44, background: `linear-gradient(90deg, ${accent}99, ${accent}77)` }}
          className="w-full px-3 py-2 text-[11px] font-bold text-white hover:opacity-90 inline-flex items-center justify-center gap-1.5 border-b border-zinc-800"
        >
          <Circle className="w-3 h-3 fill-current" /> ⏺️ Bắt đầu ghi quy trình
        </button>
      )}

      {loading ? (
        <div className="p-3 text-center text-[10px] text-zinc-500">Đang tải…</div>
      ) : items.length === 0 ? (
        <p className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
          Chưa có quy trình nào — bấm ⏺️ để bắt đầu ghi navigation
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
          {items.map(wf => (
            <div key={wf.id} className="px-3 py-1.5 hover:bg-zinc-800/40 group">
              <div className="flex items-start gap-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-100 truncate">{wf.title}</div>
                  {wf.description && <p className="text-[10px] text-zinc-500 line-clamp-1">{wf.description}</p>}
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    {wf.steps.length} bước · {new Date(wf.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <button
                  onClick={() => replayWf(wf.id)}
                  title="Replay" disabled={!wf.steps.length}
                  className="p-1 rounded hover:bg-emerald-500/20 text-zinc-500 hover:text-emerald-400 disabled:opacity-30 transition"
                >
                  <Play className="w-3 h-3" />
                </button>
                <button
                  onClick={() => deleteWf(wf.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────── Add Node Modal ──────────────── */

function AddNodeModal({ role, courseId, parentNodeId, onClose, onCreated }: {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  courseId?: string
  parentNodeId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'Note' | 'Concept' | 'Topic' | 'Workflow'>('Note')
  const [visibility, setVisibility] = useState<'private' | 'class' | 'public'>('private')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!label.trim()) { toast.error('Nhập tên node'); return }
    setSaving(true)
    try {
      await api.post('/kg/custom-nodes', {
        label: label.trim(),
        description: description.trim() || undefined,
        type,
        visibility,
        courseId: visibility === 'class' ? courseId : undefined,
        parentNodeId,
      })
      toast.success(parentNodeId ? 'Đã gắn note vào node hiện tại' : 'Đã thêm vào bộ não')
      onCreated()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi tạo node')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="max-w-md w-full bg-zinc-950 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">➕ Thêm node vào bộ não</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {parentNodeId && (
          <div className="mb-2 px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-300">
            🔗 Sẽ gắn vào node: <span className="font-mono">{parentNodeId}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Loại</label>
            <div className="flex gap-1.5">
              {(['Note', 'Concept', 'Topic', 'Workflow'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded ${
                    type === t ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {t === 'Note' ? '📝 Ghi chú' : t === 'Concept' ? '💡 Khái niệm' : t === 'Topic' ? '📚 Chủ đề' : '🔄 Quy trình'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Tên / Tiêu đề <span className="text-red-400">*</span></label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="VD: Mẹo nhớ định luật Newton 3..."
              maxLength={300}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Mô tả (tùy chọn)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết, ghi chú, ý tưởng..."
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white resize-y"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Chia sẻ</label>
            <div className="flex gap-1.5">
              <VisOpt active={visibility==='private'} onClick={() => setVisibility('private')} emoji="🔒" label="Riêng tôi" />
              {courseId && (
                <VisOpt active={visibility==='class'} onClick={() => setVisibility('class')} emoji="👥" label="Lớp này" />
              )}
              {role === 'ADMIN' && (
                <VisOpt active={visibility==='public'} onClick={() => setVisibility('public')} emoji="🌍" label="Toàn hệ thống" />
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-bold"
            >
              Huỷ
            </button>
            <button
              onClick={submit}
              disabled={saving || !label.trim()}
              className="flex-1 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Thêm vào bộ não
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VisOpt({ active, onClick, emoji, label }: { active: boolean; onClick: () => void; emoji: string; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-2 py-1.5 text-[10px] font-bold rounded ${
        active ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
      }`}
    >
      {emoji} {label}
    </button>
  )
}
