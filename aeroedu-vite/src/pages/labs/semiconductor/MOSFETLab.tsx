/**
 * MOSFET Lab — NMOS Id-Vds family characteristics + load line
 *
 * Physics model (long-channel square-law with channel-length modulation λ):
 *
 *   Cutoff:     Vgs < Vth              →   Id = 0
 *   Triode:     Vds < Vgs − Vth        →   Id = k · [(Vgs − Vth)·Vds − Vds²/2] · (1 + λ·Vds)
 *   Saturation: Vds ≥ Vgs − Vth        →   Id = (k/2) · (Vgs − Vth)² · (1 + λ·Vds)
 *
 * where  k = µn · Cox · (W/L)      (transconductance parameter, A/V²)
 *
 * DC load line:
 *   Vdd = Vds + Id · Rd     →     Id_load(Vds) = (Vdd − Vds) / Rd
 *
 * Q-point = intersection of the selected Vgs curve with the load line
 * (solved by bisection on f(Vds) = Id_mos(Vds) − (Vdd − Vds)/Rd).
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Plot, Formula, type PlotSeries } from './shared'

function idOfMos(
  Vds: number, Vgs: number, Vth: number, k: number, lambda: number,
): number {
  if (Vgs <= Vth) return 0                   // cutoff
  if (Vds <= 0) return 0
  const Vov = Vgs - Vth                      // overdrive
  const chanMod = 1 + lambda * Vds
  if (Vds < Vov) {
    // Triode / linear
    return k * (Vov * Vds - 0.5 * Vds * Vds) * chanMod
  }
  // Saturation
  return 0.5 * k * Vov * Vov * chanMod
}

function regionOf(Vds: number, Vgs: number, Vth: number): 'Cutoff' | 'Triode' | 'Saturation' {
  if (Vgs <= Vth) return 'Cutoff'
  const Vov = Vgs - Vth
  return Vds < Vov ? 'Triode' : 'Saturation'
}

function solveQPoint(
  Vdd: number, Rd: number, Vgs: number, Vth: number, k: number, lambda: number,
): { Vds: number; Id: number } {
  // Bisection on f(Vds) = Id_mos(Vds) − (Vdd − Vds)/Rd
  let lo = 0, hi = Vdd
  const f = (v: number) => idOfMos(v, Vgs, Vth, k, lambda) - (Vdd - v) / Rd
  const fLo = f(lo), fHi = f(hi)
  if (fLo === 0) return { Vds: 0, Id: Vdd / Rd }
  if (fHi === 0) return { Vds: hi, Id: 0 }
  if (Math.sign(fLo) === Math.sign(fHi)) {
    // No sign change — either cutoff (Vgs ≤ Vth) or extremely deep saturation
    return Vgs <= Vth
      ? { Vds: Vdd, Id: 0 }                 // cutoff — whole supply across MOSFET
      : { Vds: 0.05, Id: (Vdd - 0.05) / Rd } // forced ~full-on
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (fm === 0) return { Vds: mid, Id: idOfMos(mid, Vgs, Vth, k, lambda) }
    if (Math.sign(fm) === Math.sign(fLo)) lo = mid; else hi = mid
  }
  const Vds = (lo + hi) / 2
  return { Vds, Id: idOfMos(Vds, Vgs, Vth, k, lambda) }
}

// ─── Format helper (engineering notation) ──────────────────
function fmtEng(v: number, unit = '') {
  const a = Math.abs(v)
  if (a === 0) return `0 ${unit}`
  if (a < 1e-9)  return `${(v * 1e12).toFixed(1)} p${unit}`
  if (a < 1e-6)  return `${(v * 1e9).toFixed(1)} n${unit}`
  if (a < 1e-3)  return `${(v * 1e6).toFixed(2)} µ${unit}`
  if (a < 1)     return `${(v * 1e3).toFixed(2)} m${unit}`
  if (a < 1e3)   return `${v.toFixed(2)} ${unit}`
  if (a < 1e6)   return `${(v / 1e3).toFixed(2)} k${unit}`
  return `${(v / 1e6).toFixed(2)} M${unit}`
}

// Discrete Vgs sweep values (V) — draws 6 curves
const VGS_VALUES = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]

// ─── NMOS Schematic ──────────────────────────────────────────
function NMOSSchematic({
  Vdd, Rd, Vgs, Vth, k, lambda,
}: {
  Vdd: number; Rd: number; Vgs: number; Vth: number; k: number; lambda: number
}) {
  const q = solveQPoint(Vdd, Rd, Vgs, Vth, k, lambda)
  const reg = regionOf(q.Vds, Vgs, Vth)
  const regColor = reg === 'Cutoff' ? '#64748b' : reg === 'Triode' ? '#f87171' : '#22c55e'

  return (
    <svg viewBox="0 0 280 260" className="w-full">
      <rect x={0} y={0} width={280} height={260} fill="#0a0f1a" rx={8} />

      {/* Vdd rail */}
      <line x1={30} y1={24} x2={250} y2={24} stroke="#fbbf24" strokeWidth={2} />
      <text x={30} y={16} fill="#fbbf24" fontSize={10} fontFamily="monospace">
        +Vdd = {Vdd.toFixed(1)} V
      </text>

      {/* Rd resistor */}
      <line x1={200} y1={24} x2={200} y2={50} stroke="#475569" strokeWidth={1.5} />
      <path d="M 200 50 l -6 3 l 12 6 l -12 6 l 12 6 l -12 6 l 12 6 l -6 3"
            stroke="#ef4444" strokeWidth={1.8} fill="none" />
      <text x={212} y={75} fill="#ef4444" fontSize={10} fontFamily="monospace">
        Rd={fmtEng(Rd, 'Ω')}
      </text>
      <line x1={200} y1={92} x2={200} y2={118} stroke="#475569" strokeWidth={1.5} />

      {/* Drain node */}
      <circle cx={200} cy={118} r={3} fill="#22d3ee" />
      <text x={210} y={122} fill="#22d3ee" fontSize={9} fontFamily="monospace">
        D · Vds={q.Vds.toFixed(2)}V
      </text>

      {/* NMOS symbol (enhancement, n-channel) */}
      <line x1={200} y1={118} x2={200} y2={140} stroke="#22d3ee" strokeWidth={1.5} />
      {/* Gate */}
      <line x1={138} y1={160} x2={162} y2={160} stroke="#e2e8f0" strokeWidth={2} />
      {/* Gate insulator (vertical bar, offset to show insulation) */}
      <line x1={165} y1={146} x2={165} y2={174} stroke="#e2e8f0" strokeWidth={2} />
      {/* Channel (three segments to indicate enhancement type) */}
      <line x1={170} y1={144} x2={170} y2={150} stroke="#e2e8f0" strokeWidth={2} />
      <line x1={170} y1={156} x2={170} y2={164} stroke="#e2e8f0" strokeWidth={2} />
      <line x1={170} y1={170} x2={170} y2={176} stroke="#e2e8f0" strokeWidth={2} />
      {/* Drain connection (top) */}
      <line x1={170} y1={146} x2={200} y2={140} stroke="#22d3ee" strokeWidth={1.5} />
      {/* Source connection (bottom) */}
      <line x1={170} y1={174} x2={200} y2={182} stroke="#a855f7" strokeWidth={1.5} />
      {/* Body arrow (bulk) — n-channel arrow points IN */}
      <line x1={170} y1={160} x2={185} y2={160} stroke="#a3e635" strokeWidth={1.2} />
      <polygon points="170,160 176,156 176,164" fill="#a3e635" />

      {/* Transistor label */}
      <text x={105} y={140} fill="#94a3b8" fontSize={9} fontFamily="monospace">M1</text>
      <text x={94} y={152} fill="#64748b" fontSize={8} fontFamily="monospace">NMOS·Vth={Vth.toFixed(2)}</text>

      {/* Gate voltage source */}
      <line x1={60} y1={160} x2={138} y2={160} stroke="#fbbf24" strokeWidth={1.5} />
      <circle cx={54} cy={160} r={12} fill="none" stroke="#fbbf24" strokeWidth={1.5} />
      <text x={54} y={164} fill="#fbbf24" fontSize={10} textAnchor="middle" fontFamily="monospace">V</text>
      <line x1={54} y1={172} x2={54} y2={210} stroke="#fbbf24" strokeWidth={1.5} />
      <text x={70} y={155} fill="#fbbf24" fontSize={9} fontFamily="monospace">
        Vgs={Vgs.toFixed(2)}V
      </text>

      {/* Source node */}
      <line x1={200} y1={182} x2={200} y2={210} stroke="#a855f7" strokeWidth={1.5} />
      <circle cx={200} cy={210} r={3} fill="#a855f7" />

      {/* GND rail */}
      <line x1={30} y1={210} x2={250} y2={210} stroke="#475569" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={125} y={226} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="monospace">GND</text>

      {/* Id current indicator */}
      <circle cx={200} cy={105} r={3 + Math.min(6, q.Id * 800)} fill="#22d3ee"
              fillOpacity={0.25 + Math.min(0.7, q.Id * 150)} />
      <text x={240} y={108} fill="#22d3ee" fontSize={10} fontFamily="monospace">
        Id={fmtEng(q.Id, 'A')}
      </text>

      {/* Region indicator chip */}
      <rect x={6} y={238} width={76} height={16} rx={3} fill={regColor} fillOpacity={0.15} stroke={regColor} strokeWidth={1} />
      <text x={44} y={249} fill={regColor} fontSize={9} fontFamily="monospace" textAnchor="middle" fontWeight={700}>
        {reg}
      </text>
      <text x={88} y={249} fill="#64748b" fontSize={8} fontFamily="monospace">
        Vov = Vgs − Vth = {(Vgs - Vth).toFixed(2)}V
      </text>
    </svg>
  )
}

// ─── Main module ─────────────────────────────────────────────
export default function MOSFETLab() {
  const [Vth, setVth] = useState(1.0)              // Volt
  const [kMa, setKMa] = useState(5)                 // mA/V²  → k in A/V² = kMa * 1e-3
  const [lambda, setLambda] = useState(0.02)        // 1/V
  const [Vdd, setVdd] = useState(10)
  const [Rd, setRd] = useState(1000)                // Ω
  const [Vgs, setVgs] = useState(2.5)               // V  — selects the active curve

  const k = kMa * 1e-3                              // A/V²

  // Q-point (operating point)
  const Q = useMemo(
    () => solveQPoint(Vdd, Rd, Vgs, Vth, k, lambda),
    [Vdd, Rd, Vgs, Vth, k, lambda],
  )

  const VdsMax = Vdd * 1.05

  // Build 6 family curves (different Vgs values)
  const series: PlotSeries[] = useMemo(() => {
    const arr: PlotSeries[] = []
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#22d3ee', '#a78bfa']
    VGS_VALUES.forEach((vgs, idx) => {
      const pts: { x: number; y: number }[] = []
      const N = 180
      for (let i = 0; i <= N; i++) {
        const v = (i / N) * VdsMax
        pts.push({ x: v, y: idOfMos(v, vgs, Vth, k, lambda) })
      }
      arr.push({
        points: pts,
        color: colors[idx % colors.length],
        label: `Vgs=${vgs.toFixed(1)}V`,
        strokeWidth: Math.abs(vgs - Vgs) < 0.02 ? 2.4 : 1.2,
      })
    })

    // Active Vgs curve (if not in the discrete list, draw on top)
    const onList = VGS_VALUES.some(v => Math.abs(v - Vgs) < 0.02)
    if (!onList) {
      const pts: { x: number; y: number }[] = []
      const N = 180
      for (let i = 0; i <= N; i++) {
        const v = (i / N) * VdsMax
        pts.push({ x: v, y: idOfMos(v, Vgs, Vth, k, lambda) })
      }
      arr.push({
        points: pts,
        color: '#e2e8f0',
        label: `Vgs=${Vgs.toFixed(2)}V (đang chọn)`,
        strokeWidth: 2.4,
      })
    }

    // Load line
    arr.push({
      points: [
        { x: 0, y: Vdd / Rd },
        { x: Vdd, y: 0 },
      ],
      color: '#ffffff',
      label: 'Load line Vdd/Rd',
      strokeWidth: 1.5,
      dashed: true,
    })

    // Vds = Vgs − Vth locus  (boundary between triode and saturation for the selected Vgs)
    const Vov = Math.max(0, Vgs - Vth)
    if (Vov > 0 && Vov < VdsMax) {
      arr.push({
        points: [
          { x: Vov, y: 0 },
          { x: Vov, y: 0.5 * k * Vov * Vov * (1 + lambda * Vov) * 1.2 },
        ],
        color: '#fbbf24',
        label: 'Vds = Vgs − Vth',
        strokeWidth: 1,
        dashed: true,
      })
    }

    return arr
  }, [VdsMax, Vth, k, lambda, Vgs, Vdd, Rd])

  // Auto Y max
  const idSatMax = 0.5 * k * Math.pow(Math.max(...VGS_VALUES, Vgs) - Vth, 2) * (1 + lambda * Vdd)
  const IdMax = Math.max(Vdd / Rd, idSatMax) * 1.1 || 0.01

  const reg = regionOf(Q.Vds, Vgs, Vth)
  const regionColor: 'rose' | 'slate' | 'emerald' =
    reg === 'Cutoff' ? 'slate' : reg === 'Triode' ? 'rose' : 'emerald'

  // Small-signal transconductance (gm) at Q
  const gm = Vgs > Vth ? k * (Vgs - Vth) * (1 + lambda * Q.Vds) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card title="Họ đặc tuyến Id-Vds + Load line (NMOS)">
          <Plot
            series={series}
            options={{
              xLabel: 'Vds', xUnit: 'V',
              yLabel: 'Id', yUnit: 'A',
              xMin: 0, xMax: VdsMax,
              yMin: 0, yMax: IdMax,
              grid: 10, height: 320,
              markers: [{
                x: Q.Vds, y: Q.Id,
                color: '#fde047',
                label: `Q(${Q.Vds.toFixed(2)}V,${fmtEng(Q.Id, 'A')})`,
              }],
            }}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Meter label="Vds (Q)" value={Q.Vds.toFixed(3)} unit="V" color="cyan" />
            <Meter label="Id (Q)" value={fmtEng(Q.Id)} unit="A" color="amber" />
            <Meter label="Vùng" value={reg} color={regionColor} />
          </div>
        </Card>

        <div className="space-y-3">
          <Card title="Schematic NMOS common-source">
            <NMOSSchematic Vdd={Vdd} Rd={Rd} Vgs={Vgs} Vth={Vth} k={k} lambda={lambda} />
          </Card>
          <Card title="Thông số tín hiệu nhỏ">
            <div className="grid grid-cols-2 gap-2">
              <Meter label="gm" value={fmtEng(gm, 'S')} color="emerald"
                     hint="độ dẫn chuyển" />
              <Meter label="Pd (Q)" value={fmtEng(Q.Vds * Q.Id, 'W')} color="purple" />
              <Meter label="Vov" value={(Vgs - Vth).toFixed(2)} unit="V" color="amber"
                     hint="Vgs − Vth" />
              <Meter label="ro" value={
                lambda > 0 && Q.Id > 1e-12
                  ? fmtEng(1 / (lambda * Q.Id), 'Ω')
                  : '∞ Ω'
              } color="blue" hint="1 / (λ·Id)" />
            </div>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Nguồn Vdd">
          <Slider label="Vdd" value={Vdd} min={3} max={24} step={0.5}
                  unit="V" onChange={setVdd} />
        </Card>
        <Card title="Tải Rd">
          <Slider label="Rd" value={Rd} min={100} max={10000} step={100}
                  unit="Ω" onChange={setRd}
                  format={(v) => fmtEng(v).replace(' ', '')} />
        </Card>
        <Card title="Điện áp cổng Vgs">
          <Slider label="Vgs" value={Vgs} min={0} max={5} step={0.05}
                  unit="V" onChange={setVgs} />
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            curve in đậm = Vgs đang chọn
          </div>
        </Card>
        <Card title="Tham số MOSFET">
          <Slider label="Vth" value={Vth} min={0.3} max={2.5} step={0.05}
                  unit="V" onChange={setVth} />
          <Slider label="k = µn·Cox·W/L" value={kMa} min={0.5} max={40} step={0.5}
                  unit="mA/V²" onChange={setKMa} />
          <Slider label="λ (channel-mod)" value={lambda} min={0} max={0.1} step={0.005}
                  unit="1/V" onChange={setLambda} />
        </Card>
      </div>

      <Formula
        title="Công thức NMOS (enhancement, long-channel)"
        lines={[
          { expr: 'Cutoff:      Id = 0', note: 'khi Vgs ≤ Vth' },
          { expr: 'Triode:      Id = k·[(Vgs−Vth)·Vds − Vds²/2]·(1 + λ·Vds)',
            note: 'Vds < Vgs − Vth (linear region)' },
          { expr: 'Saturation:  Id = ½·k·(Vgs−Vth)²·(1 + λ·Vds)',
            note: 'Vds ≥ Vgs − Vth' },
          { expr: 'k = µn · Cox · (W/L)', note: 'tham số dẫn truyền, A/V²' },
          { expr: 'Load line:   Id = (Vdd − Vds) / Rd',
            note: 'Q = giao điểm với curve Vgs đang chọn' },
          { expr: 'gm = k·(Vgs − Vth)·(1+λ·Vds)',
            note: 'độ hỗ dẫn tại Q — dùng thiết kế khuếch đại' },
          { expr: 'ro = 1 / (λ · Id)',
            note: 'trở ra tín hiệu nhỏ (Early effect tương tự BJT)' },
        ]}
      />
    </div>
  )
}
