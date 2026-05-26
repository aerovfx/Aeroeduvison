/**
 * FourierEpicycles — Phân tích chuỗi Fourier bằng các vòng quay epicycle
 *
 * Route: /dashboard/labtwin/labs/fourier-epicycles
 *
 * User ref: ảnh @fourier_borel · mathswithmuza — square wave Fourier series
 * công thức f(x) = (4/π) Σ (1/(2n-1)) sin((2n-1)x)
 *
 * Visualization:
 *   - Top: epicycles xoay quanh nhau (mỗi sóng harmonic = 1 vòng)
 *   - Đuôi cánh tay vẽ ra waveform real-time
 *   - Đường y=value extended sang phải hiển thị wave tích lũy
 *
 * Mục đích: HS thấy được "chuỗi Fourier" thực sự "vẽ" được sóng vuông/răng
 *           cưa/tam giác từ tổng các sóng sin đơn giản.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, Home, Sparkles } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// ── Wave presets — mỗi preset là 1 fn(n) → [amplitude, frequency, phase] ──
type WaveType = 'square' | 'sawtooth' | 'triangle' | 'pulse'

interface Harmonic {
  amp: number      // bán kính vòng (= biên độ sóng harmonic)
  freq: number     // tần số (chu kỳ/s khi t đếm như radian)
  phase: number    // pha ban đầu
}

const WAVE_PRESETS: Record<WaveType, { label: string; gen: (N: number) => Harmonic[]; color: string; formula: string }> = {
  square: {
    label: 'Sóng vuông',
    color: '#06b6d4',
    formula: 'f(x) = \\frac{4}{\\pi} \\sum_{n=1}^{\\infty} \\frac{1}{2n-1} \\sin\\bigl((2n-1)x\\bigr)',
    gen: (N) => Array.from({ length: N }, (_, i) => {
      const k = 2 * i + 1
      return { amp: (4 / Math.PI) * (1 / k), freq: k, phase: 0 }
    }),
  },
  sawtooth: {
    label: 'Sóng răng cưa',
    color: '#f59e0b',
    formula: 'f(x) = \\frac{2}{\\pi} \\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1}}{n} \\sin(nx)',
    gen: (N) => Array.from({ length: N }, (_, i) => {
      const n = i + 1
      const sign = (i % 2 === 0) ? 1 : -1
      return { amp: (2 / Math.PI) * (sign / n), freq: n, phase: 0 }
    }),
  },
  triangle: {
    label: 'Sóng tam giác',
    color: '#a855f7',
    formula: 'f(x) = \\frac{8}{\\pi^2} \\sum_{n=0}^{\\infty} \\frac{(-1)^n}{(2n+1)^2} \\sin\\bigl((2n+1)x\\bigr)',
    gen: (N) => Array.from({ length: N }, (_, i) => {
      const k = 2 * i + 1
      const sign = (i % 2 === 0) ? 1 : -1
      return { amp: (8 / (Math.PI * Math.PI)) * (sign / (k * k)), freq: k, phase: 0 }
    }),
  },
  pulse: {
    label: 'Xung hẹp',
    color: '#ec4899',
    formula: 'f(x) = \\frac{2d}{T} + \\sum_{n=1}^{\\infty} \\frac{2}{n\\pi} \\sin\\!\\Bigl(\\frac{n\\pi d}{T}\\Bigr) \\cos(n\\omega x)',
    gen: (N) => Array.from({ length: N }, (_, i) => {
      const n = i + 1
      // Pulse with d=T/4 — approximation cho viz
      return { amp: (2 / (n * Math.PI)) * Math.sin(n * Math.PI / 4), freq: n, phase: 0 }
    }),
  },
}

// KaTeX renderer
function Tex({ formula, displayMode = false }: { formula: string; displayMode?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(formula, ref.current, { displayMode, throwOnError: false })
      } catch {
        /* ignore */
      }
    }
  }, [formula, displayMode])
  return <span ref={ref} />
}

export default function FourierEpicyclesLab() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef(performance.now())
  const elapsedRef = useRef(0)
  const trailRef = useRef<number[]>([])
  const pausedRef = useRef(false)

  const [waveType, setWaveType] = useState<WaveType>('square')
  const [N, setN] = useState(8)
  const [speed, setSpeed] = useState(1)
  const [showCircles, setShowCircles] = useState(true)
  const [paused, setPaused] = useState(false)

  // sync paused → ref (cho RAF loop)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const resetTrail = useCallback(() => {
    trailRef.current = []
    elapsedRef.current = 0
    startTimeRef.current = performance.now()
  }, [])

  // Re-init trail khi đổi N hoặc waveType
  useEffect(() => { resetTrail() }, [N, waveType, resetTrail])

  // ── Main RAF loop ────────────────────────────────────────────────
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

      const W = canvas.clientWidth
      const H = canvas.clientHeight

      // Clear
      ctx.fillStyle = '#05070d'
      ctx.fillRect(0, 0, W, H)

      // Layout
      const epiCenterX = Math.min(W * 0.25, 280)
      const epiCenterY = H * 0.5
      const waveStartX = epiCenterX + 100
      const waveWidth = W - waveStartX - 30
      const waveCenterY = H * 0.5
      const MAX_TRAIL = Math.max(600, Math.floor(waveWidth * 2))

      // Compute epicycle positions
      const harmonics = WAVE_PRESETS[waveType].gen(N)
      // Scale amp so sum of amps fits within ~110px max
      const ampSum = harmonics.reduce((s, h) => s + Math.abs(h.amp), 0)
      const ampScale = ampSum > 0 ? Math.min(110, H * 0.3) / ampSum : 1

      let x = epiCenterX
      let y = epiCenterY
      const arms: { x: number; y: number; r: number }[] = [{ x, y, r: 0 }]

      for (let i = 0; i < harmonics.length; i++) {
        const h = harmonics[i]
        const r = Math.abs(h.amp) * ampScale
        const sign = h.amp >= 0 ? 1 : -1
        const angle = sign * (h.freq * t + h.phase)
        // sin component → y, cos component → x (giống ảnh user: tip vẽ theo trục y)
        x += Math.cos(angle) * r
        y += Math.sin(angle) * r
        arms.push({ x, y, r })
      }

      // ── Draw epicycles ──
      if (showCircles) {
        for (let i = 0; i < arms.length - 1; i++) {
          const a = arms[i]
          const b = arms[i + 1]
          const r = arms[i + 1].r
          if (r < 1) continue

          // Circle
          ctx.beginPath()
          ctx.arc(a.x, a.y, r, 0, Math.PI * 2)
          ctx.strokeStyle = `hsla(${(i * 50) % 360}, 70%, 65%, 0.4)`
          ctx.lineWidth = 1
          ctx.stroke()

          // Arm
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = `hsla(${(i * 50) % 360}, 80%, 70%, 0.75)`
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Joint dot
          ctx.beginPath()
          ctx.arc(b.x, b.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = `hsl(${(i * 50) % 360}, 90%, 70%)`
          ctx.fill()
        }
      }

      // Tip (last arm endpoint)
      const tip = arms[arms.length - 1]

      // ── Update trail ──
      if (!pausedRef.current) {
        trailRef.current.unshift(tip.y - epiCenterY)
        if (trailRef.current.length > MAX_TRAIL) {
          trailRef.current.length = MAX_TRAIL
        }
      }

      // ── Draw connector line from tip to waveStartX ──
      const waveColor = WAVE_PRESETS[waveType].color
      ctx.beginPath()
      ctx.moveTo(tip.x, tip.y)
      ctx.lineTo(waveStartX, tip.y)
      ctx.strokeStyle = `${waveColor}aa`
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // ── Draw wave from trail ──
      if (trailRef.current.length > 1) {
        ctx.beginPath()
        const trail = trailRef.current
        // ipm: pixels-per-trail-sample — speed in space (depend on freq)
        const ipm = 1
        for (let i = 0; i < trail.length; i++) {
          const px = waveStartX + i * ipm
          if (px > W - 10) break
          const py = waveCenterY + trail[i]
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.strokeStyle = waveColor
        ctx.shadowColor = waveColor
        ctx.shadowBlur = 8
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // ── Tip dot ──
      ctx.beginPath()
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = waveColor
      ctx.shadowColor = waveColor
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.shadowBlur = 0

      // ── Axes for wave (subtle) ──
      ctx.beginPath()
      ctx.moveTo(waveStartX, waveCenterY)
      ctx.lineTo(W - 10, waveCenterY)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Time labels (π/2, π, 3π/2, ...)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = '11px ui-monospace, monospace'
      const PIX_PER_RAD = 30
      for (let k = 0; k * Math.PI / 2 * PIX_PER_RAD < waveWidth; k++) {
        const px = waveStartX + k * Math.PI / 2 * PIX_PER_RAD
        if (px > W - 30) break
        ctx.beginPath()
        ctx.moveTo(px, waveCenterY - 4)
        ctx.lineTo(px, waveCenterY + 4)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.stroke()
        if (k > 0 && k % 2 === 0) {
          ctx.fillText(`${k / 2}π`, px - 6, waveCenterY + 16)
        }
      }

      rafRef.current = requestAnimationFrame(render)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [N, waveType, speed, showCircles])

  const preset = WAVE_PRESETS[waveType]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#05070d', color: '#fff' }}>
      {/* Top bar — chuẩn LabTwin navigation */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 bg-[#05070d]/95 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => navigate('/dashboard/labtwin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all"
          title="Quay lại LabTwin"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">LabTwin</span>
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all"
          title="Về Dashboard"
        >
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-white/10 mx-1" />
        <Sparkles className="h-4 w-4" style={{ color: preset.color }} />
        <span className="text-sm font-semibold truncate">Fourier Epicycles</span>
        <span
          className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: preset.color, borderColor: `${preset.color}50`, background: `${preset.color}15` }}
        >
          Math · Wave
        </span>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center gap-3 bg-[#0a0a14]">
        {/* Wave type tabs */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
          {(Object.entries(WAVE_PRESETS) as [WaveType, typeof WAVE_PRESETS[WaveType]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setWaveType(key)}
              className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
              style={{
                color: waveType === key ? '#fff' : 'rgba(255,255,255,0.5)',
                background: waveType === key ? p.color : 'transparent',
                boxShadow: waveType === key ? `0 2px 12px ${p.color}80` : 'none',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* N slider */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Harmonics</label>
          <input
            type="range"
            min={1}
            max={50}
            value={N}
            onChange={e => setN(Number(e.target.value))}
            className="w-32 accent-cyan-400"
          />
          <span className="text-xs font-mono font-bold w-7 text-right" style={{ color: preset.color }}>
            {N}
          </span>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tốc độ</label>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-24 accent-purple-400"
          />
          <span className="text-xs font-mono font-bold w-8 text-right text-purple-300">
            {speed.toFixed(1)}×
          </span>
        </div>

        {/* Toggle circles */}
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showCircles}
            onChange={e => setShowCircles(e.target.checked)}
            className="accent-cyan-400"
          />
          <span className="text-white/70">Hiện vòng quay</span>
        </label>

        {/* Play / Pause */}
        <button
          onClick={() => setPaused(p => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
          style={{
            color: paused ? '#22c55e' : '#f59e0b',
            borderColor: paused ? '#22c55e60' : '#f59e0b60',
            background: paused ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
          }}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {paused ? 'Tiếp tục' : 'Tạm dừng'}
        </button>

        <button
          onClick={resetTrail}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Formula overlay */}
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 rounded-lg backdrop-blur-md max-w-[90%]"
          style={{
            background: 'rgba(10,10,20,0.75)',
            border: `1px solid ${preset.color}40`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 32px ${preset.color}20`,
          }}
        >
          <div className="text-[10px] uppercase tracking-[0.25em] mb-1.5 text-center" style={{ color: preset.color }}>
            Chuỗi Fourier · {preset.label}
          </div>
          <div className="text-white text-sm">
            <Tex formula={preset.formula} displayMode />
          </div>
          <div className="mt-1.5 text-[10px] text-white/40 text-center">
            Cộng {N} sóng hài đầu tiên · tổng các vòng tròn quay tạo ra sóng
          </div>
        </div>

        {/* Legend top-right */}
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg backdrop-blur"
          style={{ background: 'rgba(10,10,20,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1">Epicycle</div>
          <div className="flex items-center gap-2 text-[11px]">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(0, 90%, 70%)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(50, 90%, 70%)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(100, 90%, 70%)' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(150, 90%, 70%)' }} />
            </div>
            <span className="text-white/60">{N} vòng</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px]">
            <div className="w-3 h-0.5" style={{ background: preset.color, boxShadow: `0 0 4px ${preset.color}` }} />
            <span className="text-white/60">Sóng tổng hợp</span>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/30 uppercase tracking-wider">
        <span>📚 Joseph Fourier (1822) — mọi hàm tuần hoàn = tổng vô hạn các sin/cos</span>
        <Link to="/dashboard/labtwin" className="text-cyan-400/60 hover:text-cyan-300 transition">
          ← Các phòng lab khác
        </Link>
      </div>
    </div>
  )
}
