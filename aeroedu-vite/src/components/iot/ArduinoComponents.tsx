/**
 * ArduinoComponents — SVG nguyên bản tuân thủ hình ảnh thực tế của linh kiện
 *
 * Tất cả vẽ from scratch dựa trên:
 *   - Physical appearance chuẩn của linh kiện (dictated by physics)
 *   - JEDEC/EIA/IEC industry standards (DIP package, color bands, tactile
 *     switch dimensions...)
 *   - Arduino UNO R3 official pin layout (open documentation)
 *
 * KHÔNG copy SVG từ Wokwi/TinyTapeout/bất kỳ nguồn proprietary nào.
 *
 * Components:
 *   - ArduinoBoardSVG  PCB R3 layout chuẩn với gradients + silkscreen
 *   - LED              5mm THT dome với lens refraction + flange + leads
 *   - PushButton       6×6mm tactile switch với cap + 4 leads bent outward
 *   - Resistor         Carbon film axial với 4 EIA color bands + body taper
 *   - Potentiometer    Rotary 10mm với knob ridges + indicator notch
 *   - DHT22Sensor      White sensor body với grille
 *   - ServoMotor       SG90 blue body với output horn
 *   - Breadboard       Mini với power rails + tie-point grid
 */
import type { ReactNode } from 'react'

// ─── Types ─────────────────────────────────────────────────────────
export type LEDColor = 'red' | 'yellow' | 'green' | 'blue' | 'white' | 'orange'

const LED_TINT: Record<LEDColor, { off: string; on: string; glow: string; tip: string }> = {
  red:    { off: '#7f1d1d', on: '#ef4444', glow: '#fca5a5', tip: '#fef2f2' },
  yellow: { off: '#854d0e', on: '#facc15', glow: '#fde047', tip: '#fefce8' },
  green:  { off: '#14532d', on: '#22c55e', glow: '#86efac', tip: '#f0fdf4' },
  blue:   { off: '#1e3a8a', on: '#3b82f6', glow: '#93c5fd', tip: '#eff6ff' },
  white:  { off: '#475569', on: '#e5e7eb', glow: '#f3f4f6', tip: '#ffffff' },
  orange: { off: '#7c2d12', on: '#f97316', glow: '#fdba74', tip: '#fff7ed' },
}

// ─── LED — 5mm THT realistic ────────────────────────────────────
/**
 * LED 5mm THT (through-hole) chuẩn. Layout vật lý:
 *   - Dome trong epoxy (5mm Ø)
 *   - Flange rim ngang dưới dome
 *   - Cathode side: flat trên flange + lead ngắn
 *   - Anode side: lead dài hơn
 *   - Khi ON: dome đổi màu rực + glow halo + filament inner glow
 *   - Refraction lens: highlight reflection bên trái dome
 */
export function LED({
  cx, cy, on, color = 'red', label, brightness = 1,
}: { cx: number; cy: number; on: boolean; color?: LEDColor; label?: string; brightness?: number }) {
  const c = LED_TINT[color]
  const litness = on ? brightness : 0
  const domeFill = on
    ? `url(#led-dome-on-${color})`
    : `url(#led-dome-off-${color})`
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Gradient definitions — local scope */}
      <defs>
        {/* Dome ON: radial light burst */}
        <radialGradient id={`led-dome-on-${color}`} cx="0.5" cy="0.45" r="0.65">
          <stop offset="0%" stopColor={c.tip} stopOpacity={0.95} />
          <stop offset="40%" stopColor={c.on} stopOpacity={0.85} />
          <stop offset="100%" stopColor={c.off} stopOpacity={0.9} />
        </radialGradient>
        {/* Dome OFF: muted tint with refraction */}
        <radialGradient id={`led-dome-off-${color}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
          <stop offset="30%" stopColor={c.off} stopOpacity={0.55} />
          <stop offset="100%" stopColor="#0f172a" stopOpacity={0.85} />
        </radialGradient>
        {/* Flange gradient */}
        <linearGradient id="led-flange" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
      </defs>

      {/* Glow halo (ON only) */}
      {on && (
        <>
          <circle r={22} fill={c.glow} opacity={0.18 * litness}>
            <animate attributeName="r" values={`18;${22 + litness * 4};18`} dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle r={14} fill={c.glow} opacity={0.35 * litness} />
        </>
      )}

      {/* Leads (chân) — anode dài (right), cathode ngắn (left, flat side) */}
      <line x1={-4} y1={7} x2={-4} y2={18} stroke="#9ca3af" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={4}  y1={7} x2={4}  y2={24} stroke="#cbd5e1" strokeWidth={1.6} strokeLinecap="round" />

      {/* Flange (vành đáy với flat side bên cathode) */}
      <path d="M -9 7 L -9 4 Q -9 2 -7 2 L 7 2 Q 9 2 9 4 L 9 7 Z" fill="url(#led-flange)" stroke="#1e293b" strokeWidth={0.6} />
      {/* Cathode flat indicator */}
      <line x1={-9} y1={4} x2={-9} y2={6} stroke="#0f172a" strokeWidth={1.2} />

      {/* Dome (epoxy lens 5mm Ø) */}
      <path d="M -8 2 Q -8 -10 0 -10 Q 8 -10 8 2 Z" fill={domeFill} stroke={on ? c.on : '#374151'} strokeWidth={0.8} />

      {/* Lens refraction — sharp highlight upper-left */}
      <path d="M -5 -3 Q -6 -8 -1 -9 Q -2 -5 -3 -2 Z" fill="rgba(255,255,255,0.45)" />
      {/* Soft secondary highlight */}
      <ellipse cx={2} cy={-2} rx={1.5} ry={2} fill="rgba(255,255,255,0.2)" />

      {/* Inner filament (visible ring khi ON) */}
      {on && (
        <>
          <circle cx={0} cy={-2} r={2.5} fill={c.tip} opacity={0.9}>
            <animate attributeName="opacity" values={`0.7;${0.95 * litness};0.7`} dur="0.9s" repeatCount="indefinite" />
          </circle>
          {/* Central hot spot */}
          <circle cx={0} cy={-2} r={1} fill="#ffffff" opacity={litness * 0.8} />
        </>
      )}

      {/* Label */}
      {label && (
        <text y={-14} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Push button — tactile switch 6×6mm THT ─────────────────────
/**
 * Tactile switch 6×6mm THT. Body vuông đen với cap nhấn ở giữa,
 * 4 leads bent outward ở 4 góc.
 */
export function PushButton({
  cx, cy, pressed, label,
}: { cx: number; cy: number; pressed: boolean; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ cursor: 'pointer' }}>
      <defs>
        <linearGradient id={`btn-body-${cx}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <radialGradient id={`btn-cap-${cx}-${pressed}`} cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor={pressed ? '#86efac' : '#fde047'} />
          <stop offset="60%" stopColor={pressed ? '#16a34a' : '#eab308'} />
          <stop offset="100%" stopColor={pressed ? '#15803d' : '#a16207'} />
        </radialGradient>
      </defs>

      {/* 4 metal leads bent outward */}
      {[[-10, -10, -14, -16], [10, -10, 14, -16], [-10, 10, -14, 16], [10, 10, 14, 16]].map((p, i) => (
        <g key={i}>
          <line x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} stroke="#9ca3af" strokeWidth={1.4} strokeLinecap="round" />
          <circle cx={p[2]} cy={p[3]} r={1.2} fill="#cbd5e1" />
        </g>
      ))}

      {/* Body — black square with subtle gradient */}
      <rect x={-11} y={-11} width={22} height={22} rx={1.5} fill={`url(#btn-body-${cx})`} stroke="#0f172a" strokeWidth={0.6} />
      {/* Inner mounting cross marks (subtle) */}
      <line x1={-11} y1={0} x2={-7} y2={0} stroke="#475569" strokeWidth={0.5} />
      <line x1={7} y1={0} x2={11} y2={0} stroke="#475569" strokeWidth={0.5} />
      <line x1={0} y1={-11} x2={0} y2={-7} stroke="#475569" strokeWidth={0.5} />
      <line x1={0} y1={7} x2={0} y2={11} stroke="#475569" strokeWidth={0.5} />

      {/* Cap (nút nhấn) */}
      <circle r={pressed ? 5.5 : 7} fill={`url(#btn-cap-${cx}-${pressed})`}
        stroke={pressed ? '#15803d' : '#a16207'} strokeWidth={1} style={{ transition: 'all 0.1s' }} />
      {/* Cap ridge */}
      <circle r={pressed ? 3 : 4} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={0.6} />
      {/* Center dot */}
      <circle r={pressed ? 0.6 : 0.8} fill="rgba(0,0,0,0.5)" />

      {label && (
        <text y={24} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Resistor — carbon film 1/4W axial ──────────────────────────
const EIA_COLORS: Record<string, string> = {
  black:  '#0a0a0a', brown: '#78350f', red:    '#b91c1c', orange: '#c2410c',
  yellow: '#ca8a04', green: '#15803d', blue:   '#1d4ed8', violet: '#6d28d9',
  gray:   '#4b5563', white: '#e5e7eb', gold:   '#d97706', silver: '#94a3b8',
}

export function Resistor({
  cx, cy, bands = ['red', 'red', 'brown', 'gold'], label,
}: { cx: number; cy: number; bands?: string[]; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <defs>
        <linearGradient id={`res-body-${cx}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="30%" stopColor="#fde68a" />
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* Leads — gray metal */}
      <line x1={-28} y1={0} x2={-13} y2={0} stroke="#9ca3af" strokeWidth={1.6} strokeLinecap="round" />
      <line x1={13}  y1={0} x2={28}  y2={0} stroke="#9ca3af" strokeWidth={1.6} strokeLinecap="round" />

      {/* Body — cylindrical với taper ở 2 đầu (carbon film look) */}
      {/* Taper left */}
      <path d="M -13 -2 Q -16 -2 -16 0 Q -16 2 -13 2 Z" fill="#d97706" />
      {/* Taper right */}
      <path d="M 13 -2 Q 16 -2 16 0 Q 16 2 13 2 Z" fill="#d97706" />
      {/* Main body */}
      <rect x={-13} y={-6} width={26} height={12} rx={2} fill={`url(#res-body-${cx})`} stroke="#92400e" strokeWidth={0.6} />
      {/* Top highlight */}
      <rect x={-12} y={-5} width={24} height={3} rx={1.5} fill="rgba(255,255,255,0.35)" />
      {/* Bottom shadow */}
      <rect x={-12} y={3} width={24} height={2} rx={1} fill="rgba(0,0,0,0.15)" />

      {/* 4 color bands */}
      {bands.slice(0, 4).map((b, i) => (
        <rect
          key={i}
          x={-9 + i * 5}
          y={-6}
          width={2.2}
          height={12}
          fill={EIA_COLORS[b] || '#000'}
        />
      ))}
      {/* Tolerance band gold separated */}
      {bands[3] === 'gold' && (
        <rect x={8} y={-6} width={2.5} height={12} fill="#fbbf24" />
      )}

      {label && (
        <text y={-12} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Potentiometer — rotary 10mm với knob ridges ────────────────
export function Potentiometer({
  cx, cy, value, label,
}: { cx: number; cy: number; value: number; label?: string }) {
  const angle = -135 + value * 270
  // 10 ridges around knob
  const ridges = Array.from({ length: 12 }).map((_, i) => i * 30)
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <defs>
        <linearGradient id={`pot-base-${cx}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <radialGradient id={`pot-knob-${cx}`} cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="60%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>

      {/* Base body (xám đậm) */}
      <rect x={-17} y={-17} width={34} height={34} rx={2} fill={`url(#pot-base-${cx})`} stroke="#0f172a" strokeWidth={1} />

      {/* 3 terminals top */}
      {[-12, -1, 10].map((tx, i) => (
        <g key={i}>
          <rect x={tx} y={-23} width={2.5} height={7} fill="#9ca3af" />
          <rect x={tx - 0.5} y={-24} width={3.5} height={2} fill="#cbd5e1" />
        </g>
      ))}

      {/* Knob outer ring */}
      <circle r={14} fill="#0f172a" stroke="#374151" strokeWidth={1} />
      {/* Knob ridges (12 around perimeter) */}
      {ridges.map(a => {
        const rad = (a - 90) * Math.PI / 180
        return (
          <line key={a}
            x1={Math.cos(rad) * 12} y1={Math.sin(rad) * 12}
            x2={Math.cos(rad) * 14} y2={Math.sin(rad) * 14}
            stroke="#475569" strokeWidth={0.8}
          />
        )
      })}
      {/* Knob top (raised face) */}
      <circle r={11} fill={`url(#pot-knob-${cx})`} stroke="#1f2937" strokeWidth={0.6} />
      {/* Indicator notch (small cut on knob edge) */}
      <g transform={`rotate(${angle})`}>
        <rect x={-1} y={-11} width={2} height={4} fill="#fbbf24" />
      </g>
      {/* Indicator line from center */}
      <line
        x1={0} y1={0}
        x2={Math.cos((angle - 90) * Math.PI / 180) * 8}
        y2={Math.sin((angle - 90) * Math.PI / 180) * 8}
        stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round"
      />
      <circle r={2} fill="#fbbf24" />

      {/* Range markers around base */}
      {[0, 0.25, 0.5, 0.75, 1].map((v, i) => {
        const a = -135 + v * 270
        const rad = (a - 90) * Math.PI / 180
        return (
          <g key={i}>
            <line
              x1={Math.cos(rad) * 16} y1={Math.sin(rad) * 16}
              x2={Math.cos(rad) * 18} y2={Math.sin(rad) * 18}
              stroke="#94a3b8" strokeWidth={0.7}
            />
          </g>
        )
      })}

      {label && (
        <text y={32} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Arduino UNO R3 PCB (realistic) ─────────────────────────────
/**
 * Arduino UNO R3 PCB chi tiết theo official layout. Toạ độ thiết kế cho
 * board nằm trong viewBox parent (parent SVG ~540×460), board ở vùng
 * (30,30) – (510,330).
 */
export function ArduinoBoardSVG({
  pinStates,
  onPinClick,
  children,
}: {
  pinStates: Record<number, { value: number; mode: string; kind: string }>
  onPinClick?: (pin: number) => void
  children?: ReactNode
}) {
  return (
    <g>
      <defs>
        {/* PCB green gradient (Arduino teal-green) */}
        <linearGradient id="pcb-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#115e59" />
          <stop offset="50%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#0d4f4f" />
        </linearGradient>
        {/* Silkscreen white pattern */}
        <pattern id="pcb-trace" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.4" fill="rgba(34,197,94,0.12)" />
        </pattern>
        {/* PCB shadow under board */}
        <filter id="pcb-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        {/* ATmega chip */}
        <linearGradient id="chip-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="50%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        {/* USB-B body */}
        <linearGradient id="usb-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        {/* Crystal can gold */}
        <linearGradient id="crystal-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        {/* Electrolytic cap */}
        <radialGradient id="cap-top" cx="0.3" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#1f2937" />
        </radialGradient>
        {/* Voltage regulator TO-220 */}
        <linearGradient id="vreg-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="40%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        {/* DC jack barrel */}
        <radialGradient id="dcjack-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="70%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
      </defs>

      {/* Soft shadow under PCB */}
      <rect x={36} y={36} width={480} height={300} rx={10} fill="rgba(0,0,0,0.4)" filter="url(#pcb-shadow)" />

      {/* PCB main body */}
      <rect x={30} y={30} width={480} height={300} rx={10}
        fill="url(#pcb-grad)" stroke="#064e3b" strokeWidth={2} />
      {/* PCB trace pattern overlay */}
      <rect x={30} y={30} width={480} height={300} rx={10} fill="url(#pcb-trace)" />

      {/* Curved cut-outs for headers (slight pcb cut) - cosmetic */}
      <rect x={28} y={88} width={4} height={14} fill="#0a0a0a" rx={1} />
      <rect x={28} y={235} width={4} height={32} fill="#0a0a0a" rx={1} />

      {/* 4 mounting holes */}
      {[[50, 50], [490, 50], [50, 310], [490, 310]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={6} fill="#0a0a0a" />
          <circle cx={x} cy={y} r={4} fill="#475569" />
          <circle cx={x} cy={y} r={2.5} fill="#0a0a0a" />
        </g>
      ))}

      {/* ─── USB-B port (top-left) — chrome metal body ─── */}
      <g>
        {/* Outer metal shield */}
        <rect x={20} y={68} width={56} height={46} rx={1} fill="url(#usb-grad)" stroke="#475569" strokeWidth={0.8} />
        {/* Top opening lip */}
        <rect x={22} y={70} width={52} height={4} fill="#94a3b8" />
        {/* Inner cavity (USB-B square hole) */}
        <rect x={28} y={78} width={40} height={28} fill="#0a0a0a" />
        {/* USB plastic insert (inner trapezoid) */}
        <path d="M 32 84 L 64 84 L 62 102 L 34 102 Z" fill="#1e293b" />
        <rect x={36} y={88} width={24} height={4} fill="#475569" />
        {/* Side mounting tabs */}
        <rect x={18} y={78} width={3} height={14} fill="#64748b" />
        <rect x={75} y={78} width={3} height={14} fill="#64748b" />
        {/* Silkscreen */}
        <text x={48} y={130} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="6" fontFamily="monospace">USB</text>
      </g>

      {/* ─── DC Power jack (bottom-left) — round barrel ─── */}
      <g>
        <rect x={22} y={236} width={48} height={36} rx={3} fill="url(#dcjack-grad)" stroke="#475569" strokeWidth={1} />
        {/* Outer ring */}
        <circle cx={46} cy={254} r={13} fill="#1e293b" stroke="#374151" strokeWidth={1.2} />
        {/* Inner barrel */}
        <circle cx={46} cy={254} r={10} fill="#0a0a0a" />
        {/* Center pin */}
        <circle cx={46} cy={254} r={2.2} fill="#9ca3af" />
        {/* Silkscreen */}
        <text x={46} y={282} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="6" fontFamily="monospace">7-12V</text>
      </g>

      {/* ─── Voltage regulator NCP1117 (next to DC jack) ─── */}
      <g>
        <rect x={86} y={155} width={26} height={32} fill="url(#vreg-grad)" stroke="#000" strokeWidth={0.6} />
        {/* Heat tab */}
        <rect x={88} y={158} width={22} height={5} fill="#374151" />
        <circle cx={99} cy={160.5} r={1.2} fill="#0a0a0a" />
        {/* Body label */}
        <text x={99} y={173} textAnchor="middle" fill="#cbd5e1" fontSize="5" fontFamily="monospace" fontWeight="bold">NCP</text>
        <text x={99} y={180} textAnchor="middle" fill="#cbd5e1" fontSize="5" fontFamily="monospace" fontWeight="bold">1117</text>
        {/* Silkscreen */}
        <text x={99} y={195} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="5" fontFamily="monospace">5V REG</text>
      </g>

      {/* ─── Electrolytic capacitor C1 (cylinder) ─── */}
      <g>
        <circle cx={130} cy={170} r={11} fill="#0a0a0a" stroke="#374151" strokeWidth={0.8} />
        <circle cx={130} cy={170} r={9.5} fill="url(#cap-top)" />
        <circle cx={130} cy={170} r={8} fill="#1e293b" />
        {/* Polarity indicator stripe */}
        <path d="M 122 168 A 9 9 0 0 1 122 172 Z" fill="#94a3b8" opacity={0.5} />
        <text x={123} y={172} fill="#cbd5e1" fontSize="5" fontWeight="bold">-</text>
        {/* Cross score on top */}
        <line x1={125} y1={170} x2={135} y2={170} stroke="#374151" strokeWidth={0.5} />
        <line x1={130} y1={165} x2={130} y2={175} stroke="#374151" strokeWidth={0.5} />
        {/* Silkscreen */}
        <text x={130} y={188} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="4.5" fontFamily="monospace">C1</text>
      </g>

      {/* ─── Reset button (gần USB) ─── */}
      <g>
        <rect x={108} y={86} width={16} height={16} rx={1.5} fill="#0a0a0a" stroke="#374151" strokeWidth={0.6} />
        {/* 4 leads */}
        {[[110, 86], [122, 86], [110, 102], [122, 102]].map(([x, y], i) => (
          <rect key={i} x={x - 0.7} y={y - 1} width={1.4} height={2.5} fill="#9ca3af" />
        ))}
        {/* Cap */}
        <circle cx={116} cy={94} r={4} fill="#1e293b" stroke="#475569" strokeWidth={0.8} />
        <circle cx={116} cy={94} r={2.5} fill="#475569" />
        <circle cx={116} cy={94} r={1} fill="#94a3b8" />
        {/* Silkscreen */}
        <text x={116} y={116} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5.5" fontFamily="monospace">RESET</text>
      </g>

      {/* ─── ATmega328P (28-pin DIP-28) ─── */}
      <g>
        {/* Body */}
        <rect x={195} y={155} width={120} height={48} rx={1.5} fill="url(#chip-body)" stroke="#000" strokeWidth={1} />
        {/* Pins left (14) + right (14) */}
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i}>
            <rect x={189} y={158 + i * 3.2} width={6} height={1.8} fill="#94a3b8" stroke="#475569" strokeWidth={0.3} />
            <rect x={315} y={158 + i * 3.2} width={6} height={1.8} fill="#94a3b8" stroke="#475569" strokeWidth={0.3} />
            {/* Pin via */}
            <circle cx={188} cy={158.9 + i * 3.2} r={0.7} fill="#fbbf24" />
            <circle cx={322} cy={158.9 + i * 3.2} r={0.7} fill="#fbbf24" />
          </g>
        ))}
        {/* Notch top (orientation marker) */}
        <rect x={250} y={153} width={10} height={3.5} rx={1} fill="#1f2937" />
        <circle cx={205} cy={163} r={1.2} fill="#fbbf24" />
        {/* Chip labels (silkscreen on chip) */}
        <text x={255} y={174} textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontWeight="bold" fontFamily="monospace">ATMEGA</text>
        <text x={255} y={183} textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontWeight="bold" fontFamily="monospace">328P-PU</text>
        <text x={255} y={193} textAnchor="middle" fill="#94a3b8" fontSize="5" fontFamily="monospace">1640 AT</text>
        {/* Silkscreen on PCB */}
        <text x={255} y={146} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="5" fontFamily="monospace">U1</text>
      </g>

      {/* ─── 16MHz Crystal (HC-49 can) ─── */}
      <g>
        <rect x={330} y={172} width={30} height={16} rx={5} fill="url(#crystal-grad)" stroke="#7c2d12" strokeWidth={1} />
        {/* Crystal etched label */}
        <text x={345} y={183} textAnchor="middle" fill="#7c2d12" fontSize="5.5" fontWeight="bold" fontFamily="monospace">16.000</text>
        {/* Reflection highlight */}
        <rect x={332} y={174} width={26} height={3} rx={1} fill="rgba(255,255,255,0.3)" />
        {/* 2 leads */}
        <line x1={335} y1={188} x2={335} y2={195} stroke="#9ca3af" strokeWidth={1.2} />
        <line x1={355} y1={188} x2={355} y2={195} stroke="#9ca3af" strokeWidth={1.2} />
        {/* Silkscreen */}
        <text x={345} y={205} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="5" fontFamily="monospace">Y1 16MHz</text>
      </g>

      {/* ─── ICSP header 2×3 (right side) ─── */}
      <g>
        {/* Shrouded plastic black */}
        <rect x={420} y={132} width={26} height={28} rx={2} fill="#0a0a0a" stroke="#1e293b" strokeWidth={0.8} />
        {/* 6 pins */}
        {[0, 1, 2].map(r =>
          [0, 1].map(c => (
            <g key={`${r}-${c}`}>
              <rect x={424 + c * 10} y={136 + r * 7} width={3} height={3} fill="#9ca3af" stroke="#475569" strokeWidth={0.3} />
              <circle cx={425.5 + c * 10} cy={137.5 + r * 7} r={0.6} fill="#fbbf24" />
            </g>
          ))
        )}
        {/* Pin 1 indicator */}
        <circle cx={420} cy={133} r={1} fill="#fbbf24" />
        {/* Silkscreen */}
        <text x={433} y={170} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5" fontFamily="monospace">ICSP</text>
      </g>

      {/* ─── Indicator LEDs (TX/RX/L/PWR) ─── */}
      <g>
        {/* TX LED (yellow, when pin 1 high) */}
        <circle cx={140} cy={106} r={3.5}
          fill={pinStates[1]?.value ? '#fbbf24' : '#1e293b'}
          stroke={pinStates[1]?.value ? '#facc15' : '#475569'} strokeWidth={0.8}
          style={{ filter: pinStates[1]?.value ? 'drop-shadow(0 0 5px #fbbf24)' : 'none' }}
        />
        <text x={140} y={118} textAnchor="middle" fill="#facc15" fontSize="5" fontFamily="monospace" fontWeight="bold">TX</text>
        {/* RX LED */}
        <circle cx={155} cy={106} r={3.5}
          fill={pinStates[0]?.value ? '#fbbf24' : '#1e293b'}
          stroke={pinStates[0]?.value ? '#facc15' : '#475569'} strokeWidth={0.8}
          style={{ filter: pinStates[0]?.value ? 'drop-shadow(0 0 5px #fbbf24)' : 'none' }}
        />
        <text x={155} y={118} textAnchor="middle" fill="#facc15" fontSize="5" fontFamily="monospace" fontWeight="bold">RX</text>
        {/* PWR LED (always on green) */}
        <circle cx={170} cy={106} r={3.5}
          fill="#22c55e" stroke="#15803d" strokeWidth={0.8}
          style={{ filter: 'drop-shadow(0 0 5px #22c55e)' }}
        />
        <text x={170} y={118} textAnchor="middle" fill="#86efac" fontSize="5" fontFamily="monospace" fontWeight="bold">ON</text>
        {/* L LED (built-in pin 13) */}
        <circle cx={185} cy={106} r={3.5}
          fill={pinStates[13]?.value ? '#fbbf24' : '#1e293b'}
          stroke={pinStates[13]?.value ? '#facc15' : '#475569'} strokeWidth={0.8}
          style={{ filter: pinStates[13]?.value ? 'drop-shadow(0 0 8px #fbbf24)' : 'none' }}
        />
        <text x={185} y={118} textAnchor="middle" fill="#facc15" fontSize="5" fontFamily="monospace" fontWeight="bold">L</text>
      </g>

      {/* ─── Digital header top (D8-D13 + AREF + GND + SDA + SCL) ─── */}
      <g>
        {/* Black plastic housing */}
        <rect x={200} y={60} width={235} height={14} rx={2} fill="#0a0a0a" stroke="#1e293b" strokeWidth={0.8} />
        {/* Top notch indicator */}
        <rect x={310} y={58} width={10} height={2} fill="#1f2937" />
        {[8, 9, 10, 11, 12, 13, 14 /* GND */, 15 /* AREF */, 16 /* SDA */, 17 /* SCL */].map((pin, i) => {
          const x = 207 + i * 23
          const labelPin = pin >= 14 ? ['GND', 'AREF', 'SDA', 'SCL'][pin - 14] : `${pin}`
          const isPin = pin < 14
          const v = isPin && pinStates[pin] ? pinStates[pin].value : 0
          const on = isPin && (pinStates[pin]?.kind === 'pwm' ? v > 8 : v > 0)
          return (
            <g key={pin}
              onClick={isPin && onPinClick ? () => onPinClick(pin) : undefined}
              style={{ cursor: isPin && onPinClick ? 'pointer' : 'default' }}
            >
              {/* Square hole (socket) */}
              <rect x={x - 4.5} y={62} width={9} height={10} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
              {/* Metal sleeve inside */}
              <rect x={x - 3.5} y={63} width={7} height={8} rx={0.3} fill={on ? '#fbbf24' : '#374151'} />
              {/* Pin hole */}
              <circle cx={x} cy={67} r={1.8}
                fill={on ? '#fde047' : '#94a3b8'}
                stroke="#0a0a0a" strokeWidth={0.4}
              />
              {/* Glow when active */}
              {on && <circle cx={x} cy={67} r={4} fill="#fbbf24" opacity={0.25} />}
              {/* Silkscreen label below header */}
              <text x={x} y={84} textAnchor="middle"
                fill={isPin && [3, 5, 6, 9, 10, 11].includes(pin) ? '#facc15' : 'rgba(255,255,255,0.75)'}
                fontSize="6" fontFamily="monospace" fontWeight="bold">
                {labelPin}
              </text>
              {/* PWM tilde */}
              {isPin && [3, 5, 6, 9, 10, 11].includes(pin) && (
                <text x={x} y={92} textAnchor="middle" fill="#facc15" fontSize="6" fontFamily="monospace">~</text>
              )}
            </g>
          )
        })}
        {/* Section label */}
        <text x={317} y={51} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="6" fontFamily="monospace" fontWeight="bold">DIGITAL (PWM ~)</text>
      </g>

      {/* ─── Digital header bottom (D0-D7) ─── */}
      <g>
        <rect x={200} y={272} width={188} height={14} rx={2} fill="#0a0a0a" stroke="#1e293b" strokeWidth={0.8} />
        {/* Reverse order: D7 on left side closer to AVR, D0 on right (matches real UNO) */}
        {[7, 6, 5, 4, 3, 2, 1, 0].map((pin, i) => {
          const x = 207 + i * 23
          const v = pinStates[pin]?.value || 0
          const on = pinStates[pin]?.kind === 'pwm' ? v > 8 : v > 0
          return (
            <g key={pin}
              onClick={onPinClick ? () => onPinClick(pin) : undefined}
              style={{ cursor: onPinClick ? 'pointer' : 'default' }}
            >
              <rect x={x - 4.5} y={274} width={9} height={10} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
              <rect x={x - 3.5} y={275} width={7} height={8} rx={0.3} fill={on ? '#fbbf24' : '#374151'} />
              <circle cx={x} cy={279} r={1.8}
                fill={on ? '#fde047' : '#94a3b8'}
                stroke="#0a0a0a" strokeWidth={0.4}
              />
              {on && <circle cx={x} cy={279} r={4} fill="#fbbf24" opacity={0.25} />}
              {/* Silkscreen — pin label above bottom header */}
              <text x={x} y={264} textAnchor="middle"
                fill={[3, 5, 6, 9, 10, 11].includes(pin) ? '#facc15' : 'rgba(255,255,255,0.75)'}
                fontSize="6" fontFamily="monospace" fontWeight="bold">
                {pin}
              </text>
              {[3, 5, 6, 9, 10, 11].includes(pin) && (
                <text x={x} y={257} textAnchor="middle" fill="#facc15" fontSize="6" fontFamily="monospace">~</text>
              )}
              {pin === 0 && <text x={x + 10} y={264} fill="#94a3b8" fontSize="5" fontFamily="monospace">RX</text>}
              {pin === 1 && <text x={x + 10} y={264} fill="#94a3b8" fontSize="5" fontFamily="monospace">TX</text>}
            </g>
          )
        })}
      </g>

      {/* ─── Analog header (A0-A5, bottom-right) ─── */}
      <g>
        <rect x={392} y={272} width={120} height={14} rx={2} fill="#0a0a0a" stroke="#1e293b" strokeWidth={0.8} />
        {[0, 1, 2, 3, 4, 5].map(i => {
          const realPin = 14 + i
          const x = 399 + i * 18
          const v = pinStates[realPin]?.value || 0
          const intensity = v / 1023
          return (
            <g key={i}>
              <rect x={x - 4} y={274} width={8} height={10} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
              <rect x={x - 3} y={275} width={6} height={8} rx={0.3}
                fill={`rgba(167,139,250,${0.2 + intensity * 0.7})`}
              />
              <circle cx={x} cy={279} r={1.6}
                fill={`rgba(196,181,253,${0.5 + intensity * 0.5})`}
                stroke="#0a0a0a" strokeWidth={0.3}
              />
              <text x={x} y={264} textAnchor="middle" fill="rgba(196,181,253,0.9)" fontSize="6" fontFamily="monospace" fontWeight="bold">
                A{i}
              </text>
            </g>
          )
        })}
        {/* Section label */}
        <text x={452} y={297} textAnchor="middle" fill="rgba(196,181,253,0.7)" fontSize="6" fontFamily="monospace" fontWeight="bold">ANALOG IN</text>
      </g>

      {/* ─── Power header (bottom-left) — IOREF/RST/3V3/5V/GND/GND/VIN ─── */}
      <g>
        <rect x={88} y={272} width={108} height={14} rx={2} fill="#0a0a0a" stroke="#1e293b" strokeWidth={0.8} />
        {[
          { lab: 'IOREF', color: '#fbbf24' },
          { lab: 'RST',   color: '#ef4444' },
          { lab: '3V3',   color: '#fb923c' },
          { lab: '5V',    color: '#ef4444' },
          { lab: 'GND',   color: '#94a3b8' },
          { lab: 'GND',   color: '#94a3b8' },
          { lab: 'VIN',   color: '#fbbf24' },
        ].map((p, i) => {
          const x = 95 + i * 14
          return (
            <g key={i}>
              <rect x={x - 4} y={274} width={8} height={10} rx={0.5} fill="#1e293b" stroke="#475569" strokeWidth={0.3} />
              <circle cx={x} cy={279} r={1.6} fill="#94a3b8" stroke="#0a0a0a" strokeWidth={0.3} />
              <text x={x} y={264} textAnchor="middle" fill={p.color} fontSize="5" fontFamily="monospace" fontWeight="bold">
                {p.lab}
              </text>
            </g>
          )
        })}
        <text x={142} y={297} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="6" fontFamily="monospace" fontWeight="bold">POWER</text>
      </g>

      {/* ─── Branding (silkscreen white text) ─── */}
      <text x={460} y={322} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="sans-serif" fontStyle="italic" fontWeight="bold">
        AERO·EDU UNO
      </text>
      <text x={460} y={332} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="5.5" fontFamily="monospace">
        R3 Compatible
      </text>

      {/* Small SMD resistors near LEDs */}
      {[133, 148, 163, 178].map((x, i) => (
        <rect key={i} x={x - 3} y={88} width={6} height={3} fill="#0f172a" stroke="#475569" strokeWidth={0.3} />
      ))}

      {/* Decorative SMD components (3 caps) */}
      {[[210, 220], [285, 218], [380, 225]].map(([x, y], i) => (
        <g key={i}>
          <rect x={x - 3} y={y - 1.5} width={6} height={3} fill="#fbbf24" stroke="#92400e" strokeWidth={0.3} />
        </g>
      ))}

      {/* Reference designators (silkscreen white text) */}
      <text x={220} y={235} fill="rgba(255,255,255,0.4)" fontSize="4.5" fontFamily="monospace">C2</text>
      <text x={295} y={234} fill="rgba(255,255,255,0.4)" fontSize="4.5" fontFamily="monospace">C3</text>
      <text x={388} y={239} fill="rgba(255,255,255,0.4)" fontSize="4.5" fontFamily="monospace">R3</text>

      {/* Render children (external components linked to pins) */}
      {children}
    </g>
  )
}

// ─── DHT22 sensor (giữ nguyên đơn giản, sensor body trắng) ──────
export function DHT22Sensor({ cx, cy, label }: { cx: number; cy: number; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <rect x={-15} y={-18} width={30} height={36} rx={2} fill="#f3f4f6" stroke="#9ca3af" strokeWidth={1} />
      {/* Grille */}
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={-12} y1={-12 + i * 3.5} x2={12} y2={-12 + i * 3.5} stroke="#9ca3af" strokeWidth={0.6} />
      ))}
      {/* 4 pins bottom */}
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={-10 + i * 6} y={18} width={2} height={5} fill="#94a3b8" />
      ))}
      <text x={0} y={14} textAnchor="middle" fill="#1f2937" fontSize="5" fontFamily="monospace" fontWeight="bold">DHT22</text>
      {label && (
        <text y={32} textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">{label}</text>
      )}
    </g>
  )
}

// ─── Servo motor SG90 ───────────────────────────────────────────
export function ServoMotor({ cx, cy, angle = 0, label }: { cx: number; cy: number; angle?: number; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <rect x={-15} y={-10} width={30} height={20} rx={2} fill="#1e40af" stroke="#1e3a8a" strokeWidth={1} />
      <text x={0} y={2} textAnchor="middle" fill="#dbeafe" fontSize="5" fontFamily="monospace" fontWeight="bold">SG90</text>
      <circle cx={0} cy={-14} r={5} fill="#fbbf24" stroke="#a16207" strokeWidth={1} />
      <circle cx={0} cy={-14} r={2} fill="#1f2937" />
      <g transform={`rotate(${angle - 90} 0 -14)`}>
        <rect x={-1.5} y={-14 - 18} width={3} height={18} fill="#f3f4f6" rx={1} />
        <circle cx={0} cy={-14 - 16} r={1.5} fill="#1f2937" />
      </g>
      <line x1={-8} y1={10} x2={-8} y2={20} stroke="#ea580c" strokeWidth={1.5} />
      <line x1={0} y1={10}  x2={0} y2={20}  stroke="#dc2626" strokeWidth={1.5} />
      <line x1={8} y1={10}  x2={8} y2={20}  stroke="#78350f" strokeWidth={1.5} />
      {label && (
        <text y={32} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">{label}</text>
      )}
    </g>
  )
}

// ─── Breadboard mini ─────────────────────────────────────────────
export function Breadboard({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const rows = Math.floor(height / 6)
  const cols = Math.floor(width / 6)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill="#fef9c3" stroke="#a16207" strokeWidth={1} />
      <line x1={x + 4} y1={y + 4} x2={x + width - 4} y2={y + 4} stroke="#dc2626" strokeWidth={0.8} />
      <line x1={x + 4} y1={y + height - 4} x2={x + width - 4} y2={y + height - 4} stroke="#2563eb" strokeWidth={0.8} />
      {Array.from({ length: rows - 2 }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={x + 4 + c * 6}
            cy={y + 10 + r * 6}
            r={0.8}
            fill="#a16207"
            opacity={0.6}
          />
        ))
      )}
    </g>
  )
}
