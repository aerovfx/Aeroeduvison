/**
 * Dao động điều hòa — Con lắc lò xo
 * Physics: x(t) = A·cos(ωt + φ),  ω = √(k/m)
 * Energy : KE = ½mv²,  PE = ½kx²
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, RotateCcw, ChevronLeft, Zap, Activity } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhysicsParams {
  mass: number        // kg
  springK: number     // N/m
  amplitude: number   // m
  damping: number     // b (Ns/m)
}

interface SimState {
  t: number
  x: number           // displacement
  v: number           // velocity
  running: boolean
}

// ─── Spring viz canvas (LEFT, square) ────────────────────────────
// User: "đồ thị và con lắc có kích thước hợp lí"
// Tách spring + chart → 2 element riêng để có không gian rộng rãi
function drawSpring(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  x: number,
  params: PhysicsParams,
) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'hsl(260,25%,9%)'
  ctx.fillRect(0, 0, W, H)

  const midX = W * 0.5
  const midY = H * 0.50
  // Scale dùng max(amplitude+10%) để spring không bao giờ "out of bound"
  const scale = (H * 0.38) / Math.max(params.amplitude * 1.1, 0.05)
  const springTop = H * 0.08
  const blockSize = 56  // Bigger block — easier to see mass

  // ── Ceiling ──
  ctx.fillStyle = '#475569'
  ctx.fillRect(midX - 60, springTop - 12, 120, 12)
  // Ceiling hatching
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.5
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath()
    ctx.moveTo(midX + i * 14 - 56, springTop - 12)
    ctx.lineTo(midX + i * 14 - 36, springTop - 30)
    ctx.stroke()
  }

  // ── Spring ──
  const blockY = midY + x * scale
  const springLen = Math.max(blockY - springTop, 30)
  const coils = 14
  const coilW = 22  // wider coil for visibility
  ctx.beginPath()
  ctx.strokeStyle = '#a78bfa'
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.moveTo(midX, springTop)
  for (let i = 0; i <= coils * 4; i++) {
    const t = i / (coils * 4)
    const sy = springTop + t * springLen
    const sx = midX + (i % 4 < 2 ? 1 : -1) * coilW * Math.sin(i * Math.PI / 2)
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
  }
  ctx.lineTo(midX, blockY)
  ctx.stroke()
  ctx.lineCap = 'butt'

  // ── Equilibrium line ──
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(midX - 90, midY)
  ctx.lineTo(midX + 110, midY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 13px monospace'
  ctx.fillText('x = 0', midX + 95, midY + 5)

  // ── Displacement vector ──
  if (Math.abs(x) > 0.005) {
    const arrowColor = x > 0 ? '#f97316' : '#22d3ee'
    ctx.strokeStyle = arrowColor
    ctx.fillStyle = arrowColor
    ctx.lineWidth = 2.5
    const arrowX = midX + blockSize / 2 + 28
    ctx.beginPath()
    ctx.moveTo(arrowX, midY)
    ctx.lineTo(arrowX, blockY)
    ctx.stroke()
    const arrowYTip = blockY
    const arrowYBase = blockY + (x > 0 ? -10 : 10)
    ctx.beginPath()
    ctx.moveTo(arrowX, arrowYTip)
    ctx.lineTo(arrowX - 6, arrowYBase)
    ctx.lineTo(arrowX + 6, arrowYBase)
    ctx.closePath()
    ctx.fill()
    ctx.font = 'bold 14px monospace'
    ctx.fillText(`x=${x >= 0 ? '+' : ''}${x.toFixed(3)}m`, arrowX + 10, (midY + blockY) / 2 + 4)
  }

  // ── Block (mass) — bigger, more visible ──
  const grd = ctx.createLinearGradient(midX - blockSize / 2, blockY - blockSize / 2, midX + blockSize / 2, blockY + blockSize / 2)
  grd.addColorStop(0, '#a855f7')
  grd.addColorStop(1, '#6d28d9')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.roundRect(midX - blockSize / 2, blockY - blockSize / 2, blockSize, blockSize, 8)
  ctx.fill()
  ctx.strokeStyle = '#c4b5fd'
  ctx.lineWidth = 2.5
  ctx.stroke()
  // Glow shadow effect via second draw
  ctx.shadowColor = 'rgba(168,139,250,0.4)'
  ctx.shadowBlur = 12
  ctx.fillStyle = '#f3e8ff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${params.mass}kg`, midX, blockY)
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

// ─── Energy chart (React SVG component) ──────────────────────────
function EnergyChart({ history, maxE }: {
  history: Array<{ x: number; ke: number; pe: number }>
  maxE: number
}) {
  const W = 500, H = 280, P = 36
  const N = history.length
  const yScale = (v: number) => H - P - (v / Math.max(maxE * 1.05, 0.001)) * (H - 2 * P)
  const xScale = (i: number) => P + (i / Math.max(N - 1, 1)) * (W - 2 * P)

  const kePath = history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(p.ke)}`).join(' ')
  const pePath = history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)},${yScale(p.pe)}`).join(' ')
  const totalY = yScale(maxE)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* BG */}
      <rect x="0" y="0" width={W} height={H} fill="rgba(15,23,42,0.6)" rx="8" />
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={P} y1={P + (H - 2 * P) * t} x2={W - P} y2={P + (H - 2 * P) * t}
          stroke="rgba(148,163,184,0.1)" strokeWidth="0.5" />
      ))}
      {/* Y-axis labels */}
      {[1, 0.5, 0].map((t) => (
        <text key={t} x={P - 6} y={P + (1 - t) * (H - 2 * P) + 4} fontSize="10" fill="rgba(148,163,184,0.6)" textAnchor="end" fontFamily="monospace">
          {(maxE * t).toFixed(3)} J
        </text>
      ))}
      {/* Total E line (constant if no damping) */}
      <line x1={P} y1={totalY} x2={W - P} y2={totalY}
        stroke="#22c55e" strokeWidth="1.5" strokeDasharray="6 4" />
      {/* KE */}
      {N > 1 && <path d={kePath} fill="none" stroke="#a78bfa" strokeWidth="2.2" />}
      {/* PE */}
      {N > 1 && <path d={pePath} fill="none" stroke="#f97316" strokeWidth="2.2" />}
      {/* Title */}
      <text x={P} y={20} fontSize="13" fontWeight="bold" fill="#cbd5e1" fontFamily="sans-serif">
        Năng lượng theo thời gian
      </text>
      {/* Legend */}
      <g transform={`translate(${W - 200}, 12)`}>
        <line x1="0" y1="6" x2="14" y2="6" stroke="#a78bfa" strokeWidth="2.5" />
        <text x="18" y="9" fontSize="10" fill="#cbd5e1">KE</text>
        <line x1="40" y1="6" x2="54" y2="6" stroke="#f97316" strokeWidth="2.5" />
        <text x="58" y="9" fontSize="10" fill="#cbd5e1">PE</text>
        <line x1="80" y1="6" x2="94" y2="6" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x="98" y="9" fontSize="10" fill="#cbd5e1">E tổng</text>
      </g>
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SpringPendulumLab() {
  const [params, setParams] = useState<PhysicsParams>({ mass: 1.0, springK: 10, amplitude: 0.3, damping: 0.1 })
  const [running, setRunning] = useState(true)
  const [simTime, setSimTime] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const stateRef  = useRef<SimState>({ t: 0, x: params.amplitude, v: 0, running: true })
  const historyRef = useRef<{ x: number; ke: number; pe: number }[]>([])
  const paramsRef = useRef(params)
  paramsRef.current = params

  const reset = useCallback(() => {
    stateRef.current = { t: 0, x: paramsRef.current.amplitude, v: 0, running: running }
    historyRef.current = []
    setSimTime(0)
  }, [running])

  useEffect(() => { reset() }, [params.amplitude, params.mass, params.springK])

  useEffect(() => {
    stateRef.current.running = running
  }, [running])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = 0
    const DT = 0.016   // fixed physics step (60 fps)
    const MAX_HISTORY = 200

    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop)
      const elapsed = (now - lastTime) / 1000
      lastTime = now

      const s = stateRef.current
      const p = paramsRef.current

      if (s.running) {
        const dt = Math.min(elapsed, 0.05) // clamp for tab-switch lag
        const ω2 = p.springK / p.mass
        const b  = p.damping / p.mass
        // Verlet integration
        const ax = -ω2 * s.x - b * s.v
        s.v += ax * dt
        s.x += s.v * dt
        s.t += dt

        const ke = 0.5 * p.mass * s.v ** 2
        const pe = 0.5 * p.springK * s.x ** 2
        historyRef.current.push({ x: s.x, ke, pe })
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift()

        setSimTime(s.t)
      }

      const W = canvas.width
      const H = canvas.height
      drawSpring(ctx, W, H, s.x, p)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const ω = Math.sqrt(params.springK / params.mass)
  const T = (2 * Math.PI / ω).toFixed(3)

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <Link to="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-3 text-sm font-medium transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Activity className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Dao động điều hòa — Con lắc lò xo</h1>
              <p className="text-white/50 text-sm">Cơ học · Nâng cao · 30 phút · +180 XP</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Spring viz (LEFT — vuông, không chiếm chỗ chart) */}
          <div className="lg:col-span-2 bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 overflow-hidden flex flex-col">
            <canvas
              ref={canvasRef}
              width={440}
              height={520}
              className="w-full"
              style={{ background: 'hsl(260,25%,9%)', aspectRatio: '440/520' }}
            />
            {/* Controls bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5 flex-wrap">
              <button
                onClick={() => setRunning(r => !r)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-sm transition-colors"
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'Dừng' : 'Chạy'}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <div className="ml-auto flex gap-3 text-xs font-mono text-white/60">
                <span>t={simTime.toFixed(1)}s</span>
                <span>T={T}s</span>
              </div>
            </div>
          </div>

          {/* Energy chart (CENTER — SVG riêng, kích thước hợp lí) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <EnergyChart
                history={historyRef.current}
                maxE={0.5 * params.springK * params.amplitude ** 2}
              />
            </div>
            {/* Live readouts grid */}
            <div className="grid grid-cols-2 gap-2">
              {(() => {
                const last = historyRef.current[historyRef.current.length - 1]
                const ke = last?.ke ?? 0
                const pe = last?.pe ?? 0
                const total = ke + pe
                const xVal = last?.x ?? params.amplitude
                return ([
                  { label: 'KE', value: `${ke.toFixed(4)} J`,    color: 'text-purple-300', bg: 'bg-purple-500/[0.08]' },
                  { label: 'PE', value: `${pe.toFixed(4)} J`,    color: 'text-orange-300', bg: 'bg-orange-500/[0.08]' },
                  { label: 'E tổng',  value: `${total.toFixed(4)} J`, color: 'text-emerald-300', bg: 'bg-emerald-500/[0.08]' },
                  { label: 'x',  value: `${xVal.toFixed(4)} m`,  color: 'text-cyan-300', bg: 'bg-cyan-500/[0.08]' },
                ] as const).map((r) => (
                  <div key={r.label} className={`rounded-lg ${r.bg} border border-white/[0.06] p-3`}>
                    <div className="text-[10px] uppercase tracking-wide text-white/45 font-bold">{r.label}</div>
                    <div className={`text-base font-bold font-mono mt-1 ${r.color}`}>{r.value}</div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Parameter panel */}
          <div className="space-y-4">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" /> Thông số
              </h3>
              {[
                { label: 'Khối lượng m', key: 'mass',      min: 0.1, max: 5,   step: 0.1,  unit: 'kg',  val: params.mass },
                { label: 'Độ cứng lò xo k', key: 'springK', min: 1,   max: 50,  step: 0.5,  unit: 'N/m', val: params.springK },
                { label: 'Biên độ A', key: 'amplitude',  min: 0.05, max: 0.5, step: 0.01, unit: 'm',   val: params.amplitude },
                { label: 'Hệ số tắt dần b', key: 'damping',   min: 0,   max: 2,   step: 0.02, unit: 'Ns/m',val: params.damping },
              ].map(({ label, key, min, max, step, unit, val }) => (
                <div key={key} className="mb-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-purple-300">{val} {unit}</span>
                  </div>
                  <input
                    type="range" min={min} max={max} step={step} value={val}
                    onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
                    className="w-full accent-purple-500"
                  />
                </div>
              ))}
            </div>

            {/* Formulas */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3">📐 Công thức</h3>
              <div className="space-y-2 text-xs font-mono">
                {[
                  ['x(t)', `${params.amplitude.toFixed(2)}·cos(${ω.toFixed(2)}t)`],
                  ['ω', `√(k/m) = √(${params.springK}/${params.mass}) = ${ω.toFixed(3)} rad/s`],
                  ['T', `2π/ω = ${T} s`],
                  ['E_max', `½kA² = ${(0.5 * params.springK * params.amplitude ** 2).toFixed(4)} J`],
                ].map(([sym, val]) => (
                  <div key={sym} className="bg-white/5 rounded-lg p-2">
                    <span className="text-purple-400">{sym} = </span>
                    <span className="text-white/80">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Learning objectives */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3">🎯 Mục tiêu học tập</h3>
              <ul className="space-y-2 text-xs text-white/70">
                {['Hiểu phương trình dao động điều hòa', 'Phân tích sự chuyển hóa năng lượng KE↔PE', 'Ảnh hưởng của m, k đến chu kỳ T', 'Dao động tắt dần khi có ma sát'].map(o => (
                  <li key={o} className="flex items-start gap-2"><span className="text-purple-400 mt-0.5">▸</span>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
