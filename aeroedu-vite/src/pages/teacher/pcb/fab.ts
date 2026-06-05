/** Sinh hồ sơ LẮP RÁP cho JLCPCB SMT: BOM (định dạng JLCPCB) + CPL/Pick-and-Place.
 *  Toạ độ CPL trùng gốc với Gerber (góc dưới-trái board, mm, Y hướng lên). */
import type { PcbComponent, PcbLayout } from '@/types/pcb'

const q = (v: string | number) => {
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s   // chống chèn công thức (CSV injection) khi mở bằng Excel/Sheets
  return /[",\n\r\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const row = (cells: (string | number)[]) => cells.map(q).join(',')

// Tên footprint mô tả (người dùng chỉnh lại theo gói thật trước khi đặt lắp ráp).
function footprintName(c: PcbComponent): string {
  const n = c.pins.length
  if (c.smd) {
    if (['R', 'C', 'LED', 'D'].includes(c.type)) return c.type === 'LED' || c.type === 'D' ? 'LED_0805' : `${c.type}_0805`
    return `${c.type}_SMD_${n}P`
  }
  if (['R', 'D'].includes(c.type)) return `${c.type}_THT_P7.62`
  if (c.type === 'C') return 'C_THT_P5'
  if (c.type === 'LED') return 'LED_THT_3MM'
  return `${c.type}_THT_${n}P`
}

/** BOM nhóm theo (giá trị + footprint) — định dạng JLCPCB. */
export function jlcBomCsv(comps: PcbComponent[]): string {
  const groups = new Map<string, { comment: string; fp: string; refs: string[] }>()
  for (const c of comps.filter((x) => !['GND', 'VCC'].includes(x.type))) {
    const fp = footprintName(c); const comment = c.value || c.type
    const k = comment + '|' + fp
    if (!groups.has(k)) groups.set(k, { comment, fp, refs: [] })
    groups.get(k)!.refs.push(c.ref)
  }
  const lines = ['Comment,Designator,Footprint,LCSC Part #']
  for (const g of groups.values()) lines.push(row([g.comment, g.refs.sort().join(','), g.fp, '']))
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** CPL / Pick-and-Place — định dạng JLCPCB. */
export function cplCsv(comps: PcbComponent[], layout: PcbLayout): string {
  const lines = ['Designator,Mid X,Mid Y,Layer,Rotation']
  for (const c of comps.filter((x) => !['GND', 'VCC'].includes(x.type))) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    lines.push(row([c.ref, `${pl.x.toFixed(4)}mm`, `${pl.y.toFixed(4)}mm`, 'Top', ((pl.rot || 0) % 360).toString()]))
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Thông số board để báo giá. */
export function boardSpecs(comps: PcbComponent[], layout: PcbLayout) {
  return {
    w: layout.board.w, h: layout.board.h, layers: 2,
    components: Object.keys(layout.placements).length,
    vias: (layout.vias || []).length,
    smd: comps.filter((c) => c.smd && !['GND', 'VCC'].includes(c.type)).length,
    tht: comps.filter((c) => !c.smd && !['GND', 'VCC'].includes(c.type)).length,
  }
}
