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
const N = NX * NY

// Velocity vectors e_i = (ex[i], ey[i])
const EX = [0,  1,  0, -1,  0,  1, -1, -1,  1]
const EY = [0,  0,  1,  0, -1,  1,  1, -1, -1]
// Weights w_i
const W = [4/9, 1/9, 1/9, 1/9, 1/9, 1/36, 1/36, 1/36, 1/36]
// Opposite indices (for bounce-back)
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6]

// ── Precomputed streaming source index table ──
// streamSrc[targetCell*Q + q] = source cell of f_q before streaming
// Saves NX*NY*Q*2 modulo ops per step (~415K ops eliminated)
const STREAM_SRC = new Int32Array(N * Q)
;(function precomputeStreaming() {
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const target = y * NX + x
      for (let q = 0; q < Q; q++) {
        // Source cell: x - EX[q], y - EY[q] (where f came from before streaming)
        const xs = (x - EX[q] + NX) % NX
        const ys = (y - EY[q] + NY) % NY
        STREAM_SRC[target * Q + q] = (ys * NX + xs) * Q + q
      }
    }
  }
})()

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

// Initialize uniform flow with small noise — inline feq for speed
function initLBM(state: LBMState, inflowU: number) {
  const f = state.f, rho = state.rho, ux = state.ux, uy = state.uy
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      const i = y * NX + x
      const rhoI = 1
      const uxI = inflowU + (Math.random() - 0.5) * 0.01
      const uyI = (Math.random() - 0.5) * 0.01
      rho[i] = rhoI; ux[i] = uxI; uy[i] = uyI
      const u2_15 = (uxI * uxI + uyI * uyI) * 1.5
      const base = i * 9
      // Inline 9 velocity directions — hard-coded EX/EY/W avoids array lookup
      f[base + 0] = (4/9) * rhoI * (1 - u2_15)
      f[base + 1] = (1/9) * rhoI * (1 + 3*uxI + 4.5*uxI*uxI - u2_15)
      f[base + 2] = (1/9) * rhoI * (1 + 3*uyI + 4.5*uyI*uyI - u2_15)
      f[base + 3] = (1/9) * rhoI * (1 - 3*uxI + 4.5*uxI*uxI - u2_15)
      f[base + 4] = (1/9) * rhoI * (1 - 3*uyI + 4.5*uyI*uyI - u2_15)
      const e5 = uxI + uyI
      f[base + 5] = (1/36) * rhoI * (1 + 3*e5 + 4.5*e5*e5 - u2_15)
      const e6 = -uxI + uyI
      f[base + 6] = (1/36) * rhoI * (1 + 3*e6 + 4.5*e6*e6 - u2_15)
      const e7 = -uxI - uyI
      f[base + 7] = (1/36) * rhoI * (1 + 3*e7 + 4.5*e7*e7 - u2_15)
      const e8 = uxI - uyI
      f[base + 8] = (1/36) * rhoI * (1 + 3*e8 + 4.5*e8*e8 - u2_15)
    }
  }
}

/**
 * LBM step: streaming + collision (BGK)
 * Optimizations vs naive version:
 *   - Precomputed STREAM_SRC table eliminates 2× modulo per cell per step
 *   - Inlined feq() into collision loop (no fn call overhead × 9 × 23K = 207K calls saved)
 *   - Hard-coded EX/EY/W constants per direction (no array index lookup in hot loop)
 *   - Inlined idx() (no fn call × 23K cells × multiple sites)
 *   - Manual swap (no destructuring tmp array allocation per step)
 *   - Local f/rho/ux/uy aliases avoid property access in tight loop
 */
function stepLBM(s: LBMState, omega: number, inflowU: number) {
  let f = s.f, fNew = s.fNew
  const solid = s.solid, rho = s.rho, ux = s.ux, uy = s.uy

  // ─── Streaming (pull scheme using precomputed source indices) ───
  // f_q[target] = f_q[source] where source = STREAM_SRC[target*Q + q]
  for (let i = 0; i < N; i++) {
    const base = i * 9
    fNew[base + 0] = f[STREAM_SRC[base + 0]]
    fNew[base + 1] = f[STREAM_SRC[base + 1]]
    fNew[base + 2] = f[STREAM_SRC[base + 2]]
    fNew[base + 3] = f[STREAM_SRC[base + 3]]
    fNew[base + 4] = f[STREAM_SRC[base + 4]]
    fNew[base + 5] = f[STREAM_SRC[base + 5]]
    fNew[base + 6] = f[STREAM_SRC[base + 6]]
    fNew[base + 7] = f[STREAM_SRC[base + 7]]
    fNew[base + 8] = f[STREAM_SRC[base + 8]]
  }
  // Manual swap — avoid destructuring temp array
  const tmp = s.f; s.f = s.fNew; s.fNew = tmp
  f = s.f; fNew = s.fNew

  // ─── Boundary conditions ───
  // Inflow left (x = 0): set ux = inflowU, rho = 1, regenerate feq
  // Pre-compute feq for inflow (constant) once outside y loop
  const _u2_15 = inflowU * inflowU * 1.5
  const fin0 = (4/9) * (1 - _u2_15)
  const fin1 = (1/9) * (1 + 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  const fin2 = (1/9) * (1 - _u2_15)
  const fin3 = (1/9) * (1 - 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  const fin4 = (1/9) * (1 - _u2_15)
  const fin5 = (1/36) * (1 + 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  const fin6 = (1/36) * (1 - 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  const fin7 = (1/36) * (1 - 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  const fin8 = (1/36) * (1 + 3*inflowU + 4.5*inflowU*inflowU - _u2_15)
  for (let y = 1; y < NY - 1; y++) {
    const i = y * NX
    ux[i] = inflowU; uy[i] = 0; rho[i] = 1
    const base = i * 9
    f[base + 0] = fin0; f[base + 1] = fin1; f[base + 2] = fin2
    f[base + 3] = fin3; f[base + 4] = fin4; f[base + 5] = fin5
    f[base + 6] = fin6; f[base + 7] = fin7; f[base + 8] = fin8
  }
  // Outflow right (x = NX-1): zero-gradient (copy from x = NX-2)
  for (let y = 1; y < NY - 1; y++) {
    const iR = y * NX + (NX - 1)
    const iL = y * NX + (NX - 2)
    const baseR = iR * 9, baseL = iL * 9
    f[baseR + 0] = f[baseL + 0]; f[baseR + 1] = f[baseL + 1]
    f[baseR + 2] = f[baseL + 2]; f[baseR + 3] = f[baseL + 3]
    f[baseR + 4] = f[baseL + 4]; f[baseR + 5] = f[baseL + 5]
    f[baseR + 6] = f[baseL + 6]; f[baseR + 7] = f[baseL + 7]
    f[baseR + 8] = f[baseL + 8]
  }
  // Top/bottom walls: bounce-back (swap with opposite direction)
  // Top wall y=0: incoming downward EY<0 (dirs 4=down, 7,8 = up-corners actually
  // EY[4]=-1,EY[7]=-1,EY[8]=-1) → bounce to upward dirs
  for (let x = 0; x < NX; x++) {
    const topBase = x * 9
    const botBase = ((NY - 1) * NX + x) * 9
    // Top wall: EY[q] < 0 means f points down (came from above wall)
    // Need to flip: f[q] = f[OPP[q]]
    // q=4 (EY=-1) ↔ OPP=2 (EY=1)
    // q=7 (EY=-1) ↔ OPP=5 (EY=1)
    // q=8 (EY=-1) ↔ OPP=6 (EY=1)
    f[topBase + 4] = f[topBase + 2]
    f[topBase + 7] = f[topBase + 5]
    f[topBase + 8] = f[topBase + 6]
    // Bottom wall: EY[q] > 0 — q=2 (EY=1), q=5 (EY=1), q=6 (EY=1)
    f[botBase + 2] = f[botBase + 4]
    f[botBase + 5] = f[botBase + 7]
    f[botBase + 6] = f[botBase + 8]
  }
  // Solid obstacles: bounce-back (swap pairs once)
  for (let i = 0; i < N; i++) {
    if (solid[i]) {
      const base = i * 9
      // Swap pairs: (1,3), (2,4), (5,7), (6,8)
      let t
      t = f[base + 1]; f[base + 1] = f[base + 3]; f[base + 3] = t
      t = f[base + 2]; f[base + 2] = f[base + 4]; f[base + 4] = t
      t = f[base + 5]; f[base + 5] = f[base + 7]; f[base + 7] = t
      t = f[base + 6]; f[base + 6] = f[base + 8]; f[base + 8] = t
    }
  }

  // ─── Macroscopic quantities + Collision (BGK) — fused loop ───
  for (let i = 0; i < N; i++) {
    if (solid[i]) {
      rho[i] = 1; ux[i] = 0; uy[i] = 0
      continue
    }
    const base = i * 9
    const f0 = f[base + 0], f1 = f[base + 1], f2 = f[base + 2], f3 = f[base + 3]
    const f4 = f[base + 4], f5 = f[base + 5], f6 = f[base + 6], f7 = f[base + 7]
    const f8 = f[base + 8]
    const r = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8
    // EX = [0, 1, 0, -1, 0, 1, -1, -1, 1]
    // EY = [0, 0, 1, 0, -1, 1, 1, -1, -1]
    const uxI = (f1 - f3 + f5 - f6 - f7 + f8) / (r > 0.001 ? r : 1)
    const uyI = (f2 - f4 + f5 + f6 - f7 - f8) / (r > 0.001 ? r : 1)
    rho[i] = r; ux[i] = uxI; uy[i] = uyI

    // Inlined feq for 9 directions + collision (BGK): f += omega * (feq - f)
    const u2_15 = (uxI * uxI + uyI * uyI) * 1.5
    const omneg = 1 - omega
    // q=0: e·u=0
    f[base + 0] = omneg * f0 + omega * (4/9) * r * (1 - u2_15)
    // q=1: EX=1, EY=0  → eu=uxI
    f[base + 1] = omneg * f1 + omega * (1/9) * r * (1 + 3*uxI + 4.5*uxI*uxI - u2_15)
    // q=2: EX=0, EY=1
    f[base + 2] = omneg * f2 + omega * (1/9) * r * (1 + 3*uyI + 4.5*uyI*uyI - u2_15)
    // q=3: EX=-1, EY=0
    f[base + 3] = omneg * f3 + omega * (1/9) * r * (1 - 3*uxI + 4.5*uxI*uxI - u2_15)
    // q=4: EX=0, EY=-1
    f[base + 4] = omneg * f4 + omega * (1/9) * r * (1 - 3*uyI + 4.5*uyI*uyI - u2_15)
    // q=5: EX=1, EY=1   → eu=uxI+uyI
    const e5 = uxI + uyI
    f[base + 5] = omneg * f5 + omega * (1/36) * r * (1 + 3*e5 + 4.5*e5*e5 - u2_15)
    // q=6: EX=-1, EY=1  → eu=-uxI+uyI
    const e6 = -uxI + uyI
    f[base + 6] = omneg * f6 + omega * (1/36) * r * (1 + 3*e6 + 4.5*e6*e6 - u2_15)
    // q=7: EX=-1, EY=-1 → eu=-uxI-uyI
    const e7 = -uxI - uyI
    f[base + 7] = omneg * f7 + omega * (1/36) * r * (1 + 3*e7 + 4.5*e7*e7 - u2_15)
    // q=8: EX=1, EY=-1  → eu=uxI-uyI
    const e8 = uxI - uyI
    f[base + 8] = omneg * f8 + omega * (1/36) * r * (1 + 3*e8 + 4.5*e8*e8 - u2_15)
  }
}

// Compute vorticity (curl) at cell (x, y) using central differences
function vorticity(s: LBMState, x: number, y: number): number {
  if (x <= 0 || x >= NX - 1 || y <= 0 || y >= NY - 1) return 0
  const base = y * NX
  const duydx = s.uy[base + (x + 1)] - s.uy[base + (x - 1)]
  const duxdy = s.ux[(y + 1) * NX + x] - s.ux[(y - 1) * NX + x]
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

// Dye particle for ink/smoke injection visualization
// Reference: "engineering CFD video" — colored streaks following flow
interface DyeParticle {
  x: number       // lattice coords
  y: number
  age: number     // frames since spawn (for fade-out)
  hue: number     // 0-360 HSL hue (rainbow injection)
  prevX: number   // for trail line segment
  prevY: number
  alive: boolean
}

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
  const [showDye, setShowDye] = useState(true)        // dye particles ribbons
  const [showVectors, setShowVectors] = useState(false) // velocity vector field
  const [dyeIntensity, setDyeIntensity] = useState(0.4) // background dim factor
  const [numStreams, setNumStreams] = useState(8)     // số luồng dye spawn
  const [fps, setFps] = useState(60)
  const stepCounterRef = useRef(0)
  const dyeRef = useRef<DyeParticle[]>([])
  const dyeHueRef = useRef(0)  // cycling hue for rainbow injection

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
    // Adaptive steps-per-frame: tăng/giảm theo FPS thực để giữ 60fps
    // 3 step/frame = ~6Hz simulation @ 60fps; nếu chậm < 30fps → drop về 1
    let stepsPerFrame = 3
    // Uint32 view của ImageData.data (RGBA → 1 uint32 per pixel)
    // Tiết kiệm 3 ops set color per pixel × NX*NY = 70K ops/frame
    const data32 = new Uint32Array(imageDataRef.current!.data.buffer)

    const loop = () => {
      const s = stateRef.current
      const img = imageDataRef.current
      const canvas = canvasRef.current
      const offCanvas = offCanvasRef.current
      if (s && img && canvas && offCanvas) {
        if (runningRef.current) {
          // Run adaptive LBM steps per frame
          for (let k = 0; k < stepsPerFrame; k++) {
            stepLBM(s, omegaRef.current, inflowURef.current)
            stepCounterRef.current += 1
          }

          // ─── Dye particle injection + advection ───
          // User: "engineering CFD video" — colored ink streams following flow
          if (showDye) {
            // Spawn new particles from inlet (left edge) — multiple streams
            for (let stream = 0; stream < numStreams; stream++) {
              const yPos = (NY * (stream + 0.5)) / numStreams
              dyeRef.current.push({
                x: 1.5, y: yPos,
                prevX: 1.5, prevY: yPos,
                age: 0,
                hue: (dyeHueRef.current + stream * 40) % 360,
                alive: true,
              })
            }
            dyeHueRef.current = (dyeHueRef.current + 4) % 360

            // Advect existing particles
            const particles = dyeRef.current
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i]
              if (!p.alive) continue
              p.prevX = p.x
              p.prevY = p.y
              const ix = Math.floor(p.x)
              const iy = Math.floor(p.y)
              if (ix < 0 || ix >= NX - 1 || iy < 0 || iy >= NY - 1 || s.solid[idx(ix, iy)]) {
                p.alive = false
                continue
              }
              // Bilinear interpolation of velocity for smooth advection
              const fx = p.x - ix, fy = p.y - iy
              const i00 = idx(ix, iy)
              const i10 = idx(ix + 1, iy)
              const i01 = idx(ix, iy + 1)
              const i11 = idx(ix + 1, iy + 1)
              const ux = s.ux[i00] * (1 - fx) * (1 - fy)
                       + s.ux[i10] * fx * (1 - fy)
                       + s.ux[i01] * (1 - fx) * fy
                       + s.ux[i11] * fx * fy
              const uy = s.uy[i00] * (1 - fx) * (1 - fy)
                       + s.uy[i10] * fx * (1 - fy)
                       + s.uy[i01] * (1 - fx) * fy
                       + s.uy[i11] * fx * fy
              // Scale by display speed (lattice unit → grid cells per frame)
              const SPEED_SCALE = 5.0
              p.x += ux * SPEED_SCALE
              p.y += uy * SPEED_SCALE
              p.age += 1
              // Kill old or out-of-bounds
              if (p.x > NX - 1 || p.x < 0 || p.y < 0 || p.y > NY - 1 || p.age > 600) {
                p.alive = false
              }
            }
            // Compact: drop dead particles when array too large
            if (particles.length > 6000) {
              dyeRef.current = particles.filter((p) => p.alive)
            }
          }
        }

        // Render to ImageData — sử dụng Uint32 view: 1 write per pixel
        // Format: 0xAABBGGRR (little-endian) — alpha lúc nào cũng 0xFF
        const mode = colorModeRef.current
        let maxV = 0.001
        if (mode === 'vorticity') maxV = 0.05
        else if (mode === 'speed') maxV = inflowURef.current * 1.5
        const solid = s.solid, sux = s.ux, suy = s.uy, srho = s.rho
        const SOLID_COLOR = 0xFF503C3C  // dark gray (R=60 G=70 B=80 A=255)
        if (mode === 'speed') {
          for (let i = 0; i < N; i++) {
            if (solid[i]) { data32[i] = SOLID_COLOR; continue }
            const speed = Math.sqrt(sux[i] * sux[i] + suy[i] * suy[i])
            const [r, g, b] = speedColor(speed, maxV)
            data32[i] = (0xFF << 24) | (b << 16) | (g << 8) | r
          }
        } else if (mode === 'vorticity') {
          // Inline vorticity computation to avoid fn call × 23K cells
          for (let y = 0; y < NY; y++) {
            const yBase = y * NX
            for (let x = 0; x < NX; x++) {
              const i = yBase + x
              if (solid[i]) { data32[i] = SOLID_COLOR; continue }
              let curl = 0
              if (x > 0 && x < NX - 1 && y > 0 && y < NY - 1) {
                const duydx = suy[yBase + (x + 1)] - suy[yBase + (x - 1)]
                const duxdy = sux[(y + 1) * NX + x] - sux[(y - 1) * NX + x]
                curl = (duydx - duxdy) * 0.5
              }
              const [r, g, b] = vorticityColor(curl, maxV)
              data32[i] = (0xFF << 24) | (b << 16) | (g << 8) | r
            }
          }
        } else {
          // pressure
          for (let i = 0; i < N; i++) {
            if (solid[i]) { data32[i] = SOLID_COLOR; continue }
            const [r, g, b] = pressureColor(srho[i])
            data32[i] = (0xFF << 24) | (b << 16) | (g << 8) | r
          }
        }
        const offCtx = offCanvas.getContext('2d')!
        offCtx.putImageData(img, 0, 0)
        // Draw scaled up to display canvas — dim if dye visible để dye nổi bật
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        // Khi showDye: vẽ field mờ hơn để particle ribbons nổi bật như video CFD eng
        if (showDye) {
          ctx.fillStyle = '#020410'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = dyeIntensity
          ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height)
          ctx.globalAlpha = 1
        } else {
          ctx.drawImage(offCanvas, 0, 0, canvas.width, canvas.height)
        }

        // ─── Dye particle ribbons (drawn AFTER background field) ───
        if (showDye) {
          const scaleX = canvas.width / NX
          const scaleY = canvas.height / NY
          const particles = dyeRef.current
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            if (!p.alive) continue
            const alpha = Math.max(0, 1 - p.age / 600) * 0.85
            const hue = p.hue
            ctx.strokeStyle = `hsla(${hue}, 100%, 65%, ${alpha})`
            ctx.lineWidth = 2.2
            // Glow effect for first few segments
            if (p.age < 60) {
              ctx.shadowColor = `hsl(${hue}, 100%, 70%)`
              ctx.shadowBlur = 6
            } else {
              ctx.shadowBlur = 0
            }
            ctx.beginPath()
            ctx.moveTo(p.prevX * scaleX, p.prevY * scaleY)
            ctx.lineTo(p.x * scaleX, p.y * scaleY)
            ctx.stroke()
          }
          ctx.shadowBlur = 0
          ctx.lineCap = 'butt'
          ctx.lineJoin = 'miter'
        }

        // ─── Velocity vectors field (optional) ───
        if (showVectors) {
          const scaleX = canvas.width / NX
          const scaleY = canvas.height / NY
          const STEP_X = 12, STEP_Y = 8
          ctx.strokeStyle = 'rgba(255,255,255,0.55)'
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.lineWidth = 1
          for (let y = STEP_Y; y < NY; y += STEP_Y) {
            for (let x = STEP_X; x < NX; x += STEP_X) {
              if (s.solid[idx(x, y)]) continue
              const ux = s.ux[idx(x, y)]
              const uy = s.uy[idx(x, y)]
              const mag = Math.sqrt(ux * ux + uy * uy)
              if (mag < 0.01) continue
              const dx = (ux / mag) * Math.min(mag * 60, 12)
              const dy = (uy / mag) * Math.min(mag * 60, 12)
              const px = x * scaleX
              const py = y * scaleY
              ctx.beginPath()
              ctx.moveTo(px, py)
              ctx.lineTo(px + dx, py + dy)
              ctx.stroke()
              // Tiny arrowhead
              const ang = Math.atan2(dy, dx)
              ctx.beginPath()
              ctx.moveTo(px + dx, py + dy)
              ctx.lineTo(px + dx - 3 * Math.cos(ang - 0.5), py + dy - 3 * Math.sin(ang - 0.5))
              ctx.lineTo(px + dx - 3 * Math.cos(ang + 0.5), py + dy - 3 * Math.sin(ang + 0.5))
              ctx.closePath()
              ctx.fill()
            }
          }
        }

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
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFps))
        setFps(measuredFps)
        setStep(stepCounterRef.current)
        // Adaptive stepsPerFrame:
        //   < 30fps → giảm xuống 1 step để giữ UI responsive
        //   30-50fps → 2 steps (cân bằng)
        //   > 50fps → 3 steps (max speed)
        if (measuredFps < 30) stepsPerFrame = 1
        else if (measuredFps < 50) stepsPerFrame = 2
        else stepsPerFrame = 3
        frameCount = 0
        lastFps = now
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [showStreamlines, showDye, showVectors, dyeIntensity, numStreams])

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
              <div className="mt-3 space-y-1.5">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={showDye}
                    onChange={(e) => setShowDye(e.target.checked)}
                    className="accent-pink-500" />
                  <span className="text-white/80 font-semibold">🌈 Bơm dye (rainbow ribbons)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={showVectors}
                    onChange={(e) => setShowVectors(e.target.checked)}
                    className="accent-cyan-500" />
                  <span className="text-white/70">Vector field</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={showStreamlines}
                    onChange={(e) => setShowStreamlines(e.target.checked)}
                    className="accent-cyan-500" />
                  <span className="text-white/70">Streamlines</span>
                </label>
              </div>
              {showDye && (
                <div className="mt-3 pt-3 border-t border-white/[0.08] space-y-2">
                  <Slider label="Số luồng dye" value={numStreams} min={2} max={20} step={1}
                    suffix="" onChange={(v) => setNumStreams(Math.round(v))} />
                  <Slider label="Độ mờ background" value={dyeIntensity} min={0.05} max={1} step={0.05}
                    suffix="" onChange={setDyeIntensity} />
                  <button
                    onClick={() => { dyeRef.current = [] }}
                    className="w-full px-2 py-1.5 rounded text-[11px] bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-200 font-bold">
                    Xoá hết particle dye
                  </button>
                </div>
              )}
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
