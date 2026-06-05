/**
 * OfficeHub — trang khởi chạy & thư viện bộ công cụ Văn phòng online của GV:
 * Soạn văn bản (doc) · Trình chiếu (slides) · Bảng tính (sheet).
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Presentation, Grid3x3, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { listOfficeDocs, createOfficeDoc, deleteOfficeDoc } from '@/services/office.service'
import type { OfficeDoc, OfficeKind } from '@/types/office'

const KINDS: { kind: OfficeKind; label: string; icon: typeof FileText; color: string; route: string; newTitle: string; newData: () => unknown }[] = [
  { kind: 'doc', label: 'Văn bản', icon: FileText, color: 'from-blue-500 to-indigo-600', route: 'doc', newTitle: 'Văn bản mới', newData: () => ({ html: '<h1>Tiêu đề</h1><p>Bắt đầu soạn thảo…</p>' }) },
  { kind: 'slides', label: 'Trình chiếu', icon: Presentation, color: 'from-orange-500 to-rose-600', route: 'slides', newTitle: 'Bài trình chiếu mới', newData: () => ({ slides: [{ id: 's1', title: 'Tiêu đề bài trình chiếu', body: '<p>Nội dung slide đầu tiên</p>', bg: '#0f172a' }] }) },
  { kind: 'sheet', label: 'Bảng tính', icon: Grid3x3, color: 'from-emerald-500 to-teal-600', route: 'sheet', newTitle: 'Bảng tính mới', newData: () => ({ rows: 30, cols: 12, cells: {} }) },
]

export default function OfficeHub() {
  const navigate = useNavigate()
  const { kind: kindParam } = useParams<{ kind?: string }>()
  const initialFilter = (['doc', 'sheet', 'slides'].includes(kindParam || '') ? kindParam : 'all') as OfficeKind | 'all'
  const [docs, setDocs] = useState<OfficeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OfficeKind | 'all'>(initialFilter)
  useEffect(() => { setFilter(initialFilter) }, [kindParam])  // eslint-disable-line react-hooks/exhaustive-deps
  const [creating, setCreating] = useState<OfficeKind | null>(null)
  const [err, setErr] = useState('')

  const load = () => {
    setLoading(true)
    listOfficeDocs().then((d) => { setDocs(d); setLoading(false) }).catch((e) => { setErr(e?.response?.data?.error || 'Không tải được'); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const create = async (k: typeof KINDS[number]) => {
    setCreating(k.kind)
    try {
      const doc = await createOfficeDoc(k.kind, k.newTitle, k.newData())
      navigate(`/teacher/office/${k.route}/${doc.id}`)
    } catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Tạo thất bại'); setCreating(null) }
  }
  const remove = async (d: OfficeDoc) => {
    if (!window.confirm(`Xoá "${d.title}"?`)) return
    try { await deleteOfficeDoc(d.id); setDocs((xs) => xs.filter((x) => x.id !== d.id)) } catch { /* noop */ }
  }
  const meta = (k: OfficeKind) => KINDS.find((x) => x.kind === k)!
  const shown = filter === 'all' ? docs : docs.filter((d) => d.kind === filter)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 text-foreground">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mb-1">Văn phòng online</h1>
        <p className="text-sm text-slate-500 mb-5">Soạn văn bản, bài trình chiếu và bảng tính — tự lưu, xuất file, không cần cài đặt.</p>

        {/* Tạo mới */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
          {KINDS.map((k) => {
            const Icon = k.icon
            return (
              <button key={k.kind} onClick={() => create(k)} disabled={creating !== null}
                className="group relative overflow-hidden rounded-2xl p-5 text-left bg-white dark:bg-slate-800/60 border border-border hover:border-indigo-400/50 hover:scale-[1.01] transition-all disabled:opacity-60">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center mb-3 shadow`}>
                  {creating === k.kind ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Icon className="w-6 h-6 text-white" />}
                </div>
                <div className="font-bold flex items-center gap-1.5">{k.label}</div>
                <div className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Tạo {k.label.toLowerCase()} mới</div>
              </button>
            )
          })}
        </div>

        {err && <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 text-sm">{err}</div>}

        {/* Bộ lọc */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {(['all', 'doc', 'slides', 'sheet'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-border text-slate-500'}`}>
              {f === 'all' ? 'Tất cả' : meta(f).label}
            </button>
          ))}
          <span className="ml-auto text-sm text-slate-400">{shown.length} tài liệu</span>
        </div>

        {/* Danh sách */}
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" /></div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-slate-400">Chưa có tài liệu nào. Tạo mới ở trên nhé!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shown.map((d) => {
              const m = meta(d.kind); const Icon = m.icon
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800/60 border border-border p-3 hover:border-indigo-400/50 transition">
                  <button onClick={() => navigate(`/teacher/office/${m.route}/${d.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5 text-white" /></div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{d.title}</div>
                      <div className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {d.updatedAt ? new Date(d.updatedAt).toLocaleString('vi-VN') : ''} · {m.label}</div>
                    </div>
                  </button>
                  <button onClick={() => remove(d)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
