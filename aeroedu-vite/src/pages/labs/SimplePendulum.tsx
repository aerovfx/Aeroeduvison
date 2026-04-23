/**
 * Con lắc đơn — Simple Pendulum
 * Physics: θ'' = -(g/L)·sin(θ) - (b/m)·θ'   (RK4 integration)
 * Period (small angle): T = 2π·√(L/g)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, RotateCcw, ChevronLeft, Target, Zap } from 'lucide-react'

interface Params {
  length: number    // m
  gravity: number   // m/s²
  theta0: number    // initial angle, deg
  damping: number   // b/m
}

interface State {
  theta: number  // rad
  omega: number  // rad/s  (dθ/dt)
  t: number
}

/** RK4 step for pendulum ODE */
function rk4(s: State, p: Params, dt: number): State {
  const f = (theta: number, omega: number) => ({
    dTheta: omega,
    dOmega: -(p.gravity / p.length) * Math.sin(theta) - p.damping * omega,
  })

  const k1 = f(s.theta, s.omega)
  const k2 = f(s.theta + 0.5 * dt * k1.dTheta, s.omega + 0.5 * dt * k1.dOmega)
  const k3 = f(s.theta + 0.5 * dt * k2.dTheta, s.omega + 0.5 * dt * k2.dOmega)
  const k4 = f(s.theta + dt * k3.dTheta, s.omega + dt * k3.dOmega)

  return {
    theta: s.theta + (dt / 6) * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta),
    omega: s.omega + (dt / 6) * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega),
    t: s.t + dt,
  }
}

function draw(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  theta: number,
  params: Params,
  trail: { x: number; y: number }[],
  thetaHistory: number[],
) {
  ctx.clearRect(0, 0, W, H)

  const pivotX = W * 0.38
  const pivotY = H * 0.12
  const rodLen = Math.min(H * 0.55, params.length * 160)
  const bobX = pivotX + rodLen * Math.sin(theta)
  const bobY = pivotY + rodLen * Math.cos(theta)
  const bobR = 18

  // ── Trail ──
  if (trail.length > 1) {
    ctx.beginPath()
    trail.forEach((p, i) => {
      const alpha = i / trail.length
      ctx.strokeStyle = `hsla(280,70%,65%,${alpha * 0.6})`
      ctx.lineWidth = 2
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  }

  // ── Ceiling mount ──
  ctx.fillStyle = '#4b5563'
  ctx.fillRect(pivotX - 40, pivotY - 10, 80, 10)
  ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(pivotX + i * 14 - 28, pivotY - 10)
    ctx.lineTo(pivotX + i * 14 - 14, pivotY - 22); ctx.stroke()
  }

  // ── Pivot dot ──
  ctx.beginPath()
  ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#9ca3af'; ctx.fill()

  // ── Rod ──
  ctx.beginPath()
  ctx.moveTo(pivotX, pivotY)
  ctx.lineTo(bobX, bobY)
  ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.stroke()

  // ── Angle arc ──
  if (Math.abs(theta) > 0.05) {
    ctx.beginPath()
    ctx.arc(pivotX, pivotY, 40, Math.PI / 2 - 0.05, Math.PI / 2 + theta, theta < 0)
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#fbbf24'; ctx.font = '11px monospace'
    ctx.fillText(`θ=${(theta * 180 / Math.PI).toFixed(1)}°`, pivotX + 44, pivotY + 14)
  }

  // ── Vertical reference ──
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(pivotX, pivotY); ctx.lineTo(pivotX, pivotY + rodLen + 10); ctx.stroke()
  ctx.setLineDash([])

  // ── Bob ──
  const bobGrd = ctx.createRadialGradient(bobX - 5, bobY - 5, 2, bobX, bobY, bobR)
  bobGrd.addColorStop(0, '#818cf8')
  bobGrd.addColorStop(1, '#312e81')
  ctx.beginPath(); ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2)
  ctx.fillStyle = bobGrd; ctx.fill()
  ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 2; ctx.stroke()

  // ── θ-t graph (right panel) ──
  const gX = W * 0.57; const gY = H * 0.07
  const gW = W * 0.38; const gH = H * 0.58
  const N  = thetaHistory.length

  ctx.fillStyle = 'rgba(17,24,39,0.75)'
  ctx.beginPath(); ctx.roundRect(gX, gY, gW, gH, 8); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()

  ctx.fillStyle = '#9ca3af'; ctx.font = '12px sans-serif'
  ctx.fillText('Góc θ theo thời gian', gX + 8, gY + 18)

  const innerY = gY + 30; const innerH = gH - 40
  const maxTheta = Math.max(Math.abs(params.theta0 * Math.PI / 180) * 1.1, 0.1)

  // Axes
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
  const midLineY = innerY + innerH / 2
  ctx.beginPath(); ctx.moveTo(gX + 4, midLineY); ctx.lineTo(gX + gW - 4, midLineY); ctx.stroke()
  // Labels
  ctx.fillStyle = '#6b7280'; ctx.font = '10px monospace'
  ctx.fillText(`+${(maxTheta * 180 / Math.PI).toFixed(0)}°`, gX + 5, innerY + 10)
  ctx.fillText('0°', gX + 5, midLineY + 4)
  ctx.fillText(`-${(maxTheta * 180 / Math.PI).toFixed(0)}°`, gX + 5, innerY + innerH - 4)

  if (N > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2
    thetaHistory.forEach((th, i) => {
      const px = gX + 4 + (i / Math.max(N - 1, 1)) * (gW - 8)
      const py = midLineY - (th / maxTheta) * (innerH / 2 - 4)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
  }

  // ── Readouts ──
  const rX = gX; const rY = gY + gH + 10
  ctx.fillStyle = 'rgba(17,24,39,0.75)'
  ctx.beginPath(); ctx.roundRect(rX, rY, gW, 64, 8); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()

  const g = params.gravity; const L = params.length
  const T_small = 2 * Math.PI * Math.sqrt(L / g)
  const ke_val  = 0.5 * L * L * (0 /** omega not passed here */)
  const info = [
    { label: 'T (nhỏ)', val: `${T_small.toFixed(3)} s`, color: '#a78bfa' },
    { label: 'L', val: `${L.toFixed(2)} m`, color: '#67e8f9' },
    { label: 'g', val: `${g.toFixed(2)} m/s²`, color: '#4ade80' },
    { label: 'θ₀', val: `${params.theta0.toFixed(1)}°`, color: '#fbbf24' },
  ]
  info.forEach((r, i) => {
    const col = i % 2; const row = Math.floor(i / 2)
    const tx = rX + 8 + col * (gW / 2); const ty = rY + 18 + row * 20
    ctx.fillStyle = r.color; ctx.font = 'bold 11px monospace'; ctx.fillText(`${r.label}: `, tx, ty)
    ctx.fillStyle = '#e5e7eb'; ctx.font = '11px monospace'; ctx.fillText(r.val, tx + 50, ty)
  })
}

export default function SimplePendulumLab() {
  const [params, setParams] = useState<Params>({ length: 1.0, gravity: 9.81, theta0: 30, damping: 0.05 })
  const [running, setRunning] = useState(true)
  const [simTime, setSimTime] = useState(0)

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const animRef      = useRef<number>(0)
  const stateRef     = useRef<State>({ theta: params.theta0 * Math.PI / 180, omega: 0, t: 0 })
  const trailRef     = useRef<{ x: number; y: number }[]>([])
  const thetaHistRef = useRef<number[]>([])
  const runRef       = useRef(true)
  const paramsRef    = useRef(params)
  paramsRef.current  = params

  const reset = useCallback(() => {
    const p = paramsRef.current
    stateRef.current = { theta: p.theta0 * Math.PI / 180, omega: 0, t: 0 }
    trailRef.current = []; thetaHistRef.current = []; setSimTime(0)
  }, [])

  useEffect(() => { reset() }, [params.length, params.gravity, params.theta0])
  useEffect(() => { runRef.current = running }, [running])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const MAX = 300

    const loop = () => {
      animRef.current = requestAnimationFrame(loop)
      const s = stateRef.current; const p = paramsRef.current
      if (runRef.current) {
        const next = rk4(s, p, 0.016)
        Object.assign(s, next)
        const pivotX = canvas.width * 0.38
        const pivotY = canvas.height * 0.12
        const rodLen = Math.min(canvas.height * 0.55, p.length * 160)
        trailRef.current.push({ x: pivotX + rodLen * Math.sin(s.theta), y: pivotY + rodLen * Math.cos(s.theta) })
        if (trailRef.current.length > 80) trailRef.current.shift()
        thetaHistRef.current.push(s.theta)
        if (thetaHistRef.current.length > MAX) thetaHistRef.current.shift()
        setSimTime(s.t)
      }
      draw(ctx, canvas.width, canvas.height, s.theta, p, trailRef.current, thetaHistRef.current)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const T = (2 * Math.PI * Math.sqrt(params.length / params.gravity)).toFixed(3)

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="mb-6">
          <Link to="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-3 text-sm font-medium transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl">
              <Target className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Con lắc đơn — Simple Pendulum</h1>
              <p className="text-white/50 text-sm">Sóng & Dao động · Trung bình · 30 phút · +150 XP</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-[hsl(260,25%,11%)] rounded-2xl border border-indigo-500/20 overflow-hidden">
            <canvas ref={canvasRef} width={780} height={460} className="w-full" style={{ background: 'hsl(260,25%,9%)' }} />
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
              <button onClick={() => setRunning(r => !r)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold text-sm transition-colors">
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'Dừng' : 'Chạy'}
              </button>
              <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <div className="ml-auto flex gap-4 text-sm font-mono text-white/60">
                <span>t = {simTime.toFixed(2)}s</span>
                <span>T ≈ {T}s</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-indigo-500/20 p-4">
              <h3 className="text-sm font-bold text-indigo-300 mb-4 flex items-center gap-2">
                <Zap className="h-4 w-4" /> Thông số
              </h3>
              {[
                { label: 'Chiều dài L', key: 'length',  min: 0.2, max: 3,    step: 0.05, unit: 'm',   val: params.length },
                { label: 'Trọng lực g', key: 'gravity', min: 1.6, max: 25,   step: 0.1,  unit: 'm/s²',val: params.gravity },
                { label: 'Góc ban đầu θ₀', key: 'theta0',  min: 5,   max: 170,  step: 1,    unit: '°',   val: params.theta0 },
                { label: 'Hệ số tắt dần', key: 'damping', min: 0,   max: 1,    step: 0.01, unit: '',     val: params.damping },
              ].map(({ label, key, min, max, step, unit, val }) => (
                <div key={key} className="mb-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-indigo-300">{val} {unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
                    className="w-full accent-indigo-500" />
                </div>
              ))}
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-indigo-500/20 p-4">
              <h3 className="text-sm font-bold text-indigo-300 mb-3">📐 Công thức</h3>
              <div className="space-y-2 text-xs font-mono">
                {[
                  ['T', `2π·√(L/g) = ${T} s`],
                  ['θ(t)', `θ₀·cos(ωt) (góc nhỏ)`],
                  ['ω', `√(g/L) = ${Math.sqrt(params.gravity / params.length).toFixed(3)} rad/s`],
                  ['E_max', `mgL(1-cos θ₀) = ${(params.gravity * params.length * (1 - Math.cos(params.theta0 * Math.PI / 180))).toFixed(4)} J`],
                ].map(([sym, val]) => (
                  <div key={sym} className="bg-white/5 rounded-lg p-2">
                    <span className="text-indigo-400">{sym} = </span>
                    <span className="text-white/80">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-indigo-500/20 p-4">
              <h3 className="text-sm font-bold text-indigo-300 mb-3">🌍 Trọng lực trên các hành tinh</h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {[['Trái Đất', 9.81], ['Mặt Trăng', 1.62], ['Sao Hoả', 3.72], ['Mộc Tinh', 24.79]].map(([name, g]) => (
                  <button key={name as string} onClick={() => setParams(p => ({ ...p, gravity: g as number }))}
                    className={`px-2 py-1.5 rounded-lg text-left transition-colors ${params.gravity === g ? 'bg-indigo-600 text-white' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
                    {name as string} ({g} m/s²)
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
