/** Trình vẽ sơ đồ nguyên lý (schematic) + AI sinh mạch + xuất netlist. */
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles, Loader2, Trash2, Download, Cable, ListTree, X } from 'lucide-react'
import { getOfficeDoc, useOfficeAutosave } from '@/services/office.service'
import { aiGenerateCircuit } from '@/services/pcb.service'
import type { PcbComponent, PcbNet, PcbType, PcbDoc, PcbLayout as Layout } from '@/types/pcb'
import { TEMPLATES, pinLocal, compSize, Glyph } from './pcbSymbols'
import PcbLayout from './PcbLayout'
import EditorBar from '../office/EditorBar'

const Board3D = lazy(() => import('./Board3D'))
const DEFAULT_LAYOUT: Layout = { board: { w: 60, h: 40 }, placements: {}, traces: [] }

const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
const PREFIX: Record<PcbType, string> = { R: 'R', C: 'C', LED: 'D', D: 'D', Q: 'Q', SW: 'SW', BAT: 'BT', GND: 'GND', VCC: 'VCC', MCU: 'U', IC: 'U', SENSOR: 'U', HDR: 'J' }
const ALL_TYPES = Object.keys(TEMPLATES) as PcbType[]
const validType = (t: string): PcbType => (TEMPLATES as Record<string, unknown>)[t] ? (t as PcbType) : 'IC'

export default function PcbEditor() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('Mạch')
  const [comps, setComps] = useState<PcbComponent[]>([])
  const [nets, setNets] = useState<PcbNet[]>([])
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [mode, setMode] = useState<'sch' | 'pcb' | '3d'>('sch')
  const [ready, setReady] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [pending, setPending] = useState<{ comp: string; pin: string } | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState('')
  const [showBom, setShowBom] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)

  useEffect(() => {
    if (!id) return
    getOfficeDoc(id).then((d) => {
      const data = d.data as unknown as PcbDoc
      setTitle(d.title); setComps(data?.components || []); setNets(data?.nets || [])
      setLayout(data?.layout && data.layout.board ? data.layout : DEFAULT_LAYOUT); setReady(true)
    }).catch(() => setReady(true))
  }, [id])

  const status = useOfficeAutosave(id, ready, () => ({ title, data: { components: comps, nets, layout } }), [title, comps, nets, layout])

  const nextRef = (type: PcbType, list: PcbComponent[]) => {
    const p = PREFIX[type]; let max = 0
    list.forEach((c) => { const m = new RegExp(`^${p}(\\d+)$`).exec(c.ref); if (m) max = Math.max(max, parseInt(m[1], 10)) })
    return `${p}${max + 1}`
  }
  const addComponent = (type: PcbType) => setComps((cs) => {
    const t = TEMPLATES[type]
    const n = cs.length
    return [...cs, { id: uid(), type, ref: nextRef(type, cs), value: t.value, pins: [...t.pins], x: 70 + (n % 5) * 200, y: 70 + Math.floor(n / 5) * 160 }]
  })
  const patchComp = (cid: string, p: Partial<PcbComponent>) => setComps((cs) => cs.map((c) => (c.id === cid ? { ...c, ...p } : c)))
  const removeComp = (cid: string) => {
    const c = comps.find((x) => x.id === cid); if (!c) return
    setComps((cs) => cs.filter((x) => x.id !== cid))
    setNets((ns) => ns.map((nn) => ({ ...nn, nodes: nn.nodes.filter((nd) => nd.comp !== c.ref) })).filter((nn) => nn.nodes.length >= 2))
    setSel(null)
  }

  // ── Nối chân ──
  const sameNode = (a: { comp: string; pin: string }, b: { comp: string; pin: string }) => a.comp === b.comp && a.pin === b.pin
  const onPinClick = (comp: string, pin: string) => {
    if (!pending) { setPending({ comp, pin }); return }
    if (sameNode(pending, { comp, pin })) { setPending(null); return }
    const a = pending, b = { comp, pin }
    setNets((ns) => {
      const inNet = (n: PcbNet, nd: { comp: string; pin: string }) => n.nodes.some((x) => sameNode(x, nd))
      const ia = ns.findIndex((n) => inNet(n, a)); const ib = ns.findIndex((n) => inNet(n, b))
      if (ia >= 0 && ib >= 0) { if (ia === ib) return ns; const merged = { ...ns[ia], nodes: [...ns[ia].nodes, ...ns[ib].nodes] }; return ns.map((n, i) => (i === ia ? merged : n)).filter((_, i) => i !== ib) }
      if (ia >= 0) return ns.map((n, i) => (i === ia ? { ...n, nodes: [...n.nodes, b] } : n))
      if (ib >= 0) return ns.map((n, i) => (i === ib ? { ...n, nodes: [...n.nodes, a] } : n))
      return [...ns, { id: uid(), name: `NET${ns.length + 1}`, nodes: [a, b] }]
    })
    setPending(null)
  }

  // ── Kéo linh kiện ──
  const svgPt = (e: { clientX: number; clientY: number }) => { const r = svgRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  useEffect(() => {
    const mv = (e: MouseEvent) => { if (!drag.current) return; const p = svgPt(e); patchComp(drag.current.id, { x: Math.round((p.x - drag.current.dx) / 10) * 10, y: Math.round((p.y - drag.current.dy) / 10) * 10 }) }
    const up = () => { drag.current = null }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])

  // Vị trí tuyệt đối của 1 chân
  const pinAbs = (ref: string, pin: string) => {
    const c = comps.find((x) => x.ref === ref); if (!c) return null
    const pl = pinLocal(c).find((p) => p.name === pin) || pinLocal(c)[0]
    return pl ? { x: c.x + pl.x, y: c.y + pl.y } : null
  }
  const connectedPins = useMemo(() => { const s = new Set<string>(); nets.forEach((n) => n.nodes.forEach((nd) => s.add(`${nd.comp}|${nd.pin}`))); return s }, [nets])

  const applyAi = (r: { title: string; components: Array<Omit<PcbComponent, 'x' | 'y' | 'id'>>; nets: PcbNet[] }) => {
    const cs: PcbComponent[] = r.components.map((c, i) => {
      const t = validType(c.type)
      return { id: uid(), type: t, ref: c.ref || `${PREFIX[t]}${i + 1}`, value: c.value || TEMPLATES[t].value, pins: c.pins && c.pins.length ? c.pins : [...TEMPLATES[t].pins], x: 70 + (i % 5) * 210, y: 70 + Math.floor(i / 5) * 170 }
    })
    const refs = new Set(cs.map((c) => c.ref))
    const ns: PcbNet[] = (r.nets || []).map((n) => ({ id: uid(), name: n.name || 'NET', nodes: (n.nodes || []).filter((nd) => nd && refs.has(nd.comp)) })).filter((n) => n.nodes.length >= 2)
    setComps(cs); setNets(ns); if (r.title) setTitle(r.title)
  }
  const runAi = async () => {
    if (!aiPrompt.trim()) return
    setAiBusy(true); setAiErr('')
    try { applyAi(await aiGenerateCircuit(aiPrompt.trim())) }
    catch (e: unknown) { setAiErr((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Sinh mạch thất bại') }
    setAiBusy(false)
  }

  const exportNetlist = () => {
    const data = { title, components: comps.map(({ id: _i, x: _x, y: _y, ...c }) => c), nets: nets.map(({ id: _i, ...n }) => n) }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${title || 'mach'}.netlist.json`; a.click(); URL.revokeObjectURL(a.href)
  }

  const W = 1600, H = 1000

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground flex flex-col">
      <EditorBar title={title} onTitle={setTitle} status={status} backTo="/teacher/pcb">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-1">
          {([['sch', 'Sơ đồ'], ['pcb', 'Bố trí'], ['3d', '3D']] as const).map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} className={`px-2.5 py-1 rounded text-xs font-bold ${mode === m ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
        {mode === 'sch' && <>
          <button onClick={() => setShowBom((v) => !v)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-border inline-flex items-center gap-1"><ListTree className="w-3.5 h-3.5" /> Netlist</button>
          <button onClick={exportNetlist} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Xuất</button>
        </>}
      </EditorBar>

      {mode === 'pcb' && <PcbLayout comps={comps} nets={nets} layout={layout} setLayout={setLayout} title={title} />}
      {mode === '3d' && <div className="flex-1 min-h-0"><Suspense fallback={<div className="grid place-items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>}><Board3D comps={comps} layout={layout} /></Suspense></div>}

      <div className="flex-1 flex min-h-0" style={{ display: mode === 'sch' ? undefined : 'none' }}>
        {/* Sidebar: AI + palette */}
        <div className="w-56 sm:w-64 shrink-0 border-r border-border bg-white dark:bg-slate-900 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-xs font-bold text-cyan-600 mb-1.5 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI sinh mạch</div>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} placeholder="VD: Mạch chớp LED dùng ESP32, có điện trở hạn dòng và nút nhấn…"
              className="w-full text-sm px-2.5 py-2 rounded-lg border border-border bg-background" />
            <button onClick={runAi} disabled={aiBusy || !aiPrompt.trim()} className="mt-1.5 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
              {aiBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang sinh…</> : <><Sparkles className="w-4 h-4" /> Sinh mạch</>}
            </button>
            {aiErr && <div className="text-[11px] text-rose-500 mt-1">{aiErr}</div>}
            <p className="text-[10px] text-slate-400 mt-1">⚠ AI gợi ý sơ đồ — hãy kiểm tra lại giá trị & kết nối trước khi dùng thật.</p>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 mb-1.5">Thêm linh kiện</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_TYPES.map((t) => (
                <button key={t} onClick={() => addComponent(t)} title={TEMPLATES[t].label}
                  className="px-2 py-1.5 rounded-lg border border-border text-xs font-medium hover:border-cyan-400/60 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 inline-flex items-center gap-1.5">
                  <span className="text-cyan-500">{TEMPLATES[t].icon}</span> {TEMPLATES[t].label}
                </button>
              ))}
            </div>
          </div>

          {sel && (() => { const c = comps.find((x) => x.id === sel); if (!c) return null; return (
            <div className="rounded-xl border border-cyan-400/40 p-2.5 bg-cyan-50/50 dark:bg-cyan-900/20">
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold">{c.ref} · {TEMPLATES[c.type].label}</span><button onClick={() => removeComp(c.id)} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
              <input value={c.value} onChange={(e) => patchComp(c.id, { value: e.target.value })} placeholder="Giá trị" className="w-full text-sm px-2 py-1.5 rounded border border-border bg-background mb-1" />
              <input value={c.ref} onChange={(e) => patchComp(c.id, { ref: e.target.value })} placeholder="Mã (R1…)" className="w-full text-sm px-2 py-1.5 rounded border border-border bg-background font-mono" />
            </div>
          ) })()}

          <p className="text-[10px] text-slate-400 leading-relaxed">💡 <b>Nối dây</b>: bấm 1 chân rồi bấm chân kia. Kéo thân linh kiện để di chuyển. Bấm vào linh kiện để sửa giá trị/xoá.</p>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 relative">
          {pending && <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-bold shadow inline-flex items-center gap-1"><Cable className="w-3.5 h-3.5" /> Chọn chân thứ 2 để nối · <button onClick={() => setPending(null)} className="underline">huỷ</button></div>}
          <svg ref={svgRef} width={W} height={H} style={{ display: 'block' }} onClick={(e) => { if (e.target === svgRef.current) setSel(null) }}>
            <defs><pattern id="grid" width={20} height={20} patternUnits="userSpaceOnUse"><circle cx={1} cy={1} r={1} fill="#cbd5e1" /></pattern></defs>
            <rect width={W} height={H} fill="url(#grid)" />
            {/* nets */}
            {nets.map((n) => {
              const pts = n.nodes.map((nd) => pinAbs(nd.comp, nd.pin)).filter(Boolean) as { x: number; y: number }[]
              return <g key={n.id}>{pts.slice(1).map((p, i) => <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke="#16a34a" strokeWidth={2} />)}
                {pts.map((p, i) => <circle key={'j' + i} cx={p.x} cy={p.y} r={3} fill="#16a34a" />)}</g>
            })}
            {/* components */}
            {comps.map((c) => {
              const { w, h } = compSize(c)
              return (
                <g key={c.id} transform={`translate(${c.x},${c.y})`}>
                  <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={6} fill={sel === c.id ? 'rgba(34,211,238,0.10)' : 'transparent'} stroke={sel === c.id ? '#06b6d4' : 'transparent'} strokeWidth={1.5}
                    style={{ cursor: 'move' }}
                    onMouseDown={(e) => { const p = svgPt(e); drag.current = { id: c.id, dx: p.x - c.x, dy: p.y - c.y }; setSel(c.id) }} />
                  <Glyph c={c} />
                  {pinLocal(c).map((p, i) => {
                    const on = pending && pending.comp === c.ref && pending.pin === p.name
                    const conn = connectedPins.has(`${c.ref}|${p.name}`)
                    return <circle key={i} cx={p.x} cy={p.y} r={5} fill={on ? '#f59e0b' : conn ? '#16a34a' : '#94a3b8'} stroke="#fff" strokeWidth={1.5}
                      style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); onPinClick(c.ref, p.name) }}>
                      <title>{c.ref}.{p.name}</title>
                    </circle>
                  })}
                </g>
              )
            })}
          </svg>
          {comps.length === 0 && <div className="absolute inset-0 grid place-items-center pointer-events-none"><div className="text-center text-slate-400"><Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" /><div className="text-sm">Mô tả mạch cho AI hoặc thêm linh kiện từ thanh trái</div></div></div>}
        </div>

        {/* Netlist/BOM panel */}
        {showBom && (
          <div className="w-64 shrink-0 border-l border-border bg-white dark:bg-slate-900 overflow-y-auto p-3 text-sm">
            <div className="flex items-center justify-between mb-2"><span className="font-bold">Netlist & BOM</span><button onClick={() => setShowBom(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
            <div className="text-xs font-bold text-slate-500 mb-1">Linh kiện ({comps.length})</div>
            <div className="space-y-1 mb-3">{comps.map((c) => <div key={c.id} className="flex justify-between text-xs"><span className="font-mono font-bold">{c.ref}</span><span className="text-slate-500">{TEMPLATES[c.type].label} · {c.value}</span></div>)}</div>
            <div className="text-xs font-bold text-slate-500 mb-1">Kết nối ({nets.length})</div>
            <div className="space-y-1">{nets.map((n) => <div key={n.id} className="text-[11px]"><span className="font-mono font-bold text-emerald-600">{n.name}</span>: {n.nodes.map((nd) => `${nd.comp}.${nd.pin}`).join(' — ')}</div>)}</div>
          </div>
        )}
      </div>
      {!ready && <div className="fixed inset-0 grid place-items-center bg-slate-100/60 dark:bg-slate-950/60"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>}
    </div>
  )
}
