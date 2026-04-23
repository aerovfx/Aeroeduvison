/**
 * Shared components for the Semiconductor Lab:
 *   - Plot:       generic static XY plot (I-V curves, transfer functions)
 *   - Scope:      time-domain rolling trace (oscilloscope-like)
 *   - BodePlot:   magnitude (dB) + phase (deg) vs ω (log)
 *   - Slider:     labeled slider with live readout
 *   - Card:       panel wrapper
 *   - Meter:      value + unit + color
 *   - Formula:    formatted formula card with LaTeX-ish display
 *   - useRaf:     requestAnimationFrame clock hook (returns tMs running counter)
 */
import { useEffect, useRef, useState, ReactNode } from 'react'

/* ────────────────────────────────────────────────────────────────────
 * Hooks
 * ────────────────────────────────────────────────────────────────────*/

export function useRaf(running: boolean): number {
  const [tMs, setTMs] = useState(0)
  const lastRef = useRef<number>(performance.now())
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function tick(now: number) {
      const dt = now - lastRef.current
      lastRef.current = now
      if (running) setTMs(t => t + dt)
      rafRef.current = requestAnimationFrame(tick)
    }
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [running])

  return tMs
}

/* ────────────────────────────────────────────────────────────────────
 * Card / Panel
 * ────────────────────────────────────────────────────────────────────*/

export function Card({
  title, icon, children, className = '',
}: {
  title?: string
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 ${className}`}>
      {title && (
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}

export function Meter({
  label, value, unit, color = 'cyan', hint,
}: {
  label: string
  value: string | number
  unit?: string
  color?: 'cyan' | 'amber' | 'emerald' | 'purple' | 'rose' | 'blue' | 'slate'
  hint?: string
}) {
  const colorMap: Record<string, string> = {
    cyan:    'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
    amber:   'border-amber-500/30 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    purple:  'border-purple-500/30 bg-purple-500/10 text-purple-200',
    rose:    'border-rose-500/30 bg-rose-500/10 text-rose-200',
    blue:    'border-blue-500/30 bg-blue-500/10 text-blue-200',
    slate:   'border-slate-500/30 bg-slate-500/10 text-slate-200',
  }
  return (
    <div className={`px-3 py-2 rounded-lg border ${colorMap[color]}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-mono text-sm font-semibold">
        {value}
        {unit && <span className="ml-1 text-[10px] opacity-70">{unit}</span>}
      </div>
      {hint && <div className="text-[10px] opacity-60 mt-0.5">{hint}</div>}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Slider — labeled range input
 * ────────────────────────────────────────────────────────────────────*/

export function Slider({
  label, value, min, max, step = 0.01, unit, onChange, format,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  const display = format ? format(value) : value.toFixed(step < 0.1 ? 2 : step < 1 ? 1 : 0)
  return (
    <label className="block">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-300">{label}</span>
        <span className="font-mono text-cyan-300">
          {display}{unit && <span className="text-zinc-500 ml-0.5">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full accent-cyan-400 h-1.5"
      />
    </label>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Formula card
 * ────────────────────────────────────────────────────────────────────*/

export function Formula({
  title, lines,
}: {
  title: string
  lines: { expr: string; note?: string }[]
}) {
  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-zinc-900/40 border border-indigo-500/20 rounded-xl p-4">
      <h4 className="text-xs uppercase tracking-wider text-indigo-300 mb-2 font-semibold">
        {title}
      </h4>
      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} className="font-mono text-xs text-zinc-200">
            <span className="text-cyan-300">{l.expr}</span>
            {l.note && <span className="text-zinc-500 ml-2 text-[11px] italic">— {l.note}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Static XY Plot — for I-V curves, transfer characteristics
 * ────────────────────────────────────────────────────────────────────*/

export interface PlotSeries {
  points: { x: number; y: number }[]
  color: string
  label?: string
  strokeWidth?: number
  dashed?: boolean
}

export interface PlotOptions {
  xLabel: string
  yLabel: string
  xUnit?: string
  yUnit?: string
  /** Plot bounds; if omitted, computed from data */
  xMin?: number; xMax?: number; yMin?: number; yMax?: number
  width?: number
  height?: number
  /** Draw cross markers (point-of-interest) on top of curves */
  markers?: { x: number; y: number; label?: string; color?: string }[]
  /** Optional extra horizontal/vertical reference lines */
  hLines?: { y: number; color: string; dashed?: boolean; label?: string }[]
  vLines?: { x: number; color: string; dashed?: boolean; label?: string }[]
  /** Grid divisions per axis (default 10) */
  grid?: number
  /** Log X axis */
  logX?: boolean
}

export function Plot({
  series, options,
}: {
  series: PlotSeries[]
  options: PlotOptions
}) {
  const W = options.width ?? 520
  const H = options.height ?? 280
  const padL = 48, padR = 16, padT = 14, padB = 34
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  // Auto bounds
  const allPoints = series.flatMap(s => s.points)
  let xMin = options.xMin ?? (allPoints.length ? Math.min(...allPoints.map(p => p.x)) : 0)
  let xMax = options.xMax ?? (allPoints.length ? Math.max(...allPoints.map(p => p.x)) : 1)
  let yMin = options.yMin ?? (allPoints.length ? Math.min(...allPoints.map(p => p.y)) : 0)
  let yMax = options.yMax ?? (allPoints.length ? Math.max(...allPoints.map(p => p.y)) : 1)
  if (xMax - xMin < 1e-12) xMax = xMin + 1
  if (yMax - yMin < 1e-12) yMax = yMin + 1

  const xScale = (x: number) => {
    if (options.logX) {
      const a = Math.max(xMin, 1e-12)
      const b = Math.max(xMax, a * 10)
      const lx = Math.log10(Math.max(x, 1e-12))
      return padL + ((lx - Math.log10(a)) / (Math.log10(b) - Math.log10(a))) * innerW
    }
    return padL + ((x - xMin) / (xMax - xMin)) * innerW
  }
  const yScale = (y: number) => padT + innerH - ((y - yMin) / (yMax - yMin)) * innerH

  const toPath = (pts: { x: number; y: number }[]) => {
    if (!pts.length) return ''
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.x).toFixed(2)},${yScale(p.y).toFixed(2)}`).join(' ')
  }

  const grid = options.grid ?? 10
  const gridXTicks = Array.from({ length: grid + 1 }, (_, i) => xMin + (i / grid) * (xMax - xMin))
  const gridYTicks = Array.from({ length: grid + 1 }, (_, i) => yMin + (i / grid) * (yMax - yMin))

  const fmtTick = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toExponential(1)
    if (Math.abs(v) >= 1) return v.toFixed(1)
    if (Math.abs(v) >= 0.01) return v.toFixed(2)
    if (v === 0) return '0'
    return v.toExponential(1)
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none"
         style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0b0f1a 100%)', borderRadius: 8 }}>
      {/* Grid */}
      {gridXTicks.map((x, i) => (
        <line key={`vx-${i}`}
              x1={xScale(x)} y1={padT}
              x2={xScale(x)} y2={padT + innerH}
              stroke="#1e293b" strokeWidth={0.5} />
      ))}
      {gridYTicks.map((y, i) => (
        <line key={`hx-${i}`}
              x1={padL} y1={yScale(y)}
              x2={padL + innerW} y2={yScale(y)}
              stroke="#1e293b" strokeWidth={0.5} />
      ))}

      {/* Axes */}
      {/* Y axis */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#475569" strokeWidth={1} />
      {/* X axis (at y=0 if visible, else bottom) */}
      {yMin <= 0 && yMax >= 0 ? (
        <line x1={padL} y1={yScale(0)} x2={padL + innerW} y2={yScale(0)} stroke="#475569" strokeWidth={1.2} />
      ) : (
        <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="#475569" strokeWidth={1} />
      )}
      {/* X axis at origin x=0 */}
      {xMin <= 0 && xMax >= 0 && !options.logX && (
        <line x1={xScale(0)} y1={padT} x2={xScale(0)} y2={padT + innerH} stroke="#475569" strokeWidth={1.2} />
      )}

      {/* Tick labels */}
      {gridXTicks.filter((_, i) => i % 2 === 0).map((x, i) => (
        <text key={`xt-${i}`} x={xScale(x)} y={padT + innerH + 14}
              fill="#64748b" fontSize={9} textAnchor="middle" fontFamily="monospace">
          {fmtTick(x)}
        </text>
      ))}
      {gridYTicks.filter((_, i) => i % 2 === 0).map((y, i) => (
        <text key={`yt-${i}`} x={padL - 6} y={yScale(y) + 3}
              fill="#64748b" fontSize={9} textAnchor="end" fontFamily="monospace">
          {fmtTick(y)}
        </text>
      ))}

      {/* Axis labels */}
      <text x={padL + innerW / 2} y={H - 6} fill="#94a3b8" fontSize={10} textAnchor="middle">
        {options.xLabel}{options.xUnit && ` (${options.xUnit})`}
      </text>
      <text x={10} y={padT + innerH / 2} fill="#94a3b8" fontSize={10} textAnchor="middle"
            transform={`rotate(-90, 10, ${padT + innerH / 2})`}>
        {options.yLabel}{options.yUnit && ` (${options.yUnit})`}
      </text>

      {/* H reference lines */}
      {options.hLines?.map((h, i) => (
        <g key={`hl-${i}`}>
          <line x1={padL} y1={yScale(h.y)} x2={padL + innerW} y2={yScale(h.y)}
                stroke={h.color} strokeWidth={1}
                strokeDasharray={h.dashed ? '4 3' : undefined} />
          {h.label && (
            <text x={padL + innerW - 4} y={yScale(h.y) - 3} fill={h.color}
                  fontSize={9} textAnchor="end" fontFamily="monospace">{h.label}</text>
          )}
        </g>
      ))}
      {/* V reference lines */}
      {options.vLines?.map((v, i) => (
        <g key={`vl-${i}`}>
          <line x1={xScale(v.x)} y1={padT} x2={xScale(v.x)} y2={padT + innerH}
                stroke={v.color} strokeWidth={1}
                strokeDasharray={v.dashed ? '4 3' : undefined} />
          {v.label && (
            <text x={xScale(v.x) + 3} y={padT + 10} fill={v.color}
                  fontSize={9} textAnchor="start" fontFamily="monospace">{v.label}</text>
          )}
        </g>
      ))}

      {/* Series */}
      {series.map((s, i) => (
        <g key={`s-${i}`}>
          <path d={toPath(s.points)}
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 1.5}
                fill="none"
                strokeDasharray={s.dashed ? '4 3' : undefined}
                strokeLinejoin="round"
                strokeLinecap="round" />
        </g>
      ))}

      {/* Markers */}
      {options.markers?.map((m, i) => (
        <g key={`m-${i}`}>
          <circle cx={xScale(m.x)} cy={yScale(m.y)} r={5}
                  fill={m.color ?? '#fbbf24'} stroke="#0b0f1a" strokeWidth={2} />
          {m.label && (
            <text x={xScale(m.x) + 8} y={yScale(m.y) - 6}
                  fill={m.color ?? '#fbbf24'} fontSize={10}
                  fontFamily="monospace" fontWeight={700}>
              {m.label}
            </text>
          )}
        </g>
      ))}

      {/* Legend */}
      {series.some(s => s.label) && (
        <g transform={`translate(${padL + 8}, ${padT + 8})`}>
          {series.filter(s => s.label).map((s, i) => (
            <g key={`lg-${i}`} transform={`translate(0, ${i * 14})`}>
              <line x1={0} y1={5} x2={16} y2={5} stroke={s.color} strokeWidth={2}
                    strokeDasharray={s.dashed ? '4 3' : undefined} />
              <text x={20} y={8} fill="#cbd5e1" fontSize={9} fontFamily="monospace">
                {s.label}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Scope — time-domain rolling trace (oscilloscope-like)
 *
 * Renders N traces as samples over a fixed time window.
 * Pass a `samples` function(tMs, traceIdx) that returns the current value.
 * ────────────────────────────────────────────────────────────────────*/

export interface ScopeTrace {
  label: string
  color: string
  /** Vertical offset in volts (so multiple traces don't overlap) */
  vOffset?: number
  sample: (tSec: number) => number
}

export function Scope({
  traces,
  windowMs = 20,     // time window displayed (ms)
  volt = 6,          // ±volts visible (half-range)
  gridDiv = 8,       // number of grid divisions
  height = 240,
  width = 560,
  running = true,
  tMs,
}: {
  traces: ScopeTrace[]
  windowMs?: number
  volt?: number
  gridDiv?: number
  height?: number
  width?: number
  running?: boolean
  tMs: number
}) {
  const W = width, H = height
  const padL = 36, padR = 12, padT = 12, padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  // Time axis: show from (tSec - windowSec) to tSec (rolling)
  const tSec = tMs / 1000
  const windowSec = windowMs / 1000
  const tStart = tSec - windowSec

  // Sample N points across the window
  const N = 400
  const xs = Array.from({ length: N }, (_, i) => tStart + (i / (N - 1)) * windowSec)

  const xScale = (t: number) => padL + ((t - tStart) / windowSec) * innerW
  const yScale = (v: number) => padT + innerH / 2 - (v / volt) * (innerH / 2)

  // Build grid lines
  const vGrid = Array.from({ length: gridDiv + 1 }, (_, i) => tStart + (i / gridDiv) * windowSec)
  const hGrid = Array.from({ length: gridDiv + 1 }, (_, i) => -volt + (i / gridDiv) * 2 * volt)

  return (
    <div className="bg-gradient-to-br from-slate-900 to-black border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2 text-[10px] text-zinc-500 font-mono">
        <span>t-div {(windowMs / gridDiv).toFixed(2)} ms · V-div {(volt * 2 / gridDiv).toFixed(2)} V</span>
        <span className={running ? 'text-emerald-400' : 'text-zinc-600'}>
          {running ? '● RUN' : '■ STOP'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full"
           style={{ background: '#020617', borderRadius: 4 }}>
        {/* Grid */}
        {vGrid.map((t, i) => (
          <line key={`vg-${i}`}
                x1={xScale(t)} y1={padT}
                x2={xScale(t)} y2={padT + innerH}
                stroke={i === gridDiv / 2 ? '#334155' : '#1e293b'} strokeWidth={0.5} />
        ))}
        {hGrid.map((v, i) => (
          <line key={`hg-${i}`}
                x1={padL} y1={yScale(v)}
                x2={padL + innerW} y2={yScale(v)}
                stroke={v === 0 ? '#475569' : '#1e293b'} strokeWidth={v === 0 ? 0.8 : 0.5} />
        ))}

        {/* Zero line labels */}
        <text x={padL - 4} y={yScale(0) + 3} fill="#475569" fontSize={8}
              textAnchor="end" fontFamily="monospace">0V</text>
        <text x={padL - 4} y={yScale(volt) + 3} fill="#475569" fontSize={8}
              textAnchor="end" fontFamily="monospace">+{volt}V</text>
        <text x={padL - 4} y={yScale(-volt) + 3} fill="#475569" fontSize={8}
              textAnchor="end" fontFamily="monospace">-{volt}V</text>

        {/* Traces */}
        {traces.map((tr, i) => {
          const pts = xs.map(t => {
            const v = tr.sample(t) + (tr.vOffset ?? 0)
            const vc = Math.max(-volt * 1.1, Math.min(volt * 1.1, v))
            return `${xScale(t).toFixed(2)},${yScale(vc).toFixed(2)}`
          })
          return (
            <g key={`tr-${i}`}>
              <polyline points={pts.join(' ')}
                        stroke={tr.color} strokeWidth={1.8}
                        fill="none" strokeLinejoin="round" strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 3px ${tr.color})` }} />
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${padL + 8}, ${padT + 10})`}>
          {traces.map((t, i) => (
            <g key={`lg-${i}`} transform={`translate(0, ${i * 14})`}>
              <line x1={0} y1={4} x2={14} y2={4} stroke={t.color} strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 2px ${t.color})` }} />
              <text x={18} y={7} fill={t.color} fontSize={9} fontFamily="monospace"
                    fontWeight={700}>{t.label}</text>
            </g>
          ))}
        </g>

        {/* Time axis label */}
        <text x={padL + innerW - 4} y={padT + innerH + 16} fill="#64748b"
              fontSize={9} textAnchor="end" fontFamily="monospace">
          t = {tSec.toFixed(3)} s
        </text>
      </svg>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Bode plot (magnitude dB + phase deg vs ω log-scale)
 * ────────────────────────────────────────────────────────────────────*/

export interface BodeSample { omega: number; magDb: number; phaseDeg: number }

export function BodePlot({
  samples, color = '#22d3ee', fc,
  magMin = -60, magMax = 10,
}: {
  samples: BodeSample[]
  color?: string
  fc?: number     // corner frequency in Hz for marker
  magMin?: number
  magMax?: number
}) {
  const magSeries: PlotSeries = {
    points: samples.map(s => ({ x: s.omega / (2 * Math.PI), y: s.magDb })),
    color,
    strokeWidth: 2,
  }
  const phaseSeries: PlotSeries = {
    points: samples.map(s => ({ x: s.omega / (2 * Math.PI), y: s.phaseDeg })),
    color: '#f97316',
    strokeWidth: 2,
  }
  const fMin = samples.length > 0 ? samples[0].omega / (2 * Math.PI) : 1
  const fMax = samples.length > 0 ? samples[samples.length - 1].omega / (2 * Math.PI) : 1e6

  return (
    <div className="space-y-2">
      <Plot
        series={[magSeries]}
        options={{
          xLabel: 'f', xUnit: 'Hz (log)',
          yLabel: '|H|', yUnit: 'dB',
          xMin: fMin, xMax: fMax,
          yMin: magMin, yMax: magMax,
          logX: true, grid: 8, height: 190,
          hLines: [{ y: -3, color: '#ef4444', dashed: true, label: '-3 dB' }],
          vLines: fc ? [{ x: fc, color: '#fbbf24', dashed: true, label: `fc=${fc < 1000 ? fc.toFixed(1) : (fc / 1000).toFixed(2) + 'k'}Hz` }] : undefined,
        }}
      />
      <Plot
        series={[phaseSeries]}
        options={{
          xLabel: 'f', xUnit: 'Hz (log)',
          yLabel: '∠H', yUnit: '°',
          xMin: fMin, xMax: fMax,
          yMin: -180, yMax: 180,
          logX: true, grid: 8, height: 160,
          hLines: [
            { y: 0, color: '#475569' },
            { y: -45, color: '#ef4444', dashed: true, label: '-45°' },
            { y: -90, color: '#ef4444', dashed: true, label: '-90°' },
          ],
          vLines: fc ? [{ x: fc, color: '#fbbf24', dashed: true }] : undefined,
        }}
      />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Play/Pause/Reset button group
 * ────────────────────────────────────────────────────────────────────*/

export function Transport({
  running, onToggle, onReset,
}: {
  running: boolean
  onToggle: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
          running
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
        }`}
      >
        {running ? 'Pause' : 'Run'}
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
      >
        Reset
      </button>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Number formatting helpers
 * ────────────────────────────────────────────────────────────────────*/

export function fmtEng(v: number, digits = 2): string {
  if (!isFinite(v)) return '∞'
  if (v === 0) return '0'
  const abs = Math.abs(v)
  const prefixes: [number, string][] = [
    [1e-12, 'p'], [1e-9, 'n'], [1e-6, 'µ'], [1e-3, 'm'],
    [1, ''], [1e3, 'k'], [1e6, 'M'], [1e9, 'G'],
  ]
  let p: [number, string] = [1, '']
  for (const candidate of prefixes) {
    if (abs >= candidate[0]) p = candidate
  }
  return `${(v / p[0]).toFixed(digits)} ${p[1]}`
}

export function fmtHz(f: number): string { return fmtEng(f, 2) + 'Hz' }
export function fmtV(v: number): string { return fmtEng(v, 3) + 'V' }
export function fmtA(i: number): string { return fmtEng(i, 3) + 'A' }
export function fmtOhm(r: number): string { return fmtEng(r, 2) + 'Ω' }
export function fmtF(c: number): string { return fmtEng(c, 2) + 'F' }
export function fmtH(l: number): string { return fmtEng(l, 2) + 'H' }
