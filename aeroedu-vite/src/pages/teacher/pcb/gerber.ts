/** Sinh file Gerber (RS-274X) + Excellon drill + đóng gói .zip (tự viết, không
 *  cần thư viện). Toạ độ MM. Đủ cho board 2 lớp THT cơ bản gửi xưởng. */
import type { PcbComponent, PcbLayout } from '@/types/pcb'
import { footprintOf, padAbs } from './pcbFootprints'

// ── CRC32 + ZIP (store, không nén) ──────────────────────────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
function crc32(b: Uint8Array) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0 }
function cat(...a: Uint8Array[]) { const len = a.reduce((s, x) => s + x.length, 0); const o = new Uint8Array(len); let p = 0; for (const x of a) { o.set(x, p); p += x.length } return o }
const u16 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255])
const u32 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255])

export function makeZip(files: { name: string; text: string }[]): Blob {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let off = 0
  for (const f of files) {
    const name = enc.encode(f.name); const data = enc.encode(f.text); const crc = crc32(data)
    const lh = cat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data)
    parts.push(lh)
    central.push(cat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off), name))
    off += lh.length
  }
  const cdStart = off; let cdLen = 0; for (const c of central) { parts.push(c); cdLen += c.length; off += c.length }
  parts.push(cat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdLen), u32(cdStart), u16(0)))
  return new Blob(parts as BlobPart[], { type: 'application/zip' })
}

// ── Gerber ──────────────────────────────────────────────────────
const g = (mm: number) => Math.round(mm * 1e6).toString()           // format 4.6
const xy = (x: number, y: number) => `X${g(x)}Y${g(y)}`
const HEADER = '%FSLAX46Y46*%\n%MOMM*%\n%LPD*%\nG01*\n'

function copperLayer(name: string, pads: { x: number; y: number }[], traces: { width: number; pts: { x: number; y: number }[] }[]): string {
  const widths = Array.from(new Set(traces.map((t) => t.width)))
  let s = `G04 ${name}*\n` + HEADER + '%ADD10C,1.700000*%\n'
  widths.forEach((w, i) => { s += `%ADD${11 + i}C,${w.toFixed(6)}*%\n` })
  s += 'D10*\n'
  for (const p of pads) s += `${xy(p.x, p.y)}D03*\n`
  for (const t of traces) {
    s += `D${11 + widths.indexOf(t.width)}*\n`
    t.pts.forEach((pt, i) => { s += `${xy(pt.x, pt.y)}D0${i === 0 ? 2 : 1}*\n` })
  }
  return s + 'M02*\n'
}

export function buildGerbers(comps: PcbComponent[], layout: PcbLayout): { name: string; text: string }[] {
  const W = layout.board.w, H = layout.board.h
  const padsAbs: { x: number; y: number; drill: number }[] = []
  for (const c of comps) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    for (const pad of footprintOf(c).pads) { const a = padAbs(pl, pad); padsAbs.push({ x: a.x, y: a.y, drill: pad.drill }) }
  }
  const top = layout.traces.filter((t) => t.layer === 'top')
  const bot = layout.traces.filter((t) => t.layer === 'bottom')

  // Outline (Edge.Cuts)
  const outline = `G04 Edge Cuts*\n${HEADER}%ADD12C,0.150000*%\nD12*\n${xy(0, 0)}D02*\n${xy(W, 0)}D01*\n${xy(W, H)}D01*\n${xy(0, H)}D01*\n${xy(0, 0)}D01*\nM02*\n`

  // Drill (Excellon, mm)
  let drill = 'M48\nFMAT,2\nMETRIC,TZ\nT1C0.900\n%\nG90\nG05\nT1\n'
  for (const p of padsAbs) drill += `X${p.x.toFixed(3)}Y${p.y.toFixed(3)}\n`
  drill += 'M30\n'

  const readme = `Bo mạch xuất từ AeroEduVision (Giai đoạn 2 — 2 lớp THT).\nKích thước: ${W} x ${H} mm.\nFile: .gtl (đồng lớp trên) .gbl (đồng lớp dưới) .gko (viền board) .drl (khoan).\nĐơn vị MM, format 4.6. Lưu ý: footprint/đường mạch do người dùng + AI tạo — KIỂM TRA DRC tại xưởng trước khi sản xuất.\n`

  return [
    { name: 'board.gtl', text: copperLayer('Top Copper', padsAbs, top) },
    { name: 'board.gbl', text: copperLayer('Bottom Copper', padsAbs, bot) },
    { name: 'board.gko', text: outline },
    { name: 'board.drl', text: drill },
    { name: 'README.txt', text: readme },
  ]
}
