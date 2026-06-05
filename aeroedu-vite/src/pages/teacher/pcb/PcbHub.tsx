/** Thư viện & khởi tạo dự án thiết kế mạch (PCB/Schematic) có AI hỗ trợ. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircuitBoard, Plus, Trash2, Loader2, Clock, Sparkles } from 'lucide-react'
import { listOfficeDocs, createOfficeDoc, deleteOfficeDoc } from '@/services/office.service'
import type { OfficeDoc } from '@/types/office'
import { PCB_TEMPLATES, buildTemplate, type PcbTemplate } from './pcbTemplates'
import { autoRoute } from './autorouter'

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
  const createFromTemplate = async (tpl: PcbTemplate) => {
    setBusy(true)
    try {
      const t = buildTemplate(tpl)
      const r = autoRoute(t.components, t.nets, t.layout)   // tự định tuyến sẵn (GND phủ đồng + còn lại A*)
      t.layout.traces = r.traces; t.layout.vias = r.vias
      const doc = await createOfficeDoc('pcb', t.title, { components: t.components, nets: t.nets, layout: t.layout })
      navigate(`/teacher/pcb/${doc.id}`)
    }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Tạo mẫu thất bại'); setBusy(false) }
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

        <div className="flex flex-col sm:flex-row gap-2 mt-4 mb-5">
          <button onClick={create} disabled={busy}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold inline-flex items-center justify-center gap-2 shadow disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Tạo mạch mới
            <span className="text-[11px] font-normal bg-white/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> kèm AI</span>
          </button>
        </div>

        {err && <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-700 text-sm">{err}</div>}

        {/* Mẫu mạch có sẵn — netlist + sơ đồ chân dựng sẵn, mở ra là dùng */}
        <div className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-500" /> Mẫu mạch có sẵn (sơ đồ chân dựng sẵn)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-7">
          {PCB_TEMPLATES.map((tpl) => (
            <button key={tpl.id} onClick={() => createFromTemplate(tpl)} disabled={busy}
              className="text-left flex items-start gap-3 rounded-2xl border border-border bg-white dark:bg-slate-800/60 p-3.5 hover:border-violet-400/60 hover:shadow disabled:opacity-60">
              <div className="text-2xl leading-none mt-0.5">{tpl.emoji}</div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-violet-700 dark:text-violet-300">{tpl.title}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">{tpl.desc}</div>
                <div className="text-[10px] text-slate-400 mt-1">{tpl.defs.length} linh kiện · {tpl.nets.length} net · {tpl.board.w}×{tpl.board.h} mm</div>
              </div>
            </button>
          ))}
        </div>

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
