/** Bố trí PCB 2 lớp: đặt linh kiện (footprint), định tuyến tay, ratsnest, DRC,
 *  xuất Gerber. Toạ độ MM; vẽ với PX_PER_MM. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCw, Cable, FileDown, ShieldCheck, Layers, Wand2 } from 'lucide-react'
import type { PcbComponent, PcbNet, PcbLayout as Layout, PcbTrace } from '@/types/pcb'
import { footprintOf, padAbs, padOf } from './pcbFootprints'
import { buildGerbers, makeZip } from './gerber'
import { autoRoute } from './autorouter'

const PX = 6
const uid = () => 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)

export default function PcbLayout({ comps, nets, layout, setLayout, title }: {
  comps: PcbComponent[]; nets: PcbNet[]; layout: Layout; setLayout: (fn: (l: Layout) => Layout) => void; title: string
}) {
  const [sel, setSel] = useState<string | null>(null)
  const [routing, setRouting] = useState(false)
  const [layer, setLayer] = useState<'top' | 'bottom'>('top')
  const [width, setWidth] = useState(0.3)
  const [active, setActive] = useState<{ pts: { x: number; y: number }[] } | null>(null)
  const [drc, setDrc] = useState<string[] | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ ref: string; dx: number; dy: number } | null>(null)

  // Auto-đặt linh kiện chưa có toạ độ vào lưới
  useEffect(() => {
    const missing = comps.filter((c) => !layout.placements[c.ref])
    if (!missing.length) return
    setLayout((l) => {
      const pl = { ...l.placements }; let i = Object.keys(pl).length
      for (const c of missing) { pl[c.ref] = { x: 8 + (i % 6) * 9, y: 8 + Math.floor(i / 6) * 9, rot: 0 }; i++ }
      return { ...l, placements: pl }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comps])

  const W = layout.board.w, H = layout.board.h
  const mm = (e: { clientX: number; clientY: number }) => { const r = svgRef.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / PX, y: (e.clientY - r.top) / PX } }

  useEffect(() => {
    const mv = (e: MouseEvent) => { if (!drag.current) return; const p = mm(e); setLayout((l) => ({ ...l, placements: { ...l.placements, [drag.current!.ref]: { ...l.placements[drag.current!.ref], x: Math.round((p.x - drag.current!.dx) * 2) / 2, y: Math.round((p.y - drag.current!.dy) * 2) / 2 } } })) }
    const up = () => { drag.current = null }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fpMap = useMemo(() => Object.fromEntries(comps.map((c) => [c.ref, footprintOf(c)])), [comps])
  const padPos = (ref: string, pin: string) => { const c = comps.find((x) => x.ref === ref); const pl = layout.placements[ref]; if (!c || !pl) return null; const pad = padOf(fpMap[ref], pin); return pad ? padAbs(pl, pad) : null }

  const rotate = () => { if (!sel) return; setLayout((l) => ({ ...l, placements: { ...l.placements, [sel]: { ...l.placements[sel], rot: ((l.placements[sel].rot || 0) + 90) % 360 } } })) }

  const onPadClick = (pos: { x: number; y: number }) => {
    if (!routing) return
    if (!active) { setActive({ pts: [pos] }); return }
    const pts = [...active.pts, pos]
    setLayout((l) => ({ ...l, traces: [...l.traces, { id: uid(), layer, width, pts }] }))
    setActive(null)
  }
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  const runDrc = () => {
    const out: string[] = []
    const unplaced = comps.filter((c) => !layout.placements[c.ref])
    if (unplaced.length) out.push(`⚠ ${unplaced.length} linh kiện chưa đặt: ${unplaced.map((c) => c.ref).join(', ')}`)
    // pad ngoài board
    let outside = 0
    comps.forEach((c) => { const pl = layout.placements[c.ref]; if (!pl) return; fpMap[c.ref]?.pads.forEach((pad) => { const a = padAbs(pl, pad); if (a.x < 0 || a.y < 0 || a.x > W || a.y > H) outside++ }) })
    if (outside) out.push(`⚠ ${outside} chân nằm ngoài viền board (chỉnh kích thước hoặc dời linh kiện)`)
    // pad chồng nhau (khác linh kiện, < 1.2mm tâm)
    const all: { ref: string; x: number; y: number }[] = []
    comps.forEach((c) => { const pl = layout.placements[c.ref]; if (!pl) return; fpMap[c.ref]?.pads.forEach((pad) => { const a = padAbs(pl, pad); all.push({ ref: c.ref, x: a.x, y: a.y }) }) })
    let clash = 0
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (all[i].ref !== all[j].ref && Math.hypot(all[i].x - all[j].x, all[i].y - all[j].y) < 1.2) clash++
    if (clash) out.push(`⚠ ${clash} cặp chân quá sát nhau (<1.2mm)`)
    out.push(`✓ ${comps.length} linh kiện · ${nets.length} net · ${layout.traces.length} đường mạch`)
    if (!unplaced.length && !outside && !clash) out.unshift('✓ Không phát hiện lỗi cơ bản (DRC tối thiểu — vẫn cần kiểm tra ở xưởng).')
    setDrc(out)
  }

  const exportGerber = () => { const zip = makeZip(buildGerbers(comps, nets, layout)); const a = document.createElement('a'); a.href = URL.createObjectURL(zip); a.download = `${title || 'board'}.gerber.zip`; a.click(); URL.revokeObjectURL(a.href) }

  const runAuto = () => {
    if ((layout.traces.length || (layout.vias || []).length) && !window.confirm('Tự động định tuyến sẽ THAY các đường mạch hiện có. Tiếp tục?')) return
    const r = autoRoute(comps, nets, layout)
    setLayout((l) => ({ ...l, traces: r.traces, vias: r.vias }))
    setDrc([`✓ Tự động định tuyến: nối ${r.routed}/${r.routed + r.failed} kết nối${r.failed ? `, còn ${r.failed} chưa nối (xem ratsnest)` : ''}.`, `${r.vias.length} via, ${r.traces.length} đoạn mạch.`])
  }

  const togglePour = () => setLayout((l) => ({ ...l, pour: l.pour ? null : { net: nets.find((n) => /gnd|mass/i.test(n.name))?.name || nets[0]?.name || 'GND', layer: 'bottom' } }))
  // các pad KHÔNG thuộc net phủ (để vẽ vòng hở đồng)
  const pourNet = layout.pour ? nets.find((n) => n.name === layout.pour!.net) : null
  const isPourPad = (ref: string, pin: string) => !!pourNet && pourNet.nodes.some((nd) => nd.comp === ref && nd.pin === pin)

  return (
    <div className="flex-1 flex min-h-0">
      {/* Controls */}
      <div className="w-56 shrink-0 border-r border-border bg-white dark:bg-slate-900 overflow-y-auto p-3 space-y-3 text-sm">
        <div>
          <div className="text-xs font-bold text-slate-500 mb-1">Kích thước board (mm)</div>
          <div className="flex items-center gap-1">
            <input type="number" value={W} onChange={(e) => setLayout((l) => ({ ...l, board: { ...l.board, w: Math.max(10, +e.target.value || 10) } }))} className="w-16 px-2 py-1 rounded border border-border bg-background" />
            <span className="text-slate-400">×</span>
            <input type="number" value={H} onChange={(e) => setLayout((l) => ({ ...l, board: { ...l.board, h: Math.max(10, +e.target.value || 10) } }))} className="w-16 px-2 py-1 rounded border border-border bg-background" />
          </div>
        </div>
        <button onClick={() => setRouting((v) => { setActive(null); return !v })} className={`w-full px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5 ${routing ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 border border-border'}`}>
          <Cable className="w-4 h-4" /> {routing ? 'Đang định tuyến…' : 'Định tuyến (nối pad)'}
        </button>
        {routing && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {(['top', 'bottom'] as const).map((ly) => <button key={ly} onClick={() => setLayer(ly)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ${layer === ly ? (ly === 'top' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-100 dark:bg-slate-800 border border-border'}`}><Layers className="w-3 h-3 inline mr-1" />{ly === 'top' ? 'Lớp trên' : 'Lớp dưới'}</button>)}
            </div>
            <label className="text-xs text-slate-500 flex items-center gap-2">Rộng (mm) <input type="number" step={0.05} value={width} onChange={(e) => setWidth(Math.max(0.1, +e.target.value || 0.3))} className="w-16 px-2 py-1 rounded border border-border bg-background" /></label>
            <p className="text-[10px] text-slate-400">Bấm pad → (bấm chỗ trống thêm điểm gãy) → bấm pad đích. Esc huỷ.</p>
          </div>
        )}
        {sel && <button onClick={rotate} className="w-full px-3 py-2 rounded-lg text-sm bg-slate-100 dark:bg-slate-800 border border-border inline-flex items-center justify-center gap-1.5"><RotateCw className="w-4 h-4" /> Xoay {sel} 90°</button>}
        <button onClick={togglePour} className={`w-full px-3 py-2 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1.5 ${layout.pour ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 border border-border'}`}>
          <Layers className="w-4 h-4" /> {layout.pour ? `Phủ đồng GND: ${layout.pour.net} (dưới)` : 'Phủ đồng GND (lớp dưới)'}
        </button>
        <button onClick={runAuto} className="w-full px-3 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white inline-flex items-center justify-center gap-1.5"><Wand2 className="w-4 h-4" /> Tự động định tuyến (A*)</button>
        <div className="flex gap-1.5">
          <button onClick={runDrc} className="flex-1 px-3 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white inline-flex items-center justify-center gap-1"><ShieldCheck className="w-4 h-4" /> DRC</button>
          <button onClick={exportGerber} className="flex-1 px-3 py-2 rounded-lg text-sm font-bold bg-cyan-600 text-white inline-flex items-center justify-center gap-1"><FileDown className="w-4 h-4" /> Gerber</button>
        </div>
        {drc && <div className="rounded-lg border border-border p-2 bg-slate-50 dark:bg-slate-800/60 text-[11px] space-y-0.5">{drc.map((l, i) => <div key={i} className={l.startsWith('⚠') ? 'text-amber-600' : 'text-slate-500'}>{l}</div>)}</div>}
        <p className="text-[10px] text-slate-400">Lưới gắp 0.5mm. Đường xám đứt = ratsnest (chưa nối). Kéo thân để dời linh kiện.</p>
      </div>

      {/* Board canvas */}
      <div className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-800 p-6">
        <svg ref={svgRef} width={W * PX} height={H * PX} style={{ background: '#0b6b3a', borderRadius: 6, boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}
          onClick={(e) => { if (e.target === svgRef.current) { if (routing && active) setActive((a) => a && { pts: [...a.pts, mm(e)] }); else setSel(null) } }}>
          {/* lưới */}
          <defs><pattern id="pg" width={5 * PX} height={5 * PX} patternUnits="userSpaceOnUse"><path d={`M ${5 * PX} 0 L 0 0 0 ${5 * PX}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} /></pattern></defs>
          <rect width={W * PX} height={H * PX} fill="url(#pg)" />

          {/* phủ đồng (ground plane) — lớp dưới, mờ + hở quanh pad khác net */}
          {layout.pour && (
            <g opacity={0.5}>
              <rect width={W * PX} height={H * PX} fill={layout.pour.layer === 'top' ? '#ef4444' : '#3b82f6'} opacity={0.18} />
              {comps.flatMap((c) => { const pl = layout.placements[c.ref]; if (!pl) return []; return fpMap[c.ref].pads.filter((pad) => !isPourPad(c.ref, pad.name) && (layout.pour!.layer === 'top' || !pad.smd)).map((pad, i) => { const a = padAbs(pl, pad); return <circle key={c.ref + i} cx={a.x * PX} cy={a.y * PX} r={(pad.d / 2 + 0.5) * PX} fill="#0b6b3a" /> }) })}
            </g>
          )}

          {/* ratsnest */}
          {nets.map((n) => n.nodes.slice(1).map((nd, i) => { const a = padPos(n.nodes[i].comp, n.nodes[i].pin); const b = padPos(nd.comp, nd.pin); if (!a || !b) return null; return <line key={n.id + i} x1={a.x * PX} y1={a.y * PX} x2={b.x * PX} y2={b.y * PX} stroke="#cbd5e1" strokeWidth={0.8} strokeDasharray="3 3" opacity={0.6} /> }))}

          {/* traces */}
          {layout.traces.map((t) => <polyline key={t.id} points={t.pts.map((p) => `${p.x * PX},${p.y * PX}`).join(' ')} fill="none" stroke={t.layer === 'top' ? '#ef4444' : '#3b82f6'} strokeWidth={Math.max(1.5, t.width * PX)} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />)}
          {active && active.pts.length > 0 && <polyline points={active.pts.map((p) => `${p.x * PX},${p.y * PX}`).join(' ')} fill="none" stroke={layer === 'top' ? '#ef4444' : '#3b82f6'} strokeWidth={Math.max(1.5, width * PX)} strokeDasharray="4 3" opacity={0.7} />}

          {/* vias */}
          {(layout.vias || []).map((v, i) => <g key={'v' + i}><circle cx={v.x * PX} cy={v.y * PX} r={0.45 * PX} fill="#d4af37" stroke="#7c5b12" strokeWidth={1} /><circle cx={v.x * PX} cy={v.y * PX} r={0.2 * PX} fill="#0b6b3a" /></g>)}

          {/* components */}
          {comps.map((c) => {
            const pl = layout.placements[c.ref]; if (!pl) return null
            const fp = fpMap[c.ref]; const cx = pl.x * PX, cy = pl.y * PX
            return (
              <g key={c.ref}>
                <rect x={cx - (fp.body.w * PX) / 2} y={cy - (fp.body.h * PX) / 2} width={fp.body.w * PX} height={fp.body.h * PX} rx={2}
                  transform={`rotate(${pl.rot || 0} ${cx} ${cy})`} fill="rgba(15,23,42,0.55)" stroke={sel === c.ref ? '#22d3ee' : 'rgba(255,255,255,0.4)'} strokeWidth={sel === c.ref ? 2 : 1}
                  style={{ cursor: 'move' }} onMouseDown={(e) => { const p = mm(e); drag.current = { ref: c.ref, dx: p.x - pl.x, dy: p.y - pl.y }; setSel(c.ref) }} />
                <text x={cx} y={cy - (fp.body.h * PX) / 2 - 3} fontSize={9} fontWeight="bold" fill="#fff" textAnchor="middle">{c.ref}</text>
                {fp.pads.map((pad, i) => { const a = padAbs(pl, pad); return (
                  <g key={i}>
                    {pad.smd
                      ? <rect x={(a.x - pad.w / 2) * PX} y={(a.y - pad.h / 2) * PX} width={pad.w * PX} height={pad.h * PX} rx={1} fill="#cd7f32" stroke="#7c5b12" strokeWidth={1} style={{ cursor: routing ? 'crosshair' : 'default' }} onClick={(e) => { e.stopPropagation(); onPadClick(a) }} />
                      : <><circle cx={a.x * PX} cy={a.y * PX} r={(pad.d / 2) * PX} fill="#d4af37" stroke="#7c5b12" strokeWidth={1} style={{ cursor: routing ? 'crosshair' : 'default' }} onClick={(e) => { e.stopPropagation(); onPadClick(a) }} /><circle cx={a.x * PX} cy={a.y * PX} r={(pad.drill / 2) * PX} fill="#0b6b3a" pointerEvents="none" /></>}
                  </g>
                ) })}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
