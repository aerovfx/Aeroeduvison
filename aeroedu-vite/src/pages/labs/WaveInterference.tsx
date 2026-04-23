/**
 * Giao thoa sóng — Wave Interference
 * Two coherent point sources, renders interference pattern in real-time
 * Intensity: I = 4I₀·cos²(Δφ/2) where Δφ = (2π/λ)·(r₁ - r₂)
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Play, Pause, RotateCcw, ChevronLeft, Waves, Zap } from 'lucide-react'

interface Params {
  wavelength: number  // px (visual)
  freq: number        // Hz (animation)
  d: number           // source separation (px)
  amplitude: number
}

export default function WaveInterferenceLab() {
  const [params, setParams] = useState<Params>({ wavelength: 60, freq: 1.5, d: 100, amplitude: 1 })
  const [running, setRunning] = useState(true)

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const animRef    = useRef<number>(0)
  const tRef       = useRef(0)
  const paramsRef  = useRef(params)
  const runRef     = useRef(true)
  paramsRef.current = params

  useEffect(() => { runRef.current = running }, [running])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const W = canvas.width; const H = canvas.height

    // Pre-compute interference pattern into ImageData
    let imgData = ctx.createImageData(W, H)

    const precompute = () => {
      const p = paramsRef.current
      const s1 = { x: W / 2 - p.d / 2, y: H * 0.5 }
      const s2 = { x: W / 2 + p.d / 2, y: H * 0.5 }
      const k  = (2 * Math.PI) / p.wavelength
      const data = imgData.data
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const r1  = Math.sqrt((x - s1.x) ** 2 + (y - s1.y) ** 2)
          const r2  = Math.sqrt((x - s2.x) ** 2 + (y - s2.y) ** 2)
          const dφ  = k * (r1 - r2)
          const amp = p.amplitude * Math.cos(dφ / 2) ** 2  // normalized [0,1]
          const idx = (y * W + x) * 4
          // Color by constructive (+) vs destructive (-) interference
          const phase = (k * (r1 - r2) + Math.PI) % (2 * Math.PI)
          const bright = amp
          data[idx]     = Math.round(bright * 60)        // R
          data[idx + 1] = Math.round(bright * 120)       // G
          data[idx + 2] = Math.round(bright * 255)       // B
          data[idx + 3] = Math.round(bright * 220 + 20)  // A
        }
      }
    }

    precompute()
    let lastParams = JSON.stringify(params)

    const loop = (now: number) => {
      animRef.current = requestAnimationFrame(loop)
      if (runRef.current) tRef.current += 0.016

      const cur = JSON.stringify(paramsRef.current)
      if (cur !== lastParams) { lastParams = cur; precompute() }

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'hsl(260,25%,9%)'
      ctx.fillRect(0, 0, W, H)

      // Draw pattern
      ctx.putImageData(imgData, 0, 0)

      // Animated wave rings from each source
      const p = paramsRef.current
      const t = tRef.current
      const s1 = { x: W / 2 - p.d / 2, y: H * 0.5 }
      const s2 = { x: W / 2 + p.d / 2, y: H * 0.5 }

      ;[s1, s2].forEach((src, si) => {
        for (let ring = 0; ring < 8; ring++) {
          const r = ((t * p.freq * p.wavelength + ring * p.wavelength) % (Math.max(W, H) * 0.85))
          const alpha = Math.max(0, 1 - r / (Math.max(W, H) * 0.85)) * 0.6
          ctx.beginPath()
          ctx.arc(src.x, src.y, r, 0, Math.PI * 2)
          ctx.strokeStyle = si === 0
            ? `rgba(96,165,250,${alpha})`
            : `rgba(167,139,250,${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // Source dot
        ctx.beginPath()
        ctx.arc(src.x, src.y, 6, 0, Math.PI * 2)
        ctx.fillStyle = si === 0 ? '#60a5fa' : '#a78bfa'
        ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(`S${si + 1}`, src.x, src.y + 18)
      })
      ctx.textAlign = 'left'

      // Separation indicator
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(s1.x, H * 0.62); ctx.lineTo(s2.x, H * 0.62); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#9ca3af'; ctx.font = '11px monospace'; ctx.textAlign = 'center'
      ctx.fillText(`d = ${p.d} px`, W / 2, H * 0.62 + 14)
      ctx.textAlign = 'left'

      // Info overlay
      ctx.fillStyle = 'rgba(17,24,39,0.75)'
      ctx.beginPath(); ctx.roundRect(8, 8, 200, 62, 8); ctx.fill()
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()
      const λ = p.wavelength
      const constructive = 'Δr = mλ  (m=0,±1,±2...)'
      const destructive  = 'Δr = (m+½)λ'
      ctx.fillStyle = '#60a5fa'; ctx.font = '11px monospace'; ctx.fillText(`λ = ${λ} px`, 16, 26)
      ctx.fillStyle = '#4ade80'; ctx.font = '10px sans-serif'; ctx.fillText('✓ ' + constructive, 16, 42)
      ctx.fillStyle = '#f87171'; ctx.fillText('✗ ' + destructive, 16, 56)
    }

    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="mb-6">
          <Link to="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 text-sm font-medium transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Waves className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Giao thoa sóng — Wave Interference</h1>
              <p className="text-white/50 text-sm">Sóng · Trung bình · 30 phút · +150 XP</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-[hsl(260,25%,11%)] rounded-2xl border border-cyan-500/20 overflow-hidden">
            <canvas ref={canvasRef} width={780} height={500} className="w-full" style={{ background: 'hsl(260,25%,9%)' }} />
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/5">
              <button onClick={() => setRunning(r => !r)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-semibold transition-colors">
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? 'Dừng' : 'Chạy'}
              </button>
              <button onClick={() => { tRef.current = 0 }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-sm transition-colors">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
              <div className="ml-auto text-xs text-white/40">Màu xanh = giao thoa xây dựng · Tối = giao thoa triệt tiêu</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-cyan-500/20 p-4">
              <h3 className="text-sm font-bold text-cyan-300 mb-4 flex items-center gap-2"><Zap className="h-4 w-4" />Thông số</h3>
              {[
                { label: 'Bước sóng λ',    key: 'wavelength', min: 20,  max: 120, step: 2,   unit: 'px', val: params.wavelength },
                { label: 'Tần số f',       key: 'freq',       min: 0.3, max: 4,   step: 0.1, unit: 'Hz', val: params.freq },
                { label: 'Khoảng cách d',  key: 'd',          min: 20,  max: 250, step: 5,   unit: 'px', val: params.d },
              ].map(({ label, key, min, max, step, unit, val }) => (
                <div key={key} className="mb-4">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>{label}</span>
                    <span className="font-mono text-cyan-300">{val} {unit}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={val}
                    onChange={e => setParams(p => ({ ...p, [key]: +e.target.value }))}
                    className="w-full accent-cyan-500" />
                </div>
              ))}
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-cyan-500/20 p-4">
              <h3 className="text-sm font-bold text-cyan-300 mb-3">📐 Điều kiện giao thoa</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-green-500/15 border border-green-500/25 rounded-lg p-2">
                  <span className="text-green-400">Xây dựng: </span>
                  <span className="text-white/80">Δr = mλ</span>
                </div>
                <div className="bg-red-500/15 border border-red-500/25 rounded-lg p-2">
                  <span className="text-red-400">Triệt tiêu: </span>
                  <span className="text-white/80">Δr = (m+½)λ</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-cyan-400">I = </span>
                  <span className="text-white/80">4I₀·cos²(Δφ/2)</span>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <span className="text-cyan-400">Δφ = </span>
                  <span className="text-white/80">(2π/λ)·Δr</span>
                </div>
              </div>
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-cyan-500/20 p-4">
              <h3 className="text-sm font-bold text-cyan-300 mb-3">🎯 Mục tiêu học tập</h3>
              <ul className="space-y-2 text-xs text-white/70">
                {['Hiểu nguyên lý chồng chất sóng', 'Phân biệt giao thoa xây dựng & triệt tiêu', 'Ảnh hưởng của λ và d đến vân giao thoa', 'Áp dụng: Thí nghiệm Young, grating'].map(o => (
                  <li key={o} className="flex gap-2"><span className="text-cyan-400">▸</span>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
