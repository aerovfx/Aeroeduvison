/**
 * Quang học — Ray Optics Lab
 * Snell's law: n₁·sin θ₁ = n₂·sin θ₂
 * Total internal reflection when θ > θ_critical = arcsin(n₂/n₁)
 */
import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Zap } from 'lucide-react'

interface Params {
  n1: number      // refractive index medium 1
  n2: number      // refractive index medium 2
  angleDeg: number  // angle of incidence (degrees from normal)
  showWave: boolean
}

const MATERIALS: { name: string; n: number; color: string }[] = [
  { name: 'Không khí', n: 1.000, color: '#bfdbfe' },
  { name: 'Nước', n: 1.333, color: '#7dd3fc' },
  { name: 'Kính cường lực', n: 1.52,  color: '#a5f3fc' },
  { name: 'Kim cương', n: 2.417, color: '#c4b5fd' },
  { name: 'Acrylic', n: 1.49,  color: '#bbf7d0' },
  { name: 'Thuỷ tinh crown', n: 1.523, color: '#fde68a' },
]

function drawOptics(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  params: Params,
) {
  ctx.clearRect(0, 0, W, H)

  const midY = H * 0.48
  const iX   = W * 0.5   // interface x position
  const rayLen = Math.min(W, H) * 0.45

  // ── Background media ──
  // Medium 1 (left)
  ctx.fillStyle = 'rgba(59,130,246,0.06)'
  ctx.fillRect(0, 0, iX, H)
  // Medium 2 (right)
  ctx.fillStyle = 'rgba(16,185,129,0.06)'
  ctx.fillRect(iX, 0, W - iX, H)

  // Interface line
  ctx.beginPath()
  ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
  ctx.moveTo(iX, 0); ctx.lineTo(iX, H)
  ctx.stroke(); ctx.setLineDash([])

  // Normal line
  ctx.beginPath()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.setLineDash([5, 5])
  ctx.moveTo(iX, midY - rayLen * 0.9)
  ctx.lineTo(iX, midY + rayLen * 0.9)
  ctx.stroke(); ctx.setLineDash([])

  const θi = params.angleDeg * Math.PI / 180
  const n1 = params.n1; const n2 = params.n2
  const sinT = (n1 / n2) * Math.sin(θi)
  const tir   = sinT > 1   // total internal reflection
  const θt    = tir ? 0 : Math.asin(sinT)
  const θr    = θi          // angle of reflection = angle of incidence

  // ── Incident ray ──
  // From upper-left toward interface at midY
  const iStartX = iX - rayLen * Math.sin(θi)
  const iStartY = midY - rayLen * Math.cos(θi)
  ctx.beginPath()
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3
  ctx.moveTo(iStartX, iStartY); ctx.lineTo(iX, midY); ctx.stroke()
  // Arrow head
  const ang = Math.atan2(midY - iStartY, iX - iStartX)
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(iX, midY)
  ctx.lineTo(iX - 10 * Math.cos(ang - 0.4), midY - 10 * Math.sin(ang - 0.4))
  ctx.lineTo(iX - 10 * Math.cos(ang + 0.4), midY - 10 * Math.sin(ang + 0.4))
  ctx.closePath(); ctx.fill()

  // ── Reflected ray ──
  const rEndX = iX - rayLen * Math.sin(θr)
  const rEndY = midY + rayLen * Math.cos(θr)
  ctx.beginPath()
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2
  ctx.moveTo(iX, midY); ctx.lineTo(rEndX, rEndY); ctx.stroke()
  const rang = Math.atan2(rEndY - midY, rEndX - iX)
  ctx.fillStyle = '#f87171'
  ctx.beginPath()
  ctx.moveTo(rEndX, rEndY)
  ctx.lineTo(rEndX - 10 * Math.cos(rang - 0.4), rEndY - 10 * Math.sin(rang - 0.4))
  ctx.lineTo(rEndX - 10 * Math.cos(rang + 0.4), rEndY - 10 * Math.sin(rang + 0.4))
  ctx.closePath(); ctx.fill()

  // ── Refracted or TIR indicator ──
  if (!tir) {
    const tEndX = iX + rayLen * Math.sin(θt)
    const tEndY = midY + rayLen * Math.cos(θt)
    ctx.beginPath()
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 3
    ctx.moveTo(iX, midY); ctx.lineTo(tEndX, tEndY); ctx.stroke()
    const tang = Math.atan2(tEndY - midY, tEndX - iX)
    ctx.fillStyle = '#34d399'
    ctx.beginPath()
    ctx.moveTo(tEndX, tEndY)
    ctx.lineTo(tEndX - 10 * Math.cos(tang - 0.4), tEndY - 10 * Math.sin(tang - 0.4))
    ctx.lineTo(tEndX - 10 * Math.cos(tang + 0.4), tEndY - 10 * Math.sin(tang + 0.4))
    ctx.closePath(); ctx.fill()
  } else {
    // TIR: extra reflected ray (strong)
    const tir2EndX = iX - rayLen * 0.9 * Math.sin(θr)
    const tir2EndY = midY + rayLen * 0.9 * Math.cos(θr)
    ctx.beginPath()
    ctx.strokeStyle = '#f87171'; ctx.lineWidth = 4
    ctx.moveTo(iX, midY); ctx.lineTo(tir2EndX, tir2EndY); ctx.stroke()
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 13px sans-serif'
    ctx.fillText('⚡ Phản xạ toàn phần!', iX + 15, midY - 30)
  }

  // ── Angle arcs & labels ──
  // θi arc
  ctx.beginPath()
  ctx.arc(iX, midY, 48, -Math.PI / 2, -Math.PI / 2 + θi, false)
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fde68a'; ctx.font = '12px monospace'
  ctx.fillText(`θᵢ=${params.angleDeg}°`, iX - 80, midY - 16)

  // θr arc
  ctx.beginPath()
  ctx.arc(iX, midY, 42, Math.PI / 2 - θr, Math.PI / 2, false)
  ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2; ctx.stroke()
  ctx.fillStyle = '#fca5a5'; ctx.font = '12px monospace'
  ctx.fillText(`θᵣ=${params.angleDeg}°`, iX - 80, midY + 20)

  if (!tir) {
    ctx.beginPath()
    ctx.arc(iX, midY, 36, Math.PI / 2, Math.PI / 2 + θt, false)
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = '#6ee7b7'; ctx.font = '12px monospace'
    ctx.fillText(`θₜ=${(θt * 180 / Math.PI).toFixed(1)}°`, iX + 14, midY + 26)
  }

  // ── Media labels ──
  ctx.font = '13px sans-serif'
  ctx.fillStyle = '#93c5fd'
  ctx.fillText(`n₁ = ${n1.toFixed(3)}`, 10, 22)
  ctx.fillStyle = '#6ee7b7'
  ctx.fillText(`n₂ = ${n2.toFixed(3)}`, iX + 10, 22)

  // ── Info panel bottom ──
  const infoY = H * 0.82
  ctx.fillStyle = 'rgba(17,24,39,0.8)'
  ctx.beginPath(); ctx.roundRect(8, infoY, W - 16, H - infoY - 8, 10); ctx.fill()
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 1; ctx.stroke()

  const θc = n1 > n2 ? `${(Math.asin(n2 / n1) * 180 / Math.PI).toFixed(1)}°` : 'N/A (n₁ < n₂)'

  const rows = [
    { label: 'Định luật Snell', val: `n₁·sinθᵢ = n₂·sinθₜ   →   ${n1.toFixed(3)}×sin${params.angleDeg}° = ${n2.toFixed(3)}×sin${tir ? '(TIR)' : (θt * 180 / Math.PI).toFixed(1) + '°'}`, color: '#d1d5db' },
    { label: 'Góc tới hạn θ_c', val: θc, color: tir ? '#f87171' : '#4ade80' },
    { label: 'Góc khúc xạ θₜ', val: tir ? 'TIR — Không có tia khúc xạ' : `${(θt * 180 / Math.PI).toFixed(2)}°`, color: tir ? '#f87171' : '#34d399' },
  ]
  rows.forEach((r, i) => {
    ctx.fillStyle = '#6b7280'; ctx.font = '10px monospace'; ctx.fillText(r.label + ':', 18, infoY + 16 + i * 17)
    ctx.fillStyle = r.color; ctx.font = '11px monospace'; ctx.fillText(r.val, 130, infoY + 16 + i * 17)
  })
}

export default function OpticsLabPage() {
  const [params, setParams] = useState<Params>({ n1: 1.52, n2: 1.0, angleDeg: 35, showWave: false })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef   = useRef<number>(0)
  const paramsRef = useRef(params)
  paramsRef.current = params

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const loop = () => {
      animRef.current = requestAnimationFrame(loop)
      drawOptics(ctx, canvas.width, canvas.height, paramsRef.current)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const θiRad  = params.angleDeg * Math.PI / 180
  const sinT   = (params.n1 / params.n2) * Math.sin(θiRad)
  const tir    = sinT > 1
  const θt     = tir ? null : Math.asin(sinT) * 180 / Math.PI
  const θc     = params.n1 > params.n2 ? Math.asin(params.n2 / params.n1) * 180 / Math.PI : null

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <div className="mb-6">
          <Link to="/dashboard/labtwin/labs" className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 mb-3 text-sm font-medium transition-colors">
            <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl text-2xl">💡</div>
            <div>
              <h1 className="text-2xl font-bold">Quang học — Khúc xạ & Phản xạ</h1>
              <p className="text-white/50 text-sm">Quang học · Trung bình · 35 phút · +180 XP</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-[hsl(260,25%,11%)] rounded-2xl border border-yellow-500/20 overflow-hidden">
            <canvas ref={canvasRef} width={780} height={500} className="w-full" style={{ background: 'hsl(260,25%,9%)' }} />
          </div>

          <div className="space-y-4">
            {/* Medium 1 selector */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-yellow-500/20 p-4">
              <h3 className="text-sm font-bold text-yellow-300 mb-3 flex items-center gap-2"><Zap className="h-4 w-4" />Môi trường 1 (trái)</h3>
              <div className="grid grid-cols-2 gap-1">
                {MATERIALS.map(m => (
                  <button key={m.name} onClick={() => setParams(p => ({ ...p, n1: m.n }))}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${Math.abs(params.n1 - m.n) < 0.001 ? 'bg-yellow-600/50 text-white border border-yellow-400/40' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
                    {m.name}<br /><span className="font-mono opacity-70">n={m.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Medium 2 selector */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-green-500/20 p-4">
              <h3 className="text-sm font-bold text-green-300 mb-3">Môi trường 2 (phải)</h3>
              <div className="grid grid-cols-2 gap-1">
                {MATERIALS.map(m => (
                  <button key={m.name} onClick={() => setParams(p => ({ ...p, n2: m.n }))}
                    className={`px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${Math.abs(params.n2 - m.n) < 0.001 ? 'bg-green-600/50 text-white border border-green-400/40' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
                    {m.name}<br /><span className="font-mono opacity-70">n={m.n}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Angle control */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-yellow-500/20 p-4">
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>Góc tới θᵢ</span>
                <span className="font-mono text-yellow-300">{params.angleDeg}°</span>
              </div>
              <input type="range" min={0} max={89} step={1} value={params.angleDeg}
                onChange={e => setParams(p => ({ ...p, angleDeg: +e.target.value }))}
                className="w-full accent-yellow-500 mb-3" />

              <div className="space-y-2 text-xs">
                <div className={`p-2 rounded-lg ${tir ? 'bg-red-500/20 border border-red-500/30' : 'bg-green-500/20 border border-green-500/30'}`}>
                  <span className="font-mono">{tir ? '⚡ PHẢN XẠ TOÀN PHẦN' : `θₜ = ${θt?.toFixed(2)}°`}</span>
                </div>
                {θc !== null && (
                  <div className={`p-2 rounded-lg ${params.angleDeg >= θc ? 'bg-red-500/15 border border-red-500/20' : 'bg-white/5'}`}>
                    <span className="text-white/60">Góc tới hạn: </span>
                    <span className="font-mono text-yellow-300">{θc.toFixed(2)}°</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-yellow-500/20 p-4">
              <h3 className="text-sm font-bold text-yellow-300 mb-3">🎯 Mục tiêu học tập</h3>
              <ul className="space-y-2 text-xs text-white/70">
                {['Hiểu định luật Snell về khúc xạ ánh sáng', 'Phân tích phản xạ toàn phần nội tại', 'Tính toán góc tới hạn θ_c', 'So sánh chiết suất các vật liệu'].map(o => (
                  <li key={o} className="flex gap-2"><span className="text-yellow-400">▸</span>{o}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
