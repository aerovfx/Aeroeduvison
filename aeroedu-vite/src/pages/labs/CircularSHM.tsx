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
// User: "tạo 2 hình chiếu lên Ox và Oy" + reference GIF phasor + wave với
// I=cos, Q=sin, I+Q sum, phase indicator theo độ (0°→720°)
type Projection = 'cos' | 'sin' | 'both' | 'sum'

const PROJECTION_META: Record<Projection, { label: string; formula: string; color: string }> = {
  cos: {
    label: 'Ox: I = cos',
    color: '#3b82f6',
    formula: 'I(\\theta) = A\\cos(\\theta + \\varphi)',
  },
  sin: {
    label: 'Oy: Q = sin',
    color: '#ef4444',
    formula: 'Q(\\theta) = A\\sin(\\theta + \\varphi)',
  },
  both: {
    label: 'I + Q (2 trục)',
    color: '#a855f7',
    formula: 'I = A\\cos(\\theta),\\quad Q = A\\sin(\\theta)',
  },
  sum: {
    label: 'I + Q (tổng)',
    color: '#22c55e',
    formula: 'I + Q = A[\\cos(\\theta) + \\sin(\\theta)] = A\\sqrt{2}\\cos(\\theta - \\tfrac{\\pi}{4})',
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

      // ── X-axis trong ĐỘ (0° → 720°) — reference GIF style ──
      // Mỗi pixel ngang = 720° / waveWidth
      const DEG_TOTAL = 720
      const pxPerDeg = waveWidth / DEG_TOTAL
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px ui-monospace, monospace'
      // Major ticks every 180° (0, 180, 360, 540, 720)
      for (let deg = 0; deg <= DEG_TOTAL; deg += 180) {
        const px = waveStartX + deg * pxPerDeg
        ctx.beginPath()
        ctx.moveTo(px, waveCenterY - 5)
        ctx.lineTo(px, waveCenterY + 5)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.textAlign = 'center'
        ctx.fillText(`${deg}°`, px, waveCenterY + 18)
      }
      // Minor ticks every 90°
      for (let deg = 90; deg < DEG_TOTAL; deg += 180) {
        const px = waveStartX + deg * pxPerDeg
        ctx.beginPath()
        ctx.moveTo(px, waveCenterY - 3)
        ctx.lineTo(px, waveCenterY + 3)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Amplitude markers ±A
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(waveStartX, waveCenterY - A); ctx.lineTo(W - 10, waveCenterY - A)
      ctx.moveTo(waveStartX, waveCenterY + A); ctx.lineTo(W - 10, waveCenterY + A)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.textAlign = 'right'
      ctx.fillText('+A', waveStartX - 6, waveCenterY - A + 4)
      ctx.fillText('-A', waveStartX - 6, waveCenterY + A + 4)
      ctx.fillText('0',  waveStartX - 6, waveCenterY + 4)
      ctx.textAlign = 'left'

      // ── Y-axis label "Amplitude" ──
      ctx.save()
      ctx.translate(waveStartX - 32, waveCenterY)
      ctx.rotate(-Math.PI / 2)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Amplitude', 0, 0)
      ctx.restore()
      // X-axis label
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('Phase (degree)', waveStartX + waveWidth / 2, waveCenterY + 34)

      // ── Draw waves PARAMETRIC từ 0° → 720° ──
      // Vẽ statically dựa trên phase, không phải scroll trail
      function drawWave(amp: number, color: string, phaseFn: (deg: number) => number, lineWidth = 2.5) {
        ctx!.beginPath()
        for (let d = 0; d <= DEG_TOTAL; d += 1) {
          const px = waveStartX + d * pxPerDeg
          const val = phaseFn(d) * amp
          const py = waveCenterY - val
          if (d === 0) ctx!.moveTo(px, py)
          else ctx!.lineTo(px, py)
        }
        ctx!.strokeStyle = color
        ctx!.lineWidth = lineWidth
        ctx!.stroke()
      }
      const phaseRad = phase  // initial phase from slider

      // I = cos (xanh dương, mảnh)
      if (projection === 'cos' || projection === 'both' || projection === 'sum') {
        drawWave(A, projection === 'cos' ? '#3b82f6' : 'rgba(59,130,246,0.55)',
          (d) => Math.cos(d * Math.PI / 180 + phaseRad),
          projection === 'cos' ? 2.5 : 1.5)
      }
      // Q = sin (đỏ, mảnh)
      if (projection === 'sin' || projection === 'both' || projection === 'sum') {
        drawWave(A, projection === 'sin' ? '#ef4444' : 'rgba(239,68,68,0.55)',
          (d) => Math.sin(d * Math.PI / 180 + phaseRad),
          projection === 'sin' ? 2.5 : 1.5)
      }
      // I+Q sum (xanh lá, đậm) chỉ ở mode 'sum'
      if (projection === 'sum') {
        ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 6
        drawWave(A, '#22c55e',
          (d) => Math.cos(d * Math.PI / 180 + phaseRad) + Math.sin(d * Math.PI / 180 + phaseRad),
          3)
        ctx.shadowBlur = 0
      }

      // ── Phase indicator line: vertical drop từ current angle ──
      // Reference GIF: vertical arrow shown at current phase showing the value
      // Calculate current phase mod 720
      const currentPhaseDeg = ((angle * 180 / Math.PI) % DEG_TOTAL + DEG_TOTAL) % DEG_TOTAL
      const phasePx = waveStartX + currentPhaseDeg * pxPerDeg
      const projColor = projection === 'cos' ? '#3b82f6'
                     : projection === 'sin' ? '#ef4444'
                     : projection === 'sum' ? '#22c55e' : '#a855f7'
      const projValue = projection === 'cos' ? Math.cos(angle)
                      : projection === 'sin' ? Math.sin(angle)
                      : projection === 'sum' ? (Math.cos(angle) + Math.sin(angle)) / Math.sqrt(2)
                      : Math.cos(angle)
      // Vertical phase line
      ctx.beginPath()
      ctx.moveTo(phasePx, waveCenterY)
      ctx.lineTo(phasePx, waveCenterY - projValue * A)
      ctx.strokeStyle = projColor
      ctx.lineWidth = 1.8
      ctx.stroke()
      // Arrow head pointing to the dot
      const arrowDir = projValue >= 0 ? -1 : 1
      ctx.beginPath()
      ctx.moveTo(phasePx, waveCenterY - projValue * A)
      ctx.lineTo(phasePx - 4, waveCenterY - projValue * A + arrowDir * 8)
      ctx.lineTo(phasePx + 4, waveCenterY - projValue * A + arrowDir * 8)
      ctx.closePath()
      ctx.fillStyle = projColor
      ctx.fill()
      // Current value dot
      ctx.beginPath()
      ctx.arc(phasePx, waveCenterY - projValue * A, 5, 0, Math.PI * 2)
      ctx.fillStyle = projColor
      ctx.shadowColor = projColor
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      // Phase label "phase = X°"
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      const labelX = Math.min(phasePx + 8, W - 90)
      ctx.fillText(`θ = ${currentPhaseDeg.toFixed(0)}°`, labelX, waveCenterY - A - 8)

      // ── For 'both' mode: also draw secondary phase dot ──
      if (projection === 'both') {
        // Cos dot (blue)
        ctx.beginPath()
        ctx.arc(phasePx, waveCenterY - Math.cos(angle) * A, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#3b82f6'
        ctx.shadowColor = '#3b82f6'
        ctx.shadowBlur = 10
        ctx.fill()
        // Sin dot (red)
        ctx.beginPath()
        ctx.arc(phasePx, waveCenterY - Math.sin(angle) * A, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#ef4444'
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // ── Legend top-left of wave ──
      const legendX = waveStartX + 10
      const legendY = waveCenterY - A - 30
      ctx.fillStyle = 'rgba(10,10,20,0.7)'
      ctx.fillRect(legendX, legendY - 14, 220, 22)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.strokeRect(legendX, legendY - 14, 220, 22)
      // I marker
      ctx.strokeStyle = projection === 'cos' || projection === 'both' || projection === 'sum' ? '#3b82f6' : 'rgba(59,130,246,0.3)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(legendX + 6, legendY); ctx.lineTo(legendX + 22, legendY); ctx.stroke()
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillText('I', legendX + 28, legendY + 4)
      // Q marker
      ctx.strokeStyle = projection === 'sin' || projection === 'both' || projection === 'sum' ? '#ef4444' : 'rgba(239,68,68,0.3)'
      ctx.beginPath(); ctx.moveTo(legendX + 50, legendY); ctx.lineTo(legendX + 66, legendY); ctx.stroke()
      ctx.fillText('Q', legendX + 72, legendY + 4)
      // I+Q marker (sum mode)
      if (projection === 'sum') {
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(legendX + 94, legendY); ctx.lineTo(legendX + 110, legendY); ctx.stroke()
        ctx.fillText('I + Q', legendX + 116, legendY + 4)
      }
      // Suppress unused warning for trail arrays
      void MAX_TRAIL
      void PIX_PER_SEC

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
