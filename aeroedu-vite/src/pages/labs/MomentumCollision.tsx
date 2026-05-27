/**
 * MomentumCollision — Mô phỏng va chạm và bảo toàn động lượng
 *
 * Route: /dashboard/labtwin/momentum-collision
 * User: "fix các mô phỏng trong labtwin"
 *
 * 2 modes:
 *   - 1D: 2 vật trên ray ngang, có thể có e ∈ [0,1] (elastic/inelastic)
 *   - 2D: bi-a style, 2 vật bất kỳ vector v, va chạm pháp tuyến
 *
 * Hiển thị: vector p (trước/sau), tổng p, tổng KE, KE mất mát %
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Activity, Info, Target,
} from 'lucide-react'

interface Ball {
  x: number; y: number
  vx: number; vy: number
  m: number; r: number
  color: string
}

const CANVAS_W = 720
const CANVAS_H = 400

export default function MomentumCollision() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const runningRef = useRef(false)
  const eRef = useRef(1)

  const [mode, setMode] = useState<'1d' | '2d'>('1d')
  const [running, setRunning] = useState(false)
  const [restitution, setRestitution] = useState(1)
  const [m1, setM1] = useState(2)
  const [m2, setM2] = useState(1)
  const [v1, setV1] = useState(3)
  const [v2, setV2] = useState(-1)
  // 2D only
  const [angle, setAngle] = useState(20)  // angle of approach (deg)
  const [snapshot, setSnapshot] = useState({ pBefore: 0, keBefore: 0 })

  runningRef.current = running
  eRef.current = restitution

  // Reset balls
  const reset = () => {
    if (mode === '1d') {
      ballsRef.current = [
        { x: CANVAS_W * 0.25, y: CANVAS_H / 2, vx: v1 * 30, vy: 0, m: m1, r: 12 + m1 * 4, color: '#22d3ee' },
        { x: CANVAS_W * 0.75, y: CANVAS_H / 2, vx: v2 * 30, vy: 0, m: m2, r: 12 + m2 * 4, color: '#f97316' },
      ]
    } else {
      // 2D: ball 1 moves toward ball 2 at angle
      const rad = (angle * Math.PI) / 180
      ballsRef.current = [
        { x: 120, y: CANVAS_H / 2 + Math.sin(rad) * 50, vx: v1 * 30, vy: -Math.sin(rad) * v1 * 30, m: m1, r: 12 + m1 * 4, color: '#22d3ee' },
        { x: CANVAS_W - 200, y: CANVAS_H / 2, vx: 0, vy: 0, m: m2, r: 12 + m2 * 4, color: '#f97316' },
      ]
    }
    setRunning(false)
    const p = ballsRef.current.reduce((s, b) => s + b.m * b.vx, 0) / 30
    const ke = ballsRef.current.reduce((s, b) => s + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy) / 900, 0)
    setSnapshot({ pBefore: p, keBefore: ke })
  }

  useEffect(() => { reset() /* eslint-disable-next-line */ }, [mode, m1, m2, v1, v2, angle])

  // Render + physics
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now
      const balls = ballsRef.current

      if (runningRef.current) {
        // Update positions
        for (const b of balls) {
          b.x += b.vx * dt
          b.y += b.vy * dt
        }
        // Wall bounce (just for keeping balls in view)
        for (const b of balls) {
          if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) }
          if (b.x + b.r > CANVAS_W) { b.x = CANVAS_W - b.r; b.vx = -Math.abs(b.vx) }
          if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy) }
          if (b.y + b.r > CANVAS_H) { b.y = CANVAS_H - b.r; b.vy = -Math.abs(b.vy) }
        }
        // 2D collision
        if (balls.length === 2) {
          const a = balls[0], b = balls[1]
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < a.r + b.r && dist > 0.001) {
            // Normal vector
            const nx = dx / dist, ny = dy / dist
            // Resolve overlap
            const overlap = (a.r + b.r - dist) / 2
            a.x -= nx * overlap; a.y -= ny * overlap
            b.x += nx * overlap; b.y += ny * overlap
            // Relative velocity along normal
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy
            const vRel = dvx * nx + dvy * ny
            if (vRel > 0) {
              // 1D collision along normal (other components unchanged)
              const e = eRef.current
              const M = a.m + b.m
              const impulse = -(1 + e) * vRel / (1 / a.m + 1 / b.m)
              const J = impulse
              a.vx += (J / a.m) * nx
              a.vy += (J / a.m) * ny
              b.vx -= (J / b.m) * nx
              b.vy -= (J / b.m) * ny
              void M  // suppress unused
            }
          }
        }
      }

      // ─── Render ───
      // BG gradient
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#0f172a')
      grad.addColorStop(1, '#1e293b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x < CANVAS_W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke() }
      for (let y = 0; y < CANVAS_H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }
      // Center line for 1D mode
      if (mode === '1d') {
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2)
        ctx.stroke()
      }

      // Balls
      for (const b of balls) {
        // Glow
        ctx.shadowColor = b.color
        ctx.shadowBlur = 10
        ctx.fillStyle = b.color
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2); ctx.fill()
        // Mass label
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${b.m}kg`, b.x, b.y)
        // Velocity arrow
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        if (speed > 5) {
          const len = Math.min(speed * 0.5, 60)
          const ax = (b.vx / speed) * len
          const ay = (b.vy / speed) * len
          ctx.strokeStyle = b.color
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(b.x, b.y)
          ctx.lineTo(b.x + ax, b.y + ay)
          ctx.stroke()
          // Arrowhead
          const head = 8
          const ang = Math.atan2(ay, ax)
          ctx.beginPath()
          ctx.moveTo(b.x + ax, b.y + ay)
          ctx.lineTo(b.x + ax - head * Math.cos(ang - 0.3), b.y + ay - head * Math.sin(ang - 0.3))
          ctx.moveTo(b.x + ax, b.y + ay)
          ctx.lineTo(b.x + ax - head * Math.cos(ang + 0.3), b.y + ay - head * Math.sin(ang + 0.3))
          ctx.stroke()
        }
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mode])

  // Conservation calculation
  const balls = ballsRef.current
  const totalP = balls.reduce((s, b) => s + b.m * b.vx / 30, 0)
  const totalKE = balls.reduce((s, b) => s + 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy) / 900, 0)
  const keLoss = snapshot.keBefore > 0
    ? Math.max(0, (1 - totalKE / snapshot.keBefore) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-orange-300 bg-clip-text text-transparent flex items-center gap-2">
                <Target className="w-6 h-6 text-cyan-400" />
                Momentum & Collision
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Va chạm đàn hồi · Bảo toàn động lượng · Hệ 2 vật 1D & 2D
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-white/[0.04] border border-white/[0.08] p-1">
              <button onClick={() => setMode('1d')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  mode === '1d' ? 'bg-cyan-500 text-white' : 'text-white/55'
                }`}>1D</button>
              <button onClick={() => setMode('2d')}
                className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                  mode === '2d' ? 'bg-cyan-500 text-white' : 'text-white/55'
                }`}>2D</button>
            </div>
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
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">🔵 Vật 1</h3>
              <Slider label="Khối lượng" value={m1} min={0.5} max={5} step={0.5} suffix=" kg" onChange={setM1} />
              <Slider label="Vận tốc đầu" value={v1} min={-5} max={5} step={0.5} suffix=" m/s" onChange={setV1} />
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">🟠 Vật 2</h3>
              <Slider label="Khối lượng" value={m2} min={0.5} max={5} step={0.5} suffix=" kg" onChange={setM2} />
              <Slider label="Vận tốc đầu" value={v2} min={-5} max={5} step={0.5} suffix=" m/s" onChange={setV2} />
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Va chạm</h3>
              <Slider label="Hệ số đàn hồi e" value={restitution} min={0} max={1} step={0.05} suffix="" onChange={setRestitution} />
              <p className="text-[10px] text-white/40">
                e = 1: đàn hồi (KE giữ nguyên) · e = 0: dính (KE mất tối đa)
              </p>
              {mode === '2d' && (
                <Slider label="Góc tới" value={angle} min={-45} max={45} step={5} suffix="°" onChange={setAngle} />
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* Conservation panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="p trước" value={`${snapshot.pBefore.toFixed(2)} kg·m/s`} color="text-cyan-300" />
              <Stat label="p hiện tại" value={`${totalP.toFixed(2)} kg·m/s`}
                color={Math.abs(totalP - snapshot.pBefore) < 0.05 ? 'text-emerald-300' : 'text-rose-300'} />
              <Stat label="KE trước" value={`${snapshot.keBefore.toFixed(2)} J`} color="text-amber-300" />
              <Stat label={`KE mất (${keLoss.toFixed(0)}%)`} value={`${(snapshot.keBefore - totalKE).toFixed(2)} J`}
                color={keLoss > 5 ? 'text-rose-300' : 'text-emerald-300'} />
            </div>

            {/* Theory */}
            <div className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-4">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">⚖️ Bảo toàn động lượng</h4>
                  <p className="text-white/55 leading-relaxed">
                    Trong hệ kín (không lực ngoại), tổng <em>p = Σmᵢvᵢ</em> luôn không đổi
                    trước và sau va chạm — bất kể đàn hồi hay không.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🔥 Năng lượng</h4>
                  <p className="text-white/55 leading-relaxed">
                    <strong>e = 1</strong> (đàn hồi): KE bảo toàn 100%.<br />
                    <strong>0 &lt; e &lt; 1</strong>: một phần KE chuyển thành nhiệt/biến dạng.<br />
                    <strong>e = 0</strong> (dính): 2 vật dính nhau, KE mất tối đa.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-bold text-purple-300 mb-1">📐 Công thức 1D với hệ số e</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    v₁' = [(m₁ − e·m₂)·v₁ + (1+e)·m₂·v₂] / (m₁ + m₂)<br />
                    v₂' = [(1+e)·m₁·v₁ + (m₂ − e·m₁)·v₂] / (m₁ + m₂)
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

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-cyan-300">{value.toFixed(2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/45 font-bold">{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 ${color}`}>{value}</div>
    </div>
  )
}
