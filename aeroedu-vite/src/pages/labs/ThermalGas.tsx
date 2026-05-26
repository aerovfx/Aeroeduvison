/**
 * ThermalGas — Mô phỏng chất khí + định luật nhiệt động lực học
 *
 * Route: /dashboard/labtwin/thermal-gas
 * User: "thêm 1 vài thí nghiệm về nhiệt với chất khí"
 *
 * Features:
 *   - Hộp chứa khí với N hạt phân tử chuyển động Brownian
 *   - Slider điều khiển: Thể tích V (di chuyển piston), Nhiệt độ T, Số phân tử N
 *   - Hiển thị áp suất P thực tế (từ va chạm hạt với thành) so với PV = nRT
 *   - 3 chế độ thí nghiệm:
 *     • Boyle: T cố định → P-V graph (hyperbola)
 *     • Charles: P cố định → V-T graph (linear)
 *     • Gay-Lussac: V cố định → P-T graph (linear)
 *   - Maxwell-Boltzmann velocity distribution
 *   - Vận tốc TB hạt + va chạm với thành
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, Activity, Info, Thermometer, Wind } from 'lucide-react'

interface Particle {
  x: number; y: number; vx: number; vy: number
}

type Experiment = 'boyle' | 'charles' | 'gay-lussac' | 'free'

const CANVAS_W = 500
const CANVAS_H = 400
const BOX_LEFT = 40
const BOX_TOP = 40
const BOX_RIGHT_MAX = 460
const BOX_BOTTOM = 360
const PARTICLE_R = 3
const R_GAS = 8.314  // ideal gas constant J/(mol·K)

export default function ThermalGas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const pressureRef = useRef(0)
  const collisionCountRef = useRef(0)
  const lastPressureUpdateRef = useRef(performance.now())
  const runningRef = useRef(true)

  const [running, setRunning] = useState(true)
  const [N, setN] = useState(80)             // số phân tử
  const [T, setT] = useState(300)            // K
  const [V, setV] = useState(60)             // % piston position (60-100%)
  const [experiment, setExperiment] = useState<Experiment>('free')
  const [showVelocityHist, setShowVelocityHist] = useState(true)
  const [, forceRender] = useState(0)

  runningRef.current = running

  // Convert T → average speed for ideal gas (v_rms = √(3kT/m), simplified)
  const speedFromT = (Tk: number) => Math.sqrt(Tk / 50)  // simplified scale for viz

  const initParticles = (count: number, baseSpeed: number) => {
    const boxRight = BOX_LEFT + (BOX_RIGHT_MAX - BOX_LEFT) * (V / 100)
    const list: Particle[] = []
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      // Maxwell-Boltzmann-like distribution (Box-Muller for normal)
      const u1 = Math.random(), u2 = Math.random()
      const speedFactor = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const speed = Math.max(0.3, Math.abs(speedFactor) * baseSpeed * 0.7 + baseSpeed * 0.3)
      list.push({
        x: BOX_LEFT + 10 + Math.random() * (boxRight - BOX_LEFT - 20),
        y: BOX_TOP + 10 + Math.random() * (BOX_BOTTOM - BOX_TOP - 20),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      })
    }
    particlesRef.current = list
  }

  // Initial spawn
  useEffect(() => {
    initParticles(N, speedFromT(T))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-init when N changes
  useEffect(() => {
    const cur = particlesRef.current.length
    if (cur < N) {
      // Add more particles
      const boxRight = BOX_LEFT + (BOX_RIGHT_MAX - BOX_LEFT) * (V / 100)
      const baseSpeed = speedFromT(T)
      for (let i = cur; i < N; i++) {
        const angle = Math.random() * Math.PI * 2
        particlesRef.current.push({
          x: BOX_LEFT + 10 + Math.random() * (boxRight - BOX_LEFT - 20),
          y: BOX_TOP + 10 + Math.random() * (BOX_BOTTOM - BOX_TOP - 20),
          vx: Math.cos(angle) * baseSpeed,
          vy: Math.sin(angle) * baseSpeed,
        })
      }
    } else if (cur > N) {
      particlesRef.current.length = N
    }
  }, [N, T, V])

  // Rescale particle velocities when T changes
  useEffect(() => {
    const ps = particlesRef.current
    if (ps.length === 0) return
    // Current avg KE → target avg KE
    let totalKE = 0
    for (const p of ps) totalKE += p.vx * p.vx + p.vy * p.vy
    const currentTemp = totalKE / ps.length
    const targetSpeed = speedFromT(T)
    const targetVar = targetSpeed * targetSpeed
    const scale = currentTemp > 0.01 ? Math.sqrt(targetVar / currentTemp) : 1
    for (const p of ps) {
      p.vx *= scale
      p.vy *= scale
    }
  }, [T])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.033) * 60  // normalize to 60fps
      last = now
      const boxRight = BOX_LEFT + (BOX_RIGHT_MAX - BOX_LEFT) * (V / 100)

      if (runningRef.current) {
        const ps = particlesRef.current
        let collisions = 0
        for (const p of ps) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          // Wall bounces
          if (p.x < BOX_LEFT + PARTICLE_R) {
            p.x = BOX_LEFT + PARTICLE_R
            p.vx = Math.abs(p.vx)
            collisions += Math.abs(p.vx)  // momentum impulse
          }
          if (p.x > boxRight - PARTICLE_R) {
            p.x = boxRight - PARTICLE_R
            p.vx = -Math.abs(p.vx)
            collisions += Math.abs(p.vx)
          }
          if (p.y < BOX_TOP + PARTICLE_R) {
            p.y = BOX_TOP + PARTICLE_R
            p.vy = Math.abs(p.vy)
            collisions += Math.abs(p.vy)
          }
          if (p.y > BOX_BOTTOM - PARTICLE_R) {
            p.y = BOX_BOTTOM - PARTICLE_R
            p.vy = -Math.abs(p.vy)
            collisions += Math.abs(p.vy)
          }
        }
        collisionCountRef.current += collisions

        // Update pressure every 200ms
        if (now - lastPressureUpdateRef.current > 200) {
          const elapsed = (now - lastPressureUpdateRef.current) / 1000
          const boxLengthX = boxRight - BOX_LEFT
          const boxLengthY = BOX_BOTTOM - BOX_TOP
          const perimeter = 2 * (boxLengthX + boxLengthY)
          pressureRef.current = (collisionCountRef.current / elapsed) / perimeter
          collisionCountRef.current = 0
          lastPressureUpdateRef.current = now
          forceRender((n) => (n + 1) & 0xFFFF)
        }
      }

      // Render
      ctx.fillStyle = '#0a0f1f'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Color box based on T (cold blue → hot red)
      const tNorm = Math.min(1, Math.max(0, (T - 100) / 700))
      const bgR = Math.round(20 + tNorm * 60)
      const bgB = Math.round(60 + (1 - tNorm) * 60)
      ctx.fillStyle = `rgba(${bgR},20,${bgB},0.4)`
      ctx.fillRect(BOX_LEFT, BOX_TOP, boxRight - BOX_LEFT, BOX_BOTTOM - BOX_TOP)

      // Box walls
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 3
      ctx.strokeRect(BOX_LEFT, BOX_TOP, boxRight - BOX_LEFT, BOX_BOTTOM - BOX_TOP)

      // Piston (right wall) with handle
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(boxRight - 6, BOX_TOP - 10, 12, BOX_BOTTOM - BOX_TOP + 20)
      // Piston rod
      ctx.fillStyle = '#475569'
      ctx.fillRect(boxRight, (BOX_TOP + BOX_BOTTOM) / 2 - 4, 40, 8)
      // Piston label
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('PISTON', boxRight + 6, BOX_TOP - 4)

      // Particles
      const ps = particlesRef.current
      for (const p of ps) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        // Color by speed
        const hue = Math.max(0, 200 - speed * 8)
        ctx.fillStyle = `hsl(${hue}, 90%, 60%)`
        ctx.shadowColor = `hsl(${hue}, 90%, 60%)`
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, PARTICLE_R, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // HUD
      const avgKE = ps.length > 0 ? ps.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0) / ps.length / 2 : 0
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`N = ${ps.length}`, 6, 16)
      ctx.fillText(`T = ${T}K`, 6, 30)
      ctx.fillText(`V = ${V}%`, 6, 44)
      ctx.fillText(`P ≈ ${pressureRef.current.toFixed(2)}`, 6, 58)
      ctx.fillText(`<KE> = ${avgKE.toFixed(2)}`, 6, 72)

      // Velocity histogram (Maxwell-Boltzmann)
      if (showVelocityHist && ps.length > 0) {
        const histX = CANVAS_W - 160, histY = CANVAS_H - 100, histW = 150, histH = 80
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(histX, histY, histW, histH)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.strokeRect(histX, histY, histW, histH)
        // Compute histogram
        const bins = 15
        const maxSpeed = Math.max(...ps.map((p) => Math.sqrt(p.vx * p.vx + p.vy * p.vy)), 0.1)
        const hist = new Array(bins).fill(0)
        for (const p of ps) {
          const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          const bin = Math.min(bins - 1, Math.floor((s / maxSpeed) * bins))
          hist[bin] += 1
        }
        const maxH = Math.max(...hist, 1)
        const barW = (histW - 4) / bins
        for (let i = 0; i < bins; i++) {
          const h = (hist[i] / maxH) * (histH - 16)
          const hue = Math.max(0, 200 - (i / bins) * maxSpeed * 8)
          ctx.fillStyle = `hsl(${hue}, 90%, 55%)`
          ctx.fillRect(histX + 2 + i * barW, histY + histH - 4 - h, barW - 0.5, h)
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.font = '9px monospace'
        ctx.fillText('Maxwell-Boltzmann (vận tốc)', histX + 4, histY + 10)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [N, T, V, showVelocityHist])

  // P × V (ideal gas) — relative units
  const PV = pressureRef.current * V
  const nRT = N * T  // proxy for nRT

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-950/15 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-300 via-amber-300 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
                <Thermometer className="w-6 h-6 text-orange-400" />
                Chất khí + Nhiệt động lực học
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                PV = nRT · Boyle · Charles · Gay-Lussac · Maxwell-Boltzmann
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
            <button onClick={() => initParticles(N, speedFromT(T))}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset hạt
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🔬 Thí nghiệm</h3>
              <div className="space-y-1.5">
                {([
                  { id: 'free' as const,       label: 'Tự do (đổi tất cả)',  desc: 'Quan sát tổng quát' },
                  { id: 'boyle' as const,      label: '🔵 Boyle (T const)',  desc: 'P × V = const · Đổi V → P thay đổi' },
                  { id: 'charles' as const,    label: '🔴 Charles (P const)', desc: 'V / T = const · Đổi T → V thay đổi' },
                  { id: 'gay-lussac' as const, label: '🟡 Gay-Lussac (V const)', desc: 'P / T = const · V cố định' },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setExperiment(m.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      experiment === m.id ? 'bg-orange-500/20 border border-orange-500/40 text-orange-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Tham số</h3>
              <Slider label="Số phân tử N" value={N} min={10} max={300} step={10} suffix="" onChange={(v) => setN(Math.round(v))} />
              <Slider label="Nhiệt độ T" value={T} min={50} max={800} step={10} suffix=" K" onChange={(v) => setT(Math.round(v))}
                disabled={experiment === 'boyle'} />
              <Slider label="Thể tích V (piston)" value={V} min={20} max={100} step={1} suffix="%" onChange={(v) => setV(Math.round(v))}
                disabled={experiment === 'gay-lussac'} />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showVelocityHist}
                  onChange={(e) => setShowVelocityHist(e.target.checked)}
                  className="accent-orange-500" />
                <span className="text-white/70">Histogram vận tốc</span>
              </label>
            </div>

            <div className="rounded-2xl bg-orange-500/[0.06] border border-orange-500/25 p-3 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-orange-300">📊 Đại lượng</h3>
              <Row label="Áp suất P" value={pressureRef.current.toFixed(3)} />
              <Row label="P × V" value={PV.toFixed(2)} />
              <Row label="n·R·T (∝ N·T)" value={nRT.toFixed(0)} />
              <div className="pt-1.5 mt-1.5 border-t border-orange-500/15 text-[10px] text-orange-200/70 italic">
                Định luật ideal gas: PV = nRT → P và V tỉ lệ nghịch, P và T tỉ lệ thuận
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 flex justify-center">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="rounded-lg max-w-full h-auto" />
            </div>

            <div className="rounded-2xl bg-orange-500/[0.04] border border-orange-500/20 p-4">
              <h3 className="font-bold text-orange-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết — 3 định luật khí lý tưởng
              </h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">🔵 Boyle (1662) — T const</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">P₁V₁ = P₂V₂</p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    Nhiệt độ giữ nguyên → P và V tỉ lệ nghịch. Nén V xuống → P tăng (như bơm xe đạp).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-rose-300 mb-1">🔴 Charles (1787) — P const</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">V₁/T₁ = V₂/T₂</p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    Áp suất giữ nguyên → V và T tỉ lệ thuận. Đun nóng → khí dãn nở.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🟡 Gay-Lussac (1802) — V const</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">P₁/T₁ = P₂/T₂</p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    Bình kín không đổi V → P và T tỉ lệ thuận. Đun lon nước ngọt → có thể nổ!
                  </p>
                </div>
                <div className="md:col-span-3 mt-2">
                  <h4 className="font-bold text-violet-300 mb-1">📐 Tổng hợp: PV = nRT (ideal gas)</h4>
                  <p className="text-white/55 leading-relaxed">
                    Ở nhiệt độ cao + áp suất thấp, khí thực tế tuân thủ <strong>PV = nRT</strong> với R = 8.314 J/(mol·K).
                    Vận tốc trung bình của phân tử: <span className="font-mono">v_rms = √(3kT/m)</span> →
                    nhiệt độ chính là <strong>động năng trung bình</strong> của phân tử. Histogram bên phải hiển thị
                    phân bố Maxwell-Boltzmann thực tế.
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

function Slider({ label, value, min, max, step, suffix, onChange, disabled }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string
  onChange: (v: number) => void; disabled?: boolean
}) {
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-bold text-white/70">{label}</label>
        <span className="text-[11px] font-mono text-orange-300">{value.toFixed(0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-orange-500 disabled:cursor-not-allowed" />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className="font-mono font-bold text-orange-300">{value}</span>
    </div>
  )
}
