/**
 * CircuitBuilder — Analog circuit simulator (Crocodile Clips style)
 *
 * Mô hình:
 *   - Loop nối tiếp cố định: Battery → Switch → Slot1 → Slot2 → Slot3 → về Battery
 *   - Voltmeter song song với Slot chọn (mặc định Slot1)
 *   - Mỗi slot: click để đổi loại component (wire / resistor / bulb / ammeter / capacitor)
 *   - Điện áp nguồn & giá trị linh kiện chỉnh bằng slider
 *
 * Tính toán:
 *   - R_total = R1 + R2 + R3 (wire=0, ammeter=0, bulb=R, cap=∞ ở DC steady state)
 *   - Nếu không có tụ: I = V / R_total  (DC)
 *   - Nếu có tụ: transient RC
 *       Vc(t) = V·(1 − exp(−t/τ));  I(t) = (V/R)·exp(−t/τ);  τ = R·C
 *   - Bulb sáng theo P = I²·R (normalize 0..1)
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Battery, Gauge, Settings2, ToggleLeft, ToggleRight,
  RotateCcw, Play, Pause, Info, ArrowLeftRight, X,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type CompType =
  | 'wire' | 'resistor' | 'bulb' | 'ammeter' | 'capacitor'
  | 'diode' | 'led' | 'transistor'

interface Slot {
  id: 1 | 2 | 3
  type: CompType
  R: number          // Ohm (for resistor/bulb); 0 for wire/ammeter; ∞ for capacitor (DC)
  C: number          // Farads (for capacitor); 0 otherwise
  Vf: number         // Forward voltage drop (diode/led/transistor BE); 0 otherwise
  reverse: boolean   // True if diode/led/transistor oriented reverse to current flow
  baseOn: boolean    // True if transistor base is driven HIGH (only for transistor)
  ledColor: 'red' | 'green' | 'blue' | 'amber'  // LED color (only meaningful for led)
}

const ALL_TYPES: CompType[] = [
  'wire', 'resistor', 'bulb', 'ammeter', 'capacitor',
  'diode', 'led', 'transistor',
]

const LABEL: Record<CompType, string> = {
  wire:       'Dây nối',
  resistor:   'Điện trở',
  bulb:       'Bóng đèn',
  ammeter:    'Ampe kế',
  capacitor:  'Tụ điện',
  diode:      'Đi-ốt',
  led:        'LED',
  transistor: 'Tranzitor',
}

const SHORT_DESC: Record<CompType, string> = {
  wire:       'R = 0',
  resistor:   'R = 100 Ω',
  bulb:       'R = 50 Ω, phát sáng',
  ammeter:    'Đo dòng',
  capacitor:  'C = 100 µF',
  diode:      'Vf = 0,7 V (1N4148)',
  led:        'Vf = 2,0 V, phát sáng',
  transistor: 'NPN, cần tín hiệu Base',
}

const DEFAULT_R: Record<CompType, number> = {
  wire: 0, resistor: 100, bulb: 50, ammeter: 0, capacitor: 0,
  diode: 5, led: 5, transistor: 10,
}
const DEFAULT_C: Record<CompType, number> = {
  wire: 0, resistor: 0, bulb: 0, ammeter: 0, capacitor: 100e-6,  // 100 µF
  diode: 0, led: 0, transistor: 0,
}
const DEFAULT_VF: Record<CompType, number> = {
  wire: 0, resistor: 0, bulb: 0, ammeter: 0, capacitor: 0,
  diode: 0.7, led: 2.0, transistor: 0.7,  // BE drop for NPN saturation
}

const LED_COLORS: Record<'red' | 'green' | 'blue' | 'amber', { Vf: number; fill: string; glow: string }> = {
  red:   { Vf: 2.0, fill: '#ef4444', glow: '#fca5a5' },
  green: { Vf: 2.2, fill: '#22c55e', glow: '#86efac' },
  blue:  { Vf: 3.2, fill: '#3b82f6', glow: '#93c5fd' },
  amber: { Vf: 2.1, fill: '#f59e0b', glow: '#fcd34d' },
}

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────

function newSlot(id: 1 | 2 | 3, type: CompType): Slot {
  return {
    id, type,
    R: DEFAULT_R[type],
    C: DEFAULT_C[type],
    Vf: DEFAULT_VF[type],
    reverse: false,
    baseOn: type === 'transistor' ? true : false,
    ledColor: 'red',
  }
}

export default function CircuitBuilder() {
  const [voltage, setVoltage] = useState(9)        // V
  const [switchClosed, setSwitchClosed] = useState(true)
  const [slots, setSlots] = useState<Slot[]>([
    newSlot(1, 'resistor'),
    newSlot(2, 'bulb'),
    newSlot(3, 'ammeter'),
  ])
  const [voltmeterOn, setVoltmeterOn] = useState<1 | 2 | 3>(2)  // which slot
  const [running, setRunning] = useState(true)
  const [tMs, setTMs] = useState(0)   // elapsed sim time for transient
  const [pickerForSlot, setPickerForSlot] = useState<1 | 2 | 3 | null>(null)

  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number>(performance.now())

  // Animation loop
  useEffect(() => {
    function tick(now: number) {
      const dt = now - lastRef.current
      lastRef.current = now
      if (running && switchClosed) setTMs(t => t + dt)
      rafRef.current = requestAnimationFrame(tick)
    }
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [running, switchClosed])

  // Reset transient when switch toggles off
  useEffect(() => { if (!switchClosed) setTMs(0) }, [switchClosed])

  // ─── Simulate ───
  const sim = useMemo(() => simulate(voltage, switchClosed, slots, tMs), [voltage, switchClosed, slots, tMs])

  const setSlotType = (id: 1 | 2 | 3, type: CompType) => {
    setSlots(prev => prev.map(s => s.id === id ? newSlot(id, type) : s))
    setTMs(0)
    setPickerForSlot(null)
  }

  const updateValue = (id: 1 | 2 | 3, field: 'R' | 'C' | 'Vf', v: number) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: v } : s))
    setTMs(0)
  }

  const toggleSlotFlag = (id: 1 | 2 | 3, field: 'reverse' | 'baseOn') => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: !s[field] } : s))
    setTMs(0)
  }

  const setLedColor = (id: 1 | 2 | 3, color: 'red' | 'green' | 'blue' | 'amber') => {
    setSlots(prev => prev.map(s => s.id === id
      ? { ...s, ledColor: color, Vf: LED_COLORS[color].Vf }
      : s))
    setTMs(0)
  }

  const reset = () => {
    setTMs(0)
    setVoltage(9)
    setSwitchClosed(true)
    setSlots([
      newSlot(1, 'resistor'),
      newSlot(2, 'bulb'),
      newSlot(3, 'ammeter'),
    ])
    setPickerForSlot(null)
  }

  return (
    <div className="space-y-4">
      {/* Top bar: source + switch + run controls */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-amber-400" />
          <label className="text-xs text-zinc-400">Nguồn V =</label>
          <input
            type="range" min={1} max={24} step={0.5}
            value={voltage}
            onChange={e => setVoltage(Number(e.target.value))}
            className="w-32 accent-amber-500"
          />
          <span className="font-mono text-sm text-amber-300 w-12">{voltage.toFixed(1)} V</span>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <label className="text-xs text-zinc-400">Công tắc</label>
          <button
            onClick={() => setSwitchClosed(c => !c)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition ${
              switchClosed
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/40'
            }`}
          >
            {switchClosed
              ? (<><ToggleRight className="w-4 h-4" /> Đóng mạch</>)
              : (<><ToggleLeft className="w-4 h-4" /> Hở mạch</>)}
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setRunning(r => !r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${
              running
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {running
              ? (<><Pause className="w-3.5 h-3.5" /> Tạm dừng</>)
              : (<><Play className="w-3.5 h-3.5" /> Chạy</>)}
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            title="Reset mạch"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Open-circuit notice */}
      {sim.openReason && (
        <div className="bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-2.5 text-xs text-rose-300 flex items-center gap-2">
          <X className="w-4 h-4" /> Mạch hở: {sim.openReason}
        </div>
      )}

      {/* Circuit SVG */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
        <CircuitSVG
          voltage={voltage}
          switchClosed={switchClosed}
          slots={slots}
          sim={sim}
          voltmeterOn={voltmeterOn}
          onClickSlot={(id) => setPickerForSlot(id)}
          tMs={tMs}
        />
      </div>

      {/* Slot controls + measurements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> Linh kiện (click slot để chọn loại)
          </h3>
          <div className="space-y-3">
            {slots.map(s => (
              <div key={s.id} className="rounded-lg bg-zinc-800/40 border border-zinc-800 p-2.5 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                    Slot {s.id}
                  </span>
                  <button
                    onClick={() => setPickerForSlot(s.id)}
                    className="text-sm font-medium text-zinc-200 hover:text-cyan-300 underline decoration-dotted underline-offset-2"
                  >
                    {LABEL[s.type]}
                  </button>
                  <span className="text-[10px] text-zinc-500 italic ml-auto">{SHORT_DESC[s.type]}</span>
                </div>

                {/* Per-type controls */}
                {(s.type === 'resistor' || s.type === 'bulb') && (
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={1000} step={1}
                      value={s.R}
                      onChange={e => updateValue(s.id, 'R', Number(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <span className="font-mono text-xs text-cyan-300 w-20 text-right">
                      R = {s.R} Ω
                    </span>
                  </div>
                )}
                {s.type === 'capacitor' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={1000} step={1}
                      value={s.C * 1e6}
                      onChange={e => updateValue(s.id, 'C', Number(e.target.value) * 1e-6)}
                      className="flex-1 accent-cyan-500"
                    />
                    <span className="font-mono text-xs text-cyan-300 w-20 text-right">
                      C = {(s.C * 1e6).toFixed(0)} µF
                    </span>
                  </div>
                )}
                {(s.type === 'diode' || s.type === 'led') && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-12">Vf</span>
                      <input
                        type="range" min={0.2} max={3.5} step={0.1}
                        value={s.Vf}
                        onChange={e => updateValue(s.id, 'Vf', Number(e.target.value))}
                        className="flex-1 accent-amber-500"
                      />
                      <span className="font-mono text-xs text-amber-300 w-16 text-right">
                        {s.Vf.toFixed(1)} V
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleSlotFlag(s.id, 'reverse')}
                        className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1 ${
                          s.reverse
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        <ArrowLeftRight className="w-3 h-3" />
                        {s.reverse ? 'Phân cực ngược' : 'Phân cực thuận'}
                      </button>
                      {s.type === 'led' && (
                        <div className="flex items-center gap-1">
                          {(['red', 'green', 'blue', 'amber'] as const).map(c => (
                            <button
                              key={c}
                              onClick={() => setLedColor(s.id, c)}
                              className={`w-5 h-5 rounded-full border-2 ${
                                s.ledColor === c ? 'border-white' : 'border-zinc-700'
                              }`}
                              style={{ background: LED_COLORS[c].fill }}
                              title={`LED ${c}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {s.type === 'transistor' && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-zinc-400">Tín hiệu Base:</span>
                    <button
                      onClick={() => toggleSlotFlag(s.id, 'baseOn')}
                      className={`text-[11px] px-2.5 py-1 rounded border flex items-center gap-1 ${
                        s.baseOn
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {s.baseOn ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {s.baseOn ? 'HIGH (bão hoà)' : 'LOW (cutoff)'}
                    </button>
                    <span className="text-[10px] text-zinc-500">Vbe ≈ {s.Vf} V</span>
                  </div>
                )}
                {(s.type === 'wire' || s.type === 'ammeter') && (
                  <span className="text-[11px] text-zinc-500 italic block">
                    {s.type === 'ammeter' ? 'Nội trở ≈ 0 Ω (lý tưởng)' : 'Dây dẫn lý tưởng (0 Ω)'}
                  </span>
                )}

                {/* Picker grid (inline, only when this slot active) */}
                {pickerForSlot === s.id && (
                  <div className="mt-2 p-2 rounded bg-black/40 border border-cyan-500/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-cyan-300">
                        Chọn linh kiện cho Slot {s.id}
                      </span>
                      <button
                        onClick={() => setPickerForSlot(null)}
                        className="text-zinc-500 hover:text-zinc-200"
                        title="Đóng"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ALL_TYPES.map(t => (
                        <button
                          key={t}
                          onClick={() => setSlotType(s.id, t)}
                          className={`p-2 rounded border text-[10px] flex flex-col items-center gap-1 ${
                            s.type === t
                              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50'
                              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-cyan-500/40'
                          }`}
                          title={SHORT_DESC[t]}
                        >
                          <svg viewBox="0 0 48 24" className="w-10 h-5">
                            <ComponentIcon type={t} />
                          </svg>
                          <span>{LABEL[t]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-zinc-400">Vôn kế đo slot:</span>
            {[1, 2, 3].map(i => (
              <button
                key={i}
                onClick={() => setVoltmeterOn(i as 1 | 2 | 3)}
                className={`text-xs px-2.5 py-1 rounded border ${
                  voltmeterOn === i
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
              >
                Slot {i}
              </button>
            ))}
          </div>
        </div>

        {/* Measurements */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5" /> Số đo & công thức
          </h3>
          <div className="space-y-2 font-mono text-xs">
            <Meter label="R tổng" value={sim.rTotal === Infinity ? '∞' : `${sim.rTotal.toFixed(1)} Ω`} color="cyan" />
            <Meter label="Dòng I"   value={`${(sim.current * 1000).toFixed(2)} mA`} color="amber" />
            <Meter label="V nguồn"  value={`${voltage.toFixed(1)} V`} color="emerald" />
            {sim.slotVoltages.map((v, i) => (
              <Meter
                key={i}
                label={`V Slot ${i + 1}`}
                value={`${v.toFixed(2)} V`}
                color={voltmeterOn === i + 1 ? 'purple' : 'slate'}
              />
            ))}
            {slots.some(s => s.type === 'bulb') && (
              <Meter label="P bóng đèn"
                     value={`${sim.bulbPower.toFixed(3)} W`} color="yellow" />
            )}
            {sim.vfTotal > 0 && (
              <Meter label="ΣVf (drop bán dẫn)"
                     value={`${sim.vfTotal.toFixed(2)} V`} color="amber" />
            )}
            {sim.hasCapacitor && (
              <>
                <Meter label="τ = RC" value={`${(sim.tau * 1000).toFixed(1)} ms`} color="pink" />
                <Meter label="V tụ"   value={`${sim.capVoltage.toFixed(2)} V`} color="pink" />
                <Meter label="t"      value={`${(tMs / 1000).toFixed(2)} s`} color="slate" />
              </>
            )}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-black/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
              <Info className="w-3.5 h-3.5" /> Công thức
            </div>
            <div>Định luật Ohm: <span className="text-zinc-200">V = I · R</span></div>
            <div>Mạch nối tiếp: <span className="text-zinc-200">R<sub>td</sub> = R₁ + R₂ + R₃</span></div>
            <div>Công suất: <span className="text-zinc-200">P = I² · R = V²/R</span></div>
            <div>RC charging: <span className="text-zinc-200">V<sub>C</sub>(t) = V·(1 − e<sup>−t/τ</sup>)</span></div>
            <div>Đi-ốt/LED: <span className="text-zinc-200">I = (V − Vf)/R nếu thuận, 0 nếu ngược</span></div>
            <div>Tranzitor NPN: <span className="text-zinc-200">Base HIGH → CE bão hoà; Base LOW → cutoff</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Small inline icon for picker buttons (compact 48×24 SVG)
// ────────────────────────────────────────────────────────────────

function ComponentIcon({ type }: { type: CompType }) {
  const stroke = '#cbd5e1'
  switch (type) {
    case 'wire':
      return <line x1={4} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
    case 'resistor':
      return (
        <>
          <line x1={4} y1={12} x2={14} y2={12} stroke={stroke} strokeWidth={2} />
          <path d="M 14 12 l 2 -5 l 4 10 l 4 -10 l 4 10 l 4 -10 l 2 5"
                stroke="#fbbf24" strokeWidth={2} fill="none" />
          <line x1={34} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
        </>
      )
    case 'bulb':
      return (
        <>
          <line x1={4} y1={12} x2={16} y2={12} stroke={stroke} strokeWidth={2} />
          <circle cx={24} cy={12} r={7} fill="#fde047" fillOpacity={0.4} stroke="#eab308" strokeWidth={1.5} />
          <path d="M 21 12 l 2 -3 l 1 3 l 1 -3 l 2 3" stroke="#92400e" strokeWidth={1} fill="none" />
          <line x1={32} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
        </>
      )
    case 'ammeter':
      return (
        <>
          <line x1={4} y1={12} x2={16} y2={12} stroke={stroke} strokeWidth={2} />
          <circle cx={24} cy={12} r={7} fill="#0f172a" stroke="#f59e0b" strokeWidth={1.5} />
          <text x={24} y={15} fill="#fbbf24" fontSize={8} fontWeight={700} textAnchor="middle">A</text>
          <line x1={32} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
        </>
      )
    case 'capacitor':
      return (
        <>
          <line x1={4} y1={12} x2={20} y2={12} stroke={stroke} strokeWidth={2} />
          <line x1={20} y1={5} x2={20} y2={19} stroke="#ec4899" strokeWidth={2} />
          <line x1={26} y1={5} x2={26} y2={19} stroke="#ec4899" strokeWidth={2} />
          <line x1={26} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
        </>
      )
    case 'diode':
      return (
        <>
          <line x1={4} y1={12} x2={18} y2={12} stroke={stroke} strokeWidth={2} />
          <polygon points="18,5 30,12 18,19" fill="#22d3ee" stroke="#22d3ee" strokeWidth={1} />
          <line x1={30} y1={5} x2={30} y2={19} stroke="#22d3ee" strokeWidth={2} />
          <line x1={30} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
        </>
      )
    case 'led':
      return (
        <>
          <line x1={4} y1={12} x2={18} y2={12} stroke={stroke} strokeWidth={2} />
          <polygon points="18,5 30,12 18,19" fill="#f87171" stroke="#f87171" strokeWidth={1} />
          <line x1={30} y1={5} x2={30} y2={19} stroke="#f87171" strokeWidth={2} />
          <line x1={30} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
          {/* Arrows out */}
          <line x1={34} y1={5} x2={37} y2={2} stroke="#fbbf24" strokeWidth={1.2} />
          <line x1={38} y1={5} x2={41} y2={2} stroke="#fbbf24" strokeWidth={1.2} />
        </>
      )
    case 'transistor':
      return (
        <>
          <line x1={4} y1={12} x2={18} y2={12} stroke={stroke} strokeWidth={2} />
          {/* base bar */}
          <line x1={18} y1={5} x2={18} y2={19} stroke="#a78bfa" strokeWidth={2.5} />
          {/* C and E lines */}
          <line x1={18} y1={9} x2={28} y2={5} stroke="#a78bfa" strokeWidth={2} />
          <line x1={18} y1={15} x2={28} y2={19} stroke="#a78bfa" strokeWidth={2} />
          <line x1={28} y1={5} x2={28} y2={12} stroke={stroke} strokeWidth={2} />
          <line x1={28} y1={19} x2={28} y2={12} stroke={stroke} strokeWidth={2} />
          <line x1={28} y1={12} x2={44} y2={12} stroke={stroke} strokeWidth={2} />
          {/* arrow (NPN: pointing OUT from emitter) */}
          <polygon points="25,17 28,19 25,20" fill="#a78bfa" />
        </>
      )
  }
}

// ────────────────────────────────────────────────────────────────
// Simulation
// ────────────────────────────────────────────────────────────────

interface SimResult {
  rTotal: number         // Ω
  current: number        // A (magnitude)
  slotVoltages: number[] // V across each slot
  bulbPower: number      // W (sum over bulbs)
  hasCapacitor: boolean
  tau: number            // s (R * C)
  capVoltage: number     // V (across capacitor, transient)
  vfTotal: number        // V (sum of forward drops of conducting diodes/LEDs/BJT)
  openReason: string | null   // null if loop closed, else explanation
}

/**
 * Series-loop solver:
 *   V_battery = Σ Vf_diode + I·Σ R   (for conducting semiconductors)
 *   I = max(0, (V − ΣVf) / ΣR)
 *
 * Special cases:
 *   - Diode/LED reverse-biased → open circuit (I=0)
 *   - Transistor base OFF → open circuit (cutoff)
 *   - Capacitor → transient I(t) = (V−ΣVf)/R · exp(−t/τ)
 *
 * Vf scales drop only when current flows (forward-biased & conducting).
 * For idealized education model — không cần Shockley equation.
 */
function simulate(V: number, closed: boolean, slots: Slot[], tMs: number): SimResult {
  const empty = (reason: string | null): SimResult => ({
    rTotal: reason ? Infinity : 0,
    current: 0,
    slotVoltages: [0, 0, 0],
    bulbPower: 0,
    hasCapacitor: false, tau: 0, capVoltage: 0,
    vfTotal: 0,
    openReason: reason,
  })

  if (!closed) return empty('Công tắc hở')

  // Detect open circuit due to reverse diode/LED or transistor cutoff
  let openReason: string | null = null
  for (const s of slots) {
    if ((s.type === 'diode' || s.type === 'led') && s.reverse) {
      openReason = `Slot ${s.id}: ${LABEL[s.type]} phân cực ngược → chặn dòng`
      break
    }
    if (s.type === 'transistor' && !s.baseOn) {
      openReason = `Slot ${s.id}: Tranzitor cutoff (Base = LOW)`
      break
    }
  }
  if (openReason) return empty(openReason)

  // Sum series components
  let R_res = 0
  let Vf_sum = 0
  let C_total = 0
  for (const s of slots) {
    if (s.type === 'resistor' || s.type === 'bulb') R_res += s.R
    if (s.type === 'diode' || s.type === 'led') {
      R_res += s.R          // small forward resistance
      Vf_sum += s.Vf
    }
    if (s.type === 'transistor') {
      R_res += s.R          // Vce_sat equivalent
      Vf_sum += s.Vf        // BE drop modelled as series Vf
    }
    if (s.type === 'capacitor') C_total += s.C
  }

  const hasCap = C_total > 0
  const tSec = tMs / 1000

  const R_for_solve = R_res > 0 ? R_res : 1e-3
  const tau = R_for_solve * C_total

  // Effective voltage driving the loop (after diode drops)
  const V_eff = Math.max(0, V - Vf_sum)

  let current = 0
  let capVoltage = 0

  if (V_eff <= 0) {
    // Not enough V to overcome forward drops — semiconductors don't conduct
    if (Vf_sum > 0) openReason = `Vnguồn (${V.toFixed(1)}V) < ΣVf (${Vf_sum.toFixed(1)}V) → không đủ mở`
    return empty(openReason)
  }

  if (!hasCap) {
    current = V_eff / R_for_solve
    current = Math.min(current, 1e4)
  } else {
    const k = tau > 0 ? Math.exp(-tSec / tau) : 0
    current = (V_eff / R_for_solve) * k
    capVoltage = V_eff * (1 - k)
  }

  // Per-slot voltages
  const slotVoltages = slots.map(s => {
    if (s.type === 'resistor' || s.type === 'bulb') return current * s.R
    if (s.type === 'capacitor') return capVoltage
    if (s.type === 'diode' || s.type === 'led') {
      return current > 1e-6 ? s.Vf + current * s.R : 0
    }
    if (s.type === 'transistor') {
      return current > 1e-6 ? s.Vf + current * s.R : 0  // Vce_sat ≈ Vf + I·R
    }
    return 0  // wire, ammeter
  })

  const bulbPower = slots.reduce((acc, s) =>
    s.type === 'bulb' ? acc + current * current * s.R : acc, 0)

  return {
    rTotal: R_res + (hasCap ? Infinity : 0),
    current, slotVoltages, bulbPower,
    hasCapacitor: hasCap, tau, capVoltage,
    vfTotal: Vf_sum,
    openReason: null,
  }
}

// ────────────────────────────────────────────────────────────────
// Small UI helpers
// ────────────────────────────────────────────────────────────────

function Meter({ label, value, color }: {
  label: string; value: string; color: 'cyan' | 'amber' | 'emerald' | 'purple' | 'yellow' | 'pink' | 'slate'
}) {
  const colors: Record<string, string> = {
    cyan:    'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
    amber:   'text-amber-300 bg-amber-500/10 border-amber-500/30',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
    purple:  'text-purple-300 bg-purple-500/10 border-purple-500/30',
    yellow:  'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
    pink:    'text-pink-300 bg-pink-500/10 border-pink-500/30',
    slate:   'text-slate-300 bg-slate-500/5 border-slate-700',
  }
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded border border-zinc-800">
      <span className="text-zinc-400">{label}</span>
      <span className={`px-2 py-0.5 rounded border ${colors[color]}`}>{value}</span>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// SVG circuit diagram
// ────────────────────────────────────────────────────────────────

function CircuitSVG({
  voltage, switchClosed, slots, sim, voltmeterOn, onClickSlot, tMs,
}: {
  voltage: number
  switchClosed: boolean
  slots: Slot[]
  sim: SimResult
  voltmeterOn: 1 | 2 | 3
  onClickSlot: (id: 1 | 2 | 3) => void
  tMs: number
}) {
  // Layout: rectangle loop 800×360
  // Battery left vertical, switch at top-left, slots 1-2-3 across top, return bottom
  const W = 820, H = 380
  const padX = 70, padY = 40
  const L = padX, R = W - padX
  const T = padY + 30, B = H - padY
  const topY = T, botY = B

  // Slot positions along top
  const slotY = topY
  const slotXs = [
    L + (R - L) * 0.30,
    L + (R - L) * 0.55,
    L + (R - L) * 0.80,
  ]

  const current = sim.current
  const flowing = switchClosed && current > 1e-6

  // Current animation offset (phase 0..1)
  const phase = flowing ? (tMs * current * 40) % 100 : 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-5xl mx-auto">
      <rect x={0} y={0} width={W} height={H} fill="#0b0f1a" rx={8} />

      {/* Grid dots */}
      {Array.from({ length: Math.floor(W / 30) }).map((_, i) =>
        Array.from({ length: Math.floor(H / 30) }).map((_, j) => (
          <circle key={`g-${i}-${j}`} cx={i * 30 + 15} cy={j * 30 + 15} r={0.6} fill="#1e293b" />
        ))
      )}

      {/* Loop wires (4 sides). Draw as full then overlay switch break at top-left */}
      <g stroke="#ef4444" strokeWidth={3} fill="none" strokeLinecap="round">
        {/* top wire from switch end to slot1, slot1-slot2, slot2-slot3, slot3-right */}
        <line x1={L + 80} y1={topY} x2={slotXs[0] - 32} y2={topY} />
        <line x1={slotXs[0] + 32} y1={topY} x2={slotXs[1] - 32} y2={topY} />
        <line x1={slotXs[1] + 32} y1={topY} x2={slotXs[2] - 32} y2={topY} />
        <line x1={slotXs[2] + 32} y1={topY} x2={R} y2={topY} />
      </g>
      <g stroke="#334155" strokeWidth={3} fill="none" strokeLinecap="round">
        {/* right down */}
        <line x1={R} y1={topY} x2={R} y2={botY} />
        {/* bottom */}
        <line x1={R} y1={botY} x2={L} y2={botY} />
        {/* left up to battery top */}
        <line x1={L} y1={botY} x2={L} y2={topY + 70} />
      </g>

      {/* Battery on left (vertical) */}
      <g>
        <line x1={L - 10} y1={topY + 40} x2={L + 10} y2={topY + 40}
              stroke="#fbbf24" strokeWidth={3} />
        <line x1={L - 6}  y1={topY + 52} x2={L + 6}  y2={topY + 52}
              stroke="#fbbf24" strokeWidth={5} />
        <line x1={L - 10} y1={topY + 64} x2={L + 10} y2={topY + 64}
              stroke="#fbbf24" strokeWidth={3} />
        <line x1={L - 6}  y1={topY + 76} x2={L + 6}  y2={topY + 76}
              stroke="#fbbf24" strokeWidth={5} />
        <text x={L + 18} y={topY + 54} fill="#fbbf24"
              fontSize={11} fontFamily="monospace" fontWeight={600}>
          {voltage.toFixed(1)} V
        </text>
        <text x={L + 18} y={topY + 68} fill="#94a3b8"
              fontSize={9} fontFamily="sans-serif">Pin</text>
        {/* wires from battery to top wire and bottom wire */}
        <line x1={L} y1={topY} x2={L} y2={topY + 40}
              stroke="#ef4444" strokeWidth={3} />
      </g>

      {/* Switch at top, just right of battery */}
      <g onClick={() => {/* noop; use toolbar button */}}>
        <circle cx={L + 30} cy={topY} r={4} fill="#64748b" />
        <circle cx={L + 70} cy={topY} r={4} fill="#64748b" />
        <line
          x1={L + 30} y1={topY}
          x2={switchClosed ? L + 70 : L + 65}
          y2={switchClosed ? topY : topY - 18}
          stroke={switchClosed ? '#22c55e' : '#ef4444'}
          strokeWidth={3} strokeLinecap="round"
        />
        <text x={L + 50} y={topY + 18} fill="#64748b"
              fontSize={9} fontFamily="monospace" textAnchor="middle">
          SW
        </text>
      </g>

      {/* Slots */}
      {slots.map((s, i) => (
        <SlotSVG
          key={s.id}
          x={slotXs[i]} y={slotY}
          slot={s}
          current={current}
          onClick={() => onClickSlot(s.id)}
          slotPower={s.type === 'bulb' ? current * current * s.R : 0}
        />
      ))}

      {/* Voltmeter — drawn below the selected slot */}
      {(() => {
        const vx = slotXs[voltmeterOn - 1]
        const vy = slotY + 110
        const vVal = sim.slotVoltages[voltmeterOn - 1]
        return (
          <g>
            {/* parallel wires from slot terminals down to voltmeter terminals */}
            <path d={`M ${vx - 32} ${slotY + 8}
                     L ${vx - 32} ${vy - 28}
                     L ${vx - 14} ${vy - 28}`}
                  stroke="#a855f7" strokeWidth={1.8} fill="none" />
            <path d={`M ${vx + 32} ${slotY + 8}
                     L ${vx + 32} ${vy - 28}
                     L ${vx + 14} ${vy - 28}`}
                  stroke="#a855f7" strokeWidth={1.8} fill="none" />
            {/* voltmeter body */}
            <circle cx={vx} cy={vy} r={26}
                    fill="#1e1b3b" stroke="#a855f7" strokeWidth={2} />
            <text x={vx} y={vy - 4} fill="#c4b5fd"
                  fontSize={12} fontWeight={700} textAnchor="middle">V</text>
            <text x={vx} y={vy + 10} fill="#a855f7"
                  fontSize={9} fontFamily="monospace" textAnchor="middle">
              {switchClosed ? vVal.toFixed(2) : '0.00'}
            </text>
            <text x={vx} y={vy + 36} fill="#a855f7"
                  fontSize={8} fontFamily="monospace" textAnchor="middle">
              Volt
            </text>
          </g>
        )
      })()}

      {/* Current flow dots (animated) */}
      {flowing && (() => {
        // place markers along the loop. simplified: along top wire from switch to right, then down, bottom, up
        const path = [
          { x1: L + 80, y1: topY, x2: R, y2: topY },                  // top
          { x1: R,      y1: topY, x2: R, y2: botY },                 // right
          { x1: R,      y1: botY, x2: L, y2: botY },                 // bottom
          { x1: L,      y1: botY, x2: L, y2: topY + 80 },            // left
        ]
        const lens = path.map(p => Math.hypot(p.x2 - p.x1, p.y2 - p.y1))
        const total = lens.reduce((a, b) => a + b, 0)
        const n = 18
        const markers: { x: number; y: number }[] = []
        for (let k = 0; k < n; k++) {
          let d = ((k / n) * total + (phase * total) / 100) % total
          for (let s = 0; s < path.length; s++) {
            if (d <= lens[s]) {
              const r = d / lens[s]
              markers.push({
                x: path[s].x1 + (path[s].x2 - path[s].x1) * r,
                y: path[s].y1 + (path[s].y2 - path[s].y1) * r,
              })
              break
            }
            d -= lens[s]
          }
        }
        return markers.map((m, i) => (
          <circle key={`e-${i}`} cx={m.x} cy={m.y} r={2.5}
                  fill="#fbbf24" opacity={0.85} />
        ))
      })()}

      {/* Direction arrows (conventional current) */}
      {flowing && (
        <g fill="#22c55e" opacity={0.6}>
          <polygon points={`${L + 110},${topY - 5} ${L + 120},${topY} ${L + 110},${topY + 5}`} />
          <polygon points={`${R - 5},${botY - 110} ${R},${botY - 100} ${R + 5},${botY - 110}`} />
        </g>
      )}
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────
// Slot symbol
// ────────────────────────────────────────────────────────────────

function SlotSVG({ x, y, slot, current, onClick, slotPower }: {
  x: number; y: number; slot: Slot; current: number; onClick: () => void; slotPower: number
}) {
  const W = 64, H = 40
  const cx = x, cy = y

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* click area */}
      <rect x={cx - W / 2} y={cy - H / 2} width={W} height={H}
            fill="transparent" />

      {/* component */}
      {slot.type === 'wire' && (
        <line x1={cx - 32} y1={cy} x2={cx + 32} y2={cy}
              stroke="#ef4444" strokeWidth={3} />
      )}
      {slot.type === 'resistor' && (
        <>
          <line x1={cx - 32} y1={cy} x2={cx - 16} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
          <path d={`M ${cx - 16} ${cy}
                    l 4 -8 l 8 16 l 8 -16 l 8 16 l 8 -16 l 4 8`}
                stroke="#fbbf24" strokeWidth={2} fill="none" />
          <line x1={cx + 16} y1={cy} x2={cx + 32} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
        </>
      )}
      {slot.type === 'bulb' && (() => {
        const P = slotPower
        const bright = Math.min(1, P / 1.5)   // normalize
        return (
          <>
            <line x1={cx - 32} y1={cy} x2={cx - 14} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            <circle cx={cx} cy={cy} r={18 + bright * 4}
                    fill="#fde047" fillOpacity={0.1 + bright * 0.4} />
            <circle cx={cx} cy={cy} r={12}
                    fill="#fde047" fillOpacity={0.3 + bright * 0.6}
                    stroke="#eab308" strokeWidth={1.5} />
            {/* filament */}
            <path d={`M ${cx - 7} ${cy} l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4`}
                  stroke="#92400e" strokeWidth={1} fill="none" />
            <line x1={cx + 14} y1={cy} x2={cx + 32} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
          </>
        )
      })()}
      {slot.type === 'ammeter' && (
        <>
          <line x1={cx - 32} y1={cy} x2={cx - 16} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
          <circle cx={cx} cy={cy} r={16}
                  fill="#0f172a" stroke="#f59e0b" strokeWidth={2} />
          <text x={cx} y={cy - 1} fill="#fbbf24"
                fontSize={11} fontWeight={700} textAnchor="middle">A</text>
          <text x={cx} y={cy + 10} fill="#fbbf24"
                fontSize={7} fontFamily="monospace" textAnchor="middle">
            {(current * 1000).toFixed(1)}
          </text>
          <line x1={cx + 16} y1={cy} x2={cx + 32} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
        </>
      )}
      {slot.type === 'capacitor' && (
        <>
          <line x1={cx - 32} y1={cy} x2={cx - 6} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
          <line x1={cx - 6} y1={cy - 14} x2={cx - 6} y2={cy + 14}
                stroke="#ec4899" strokeWidth={3} />
          <line x1={cx + 6} y1={cy - 14} x2={cx + 6} y2={cy + 14}
                stroke="#ec4899" strokeWidth={3} />
          <line x1={cx + 6} y1={cy} x2={cx + 32} y2={cy}
                stroke="#ef4444" strokeWidth={3} />
        </>
      )}
      {slot.type === 'diode' && (() => {
        const fwd = !slot.reverse
        // Triangle points right (anode→cathode) by default; flip if reverse
        const tipX = fwd ? cx + 4 : cx - 4
        const baseX = fwd ? cx - 8 : cx + 8
        const barX = fwd ? cx + 4 : cx - 4
        const conducting = current > 1e-6
        return (
          <>
            <line x1={cx - 32} y1={cy} x2={baseX} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            <polygon points={`${baseX},${cy - 9} ${tipX},${cy} ${baseX},${cy + 9}`}
                     fill={conducting ? '#22d3ee' : '#0e7490'}
                     stroke="#22d3ee" strokeWidth={1.5} />
            <line x1={barX} y1={cy - 9} x2={barX} y2={cy + 9}
                  stroke="#22d3ee" strokeWidth={2.5} />
            <line x1={fwd ? barX : barX} y1={cy} x2={cx + 32} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
          </>
        )
      })()}
      {slot.type === 'led' && (() => {
        const fwd = !slot.reverse
        const color = LED_COLORS[slot.ledColor]
        const conducting = current > 1e-6
        const bright = Math.min(1, current / 0.02)   // 20mA = full bright
        const tipX = fwd ? cx + 4 : cx - 4
        const baseX = fwd ? cx - 8 : cx + 8
        const barX = fwd ? cx + 4 : cx - 4
        return (
          <>
            <line x1={cx - 32} y1={cy} x2={baseX} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            {conducting && (
              <circle cx={cx} cy={cy} r={14 + bright * 6}
                      fill={color.glow} fillOpacity={0.15 + bright * 0.45} />
            )}
            <polygon points={`${baseX},${cy - 9} ${tipX},${cy} ${baseX},${cy + 9}`}
                     fill={conducting ? color.fill : '#475569'}
                     stroke={color.fill} strokeWidth={1.5} />
            <line x1={barX} y1={cy - 9} x2={barX} y2={cy + 9}
                  stroke={color.fill} strokeWidth={2.5} />
            {/* light-emission arrows */}
            <line x1={cx - 2} y1={cy - 14} x2={cx - 6} y2={cy - 22}
                  stroke="#fbbf24" strokeWidth={1.2} opacity={conducting ? 0.9 : 0.2} />
            <line x1={cx + 2} y1={cy - 14} x2={cx + 6} y2={cy - 22}
                  stroke="#fbbf24" strokeWidth={1.2} opacity={conducting ? 0.9 : 0.2} />
            <line x1={cx + 32} y1={cy} x2={cx + 32} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            <line x1={barX} y1={cy} x2={cx + 32} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
          </>
        )
      })()}
      {slot.type === 'transistor' && (() => {
        const on = slot.baseOn
        const purple = on ? '#a855f7' : '#475569'
        const conducting = current > 1e-6
        return (
          <>
            {/* C in (left) → top of transistor */}
            <line x1={cx - 32} y1={cy} x2={cx - 18} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            <line x1={cx - 18} y1={cy} x2={cx - 18} y2={cy - 12}
                  stroke="#ef4444" strokeWidth={3} />
            {/* Collector line slanted to base bar */}
            <line x1={cx - 18} y1={cy - 12} x2={cx - 6} y2={cy - 6}
                  stroke={purple} strokeWidth={2} />
            {/* Base vertical bar */}
            <line x1={cx - 6} y1={cy - 12} x2={cx - 6} y2={cy + 12}
                  stroke={purple} strokeWidth={3} />
            {/* Base lead */}
            <line x1={cx - 16} y1={cy + 18} x2={cx - 6} y2={cy + 6}
                  stroke={purple} strokeWidth={1.5} strokeDasharray={on ? undefined : '2,2'} />
            <text x={cx - 26} y={cy + 24} fill={purple}
                  fontSize={8} fontFamily="monospace" textAnchor="middle">B</text>
            {/* Emitter line slanted from base, then down to wire */}
            <line x1={cx - 6} y1={cy + 6} x2={cx + 6} y2={cy + 12}
                  stroke={purple} strokeWidth={2} />
            <polygon points={`${cx + 1},${cy + 11} ${cx + 6},${cy + 12} ${cx + 3},${cy + 15}`}
                     fill={purple} />
            <line x1={cx + 6} y1={cy + 12} x2={cx + 6} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            <line x1={cx + 6} y1={cy} x2={cx + 32} y2={cy}
                  stroke="#ef4444" strokeWidth={3} />
            {/* status badge */}
            <text x={cx + 14} y={cy - 12} fill={conducting ? '#22c55e' : '#64748b'}
                  fontSize={7} fontFamily="monospace" textAnchor="middle">
              {on ? 'SAT' : 'OFF'}
            </text>
          </>
        )
      })()}

      {/* value label below */}
      <text x={cx} y={cy + 28} fill="#94a3b8"
            fontSize={9} fontFamily="monospace" textAnchor="middle">
        {slot.type === 'resistor' || slot.type === 'bulb' ? `${slot.R} Ω`
         : slot.type === 'capacitor' ? `${(slot.C * 1e6).toFixed(0)} µF`
         : slot.type === 'diode'     ? `Vf=${slot.Vf.toFixed(1)}V${slot.reverse ? ' (ngược)' : ''}`
         : slot.type === 'led'       ? `LED ${slot.ledColor}${slot.reverse ? ' ngược' : ''}`
         : slot.type === 'transistor' ? `NPN Base=${slot.baseOn ? 'HI' : 'LO'}`
         : slot.type === 'ammeter'   ? 'Ampe kế'
         : 'Wire'}
      </text>
      {/* slot number above */}
      <text x={cx} y={cy - 24} fill="#64748b"
            fontSize={8} fontFamily="monospace" textAnchor="middle">
        Slot {slot.id}
      </text>
    </g>
  )
}
