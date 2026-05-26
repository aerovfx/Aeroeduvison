/**
 * DensityBuoyancy — Thí nghiệm mật độ + lực đẩy Archimedes
 *
 * Route: /dashboard/labtwin/density-buoyancy
 * User: "áp dụng thêm 1 số thí nghiệm tại ohstem.vn/thi-nghiem-khoa-hoc-voi-innolab"
 *
 * Style InnoLab: thả nhiều vật khác nhau vào nhiều chất lỏng khác nhau,
 * quan sát vật nổi/chìm/lơ lửng dựa trên mật độ.
 *
 * Features:
 *   - Bể chứa nhiều chất lỏng phân tầng (mật ong dưới, nước giữa, dầu trên)
 *   - 8 vật mẫu với mật độ khác nhau (vàng, sắt, gỗ, xốp, đá, plastic...)
 *   - Click "Thả" → vật rơi và nổi/chìm theo Archimedes
 *   - Tính F_buoyancy + visualize vector
 *   - Hiển thị mật độ + thể tích + khối lượng + công thức
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Droplets, Info,
} from 'lucide-react'

interface Liquid {
  id: string
  name: string
  density: number   // kg/m³
  color: string
  alpha: number
}

interface SolidObject {
  id: string
  name: string
  emoji: string
  density: number     // kg/m³
  volume: number      // cm³ (= 1e-6 m³)
}

// Liquids ordered top-to-bottom (least dense first)
const LIQUIDS: Liquid[] = [
  { id: 'oil',   name: 'Dầu ăn',     density: 920,   color: '#fbbf24', alpha: 0.55 },
  { id: 'water', name: 'Nước',       density: 1000,  color: '#22d3ee', alpha: 0.45 },
  { id: 'milk',  name: 'Sữa',        density: 1030,  color: '#f1f5f9', alpha: 0.65 },
  { id: 'syrup', name: 'Si-rô đường', density: 1330,  color: '#a855f7', alpha: 0.65 },
  { id: 'honey', name: 'Mật ong',    density: 1420,  color: '#d97706', alpha: 0.85 },
]

const OBJECTS: SolidObject[] = [
  { id: 'cork',     name: 'Nút bần',   emoji: '🟫', density: 240,   volume: 30 },
  { id: 'wood',     name: 'Gỗ',         emoji: '🪵', density: 700,   volume: 40 },
  { id: 'ice',      name: 'Đá viên',    emoji: '🧊', density: 917,   volume: 25 },
  { id: 'plastic',  name: 'Nhựa PP',    emoji: '🟦', density: 950,   volume: 30 },
  { id: 'rubber',   name: 'Cao su',     emoji: '⚫', density: 1100,  volume: 25 },
  { id: 'glass',    name: 'Thuỷ tinh',  emoji: '🔵', density: 2500,  volume: 20 },
  { id: 'aluminum', name: 'Nhôm',       emoji: '⚪', density: 2700,  volume: 20 },
  { id: 'iron',     name: 'Sắt',        emoji: '⚙️', density: 7870,  volume: 15 },
  { id: 'lead',     name: 'Chì',        emoji: '🔘', density: 11340, volume: 12 },
  { id: 'gold',     name: 'Vàng',       emoji: '🟡', density: 19320, volume: 10 },
]

interface DropObject {
  id: number
  solidId: string
  x: number
  y: number       // y in canvas px (top=0)
  vy: number
}

const CANVAS_W = 480
const CANVAS_H = 540
const TANK_TOP = 60
const TANK_BOTTOM = CANVAS_H - 40
const TANK_LEFT = 60
const TANK_RIGHT = CANVAS_W - 60
const TANK_HEIGHT = TANK_BOTTOM - TANK_TOP
const G = 9.81

// Boundaries between liquid layers (y in canvas px)
// Each liquid takes 1/N of tank height (top = lightest)
function getLayerBounds(): Array<{ liquid: Liquid; topY: number; bottomY: number }> {
  const layerH = TANK_HEIGHT / LIQUIDS.length
  return LIQUIDS.map((liquid, i) => ({
    liquid,
    topY: TANK_TOP + i * layerH,
    bottomY: TANK_TOP + (i + 1) * layerH,
  }))
}

// Get liquid density at given y position
function getLiquidAt(y: number): Liquid {
  const layers = getLayerBounds()
  for (const l of layers) {
    if (y >= l.topY && y < l.bottomY) return l.liquid
  }
  // Below tank → use bottom liquid
  return LIQUIDS[LIQUIDS.length - 1]
}

export default function DensityBuoyancy() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const objectsRef = useRef<DropObject[]>([])
  const runningRef = useRef(true)
  const [running, setRunning] = useState(true)
  const [selectedObjId, setSelectedObjId] = useState<string>('wood')
  const [showVectors, setShowVectors] = useState(true)
  const [, forceRender] = useState(0)
  const objCounterRef = useRef(0)

  runningRef.current = running

  const dropObject = (solidId: string) => {
    objCounterRef.current += 1
    objectsRef.current.push({
      id: objCounterRef.current,
      solidId,
      x: TANK_LEFT + 30 + Math.random() * (TANK_RIGHT - TANK_LEFT - 60),
      y: TANK_TOP + 20,
      vy: 0,
    })
    forceRender((n) => (n + 1) & 0xFFFF)
  }

  const clearAll = () => {
    objectsRef.current = []
    forceRender((n) => (n + 1) & 0xFFFF)
  }

  // Sim loop
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
        for (const o of objectsRef.current) {
          const obj = OBJECTS.find((x) => x.id === o.solidId)!
          // Object size in px (proportional to volume cube root)
          const sizePx = 16 + Math.cbrt(obj.volume) * 4
          // Get liquid where object center is
          const liquid = getLiquidAt(o.y)
          // Net force per unit mass = g·(1 - ρ_liquid / ρ_solid)
          // If ρ_liquid > ρ_solid: net force UP (object floats)
          // If ρ_liquid < ρ_solid: net force DOWN (sinks)
          const aNet = G * (1 - liquid.density / obj.density)
          o.vy += aNet * dt
          // Drag (high in dense liquid)
          const dragCoef = liquid.density / 1000 * 0.4
          o.vy *= (1 - dragCoef * dt)
          o.y += o.vy * dt * 30  // scale: 1m physics = 30px
          // Bounds
          if (o.y > TANK_BOTTOM - sizePx / 2) {
            o.y = TANK_BOTTOM - sizePx / 2
            o.vy = -Math.abs(o.vy) * 0.2
          }
          if (o.y < TANK_TOP + sizePx / 2) {
            o.y = TANK_TOP + sizePx / 2
            o.vy = Math.max(0, o.vy)
          }
        }
      }

      // ─── Render ───
      ctx.fillStyle = '#0a0f1f'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      // Tank glass
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 4
      ctx.strokeRect(TANK_LEFT, TANK_TOP, TANK_RIGHT - TANK_LEFT, TANK_HEIGHT)

      // Liquid layers
      const layers = getLayerBounds()
      for (const l of layers) {
        ctx.fillStyle = `${l.liquid.color}${Math.round(l.liquid.alpha * 255).toString(16).padStart(2, '0')}`
        ctx.fillRect(TANK_LEFT + 2, l.topY, TANK_RIGHT - TANK_LEFT - 4, l.bottomY - l.topY)
        // Layer label
        ctx.fillStyle = '#cbd5e1'
        ctx.font = 'bold 11px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText(`${l.liquid.name} (${l.liquid.density} kg/m³)`,
          TANK_RIGHT + 8, (l.topY + l.bottomY) / 2 + 3)
        // Boundary line
        if (l !== layers[layers.length - 1]) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(TANK_LEFT + 4, l.bottomY)
          ctx.lineTo(TANK_RIGHT - 4, l.bottomY)
          ctx.stroke()
        }
      }

      // Objects
      for (const o of objectsRef.current) {
        const obj = OBJECTS.find((x) => x.id === o.solidId)!
        const sizePx = 16 + Math.cbrt(obj.volume) * 4
        const liquid = getLiquidAt(o.y)
        const isFloating = liquid.density > obj.density

        // Shadow under
        ctx.shadowColor = isFloating ? '#22d3ee' : '#ef4444'
        ctx.shadowBlur = 6
        ctx.fillStyle = isFloating ? 'rgba(34,211,238,0.85)' : 'rgba(239,68,68,0.85)'
        ctx.beginPath()
        ctx.arc(o.x, o.y, sizePx / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Emoji label
        ctx.font = `${sizePx * 0.7}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(obj.emoji, o.x, o.y)

        // Tiny density label
        ctx.font = 'bold 9px monospace'
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'top'
        ctx.fillText(`${obj.density}`, o.x, o.y + sizePx / 2 + 2)

        // Force vectors
        if (showVectors) {
          const mass = obj.density * obj.volume * 1e-6   // kg
          const W = mass * G                              // weight N
          const FB = liquid.density * obj.volume * 1e-6 * G  // buoyant N
          const fScale = 80 / Math.max(W, FB, 0.1)        // scale to fit
          // Weight (down)
          ctx.strokeStyle = '#ef4444'
          ctx.fillStyle = '#ef4444'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(o.x, o.y)
          ctx.lineTo(o.x, o.y + W * fScale)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(o.x, o.y + W * fScale)
          ctx.lineTo(o.x - 4, o.y + W * fScale - 6)
          ctx.lineTo(o.x + 4, o.y + W * fScale - 6)
          ctx.closePath()
          ctx.fill()
          // Buoyant (up)
          ctx.strokeStyle = '#22d3ee'
          ctx.fillStyle = '#22d3ee'
          ctx.beginPath()
          ctx.moveTo(o.x, o.y)
          ctx.lineTo(o.x, o.y - FB * fScale)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(o.x, o.y - FB * fScale)
          ctx.lineTo(o.x - 4, o.y - FB * fScale + 6)
          ctx.lineTo(o.x + 4, o.y - FB * fScale + 6)
          ctx.closePath()
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [showVectors])

  const selectedObj = OBJECTS.find((o) => o.id === selectedObjId)!
  const mass = selectedObj.density * selectedObj.volume * 1e-6
  const W = mass * G

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-sky-950/20 to-slate-950 text-white/90">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300 bg-clip-text text-transparent flex items-center gap-2">
                <Droplets className="w-6 h-6 text-cyan-400" />
                Mật độ &amp; Lực đẩy Archimedes
              </h1>
              <p className="text-sm text-white/50 mt-0.5">
                Thả vật vào bể nhiều tầng chất lỏng — quan sát nổi/chìm theo F_đẩy = ρ·V·g
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setRunning(!running)}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition ${
                running ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}>
              {running ? <><Pause className="w-4 h-4" /> Tạm dừng</> : <><Play className="w-4 h-4" /> Chạy</>}
            </button>
            <button onClick={clearAll}
              className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold flex items-center gap-1.5 text-sm">
              <RotateCcw className="w-4 h-4" /> Vớt hết
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Object picker + drop button */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-white/55 mb-2">🧪 Vật để thả</h3>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTS.map((o) => (
                  <button key={o.id}
                    onClick={() => setSelectedObjId(o.id)}
                    className={`px-2 py-2 rounded-lg text-left transition ${
                      selectedObjId === o.id
                        ? 'bg-cyan-500/25 border border-cyan-500/45 text-cyan-100'
                        : 'bg-white/[0.04] border border-white/[0.08] text-white/65 hover:bg-white/[0.08]'
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{o.emoji}</span>
                      <span className="font-bold text-xs">{o.name}</span>
                    </div>
                    <div className="text-[10px] text-white/45 font-mono mt-0.5">
                      {o.density} kg/m³ · {o.volume}cm³
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => dropObject(selectedObjId)}
                className="mt-3 w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 font-bold text-sm flex items-center justify-center gap-2 transition">
                <Droplets className="w-4 h-4" /> Thả {selectedObj.emoji} {selectedObj.name}
              </button>
            </div>

            {/* Selected obj info */}
            <div className="rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/25 p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-300">📊 Vật đang chọn</h3>
              <Row label="Mật độ ρ" value={`${selectedObj.density} kg/m³`} />
              <Row label="Thể tích V" value={`${selectedObj.volume} cm³`} />
              <Row label="Khối lượng m" value={`${(mass * 1000).toFixed(2)} g`} />
              <Row label="Trọng lực W" value={`${(W * 1000).toFixed(2)} mN`} />
              <hr className="border-white/[0.08]" />
              <div className="text-[11px] text-white/55 italic">
                Dự đoán: vật sẽ <strong className="text-amber-300">chìm</strong> trong chất lỏng có ρ &lt; {selectedObj.density} kg/m³
                và <strong className="text-cyan-300">nổi</strong> trong chất có ρ &gt; {selectedObj.density} kg/m³.
              </div>
            </div>

            {/* Toggles */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                  className="accent-cyan-500" />
                <span className="text-white/70">Hiển thị vector lực (W đỏ + F_đẩy xanh)</span>
              </label>
            </div>
          </div>

          {/* Tank canvas */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-3 flex justify-center">
              <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
                className="rounded-lg max-w-full h-auto" />
            </div>

            {/* Theory */}
            <div className="rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 p-4">
              <h3 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" /> Lý thuyết
              </h3>
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                <div>
                  <h4 className="font-bold text-amber-300 mb-1">📐 Lực đẩy Archimedes</h4>
                  <p className="text-white/55 leading-relaxed font-mono bg-white/[0.04] p-2 rounded">
                    F_đẩy = ρ_lỏng · V_vật · g
                  </p>
                  <p className="text-white/55 mt-1 leading-relaxed">
                    Lực đẩy bằng <strong>trọng lượng lượng chất lỏng bị chiếm chỗ</strong>.
                    Vật nổi khi F_đẩy ≥ W (trọng lượng), chìm khi F_đẩy &lt; W.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-emerald-300 mb-1">⚖️ Tiêu chí nổi/chìm</h4>
                  <p className="text-white/55 leading-relaxed">
                    Vật <strong>nổi</strong> khi <em>ρ_vật &lt; ρ_lỏng</em> ·
                    <strong>lơ lửng</strong> khi <em>ρ_vật = ρ_lỏng</em> ·
                    <strong>chìm</strong> khi <em>ρ_vật &gt; ρ_lỏng</em>.
                  </p>
                  <p className="text-white/55 mt-2 leading-relaxed">
                    Trong bể 5 tầng này, vật sẽ <strong>dừng</strong> ở tầng có mật độ
                    vừa lớn hơn mật độ vật (cân bằng tại biên 2 tầng).
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/55">{label}</span>
      <span className="font-mono font-bold text-cyan-300">{value}</span>
    </div>
  )
}
