/** Thư viện & khởi tạo dự án thiết kế mạch (PCB/Schematic) có AI hỗ trợ. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircuitBoard, Plus, Trash2, Loader2, Clock, Sparkles } from 'lucide-react'
import { listOfficeDocs, createOfficeDoc, deleteOfficeDoc } from '@/services/office.service'
import type { OfficeDoc } from '@/types/office'

export default function PcbHub() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<OfficeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = () => { setLoading(true); listOfficeDocs('pcb').then((d) => { setDocs(d); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const create = async () => {
    setBusy(true)
    try { const doc = await createOfficeDoc('pcb', 'Mạch mới', { components: [], nets: [] }); navigate(`/teacher/pcb/${doc.id}`) }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Tạo thất bại'); setBusy(false) }
  }
  const remove = async (d: OfficeDoc) => { if (!window.confirm(`Xoá "${d.title}"?`)) return; try { await deleteOfficeDoc(d.id); setDocs((x) => x.filter((y) => y.id !== d.id)) } catch { /* noop */ } }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-cyan-50 dark:from-slate-950 dark:to-slate-900 text-foreground">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-400/30 grid place-items-center"><CircuitBoard className="w-6 h-6 text-cyan-500" /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-cyan-700 dark:text-cyan-300">Thiết kế mạch (PCB)</h1>
            <p className="text-sm text-slate-500">Vẽ sơ đồ nguyên lý, nối chân, xuất netlist — có <b className="text-cyan-600">AI sinh mạch từ mô tả</b>.</p>
          </div>
        </div>

        <button onClick={create} disabled={busy}
          className="w-full sm:w-auto mt-4 mb-6 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold inline-flex items-center gap-2 shadow disabled:opacity-60">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Tạo mạch mới
          <span className="text-[11px] font-normal bg-white/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> kèm AI</span>
        </button>

        {err && <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-700 text-sm">{err}</div>}

        <div className="text-sm text-slate-400 mb-2">{docs.length} dự án</div>
        {loading ? <div className="py-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" /></div>
          : docs.length === 0 ? <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-slate-400">Chưa có mạch nào.</div>
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-800/60 border border-border p-3 hover:border-cyan-400/50">
                    <button onClick={() => navigate(`/teacher/pcb/${d.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/15 grid place-items-center shrink-0"><CircuitBoard className="w-5 h-5 text-cyan-500" /></div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{d.title}</div>
                        <div className="text-[11px] text-slate-400 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {d.updatedAt ? new Date(d.updatedAt).toLocaleString('vi-VN') : ''}</div>
                      </div>
                    </button>
                    <button onClick={() => remove(d)} className="p-2 rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  )
}
