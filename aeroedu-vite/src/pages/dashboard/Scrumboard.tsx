/**
 * Scrumboard — /dashboard/scrumboard
 *
 * Kanban board học tập: kéo thả task giữa các cột
 * Todo → In Progress → Review → Done.
 * Dữ liệu lưu localStorage.
 */
import { useState, useCallback, useRef, useMemo } from 'react'
import {
  Plus, Trash2, Edit3, Check, X, Tag, Clock,
  Atom, FlaskConical, Calculator, Code2, Globe, BookOpen,
  MoreHorizontal, GripVertical, Star, Zap, AlertCircle,
  ChevronDown, Circle, ArrowRight,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Priority = 'low' | 'medium' | 'high'
type Subject  = 'physics' | 'mathematics' | 'chemistry' | 'biology' | 'programming' | 'other'
type ColKey   = 'todo' | 'inprogress' | 'review' | 'done'

interface Task {
  id: string
  title: string
  desc: string
  subject: Subject
  priority: Priority
  dueDate: string   // YYYY-MM-DD or ''
  tags: string[]
  xp: number
  createdAt: string
}

interface Column {
  key: ColKey
  title: string
  color: string
  accent: string
  tasks: Task[]
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const SUBJECTS: { key: Subject; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'physics',     label: 'Vật lý',    icon: <Atom className="w-3.5 h-3.5" />,         color: 'text-cyan-400' },
  { key: 'mathematics', label: 'Toán học',  icon: <Calculator className="w-3.5 h-3.5" />,   color: 'text-violet-400' },
  { key: 'chemistry',   label: 'Hóa học',   icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'text-teal-400' },
  { key: 'biology',     label: 'Sinh học',  icon: <Globe className="w-3.5 h-3.5" />,        color: 'text-green-400' },
  { key: 'programming', label: 'Lập trình', icon: <Code2 className="w-3.5 h-3.5" />,        color: 'text-orange-400' },
  { key: 'other',       label: 'Khác',      icon: <BookOpen className="w-3.5 h-3.5" />,     color: 'text-white/40' },
]
const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.key, s]))

const PRIORITY_STYLE: Record<Priority, { cls: string; dot: string; label: string }> = {
  low:    { cls: 'text-white/35 bg-white/[0.04] border-white/[0.08]',        dot: 'bg-white/20',    label: 'Thấp' },
  medium: { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/25',       dot: 'bg-amber-400',   label: 'Trung bình' },
  high:   { cls: 'text-rose-400  bg-rose-500/10  border-rose-500/25',        dot: 'bg-rose-400',    label: 'Cao' },
}

const COL_DEFS: Omit<Column, 'tasks'>[] = [
  { key: 'todo',       title: 'Cần làm',       color: 'border-t-white/20',        accent: 'text-white/50' },
  { key: 'inprogress', title: 'Đang học',       color: 'border-t-blue-500',        accent: 'text-blue-400' },
  { key: 'review',     title: 'Ôn tập',         color: 'border-t-amber-500',       accent: 'text-amber-400' },
  { key: 'done',       title: 'Hoàn thành ✓',   color: 'border-t-emerald-500',     accent: 'text-emerald-400' },
]

const LS_KEY = 'inphysic_scrumboard_v1'

const DEMO_COLUMNS: Record<ColKey, Task[]> = {
  todo: [
    { id: 't1', title: 'Ôn tập phương trình Maxwell', desc: 'Xem lại 4 phương trình và ý nghĩa vật lý', subject: 'physics', priority: 'high', dueDate: '', tags: ['điện từ'], xp: 150, createdAt: new Date().toISOString() },
    { id: 't2', title: 'Giải 20 bài tích phân từng phần', desc: 'Sách BT Giải tích tr.45-52', subject: 'mathematics', priority: 'medium', dueDate: '', tags: ['tích phân'], xp: 120, createdAt: new Date().toISOString() },
    { id: 't3', title: 'Học NumPy broadcasting', desc: '', subject: 'programming', priority: 'low', dueDate: '', tags: ['Python'], xp: 80, createdAt: new Date().toISOString() },
  ],
  inprogress: [
    { id: 't4', title: 'Chương Điện từ cảm ứng', desc: 'Đang đọc sách + làm bài tập', subject: 'physics', priority: 'high', dueDate: '', tags: ['cảm ứng', 'Faraday'], xp: 200, createdAt: new Date().toISOString() },
    { id: 't5', title: 'Hóa hữu cơ — Amin & Aminoaxit', desc: 'Đang ghi chú và học công thức', subject: 'chemistry', priority: 'medium', dueDate: '', tags: ['hữu cơ'], xp: 130, createdAt: new Date().toISOString() },
  ],
  review: [
    { id: 't6', title: 'Định luật Kepler', desc: 'Xem lại 3 định luật và áp dụng cho bài toán hành tinh', subject: 'physics', priority: 'medium', dueDate: '', tags: ['cơ học thiên thể'], xp: 110, createdAt: new Date().toISOString() },
  ],
  done: [
    { id: 't7', title: 'Con lắc đơn — lý thuyết + bài tập', desc: 'Hoàn thành tất cả dạng bài', subject: 'physics', priority: 'high', dueDate: '', tags: ['dao động'], xp: 160, createdAt: new Date().toISOString() },
    { id: 't8', title: 'Python cơ bản — biến, hàm, vòng lặp', desc: '', subject: 'programming', priority: 'low', dueDate: '', tags: ['Python'], xp: 90, createdAt: new Date().toISOString() },
  ],
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function loadColumns(): Record<ColKey, Task[]> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return DEMO_COLUMNS
}

function saveColumns(cols: Record<ColKey, Task[]>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cols)) } catch { /* ignore */ }
}

function uid() { return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

// ─────────────────────────────────────────────────────────────────
// TaskCard
// ─────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  colKey,
  onMove,
  onEdit,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task
  colKey: ColKey
  onMove: (id: string, from: ColKey, to: ColKey) => void
  onEdit: (task: Task) => void
  onDelete: (id: string, col: ColKey) => void
  dragging: boolean
  onDragStart: (e: React.DragEvent, taskId: string, col: ColKey) => void
  onDragEnd: () => void
}) {
  const [menu, setMenu] = useState(false)
  const sub = SUBJECT_MAP[task.subject]
  const pri = PRIORITY_STYLE[task.priority]
  const colOrder: ColKey[] = ['todo', 'inprogress', 'review', 'done']
  const colIdx = colOrder.indexOf(colKey)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id, colKey)}
      onDragEnd={onDragEnd}
      className={`rounded-xl border bg-[hsl(225,15%,12%)] border-white/[0.08] p-3.5 cursor-grab active:cursor-grabbing transition-all ${dragging ? 'opacity-40 scale-95' : 'hover:border-white/15 hover:bg-[hsl(225,15%,13%)]'}`}
    >
      {/* Top row */}
      <div className="flex items-start gap-2 mb-2">
        <GripVertical className="w-3.5 h-3.5 text-white/15 mt-0.5 shrink-0" />
        <p className="flex-1 text-xs font-semibold text-white/85 leading-snug">{task.title}</p>
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMenu(p => !p) }}
            className="p-1 rounded hover:bg-white/10 text-white/25 hover:text-white/60 transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 z-20 w-40 bg-[hsl(225,15%,13%)] border border-white/10 rounded-xl shadow-xl overflow-hidden">
              <button onClick={() => { onEdit(task); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa
              </button>
              {colIdx > 0 && (
                <button onClick={() => { onMove(task.id, colKey, colOrder[colIdx - 1]); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Lùi lại
                </button>
              )}
              {colIdx < 3 && (
                <button onClick={() => { onMove(task.id, colKey, colOrder[colIdx + 1]); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06] transition-colors">
                  <ArrowRight className="w-3.5 h-3.5" /> Tiến lên
                </button>
              )}
              <button onClick={() => { onDelete(task.id, colKey); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          )}
        </div>
      </div>

      {task.desc && <p className="text-[0.7rem] text-white/40 leading-relaxed mb-2 pl-5 line-clamp-2">{task.desc}</p>}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 pl-5">
          {task.tags.map(t => (
            <span key={t} className="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/35 border border-white/[0.06]">#{t}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 pl-5 flex-wrap">
        <span className={`flex items-center gap-1 text-[0.65rem] px-1.5 py-0.5 rounded border ${pri.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pri.dot}`} />{pri.label}
        </span>
        <span className={`flex items-center gap-1 text-[0.65rem] ${sub.color}`}>{sub.icon}</span>
        <span className="text-[0.65rem] text-yellow-400/60 flex items-center gap-0.5 ml-auto">
          <Zap className="w-3 h-3" />+{task.xp}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TaskModal (create / edit)
// ─────────────────────────────────────────────────────────────────
function TaskModal({
  initial,
  defaultCol,
  onSave,
  onClose,
}: {
  initial?: Task
  defaultCol: ColKey
  onSave: (task: Task, col: ColKey) => void
  onClose: () => void
}) {
  const [title, setTitle]       = useState(initial?.title ?? '')
  const [desc, setDesc]         = useState(initial?.desc  ?? '')
  const [subject, setSubject]   = useState<Subject>(initial?.subject  ?? 'other')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium')
  const [tags, setTags]         = useState(initial?.tags.join(', ') ?? '')
  const [xp, setXp]             = useState(initial?.xp ?? 100)
  const [col, setCol]           = useState<ColKey>(defaultCol)

  const handleSave = () => {
    if (!title.trim()) return
    const task: Task = {
      id: initial?.id ?? uid(),
      title: title.trim(),
      desc: desc.trim(),
      subject, priority,
      dueDate: '',
      tags: tags.split(',').map(t => t.trim().replace(/\s+/g, '-').toLowerCase()).filter(Boolean),
      xp,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    }
    onSave(task, col)
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors'
  const labelCls = 'block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[hsl(225,15%,11%)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="font-bold text-white/90">{initial ? 'Chỉnh sửa task' : 'Tạo task mới'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={labelCls}>Tiêu đề *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Ôn lý thuyết con lắc lò xo" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mô tả</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Chi tiết task…" className={`${inputCls} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Môn học</label>
              <select value={subject} onChange={e => setSubject(e.target.value as Subject)} className={inputCls}>
                {SUBJECTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ưu tiên</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputCls}>
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cột</label>
              <select value={col} onChange={e => setCol(e.target.value as ColKey)} className={inputCls}>
                {COL_DEFS.map(c => <option key={c.key} value={c.key}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>XP thưởng</label>
              <input type="number" value={xp} onChange={e => setXp(Number(e.target.value))} min={10} max={500} step={10} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Thẻ (phân cách bằng dấu phẩy)</label>
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ví dụ: dao động, THPT, lý thuyết" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-sm text-white/60 transition-colors">Hủy</button>
          <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors">
            {initial ? 'Lưu thay đổi' : 'Tạo task'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function ScrumboardPage() {
  const [columns, setColumns] = useState<Record<ColKey, Task[]>>(loadColumns)
  const [editTask, setEditTask]   = useState<Task | null>(null)
  const [newInCol, setNewInCol]   = useState<ColKey | null>(null)
  const [dragTask, setDragTask]   = useState<{ id: string; col: ColKey } | null>(null)
  const [dragOver, setDragOver]   = useState<ColKey | null>(null)

  const persist = useCallback((cols: Record<ColKey, Task[]>) => {
    setColumns(cols)
    saveColumns(cols)
  }, [])

  // ── Drag & Drop ───────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string, col: ColKey) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragTask({ id: taskId, col })
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragTask(null)
    setDragOver(null)
  }, [])

  const handleDrop = useCallback((toCol: ColKey) => {
    if (!dragTask || dragTask.col === toCol) { setDragOver(null); return }
    setColumns(prev => {
      const task = prev[dragTask.col].find(t => t.id === dragTask.id)
      if (!task) return prev
      const next = {
        ...prev,
        [dragTask.col]: prev[dragTask.col].filter(t => t.id !== dragTask.id),
        [toCol]: [task, ...prev[toCol]],
      }
      saveColumns(next)
      return next
    })
    setDragTask(null)
    setDragOver(null)
  }, [dragTask])

  // ── Task CRUD ─────────────────────────────────────────────────
  const moveTask = useCallback((id: string, from: ColKey, to: ColKey) => {
    setColumns(prev => {
      const task = prev[from].find(t => t.id === id)
      if (!task) return prev
      const next = {
        ...prev,
        [from]: prev[from].filter(t => t.id !== id),
        [to]: [task, ...prev[to]],
      }
      saveColumns(next)
      return next
    })
  }, [])

  const deleteTask = useCallback((id: string, col: ColKey) => {
    setColumns(prev => {
      const next = { ...prev, [col]: prev[col].filter(t => t.id !== id) }
      saveColumns(next)
      return next
    })
  }, [])

  const saveTask = useCallback((task: Task, col: ColKey) => {
    setColumns(prev => {
      // If editing: remove from old col
      let next = { ...prev }
      if (editTask) {
        for (const k of Object.keys(next) as ColKey[]) {
          next[k] = next[k].filter(t => t.id !== task.id)
        }
      }
      next[col] = editTask
        ? [task, ...next[col]]
        : [task, ...next[col]]
      saveColumns(next)
      return next
    })
    setEditTask(null)
    setNewInCol(null)
  }, [editTask])

  // ── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = (Object.values(columns) as Task[][]).flat()
    const done = columns.done
    return {
      total:    all.length,
      done:     done.length,
      inprog:   columns.inprogress.length,
      xpEarned: done.reduce((s, t) => s + t.xp, 0),
      xpPending: (Object.entries(columns) as [ColKey, Task[]][])
        .filter(([k]) => k !== 'done')
        .flatMap(([, t]) => t)
        .reduce((s, t) => s + t.xp, 0),
    }
  }, [columns])

  return (
    <div className="min-h-screen bg-[hsl(225,15%,8%)] text-white">
      <div className="px-4 py-6 max-w-screen-xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Circle className="w-5 h-5 text-violet-400" /> Scrumboard học tập
            </h1>
            <p className="text-white/40 text-xs mt-0.5">Kéo thả task giữa các cột để theo dõi tiến độ</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07]">
              <BookOpen className="w-3.5 h-3.5" />{stats.total} task
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Check className="w-3.5 h-3.5" />{stats.done} xong
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
              <Zap className="w-3.5 h-3.5" />+{stats.xpEarned.toLocaleString()} XP
            </span>
            <button
              onClick={() => setNewInCol('todo')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Task mới
            </button>
          </div>
        </div>

        {/* ── Board ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COL_DEFS.map(colDef => {
            const tasks = columns[colDef.key]
            const isOver = dragOver === colDef.key

            return (
              <div
                key={colDef.key}
                onDragOver={e => { e.preventDefault(); setDragOver(colDef.key) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(colDef.key)}
                className={`rounded-2xl border bg-[hsl(225,15%,10%)] border-white/[0.07] border-t-2 ${colDef.color} transition-all ${isOver ? 'ring-1 ring-violet-500/40 bg-[hsl(225,15%,12%)]' : ''}`}
              >
                {/* Col header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${colDef.accent}`}>{colDef.title}</span>
                    <span className="text-[0.6rem] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                  </div>
                  <button
                    onClick={() => setNewInCol(colDef.key)}
                    className="p-1 rounded-md hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-2.5 min-h-[12rem]">
                  {tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      colKey={colDef.key}
                      onMove={moveTask}
                      onEdit={t => setEditTask(t)}
                      onDelete={deleteTask}
                      dragging={dragTask?.id === task.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                  {tasks.length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed text-white/15 text-xs transition-colors ${isOver ? 'border-violet-500/40 text-violet-400/40' : 'border-white/[0.06]'}`}>
                      {isOver ? '+ Thả vào đây' : 'Trống'}
                    </div>
                  )}
                </div>

                {/* Col XP total */}
                {tasks.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/[0.04] text-[0.65rem] text-white/20 flex justify-end">
                    <span className="text-yellow-400/40 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />{tasks.reduce((s, t) => s + t.xp, 0)} XP
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Progress bar ────────────────────────────────────────── */}
        {stats.total > 0 && (
          <div className="mt-6 p-4 rounded-2xl border border-white/[0.06] bg-[hsl(225,15%,10%)]">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-white/40">Tiến độ tổng thể</span>
              <span className="text-emerald-400 font-semibold">{Math.round(stats.done / stats.total * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${Math.round(stats.done / stats.total * 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-[0.65rem] text-white/30">
              <span>{stats.done}/{stats.total} task hoàn thành</span>
              <span className="text-yellow-400/50">+{stats.xpPending} XP đang chờ</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(editTask || newInCol) && (
        <TaskModal
          initial={editTask ?? undefined}
          defaultCol={newInCol ?? 'todo'}
          onSave={saveTask}
          onClose={() => { setEditTask(null); setNewInCol(null) }}
        />
      )}
    </div>
  )
}
