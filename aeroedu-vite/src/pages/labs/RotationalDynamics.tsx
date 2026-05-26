/**
 * RotationalDynamics — Chuyển động quay + mômen quán tính
 *
 * Route: /dashboard/labtwin/rotational-dynamics
 *
 * Features:
 *   - Mặt phẳng nghiêng — 5 hình khác nhau (cầu đặc, cầu rỗng, trụ đặc, trụ rỗng, vành tròn)
 *     lăn xuống với mômen quán tính khác nhau → tốc độ khác nhau
 *   - I (moment of inertia) calculation per shape
 *   - Race mode: cùng thả 2 hình, xem cái nào về trước
 *   - τ = I·α (torque = inertia × angular accel)
 *   - KE = ½·m·v² + ½·I·ω² (translational + rotational)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Info, Trophy,
} from 'lucide-react'

type ShapeKind =
  | 'solid_sphere' | 'hollow_sphere'
  | 'solid_cylinder' | 'hollow_cylinder' | 'ring'

const SHAPES: Record<ShapeKind, {
  label: string; icon: string;
  // I = c·m·r²  for rolling without slipping coefficient
  I_coef: number;
  // Linear acceleration on incline angle θ: a = g·sin(θ) / (1 + c)
  accelCoef: number;  // = 1 / (1 + I_coef)
  color: string;
}> = {
  solid_sphere:   { label: 'Cầu đặc',     icon: '⚽',  I_coef: 2/5,  accelCoef: 5/7,  color: '#22d3ee' },
  hollow_sphere:  { label: 'Cầu rỗng',    icon: '🏐',  I_coef: 2/3,  accelCoef: 3/5,  color: '#a78bfa' },
  solid_cylinder: { label: 'Trụ đặc',     icon: '🥫',  I_coef: 1/2,  accelCoef: 2/3,  color: '#10b981' },
  hollow_cylinder:{ label: 'Trụ rỗng',    icon: '🛢',  I_coef: 5/6,  accelCoef: 6/11, color: '#f97316' },
  ring:           { label: 'Vành tròn',   icon: '⭕',  I_coef: 1,    accelCoef: 1/2,  color: '#ec4899' },
}

interface RollingObject {
  shape: ShapeKind
  s: number           // distance along incline (m)
  v: number           // velocity along incline (m/s)
  active: boolean
}

const CANVAS_W = 760
const CANVAS_H = 380
const PX_PER_M = 40
const INCLINE_LEN = 14    // meters

export default function RotationalDynamics() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const objsRef = useRef<RollingObject[]>([])
  const runningRef = useRef(false)
  const thetaRef = useRef(15)
  const gRef = useRef(9.8)

  const [running, setRunning] = useState(false)
  const [theta, setTheta] = useState(15)   // incline degrees
  const [g, setG] = useState(9.8)
  const [m, setM] = useState(1)            // mass kg
  const [r, setR] = useState(0.25)         // radius m
  const [racers, setRacers] = useState<ShapeKind[]>(['solid_sphere', 'ring'])
  const [winner, setWinner] = useState<ShapeKind | null>(null)
  const [finishTimes, setFinishTimes] = useState<Record<ShapeKind, number>>({} as Record<ShapeKind, number>)
  const tRef = useRef(0)

  runningRef.current = running
  thetaRef.current = theta
  gRef.current = g

  const reset = () => {
    objsRef.current = racers.map((s) => ({ shape: s, s: 0, v: 0, active: true }))
    setRunning(false)
    setWinner(null)
    setFinishTimes({} as Record<ShapeKind, number>)
    tRef.current = 0
  }

  useEffect(() => { reset() /* eslint-disable-next-line */ }, [racers, theta])

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

      if (runningRef.current) {
        tRef.current += dt
        const rad = (thetaRef.current * Math.PI) / 180
        for (const o of objsRef.current) {
          if (!o.active) continue
          const a = gRef.current * Math.sin(rad) * SHAPES[o.shape].accelCoef
          o.v += a * dt
          o.s += o.v * dt
          if (o.s >= INCLINE_LEN) {
            o.s = INCLINE_LEN
            o.active = false
            if (!winner) setWinner(o.shape)
            setFinishTimes((prev) => ({ ...prev, [o.shape]: tRef.current }))
          }
        }
        // Stop simulation when all done
        if (objsRef.current.every((o) => !o.active)) {
          runningRef.current = false
          setRunning(false)
        }
      }

      // ─── Render ───
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#0f172a')
      grad.addColorStop(1, '#1e293b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const rad = (thetaRef.current * Math.PI) / 180
      const sinT = Math.sin(rad)
      const cosT = Math.cos(rad)

      // FIX 2026-05-27: User "Lăn thì phải từ trên dốc lăn xuống. Hãy đổi
      // vị trí điểm đầu và điểm cuối cho đúng"
      // → BOTTOM-LEFT là điểm đến (finish), TOP-RIGHT là điểm xuất phát (s=0)
      // Slope hypotenuse: top-right ↘ bottom-left
      const bottomLeftX = 60                                                    // điểm thấp nhất (finish)
      const bottomLeftY = CANVAS_H - 50
      const topRightX = bottomLeftX + INCLINE_LEN * PX_PER_M * cosT             // điểm cao nhất (start)
      const topRightY = bottomLeftY - INCLINE_LEN * PX_PER_M * sinT

      // Ground
      ctx.fillStyle = '#334155'
      ctx.fillRect(0, bottomLeftY, CANVAS_W, CANVAS_H - bottomLeftY)
      // Incline triangle: bottom-left → top-right (hypotenuse) → bottom-right (vertical) → close
      ctx.beginPath()
      ctx.moveTo(bottomLeftX, bottomLeftY)
      ctx.lineTo(topRightX, topRightY)
      ctx.lineTo(topRightX, bottomLeftY)
      ctx.closePath()
      ctx.fillStyle = '#475569'
      ctx.fill()
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.stroke()

      // Angle indicator (tại điểm chân dốc — bottom-left)
      ctx.strokeStyle = 'rgba(251,191,36,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(bottomLeftX, bottomLeftY, 28, -rad, 0)
      ctx.stroke()
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${thetaRef.current.toFixed(0)}°`, bottomLeftX + 38, bottomLeftY - 8)

      // Distance markers: s=0 ở ĐỈNH (top-right), s=INCLINE_LEN ở ĐÁY (bottom-left)
      // Vector từ top-right → bottom-left: (-cosT, +sinT) (đi xuống-trái)
      for (let s = 0; s <= INCLINE_LEN; s += 2) {
        const px = topRightX - s * PX_PER_M * cosT
        const py = topRightY + s * PX_PER_M * sinT
        ctx.fillStyle = 'rgba(148,163,184,0.5)'
        ctx.font = '9px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`${s}m`, px, py - 8)
        // Tick
        ctx.strokeStyle = 'rgba(148,163,184,0.3)'
        ctx.beginPath()
        ctx.moveTo(px, py); ctx.lineTo(px - 3 * sinT, py - 3 * cosT)
        ctx.stroke()
      }

      // 🏃 Điểm XUẤT PHÁT (top-right) — flag đỏ "START"
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(topRightX, topRightY - 12, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('START', topRightX, topRightY - 26)

      // 🏁 Điểm ĐÍCH (bottom-left) — finish line xanh lá
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(bottomLeftX, bottomLeftY)
      ctx.lineTo(bottomLeftX, bottomLeftY - 24)
      ctx.stroke()
      // Checkered pattern flag
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#fff'
        ctx.fillRect(bottomLeftX, bottomLeftY - 24 + i * 6, 14, 6)
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#10b981'
        ctx.fillRect(bottomLeftX + 14, bottomLeftY - 24 + i * 6, 14, 6)
      }
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 10px sans-serif'
      ctx.fillText('🏁 FINISH', bottomLeftX + 14, bottomLeftY - 32)

      // Objects rolling — xuất phát top-right (s=0), kết thúc bottom-left (s=INCLINE_LEN)
      // px = topRightX - s·cosT (đi sang trái), py = topRightY + s·sinT (đi xuống)
      const radiusPx = r * PX_PER_M
      objsRef.current.forEach((o, idx) => {
        const meta = SHAPES[o.shape]
        const px = topRightX - o.s * PX_PER_M * cosT - sinT * (radiusPx + 6) * (idx % 2 === 0 ? 1 : 0.5)
        const py = topRightY + o.s * PX_PER_M * sinT - cosT * (radiusPx + 6) * (idx % 2 === 0 ? 1 : 0.5)
        // Shadow
        ctx.shadowColor = meta.color
        ctx.shadowBlur = 12
        ctx.fillStyle = meta.color
        ctx.beginPath(); ctx.arc(px, py, radiusPx, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        // Spoke indicator for rotation visualization
        // Rolling left + down → wheel rotates clockwise in screen coords
        // (top of ball moves left = ngược chiều +x). Negate angle vì canvas Y-down.
        const rotationAngle = -o.s / r  // rad (rolling without slipping, downhill direction)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px + Math.cos(rotationAngle) * radiusPx * 0.8, py + Math.sin(rotationAngle) * radiusPx * 0.8)
        ctx.stroke()
        // Hollow indicator
        if (o.shape === 'hollow_sphere' || o.shape === 'hollow_cylinder' || o.shape === 'ring') {
          ctx.fillStyle = '#0f172a'
          ctx.beginPath(); ctx.arc(px, py, radiusPx * 0.6, 0, Math.PI * 2); ctx.fill()
        }
        // Label
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(meta.label, px, py - radiusPx - 6)
      })

      // Race timer
      ctx.fillStyle = '#22d3ee'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`⏱ ${tRef.current.toFixed(2)} s`, 12, 24)

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [r, winner])

  const toggleRacer = (s: ShapeKind) => {
    setRacers((prev) => {
      if (prev.includes(s)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== s)
      }
      if (prev.length >= 3) return prev
      return [...prev, s]
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent flex items-center gap-2">
                <RotateCcw className="w-6 h-6 text-emerald-400" />
                Rotational Dynamics — Cuộc đua lăn xuống dốc
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Mômen quán tính · I khác nhau → gia tốc khác nhau · a = g·sinθ/(1+c)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Bắt đầu đua!</>}
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
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Mặt phẳng</h3>
              <Slider label="Góc nghiêng θ" value={theta} min={5} max={45} step={1} suffix="°" onChange={setTheta} />
              <Slider label="Trọng lực g" value={g} min={1.6} max={20} step={0.1} suffix=" m/s²" onChange={setG} />
              <Slider label="Khối lượng m" value={m} min={0.5} max={5} step={0.5} suffix=" kg" onChange={setM} />
              <Slider label="Bán kính r" value={r} min={0.1} max={0.4} step={0.05} suffix=" m" onChange={setR} />
            </div>
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                🏁 Chọn hình tham gia ({racers.length}/3)
              </h3>
              <div className="space-y-1.5">
                {(Object.keys(SHAPES) as ShapeKind[]).map((s) => {
                  const sel = racers.includes(s)
                  const meta = SHAPES[s]
                  return (
                    <button key={s} onClick={() => toggleRacer(s)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-xs font-bold transition flex items-center justify-between gap-2 ${
                        sel
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200'
                          : 'bg-white/[0.04] border border-white/[0.08] text-white/55 hover:bg-white/[0.08]'
                      }`}>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-70">I=({fracDisplay(meta.I_coef)})mr²</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* Results table */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Bảng kết quả
              </h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-white/55">
                    <th className="text-left py-2 px-2">Hình</th>
                    <th className="text-right py-2 px-2">I = c·m·r²</th>
                    <th className="text-right py-2 px-2">a (m/s²)</th>
                    <th className="text-right py-2 px-2">Thời gian</th>
                    <th className="text-center py-2 px-2">Xếp hạng</th>
                  </tr>
                </thead>
                <tbody>
                  {racers
                    .map((s) => ({ s, t: finishTimes[s] ?? null }))
                    .sort((a, b) => (a.t ?? Infinity) - (b.t ?? Infinity))
                    .map((row, idx) => {
                      const meta = SHAPES[row.s]
                      const I = meta.I_coef * m * r * r
                      const accel = g * Math.sin((theta * Math.PI) / 180) * meta.accelCoef
                      return (
                        <tr key={row.s} className="border-b border-white/[0.03]">
                          <td className="py-2 px-2 font-bold" style={{ color: meta.color }}>
                            {meta.icon} {meta.label}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-white/70">
                            {fracDisplay(meta.I_coef)}·m·r² = {I.toFixed(4)}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-cyan-300">{accel.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right font-mono text-amber-300">
                            {row.t !== null ? `${row.t.toFixed(2)} s` : '—'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {row.t !== null && idx === 0 && '🥇'}
                            {row.t !== null && idx === 1 && '🥈'}
                            {row.t !== null && idx === 2 && '🥉'}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              {winner && (
                <p className="text-xs text-emerald-300 mt-3 italic">
                  🏆 <strong>{SHAPES[winner].label}</strong> về đích trước — vì có mômen quán tính nhỏ nhất trong nhóm!
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 p-4">
              <h3 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">🎯 Mômen quán tính I</h4>
                  <p className="text-white/55 leading-relaxed">
                    I = c·m·r² với c phụ thuộc hình dạng. Khối lượng tập trung gần trục quay (cầu đặc)
                    → I nhỏ, dễ quay. Khối lượng phân bố xa trục (vành tròn) → I lớn, khó quay.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🛞 Lăn không trượt</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    a = g·sinθ / (1 + I/mr²)<br />
                    = g·sinθ / (1 + c)
                  </p>
                  <p className="text-white/55 leading-relaxed mt-1">
                    c càng nhỏ → a càng lớn → về đích nhanh hơn. Đó là lý do <strong>cầu đặc</strong> luôn thắng <strong>vành tròn</strong>!
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

function fracDisplay(x: number): string {
  // Show common fractions
  if (Math.abs(x - 2/5) < 0.001) return '2/5'
  if (Math.abs(x - 2/3) < 0.001) return '2/3'
  if (Math.abs(x - 1/2) < 0.001) return '1/2'
  if (Math.abs(x - 5/6) < 0.001) return '5/6'
  if (Math.abs(x - 1) < 0.001) return '1'
  return x.toFixed(2)
}

function Slider({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-emerald-300">{value.toFixed(value < 1 ? 2 : 1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500" />
    </div>
  )
}
