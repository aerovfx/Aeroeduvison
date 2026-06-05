/** Bộ mô phỏng mạch nhẹ (SPICE-like) bằng Modified Nodal Analysis.
 *  Hỗ trợ: R, C, nguồn áp (BAT/VCC), diode/LED (Newton). Phân tích DC điểm làm
 *  việc + quá độ (transient, backward-Euler). Phần số (MCU/IC/SENSOR/Q/HDR) bỏ
 *  qua — SPICE chỉ mô phỏng ANALOG. */
import type { PcbComponent, PcbNet } from '@/types/pcb'

export interface SpiceResult {
  ok: boolean
  error?: string
  notes: string[]
  nodes: string[]                  // tên net (trừ GND)
  dc: Record<string, number>       // điện áp node DC
  tran?: { t: number[]; v: Record<string, number[]> }
}

const VT = 0.025852
function diodeModel(type: string) { return type === 'LED' ? { Is: 1e-16, n: 2 } : { Is: 1e-14, n: 1 } }
// Giới hạn điện áp diode mỗi vòng Newton (chuẩn SPICE) — chống phân kỳ do hàm mũ.
function pnjlim(vnew: number, vold: number, vt: number, vcrit: number): number {
  if (vnew > vcrit && Math.abs(vnew - vold) > 2 * vt) {
    if (vold > 0) { const arg = 1 + (vnew - vold) / vt; vnew = arg > 0 ? vold + vt * Math.log(arg) : vcrit }
    else vnew = vt * Math.log(Math.max(vnew, 1e-9) / vt)
  }
  return vnew
}

export function parseSI(s: string): number {
  const m = /(-?[\d.]+)\s*([pnuµmkMG]?)/.exec(String(s || '').replace(',', '.'))
  if (!m) return NaN
  const mul: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9 }
  return parseFloat(m[1]) * (mul[m[2]] ?? 1)
}

// Giải hệ tuyến tính A x = b (khử Gauss + chọn trụ).
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
    if (Math.abs(A[p][i]) < 1e-14) return null;
    [A[i], A[p]] = [A[p], A[i]];[b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < n; r++) { if (r === i) continue; const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i] }
  }
  return b.map((v, i) => v / A[i][i])
}

interface El { kind: 'R' | 'C' | 'V' | 'D'; a: number; b: number; val: number; led?: boolean }

export function simulate(comps: PcbComponent[], nets: PcbNet[], opts: { mode: 'dc' | 'tran'; tStop?: number; tStep?: number }): SpiceResult {
  const notes: string[] = []
  // node: net → index; GND (net tên gnd/mass HOẶC net chứa chân linh kiện GND) = -1
  const pinNet = new Map<string, string>(); nets.forEach((nn) => nn.nodes.forEach((nd) => pinNet.set(nd.comp + '|' + nd.pin, nn.name)))
  const gndNets = new Set<string>()
  nets.forEach((nn) => { if (/gnd|mass/i.test(nn.name)) gndNets.add(nn.name) })
  comps.filter((c) => c.type === 'GND').forEach((c) => { const nm = pinNet.get(c.ref + '|' + (c.pins[0] || 'GND')); if (nm) gndNets.add(nm) })
  const nodeNames = nets.map((n) => n.name).filter((nm) => !gndNets.has(nm))
  const nodeIdx = new Map<string, number>(); nodeNames.forEach((nm, i) => nodeIdx.set(nm, i))
  const ni = (net?: string) => (net === undefined ? null : gndNets.has(net) ? -1 : nodeIdx.has(net) ? nodeIdx.get(net)! : null)
  const pinNode = (ref: string, pin: string) => ni(pinNet.get(ref + '|' + pin))

  const els: El[] = []; const vsrc: El[] = []
  for (const c of comps) {
    const v = parseSI(c.value)
    if (c.type === 'R' || c.type === 'SW') { const a = pinNode(c.ref, c.pins[0]), b = pinNode(c.ref, c.pins[1]); if (a === null || b === null) continue; els.push({ kind: 'R', a, b, val: c.type === 'SW' ? 1e-3 : (isFinite(v) && v > 0 ? v : 1000) }) }
    else if (c.type === 'C') { const a = pinNode(c.ref, c.pins[0]), b = pinNode(c.ref, c.pins[1]); if (a === null || b === null) continue; els.push({ kind: 'C', a, b, val: isFinite(v) && v > 0 ? v : 1e-7 }) }
    else if (c.type === 'BAT') { const a = pinNode(c.ref, '+'), b = pinNode(c.ref, '-'); if (a === null || b === null || a === b) continue; vsrc.push({ kind: 'V', a, b, val: isFinite(v) ? v : 5 }) }   // a===b: hai cực chập (vd cả 2 vào GND) → bỏ
    else if (c.type === 'VCC') { const a = pinNode(c.ref, c.pins[0]); if (a === null || a < 0) continue; vsrc.push({ kind: 'V', a, b: -1, val: isFinite(v) ? v : 5 }) }   // a<0: chân nối thẳng GND → nguồn suy biến, bỏ
    else if (c.type === 'LED' || c.type === 'D') { const a = pinNode(c.ref, 'A'), b = pinNode(c.ref, 'K'); if (a === null || b === null) continue; els.push({ kind: 'D', a, b, val: 0, led: c.type === 'LED' }) }
  }
  if (!vsrc.length) notes.push('⚠ Không có nguồn (BAT/VCC) — kết quả có thể toàn 0V.')
  if (!els.some((e) => e.kind === 'R' || e.kind === 'D') && !vsrc.length) return { ok: false, error: 'Mạch không có phần analog để mô phỏng (chỉ MCU/IC số?).', notes, nodes: nodeNames, dc: {} }

  const nN = nodeNames.length, nV = vsrc.length, dim = nN + nV
  if (dim === 0) return { ok: false, error: 'Không có node để giải.', notes, nodes: [], dc: {} }

  // 1 bước Newton-DC (caps theo companion nếu transient). Trả vector nghiệm.
  function step(prevV: number[] | null, dt: number): number[] | null {
    const x = new Array(dim).fill(0)
    const voldMap = new Map<El, number>()
    for (let iter = 0; iter < 100; iter++) {
      let limited = false
      const A = Array.from({ length: dim }, () => new Array(dim).fill(0)); const z = new Array(dim).fill(0)
      const stampG = (a: number, b: number, g: number) => { if (a >= 0) A[a][a] += g; if (b >= 0) A[b][b] += g; if (a >= 0 && b >= 0) { A[a][b] -= g; A[b][a] -= g } }
      const stampI = (a: number, b: number, i: number) => { if (a >= 0) z[a] -= i; if (b >= 0) z[b] += i }
      for (const e of els) {
        if (e.kind === 'R') stampG(e.a, e.b, 1 / e.val)
        else if (e.kind === 'C') {
          if (prevV === null || dt <= 0) { /* DC: tụ hở */ }
          else { const geq = e.val / dt; const va = e.a >= 0 ? prevV[e.a] : 0, vb = e.b >= 0 ? prevV[e.b] : 0; stampG(e.a, e.b, geq); stampI(e.a, e.b, -geq * (va - vb)) }
        } else if (e.kind === 'D') {
          const { Is, n } = diodeModel(e.led ? 'LED' : 'D'); const nvt = n * VT
          const vcrit = nvt * Math.log(nvt / (Math.SQRT2 * Is))
          const va = e.a >= 0 ? x[e.a] : 0, vb = e.b >= 0 ? x[e.b] : 0
          const vraw = va - vb; let vd = pnjlim(vraw, voldMap.has(e) ? voldMap.get(e)! : vcrit, nvt, vcrit); voldMap.set(e, vd)
          if (Math.abs(vd - vraw) > 1e-9) limited = true
          const ex = Math.exp(vd / nvt); const Id = Is * (ex - 1); const gd = Is / nvt * ex + 1e-12
          stampG(e.a, e.b, gd); stampI(e.a, e.b, Id - gd * vd)
        }
      }
      for (let i = 0; i < nN; i++) A[i][i] += 1e-9    // gmin: rò 1nS mỗi node→đất, tránh ma trận suy biến (node thả nổi)
      // nguồn áp: thêm dòng nhánh
      vsrc.forEach((v, k) => { const r = nN + k; if (v.a >= 0) { A[v.a][r] += 1; A[r][v.a] += 1 } if (v.b >= 0) { A[v.b][r] -= 1; A[r][v.b] -= 1 } z[r] += v.val })
      const sol = solve(A, z)   // A,z dựng mới mỗi vòng, không dùng lại sau solve → khỏi sao chép thủ
      if (!sol) return null
      let maxd = 0; for (let i = 0; i < dim; i++) { maxd = Math.max(maxd, Math.abs(sol[i] - x[i])); x[i] = sol[i] }
      if (maxd < 1e-7 && !limited) return x   // đã hội tụ
    }
    return null   // không hội tụ sau 100 vòng (vd diode mắc thẳng vào nguồn, thiếu điện trở hạn dòng)
  }

  const dcx = step(null, 0)
  if (!dcx) return { ok: false, error: 'Không giải được (mạch hở/ngắn mạch?).', notes, nodes: nodeNames, dc: {} }
  const dc: Record<string, number> = {}; nodeNames.forEach((nm, i) => dc[nm] = dcx[i])

  let tran: SpiceResult['tran']
  if (opts.mode === 'tran') {
    const tStop = opts.tStop || 0.01, dt = opts.tStep || tStop / 200
    const t: number[] = []; const v: Record<string, number[]> = {}; nodeNames.forEach((nm) => v[nm] = [])
    let prev = new Array(dim).fill(0)  // bắt đầu từ 0 (tụ chưa nạp)
    for (let tt = 0; tt <= tStop + 1e-12; tt += dt) {
      const x = step(prev, dt); if (!x) break
      t.push(tt); nodeNames.forEach((nm, i) => v[nm].push(x[i])); prev = x
      if (t.length > 2000) break
    }
    tran = { t, v }
  }
  return { ok: true, notes, nodes: nodeNames, dc, tran }
}
