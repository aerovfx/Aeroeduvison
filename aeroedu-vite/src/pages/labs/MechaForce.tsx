/**
 * Định luật Newton — MechaForce Dynamics
 * F_net = F_applied - f_friction,  a = F_net / m
 * Static friction: f_s ≤ μs·N,  Kinetic friction: f_k = μk·N
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, RotateCcw, ChevronLeft, Settings, Zap, Activity } from 'lucide-react'

interface Params {
  mass: number       // kg
  force: number      // N (applied)
  muStatic: number   // μs
  muKinetic: number  // μk
  surfaceAngle: number // degrees
}

interface DynState {
  x: number          // position (m)
  v: number          // velocity (m/s)
  t: number
  phase: 'static' | 'kinetic'
}

const G = 9.81

// History sample for multi-graph analysis
interface HistorySample {
  t: number
  x: number
  v: number
  a: number
  fNet: number
  friction: number
}

function draw(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: DynState,
  params: Params,
  _vHistory: number[],
) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = 'hsl(260,25%,9%)'; ctx.fillRect(0, 0, W, H)

  const floorY = H * 0.62
  const angle  = params.surfaceAngle * Math.PI / 180
  const N      = params.mass * G * Math.cos(angle)
  const fApplied = params.force
  const fMax_s   = params.muStatic  * N
  const fKinetic = params.muKinetic * N
  const isMoving = state.phase === 'kinetic'

  // ── Coordinate system ──
  // Pivot = lower-left corner của slope, slope nghiêng lên góc `angle` về bên phải
  // ctx.rotate(-angle) trong canvas (Y-down) = slope rising up-to-right
  // Slope dir trong WORLD: (cos(angle), -sin(angle))    — along surface
  // Normal lên (vào không khí): (-sin(angle), -cos(angle))
  const pivotX = W * 0.08
  const pivotY = floorY
  const slopeLength = W * 0.82  // local length cũ — vẫn dùng cho drawing slope
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)

  // ── Surface (vẽ slope) ──
  ctx.save()
  ctx.translate(pivotX, pivotY)
  ctx.rotate(-angle)
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, slopeLength, 12)
  ctx.fillStyle = '#374151'
  ctx.fillRect(0, 12, slopeLength, 6)
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1
  for (let i = 0; i < 25; i++) {
    ctx.beginPath()
    ctx.moveTo(i * (slopeLength / 25), 0)
    ctx.lineTo(i * (slopeLength / 25) + 8, 12)
    ctx.stroke()
  }
  ctx.restore()

  // ── Block — FIX: tính vị trí theo slope direction ──
  // FIX bug cũ: blockX chỉ shift horizontal + tan(angle) ad-hoc → block lệch
  // khỏi slope khi angle > 0. Giờ tính đúng:
  //   center = pivot + d × slope_dir + (blockH/2 + 2) × normal_up
  const blockW = 52
  const blockH = 44
  const distAlongSlope = state.x * 80  // px từ pivot
  const liftAboveSurface = blockH / 2 + 2  // block center cao hơn surface

  // World position của block center:
  const blockCenterX = pivotX + distAlongSlope * cosA - liftAboveSurface * sinA
  const blockCenterY = pivotY - distAlongSlope * sinA - liftAboveSurface * cosA

  ctx.save()
  ctx.translate(blockCenterX, blockCenterY)
  ctx.rotate(-angle)
  // Block body — luôn rotate cùng với slope nên block ngồi đúng trên mặt
  const grd = ctx.createLinearGradient(-blockW / 2, -blockH / 2, blockW / 2, blockH / 2)
  grd.addColorStop(0, isMoving ? '#7c3aed' : '#1d4ed8')
  grd.addColorStop(1, isMoving ? '#4c1d95' : '#1e3a8a')
  ctx.fillStyle = grd
  ctx.beginPath(); ctx.roundRect(-blockW / 2, -blockH / 2, blockW, blockH, 5); ctx.fill()
  ctx.strokeStyle = isMoving ? '#a78bfa' : '#60a5fa'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(`${params.mass}kg`, 0, 5)
  ctx.restore()

  // ── Force arrows (in rotated frame around block center) ──
  ctx.save()
  ctx.translate(blockCenterX, blockCenterY)
  ctx.rotate(-angle)
  const arrowScale = 0.7

  // Applied force →
  if (fApplied > 0) {
    const len = fApplied * arrowScale
    ctx.beginPath(); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 3
    ctx.moveTo(blockW / 2, 0); ctx.lineTo(blockW / 2 + len, 0); ctx.stroke()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath(); ctx.moveTo(blockW / 2 + len, 0)
    ctx.lineTo(blockW / 2 + len - 8, -5)
    ctx.lineTo(blockW / 2 + len - 8, 5); ctx.closePath(); ctx.fill()
    ctx.font = '11px monospace'; ctx.fillText(`F=${fApplied}N`, blockW / 2 + len / 2, -8)
  }

  // Friction ← (opposing motion or applied force)
  const fric = isMoving ? fKinetic : Math.min(fApplied, fMax_s)
  if (fric > 0) {
    const flen = fric * arrowScale
    ctx.beginPath(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([4, 3])
    ctx.moveTo(-blockW / 2, 0); ctx.lineTo(-blockW / 2 - flen, 0); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = '#ef4444'
    ctx.beginPath(); ctx.moveTo(-blockW / 2 - flen, 0)
    ctx.lineTo(-blockW / 2 - flen + 8, -5)
    ctx.lineTo(-blockW / 2 - flen + 8, 5); ctx.closePath(); ctx.fill()
    ctx.font = '11px monospace'; ctx.fillText(`f=${fric.toFixed(1)}N`, -blockW / 2 - flen / 2 - 10, -8)
  }

  // Normal ↑
  const normLen = N * arrowScale * 0.4
  ctx.beginPath(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2
  ctx.moveTo(0, -blockH / 2); ctx.lineTo(0, -blockH / 2 - normLen); ctx.stroke()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath(); ctx.moveTo(0, -blockH / 2 - normLen)
  ctx.lineTo(-5, -blockH / 2 - normLen + 8)
  ctx.lineTo(5, -blockH / 2 - normLen + 8); ctx.closePath(); ctx.fill()
  ctx.font = '10px monospace'; ctx.fillText(`N=${N.toFixed(1)}N`, 6, -blockH / 2 - normLen / 2)

  ctx.restore()

  // ── Status badge ──
  const statusX = W * 0.05; const statusY = H * 0.05
  ctx.fillStyle = isMoving ? 'rgba(124,58,237,0.3)' : 'rgba(29,78,216,0.3)'
  ctx.beginPath(); ctx.roundRect(statusX, statusY, 180, 32, 8); ctx.fill()
  ctx.strokeStyle = isMoving ? '#a78bfa' : '#60a5fa'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = isMoving ? '#c4b5fd' : '#93c5fd'
  ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'
  ctx.fillText(isMoving ? '⚡ Chuyển động (kinetic)' : '🔒 Đứng yên (static)', statusX + 10, statusY + 20)

  // (đồ thị đã chuyển ra component MultiGraph React/SVG bên ngoài canvas)
  void N
  void isMoving
  void fApplied
  void fKinetic
  void fMax_s
}

// ─── Multi-graph component: 4 đồ thị phân tích chuyển động/lực ───
// User: "biểu diễn thêm nhiều loại đồ thị khác cho chuyển động ... phân tích chi tiết"
function MultiGraph({ history }: { history: HistorySample[] }) {
  if (history.length < 2) {
    return (
      <div className="rounded-2xl bg-[hsl(260,25%,11%)] border border-purple-500/20 p-8 text-center text-white/40 text-sm italic">
        Chưa có dữ liệu — bấm "Chạy" để bắt đầu mô phỏng
      </div>
    )
  }
  const SUB_W = 360, SUB_H = 180, P = 36
  const ts = history.map((h) => h.t)
  const tMin = ts[0], tMax = ts[ts.length - 1]
  const tRange = Math.max(tMax - tMin, 0.001)
  const xScale = (t: number) => P + ((t - tMin) / tRange) * (SUB_W - 2 * P)

  const renderChart = (
    title: string,
    color: string,
    accessor: (h: HistorySample) => number,
    unit: string,
    centerZero = true,
  ) => {
    const values = history.map(accessor)
    const absMax = Math.max(...values.map(Math.abs), 0.1)
    const yMax = absMax * 1.15
    const yScale = centerZero
      ? (v: number) => SUB_H / 2 - (v / yMax) * (SUB_H - 2 * P) / 2
      : (v: number) => SUB_H - P - ((v + yMax) / (2 * yMax)) * (SUB_H - 2 * P)
    const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'} ${xScale(h.t)},${yScale(accessor(h))}`).join(' ')
    const zeroY = centerZero ? SUB_H / 2 : yScale(0)
    const last = history[history.length - 1]
    return (
      <div className="bg-[hsl(260,25%,11%)] rounded-xl border border-white/[0.08] p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-white/80 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {title}
          </h4>
          <span className="text-[11px] font-mono" style={{ color }}>
            {accessor(last).toFixed(2)} {unit}
          </span>
        </div>
        <svg viewBox={`0 0 ${SUB_W} ${SUB_H}`} className="w-full h-auto">
          {/* Grid */}
          {[0, 0.5, 1].map((t) => (
            <line key={t}
              x1={P} y1={P + (SUB_H - 2 * P) * t}
              x2={SUB_W - P} y2={P + (SUB_H - 2 * P) * t}
              stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
          ))}
          {/* Zero line */}
          <line x1={P} y1={zeroY} x2={SUB_W - P} y2={zeroY}
            stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 3" />
          {/* Y-axis labels */}
          <text x={P - 4} y={P + 8} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">
            +{absMax.toFixed(2)}
          </text>
          <text x={P - 4} y={zeroY + 3} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">
            0
          </text>
          {centerZero && (
            <text x={P - 4} y={SUB_H - P + 8} fontSize="9" fill="rgba(148,163,184,0.55)" textAnchor="end" fontFamily="monospace">
              -{absMax.toFixed(2)}
            </text>
          )}
          {/* X-axis labels (time) */}
          <text x={P} y={SUB_H - 6} fontSize="9" fill="rgba(148,163,184,0.5)" fontFamily="monospace">
            {tMin.toFixed(1)}s
          </text>
          <text x={SUB_W - P} y={SUB_H - 6} fontSize="9" fill="rgba(148,163,184,0.5)" textAnchor="end" fontFamily="monospace">
            {tMax.toFixed(1)}s
          </text>
          {/* Curve */}
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          {/* Current dot */}
          <circle cx={xScale(last.t)} cy={yScale(accessor(last))} r="3" fill={color} />
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Activity className="w-4 h-4 text-purple-400" />
        <h3 className="font-bold text-purple-300 text-sm">Phân tích chuyển động — 4 đồ thị</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderChart('Vị trí x(t)',         '#67e8f9', (h) => h.x,        'm',   false)}
        {renderChart('Vận tốc v(t)',         '#a78bfa', (h) => h.v,        'm/s', true)}
        {renderChart('Gia tốc a(t)',         '#fbbf24', (h) => h.a,        'm/s²', true)}
        {renderChart('Lực tổng F_net(t)',    '#4ade80', (h) => h.fNet,     'N',   true)}
      </div>
    </div>
  )
}

export default function MechaForceLab() {
  const [params, setParams] = useState<Params>({ mass: 5, force: 20, muStatic: 0.5, muKinetic: 0.35, surfaceAngle: 0 })
  const [running, setRunning] = useState(true)
  const [simTime, setSimTime] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const stateRef  = useRef<DynState>({ x: 0.05, v: 0, t: 0, phase: 'static' })
  const vHistRef  = useRef<number[]>([])
  const fullHistRef = useRef<HistorySample[]>([])
  const [, forceRerender] = useState(0)
  const runRef    = useRef(true)
  const paramsRef = useRef(params)
  paramsRef.current = params

  const reset = useCallback(() => {
    stateRef.current = { x: 0.05, v: 0, t: 0, phase: 'static' }
    vHistRef.current = []
    fullHistRef.current = []
    setSimTime(0)
  }, [])

  useEffect(() => { runRef.current = running }, [running])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const MAX = 300

    const loop = () => {
      animRef.current = requestAnimationFrame(loop)
      const s = stateRef.current; const p = paramsRef.current
      const angle  = p.surfaceAngle * Math.PI / 180
      const N      = p.mass * G * Math.cos(angle)
      const fMax_s = p.muStatic * N
      const fKin   = p.muKinetic * N
      const gravity_comp = p.mass * G * Math.sin(angle) // component along slope

      if (runRef.current) {
        const dt = 0.016
        let friction_signed = 0
        let fNet = 0
        let aVal = 0
        if (s.phase === 'static') {
          const netForce = p.force - gravity_comp
          if (Math.abs(netForce) > fMax_s) s.phase = 'kinetic'
          // Khi tĩnh, ma sát = lực đẩy (cân bằng)
          friction_signed = Math.min(Math.abs(netForce), fMax_s) * Math.sign(netForce)
          fNet = 0
          aVal = 0
        }
        if (s.phase === 'kinetic') {
          friction_signed = s.v >= 0 ? fKin : -fKin
          fNet = p.force - gravity_comp - friction_signed
          aVal = fNet / p.mass
          s.v += aVal * dt
          s.x += s.v * dt
          if (s.x < 0.05) { s.x = 0.05; s.v = Math.max(0, s.v); s.phase = 'static' }
          if (s.x > 2.5)  { s.x = 0.05; s.v = 0; s.phase = 'static' }
        }
        s.t += dt
        vHistRef.current.push(s.v)
        if (vHistRef.current.length > MAX) vHistRef.current.shift()
        // Record full history every ~50ms (3 frames @ 60fps) → ~6s cho 200 mẫu
        if (fullHistRef.current.length === 0 ||
            s.t - fullHistRef.current[fullHistRef.current.length - 1].t >= 0.05) {
          fullHistRef.current.push({
            t: s.t, x: s.x, v: s.v, a: aVal, fNet, friction: friction_signed,
          })
          if (fullHistRef.current.length > 240) fullHistRef.current.shift()
          // Trigger React re-render every ~50ms for graph update
          forceRerender((n) => (n + 1) & 0xFFFF)
        }
        setSimTime(s.t)
      }
      draw(ctx, canvas.width, canvas.height, s, p, vHistRef.current)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="mb-6">
          <Link to="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-3 text-sm font-medium transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl">
              <Settings className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MechaForce — Định luật Newton & Ma sát</h1>
              <p className="text-white/50 text-sm">Cơ học · Trung bình · 30 phút · +180 XP</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 overflow-hidden">
              <canvas ref={canvasRef} width={780} height={400} className="w-full" style={{ background: 'hsl(260,25%,9%)' }} />
              <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
                <button onClick={() => setRunning(r => !r)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold transition-colors">
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {running ? 'Dừng' : 'Chạy'}
                </button>
                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <div className="ml-auto text-sm font-mono text-white/60">t = {simTime.toFixed(2)}s</div>
              </div>
            </div>
            {/* MultiGraph: x-t, v-t, a-t, F-t */}
            <MultiGraph history={fullHistRef.current} />
          </div>

          <div className="space-y-4">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2"><Zap className="h-4 w-4" />Thông số</h3>
              {[
                { label: 'Khối lượng m', key: 'mass',       min: 1,  max: 20,  step: 0.5,  unit: 'kg',  val: params.mass },
                { label: 'Lực đẩy F',   key: 'force',      min: 0,  max: 150, step: 1,    unit: 'N',   val: params.force },
                { label: 'μ tĩnh',      key: 'muStatic',   min: 0,  max: 1.5, step: 0.01, unit: '',    val: params.muStatic },
                { label: 'μ động',      key: 'muKinetic',  min: 0,  max: 1.2, step: 0.01, unit: '',    val: params.muKinetic },
                { label: 'Góc mặt phẳng', key: 'surfaceAngle', min: 0, max: 45, step: 1, unit: '°', val: params.surfaceAngle },
              ].map(({ label, key, min, max, step, unit, val }) => (
                <div key={key} className="mb-3">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-purple-300">{val}{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => { setParams(p => ({ ...p, [key]: +e.target.value })); reset() }}
                    className="w-full accent-purple-500" />
                </div>
              ))}
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 p-4">
              <h3 className="text-sm font-bold text-purple-300 mb-3">📐 Công thức</h3>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  ['F_net', `F - f = ma`],
                  ['f_s_max', `μs·N = μs·mg·cos θ`],
                  ['f_k', `μk·N = ${(params.muKinetic * params.mass * G * Math.cos(params.surfaceAngle * Math.PI / 180)).toFixed(1)} N`],
                  ['N', `mg·cos θ = ${(params.mass * G * Math.cos(params.surfaceAngle * Math.PI / 180)).toFixed(1)} N`],
                ].map(([sym, val]) => (
                  <div key={sym as string} className="bg-white/5 rounded-lg p-2">
                    <span className="text-purple-400">{sym} = </span>
                    <span className="text-white/80">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
