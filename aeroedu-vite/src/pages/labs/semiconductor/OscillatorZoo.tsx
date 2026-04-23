/**
 * Oscillator Zoo — 3 classic sinusoidal oscillators:
 *   - Wien Bridge  (RC):  f = 1/(2π·RC)              — clean sine, op-amp based
 *   - RC Phase Shift:     f = 1/(2π·RC·√6)           — 3 RC stages, 180° + op-amp
 *   - LC Tank:            f = 1/(2π·√(LC))           — resonant circuit
 *
 * All three are rendered as pure sinusoids at their computed frequency.
 * A small amount of damping / amplitude limit is shown to illustrate startup.
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Scope, Formula, useRaf } from './shared'

type Topo = 'wien' | 'phase' | 'lc'

const TOPOS: Record<Topo, { name: string; short: string; color: string }> = {
  wien:  { name: 'Wien Bridge (RC)',  short: 'op-amp + 2× RC',            color: '#22d3ee' },
  phase: { name: 'RC Phase-Shift',    short: '3× RC · 180° + op-amp',     color: '#a855f7' },
  lc:    { name: 'LC Tank (Colpitts)', short: 'cuộn L + tụ C cộng hưởng',  color: '#fbbf24' },
}

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

function fmtHz(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} MHz`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)} kHz`
  return `${v.toFixed(1)} Hz`
}

// Schematic for each topology
function OscSchematic({ topo, running }: { topo: Topo; running: boolean }) {
  const accent = TOPOS[topo].color
  return (
    <svg viewBox="0 0 320 200" className="w-full">
      <rect x={0} y={0} width={320} height={200} fill="#0a0f1a" rx={8} />
      {/* Common: op-amp triangle (wien + phase) */}
      {topo !== 'lc' && (
        <>
          <polygon points="120,80 120,120 180,100" fill="#0f172a"
                   stroke="#64748b" strokeWidth={1.3} />
          <text x={126} y={95} fill="#94a3b8" fontSize={9} fontFamily="monospace">−</text>
          <text x={126} y={116} fill="#94a3b8" fontSize={9} fontFamily="monospace">+</text>
          <line x1={180} y1={100} x2={260} y2={100} stroke={accent} strokeWidth={1.3} />
          <circle cx={260} cy={100} r={3} fill={accent} />
          <text x={268} y={96} fill={accent} fontSize={9} fontFamily="monospace">Vout</text>
        </>
      )}

      {/* Feedback network */}
      {topo === 'wien' && (
        <>
          {/* Series R-C in + input */}
          <line x1={40} y1={110} x2={60} y2={110} stroke={accent} strokeWidth={1.3} />
          <path d="M 60 110 l -4 3 l 8 6 l -8 6 l 8 6 l -8 6 l 4 3"
                stroke="#ef4444" strokeWidth={1.3} fill="none" transform="translate(8 -12)" />
          <line x1={80} y1={110} x2={92} y2={110} stroke={accent} strokeWidth={1.3} />
          <line x1={92} y1={102} x2={92} y2={118} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={96} y1={102} x2={96} y2={118} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={96} y1={110} x2={120} y2={115} stroke={accent} strokeWidth={1.3} />

          {/* Parallel R+C to ground on + input */}
          <line x1={105} y1={115} x2={105} y2={150} stroke={accent} strokeWidth={1.3} />
          <path d="M 105 150 l -4 3 l 8 6 l -8 6 l 8 6 l -8 6 l 4 3"
                stroke="#22c55e" strokeWidth={1.3} fill="none" />
          <line x1={105} y1={180} x2={105} y2={190} stroke="#475569" strokeWidth={1.3} />
          {/* Cap to ground */}
          <line x1={125} y1={120} x2={125} y2={155} stroke={accent} strokeWidth={1.3} />
          <line x1={117} y1={155} x2={133} y2={155} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={117} y1={159} x2={133} y2={159} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={125} y1={159} x2={125} y2={190} stroke="#475569" strokeWidth={1.3} />

          <text x={30} y={85} fill="#ef4444" fontSize={8} fontFamily="monospace">R</text>
          <text x={70} y={96} fill="#fbbf24" fontSize={8} fontFamily="monospace">C</text>
          <text x={92} y={152} fill="#22c55e" fontSize={8} fontFamily="monospace">R</text>
          <text x={132} y={152} fill="#fbbf24" fontSize={8} fontFamily="monospace">C</text>
        </>
      )}

      {topo === 'phase' && (
        <>
          {/* 3 RC stages on feedback path */}
          <line x1={260} y1={100} x2={260} y2={160} stroke={accent} strokeWidth={1.3} />
          <line x1={260} y1={160} x2={40} y2={160} stroke={accent} strokeWidth={1.3} />
          {[60, 120, 180].map((x, i) => (
            <g key={i}>
              {/* Cap */}
              <line x1={x - 4} y1={152} x2={x - 4} y2={168} stroke="#fbbf24" strokeWidth={1.8} />
              <line x1={x + 4} y1={152} x2={x + 4} y2={168} stroke="#fbbf24" strokeWidth={1.8} />
              <line x1={x + 4} y1={160} x2={x + 20} y2={160} stroke={accent} strokeWidth={1.3} />
              {/* R to ground */}
              <line x1={x + 20} y1={160} x2={x + 20} y2={175} stroke={accent} strokeWidth={1.3} />
              <path d={`M ${x + 20} 175 l -4 3 l 8 6 l -8 6 l 8 6 l -8 6 l 4 3`}
                    stroke="#22c55e" strokeWidth={1.3} fill="none" />
              <text x={x - 8} y={150} fill="#fbbf24" fontSize={8} fontFamily="monospace">C{i + 1}</text>
              <text x={x + 24} y={175} fill="#22c55e" fontSize={8} fontFamily="monospace">R{i + 1}</text>
            </g>
          ))}
          <line x1={60} y1={160} x2={40} y2={160} stroke={accent} strokeWidth={1.3} />
          <line x1={40} y1={160} x2={40} y2={120} stroke={accent} strokeWidth={1.3} />
          <line x1={40} y1={120} x2={120} y2={120} stroke={accent} strokeWidth={1.3} />
        </>
      )}

      {topo === 'lc' && (
        <>
          {/* Tank: L parallel C */}
          <line x1={60} y1={60} x2={260} y2={60} stroke={accent} strokeWidth={1.3} />
          {/* Coil (3 humps) */}
          <path d="M 120 60 q 10 -18 20 0 q 10 -18 20 0 q 10 -18 20 0"
                stroke="#ef4444" strokeWidth={1.8} fill="none" />
          {/* Cap bottom branch */}
          <line x1={60} y1={60} x2={60} y2={140} stroke={accent} strokeWidth={1.3} />
          <line x1={260} y1={60} x2={260} y2={140} stroke={accent} strokeWidth={1.3} />
          <line x1={60} y1={140} x2={150} y2={140} stroke={accent} strokeWidth={1.3} />
          <line x1={150} y1={132} x2={150} y2={148} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={166} y1={132} x2={166} y2={148} stroke="#fbbf24" strokeWidth={1.8} />
          <line x1={166} y1={140} x2={260} y2={140} stroke={accent} strokeWidth={1.3} />
          {/* Active device symbol (active transistor as current driver) */}
          <circle cx={160} cy={100} r={10} fill="none" stroke={accent} strokeWidth={1.3} />
          <text x={160} y={104} fill={accent} fontSize={9} textAnchor="middle"
                fontFamily="monospace">~</text>
          {/* Output tap */}
          <line x1={260} y1={60} x2={290} y2={60} stroke={accent} strokeWidth={1.3} />
          <circle cx={290} cy={60} r={3} fill={accent} />
          <text x={295} y={56} fill={accent} fontSize={9} fontFamily="monospace">Vout</text>
          <text x={130} y={52} fill="#ef4444" fontSize={9} fontFamily="monospace">L</text>
          <text x={152} y={128} fill="#fbbf24" fontSize={9} fontFamily="monospace">C</text>
        </>
      )}

      {/* Run indicator */}
      <circle cx={20} cy={20} r={5} fill={running ? '#22c55e' : '#334155'} />
      <text x={30} y={24} fill="#64748b" fontSize={9} fontFamily="monospace">
        {running ? 'OSC RUN' : 'OSC STOP'}
      </text>
    </svg>
  )
}

export default function OscillatorZoo() {
  const [topo, setTopo] = useState<Topo>('wien')
  const [running, setRunning] = useState(true)
  const [R, setR] = useState(10000)             // Ω
  const [CLog, setCLog] = useState(Math.log10(1e-8))  // 10 nF
  const [LLog, setLLog] = useState(Math.log10(1e-4))  // 100 µH

  const tMs = useRaf(running)

  const C = Math.pow(10, CLog)
  const L = Math.pow(10, LLog)

  // Frequency per topology
  const freq = useMemo(() => {
    if (topo === 'wien')  return 1 / (2 * Math.PI * R * C)
    if (topo === 'phase') return 1 / (2 * Math.PI * R * C * Math.sqrt(6))
    return 1 / (2 * Math.PI * Math.sqrt(L * C))
  }, [topo, R, C, L])

  const omega = 2 * Math.PI * freq

  // Show 3 periods
  const windowMs = 3000 / Math.max(freq, 1)
  const ampPk = 2

  // Animate startup: ramp from 0 to ampPk over 100ms for visual drama
  const startupAmp = (tSec: number) => {
    const tau = 0.05
    return ampPk * (1 - Math.exp(-tSec / tau))
  }

  const traces = useMemo(() => [{
    label: `Vout @ ${fmtHz(freq)}`,
    color: TOPOS[topo].color,
    sample: (t: number) => startupAmp(t) * Math.sin(omega * t),
  }], [freq, omega, topo])

  // Barkhausen condition note
  const barkhausenGain = topo === 'wien' ? 3 : topo === 'phase' ? 29 : 1
  const barkhausenNote =
    topo === 'wien' ? 'Cần |Av| ≥ 3 để dao động khởi động'
    : topo === 'phase' ? 'Cần |Av| ≥ 29 do mạng RC suy hao 1/29'
    : 'Cần bù tổn hao R của cuộn (Q đủ cao)'

  return (
    <div className="space-y-4">
      {/* Topology picker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {(Object.entries(TOPOS) as [Topo, typeof TOPOS[Topo]][]).map(([id, t]) => {
          const isActive = id === topo
          return (
            <button
              key={id}
              onClick={() => setTopo(id)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                isActive
                  ? 'border-transparent bg-slate-800 ring-1 ring-cyan-400/60'
                  : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-semibold" style={{ color: t.color }}>
                {t.name}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{t.short}</div>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card title={`Scope · ${TOPOS[topo].name}`}>
          <Scope
            traces={traces}
            windowMs={windowMs}
            volt={ampPk * 1.3}
            running={running}
            tMs={tMs}
            height={260}
          />
        </Card>
        <Card title="Schematic">
          <OscSchematic topo={topo} running={running} />
        </Card>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Meter label="Tần số" value={fmtHz(freq)} color="cyan" />
        <Meter label="R" value={fmtEng(R, 'Ω')} color="amber" />
        <Meter label="C" value={fmtEng(C, 'F')} color="emerald" />
        <Meter
          label={topo === 'lc' ? 'L' : 'Av yêu cầu'}
          value={topo === 'lc' ? fmtEng(L, 'H') : `≥ ${barkhausenGain}`}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="R, C, L">
          <div className="space-y-3">
            <Slider label="R" value={R} min={100} max={1000000} step={100}
                    unit="Ω" onChange={setR}
                    format={(v) => fmtEng(v).replace(' ', '')} />
            <Slider label="C (log)" value={CLog} min={-12} max={-3} step={0.02}
                    onChange={setCLog}
                    format={(v) => fmtEng(Math.pow(10, v), 'F')} />
            {topo === 'lc' && (
              <Slider label="L (log)" value={LLog} min={-6} max={-1} step={0.02}
                      onChange={setLLog}
                      format={(v) => fmtEng(Math.pow(10, v), 'H')} />
            )}
          </div>
        </Card>
        <Card title="Điều khiển">
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
          <div className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
            Khi bật Run, biên độ tăng dần từ 0 tới giới hạn (mô phỏng khởi động + AGC).
          </div>
        </Card>
        <Card title="Điều kiện Barkhausen">
          <div className="text-[11px] text-zinc-300 leading-relaxed">
            Mạch sẽ dao động ổn định khi:
            <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-400">
              <li>|Aβ| = 1 (độ lợi vòng hở = 1)</li>
              <li>∠Aβ = 0° (hoặc bội 360°)</li>
            </ul>
            <div className="mt-2 text-zinc-500 italic">{barkhausenNote}</div>
          </div>
        </Card>
      </div>

      <Formula
        title="Công thức tần số dao động"
        lines={[
          { expr: 'Wien Bridge:      f = 1 / (2π·R·C)', note: 'Av ≥ 3 (bộ khuếch đại dương)' },
          { expr: 'RC Phase-Shift:   f = 1 / (2π·R·C·√6)', note: 'Av ≥ 29 (đảo) · hài thấp' },
          { expr: 'LC Tank:          f = 1 / (2π·√(L·C))', note: 'hài cao ít hơn, Q cao' },
          { expr: 'Barkhausen:       |Aβ| = 1, ∠Aβ = 0°', note: 'điều kiện dao động' },
        ]}
      />
    </div>
  )
}
