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
  ArrowLeft, Play, Pause, RotateCcw, Eraser,
  Wind, Info, Activity, Eye, Camera, Download, Copy, X, FileText, Check,
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

// ─── Extended shape library ──────────────────────────────────────
// Tất cả shape function nhận (state, cx, cy, ...) và set solid[i] = 1 cho
// các cell nằm trong shape. Không clear trước → cho phép composite multiple
// shapes (vd Sphere-on-stick = circle + plate).

// Ellipse (trục lớn `a` ngang, trục bé `b` dọc, xoay góc `theta` rad)
function presetEllipse(s: LBMState, cx: number, cy: number, a: number, b: number, theta = 0) {
  const c = Math.cos(theta), si = Math.sin(theta)
  // Loop bounding box
  const R = Math.max(a, b) + 1
  for (let y = Math.max(0, cy - R); y <= Math.min(NY - 1, cy + R); y++) {
    for (let x = Math.max(0, cx - R); x <= Math.min(NX - 1, cx + R); x++) {
      const dx = x - cx, dy = y - cy
      // Rotate point into ellipse-aligned coords
      const rx = c * dx + si * dy
      const ry = -si * dx + c * dy
      if ((rx * rx) / (a * a) + (ry * ry) / (b * b) < 1) {
        s.solid[idx(x, y)] = 1
      }
    }
  }
}

// Triangle (dir: 'left' = mũi nhọn quay TRÁI đối diện dòng → wedge cản;
//            'right' = mũi nhọn quay PHẢI cùng chiều dòng → mũi tên thuận chiều)
function presetTriangle(s: LBMState, cx: number, cy: number, size: number, dir: 'left' | 'right' = 'left') {
  // Forward (left): vertex pointing into flow → wedge dạng cản
  // Reverse (right): vertex trailing flow → mũi tên streamlined
  for (let y = cy - size; y <= cy + size; y++) {
    if (y < 0 || y >= NY) continue
    const dy = y - cy
    // Width at this y: tapers linearly with |dy|
    const widthAtY = size - Math.abs(dy)
    if (widthAtY <= 0) continue
    for (let x = -widthAtY; x <= widthAtY; x++) {
      const X = dir === 'left' ? cx + x : cx - x
      if (X >= 0 && X < NX) s.solid[idx(X, y)] = 1
    }
  }
}

// Diamond (rotated square 45°)
function presetDiamond(s: LBMState, cx: number, cy: number, half: number) {
  for (let y = cy - half; y <= cy + half; y++) {
    if (y < 0 || y >= NY) continue
    const dy = Math.abs(y - cy)
    const widthAtY = half - dy
    if (widthAtY < 0) continue
    for (let x = cx - widthAtY; x <= cx + widthAtY; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
}

// Half-circle dome (flat side trên/dưới/trái/phải)
function presetHalfCircle(s: LBMState, cx: number, cy: number, r: number, flat: 'top' | 'bottom' | 'left' | 'right' = 'bottom') {
  for (let y = cy - r; y <= cy + r; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx - r; x <= cx + r; x++) {
      if (x < 0 || x >= NX) continue
      const dx = x - cx, dy = y - cy
      if (dx * dx + dy * dy < r * r) {
        const keep = flat === 'bottom' ? dy <= 0
                   : flat === 'top'    ? dy >= 0
                   : flat === 'left'   ? dx >= 0
                   :                     dx <= 0  // 'right'
        if (keep) s.solid[idx(x, y)] = 1
      }
    }
  }
}

// Flat plate (vertical default — perpendicular to flow)
function presetPlate(s: LBMState, cx: number, cy: number, height: number, thickness = 2, angle = 0) {
  const c = Math.cos(angle), si = Math.sin(angle)
  const halfH = height / 2, halfT = thickness / 2
  // Loop bounding box of rotated plate
  const R = Math.ceil(Math.sqrt(halfH * halfH + halfT * halfT)) + 1
  for (let y = Math.max(0, cy - R); y <= Math.min(NY - 1, cy + R); y++) {
    for (let x = Math.max(0, cx - R); x <= Math.min(NX - 1, cx + R); x++) {
      const dx = x - cx, dy = y - cy
      // Rotate into plate-aligned coords
      const rx = c * dx + si * dy
      const ry = -si * dx + c * dy
      if (Math.abs(rx) <= halfT && Math.abs(ry) <= halfH) {
        s.solid[idx(x, y)] = 1
      }
    }
  }
}

// Cross / plus sign
function presetCross(s: LBMState, cx: number, cy: number, size: number, thick: number) {
  presetPlate(s, cx, cy, size * 2, thick, 0)            // horizontal bar
  presetPlate(s, cx, cy, size * 2, thick, Math.PI / 2)  // vertical bar
}

// Cylinder array — grid của n×m circles
function presetCylinderArray(s: LBMState, cx: number, cy: number, nCol: number, nRow: number, spacing: number, r: number) {
  const totalW = (nCol - 1) * spacing
  const totalH = (nRow - 1) * spacing
  const x0 = cx - totalW / 2
  const y0 = cy - totalH / 2
  for (let row = 0; row < nRow; row++) {
    for (let col = 0; col < nCol; col++) {
      presetCylinder(s, x0 + col * spacing, y0 + row * spacing, r)
    }
  }
}

// Teardrop (streamlined body) — tròn đầu, nhọn đuôi
function presetTeardrop(s: LBMState, cx: number, cy: number, len: number, thick: number) {
  for (let y = cy - thick; y <= cy + thick; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx - len; x <= cx + len; x++) {
      if (x < 0 || x >= NX) continue
      const t = (x - cx + len) / (2 * len)  // 0 at nose (left), 1 at tail (right)
      // Profile: half-circle nose + tapering linear tail
      let halfH
      if (t < 0.3) {
        // Tròn đầu: circular
        const localX = (0.3 - t) * 2 * len  // distance from nose tip
        const r = thick * 0.6
        halfH = Math.sqrt(Math.max(0, r * r - localX * localX))
      } else {
        // Đuôi: tapering từ thick → 0
        halfH = thick * (1 - (t - 0.3) / 0.7)
      }
      if (Math.abs(y - cy) < halfH) s.solid[idx(x, y)] = 1
    }
  }
}

// Wedge (góc nhọn forward, đáy phẳng phía sau)
function presetWedge(s: LBMState, cx: number, cy: number, len: number, halfBase: number) {
  // Vertex bên trái (cx-len), đáy bên phải (cx+0)
  for (let x = cx - len; x <= cx; x++) {
    if (x < 0 || x >= NX) continue
    const t = (x - (cx - len)) / len  // 0 at vertex, 1 at base
    const halfH = halfBase * t
    for (let y = cy - halfH; y <= cy + halfH; y++) {
      if (y >= 0 && y < NY) s.solid[idx(x, Math.round(y))] = 1
    }
  }
}

// Hai trụ song song (tandem) — wake interference demo
function presetTandem(s: LBMState, cx: number, cy: number, r: number, gap: number) {
  presetCylinder(s, cx - gap / 2, cy, r)
  presetCylinder(s, cx + gap / 2, cy, r)
}

// 2 trụ side-by-side (parallel, vuông góc với dòng)
function presetSideBySide(s: LBMState, cx: number, cy: number, r: number, gap: number) {
  presetCylinder(s, cx, cy - gap / 2, r)
  presetCylinder(s, cx, cy + gap / 2, r)
}

// U-channel (hình chữ U mở ra phía dòng, like a bluff body)
function presetUChannel(s: LBMState, cx: number, cy: number, w: number, h: number, t: number) {
  // Bottom bar
  for (let y = cy + h - t; y <= cy + h; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx - w; x <= cx + w; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
  // Left wall
  for (let y = cy - h; y <= cy + h; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx - w; x <= cx - w + t; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
  // Right wall
  for (let y = cy - h; y <= cy + h; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx + w - t; x <= cx + w; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
}

// Heart shape (parametric) — fun shape, không có giá trị CFD đặc biệt
function presetHeart(s: LBMState, cx: number, cy: number, size: number) {
  // Heart eq: (x² + y² − 1)³ − x² y³ < 0, scale to size
  for (let y = cy - size; y <= cy + size; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx - size; x <= cx + size; x++) {
      if (x < 0 || x >= NX) continue
      const X = (x - cx) / size
      const Y = -(y - cy) / size  // flip Y axis
      const f = (X * X + Y * Y - 1)
      if (f * f * f - X * X * Y * Y * Y < 0) {
        s.solid[idx(x, y)] = 1
      }
    }
  }
}

// Car silhouette (low-poly side view facing left — flow comes from left)
function presetCar(s: LBMState, cx: number, cy: number, scale: number) {
  // Body: rectangle low + roof rectangle higher
  // Wheels: 2 circles
  const bodyW = scale * 2.5, bodyH = scale * 0.6
  const roofW = scale * 1.2, roofH = scale * 0.6
  const wheelR = scale * 0.35
  // Body (rectangle)
  for (let y = cy; y <= cy + bodyH; y++) {
    for (let x = cx - bodyW; x <= cx + bodyW; x++) {
      if (x >= 0 && x < NX && y >= 0 && y < NY) s.solid[idx(x, Math.round(y))] = 1
    }
  }
  // Roof — front slanted (windshield), rear vertical
  for (let y = cy - roofH; y <= cy; y++) {
    if (y < 0 || y >= NY) continue
    const t = (cy - y) / roofH  // 0 at body, 1 at top
    // Front edge slopes back (windshield)
    const xL = cx - roofW + t * roofW * 0.4
    const xR = cx + roofW
    for (let x = xL; x <= xR; x++) {
      const xi = Math.round(x)
      if (xi >= 0 && xi < NX) s.solid[idx(xi, Math.round(y))] = 1
    }
  }
  // Wheels
  presetCylinder(s, cx - bodyW * 0.6, cy + bodyH, wheelR)
  presetCylinder(s, cx + bodyW * 0.6, cy + bodyH, wheelR)
}

// L-shape (góc 90° như góc tường) — corner separation demo
function presetLShape(s: LBMState, cx: number, cy: number, size: number, t: number) {
  // Vertical leg
  for (let y = cy - size; y <= cy + size; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx; x <= cx + t; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
  // Horizontal leg
  for (let y = cy + size - t; y <= cy + size; y++) {
    if (y < 0 || y >= NY) continue
    for (let x = cx; x <= cx + size; x++) {
      if (x >= 0 && x < NX) s.solid[idx(x, y)] = 1
    }
  }
}

// Polygon fill — chấp nhận array vertices [x, y] trong lattice coords,
// dùng ray-casting để fill interior. Dùng cho free-draw shape tool.
function fillPolygon(s: LBMState, verts: [number, number][]) {
  if (verts.length < 3) return
  // Bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [x, y] of verts) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  minX = Math.max(0, Math.floor(minX))
  minY = Math.max(0, Math.floor(minY))
  maxX = Math.min(NX - 1, Math.ceil(maxX))
  maxY = Math.min(NY - 1, Math.ceil(maxY))

  const inside = (px: number, py: number) => {
    let inside = false
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const [xi, yi] = verts[i]
      const [xj, yj] = verts[j]
      if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) {
        inside = !inside
      }
    }
    return inside
  }
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (inside(x + 0.5, y + 0.5)) s.solid[idx(x, y)] = 1
    }
  }
}

function clearObstacles(s: LBMState) {
  s.solid.fill(0)
}

// ─── Snapshot report — phân tích dòng chảy + lực + diễn giải Re regime ──
//
// Output cho FE render báo cáo. Tính tại thời điểm gọi (sim state hiện tại).
//
// Drag/lift dùng Momentum Exchange Method (MEM) — Mohamad 2011 §4.6:
//   Force_on_solid = Σ_{fluid cell i, direction q: i+e_q in solid}  2 · e_q · f_q(i)
// Đây là momentum bị bounce-back tại boundary. Đơn vị lattice (lu).
// Hệ số:  Cd = 2 · F_x / (ρ_∞ · U² · D)
//        Cl = 2 · F_y / (ρ_∞ · U² · D)
// với D = chiều dài đặc trưng (ước lượng từ bounding box).
//
// Viscosity:  ν = (τ - 0.5) / 3 = (1/ω - 0.5) / 3   (lu²/ts)
// Reynolds:   Re = U · D / ν

export interface CFDReport {
  timestamp: string
  grid:    { NX: number; NY: number; totalCells: number }
  sim:     { U: number; omega: number; tau: number; nu: number; step: number; colorMode: string }
  obstacle:{ solidCount: number; bbox: { x0: number; y0: number; x1: number; y1: number } | null; D: number; coverage: number; hasObstacle: boolean }
  flow:    { maxSpeed: number; avgSpeed: number; wakeAvg: number; maxVort: number; maxP: number; minP: number }
  forces:  { Fx: number; Fy: number; Cd: number; Cl: number }
  Re:      number
  regime:  string
  interpretation: string
  benchmark: string  // so sánh với giá trị chuẩn (vd Cd cylinder Re=100 ≈ 1.2)
}

function computeReport(s: LBMState, U: number, omega: number, step: number, colorMode: string): CFDReport {
  const tau = 1 / omega
  const nu = (tau - 0.5) / 3

  // ─ Obstacle bbox + solid count ─
  let x0 = NX, x1 = -1, y0 = NY, y1 = -1, solidCount = 0
  for (let y = 0; y < NY; y++) {
    for (let x = 0; x < NX; x++) {
      if (s.solid[idx(x, y)]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
        solidCount++
      }
    }
  }
  const hasObstacle = solidCount > 0
  const bbox = hasObstacle ? { x0, y0, x1, y1 } : null
  // Chiều dài đặc trưng: max(width, height) — phù hợp cylinder/sphere.
  // Nếu obstacle elongated dọc flow (vd airfoil), giá trị này phản ánh chord.
  const D = hasObstacle ? Math.max(x1 - x0, y1 - y0) + 1 : 20
  const Re = (U * D) / nu

  // ─ Flow stats ─
  let maxSpeed = 0, totalSpeed = 0, fluidCount = 0
  let maxVort = 0, maxP = -Infinity, minP = Infinity
  let wakeSum = 0, wakeN = 0
  // Wake region: dải dọc obstacle, từ trailing edge đến tray 30 cells về phía xuôi dòng
  const wakeX0 = hasObstacle ? x1 + 2 : -1
  const wakeX1 = hasObstacle ? Math.min(NX - 2, x1 + 32) : -1
  const wakeY0 = hasObstacle ? Math.max(1, y0 - 5) : -1
  const wakeY1 = hasObstacle ? Math.min(NY - 2, y1 + 5) : -1
  for (let y = 1; y < NY - 1; y++) {
    for (let x = 1; x < NX - 1; x++) {
      const i = idx(x, y)
      if (s.solid[i]) continue
      const ux = s.ux[i], uy = s.uy[i]
      const spd = Math.sqrt(ux * ux + uy * uy)
      if (spd > maxSpeed) maxSpeed = spd
      totalSpeed += spd
      fluidCount++
      // Vorticity (curl) — central difference
      const duydx = s.uy[idx(x + 1, y)] - s.uy[idx(x - 1, y)]
      const duxdy = s.ux[idx(x, y + 1)] - s.ux[idx(x, y - 1)]
      const vort = Math.abs((duydx - duxdy) * 0.5)
      if (vort > maxVort) maxVort = vort
      const p = s.rho[i] - 1  // pressure deviation
      if (p > maxP) maxP = p
      if (p < minP) minP = p
      if (hasObstacle && x >= wakeX0 && x <= wakeX1 && y >= wakeY0 && y <= wakeY1) {
        wakeSum += spd
        wakeN += 1
      }
    }
  }
  const avgSpeed = fluidCount > 0 ? totalSpeed / fluidCount : 0
  const wakeAvg = wakeN > 0 ? wakeSum / wakeN : 0

  // ─ Drag / lift via Momentum Exchange Method ─
  // Lưới EX/EY cho 9 directions — duplicated cho hot loop (no array lookup)
  let Fx = 0, Fy = 0
  if (hasObstacle) {
    // Velocity vectors per direction
    const EX_ = EX, EY_ = EY  // alias top-level arrays
    for (let y = 1; y < NY - 1; y++) {
      for (let x = 1; x < NX - 1; x++) {
        const i = idx(x, y)
        if (s.solid[i]) continue
        const base = i * 9
        // Loop 8 non-rest directions
        for (let q = 1; q < 9; q++) {
          const nx = x + EX_[q], ny = y + EY_[q]
          if (nx >= 0 && nx < NX && ny >= 0 && ny < NY && s.solid[idx(nx, ny)]) {
            const w = 2 * s.f[base + q]
            Fx += EX_[q] * w
            Fy += EY_[q] * w
          }
        }
      }
    }
  }
  const denom = U * U * D  // ρ_∞ = 1 trong LBM normalized
  const Cd = denom > 0 ? Fx / denom : 0
  const Cl = denom > 0 ? Fy / denom : 0

  // ─ Re regime interpretation (cylinder benchmark) ─
  let regime: string, interpretation: string, benchmark: string
  if (Re < 1) {
    regime = 'Stokes flow (Re < 1)'
    interpretation = 'Dòng nhớt thuần — chảy đối xứng quanh vật, không có wake. Quán tính không đáng kể, lực cản chủ yếu do nhớt.'
    benchmark = 'Cd ∝ 1/Re. Cylinder Stokes: Cd ≈ 8π/(Re·ln(7.4/Re)). Sphere: Cd = 24/Re.'
  } else if (Re < 40) {
    regime = 'Steady symmetric wake (1 ≤ Re < 40)'
    interpretation = 'Cặp xoáy đứng yên (twin attached vortices) phía sau vật cản, đối xứng. Chưa có shedding.'
    benchmark = 'Cylinder Re=20: Cd ≈ 2.05. Re=40: Cd ≈ 1.55.'
  } else if (Re < 200) {
    regime = 'Karman vortex street (40 ≤ Re < 200, laminar shedding)'
    interpretation = 'Chuỗi xoáy CW-CCW shed luân phiên (von Karman). Số Strouhal St ≈ 0.20 → tần số shedding f = St·U/D.'
    benchmark = `Cylinder Re=100: Cd ≈ 1.4, St ≈ 0.16. Strouhal f ≈ ${(0.2 * U / D).toFixed(4)} lu/ts.`
  } else if (Re < 1000) {
    regime = 'Transitional wake (200 ≤ Re < 10³)'
    interpretation = 'Wake bắt đầu nhiễu loạn 3D (chỉ mô phỏng 2D ở đây). Vortex shedding vẫn rõ nhưng có nhiễu nhỏ.'
    benchmark = 'Cylinder Re=500: Cd ≈ 1.2, St ≈ 0.21.'
  } else if (Re < 2e5) {
    regime = 'Sub-critical turbulent wake (10³ ≤ Re < 2·10⁵)'
    interpretation = 'Boundary layer laminar, wake turbulent. Cd gần như hằng số.'
    benchmark = 'Cylinder Re ≈ 10⁴–10⁵: Cd ≈ 1.0–1.2.'
  } else {
    regime = 'Super-critical (Re ≥ 2·10⁵, drag crisis)'
    interpretation = 'Boundary layer chuyển turbulent → trễ separation → Cd giảm đột ngột (drag crisis).'
    benchmark = 'Cylinder Re > 3·10⁵: Cd có thể giảm tới 0.3.'
  }

  return {
    timestamp: new Date().toISOString(),
    grid: { NX, NY, totalCells: NX * NY },
    sim:  { U, omega, tau, nu, step, colorMode },
    obstacle: { solidCount, bbox, D, coverage: solidCount / (NX * NY), hasObstacle },
    flow: { maxSpeed, avgSpeed, wakeAvg, maxVort, maxP, minP },
    forces: { Fx, Fy, Cd, Cl },
    Re, regime, interpretation, benchmark,
  }
}

// Markdown export — paste-friendly cho báo cáo Word/Notion/Google Doc
function reportToMarkdown(r: CFDReport): string {
  const d = new Date(r.timestamp).toLocaleString('vi-VN')
  const lines = [
    `# Báo cáo mô phỏng CFD — ${d}`,
    `Sinh bởi inphysic.com · /dashboard/labtwin/cfd-flow · Lattice Boltzmann D2Q9`,
    '',
    '## Thông số mô phỏng',
    `- Lưới: **${r.grid.NX} × ${r.grid.NY}** = ${r.grid.totalCells.toLocaleString()} ô`,
    `- Vận tốc đầu vào U: **${r.sim.U.toFixed(3)}** lu/ts`,
    `- Hệ số ω: **${r.sim.omega.toFixed(2)}** → τ = ${r.sim.tau.toFixed(3)}, ν = ${r.sim.nu.toFixed(4)} lu²/ts`,
    `- **Reynolds Re = ${r.Re.toFixed(1)}**`,
    `- Bước thời gian đã chạy: ${r.sim.step.toLocaleString()}`,
    `- Chế độ hiển thị: ${r.sim.colorMode}`,
    '',
    '## Vật cản',
    r.obstacle.hasObstacle
      ? `- Tổng ô solid: **${r.obstacle.solidCount}** (${(r.obstacle.coverage * 100).toFixed(2)}% lưới)`
      : '- **Không có vật cản** (dòng tự do)',
    r.obstacle.bbox
      ? `- Bounding box: (${r.obstacle.bbox.x0}, ${r.obstacle.bbox.y0}) → (${r.obstacle.bbox.x1}, ${r.obstacle.bbox.y1}), kích thước ${r.obstacle.bbox.x1 - r.obstacle.bbox.x0 + 1} × ${r.obstacle.bbox.y1 - r.obstacle.bbox.y0 + 1}`
      : '',
    `- Chiều dài đặc trưng D: **${r.obstacle.D}** cell`,
    '',
    '## Đặc trưng dòng chảy',
    `- Vận tốc cực đại: **${r.flow.maxSpeed.toFixed(4)}** lu/ts (${((r.flow.maxSpeed / r.sim.U) * 100 - 100).toFixed(0)}% so với U inflow)`,
    `- Vận tốc trung bình (toàn miền fluid): ${r.flow.avgSpeed.toFixed(4)} lu/ts`,
    r.obstacle.hasObstacle
      ? `- Vận tốc trung bình wake (downstream 30 cell): **${r.flow.wakeAvg.toFixed(4)}** lu/ts → ${(100 - (r.flow.wakeAvg / r.sim.U) * 100).toFixed(0)}% defect so với inflow`
      : '',
    `- Xoáy cực đại |∇×u|: ${r.flow.maxVort.toFixed(4)} lu/ts`,
    `- Áp suất chênh lệch (ρ − 1): ${r.flow.minP.toFixed(5)} ↔ ${r.flow.maxP.toFixed(5)}`,
    '',
    '## Lực tác dụng (Momentum Exchange Method)',
    `- Lực cản F_x: ${r.forces.Fx.toFixed(4)} lu`,
    `- Lực nâng F_y: ${r.forces.Fy.toFixed(4)} lu ${Math.abs(r.forces.Cl) < 0.05 ? '(≈ 0 — đối xứng)' : ''}`,
    `- **Hệ số cản C_d = ${r.forces.Cd.toFixed(3)}**`,
    `- **Hệ số nâng C_l = ${r.forces.Cl.toFixed(3)}**`,
    '',
    `## Chế độ dòng chảy: ${r.regime}`,
    r.interpretation,
    '',
    '**So sánh chuẩn:** ' + r.benchmark,
    '',
    '---',
    '*Lưu ý: số liệu lattice unit (lu/ts). Để chuyển sang SI cần biết hệ số quy đổi (chiều dài, vận tốc, thời gian) của bài toán thực.*',
  ]
  return lines.filter(l => l !== undefined).join('\n')
}

// ─── Shape catalog ──────────────────────────────────────────────
// Mỗi shape có:
//   id       — định danh
//   label    — tiếng Việt UI
//   icon     — emoji preview
//   category — grouping cho UI ('basic' | 'aero' | 'array' | 'fun')
//   build(state, cx, cy) — apply mask
//   re       — Reynolds range gợi ý ('low'|'medium'|'high'|'any')
type ShapeId =
  | 'cylinder' | 'square' | 'diamond' | 'triangleL' | 'triangleR'
  | 'ellipseH' | 'ellipseV' | 'plateV' | 'plateInclined' | 'dome' | 'cross'
  | 'airfoil' | 'teardrop' | 'wedge'
  | 'tandem' | 'sideBySide' | 'cylArr23'
  | 'car' | 'lShape' | 'uChannel' | 'heart'

interface ShapeDef {
  id: ShapeId
  label: string
  icon: string
  category: 'basic' | 'aero' | 'array' | 'fun'
  re: 'low' | 'medium' | 'high' | 'any'
  build: (s: LBMState, cx: number, cy: number) => void
  desc?: string
}

const SHAPES: ShapeDef[] = [
  // Basic — hình cơ bản, dùng cho dạy lý thuyết
  { id: 'cylinder', label: 'Trụ tròn', icon: '⬤', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetCylinder(s, cx, cy, 10),
    desc: 'Karman vortex street Re≥100' },
  { id: 'square', label: 'Vuông', icon: '■', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetSquare(s, cx, cy, 8),
    desc: 'Sharp corner separation' },
  { id: 'diamond', label: 'Thoi (45°)', icon: '◆', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetDiamond(s, cx, cy, 11),
    desc: 'Vortex từ đỉnh trên-dưới' },
  { id: 'triangleL', label: 'Tam giác cản', icon: '◀', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetTriangle(s, cx, cy, 11, 'left'),
    desc: 'Mũi nhọn đón dòng' },
  { id: 'triangleR', label: 'Tam giác thuận', icon: '▶', category: 'basic', re: 'low',
    build: (s, cx, cy) => presetTriangle(s, cx, cy, 11, 'right'),
    desc: 'Mặt phẳng đón dòng, đuôi nhọn' },
  { id: 'ellipseH', label: 'Elip ngang', icon: '⬭', category: 'basic', re: 'low',
    build: (s, cx, cy) => presetEllipse(s, cx, cy, 16, 7),
    desc: 'Streamlined ngang' },
  { id: 'ellipseV', label: 'Elip dứng', icon: '⏺', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetEllipse(s, cx, cy, 7, 16),
    desc: 'Tiết diện đứng — cản lớn' },
  { id: 'plateV', label: 'Tấm phẳng đứng', icon: '┃', category: 'basic', re: 'high',
    build: (s, cx, cy) => presetPlate(s, cx, cy, 28, 3, 0),
    desc: 'Bluff body cản tối đa' },
  { id: 'plateInclined', label: 'Tấm nghiêng 30°', icon: '╲', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetPlate(s, cx, cy, 28, 3, Math.PI / 6),
    desc: 'Lift + drag combined' },
  { id: 'dome', label: 'Nửa cầu', icon: '◐', category: 'basic', re: 'medium',
    build: (s, cx, cy) => presetHalfCircle(s, cx, cy, 12, 'bottom'),
    desc: 'Flat dưới — separation' },
  { id: 'cross', label: 'Chữ thập', icon: '✚', category: 'basic', re: 'high',
    build: (s, cx, cy) => presetCross(s, cx, cy, 12, 4),
    desc: 'Wake phức tạp' },

  // Aerodynamic — body streamlined để dạy lực nâng/cản
  { id: 'airfoil', label: 'Cánh máy bay', icon: '✈', category: 'aero', re: 'low',
    build: (s, cx, cy) => presetAirfoil(s, cx, cy, 20, 8),
    desc: 'NACA-like wing' },
  { id: 'teardrop', label: 'Giọt nước', icon: '💧', category: 'aero', re: 'low',
    build: (s, cx, cy) => presetTeardrop(s, cx, cy, 18, 8),
    desc: 'Tròn đầu — nhọn đuôi, ít wake' },
  { id: 'wedge', label: 'Nêm', icon: '⊿', category: 'aero', re: 'medium',
    build: (s, cx, cy) => presetWedge(s, cx, cy, 18, 8),
    desc: 'Supersonic shock cone' },

  // Array — nhiều vật cản tương tác
  { id: 'tandem', label: '2 trụ song song', icon: '⬤⬤', category: 'array', re: 'medium',
    build: (s, cx, cy) => presetTandem(s, cx, cy, 7, 26),
    desc: 'Wake interference' },
  { id: 'sideBySide', label: '2 trụ thẳng đứng', icon: '⫶', category: 'array', re: 'medium',
    build: (s, cx, cy) => presetSideBySide(s, cx, cy, 7, 28),
    desc: 'Coupled vortex shedding' },
  { id: 'cylArr23', label: 'Lưới 2×3 trụ', icon: '▦', category: 'array', re: 'medium',
    build: (s, cx, cy) => presetCylinderArray(s, cx, cy, 3, 2, 18, 5),
    desc: 'Tube bundle heat exchanger' },

  // Fun shapes — engagement HS
  { id: 'car', label: 'Xe hơi', icon: '🚗', category: 'fun', re: 'medium',
    build: (s, cx, cy) => presetCar(s, cx, cy - 6, 10),
    desc: 'Khí động xe hơi (side view)' },
  { id: 'lShape', label: 'Góc L', icon: '⌐', category: 'fun', re: 'medium',
    build: (s, cx, cy) => presetLShape(s, cx, cy, 18, 4),
    desc: 'Corner separation' },
  { id: 'uChannel', label: 'Máng chữ U', icon: '⊔', category: 'fun', re: 'medium',
    build: (s, cx, cy) => presetUChannel(s, cx, cy, 14, 10, 3),
    desc: 'Cavity flow' },
  { id: 'heart', label: 'Trái tim', icon: '❤', category: 'fun', re: 'medium',
    build: (s, cx, cy) => presetHeart(s, cx, cy, 14),
    desc: 'Fun shape' },
]

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
type DrawMode = 'add' | 'erase' | 'polygon'

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
  // ─ Snapshot & báo cáo ─
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSnapshot, setReportSnapshot] = useState<{
    pngUrl: string; annotatedUrl: string; report: CFDReport
  } | null>(null)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

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
    // Adaptive steps-per-frame: start ở 2 (an toàn), AdaptiveLogic dưới sẽ
    // tăng lên 3-4 nếu đủ headroom hoặc giảm về 1 nếu lag.
    let stepsPerFrame = 2
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
            // Compact: drop dead particles khi array quá lớn. Cap 3000 thay 6000
            // → ít stroke calls hơn × 2 → ~3ms tiết kiệm trên frame nặng.
            if (particles.length > 3000) {
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
        // imageSmoothingQuality 'high' is bicubic (5-10ms/frame at 3× scale).
        // 'medium' is bilinear, looks identical for vorticity/speed fields but
        // 2-3× faster → mở khoá 60 FPS consistent.
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'medium'
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
          ctx.lineWidth = 2.2
          // 2-pass split: non-glow (fast) first, then short glow pass only
          // for newest particles. Tránh shadowBlur on/off toggle 3000 lần/frame.
          ctx.shadowBlur = 0
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            if (!p.alive || p.age < 30) continue
            const alpha = Math.max(0, 1 - p.age / 600) * 0.85
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`
            ctx.beginPath()
            ctx.moveTo(p.prevX * scaleX, p.prevY * scaleY)
            ctx.lineTo(p.x * scaleX, p.y * scaleY)
            ctx.stroke()
          }
          // Glow pass: only youngest particles (age < 30, ~5% của total),
          // giảm từ 60→30 frame window để cắt 50% glow strokes.
          ctx.shadowBlur = 5
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i]
            if (!p.alive || p.age >= 30) continue
            const alpha = 0.85
            ctx.strokeStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`
            ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`
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
        // Adaptive stepsPerFrame — target 58-62 FPS (just under V-sync 60Hz).
        // Tăng/giảm 1 unit mỗi 0.5s, hysteresis dải ±3 FPS quanh target tránh
        // dao động liên tục giữa 2 và 3 step.
        if (measuredFps < 55 && stepsPerFrame > 1) {
          stepsPerFrame -= 1  // tụt < 55 FPS → giảm sim work để render kịp
        } else if (measuredFps >= 60 && stepsPerFrame < 4) {
          stepsPerFrame += 1  // ổn định ≥60 FPS → tăng sim quality
        }
        frameCount = 0
        lastFps = now
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [showStreamlines, showDye, showVectors, dyeIntensity, numStreams])

  // Mouse drawing on canvas — brush mode (add/erase)
  const drawingRef = useRef(false)
  // Polygon mode: tích luỹ vertices trên mỗi click, double-click hoặc close button → fill
  const polygonRef = useRef<[number, number][]>([])
  const [polygonVersion, setPolygonVersion] = useState(0)  // re-render preview

  const mouseToLattice = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    return [Math.round(mx * NX), Math.round(my * NY)]
  }

  const paintBrush = (cx: number, cy: number, add: boolean) => {
    const s = stateRef.current
    if (!s) return
    const r = brushSize
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx, dy = y - cy
        if (dx * dx + dy * dy <= r * r && x >= 0 && x < NX && y >= 0 && y < NY) {
          s.solid[idx(x, y)] = add ? 1 : 0
        }
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode === 'polygon') return  // polygon: chỉ react click
    if (!drawingRef.current) return
    const pos = mouseToLattice(e)
    if (!pos) return
    paintBrush(pos[0], pos[1], drawMode === 'add')
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'polygon') return
    const pos = mouseToLattice(e)
    if (!pos) return
    polygonRef.current.push(pos)
    setPolygonVersion(v => v + 1)
  }

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'polygon') return
    e.preventDefault()
    closePolygon()
  }

  const closePolygon = () => {
    const s = stateRef.current
    if (!s) return
    if (polygonRef.current.length >= 3) {
      fillPolygon(s, polygonRef.current)
    }
    polygonRef.current = []
    setPolygonVersion(v => v + 1)
  }

  const cancelPolygon = () => {
    polygonRef.current = []
    setPolygonVersion(v => v + 1)
  }

  // ─── Snapshot capture + báo cáo ──────────────────────────────
  // Pipeline:
  //   1) Capture canvas hiện tại → PNG dataURL (raw)
  //   2) Vẽ thêm annotation (bbox + Re/Cd label) → annotated PNG
  //   3) computeReport(state) → CFDReport object
  //   4) Mở modal hiển thị 2 image + stats + diễn giải
  const captureReport = () => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || !s) return
    // 1) Raw PNG
    const pngUrl = canvas.toDataURL('image/png')
    // 2) Compute report stats
    const report = computeReport(s, inflowU, omega, stepCounterRef.current, colorMode)
    // 3) Annotated version — re-paint vào offscreen canvas + overlay
    const annotated = document.createElement('canvas')
    annotated.width = canvas.width
    annotated.height = canvas.height
    const actx = annotated.getContext('2d')!
    actx.drawImage(canvas, 0, 0)
    const scaleX = canvas.width / NX
    const scaleY = canvas.height / NY
    if (report.obstacle.bbox) {
      const { x0, y0, x1, y1 } = report.obstacle.bbox
      // Dashed bounding box
      actx.strokeStyle = 'rgba(252, 211, 77, 0.9)'  // amber-300
      actx.lineWidth = 1.5
      actx.setLineDash([5, 3])
      actx.strokeRect(x0 * scaleX, y0 * scaleY, (x1 - x0 + 1) * scaleX, (y1 - y0 + 1) * scaleY)
      actx.setLineDash([])
      // "D" arrow & label — chỉ chiều dài đặc trưng
      actx.fillStyle = 'rgba(252, 211, 77, 0.95)'
      actx.font = 'bold 10px monospace'
      const labelX = x0 * scaleX
      const labelY = Math.max(12, y0 * scaleY - 4)
      actx.fillText(`D≈${report.obstacle.D}`, labelX, labelY)
      // Mũi tên flow direction (góc trái-trên)
      actx.strokeStyle = '#22d3ee'
      actx.fillStyle = '#22d3ee'
      actx.lineWidth = 2
      actx.beginPath()
      actx.moveTo(10, canvas.height - 22)
      actx.lineTo(50, canvas.height - 22)
      actx.stroke()
      actx.beginPath()
      actx.moveTo(50, canvas.height - 22)
      actx.lineTo(44, canvas.height - 25)
      actx.lineTo(44, canvas.height - 19)
      actx.closePath()
      actx.fill()
      actx.font = 'bold 10px monospace'
      actx.fillText('Flow', 10, canvas.height - 26)
    }
    // Re / Cd badge góc phải-trên
    const badgeW = 120, badgeH = 48
    actx.fillStyle = 'rgba(0, 0, 0, 0.72)'
    actx.fillRect(canvas.width - badgeW - 6, 6, badgeW, badgeH)
    actx.strokeStyle = 'rgba(34, 211, 238, 0.6)'  // cyan-400
    actx.lineWidth = 1
    actx.strokeRect(canvas.width - badgeW - 6, 6, badgeW, badgeH)
    actx.font = 'bold 12px monospace'
    actx.fillStyle = '#22d3ee'
    actx.fillText(`Re = ${report.Re < 10 ? report.Re.toFixed(2) : report.Re.toFixed(0)}`, canvas.width - badgeW + 2, 22)
    actx.font = '11px monospace'
    actx.fillStyle = '#fbbf24'
    actx.fillText(`Cd = ${report.forces.Cd.toFixed(2)}`, canvas.width - badgeW + 2, 36)
    actx.fillStyle = '#a78bfa'
    actx.fillText(`Cl = ${report.forces.Cl.toFixed(2)}`, canvas.width - badgeW + 2, 48)
    // Step counter góc trái-trên (nhỏ)
    actx.font = '9px monospace'
    actx.fillStyle = 'rgba(255,255,255,0.7)'
    actx.fillText(`step ${report.sim.step.toLocaleString()}`, 6, 14)
    const annotatedUrl = annotated.toDataURL('image/png')
    setReportSnapshot({ pngUrl, annotatedUrl, report })
    setReportOpen(true)
    setCopyStatus('idle')
  }

  const downloadImage = (dataUrl: string, suffix: string) => {
    if (!reportSnapshot) return
    const ts = new Date(reportSnapshot.report.timestamp).toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `cfd-${suffix}-Re${reportSnapshot.report.Re.toFixed(0)}-${ts}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const copyMarkdown = async () => {
    if (!reportSnapshot) return
    const md = reportToMarkdown(reportSnapshot.report)
    try {
      await navigator.clipboard.writeText(md)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      // Fallback: tạo textarea + selectionStart
      const ta = document.createElement('textarea')
      ta.value = md
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const applyPreset = (preset: ShapeId) => {
    const s = stateRef.current
    if (!s) return
    clearObstacles(s)
    const c = SHAPES.find(sh => sh.id === preset)
    if (c) c.build(s, Math.round(NX * 0.25), Math.round(NY * 0.5))
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
            <button onClick={captureReport}
              title="Chụp snapshot + báo cáo chi tiết (Re, Cd, Cl, vortex...)"
              className="px-3 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 font-bold flex items-center gap-1.5 text-sm text-white shadow-lg shadow-violet-500/25">
              <Camera className="w-4 h-4" /> Chụp & báo cáo
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
                ✏️ Công cụ vẽ
                <span className="ml-1 text-[9px] text-white/30 font-normal">({polygonVersion >= 0 ? 'sẵn sàng' : ''})</span>
              </h3>
              <div className="grid grid-cols-3 gap-1 mb-2">
                <button onClick={() => { setDrawMode('add'); cancelPolygon() }}
                  className={`px-1 py-1.5 rounded text-[10.5px] font-bold transition ${
                    drawMode === 'add' ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/55'
                  }`}>
                  🖌 Bút
                </button>
                <button onClick={() => { setDrawMode('polygon'); cancelPolygon() }}
                  className={`px-1 py-1.5 rounded text-[10.5px] font-bold transition ${
                    drawMode === 'polygon' ? 'bg-pink-500/20 border border-pink-500/40 text-pink-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/55'
                  }`}>
                  🖋 Polygon
                </button>
                <button onClick={() => { setDrawMode('erase'); cancelPolygon() }}
                  className={`px-1 py-1.5 rounded text-[10.5px] font-bold transition ${
                    drawMode === 'erase' ? 'bg-rose-500/20 border border-rose-500/40 text-rose-100' : 'bg-white/[0.04] border border-white/[0.08] text-white/55'
                  }`}>
                  <Eraser className="w-3 h-3 inline" /> Xoá
                </button>
              </div>
              {drawMode !== 'polygon' && (
                <Slider label="Kích cỡ bút" value={brushSize} min={1} max={10} step={1}
                  suffix="px" onChange={(v) => setBrushSize(Math.round(v))} />
              )}
              <div className="text-[10px] text-white/50 italic mt-1 leading-snug">
                {drawMode === 'polygon'
                  ? '🖋 Click trên canvas để thêm đỉnh. Double-click hoặc nút ✓ Đóng để fill polygon.'
                  : drawMode === 'erase'
                  ? '🧽 Bấm + kéo để xoá vật cản.'
                  : '🖌 Bấm + kéo để vẽ vật cản bằng bút tròn.'}
              </div>
            </div>

            {/* Shape library */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">
                🎯 Thư viện hình ({SHAPES.length})
              </h3>
              {(['basic', 'aero', 'array', 'fun'] as const).map((cat) => {
                const items = SHAPES.filter(sh => sh.category === cat)
                if (items.length === 0) return null
                const catLabel = {
                  basic: '◾ Cơ bản',
                  aero: '✈ Khí động',
                  array: '▦ Mảng',
                  fun: '✨ Vui',
                }[cat]
                const catColor = {
                  basic: 'text-cyan-300/80',
                  aero: 'text-violet-300/80',
                  array: 'text-amber-300/80',
                  fun: 'text-pink-300/80',
                }[cat]
                return (
                  <div key={cat} className="mb-2">
                    <div className={`text-[9.5px] font-bold uppercase tracking-wider mb-1 ${catColor}`}>{catLabel}</div>
                    <div className="grid grid-cols-2 gap-1">
                      {items.map((sh) => (
                        <button key={sh.id} onClick={() => applyPreset(sh.id)}
                          title={sh.desc}
                          className="px-1.5 py-1 rounded text-[10.5px] font-semibold bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 text-white/80 flex items-center gap-1 transition">
                          <span className="text-[14px] leading-none">{sh.icon}</span>
                          <span className="truncate">{sh.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <button onClick={() => { const s = stateRef.current; if (s) clearObstacles(s); cancelPolygon() }}
                className="w-full mt-2 px-2 py-1.5 rounded text-[11px] font-bold bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-200 flex items-center justify-center gap-1.5 transition">
                <Eraser className="w-3 h-3" /> Xoá tất cả vật cản
              </button>
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
              <div className="relative">
                <canvas ref={canvasRef}
                  width={CANVAS_DISPLAY_W} height={CANVAS_DISPLAY_H}
                  className="w-full h-auto rounded-lg cursor-crosshair"
                  onMouseDown={(e) => {
                    if (drawMode === 'polygon') return  // click handled separately
                    drawingRef.current = true
                    handleMouseMove(e)
                  }}
                  onMouseUp={() => { drawingRef.current = false }}
                  onMouseLeave={() => { drawingRef.current = false }}
                  onMouseMove={handleMouseMove}
                  onClick={handleCanvasClick}
                  onDoubleClick={handleCanvasDoubleClick}
                />
                {/* Polygon preview overlay (SVG) — pointer-events none */}
                {drawMode === 'polygon' && polygonRef.current.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none"
                       viewBox={`0 0 ${NX} ${NY}`} preserveAspectRatio="none">
                    {/* Lines connecting vertices */}
                    {polygonRef.current.length > 1 && (
                      <polyline
                        points={polygonRef.current.map(([x, y]) => `${x},${y}`).join(' ')}
                        fill="none" stroke="rgba(244,114,182,0.85)" strokeWidth={0.5}
                        strokeDasharray="1.5 1" vectorEffect="non-scaling-stroke" />
                    )}
                    {/* Close-loop dashed preview */}
                    {polygonRef.current.length >= 3 && (
                      <line
                        x1={polygonRef.current[polygonRef.current.length - 1][0]}
                        y1={polygonRef.current[polygonRef.current.length - 1][1]}
                        x2={polygonRef.current[0][0]}
                        y2={polygonRef.current[0][1]}
                        stroke="rgba(244,114,182,0.45)" strokeWidth={0.4}
                        strokeDasharray="1 1" vectorEffect="non-scaling-stroke" />
                    )}
                    {/* Vertex dots */}
                    {polygonRef.current.map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r={1.2}
                              fill={i === 0 ? '#fde047' : '#f472b6'}
                              stroke="#000" strokeWidth={0.3}
                              vectorEffect="non-scaling-stroke" />
                    ))}
                  </svg>
                )}
                {drawMode === 'polygon' && (
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="text-[10.5px] font-mono bg-slate-900/80 border border-pink-500/40 text-pink-200 rounded px-2 py-1 pointer-events-auto">
                      🖋 Polygon: {polygonRef.current.length} điểm — click thêm · double-click hoặc nút bên dưới để đóng
                    </div>
                    {polygonRef.current.length > 0 && (
                      <div className="flex gap-1 pointer-events-auto">
                        <button onClick={closePolygon}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500 hover:bg-emerald-600 text-white">
                          ✓ Đóng ({polygonRef.current.length})
                        </button>
                        <button onClick={cancelPolygon}
                          className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500/80 hover:bg-rose-500 text-white">
                          ✕ Huỷ
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      {/* ─── Snapshot Report Modal ─── */}
      {reportOpen && reportSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
             onClick={() => setReportOpen(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-6xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
               onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-violet-300" />
                </div>
                <div>
                  <h2 className="font-bold text-white">Báo cáo mô phỏng CFD</h2>
                  <p className="text-[11px] text-white/50">
                    {new Date(reportSnapshot.report.timestamp).toLocaleString('vi-VN')} · LBM D2Q9
                  </p>
                </div>
              </div>
              <button onClick={() => setReportOpen(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Image column */}
              <div className="lg:col-span-3 space-y-3">
                <div className="rounded-xl border border-white/10 bg-slate-950 p-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-1.5 px-1">
                    🎯 Snapshot có ghi chú (bbox + Re/Cd badge)
                  </div>
                  <img src={reportSnapshot.annotatedUrl} alt="CFD snapshot annotated"
                       className="w-full h-auto rounded-lg" />
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950 p-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80 mb-1.5 px-1">
                    📷 Ảnh gốc (raw)
                  </div>
                  <img src={reportSnapshot.pngUrl} alt="CFD snapshot raw"
                       className="w-full h-auto rounded-lg" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadImage(reportSnapshot.annotatedUrl, 'annotated')}
                    className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition">
                    <Download className="w-3.5 h-3.5" /> Tải PNG có ghi chú
                  </button>
                  <button onClick={() => downloadImage(reportSnapshot.pngUrl, 'raw')}
                    className="px-3 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition">
                    <Download className="w-3.5 h-3.5" /> Tải PNG gốc
                  </button>
                  <button onClick={copyMarkdown}
                    className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                      copyStatus === 'copied'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                        : 'bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25 text-violet-200'
                    }`}>
                    {copyStatus === 'copied' ? (
                      <><Check className="w-3.5 h-3.5" /> Đã copy</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy báo cáo Markdown</>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats column */}
              <div className="lg:col-span-2 space-y-3 text-sm">
                {/* Hero Re + regime */}
                <div className="rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-500/15 border border-violet-500/30 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-violet-200/70 font-bold">Reynolds Number</div>
                  <div className="text-3xl font-bold font-mono bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent leading-tight my-1">
                    Re = {reportSnapshot.report.Re < 10 ? reportSnapshot.report.Re.toFixed(2) : reportSnapshot.report.Re.toFixed(0)}
                  </div>
                  <div className="text-[11px] font-bold text-cyan-200 mt-1">{reportSnapshot.report.regime}</div>
                </div>

                {/* Forces */}
                <div className="rounded-xl bg-slate-950 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Lực tác dụng (MEM)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
                    <Stat label="C_d (drag)" value={reportSnapshot.report.forces.Cd.toFixed(3)} color="text-amber-300" />
                    <Stat label="C_l (lift)" value={reportSnapshot.report.forces.Cl.toFixed(3)} color="text-violet-300" />
                    <Stat label="F_x" value={reportSnapshot.report.forces.Fx.toFixed(4)} color="text-white/80" />
                    <Stat label="F_y" value={reportSnapshot.report.forces.Fy.toFixed(4)} color="text-white/80" />
                  </div>
                </div>

                {/* Flow */}
                <div className="rounded-xl bg-slate-950 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-bold mb-2 flex items-center gap-1">
                    <Wind className="w-3 h-3" /> Đặc trưng dòng chảy
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <Row label="|u|_max" value={`${reportSnapshot.report.flow.maxSpeed.toFixed(4)} lu/ts`} />
                    <Row label="|u|_avg" value={`${reportSnapshot.report.flow.avgSpeed.toFixed(4)} lu/ts`} />
                    {reportSnapshot.report.obstacle.hasObstacle && (
                      <Row label="|u|_wake" value={`${reportSnapshot.report.flow.wakeAvg.toFixed(4)} lu/ts (${(100 - (reportSnapshot.report.flow.wakeAvg / reportSnapshot.report.sim.U) * 100).toFixed(0)}% defect)`} />
                    )}
                    <Row label="|ω|_max" value={`${reportSnapshot.report.flow.maxVort.toFixed(4)} lu/ts`} />
                    <Row label="Δp range" value={`${reportSnapshot.report.flow.minP.toFixed(4)} → ${reportSnapshot.report.flow.maxP.toFixed(4)}`} />
                  </div>
                </div>

                {/* Parameters */}
                <div className="rounded-xl bg-slate-950 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Thông số sim
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <Row label="Lưới" value={`${reportSnapshot.report.grid.NX}×${reportSnapshot.report.grid.NY}`} />
                    <Row label="U inflow" value={reportSnapshot.report.sim.U.toFixed(3)} />
                    <Row label="ω (1/τ)" value={`${reportSnapshot.report.sim.omega.toFixed(2)} (τ=${reportSnapshot.report.sim.tau.toFixed(3)})`} />
                    <Row label="ν" value={`${reportSnapshot.report.sim.nu.toFixed(4)} lu²/ts`} />
                    <Row label="D (đặc trưng)" value={`${reportSnapshot.report.obstacle.D} cell`} />
                    <Row label="Steps" value={reportSnapshot.report.sim.step.toLocaleString()} />
                    {reportSnapshot.report.obstacle.hasObstacle && (
                      <Row label="Obstacle" value={`${reportSnapshot.report.obstacle.solidCount} cell (${(reportSnapshot.report.obstacle.coverage * 100).toFixed(2)}%)`} />
                    )}
                  </div>
                </div>

                {/* Interpretation */}
                <div className="rounded-xl bg-gradient-to-br from-cyan-500/[0.06] to-violet-500/[0.06] border border-cyan-500/25 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-bold mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Diễn giải vật lý
                  </div>
                  <p className="text-[11.5px] text-white/85 leading-relaxed">{reportSnapshot.report.interpretation}</p>
                  <p className="text-[10.5px] text-cyan-200/85 mt-2 leading-relaxed border-t border-white/10 pt-2">
                    <strong className="text-cyan-200">📚 So sánh chuẩn:</strong> {reportSnapshot.report.benchmark}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline small stat components
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.04] rounded-lg p-2">
      <div className="text-[9px] text-white/50 uppercase tracking-wide font-bold">{label}</div>
      <div className={`text-base font-mono font-bold leading-tight mt-0.5 ${color}`}>{value}</div>
    </div>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/55">{label}</span>
      <span className="font-mono text-white/85 text-[11px]">{value}</span>
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
