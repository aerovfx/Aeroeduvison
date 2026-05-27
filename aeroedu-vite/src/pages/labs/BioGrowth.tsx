/**
 * BioGrowth — Mô phỏng tăng trưởng quần thể sinh vật
 *
 * Route: /dashboard/labtwin/biogrowth
 * User: "fix /biogrowth"
 *
 * 3 models:
 *   1. Exponential: dN/dt = r·N (vô hạn tài nguyên)
 *   2. Logistic: dN/dt = r·N·(1 - N/K) (giới hạn K = carrying capacity)
 *   3. Lotka-Volterra: predator-prey (cáo + thỏ)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Pause, RotateCcw, Activity, Info, Leaf } from 'lucide-react'

type Model = 'exponential' | 'logistic' | 'predator-prey'

const CANVAS_W = 700
const CANVAS_H = 360

export default function BioGrowth() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(true)
  const [running, setRunning] = useState(true)
  const [model, setModel] = useState<Model>('logistic')
  const [N0, setN0] = useState(10)         // initial population
  const [r, setR] = useState(0.3)           // growth rate
  const [K, setK] = useState(500)           // carrying capacity (logistic)
  const [P0, setP0] = useState(50)          // initial predator (Lotka-Volterra)
  const [alpha, setAlpha] = useState(1.0)   // prey growth
  const [beta, setBeta] = useState(0.02)    // predation rate
  const [gamma, setGamma] = useState(0.3)   // predator death rate
  const [delta, setDelta] = useState(0.005) // predator growth from prey
  const tRef = useRef(0)
  const dataRef = useRef<Array<{ t: number; N: number; P?: number }>>([])

  runningRef.current = running

  const reset = () => {
    tRef.current = 0
    dataRef.current = [{ t: 0, N: N0, P: P0 }]
  }
  useEffect(() => { reset() /* eslint-disable-next-line */ }, [model, N0, P0])

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
        tRef.current += dt * 2  // 2× speed
        const t = tRef.current
        const last_d = dataRef.current[dataRef.current.length - 1]
        let N = last_d.N
        let P = last_d.P || P0
        const dtSim = dt * 2

        if (model === 'exponential') {
          // dN/dt = r·N
          N += r * N * dtSim
        } else if (model === 'logistic') {
          // dN/dt = r·N·(1 - N/K)
          N += r * N * (1 - N / K) * dtSim
        } else if (model === 'predator-prey') {
          // Lotka-Volterra: dN/dt = αN - βNP, dP/dt = δNP - γP
          const dN = alpha * N - beta * N * P
          const dP = delta * N * P - gamma * P
          N += dN * dtSim
          P += dP * dtSim
        }
        N = Math.max(0, N)
        P = Math.max(0, P)
        // Sample every ~50ms
        if (t - last_d.t > 0.05) {
          dataRef.current.push({ t, N, P: model === 'predator-prey' ? P : undefined })
          // Cap history
          if (dataRef.current.length > 1000) dataRef.current.shift()
        }
      }

      // Render
      ctx.fillStyle = '#0a0f1f'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      // Grid
      ctx.strokeStyle = 'rgba(148,163,184,0.08)'
      ctx.lineWidth = 1
      for (let x = 0; x < CANVAS_W; x += 70) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke()
      }
      for (let y = 0; y < CANVAS_H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
      }

      const data = dataRef.current
      if (data.length < 2) { raf = requestAnimationFrame(loop); return }

      const P = 30
      const tMax = Math.max(data[data.length - 1].t, 1)
      const tMin = Math.max(0, tMax - 60)  // 60s window
      const NMax = Math.max(...data.map((d) => d.N), N0, model === 'logistic' ? K * 1.1 : 100)
      const xScale = (tt: number) => P + ((tt - tMin) / Math.max(tMax - tMin, 0.01)) * (CANVAS_W - 2 * P)
      const yScale = (n: number) => CANVAS_H - P - (n / NMax) * (CANVAS_H - 2 * P)

      // K line (logistic)
      if (model === 'logistic') {
        const ky = yScale(K)
        ctx.strokeStyle = 'rgba(251,191,36,0.5)'
        ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(P, ky); ctx.lineTo(CANVAS_W - P, ky); ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`K = ${K} (carrying capacity)`, P + 4, ky - 4)
      }

      // Plot N (prey)
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#22c55e'
      ctx.shadowBlur = 6
      ctx.beginPath()
      data.filter((d) => d.t >= tMin).forEach((d, i, arr) => {
        const px = xScale(d.t), py = yScale(d.N)
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        void arr
      })
      ctx.stroke()
      ctx.shadowBlur = 0

      // Plot P (predator) — Lotka-Volterra
      if (model === 'predator-prey') {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2.5
        ctx.shadowColor = '#ef4444'
        ctx.shadowBlur = 6
        ctx.beginPath()
        data.filter((d) => d.t >= tMin && d.P !== undefined).forEach((d, i) => {
          const px = xScale(d.t), py = yScale(d.P!)
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      // Axes labels
      ctx.fillStyle = 'rgba(148,163,184,0.7)'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('Population', P, P - 8)
      ctx.textAlign = 'right'
      ctx.fillText(`${tMax.toFixed(1)} s`, CANVAS_W - P, CANVAS_H - P + 20)
      ctx.textAlign = 'left'
      ctx.fillText(`${tMin.toFixed(0)} s`, P, CANVAS_H - P + 20)
      // Y-max
      ctx.fillText(`${NMax.toFixed(0)}`, 4, P + 5)
      ctx.fillText('0', 8, CANVAS_H - P + 5)

      // Current value indicator
      const last_d = data[data.length - 1]
      ctx.fillStyle = '#22c55e'
      ctx.beginPath(); ctx.arc(xScale(last_d.t), yScale(last_d.N), 5, 0, Math.PI * 2); ctx.fill()
      if (model === 'predator-prey' && last_d.P !== undefined) {
        ctx.fillStyle = '#ef4444'
        ctx.beginPath(); ctx.arc(xScale(last_d.t), yScale(last_d.P), 5, 0, Math.PI * 2); ctx.fill()
      }

      // Legend
      const lx = CANVAS_W - 180, ly = P + 10
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(lx, ly - 4, 170, model === 'predator-prey' ? 36 : 22)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.strokeRect(lx, ly - 4, 170, model === 'predator-prey' ? 36 : 22)
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(lx + 6, ly + 6, 16, 2)
      ctx.fillStyle = '#cbd5e1'; ctx.font = '11px monospace'
      ctx.fillText(model === 'predator-prey' ? `🐰 Thỏ N = ${last_d.N.toFixed(0)}` : `Quần thể N = ${last_d.N.toFixed(0)}`, lx + 28, ly + 10)
      if (model === 'predator-prey') {
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(lx + 6, ly + 22, 16, 2)
        ctx.fillStyle = '#cbd5e1'
        ctx.fillText(`🦊 Cáo P = ${(last_d.P || 0).toFixed(0)}`, lx + 28, ly + 26)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [model, N0, P0, r, K, alpha, beta, gamma, delta])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/15 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <Leaf className="w-6 h-6 text-emerald-400" />
                BioGrowth — Tăng trưởng quần thể
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Exponential · Logistic · Lotka-Volterra (Predator-Prey)
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
            <button onClick={reset}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">📊 Mô hình</h3>
              <div className="space-y-1.5">
                {([
                  { id: 'exponential' as const, label: '📈 Tăng trưởng exponential', desc: 'dN/dt = r·N — vô hạn tài nguyên' },
                  { id: 'logistic' as const,    label: '🧬 Logistic (giới hạn K)',   desc: 'dN/dt = r·N·(1−N/K)' },
                  { id: 'predator-prey' as const, label: '🐺 Predator-Prey (Lotka-Volterra)', desc: 'Cáo + Thỏ tuần hoàn' },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setModel(m.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      model === m.id ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5 font-mono">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Tham số</h3>
              <Slider label="Quần thể ban đầu N₀" value={N0} min={1} max={200} step={1} suffix="" onChange={(v) => setN0(Math.round(v))} />
              {model !== 'predator-prey' && (
                <Slider label="Tốc độ tăng r" value={r} min={0.05} max={1} step={0.05} suffix="" onChange={setR} />
              )}
              {model === 'logistic' && (
                <Slider label="Sức chứa K" value={K} min={50} max={2000} step={50} suffix="" onChange={(v) => setK(Math.round(v))} />
              )}
              {model === 'predator-prey' && (
                <>
                  <Slider label="P₀ (cáo)" value={P0} min={1} max={200} step={1} suffix="" onChange={(v) => setP0(Math.round(v))} />
                  <Slider label="α (sinh thỏ)" value={alpha} min={0.2} max={2} step={0.1} suffix="" onChange={setAlpha} />
                  <Slider label="β (săn mồi)" value={beta * 1000} min={5} max={50} step={1} suffix="‱" onChange={(v) => setBeta(v / 1000)} />
                  <Slider label="γ (chết cáo)" value={gamma} min={0.1} max={1} step={0.05} suffix="" onChange={setGamma} />
                  <Slider label="δ (sinh cáo)" value={delta * 1000} min={1} max={20} step={0.5} suffix="‱" onChange={(v) => setDelta(v / 1000)} />
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            <div className="rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 p-4">
              <h3 className="font-bold text-emerald-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-cyan-300 mb-1">📈 Exponential</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">N(t) = N₀·e^(rt)</p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    Tăng nhanh không giới hạn. Chỉ đúng giai đoạn đầu khi tài nguyên dư thừa
                    (vi khuẩn nhân lên).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🧬 Logistic</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">
                    N(t) = K / (1 + ((K−N₀)/N₀)·e^(−rt))
                  </p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    S-curve. Khi N → K, tốc độ giảm về 0. Mô hình quần thể thực tế.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-rose-300 mb-1">🐺 Lotka-Volterra</h4>
                  <p className="text-white/55 font-mono bg-white/[0.04] p-1.5 rounded text-[11px]">
                    dN/dt = αN − βNP<br />
                    dP/dt = δNP − γP
                  </p>
                  <p className="text-white/55 mt-1.5 leading-relaxed">
                    Dao động tuần hoàn: thỏ tăng → cáo tăng → thỏ giảm → cáo đói → thỏ tăng lại.
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
        <span className="text-[11px] font-mono text-emerald-300">{value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500" />
    </div>
  )
}
