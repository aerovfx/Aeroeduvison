/**
 * Timer555Lab — Mô phỏng IC NE555 ở chế độ Astable & Monostable
 *
 * Astable (dao động tự do):
 *   T_high = ln(2) · (R1 + R2) · C ≈ 0.693·(R1+R2)·C
 *   T_low  = ln(2) · R2 · C       ≈ 0.693·R2·C
 *   T      = T_high + T_low
 *   Duty   = T_high / T = (R1 + R2) / (R1 + 2·R2)
 *   f      = 1 / T
 *
 * Monostable (đơn ổn):
 *   T = ln(3) · R · C ≈ 1.1·R·C   (1.0986 chính xác hơn)
 *
 * Tụ điện C nạp/xả giữa Vcc/3 và 2·Vcc/3 (2 ngưỡng so sánh nội bộ)
 */
import { useMemo, useState } from 'react'
import { Cpu, Square as SquareIcon, Zap } from 'lucide-react'
import { Card, Slider, Meter, Scope, Formula, Transport, useRaf,
         fmtHz, fmtOhm, fmtF, ScopeTrace } from './shared'

type Mode = 'astable' | 'monostable'

const Vcc = 5

export default function Timer555Lab() {
  const [mode, setMode] = useState<Mode>('astable')
  const [R1, setR1] = useState(10000)
  const [R2, setR2] = useState(33000)
  const [C, setC]   = useState(10e-6)
  const [Rmono, setRmono] = useState(100000)
  const [Cmono, setCmono] = useState(10e-6)
  const [trigger, setTrigger] = useState(0)  // ms timestamp of last trigger
  const [running, setRunning] = useState(true)
  const tMs = useRaf(running)

  // Astable timing
  const astable = useMemo(() => {
    const Th = Math.LN2 * (R1 + R2) * C
    const Tl = Math.LN2 * R2 * C
    const T = Th + Tl
    return { Th, Tl, T, freq: 1 / T, duty: Th / T }
  }, [R1, R2, C])

  // Monostable timing
  const monostable = useMemo(() => {
    const T = Math.log(3) * Rmono * Cmono
    return { T, freq: 1 / T }
  }, [Rmono, Cmono])

  // Astable: capacitor voltage oscillates between Vcc/3 and 2Vcc/3
  // Output is high during charging (R1+R2 path), low during discharging (R2 only)
  function astableSamples(tSec: number): { vc: number; vout: number } {
    const Th = astable.Th, Tl = astable.Tl, T = astable.T
    const phase = ((tSec % T) + T) % T
    let vc: number, vout: number
    if (phase < Th) {
      // charging from Vcc/3 toward Vcc through (R1+R2)·C, target=Vcc
      // Vc(t) = Vcc - (Vcc - Vcc/3)·exp(-t/τ_charge); τ_charge = (R1+R2)·C
      const tau = (R1 + R2) * C
      vc = Vcc - (Vcc - Vcc / 3) * Math.exp(-phase / tau)
      vout = Vcc
    } else {
      // discharging from 2Vcc/3 toward 0 through R2·C
      const tau = R2 * C
      const tInPhase = phase - Th
      vc = (2 * Vcc / 3) * Math.exp(-tInPhase / tau)
      vout = 0
    }
    return { vc, vout }
  }

  // Monostable: idle state vc=0, vout=0; on trigger, vout=Vcc, vc charges via R·C
  // toward Vcc with τ=RC; when vc reaches 2Vcc/3, output goes low and vc reset to 0
  function monostableSamples(tSec: number): { vc: number; vout: number } {
    const triggerSec = trigger / 1000
    const dt = tSec - triggerSec
    if (dt < 0 || dt > monostable.T) return { vc: 0, vout: 0 }
    const tau = Rmono * Cmono
    const vc = Vcc - Vcc * Math.exp(-dt / tau)
    return { vc: Math.min(vc, 2 * Vcc / 3), vout: Vcc }
  }

  const sampleFn = mode === 'astable' ? astableSamples : monostableSamples

  const traces: ScopeTrace[] = [
    {
      label: 'Vout (pin 3)',
      color: '#22d3ee',
      vOffset: 2.5,
      sample: t => sampleFn(t).vout - 2.5,
    },
    {
      label: 'Vc (tụ)',
      color: '#fbbf24',
      vOffset: -2.5,
      sample: t => sampleFn(t).vc - 2.5,
    },
  ]

  const visibleWindowMs = mode === 'astable'
    ? Math.max(20, astable.T * 1000 * 3)
    : Math.max(20, monostable.T * 1000 * 1.5)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            IC NE555 — {mode === 'astable' ? 'Astable Oscillator' : 'Monostable One-Shot'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === 'astable'
              ? 'Dao động không ổn: tự sinh xung vuông tuần hoàn. Tụ C nạp qua R1+R2 và xả qua R2.'
              : 'Đơn ổn: bấm Trigger → output cao trong T = 1.1·R·C rồi tự về 0.'}
          </p>
        </div>
        <Transport running={running} onToggle={() => setRunning(r => !r)} onReset={() => {
          setTrigger(tMs)
        }} />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode('astable')}
          className={`px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1 ${
            mode === 'astable' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <SquareIcon className="w-3 h-3" /> Astable
        </button>
        <button
          onClick={() => setMode('monostable')}
          className={`px-3 py-1.5 text-xs rounded-md transition flex items-center gap-1 ${
            mode === 'monostable' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Zap className="w-3 h-3" /> Monostable
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          <Card title="Oscilloscope (Vout & Vc)">
            <Scope traces={traces} tMs={tMs} running={running}
                   windowMs={visibleWindowMs} volt={6} gridDiv={8}
                   width={560} height={260} />
          </Card>

          <Card title="Sơ đồ chân NE555">
            <NE555Symbol mode={mode} />
          </Card>
        </div>

        <div className="space-y-3">
          {mode === 'astable' ? (
            <Card title="Linh kiện">
              <div className="space-y-3">
                <Slider label="R1" value={R1} min={1000} max={1e6} step={500}
                        onChange={setR1} format={v => fmtOhm(v)} />
                <Slider label="R2" value={R2} min={1000} max={1e6} step={500}
                        onChange={setR2} format={v => fmtOhm(v)} />
                <Slider label="C" value={Math.log10(C)} min={-9} max={-3} step={0.05}
                        onChange={v => setC(Math.pow(10, v))}
                        format={v => fmtF(Math.pow(10, v))} />
              </div>
            </Card>
          ) : (
            <>
              <Card title="Linh kiện">
                <div className="space-y-3">
                  <Slider label="R" value={Rmono} min={1000} max={2e6} step={1000}
                          onChange={setRmono} format={v => fmtOhm(v)} />
                  <Slider label="C" value={Math.log10(Cmono)} min={-9} max={-3} step={0.05}
                          onChange={v => setCmono(Math.pow(10, v))}
                          format={v => fmtF(Math.pow(10, v))} />
                </div>
              </Card>
              <button
                onClick={() => setTrigger(tMs)}
                className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-sm font-semibold"
              >
                ⚡ Trigger (pin 2 ↓ GND)
              </button>
            </>
          )}

          <Card title={mode === 'astable' ? 'Thông số dao động' : 'Thông số xung'}>
            {mode === 'astable' ? (
              <div className="grid grid-cols-2 gap-2">
                <Meter label="Tần số" value={fmtHz(astable.freq)} color="cyan" />
                <Meter label="Chu kỳ T" value={(astable.T * 1000).toFixed(2)} unit="ms" color="purple" />
                <Meter label="T_high" value={(astable.Th * 1000).toFixed(2)} unit="ms" color="emerald" />
                <Meter label="T_low" value={(astable.Tl * 1000).toFixed(2)} unit="ms" color="rose" />
                <Meter label="Duty" value={(astable.duty * 100).toFixed(1)} unit="%" color="amber" />
                <Meter label="Vcc" value={Vcc.toFixed(1)} unit="V" color="slate" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Meter label="Pulse T" value={(monostable.T * 1000).toFixed(2)} unit="ms" color="cyan" />
                <Meter label="τ = RC" value={(Rmono * Cmono * 1000).toFixed(2)} unit="ms" color="purple" />
                <Meter label="Trigger@" value={(trigger / 1000).toFixed(2)} unit="s" color="amber" />
                <Meter label="Vcc" value={Vcc.toFixed(1)} unit="V" color="slate" />
              </div>
            )}
          </Card>

          <Formula
            title={mode === 'astable' ? 'Công thức Astable' : 'Công thức Monostable'}
            lines={mode === 'astable' ? [
              { expr: 'T_high = 0.693·(R1+R2)·C', note: 'tụ nạp Vcc/3 → 2Vcc/3' },
              { expr: 'T_low  = 0.693·R2·C', note: 'tụ xả 2Vcc/3 → Vcc/3' },
              { expr: 'T = T_high + T_low' },
              { expr: 'f = 1/T = 1.44/((R1+2R2)·C)' },
              { expr: 'Duty = (R1+R2)/(R1+2R2)', note: 'luôn > 50% với R1>0' },
            ] : [
              { expr: 'T = ln(3)·R·C ≈ 1.0986·R·C' },
              { expr: 'thường viết: T ≈ 1.1·R·C' },
              { expr: 'Trigger: pin 2 < Vcc/3', note: 'kích đáy (active low)' },
              { expr: 'Output: pin 3 = Vcc trong T' },
              { expr: 'Tụ nạp 0 → 2Vcc/3 rồi reset' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * NE555 chip symbol (8-pin DIP) with pin labels
 * ────────────────────────────────────────────────────────────────────*/

function NE555Symbol({ mode }: { mode: Mode }) {
  // 8-pin DIP layout: pins 1-4 left, pins 5-8 right
  const pins: { n: number; label: string; side: 'L' | 'R'; pos: number; active?: boolean }[] = [
    { n: 1, label: 'GND', side: 'L', pos: 0 },
    { n: 2, label: 'TRIG', side: 'L', pos: 1, active: mode === 'monostable' },
    { n: 3, label: 'OUT', side: 'L', pos: 2, active: true },
    { n: 4, label: 'RESET', side: 'L', pos: 3 },
    { n: 5, label: 'CTRL', side: 'R', pos: 3 },
    { n: 6, label: 'THRES', side: 'R', pos: 2, active: mode === 'astable' },
    { n: 7, label: 'DISCH', side: 'R', pos: 1, active: mode === 'astable' },
    { n: 8, label: 'Vcc', side: 'R', pos: 0 },
  ]
  const W = 540, H = 220
  const chipX = 200, chipY = 40, chipW = 140, chipH = 140
  const pinSpacing = 32

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ background: '#0a0f1a', borderRadius: 8 }}>
      {/* Chip body */}
      <rect x={chipX} y={chipY} width={chipW} height={chipH} fill="#1e293b"
            stroke="#475569" strokeWidth={2} rx={4} />
      <text x={chipX + chipW / 2} y={chipY + chipH / 2} fill="#cbd5e1"
            fontSize={14} textAnchor="middle" fontWeight={700} fontFamily="monospace">
        NE555
      </text>
      <text x={chipX + chipW / 2} y={chipY + chipH / 2 + 16} fill="#64748b"
            fontSize={9} textAnchor="middle" fontFamily="monospace">
        {mode.toUpperCase()}
      </text>
      {/* Notch */}
      <circle cx={chipX + 12} cy={chipY + 12} r={3} fill="#0a0f1a" stroke="#475569" />

      {/* Pins */}
      {pins.map(p => {
        const x = p.side === 'L' ? chipX - 24 : chipX + chipW + 24
        const y = chipY + 24 + p.pos * pinSpacing
        const wireFrom = p.side === 'L' ? chipX : chipX + chipW
        const wireTo = p.side === 'L' ? chipX - 14 : chipX + chipW + 14
        const c = p.active ? '#22d3ee' : '#64748b'
        return (
          <g key={p.n}>
            <line x1={wireFrom} y1={y} x2={wireTo} y2={y} stroke={c} strokeWidth={2} />
            <rect x={p.side === 'L' ? wireTo - 10 : wireTo} y={y - 4} width={10} height={8}
                  fill="#475569" stroke={c} strokeWidth={1} />
            <text x={x} y={y + 3} fill={c} fontSize={9} textAnchor={p.side === 'L' ? 'end' : 'start'}
                  fontFamily="monospace" fontWeight={p.active ? 700 : 400}>
              {p.n}·{p.label}
            </text>
          </g>
        )
      })}

      {/* External components hint */}
      {mode === 'astable' && (
        <g>
          <text x={W / 2} y={H - 12} fill="#94a3b8" fontSize={10} textAnchor="middle" fontFamily="monospace">
            R1: pin 7→Vcc · R2: pin 6→pin 7 · C: pin 6→GND · pin 2 nối pin 6
          </text>
        </g>
      )}
      {mode === 'monostable' && (
        <g>
          <text x={W / 2} y={H - 12} fill="#94a3b8" fontSize={10} textAnchor="middle" fontFamily="monospace">
            R: pin 7→Vcc · C: pin 6→GND · pin 6 nối pin 7 · TRIG (pin 2) ↓ GND để kích
          </text>
        </g>
      )}
    </svg>
  )
}
