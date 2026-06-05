/** Footprint (chân hàn) cho từng linh kiện — toạ độ MM, tên pad khớp tên chân. */
import type { PcbComponent, PcbPlacement } from '@/types/pcb'
import { catOf } from './pcbSymbols'

export interface Pad { name: string; x: number; y: number; d: number; drill: number; w: number; h: number; smd: boolean }
export interface Footprint { pads: Pad[]; body: { w: number; h: number }; color: string }

const PITCH: Record<string, number> = { R: 7.6, D: 7.6, LED: 2.54, C: 5, SW: 6.5, BAT: 5 }
const SMD_PITCH: Record<string, number> = { R: 3.4, D: 3.4, LED: 2.6, C: 3.0, SW: 6, BAT: 5 }
const BODY_COLOR: Record<string, string> = {
  R: '#2b6cb0', C: '#b7791f', LED: '#e53e3e', D: '#1a202c', SW: '#4a5568', BAT: '#2f855a',
  Q: '#1a202c', MCU: '#2c5282', IC: '#1a202c', SENSOR: '#2b6cb0', HDR: '#1a202c', GND: '#4a5568', VCC: '#c53030',
}
const tht = (name: string, x: number, y: number, d: number, drill: number): Pad => ({ name, x, y, d, drill, w: d, h: d, smd: false })
const smd = (name: string, x: number, y: number, w: number, h: number): Pad => ({ name, x, y, d: Math.max(w, h), drill: 0, w, h, smd: true })

export function footprintOf(c: PcbComponent): Footprint {
  const cat = catOf(c.type); const color = BODY_COLOR[c.type] || '#2d3748'; const isSmd = !!c.smd
  if (cat === '2pin') {
    if (isSmd) {
      const p = SMD_PITCH[c.type] ?? 3.2
      return { pads: [smd(c.pins[0] || '1', -p / 2, 0, 1.4, 1.6), smd(c.pins[1] || '2', p / 2, 0, 1.4, 1.6)], body: { w: p - 0.6, h: 1.6 }, color }
    }
    const p = PITCH[c.type] ?? 6
    return { pads: [tht(c.pins[0] || '1', -p / 2, 0, 1.7, 0.9), tht(c.pins[1] || '2', p / 2, 0, 1.7, 0.9)], body: { w: p + 2, h: 2.8 }, color }
  }
  if (cat === 'power') return { pads: [isSmd ? smd(c.pins[0] || 'GND', 0, 0, 1.6, 1.6) : tht(c.pins[0] || 'GND', 0, 0, 1.7, 0.9)], body: { w: 3, h: 3 }, color }
  // box
  const n = c.pins.length
  if (n <= 3) {
    const pads = c.pins.map((name, i) => isSmd ? smd(name, (i - (n - 1) / 2) * 2.2, 0, 1.0, 1.8) : tht(name, (i - (n - 1) / 2) * 2.54, 0, 1.6, 0.8))
    return { pads, body: { w: Math.max(6, n * 2.4 + 1), h: 4.5 }, color }
  }
  const half = Math.ceil(n / 2)
  if (isSmd) {
    const rowGap = 5.0, pitch = 1.6
    const pads: Pad[] = c.pins.map((name, i) => { const left = i < half; const idx = left ? i : i - half; return smd(name, left ? -rowGap / 2 : rowGap / 2, (idx - (half - 1) / 2) * pitch, 1.4, 0.9) })
    return { pads, body: { w: rowGap - 0.6, h: half * pitch + 1.2 }, color }
  }
  const rowGap = 7.62
  const pads: Pad[] = c.pins.map((name, i) => { const left = i < half; const idx = left ? i : i - half; return tht(name, left ? -rowGap / 2 : rowGap / 2, (idx - (half - 1) / 2) * 2.54, 1.5, 0.8) })
  return { pads, body: { w: rowGap + 2.2, h: half * 2.54 + 2 }, color }
}

/** Xoay (x,y) quanh gốc theo độ. */
export function rot2(x: number, y: number, deg: number) { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c } }

/** Vị trí tuyệt đối (mm) của 1 pad sau khi đặt + xoay. */
export function padAbs(pl: PcbPlacement, pad: Pad) { const r = rot2(pad.x, pad.y, pl.rot || 0); return { x: pl.x + r.x, y: pl.y + r.y } }

/** Tìm pad theo tên chân. */
export function padOf(fp: Footprint, pin: string): Pad | undefined { return fp.pads.find((p) => p.name === pin) || fp.pads[0] }
