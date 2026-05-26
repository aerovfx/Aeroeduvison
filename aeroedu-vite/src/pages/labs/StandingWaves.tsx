/**
 * StandingWaves — Sóng dừng trên dây (Standing Waves)
 *
 * Route: /dashboard/labtwin/standing-waves
 * User: "fix dao động của sóng dừng"
 *
 * Physics:
 *   - Sợi dây 2 đầu cố định (nốt) hoặc 1 đầu cố định 1 đầu tự do
 *   - Sóng dừng = chồng chập 2 sóng chạy ngược chiều
 *   - y(x, t) = 2A·sin(kx)·cos(ωt) (2 đầu cố định)
 *   - Bước sóng λ_n = 2L/n (n = 1, 2, 3...)
 *   - Tần số f_n = n·v/(2L) (harmonics)
 *
 * Features:
 *   - Slider chế độ harmonic n (1-8)
 *   - Slider chiều dài L, sức căng T, mật độ μ → tính v
 *   - Hiển thị 2 wave components đi ngược chiều (semi-transparent)
 *   - Sóng dừng kết quả (đậm hơn) với nốt + bụng đánh dấu
 *   - Mode: 2 đầu cố định / 1 đầu cố định 1 đầu tự do
 *   - Energy density per position
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Activity, Info, Eye, EyeOff,
} from 'lucide-react'

const CANVAS_W = 760
const CANVAS_H = 380

type BoundaryMode = 'both-fixed' | 'one-free'

export default function StandingWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(true)
  const tRef = useRef(0)
  const [running, setRunning] = useState(true)
  const [n, setN] = useState(3)               // harmonic mode
  const [L, setL] = useState(2)               // string length (m)
  const [tension, setTension] = useState(80)  // T (N)
  const [linearDensity, setLinearDensity] = useState(0.01)  // μ (kg/m)
  const [amplitude, setAmplitude] = useState(0.5) // display amplitude
  const [boundary, setBoundary] = useState<BoundaryMode>('both-fixed')
  const [showComponents, setShowComponents] = useState(true)
  const [showNodes, setShowNodes] = useState(true)
  const [showEnergy, setShowEnergy] = useState(false)
  const [speedFactor, setSpeedFactor] = useState(1)

  runningRef.current = running

  // Physics
  const v = Math.sqrt(tension / linearDensity)    // wave speed v = √(T/μ)
  // For both-fixed: λ_n = 2L/n
  // For one-free: λ_n = 4L/(2n-1)
  const lambda = boundary === 'both-fixed' ? (2 * L) / n : (4 * L) / (2 * n - 1)
  const freq = v / lambda
  const period = 1 / freq
  const omega = 2 * Math.PI * freq
  const k = 2 * Math.PI / lambda

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033)
      last = now
      if (runningRef.current) tRef.current += dt * speedFactor

      const t = tRef.current
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // BG
      const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
      grad.addColorStop(0, '#0a0f1f')
      grad.addColorStop(1, '#1a1238')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Layout
      const PADDING_X = 60
      const stringStartX = PADDING_X
      const stringEndX = CANVAS_W - PADDING_X
      const stringLen = stringEndX - stringStartX
      const yCenter = CANVAS_H / 2
      const AMPL_PX = 100 * amplitude   // display amplitude in pixels

      // Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.06)'
      ctx.lineWidth = 1
      for (let i = 0; i < CANVAS_H; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); ctx.stroke()
      }
      for (let i = 0; i < CANVAS_W; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); ctx.stroke()
      }

      // Reference line (center / equilibrium)
      ctx.strokeStyle = 'rgba(148,163,184,0.2)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(stringStartX, yCenter); ctx.lineTo(stringEndX, yCenter)
      ctx.stroke()
      ctx.setLineDash([])

      // Wave equation parameters
      // y(x, t) = 2A·sin(kx)·cos(ωt)  for both-fixed
      // For one-free: y(x, t) = 2A·sin(kx)·cos(ωt) with k = (2n-1)π/(2L)
      const SAMPLES = 240

      // Draw 2 traveling wave components (semi-transparent)
      if (showComponents) {
        // Right-going: A·sin(kx - ωt)
        ctx.strokeStyle = 'rgba(34,211,238,0.5)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let i = 0; i <= SAMPLES; i++) {
          const xNorm = i / SAMPLES
          const px = stringStartX + xNorm * stringLen
          const xPhys = xNorm * L
          const y = amplitude * Math.sin(k * xPhys - omega * t)
          const py = yCenter - y * AMPL_PX
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.stroke()
        // Left-going: A·sin(kx + ωt)
        ctx.strokeStyle = 'rgba(244,114,182,0.5)'
        ctx.beginPath()
        for (let i = 0; i <= SAMPLES; i++) {
          const xNorm = i / SAMPLES
          const px = stringStartX + xNorm * stringLen
          const xPhys = xNorm * L
          const y = amplitude * Math.sin(k * xPhys + omega * t)
          const py = yCenter - y * AMPL_PX
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Draw energy density (kinetic energy ~ (∂y/∂t)²) along string
      if (showEnergy) {
        ctx.fillStyle = 'rgba(251,191,36,0.18)'
        ctx.beginPath()
        ctx.moveTo(stringStartX, yCenter + 110)
        for (let i = 0; i <= SAMPLES; i++) {
          const xNorm = i / SAMPLES
          const px = stringStartX + xNorm * stringLen
          const xPhys = xNorm * L
          // dy/dt = -2A·ω·sin(kx)·sin(ωt) → KE density ~ sin²(kx)·sin²(ωt)
          // For total energy: PE peaks at antinodes (max displacement), KE peaks 90° out of phase
          // Show average energy density ~ sin²(kx) (constant in time when averaged)
          const energy = Math.sin(k * xPhys) ** 2
          const py = yCenter + 110 - energy * 60
          ctx.lineTo(px, py)
        }
        ctx.lineTo(stringEndX, yCenter + 110)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(251,191,36,0.6)'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'left'
        ctx.fillText('⚡ Mật độ năng lượng (∝ sin²kx)', stringStartX, yCenter + 165)
      }

      // Standing wave (sum) — main visualization
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3.5
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i <= SAMPLES; i++) {
        const xNorm = i / SAMPLES
        const px = stringStartX + xNorm * stringLen
        const xPhys = xNorm * L
        // Standing wave: y(x, t) = 2A·sin(kx)·cos(ωt)
        const envelope = 2 * amplitude * Math.sin(k * xPhys)
        const y = envelope * Math.cos(omega * t)
        const py = yCenter - y * AMPL_PX
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.lineCap = 'butt'

      // Envelope (faint outline showing max amplitude per position)
      ctx.strokeStyle = 'rgba(251,191,36,0.18)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 4])
      // Upper envelope
      ctx.beginPath()
      for (let i = 0; i <= SAMPLES; i++) {
        const xNorm = i / SAMPLES
        const px = stringStartX + xNorm * stringLen
        const xPhys = xNorm * L
        const env = Math.abs(2 * amplitude * Math.sin(k * xPhys))
        const py = yCenter - env * AMPL_PX
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      // Lower envelope
      ctx.beginPath()
      for (let i = 0; i <= SAMPLES; i++) {
        const xNorm = i / SAMPLES
        const px = stringStartX + xNorm * stringLen
        const xPhys = xNorm * L
        const env = Math.abs(2 * amplitude * Math.sin(k * xPhys))
        const py = yCenter + env * AMPL_PX
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Nodes (zero points of sin(kx))
      if (showNodes) {
        // Nodes: kx = mπ → x_m = m·π/k = m·λ/2 (m = 0, 1, 2, ..., n)
        const numNodes = boundary === 'both-fixed' ? n + 1 : n
        for (let m = 0; m < numNodes; m++) {
          const xPhys = boundary === 'both-fixed' ? (m * L) / n : ((2 * m) / (2 * n - 1)) * L
          if (xPhys > L) continue
          const px = stringStartX + (xPhys / L) * stringLen
          // Draw node circle (point of zero amplitude)
          ctx.fillStyle = '#ef4444'
          ctx.shadowColor = '#ef4444'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(px, yCenter, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('N', px, yCenter + 3)
        }

        // Antinodes (bụng sóng — max amplitude points)
        // kx = (m + 0.5)π → x = (m + 0.5)·λ/2
        const numAntinodes = boundary === 'both-fixed' ? n : n
        for (let m = 0; m < numAntinodes; m++) {
          let xPhys: number
          if (boundary === 'both-fixed') {
            xPhys = ((m + 0.5) * L) / n
          } else {
            xPhys = ((2 * m + 1) / (2 * n - 1)) * L
          }
          if (xPhys > L) continue
          const px = stringStartX + (xPhys / L) * stringLen
          // Show envelope max (top and bottom)
          const envMax = 2 * amplitude * AMPL_PX
          ctx.fillStyle = '#22c55e'
          ctx.shadowColor = '#22c55e'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(px, yCenter - envMax, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(px, yCenter + envMax, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.fillStyle = '#22c55e'
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('B', px, yCenter - envMax - 10)
        }
      }

      // String mount points (left + right walls)
      // Left fixed
      ctx.fillStyle = '#475569'
      ctx.fillRect(stringStartX - 20, yCenter - 40, 16, 80)
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(stringStartX - 20, yCenter + i * 20)
        ctx.lineTo(stringStartX - 30, yCenter + i * 20 - 8)
        ctx.stroke()
      }
      // Right (depends on boundary)
      if (boundary === 'both-fixed') {
        ctx.fillStyle = '#475569'
        ctx.fillRect(stringEndX + 4, yCenter - 40, 16, 80)
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath()
          ctx.moveTo(stringEndX + 20, yCenter + i * 20)
          ctx.lineTo(stringEndX + 30, yCenter + i * 20 + 8)
          ctx.stroke()
        }
      } else {
        // Free end: small ring
        ctx.strokeStyle = '#475569'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(stringEndX + 12, yCenter, 8, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Title labels
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`Harmonic n = ${n}`, 20, 28)
      ctx.fillStyle = '#fbbf24'
      ctx.fillText(`f₍${n}₎ = ${freq.toFixed(2)} Hz`, 20, 48)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '11px monospace'
      ctx.fillText(`v = √(T/μ) = ${v.toFixed(2)} m/s`, 20, 64)
      ctx.fillText(`λ = ${lambda.toFixed(3)} m`, 20, 78)

      // Time indicator
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(`t = ${t.toFixed(2)} s`, CANVAS_W - 20, 28)
      ctx.fillText(`Phase = ${((omega * t * 180 / Math.PI) % 360).toFixed(0)}°`, CANVAS_W - 20, 48)

      // Component legend (if showing)
      if (showComponents) {
        const lx = CANVAS_W - 220
        const ly = CANVAS_H - 60
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(lx, ly - 6, 210, 50)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.strokeRect(lx, ly - 6, 210, 50)
        // → right-going
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(lx + 8, ly + 4); ctx.lineTo(lx + 28, ly + 4); ctx.stroke()
        ctx.fillStyle = '#cbd5e1'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
        ctx.fillText('→ sóng phải (A sin(kx-ωt))', lx + 34, ly + 7)
        // ← left-going
        ctx.strokeStyle = '#f472b6'
        ctx.beginPath(); ctx.moveTo(lx + 8, ly + 20); ctx.lineTo(lx + 28, ly + 20); ctx.stroke()
        ctx.fillText('← sóng trái (A sin(kx+ωt))', lx + 34, ly + 23)
        // = sum
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(lx + 8, ly + 36); ctx.lineTo(lx + 28, ly + 36); ctx.stroke()
        ctx.fillText('= sóng dừng (2A sin(kx) cos(ωt))', lx + 34, ly + 39)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [n, L, tension, linearDensity, amplitude, boundary, showComponents, showNodes, showEnergy, speedFactor, k, omega, lambda, freq, v])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/15 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-300 to-pink-300 bg-clip-text text-transparent flex items-center gap-2">
                <Activity className="w-6 h-6 text-amber-400" />
                Sóng dừng — Standing Waves
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                y(x,t) = 2A·sin(kx)·cos(ωt) · Hài âm n · Nốt + Bụng
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
            <button onClick={() => { tRef.current = 0 }}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset thời gian
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Controls */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Tham số</h3>
              <Slider label="Hài âm n" value={n} min={1} max={8} step={1} suffix="" onChange={(v) => setN(Math.round(v))} />
              <Slider label="Chiều dài dây L" value={L} min={0.5} max={4} step={0.1} suffix=" m" onChange={setL} />
              <Slider label="Sức căng T" value={tension} min={5} max={500} step={5} suffix=" N" onChange={setTension} />
              <Slider label="Mật độ μ" value={linearDensity * 1000} min={1} max={100} step={1} suffix=" g/m" onChange={(v) => setLinearDensity(v / 1000)} />
              <Slider label="Biên độ A" value={amplitude} min={0.1} max={1.2} step={0.05} suffix="" onChange={setAmplitude} />
              <Slider label="Tốc độ animation" value={speedFactor} min={0.1} max={3} step={0.1} suffix="×" onChange={setSpeedFactor} />
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🔗 Điều kiện biên</h3>
              <div className="space-y-1.5">
                {([
                  { id: 'both-fixed' as const, label: '🔒 2 đầu cố định (dây đàn)', desc: 'λ = 2L/n' },
                  { id: 'one-free' as const,   label: '🔒-🔓 1 cố định + 1 tự do (ống sáo)', desc: 'λ = 4L/(2n-1)' },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setBoundary(m.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      boundary === m.id
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/65 hover:bg-white/[0.08]'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5 font-mono">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">👁 Hiển thị</h3>
              <Toggle label="Sóng thành phần (2 sóng chạy)" checked={showComponents} onChange={setShowComponents} />
              <Toggle label="Nốt + Bụng" checked={showNodes} onChange={setShowNodes} />
              <Toggle label="Mật độ năng lượng" checked={showEnergy} onChange={setShowEnergy} />
            </div>

            {/* Computed */}
            <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/25 p-3 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-amber-300">📊 Đại lượng</h3>
              <Row label="Vận tốc sóng v" value={`${v.toFixed(2)} m/s`} />
              <Row label="Bước sóng λ" value={`${lambda.toFixed(3)} m`} />
              <Row label="Tần số f" value={`${freq.toFixed(2)} Hz`} />
              <Row label="Chu kỳ T" value={`${(period * 1000).toFixed(1)} ms`} />
              <Row label="Số nốt" value={`${boundary === 'both-fixed' ? n + 1 : n}`} />
              <Row label="Số bụng" value={`${n}`} />
            </div>
          </div>

          {/* Canvas + theory */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* Quick presets — harmonic buttons */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🎼 Chọn nhanh hài âm</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((nn) => (
                  <button key={nn} onClick={() => setN(nn)}
                    className={`px-2 py-2 rounded text-sm font-bold transition ${
                      n === nn ? 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-white/[0.05] text-white/65 hover:bg-white/[0.1]'
                    }`}>
                    n = {nn}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-2 italic">
                n = 1: hài cơ bản · n = 2: bồi âm 2 · ... · cao âm hơn = harmonics
              </p>
            </div>

            <div className="rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 p-4">
              <h3 className="font-bold text-amber-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">📐 Sự hình thành sóng dừng</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    y₁ = A·sin(kx − ωt)  → sóng tới<br />
                    y₂ = A·sin(kx + ωt)  → sóng phản xạ<br />
                    y = y₁ + y₂ = 2A·sin(kx)·cos(ωt)
                  </p>
                  <p className="text-white/55 mt-1.5">
                    2 sóng cùng tần số đi ngược chiều giao thoa tạo ra <strong>sóng dừng</strong>:
                    điểm dao động cực đại (bụng) và không dao động (nốt) xen kẽ.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-pink-300 mb-1">🎵 Điều kiện hài âm</h4>
                  <p className="text-white/55 leading-relaxed">
                    Dây 2 đầu cố định (như dây đàn ghita):<br />
                    <span className="font-mono bg-white/[0.04] px-1 rounded">λ_n = 2L/n</span> · f_n = n·v/(2L)
                  </p>
                  <p className="text-white/55 mt-1 leading-relaxed">
                    Ống sáo 1 đầu hở (1 đầu cố định, 1 đầu tự do):<br />
                    <span className="font-mono bg-white/[0.04] px-1 rounded">λ_n = 4L/(2n-1)</span> · chỉ có lẻ
                  </p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-bold text-emerald-300 mb-1">🎯 Nốt (Node) vs Bụng (Antinode)</h4>
                  <p className="text-white/55 leading-relaxed">
                    <span className="text-rose-300 font-bold">N (Nốt)</span>: x = m·λ/2 — điểm dây <strong>không bao giờ dao động</strong>
                    (sin(kx) = 0).<br />
                    <span className="text-emerald-300 font-bold">B (Bụng)</span>: x = (m+½)·λ/2 — điểm dây
                    <strong> dao động cực đại</strong> (|sin(kx)| = 1).
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
        <span className="text-[11px] font-mono text-amber-300">{value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-amber-500" />
    </div>
  )
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="accent-amber-500" />
      <span className="text-white/70 flex items-center gap-1">
        {checked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-30" />}
        {label}
      </span>
    </label>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className="font-mono font-bold text-amber-300">{value}</span>
    </div>
  )
}
