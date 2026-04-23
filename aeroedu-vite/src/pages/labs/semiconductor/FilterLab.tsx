/**
 * Filter Lab — Low-pass / High-pass / Band-pass analog filters.
 *
 * Topologies:
 *   LPF-1st:  R + C.       H(jω) = 1 / (1 + jωRC),        fc = 1 / (2π RC)
 *   HPF-1st:  C + R.       H(jω) = jωRC / (1 + jωRC),     fc = 1 / (2π RC)
 *   BPF (RLC series): band-pass resonance.
 *                   H(jω) = (jωL/R) / (1 + jωL/R + (jω)²LC) -> canonical second-order
 *                   f0 = 1 / (2π√(LC)),  Q = ω0·L / R
 *
 * Outputs:
 *   - Bode plot (magnitude dB + phase deg, log-frequency)
 *   - Time-domain Scope showing Vin (cyan) and Vout (amber) at a chosen frequency
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Scope, Formula, BodePlot, useRaf, type BodeSample } from './shared'

type Topology = 'lpf' | 'hpf' | 'bpf'

const TOPOS: Record<Topology, { name: string; short: string; color: string }> = {
  lpf: { name: 'Low-pass (RC)', short: 'LPF 1st-order', color: '#22d3ee' },
  hpf: { name: 'High-pass (CR)', short: 'HPF 1st-order', color: '#a855f7' },
  bpf: { name: 'Band-pass (RLC)', short: 'BPF 2nd-order', color: '#f97316' },
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

// Complex helpers
type Cplx = { re: number; im: number }
const cAdd = (a: Cplx, b: Cplx): Cplx => ({ re: a.re + b.re, im: a.im + b.im })
const cDiv = (a: Cplx, b: Cplx): Cplx => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
const cAbs = (a: Cplx) => Math.sqrt(a.re * a.re + a.im * a.im)
const cArg = (a: Cplx) => Math.atan2(a.im, a.re)

function transfer(topo: Topology, omega: number, R: number, C: number, L: number): Cplx {
  if (topo === 'lpf') {
    // H = 1 / (1 + jωRC)
    const den = cAdd({ re: 1, im: 0 }, { re: 0, im: omega * R * C })
    return cDiv({ re: 1, im: 0 }, den)
  }
  if (topo === 'hpf') {
    // H = jωRC / (1 + jωRC)
    const num: Cplx = { re: 0, im: omega * R * C }
    const den = cAdd({ re: 1, im: 0 }, num)
    return cDiv(num, den)
  }
  // BPF 2nd-order RLC series: take V across R
  // H = R / (R + jωL + 1/(jωC))
  //    = jωRC / (1 − ω²LC + jωRC)
  const jwRC: Cplx = { re: 0, im: omega * R * C }
  const minusW2LC = -omega * omega * L * C
  const den = cAdd({ re: 1 + minusW2LC, im: 0 }, jwRC)
  return cDiv(jwRC, den)
}

export default function FilterLab() {
  const [topo, setTopo] = useState<Topology>('lpf')
  const [R, setR] = useState(1000)                    // Ω
  const [CLog, setCLog] = useState(Math.log10(1e-7))  // logarithmic: default 100 nF
  const [LLog, setLLog] = useState(Math.log10(1e-3))  // default 1 mH
  const [testFreq, setTestFreq] = useState(1000)      // Hz for time-domain scope
  const [vinPk, setVinPk] = useState(2)               // volts
  const [running, setRunning] = useState(true)

  const C = Math.pow(10, CLog)
  const L = Math.pow(10, LLog)

  const tMs = useRaf(running)

  // Corner / center frequency
  const fc = useMemo(() => {
    if (topo === 'lpf' || topo === 'hpf') return 1 / (2 * Math.PI * R * C)
    // BPF: center = 1 / (2π√(LC))
    return 1 / (2 * Math.PI * Math.sqrt(L * C))
  }, [topo, R, C, L])

  // Q factor (BPF)
  const Q = useMemo(() => {
    if (topo !== 'bpf') return null
    const omega0 = 2 * Math.PI * fc
    return (omega0 * L) / R
  }, [topo, fc, L, R])

  // Bode samples — log-spaced frequency
  const samples: BodeSample[] = useMemo(() => {
    const fMin = Math.max(1, fc * 0.001)
    const fMax = Math.min(1e9, fc * 1000)
    const N = 180
    const arr: BodeSample[] = []
    for (let i = 0; i < N; i++) {
      const f = fMin * Math.pow(fMax / fMin, i / (N - 1))
      const omega = 2 * Math.PI * f
      const H = transfer(topo, omega, R, C, L)
      const mag = cAbs(H)
      const magDb = 20 * Math.log10(Math.max(mag, 1e-6))
      let phaseDeg = cArg(H) * 180 / Math.PI
      // Unwrap: keep in [-180, 180]
      while (phaseDeg > 180) phaseDeg -= 360
      while (phaseDeg < -180) phaseDeg += 360
      arr.push({ omega, magDb, phaseDeg })
    }
    return arr
  }, [topo, R, C, L, fc])

  // Gain/phase at the chosen test frequency
  const Htest = useMemo(() => {
    const omega = 2 * Math.PI * testFreq
    const H = transfer(topo, omega, R, C, L)
    return {
      mag: cAbs(H),
      magDb: 20 * Math.log10(Math.max(cAbs(H), 1e-6)),
      phaseDeg: cArg(H) * 180 / Math.PI,
    }
  }, [topo, R, C, L, testFreq])

  // Time-domain scope: Vin = vinPk·sin(ωt), Vout = |H|·vinPk·sin(ωt + ∠H)
  const omega = 2 * Math.PI * testFreq
  const phaseRad = Htest.phaseDeg * Math.PI / 180
  const voutAmp = vinPk * Htest.mag

  const traces = useMemo(() => [
    {
      label: 'Vin',
      color: '#22d3ee',
      vOffset: Math.max(vinPk, voutAmp) * 0.7,
      sample: (t: number) => vinPk * Math.sin(omega * t),
    },
    {
      label: 'Vout',
      color: '#fbbf24',
      vOffset: -Math.max(vinPk, voutAmp) * 0.7,
      sample: (t: number) => voutAmp * Math.sin(omega * t + phaseRad),
    },
  ], [vinPk, voutAmp, omega, phaseRad])

  const windowMs = 4000 / testFreq

  return (
    <div className="space-y-4">
      {/* Topology picker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {(Object.entries(TOPOS) as [Topology, typeof TOPOS[Topology]][]).map(([id, t]) => {
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

      {/* Bode + Scope */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Bode plot (|H| dB & ∠H °)">
          <BodePlot samples={samples} color={TOPOS[topo].color} fc={fc} />
        </Card>
        <Card title={`Scope: Vin / Vout @ ${fmtHz(testFreq)}`}>
          <Scope
            traces={traces}
            windowMs={windowMs}
            volt={Math.max(vinPk, voutAmp) * 1.3}
            running={running}
            tMs={tMs}
            height={260}
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Meter label="|H|" value={Htest.mag.toFixed(3)} unit="V/V"
                   color="emerald" hint={`${Htest.magDb.toFixed(1)} dB`} />
            <Meter label="∠H" value={Htest.phaseDeg.toFixed(1)} unit="°" color="purple" />
            <Meter label="Vout pk" value={voutAmp.toFixed(3)} unit="V" color="amber" />
          </div>
        </Card>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Meter label={topo === 'bpf' ? 'f₀ (center)' : 'fc (−3 dB)'}
               value={fmtHz(fc)} color="cyan" />
        <Meter label="R" value={fmtEng(R, 'Ω')} color="amber" />
        <Meter label="C" value={fmtEng(C, 'F')} color="emerald" />
        {topo === 'bpf' ? (
          <Meter label="L · Q" value={`${fmtEng(L, 'H')} · Q=${Q?.toFixed(2)}`} color="purple" />
        ) : (
          <Meter label="τ (RC)" value={fmtEng(R * C, 's')} color="slate" />
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Linh kiện R, C, L">
          <div className="space-y-3">
            <Slider label="R" value={R} min={10} max={100000} step={10}
                    unit="Ω" onChange={setR}
                    format={(v) => fmtEng(v).replace(' ', '')} />
            <Slider label="C (log)" value={CLog} min={-12} max={-3} step={0.02}
                    onChange={setCLog}
                    format={(v) => fmtEng(Math.pow(10, v), 'F')} />
            {topo === 'bpf' && (
              <Slider label="L (log)" value={LLog} min={-6} max={-1} step={0.02}
                      onChange={setLLog}
                      format={(v) => fmtEng(Math.pow(10, v), 'H')} />
            )}
          </div>
        </Card>
        <Card title="Signal thử">
          <div className="space-y-3">
            <Slider label="Tần số thử" value={testFreq} min={1} max={100000} step={1}
                    unit="Hz" onChange={setTestFreq}
                    format={(v) => fmtHz(v)} />
            <Slider label="Vin biên độ" value={vinPk} min={0.1} max={10} step={0.1}
                    unit="V" onChange={setVinPk} />
            <button
              onClick={() => setTestFreq(fc)}
              className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30"
            >
              Nhảy tới {topo === 'bpf' ? 'f₀' : 'fc'} = {fmtHz(fc)}
            </button>
          </div>
        </Card>
        <Card title="Animation">
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
            Quan sát độ trễ pha giữa Vin (cyan) và Vout (amber). Tại tần số cắt fc:
            |H| = 0.707 (−3 dB), pha lệch ±45°.
          </div>
        </Card>
      </div>

      <Formula
        title="Công thức lọc"
        lines={[
          { expr: 'LPF:  H(jω) = 1 / (1 + jωRC)', note: 'suy giảm ở tần số cao, 20 dB/dec' },
          { expr: 'HPF:  H(jω) = jωRC / (1 + jωRC)', note: 'chặn DC, cho cao tần qua' },
          { expr: 'fc = 1 / (2π·RC)', note: 'tần số cắt -3dB (1st-order)' },
          { expr: 'BPF:  H(jω) = jωRC / (1 − ω²LC + jωRC)', note: 'cộng hưởng RLC' },
          { expr: 'f₀ = 1 / (2π·√(LC))', note: 'tần số cộng hưởng' },
          { expr: 'Q = ω₀L / R', note: 'hệ số phẩm chất — Q cao = băng hẹp' },
        ]}
      />
    </div>
  )
}
