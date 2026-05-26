/**
 * YoungDoubleSlit — Thí nghiệm giao thoa Young
 *
 * Route: /dashboard/labtwin/young-double-slit
 *
 * User: "thêm thí nghiệm về giao thoa Young — giao thoa ánh sáng đơn sắc
 *  qua 2 khe hẹp"
 *
 * Physics:
 *   - Khoảng vân i = λ·L / a  (L: khoảng cách màn, a: khoảng cách 2 khe)
 *   - Vân sáng: d·sin θ = k·λ (k = 0, ±1, ±2...)
 *   - Cường độ tại điểm: I = 4·I₀·cos²(π·a·sin θ / λ)
 *
 * Features:
 *   - Sliders: λ (380-780nm), a (0.1-2mm), L (0.5-3m)
 *   - Wavefronts animation (concentric circles from 2 slits)
 *   - Fringe pattern hiển thị trên màn quan sát + cường độ I(y)
 *   - Color của ánh sáng dựa trên λ (visible spectrum mapping)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Info, Waves, Sun,
} from 'lucide-react'

const CANVAS_W = 800
const CANVAS_H = 420

// Convert wavelength (nm) → RGB color (visible spectrum 380-780nm)
function wavelengthToRGB(nm: number): string {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1 }
  else if (nm < 490) { r = 0; g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; b = 0 }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; b = 0 }
  else if (nm <= 780) { r = 1; g = 0; b = 0 }
  // Intensity falloff at edges
  let f = 1
  if (nm < 420) f = 0.3 + 0.7 * (nm - 380) / 40
  else if (nm > 700) f = 0.3 + 0.7 * (780 - nm) / 80
  r = Math.round(255 * Math.pow(r * f, 0.8))
  g = Math.round(255 * Math.pow(g * f, 0.8))
  b = Math.round(255 * Math.pow(b * f, 0.8))
  return `rgb(${r},${g},${b})`
}

// Color labels for common wavelengths
function colorName(nm: number): string {
  if (nm < 450) return 'Tím'
  if (nm < 495) return 'Lam'
  if (nm < 570) return 'Lục'
  if (nm < 590) return 'Vàng'
  if (nm < 620) return 'Cam'
  return 'Đỏ'
}

export default function YoungDoubleSlit() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const screenRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(true)
  const animTimeRef = useRef(0)

  const [running, setRunning] = useState(true)
  const [lambdaNm, setLambdaNm] = useState(589)  // sodium yellow
  const [slitMm, setSlitMm] = useState(0.5)
  const [screenM, setScreenM] = useState(1.5)
  const [showWavefronts, setShowWavefronts] = useState(true)

  runningRef.current = running

  // Convert physical to canvas units
  // Canvas layout: source (left) → slits (35%) → screen (95%)
  const SLIT_X = CANVAS_W * 0.35
  const SCREEN_X = CANVAS_W * 0.92
  const PROP_DISTANCE_PX = SCREEN_X - SLIT_X     // ~456 px = L (m)

  // For physics: scale slit distance & wavelength
  // - λ = 380-780nm → wave visual period 14-28 px (for visibility)
  // - a = 0.1-2mm → slit separation 6-50 px (for visibility)
  const slitSepPx = 10 + slitMm * 30   // mapped: 0.1mm → 13px, 2mm → 70px
  const slitSep = slitSepPx
  // Wavelength visual ~ λ × scale; for animation
  const wavelengthPx = 8 + (lambdaNm - 380) / 400 * 14

  // Fringe spacing on canvas: i_px = (λ/a) × L_px (using mapped scales)
  // But we want REAL physics: i = λ·L / a meters → display y-scale
  // For UX: use real formula in nm/mm/m, render proportionally
  const fringeSpacing_mm = (lambdaNm * 1e-6 * screenM * 1000) / (slitMm)  // mm on screen
  // Canvas mapping: ~10mm screen height = full canvas H, so 1mm = CANVAS_H/10
  const fringeSpacingPx = Math.min((fringeSpacing_mm / 8) * CANVAS_H, CANVAS_H * 0.4)

  // Main animation: wavefronts emanating from 2 slits
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (runningRef.current) animTimeRef.current += dt

      const t = animTimeRef.current
      const slit1Y = CANVAS_H / 2 - slitSep / 2
      const slit2Y = CANVAS_H / 2 + slitSep / 2

      // BG: dark space
      ctx.fillStyle = '#0a0a14'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Source (laser)
      const sourceX = 50, sourceY = CANVAS_H / 2
      ctx.fillStyle = wavelengthToRGB(lambdaNm)
      ctx.shadowColor = wavelengthToRGB(lambdaNm)
      ctx.shadowBlur = 20
      ctx.beginPath()
      ctx.arc(sourceX, sourceY, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      // Laser beam from source to slit plate
      ctx.strokeStyle = wavelengthToRGB(lambdaNm)
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sourceX + 12, sourceY)
      ctx.lineTo(SLIT_X - 5, sourceY)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px monospace'
      ctx.fillText('Nguồn', sourceX - 10, sourceY + 30)
      ctx.fillText(`λ=${lambdaNm}nm`, sourceX - 24, sourceY + 44)

      // Slit plate
      ctx.fillStyle = '#475569'
      ctx.fillRect(SLIT_X - 8, 0, 16, slit1Y - 6)
      ctx.fillRect(SLIT_X - 8, slit1Y + 6, 16, slit2Y - slit1Y - 12)
      ctx.fillRect(SLIT_X - 8, slit2Y + 6, 16, CANVAS_H - (slit2Y + 6))
      // Slit labels
      ctx.fillStyle = '#cbd5e1'
      ctx.font = '11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('S₁', SLIT_X - 24, slit1Y + 4)
      ctx.fillText('S₂', SLIT_X - 24, slit2Y + 4)
      // Slit separation indicator
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(SLIT_X + 12, slit1Y)
      ctx.lineTo(SLIT_X + 24, slit1Y)
      ctx.lineTo(SLIT_X + 24, slit2Y)
      ctx.lineTo(SLIT_X + 12, slit2Y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`a = ${slitMm}mm`, SLIT_X + 28, (slit1Y + slit2Y) / 2 + 4)

      // ── Wavefronts (concentric arcs from 2 slits) ──
      // User: "mặt sóng cần làm rộng hơn và di chuyển đập vào màn hứng"
      // → Tăng arc opening (rộng hơn), không fade theo distance (đập tới màn),
      //   tăng số fronts + lineWidth + spawn nhiều fronts trong vòng đời.
      const waveHits: Array<{ y: number; intensity: number }> = []
      if (showWavefronts) {
        const baseColor = wavelengthToRGB(lambdaNm)
        const numFronts = 24                    // was 10 → nhiều hơn 2.4×
        const ARC_HALF = Math.PI * 0.48         // was π/2.2 (~82°) → ~86° mỗi bên, gần 180° total
        const MAX_R = PROP_DISTANCE_PX + 40     // cho phép vượt qua màn 1 chút để "đập"
        ctx.lineWidth = 2                       // was 1.2 → đậm hơn
        ctx.lineCap = 'round'

        for (let i = 0; i < numFronts; i++) {
          // Mỗi front cách nhau wavelengthPx*2 → thoáng hơn, thấy rõ hình sin
          const spawnSpacing = wavelengthPx * 2.2
          const offset = (t * 110 + i * spawnSpacing) % (numFronts * spawnSpacing)
          const r = offset
          if (r < 5 || r > MAX_R) continue

          for (const cy of [slit1Y, slit2Y]) {
            // Alpha không fade theo distance — wavefront giữ visible tới màn
            // Chỉ fade khi vượt qua màn ("đập" rồi tan biến)
            const distToScreen = PROP_DISTANCE_PX - r
            let alpha: number
            if (distToScreen > 0) {
              // Đang propagate — alpha tăng nhẹ khi gần màn (gợi cảm giác tiến tới)
              alpha = 0.45 + (1 - distToScreen / PROP_DISTANCE_PX) * 0.2
            } else {
              // Đã vượt qua màn — fade nhanh
              alpha = Math.max(0, 0.65 - (-distToScreen) / 30)
            }
            ctx.strokeStyle = baseColor
            ctx.globalAlpha = alpha
            ctx.beginPath()
            ctx.arc(SLIT_X, cy, r, -ARC_HALF, ARC_HALF)
            ctx.stroke()

            // Glow effect — thêm 1 stroke mờ rộng hơn tạo cảm giác mặt sóng có khối
            if (alpha > 0.3) {
              ctx.globalAlpha = alpha * 0.25
              ctx.lineWidth = 5
              ctx.beginPath()
              ctx.arc(SLIT_X, cy, r, -ARC_HALF, ARC_HALF)
              ctx.stroke()
              ctx.lineWidth = 2
            }

            // ✨ Detect wave hit screen: r ∈ [PROP_DISTANCE_PX-3, PROP_DISTANCE_PX+3]
            // Tính điểm intersect với màn → hiển thị flash tại điểm đó
            if (Math.abs(distToScreen) < 4) {
              // Y point on screen where arc intersects (only points within arc angle)
              // For each visible angle ±ARC_HALF, the arc point hits screen if
              // x = SLIT_X + r·cos(θ) = SCREEN_X → cos(θ) = (SCREEN_X − SLIT_X) / r
              const cosTheta = PROP_DISTANCE_PX / r
              if (cosTheta <= 1 && cosTheta >= Math.cos(ARC_HALF)) {
                const theta = Math.acos(cosTheta)
                const hitY1 = cy - r * Math.sin(theta)  // top hit
                const hitY2 = cy + r * Math.sin(theta)  // bottom hit
                waveHits.push({ y: hitY1, intensity: 1 - Math.abs(distToScreen) / 4 })
                waveHits.push({ y: hitY2, intensity: 1 - Math.abs(distToScreen) / 4 })
              }
            }
          }
        }
        ctx.globalAlpha = 1
        ctx.lineCap = 'butt'
      }

      // Screen
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(SCREEN_X, 0, 6, CANVAS_H)
      ctx.strokeStyle = '#475569'
      ctx.strokeRect(SCREEN_X, 0, 6, CANVAS_H)

      // ✨ Wave hit flashes — chấm sáng tại điểm sóng vừa "đập" vào màn
      if (showWavefronts && waveHits.length > 0) {
        const flashColor = wavelengthToRGB(lambdaNm)
        for (const hit of waveHits) {
          if (hit.y < 0 || hit.y > CANVAS_H) continue
          ctx.shadowColor = flashColor
          ctx.shadowBlur = 14
          ctx.fillStyle = flashColor
          ctx.globalAlpha = hit.intensity * 0.9
          ctx.beginPath()
          ctx.arc(SCREEN_X + 3, hit.y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      // Draw fringe pattern directly on screen surface (right edge)
      // Intensity I(y) = 4·I₀·cos²(π·a·sin θ / λ)
      // where sin θ ≈ y/L (small angle)
      const cy0 = CANVAS_H / 2
      const realA = slitMm * 1e-3            // a in meters
      const realLambda = lambdaNm * 1e-9      // λ in meters
      const realL = screenM                   // L in meters
      // Use canvas y mapped to real screen position (mm)
      // Screen height ≈ ±5mm displayed across CANVAS_H
      const SCREEN_HALF_MM = 6
      for (let y = 0; y < CANVAS_H; y += 1) {
        const screenY_mm = ((y - cy0) / cy0) * SCREEN_HALF_MM   // mm
        const screenY_m = screenY_mm * 1e-3
        const phase = (Math.PI * realA * screenY_m) / (realLambda * realL)
        const intensity = Math.cos(phase) ** 2  // 0 → 1
        const grad = Math.round(intensity * 255)
        const fringeColor = wavelengthToRGB(lambdaNm)
        ctx.fillStyle = fringeColor
        ctx.globalAlpha = intensity * 0.95
        ctx.fillRect(SCREEN_X + 6, y, 30, 1)
      }
      ctx.globalAlpha = 1

      // Screen label
      ctx.fillStyle = '#cbd5e1'
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Màn quan sát', SCREEN_X - 80, 22)
      ctx.font = '10px monospace'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText(`L = ${screenM.toFixed(2)} m`, SCREEN_X - 80, 38)

      // L distance indicator
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(SLIT_X, CANVAS_H - 16)
      ctx.lineTo(SCREEN_X, CANVAS_H - 16)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`L = ${screenM.toFixed(2)} m`, (SLIT_X + SCREEN_X) / 2, CANVAS_H - 4)

      // Center line (axis)
      ctx.strokeStyle = 'rgba(148,163,184,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, CANVAS_H / 2)
      ctx.lineTo(CANVAS_W, CANVAS_H / 2)
      ctx.stroke()

      // Central bright fringe label
      ctx.fillStyle = '#fbbf24'
      ctx.font = 'bold 10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('k=0 (vân TT)', SCREEN_X - 8, cy0 + 4)
      // Mark ±1, ±2 fringes
      for (const k of [-2, -1, 1, 2]) {
        const fringeY = cy0 + (k * fringeSpacingPx)
        if (fringeY < 0 || fringeY > CANVAS_H) continue
        ctx.fillStyle = '#fbbf24'
        ctx.font = '9px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(`k=${k > 0 ? '+' : ''}${k}`, SCREEN_X - 8, fringeY + 4)
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [lambdaNm, slitMm, screenM, showWavefronts, slitSep, slitSepPx, wavelengthPx, PROP_DISTANCE_PX, fringeSpacingPx])

  // Intensity profile on right side
  useEffect(() => {
    const canvas = screenRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    // Plot I(y)
    const realA = slitMm * 1e-3
    const realLambda = lambdaNm * 1e-9
    const realL = screenM
    const SCREEN_HALF_MM = 6
    const color = wavelengthToRGB(lambdaNm)

    // Y-axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    for (const ymm of [-5, -2.5, 0, 2.5, 5]) {
      const py = H / 2 + (ymm / SCREEN_HALF_MM) * (H / 2)
      ctx.fillText(`${ymm > 0 ? '+' : ''}${ymm}mm`, 4, py + 3)
      ctx.strokeStyle = 'rgba(148,163,184,0.08)'
      ctx.beginPath(); ctx.moveTo(50, py); ctx.lineTo(W, py); ctx.stroke()
    }

    // Plot intensity curve
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    for (let py = 0; py < H; py++) {
      const screenY_mm = ((py - H / 2) / (H / 2)) * SCREEN_HALF_MM
      const screenY_m = screenY_mm * 1e-3
      const phase = (Math.PI * realA * screenY_m) / (realLambda * realL)
      const intensity = Math.cos(phase) ** 2
      const px = 50 + intensity * (W - 60)
      if (py === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Title
    ctx.fillStyle = '#cbd5e1'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('I(y) — cường độ', 8, 14)
  }, [lambdaNm, slitMm, screenM])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-300 via-cyan-300 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                <Waves className="w-6 h-6 text-violet-400" />
                Giao thoa Young — Ánh sáng đơn sắc qua 2 khe hẹp
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                i = λ·L/a · d·sinθ = k·λ · Tạo vân sáng-tối xen kẽ trên màn
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
            <button onClick={() => { animTimeRef.current = 0 }}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Controls */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Thông số</h3>
              {/* Wavelength */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-white/70">Bước sóng λ</label>
                  <span className="text-[11px] font-mono"
                    style={{ color: wavelengthToRGB(lambdaNm) }}>
                    {lambdaNm} nm · {colorName(lambdaNm)}
                  </span>
                </div>
                <input type="range" min={380} max={780} step={1} value={lambdaNm}
                  onChange={(e) => setLambdaNm(parseFloat(e.target.value))}
                  className="w-full accent-violet-500" />
                {/* Spectrum bar */}
                <div className="mt-1.5 h-3 rounded-full overflow-hidden flex">
                  {Array.from({ length: 80 }, (_, i) => {
                    const nm = 380 + (i / 79) * 400
                    return <div key={i} className="flex-1" style={{ background: wavelengthToRGB(nm) }} />
                  })}
                </div>
              </div>
              {/* Quick preset wavelengths */}
              <div className="flex flex-wrap gap-1">
                {([
                  ['He-Ne', 633],
                  ['Na vàng', 589],
                  ['Hg lục', 546],
                  ['Ar lam', 488],
                  ['Tím', 405],
                ] as const).map(([label, nm]) => (
                  <button key={label} onClick={() => setLambdaNm(nm)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                      lambdaNm === nm
                        ? 'border-white/40 text-white'
                        : 'border-white/[0.08] text-white/60 hover:bg-white/[0.06]'
                    }`}
                    style={lambdaNm === nm ? { background: wavelengthToRGB(nm) + '40' } : {}}>
                    {label} {nm}
                  </button>
                ))}
              </div>

              <Slider label="Khoảng cách 2 khe a" value={slitMm} min={0.1} max={2} step={0.05}
                suffix=" mm" onChange={setSlitMm} />
              <Slider label="Khoảng màn L" value={screenM} min={0.5} max={3} step={0.05}
                suffix=" m" onChange={setScreenM} />

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showWavefronts}
                  onChange={(e) => setShowWavefronts(e.target.checked)}
                  className="accent-violet-500" />
                <span className="text-white/70">Hiển thị mặt sóng</span>
              </label>
            </div>

            {/* Computed values */}
            <div className="rounded-2xl bg-violet-500/[0.06] border border-violet-500/25 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-violet-300 flex items-center gap-1">
                <Sun className="w-3 h-3" /> Kết quả
              </h3>
              <ComputedRow label="Khoảng vân i" value={`${fringeSpacing_mm.toFixed(3)} mm`}
                formula="λ·L/a" />
              <ComputedRow label="Vân sáng cấp 1"
                value={`±${fringeSpacing_mm.toFixed(3)} mm`}
                formula="k=±1" />
              <ComputedRow label="Vân sáng cấp 2"
                value={`±${(2 * fringeSpacing_mm).toFixed(3)} mm`}
                formula="k=±2" />
              <ComputedRow label="Góc lệch tan θ₁"
                value={`${((lambdaNm * 1e-6) / (slitMm)).toExponential(2)}`}
                formula="λ/a" />
            </div>
          </div>

          {/* Main + screen intensity */}
          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
                <canvas ref={screenRef} width={220} height={300} className="w-full h-auto rounded-lg" />
              </div>
              <div className="md:col-span-2 rounded-2xl bg-violet-500/[0.04] border border-violet-500/20 p-4">
                <h3 className="font-bold text-violet-300 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Lý thuyết
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <h4 className="font-bold text-amber-300 mb-1">💡 Hiện tượng giao thoa</h4>
                    <p className="text-white/55 leading-relaxed">
                      Hai sóng đồng pha từ 2 khe S₁ và S₂ <strong>chồng chập</strong> trên màn. Tại điểm có
                      hiệu đường đi <em>δ = d·sinθ = k·λ</em> → 2 sóng cùng pha → <strong>cực đại</strong>.
                      Tại <em>δ = (k+½)·λ</em> → ngược pha → <strong>cực tiểu</strong>.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-cyan-300 mb-1">📏 Công thức khoảng vân</h4>
                    <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                      i = λ·L / a<br />
                      = ({lambdaNm} × 10⁻⁹ × {screenM}) / ({slitMm} × 10⁻³)<br />
                      = {fringeSpacing_mm.toFixed(3)} mm
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-300 mb-1">🔬 Ứng dụng</h4>
                    <p className="text-white/55 leading-relaxed">
                      Đo bước sóng của ánh sáng (đo i, biết a, L → tính λ). Lịch sử: thí nghiệm Thomas Young
                      (1801) chứng minh ánh sáng có tính chất sóng.
                    </p>
                  </div>
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
        <span className="text-[11px] font-mono text-violet-300">{value.toFixed(2)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-violet-500" />
    </div>
  )
}

function ComputedRow({ label, value, formula }: { label: string; value: string; formula: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div>
        <div className="text-white/75 font-bold">{label}</div>
        <div className="text-[10px] text-white/40 font-mono">{formula}</div>
      </div>
      <div className="font-mono font-bold text-violet-300">{value}</div>
    </div>
  )
}
