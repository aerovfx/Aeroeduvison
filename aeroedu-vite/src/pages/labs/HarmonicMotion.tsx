/**
 * HarmonicMotion — Dao động điều hòa (SHM)
 *
 * Route: /dashboard/labtwin/harmonic-motion
 * User: "fix /dashboard/labtwin/harmonic-motion"
 *
 * Features:
 *   - Mass-spring oscillator với biên độ A, ω, φ tự chỉnh
 *   - Multi-graph x(t), v(t), a(t) cùng lúc
 *   - Phase plot (x vs v) — quỹ đạo ellipse trong không gian pha
 *   - Energy plot (KE, PE, total)
 *   - Damping option → exponential decay
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Activity, Info,
} from 'lucide-react'

interface HistorySample {
  t: number; x: number; v: number; a: number; ke: number; pe: number
}

const CANVAS_W = 700
const CANVAS_H = 200
const PX_PER_M = 40

export default function HarmonicMotion() {
  const massCanvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(true)
  const tRef = useRef(0)
  const historyRef = useRef<HistorySample[]>([])
  const [, forceRender] = useState(0)

  const [running, setRunning] = useState(true)
  const [A, setA] = useState(2)            // amplitude m
  const [omega, setOmega] = useState(2)     // rad/s
  const [phaseDeg, setPhaseDeg] = useState(0)
  const [damping, setDamping] = useState(0)
  const [mass, setMass] = useState(1)

  runningRef.current = running

  const reset = () => {
    tRef.current = 0
    historyRef.current = []
  }

  // Reset on params change
  useEffect(() => { reset() }, [A, omega, phaseDeg, damping, mass])

  // Sim loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const phaseRad = (phaseDeg * Math.PI) / 180
    const k = omega * omega * mass    // k = m·ω²

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now

      if (runningRef.current) {
        tRef.current += dt
        const t = tRef.current
        // x(t) = A·e^(-bt)·cos(ω'·t + φ) where ω' = √(ω²-b²)
        const wD = Math.sqrt(Math.max(0, omega * omega - damping * damping))
        const decay = Math.exp(-damping * t)
        const x = A * decay * Math.cos(wD * t + phaseRad)
        // v(t) = derivative — approximate analytically
        const v = -A * decay * (damping * Math.cos(wD * t + phaseRad) + wD * Math.sin(wD * t + phaseRad))
        // a(t) = -ω²x - 2bv  (damped SHM)
        const aVal = -omega * omega * x - 2 * damping * v
        const ke = 0.5 * mass * v * v
        const pe = 0.5 * k * x * x

        // Sample every ~30ms for charts
        if (historyRef.current.length === 0 ||
            t - historyRef.current[historyRef.current.length - 1].t >= 0.03) {
          historyRef.current.push({ t, x, v, a: aVal, ke, pe })
          if (historyRef.current.length > 400) historyRef.current.shift()
          forceRender((n) => (n + 1) & 0xFFFF)
        }
      }

      // Render mass-spring viz
      renderMassSpring()
      raf = requestAnimationFrame(loop)
    }

    function renderMassSpring() {
      const canvas = massCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      // BG
      const grad = ctx.createLinearGradient(0, 0, W, 0)
      grad.addColorStop(0, '#0a0f1f')
      grad.addColorStop(1, '#1e1b3a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Wall on left
      ctx.fillStyle = '#475569'
      ctx.fillRect(0, 0, 20, H)
      // Hatching on wall
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.5
      for (let i = 0; i < H; i += 14) {
        ctx.beginPath()
        ctx.moveTo(0, i); ctx.lineTo(20, i + 14)
        ctx.stroke()
      }

      // Equilibrium position
      const equilibX = 200
      const yCenter = H / 2

      // Current x value
      const t = tRef.current
      const wD = Math.sqrt(Math.max(0, omega * omega - damping * damping))
      const decay = Math.exp(-damping * t)
      const xCur = A * decay * Math.cos(wD * t + (phaseDeg * Math.PI) / 180)
      const blockX = equilibX + xCur * PX_PER_M

      // Spring (sinusoidal)
      const springStartX = 20
      const springEndX = blockX - 32
      const springLen = springEndX - springStartX
      ctx.strokeStyle = '#a78bfa'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      const coils = 16
      ctx.moveTo(springStartX, yCenter)
      for (let i = 0; i <= coils * 4; i++) {
        const tt = i / (coils * 4)
        const sx = springStartX + tt * springLen
        const sy = yCenter + (i % 4 < 2 ? 1 : -1) * 14 * Math.sin(i * Math.PI / 2)
        ctx.lineTo(sx, sy)
      }
      ctx.lineTo(springEndX, yCenter)
      ctx.stroke()
      ctx.lineCap = 'butt'

      // Equilibrium marker
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(148,163,184,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(equilibX, 30); ctx.lineTo(equilibX, H - 30)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(148,163,184,0.7)'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('x = 0', equilibX, H - 12)

      // Amplitude markers
      ctx.setLineDash([2, 4])
      ctx.strokeStyle = 'rgba(168,139,250,0.3)'
      ctx.beginPath()
      ctx.moveTo(equilibX - A * PX_PER_M, 35); ctx.lineTo(equilibX - A * PX_PER_M, H - 35)
      ctx.moveTo(equilibX + A * PX_PER_M, 35); ctx.lineTo(equilibX + A * PX_PER_M, H - 35)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#a78bfa'
      ctx.font = 'bold 10px monospace'
      ctx.fillText(`-A`, equilibX - A * PX_PER_M, 24)
      ctx.fillText(`+A`, equilibX + A * PX_PER_M, 24)

      // Block (mass)
      const blockSize = 42 + mass * 6
      const blockY = yCenter - blockSize / 2
      const blockGrad = ctx.createLinearGradient(blockX - blockSize / 2, blockY, blockX + blockSize / 2, blockY + blockSize)
      blockGrad.addColorStop(0, '#c084fc')
      blockGrad.addColorStop(1, '#7c3aed')
      ctx.fillStyle = blockGrad
      ctx.shadowColor = '#a78bfa'
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.roundRect(blockX - blockSize / 2, blockY, blockSize, blockSize, 6)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#e9d5ff'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = `bold ${Math.min(14, blockSize / 3.5)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${mass}kg`, blockX, yCenter)

      // Current x label
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 13px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`x = ${xCur >= 0 ? '+' : ''}${xCur.toFixed(3)} m`,
        blockX, blockY - 12)
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [A, omega, phaseDeg, damping, mass])

  const period = (2 * Math.PI) / omega
  const totalE = 0.5 * mass * omega * omega * A * A

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <Activity className="w-6 h-6 text-violet-400" />
                Dao động điều hòa SHM
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                x(t) = A·e<sup>-bt</sup>·cos(ωt + φ) · Mass-spring · Phase plot · Energy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Chạy</>}
            </button>
            <button onClick={reset}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Thông số</h3>
              <Slider label="Biên độ A" value={A} min={0.5} max={4} step={0.1} suffix=" m" onChange={setA} />
              <Slider label="Vận tốc góc ω" value={omega} min={0.5} max={6} step={0.1} suffix=" rad/s" onChange={setOmega} />
              <Slider label="Pha ban đầu φ" value={phaseDeg} min={0} max={360} step={5} suffix="°" onChange={setPhaseDeg} />
              <Slider label="Khối lượng m" value={mass} min={0.5} max={5} step={0.5} suffix=" kg" onChange={setMass} />
              <Slider label="Tắt dần b" value={damping} min={0} max={1} step={0.02} suffix=" /s" onChange={setDamping} />
              <p className="text-[10px] text-white/40 italic">
                b = 0: dao động duy trì · b &gt; 0: tắt dần exponential
              </p>
            </div>

            <div className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-violet-300">📊 Đại lượng</h3>
              <Row label="Chu kỳ T" value={`${period.toFixed(2)} s`} formula="2π/ω" />
              <Row label="Tần số f" value={`${(1 / period).toFixed(2)} Hz`} formula="1/T" />
              <Row label="k = mω²" value={`${(mass * omega * omega).toFixed(2)} N/m`} formula="độ cứng tương đương" />
              <Row label="E_max" value={`${totalE.toFixed(3)} J`} formula="½kA²" />
              <Row label="v_max" value={`${(A * omega).toFixed(2)} m/s`} formula="A·ω" />
              <Row label="a_max" value={`${(A * omega * omega).toFixed(2)} m/s²`} formula="A·ω²" />
            </div>
          </div>

          {/* Main + charts */}
          <div className="lg:col-span-3 space-y-3">
            {/* Mass-spring viz */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={massCanvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* 3 motion graphs */}
            <MotionGraphs history={historyRef.current} A={A} omega={omega} mass={mass} />

            {/* Phase plot + Energy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PhasePlot history={historyRef.current} A={A} omega={omega} />
              <EnergyPlot history={historyRef.current} totalE={totalE} />
            </div>

            {/* Theory */}
            <div className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-4">
              <h3 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">📐 Phương trình SHM</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    x(t) = A·cos(ωt + φ)<br />
                    v(t) = −Aω·sin(ωt + φ)<br />
                    a(t) = −Aω²·cos(ωt + φ) = −ω²·x
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">⚡ Bảo toàn năng lượng</h4>
                  <p className="text-white/55 leading-relaxed">
                    E = KE + PE = ½kA² = const (khi b=0).<br />
                    Khi b &gt; 0: E giảm theo e<sup>-2bt</sup>, năng lượng chuyển thành nhiệt.
                    Phase plot là elip (x vs v) thu nhỏ dần thành xoắn ốc về tâm.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function MotionGraphs({ history, A, omega, mass: _mass }: {
  history: HistorySample[]; A: number; omega: number; mass: number
}) {
  if (history.length < 2) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-8 text-center text-white/40 text-xs italic">
        Chưa có dữ liệu — bấm Chạy để vẽ đồ thị
      </div>
    )
  }
  const SUB_W = 700, SUB_H = 130, P = 30
  const ts = history.map((h) => h.t)
  const tMin = ts[0], tMax = ts[ts.length - 1]
  const tRange = Math.max(tMax - tMin, 0.001)
  const xScale = (t: number) => P + ((t - tMin) / tRange) * (SUB_W - 2 * P)
  const vMax = A * omega
  const aMax = A * omega * omega

  const renderChart = (title: string, color: string, key: 'x' | 'v' | 'a', max: number, unit: string) => {
    const yScale = (val: number) => SUB_H / 2 - (val / max) * (SUB_H - 2 * P) / 2
    const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xScale(h.t)},${yScale(h[key])}`).join(' ')
    const last = history[history.length - 1]
    return (
      <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-2.5">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[11px] font-bold text-white/80 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {title}
          </h4>
          <span className="text-[11px] font-mono" style={{ color }}>
            {last[key].toFixed(2)} {unit}
          </span>
        </div>
        <svg viewBox={`0 0 ${SUB_W} ${SUB_H}`} className="w-full h-auto" style={{ maxHeight: 120 }}>
          {/* Zero line */}
          <line x1={P} y1={SUB_H / 2} x2={SUB_W - P} y2={SUB_H / 2}
            stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" strokeWidth="0.8" />
          {/* Curve */}
          <path d={path} fill="none" stroke={color} strokeWidth="1.8" />
          {/* Current dot */}
          <circle cx={xScale(last.t)} cy={yScale(last[key])} r="3" fill={color} />
          {/* Labels */}
          <text x={P - 4} y={P + 6} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">
            +{max.toFixed(1)}
          </text>
          <text x={P - 4} y={SUB_H / 2 + 3} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">0</text>
          <text x={P - 4} y={SUB_H - P + 5} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">
            -{max.toFixed(1)}
          </text>
          <text x={P} y={SUB_H - 4} fontSize="9" fill="rgba(148,163,184,0.5)" fontFamily="monospace">
            {tMin.toFixed(1)}s
          </text>
          <text x={SUB_W - P} y={SUB_H - 4} fontSize="9" fill="rgba(148,163,184,0.5)" textAnchor="end" fontFamily="monospace">
            {tMax.toFixed(1)}s
          </text>
        </svg>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {renderChart('Vị trí x(t)',  '#a78bfa', 'x', A * 1.1, 'm')}
      {renderChart('Vận tốc v(t)', '#22d3ee', 'v', vMax * 1.1, 'm/s')}
      {renderChart('Gia tốc a(t)', '#fbbf24', 'a', aMax * 1.1, 'm/s²')}
    </div>
  )
}

function PhasePlot({ history, A, omega }: {
  history: HistorySample[]; A: number; omega: number
}) {
  const W = 240, H = 240, P = 20
  const vMax = A * omega
  if (history.length < 2) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 flex items-center justify-center text-white/40 text-xs italic" style={{ minHeight: 240 }}>
        Phase plot (x vs v)
      </div>
    )
  }
  const xMap = (x: number) => W / 2 + (x / (A * 1.1)) * (W / 2 - P)
  const yMap = (v: number) => H / 2 - (v / (vMax * 1.1)) * (H / 2 - P)
  const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xMap(h.x)},${yMap(h.v)}`).join(' ')
  const last = history[history.length - 1]

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
      <h4 className="text-xs font-bold text-white/80 mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400" />
        Không gian pha (x vs v)
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxWidth: 260 }}>
        {/* Axes */}
        <line x1={P} y1={H/2} x2={W-P} y2={H/2} stroke="rgba(148,163,184,0.25)" />
        <line x1={W/2} y1={P} x2={W/2} y2={H-P} stroke="rgba(148,163,184,0.25)" />
        {/* Theoretical ellipse */}
        <ellipse cx={W/2} cy={H/2} rx={(W/2-P)*A/(A*1.1)} ry={(H/2-P)*vMax/(vMax*1.1)}
          fill="none" stroke="rgba(168,139,250,0.2)" strokeDasharray="3 3" />
        {/* Actual trail */}
        <path d={path} fill="none" stroke="#a78bfa" strokeWidth="1.5" />
        {/* Current dot */}
        <circle cx={xMap(last.x)} cy={yMap(last.v)} r="4" fill="#a78bfa" />
        {/* Labels */}
        <text x={W-P+4} y={H/2+3} fontSize="9" fill="rgba(148,163,184,0.7)">x</text>
        <text x={W/2+4} y={P-4} fontSize="9" fill="rgba(148,163,184,0.7)">v</text>
      </svg>
    </div>
  )
}

function EnergyPlot({ history, totalE }: {
  history: HistorySample[]; totalE: number
}) {
  const W = 240, H = 240, P = 30
  if (history.length < 2) {
    return (
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 flex items-center justify-center text-white/40 text-xs italic" style={{ minHeight: 240 }}>
        Energy plot (KE + PE)
      </div>
    )
  }
  const ts = history.map((h) => h.t)
  const tMin = ts[0], tMax = ts[ts.length - 1]
  const tRange = Math.max(tMax - tMin, 0.001)
  const eMax = Math.max(totalE * 1.1, 0.001)
  const xMap = (t: number) => P + ((t - tMin) / tRange) * (W - 2 * P)
  const yMap = (e: number) => H - P - (e / eMax) * (H - 2 * P)

  const kePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xMap(h.t)},${yMap(h.ke)}`).join(' ')
  const pePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xMap(h.t)},${yMap(h.pe)}`).join(' ')
  const totPath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xMap(h.t)},${yMap(h.ke + h.pe)}`).join(' ')

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
      <h4 className="text-xs font-bold text-white/80 mb-2 flex items-center gap-3">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" />KE</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />PE</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Tổng</span>
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxWidth: 260 }}>
        <line x1={P} y1={H-P} x2={W-P} y2={H-P} stroke="rgba(148,163,184,0.25)" />
        <path d={kePath} fill="none" stroke="#22d3ee" strokeWidth="1.5" />
        <path d={pePath} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
        <path d={totPath} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={P-4} y={P+5} fontSize="9" fill="rgba(148,163,184,0.6)" textAnchor="end" fontFamily="monospace">
          {eMax.toFixed(2)}J
        </text>
        <text x={P-4} y={H-P+3} fontSize="9" fill="rgba(148,163,184,0.6)" textAnchor="end" fontFamily="monospace">0</text>
      </svg>
    </div>
  )
}

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-violet-300">{value.toFixed(2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500" />
    </div>
  )
}

function Row({ label, value, formula }: { label: string; value: string; formula: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div>
        <div className="text-white/75 font-bold">{label}</div>
        <div className="text-[10px] text-white/40 font-mono">{formula}</div>
      </div>
      <div className="font-mono font-bold text-violet-300">{value}</div>
    </div>
  )
}
