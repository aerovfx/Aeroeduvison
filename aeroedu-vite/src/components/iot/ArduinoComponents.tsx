/**
 * ArduinoComponents — bộ SVG nguyên bản vẽ tay các linh kiện điện tử
 * dùng cho schematic ArduinoEmulator.
 *
 * Tất cả vẽ from scratch dựa trên hình dáng vật lý chung của linh kiện
 * (LED dome 5mm + leads, Arduino UNO PCB layout chuẩn, color-band
 * resistor chuẩn EIA, etc.) — không copy từ bất kỳ nguồn nào.
 *
 * Components:
 *   - ArduinoBoardSVG    PCB Arduino UNO chi tiết với USB-B, power jack,
 *                        ATmega328P chip, 16MHz crystal, reset button,
 *                        ICSP header, 30 pin headers
 *   - LED                Dome 5mm với flange + 2 leads, glow effect khi ON
 *                        (color theo prop: red/yellow/green/blue/white)
 *   - PushButton         4-pin tactile switch với cap nhấn lên/xuống
 *   - Resistor           Axial cylinder với 4 color bands EIA chuẩn
 *   - Potentiometer      Rotary body với knob + shaft + 3 pins
 *   - DHT22Sensor        White rectangular sensor với grille mặt trước
 *   - ServoMotor         Blue rectangular body với output arm
 */
import type { ReactNode } from 'react'

// ─── Types ─────────────────────────────────────────────────────────
export type LEDColor = 'red' | 'yellow' | 'green' | 'blue' | 'white' | 'orange'

const LED_COLORS: Record<LEDColor, { dome: string; glow: string; lit: string }> = {
  red:    { dome: '#dc2626', glow: '#fca5a5', lit: '#fef2f2' },
  yellow: { dome: '#eab308', glow: '#fde047', lit: '#fefce8' },
  green:  { dome: '#16a34a', glow: '#86efac', lit: '#f0fdf4' },
  blue:   { dome: '#2563eb', glow: '#93c5fd', lit: '#eff6ff' },
  white:  { dome: '#e5e7eb', glow: '#f3f4f6', lit: '#ffffff' },
  orange: { dome: '#ea580c', glow: '#fdba74', lit: '#fff7ed' },
}

// ─── LED — 5mm dome ──────────────────────────────────────────────
/**
 * LED 5mm chuẩn: dome trong + flange (vành) + 2 leads (chân dài = anode,
 * chân ngắn = cathode). Khi `on=true`: phát glow + dome đổi màu sáng.
 *
 * Render trong SVG, tâm tại (cx, cy). Kích thước ~30x40 px (chưa kể leads).
 */
export function LED({
  cx, cy, on, color = 'red', label, brightness = 1,
}: { cx: number; cy: number; on: boolean; color?: LEDColor; label?: string; brightness?: number }) {
  const c = LED_COLORS[color]
  const litness = on ? brightness : 0
  const fill = on
    ? `color-mix(in srgb, ${c.lit} ${litness * 50}%, ${c.dome} ${100 - litness * 50}%)`
    : `color-mix(in srgb, ${c.dome} 35%, #1e293b 65%)`
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Glow halo (chỉ hiển thị khi ON) */}
      {on && (
        <circle r={18} fill={c.glow} opacity={0.4 * litness}>
          <animate attributeName="r" values={`14;${16 + litness * 4};14`} dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Leads (chân) */}
      <line x1={-4} y1={6} x2={-4} y2={18} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={4}  y1={6} x2={4}  y2={22} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Flange (vành đáy) */}
      <ellipse cx={0} cy={6} rx={9} ry={2.5} fill="#475569" />
      <rect x={-9} y={3} width={18} height={4} fill="#374151" rx={1} />
      {/* Dome (mái vòm trong) */}
      <ellipse cx={0} cy={-1} rx={8} ry={9} fill={fill}
        stroke={on ? c.dome : '#475569'} strokeWidth={1.2} />
      {/* Reflection highlight bên trong dome */}
      <ellipse cx={-2.5} cy={-3.5} rx={2.5} ry={3.5} fill="rgba(255,255,255,0.55)" />
      {/* Inner glow filament khi ON */}
      {on && (
        <circle cx={0} cy={-1} r={3} fill={c.lit} opacity={0.85}>
          <animate attributeName="opacity" values={`0.6;${0.9 * litness};0.6`} dur="0.8s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Label */}
      {label && (
        <text y={-14} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Push button — tactile switch ────────────────────────────────
/**
 * Tactile switch vuông 6mm với 4 chân + cap nhấn ở giữa. Khi `pressed=true`
 * cap chuyển xuống + đổi màu xanh (active).
 */
export function PushButton({
  cx, cy, pressed, label,
}: { cx: number; cy: number; pressed: boolean; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`} style={{ cursor: 'pointer' }}>
      {/* Body */}
      <rect x={-12} y={-12} width={24} height={24} rx={2} fill="#1e293b" stroke="#475569" strokeWidth={1.2} />
      {/* 4 chân ở 4 góc */}
      <circle cx={-9} cy={-12} r={1.5} fill="#94a3b8" />
      <circle cx={9}  cy={-12} r={1.5} fill="#94a3b8" />
      <circle cx={-9} cy={12}  r={1.5} fill="#94a3b8" />
      <circle cx={9}  cy={12}  r={1.5} fill="#94a3b8" />
      {/* Cap (nút nhấn) */}
      <circle r={pressed ? 6 : 7}
        fill={pressed ? '#16a34a' : '#fbbf24'}
        stroke={pressed ? '#15803d' : '#d97706'}
        strokeWidth={1.5}
        style={{ transition: 'all 0.1s' }}
      />
      {/* Inner ring for 3D effect */}
      <circle r={3} fill="none" stroke={pressed ? '#15803d' : '#d97706'} strokeWidth={0.8} opacity={0.6} />
      {/* Label */}
      {label && (
        <text y={22} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Resistor — color band axial ─────────────────────────────────
/**
 * Resistor axial chuẩn EIA: thân vàng nâu với 4 color bands tương ứng giá trị.
 * 220Ω = đỏ-đỏ-nâu-vàng; 10kΩ = nâu-đen-cam-vàng; mặc định là 220Ω.
 */
const EIA_COLORS: Record<string, string> = {
  black:  '#000000', brown: '#78350f', red:    '#dc2626', orange: '#ea580c',
  yellow: '#eab308', green: '#16a34a', blue:   '#2563eb', violet: '#7c3aed',
  gray:   '#6b7280', white: '#f3f4f6', gold:   '#fbbf24', silver: '#cbd5e1',
}

export function Resistor({
  cx, cy, bands = ['red', 'red', 'brown', 'gold'], label,
}: { cx: number; cy: number; bands?: string[]; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Leads */}
      <line x1={-26} y1={0} x2={-12} y2={0} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={12}  y1={0} x2={26}  y2={0} stroke="#94a3b8" strokeWidth={1.5} />
      {/* Body (cylinder side view với gradient sáng) */}
      <rect x={-13} y={-5} width={26} height={10} rx={5} fill="#fbbf24" stroke="#a16207" strokeWidth={0.8} />
      <rect x={-13} y={-5} width={26} height={4} rx={2} fill="rgba(255,255,255,0.25)" />
      {/* 4 color bands */}
      {bands.slice(0, 4).map((b, i) => (
        <rect
          key={i}
          x={-9 + i * 5}
          y={-5}
          width={2.5}
          height={10}
          fill={EIA_COLORS[b] || '#000'}
        />
      ))}
      {/* Label */}
      {label && (
        <text y={-10} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Potentiometer ───────────────────────────────────────────────
/**
 * Rotary potentiometer dạng tròn với knob (núm vặn) + 3 chân.
 * `value` 0-1 → góc xoay 0-270°.
 */
export function Potentiometer({
  cx, cy, value, label,
}: { cx: number; cy: number; value: number; label?: string }) {
  const angle = -135 + value * 270   // -135° đến 135°
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Base (body) */}
      <rect x={-16} y={-16} width={32} height={32} rx={2} fill="#475569" stroke="#1e293b" strokeWidth={1} />
      {/* 3 chân (terminals) phía trên */}
      <rect x={-12} y={-22} width={2} height={6} fill="#94a3b8" />
      <rect x={-1}  y={-22} width={2} height={6} fill="#94a3b8" />
      <rect x={10}  y={-22} width={2} height={6} fill="#94a3b8" />
      {/* Knob */}
      <circle r={13} fill="#1e293b" stroke="#374151" strokeWidth={1.5} />
      <circle r={11} fill="#334155" />
      {/* Indicator line */}
      <line
        x1={0} y1={0}
        x2={Math.cos((angle - 90) * Math.PI / 180) * 9}
        y2={Math.sin((angle - 90) * Math.PI / 180) * 9}
        stroke="#fbbf24" strokeWidth={2.5} strokeLinecap="round"
      />
      <circle r={2} fill="#fbbf24" />
      {/* Dot markers */}
      {[0, 0.25, 0.5, 0.75, 1].map((v, i) => {
        const a = -135 + v * 270
        const rad = (a - 90) * Math.PI / 180
        return (
          <circle key={i} cx={Math.cos(rad) * 17} cy={Math.sin(rad) * 17} r={0.8} fill="#64748b" />
        )
      })}
      {label && (
        <text y={30} textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  )
}

// ─── Arduino UNO PCB ─────────────────────────────────────────────
/**
 * Vẽ PCB Arduino UNO chi tiết với layout chuẩn:
 *   - USB-B port góc trên trái
 *   - Power jack DC barrel góc dưới trái
 *   - ATmega328P chip ở giữa (28-pin DIP)
 *   - 16MHz crystal vàng bên cạnh ATmega
 *   - Reset button đen góc trên gần USB
 *   - ICSP header 2x3 pins phía phải
 *   - Power header 8 pins dưới
 *   - Analog header A0-A5 (6 pins) dưới
 *   - Digital header D0-D7 (8 pins) trên
 *   - Digital header D8-D13 (6 pins) + AREF + GND + SDA trên
 *   - LED indicators: PWR (xanh), L (vàng pin 13 - render từ ngoài),
 *     RX/TX (vàng cạnh USB)
 *
 * Có thể đặt children vào trong (như external LEDs nối vào pins).
 * width=540 height=360 (viewBox), board outline ở (30,30) – (510,330).
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
      {/* PCB outline (rounded rect, teal-green typical Arduino UNO) */}
      <defs>
        <linearGradient id="pcbGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#134e4a" />
        </linearGradient>
        <pattern id="pcbTrace" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.3" fill="rgba(34,197,94,0.15)" />
        </pattern>
      </defs>
      <rect x={30} y={30} width={480} height={300} rx={10}
        fill="url(#pcbGrad)" stroke="#14532d" strokeWidth={2} />
      <rect x={30} y={30} width={480} height={300} rx={10}
        fill="url(#pcbTrace)" />

      {/* Mounting holes (4 góc) */}
      {[[50, 50], [490, 50], [50, 310], [490, 310]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={6} fill="#0f172a" />
          <circle cx={x} cy={y} r={3.5} fill="#475569" />
        </g>
      ))}

      {/* USB-B port (top-left) */}
      <g>
        <rect x={28} y={70} width={46} height={42} fill="#94a3b8" stroke="#475569" strokeWidth={1} />
        <rect x={30} y={74} width={42} height={34} fill="#cbd5e1" />
        <rect x={36} y={80} width={30} height={22} fill="#1e293b" />
        <rect x={40} y={84} width={22} height={14} fill="#374151" />
        <text x={51} y={130} textAnchor="middle" fill="#86efac" fontSize="7" fontFamily="monospace">USB</text>
      </g>

      {/* DC Power jack (bottom-left) */}
      <g>
        <rect x={28} y={235} width={40} height={32} rx={4} fill="#1e293b" stroke="#475569" strokeWidth={1} />
        <circle cx={48} cy={251} r={10} fill="#0f172a" stroke="#374151" strokeWidth={1.5} />
        <circle cx={48} cy={251} r={3.5} fill="#475569" />
        <text x={48} y={280} textAnchor="middle" fill="#86efac" fontSize="7" fontFamily="monospace">DC 9V</text>
      </g>

      {/* ATmega328P chip (28-pin DIP, center) */}
      <g>
        <rect x={180} y={150} width={130} height={55} rx={2} fill="#111827" stroke="#374151" strokeWidth={1} />
        {/* Pin holes left + right */}
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i}>
            <rect x={177} y={155 + i * 3.5} width={4} height={1.8} fill="#94a3b8" />
            <rect x={309} y={155 + i * 3.5} width={4} height={1.8} fill="#94a3b8" />
          </g>
        ))}
        {/* Notch top */}
        <rect x={240} y={148} width={10} height={3} rx={1} fill="#1f2937" />
        {/* Chip label */}
        <text x={245} y={172} textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="bold" fontFamily="monospace">ATmega328P</text>
        <text x={245} y={184} textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">A 1640</text>
        <text x={245} y={194} textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontFamily="monospace">© Arduino</text>
        {/* Pin 1 indicator (dot) */}
        <circle cx={186} cy={156} r={1.2} fill="#fbbf24" />
      </g>

      {/* 16MHz Crystal oscillator (gold can next to chip) */}
      <g>
        <rect x={325} y={170} width={28} height={14} rx={3} fill="#fbbf24" stroke="#a16207" strokeWidth={0.8} />
        <text x={339} y={180} textAnchor="middle" fill="#1f2937" fontSize="6" fontWeight="bold" fontFamily="monospace">16MHz</text>
      </g>

      {/* Reset button (black tactile near USB) */}
      <g>
        <rect x={88} y={86} width={14} height={14} rx={1} fill="#1e293b" stroke="#374151" strokeWidth={1} />
        <circle cx={95} cy={93} r={3} fill="#475569" />
        <circle cx={95} cy={93} r={1.5} fill="#94a3b8" />
        <text x={95} y={114} textAnchor="middle" fill="#86efac" fontSize="6" fontFamily="monospace">RST</text>
      </g>

      {/* ICSP header 2x3 (right side) */}
      <g>
        <rect x={420} y={130} width={20} height={28} rx={1} fill="#1e293b" stroke="#475569" strokeWidth={1} />
        {[0, 1, 2].map(r =>
          [0, 1].map(c => (
            <rect key={`${r}-${c}`} x={424 + c * 8} y={134 + r * 8} width={4} height={4} fill="#94a3b8" />
          ))
        )}
        <text x={430} y={170} textAnchor="middle" fill="#86efac" fontSize="6" fontFamily="monospace">ICSP</text>
      </g>

      {/* TX/RX LED indicators (small yellow LEDs near USB) */}
      <g>
        {/* TX */}
        <circle cx={108} cy={106} r={3}
          fill={pinStates[1]?.value ? '#fde047' : '#475569'}
          stroke={pinStates[1]?.value ? '#facc15' : '#374151'}
          strokeWidth={0.8}
        />
        <text x={108} y={120} textAnchor="middle" fill="#fde047" fontSize="5.5" fontFamily="monospace">TX</text>
        {/* RX */}
        <circle cx={123} cy={106} r={3}
          fill={pinStates[0]?.value ? '#fde047' : '#475569'}
          stroke={pinStates[0]?.value ? '#facc15' : '#374151'}
          strokeWidth={0.8}
        />
        <text x={123} y={120} textAnchor="middle" fill="#fde047" fontSize="5.5" fontFamily="monospace">RX</text>
      </g>

      {/* Power LED (green) - always on */}
      <g>
        <circle cx={140} cy={106} r={3.5} fill="#22c55e" stroke="#15803d" strokeWidth={0.8}
          style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }}
        />
        <text x={140} y={120} textAnchor="middle" fill="#86efac" fontSize="5.5" fontFamily="monospace">PWR</text>
      </g>

      {/* Built-in L LED at pin 13 */}
      <g>
        <circle cx={160} cy={106} r={3.5}
          fill={pinStates[13]?.value ? '#fde047' : '#475569'}
          stroke="#facc15" strokeWidth={0.8}
          style={{ filter: pinStates[13]?.value ? 'drop-shadow(0 0 8px #fbbf24)' : 'none' }}
        />
        <text x={160} y={120} textAnchor="middle" fill="#fde047" fontSize="5.5" fontFamily="monospace">L</text>
      </g>

      {/* Digital pin header — top row (D8 to AREF, 8 pins) */}
      <g>
        {/* Black plastic strip */}
        <rect x={185} y={60} width={250} height={14} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        {/* 10 pins for D8-D13 + GND + AREF + SDA + SCL */}
        {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((pin, i) => {
          const x = 192 + i * 24
          const labelPin = pin >= 14 ? ['GND', 'AREF', 'SDA', 'SCL'][pin - 14] : `D${pin}`
          const isPin = pin < 14
          const v = isPin && pinStates[pin] ? pinStates[pin].value : 0
          const on = isPin && (pinStates[pin]?.kind === 'pwm' ? v > 8 : v > 0)
          return (
            <g key={pin}
              onClick={isPin && onPinClick ? () => onPinClick(pin) : undefined}
              style={{ cursor: isPin && onPinClick ? 'pointer' : 'default' }}
            >
              <rect x={x - 5} y={62} width={10} height={10} rx={1}
                fill={on ? '#facc15' : '#1e293b'}
                stroke={on ? '#fbbf24' : '#475569'}
                strokeWidth={0.8}
              />
              {/* Pin hole metal */}
              <circle cx={x} cy={67} r={2.2}
                fill={on ? '#fde047' : '#475569'}
                stroke="#1e293b" strokeWidth={0.5}
              />
              {/* Pin label below board (on PCB silkscreen) */}
              <text x={x} y={84} textAnchor="middle"
                fill={isPin && [3, 5, 6, 9, 10, 11].includes(pin) ? '#fbbf24' : '#86efac'}
                fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                {labelPin}
                {isPin && [3, 5, 6, 9, 10, 11].includes(pin) && '~'}
              </text>
            </g>
          )
        })}
      </g>

      {/* Digital pin header — bottom-left (D0-D7) */}
      <g>
        <rect x={185} y={272} width={196} height={14} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        {[7, 6, 5, 4, 3, 2, 1, 0].map((pin, i) => {
          const x = 192 + i * 24
          const v = pinStates[pin]?.value || 0
          const on = pinStates[pin]?.kind === 'pwm' ? v > 8 : v > 0
          return (
            <g key={pin}
              onClick={onPinClick ? () => onPinClick(pin) : undefined}
              style={{ cursor: onPinClick ? 'pointer' : 'default' }}
            >
              <rect x={x - 5} y={274} width={10} height={10} rx={1}
                fill={on ? '#facc15' : '#1e293b'}
                stroke={on ? '#fbbf24' : '#475569'}
                strokeWidth={0.8}
              />
              <circle cx={x} cy={279} r={2.2}
                fill={on ? '#fde047' : '#475569'}
                stroke="#1e293b" strokeWidth={0.5}
              />
              <text x={x} y={266} textAnchor="middle"
                fill={[3, 5, 6, 9, 10, 11].includes(pin) ? '#fbbf24' : '#86efac'}
                fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                D{pin}{[3, 5, 6, 9, 10, 11].includes(pin) && '~'}
              </text>
              {pin === 0 && <text x={x + 12} y={266} fill="#94a3b8" fontSize="5.5" fontFamily="monospace">RX</text>}
              {pin === 1 && <text x={x + 12} y={266} fill="#94a3b8" fontSize="5.5" fontFamily="monospace">TX</text>}
            </g>
          )
        })}
      </g>

      {/* Analog pin header (A0-A5, bottom-right) */}
      <g>
        <rect x={385} y={272} width={120} height={14} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        {[0, 1, 2, 3, 4, 5].map(i => {
          const realPin = 14 + i
          const x = 392 + i * 18
          const v = pinStates[realPin]?.value || 0
          const intensity = v / 1023
          return (
            <g key={i}>
              <rect x={x - 4} y={274} width={8} height={10} rx={1}
                fill={`rgba(167,139,250,${0.2 + intensity * 0.7})`}
                stroke="#a78bfa"
                strokeWidth={0.6}
              />
              <circle cx={x} cy={279} r={1.8}
                fill={`rgba(196,181,253,${0.4 + intensity * 0.5})`}
                stroke="#1e293b" strokeWidth={0.4}
              />
              <text x={x} y={266} textAnchor="middle" fill="#c4b5fd" fontSize="6.5" fontFamily="monospace" fontWeight="bold">
                A{i}
              </text>
            </g>
          )
        })}
      </g>

      {/* Power pin header (bottom-left below) — VIN/GND/5V/3V3 */}
      <g>
        <rect x={88} y={272} width={86} height={14} rx={2} fill="#0f172a" stroke="#1e293b" strokeWidth={1} />
        {['IOREF', 'RST', '3V3', '5V', 'GND', 'GND', 'VIN'].slice(0, 7).map((lab, i) => {
          const x = 95 + i * 12
          return (
            <g key={lab + i}>
              <circle cx={x} cy={279} r={1.8} fill="#94a3b8" stroke="#1e293b" strokeWidth={0.4} />
              <text x={x} y={266} textAnchor="middle" fill="#86efac" fontSize="5" fontFamily="monospace">
                {lab}
              </text>
            </g>
          )
        })}
      </g>

      {/* Arduino logo text bottom */}
      <text x={420} y={325} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="sans-serif" fontStyle="italic">
        Made with Arduino-compatible
      </text>
      <text x={420} y={335} textAnchor="middle" fill="rgba(34,197,94,0.5)" fontSize="7" fontFamily="monospace">
        AERO·EDU UNO R3
      </text>

      {/* Capacitor (electrolytic, gold can) near power jack */}
      <g>
        <circle cx={95} cy={200} r={9} fill="#1f2937" stroke="#374151" strokeWidth={1} />
        <circle cx={95} cy={200} r={7} fill="#7c2d12" />
        <line x1={88} y1={200} x2={102} y2={200} stroke="#fbbf24" strokeWidth={0.8} />
        <text x={95} y={203} textAnchor="middle" fill="#fef9c3" fontSize="5" fontWeight="bold">+</text>
      </g>

      {/* Voltage regulator */}
      <g>
        <rect x={84} y={155} width={22} height={28} fill="#1f2937" stroke="#374151" strokeWidth={1} />
        <rect x={87} y={158} width={16} height={3} fill="#374151" />
        <text x={95} y={175} textAnchor="middle" fill="#cbd5e1" fontSize="5" fontFamily="monospace">7805</text>
      </g>

      {/* Render children (external components linked to pins) */}
      {children}
    </g>
  )
}

// ─── DHT22 sensor ────────────────────────────────────────────────
export function DHT22Sensor({ cx, cy, label }: { cx: number; cy: number; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      <rect x={-15} y={-18} width={30} height={36} rx={2} fill="#f3f4f6" stroke="#9ca3af" strokeWidth={1} />
      {/* Grille (sensor mesh) */}
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

// ─── Servo motor SG90 ────────────────────────────────────────────
export function ServoMotor({ cx, cy, angle = 0, label }: { cx: number; cy: number; angle?: number; label?: string }) {
  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Body */}
      <rect x={-15} y={-10} width={30} height={20} rx={2} fill="#1e40af" stroke="#1e3a8a" strokeWidth={1} />
      <text x={0} y={2} textAnchor="middle" fill="#dbeafe" fontSize="5" fontFamily="monospace" fontWeight="bold">SG90</text>
      {/* Output shaft */}
      <circle cx={0} cy={-14} r={5} fill="#fbbf24" stroke="#a16207" strokeWidth={1} />
      <circle cx={0} cy={-14} r={2} fill="#1f2937" />
      {/* Servo arm (rotates with angle) */}
      <g transform={`rotate(${angle - 90} 0 -14)`}>
        <rect x={-1.5} y={-14 - 18} width={3} height={18} fill="#f3f4f6" rx={1} />
        <circle cx={0} cy={-14 - 16} r={1.5} fill="#1f2937" />
      </g>
      {/* 3 cables (orange/red/brown) */}
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
/**
 * Breadboard mini với power rails + tie-point grid. Dùng làm background
 * cho external components.
 */
export function Breadboard({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const rows = Math.floor(height / 6)
  const cols = Math.floor(width / 6)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={3} fill="#fef9c3" stroke="#a16207" strokeWidth={1} />
      {/* Power rails (red/blue lines top + bottom) */}
      <line x1={x + 4} y1={y + 4} x2={x + width - 4} y2={y + 4} stroke="#dc2626" strokeWidth={0.8} />
      <line x1={x + 4} y1={y + height - 4} x2={x + width - 4} y2={y + height - 4} stroke="#2563eb" strokeWidth={0.8} />
      {/* Tie-point grid */}
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
