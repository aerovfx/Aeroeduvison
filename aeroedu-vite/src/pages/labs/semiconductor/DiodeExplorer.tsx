/**
 * DiodeExplorer — Mô phỏng đặc tuyến Volt–Ampere của diode bán dẫn
 *
 * Mô hình Shockley:
 *   I = Is · (exp(V / (η·Vt)) − 1)
 *     Vt = kT/q ≈ 25.85 mV ở 300K
 *     η (ideality factor): 1 cho diode lý tưởng, 1.5–2 cho diode thực
 *
 * Thêm Zener: khi V < −Vz, I = (V + Vz) / Rz (mô hình tuyến tính vùng đánh thủng)
 *
 * Mạch kèm theo: V_source → R_series → Diode (anode → cathode) → GND
 * Tìm điểm làm việc Q giao của đường tải `I = (V_s − V_D) / R` với
 * đường đặc tuyến `I = I_D(V_D)` bằng bisection.
 */
import { useMemo, useState } from 'react'
import { Zap, Info } from 'lucide-react'
import { Card, Slider, Meter, Plot, Formula, fmtV, fmtA, fmtOhm, PlotSeries } from './shared'

type DiodeType = 'si' | 'ge' | 'led-red' | 'led-blue' | 'zener-5v1'

interface DiodeModel {
  name: string
  Is: number        // saturation current (A)
  eta: number       // ideality factor
  Vz?: number       // Zener voltage (V, positive)
  Rz?: number       // Zener dynamic resistance (Ω)
  color: string     // plot color
  description: string
}

const MODELS: Record<DiodeType, DiodeModel> = {
  si: {
    name: 'Diode Silicon (1N4148)',
    Is: 4e-9, eta: 1.9, color: '#22d3ee',
    description: 'Diode tín hiệu Si điển hình: Vd ≈ 0.6–0.7V khi phân cực thuận.',
  },
  ge: {
    name: 'Diode Germanium',
    Is: 1e-6, eta: 1.5, color: '#a78bfa',
    description: 'Diode Ge: Vd ≈ 0.2–0.3V, nhạy hơn Si, dùng trong mạch tách sóng cũ.',
  },
  'led-red': {
    name: 'LED Đỏ (635nm)',
    Is: 1e-16, eta: 2.2, color: '#ef4444',
    description: 'LED đỏ: Vd ≈ 1.8–2.1V, phát quang khi dòng thuận ≥ 1mA.',
  },
  'led-blue': {
    name: 'LED Xanh (470nm)',
    Is: 1e-22, eta: 3.0, color: '#3b82f6',
    description: 'LED xanh dương: Vd ≈ 3.0–3.3V, cần nguồn cao hơn.',
  },
  'zener-5v1': {
    name: 'Zener 5V1 (1N4733)',
    Is: 1e-9, eta: 1.8, Vz: 5.1, Rz: 7, color: '#fbbf24',
    description: 'Zener 5V1: đánh thủng ở -5.1V để ổn áp. Rz ≈ 7Ω vùng breakdown.',
  },
}

const Vt = 0.02585  // thermal voltage @ 300K

/** Compute diode current given forward voltage V using Shockley + optional Zener */
function diodeCurrent(V: number, m: DiodeModel): number {
  // Forward / mild reverse (Shockley)
  const forward = m.Is * (Math.exp(V / (m.eta * Vt)) - 1)
  // Zener breakdown region
  if (m.Vz != null && m.Rz != null && V < -m.Vz) {
    return (V + m.Vz) / m.Rz    // negative large current
  }
  // Clip extreme values to avoid overflow
  if (V > 1.2) return m.Is * Math.exp(1.2 / (m.eta * Vt))
  return forward
}

/** Find Q-point: solve Vs = V_D + I(V_D)·R_series using bisection */
function solveQPoint(Vs: number, R: number, m: DiodeModel): { Vd: number; Id: number } {
  // Load line: I = (Vs − V_D) / R; equal to I_D(V_D)
  // Residual f(V) = (Vs − V)/R − I_D(V); find root
  let lo = -20, hi = 20
  const f = (V: number) => (Vs - V) / R - diodeCurrent(V, m)
  // Expand bounds if needed
  let fa = f(lo), fb = f(hi)
  if (fa * fb > 0) {
    // no sign change; fallback: pick V nearest 0
    return { Vd: Vs * 0.5, Id: Vs / (R * 2) }
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    const fm = f(mid)
    if (fm === 0) { lo = hi = mid; break }
    if (fa * fm < 0) { hi = mid; fb = fm }
    else { lo = mid; fa = fm }
    if (Math.abs(hi - lo) < 1e-8) break
  }
  const Vd = (lo + hi) / 2
  return { Vd, Id: diodeCurrent(Vd, m) }
}

/* ────────────────────────────────────────────────────────────────────
 * Circuit SVG
 * ────────────────────────────────────────────────────────────────────*/

function CircuitSVG({ Vs, R, m, Q }: {
  Vs: number; R: number; m: DiodeModel
  Q: { Vd: number; Id: number }
}) {
  const glow = m.name.includes('LED') ? Math.max(0, Math.min(1, Q.Id / 0.02)) : 0
  const isZener = m.Vz != null
  const arrowCount = Math.max(0, Math.min(14, Math.floor(Math.abs(Q.Id) * 500)))
  return (
    <svg viewBox="0 0 520 220" className="w-full"
         style={{ background: '#0a0f1a', borderRadius: 8 }}>
      {/* Battery */}
      <g transform="translate(40, 90)">
        <line x1={0} y1={-20} x2={0} y2={60} stroke="#3b82f6" strokeWidth={3} />
        <line x1={10} y1={-10} x2={10} y2={50} stroke="#3b82f6" strokeWidth={6} />
        <text x={-4} y={-26} fill="#93c5fd" fontSize={11} fontFamily="monospace" textAnchor="middle">−</text>
        <text x={10} y={-26} fill="#93c5fd" fontSize={11} fontFamily="monospace" textAnchor="middle">+</text>
        <text x={5} y={76} fill="#60a5fa" fontSize={10} fontFamily="monospace" textAnchor="middle">
          {Vs.toFixed(2)}V
        </text>
      </g>

      {/* Wire top */}
      <path d="M 50 70 L 140 70" stroke="#64748b" strokeWidth={2} />

      {/* Resistor (zigzag) */}
      <g transform="translate(140, 70)">
        <path d="M 0 0 l 10 -8 l 12 16 l 12 -16 l 12 16 l 12 -16 l 12 16 l 10 -8"
              stroke="#fbbf24" strokeWidth={2} fill="none" />
        <text x={38} y={-14} fill="#fbbf24" fontSize={10} textAnchor="middle" fontFamily="monospace">
          R = {fmtOhm(R)}
        </text>
      </g>

      <path d="M 220 70 L 280 70" stroke="#64748b" strokeWidth={2} />

      {/* Diode symbol */}
      <g transform="translate(280, 70)">
        <path d="M 0 0 L 40 0" stroke="#64748b" strokeWidth={2} />
        <polygon points="40,-12 40,12 60,0" fill={m.color} stroke={m.color} />
        <line x1={60} y1={-12} x2={60} y2={12} stroke={m.color} strokeWidth={3} />
        {/* Zener tick */}
        {isZener && (
          <>
            <line x1={60} y1={-12} x2={56} y2={-16} stroke={m.color} strokeWidth={2} />
            <line x1={60} y1={12} x2={64} y2={16} stroke={m.color} strokeWidth={2} />
          </>
        )}
        <path d="M 60 0 L 100 0" stroke="#64748b" strokeWidth={2} />
        <text x={30} y={-18} fill={m.color} fontSize={10} textAnchor="middle"
              fontFamily="monospace" fontWeight={700}>
          {m.name.split(' ')[0]}
        </text>
        <text x={30} y={24} fill="#cbd5e1" fontSize={9} textAnchor="middle" fontFamily="monospace">
          V_D = {Q.Vd.toFixed(3)}V
        </text>
        {/* LED glow */}
        {glow > 0.05 && (
          <>
            <circle cx={30} cy={0} r={16 + glow * 8} fill={m.color}
                    fillOpacity={0.15 + glow * 0.3} />
            <circle cx={30} cy={0} r={6} fill={m.color} fillOpacity={0.8} />
          </>
        )}
      </g>

      <path d="M 380 70 L 470 70 L 470 140 L 50 140 L 50 110"
            stroke="#64748b" strokeWidth={2} fill="none" />

      {/* Ground */}
      <g transform="translate(260, 180)">
        <path d="M -15 0 L 15 0 M -10 5 L 10 5 M -5 10 L 5 10"
              stroke="#64748b" strokeWidth={2} />
        <line x1={0} y1={-30} x2={0} y2={0} stroke="#64748b" strokeWidth={2} />
        <path d="M 260 140 L 260 150" stroke="#64748b" strokeWidth={2} />
      </g>

      {/* Current animation dots */}
      {Array.from({ length: arrowCount }, (_, i) => {
        const phase = (performance.now() / 400 + i / arrowCount) % 1
        // Path length ≈ 50+90+60+90+70+30+420 ≈ 810
        // Simplified: animate along top then right then bottom then left
        const path = [
          { from: [50, 70], to: [140, 70] },
          { from: [220, 70], to: [280, 70] },
          { from: [380, 70], to: [470, 70] },
          { from: [470, 70], to: [470, 140] },
          { from: [470, 140], to: [50, 140] },
          { from: [50, 140], to: [50, 110] },
        ]
        const totalLen = path.reduce((acc, seg) => {
          return acc + Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1])
        }, 0)
        let dist = phase * totalLen
        let x = 50, y = 70
        for (const seg of path) {
          const len = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1])
          if (dist < len) {
            const k = dist / len
            x = seg.from[0] + (seg.to[0] - seg.from[0]) * k
            y = seg.from[1] + (seg.to[1] - seg.from[1]) * k
            break
          }
          dist -= len
        }
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#fde047" />
      })}

      <text x={510} y={210} fill="#64748b" fontSize={9}
            fontFamily="monospace" textAnchor="end">
        I = {fmtA(Q.Id)}
      </text>
    </svg>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Main page
 * ────────────────────────────────────────────────────────────────────*/

export default function DiodeExplorer() {
  const [type, setType] = useState<DiodeType>('si')
  const [Vs, setVs] = useState(3.3)
  const [R, setR] = useState(220)

  const model = MODELS[type]

  // Compute IV curve points
  const curve = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const vMin = model.Vz != null ? -(model.Vz + 1) : -2
    const vMax = type === 'led-blue' ? 3.5 : type === 'led-red' ? 2.5 : 1.0
    const N = 400
    for (let i = 0; i < N; i++) {
      const V = vMin + (i / (N - 1)) * (vMax - vMin)
      let I = diodeCurrent(V, model)
      // Clip to visible range
      if (I > 0.05) I = 0.05
      if (I < -0.05) I = -0.05
      pts.push({ x: V, y: I * 1000 })  // display in mA
    }
    return pts
  }, [type, model])

  // Solve Q-point
  const Q = useMemo(() => solveQPoint(Vs, R, model), [Vs, R, model])

  // Load line
  const loadLine = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    for (let i = 0; i <= 20; i++) {
      const V = -2 + (i / 20) * (Vs + 2)
      const I = (Vs - V) / R
      pts.push({ x: V, y: I * 1000 })
    }
    return pts
  }, [Vs, R])

  const series: PlotSeries[] = [
    { points: curve, color: model.color, strokeWidth: 2.5, label: 'I–V diode' },
    { points: loadLine, color: '#f97316', strokeWidth: 1.5, dashed: true, label: `Load line (R=${fmtOhm(R)})` },
  ]

  const vMin = model.Vz != null ? -(model.Vz + 1) : -1
  const vMax = type === 'led-blue' ? 3.5 : type === 'led-red' ? 2.5 : 1.0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Khám phá Diode bán dẫn
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            {model.description}
          </p>
        </div>
      </div>

      {/* Diode type selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(MODELS) as [DiodeType, DiodeModel][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setType(k)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
              type === k
                ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            style={type === k ? { borderColor: v.color, color: v.color } : undefined}
          >
            {v.name}
          </button>
        ))}
      </div>

      {/* Grid: plot + controls */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card title="Đặc tuyến I–V + đường tải" icon={<Info className="w-3.5 h-3.5" />}>
          <Plot
            series={series}
            options={{
              xLabel: 'V_D', xUnit: 'V',
              yLabel: 'I_D', yUnit: 'mA',
              xMin: vMin, xMax: vMax,
              yMin: model.Vz ? -50 : -5, yMax: 50,
              width: 540, height: 320,
              markers: [{
                x: Q.Vd, y: Q.Id * 1000,
                label: `Q(${Q.Vd.toFixed(2)}V, ${(Q.Id * 1000).toFixed(2)}mA)`,
                color: '#fde047',
              }],
            }}
          />
        </Card>

        <div className="space-y-3">
          <Card title="Nguồn & Tải">
            <div className="space-y-3">
              <Slider label="Nguồn Vs" value={Vs} min={-8} max={12} step={0.05}
                      unit="V" onChange={setVs} />
              <Slider label="Điện trở R" value={R} min={10} max={10000} step={10}
                      unit="Ω" onChange={setR}
                      format={v => fmtOhm(v)} />
            </div>
          </Card>

          <Card title="Điểm làm việc Q">
            <div className="grid grid-cols-2 gap-2">
              <Meter label="V_D" value={Q.Vd.toFixed(3)} unit="V" color="cyan" />
              <Meter label="I_D" value={fmtA(Q.Id)} color="amber" />
              <Meter label="V_R" value={(Vs - Q.Vd).toFixed(2)} unit="V" color="purple" />
              <Meter label="P_D" value={fmtEng(Q.Vd * Q.Id, 3) + 'W'} color="rose" />
            </div>
          </Card>
        </div>
      </div>

      {/* Circuit + formula */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
        <Card title="Mạch đo">
          <CircuitSVG Vs={Vs} R={R} m={model} Q={Q} />
        </Card>

        <Formula
          title="Công thức"
          lines={[
            { expr: 'I = Is · (e^(V/ηVt) − 1)', note: 'Phương trình Shockley' },
            { expr: 'Vt = kT/q = 25.85 mV @ 300K', note: 'Điện áp nhiệt' },
            { expr: `η = ${model.eta}`, note: 'hệ số lý tưởng' },
            { expr: `Is = ${model.Is.toExponential(1)} A`, note: 'dòng bão hòa' },
            ...(model.Vz ? [{ expr: `Vz = ${model.Vz}V, Rz = ${model.Rz}Ω`, note: 'Zener breakdown' }] : []),
            { expr: 'Vs = V_R + V_D = I·R + V_D', note: 'Định luật Kirchhoff' },
            { expr: 'I = (Vs − V_D) / R', note: 'đường tải' },
          ]}
        />
      </div>
    </div>
  )
}

function fmtEng(v: number, digits = 2): string {
  if (!isFinite(v)) return '∞'
  if (v === 0) return '0'
  const abs = Math.abs(v)
  const prefixes: [number, string][] = [
    [1e-12, 'p'], [1e-9, 'n'], [1e-6, 'µ'], [1e-3, 'm'],
    [1, ''], [1e3, 'k'], [1e6, 'M'],
  ]
  let p: [number, string] = [1, '']
  for (const c of prefixes) if (abs >= c[0]) p = c
  return `${(v / p[0]).toFixed(digits)} ${p[1]}`
}
