/**
 * Notes — /dashboard/notes
 *
 * Ghi chú học tập: tạo, chỉnh sửa, gắn thẻ, tìm kiếm.
 * Dữ liệu lưu localStorage (không cần backend).
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Plus, Search, Trash2, Tag, Clock, Pin, PinOff,
  BookOpen, Atom, FlaskConical, Calculator, Code2,
  Globe, MoreHorizontal, Check, X, Edit3, FileText,
  ChevronDown, Sparkles,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type Subject = 'physics' | 'mathematics' | 'chemistry' | 'biology' | 'programming' | 'other'

interface Note {
  id: string
  title: string
  content: string
  subject: Subject
  tags: string[]
  pinned: boolean
  createdAt: string   // ISO
  updatedAt: string   // ISO
  color: string       // Tailwind gradient key
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { key: 'default', label: 'Mặc định', cls: 'from-white/[0.04] to-white/[0.02]', border: 'border-white/[0.08]' },
  { key: 'blue',    label: 'Xanh lam',  cls: 'from-blue-500/10 to-blue-600/5',    border: 'border-blue-500/20' },
  { key: 'violet',  label: 'Tím',       cls: 'from-violet-500/10 to-violet-600/5',border: 'border-violet-500/20' },
  { key: 'emerald', label: 'Xanh lá',   cls: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20' },
  { key: 'amber',   label: 'Vàng',      cls: 'from-amber-500/10 to-amber-600/5',  border: 'border-amber-500/20' },
  { key: 'rose',    label: 'Hồng',      cls: 'from-rose-500/10 to-rose-600/5',    border: 'border-rose-500/20' },
  { key: 'cyan',    label: 'Ngọc',      cls: 'from-cyan-500/10 to-cyan-600/5',    border: 'border-cyan-500/20' },
]

const COLOR_MAP = Object.fromEntries(NOTE_COLORS.map(c => [c.key, c]))

const SUBJECTS: { key: Subject; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'physics',     label: 'Vật lý',    icon: <Atom className="w-3.5 h-3.5" />,         color: 'text-cyan-400' },
  { key: 'mathematics', label: 'Toán học',  icon: <Calculator className="w-3.5 h-3.5" />,   color: 'text-violet-400' },
  { key: 'chemistry',   label: 'Hóa học',   icon: <FlaskConical className="w-3.5 h-3.5" />, color: 'text-teal-400' },
  { key: 'biology',     label: 'Sinh học',  icon: <Globe className="w-3.5 h-3.5" />,        color: 'text-green-400' },
  { key: 'programming', label: 'Lập trình', icon: <Code2 className="w-3.5 h-3.5" />,        color: 'text-orange-400' },
  { key: 'other',       label: 'Khác',      icon: <BookOpen className="w-3.5 h-3.5" />,     color: 'text-white/40' },
]

const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map(s => [s.key, s]))

const DEMO_NOTES: Note[] = [
  {
    id: 'demo-1',
    title: 'Công thức con lắc đơn',
    content: `**Chu kỳ dao động:**\nT = 2π√(L/g)\n\n**Trong đó:**\n- L = chiều dài dây (m)\n- g = gia tốc trọng trường (m/s²)\n\n**Ghi nhớ:** Chu kỳ không phụ thuộc vào khối lượng vật, chỉ phụ thuộc vào L và g.\n\n**Ví dụ:** L = 1m, g = 9.81 → T = 2.007s`,
    subject: 'physics', tags: ['dao động', 'con lắc', 'THPT'],
    pinned: true, color: 'blue',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'demo-2',
    title: 'Phương trình Maxwell',
    content: `**4 phương trình Maxwell:**\n1. ∇·E = ρ/ε₀ (Gauss điện)\n2. ∇·B = 0 (Gauss từ)\n3. ∇×E = -∂B/∂t (Faraday)\n4. ∇×B = μ₀J + μ₀ε₀∂E/∂t (Ampere-Maxwell)\n\n→ Điện trường và từ trường lan truyền dưới dạng sóng điện từ với v = c = 3×10⁸ m/s`,
    subject: 'physics', tags: ['điện từ', 'Maxwell', 'nâng cao'],
    pinned: false, color: 'violet',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'demo-3',
    title: 'Tích phân từng phần',
    content: `**Công thức:**\n∫u dv = uv - ∫v du\n\n**Mẹo chọn u (LIATE):**\n- Logarithm\n- Inverse trig\n- Algebraic\n- Trigonometric\n- Exponential\n\n**Ví dụ:** ∫x·eˣ dx\nu = x → du = dx\ndv = eˣ dx → v = eˣ\n→ = xeˣ - eˣ + C`,
    subject: 'mathematics', tags: ['tích phân', 'giải tích'],
    pinned: true, color: 'amber',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'demo-4',
    title: 'Python NumPy cơ bản',
    content: `**Tạo mảng:**\nimport numpy as np\na = np.array([1, 2, 3])\nb = np.zeros((3, 3))\nc = np.linspace(0, 10, 100)\n\n**Phép toán:**\nnp.dot(a, b)   # tích vô hướng\nnp.cross(a, b) # tích có hướng\nnp.linalg.solve(A, b) # giải hệ PT`,
    subject: 'programming', tags: ['Python', 'NumPy', 'khoa học'],
    pinned: false, color: 'emerald',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
]

const LS_KEY = 'inphysic_notes_v1'

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Note[]
  } catch { /* ignore */ }
  return DEMO_NOTES
}

function saveNotes(notes: Note[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(notes)) } catch { /* ignore */ }
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)   return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

function newNote(): Note {
  return {
    id: `note-${Date.now()}`,
    title: 'Ghi chú mới',
    content: '',
    subject: 'other',
    tags: [],
    pinned: false,
    color: 'default',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────
// NoteCard
// ─────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  active,
  onClick,
  onPin,
  onDelete,
}: {
  note: Note
  active: boolean
  onClick: () => void
  onPin: () => void
  onDelete: () => void
}) {
  const [menu, setMenu] = useState(false)
  const col = COLOR_MAP[note.color] ?? COLOR_MAP.default
  const sub = SUBJECT_MAP[note.subject]
  const preview = note.content.replace(/[*#`]/g, '').slice(0, 80)

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border cursor-pointer transition-all duration-150 bg-gradient-to-br ${col.cls} ${col.border} ${active ? 'ring-1 ring-violet-500/50' : 'hover:border-white/15'}`}
    >
      {note.pinned && (
        <div className="absolute top-2 right-8 text-amber-400/70">
          <Pin className="w-3 h-3" />
        </div>
      )}

      {/* 3-dot menu */}
      <div className="absolute top-1.5 right-1.5">
        <button
          onClick={e => { e.stopPropagation(); setMenu(p => !p) }}
          className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        {menu && (
          <div
            className="absolute right-0 top-6 z-20 w-36 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { onPin(); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors">
              {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {note.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
            </button>
            <button onClick={() => { onDelete(); setMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </button>
          </div>
        )}
      </div>

      <div className="p-3.5 pt-3">
        <h3 className="text-sm font-semibold text-white/90 pr-12 truncate mb-1">{note.title || 'Không có tiêu đề'}</h3>
        <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-3 min-h-[2.5rem]">
          {preview || <span className="italic">Chưa có nội dung…</span>}
        </p>
        <div className="flex items-center gap-2 text-[0.65rem]">
          <span className={`flex items-center gap-1 ${sub.color}`}>{sub.icon}{sub.label}</span>
          <span className="text-white/20 ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{relativeTime(note.updatedAt)}</span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[0.6rem] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40 border border-white/[0.06]">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// NoteEditor
// ─────────────────────────────────────────────────────────────────
function NoteEditor({ note, onChange }: { note: Note; onChange: (n: Note) => void }) {
  const [tagInput, setTagInput] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showSubjectPicker, setShowSubjectPicker] = useState(false)
  const sub = SUBJECT_MAP[note.subject]
  const col = COLOR_MAP[note.color] ?? COLOR_MAP.default

  const update = (partial: Partial<Note>) => onChange({ ...note, ...partial, updatedAt: new Date().toISOString() })

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (t && !note.tags.includes(t)) update({ tags: [...note.tags, t] })
    setTagInput('')
  }

  const removeTag = (t: string) => update({ tags: note.tags.filter(x => x !== t) })

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <input
        value={note.title}
        onChange={e => update({ title: e.target.value })}
        placeholder="Tiêu đề…"
        className="w-full bg-transparent text-xl font-bold text-white/90 placeholder-white/20 border-b border-white/[0.06] pb-3 mb-4 focus:outline-none focus:border-violet-500/40 transition-colors"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Subject picker */}
        <div className="relative">
          <button
            onClick={() => { setShowSubjectPicker(p => !p); setShowColorPicker(false) }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] transition-colors ${sub.color}`}
          >
            {sub.icon}{sub.label}<ChevronDown className="w-3 h-3 text-white/30" />
          </button>
          {showSubjectPicker && (
            <div className="absolute top-8 left-0 z-20 w-44 bg-card border border-white/10 rounded-xl shadow-xl overflow-hidden">
              {SUBJECTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => { update({ subject: s.key }); setShowSubjectPicker(false) }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-white/[0.06] transition-colors ${s.color} ${note.subject === s.key ? 'bg-white/[0.06]' : ''}`}
                >
                  {s.icon}{s.label}
                  {note.subject === s.key && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => { setShowColorPicker(p => !p); setShowSubjectPicker(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] transition-colors"
          >
            <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${col.cls}`} />
            Màu<ChevronDown className="w-3 h-3 text-white/30" />
          </button>
          {showColorPicker && (
            <div className="absolute top-8 left-0 z-20 p-2 bg-card border border-white/10 rounded-xl shadow-xl flex gap-1.5 flex-wrap w-48">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => { update({ color: c.key }); setShowColorPicker(false) }}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.cls} border ${c.border} flex items-center justify-center transition-all hover:scale-110 ${note.color === c.key ? 'ring-2 ring-white/40' : ''}`}
                >
                  {note.color === c.key && <Check className="w-3 h-3 text-white/80" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pin */}
        <button
          onClick={() => update({ pinned: !note.pinned })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${note.pinned ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.08]'}`}
        >
          <Pin className="w-3.5 h-3.5" />{note.pinned ? 'Đã ghim' : 'Ghim'}
        </button>

        <span className="text-[0.65rem] text-white/25 ml-auto">Tự động lưu · {relativeTime(note.updatedAt)}</span>
      </div>

      {/* Content */}
      <textarea
        value={note.content}
        onChange={e => update({ content: e.target.value })}
        placeholder="Nội dung ghi chú… (hỗ trợ Markdown cơ bản: **đậm**, *nghiêng*, `code`)"
        className="flex-1 bg-transparent text-sm text-white/75 placeholder-white/20 resize-none focus:outline-none leading-relaxed font-mono"
      />

      {/* Tags */}
      <div className="pt-4 border-t border-white/[0.06]">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {note.tags.map(t => (
            <span key={t} className="flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/25">
              #{t}
              <button onClick={() => removeTag(t)} className="hover:text-white transition-colors"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-white/25" />
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }}
            placeholder="Thêm thẻ (Enter để lưu)…"
            className="flex-1 bg-transparent text-xs text-white/60 placeholder-white/20 focus:outline-none"
          />
          {tagInput && (
            <button onClick={addTag} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">+ Thêm</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState<Subject | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const activeNote = notes.find(n => n.id === activeId) ?? null

  // Auto-save on change
  const updateNote = useCallback((updated: Note) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === updated.id ? updated : n)
      saveNotes(next)
      return next
    })
  }, [])

  const createNote = useCallback(() => {
    const n = newNote()
    setNotes(prev => { const next = [n, ...prev]; saveNotes(next); return next })
    setActiveId(n.id)
  }, [])

  const deleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id)
      saveNotes(next)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
    setDeleteConfirm(null)
  }, [activeId])

  const togglePin = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.map(n => n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() } : n)
      saveNotes(next)
      return next
    })
  }, [])

  const sorted = useMemo(() => {
    const q = search.toLowerCase()
    return [...notes]
      .filter(n => {
        if (filterSubject !== 'all' && n.subject !== filterSubject) return false
        if (!q) return true
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.includes(q))
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [notes, search, filterSubject])

  const pinnedCount = notes.filter(n => n.pinned).length

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-white overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-white/[0.06]">
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <h1 className="text-sm font-bold">Ghi chú</h1>
              <span className="text-[0.65rem] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-full">{notes.length}</span>
            </div>
            <button
              onClick={createNote}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Mới
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm ghi chú…"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs text-white/70 placeholder-white/25 focus:outline-none focus:border-violet-500/40 transition-colors"
            />
          </div>

          {/* Subject filter chips */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <button
              onClick={() => setFilterSubject('all')}
              className={`text-[0.6rem] px-2 py-0.5 rounded-full border transition-colors ${filterSubject === 'all' ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/60'}`}
            >
              Tất cả
            </button>
            {SUBJECTS.filter(s => notes.some(n => n.subject === s.key)).map(s => (
              <button
                key={s.key}
                onClick={() => setFilterSubject(s.key)}
                className={`text-[0.6rem] px-2 py-0.5 rounded-full border transition-colors ${filterSubject === s.key ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/60'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pinnedCount > 0 && (
            <p className="text-[0.6rem] text-white/25 uppercase tracking-widest font-semibold px-1 mb-1 flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" /> Đã ghim
            </p>
          )}
          {sorted.filter(n => n.pinned).map(n => (
            <NoteCard key={n.id} note={n} active={n.id === activeId}
              onClick={() => setActiveId(n.id)}
              onPin={() => togglePin(n.id)}
              onDelete={() => setDeleteConfirm(n.id)}
            />
          ))}
          {sorted.some(n => !n.pinned) && pinnedCount > 0 && (
            <p className="text-[0.6rem] text-white/25 uppercase tracking-widest font-semibold px-1 mt-3 mb-1">Gần đây</p>
          )}
          {sorted.filter(n => !n.pinned).map(n => (
            <NoteCard key={n.id} note={n} active={n.id === activeId}
              onClick={() => setActiveId(n.id)}
              onPin={() => togglePin(n.id)}
              onDelete={() => setDeleteConfirm(n.id)}
            />
          ))}
          {sorted.length === 0 && (
            <div className="text-center py-10 text-white/25 text-xs">
              {search ? 'Không tìm thấy ghi chú nào' : 'Chưa có ghi chú'}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div className="px-4 py-3 border-t border-white/[0.05] flex items-center gap-3 text-[0.65rem] text-white/25">
          <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{notes.length} ghi chú</span>
          {pinnedCount > 0 && <span className="flex items-center gap-1"><Pin className="w-3 h-3" />{pinnedCount} đã ghim</span>}
        </div>
      </aside>

      {/* ── Editor ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">
        {activeNote ? (
          <div className="h-full p-6 overflow-y-auto">
            <NoteEditor key={activeNote.id} note={activeNote} onChange={updateNote} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-white/10 mb-4" />
            <p className="text-white/30 text-sm mb-1">Chọn một ghi chú để xem</p>
            <p className="text-white/20 text-xs mb-6">hoặc tạo ghi chú mới</p>
            <button
              onClick={createNote}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Tạo ghi chú đầu tiên
            </button>
          </div>
        )}
      </main>

      {/* ── Delete confirm modal ─────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-500/15 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="font-bold text-white/90">Xóa ghi chú?</h2>
            </div>
            <p className="text-sm text-white/50 mb-5">Hành động này không thể hoàn tác. Ghi chú sẽ bị xóa vĩnh viễn.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-sm text-white/60 transition-colors">Hủy</button>
              <button onClick={() => deleteNote(deleteConfirm)} className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold transition-colors">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
