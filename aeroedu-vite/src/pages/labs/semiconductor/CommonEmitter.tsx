/**
 * Common-Emitter Amplifier — analyze a voltage-biased NPN amplifier driven
 * by a small sinusoidal signal.
 *
 * Topology (resistor-biased, bypassed emitter):
 *
 *   Vcc──R1──┬──C──Rc──Vout
 *            │       │
 *   Vin─AC──(B)     (C)
 *            │       │
 *            └──R2─── (E) └── Re─┐
 *                                │
 *                              GND
 *
 * DC analysis (assumes Vbe_on = 0.7 V, β large so Ib ≈ 0):
 *   Vth = Vcc · R2 / (R1 + R2)
 *   Rth = R1 ∥ R2
 *   Ie  ≈ Ic ≈ (Vth − Vbe) / (Re + Rth/β)
 *   Vce(Q) = Vcc − Ic·(Rc + Re)
 *
 * AC small-signal (π model, Ce bypasses Re):
 *   gm   = Ic / Vt,  Vt = 25.85 mV
 *   rπ   = β / gm
 *   Av   ≈ −gm · Rc    (emitter bypassed)
 *
 * Output:  Vout(t) = VCE(Q) + Av · Vin_ac(t)    (negated sine → inverted)
 *   with rail saturation at Vcc and ≈0 V (cutoff/saturation clipping).
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Scope, Formula, useRaf } from './shared'

const VBE_ON = 0.7
const VT = 0.02585

// Local eng formatter
function fmtEng(v: number, unit = '') {
  const a = Math.abs(v)
  if (a === 0) return `0 ${unit}`
  if (a < 1e-9) return `${(v * 1e12).toFixed(1)} p${unit}`
  if (a < 1e-6) return `${(v * 1e9).toFixed(1)} n${unit}`
  if (a < 1e-3) return `${(v * 1e6).toFixed(2)} µ${unit}`
  if (a < 1)    return `${(v * 1e3).toFixed(2)} m${unit}`
  if (a < 1e3)  return `${v.toFixed(2)} ${unit}`
  if (a < 1e6)  return `${(v / 1e3).toFixed(2)} k${unit}`
  return `${(v / 1e6).toFixed(2)} M${unit}`
}

function CESchematic({ highlight }: { highlight: 'none' | 'in' | 'out' }) {
  return (
    <svg viewBox="0 0 320 240" className="w-full">
      <rect x={0} y={0} width={320} height={240} fill="#0a0f1a" rx={8} />

      {/* Vcc rail */}
      <line x1={20} y1={20} x2={300} y2={20} stroke="#fbbf24" strokeWidth={2} />
      <text x={24} y={14} fill="#fbbf24" fontSize={9} fontFamily="monospace">+Vcc</text>

      {/* R1 (top-left) */}
      <line x1={140} y1={20} x2={140} y2={38} stroke="#475569" strokeWidth={1.3} />
      <path d="M 140 38 l -5 3 l 10 6 l -10 6 l 10 6 l -10 6 l 5 3"
            stroke="#ef4444" strokeWidth={1.5} fill="none" />
      <line x1={140} y1={68} x2={140} y2={100} stroke="#475569" strokeWidth={1.3} />
      <text x={146} y={55} fill="#ef4444" fontSize={8} fontFamily="monospace">R1</text>

      {/* R2 (bottom-left) */}
      <path d="M 140 100 l -5 3 l 10 6 l -10 6 l 10 6 l -10 6 l 5 3"
            stroke="#22c55e" strokeWidth={1.5} fill="none" />
      <line x1={140} y1={130} x2={140} y2={218} stroke="#475569" strokeWidth={1.3} />
      <text x={146} y={118} fill="#22c55e" fontSize={8} fontFamily="monospace">R2</text>

      {/* Rc (top-right) */}
      <line x1={230} y1={20} x2={230} y2={38} stroke="#475569" strokeWidth={1.3} />
      <path d="M 230 38 l -5 3 l 10 6 l -10 6 l 10 6 l -10 6 l 5 3"
            stroke="#f97316" strokeWidth={1.5} fill="none" />
      <line x1={230} y1={68} x2={230} y2={118} stroke={highlight === 'out' ? '#22d3ee' : '#475569'}
            strokeWidth={1.5} />
      <text x={236} y={55} fill="#f97316" fontSize={8} fontFamily="monospace">Rc</text>

      {/* Base node @ (140,100) */}
      <circle cx={140} cy={100} r={3} fill="#e2e8f0" />
      {/* AC input: cap Cin + source */}
      <line x1={140} y1={100} x2={100} y2={100} stroke={highlight === 'in' ? '#22d3ee' : '#475569'}
            strokeWidth={1.3} />
      <line x1={100} y1={92} x2={100} y2={108} stroke="#fbbf24" strokeWidth={1.8} />
      <line x1={96} y1={92} x2={96} y2={108} stroke="#fbbf24" strokeWidth={1.8} />
      <line x1={96} y1={100} x2={40} y2={100} stroke={highlight === 'in' ? '#22d3ee' : '#475569'}
            strokeWidth={1.3} />
      <text x={58} y={88} fill="#fbbf24" fontSize={7} fontFamily="monospace">Cin</text>
      <circle cx={30} cy={100} r={10} fill="none" stroke="#22d3ee" strokeWidth={1.3} />
      <text x={30} y={104} fill="#22d3ee" fontSize={11} textAnchor="middle" fontFamily="monospace">~</text>
      <text x={30} y={122} fill="#22d3ee" fontSize={8} textAnchor="middle" fontFamily="monospace">Vin</text>

      {/* Transistor Q1 */}
      <circle cx={175} cy={140} r={16} fill="#0f172a" stroke="#64748b" strokeWidth={1} />
      <line x1={158} y1={140} x2={170} y2={140} stroke="#e2e8f0" strokeWidth={1.8} />
      <line x1={170} y1={128} x2={170} y2={152} stroke="#e2e8f0" strokeWidth={1.8} />
      <line x1={170} y1={132} x2={195} y2={122} stroke="#22d3ee" strokeWidth={1.3} />
      <line x1={170} y1={148} x2={195} y2={160} stroke="#a855f7" strokeWidth={1.3} />
      <polygon points="190,160 186,156 186,164" fill="#a855f7" />
      {/* Base wire from R1/R2 node */}
      <line x1={140} y1={100} x2={158} y2={140} stroke="#475569" strokeWidth={1.3} />
      {/* Collector wire up */}
      <line x1={195} y1={122} x2={230} y2={118} stroke={highlight === 'out' ? '#22d3ee' : '#475569'}
            strokeWidth={1.3} />
      {/* Emitter wire down */}
      <line x1={195} y1={160} x2={195} y2={180} stroke="#a855f7" strokeWidth={1.3} />
      {/* Output tap */}
      <circle cx={230} cy={118} r={3} fill={highlight === 'out' ? '#22d3ee' : '#e2e8f0'} />
      <line x1={230} y1={118} x2={292} y2={118} stroke={highlight === 'out' ? '#22d3ee' : '#475569'}
            strokeWidth={1.3} />
      <text x={256} y={112} fill="#22d3ee" fontSize={8} fontFamily="monospace">Vout</text>

      {/* Re + Ce at emitter */}
      <path d="M 195 180 l -5 3 l 10 6 l -10 6 l 10 6 l -10 6 l 5 3"
            stroke="#a855f7" strokeWidth={1.5} fill="none" />
      <line x1={195} y1={210} x2={195} y2={218} stroke="#475569" strokeWidth={1.3} />
      <text x={202} y={200} fill="#a855f7" fontSize={8} fontFamily="monospace">Re∥Ce</text>

      {/* GND rail */}
      <line x1={20} y1={218} x2={300} y2={218} stroke="#475569" strokeWidth={1.2}
            strokeDasharray="3 2" />
      <text x={160} y={234} fill="#64748b" fontSize={8} textAnchor="middle" fontFamily="monospace">GND</text>
    </svg>
  )
}

export default function CommonEmitter() {
  const [running, setRunning] = useState(true)
  const [Vcc, setVcc] = useState(12)
  const [R1kO, setR1kO] = useState(47)     // kΩ
  const [R2kO, setR2kO] = useState(10)     // kΩ
  const [RckO, setRckO] = useState(4.7)    // kΩ
  const [ReO, setReO] = useState(1000)     // Ω
  const [beta, setBeta] = useState(200)
  const [freqHz, setFreqHz] = useState(1000)
  const [vinMv, setVinMv] = useState(20)   // peak, mV

  const tMs = useRaf(running)

  const R1 = R1kO * 1000
  const R2 = R2kO * 1000
  const Rc = RckO * 1000

  const Vth = Vcc * R2 / (R1 + R2)
  const Rth = (R1 * R2) / (R1 + R2)
  const Ic  = Math.max(0, (Vth - VBE_ON) / (ReO + Rth / beta))
  const Vce = Math.max(0, Vcc - Ic * (Rc + ReO))

  const gm = Ic / VT
  const rpi = beta / Math.max(gm, 1e-12)
  const Av = -gm * Rc      // Ce bypasses Re

  // Check saturation
  const saturated = Vce < 0.2 + 0.05
  const cutoff = Ic < 1e-6

  const Vin = vinMv / 1000  // peak volts
  const omega = 2 * Math.PI * freqHz

  // Sample functions
  const vinSample = useMemo(() => {
    return (tSec: number) => Vin * Math.sin(omega * tSec)
  }, [Vin, omega])

  const voutSample = useMemo(() => {
    return (tSec: number) => {
      const v = Vce + Av * Vin * Math.sin(omega * tSec)
      // Clip to rails
      return Math.max(0, Math.min(Vcc, v))
    }
  }, [Vce, Av, Vin, omega, Vcc])

  // Detect clipping by sampling one period
  const clipInfo = useMemo(() => {
    let clipped = false
    const N = 64
    for (let i = 0; i < N; i++) {
      const t = i / N / freqHz
      const raw = Vce + Av * Vin * Math.sin(omega * t)
      if (raw > Vcc || raw < 0) { clipped = true; break }
    }
    return { clipped }
  }, [Vce, Av, Vin, omega, Vcc, freqHz])

  // Time window for scope — show ~3 cycles
  const windowMs = 3000 / freqHz

  const traces = useMemo(() => [
    {
      label: `Vin (${vinMv}mV)`,
      color: '#22d3ee',
      vOffset: Vcc * 0.15,  // show on upper half
      sample: (t: number) => vinSample(t) * 100,  // scale: 20 mV × 100 = 2 V for visibility
    },
    {
      label: `Vout`,
      color: '#fbbf24',
      vOffset: -Vcc * 0.3,
      sample: (t: number) => voutSample(t) - Vce,
    },
  ], [vinSample, voutSample, vinMv, Vcc, Vce])

  const region = cutoff ? 'Cutoff (tắt)'
                : saturated ? 'Saturation (bão hòa)'
                : 'Active (tuyến tính)'
  const regionColor: 'rose' | 'slate' | 'emerald' =
    cutoff ? 'slate' : saturated ? 'rose' : 'emerald'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card title="Oscilloscope — Vin (cyan, ×100) & Vout AC (amber)">
          <Scope
            traces={traces}
            windowMs={windowMs}
            volt={Math.max(4, Vcc * 0.6)}
            running={running}
            tMs={tMs}
            height={280}
          />
          {clipInfo.clipped && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
              ⚠ Sóng ra bị xén (clipping) — giảm biên độ Vin hoặc dịch điểm Q.
            </div>
          )}
        </Card>

        <div className="space-y-3">
          <Card title="Schematic — mạch phát chung">
            <CESchematic highlight={running ? 'out' : 'none'} />
          </Card>
        </div>
      </div>

      {/* Q-point & small-signal metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Meter label="Ic (Q)" value={fmtEng(Ic)} unit="A" color="amber" />
        <Meter label="Vce (Q)" value={Vce.toFixed(2)} unit="V" color="cyan" />
        <Meter label="Vùng" value={region} color={regionColor} />
        <Meter label="Av" value={Av.toFixed(1)} unit="V/V" color="emerald"
               hint={`|Av| = ${Math.abs(Av).toFixed(0)}`} />
        <Meter label="gm" value={fmtEng(gm, 'S')} color="purple" />
        <Meter label="rπ" value={fmtEng(rpi, 'Ω')} color="blue" />
        <Meter label="Vth (base)" value={Vth.toFixed(2)} unit="V" color="slate" />
        <Meter label="Rth (base)" value={fmtEng(Rth, 'Ω')} color="slate" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Signal nguồn">
          <div className="space-y-3">
            <Slider label="Vin biên độ" value={vinMv} min={1} max={300} step={1}
                    unit="mV" onChange={setVinMv} />
            <Slider label="Tần số" value={freqHz} min={100} max={20000} step={100}
                    unit="Hz" onChange={setFreqHz} />
            <button
              onClick={() => setRunning(r => !r)}
              className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border ${
                running
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {running ? 'Pause' : 'Run'}
            </button>
          </div>
        </Card>
        <Card title="Bias R1 / R2 / Vcc">
          <div className="space-y-3">
            <Slider label="Vcc" value={Vcc} min={5} max={20} step={0.5}
                    unit="V" onChange={setVcc} />
            <Slider label="R1" value={R1kO} min={5} max={200} step={1}
                    unit="kΩ" onChange={setR1kO} />
            <Slider label="R2" value={R2kO} min={1} max={50} step={0.5}
                    unit="kΩ" onChange={setR2kO} />
          </div>
        </Card>
        <Card title="Rc / Re / β">
          <div className="space-y-3">
            <Slider label="Rc" value={RckO} min={0.5} max={22} step={0.1}
                    unit="kΩ" onChange={setRckO} />
            <Slider label="Re" value={ReO} min={100} max={5000} step={100}
                    unit="Ω" onChange={setReO} />
            <Slider label="β" value={beta} min={50} max={400} step={10}
                    onChange={setBeta} />
          </div>
        </Card>
      </div>

      <Formula
        title="Công thức phát chung (CE)"
        lines={[
          { expr: 'Vth = Vcc · R2 / (R1 + R2)', note: 'điện áp Thévenin tại base' },
          { expr: 'Rth = R1 ∥ R2', note: 'trở kháng Thévenin' },
          { expr: 'Ic ≈ (Vth − 0.7) / (Re + Rth/β)', note: 'DC bias' },
          { expr: 'Vce = Vcc − Ic·(Rc + Re)', note: 'điểm tĩnh Q' },
          { expr: 'gm = Ic / Vt,  Vt ≈ 25.85 mV', note: 'độ dẫn' },
          { expr: 'Av = −gm · Rc', note: 'hệ số khuếch đại (Ce bypass Re)' },
          { expr: 'rπ = β / gm', note: 'trở kháng vào base' },
        ]}
      />
    </div>
  )
}
