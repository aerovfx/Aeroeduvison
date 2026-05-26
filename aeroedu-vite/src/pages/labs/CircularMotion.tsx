/**
 * CircularMotion — Chuyển động tròn đều + lực hướng tâm
 *
 * Route: /dashboard/labtwin/circular-motion
 *
 * Features:
 *   - Vật quay tròn với bán kính r, vận tốc góc ω
 *   - Vector vận tốc v (tiếp tuyến) + vector gia tốc hướng tâm a (vào tâm)
 *   - Lực căng dây T (= m·ω²·r) khi cắt dây mô phỏng vật bay đi
 *   - Đồ thị position, velocity vs time (sin/cos)
 *   - Hiển thị period T, tần số f, vận tốc tuyến tính v
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Scissors, Info, Activity,
} from 'lucide-react'

const CANVAS_W = 600
const CANVAS_H = 480
const CX = CANVAS_W / 2
const CY = CANVAS_H / 2
const PX_PER_M = 50

export default function CircularMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef({ theta: 0, cut: false, freeX: 0, freeY: 0, freeVx: 0, freeVy: 0 })
  const runningRef = useRef(true)
  const omegaRef = useRef(2)
  const rRef = useRef(2)
  const mRef = useRef(1)
  const gRef = useRef(0)  // simulate cut + gravity for freedom

  const [running, setRunning] = useState(true)
  const [r, setR] = useState(2)
  const [omega, setOmega] = useState(2)
  const [m, setM] = useState(1)
  const [withGravity, setWithGravity] = useState(false)
  const [cut, setCut] = useState(false)

  runningRef.current = running
  omegaRef.current = omega
  rRef.current = r
  mRef.current = m
  gRef.current = withGravity ? 9.8 : 0

  // Reset cut state on params change
  useEffect(() => { setCut(false); animRef.current.cut = false }, [r, omega, m])

  const handleCut = () => {
    if (animRef.current.cut) return
    setCut(true)
    animRef.current.cut = true
    // Compute current velocity (tangential)
    const a = animRef.current
    const vTan = omegaRef.current * rRef.current
    // Tangent direction: perpendicular to radius, counterclockwise
    a.freeX = rRef.current * Math.cos(a.theta)
    a.freeY = rRef.current * Math.sin(a.theta)
    a.freeVx = -vTan * Math.sin(a.theta)
    a.freeVy = vTan * Math.cos(a.theta)
  }

  const reset = () => {
    setCut(false)
    animRef.current = { theta: 0, cut: false, freeX: 0, freeY: 0, freeVx: 0, freeVy: 0 }
  }

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now
      const a = animRef.current

      if (runningRef.current) {
        if (!a.cut) {
          a.theta += omegaRef.current * dt
        } else {
          // Free flight (projectile if gravity on)
          a.freeX += a.freeVx * dt
          a.freeY += a.freeVy * dt
          a.freeVy -= gRef.current * dt  // gravity pulls "down" — in our coord +y is up
        }
      }

      // ─── Render ───
      const grad = ctx.createRadialGradient(CX, CY, 50, CX, CY, 400)
      grad.addColorStop(0, '#1e293b')
      grad.addColorStop(1, '#0a0f1f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Axes
      ctx.strokeStyle = 'rgba(148,163,184,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, CY); ctx.lineTo(CANVAS_W, CY)
      ctx.moveTo(CX, 0); ctx.lineTo(CX, CANVAS_H)
      ctx.stroke()

      const rPx = rRef.current * PX_PER_M

      // Circular path (only show if not cut)
      if (!a.cut) {
        ctx.strokeStyle = 'rgba(168,139,250,0.3)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(CX, CY, rPx, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Center pivot
      ctx.fillStyle = '#475569'
      ctx.beginPath(); ctx.arc(CX, CY, 5, 0, Math.PI * 2); ctx.fill()

      // Compute object position
      let ox: number, oy: number
      if (a.cut) {
        ox = CX + a.freeX * PX_PER_M
        oy = CY - a.freeY * PX_PER_M
      } else {
        ox = CX + Math.cos(a.theta) * rPx
        oy = CY - Math.sin(a.theta) * rPx

        // String (rope)
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(CX, CY)
        ctx.lineTo(ox, oy)
        ctx.stroke()

        // Velocity vector (tangent)
        const vTan = omegaRef.current * rRef.current
        const vScale = 30
        const vx = -Math.sin(a.theta) * vTan
        const vy = Math.cos(a.theta) * vTan
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 2.5
        drawArrow(ctx, ox, oy, ox + vx * vScale, oy - vy * vScale)
        ctx.fillStyle = '#22d3ee'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`v = ${vTan.toFixed(2)} m/s`, ox + vx * vScale + 5, oy - vy * vScale - 5)

        // Centripetal acceleration vector (toward center)
        const aCent = omegaRef.current * omegaRef.current * rRef.current
        const aScale = 8
        const axDir = (CX - ox) / rPx
        const ayDir = (CY - oy) / rPx
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 2.5
        drawArrow(ctx, ox, oy, ox + axDir * aCent * aScale, oy + ayDir * aCent * aScale)
        ctx.fillStyle = '#f97316'
        ctx.fillText(`a = ${aCent.toFixed(2)} m/s²`, ox + axDir * aCent * aScale + 5, oy + ayDir * aCent * aScale + 12)
      }

      // Object
      const objR = 8 + mRef.current * 2
      ctx.shadowColor = '#a78bfa'
      ctx.shadowBlur = 12
      ctx.fillStyle = '#a78bfa'
      ctx.beginPath(); ctx.arc(ox, oy, objR, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.beginPath(); ctx.arc(ox - 2, oy - 2, objR * 0.35, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${mRef.current}kg`, ox, oy)

      // Cut indicator
      if (a.cut) {
        ctx.fillStyle = '#f43f5e'
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('✂ Dây bị cắt — vật bay theo tiếp tuyến!', CANVAS_W / 2, 30)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Derived quantities
  const v = omega * r
  const aCent = omega * omega * r
  const T = (2 * Math.PI) / Math.max(omega, 0.001)
  const f = 1 / T
  const Fcent = m * omega * omega * r

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-orange-300 bg-clip-text text-transparent flex items-center gap-2">
                <Activity className="w-6 h-6 text-violet-400" />
                Chuyển động tròn đều
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Lực hướng tâm · F = m·ω²·r · Tiếp tuyến vs hướng tâm
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
            <button onClick={handleCut} disabled={cut}
              className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-30 text-rose-300 font-bold flex items-center gap-1.5 text-sm">
              <Scissors className="w-4 h-4" /> Cắt dây
            </button>
            <button onClick={reset}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Thông số</h3>
              <Slider label="Bán kính r" value={r} min={1} max={3.5} step={0.1} suffix=" m" onChange={setR} />
              <Slider label="Vận tốc góc ω" value={omega} min={0.5} max={6} step={0.1} suffix=" rad/s" onChange={setOmega} />
              <Slider label="Khối lượng m" value={m} min={0.5} max={5} step={0.5} suffix=" kg" onChange={setM} />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={withGravity} onChange={(e) => setWithGravity(e.target.checked)}
                  className="accent-violet-500" />
                <span className="text-white/70">Có trọng lực sau khi cắt dây</span>
              </label>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full max-w-2xl mx-auto h-auto rounded-lg" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Stat label="Vận tốc v" value={`${v.toFixed(2)} m/s`} color="text-cyan-300" formula="v = ω·r" />
              <Stat label="Gia tốc hướng tâm" value={`${aCent.toFixed(2)} m/s²`} color="text-orange-300" formula="a = ω²·r" />
              <Stat label="Chu kỳ T" value={`${T.toFixed(2)} s`} color="text-violet-300" formula="T = 2π/ω" />
              <Stat label="Tần số f" value={`${f.toFixed(2)} Hz`} color="text-emerald-300" formula="f = 1/T" />
              <Stat label="Lực hướng tâm F" value={`${Fcent.toFixed(2)} N`} color="text-rose-300" formula="F = m·ω²·r" />
            </div>

            <div className="rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-4">
              <h3 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">🎯 Vận tốc tiếp tuyến (xanh)</h4>
                  <p className="text-white/55 leading-relaxed">
                    Vận tốc <em>v</em> luôn <strong>tiếp tuyến</strong> với quỹ đạo tròn. Khi cắt dây,
                    vật bay đi theo đúng hướng tiếp tuyến tại thời điểm đó (Newton I — quán tính).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-orange-300 mb-1">↘️ Gia tốc hướng tâm (cam)</h4>
                  <p className="text-white/55 leading-relaxed">
                    Gia tốc <em>a = ω²r</em> luôn hướng <strong>vào tâm</strong>. Đây là gia tốc gây ra
                    bởi lực căng dây kéo vật ngược về tâm — không có nó vật sẽ bay thẳng.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-bold text-rose-300 mb-1">💪 Lực căng dây (lực hướng tâm)</h4>
                  <p className="text-white/55 leading-relaxed">
                    Lực căng <strong>F = m·ω²·r = m·v²/r</strong>. Đây là lực thật sự "giữ" vật quay tròn.
                    Khi dây đứt, lực biến mất → vật chuyển sang quán tính (chuyển động thẳng đều).
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

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  const head = 8
  const ang = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang - 0.3), y2 - head * Math.sin(ang - 0.3))
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang + 0.3), y2 - head * Math.sin(ang + 0.3))
  ctx.stroke()
}

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-violet-300">{value.toFixed(1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500" />
    </div>
  )
}

function Stat({ label, value, color, formula }: { label: string; value: string; color: string; formula: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/45 font-bold">{label}</div>
      <div className={`text-base font-bold font-mono mt-1 ${color}`}>{value}</div>
      <div className="text-[9px] text-white/40 font-mono mt-0.5">{formula}</div>
    </div>
  )
}
