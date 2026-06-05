/** Autorouter lưới A* 2 lớp (maze routing) + via. Tự nối các net (trừ net phủ
 *  đồng) tránh pad/đường khác net → không chập. Net nào không tìm được đường thì
 *  bỏ qua (để ratsnest). Toạ độ MM. */
import type { PcbComponent, PcbNet, PcbLayout, PcbTrace, PcbVia } from '@/types/pcb'
import { footprintOf, padAbs } from './pcbFootprints'

const GRID = 0.6
const CLEAR = 0.35
const VIA_COST = 16
const TRACE_W = 0.3
const PAD_BLOCK = 99999

// Min-heap đơn giản theo f
class Heap {
  a: { f: number; k: number }[] = []
  push(f: number, k: number) { const a = this.a; a.push({ f, k }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break;[a[p], a[i]] = [a[i], a[p]]; i = p } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop()!; if (a.length) { a[0] = last; let i = 0; for (; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break;[a[m], a[i]] = [a[i], a[m]]; i = m } } return top }
  get size() { return this.a.length }
}

export interface AutoRouteResult { traces: PcbTrace[]; vias: PcbVia[]; routed: number; failed: number }

export function autoRoute(comps: PcbComponent[], nets: PcbNet[], layout: PcbLayout): AutoRouteResult {
  const W = layout.board.w, H = layout.board.h
  const gw = Math.ceil(W / GRID) + 1, gh = Math.ceil(H / GRID) + 1, N = gw * gh
  const idx = (gx: number, gy: number) => gy * gw + gx
  const cellMm = (gx: number, gy: number) => ({ x: gx * GRID, y: gy * GRID })
  const toCell = (x: number, y: number) => ({ gx: Math.min(gw - 1, Math.max(0, Math.round(x / GRID))), gy: Math.min(gh - 1, Math.max(0, Math.round(y / GRID))) })

  const netId = new Map<string, number>(); nets.forEach((n, i) => netId.set(n.name, i + 1))

  // owner[l]: net "sở hữu" cell ở lớp l vì có pad. THT chặn cả 2 lớp, SMD chỉ lớp trên (0).
  const owner = [new Int32Array(N), new Int32Array(N)]
  const padNet = new Map<string, string>(); nets.forEach((n) => n.nodes.forEach((nd) => padNet.set(nd.comp + '|' + nd.pin, n.name)))
  for (const c of comps) {
    const pl = layout.placements[c.ref]; if (!pl) continue
    for (const pad of footprintOf(c).pads) {
      const a = padAbs(pl, pad); const nn = padNet.get(c.ref + '|' + pad.name); const oid = nn ? netId.get(nn)! : PAD_BLOCK; const r = pad.d / 2 + CLEAR
      const layers = pad.smd ? [0] : [0, 1]
      for (let gy = Math.max(0, Math.floor((a.y - r) / GRID)); gy <= Math.min(gh - 1, Math.ceil((a.y + r) / GRID)); gy++)
        for (let gx = Math.max(0, Math.floor((a.x - r) / GRID)); gx <= Math.min(gw - 1, Math.ceil((a.x + r) / GRID)); gx++)
          if (Math.hypot(gx * GRID - a.x, gy * GRID - a.y) <= r) for (const l of layers) owner[l][idx(gx, gy)] = oid
    }
  }
  const occ = [new Int32Array(N), new Int32Array(N)]  // [top, bottom] net của đường đã route

  const padPos = (ref: string, pin: string) => {
    const c = comps.find((x) => x.ref === ref); const pl = layout.placements[ref]; if (!c || !pl) return null
    const pad = footprintOf(c).pads.find((p) => p.name === pin); return pad ? { ...padAbs(pl, pad), smd: pad.smd } : null
  }

  // A* 1 kết nối: trả path [{gx,gy,l}] hoặc null. aTop/bTop = đầu/cuối chỉ ở lớp trên (SMD).
  function route(sx: number, sy: number, gxx: number, gyy: number, net: number, aTop: boolean, bTop: boolean): { gx: number; gy: number; l: number }[] | null {
    const s = toCell(sx, sy), g = toCell(gxx, gyy)
    const blocked = (cell: number, l: number) => { const o = owner[l][cell]; if (o && o !== net) return true; if (occ[l][cell] && occ[l][cell] !== net) return true; return false }
    const dist = new Float64Array(N * 2).fill(Infinity)
    const prev = new Int32Array(N * 2).fill(-1)
    const key = (cell: number, l: number) => l * N + cell
    const h = (gx: number, gy: number) => (Math.abs(gx - g.gx) + Math.abs(gy - g.gy)) * GRID
    const heap = new Heap()
    for (const l of (aTop ? [0] : [0, 1])) { const c = idx(s.gx, s.gy); dist[key(c, l)] = 0; heap.push(h(s.gx, s.gy), key(c, l)) }
    const goalCell = idx(g.gx, g.gy)
    let found = -1
    while (heap.size) {
      const { k } = heap.pop(); const l = Math.floor(k / N); const cell = k % N
      const gx = cell % gw, gy = (cell / gw) | 0
      if (cell === goalCell && (!bTop || l === 0)) { found = k; break }
      const d0 = dist[k]
      const nb: [number, number, number, number][] = [
        [gx + 1, gy, l, GRID], [gx - 1, gy, l, GRID], [gx, gy + 1, l, GRID], [gx, gy - 1, l, GRID], [gx, gy, 1 - l, VIA_COST],
      ]
      for (const [nx, ny, nl, cost] of nb) {
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const nc = idx(nx, ny)
        if (!(nx === g.gx && ny === g.gy) && blocked(nc, nl)) continue  // đích thì cho vào (pad chính nó)
        const nk = key(nc, nl); const nd = d0 + cost
        if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; heap.push(nd + h(nx, ny), nk) }
      }
    }
    if (found < 0) return null
    const path: { gx: number; gy: number; l: number }[] = []
    let cur = found
    while (cur >= 0) { const l = Math.floor(cur / N); const cell = cur % N; path.push({ gx: cell % gw, gy: (cell / gw) | 0, l }); cur = prev[cur] }
    return path.reverse()
  }

  // MST (Prim) trên các chân của net → danh sách cạnh cần nối
  type P = { x: number; y: number; smd: boolean }
  type Edge = { net: string; nid: number; a: P; b: P }
  const edges: Edge[] = []
  for (const n of nets) {
    if (n.name === layout.pour?.net) continue  // GND đã phủ đồng
    const pts = n.nodes.map((nd) => padPos(nd.comp, nd.pin)).filter(Boolean) as P[]
    if (pts.length < 2) continue
    const inMst = [0]; const out = pts.map((_, i) => i).slice(1)
    while (out.length) {
      let best = { d: Infinity, oi: 0, mi: 0 }
      out.forEach((oi, oidx) => inMst.forEach((mi) => { const d = Math.hypot(pts[oi].x - pts[mi].x, pts[oi].y - pts[mi].y); if (d < best.d) best = { d, oi: oidx, mi } }))
      const oi = out[best.oi]; edges.push({ net: n.name, nid: netId.get(n.name)!, a: pts[best.mi], b: pts[oi] }); inMst.push(oi); out.splice(best.oi, 1)
    }
  }
  edges.sort((x, y) => Math.hypot(x.a.x - x.b.x, x.a.y - x.b.y) - Math.hypot(y.a.x - y.b.x, y.a.y - y.b.y))

  const traces: PcbTrace[] = []; const vias: PcbVia[] = []; let routed = 0, failed = 0; let tid = 0
  for (const e of edges) {
    const path = route(e.a.x, e.a.y, e.b.x, e.b.y, e.nid, e.a.smd, e.b.smd)
    if (!path) { failed++; continue }
    routed++
    const startIdx = traces.length   // trace đầu tiên SINH RA TỪ cạnh này (không phải cạnh trước cùng net)
    let seg: { x: number; y: number }[] = []; let segLayer = path[0].l
    const flush = () => { if (seg.length >= 2) traces.push({ id: `ar${tid++}`, layer: segLayer === 0 ? 'top' : 'bottom', width: TRACE_W, net: e.net, pts: seg }) }
    for (let i = 0; i < path.length; i++) {
      const p = path[i]; occ[p.l][idx(p.gx, p.gy)] = e.nid
      const mmp = cellMm(p.gx, p.gy)
      if (p.l !== segLayer) { flush(); const via = cellMm(p.gx, p.gy); vias.push(via); occ[0][idx(p.gx, p.gy)] = e.nid; occ[1][idx(p.gx, p.gy)] = e.nid; seg = [via]; segLayer = p.l }
      seg.push(mmp)
    }
    if (seg.length) seg[seg.length - 1] = { x: e.b.x, y: e.b.y }
    flush()
    // Snap đầu đoạn về đúng tâm pad (bù sai số làm tròn lưới) — CHỈ trace của cạnh này
    if (traces.length > startIdx && traces[startIdx].pts.length) traces[startIdx].pts[0] = { x: e.a.x, y: e.a.y }
  }
  return { traces, vias, routed, failed }
}
