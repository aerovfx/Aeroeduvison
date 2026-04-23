/**
 * OpAmpLab — 7 mạch op-amp cơ bản, mô phỏng với input sine.
 *
 * Topology                Vout formula
 * ─────────────────────────────────────────────────────────────
 * Inverting            :  Vout = −(Rf/Rin) · Vin
 * Non-inverting        :  Vout = (1 + Rf/Rg) · Vin
 * Voltage follower     :  Vout = Vin  (unity gain)
 * Summing (2 inputs)   :  Vout = −Rf·(V1/R1 + V2/R2)
 * Difference           :  Vout = (Rf/R1)·(V2 − V1)   (khi R1=R2, Rf=Rg)
 * Comparator           :  Vout = +Vsat if Vin > Vref else −Vsat
 * Schmitt trigger      :  hysteresis ±Vh = Vsat · R1/(R1+R2)
 *
 * Rail saturation: Vout clamped to ±Vsupply.
 */
import { useMemo, useState } from 'react'
import { Sigma } from 'lucide-react'
import { Card, Slider, Meter, Scope, Formula, Transport, useRaf,
         fmtHz, fmtOhm, ScopeTrace } from './shared'

type Topology = 'inverting' | 'non-inverting' | 'follower' | 'summing' | 'difference' | 'comparator' | 'schmitt'

interface TopologyInfo {
  name: string
  short: string
  color: string
  formula: string
  description: string
}

const TOPOLOGIES: Record<Topology, TopologyInfo> = {
  inverting: {
    name: 'Khuếch đại đảo',
    short: 'Inverting',
    color: '#ef4444',
    formula: 'Vout = -(Rf/Rin)·Vin',
    description: 'Vin qua Rin vào đầu âm; Rf hồi tiếp âm. Gain âm → đảo pha 180°.',
  },
  'non-inverting': {
    name: 'Khuếch đại không đảo',
    short: 'Non-inverting',
    color: '#22d3ee',
    formula: 'Vout = (1 + Rf/Rg)·Vin',
    description: 'Vin vào đầu dương; Rf và Rg chia áp ở đầu âm. Gain dương ≥ 1.',
  },
  follower: {
    name: 'Mạch lặp áp (Voltage Follower)',
    short: 'Follower',
    color: '#22c55e',
    formula: 'Vout = Vin (gain = 1)',
    description: 'Đầu ra nối thẳng với đầu âm. Buffer trở kháng — gain 1 nhưng Zin cao, Zout thấp.',
  },
  summing: {
    name: 'Mạch cộng',
    short: 'Summing',
    color: '#a855f7',
    formula: 'Vout = -Rf·(V1/R1 + V2/R2)',
    description: 'Hai tín hiệu qua R1, R2 cộng tại nút ảo. Ứng dụng trong mixer audio.',
  },
  difference: {
    name: 'Mạch hiệu',
    short: 'Difference',
    color: '#f97316',
    formula: 'Vout = (Rf/R1)·(V2 − V1)',
    description: 'Khuếch đại chênh lệch hai đầu. Cốt lõi của instrumentation amplifier.',
  },
  comparator: {
    name: 'Bộ so sánh',
    short: 'Comparator',
    color: '#eab308',
    formula: 'Vout = +Vsat nếu Vin > Vref, ngược lại −Vsat',
    description: 'Không hồi tiếp → op-amp bão hòa. Biến tín hiệu analog thành logic 0/1.',
  },
  schmitt: {
    name: 'Schmitt Trigger',
    short: 'Schmitt',
    color: '#ec4899',
    formula: '±Vh = Vsat · R1/(R1+R2)',
    description: 'Comparator + hồi tiếp dương → trễ (hysteresis), chống nhiễu tín hiệu chậm.',
  },
}

export default function OpAmpLab() {
  const [topo, setTopo] = useState<Topology>('inverting')
  const [freq, setFreq] = useState(500)
  const [amp, setAmp] = useState(1)      // input amplitude V (peak)
  const [offset, setOffset] = useState(0) // input DC offset V
  const [Rf, setRf] = useState(10000)
  const [Rin, setRin] = useState(1000)
  const [Vsupply, setVsupply] = useState(9)
  const [Vref, setVref] = useState(0)
  const [running, setRunning] = useState(true)
  const tMs = useRaf(running)

  // Second input for summing/difference
  const [V2freq, setV2freq] = useState(100)
  const [V2amp, setV2amp] = useState(0.5)

  // Schmitt feedback: R1 bottom, R2 to output
  const [schmittR1, setSchmittR1] = useState(10000)
  const [schmittR2, setSchmittR2] = useState(10000)

  // Compute theoretical gain
  const gain = useMemo(() => {
    switch (topo) {
      case 'inverting':      return -Rf / Rin
      case 'non-inverting':  return 1 + Rf / Rin
      case 'follower':       return 1
      case 'summing':        return -Rf / Rin
      case 'difference':     return Rf / Rin
      case 'comparator':     return 0  // digital
      case 'schmitt':        return 0  // digital w/ hysteresis
    }
  }, [topo, Rf, Rin])

  // Schmitt hysteresis
  const Vh = useMemo(() => {
    return Vsupply * schmittR1 / (schmittR1 + schmittR2)
  }, [Vsupply, schmittR1, schmittR2])

  function clip(v: number): number {
    return Math.max(-Vsupply, Math.min(Vsupply, v))
  }

  // Schmitt trigger state (stateful since it has memory)
  // Compute on the fly using a rolling state — for visualization we approximate with
  // piecewise evaluation: state depends on history. We implement a simple approach:
  // predict based on recent sample from Vin — using two-threshold logic.
  // For smooth visualization we cache last state.
  const schmittStateRef = useMemo(() => ({ last: +Vsupply }), [topo, Vsupply])

  function vinSample(tSec: number): number {
    return amp * Math.sin(2 * Math.PI * freq * tSec) + offset
  }
  function v2Sample(tSec: number): number {
    return V2amp * Math.sin(2 * Math.PI * V2freq * tSec)
  }

  function voutSample(tSec: number): number {
    const vin = vinSample(tSec)
    switch (topo) {
      case 'inverting':      return clip(-Rf / Rin * vin)
      case 'non-inverting':  return clip((1 + Rf / Rin) * vin)
      case 'follower':       return clip(vin)
      case 'summing':        return clip(-Rf * (vin / Rin + v2Sample(tSec) / Rin))
      case 'difference':     return clip(Rf / Rin * (v2Sample(tSec) - vin))
      case 'comparator':     return vin > Vref ? Vsupply : -Vsupply
      case 'schmitt': {
        if (schmittStateRef.last > 0) {
          if (vin < -Vh) schmittStateRef.last = -Vsupply
        } else {
          if (vin > Vh) schmittStateRef.last = +Vsupply
        }
        return schmittStateRef.last
      }
    }
  }

  const traces: ScopeTrace[] = (topo === 'summing' || topo === 'difference')
    ? [
        { label: 'Vin1', color: '#22d3ee', vOffset: 3, sample: t => vinSample(t) },
        { label: 'Vin2', color: '#a78bfa', vOffset: 0, sample: t => v2Sample(t) },
        { label: 'Vout', color: '#fbbf24', vOffset: -3, sample: t => voutSample(t) },
      ]
    : [
        { label: 'Vin',  color: '#22d3ee', vOffset: 2, sample: t => vinSample(t) },
        { label: 'Vout', color: '#fbbf24', vOffset: -2, sample: t => voutSample(t) },
      ]

  const windowMs = Math.max(5, Math.min(200, 3000 / freq))

  const info = TOPOLOGIES[topo]

  // Detect clipping
  const maxVout = amp * Math.abs(gain) + (topo !== 'follower' ? 0 : offset)
  const isClipping = maxVout > Vsupply && topo !== 'comparator' && topo !== 'schmitt'

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sigma className="w-5 h-5" style={{ color: info.color }} />
            Op-Amp Lab — {info.name}
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{info.description}</p>
        </div>
        <Transport running={running} onToggle={() => setRunning(r => !r)} onReset={() => {}} />
      </div>

      {/* Topology picker */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(TOPOLOGIES) as [Topology, TopologyInfo][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTopo(k)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition font-medium ${
              topo === k ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
            }`}
            style={topo === k ? { borderColor: v.color, color: v.color } : { borderColor: '#27272a' }}
          >
            {v.short}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card title="Oscilloscope — Input vs Output">
            <Scope traces={traces} tMs={tMs} running={running}
                   windowMs={windowMs} volt={Vsupply + 2} gridDiv={8}
                   width={560} height={260} />
            {isClipping && (
              <div className="mt-2 px-3 py-2 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <span className="text-base">⚠</span>
                <span>
                  <strong>Clipping!</strong> Biên độ đầu ra lý thuyết {maxVout.toFixed(2)}V
                  vượt nguồn ±{Vsupply}V → bão hòa ở rail.
                </span>
              </div>
            )}
          </Card>

          <Card title="Sơ đồ mạch">
            <OpAmpSVG topo={topo} gain={gain} Vh={Vh} Vref={Vref} info={info} />
          </Card>
        </div>

        <div className="space-y-3">
          <Card title="Tín hiệu vào">
            <div className="space-y-3">
              <Slider label="Tần số f" value={freq} min={10} max={5000} step={10}
                      onChange={setFreq} format={v => fmtHz(v)} />
              <Slider label="Biên độ Vin" value={amp} min={0} max={Vsupply} step={0.05}
                      unit="V" onChange={setAmp} />
              <Slider label="DC offset" value={offset} min={-Vsupply} max={Vsupply} step={0.05}
                      unit="V" onChange={setOffset} />
              {(topo === 'summing' || topo === 'difference') && (
                <>
                  <hr className="border-zinc-800" />
                  <Slider label="V2 freq" value={V2freq} min={10} max={2000} step={10}
                          onChange={setV2freq} format={v => fmtHz(v)} />
                  <Slider label="V2 biên độ" value={V2amp} min={0} max={Vsupply} step={0.05}
                          unit="V" onChange={setV2amp} />
                </>
              )}
              {topo === 'comparator' && (
                <Slider label="Vref" value={Vref} min={-Vsupply} max={Vsupply} step={0.05}
                        unit="V" onChange={setVref} />
              )}
            </div>
          </Card>

          <Card title="Điện trở mạch">
            <div className="space-y-3">
              {topo !== 'follower' && topo !== 'comparator' && topo !== 'schmitt' && (
                <>
                  <Slider label={topo === 'summing' ? 'R1 = R2' : 'Rin'} value={Rin} min={500} max={1e6} step={100}
                          onChange={setRin} format={v => fmtOhm(v)} />
                  <Slider label="Rf" value={Rf} min={500} max={1e6} step={100}
                          onChange={setRf} format={v => fmtOhm(v)} />
                </>
              )}
              {topo === 'schmitt' && (
                <>
                  <Slider label="R1 (GND)" value={schmittR1} min={500} max={1e6} step={100}
                          onChange={setSchmittR1} format={v => fmtOhm(v)} />
                  <Slider label="R2 (FB)" value={schmittR2} min={500} max={1e6} step={100}
                          onChange={setSchmittR2} format={v => fmtOhm(v)} />
                </>
              )}
              <Slider label="V nguồn ±" value={Vsupply} min={3} max={15} step={0.1}
                      unit="V" onChange={setVsupply} />
            </div>
          </Card>

          <Card title="Thông số">
            <div className="grid grid-cols-2 gap-2">
              {topo !== 'comparator' && topo !== 'schmitt' && (
                <>
                  <Meter label="Gain" value={gain.toFixed(2)} unit="V/V" color="cyan" />
                  <Meter label="|A| dB" value={(20 * Math.log10(Math.abs(gain) || 1e-9)).toFixed(1)}
                         unit="dB" color="purple" />
                </>
              )}
              {topo === 'schmitt' && (
                <>
                  <Meter label="+V_h" value={`+${Vh.toFixed(2)}`} unit="V" color="emerald" />
                  <Meter label="−V_h" value={`-${Vh.toFixed(2)}`} unit="V" color="rose" />
                </>
              )}
              <Meter label="±Vsat" value={Vsupply.toFixed(1)} unit="V" color="slate" />
              <Meter label="f" value={fmtHz(freq)} color="amber" />
            </div>
          </Card>

          <Formula
            title="Công thức"
            lines={[
              { expr: info.formula, note: 'lý tưởng' },
              { expr: '|Vout| ≤ Vsat', note: 'bão hòa ở rail nguồn' },
              { expr: 'Zin → ∞, Zout → 0', note: 'op-amp lý tưởng' },
              { expr: 'V+ = V− (virtual short)', note: 'giả sử có hồi tiếp âm' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Op-Amp schematic SVG
 * ────────────────────────────────────────────────────────────────────*/

function OpAmpSVG({ topo, info }: {
  topo: Topology
  gain: number
  Vh: number
  Vref: number
  info: TopologyInfo
}) {
  const W = 540, H = 240
  // Op-amp triangle
  const tri = { x: 220, y: 80, w: 120, h: 80 }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ background: '#0a0f1a', borderRadius: 8 }}>
      {/* Triangle op-amp body */}
      <polygon points={`${tri.x},${tri.y} ${tri.x},${tri.y + tri.h} ${tri.x + tri.w},${tri.y + tri.h / 2}`}
               fill="#1e293b" stroke={info.color} strokeWidth={2} />
      {/* +/− labels */}
      <text x={tri.x + 14} y={tri.y + 22} fill="#22c55e" fontSize={14} fontWeight={700} fontFamily="monospace">−</text>
      <text x={tri.x + 14} y={tri.y + tri.h - 10} fill="#22c55e" fontSize={14} fontWeight={700} fontFamily="monospace">+</text>

      {/* Output line */}
      <line x1={tri.x + tri.w} y1={tri.y + tri.h / 2}
            x2={tri.x + tri.w + 80} y2={tri.y + tri.h / 2}
            stroke="#fbbf24" strokeWidth={2} />
      <text x={tri.x + tri.w + 84} y={tri.y + tri.h / 2 + 4}
            fill="#fbbf24" fontSize={12} fontFamily="monospace" fontWeight={700}>Vout</text>

      {/* Input topology variants */}
      {topo === 'inverting' && (
        <g>
          {/* Rin from Vin to V− */}
          <line x1={40} y1={tri.y + 20} x2={140} y2={tri.y + 20} stroke="#64748b" strokeWidth={2} />
          <path d="M 140 20 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 8 8 l 4 -4"
                transform={`translate(0, ${tri.y})`} stroke="#fbbf24" strokeWidth={2} fill="none" />
          <text x={160} y={tri.y + 12} fill="#fbbf24" fontSize={10} fontFamily="monospace">Rin</text>
          <line x1={180} y1={tri.y + 20} x2={tri.x} y2={tri.y + 20} stroke="#64748b" strokeWidth={2} />
          <text x={32} y={tri.y + 14} fill="#22d3ee" fontSize={11} fontFamily="monospace" fontWeight={700}>Vin</text>
          {/* V+ to GND */}
          <line x1={tri.x} y1={tri.y + tri.h - 20} x2={tri.x - 50} y2={tri.y + tri.h - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x - 50} y1={tri.y + tri.h - 20} x2={tri.x - 50} y2={tri.y + tri.h + 10}
                stroke="#64748b" strokeWidth={2} />
          <path d="M -6 0 L 6 0 M -4 4 L 4 4 M -2 8 L 2 8"
                transform={`translate(${tri.x - 50}, ${tri.y + tri.h + 12})`}
                stroke="#64748b" strokeWidth={1.5} />
          {/* Rf feedback V− → output */}
          <line x1={tri.x + 10} y1={tri.y + 20} x2={tri.x + 10} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + 10} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + tri.w + 20} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y + tri.h / 2}
                stroke="#64748b" strokeWidth={2} />
          <path d="M 0 0 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 8 8 l 4 -4"
                transform={`translate(${tri.x + 100}, ${tri.y - 20}) rotate(-90)`}
                stroke="#ef4444" strokeWidth={2} fill="none" />
          <text x={tri.x + 90} y={tri.y - 24} fill="#ef4444" fontSize={10} fontFamily="monospace">Rf</text>
        </g>
      )}

      {topo === 'non-inverting' && (
        <g>
          {/* Vin to V+ */}
          <line x1={40} y1={tri.y + tri.h - 20} x2={tri.x} y2={tri.y + tri.h - 20}
                stroke="#64748b" strokeWidth={2} />
          <text x={32} y={tri.y + tri.h - 24} fill="#22d3ee" fontSize={11}
                fontFamily="monospace" fontWeight={700}>Vin</text>
          {/* V− to Rg/GND and Rf to output */}
          <line x1={tri.x} y1={tri.y + 20} x2={tri.x - 40} y2={tri.y + 20}
                stroke="#64748b" strokeWidth={2} />
          {/* Rg down */}
          <path d="M 0 0 l -4 4 l 8 8 l -8 8 l 8 8 l -8 8 l 8 8 l -4 4"
                transform={`translate(${tri.x - 40}, ${tri.y + 24})`}
                stroke="#fbbf24" strokeWidth={2} fill="none" />
          <text x={tri.x - 60} y={tri.y + 48} fill="#fbbf24" fontSize={10} fontFamily="monospace">Rg</text>
          <line x1={tri.x - 40} y1={tri.y + 68} x2={tri.x - 40} y2={tri.y + tri.h + 14}
                stroke="#64748b" strokeWidth={2} />
          <path d="M -6 0 L 6 0 M -4 4 L 4 4 M -2 8 L 2 8"
                transform={`translate(${tri.x - 40}, ${tri.y + tri.h + 14})`}
                stroke="#64748b" strokeWidth={1.5} />
          {/* Rf back from output */}
          <line x1={tri.x - 40} y1={tri.y + 20} x2={tri.x - 40} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x - 40} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + tri.w + 20} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y + tri.h / 2}
                stroke="#64748b" strokeWidth={2} />
          <path d="M 0 0 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 8 8 l 4 -4"
                transform={`translate(${tri.x + 60}, ${tri.y - 20})`}
                stroke="#ef4444" strokeWidth={2} fill="none" />
          <text x={tri.x + 85} y={tri.y - 24} fill="#ef4444" fontSize={10} fontFamily="monospace">Rf</text>
        </g>
      )}

      {topo === 'follower' && (
        <g>
          {/* Vin to V+ */}
          <line x1={40} y1={tri.y + tri.h - 20} x2={tri.x} y2={tri.y + tri.h - 20}
                stroke="#64748b" strokeWidth={2} />
          <text x={32} y={tri.y + tri.h - 24} fill="#22d3ee" fontSize={11}
                fontFamily="monospace" fontWeight={700}>Vin</text>
          {/* V− direct to output */}
          <line x1={tri.x} y1={tri.y + 20} x2={tri.x - 30} y2={tri.y + 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x - 30} y1={tri.y + 20} x2={tri.x - 30} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x - 30} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + tri.w + 20} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y + tri.h / 2}
                stroke="#64748b" strokeWidth={2} />
          <text x={tri.x + 60} y={tri.y - 24} fill="#22c55e" fontSize={10}
                fontFamily="monospace">direct feedback</text>
        </g>
      )}

      {topo === 'summing' && (
        <g>
          {[0, 1].map(i => {
            const y = tri.y + 8 + i * 16
            return (
              <g key={i}>
                <line x1={40} y1={y} x2={130} y2={y} stroke="#64748b" strokeWidth={2} />
                <path d="M 0 0 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 4 -4"
                      transform={`translate(130, ${y})`}
                      stroke="#fbbf24" strokeWidth={2} fill="none" />
                <text x={148} y={y - 6} fill="#fbbf24" fontSize={9} fontFamily="monospace">R{i + 1}</text>
                <line x1={170} y1={y} x2={tri.x} y2={y} stroke="#64748b" strokeWidth={2} />
                <text x={32} y={y + 3} fill="#22d3ee" fontSize={10}
                      fontFamily="monospace" fontWeight={700}>V{i + 1}</text>
              </g>
            )
          })}
          {/* V+ to GND */}
          <line x1={tri.x} y1={tri.y + tri.h - 20} x2={tri.x - 30} y2={tri.y + tri.h - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x - 30} y1={tri.y + tri.h - 20} x2={tri.x - 30} y2={tri.y + tri.h + 5}
                stroke="#64748b" strokeWidth={2} />
          <path d="M -6 0 L 6 0 M -4 4 L 4 4 M -2 8 L 2 8"
                transform={`translate(${tri.x - 30}, ${tri.y + tri.h + 6})`}
                stroke="#64748b" strokeWidth={1.5} />
          {/* Rf feedback */}
          <line x1={tri.x + 10} y1={tri.y + 16} x2={tri.x + 10} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + 10} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y - 20}
                stroke="#64748b" strokeWidth={2} />
          <line x1={tri.x + tri.w + 20} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y + tri.h / 2}
                stroke="#64748b" strokeWidth={2} />
          <path d="M 0 0 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 8 8 l 4 -4"
                transform={`translate(${tri.x + 80}, ${tri.y - 20})`}
                stroke="#ef4444" strokeWidth={2} fill="none" />
          <text x={tri.x + 110} y={tri.y - 24} fill="#ef4444" fontSize={10} fontFamily="monospace">Rf</text>
        </g>
      )}

      {topo === 'difference' && (
        <g>
          <line x1={40} y1={tri.y + 20} x2={tri.x} y2={tri.y + 20} stroke="#64748b" strokeWidth={2} />
          <line x1={40} y1={tri.y + tri.h - 20} x2={tri.x} y2={tri.y + tri.h - 20} stroke="#64748b" strokeWidth={2} />
          <text x={32} y={tri.y + 14} fill="#22d3ee" fontSize={11} fontFamily="monospace" fontWeight={700}>V1</text>
          <text x={32} y={tri.y + tri.h - 24} fill="#a78bfa" fontSize={11} fontFamily="monospace" fontWeight={700}>V2</text>
          <text x={120} y={tri.y + tri.h / 2} fill="#94a3b8" fontSize={10} fontFamily="monospace" textAnchor="middle">
            4 điện trở
          </text>
          <text x={120} y={tri.y + tri.h / 2 + 14} fill="#94a3b8" fontSize={10} fontFamily="monospace" textAnchor="middle">
            cân bằng
          </text>
        </g>
      )}

      {(topo === 'comparator' || topo === 'schmitt') && (
        <g>
          <line x1={40} y1={tri.y + 20} x2={tri.x} y2={tri.y + 20} stroke="#64748b" strokeWidth={2} />
          <text x={32} y={tri.y + 14} fill="#22d3ee" fontSize={11} fontFamily="monospace" fontWeight={700}>Vin</text>
          {topo === 'comparator' ? (
            <>
              <line x1={40} y1={tri.y + tri.h - 20} x2={tri.x} y2={tri.y + tri.h - 20} stroke="#64748b" strokeWidth={2} />
              <text x={32} y={tri.y + tri.h - 24} fill="#fbbf24" fontSize={11} fontFamily="monospace">Vref</text>
            </>
          ) : (
            <g>
              {/* Schmitt: positive feedback divider */}
              <line x1={tri.x} y1={tri.y + tri.h - 20} x2={tri.x - 40} y2={tri.y + tri.h - 20}
                    stroke="#64748b" strokeWidth={2} />
              {/* R1 to GND */}
              <path d="M 0 0 l -4 4 l 8 8 l -8 8 l 8 8 l -8 8 l -4 4"
                    transform={`translate(${tri.x - 40}, ${tri.y + tri.h - 16})`}
                    stroke="#fbbf24" strokeWidth={2} fill="none" />
              <text x={tri.x - 60} y={tri.y + tri.h + 10} fill="#fbbf24" fontSize={9}
                    fontFamily="monospace">R1</text>
              <line x1={tri.x - 40} y1={tri.y + tri.h + 24} x2={tri.x - 40} y2={tri.y + tri.h + 38}
                    stroke="#64748b" strokeWidth={2} />
              <path d="M -6 0 L 6 0 M -4 4 L 4 4"
                    transform={`translate(${tri.x - 40}, ${tri.y + tri.h + 40})`}
                    stroke="#64748b" strokeWidth={1.5} />
              {/* R2 from output to V+ node */}
              <line x1={tri.x - 40} y1={tri.y + tri.h - 20} x2={tri.x - 40} y2={tri.y - 20}
                    stroke="#64748b" strokeWidth={2} />
              <line x1={tri.x - 40} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y - 20}
                    stroke="#64748b" strokeWidth={2} />
              <line x1={tri.x + tri.w + 20} y1={tri.y - 20} x2={tri.x + tri.w + 20} y2={tri.y + tri.h / 2}
                    stroke="#64748b" strokeWidth={2} />
              <path d="M 0 0 l 4 -4 l 8 8 l -8 8 l 8 8 l -8 8 l 4 -4"
                    transform={`translate(${tri.x + 80}, ${tri.y - 20})`}
                    stroke="#ec4899" strokeWidth={2} fill="none" />
              <text x={tri.x + 110} y={tri.y - 24} fill="#ec4899" fontSize={10} fontFamily="monospace">R2</text>
            </g>
          )}
        </g>
      )}

      {/* Supply rails label */}
      <text x={W - 10} y={H - 6} fill="#64748b" fontSize={9}
            textAnchor="end" fontFamily="monospace">
        Supply: ±Vcc ideal op-amp
      </text>
    </svg>
  )
}
