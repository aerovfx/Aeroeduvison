/**
 * GeometryUnfold — Khám phá hình học không gian: trải phẳng + công thức sống
 *
 * Route: /dashboard/labtwin/labs/geometry-unfold
 *
 * User: paste tham khảo HTML mô phỏng dark sci-fi với 4 khối hình học
 * "Mô phỏng đúng các dạng hình học căn bản nhé"
 *
 * 4 khối:
 *   - Hình lập phương (cube)
 *   - Hộp chữ nhật (cuboid)
 *   - Hình trụ (cylinder)
 *   - Chóp vuông (pyramid)
 *
 * 3 cột:
 *   - Trái: chọn hình + slider kích thước
 *   - Giữa: canvas trải phẳng + animation
 *   - Phải: công thức S/V live + face breakdown + progress ring
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Home, Play, RotateCcw, Box, Layers, Sparkles } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
type ShapeKey = 'cube' | 'cuboid' | 'cylinder' | 'pyramid'
interface Dims { a: number; w: number; h: number; d: number; r: number; height: number; slant: number }

interface SliderDef { key: keyof Dims; label: string; min: number; max: number; step: number }
const SLIDER_DEFS: Record<ShapeKey, SliderDef[]> = {
  cube:     [{ key:'a',      label:'Cạnh a',      min:1, max:8,  step:0.5 }],
  cuboid:   [
    { key:'w', label:'Chiều dài w', min:1, max:9,  step:0.5 },
    { key:'h', label:'Chiều cao h', min:1, max:6,  step:0.5 },
    { key:'d', label:'Chiều rộng d', min:1, max:6, step:0.5 },
  ],
  cylinder: [
    { key:'r',      label:'Bán kính r',  min:1, max:5, step:0.25 },
    { key:'height', label:'Chiều cao h', min:1, max:8, step:0.5  },
  ],
  pyramid:  [
    { key:'a',     label:'Cạnh đáy a', min:1, max:8, step:0.5 },
    { key:'slant', label:'Trung đoạn l', min:2, max:9, step:0.5 },
  ],
}

const SHAPE_META: Record<ShapeKey, { name: string; icon: string; desc: string; color: string }> = {
  cube:     { name: 'Hình lập phương',    icon: '🟦', desc: '6 mặt vuông bằng nhau. Khai triển thành hình chữ thập.', color: '#4fc3f7' },
  cuboid:   { name: 'Hình hộp chữ nhật',  icon: '📦', desc: '6 mặt chữ nhật theo 3 cặp song song.',                  color: '#a78bfa' },
  cylinder: { name: 'Hình trụ',           icon: '🥫', desc: '2 đáy tròn + 1 mặt bên hình chữ nhật khi trải ra.',     color: '#34d399' },
  pyramid:  { name: 'Hình chóp tứ giác đều', icon: '🔺', desc: '1 đáy vuông + 4 mặt tam giác cân xung quanh.',       color: '#f97316' },
}

const FACE_COLORS = {
  cube:    ['#4fc3f780','#4fc3f7a0','#4fc3f760','#4fc3f790','#4fc3f770','#4fc3f7b0'],
  cuboid:  ['#a78bfa80','#a78bfaa0','#4fc3f780','#4fc3f7a0','#34d39980','#34d399a0'],
  cylinder_base: '#34d39980',
  cylinder_lat:  '#4fc3f750',
  pyramid: ['#f9731680','#fbbf2480','#f59e0b80','#ef444480','#f97316a0'],
}
const STROKE = { cube:'#4fc3f7', cuboid:'#a78bfa', cylinder:'#34d399', pyramid:'#f97316' }

const round2 = (x: number) => Math.round(x * 100) / 100

// ── Main component ────────────────────────────────────────────
export default function GeometryUnfold() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animTimerRef = useRef<number | null>(null)

  const [shape, setShape] = useState<ShapeKey>('cube')
  const [unfoldPct, setUnfoldPct] = useState(0)
  const [dims, setDims] = useState<Dims>({ a: 4, w: 5, h: 3, d: 3, r: 2.5, height: 5, slant: 4 })

  // ── Formulas ─────────────────────────────────────────────
  const computed = (() => {
    const { a, w, h, d, r, height, slant } = dims
    if (shape === 'cube') {
      const sa = 6 * a * a, vol = a * a * a
      return {
        sa: round2(sa), vol: round2(vol),
        saFormula: 'S = 6 × a²',
        volFormula: 'V = a³',
        breakdown: [{ label: '6 mặt vuông', color: '#4fc3f7', val: `6 × ${round2(a*a)} = ${round2(sa)}` }],
      }
    }
    if (shape === 'cuboid') {
      const ab = round2(w * h), ac = round2(w * d), bc = round2(h * d)
      const sa = 2 * (ab + ac + bc), vol = w * h * d
      return {
        sa: round2(sa), vol: round2(vol),
        saFormula: 'S = 2(wh + wd + hd)',
        volFormula: 'V = w × h × d',
        breakdown: [
          { label: '2 mặt trước/sau', color: '#a78bfa', val: `2 × ${ab} = ${round2(2*ab)}` },
          { label: '2 mặt trên/dưới', color: '#4fc3f7', val: `2 × ${ac} = ${round2(2*ac)}` },
          { label: '2 mặt cạnh',      color: '#34d399', val: `2 × ${bc} = ${round2(2*bc)}` },
        ],
      }
    }
    if (shape === 'cylinder') {
      const circ = 2 * Math.PI * r
      const baseA = Math.PI * r * r
      const lateral = circ * height
      const sa = 2 * baseA + lateral
      const vol = Math.PI * r * r * height
      return {
        sa: round2(sa), vol: round2(vol),
        saFormula: 'S = 2πr² + 2πrh',
        volFormula: 'V = πr²h',
        breakdown: [
          { label: '2 đáy tròn', color: '#34d399', val: `2 × ${round2(baseA)} = ${round2(2*baseA)}` },
          { label: 'Mặt bên',    color: '#4fc3f7', val: `${round2(circ)} × ${height} = ${round2(lateral)}` },
        ],
      }
    }
    // pyramid
    const base = a * a
    const faceA = 0.5 * a * slant
    const sa = base + 4 * faceA
    // V = ⅓ × a² × h_apex. h_apex = √(slant² - (a/2)²) — Pythagorean exact
    const hApex = Math.sqrt(Math.max(0, slant*slant - (a/2)*(a/2)))
    const vol = (1/3) * a * a * hApex
    return {
      sa: round2(sa), vol: round2(vol),
      saFormula: 'S = a² + 4 × (½ × a × l)',
      volFormula: 'V = ⅓ × a² × h',
      breakdown: [
        { label: 'Đáy vuông',     color: '#f97316', val: `${a}² = ${round2(base)}` },
        { label: '4 mặt tam giác',color: '#fbbf24', val: `4 × ${round2(faceA)} = ${round2(4*faceA)}` },
      ],
    }
  })()

  // ── Drawing ──────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const cx = canvas.width / 2, cy = canvas.height / 2
    const t = unfoldPct
    if (shape === 'cube')     drawCubeNet(ctx, canvas, cx, cy, t, dims)
    if (shape === 'cuboid')   drawCuboidNet(ctx, canvas, cx, cy, t, dims)
    if (shape === 'cylinder') drawCylinderNet(ctx, canvas, cx, cy, t, dims)
    if (shape === 'pyramid')  drawPyramidNet(ctx, canvas, cx, cy, t, dims)
    if (t < 0.02) {
      ctx.save()
      ctx.fillStyle = '#7b82a880'
      ctx.font = '600 13px Nunito, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('← Kéo thanh "Trải phẳng" để xem khai triển →', canvas.width/2, canvas.height - 20)
      ctx.restore()
    }
  }, [shape, dims, unfoldPct])

  // ── Resize canvas ─────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = window.devicePixelRatio || 1
      const w = parent.clientWidth - 32
      const h = parent.clientHeight - 32
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw()
    }
    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [draw])

  useEffect(() => { draw() }, [draw])

  // Auto-animate unfolding
  const animateUnfold = () => {
    if (animTimerRef.current) {
      cancelAnimationFrame(animTimerRef.current)
      animTimerRef.current = null
      return
    }
    let v = unfoldPct * 100
    const step = () => {
      v += 0.8
      if (v >= 100) { v = 100; animTimerRef.current = null }
      else animTimerRef.current = requestAnimationFrame(step)
      setUnfoldPct(v / 100)
    }
    animTimerRef.current = requestAnimationFrame(step)
  }

  const resetUnfold = () => {
    if (animTimerRef.current) { cancelAnimationFrame(animTimerRef.current); animTimerRef.current = null }
    setUnfoldPct(0)
  }

  const handleShapeChange = (s: ShapeKey) => {
    setShape(s)
    resetUnfold()
  }

  // Progress ring
  const ringCirc = 201
  const pct = Math.round(unfoldPct * 100)
  const status = pct === 0 ? 'Đang đóng hoàn toàn'
              : pct < 30  ? 'Bắt đầu cắt cạnh...'
              : pct < 70  ? 'Đang mở ra...'
              : pct < 100 ? 'Gần trải phẳng...'
              : 'Đã trải phẳng hoàn toàn! ✓'

  const meta = SHAPE_META[shape]

  return (
    <div className="min-h-screen flex flex-col text-white"
      style={{
        background: 'radial-gradient(ellipse at top, #1a1d2e 0%, #0f1117 60%, #050505 100%)',
        fontFamily: '"Nunito", "Inter", system-ui, sans-serif',
      }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" />
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 bg-black/40 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate('/dashboard/labtwin')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 transition-all">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">LabTwin</span>
        </button>
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 transition-all">
          <Home className="h-4 w-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-white/10 mx-1" />
        <span className="text-xl">📐</span>
        <span className="text-sm font-bold tracking-tight">Hình học không gian</span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.2em] text-amber-300/70 font-bold">
          Trải phẳng · Diện tích · Thể tích
        </span>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-0 min-h-0">
        {/* LEFT — shape picker + dim sliders */}
        <div className="border-r border-white/10 bg-[#1a1d2e]/60 p-4 space-y-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold pb-2 border-b border-white/10">
            🔷 Chọn hình
          </div>
          {(Object.keys(SHAPE_META) as ShapeKey[]).map(key => {
            const m = SHAPE_META[key]
            const active = shape === key
            return (
              <button key={key} onClick={() => handleShapeChange(key)}
                className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                  active
                    ? 'border-amber-500 shadow-[0_0_20px_rgba(247,201,72,0.15)]'
                    : 'border-white/10 hover:border-white/20 hover:translate-x-0.5'
                }`}
                style={{ background: '#20243a' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                    style={{ background: `${m.color}28` }}>
                    {m.icon}
                  </div>
                  <span className="font-black text-sm">{m.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{m.desc}</p>
              </button>
            )
          })}

          <div className="pt-3 mt-2 border-t border-white/10">
            <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold mb-2">
              ⚙️ Kích thước
            </div>
            {SLIDER_DEFS[shape].map(d => (
              <div key={d.key} className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold">{d.label}</label>
                  <span className="text-amber-400 font-mono text-xs">{dims[d.key]}</span>
                </div>
                <input type="range" min={d.min} max={d.max} step={d.step}
                  value={dims[d.key]}
                  onChange={e => setDims(p => ({ ...p, [d.key]: parseFloat(e.target.value) }))}
                  className="w-full accent-amber-400" />
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — canvas */}
        <div className="flex flex-col items-center p-4 gap-3 min-h-0">
          <div className="flex items-center gap-3 bg-[#1a1d2e] border border-white/10 rounded-full px-4 py-1.5">
            <label className="text-xs uppercase tracking-wider font-bold text-slate-400">🔪 Trải phẳng</label>
            <input type="range" min={0} max={100} value={pct}
              onChange={e => setUnfoldPct(parseInt(e.target.value) / 100)}
              className="w-40 accent-amber-400" />
            <button onClick={animateUnfold}
              className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-[#20243a] hover:border-amber-400 hover:text-amber-400 transition">
              <Play className="inline h-3 w-3 mr-1" /> Tự động
            </button>
            <button onClick={resetUnfold}
              className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-[#20243a] hover:border-amber-400 hover:text-amber-400 transition">
              <RotateCcw className="inline h-3 w-3 mr-1" /> Reset
            </button>
          </div>
          <div className="flex-1 w-full rounded-2xl border border-white/10 overflow-hidden"
            style={{ background: '#13162080', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        {/* RIGHT — formulas */}
        <div className="border-l border-white/10 bg-[#1a1d2e]/60 p-4 space-y-3 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-bold pb-2 border-b border-white/10">
            📊 Công thức
          </div>

          {/* SA */}
          <div className="rounded-xl bg-[#20243a] border border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#4fc3f7' }} />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400">Diện tích toàn phần</span>
            </div>
            <p className="font-mono text-xs text-cyan-400 font-bold mb-1.5">{computed.saFormula}</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{computed.sa}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">đơn vị²</p>
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              {computed.breakdown.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
                    {b.label}
                  </span>
                  <span className="font-mono text-emerald-400 text-[10px]">{b.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vol */}
          <div className="rounded-xl bg-[#20243a] border border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#a78bfa' }} />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400">Thể tích</span>
            </div>
            <p className="font-mono text-xs text-cyan-400 font-bold mb-1.5">{computed.volFormula}</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{computed.vol}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">đơn vị³</p>
          </div>

          {/* Info */}
          <div className="rounded-xl p-3 text-[11px] leading-relaxed"
            style={{ background: 'rgba(247,201,72,0.06)', border: '1px solid rgba(247,201,72,0.2)' }}>
            <strong className="text-amber-400">💡 Khai triển</strong> là cách cắt và mở các cạnh của khối hình để trải phẳng thành lưới 2D.
            <br /><br />
            Tổng diện tích lưới 2D = <strong className="text-amber-400">Diện tích toàn phần</strong> của khối!
          </div>

          {/* Progress ring */}
          <div className="rounded-xl bg-[#20243a] border border-white/10 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#34d399' }} />
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400">Trạng thái khai triển</span>
            </div>
            <div className="flex justify-center my-2">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#2e3352" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="#f7c948"
                  strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={ringCirc} strokeDashoffset={ringCirc * (1 - unfoldPct)}
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dashoffset 0.1s' }} />
                <text x="40" y="45" textAnchor="middle" fill="#e8eaf6"
                  fontFamily="Space Mono" fontSize="13" fontWeight="700">
                  {pct}%
                </text>
              </svg>
            </div>
            <p className="text-center text-[11px] text-slate-400 font-mono">{status}</p>
          </div>

          <Link to="/dashboard/labtwin"
            className="block text-center text-[10px] text-cyan-400/60 hover:text-cyan-300 py-1 transition">
            ← Các phòng lab khác
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── DRAWING FUNCTIONS (port từ HTML reference) ─────────────────────

function fillStroke(ctx: CanvasRenderingContext2D, shape: ShapeKey) {
  ctx.strokeStyle = STROKE[shape]
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fill()
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11, color = '#e8eaf6') {
  ctx.save()
  ctx.fillStyle = color
  ctx.font = `700 ${size}px "Space Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
  ctx.restore()
}

function dim(ctx: CanvasRenderingContext2D, text: string, x1: number, y1: number, x2: number, y2: number, offset = 18) {
  const mx = (x1+x2)/2, my = (y1+y2)/2
  const angle = Math.atan2(y2-y1, x2-x1)
  const nx = -Math.sin(angle) * offset, ny = Math.cos(angle) * offset
  ctx.save()
  ctx.strokeStyle = '#f7c94888'
  ctx.lineWidth = 1
  ctx.setLineDash([4,4])
  ctx.beginPath()
  ctx.moveTo(x1+nx*0.6, y1+ny*0.6)
  ctx.lineTo(x2+nx*0.6, y2+ny*0.6)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#f7c948cc'
  ctx.font = '600 10px "Space Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, mx + nx, my + ny)
  ctx.restore()
}

// CUBE
function drawCubeNet(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, t: number, dims: Dims) {
  const a = dims.a
  const W = canvas.clientWidth, H = canvas.clientHeight
  const scale = Math.min(W, H) / (a * 5.5)
  const s = a * scale
  const ox = cx - s/2
  const oy = cy - s * 1.5

  const faces = [
    { col:1, row:0, i:0, label:'Trên' },
    { col:0, row:1, i:1, label:'Trái' },
    { col:1, row:1, i:2, label:'Trước' },
    { col:2, row:1, i:3, label:'Phải' },
    { col:3, row:1, i:4, label:'Sau' },
    { col:1, row:2, i:5, label:'Dưới' },
  ]

  if (t < 0.95) drawCube3D(ctx, cx + s * 1.8, cy - s * 0.2, s * 0.7, 1 - t)

  const alpha = Math.min(1, t * 1.15)
  faces.forEach(f => {
    const drawX = ox + f.col * s
    const drawY = oy + f.row * s
    ctx.save()
    ctx.globalAlpha = 0.2 + alpha * 0.8
    ctx.fillStyle = FACE_COLORS.cube[f.i]
    ctx.beginPath()
    ctx.rect(drawX, drawY, s, s)
    fillStroke(ctx, 'cube')
    label(ctx, f.label, drawX + s/2, drawY + s/2, 10, '#e8eaf6cc')
    if (t > 0.5) label(ctx, `${round2(a*a)} u²`, drawX + s/2, drawY + s*0.65, 9, '#f7c948cc')
    ctx.restore()
  })
  if (t > 0.3) {
    dim(ctx, `a=${a}`, ox+s, oy, ox+2*s, oy, -14)
    dim(ctx, `a=${a}`, ox+s, oy, ox+s, oy+s, 18)
  }
}

function drawCube3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, alpha: number) {
  if (alpha < 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.6
  const ox = s * 0.4, oy = -s * 0.25
  ctx.fillStyle = '#4fc3f730'; ctx.strokeStyle = '#4fc3f766'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.rect(cx - s/2, cy - s/2, s, s); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx-s/2, cy-s/2); ctx.lineTo(cx-s/2+ox, cy-s/2+oy)
  ctx.lineTo(cx+s/2+ox, cy-s/2+oy); ctx.lineTo(cx+s/2, cy-s/2)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx+s/2, cy-s/2); ctx.lineTo(cx+s/2+ox, cy-s/2+oy)
  ctx.lineTo(cx+s/2+ox, cy+s/2+oy); ctx.lineTo(cx+s/2, cy+s/2)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

// CUBOID
function drawCuboidNet(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, t: number, dims: Dims) {
  const { w, h, d } = dims
  const W = canvas.clientWidth, H = canvas.clientHeight
  const maxDim = Math.max(w * 4, h * 3, d * 3)
  const scale = Math.min(W, H) / (maxDim * 1.3)
  const sw = w * scale, sh = h * scale, sd = d * scale
  const ox = cx - sw/2
  const oy = cy - sd - sh/2

  const faces = [
    { x: ox,       y: oy,       fw: sw, fh: sd, i:0, label:'Trên'   },
    { x: ox-sd,    y: oy+sd,    fw: sd, fh: sh, i:1, label:'Trái'   },
    { x: ox,       y: oy+sd,    fw: sw, fh: sh, i:2, label:'Trước'  },
    { x: ox+sw,    y: oy+sd,    fw: sd, fh: sh, i:3, label:'Phải'   },
    { x: ox+sw+sd, y: oy+sd,    fw: sw, fh: sh, i:4, label:'Sau'    },
    { x: ox,       y: oy+sd+sh, fw: sw, fh: sd, i:5, label:'Dưới'   },
  ]

  if (t < 0.95) drawBox3D(ctx, cx + sw * 1.5 + sd, cy, sw * 0.7, sh * 0.7, sd * 0.5, 1 - t)
  const alpha = Math.min(1, t * 1.15)

  faces.forEach(f => {
    ctx.save()
    ctx.globalAlpha = 0.2 + alpha * 0.8
    ctx.fillStyle = FACE_COLORS.cuboid[f.i]
    ctx.beginPath()
    ctx.rect(f.x, f.y, f.fw, f.fh)
    fillStroke(ctx, 'cuboid')
    const areaVal = round2((f.fw / scale) * (f.fh / scale))
    label(ctx, f.label, f.x + f.fw/2, f.y + f.fh/2 - 6, 9, '#e8eaf6cc')
    if (t > 0.4) label(ctx, `${areaVal}u²`, f.x + f.fw/2, f.y + f.fh/2 + 8, 9, '#f7c948cc')
    ctx.restore()
  })
  if (t > 0.3) {
    dim(ctx, `w=${w}`, ox, oy - 4, ox + sw, oy - 4, -12)
    dim(ctx, `h=${h}`, ox + sw + sd + 6, oy + sd, ox + sw + sd + 6, oy + sd + sh, 18)
    dim(ctx, `d=${d}`, ox - sd - 6, oy + sd, ox - sd - 6, oy + sd + sh, -18)
  }
}

function drawBox3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, sw: number, sh: number, sd: number, alpha: number) {
  if (alpha < 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.55
  const ox = sd * 0.8, oy = -sd * 0.5
  ctx.fillStyle = '#a78bfa20'; ctx.strokeStyle = '#a78bfa55'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.rect(cx - sw/2, cy - sh/2, sw, sh); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx-sw/2, cy-sh/2); ctx.lineTo(cx-sw/2+ox, cy-sh/2+oy)
  ctx.lineTo(cx+sw/2+ox, cy-sh/2+oy); ctx.lineTo(cx+sw/2, cy-sh/2)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx+sw/2, cy-sh/2); ctx.lineTo(cx+sw/2+ox, cy-sh/2+oy)
  ctx.lineTo(cx+sw/2+ox, cy+sh/2+oy); ctx.lineTo(cx+sw/2, cy+sh/2)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

// CYLINDER
function drawCylinderNet(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, t: number, dims: Dims) {
  const { r, height } = dims
  const W = canvas.clientWidth, H = canvas.clientHeight
  const circ = 2 * Math.PI * r
  const scale = Math.min(W / (circ + 4), H / (height + 4 * r + 4)) * 0.75
  const sw = circ * scale
  const sh = height * scale
  const sr = r * scale
  const lx = cx - sw / 2
  const ly = cy - sh / 2 - sr - 8

  const alpha = Math.min(1, t * 1.15)
  if (t < 0.95) drawCylinder3D(ctx, cx + sw/2 + sr + 30, cy, sr * 0.8, sh * 0.7, 1-t)

  // Lateral rectangle
  ctx.save()
  ctx.globalAlpha = 0.2 + alpha * 0.8
  ctx.fillStyle = FACE_COLORS.cylinder_lat
  ctx.strokeStyle = STROKE.cylinder
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.rect(lx, ly + sr + 8, sw, sh)
  ctx.fill(); ctx.stroke()
  label(ctx, 'Mặt bên (hcn)', cx, ly + sr + 8 + sh/2 - 8, 10, '#e8eaf6cc')
  if (t > 0.4) label(ctx, `${round2(circ)} × ${height} = ${round2(circ * height)} u²`, cx, ly + sr + 8 + sh/2 + 8, 9, '#f7c948cc')
  ctx.restore()

  // Top circle
  ctx.save()
  ctx.globalAlpha = 0.2 + alpha * 0.8
  ctx.fillStyle = FACE_COLORS.cylinder_base
  ctx.strokeStyle = STROKE.cylinder
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, ly + sr, sr, sr, 0, 0, Math.PI * 2)
  ctx.fill(); ctx.stroke()
  label(ctx, 'Đáy', cx, ly + sr, 10, '#e8eaf6cc')
  if (t > 0.4) label(ctx, `πr²=${round2(Math.PI * r * r)}u²`, cx, ly + sr + sr * 0.5, 8, '#f7c948cc')
  ctx.restore()

  // Bottom circle
  const by = ly + sr + 8 + sh + sr + 8
  ctx.save()
  ctx.globalAlpha = 0.2 + alpha * 0.8
  ctx.fillStyle = FACE_COLORS.cylinder_base
  ctx.strokeStyle = STROKE.cylinder
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(cx, by, sr, sr, 0, 0, Math.PI * 2)
  ctx.fill(); ctx.stroke()
  label(ctx, 'Đáy', cx, by, 10, '#e8eaf6cc')
  ctx.restore()

  if (t > 0.3) {
    dim(ctx, `r=${r}`, cx, ly, cx + sr, ly, -14)
    dim(ctx, `h=${height}`, lx - 8, ly + sr + 8, lx - 8, ly + sr + 8 + sh, -16)
    dim(ctx, `2πr=${round2(circ)}`, lx, ly + sr + 4, lx + sw, ly + sr + 4, -12)
  }
}

function drawCylinder3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, sr: number, sh: number, alpha: number) {
  if (alpha < 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.55
  ctx.fillStyle = '#34d39920'; ctx.strokeStyle = '#34d39955'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(cx, cy - sh/2, sr, sr*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - sr, cy - sh/2)
  ctx.lineTo(cx - sr, cy + sh/2)
  ctx.arc(cx, cy + sh/2, sr, Math.PI, 0)
  ctx.lineTo(cx + sr, cy - sh/2)
  ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx, cy + sh/2, sr, sr*0.3, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.restore()
}

// PYRAMID
function drawPyramidNet(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cx: number, cy: number, t: number, dims: Dims) {
  const { a, slant } = dims
  const W = canvas.clientWidth, H = canvas.clientHeight
  const maxD = Math.max(a + 2 * slant, a * 2)
  const scale = Math.min(W, H) / (maxD * 1.5)
  const sa = a * scale, ss = slant * scale

  const alpha = Math.min(1, t * 1.15)
  if (t < 0.95) drawPyramid3D(ctx, cx + sa * 1.5 + ss, cy, sa * 0.7, ss * 0.7, 1 - t)

  const ox = cx - sa/2, oy = cy - sa/2

  // Base
  ctx.save()
  ctx.globalAlpha = 0.2 + alpha * 0.8
  ctx.fillStyle = FACE_COLORS.pyramid[0]
  ctx.strokeStyle = STROKE.pyramid
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.rect(ox, oy, sa, sa)
  ctx.fill(); ctx.stroke()
  label(ctx, 'Đáy', cx, cy - 6, 10, '#e8eaf6cc')
  if (t > 0.4) label(ctx, `a²=${round2(a*a)}u²`, cx, cy + 8, 9, '#f7c948cc')
  ctx.restore()

  const triData = [
    { hinge: [[ox, oy], [ox+sa, oy]], tip: [cx, oy - ss],          dir: [0, -1] },
    { hinge: [[ox+sa, oy], [ox+sa, oy+sa]], tip: [ox+sa+ss, cy],   dir: [1, 0]  },
    { hinge: [[ox, oy+sa], [ox+sa, oy+sa]], tip: [cx, oy+sa+ss],   dir: [0, 1]  },
    { hinge: [[ox, oy], [ox, oy+sa]], tip: [ox-ss, cy],            dir: [-1, 0] },
  ]
  triData.forEach((tri, i) => {
    ctx.save()
    ctx.globalAlpha = 0.2 + alpha * 0.8
    ctx.fillStyle = FACE_COLORS.pyramid[i + 1]
    ctx.strokeStyle = STROKE.pyramid
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(tri.hinge[0][0], tri.hinge[0][1])
    ctx.lineTo(tri.hinge[1][0], tri.hinge[1][1])
    ctx.lineTo(tri.tip[0], tri.tip[1])
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    const mx = (tri.hinge[0][0] + tri.hinge[1][0]) / 2
    const my = (tri.hinge[0][1] + tri.hinge[1][1]) / 2
    const lx = mx + tri.dir[0] * ss * 0.4
    const ly2 = my + tri.dir[1] * ss * 0.4
    label(ctx, '△', lx, ly2, 11, '#e8eaf6cc')
    if (t > 0.5) label(ctx, `${round2(0.5*a*slant)}u²`, lx, ly2 + 12, 8, '#f7c948cc')
    ctx.restore()
  })

  if (t > 0.3) {
    dim(ctx, `a=${a}`, ox, oy - 4, ox+sa, oy - 4, -12)
    dim(ctx, `l=${slant}`, ox+sa, cy, ox+sa+ss, cy, -14)
  }
}

function drawPyramid3D(ctx: CanvasRenderingContext2D, cx: number, cy: number, sa: number, sh: number, alpha: number) {
  if (alpha < 0.02) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.55
  ctx.fillStyle = '#f9731620'; ctx.strokeStyle = '#f9731655'; ctx.lineWidth = 1.5
  const bx = cx - sa/2, by = cy
  ctx.beginPath(); ctx.rect(bx, by, sa, sa * 0.4); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(bx, by + sa*0.4)
  ctx.lineTo(bx + sa/2, by - sh)
  ctx.lineTo(bx + sa, by + sa*0.4)
  ctx.closePath()
  ctx.fill(); ctx.stroke()
  ctx.restore()
}
