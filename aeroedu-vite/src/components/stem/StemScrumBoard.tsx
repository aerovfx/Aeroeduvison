/**
 * StemScrumBoard — Bảng Scrum 3 cột cho STEM project milestones.
 *
 * Source of truth: project.milestones (qua stemStore.ts).
 * Mọi thao tác (add/edit/delete/move/status-change) đồng bộ ngay vào localStorage
 * → Timeline (/dashboard/stem/:id/timeline) tự cập nhật.
 *
 * Cột:
 *   📌 Chờ làm (pending)    — amber
 *   🔄 Đang làm (in-progress) — blue
 *   ✅ Hoàn thành (completed) — emerald
 */
import { useMemo, useState } from 'react'
import {
  ListTodo,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  ArrowLeft,
  Calendar,
  X,
  Check,
} from 'lucide-react'
import type { Milestone } from '../../pages/stem/stemStore'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StemScrumBoardProps {
  projectId: string
  milestones: Milestone[]
  onAdd?: (m: Partial<Milestone> & { title: string }) => void
  onUpdate?: (id: string, fields: Partial<Milestone>) => void
  onDelete?: (id: string) => void
  /** Move within ordered list (-1 up, +1 down). */
  onMove?: (id: string, direction: -1 | 1) => void
}

// ─── Column meta ──────────────────────────────────────────────────────────────

type ColKey = Milestone['status']

interface ColMeta {
  key: ColKey
  title: string
  icon: typeof ListTodo
  badgeBg: string
  badgeText: string
  headerBorder: string
  cardAccent: string
  prev?: ColKey
  next?: ColKey
}

const COLS: ColMeta[] = [
  {
    key: 'pending',
    title: 'Chờ làm',
    icon: ListTodo,
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-300',
    headerBorder: 'border-amber-500/30',
    cardAccent: 'hover:border-amber-500/40',
    next: 'in-progress',
  },
  {
    key: 'in-progress',
    title: 'Đang làm',
    icon: Clock,
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-300',
    headerBorder: 'border-blue-500/30',
    cardAccent: 'hover:border-blue-500/40',
    prev: 'pending',
    next: 'completed',
  },
  {
    key: 'completed',
    title: 'Hoàn thành',
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-300',
    headerBorder: 'border-emerald-500/30',
    cardAccent: 'hover:border-emerald-500/40',
    prev: 'in-progress',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(s: string): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  } catch {
    return s
  }
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  milestone: Milestone
  onSave: (fields: Partial<Milestone>) => void
  onClose: () => void
}

function EditModal({ milestone, onSave, onClose }: EditModalProps) {
  const [title, setTitle] = useState(milestone.title)
  const [dueDate, setDueDate] = useState(milestone.dueDate || '')
  const [status, setStatus] = useState<Milestone['status']>(milestone.status)

  const submit = () => {
    if (!title.trim()) return
    onSave({ title: title.trim(), dueDate, status })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[hsl(260,30%,13%)] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-lg font-bold text-white/90">Chỉnh sửa task</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/[0.06] rounded-lg transition text-white/60"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">Tiêu đề</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/85 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">Hạn chót</label>
            <input
              type="date"
              value={dueDate ? dueDate.slice(0, 10) : ''}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/85 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">Cột</label>
            <div className="grid grid-cols-3 gap-2">
              {COLS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setStatus(c.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                    status === c.key
                      ? `${c.badgeBg} ${c.badgeText} ${c.headerBorder}`
                      : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition text-white/80 text-sm font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Lưu
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add task modal ───────────────────────────────────────────────────────────

interface AddModalProps {
  onAdd: (m: Partial<Milestone> & { title: string }) => void
  onClose: () => void
}

function AddModal({ onAdd, onClose }: AddModalProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState<Milestone['status']>('pending')

  const submit = () => {
    if (!title.trim()) return
    onAdd({ title: title.trim(), dueDate, status })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[hsl(260,30%,13%)] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white/90">Thêm task mới</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/[0.06] rounded-lg transition text-white/60"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">
              Tiêu đề <span className="text-rose-400">*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="vd: Lập trình AI nhận diện xe"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/85 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">Hạn chót</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/85 text-sm focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40 block mb-2">Bắt đầu ở cột</label>
            <div className="grid grid-cols-3 gap-2">
              {COLS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setStatus(c.key)}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                    status === c.key
                      ? `${c.badgeBg} ${c.badgeText} ${c.headerBorder}`
                      : 'bg-white/[0.03] text-white/50 border-white/[0.08] hover:bg-white/[0.06]'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition text-white/80 text-sm font-semibold"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-white text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm task
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  milestone: Milestone
  col: ColMeta
  canEdit: boolean
  onMoveStatus: (toStatus: ColKey) => void
  onStartEdit: () => void
  onDelete: () => void
  onInlineRename: (title: string) => void
}

function MilestoneCard({
  milestone,
  col,
  canEdit,
  onMoveStatus,
  onStartEdit,
  onDelete,
  onInlineRename,
}: CardProps) {
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(milestone.title)

  const commitRename = () => {
    const t = draft.trim()
    if (t && t !== milestone.title) onInlineRename(t)
    setRenaming(false)
  }

  return (
    <div
      className={`group bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 transition shadow-sm ${col.cardAccent}`}
    >
      {/* Title — click to rename inline */}
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setDraft(milestone.title)
              setRenaming(false)
            }
          }}
          className="w-full bg-white/[0.06] border border-purple-500/40 rounded px-2 py-1 text-sm text-white/90 focus:outline-none"
        />
      ) : (
        <button
          onClick={() => canEdit && setRenaming(true)}
          disabled={!canEdit}
          className="w-full text-left text-sm font-semibold text-white/85 leading-snug hover:text-white transition disabled:cursor-default"
          title={canEdit ? 'Bấm để đổi tên' : ''}
        >
          {milestone.title}
        </button>
      )}

      {/* Due date */}
      {milestone.dueDate && (
        <div className="flex items-center gap-1 mt-2 text-[11px] text-white/45">
          <Calendar className="w-3 h-3" />
          <span>{formatShortDate(milestone.dueDate)}</span>
        </div>
      )}

      {/* Action row */}
      {canEdit && (
        <div className="flex items-center gap-1 mt-3 opacity-60 group-hover:opacity-100 transition">
          {col.prev && (
            <button
              onClick={() => onMoveStatus(col.prev!)}
              className="p-1 rounded hover:bg-white/[0.08] text-white/60 hover:text-white"
              title="Lùi cột"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {col.next && (
            <button
              onClick={() => onMoveStatus(col.next!)}
              className="p-1 rounded hover:bg-white/[0.08] text-white/60 hover:text-white"
              title="Tiến cột"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onStartEdit}
            className="p-1 rounded hover:bg-white/[0.08] text-white/50 hover:text-purple-300"
            title="Chỉnh sửa"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-rose-500/15 text-white/50 hover:text-rose-300"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StemScrumBoard({
  projectId: _projectId,
  milestones,
  onAdd,
  onUpdate,
  onDelete,
  onMove: _onMove,
}: StemScrumBoardProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)

  const canEdit = Boolean(onUpdate || onDelete)

  // Group milestones by status — preserve original order within each column
  const byStatus = useMemo(() => {
    const groups: Record<ColKey, Milestone[]> = {
      'pending': [],
      'in-progress': [],
      'completed': [],
    }
    for (const m of milestones) {
      const k: ColKey = m.status in groups ? m.status : 'pending'
      groups[k].push(m)
    }
    return groups
  }, [milestones])

  const totalDone = byStatus.completed.length
  const totalAll = milestones.length

  const handleDelete = (id: string, title: string) => {
    if (!onDelete) return
    if (confirm(`Xóa task "${title}"?`)) onDelete(id)
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/20 border border-purple-400/30 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-white/90">Bảng Scrum dự án</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 text-[10px] font-semibold">
              {totalDone}/{totalAll}
            </span>
          </div>
          <p className="text-xs text-white/45 ml-10">
            Đồng bộ với timeline · không cần nhập tay ở /timeline
          </p>
        </div>

        {onAdd && (
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 transition text-white text-sm font-semibold shadow-lg shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" />
            Thêm task
          </button>
        )}
      </div>

      {/* ── 3-column board ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {COLS.map((col) => {
          const items = byStatus[col.key]
          const Icon = col.icon

          return (
            <div
              key={col.key}
              className={`rounded-2xl bg-white/[0.02] border border-white/[0.06] border-t-2 ${col.headerBorder} flex flex-col min-h-[200px]`}
            >
              {/* Column header */}
              <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.badgeText}`} />
                <h4 className={`text-sm font-bold ${col.badgeText}`}>{col.title}</h4>
                <span
                  className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${col.badgeBg} ${col.badgeText}`}
                >
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex-1 p-2.5 space-y-2">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center py-8 px-3 rounded-lg border border-dashed border-white/[0.06] text-center">
                    <p className="text-xs text-white/30">
                      {canEdit && onAdd ? 'Bấm "Thêm task" hoặc kéo từ cột khác' : 'Chưa có task'}
                    </p>
                  </div>
                ) : (
                  items.map((m) => (
                    <MilestoneCard
                      key={m.id}
                      milestone={m}
                      col={col}
                      canEdit={canEdit}
                      onMoveStatus={(toStatus) => onUpdate?.(m.id, { status: toStatus })}
                      onStartEdit={() => setEditing(m)}
                      onDelete={() => handleDelete(m.id, m.title)}
                      onInlineRename={(title) => onUpdate?.(m.id, { title })}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footer counter ── */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/40 px-1">
        <span>
          Tổng {totalAll} task · {totalDone} hoàn thành ·{' '}
          {byStatus['in-progress'].length} đang làm · {byStatus.pending.length} chờ
        </span>
        {totalAll > 0 && (
          <span className="font-semibold text-white/60">
            {Math.round((totalDone / totalAll) * 100)}%
          </span>
        )}
      </div>

      {/* ── Modals ── */}
      {addOpen && onAdd && (
        <AddModal
          onAdd={onAdd}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editing && onUpdate && (
        <EditModal
          milestone={editing}
          onSave={(fields) => onUpdate(editing.id, fields)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
