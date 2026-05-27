/**
 * RefractionExplorer — Khúc xạ ánh sáng + Định luật Snell
 *
 * Route: /dashboard/labtwin/refraction
 * User: "tạo thêm các thí nghiệm về quang học"
 *
 * Features:
 *   - 2 môi trường (trên/dưới) với chiết suất n₁, n₂ tự chọn
 *   - Tia sáng tới với góc i từ 0° đến 90°
 *   - Tính góc khúc xạ r theo Snell: n₁·sin(i) = n₂·sin(r)
 *   - Hiển thị phản xạ + khúc xạ
 *   - Góc tới hạn (critical angle) khi n₁ > n₂
 *   - Phản xạ toàn phần (TIR) khi i > i_c
 *   - Color theo bước sóng (visible spectrum) — demo dispersion
 *   - Preset môi trường: không khí (1.0), nước (1.33), kính (1.5), kim cương (2.42)
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Info, Sun, Droplets, Diamond, Cloud, Sparkles, Eye,
} from 'lucide-react'

interface Medium {
  name: string
  n: number          // refractive index
  color: string      // tint for visualization
  icon: typeof Sun
}

const PRESET_MEDIA: Medium[] = [
  { name: 'Không khí',  n: 1.000, color: 'rgba(135,206,250,0.05)',  icon: Cloud },
  { name: 'Nước',       n: 1.333, color: 'rgba(56,189,248,0.18)',   icon: Droplets },
  { name: 'Dầu olive',  n: 1.470, color: 'rgba(217,168,80,0.22)',   icon: Droplets },
  { name: 'Kính (BK7)', n: 1.516, color: 'rgba(186,230,253,0.20)',  icon: Sparkles },
  { name: 'Kính flint', n: 1.620, color: 'rgba(168,162,158,0.22)',  icon: Sparkles },
  { name: 'Sapphire',   n: 1.770, color: 'rgba(96,165,250,0.22)',   icon: Diamond },
  { name: 'Kim cương',  n: 2.417, color: 'rgba(228,228,231,0.25)',  icon: Diamond },
]

const CANVAS_W = 760
const CANVAS_H = 460

export default function RefractionExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [n1, setN1] = useState(1.0)        // top medium
  const [n2, setN2] = useState(1.333)       // bottom medium
  const [angleIncDeg, setAngleIncDeg] = useState(30)
  const [wavelength, setWavelength] = useState(589)  // sodium yellow
  const [showNormal, setShowNormal] = useState(true)
  const [showRays, setShowRays] = useState({ incident: true, refracted: true, reflected: true })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    function render() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // Background sky
      ctx.fillStyle = '#0a0f1f'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const boundaryY = CANVAS_H / 2
      const centerX = CANVAS_W / 2

      // Top medium tint
      const m1 = PRESET_MEDIA.find((m) => Math.abs(m.n - n1) < 0.01) || { color: 'rgba(135,206,250,0.05)', name: 'n=' + n1 }
      ctx.fillStyle = m1.color
      ctx.fillRect(0, 0, CANVAS_W, boundaryY)

      // Bottom medium tint
      const m2 = PRESET_MEDIA.find((m) => Math.abs(m.n - n2) < 0.01) || { color: 'rgba(56,189,248,0.18)', name: 'n=' + n2 }
      ctx.fillStyle = m2.color
      ctx.fillRect(0, boundaryY, CANVAS_W, CANVAS_H - boundaryY)

      // Boundary line
      ctx.strokeStyle = 'rgba(148,163,184,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, boundaryY); ctx.lineTo(CANVAS_W, boundaryY)
      ctx.stroke()

      // Medium labels
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.font = 'bold 13px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${m1.name} (n₁ = ${n1.toFixed(3)})`, 16, 22)
      ctx.fillText(`${m2.name} (n₂ = ${n2.toFixed(3)})`, 16, boundaryY + 22)

      // Normal (vertical dashed line at incidence point)
      if (showNormal) {
        ctx.strokeStyle = 'rgba(251,191,36,0.6)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(centerX, 30); ctx.lineTo(centerX, CANVAS_H - 30)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(251,191,36,0.8)'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Pháp tuyến', centerX, 22)
      }

      // Snell's law: n₁·sin(i) = n₂·sin(r)
      const i_rad = (angleIncDeg * Math.PI) / 180
      const sinR = (n1 * Math.sin(i_rad)) / n2
      const isTIR = sinR > 1   // total internal reflection
      const r_rad = isTIR ? 0 : Math.asin(sinR)
      const r_deg = (r_rad * 180) / Math.PI

      // Critical angle (only meaningful when n1 > n2)
      const i_crit_rad = n1 > n2 ? Math.asin(n2 / n1) : NaN
      const i_crit_deg = (i_crit_rad * 180) / Math.PI

      // Compute ray endpoints
      const RAY_LEN = 200
      // Incident ray comes from top-left into incidence point
      // Direction (from outside): (sin(i), cos(i)) going down-right
      const incStartX = centerX - RAY_LEN * Math.sin(i_rad)
      const incStartY = boundaryY - RAY_LEN * Math.cos(i_rad)

      // Color of ray based on wavelength
      const rayColor = wavelengthToRGB(wavelength)

      // Incident ray (with glow)
      if (showRays.incident) {
        ctx.shadowColor = rayColor
        ctx.shadowBlur = 8
        ctx.strokeStyle = rayColor
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(incStartX, incStartY)
        ctx.lineTo(centerX, boundaryY)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Arrow at midpoint pointing toward boundary
        const arrowT = 0.55
        const arrowX = incStartX + (centerX - incStartX) * arrowT
        const arrowY = incStartY + (boundaryY - incStartY) * arrowT
        drawArrow(ctx, arrowX, arrowY,
          centerX + (incStartX - centerX) * (1 - arrowT - 0.05),
          boundaryY + (incStartY - boundaryY) * (1 - arrowT - 0.05),
          rayColor, true)

        // Angle arc (between incident ray and normal)
        ctx.strokeStyle = '#ec4899'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(centerX, boundaryY, 50, -Math.PI / 2, -Math.PI / 2 + i_rad, false)
        ctx.stroke()
        ctx.fillStyle = '#ec4899'
        ctx.font = 'bold 12px monospace'
        const labelI_X = centerX - 50 * Math.sin(i_rad / 2) - 18
        const labelI_Y = boundaryY - 50 * Math.cos(i_rad / 2) + 4
        ctx.textAlign = 'right'
        ctx.fillText(`i = ${angleIncDeg.toFixed(1)}°`, labelI_X, labelI_Y)
      }

      // Refracted ray (only if not TIR)
      if (showRays.refracted && !isTIR) {
        const refrEndX = centerX + RAY_LEN * Math.sin(r_rad)
        const refrEndY = boundaryY + RAY_LEN * Math.cos(r_rad)
        ctx.shadowColor = rayColor
        ctx.shadowBlur = 6
        ctx.strokeStyle = rayColor
        ctx.lineWidth = 2.5
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.moveTo(centerX, boundaryY)
        ctx.lineTo(refrEndX, refrEndY)
        ctx.stroke()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0

        // Arrow direction
        const arrowT = 0.5
        drawArrow(ctx,
          centerX + (refrEndX - centerX) * (arrowT - 0.05),
          boundaryY + (refrEndY - boundaryY) * (arrowT - 0.05),
          centerX + (refrEndX - centerX) * (arrowT + 0.05),
          boundaryY + (refrEndY - boundaryY) * (arrowT + 0.05),
          rayColor, false)

        // Angle arc r
        ctx.strokeStyle = '#22c55e'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(centerX, boundaryY, 60, Math.PI / 2 - r_rad, Math.PI / 2, false)
        ctx.stroke()
        ctx.fillStyle = '#22c55e'
        ctx.font = 'bold 12px monospace'
        const labelR_X = centerX + 60 * Math.sin(r_rad / 2) + 6
        const labelR_Y = boundaryY + 60 * Math.cos(r_rad / 2) + 14
        ctx.textAlign = 'left'
        ctx.fillText(`r = ${r_deg.toFixed(1)}°`, labelR_X, labelR_Y)
      }

      // Reflected ray (always exists)
      if (showRays.reflected) {
        const reflEndX = centerX + RAY_LEN * Math.sin(i_rad)
        const reflEndY = boundaryY - RAY_LEN * Math.cos(i_rad)
        const reflAlpha = isTIR ? 1.0 : 0.4   // bright when TIR
        ctx.globalAlpha = reflAlpha
        ctx.shadowColor = rayColor
        ctx.shadowBlur = isTIR ? 10 : 4
        ctx.strokeStyle = rayColor
        ctx.lineWidth = isTIR ? 3 : 2
        ctx.setLineDash(isTIR ? [] : [6, 4])
        ctx.beginPath()
        ctx.moveTo(centerX, boundaryY)
        ctx.lineTo(reflEndX, reflEndY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1

        if (isTIR) {
          ctx.fillStyle = '#ef4444'
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('⚡ Phản xạ TOÀN PHẦN (TIR)', CANVAS_W / 2, CANVAS_H - 16)
        }
      }

      // Critical angle visualization (when n1 > n2)
      if (n1 > n2 && !isNaN(i_crit_deg)) {
        // Show critical angle ray as dashed reference
        const crit_rad = i_crit_rad
        const cEndX = centerX - 80 * Math.sin(crit_rad)
        const cEndY = boundaryY - 80 * Math.cos(crit_rad)
        ctx.strokeStyle = 'rgba(245,158,11,0.4)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.moveTo(centerX, boundaryY)
        ctx.lineTo(cEndX, cEndY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(245,158,11,0.7)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'left'
        ctx.fillText(`i_c = ${i_crit_deg.toFixed(1)}°`, cEndX - 60, cEndY - 6)
      }

      // Incidence point
      ctx.fillStyle = '#fbbf24'
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(centerX, boundaryY, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
    }
    render()
  }, [n1, n2, angleIncDeg, wavelength, showNormal, showRays])

  // Snell's law calculation
  const i_rad = (angleIncDeg * Math.PI) / 180
  const sinR = (n1 * Math.sin(i_rad)) / n2
  const isTIR = sinR > 1
  const r_deg = isTIR ? NaN : Math.asin(sinR) * 180 / Math.PI
  const i_crit_deg = n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : NaN

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
                <Eye className="w-6 h-6 text-cyan-400" />
                Khúc xạ ánh sáng — Định luật Snell
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                n₁·sin(i) = n₂·sin(r) · Phản xạ toàn phần · Góc tới hạn
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🌐 Môi trường trên (n₁)</h3>
              <MediumPicker value={n1} onChange={setN1} />
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🌐 Môi trường dưới (n₂)</h3>
              <MediumPicker value={n2} onChange={setN2} />
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55">⚙️ Tia sáng</h3>
              <Slider label="Góc tới i" value={angleIncDeg} min={0} max={89} step={0.5} suffix="°" onChange={setAngleIncDeg} />
              <Slider label="Bước sóng λ" value={wavelength} min={380} max={780} step={5} suffix=" nm" onChange={setWavelength} />
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showNormal} onChange={(e) => setShowNormal(e.target.checked)}
                  className="accent-cyan-500" />
                <span className="text-white/70">Pháp tuyến</span>
              </label>
              {(['incident', 'refracted', 'reflected'] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={showRays[r]}
                    onChange={(e) => setShowRays({ ...showRays, [r]: e.target.checked })}
                    className="accent-cyan-500" />
                  <span className="text-white/70">
                    Tia {r === 'incident' ? 'tới' : r === 'refracted' ? 'khúc xạ' : 'phản xạ'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="w-full h-auto rounded-lg" />
            </div>

            {/* Calculated values */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Góc tới i" value={`${angleIncDeg.toFixed(1)}°`} color="text-rose-300" />
              <Stat label="Góc khúc xạ r" value={isTIR ? 'TIR' : `${r_deg.toFixed(1)}°`}
                color={isTIR ? 'text-red-400' : 'text-emerald-300'} />
              <Stat label="Tỉ số n₁/n₂" value={`${(n1 / n2).toFixed(3)}`} color="text-cyan-300" />
              <Stat label="Góc tới hạn i_c"
                value={isNaN(i_crit_deg) ? 'N/A' : `${i_crit_deg.toFixed(1)}°`}
                color="text-amber-300" />
            </div>

            <div className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-4">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">📐 Định luật Snell</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    n₁·sin(i) = n₂·sin(r)<br />
                    sin(r) = (n₁/n₂)·sin(i)
                  </p>
                  <p className="text-white/55 mt-2 leading-relaxed">
                    Khi đi từ môi trường <strong>kém đặc</strong> sang môi trường <strong>đặc hơn</strong>
                    (n₂ &gt; n₁), tia khúc xạ <em>gần</em> pháp tuyến hơn.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">⚡ Phản xạ toàn phần</h4>
                  <p className="text-white/55 leading-relaxed">
                    Xảy ra khi <strong>n₁ &gt; n₂</strong> và <strong>i ≥ i_c</strong> với
                    sin(i_c) = n₂/n₁. Toàn bộ ánh sáng phản xạ trở lại, không có khúc xạ.
                  </p>
                  <p className="text-white/55 mt-2 leading-relaxed">
                    Ứng dụng: <strong>cáp quang</strong> (ánh sáng dẫn truyền trong sợi nhờ TIR liên tục),
                    kim cương lấp lánh, ảo ảnh sa mạc.
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

function MediumPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      {PRESET_MEDIA.map((m) => {
        const sel = Math.abs(m.n - value) < 0.005
        const Icon = m.icon
        return (
          <button key={m.name} onClick={() => onChange(m.n)}
            className={`w-full px-3 py-2 rounded-lg text-left text-xs font-bold transition flex items-center gap-2 ${
              sel ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                  : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
            }`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="flex-1">{m.name}</span>
            <span className="font-mono text-[10px] opacity-70">n = {m.n.toFixed(3)}</span>
          </button>
        )
      })}
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
        <span className="text-[11px] font-mono text-cyan-300">{value.toFixed(1)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-cyan-500" />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-slate-900/60 border border-white/[0.08] p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/45 font-bold">{label}</div>
      <div className={`text-base font-bold font-mono mt-1 ${color}`}>{value}</div>
    </div>
  )
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, _filled: boolean) {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const head = 10
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4))
  ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4))
  ctx.closePath()
  ctx.fill()
}

// Visible spectrum wavelength → RGB
function wavelengthToRGB(nm: number): string {
  let r = 0, g = 0, b = 0
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1 }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1 }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20 }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1 }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65 }
  else if (nm <= 780) { r = 1 }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`
}
