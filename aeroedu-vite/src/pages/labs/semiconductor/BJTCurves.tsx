/**
 * BJT Curves + Load Line — NPN common-emitter family of output characteristics
 *
 * Physics model (Ebers-Moll simplified, ignoring base-width modulation except
 * via the Early voltage Va):
 *   Ic  = β · Ib  (normal active region)
 *   Ic  = 0                                      if Vce < 0 or Ib < 0
 *   Ic  saturates linearly from 0 → β·Ib
 *         in the region Vce ∈ [0, Vce(sat)≈0.2 V]
 *   Ic *= (1 + Vce / Va)                         — Early effect slope in active
 *
 * The DC load line comes from:
 *     Vcc = Vce + Ic · Rc   →  Ic_load(Vce) = (Vcc − Vce)/Rc
 * Q-point is the intersection of the selected Ib curve with the load line.
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Plot, Formula, type PlotSeries } from './shared'

const VCE_SAT = 0.2            // volts
const DEFAULT_BETA = 150
const DEFAULT_EARLY = 80       // volts (Va)

function icOfBjt(
  Vce: number, Ib: number, beta: number, Va: number,
): number {
  if (Ib <= 0) return 0
  if (Vce <= 0) return 0
  const icActive = beta * Ib * (1 + Vce / Va)
  if (Vce < VCE_SAT) {
    // linear ramp from 0 at Vce=0 to icActive at Vce=VCE_SAT
    return (Vce / VCE_SAT) * icActive
  }
  return icActive
}

function solveQPoint(
  Vcc: number, Rc: number, Ib: number, beta: number, Va: number,
) {
  // Bisection on f(Vce) = Ic_bjt(Vce) − (Vcc − Vce)/Rc
  let lo = 0, hi = Vcc
  const f = (Vce: number) => icOfBjt(Vce, Ib, beta, Va) - (Vcc - Vce) / Rc
  const fLo = f(lo), fHi = f(hi)
  if (fLo === 0) return { Vce: 0, Ic: (Vcc - 0) / Rc }
  if (fHi === 0) return { Vce: hi, Ic: 0 }
  if (Math.sign(fLo) === Math.sign(fHi)) {
    // Both same sign — use cutoff (Ib≈0) or very-saturated fallback
    return Ib <= 0
      ? { Vce: Vcc, Ic: 0 }
      : { Vce: VCE_SAT, Ic: (Vcc - VCE_SAT) / Rc }
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (fm === 0) return { Vce: mid, Ic: icOfBjt(mid, Ib, beta, Va) }
    if (Math.sign(fm) === Math.sign(fLo)) lo = mid; else hi = mid
  }
  const Vce = (lo + hi) / 2
  return { Vce, Ic: icOfBjt(Vce, Ib, beta, Va) }
}

// ─── Format helpers (local) ────────────────────────────────
function fmtEng(v: number, unit = '') {
  const a = Math.abs(v)
  if (a === 0) return `0 ${unit}`
  if (a < 1e-9) return `${(v * 1e12).toFixed(1)} p${unit}`
  if (a < 1e-6) return `${(v * 1e9).toFixed(1)} n${unit}`
  if (a < 1e-3) return `${(v * 1e6).toFixed(2)} µ${unit}`
  if (a < 1)    return `${(v * 1e3).toFixed(2)} m${unit}`
  if (a < 1e3)  return `${v.toFixed(2)} ${unit}`
  if (a < 1e6)  return `${(v / 1e3).toFixed(2)} k${unit}`
  return `${(v / 1e6).toFixed(2)} M${unit}`
}

// Discrete Ib values to draw 6 curves
const IB_VALUES_UA = [5, 10, 20, 40, 80, 120] // microamps

// ─── Schematic ───────────────────────────────────────────────
function BJTSchematic({
  Vcc, Rc, Ib, beta, Va,
}: {
  Vcc: number; Rc: number; Ib: number; beta: number; Va: number
}) {
  const q = solveQPoint(Vcc, Rc, Ib, beta, Va)
  const ic = q.Ic

  return (
    <svg viewBox="0 0 280 260" className="w-full">
      {/* Background */}
      <rect x={0} y={0} width={280} height={260} fill="#0a0f1a" rx={8} />

      {/* Vcc rail (top) */}
      <line x1={30} y1={24} x2={250} y2={24} stroke="#fbbf24" strokeWidth={2} />
      <text x={30} y={16} fill="#fbbf24" fontSize={10} fontFamily="monospace">
        +Vcc = {Vcc.toFixed(1)} V
      </text>

      {/* Rc resistor at top-right (zigzag going down) */}
      <line x1={200} y1={24} x2={200} y2={50} stroke="#475569" strokeWidth={1.5} />
      <path d="M 200 50 l -6 3 l 12 6 l -12 6 l 12 6 l -12 6 l 12 6 l -6 3"
            stroke="#ef4444" strokeWidth={1.8} fill="none" />
      <text x={212} y={75} fill="#ef4444" fontSize={10} fontFamily="monospace">
        Rc={fmtEng(Rc, 'Ω')}
      </text>
      <line x1={200} y1={92} x2={200} y2={118} stroke="#475569" strokeWidth={1.5} />

      {/* Node C (collector) */}
      <circle cx={200} cy={118} r={3} fill="#22d3ee" />
      <text x={210} y={122} fill="#22d3ee" fontSize={9} fontFamily="monospace">
        C · Vce={q.Vce.toFixed(2)}V
      </text>

      {/* Transistor body (circle) with NPN symbol */}
      <line x1={200} y1={118} x2={200} y2={138} stroke="#475569" strokeWidth={1.5} />
      <circle cx={170} cy={160} r={22} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
      {/* Base line */}
      <line x1={148} y1={160} x2={162} y2={160} stroke="#e2e8f0" strokeWidth={2} />
      {/* Base vertical line (interior) */}
      <line x1={162} y1={146} x2={162} y2={174} stroke="#e2e8f0" strokeWidth={2} />
      {/* Collector line */}
      <line x1={162} y1={150} x2={200} y2={138} stroke="#22d3ee" strokeWidth={1.5} />
      {/* Emitter line with arrow-out (NPN) */}
      <line x1={162} y1={170} x2={200} y2={182} stroke="#a855f7" strokeWidth={1.5} />
      {/* Emitter arrow */}
      <polygon points="194,182 188,178 188,186" fill="#a855f7" />

      {/* Transistor label */}
      <text x={138} y={140} fill="#94a3b8" fontSize={9} fontFamily="monospace">Q1</text>
      <text x={138} y={152} fill="#64748b" fontSize={8} fontFamily="monospace">NPN·β={beta}</text>

      {/* Base drive (current source I_B) */}
      <line x1={60} y1={160} x2={148} y2={160} stroke="#fbbf24" strokeWidth={1.5} />
      <circle cx={54} cy={160} r={12} fill="none" stroke="#fbbf24" strokeWidth={1.5} />
      <text x={54} y={164} fill="#fbbf24" fontSize={10} textAnchor="middle" fontFamily="monospace">I</text>
      <line x1={54} y1={172} x2={54} y2={210} stroke="#fbbf24" strokeWidth={1.5} />
      <text x={70} y={155} fill="#fbbf24" fontSize={9} fontFamily="monospace">
        Ib={fmtEng(Ib, 'A')}
      </text>

      {/* Node E (emitter) */}
      <line x1={200} y1={182} x2={200} y2={210} stroke="#a855f7" strokeWidth={1.5} />
      <circle cx={200} cy={210} r={3} fill="#a855f7" />

      {/* GND rail */}
      <line x1={30} y1={210} x2={250} y2={210} stroke="#475569" strokeWidth={1.5} strokeDasharray="3 2" />
      <text x={125} y={226} fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="monospace">GND</text>

      {/* Ic current indicator */}
      <circle cx={200} cy={105} r={3 + Math.min(5, ic * 600)} fill="#22d3ee"
              fillOpacity={0.3 + Math.min(0.7, ic * 80)} />
      <text x={240} y={108} fill="#22d3ee" fontSize={10} fontFamily="monospace">
        Ic={fmtEng(ic, 'A')}
      </text>

      {/* Legend labels */}
      <text x={6} y={254} fill="#64748b" fontSize={8} fontFamily="monospace">
        Vcc → Rc → C(BJT)E → GND   ·   Ib nguồn dòng
      </text>
    </svg>
  )
}

// ─── Main module ─────────────────────────────────────────────
export default function BJTCurves() {
  const [beta, setBeta] = useState(DEFAULT_BETA)
  const [Va, setVa] = useState(DEFAULT_EARLY)
  const [Vcc, setVcc] = useState(12)
  const [Rc, setRc] = useState(1000)           // 1 kΩ
  const [IbUa, setIbUa] = useState(40)         // microamps — selects the active Q curve

  const Ib = IbUa * 1e-6

  // Q-point
  const Q = useMemo(
    () => solveQPoint(Vcc, Rc, Ib, beta, Va),
    [Vcc, Rc, Ib, beta, Va],
  )

  // X axis limits = [0, Vcc + 5%]
  const VceMax = Vcc * 1.05

  // Build 6 family curves
  const series: PlotSeries[] = useMemo(() => {
    const arr: PlotSeries[] = []
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#22d3ee', '#a78bfa']
    IB_VALUES_UA.forEach((ibua, idx) => {
      const ib = ibua * 1e-6
      const pts: { x: number; y: number }[] = []
      const N = 160
      for (let i = 0; i <= N; i++) {
        const v = (i / N) * VceMax
        pts.push({ x: v, y: icOfBjt(v, ib, beta, Va) })
      }
      arr.push({
        points: pts,
        color: colors[idx % colors.length],
        label: `Ib=${ibua}µA`,
        strokeWidth: ibua === IbUa ? 2.4 : 1.2,
      })
    })
    // Load line: two endpoints (0, Vcc/Rc) → (Vcc, 0)
    arr.push({
      points: [
        { x: 0, y: Vcc / Rc },
        { x: Vcc, y: 0 },
      ],
      color: '#ffffff',
      label: `Load line Vcc/Rc`,
      strokeWidth: 1.5,
      dashed: true,
    })
    return arr
  }, [VceMax, beta, Va, IbUa, Vcc, Rc])

  // Auto Y max: a bit above Ic at saturation (Vcc/Rc)
  const IcMax = Math.max(
    Vcc / Rc,
    beta * IB_VALUES_UA[IB_VALUES_UA.length - 1] * 1e-6 * (1 + Vcc / Va),
  ) * 1.1

  // Region classifier for Q
  const region =
    Q.Vce < VCE_SAT + 0.05 ? 'Saturation'
    : Q.Ic < 1e-9 ? 'Cutoff'
    : 'Active'
  const regionColor: 'rose' | 'slate' | 'emerald' =
    region === 'Saturation' ? 'rose' : region === 'Cutoff' ? 'slate' : 'emerald'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Plot */}
        <Card title="Họ đặc tuyến Ic-Vce + Load line">
          <Plot
            series={series}
            options={{
              xLabel: 'Vce', xUnit: 'V',
              yLabel: 'Ic', yUnit: 'A',
              xMin: 0, xMax: VceMax,
              yMin: 0, yMax: IcMax,
              grid: 10, height: 320,
              markers: [{
                x: Q.Vce, y: Q.Ic,
                color: '#fde047',
                label: `Q(${Q.Vce.toFixed(2)}V,${fmtEng(Q.Ic, 'A')})`,
              }],
            }}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Meter label="Vce (Q)" value={Q.Vce.toFixed(3)} unit="V" color="cyan" />
            <Meter label="Ic (Q)" value={fmtEng(Q.Ic)} unit="A" color="amber" />
            <Meter label="Vùng" value={region} color={regionColor} />
          </div>
        </Card>

        {/* Schematic + metering */}
        <div className="space-y-3">
          <Card title="Schematic">
            <BJTSchematic Vcc={Vcc} Rc={Rc} Ib={Ib} beta={beta} Va={Va} />
          </Card>
          <Card title="Công suất & thông số">
            <div className="grid grid-cols-2 gap-2">
              <Meter label="Pc (Q)" value={fmtEng(Q.Vce * Q.Ic, 'W')} color="purple" />
              <Meter label="Ib" value={fmtEng(Ib, 'A')} color="amber" />
              <Meter label="β·Ib" value={fmtEng(beta * Ib, 'A')} color="emerald" />
              <Meter label="Vcc/Rc" value={fmtEng(Vcc / Rc, 'A')} color="blue"
                     hint="Ic khi bão hòa" />
            </div>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Nguồn Vcc">
          <Slider label="Vcc" value={Vcc} min={3} max={24} step={0.5}
                  unit="V" onChange={setVcc} />
        </Card>
        <Card title="Tải Rc">
          <Slider label="Rc" value={Rc} min={100} max={10000} step={100}
                  unit="Ω" onChange={setRc}
                  format={(v) => fmtEng(v).replace(' ', '')} />
        </Card>
        <Card title="Dòng Base Ib">
          <Slider label="Ib" value={IbUa} min={1} max={150} step={1}
                  unit="µA" onChange={setIbUa} />
          <div className="mt-1 text-[10px] text-zinc-500 font-mono">
            curve in đậm = Ib hiện tại
          </div>
        </Card>
        <Card title="Hệ số BJT">
          <Slider label="β" value={beta} min={20} max={400} step={5}
                  onChange={setBeta} />
          <Slider label="Early Va" value={Va} min={30} max={200} step={5}
                  unit="V" onChange={setVa} />
        </Card>
      </div>

      <Formula
        title="Công thức"
        lines={[
          { expr: 'Ic = β · Ib · (1 + Vce / Va)', note: 'vùng hoạt động (active)' },
          { expr: 'Ic = (Vce / Vce_sat) · β·Ib', note: `vùng bão hòa (Vce < ${VCE_SAT} V)` },
          { expr: 'Load line:  Ic = (Vcc − Vce) / Rc', note: 'nghiệm Q ở giao điểm' },
          { expr: 'Pc = Vce · Ic', note: 'công suất tiêu tán trên transistor' },
          { expr: 'Ic(sat) = Vcc / Rc', note: 'dòng tối đa khi C ≡ E' },
        ]}
      />
    </div>
  )
}
