/**
 * KgRolePanel — Bộ não cá nhân theo role.
 *
 * Tất cả role đều có thể:
 *  - Tạo custom node (note/concept cá nhân) gắn vào KG
 *  - Xem stats (đã thăm, custom node, workflow)
 *
 * Student-only:
 *  - Tab "Học tập" — recommendations từ Brain v2 (đã có ở component khác)
 *
 * Teacher-only:
 *  - Tab "Lớp tôi" — class mastery overview (% HS yếu/đạt/giỏi mỗi node)
 *  - Weak topics list (top 10 nodes cần focus)
 *
 * Admin-only:
 *  - Tab "Quy trình" — workflow snapshots
 *  - Nút "📸 Lưu workflow hiện tại"
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Brain, Plus, X, Loader2, GraduationCap, Briefcase, Shield,
  Sparkles, Users, AlertTriangle, Workflow, Trash2,
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
}

export default function KgRolePanel({ onNodeClick, courseId }: Props) {
  const [ctx, setCtx] = useState<RoleContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'mine' | 'class' | 'workflows'>('mine')
  const [showAddModal, setShowAddModal] = useState(false)

  // ── Load context ──
  useEffect(() => {
    api.get<RoleContext>('/kg/role-context')
      .then(r => { setCtx(r.data) })
      .catch(() => setCtx(null))
      .finally(() => setLoading(false))
  }, [])

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

  // Tabs available theo role
  const tabs: Array<{ id: 'mine' | 'class' | 'workflows'; label: string; icon: any }> = [
    { id: 'mine', label: 'Bộ não tôi', icon: Brain },
  ]
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
      <div className="flex border-b border-zinc-800">
        {tabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{ touchAction: 'manipulation', minHeight: 44 }}
              className={`flex-1 px-2 py-1.5 text-[10px] font-bold inline-flex items-center justify-center gap-1 transition ${
                active ? 'bg-zinc-900/80 border-b-2 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              {...(active && { style: { borderColor: cfg.accent, color: cfg.accent, touchAction: 'manipulation' as const, minHeight: 44 } })}
            >
              <Icon className="w-3 h-3" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeTab === 'mine' && <MineTab onNodeClick={onNodeClick} accent={cfg.accent} />}
      {activeTab === 'class' && <ClassTab onNodeClick={onNodeClick} accent={cfg.accent} />}
      {activeTab === 'workflows' && <WorkflowsTab accent={cfg.accent} />}

      {/* Add Node modal */}
      {showAddModal && (
        <AddNodeModal
          role={ctx.role}
          courseId={courseId}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            // Refresh stats
            api.get<RoleContext>('/kg/role-context').then(r => setCtx(r.data))
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

/* ──────────────── Mine tab — custom nodes của tôi ──────────────── */

function MineTab({ onNodeClick, accent }: { onNodeClick?: (id: string) => void; accent: string }) {
  const [items, setItems] = useState<CustomNode[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ items: CustomNode[] }>('/kg/custom-nodes')
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const handleDelete = (id: string) => {
    if (!confirm('Xoá node này khỏi bộ não tôi?')) return
    api.delete(`/kg/custom-nodes/${id}`).then(() => {
      toast.success('Đã xoá')
      load()
    })
  }

  if (loading) return <div className="p-3 text-center text-[10px] text-zinc-500">Đang tải…</div>
  if (items.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
        Chưa có node cá nhân nào — bấm <Plus className="inline w-3 h-3" /> để thêm
      </p>
    )
  }

  return (
    <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
      {items.map(item => (
        <div key={item.id} className="px-3 py-2 hover:bg-zinc-800/40 group flex items-start gap-2">
          <span className="text-[9px] mt-0.5 font-mono shrink-0"
                style={{ color: accent }}>
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
  )
}

/* ──────────────── Class tab — teacher view ──────────────── */

function ClassTab({ onNodeClick, accent }: { onNodeClick?: (id: string) => void; accent: string }) {
  const [data, setData] = useState<{ items: ClassMasteryNode[]; weakTopics: ClassMasteryNode[] } | null>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="max-h-72 overflow-y-auto">
      {/* Weak topics highlight */}
      {data.weakTopics.length > 0 && (
        <div className="px-3 py-2 bg-rose-500/10 border-b border-rose-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
              Topics cần focus ({data.weakTopics.length})
            </span>
          </div>
          {data.weakTopics.slice(0, 5).map(n => (
            <button
              key={n.id}
              onClick={() => onNodeClick?.(n.id)}
              className="w-full text-left text-[10px] py-1 px-1 rounded hover:bg-white/5 flex items-center gap-2"
            >
              <span className="font-bold text-rose-400">{n.avgScore}%</span>
              <span className="truncate text-zinc-300 flex-1">{n.label}</span>
              <span className="text-zinc-500">{n.weakCount}/{n.studentCount} HS</span>
            </button>
          ))}
        </div>
      )}

      {/* Full list */}
      <div className="divide-y divide-zinc-800/60">
        {data.items.slice(0, 30).map(n => {
          const avg = n.avgScore || 0
          const color = avg >= 70 ? '#34d399' : avg >= 50 ? '#fbbf24' : '#f87171'
          return (
            <button
              key={n.id}
              onClick={() => onNodeClick?.(n.id)}
              style={{ touchAction: 'manipulation' }}
              className="w-full px-3 py-1.5 hover:bg-zinc-800/40 text-left flex items-center gap-2"
            >
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
  )
}

/* ──────────────── Workflows tab — admin ──────────────── */

function WorkflowsTab({ accent }: { accent: string }) {
  const [items, setItems] = useState<WorkflowItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ items: WorkflowItem[] }>('/kg/workflows')
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const snapshot = async () => {
    const title = prompt('Tiêu đề quy trình:')
    if (!title?.trim()) return
    setCreating(true)
    try {
      await api.post('/kg/workflows', {
        title: title.trim(),
        description: `Snapshot lúc ${new Date().toLocaleString('vi-VN')}`,
        steps: [{ step: 1, action: 'snapshot', timestamp: new Date().toISOString() }],
        tags: ['quick'],
      })
      toast.success('Đã lưu quy trình')
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi lưu')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <button
        onClick={snapshot}
        disabled={creating}
        style={{ touchAction: 'manipulation', minHeight: 44 }}
        className="w-full px-3 py-2 text-[11px] font-bold text-white
                   bg-gradient-to-r from-amber-500/80 to-orange-500/80
                   hover:from-amber-500 hover:to-orange-500 disabled:opacity-50
                   inline-flex items-center justify-center gap-1.5 border-b border-zinc-800"
      >
        {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        📸 Lưu quy trình hiện tại
      </button>
      {loading ? (
        <div className="p-3 text-center text-[10px] text-zinc-500">Đang tải…</div>
      ) : items.length === 0 ? (
        <p className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
          Chưa có quy trình nào — bấm "📸 Lưu" để bắt đầu
        </p>
      ) : (
        <div className="divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
          {items.map(wf => (
            <div key={wf.id} className="px-3 py-1.5 hover:bg-zinc-800/40">
              <div className="text-xs font-semibold text-zinc-100">{wf.title}</div>
              {wf.description && (
                <p className="text-[10px] text-zinc-500 line-clamp-1">{wf.description}</p>
              )}
              <div className="text-[9px] text-zinc-600 mt-0.5">
                {wf.steps.length} bước · {new Date(wf.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ──────────────── Add Node Modal ──────────────── */

function AddNodeModal({ role, courseId, onClose, onCreated }: {
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  courseId?: string
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
      })
      toast.success('Đã thêm vào bộ não')
      onCreated()
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi tạo node')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="max-w-md w-full bg-zinc-950 border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">➕ Thêm node vào bộ não</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

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
