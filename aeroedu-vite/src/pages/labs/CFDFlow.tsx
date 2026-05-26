/**
 * CFDFlow — Mô phỏng dòng chảy CFD (Computational Fluid Dynamics)
 *
 * Route: /dashboard/labtwin/cfd-flow
 *
 * User: "tạo 1 giả lập dòng chảy như video đính kèm"
 *
 * Implementation: Lattice Boltzmann Method (LBM) D2Q9 — phương pháp số
 * giải Navier-Stokes 2D không nén được. Đây là kỹ thuật standard trong
 * các video CFD viral (flow around cylinder + Karman vortex street).
 *
 * Reference: Jos Stam + Schroeder Weber Fluids
 *
 * Features:
 *   - Grid 240×96 lattice với 9 velocity directions per cell
 *   - Inflow trái (uniform velocity), outflow phải (zero-gradient)
 *   - Top/bottom: bounce-back walls
 *   - Obstacles: vẽ chuột để thêm/xoá vật cản
 *   - 3 visualization modes: Speed colormap · Vorticity (curl) · Pressure
 *   - Preset shapes: Cylinder, Airfoil, Square, Empty
 *   - Karman vortex street tự nhiên xuất hiện khi Re ~ 100+
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Eraser, Square, Circle as CircleIcon,
  Wind, Info, Activity, Eye,
} from 'lucide-react'

// ─── LBM constants — D2Q9 ────────────────────────────────────────
// 9 velocity directions: 0=center, 1-4=cardinal, 5-8=diagonal
const NX = 240
const NY = 96
const Q = 9

// Velocity vectors e_i = (ex[i], ey[i])
const EX = [0,  1,  0, -1,  0,  1, -1, -1,  1]
const EY = [0,  0,  1,  0, -1,  1,  1, -1, -1]
// Weights w_i
const W = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36]
// Opposite indices (for bounce-back)
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6]

const CANVAS_DISPLAY_W = 720
const CANVAS_DISPLAY_H = Math.round(CANVAS_DISPLAY_W * (NY / NX))  // ≈ 288

interface LBMState {
  f: Float32Array       // distribution functions: NX*NY*Q
  fNew: Float32Array
  solid: Uint8Array     // 1 = solid (obstacle), 0 = fluid
  rho: Float32Array
  ux: Float32Array
  uy: Float32Array
}

function createLBM(): LBMState {
  const N = NX * NY
  return {
    f: new Float32Array(N * Q),
    fNew: new Float32Array(N * Q),
    solid: new Uint8Array(N),
    rho: new Float32Array(N),
    ux: new Float32Array(N),
    uy: new Float32Array(N),
  }
}

function idx(x: number, y: number) { return y * NX + x }
function idxF(x: number, y: number, q: number) { return (y * NX + x) * Q + q }

// Equilibrium distribution
function feq(rho: number, ux: number, uy: number, q: number): number {
  const eu = EX[q] * ux + EY[q] * uy
  const u2 = ux * ux + uy * uy
  return W[q] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2)
}

// Initialize uniform flow with small noise
function initLBM(state: LBMState, inflowU: number) {
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = idx(x, y)
      state.rho[i] = 1
      state.ux[i] = inflowU + (Math.random() - 0.5) * 0.01
      state.uy[i] = (Math.random() - 0.5) * 0.01
      for (let q = 0; q < Q; q++) {
        state.f[idxF(x, y, q)] = feq(state.rho[i], state.ux[i], state.uy[i], q)
      }
    }
  }
}

// LBM step: streaming + collision (BGK)
function stepLBM(s: LBMState, omega: number, inflowU: number) {
  // ─── Streaming ───
  // f_i(x + e_i, t+1) = f_i(x, t) before collision
  // Use fNew buffer
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const iCell = idx(x, y) * Q
      for (let q = 0; q < Q; q++) {
        const xS = (x + EX[q] + NX) % NX
        const yS = (y + EY[q] + NY) % NY
        s.fNew[idxF(xS, yS, q)] = s.f[iCell + q]
      }
    }
  }
  // Swap
  ;[s.f, s.fNew] = [s.fNew, s.f]

  // ─── Boundary conditions ───
  // Inflow left (x = 0): set ux = inflowU, rho = 1
  for (let y = 1; y < NY - 1; y++) {
    const i = idx(0, y)
    s.ux[i] = inflowU
    s.uy[i] = 0
    s.rho[i] = 1
    for (let q = 0; q < Q; q++) {
      s.f[idxF(0, y, q)] = feq(1, inflowU, 0, q)
    }
  }
  // Outflow right (x = NX-1): zero-gradient (copy from x = NX-2)
  for (let y = 1; y < NY - 1; y++) {
    for (let q = 0; q < Q; q++) {
      s.f[idxF(NX - 1, y, q)] = s.f[idxF(NX - 2, y, q)]
    }
  }
  // Top/bottom walls (y = 0 and y = NY-1): bounce-back
  for (let x = 0; x < NX; x++) {
    for (let q = 0; q < Q; q++) {
      // Top wall y = 0
      if (EY[q] < 0) {
        s.f[idxF(x, 0, q)] = s.f[idxF(x, 0, OPP[q])]
      }
      // Bottom wall y = NY-1
      if (EY[q] > 0) {
        s.f[idxF(x, NY - 1, q)] = s.f[idxF(x, NY - 1, OPP[q])]
      }
    }
  }
  // Solid obstacles: bounce-back all directions
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = idx(x, y)
      if (s.solid[i]) {
        // Swap f_q with f_OPP[q]
        for (let q = 1; q < Q; q++) {
          if (q < OPP[q]) {
            const a = s.f[idxF(x, y, q)]
            s.f[idxF(x, y, q)] = s.f[idxF(x, y, OPP[q])]
            s.f[idxF(x, y, OPP[q])] = a
          }
        }
      }
    }
  }

  // ─── Macroscopic quantities + Collision (BGK) ───
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = idx(x, y)
      if (s.solid[i]) {
        s.rho[i] = 1
        s.ux[i] = 0
        s.uy[i] = 0
        continue
      }
      let rho = 0, ux = 0, uy = 0
      const base = i * Q
      for (let q = 0; q < Q; q++) {
        const fi = s.f[base + q]
        rho += fi
        ux += fi * EX[q]
        uy += fi * EY[q]
      }
      if (rho > 0.001) {
        ux /= rho
        uy /= rho
      }
      s.rho[i] = rho
      s.ux[i] = ux
      s.uy[i] = uy
      // Collision: f_i = f_i - omega * (f_i - feq_i)
      for (let q = 0; q < Q; q++) {
        const eq = feq(rho, ux, uy, q)
        s.f[base + q] += omega * (eq - s.f[base + q])
      }
    }
  }
}

// Compute vorticity (curl) at cell (x, y) using central differences
function vorticity(s: LBMState, x: number, y: number): number {
  if (x <= 0 || x >= NX - 1 || y <= 0 || y >= NY - 1) return 0
  const duydx = s.uy[idx(x + 1, y)] - s.uy[idx(x - 1, y)]
  const duxdy = s.ux[idx(x, y + 1)] - s.ux[idx(x, y - 1)]
  return (duydx - duxdy) * 0.5
}

// ─── Preset obstacles ────────────────────────────────────────────

function presetCylinder(s: LBMState, cx: number, cy: number, r: number) {
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy < r * r) {
        s.solid[idx(x, y)] = 1
      }
    }
  }
}

function presetAirfoil(s: LBMState, cx: number, cy: number, len: number, thick: number) {
  // NACA-like teardrop airfoil
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const dx = (x - cx) / len
      const dy = (y - cy) / thick
      if (dx >= -1 && dx <= 1) {
        // y_max(x) = thick * sqrt(1 - x^2) (oval approx) tilted
        const yMax = Math.sqrt(Math.max(0, 1 - dx * dx)) * 0.6 * (1 + dx)
        if (Math.abs(dy) < yMax) {
          s.solid[idx(x, y)] = 1
        }
      }
    }
  }
}

function presetSquare(s: LBMState, cx: number, cy: number, half: number) {
  for (let y = cy - half; y <= cy + half; y++) {
    for (let x = cx - half; x <= cx + half; x++) {
      if (x >= 0 && x < NX && y >= 0 && y < NY) {
        s.solid[idx(x, y)] = 1
      }
    }
  }
}

function clearObstacles(s: LBMState) {
  s.solid.fill(0)
}

// ─── Color maps ──────────────────────────────────────────────────

// Blue → cyan → green → yellow → red colormap (viridis-ish for speed)
function speedColor(speed: number, max: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, speed / max))
  // 4-stop: dark blue → cyan → green → yellow → red
  if (t < 0.25) {
    const k = t * 4
    return [0, Math.round(k * 100), Math.round(120 + k * 135)]
  } else if (t < 0.5) {
    const k = (t - 0.25) * 4
    return [0, Math.round(100 + k * 155), Math.round(255 - k * 100)]
  } else if (t < 0.75) {
    const k = (t - 0.5) * 4
    return [Math.round(k * 255), 255, Math.round(155 - k * 155)]
  } else {
    const k = (t - 0.75) * 4
    return [255, Math.round(255 - k * 255), 0]
  }
}

// Vorticity: blue (negative curl, CW) → black → red (positive curl, CCW)
function vorticityColor(curl: number, max: number): [number, number, number] {
  const t = Math.max(-1, Math.min(1, curl / max))
  if (t > 0) {
    return [Math.round(255 * t), Math.round(60 * t), Math.round(60 * t)]
  } else {
    return [Math.round(60 * -t), Math.round(60 * -t), Math.round(255 * -t)]
  }
}

// Pressure: dark→bright (rho - 1)
function pressureColor(rho: number): [number, number, number] {
  const p = (rho - 1) * 50  // amplify
  const t = Math.max(-1, Math.min(1, p))
  if (t > 0) {
    return [Math.round(80 + t * 175), Math.round(80 + t * 100), 80]
  } else {
    return [40, Math.round(60 + -t * 100), Math.round(80 + -t * 175)]
  }
}

// ─── Component ───────────────────────────────────────────────────

type ColorMode = 'speed' | 'vorticity' | 'pressure'
type DrawMode = 'add' | 'erase'

export default function CFDFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<LBMState | null>(null)
  const imageDataRef = useRef<ImageData | null>(null)
  const offCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const runningRef = useRef(true)
  const inflowURef = useRef(0.1)
  const omegaRef = useRef(1.7)
  const colorModeRef = useRef<ColorMode>('vorticity')

  const [running, setRunning] = useState(true)
  const [inflowU, setInflowU] = useState(0.1)  // lattice velocity (0.05-0.2 stable)
  const [omega, setOmega] = useState(1.7)       // 1/tau (1.5-1.99 stable)
  const [colorMode, setColorMode] = useState<ColorMode>('vorticity')
  const [drawMode, setDrawMode] = useState<DrawMode>('add')
  const [brushSize, setBrushSize] = useState(4)
  const [step, setStep] = useState(0)
  const [showStreamlines, setShowStreamlines] = useState(false)
  const [fps, setFps] = useState(60)
  const stepCounterRef = useRef(0)

  runningRef.current = running
  inflowURef.current = inflowU
  omegaRef.current = omega
  colorModeRef.current = colorMode

  // Init LBM + offscreen canvas
  useEffect(() => {
    stateRef.current = createLBM()
    initLBM(stateRef.current, inflowURef.current)
    presetCylinder(stateRef.current, 50, NY / 2, 10)
    // Offscreen canvas for ImageData (lattice resolution)
    offCanvasRef.current = document.createElement('canvas')
    offCanvasRef.current.width = NX
    offCanvasRef.current.height = NY
    const offCtx = offCanvasRef.current.getContext('2d')!
    imageDataRef.current = offCtx.createImageData(NX, NY)
  }, [])

  // Main RAF loop
  useEffect(() => {
    let raf = 0
    let lastFps = performance.now()
    let frameCount = 0

    const loop = () => {
      const s = stateRef.current
      const img = imageDataRef.current
      const canvas = canvasRef.current
      const offCanvas = offCanvasRef.current
      if (s && img && canvas && offCanvas) {
        if (runningRef.current) {
          // Run multiple LBM steps per frame for speed
          const STEPS_PER_FRAME = 3
          for (let k = 0; k < STEPS_PER_FRAME; k++) {
            stepLBM(s, omegaRef.current, inflowURef.current)
            stepCounterRef.current += 1
          }
        }

        // Render to ImageData
        const data = img.data
        const mode = colorModeRef.current
        let maxV = 0.001
        if (mode === 'vorticity') maxV = 0.05
        else if (mode === 'speed') maxV = inflowURef.current * 1.5
        for (let y = 0; y < NY; y++) {
          for (let x = 0; x < NX; x++) {
            const i = idx(x, y)
            const base = (y * NX + x) * 4
            if (s.solid[i]) {
              // Solid: dark gray
              data[base + 0] = 60
              data[base + 1] = 70
              data[base + 2] = 80
              data[base + 3] = 255
              continue
            }
            let r = 0, g = 0, b = 0
            if (mode === 'speed') {
              const speed = Math.sqrt(s.ux[i] * s.ux[i] + s.uy[i] * s.uy[i])
              ;[r, g, b] = speedColor(speed, maxV)
            } else if (mode === 'vorticity') {
              const c = vorticity(s, x, y)
              ;[r, g, b] = vorticityColor(c, maxV)
            } else {
              ;[r, g, b] = pressureColor(s.rho[i])
            }
            data[base + 0] = r
            data[base + 1] = g
            data[base + 2] = b
            data[base + 3] = 255
          }
        }
        const offCtx = offCanvas.getContext('2d')!
        offCtx.putImageData(img, 0, 0)
        // Draw scaled up to display canvas
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height)

        // Draw streamlines (optional overlay)
        if (showStreamlines) {
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.lineWidth = 1
          const scaleX = canvas.width / NX
          const scaleY = canvas.height / NY
          // Sample seed points on left edge + grid
          const numSeedsX = 12, numSeedsY = 8
          for (let sy = 1; sy <= numSeedsY; sy++) {
            for (let sx = 0; sx < numSeedsX; sx++) {
              let x = (sx / numSeedsX) * NX + 5
              let y = (sy / (numSeedsY + 1)) * NY
              ctx.beginPath()
              ctx.moveTo(x * scaleX, y * scaleY)
              for (let i = 0; i < 60; i++) {
                const ix = Math.floor(x), iy = Math.floor(y)
                if (ix < 0 || ix >= NX || iy < 0 || iy >= NY) break
                if (s.solid[idx(ix, iy)]) break
                x += s.ux[idx(ix, iy)] * 4
                y += s.uy[idx(ix, iy)] * 4
                ctx.lineTo(x * scaleX, y * scaleY)
              }
              ctx.stroke()
            }
          }
        }
      }

      frameCount += 1
      const now = performance.now()
      if (now - lastFps > 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFps)))
        setStep(stepCounterRef.current)
        frameCount = 0
        lastFps = now
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [showStreamlines])

  // Mouse drawing on canvas
  const drawingRef = useRef(false)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || !s) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const cx = Math.round(mx * NX)
    const cy = Math.round(my * NY)
    const r = brushSize
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy <= r * r && x >= 0 && x < NX && y >= 0 && y < NY) {
          s.solid[idx(x, y)] = drawMode === 'add' ? 1 : 0
        }
      }
    }
  }

  const applyPreset = (preset: 'cylinder' | 'airfoil' | 'square' | 'clear') => {
    const s = stateRef.current
    if (!s) return
    clearObstacles(s)
    if (preset === 'cylinder') presetCylinder(s, 50, NY / 2, 10)
    else if (preset === 'airfoil') presetAirfoil(s, 60, NY / 2, 20, 8)
    else if (preset === 'square') presetSquare(s, 50, NY / 2, 8)
  }

  const resetFlow = () => {
    const s = stateRef.current
    if (!s) return
    initLBM(s, inflowURef.current)
    stepCounterRef.current = 0
  }

  // Reynolds number estimate (characteristic length = obstacle ~20 cells)
  const Re = (inflowU * 20) / ((1 / omega - 0.5) / 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent flex items-center gap-2">
                <Wind className="w-6 h-6 text-cyan-400" />
                CFD Flow — Mô phỏng dòng chảy 2D
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Lattice Boltzmann D2Q9 · Navier-Stokes 2D · Karman vortex street
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
            <button onClick={resetFlow}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Controls */}
          <div className="space-y-3">
            {/* Visualization mode */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2 flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> Chế độ hiển thị
              </h3>
              <div className="space-y-1.5">
                {([
                  { id: 'vorticity' as const, label: '🌀 Xoáy (Vorticity)', desc: 'CCW đỏ · CW xanh' },
                  { id: 'speed' as const,    label: '⚡ Vận tốc (Speed)',  desc: 'Blue→Cyan→Yellow→Red' },
                  { id: 'pressure' as const, label: '💨 Áp suất',           desc: 'High đỏ · Low xanh' },
                ] as const).map((m) => (
                  <button key={m.id} onClick={() => setColorMode(m.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition ${
                      colorMode === m.id
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-100'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/65 hover:bg-white/[0.08]'
                    }`}>
                    <div className="font-bold">{m.label}</div>
                    <div className="text-[10px] text-white/45 mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showStreamlines}
                  onChange={(e) => setShowStreamlines(e.target.checked)}
                  className="accent-cyan-500" />
                <span className="text-white/70">Vẽ streamlines</span>
              </label>
            </div>

            {/* Flow params */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Thông số dòng chảy
              </h3>
              <Slider label="Vận tốc đầu vào U" value={inflowU} min={0.02} max={0.18} step={0.005}
                suffix="" onChange={setInflowU} />
              <Slider label="Hệ số ω (1/τ)" value={omega} min={1.4} max={1.95} step={0.01}
                suffix="" onChange={setOmega} />
              <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/25 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-violet-200/70">Reynolds (Re)</span>
                  <span className="text-sm font-bold font-mono text-violet-300">
                    {Re.toFixed(0)}
                  </span>
                </div>
                <p className="text-[9px] text-white/45 mt-1">
                  Re ~ 100+: vortex street xuất hiện
                </p>
              </div>
            </div>

            {/* Obstacle drawing */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                ✏️ Vẽ vật cản
              </h3>
              <div className="flex gap-1 mb-2">
                <button onClick={() => setDrawMode('add')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition ${
                    drawMode === 'add' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/55'
                  }`}>
                  ➕ Thêm
                </button>
                <button onClick={() => setDrawMode('erase')}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-bold transition ${
                    drawMode === 'erase' ? 'bg-rose-500/20 border border-rose-500/40 text-rose-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/55'
                  }`}>
                  <Eraser className="w-3 h-3 inline mr-1" /> Xoá
                </button>
              </div>
              <Slider label="Kích cỡ bút" value={brushSize} min={1} max={10} step={1}
                suffix="px" onChange={(v) => setBrushSize(Math.round(v))} />
              <div className="text-[10px] text-white/45 italic mt-1">
                Bấm + kéo trên màn hình để thêm/xoá vật cản
              </div>
            </div>

            {/* Presets */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                🎯 Vật cản preset
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => applyPreset('cylinder')}
                  className="px-2 py-2 rounded text-xs font-bold bg-blue-500/15 border border-blue-500/30 hover:bg-blue-500/25 text-blue-200 flex items-center gap-1.5 transition">
                  <CircleIcon className="w-3.5 h-3.5" /> Trụ tròn
                </button>
                <button onClick={() => applyPreset('airfoil')}
                  className="px-2 py-2 rounded text-xs font-bold bg-violet-500/15 border border-violet-500/30 hover:bg-violet-500/25 text-violet-200 flex items-center gap-1.5 transition">
                  ✈️ Cánh máy bay
                </button>
                <button onClick={() => applyPreset('square')}
                  className="px-2 py-2 rounded text-xs font-bold bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 flex items-center gap-1.5 transition">
                  <Square className="w-3.5 h-3.5" /> Vuông
                </button>
                <button onClick={() => applyPreset('clear')}
                  className="px-2 py-2 rounded text-xs font-bold bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] text-white/65 flex items-center gap-1.5 transition">
                  <Eraser className="w-3.5 h-3.5" /> Trống
                </button>
              </div>
            </div>
          </div>

          {/* Canvas + theory */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-2">
              <div className="flex items-center justify-between mb-2 px-2 text-xs">
                <span className="text-white/50">
                  Lattice {NX}×{NY} · Step {step.toLocaleString()}
                </span>
                <span className="font-mono text-emerald-300">{fps} FPS</span>
              </div>
              <canvas ref={canvasRef}
                width={CANVAS_DISPLAY_W} height={CANVAS_DISPLAY_H}
                className="w-full h-auto rounded-lg cursor-crosshair"
                onMouseDown={(e) => { drawingRef.current = true; handleMouseMove(e) }}
                onMouseUp={() => { drawingRef.current = false }}
                onMouseLeave={() => { drawingRef.current = false }}
                onMouseMove={handleMouseMove}
              />
            </div>

            {/* Theory */}
            <div className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-4">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết Lattice Boltzmann (LBM)
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-violet-300 mb-1">📐 Phương pháp D2Q9</h4>
                  <p className="text-white/55 leading-relaxed">
                    Mỗi cell có 9 phân bố vận tốc (center + 4 cardinal + 4 diagonal).
                    LBM giải Navier-Stokes không nén được qua 2 bước:
                    <strong> Streaming</strong> (di chuyển f<sub>i</sub> sang cell lân cận) +
                    <strong> Collision</strong> (BGK relaxation về equilibrium f<sub>i</sub><sup>eq</sup>).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">🌀 Karman Vortex Street</h4>
                  <p className="text-white/55 leading-relaxed">
                    Khi Re ≥ 100 (Reynolds = UD/ν), dòng chảy quanh trụ tròn
                    tạo ra <strong>chuỗi xoáy luân phiên</strong> CW-CCW phía sau.
                    Hiện tượng xảy ra trong tự nhiên: gió thổi qua cột điện, cờ
                    bay, ống khói.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">🎨 3 chế độ hiển thị</h4>
                  <p className="text-white/55 leading-relaxed">
                    <strong>Vorticity</strong> (curl): cho thấy xoáy rõ nhất, mặc định.<br />
                    <strong>Speed</strong>: cường độ tốc độ với 5-stop colormap.<br />
                    <strong>Pressure</strong>: ρ deviation từ giá trị nền.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-rose-300 mb-1">⚠️ Stability</h4>
                  <p className="text-white/55 leading-relaxed">
                    ω &lt; 2 (BGK stability). U &lt; 0.2 lattice unit (Mach number bé).
                    ω quá gần 2 → viscosity rất nhỏ → vortex sắc nét nhưng có thể
                    không ổn định.
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
        <span className="text-[11px] font-mono text-cyan-300">{value.toFixed(step < 0.01 ? 3 : 2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
    </div>
  )
}
