/**
 * MotionSim Pro — Mô phỏng chuyển động nâng cao
 *
 * Route: /dashboard/labtwin/motionsim
 *
 * User: "fix lỗi này https://inphysic.com/dashboard/labtwin/motionsim"
 * Route chưa tồn tại → 404. Build dedicated page.
 *
 * Features:
 *   - Multi-body system (2-5 balls trên đường ray 1D)
 *   - Lực trọng trường tùy chỉnh, ma sát, hệ số đàn hồi
 *   - Va chạm đàn hồi/không đàn hồi (coefficient of restitution)
 *   - Live charts: vận tốc, vị trí, động lượng, KE/PE
 *   - Bảo toàn động lượng + năng lượng panel
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, Sparkles, Info, Activity,
} from 'lucide-react'

interface Ball {
  id: number
  x: number          // position (m)
  v: number          // velocity (m/s)
  m: number          // mass (kg)
  r: number          // radius (display, m)
  color: string
}

const COLORS = ['#22d3ee', '#a78bfa', '#f97316', '#10b981', '#ec4899']
const TRACK_LEN = 20    // meters
const SCENE_W = 800
const SCENE_H = 240
const PX_PER_M = SCENE_W / TRACK_LEN
const GROUND_Y = 170

function pxX(x: number) { return x * PX_PER_M }

export default function MotionSim() {
  const [balls, setBalls] = useState<Ball[]>(() => [
    { id: 1, x: 4,  v: 2.5, m: 1.0, r: 0.5, color: COLORS[0] },
    { id: 2, x: 14, v: -1.5, m: 2.0, r: 0.7, color: COLORS[1] },
  ])
  const [running, setRunning] = useState(false)
  const [t, setT] = useState(0)
  const [gravity, setGravity] = useState(0)         // m/s² along track (0=horizontal, 9.8=incline)
  const [friction, setFriction] = useState(0)      // damping coeff 0..1
  const [restitution, setRestitution] = useState(1) // 1=elastic, 0=inelastic
  const [history, setHistory] = useState<Array<{ t: number; p: number; ke: number }>>([])

  const ballsRef = useRef(balls)
  const runningRef = useRef(running)
  ballsRef.current = balls
  runningRef.current = running

  const reset = useCallback(() => {
    setBalls([
      { id: 1, x: 4,  v: 2.5, m: 1.0, r: 0.5, color: COLORS[0] },
      { id: 2, x: 14, v: -1.5, m: 2.0, r: 0.7, color: COLORS[1] },
    ])
    setT(0)
    setHistory([])
    setRunning(false)
  }, [])

  const addBall = () => {
    setBalls((prev) => {
      if (prev.length >= 5) return prev
      const id = (prev[prev.length - 1]?.id || 0) + 1
      return [...prev, {
        id, x: 8 + prev.length * 1.5,
        v: (Math.random() - 0.5) * 4,
        m: 1 + Math.random() * 1.5,
        r: 0.4 + Math.random() * 0.3,
        color: COLORS[prev.length % COLORS.length],
      }]
    })
  }
  const removeBall = () => setBalls((prev) => prev.length > 2 ? prev.slice(0, -1) : prev)

  // Physics step
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.04)
      last = now
      if (runningRef.current) {
        setT((tt) => tt + dt)
        setBalls((prev) => {
          const next = prev.map((b) => ({ ...b }))
          // 1. Update velocities (gravity + friction)
          for (const b of next) {
            b.v += gravity * dt
            // Friction (linear damping)
            b.v *= (1 - friction * dt)
            // Update position
            b.x += b.v * dt
          }
          // 2. Wall collisions (elastic on walls)
          for (const b of next) {
            if (b.x - b.r < 0) {
              b.x = b.r
              b.v = Math.abs(b.v) * restitution
            }
            if (b.x + b.r > TRACK_LEN) {
              b.x = TRACK_LEN - b.r
              b.v = -Math.abs(b.v) * restitution
            }
          }
          // 3. Pair collisions
          for (let i = 0; i < next.length; i++) {
            for (let j = i + 1; j < next.length; j++) {
              const a = next[i], b = next[j]
              const dx = b.x - a.x
              const dist = Math.abs(dx)
              if (dist < a.r + b.r) {
                // Resolve overlap (push apart)
                const overlap = (a.r + b.r) - dist
                const sign = dx >= 0 ? 1 : -1
                a.x -= sign * overlap / 2
                b.x += sign * overlap / 2
                // 1D collision physics with restitution e
                // v1' = ((m1-e*m2)*v1 + (1+e)*m2*v2) / (m1+m2)
                // v2' = ((1+e)*m1*v1 + (m2-e*m1)*v2) / (m1+m2)
                const e = restitution
                const M = a.m + b.m
                const v1 = ((a.m - e * b.m) * a.v + (1 + e) * b.m * b.v) / M
                const v2 = ((1 + e) * a.m * a.v + (b.m - e * a.m) * b.v) / M
                a.v = v1
                b.v = v2
              }
            }
          }
          return next
        })
        // Record snapshot
        setHistory((h) => {
          const arr = ballsRef.current
          const p = arr.reduce((s, b) => s + b.m * b.v, 0)
          const ke = arr.reduce((s, b) => s + 0.5 * b.m * b.v * b.v, 0)
          const next = [...h, { t: t + dt, p, ke }]
          if (next.length > 200) next.shift()
          return next
        })
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gravity, friction, restitution])

  // Computed totals
  const totalMomentum = balls.reduce((s, b) => s + b.m * b.v, 0)
  const totalKE = balls.reduce((s, b) => s + 0.5 * b.m * b.v * b.v, 0)
  const totalMass = balls.reduce((s, b) => s + b.m, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent flex items-center gap-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                MotionSim Pro — Chuyển động nâng cao
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Va chạm đàn hồi · Bảo toàn động lượng · Bảo toàn năng lượng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Chạy</>}
            </button>
            <button onClick={reset}
              className="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Scene + chart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Scene SVG */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-2 text-xs text-white/50">
                <span>Đường ray 1D ({TRACK_LEN} m)</span>
                <span className="font-mono">t = {t.toFixed(2)} s</span>
              </div>
              <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="w-full h-auto">
                {/* Sky/ground gradient */}
                <defs>
                  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  {balls.map((b) => (
                    <radialGradient key={`grad-${b.id}`} id={`ball-${b.id}`}>
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                      <stop offset="30%" stopColor={b.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={b.color} stopOpacity="0.6" />
                    </radialGradient>
                  ))}
                </defs>
                <rect x="0" y="0" width={SCENE_W} height={SCENE_H} fill="url(#bg)" />
                {/* Grid */}
                {Array.from({ length: TRACK_LEN + 1 }, (_, i) => (
                  <g key={i}>
                    <line x1={pxX(i)} y1={20} x2={pxX(i)} y2={GROUND_Y}
                      stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
                    {i % 2 === 0 && (
                      <text x={pxX(i)} y={GROUND_Y + 20} textAnchor="middle"
                        fill="rgba(148,163,184,0.55)" fontSize="10">{i}m</text>
                    )}
                  </g>
                ))}
                {/* Track */}
                <line x1={0} y1={GROUND_Y} x2={SCENE_W} y2={GROUND_Y}
                  stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                {/* Walls */}
                <line x1={0} y1={GROUND_Y - 60} x2={0} y2={GROUND_Y + 10}
                  stroke="#64748b" strokeWidth="4" />
                <line x1={SCENE_W} y1={GROUND_Y - 60} x2={SCENE_W} y2={GROUND_Y + 10}
                  stroke="#64748b" strokeWidth="4" />

                {/* Balls */}
                {balls.map((b) => {
                  const cx = pxX(b.x)
                  const cy = GROUND_Y - b.r * PX_PER_M
                  const rPx = b.r * PX_PER_M
                  // Velocity arrow
                  const arrowLen = b.v * 8
                  return (
                    <g key={b.id}>
                      {/* Velocity arrow */}
                      {Math.abs(arrowLen) > 2 && (
                        <line
                          x1={cx} y1={cy}
                          x2={cx + arrowLen} y2={cy}
                          stroke={b.color} strokeWidth="2" strokeOpacity="0.7"
                          markerEnd={`url(#arrow-${b.id})`}
                        />
                      )}
                      <defs>
                        <marker id={`arrow-${b.id}`} viewBox="0 0 10 10" refX="8" refY="5"
                          markerWidth="6" markerHeight="6" orient="auto">
                          <path d="M0,0 L10,5 L0,10 z" fill={b.color} />
                        </marker>
                      </defs>
                      {/* Ball */}
                      <circle cx={cx} cy={cy} r={rPx} fill={`url(#ball-${b.id})`}
                        stroke={b.color} strokeWidth="1.5" />
                      {/* Mass label */}
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11"
                        fontWeight="bold" fill="#0f172a">{b.m.toFixed(1)}kg</text>
                      {/* Velocity label */}
                      <text x={cx} y={cy - rPx - 8} textAnchor="middle" fontSize="10"
                        fill={b.color}>{b.v.toFixed(1)} m/s</text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* Charts: momentum + KE */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Đồ thị bảo toàn (lý thuyết: phẳng nếu không có lực ngoại)
              </h3>
              <Chart history={history} totalMomentum={totalMomentum} totalKE={totalKE} />
            </div>
          </div>

          {/* Right: Controls + bodies */}
          <div className="space-y-3">
            {/* Controls */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-sm font-bold text-white/80 mb-1">⚙️ Thông số</h3>

              <Slider label="Trọng lực dọc ray (g)" suffix="m/s²"
                value={gravity} min={-9.8} max={9.8} step={0.5}
                onChange={setGravity}
                hint="Mặt phẳng nghiêng → đổi g (vd: 0 = ngang)" />

              <Slider label="Ma sát" suffix="(damping)"
                value={friction} min={0} max={2} step={0.05}
                onChange={setFriction}
                hint="0 = không ma sát · 2 = ma sát rất lớn" />

              <Slider label="Hệ số đàn hồi (e)" suffix=""
                value={restitution} min={0} max={1} step={0.05}
                onChange={setRestitution}
                hint="1 = va chạm đàn hồi · 0 = va chạm dính" />
            </div>

            {/* Bodies list */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white/80">🎯 Vật ({balls.length})</h3>
                <div className="flex gap-1">
                  <button onClick={removeBall} disabled={balls.length <= 2}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30">
                    <Minus className="w-3 h-3" />
                  </button>
                  <button onClick={addBall} disabled={balls.length >= 5}
                    className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-30">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {balls.map((b, i) => (
                <BallEditor key={b.id} ball={b}
                  onChange={(patch) => setBalls((prev) =>
                    prev.map((bb, j) => j === i ? { ...bb, ...patch } : bb)
                  )} />
              ))}
            </div>

            {/* Conservation panel */}
            <div className="rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/25 p-4 space-y-2">
              <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Bảo toàn
              </h3>
              <div className="text-xs space-y-1.5">
                <Row label="Tổng khối lượng" value={`${totalMass.toFixed(2)} kg`} color="text-white/80" />
                <Row label="Tổng động lượng p" value={`${totalMomentum.toFixed(2)} kg·m/s`} color="text-cyan-300" />
                <Row label="Tổng động năng KE" value={`${totalKE.toFixed(2)} J`} color="text-amber-300" />
              </div>
              <p className="text-[10px] text-emerald-200/70 italic">
                Va chạm đàn hồi: p và KE đều bảo toàn · Va chạm dính: chỉ p bảo toàn (KE giảm)
              </p>
            </div>
          </div>
        </div>

        {/* Theory section */}
        <div className="mt-6 rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-5">
          <h3 className="font-bold text-violet-300 mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" /> Lý thuyết
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-white/85 mb-1">📐 Va chạm 1D đàn hồi e ∈ [0, 1]</h4>
              <p className="text-white/55 text-xs leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                v₁' = [(m₁−e·m₂)·v₁ + (1+e)·m₂·v₂] / (m₁+m₂)<br />
                v₂' = [(1+e)·m₁·v₁ + (m₂−e·m₁)·v₂] / (m₁+m₂)
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white/85 mb-1">⚖️ Bảo toàn động lượng (Newton III)</h4>
              <p className="text-white/55 text-xs leading-relaxed">
                Tổng <em>p = Σmᵢvᵢ</em> không đổi trong hệ kín. Va chạm đàn hồi bảo toàn cả KE.
                Va chạm dính (e=0) làm KE giảm → chuyển thành nhiệt/biến dạng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Subcomponents ──────────────────────────────────────────────

function Slider({ label, suffix, value, min, max, step, onChange, hint }: {
  label: string; suffix: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold text-white/70">{label}</label>
        <span className="text-xs font-mono text-cyan-300">{value.toFixed(2)} {suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
      {hint && <p className="text-[10px] text-white/35 mt-0.5">{hint}</p>}
    </div>
  )
}

function BallEditor({ ball, onChange }: {
  ball: Ball
  onChange: (patch: Partial<Ball>) => void
}) {
  return (
    <div className="rounded-lg p-2 border" style={{ borderColor: `${ball.color}40`, background: `${ball.color}08` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full" style={{ background: ball.color }} />
        <span className="font-bold text-xs">Vật {ball.id}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <NumField label="x" value={ball.x} step={0.5} onChange={(v) => onChange({ x: Math.max(0, Math.min(TRACK_LEN, v)) })} />
        <NumField label="v" value={ball.v} step={0.5} onChange={(v) => onChange({ v })} />
        <NumField label="m" value={ball.m} step={0.1} min={0.1} onChange={(v) => onChange({ m: Math.max(0.1, v) })} />
      </div>
    </div>
  )
}

function NumField({ label, value, step, min, onChange }: {
  label: string; value: number; step: number; min?: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-white/40 mb-0.5">{label}</label>
      <input type="number" step={step} min={min} value={value.toFixed(1)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-1.5 py-0.5 text-[11px] bg-white/[0.05] border border-white/[0.1] rounded text-white/85 outline-none focus:border-cyan-500/40" />
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/55">{label}</span>
      <span className={`font-mono font-bold ${color}`}>{value}</span>
    </div>
  )
}

function Chart({ history, totalMomentum, totalKE }: {
  history: Array<{ t: number; p: number; ke: number }>
  totalMomentum: number; totalKE: number
}) {
  if (history.length < 2) {
    return <p className="text-xs text-white/40 italic text-center py-8">Chạy mô phỏng để xem đồ thị...</p>
  }
  const W = 760, H = 140, P = 20
  const ts = history.map((h) => h.t)
  const ps = history.map((h) => h.p)
  const kes = history.map((h) => h.ke)
  const tMin = ts[0], tMax = ts[ts.length - 1]
  const pAbs = Math.max(...ps.map(Math.abs), 1)
  const keMax = Math.max(...kes, 1)

  const xScale = (t: number) => P + ((t - tMin) / Math.max(tMax - tMin, 0.001)) * (W - 2 * P)
  const pYScale = (p: number) => H / 2 - (p / pAbs) * ((H - 2 * P) / 2)
  const keYScale = (k: number) => H - P - (k / keMax) * (H - 2 * P)

  const pPath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xScale(h.t)},${pYScale(h.p)}`).join(' ')
  const kePath = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xScale(h.t)},${keYScale(h.ke)}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <line x1={P} y1={H / 2} x2={W - P} y2={H / 2} stroke="rgba(148,163,184,0.2)" strokeWidth="1" strokeDasharray="3 2" />
      <path d={kePath} stroke="#fbbf24" strokeWidth="1.8" fill="none" />
      <path d={pPath} stroke="#22d3ee" strokeWidth="1.8" fill="none" />
      <g transform={`translate(${W - 180}, ${P - 6})`}>
        <text x="0" y="0" fontSize="10" fill="#22d3ee">— p = {totalMomentum.toFixed(2)}</text>
        <text x="100" y="0" fontSize="10" fill="#fbbf24">— KE = {totalKE.toFixed(2)} J</text>
      </g>
    </svg>
  )
}
