/** Sinh file Gerber (RS-274X) + Excellon drill + đóng gói .zip (tự viết, không
 *  cần thư viện). Toạ độ MM. Đủ cho board 2 lớp THT cơ bản gửi xưởng. */
import type { PcbComponent, PcbNet, PcbLayout } from '@/types/pcb'
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
const rnd = (x: number) => Math.round(x * 1000) / 1000
const HEADER = '%FSLAX46Y46*%\n%MOMM*%\n%LPD*%\nG01*\n'

interface GPad { x: number; y: number; d: number; pour: boolean }
interface GTrace { width: number; pts: { x: number; y: number }[]; net?: string }
const CLR = 0.4
const VIA_PAD = 0.9, VIA_DRILL = 0.4

function copperLayer(name: string, pads: GPad[], viaPads: { x: number; y: number; d: number }[], traces: GTrace[], pour: { w: number; h: number; net: string } | null): string {
  let ap = 10; let head = ''
  const ad = (d: number) => { const k = rnd(d); if (!apMap.has(k)) { head += `%ADD${ap}C,${k.toFixed(6)}*%\n`; apMap.set(k, ap++) } return apMap.get(k)! }
  const apMap = new Map<number, number>()
  pads.forEach((p) => ad(p.d)); viaPads.forEach((v) => ad(v.d)); traces.forEach((t) => ad(t.width))
  if (pour) { pads.filter((p) => !p.pour).forEach((p) => ad(p.d + CLR * 2)); viaPads.forEach((v) => ad(v.d + CLR * 2)); traces.filter((t) => t.net !== pour.net).forEach((t) => ad(t.width + CLR * 2)) }

  let s = `G04 ${name}*\n` + HEADER + head
  const drawTrace = (t: GTrace, w: number) => { s += `D${ad(w)}*\n`; t.pts.forEach((pt, i) => { s += `${xy(pt.x, pt.y)}D0${i === 0 ? 2 : 1}*\n` }) }
  if (pour) {
    s += `G04 Pour (${pour.net})*\nG36*\n${xy(0, 0)}D02*\n${xy(pour.w, 0)}D01*\n${xy(pour.w, pour.h)}D01*\n${xy(0, pour.h)}D01*\n${xy(0, 0)}D01*\nG37*\n%LPC*%\n`
    for (const p of pads) if (!p.pour) s += `D${ad(p.d + CLR * 2)}*\n${xy(p.x, p.y)}D03*\n`
    for (const v of viaPads) s += `D${ad(v.d + CLR * 2)}*\n${xy(v.x, v.y)}D03*\n`
    for (const t of traces) if (t.net !== pour.net) drawTrace(t, t.width + CLR * 2)
    s += '%LPD*%\n'
  }
  for (const p of pads) s += `D${ad(p.d)}*\n${xy(p.x, p.y)}D03*\n`
  for (const v of viaPads) s += `D${ad(v.d)}*\n${xy(v.x, v.y)}D03*\n`
  for (const t of traces) drawTrace(t, t.width)
  return s + 'M02*\n'
}

export function buildGerbers(comps: PcbComponent[], nets: PcbNet[], layout: PcbLayout): { name: string; text: string }[] {
  const W = layout.board.w, H = layout.board.h
  const pourNet = layout.pour ? nets.find((n) => n.name === layout.pour!.net) : null
  const inPour = (ref: string, pin: string) => !!pourNet && pourNet.nodes.some((nd) => nd.comp === ref && nd.pin === pin)
  const pads: GPad[] = []; const drills: { x: number; y: number }[] = []
  for (const c of comps) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    for (const pad of footprintOf(c).pads) { const a = padAbs(pl, pad); pads.push({ x: a.x, y: a.y, d: pad.d, pour: inPour(c.ref, pad.name) }); drills.push({ x: a.x, y: a.y }) }
  }
  const vias = layout.vias || []
  const viaPads = vias.map((v) => ({ x: v.x, y: v.y, d: VIA_PAD }))
  const top = layout.traces.filter((t) => t.layer === 'top')
  const bot = layout.traces.filter((t) => t.layer === 'bottom')
  const pn = layout.pour?.net || ''
  const topPour = layout.pour?.layer === 'top' ? { w: W, h: H, net: pn } : null
  const botPour = layout.pour?.layer === 'bottom' ? { w: W, h: H, net: pn } : null

  const outline = `G04 Edge Cuts*\n${HEADER}%ADD12C,0.150000*%\nD12*\n${xy(0, 0)}D02*\n${xy(W, 0)}D01*\n${xy(W, H)}D01*\n${xy(0, H)}D01*\n${xy(0, 0)}D01*\nM02*\n`
  let drill = 'M48\nFMAT,2\nMETRIC,TZ\nT1C0.900\nT2C0.400\n%\nG90\nG05\nT1\n'
  for (const p of drills) drill += `X${p.x.toFixed(3)}Y${p.y.toFixed(3)}\n`
  if (vias.length) { drill += 'T2\n'; for (const v of vias) drill += `X${v.x.toFixed(3)}Y${v.y.toFixed(3)}\n` }
  drill += 'M30\n'
  const readme = `Bo mạch xuất từ AeroEduVision.\nKích thước: ${W} x ${H} mm. Đơn vị MM (format 4.6).\nFile: .gtl (đồng trên) .gbl (đồng dưới) .gko (viền) .drl (khoan, T1=pad 0.9mm, T2=via 0.4mm).\n${layout.pour ? `Có PHỦ ĐỒNG net "${layout.pour.net}" ở lớp ${layout.pour.layer} (hở đồng quanh pad/đường/via khác net).\n` : ''}Số via: ${vias.length}. Lưu ý: KIỂM TRA DRC tại xưởng trước khi sản xuất.\n`

  return [
    { name: 'board.gtl', text: copperLayer('Top Copper', pads, viaPads, top, topPour) },
    { name: 'board.gbl', text: copperLayer('Bottom Copper', pads, viaPads, bot, botPour) },
    { name: 'board.gko', text: outline },
    { name: 'board.drl', text: drill },
    { name: 'README.txt', text: readme },
  ]
}
