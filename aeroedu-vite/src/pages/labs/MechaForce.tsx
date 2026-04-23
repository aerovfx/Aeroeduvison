/**
 * Định luật Newton — MechaForce Dynamics
 * F_net = F_applied - f_friction,  a = F_net / m
 * Static friction: f_s ≤ μs·N,  Kinetic friction: f_k = μk·N
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, RotateCcw, ChevronLeft, Settings, Zap } from 'lucide-react'

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

function draw(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  state: DynState,
  params: Params,
  vHistory: number[],
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

  // ── Surface ──
  ctx.save()
  ctx.translate(W * 0.08, floorY)
  ctx.rotate(-angle)
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(0, 0, W * 0.82, 12)
  ctx.fillStyle = '#374151'
  ctx.fillRect(0, 12, W * 0.82, 6)
  // grip texture
  ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 1
  for (let i = 0; i < 25; i++) {
    ctx.beginPath()
    ctx.moveTo(i * (W * 0.82 / 25), 0)
    ctx.lineTo(i * (W * 0.82 / 25) + 8, 12)
    ctx.stroke()
  }
  ctx.restore()

  // ── Block ──
  const blockW = 52; const blockH = 44
  const blockBaseX = W * 0.08 + state.x * 80
  const blockX = blockBaseX + (floorY - blockH) * Math.tan(angle) * 0.5
  const blockY = floorY - blockH - 2

  ctx.save()
  ctx.translate(blockX + blockW / 2, blockY + blockH / 2)
  ctx.rotate(-angle)
  // Block body
  const grd = ctx.createLinearGradient(-blockW / 2, -blockH / 2, blockW / 2, blockH / 2)
  grd.addColorStop(0, isMoving ? '#7c3aed' : '#1d4ed8')
  grd.addColorStop(1, isMoving ? '#4c1d95' : '#1e3a8a')
  ctx.fillStyle = grd
  ctx.beginPath(); ctx.roundRect(-blockW / 2, -blockH / 2, blockW, blockH, 5); ctx.fill()
  ctx.strokeStyle = isMoving ? '#a78bfa' : '#60a5fa'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(`${params.mass}kg`, 0, 5)
  ctx.restore()

  // ── Force arrows (in rotated frame) ──
  ctx.save()
  ctx.translate(blockX + blockW / 2, blockY + blockH / 2)
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

  // ── v-t graph ──
  const gX = W * 0.57; const gY = H * 0.06; const gW = W * 0.38; const gH = H * 0.52
  ctx.fillStyle = 'rgba(17,24,39,0.8)'
  ctx.beginPath(); ctx.roundRect(gX, gY, gW, gH, 8); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = '#9ca3af'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left'
  ctx.fillText('Vận tốc v(t)', gX + 8, gY + 18)

  const innerY = gY + 30; const innerH = gH - 38; const N2 = vHistory.length
  const maxV = Math.max(Math.abs(state.v) * 1.5, 2)
  const midG = innerY + innerH / 2

  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(gX + 4, midG); ctx.lineTo(gX + gW - 4, midG); ctx.stroke()
  ctx.fillStyle = '#4b5563'; ctx.font = '9px monospace'
  ctx.fillText(`+${maxV.toFixed(1)}`, gX + 5, innerY + 10)
  ctx.fillText('0', gX + 5, midG + 4)

  if (N2 > 1) {
    ctx.beginPath(); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 2
    vHistory.forEach((v, i) => {
      const px = gX + 4 + (i / Math.max(N2 - 1, 1)) * (gW - 8)
      const py = midG - (v / maxV) * (innerH / 2 - 4)
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    })
    ctx.stroke()
    // Current dot
    const dotX = gX + gW - 8
    const dotY = midG - (state.v / maxV) * (innerH / 2 - 4)
    ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, Math.PI * 2); ctx.fill()
  }

  // ── Readouts ──
  const rX = gX; const rY = gY + gH + 8
  ctx.fillStyle = 'rgba(17,24,39,0.8)'
  ctx.beginPath(); ctx.roundRect(rX, rY, gW, 80, 8); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()

  const fNet = isMoving ? fApplied - fKinetic : 0
  const a    = fNet / params.mass
  const rows = [
    { label: 'v', val: `${state.v.toFixed(3)} m/s`, color: '#a78bfa' },
    { label: 'a', val: `${a.toFixed(3)} m/s²`,      color: '#fbbf24' },
    { label: 'F_net', val: `${fNet.toFixed(2)} N`,   color: '#4ade80' },
    { label: 'x', val: `${state.x.toFixed(3)} m`,    color: '#67e8f9' },
    { label: 'f_s_max', val: `${fMax_s.toFixed(2)} N`, color: '#f87171' },
    { label: 'N', val: `${N.toFixed(2)} N`,           color: '#fde68a' },
  ]
  rows.forEach((r, i) => {
    const col = i % 2; const row = Math.floor(i / 2)
    const tx = rX + 8 + col * (gW / 2); const ty = rY + 16 + row * 20
    ctx.fillStyle = r.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`${r.label}: `, tx, ty)
    ctx.fillStyle = '#e5e7eb'; ctx.font = '11px monospace'
    ctx.fillText(r.val, tx + 55, ty)
  })
}

export default function MechaForceLab() {
  const [params, setParams] = useState<Params>({ mass: 5, force: 20, muStatic: 0.5, muKinetic: 0.35, surfaceAngle: 0 })
  const [running, setRunning] = useState(true)
  const [simTime, setSimTime] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const stateRef  = useRef<DynState>({ x: 0.05, v: 0, t: 0, phase: 'static' })
  const vHistRef  = useRef<number[]>([])
  const runRef    = useRef(true)
  const paramsRef = useRef(params)
  paramsRef.current = params

  const reset = useCallback(() => {
    stateRef.current = { x: 0.05, v: 0, t: 0, phase: 'static' }
    vHistRef.current = []; setSimTime(0)
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
        if (s.phase === 'static') {
          const netForce = p.force - gravity_comp
          if (Math.abs(netForce) > fMax_s) s.phase = 'kinetic'
        }
        if (s.phase === 'kinetic') {
          const friction = s.v >= 0 ? fKin : -fKin
          const fNet = p.force - gravity_comp - friction
          const a = fNet / p.mass
          s.v += a * dt
          s.x += s.v * dt
          if (s.x < 0.05) { s.x = 0.05; s.v = Math.max(0, s.v); s.phase = 'static' }
          if (s.x > 2.5)  { s.x = 0.05; s.v = 0; s.phase = 'static' }
        }
        s.t += dt
        vHistRef.current.push(s.v)
        if (vHistRef.current.length > MAX) vHistRef.current.shift()
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
          <div className="lg:col-span-3 bg-[hsl(260,25%,11%)] rounded-2xl border border-purple-500/20 overflow-hidden">
            <canvas ref={canvasRef} width={780} height={500} className="w-full" style={{ background: 'hsl(260,25%,9%)' }} />
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
