/**
 * Function Generator — 5 waveforms: sine, square, triangle, sawtooth, PWM
 * Controls: frequency, amplitude, DC offset, phase, duty cycle (square/PWM)
 * Outputs:
 *   - Real-time scope (time domain)
 *   - FFT magnitude spectrum (log magnitude vs harmonic)
 *   - Computed RMS / Peak / Peak-to-peak / average / THD estimate
 */
import { useMemo, useState } from 'react'
import { Card, Meter, Slider, Scope, Formula, Plot, useRaf, type PlotSeries } from './shared'

type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'pwm'

const WAVES: Record<Wave, { name: string; color: string; short: string }> = {
  sine:     { name: 'Sine',     color: '#22d3ee', short: 'sin(ωt)' },
  square:   { name: 'Square',   color: '#fbbf24', short: 'sgn(sin)' },
  triangle: { name: 'Triangle', color: '#a3e635', short: 'tri' },
  sawtooth: { name: 'Sawtooth', color: '#f472b6', short: 'saw' },
  pwm:      { name: 'PWM',      color: '#a855f7', short: 'pulse · duty%' },
}

function waveValue(
  wave: Wave, tSec: number, freq: number, ampPk: number, dc: number, phaseDeg: number, dutyPct: number,
): number {
  const phase = phaseDeg * Math.PI / 180
  const theta = 2 * Math.PI * freq * tSec + phase
  const mod = theta - Math.floor(theta / (2 * Math.PI)) * 2 * Math.PI   // 0..2π
  let y = 0
  switch (wave) {
    case 'sine':
      y = Math.sin(theta)
      break
    case 'square':
      y = mod < 2 * Math.PI * (dutyPct / 100) ? 1 : -1
      break
    case 'triangle': {
      const x = mod / (2 * Math.PI)  // 0..1
      y = x < 0.5 ? (4 * x - 1) : (3 - 4 * x)
      break
    }
    case 'sawtooth': {
      const x = mod / (2 * Math.PI)
      y = 2 * x - 1
      break
    }
    case 'pwm':
      y = mod < 2 * Math.PI * (dutyPct / 100) ? 1 : 0
      break
  }
  return dc + ampPk * y
}

// Discrete Fourier Transform magnitude over K bins (naive O(N·K))
function computeSpectrum(samples: number[], K = 32): { k: number; mag: number }[] {
  const N = samples.length
  const out: { k: number; mag: number }[] = []
  for (let k = 1; k <= K; k++) {
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const phi = -2 * Math.PI * k * n / N
      re += samples[n] * Math.cos(phi)
      im += samples[n] * Math.sin(phi)
    }
    const mag = Math.sqrt(re * re + im * im) / N * 2
    out.push({ k, mag })
  }
  return out
}

function fmtHz(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)} MHz`
  if (v >= 1e3) return `${(v / 1e3).toFixed(2)} kHz`
  return `${v.toFixed(0)} Hz`
}

export default function FunctionGenerator() {
  const [running, setRunning] = useState(true)
  const [wave, setWave] = useState<Wave>('sine')
  const [freq, setFreq] = useState(1000)        // Hz
  const [ampPk, setAmpPk] = useState(3)         // volts peak
  const [dc, setDc] = useState(0)               // dc offset
  const [phase, setPhase] = useState(0)         // deg
  const [duty, setDuty] = useState(50)          // %

  const tMs = useRaf(running)

  // Stats for 1 period (sampled at 512 points)
  const stats = useMemo(() => {
    const N = 512
    const xs = Array.from({ length: N }, (_, i) =>
      waveValue(wave, i / (N * freq), freq, ampPk, dc, phase, duty))
    const peak = xs.reduce((m, v) => Math.max(m, v), -Infinity)
    const trough = xs.reduce((m, v) => Math.min(m, v), +Infinity)
    const avg = xs.reduce((s, v) => s + v, 0) / N
    const rms = Math.sqrt(xs.reduce((s, v) => s + v * v, 0) / N)

    const spec = computeSpectrum(xs, 24)
    // THD relative to fundamental (k=1)
    const h1 = spec[0]?.mag ?? 0
    const harmSq = spec.slice(1).reduce((s, v) => s + v.mag * v.mag, 0)
    const thdPct = h1 > 0 ? Math.sqrt(harmSq) / h1 * 100 : 0

    return { peak, trough, avg, rms, spec, thdPct }
  }, [wave, freq, ampPk, dc, phase, duty])

  const windowMs = 3000 / freq  // 3 periods
  const voltRange = Math.max(1, Math.abs(ampPk) + Math.abs(dc)) * 1.3

  const traces = useMemo(() => [{
    label: WAVES[wave].name,
    color: WAVES[wave].color,
    sample: (t: number) => waveValue(wave, t, freq, ampPk, dc, phase, duty),
  }], [wave, freq, ampPk, dc, phase, duty])

  const specSeries: PlotSeries[] = useMemo(() => {
    // Draw spectrum as stem plot — use vertical bars via V lines? no, use point-to-axis
    // We represent as 2 pts per harmonic
    const pts: { x: number; y: number }[] = []
    stats.spec.forEach(s => {
      pts.push({ x: s.k - 0.02, y: 0 })
      pts.push({ x: s.k - 0.02, y: s.mag })
      pts.push({ x: s.k + 0.02, y: s.mag })
      pts.push({ x: s.k + 0.02, y: 0 })
    })
    return [{ points: pts, color: WAVES[wave].color, strokeWidth: 2 }]
  }, [stats.spec, wave])

  const specMax = Math.max(0.01, stats.spec.reduce((m, s) => Math.max(m, s.mag), 0)) * 1.1

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card title="Oscilloscope">
          <Scope
            traces={traces}
            windowMs={windowMs}
            volt={voltRange}
            running={running}
            tMs={tMs}
            height={280}
          />
        </Card>

        <div className="space-y-3">
          <Card title="Dạng sóng">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(WAVES) as [Wave, typeof WAVES[Wave]][]).map(([id, w]) => {
                const isActive = id === wave
                return (
                  <button
                    key={id}
                    onClick={() => setWave(id)}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-transparent bg-slate-800 ring-1 ring-cyan-400/60'
                        : 'border-slate-700 bg-slate-900/40 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-xs font-semibold" style={{ color: w.color }}>
                      {w.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">{w.short}</div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setRunning(r => !r)}
              className={`mt-3 w-full px-3 py-2 rounded-lg text-xs font-semibold border ${
                running
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {running ? 'Pause' : 'Run'}
            </button>
          </Card>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Meter label="Tần số" value={fmtHz(freq)} color="cyan" />
        <Meter label="Vpp" value={(stats.peak - stats.trough).toFixed(3)} unit="V" color="amber" />
        <Meter label="Peak" value={stats.peak.toFixed(2)} unit="V" color="emerald" />
        <Meter label="RMS" value={stats.rms.toFixed(3)} unit="V" color="purple" />
        <Meter label="Trung bình" value={stats.avg.toFixed(3)} unit="V" color="slate" />
        <Meter label="THD" value={stats.thdPct.toFixed(1)} unit="%" color="rose"
               hint={wave === 'sine' ? '~0% cho sóng sin' : 'chứa nhiều hài'} />
      </div>

      {/* Spectrum */}
      <Card title="Phổ tần (DFT — các hài)">
        <Plot
          series={specSeries}
          options={{
            xLabel: 'Hài số (× f)', yLabel: 'Biên độ', yUnit: 'V',
            xMin: 0, xMax: 24,
            yMin: 0, yMax: specMax,
            grid: 12, height: 200,
          }}
        />
        <div className="mt-2 text-[11px] text-zinc-500">
          Hài số 1 = tần số cơ bản (f = {fmtHz(freq)}). Sóng sin lý tưởng chỉ có hài 1. Sóng vuông có các hài lẻ (3, 5, 7…). Triangle/sawtooth có các hài lẻ giảm nhanh hơn.
        </div>
      </Card>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Tần số & biên độ">
          <div className="space-y-3">
            <Slider label="Tần số" value={freq} min={10} max={20000} step={10}
                    unit="Hz" onChange={setFreq}
                    format={(v) => fmtHz(v)} />
            <Slider label="Biên độ (đỉnh)" value={ampPk} min={0} max={10} step={0.1}
                    unit="V" onChange={setAmpPk} />
          </div>
        </Card>
        <Card title="Offset & pha">
          <div className="space-y-3">
            <Slider label="DC offset" value={dc} min={-5} max={5} step={0.1}
                    unit="V" onChange={setDc} />
            <Slider label="Pha" value={phase} min={0} max={360} step={5}
                    unit="°" onChange={setPhase} />
          </div>
        </Card>
        <Card title="Duty cycle (square/PWM)">
          <Slider label="Duty" value={duty} min={5} max={95} step={1}
                  unit="%" onChange={setDuty} />
          <div className="mt-2 text-[10px] text-zinc-500">
            {wave === 'square' || wave === 'pwm'
              ? 'Thay đổi tỉ lệ xung cao / xung thấp'
              : 'Chỉ áp dụng cho Square & PWM'}
          </div>
        </Card>
      </div>

      <Formula
        title="Công thức dạng sóng"
        lines={[
          { expr: 'Sine:      v(t) = Vpk·sin(2πf·t + φ)', note: 'hài duy nhất' },
          { expr: 'Square:    v(t) = Vpk·sgn(sin(…)) · duty', note: 'hài lẻ: 1/k·sin(kωt)' },
          { expr: 'Triangle:  đường ziczac tuyến tính ±Vpk', note: 'hài lẻ: 1/k² biên độ' },
          { expr: 'Sawtooth:  v(t) = 2·(t·f − ⌊t·f⌋) − 1', note: 'tất cả hài: 1/k biên độ' },
          { expr: 'PWM:       xung đơn cực 0/Vpk · duty%', note: 'dùng cho servo / điều khiển động cơ' },
          { expr: 'RMS:       √(1/T · ∫ v²(t)dt)', note: 'giá trị hiệu dụng' },
          { expr: 'THD:       √(Σ Vh_k²) / Vh_1', note: 'méo hài tổng' },
        ]}
      />
    </div>
  )
}
