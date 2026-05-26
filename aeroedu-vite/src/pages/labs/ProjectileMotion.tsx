/**
 * ProjectileMotion — Chuyển động ném xiên
 *
 * Route: /dashboard/labtwin/projectile
 *
 * Features:
 *   - Vận tốc đầu v₀, góc α tự chỉnh
 *   - Trọng lực g, sức cản không khí (drag coef) tùy chọn
 *   - Hiển thị quỹ đạo parabol (drag=0) hoặc cong (drag>0)
 *   - Vector v (vx, vy) realtime
 *   - Target practice — đặt mục tiêu, đoán góc để trúng
 *   - Tính tầm xa R, độ cao max H, thời gian bay T
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Target as TargetIcon, Info, Crosshair, Wind,
} from 'lucide-react'

interface State {
  t: number
  x: number; y: number
  vx: number; vy: number
}

const CANVAS_W = 760
const CANVAS_H = 380
const GROUND_Y = CANVAS_H - 30
const PX_PER_M = 8       // 1 m = 8 px
const MAX_TRAIL = 400

export default function ProjectileMotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<State>({ t: 0, x: 0, y: 0, vx: 0, vy: 0 })
  const trailRef = useRef<Array<{ x: number; y: number }>>([])
  const runningRef = useRef(false)

  const [v0, setV0] = useState(25)
  const [angle, setAngle] = useState(45)
  const [gravity, setGravity] = useState(9.8)
  const [drag, setDrag] = useState(0)
  const [running, setRunning] = useState(false)
  const [target, setTarget] = useState({ x: 40, h: 0 })  // target at x=40m, height 0 (ground)
  const [hitFeedback, setHitFeedback] = useState<'hit' | 'miss' | null>(null)

  runningRef.current = running

  // Compute theoretical R, H, T (no-drag)
  const rad = (angle * Math.PI) / 180
  const vx0 = v0 * Math.cos(rad)
  const vy0 = v0 * Math.sin(rad)
  const T = (2 * vy0) / gravity
  const R = (v0 * v0 * Math.sin(2 * rad)) / gravity
  const Hmax = (vy0 * vy0) / (2 * gravity)

  const reset = () => {
    setRunning(false)
    setHitFeedback(null)
    trailRef.current = []
    stateRef.current = { t: 0, x: 0, y: 0, vx: vx0, vy: vy0 }
  }

  useEffect(() => { reset() /* eslint-disable-next-line */ }, [v0, angle, gravity])

  // Sim loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now
      const s = stateRef.current

      if (runningRef.current && s.y >= 0) {
        // Numerical integration with drag: a = -g·ĵ - k·|v|·v
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
        const ax = -drag * speed * s.vx
        const ay = -gravity - drag * speed * s.vy
        // RK4-ish: use mid-step for stability
        s.vx += ax * dt
        s.vy += ay * dt
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.t += dt
        trailRef.current.push({ x: s.x, y: s.y })
        if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift()

        // Hit detection — check if projectile passed target
        if (s.y <= 0 && hitFeedback === null) {
          const distToTarget = Math.abs(s.x - target.x)
          if (distToTarget < 2) setHitFeedback('hit')
          else setHitFeedback('miss')
          // Stop
          runningRef.current = false
          setRunning(false)
        }
      }

      // ─── Render ───
      // BG: sky to ground
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#1e3a8a')
      grad.addColorStop(0.85, '#1e293b')
      grad.addColorStop(1, '#0f172a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // Stars (decorative)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < 25; i++) {
        ctx.fillRect((i * 73) % CANVAS_W, (i * 47) % 100, 1.5, 1.5)
      }
      // Ground
      ctx.fillStyle = '#334155'
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y)
      // Grid (ground level)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.lineWidth = 1
      for (let x = 0; x <= CANVAS_W; x += PX_PER_M * 5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke()
        ctx.fillStyle = 'rgba(148,163,184,0.5)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${(x / PX_PER_M).toFixed(0)}m`, x, CANVAS_H - 8)
      }
      for (let y = 0; y < GROUND_Y; y += PX_PER_M * 5) {
        ctx.strokeStyle = 'rgba(148,163,184,0.08)'
        ctx.beginPath(); ctx.moveTo(0, GROUND_Y - y); ctx.lineTo(CANVAS_W, GROUND_Y - y); ctx.stroke()
      }

      // Target
      const targetPxX = target.x * PX_PER_M
      const targetPxY = GROUND_Y - target.h * PX_PER_M
      ctx.fillStyle = hitFeedback === 'hit' ? '#10b981' : '#f59e0b'
      ctx.beginPath(); ctx.arc(targetPxX, targetPxY, 18, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.beginPath(); ctx.arc(targetPxX, targetPxY, 14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = hitFeedback === 'hit' ? '#10b981' : '#f59e0b'
      ctx.beginPath(); ctx.arc(targetPxX, targetPxY, 9, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.beginPath(); ctx.arc(targetPxX, targetPxY, 4, 0, Math.PI * 2); ctx.fill()
      // Target label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`x=${target.x}m`, targetPxX, targetPxY - 25)

      // Theoretical trajectory (dashed, no drag)
      if (drag === 0) {
        ctx.strokeStyle = 'rgba(34,211,238,0.25)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        for (let t = 0; t <= T; t += 0.05) {
          const tx = vx0 * t
          const ty = vy0 * t - 0.5 * gravity * t * t
          if (ty < 0) break
          const px = tx * PX_PER_M
          const py = GROUND_Y - ty * PX_PER_M
          if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Trail (actual)
      if (trailRef.current.length > 1) {
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < trailRef.current.length; i++) {
          const p = trailRef.current[i]
          const px = p.x * PX_PER_M
          const py = GROUND_Y - p.y * PX_PER_M
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Projectile
      const projX = s.x * PX_PER_M
      const projY = GROUND_Y - Math.max(0, s.y) * PX_PER_M
      if (projX >= 0 && projX <= CANVAS_W && projY >= 0) {
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 12
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath(); ctx.arc(projX, projY, 8, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        // Highlight
        ctx.fillStyle = '#fff'
        ctx.beginPath(); ctx.arc(projX - 2, projY - 2, 2.5, 0, Math.PI * 2); ctx.fill()

        // Velocity vector
        if (runningRef.current) {
          const vScale = 0.3
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(projX, projY)
          ctx.lineTo(projX + s.vx * vScale * PX_PER_M, projY - s.vy * vScale * PX_PER_M)
          ctx.stroke()
        }
      }

      // Launcher (cannon at origin)
      ctx.fillStyle = '#475569'
      ctx.fillRect(-5, GROUND_Y - 8, 30, 8)
      // Cannon barrel rotated
      ctx.save()
      ctx.translate(10, GROUND_Y - 8)
      ctx.rotate(-rad)
      ctx.fillStyle = '#64748b'
      ctx.fillRect(0, -4, 30, 8)
      ctx.restore()

      // Hit feedback
      if (hitFeedback) {
        ctx.fillStyle = hitFeedback === 'hit' ? '#10b981' : '#ef4444'
        ctx.font = 'bold 24px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(hitFeedback === 'hit' ? '🎯 TRÚNG!' : '❌ TRƯỢT', CANVAS_W / 2, 50)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [vx0, vy0, gravity, drag, target.x, target.h, T, rad, hitFeedback])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
                <TargetIcon className="w-6 h-6 text-amber-400" />
                Projectile Motion — Ném xiên
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Quỹ đạo parabol · y(t) = v₀sinα·t − ½g·t²
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Bắn!</>}
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
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">🚀 Phóng</h3>
              <Slider label="Vận tốc đầu v₀" value={v0} min={5} max={60} step={1} suffix=" m/s" onChange={setV0} />
              <Slider label="Góc α" value={angle} min={0} max={90} step={1} suffix="°" onChange={setAngle} />
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">🌍 Môi trường</h3>
              <Slider label="Trọng lực g" value={gravity} min={1.6} max={25} step={0.1} suffix=" m/s²" onChange={setGravity} />
              <Slider label={<><Wind className="inline w-3 h-3" /> Sức cản không khí</>} value={drag} min={0} max={0.05} step={0.001} suffix="" onChange={setDrag} />
              <div className="flex gap-1 mt-1">
                <button onClick={() => setGravity(9.8)} className="px-2 py-1 rounded text-[10px] bg-white/[0.06] hover:bg-white/[0.1]">🌍 Trái đất 9.8</button>
                <button onClick={() => setGravity(1.62)} className="px-2 py-1 rounded text-[10px] bg-white/[0.06] hover:bg-white/[0.1]">🌙 Mặt trăng 1.62</button>
                <button onClick={() => setGravity(3.7)} className="px-2 py-1 rounded text-[10px] bg-white/[0.06] hover:bg-white/[0.1]">🔴 Sao Hỏa 3.7</button>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 flex items-center gap-1">
                <Crosshair className="w-3 h-3" /> Mục tiêu
              </h3>
              <Slider label="Vị trí x" value={target.x} min={5} max={80} step={1} suffix=" m"
                onChange={(v) => { setTarget({ ...target, x: v }); setHitFeedback(null) }} />
              <p className="text-[10px] text-white/40">
                Đoán v₀ và α để trúng mục tiêu! Sai số &lt; 2m = trúng.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* Theoretical values */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Tầm xa R" value={`${R.toFixed(2)} m`} color="text-amber-300"
                formula="(v₀²·sin2α)/g" />
              <Stat label="Độ cao max H" value={`${Hmax.toFixed(2)} m`} color="text-cyan-300"
                formula="(v₀sinα)²/(2g)" />
              <Stat label="Thời gian bay T" value={`${T.toFixed(2)} s`} color="text-violet-300"
                formula="(2·v₀sinα)/g" />
              <Stat label="vₓ · vᵧ ban đầu"
                value={`${vx0.toFixed(1)} · ${vy0.toFixed(1)}`} color="text-emerald-300"
                formula="m/s · m/s" />
            </div>

            <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 p-4">
              <h3 className="font-bold text-amber-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">📐 Phân tích thành phần</h4>
                  <p className="text-white/55 leading-relaxed">
                    Chuyển động ném xiên = chuyển động thẳng đều (ngang) + rơi tự do (đứng).
                    Phương trình quỹ đạo y(x) = (tanα)x − g·x²/(2·v₀²·cos²α) là parabol.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">🎯 Góc tối ưu (R max)</h4>
                  <p className="text-white/55 leading-relaxed">
                    Tầm xa lớn nhất khi <strong>α = 45°</strong> (giả sử ném và rơi cùng độ cao).
                    Với α và 90°−α, tầm xa R bằng nhau.
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
  label: React.ReactNode; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-amber-300">{value.toFixed(value < 1 ? 3 : 1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-500" />
    </div>
  )
}

function Stat({ label, value, color, formula }: { label: string; value: string; color: string; formula: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/45 font-bold">{label}</div>
      <div className={`text-lg font-bold font-mono mt-1 ${color}`}>{value}</div>
      <div className="text-[9px] text-white/40 font-mono mt-0.5">{formula}</div>
    </div>
  )
}
