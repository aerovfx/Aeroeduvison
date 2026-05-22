/**
 * SpreadsheetExtension — TipTap custom node "spreadsheet" với formula support
 *
 * Tương tự Excel/Google Sheets nhúng inline trong giáo án WYSIWYG.
 *
 * Features:
 *  - Grid editable (mặc định 5x5, có thể add/del rows + cols qua toolbar)
 *  - Cell có formula bắt đầu bằng `=`:
 *      =A1+B1                  → cộng cell
 *      =SUM(A1:A5)             → tổng range
 *      =AVG(A1:B3) / AVERAGE   → trung bình
 *      =COUNT(A1:A10)          → đếm số ô có value
 *      =MIN(...) / MAX(...)    → min/max
 *      =5*3+2                  → biểu thức số học thuần
 *  - Header row tự gen A, B, C... · Header col tự gen 1, 2, 3...
 *  - Lưu state: { rows: number, cols: number, cells: { [addr: string]: string } }
 *    addr format "A1", "B3" — chỉ lưu cell có value để tiết kiệm.
 *  - Render trong .doc/PDF export như HTML <table> chuẩn (formula được
 *    evaluate sẵn trước khi export).
 *
 * Limit: max 50 cols × 200 rows (tránh DoS từ user).
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────
interface SheetData {
  rows: number
  cols: number
  cells: Record<string, string>   // 'A1' → '=SUM(A2:A4)' hoặc '42' hoặc 'Tên'
}

const DEFAULT_DATA: SheetData = { rows: 5, cols: 5, cells: {} }
const MAX_ROWS = 200
const MAX_COLS = 50

// ─── Formula engine ────────────────────────────────────────────
function colLetter(idx: number): string {
  // 0 → A, 25 → Z, 26 → AA, 27 → AB ... (giống Excel)
  let s = ''
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

function letterToCol(letter: string): number {
  let n = 0
  for (let i = 0; i < letter.length; i++) {
    n = n * 26 + (letter.charCodeAt(i) - 64)
  }
  return n - 1
}

function addrToRC(addr: string): { row: number; col: number } | null {
  const m = addr.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!m) return null
  return { col: letterToCol(m[1]), row: parseInt(m[2], 10) - 1 }
}

/** Lấy giá trị số của 1 cell (resolve formula recursively, depth limit 10) */
function resolveValue(
  data: SheetData,
  addr: string,
  depth = 0,
  visited = new Set<string>(),
): number | string {
  if (depth > 10) return '#DEPTH'
  if (visited.has(addr)) return '#CYCLE'
  const raw = data.cells[addr] ?? ''
  if (!raw.startsWith('=')) {
    if (raw.trim() === '') return ''
    const n = Number(raw.replace(',', '.'))
    return isNaN(n) ? raw : n
  }
  visited.add(addr)
  return evalFormula(data, raw.slice(1), depth + 1, visited)
}

/** Eval expr sau dấu = */
function evalFormula(
  data: SheetData,
  expr: string,
  depth: number,
  visited: Set<string>,
): number | string {
  let work = expr.trim()
  if (!work) return ''

  // 1. Replace function calls SUM/AVG/AVERAGE/COUNT/MIN/MAX(range) — supports A1:B3 ranges
  const fnRegex = /(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\s*\(\s*([A-Z]+\d+)\s*:\s*([A-Z]+\d+)\s*\)/gi
  work = work.replace(fnRegex, (_m, fn, a, b) => {
    const ra = addrToRC(a); const rb = addrToRC(b)
    if (!ra || !rb) return '0'
    const r1 = Math.min(ra.row, rb.row), r2 = Math.max(ra.row, rb.row)
    const c1 = Math.min(ra.col, rb.col), c2 = Math.max(ra.col, rb.col)
    const nums: number[] = []
    let countAll = 0
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const v = resolveValue(data, `${colLetter(c)}${r + 1}`, depth, visited)
        countAll++
        if (typeof v === 'number') nums.push(v)
      }
    }
    const fnUp = fn.toUpperCase()
    if (fnUp === 'SUM')   return String(nums.reduce((s, n) => s + n, 0))
    if (fnUp === 'COUNT') return String(nums.length)        // chỉ đếm cell số
    if (fnUp === 'MIN')   return String(nums.length ? Math.min(...nums) : 0)
    if (fnUp === 'MAX')   return String(nums.length ? Math.max(...nums) : 0)
    if (fnUp === 'AVG' || fnUp === 'AVERAGE')
      return String(nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0)
    return '0'
  })

  // 2. Replace single cell refs A1, B12 với value
  work = work.replace(/\b([A-Z]+\d+)\b/g, (_m, addr) => {
    const v = resolveValue(data, addr.toUpperCase(), depth, visited)
    if (typeof v === 'number') return String(v)
    if (v === '') return '0'
    return JSON.stringify(v)   // text — wrap để string concat không vỡ eval
  })

  // 3. Eval safely (chỉ cho phép số, +, -, *, /, %, (), .)
  if (!/^[\s\d+\-*/%().,"\\]+$/.test(work)) {
    // có thể chứa text (string compare) — thử parse trực tiếp
    return work.replace(/^"|"$/g, '')
  }
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${work});`)()
    if (typeof result === 'number' && Number.isFinite(result)) {
      // Round to 4 decimals
      return Math.round(result * 10000) / 10000
    }
    return String(result)
  } catch {
    return '#ERR'
  }
}

function renderCell(data: SheetData, addr: string): string {
  const raw = data.cells[addr] ?? ''
  if (raw.startsWith('=')) {
    const v = resolveValue(data, addr)
    return typeof v === 'number' ? String(v) : String(v)
  }
  return raw
}

// ─── React NodeView ────────────────────────────────────────────
function SpreadsheetView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const initial: SheetData = useMemo(() => {
    const a = node.attrs.data
    if (a && typeof a === 'object' && a.rows && a.cols) return a as SheetData
    return DEFAULT_DATA
  }, [node.attrs.data])

  const [data, setData] = useState<SheetData>(initial)
  const [active, setActive] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Persist to node attrs (debounced via setAttributes — TipTap optimizes batch)
  useEffect(() => {
    updateAttributes({ data })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const setCell = useCallback((addr: string, value: string) => {
    setData(d => {
      const cells = { ...d.cells }
      if (value.trim() === '') delete cells[addr]
      else cells[addr] = value
      return { ...d, cells }
    })
  }, [])

  const addRow = () => setData(d => ({ ...d, rows: Math.min(MAX_ROWS, d.rows + 1) }))
  const delRow = () => setData(d => {
    if (d.rows <= 1) return d
    // Drop cells in last row
    const cells = { ...d.cells }
    const lastRow = d.rows
    Object.keys(cells).forEach(k => {
      const rc = addrToRC(k); if (rc && rc.row === lastRow - 1) delete cells[k]
    })
    return { ...d, rows: d.rows - 1, cells }
  })
  const addCol = () => setData(d => ({ ...d, cols: Math.min(MAX_COLS, d.cols + 1) }))
  const delCol = () => setData(d => {
    if (d.cols <= 1) return d
    const cells = { ...d.cells }
    const lastCol = d.cols - 1
    Object.keys(cells).forEach(k => {
      const rc = addrToRC(k); if (rc && rc.col === lastCol) delete cells[k]
    })
    return { ...d, cols: d.cols - 1, cells }
  })

  const isEditable = editor.isEditable

  return (
    <NodeViewWrapper
      className="lp-spreadsheet-wrapper"
      data-drag-handle
      style={{ margin: '12px 0', position: 'relative' }}
    >
      {/* Mini toolbar */}
      {isEditable && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 6, padding: '4px 8px',
          background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6,
          fontSize: 11, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ color: '#374151', fontWeight: 700, marginRight: 4 }}>📊 Bảng tính</span>
          <button onClick={addRow} title="Thêm hàng" style={btnSm('#16a34a')}>
            <Plus size={11} /> Hàng
          </button>
          <button onClick={delRow} title="Xoá hàng cuối" style={btnSm('#dc2626')}>
            <Trash2 size={11} /> Hàng
          </button>
          <span style={{ width: 1, height: 14, background: '#d1d5db', margin: '0 4px' }} />
          <button onClick={addCol} title="Thêm cột" style={btnSm('#16a34a')}>
            <Plus size={11} /> Cột
          </button>
          <button onClick={delCol} title="Xoá cột cuối" style={btnSm('#dc2626')}>
            <Trash2 size={11} /> Cột
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ color: '#6b7280', fontSize: 10 }}>
            {data.rows}×{data.cols} · Gõ <code style={codeStyle}>=SUM(A1:A3)</code> trong cell
          </span>
          <button onClick={deleteNode} title="Xoá bảng tính" style={btnSm('#dc2626', true)}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* Grid */}
      <div style={{ overflowX: 'auto', border: '1px solid #9ca3af', borderRadius: 4 }}>
        <table className="lp-spreadsheet" style={{ borderCollapse: 'collapse', width: 'auto' }}>
          <thead>
            <tr>
              <th style={hdrStyle}></th>
              {Array.from({ length: data.cols }).map((_, c) => (
                <th key={c} style={hdrStyle}>{colLetter(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: data.rows }).map((_, r) => (
              <tr key={r}>
                <th style={hdrStyle}>{r + 1}</th>
                {Array.from({ length: data.cols }).map((_, c) => {
                  const addr = `${colLetter(c)}${r + 1}`
                  const raw = data.cells[addr] ?? ''
                  const display = raw.startsWith('=') && active !== addr
                    ? renderCell(data, addr)
                    : raw
                  const isActive = active === addr
                  const isEditingCell = editing === addr
                  return (
                    <td
                      key={addr}
                      onClick={() => isEditable && setActive(addr)}
                      onDoubleClick={() => isEditable && setEditing(addr)}
                      style={{
                        ...cellStyle,
                        background: isActive ? '#dbeafe' : '#fff',
                        outline: isActive ? '2px solid #2563eb' : 'none',
                      }}
                    >
                      {isEditingCell ? (
                        <input
                          ref={inputRef}
                          defaultValue={raw}
                          onBlur={e => { setCell(addr, e.target.value); setEditing(null) }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { setCell(addr, (e.target as HTMLInputElement).value); setEditing(null) }
                            if (e.key === 'Escape') setEditing(null)
                          }}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            border: 'none', padding: 0, margin: 0,
                            background: 'transparent', outline: 'none',
                            font: 'inherit', color: '#000',
                          }}
                        />
                      ) : (
                        <span style={{
                          color: raw.startsWith('=') && !isActive ? '#1d4ed8' : '#000',
                          fontWeight: raw.startsWith('=') && !isActive ? 600 : 400,
                        }}>
                          {String(display)}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formula bar */}
      {isEditable && active && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
          padding: '6px 10px', background: '#fff7ed', border: '1px solid #fdba74',
          borderRadius: 6, fontSize: 12,
        }}>
          <span style={{ color: '#9a3412', fontWeight: 700, minWidth: 30 }}>{active}</span>
          <input
            value={data.cells[active] ?? ''}
            onChange={e => setCell(active, e.target.value)}
            placeholder="Nhập số, văn bản hoặc =SUM(A1:A3)"
            style={{
              flex: 1, padding: '4px 8px', border: '1px solid #fdba74',
              borderRadius: 4, fontSize: 12, fontFamily: 'monospace',
              outline: 'none', background: '#fff',
            }}
          />
          <span style={{ color: '#9a3412', fontSize: 11 }}>
            = {String(renderCell(data, active) || '–')}
          </span>
        </div>
      )}
    </NodeViewWrapper>
  )
}

// ─── Inline styles ─────────────────────────────────────────────
const hdrStyle: React.CSSProperties = {
  background: '#d1d5db', color: '#374151', fontWeight: 700,
  fontSize: 11, padding: '4px 8px', textAlign: 'center',
  border: '1px solid #9ca3af', minWidth: 40,
  fontFamily: 'system-ui, sans-serif',
}
const cellStyle: React.CSSProperties = {
  border: '1px solid #d1d5db', padding: '4px 8px',
  fontSize: 12, fontFamily: 'system-ui, sans-serif',
  minWidth: 80, height: 26, cursor: 'cell', verticalAlign: 'middle',
}
const codeStyle: React.CSSProperties = {
  background: '#fff', padding: '0 4px', borderRadius: 3,
  border: '1px solid #d1d5db', fontFamily: 'monospace',
}
function btnSm(color: string, ghost = false): React.CSSProperties {
  return {
    background: ghost ? 'transparent' : `${color}15`,
    border: `1px solid ${color}40`, color,
    padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
    fontSize: 10, fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  }
}

// ─── TipTap Node ───────────────────────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spreadsheet: {
      insertSpreadsheet: (opts?: { rows?: number; cols?: number }) => ReturnType
    }
  }
}

export const Spreadsheet = Node.create({
  name: 'spreadsheet',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      data: {
        default: DEFAULT_DATA,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-sheet')
          if (raw) {
            try { return JSON.parse(raw) } catch { /* ignore */ }
          }
          return DEFAULT_DATA
        },
        renderHTML: (attrs) => ({
          'data-sheet': JSON.stringify(attrs.data || DEFAULT_DATA),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="spreadsheet"]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    // Render thành <div> với data-sheet (JSON data).
    // Khi serialize ra string cho lưu DB hoặc export Word/PDF, lessson-plan-export.ts
    // sẽ scan các div này và expand thành <table> đầy đủ với formula đã eval.
    const data = (node.attrs.data || DEFAULT_DATA) as SheetData

    // Build table rows với DOMOutputSpec format hợp lệ
    const rows = data.rows || 5
    const cols = data.cols || 5
    const headerRow: any[] = ['tr', {}, ['th', { class: 'lp-corner' }, '']]
    for (let c = 0; c < cols; c++) {
      headerRow.push(['th', {}, colLetter(c)])
    }

    const tableContent: any[] = ['tbody', {}, headerRow]
    for (let r = 0; r < rows; r++) {
      const tr: any[] = ['tr', {}, ['th', {}, String(r + 1)]]
      for (let c = 0; c < cols; c++) {
        const addr = `${colLetter(c)}${r + 1}`
        const display = renderCell(data, addr)
        tr.push(['td', {}, String(display)])
      }
      tableContent.push(tr)
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'spreadsheet',
        'data-sheet': JSON.stringify(data),
        class: 'lp-spreadsheet-wrapper',
      }),
      ['table', { class: 'lp-spreadsheet' }, tableContent],
    ]
  },

  addCommands() {
    return {
      insertSpreadsheet:
        (opts) => ({ commands }) => {
          const rows = Math.min(MAX_ROWS, Math.max(1, opts?.rows ?? 5))
          const cols = Math.min(MAX_COLS, Math.max(1, opts?.cols ?? 5))
          return commands.insertContent({
            type: this.name,
            attrs: { data: { rows, cols, cells: {} } },
          })
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(SpreadsheetView)
  },
})

export default Spreadsheet
