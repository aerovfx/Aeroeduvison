/**
 * CircularSHM — Mô phỏng sự tương tự giữa chuyển động tròn đều và
 * dao động điều hoà (SHM = hình chiếu của chuyển động tròn lên 1 trục).
 *
 * Route: /dashboard/labtwin/circular-shm
 *
 * User: "thêm giả lập mô phỏng sự tương tự giữa chuyển động tròn và
 * dao động điều hoà. Thiết kế giao diện tương tự fourier-epicycles"
 *
 * Visualization:
 *   - Trái: vòng tròn quay đều với 1 chất điểm (M) chạy quanh
 *   - Hình chiếu M xuống trục x = chất điểm dao động (x = A·cos(ωt))
 *   - Phải: đồ thị x(t) trace ra hàm cos theo thời gian
 *   - Dashed line connector từ M tới wave start
 *   - Vector vận tốc (tiếp tuyến) + gia tốc (hướng tâm) tùy chọn
 *
 * Pedagogy: chứng minh trực quan SHM = hình chiếu uniform circular motion.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, Home, Activity, Eye, EyeOff } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// ── Projection types ─────────────────────────────────────────────
type Projection = 'cos' | 'sin' | 'both'

const PROJECTION_META: Record<Projection, { label: string; formula: string; color: string }> = {
  cos: {
    label: 'Trục x (cos)',
    color: '#06b6d4',
    formula: 'x(t) = A\\cos(\\omega t + \\varphi)',
  },
  sin: {
    label: 'Trục y (sin)',
    color: '#f59e0b',
    formula: 'y(t) = A\\sin(\\omega t + \\varphi)',
  },
  both: {
    label: 'Cả 2 trục',
    color: '#a855f7',
    formula: '\\vec{r}(t) = A(\\cos(\\omega t + \\varphi),\\, \\sin(\\omega t + \\varphi))',
  },
}

// KaTeX renderer
function Tex({ formula, displayMode = false }: { formula: string; displayMode?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current) {
      try { katex.render(formula, ref.current, { displayMode, throwOnError: false }) }
      catch { /* ignore */ }
    }
  }, [formula, displayMode])
  return <span ref={ref} />
}

export default function CircularSHM() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(performance.now())
  const elapsedRef = useRef(0)
  const trailRef = useRef<number[]>([])
  const trailYRef = useRef<number[]>([])
  const pausedRef = useRef(false)

  const [projection, setProjection] = useState<Projection>('cos')
  const [A, setA] = useState(80)           // biên độ pixel (radius)
  const [omegaUI, setOmegaUI] = useState(1.5) // tần số góc (rad/s)
  const [phaseDeg, setPhaseDeg] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [showVectors, setShowVectors] = useState(true)
  const [showRefLine, setShowRefLine] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => { pausedRef.current = paused }, [paused])

  const resetTrail = useCallback(() => {
    trailRef.current = []
    trailYRef.current = []
    elapsedRef.current = 0
    startTimeRef.current = performance.now()
  }, [])

  // Reset trail khi đổi params
  useEffect(() => { resetTrail() }, [A, omegaUI, phaseDeg, projection, resetTrail])

  // ── Main RAF loop ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTs = performance.now()

    function resize() {
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    function render() {
      if (!canvas || !ctx) return
      const now = performance.now()
      const dt = (now - lastTs) / 1000
      lastTs = now
      if (!pausedRef.current) {
        elapsedRef.current += dt * speed
      }
      const t = elapsedRef.current
      const phase = phaseDeg * Math.PI / 180
      const angle = omegaUI * t + phase  // current angle on circle

      const W = canvas.clientWidth
      const H = canvas.clientHeight

      // Clear
      ctx.fillStyle = '#05070d'
      ctx.fillRect(0, 0, W, H)

      // Layout
      const circleCenterX = Math.min(W * 0.22, 250)
      const circleCenterY = H * 0.5
      const waveStartX = circleCenterX + A + 60
      const waveWidth = W - waveStartX - 30
      const waveCenterY = H * 0.5
      const MAX_TRAIL = Math.max(800, Math.floor(waveWidth * 2))
      const PIX_PER_SEC = 60  // x-axis scale

      const meta = PROJECTION_META[projection]
      const accentColor = meta.color

      // ── Draw circle (unit circle reference) ──
      ctx.beginPath()
      ctx.arc(circleCenterX, circleCenterY, A, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Inner reference circles (mark angles every 30°)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      for (let r = A * 0.25; r < A; r += A * 0.25) {
        ctx.beginPath()
        ctx.arc(circleCenterX, circleCenterY, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Cross axes
      ctx.beginPath()
      ctx.moveTo(circleCenterX - A - 15, circleCenterY)
      ctx.lineTo(circleCenterX + A + 15, circleCenterY)
      ctx.moveTo(circleCenterX, circleCenterY - A - 15)
      ctx.lineTo(circleCenterX, circleCenterY + A + 15)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('x', circleCenterX + A + 18, circleCenterY + 4)
      ctx.textAlign = 'center'
      ctx.fillText('y', circleCenterX, circleCenterY - A - 18)

      // ── Particle M on circle ──
      const Mx = circleCenterX + Math.cos(angle) * A
      const My = circleCenterY - Math.sin(angle) * A  // canvas Y inverted

      // Radius vector (from origin to M)
      ctx.beginPath()
      ctx.moveTo(circleCenterX, circleCenterY)
      ctx.lineTo(Mx, My)
      ctx.strokeStyle = `${accentColor}aa`
      ctx.lineWidth = 2
      ctx.stroke()

      // ── Projection lines (dashed) ──
      if (projection === 'cos' || projection === 'both') {
        ctx.beginPath()
        ctx.moveTo(Mx, My)
        ctx.lineTo(Mx, circleCenterY)
        ctx.strokeStyle = '#06b6d4aa'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        // Projection dot on x-axis
        ctx.beginPath()
        ctx.arc(Mx, circleCenterY, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#06b6d4'
        ctx.shadowColor = '#06b6d4'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
      if (projection === 'sin' || projection === 'both') {
        ctx.beginPath()
        ctx.moveTo(Mx, My)
        ctx.lineTo(circleCenterX, My)
        ctx.strokeStyle = '#f59e0baa'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
        // Projection dot on y-axis
        ctx.beginPath()
        ctx.arc(circleCenterX, My, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Velocity vector (tangent) — perpendicular to radius ──
      if (showVectors) {
        const vMag = A * omegaUI * 0.4  // scaled for display
        const vx = -Math.sin(angle) * vMag
        const vy = -Math.cos(angle) * vMag  // canvas Y inverted (negative for -sin)
        ctx.beginPath()
        ctx.moveTo(Mx, My)
        ctx.lineTo(Mx + vx, My + vy)
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 2
        ctx.stroke()
        // Arrow head
        drawArrowHead(ctx, Mx + vx, My + vy, Math.atan2(vy, vx), 8, '#22c55e')
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 10px ui-monospace, monospace'
        ctx.fillText('v', Mx + vx + 6, My + vy + 4)

        // Acceleration vector (centripetal — toward center)
        const aMag = A * omegaUI * omegaUI * 0.08
        const ax = (circleCenterX - Mx) / A * aMag
        const ay = (circleCenterY - My) / A * aMag
        ctx.beginPath()
        ctx.moveTo(Mx, My)
        ctx.lineTo(Mx + ax, My + ay)
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.stroke()
        drawArrowHead(ctx, Mx + ax, My + ay, Math.atan2(ay, ax), 7, '#ef4444')
        ctx.fillStyle = '#ef4444'
        ctx.fillText('a', Mx + ax + 6, My + ay + 4)
      }

      // ── Main particle M on circle ──
      ctx.beginPath()
      ctx.arc(Mx, My, 7, 0, Math.PI * 2)
      ctx.fillStyle = accentColor
      ctx.shadowColor = accentColor
      ctx.shadowBlur = 16
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('M', Mx, My - 12)

      // ── Update trail ──
      if (!pausedRef.current) {
        const xVal = Math.cos(angle) * A   // x-projection in pixels
        const yVal = Math.sin(angle) * A   // y-projection
        trailRef.current.unshift(xVal)
        trailYRef.current.unshift(yVal)
        if (trailRef.current.length > MAX_TRAIL) {
          trailRef.current.length = MAX_TRAIL
          trailYRef.current.length = MAX_TRAIL
        }
      }

      // ── Reference line from M to wave start ──
      if (showRefLine && projection === 'cos') {
        ctx.beginPath()
        ctx.moveTo(Mx, circleCenterY)  // x-projection point
        ctx.lineTo(waveStartX, circleCenterY - Math.cos(angle) * A)
        ctx.strokeStyle = '#06b6d488'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
      } else if (showRefLine && projection === 'sin') {
        ctx.beginPath()
        ctx.moveTo(circleCenterX, My)
        ctx.lineTo(waveStartX, circleCenterY - Math.sin(angle) * A)
        ctx.strokeStyle = '#f59e0b88'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 5])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // ── Wave axis ──
      ctx.beginPath()
      ctx.moveTo(waveStartX, waveCenterY)
      ctx.lineTo(W - 10, waveCenterY)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Y axis at wave start
      ctx.beginPath()
      ctx.moveTo(waveStartX, waveCenterY - A - 20)
      ctx.lineTo(waveStartX, waveCenterY + A + 20)
      ctx.stroke()

      // Time labels on x axis (T/4, T/2, ...)
      const T = (2 * Math.PI) / omegaUI  // period
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '11px ui-monospace, monospace'
      for (let k = 1; k * (T / 4) * PIX_PER_SEC < waveWidth; k++) {
        const px = waveStartX + k * (T / 4) * PIX_PER_SEC
        if (px > W - 30) break
        ctx.beginPath()
        ctx.moveTo(px, waveCenterY - 4)
        ctx.lineTo(px, waveCenterY + 4)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.stroke()
        if (k % 2 === 0) {
          ctx.fillText(`${k / 4}T`, px - 8, waveCenterY + 16)
        }
      }

      // Amplitude markers ±A
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(waveStartX, waveCenterY - A); ctx.lineTo(W - 10, waveCenterY - A)
      ctx.moveTo(waveStartX, waveCenterY + A); ctx.lineTo(W - 10, waveCenterY + A)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText('+A', waveStartX - 22, waveCenterY - A + 4)
      ctx.fillText('-A', waveStartX - 22, waveCenterY + A + 4)

      // ── Draw wave (cos / sin / both) ──
      function drawTrail(arr: number[], color: string) {
        if (arr.length < 2) return
        ctx!.beginPath()
        for (let i = 0; i < arr.length; i++) {
          const px = waveStartX + i * (1 / PIX_PER_SEC) * PIX_PER_SEC / speed * (60 / 60) * (1000 / 1000)
          // Simpler: px = waveStartX + i * (speed/60) * PIX_PER_SEC ... use approx
          const pxSimple = waveStartX + i * 1.0  // 1 px per frame
          const val = -arr[i]  // canvas Y inverted
          if (pxSimple > W - 10) break
          if (i === 0) ctx!.moveTo(pxSimple, waveCenterY + val)
          else ctx!.lineTo(pxSimple, waveCenterY + val)
        }
        ctx!.strokeStyle = color
        ctx!.shadowColor = color
        ctx!.shadowBlur = 8
        ctx!.lineWidth = 2.5
        ctx!.stroke()
        ctx!.shadowBlur = 0
      }
      if (projection === 'cos' || projection === 'both') {
        drawTrail(trailRef.current, '#06b6d4')
      }
      if (projection === 'sin' || projection === 'both') {
        drawTrail(trailYRef.current, '#f59e0b')
      }

      // Current value dot on wave
      if (projection === 'cos' || projection === 'both') {
        const px = waveStartX + 1
        const py = waveCenterY - Math.cos(angle) * A
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#06b6d4'
        ctx.shadowColor = '#06b6d4'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }
      if (projection === 'sin' || projection === 'both') {
        const px = waveStartX + 1
        const py = waveCenterY - Math.sin(angle) * A
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#f59e0b'
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Labels for circular motion side
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = 'bold 11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Chuyển động tròn đều', circleCenterX - A, circleCenterY + A + 35)
      ctx.fillText('Dao động điều hoà', waveStartX, waveCenterY + A + 35)

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [A, omegaUI, phaseDeg, projection, speed, showVectors, showRefLine])

  const meta = PROJECTION_META[projection]
  const period = (2 * Math.PI) / omegaUI
  const frequency = 1 / period

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#05070d', color: '#fff' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />

      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 bg-[#05070d]/95 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard/labtwin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">LabTwin</span>
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all">
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-white/10 mx-1" />
        <Activity className="h-4 w-4" style={{ color: meta.color }} />
        <span className="text-sm font-semibold truncate">Tròn ↔ Dao động điều hoà</span>
        <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: meta.color, borderColor: `${meta.color}50`, background: `${meta.color}15` }}>
          Vật lý · Sóng
        </span>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center gap-3 bg-[#0a0a14]">
        {/* Projection tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
          {(Object.entries(PROJECTION_META) as [Projection, typeof PROJECTION_META[Projection]][]).map(([key, p]) => (
            <button key={key} onClick={() => setProjection(key)}
              className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
              style={{
                color: projection === key ? '#fff' : 'rgba(255,255,255,0.5)',
                background: projection === key ? p.color : 'transparent',
                boxShadow: projection === key ? `0 2px 12px ${p.color}80` : 'none',
              }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Amplitude */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Biên độ A</label>
          <input type="range" min={20} max={140} step={5} value={A}
            onChange={e => setA(Number(e.target.value))}
            className="w-24 accent-cyan-400" />
          <span className="text-xs font-mono font-bold w-12 text-right" style={{ color: meta.color }}>
            {A}px
          </span>
        </div>

        {/* Omega */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">ω</label>
          <input type="range" min={0.3} max={5} step={0.1} value={omegaUI}
            onChange={e => setOmegaUI(Number(e.target.value))}
            className="w-24 accent-cyan-400" />
          <span className="text-xs font-mono font-bold w-16 text-right" style={{ color: meta.color }}>
            {omegaUI.toFixed(1)} rad/s
          </span>
        </div>

        {/* Phase */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">φ</label>
          <input type="range" min={0} max={360} step={10} value={phaseDeg}
            onChange={e => setPhaseDeg(Number(e.target.value))}
            className="w-20 accent-purple-400" />
          <span className="text-xs font-mono font-bold w-10 text-right text-purple-300">
            {phaseDeg}°
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tốc độ</label>
          <input type="range" min={0.1} max={3} step={0.1} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-20 accent-amber-400" />
          <span className="text-xs font-mono font-bold w-10 text-right text-amber-300">
            {speed.toFixed(1)}×
          </span>
        </div>

        {/* Toggles */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showVectors} onChange={e => setShowVectors(e.target.checked)}
            className="accent-emerald-400" />
          <span className="text-white/70">Vector v·a</span>
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input type="checkbox" checked={showRefLine} onChange={e => setShowRefLine(e.target.checked)}
            className="accent-cyan-400" />
          <span className="text-white/70">{showRefLine ? <Eye className="inline h-3 w-3" /> : <EyeOff className="inline h-3 w-3" />} Đường chiếu</span>
        </label>

        <button onClick={() => setPaused(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
          style={{
            color: paused ? '#22c55e' : '#f59e0b',
            borderColor: paused ? '#22c55e60' : '#f59e0b60',
            background: paused ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
          }}>
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Tiếp tục' : 'Tạm dừng'}
        </button>

        <button onClick={resetTrail}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Formula overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg backdrop-blur-md max-w-[92%]"
          style={{
            background: 'rgba(10,10,20,0.78)',
            border: `1px solid ${meta.color}40`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 32px ${meta.color}20`,
          }}>
          <div className="text-[10px] uppercase tracking-[0.25em] mb-1.5 text-center" style={{ color: meta.color }}>
            Hình chiếu trên trục — {meta.label}
          </div>
          <div className="text-white text-sm text-center">
            <Tex formula={meta.formula} displayMode />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 text-[10px] text-white/70 font-mono text-center">
            <div>T = 2π/ω ≈ <span className="text-white font-bold">{period.toFixed(2)} s</span></div>
            <div>f = 1/T ≈ <span className="text-white font-bold">{frequency.toFixed(2)} Hz</span></div>
            <div>A = <span className="text-white font-bold">{A}px</span></div>
          </div>
        </div>

        {/* Legend top-right */}
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg backdrop-blur"
          style={{ background: 'rgba(10,10,20,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1.5">Ký hiệu</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              <span className="text-white/70">M — chất điểm trên vòng tròn</span>
            </div>
            {showVectors && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-400" />
                  <span className="text-white/70">v — vận tốc tiếp tuyến</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-rose-500" />
                  <span className="text-white/70">a — gia tốc hướng tâm</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5" style={{ background: '#06b6d4', boxShadow: '0 0 4px #06b6d4' }} />
              <span className="text-white/70">x(t) = A cos(ωt)</span>
            </div>
            {projection === 'both' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5" style={{ background: '#f59e0b' }} />
                <span className="text-white/70">y(t) = A sin(ωt)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider">
        <span>💡 SHM = Hình chiếu của chuyển động tròn đều lên 1 trục (Galileo · 1638)</span>
        <Link to="/dashboard/labtwin" className="text-cyan-400/60 hover:text-cyan-300 transition">
          ← Các phòng lab khác
        </Link>
      </div>
    </div>
  )
}

// Helper: arrow head
function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size / 2)
  ctx.lineTo(-size, size / 2)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}
