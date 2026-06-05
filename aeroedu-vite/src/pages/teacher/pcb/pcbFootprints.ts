/** Footprint (chân hàn) cho từng linh kiện — toạ độ MM, tên pad khớp tên chân. */
import type { PcbComponent, PcbPlacement } from '@/types/pcb'
import { catOf } from './pcbSymbols'

export interface Pad { name: string; x: number; y: number; d: number; drill: number }
export interface Footprint { pads: Pad[]; body: { w: number; h: number }; color: string }

const PITCH: Record<string, number> = { R: 7.6, D: 7.6, LED: 2.54, C: 5, SW: 6.5, BAT: 5 }
const BODY_COLOR: Record<string, string> = {
  R: '#2b6cb0', C: '#b7791f', LED: '#e53e3e', D: '#1a202c', SW: '#4a5568', BAT: '#2f855a',
  Q: '#1a202c', MCU: '#2c5282', IC: '#1a202c', SENSOR: '#2b6cb0', HDR: '#1a202c', GND: '#4a5568', VCC: '#c53030',
}

export function footprintOf(c: PcbComponent): Footprint {
  const cat = catOf(c.type); const color = BODY_COLOR[c.type] || '#2d3748'
  if (cat === '2pin') {
    const p = PITCH[c.type] ?? 6
    return {
      pads: [
        { name: c.pins[0] || '1', x: -p / 2, y: 0, d: 1.7, drill: 0.9 },
        { name: c.pins[1] || '2', x: p / 2, y: 0, d: 1.7, drill: 0.9 },
      ],
      body: { w: p + 2, h: 2.8 }, color,
    }
  }
  if (cat === 'power') return { pads: [{ name: c.pins[0] || 'GND', x: 0, y: 0, d: 1.7, drill: 0.9 }], body: { w: 3, h: 3 }, color }
  // box
  const n = c.pins.length
  if (n <= 3) {
    return { pads: c.pins.map((name, i) => ({ name, x: (i - (n - 1) / 2) * 2.54, y: 0, d: 1.6, drill: 0.8 })), body: { w: Math.max(6, n * 2.54 + 1), h: 4.5 }, color }
  }
  const half = Math.ceil(n / 2); const rowGap = 7.62
  const pads: Pad[] = c.pins.map((name, i) => {
    const left = i < half; const idx = left ? i : i - half
    return { name, x: left ? -rowGap / 2 : rowGap / 2, y: (idx - (half - 1) / 2) * 2.54, d: 1.5, drill: 0.8 }
  })
  return { pads, body: { w: rowGap + 2.2, h: half * 2.54 + 2 }, color }
}

/** Xoay (x,y) quanh gốc theo độ. */
export function rot2(x: number, y: number, deg: number) { const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c } }

/** Vị trí tuyệt đối (mm) của 1 pad sau khi đặt + xoay. */
export function padAbs(pl: PcbPlacement, pad: Pad) { const r = rot2(pad.x, pad.y, pl.rot || 0); return { x: pl.x + r.x, y: pl.y + r.y } }

/** Tìm pad theo tên chân. */
export function padOf(fp: Footprint, pin: string): Pad | undefined { return fp.pads.find((p) => p.name === pin) || fp.pads[0] }
