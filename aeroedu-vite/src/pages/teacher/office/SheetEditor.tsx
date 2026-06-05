/** Bảng tính online (Excel-like) — lưới ô + công thức cơ bản + nhập/xuất .xlsx. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { FileDown, FileUp, Plus, Loader2 } from 'lucide-react'
import { getOfficeDoc, useOfficeAutosave } from '@/services/office.service'
import type { SheetData } from '@/types/office'
import EditorBar from './EditorBar'

// ── Công thức ──────────────────────────────────────────────────
const colToIdx = (s: string) => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1 }
const idxToCol = (i: number) => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26) } return s }
const dispNum = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6))

/** Tính giá trị hiển thị cho toàn lưới (xử lý công thức + chống tham chiếu vòng). */
function computeGrid(cells: Record<string, string>, rows: number, cols: number): Record<string, string> {
  const cache: Record<string, number> = {}
  const visiting: Record<string, boolean> = {}
  const raw = (r: number, c: number) => cells[`${r}:${c}`] ?? ''
  const ref = (s: string) => { const m = /^([A-Za-z]+)(\d+)$/.exec(s); return m ? { r: parseInt(m[2], 10) - 1, c: colToIdx(m[1]) } : { r: 0, c: 0 } }
  function val(r: number, c: number): number {
    const key = `${r}:${c}`
    if (key in cache) return cache[key]
    if (visiting[key]) return NaN
    const rw = raw(r, c)
    if (rw === '') { cache[key] = 0; return 0 }
    if (!rw.startsWith('=')) { const n = parseFloat(rw.replace(',', '.')); cache[key] = isNaN(n) ? NaN : n; return cache[key] }
    visiting[key] = true
    const v = evalF(rw.slice(1))
    delete visiting[key]; cache[key] = v; return v
  }
  function evalF(expr: string): number {
    let e = expr.replace(/(SUM|AVERAGE|AVG|MIN|MAX|COUNT|PRODUCT)\s*\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)/gi, (_m, fn, a, b) => {
      const A = ref(a), B = ref(b); const nums: number[] = []
      for (let rr = Math.min(A.r, B.r); rr <= Math.max(A.r, B.r); rr++)
        for (let cc = Math.min(A.c, B.c); cc <= Math.max(A.c, B.c); cc++) { const x = val(rr, cc); if (!isNaN(x)) nums.push(x) }
      const F = String(fn).toUpperCase()
      if (F === 'SUM') return String(nums.reduce((s, x) => s + x, 0))
      if (F === 'AVERAGE' || F === 'AVG') return String(nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : 0)
      if (F === 'MIN') return String(nums.length ? Math.min(...nums) : 0)
      if (F === 'MAX') return String(nums.length ? Math.max(...nums) : 0)
      if (F === 'COUNT') return String(nums.length)
      if (F === 'PRODUCT') return String(nums.reduce((s, x) => s * x, 1))
      return '0'
    })
    e = e.replace(/[A-Za-z]+\d+/g, (r0) => { const { r, c } = ref(r0); const x = val(r, c); return isNaN(x) ? '0' : String(x) })
    if (!/^[-+*/%(). \d eE]+$/.test(e)) return NaN
    try { const out = Function('"use strict";return (' + e + ')')(); return typeof out === 'number' && isFinite(out) ? out : NaN } catch { return NaN }
  }
  const disp: Record<string, string> = {}
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const rw = raw(r, c); if (rw === '') continue
    if (rw.startsWith('=')) { const v = val(r, c); disp[`${r}:${c}`] = isNaN(v) ? '#ERR' : dispNum(v) }
    else disp[`${r}:${c}`] = rw
  }
  return disp
}

export default function SheetEditor() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('Bảng tính')
  const [rows, setRows] = useState(30)
  const [cols, setCols] = useState(12)
  const [cells, setCells] = useState<Record<string, string>>({})
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 0 })
  const [ready, setReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getOfficeDoc(id).then((d) => {
      const s = d.data as SheetData
      setTitle(d.title); setRows(s?.rows || 30); setCols(s?.cols || 12); setCells(s?.cells || {}); setReady(true)
    }).catch(() => setReady(true))
  }, [id])

  const status = useOfficeAutosave(id, ready, () => ({ title, data: { rows, cols, cells } }), [title, cells, rows, cols])
  const disp = useMemo(() => computeGrid(cells, rows, cols), [cells, rows, cols])

  const setCell = (r: number, c: number, v: string) => setCells((m) => { const n = { ...m }; if (v === '') delete n[`${r}:${c}`]; else n[`${r}:${c}`] = v; return n })
  const selKey = `${sel.r}:${sel.c}`
  const selRaw = cells[selKey] ?? ''

  const exportXlsx = () => {
    const aoa: (string | number)[][] = []
    for (let r = 0; r < rows; r++) { const row: (string | number)[] = []; for (let c = 0; c < cols; c++) { const v = disp[`${r}:${c}`] ?? ''; const n = parseFloat(v); row.push(v !== '' && !isNaN(n) && String(n) === v ? n : v) } aoa.push(row) }
    const ws = XLSX.utils.aoa_to_sheet(aoa); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${title || 'bang-tinh'}.xlsx`)
  }
  const importXlsx = async (f: File) => {
    const buf = await f.arrayBuffer(); const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]; const aoa = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, blankrows: true })
    const next: Record<string, string> = {}; let maxC = cols
    aoa.forEach((row, r) => (row || []).forEach((v, c) => { if (v !== null && v !== undefined && v !== '') { next[`${r}:${c}`] = String(v); if (c + 1 > maxC) maxC = c + 1 } }))
    setRows(Math.max(rows, aoa.length + 2)); setCols(Math.min(60, Math.max(cols, maxC))); setCells(next)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-foreground flex flex-col">
      <EditorBar title={title} onTitle={setTitle} status={status}>
        <button onClick={() => fileRef.current?.click()} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-border inline-flex items-center gap-1"><FileUp className="w-3.5 h-3.5" /> Nhập</button>
        <button onClick={exportXlsx} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white inline-flex items-center gap-1"><FileDown className="w-3.5 h-3.5" /> Excel</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => e.target.files?.[0] && importXlsx(e.target.files[0])} />
      </EditorBar>

      {/* Thanh công thức */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-border">
        <span className="text-xs font-mono font-bold text-slate-500 w-12 text-center">{idxToCol(sel.c)}{sel.r + 1}</span>
        <span className="text-slate-400">=</span>
        <input value={selRaw} onChange={(e) => setCell(sel.r, sel.c, e.target.value)} placeholder="Giá trị hoặc =SUM(A1:A5)…"
          className="flex-1 text-sm font-mono bg-transparent border-0 focus:outline-none px-1" />
      </div>

      {/* Lưới */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse select-none" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-slate-200 dark:bg-slate-800 border border-border w-10 h-7" />
              {Array.from({ length: cols }, (_, c) => (
                <th key={c} className="sticky top-0 z-10 bg-slate-200 dark:bg-slate-800 border border-border text-xs font-bold text-slate-500" style={{ minWidth: 84, width: 84, height: 28 }}>{idxToCol(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                <td className="sticky left-0 z-10 bg-slate-200 dark:bg-slate-800 border border-border text-xs font-bold text-slate-500 text-center" style={{ width: 40 }}>{r + 1}</td>
                {Array.from({ length: cols }, (_, c) => {
                  const isSel = sel.r === r && sel.c === c
                  return (
                    <td key={c} onClick={() => setSel({ r, c })}
                      className={`border border-border p-0 text-sm ${isSel ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}
                      style={{ minWidth: 84, width: 84, height: 26 }}>
                      {isSel ? (
                        <input autoFocus value={cells[`${r}:${c}`] ?? ''} onChange={(e) => setCell(r, c, e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setSel({ r: Math.min(rows - 1, r + 1), c }) } else if (e.key === 'Tab') { e.preventDefault(); setSel({ r, c: Math.min(cols - 1, c + 1) }) } }}
                          className="w-full h-full px-1 bg-transparent border-0 focus:outline-none text-sm font-mono" />
                      ) : (
                        <div className="px-1 truncate w-full h-full leading-[24px] font-mono">{disp[`${r}:${c}`] ?? ''}</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 p-2">
          <button onClick={() => setRows((r) => r + 10)} className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-border inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 10 hàng</button>
          <button onClick={() => setCols((c) => Math.min(60, c + 4))} className="px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-800 border border-border inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> 4 cột</button>
        </div>
      </div>
      {!ready && <div className="fixed inset-0 grid place-items-center bg-slate-100/60 dark:bg-slate-950/60"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>}
    </div>
  )
}
