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

// ─── Canvas renderer ──────────────────────────────────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  x: number,
  params: PhysicsParams,
  history: { x: number; ke: number; pe: number }[],
) {
  ctx.clearRect(0, 0, W, H)

  const midX = W * 0.38
  const midY = H * 0.40
  const scale = (H * 0.28) / Math.max(params.amplitude, 0.01)
  const springTop = H * 0.05
  const blockSize = 36

  // ── Ceiling ──
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(midX - 40, springTop - 8, 80, 8)
  // Ceiling hatching
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath()
    ctx.moveTo(midX + i * 12 - 36, springTop - 8)
    ctx.lineTo(midX + i * 12 - 20, springTop - 20)
    ctx.stroke()
  }

  // ── Spring ──
  const blockY = midY + x * scale
  const springLen = blockY - springTop
  const coils = 12
  const coilW = 16
  ctx.beginPath()
  ctx.strokeStyle = '#8b5cf6'
  ctx.lineWidth = 2.5
  ctx.moveTo(midX, springTop)
  for (let i = 0; i <= coils * 4; i++) {
    const t = i / (coils * 4)
    const sy = springTop + t * springLen
    const sx = midX + (i % 4 < 2 ? 1 : -1) * coilW * Math.sin(i * Math.PI / 2)
    i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
  }
  ctx.lineTo(midX, blockY)
  ctx.stroke()

  // ── Equilibrium line ──
  ctx.setLineDash([5, 5])
  ctx.strokeStyle = '#4b5563'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(midX - 60, midY)
  ctx.lineTo(midX + 80, midY)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px monospace'
  ctx.fillText('x = 0', midX + 65, midY + 4)

  // ── Displacement arrow ──
  if (Math.abs(x) > 0.005) {
    ctx.strokeStyle = x > 0 ? '#f97316' : '#22d3ee'
    ctx.fillStyle   = x > 0 ? '#f97316' : '#22d3ee'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(midX + 55, midY)
    ctx.lineTo(midX + 55, blockY)
    ctx.stroke()
    const arrowY = blockY + (x > 0 ? -6 : 6)
    ctx.beginPath()
    ctx.moveTo(midX + 55, blockY)
    ctx.lineTo(midX + 50, arrowY)
    ctx.lineTo(midX + 60, arrowY)
    ctx.closePath()
    ctx.fill()
    ctx.font = '11px monospace'
    ctx.fillText(`x=${x >= 0 ? '+' : ''}${x.toFixed(3)}m`, midX + 62, (midY + blockY) / 2 + 4)
  }

  // ── Block (mass) ──
  const grd = ctx.createLinearGradient(midX - blockSize / 2, blockY - blockSize / 2, midX + blockSize / 2, blockY + blockSize / 2)
  grd.addColorStop(0, '#7c3aed')
  grd.addColorStop(1, '#4c1d95')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.roundRect(midX - blockSize / 2, blockY - blockSize / 2, blockSize, blockSize, 6)
  ctx.fill()
  ctx.strokeStyle = '#a78bfa'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#e9d5ff'
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${params.mass}kg`, midX, blockY + 4)
  ctx.textAlign = 'left'

  // ── Energy graph (right side) ──
  const gX = W * 0.57
  const gY = H * 0.08
  const gW = W * 0.38
  const gH = H * 0.60
  const N = history.length

  ctx.fillStyle = 'rgba(17,24,39,0.7)'
  ctx.beginPath()
  ctx.roundRect(gX, gY, gW, gH, 8)
  ctx.fill()
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#9ca3af'
  ctx.font = '12px sans-serif'
  ctx.fillText('Năng lượng theo thời gian', gX + 8, gY + 18)
  ctx.font = '10px monospace'
  ctx.fillStyle = '#8b5cf6'; ctx.fillRect(gX + 8, gY + 28, 12, 3); ctx.fillStyle = '#d1d5db'; ctx.fillText('KE (động năng)', gX + 24, gY + 33)
  ctx.fillStyle = '#f97316'; ctx.fillRect(gX + 8, gY + 40, 12, 3); ctx.fillStyle = '#d1d5db'; ctx.fillText('PE (thế năng)', gX + 24, gY + 45)
  ctx.fillStyle = '#22c55e'; ctx.fillRect(gX + 8, gY + 52, 12, 3); ctx.fillStyle = '#d1d5db'; ctx.fillText('Tổng E', gX + 24, gY + 57)

  const maxE = 0.5 * params.springK * params.amplitude ** 2
  const innerY = gY + 70; const innerH = gH - 80

  // Axes
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(gX + 4, innerY); ctx.lineTo(gX + gW - 4, innerY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(gX + 4, innerY); ctx.lineTo(gX + 4, innerY - innerH + 4); ctx.stroke()

  const toGY = (v: number) => innerY - (v / (maxE * 1.1)) * (innerH - 8)
  const toGX = (i: number) => gX + 4 + (i / Math.max(N - 1, 1)) * (gW - 8)

  if (N > 1) {
    ;[
      { key: 'ke' as const, color: '#8b5cf6' },
      { key: 'pe' as const, color: '#f97316' },
    ].forEach(({ key, color }) => {
      ctx.beginPath()
      ctx.strokeStyle = color; ctx.lineWidth = 2
      history.forEach((p, i) => {
        const px = toGX(i); const py = toGY(p[key])
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      })
      ctx.stroke()
    })
    // Total energy line
    const totalE = maxE
    const ey = toGY(totalE)
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(gX + 4, ey); ctx.lineTo(gX + gW - 4, ey); ctx.stroke()
    ctx.setLineDash([])
  }

  // ── Phase indicator dots ──
  const last = history[history.length - 1]
  if (last && N > 1) {
    const dotX = toGX(N - 1)
    ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(dotX, toGY(last.ke), 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(dotX, toGY(last.pe), 4, 0, Math.PI * 2); ctx.fill()
  }

  // ── Live readouts ──
  const rx = gX
  const ry = gY + gH + 10
  ctx.fillStyle = 'rgba(17,24,39,0.7)'
  ctx.beginPath(); ctx.roundRect(rx, ry, gW, 58, 8); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()

  const ke = last?.ke ?? 0
  const pe = last?.pe ?? 0
  const total = ke + pe
  const readouts = [
    { label: 'KE', value: `${ke.toFixed(4)} J`, color: '#a78bfa' },
    { label: 'PE', value: `${pe.toFixed(4)} J`, color: '#fb923c' },
    { label: 'E tot', value: `${total.toFixed(4)} J`, color: '#4ade80' },
    { label: 'x', value: `${x.toFixed(4)} m`, color: '#67e8f9' },
  ]
  readouts.forEach((r, i) => {
    const col = i < 2 ? 0 : 1
    const row = i % 2
    const tx = rx + 10 + col * (gW / 2)
    const ty = ry + 18 + row * 18
    ctx.fillStyle = r.color; ctx.font = 'bold 11px monospace'; ctx.fillText(`${r.label}: `, tx, ty)
    ctx.fillStyle = '#e5e7eb'; ctx.font = '11px monospace'; ctx.fillText(r.value, tx + 40, ty)
  })
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
      drawFrame(ctx, W, H, s.x, p, historyRef.current)
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Canvas */}
          <div className="lg:col-span-3 bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={780}
              height={460}
              className="w-full"
              style={{ background: 'hsl(260,25%,9%)' }}
            />
            {/* Controls bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
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
              <div className="ml-auto flex gap-4 text-sm font-mono text-white/60">
                <span>t = {simTime.toFixed(2)}s</span>
                <span>T = {T}s</span>
                <span>ω = {ω.toFixed(2)} rad/s</span>
              </div>
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
