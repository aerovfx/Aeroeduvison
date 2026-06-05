/** Sinh file Gerber (RS-274X) + Excellon drill + đóng gói .zip (tự viết, không
 *  cần thư viện). Toạ độ MM. Đủ cho board 2 lớp THT cơ bản gửi xưởng. */
import type { PcbComponent, PcbNet, PcbLayout } from '@/types/pcb'
import { footprintOf, padAbs, rot2 } from './pcbFootprints'
import { textStrokes, textWidth } from './strokeFont'

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

interface GPad { x: number; y: number; d: number; w: number; h: number; rect: boolean; smd: boolean; pour: boolean }
interface GTrace { width: number; pts: { x: number; y: number }[]; net?: string }
const CLR = 0.4
const VIA_PAD = 0.9
const MASK_EXP = 0.05      // hở phủ xanh rộng hơn pad 0.05mm mỗi cạnh
const SILK_W = 0.15

function copperLayer(name: string, pads: GPad[], viaPads: { x: number; y: number; d: number }[], traces: GTrace[], pour: { w: number; h: number; net: string } | null): string {
  let ap = 10; let head = ''
  const apMap = new Map<string, number>()
  const adC = (d: number) => { const k = 'C' + rnd(d); if (!apMap.has(k)) { head += `%ADD${ap}C,${rnd(d).toFixed(6)}*%\n`; apMap.set(k, ap++) } return apMap.get(k)! }
  const adR = (w: number, h: number) => { const k = 'R' + rnd(w) + 'x' + rnd(h); if (!apMap.has(k)) { head += `%ADD${ap}R,${rnd(w).toFixed(6)}X${rnd(h).toFixed(6)}*%\n`; apMap.set(k, ap++) } return apMap.get(k)! }
  const padAper = (p: { rect: boolean; d: number; w: number; h: number }) => p.rect ? adR(p.w, p.h) : adC(p.d)
  const clrAper = (p: { rect: boolean; d: number; w: number; h: number }) => p.rect ? adR(p.w + CLR * 2, p.h + CLR * 2) : adC(p.d + CLR * 2)
  pads.forEach((p) => padAper(p)); viaPads.forEach((v) => adC(v.d)); traces.forEach((t) => adC(t.width))
  if (pour) { pads.filter((p) => !p.pour).forEach((p) => clrAper(p)); viaPads.forEach((v) => adC(v.d + CLR * 2)); traces.filter((t) => t.net !== pour.net).forEach((t) => adC(t.width + CLR * 2)) }

  let s = `G04 ${name}*\n` + HEADER + head
  const drawTrace = (t: GTrace, w: number) => { s += `D${adC(w)}*\n`; t.pts.forEach((pt, i) => { s += `${xy(pt.x, pt.y)}D0${i === 0 ? 2 : 1}*\n` }) }
  if (pour) {
    s += `G04 Pour (${pour.net})*\nG36*\n${xy(0, 0)}D02*\n${xy(pour.w, 0)}D01*\n${xy(pour.w, pour.h)}D01*\n${xy(0, pour.h)}D01*\n${xy(0, 0)}D01*\nG37*\n%LPC*%\n`
    for (const p of pads) if (!p.pour) s += `D${clrAper(p)}*\n${xy(p.x, p.y)}D03*\n`
    for (const v of viaPads) s += `D${adC(v.d + CLR * 2)}*\n${xy(v.x, v.y)}D03*\n`
    for (const t of traces) if (t.net !== pour.net) drawTrace(t, t.width + CLR * 2)
    s += '%LPD*%\n'
  }
  for (const p of pads) s += `D${padAper(p)}*\n${xy(p.x, p.y)}D03*\n`
  for (const v of viaPads) s += `D${adC(v.d)}*\n${xy(v.x, v.y)}D03*\n`
  for (const t of traces) drawTrace(t, t.width)
  return s + 'M02*\n'
}

// Lớp phủ xanh (solder mask): flash hở quanh mỗi pad, rộng hơn MASK_EXP.
function maskLayer(name: string, pads: GPad[]): string {
  let ap = 10; let head = ''; const m = new Map<string, number>()
  const adC = (d: number) => { const k = 'C' + rnd(d); if (!m.has(k)) { head += `%ADD${ap}C,${rnd(d).toFixed(6)}*%\n`; m.set(k, ap++) } return m.get(k)! }
  const adR = (w: number, h: number) => { const k = 'R' + rnd(w) + 'x' + rnd(h); if (!m.has(k)) { head += `%ADD${ap}R,${rnd(w).toFixed(6)}X${rnd(h).toFixed(6)}*%\n`; m.set(k, ap++) } return m.get(k)! }
  const ape = (p: GPad) => p.rect ? adR(p.w + 2 * MASK_EXP, p.h + 2 * MASK_EXP) : adC(p.d + 2 * MASK_EXP)
  pads.forEach(ape)
  let s = `G04 ${name}*\n` + HEADER + head
  for (const p of pads) s += `D${ape(p)}*\n${xy(p.x, p.y)}D03*\n`
  return s + 'M02*\n'
}

// Lớp tên linh kiện (silkscreen): vẽ viền thân + mã linh kiện bằng nét.
function silkLayer(name: string, polys: { x: number; y: number }[][]): string {
  let s = `G04 ${name}*\n` + HEADER + `%ADD10C,${SILK_W.toFixed(6)}*%\nD10*\n`
  for (const pl of polys) pl.forEach((pt, i) => { s += `${xy(pt.x, pt.y)}D0${i === 0 ? 2 : 1}*\n` })
  return s + 'M02*\n'
}
function buildSilk(comps: PcbComponent[], layout: PcbLayout): { x: number; y: number }[][] {
  const polys: { x: number; y: number }[][] = []
  for (const c of comps) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    const fp = footprintOf(c); const bw = fp.body.w / 2 + 0.15, bh = fp.body.h / 2 + 0.15
    polys.push([[-bw, -bh], [bw, -bh], [bw, bh], [-bw, bh], [-bw, -bh]].map(([x, y]) => { const r = rot2(x, y, pl.rot || 0); return { x: pl.x + r.x, y: pl.y + r.y } }))
    const sc = 0.16; const tw = textWidth(c.ref, sc)
    polys.push(...textStrokes(c.ref, pl.x - tw / 2, pl.y + bh + 0.3, sc))
  }
  return polys
}

export function buildGerbers(comps: PcbComponent[], nets: PcbNet[], layout: PcbLayout): { name: string; text: string }[] {
  const W = layout.board.w, H = layout.board.h
  const pourNet = layout.pour ? nets.find((n) => n.name === layout.pour!.net) : null
  const inPour = (ref: string, pin: string) => !!pourNet && pourNet.nodes.some((nd) => nd.comp === ref && nd.pin === pin)
  const pads: GPad[] = []; const drills: { x: number; y: number }[] = []
  for (const c of comps) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    for (const pad of footprintOf(c).pads) {
      const a = padAbs(pl, pad)
      pads.push({ x: a.x, y: a.y, d: pad.d, w: pad.w, h: pad.h, rect: pad.smd, smd: pad.smd, pour: inPour(c.ref, pad.name) })
      if (pad.drill > 0) drills.push({ x: a.x, y: a.y })   // chỉ pad THT mới khoan
    }
  }
  const topPads = pads                         // THT + SMD đều có mặt đồng lớp trên
  const botPads = pads.filter((p) => !p.smd)   // lớp dưới chỉ có pad THT
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
  const silk = buildSilk(comps, layout)
  const readme = `Bo mạch xuất từ AeroEduVision — gói GERBER chuẩn JLCPCB (2 lớp).\n`
    + `Kích thước: ${W} x ${H} mm. Đơn vị MM, format toạ độ 4.6.\n\n`
    + `Các file (JLCPCB tự nhận theo đuôi):\n`
    + `  board.GTL  Đồng lớp TRÊN        board.GBL  Đồng lớp DƯỚI\n`
    + `  board.GTS  Phủ xanh TRÊN        board.GBS  Phủ xanh DƯỚI\n`
    + `  board.GTO  Tên LK lớp TRÊN      board.GKO  Viền cắt board\n`
    + `  board.DRL  Khoan (Excellon, T1=pad 0.9mm, T2=via 0.4mm)\n\n`
    + `${layout.pour ? `Phủ đồng net "${layout.pour.net}" ở lớp ${layout.pour.layer}.\n` : ''}`
    + `Số via: ${vias.length}. Linh kiện: ${Object.keys(layout.placements).length}.\n`
    + `Cách đặt: nén CẢ thư mục này thành .zip → tải lên jlcpcb.com/quote.\n`
    + `Lắp ráp SMT (tuỳ chọn): tải kèm file BOM.csv + CPL.csv (nút riêng).\n`
    + `LƯU Ý: đây là board GIÁO DỤC — hãy kiểm tra DRC tại xưởng trước khi sản xuất.\n`

  return [
    { name: 'board.GTL', text: copperLayer('Top Copper', topPads, viaPads, top, topPour) },
    { name: 'board.GBL', text: copperLayer('Bottom Copper', botPads, viaPads, bot, botPour) },
    { name: 'board.GTS', text: maskLayer('Top Solder Mask', topPads) },
    { name: 'board.GBS', text: maskLayer('Bottom Solder Mask', botPads) },
    { name: 'board.GTO', text: silkLayer('Top Silkscreen', silk) },
    { name: 'board.GKO', text: outline },
    { name: 'board.DRL', text: drill },
    { name: 'README.txt', text: readme },
  ]
}
