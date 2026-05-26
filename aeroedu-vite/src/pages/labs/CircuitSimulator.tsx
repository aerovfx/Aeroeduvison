import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Zap, Power, Settings2, Info, Lightbulb, Battery, ToggleLeft, ArrowLeft,
  Cpu, Sparkles, Activity, Thermometer, Sun,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
type FlowType = 'conventional' | 'electron'

// ─── Canvas segment path ─────────────────────────────────────────────────────
const SEGMENTS = [
  { x1: 120, y1: 150, x2: 120, y2: 60,  len: 90  },
  { x1: 120, y1: 60,  x2: 250, y2: 60,  len: 130 },
  { x1: 250, y1: 60,  x2: 330, y2: 60,  len: 80  },
  { x1: 330, y1: 60,  x2: 480, y2: 60,  len: 150 },
  { x1: 480, y1: 60,  x2: 480, y2: 180, len: 120 },
  { x1: 480, y1: 180, x2: 480, y2: 260, len: 80  },
  { x1: 480, y1: 260, x2: 480, y2: 380, len: 120 },
  { x1: 480, y1: 380, x2: 120, y2: 380, len: 360 },
  { x1: 120, y1: 380, x2: 120, y2: 310, len: 70  },
  { x1: 120, y1: 310, x2: 120, y2: 150, len: 160 },
]
const TOTAL_LEN = SEGMENTS.reduce((acc, s) => acc + s.len, 0)

function getPointAtDistance(d: number) {
  d = ((d % TOTAL_LEN) + TOTAL_LEN) % TOTAL_LEN
  let cur = 0
  for (const seg of SEGMENTS) {
    if (d <= cur + seg.len) {
      const ratio = (d - cur) / seg.len
      return {
        x:     seg.x1 + (seg.x2 - seg.x1) * ratio,
        y:     seg.y1 + (seg.y2 - seg.y1) * ratio,
        angle: Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1),
        d,
      }
    }
    cur += seg.len
  }
  return { x: SEGMENTS[0].x1, y: SEGMENTS[0].y1, angle: 0, d: 0 }
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: { isClosed: boolean; voltage: number; flowType: FlowType; offset: number },
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.lineCap  = 'round'
  ctx.lineJoin = 'round'

  // Positive wire (red)
  ctx.beginPath()
  ctx.moveTo(120, 150)
  ctx.lineTo(120, 60)
  ctx.lineTo(250, 60)
  ctx.lineWidth   = 6
  ctx.strokeStyle = '#dc2626'
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(330, 60)
  ctx.lineTo(480, 60)
  ctx.lineTo(480, 180)
  ctx.stroke()

  // Negative wire (dark)
  ctx.beginPath()
  ctx.moveTo(480, 260)
  ctx.lineTo(480, 380)
  ctx.lineTo(120, 380)
  ctx.lineTo(120, 310)
  ctx.strokeStyle = '#1f2937'
  ctx.stroke()

  // Switch dots
  ctx.fillStyle = '#1f2937'
  ctx.beginPath(); ctx.arc(250, 60, 6, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(330, 60, 6, 0, Math.PI * 2); ctx.fill()

  // Switch arm
  ctx.beginPath()
  ctx.lineWidth   = 6
  ctx.strokeStyle = '#4b5563'
  ctx.moveTo(250, 60)
  if (state.isClosed) {
    ctx.lineTo(330, 60)
  } else {
    ctx.lineTo(315, 20)
  }
  ctx.stroke()

  // Bulb base
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(455, 250, 50, 30)
  ctx.fillStyle = '#4b5563'
  ctx.beginPath()
  ctx.arc(480, 280, 15, 0, Math.PI, false)
  ctx.fill()

  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth   = 2
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(455, 255 + i * 8)
    ctx.lineTo(505, 257 + i * 8)
    ctx.stroke()
  }

  // Bulb glass
  ctx.beginPath()
  ctx.arc(480, 200, 50, 0, Math.PI * 2)
  ctx.shadowBlur = 0
  if (state.isClosed) {
    const gradient = ctx.createRadialGradient(480, 200, 10, 480, 200, 50)
    const alpha    = Math.min(0.4 + state.voltage * 0.05, 1)
    gradient.addColorStop(0, `rgba(253, 224, 71, ${alpha + 0.2})`)
    gradient.addColorStop(1, `rgba(253, 224, 71, ${alpha * 0.3})`)
    ctx.fillStyle  = gradient
    ctx.shadowColor = '#fef08a'
    ctx.shadowBlur  = 10 + state.voltage * 4
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  }
  ctx.fill()
  ctx.shadowBlur    = 0
  ctx.strokeStyle   = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth     = 3
  ctx.stroke()

  // Filament
  ctx.strokeStyle = state.isClosed ? '#fef08a' : '#6b7280'
  ctx.lineWidth   = 3
  ctx.beginPath()
  ctx.moveTo(465, 250); ctx.lineTo(465, 210)
  ctx.lineTo(475, 185); ctx.lineTo(485, 185)
  ctx.lineTo(495, 210); ctx.lineTo(495, 250)
  ctx.stroke()

  // Battery body
  ctx.fillStyle = '#111827'
  ctx.fillRect(80, 230, 80, 80)
  ctx.fillStyle = '#f97316'
  ctx.fillRect(80, 150, 80, 80)
  ctx.strokeStyle = '#374151'
  ctx.lineWidth   = 2
  ctx.strokeRect(80, 150, 80, 160)
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(100, 135, 40, 15)
  ctx.fillStyle = 'white'
  ctx.font           = 'bold 36px Arial'
  ctx.textAlign      = 'center'
  ctx.textBaseline   = 'middle'
  ctx.fillText('+', 120, 190)
  ctx.fillText('-', 120, 270)

  // Particles
  const NUM   = 18
  const SPACE = TOTAL_LEN / NUM
  for (let i = 0; i < NUM; i++) {
    const d  = state.offset + i * SPACE
    const pt = getPointAtDistance(d)
    if (pt.d > 1200) continue
    if (!state.isClosed && pt.d > 220 && pt.d < 330) continue

    ctx.save()
    ctx.translate(pt.x, pt.y)
    if (state.flowType === 'conventional') {
      ctx.rotate(pt.angle)
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.moveTo(12, 0); ctx.lineTo(-6, 8); ctx.lineTo(-6, -8)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.fillStyle      = 'white'
      ctx.font           = 'bold 12px Arial'
      ctx.textAlign      = 'center'
      ctx.textBaseline   = 'middle'
      ctx.fillText('-', 0, 1)
    }
    ctx.restore()
  }

  // Labels
  ctx.fillStyle      = '#6b7280'
  ctx.font           = '16px Arial'
  ctx.textAlign      = 'center'
  ctx.textBaseline   = 'alphabetic'
  ctx.fillText('Nguồn DC',  120, 340)
  ctx.fillText('Công tắc',  290,  40)
  ctx.fillText('Bóng đèn',  480, 410)
}

// ─── Quiz state ───────────────────────────────────────────────────────────────
const QUIZ_ANSWERS = ['Giữ nguyên', 'Tăng gấp đôi', 'Giảm một nửa', 'Tăng gấp ba']

// ─── Component ────────────────────────────────────────────────────────────────
export default function CircuitSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef  = useRef<{ isClosed: boolean; voltage: number; flowType: FlowType; offset: number }>({
    isClosed: false, voltage: 5, flowType: 'conventional', offset: 0,
  })

  const [isClosed,  setIsClosed]  = useState(false)
  const [voltage,   setVoltage]   = useState(5)
  const [resistance, setResistance] = useState(10)  // Ω — now adjustable
  const [flowType,  setFlowType]  = useState<FlowType>('conventional')
  const [current,   setCurrent]   = useState(0)
  const [quizPicked, setQuizPicked] = useState<number | null>(null)

  // Sync ref
  useEffect(() => {
    stateRef.current = { ...stateRef.current, isClosed, voltage, flowType }
    setCurrent(isClosed ? voltage / resistance : 0)
  }, [isClosed, voltage, resistance, flowType])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number
    const render = () => {
      const s = stateRef.current
      if (s.isClosed) {
        const speed = 0.5 + s.voltage * 0.1
        s.offset += s.flowType === 'conventional' ? speed : -speed
      }
      drawCircuit(ctx, canvas, s)
      rafId = requestAnimationFrame(render)
    }
    render()
    return () => cancelAnimationFrame(rafId)
  }, [])

  const power = voltage * current

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950 p-4 md:p-6 text-white/90">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Header — compact + back button ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboard/labtwin" className="p-2 hover:bg-white/[0.08] rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 rounded-xl shadow-lg shadow-orange-500/30">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">
                Mạch điện DC — Định luật Ohm
              </h1>
              <p className="text-white/45 text-sm mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1"><Battery className="h-3 w-3" /> Vật lý 11</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Mô phỏng tương tác</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> R · V · I · P</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Preset scenarios ── */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/[0.08] p-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-white/45 font-semibold uppercase tracking-wide shrink-0 pl-2">🎯 Kịch bản</span>
          {([
            { label: 'LED đỏ', icon: Sun, V: 2, R: 220, hint: 'I rất nhỏ — LED không cháy' },
            { label: 'Đèn tròn 5W', icon: Lightbulb, V: 5, R: 5, hint: 'Đèn sợi đốt — R thấp' },
            { label: 'Quạt mini', icon: Cpu, V: 6, R: 12, hint: 'Motor DC' },
            { label: 'Đèn sưởi', icon: Thermometer, V: 12, R: 4, hint: 'Tải lớn — I cao' },
            { label: 'Tuỳ chỉnh', icon: Settings2, V: 5, R: 10, hint: 'Mặc định' },
          ] as const).map((p) => {
            const isActive = voltage === p.V && resistance === p.R
            return (
              <button key={p.label}
                onClick={() => { setVoltage(p.V); setResistance(p.R) }}
                title={p.hint}
                className={`shrink-0 px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-bold transition ${
                  isActive
                    ? 'bg-amber-500/25 border border-amber-500/40 text-amber-200'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/65 hover:bg-white/[0.08]'
                }`}>
                <p.icon className="w-3 h-3" /> {p.label}
                <span className="text-white/40 ml-0.5 font-mono">{p.V}V/{p.R}Ω</span>
              </button>
            )
          })}
        </div>

        {/* ── Stats Bar ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Battery className="h-8 w-8 text-orange-400" />, value: `${voltage}V`, label: 'Điện áp', color: 'text-orange-400' },
            { icon: <Zap     className="h-8 w-8 text-blue-400"   />, value: `${current.toFixed(2)}A`, label: 'Dòng điện', color: 'text-blue-400' },
            { icon: <Settings2 className="h-8 w-8 text-purple-400" />, value: `${resistance}Ω`, label: 'Điện trở', color: 'text-purple-400' },
            {
              icon: <Power className={`h-8 w-8 ${isClosed ? 'text-green-400' : 'text-white/25'}`} />,
              value: isClosed ? 'ON' : 'OFF',
              label: 'Trạng thái',
              color: isClosed ? 'text-green-400' : 'text-white/30',
            },
          ].map(({ icon, value, label, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-white/40">{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Layout ────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Control Panel (1/3) */}
          <div className="w-full lg:w-1/3 space-y-5">

            {/* Switch */}
            <div className="rounded-xl border-2 border-blue-500/25 bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h3 className="flex items-center gap-2 font-semibold text-white/85">
                  <Power className="h-5 w-5 text-blue-400" /> Điều khiển mạch
                </h3>
                <p className="text-xs text-white/40 mt-1">Bật/tắt công tắc để đóng/ngắt mạch</p>
              </div>
              <div className="p-5">
                <button
                  onClick={() => setIsClosed(!isClosed)}
                  className={`w-full py-4 rounded-xl text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isClosed
                      ? 'bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30'
                      : 'bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 shadow-lg shadow-green-500/10'
                  }`}
                >
                  <ToggleLeft className={`h-6 w-6 ${!isClosed ? 'animate-pulse' : ''}`} />
                  {isClosed ? 'Tắt Công Tắc (Mở Mạch)' : 'Bật Công Tắc (Đóng Mạch)'}
                </button>
              </div>
            </div>

            {/* Voltage Slider */}
            <div className="rounded-xl border-2 border-purple-500/25 bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h3 className="flex items-center gap-2 font-semibold text-white/85">
                  <Settings2 className="h-5 w-5 text-purple-400" /> Điện áp nguồn (Voltage)
                </h3>
                <p className="text-xs text-white/40 mt-1">Điều chỉnh điện áp từ 1V đến 12V</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-white/70">Điện áp:</span>
                  <span className="text-blue-400">{voltage} V</span>
                </div>

                {/* Native range styled */}
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={voltage}
                  onChange={e => setVoltage(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500
                             bg-white/10"
                  style={{
                    background: `linear-gradient(to right, hsl(262,83%,58%) ${((voltage - 1) / 11) * 100}%, rgba(255,255,255,0.1) ${((voltage - 1) / 11) * 100}%)`
                  }}
                />

                <div className="flex justify-between text-xs text-white/35">
                  <span>1V</span>
                  <span>12V</span>
                </div>

                <div className="rounded-lg bg-blue-500/10 border border-blue-500/15 p-3 text-sm text-blue-300">
                  💡 <strong>Định luật Ohm:</strong> I = V/R = {voltage}V / {resistance}Ω ={' '}
                  <strong>{current.toFixed(3)}A</strong> = {(current * 1000).toFixed(1)} mA
                </div>
              </div>
            </div>

            {/* Resistance slider — mới */}
            <div className="rounded-xl border-2 border-emerald-500/25 bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h3 className="flex items-center gap-2 font-semibold text-white/85">
                  <Cpu className="h-5 w-5 text-emerald-400" /> Điện trở R
                </h3>
                <p className="text-xs text-white/40 mt-1">Đổi điện trở tải để thấy I = V/R thay đổi</p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-white/70">Điện trở:</span>
                  <span className="text-emerald-400 font-mono">{resistance} Ω</span>
                </div>
                <input
                  type="range" min={1} max={500} step={1} value={resistance}
                  onChange={(e) => setResistance(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  style={{
                    background: `linear-gradient(to right, hsl(160,80%,45%) ${((Math.log(resistance) - Math.log(1)) / (Math.log(500) - Math.log(1))) * 100}%, rgba(255,255,255,0.1) ${((Math.log(resistance) - Math.log(1)) / (Math.log(500) - Math.log(1))) * 100}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-white/35">
                  <span>1Ω</span>
                  <span>500Ω</span>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/15 p-3 text-xs text-emerald-300">
                  📐 R nhỏ → I lớn (đèn sáng) · R lớn → I nhỏ (an toàn cho linh kiện nhạy như LED)
                </div>
              </div>
            </div>

            {/* Flow Type */}
            <div className="rounded-xl border-2 border-pink-500/25 bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h3 className="font-semibold text-white/85 text-sm">Chế độ hiển thị dòng điện</h3>
                <p className="text-xs text-white/40 mt-1">Chọn cách hiển thị dòng điện</p>
              </div>
              <div className="p-4 space-y-3">
                {/* Conventional */}
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  flowType === 'conventional'
                    ? 'border-blue-500/40 bg-blue-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]'
                }`}>
                  <input
                    type="radio"
                    name="flowType"
                    value="conventional"
                    checked={flowType === 'conventional'}
                    onChange={() => setFlowType('conventional')}
                    className="w-4 h-4 accent-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-300 text-sm">Dòng điện quy ước</div>
                    <div className="text-xs text-white/40 mt-0.5">Chảy từ Cực Dương (+) sang Cực Âm (-)</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                    <span className="text-blue-300 text-xs font-bold">→</span>
                  </div>
                </label>

                {/* Electron */}
                <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  flowType === 'electron'
                    ? 'border-red-500/40 bg-red-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]'
                }`}>
                  <input
                    type="radio"
                    name="flowType"
                    value="electron"
                    checked={flowType === 'electron'}
                    onChange={() => setFlowType('electron')}
                    className="w-4 h-4 accent-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-red-300 text-sm">Dòng Electron thực tế</div>
                    <div className="text-xs text-white/40 mt-0.5">Electron (-) di chuyển về Cực Dương (+)</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-red-500/30 border border-red-500/40 flex items-center justify-center shrink-0 text-red-300 text-xs font-bold">
                    e⁻
                  </div>
                </label>
              </div>
            </div>

            {/* Power readout — modernized */}
            <div className="rounded-xl border border-yellow-500/25 bg-gradient-to-br from-yellow-500/[0.06] to-orange-500/[0.04] p-4 space-y-2">
              <p className="text-yellow-300/70 text-xs uppercase tracking-wide font-bold flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Công suất tiêu thụ
              </p>
              <p className="text-yellow-300 font-bold text-2xl font-mono">
                {power >= 1 ? `${power.toFixed(2)} W` : `${(power * 1000).toFixed(1)} mW`}
              </p>
              <p className="text-white/40 text-xs font-mono">P = V × I = {voltage} × {current.toFixed(3)}</p>
              {/* Brightness viz */}
              <div className="pt-2 border-t border-yellow-500/15">
                <div className="text-[10px] text-white/45 mb-1">Độ sáng tương đối</div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 via-yellow-400 to-amber-200 transition-all duration-500"
                    style={{ width: `${Math.min(100, (power / 10) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Canvas (2/3) */}
          <div className="w-full lg:w-2/3">
            <div className="rounded-xl border-2 border-yellow-500/20 bg-white/[0.02] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-white/[0.05]">
                <h3 className="flex items-center gap-2 font-semibold text-white/85">
                  <Lightbulb className="h-5 w-5 text-yellow-400" /> Mô phỏng mạch điện
                </h3>
                <p className="text-xs text-white/40 mt-1">Quan sát dòng điện chạy trong mạch kín</p>
              </div>
              <div className="p-4 flex items-center justify-center bg-[hsl(230,25%,10%)] rounded-b-xl">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={450}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Theory Section ─────────────────────────────────────────── */}
        <div className="rounded-xl border-2 border-blue-500/20 bg-blue-500/[0.04] overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
            <h3 className="flex items-center gap-2 font-semibold text-blue-300 text-lg">
              <Info className="h-5 w-5 text-blue-400" /> Lý thuyết về Nguồn điện DC
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-base text-white/80">📚 Nguồn điện một chiều (DC)</h4>
                <p className="text-sm text-white/55 leading-relaxed">
                  Mô phỏng này thể hiện mạch điện sử dụng nguồn một chiều (DC - Direct Current) như Pin hoặc Ắc-quy.
                  Trong mạch DC, dòng điện chỉ chảy theo một hướng duy nhất từ cực dương (+) sang cực âm (-).
                </p>
                <p className="text-sm text-white/55 leading-relaxed">
                  <span className="text-white/70 font-medium">Ngược lại:</span> Nguồn điện xoay chiều (AC - Alternating Current)
                  từ các ổ cắm điện trong nhà có dòng điện đổi chiều liên tục (50-60 lần mỗi giây).
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-base text-white/80">⚡ Định luật Ohm</h4>
                <div className="rounded-xl border-2 border-purple-500/20 bg-purple-500/[0.06] p-5">
                  <div className="text-center text-3xl font-bold text-purple-300 mb-3">I = V / R</div>
                  <div className="text-sm text-white/55 space-y-1.5">
                    <div><span className="text-white/70 font-medium">I:</span> Cường độ dòng điện (Ampe)</div>
                    <div><span className="text-white/70 font-medium">V:</span> Hiệu điện thế (Volt)</div>
                    <div><span className="text-white/70 font-medium">R:</span> Điện trở (Ohm)</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/[0.05] p-5">
              <h4 className="font-semibold text-yellow-300 mb-2 text-sm">
                💡 Quy ước lịch sử về chiều dòng điện
              </h4>
              <p className="text-sm text-yellow-200/60 leading-relaxed">
                Trước khi phát hiện ra electron (cuối thế kỷ 19), các nhà khoa học quy ước dòng điện chảy từ{' '}
                <span className="text-yellow-200/85 font-medium">cực dương (+) sang cực âm (-)</span>. Sau này, khoa học
                chứng minh dòng chuyển dời thực tế là các{' '}
                <span className="text-yellow-200/85 font-medium">electron mang điện tích âm (-)</span> chạy từ cực âm sang
                cực dương. Tuy nhiên, quy ước cũ vẫn được sử dụng rộng rãi trong thiết kế mạch điện và giáo dục ngày nay.
              </p>
            </div>
          </div>
        </div>

        {/* ── Quiz Section ────────────────────────────────────────────── */}
        <div className="rounded-xl border-2 border-green-500/20 bg-white/[0.02] overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
            <h3 className="flex items-center gap-2 font-semibold text-green-300 text-lg">
              <Lightbulb className="h-5 w-5 text-green-400" /> Câu hỏi kiểm tra
            </h3>
          </div>
          <div className="p-6">
            <div className="rounded-xl border border-green-500/15 bg-green-500/[0.04] p-5">
              <p className="font-semibold text-white/80 mb-4 text-sm">
                Câu 1: Khi tăng điện áp từ 5V lên 10V, dòng điện trong mạch sẽ thay đổi như thế nào?
              </p>
              <div className="grid md:grid-cols-2 gap-3 mb-5">
                {QUIZ_ANSWERS.map((answer, i) => (
                  <button
                    key={i}
                    onClick={() => setQuizPicked(i)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm transition-all ${
                      quizPicked === i
                        ? i === 1
                          ? 'border-green-500/40 bg-green-500/15 text-green-300'
                          : 'border-red-500/40 bg-red-500/10 text-red-300'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/[0.15] hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      quizPicked === i
                        ? i === 1 ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                        : 'bg-white/[0.08] text-white/50'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {answer}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-green-500/15 bg-green-500/[0.05] p-3.5 text-sm text-green-300">
                <span className="text-white/70 font-medium">Đáp án:</span>{' '}
                B - Tăng gấp đôi (theo định luật Ohm: I tỉ lệ thuận với V)
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
