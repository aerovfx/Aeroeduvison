/**
 * AnalogCircuitBuilder — Tự lắp ghép mạch điện analog
 *
 * Kéo linh kiện từ palette vào canvas SVG, click 2 terminal để vẽ dây nối,
 * bấm "Mô phỏng" để chạy graph traversal + Ohm's law:
 *
 *   - BFS từ pin + → pin -: tìm path qua resistor + LED
 *   - I = V / R_total
 *   - LED sáng nếu I > threshold, cháy nếu I > LED rating
 *   - Đoản mạch (chỉ pin + wire) → cảnh báo nguy hiểm
 *
 * Mọi state local — không gọi backend. Lưu localStorage cho phép save/load
 * mạch tự thiết kế. Có sẵn 5 template mạch mẫu để tải nhanh.
 */
import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import {
  Zap, Plus, Trash2, Save, Play, Pause, RotateCw, MousePointer,
  Cable, FolderOpen, BookOpen, AlertTriangle, CheckCircle2,
  XCircle, Lightbulb, ChevronDown,
  FlaskConical, LineChart,
} from 'lucide-react'

// ───────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────

type ComponentType =
  | 'battery_9v'
  | 'battery_aa'
  | 'led_red'
  | 'led_blue'
  | 'led_green'
  | 'resistor'
  | 'switch'
  | 'inductor'
  | 'capacitor'
  | 'buzzer'
  | 'potentiometer'
  | 'ground'
  | 'ammeter'
  | 'voltmeter'
  | 'emf_cell'

interface PlacedComponent {
  id: string
  type: ComponentType
  x: number
  y: number
  value?: number       // ohms (resistor/pot), volts (battery), μF (cap), mH (inductor)
  rotation: 0 | 90 | 180 | 270
  on?: boolean         // for switch
  emf?: number         // EMF for emf_cell (V)
  internalR?: number   // internal resistance for emf_cell (Ω)
  reading?: number     // measured value for ammeter (A) / voltmeter (V)
}

interface Point2 {
  x: number
  y: number
}

interface Wire {
  id: string
  fromId: string
  fromTerminal: 'a' | 'b'
  toId: string
  toTerminal: 'a' | 'b'
  /**
   * Intermediate waypoints between fromTerminal and toTerminal.
   * Tất cả snap vào grid 20px. Khi user click trên dây thì insert waypoint
   * tại vị trí click; double-click waypoint để xoá; drag để di chuyển.
   * Nếu undefined hoặc rỗng → auto Manhattan-route bằng autoRouteWaypoints().
   */
  waypoints?: Point2[]
}

type Mode = 'select' | 'wire' | 'delete'

interface SimResult {
  ok: boolean
  message: string
  level: 'success' | 'warn' | 'error' | 'info'
  current?: number     // amps
  ledStates: Record<string, 'off' | 'on' | 'burnt'>
  /**
   * Readings keyed by componentId.
   *   - ammeter: current (A) through it
   *   - voltmeter: voltage (V) across its terminals
   */
  meterReadings?: Record<string, number>
}

interface SavedCircuit {
  name: string
  savedAt: number
  components: PlacedComponent[]
  wires: Wire[]
}

// ───────────────────────────────────────────────────────────────────
// Palette config
// ───────────────────────────────────────────────────────────────────

interface PaletteItem {
  type: ComponentType
  label: string
  emoji: string
  defaultValue?: number
  unit?: string
  hint?: string
}

const PALETTE: PaletteItem[] = [
  { type: 'battery_9v',    label: 'Pin 9V',       emoji: '🔋', defaultValue: 9,    unit: 'V',  hint: 'Nguồn 9V (pin vuông)' },
  { type: 'battery_aa',    label: 'Pin AA 1.5V',  emoji: '🪫', defaultValue: 1.5,  unit: 'V',  hint: 'Nguồn 1.5V' },
  { type: 'emf_cell',      label: 'Pin điện hoá (ξ,r)', emoji: '🧪', defaultValue: 1.5, unit: 'V', hint: 'Nguồn có ξ + nội trở r (SGK)' },
  { type: 'led_red',       label: 'LED đỏ',       emoji: '🟥', hint: 'Vf ~2V, If 20mA' },
  { type: 'led_blue',      label: 'LED xanh dương', emoji: '🟦', hint: 'Vf ~3V, If 20mA' },
  { type: 'led_green',     label: 'LED xanh lá',  emoji: '🟩', hint: 'Vf ~2.1V, If 20mA' },
  { type: 'resistor',      label: 'Điện trở',     emoji: '⚡', defaultValue: 220,  unit: 'Ω',  hint: 'Hạn dòng cho LED' },
  { type: 'switch',        label: 'Công tắc',     emoji: '🔘', hint: 'Click sau khi đặt để bật/tắt' },
  { type: 'inductor',      label: 'Cuộn cảm',     emoji: '🌀', defaultValue: 10,   unit: 'mH', hint: 'Cảm kháng (DC ~ dây)' },
  { type: 'capacitor',     label: 'Tụ điện',      emoji: '⚙️', defaultValue: 100,  unit: 'μF', hint: 'DC steady state: hở' },
  { type: 'buzzer',        label: 'Loa buzzer',   emoji: '🔔', hint: 'Còi báo (R~16Ω)' },
  { type: 'potentiometer', label: 'Biến trở',     emoji: '🔧', defaultValue: 500,  unit: 'Ω',  hint: 'Chỉnh được 0-1kΩ' },
  { type: 'ammeter',       label: 'Ampe kế (A)',  emoji: '🔵', hint: 'Đo dòng — mắc nối tiếp' },
  { type: 'voltmeter',     label: 'Vôn kế (V)',   emoji: '🟢', hint: 'Đo áp — mắc song song' },
  { type: 'ground',        label: 'Đất (GND)',    emoji: '🌐', hint: '0V tham chiếu' },
]

// ───────────────────────────────────────────────────────────────────
// Component dimensions / terminal offsets (rotation = 0)
// ───────────────────────────────────────────────────────────────────

interface CompGeometry {
  w: number              // bounding box width
  h: number              // bounding box height
  termA: { x: number; y: number }
  termB: { x: number; y: number }
}

const GEOM: Record<ComponentType, CompGeometry> = {
  battery_9v:    { w: 70, h: 40, termA: { x: 0, y: 20 }, termB: { x: 70, y: 20 } },
  battery_aa:    { w: 70, h: 40, termA: { x: 0, y: 20 }, termB: { x: 70, y: 20 } },
  emf_cell:      { w: 80, h: 50, termA: { x: 0, y: 25 }, termB: { x: 80, y: 25 } },
  led_red:       { w: 60, h: 40, termA: { x: 0, y: 20 }, termB: { x: 60, y: 20 } },
  led_blue:      { w: 60, h: 40, termA: { x: 0, y: 20 }, termB: { x: 60, y: 20 } },
  led_green:     { w: 60, h: 40, termA: { x: 0, y: 20 }, termB: { x: 60, y: 20 } },
  resistor:      { w: 80, h: 40, termA: { x: 0, y: 20 }, termB: { x: 80, y: 20 } },
  switch:        { w: 70, h: 40, termA: { x: 0, y: 20 }, termB: { x: 70, y: 20 } },
  inductor:      { w: 80, h: 40, termA: { x: 0, y: 20 }, termB: { x: 80, y: 20 } },
  capacitor:     { w: 60, h: 40, termA: { x: 0, y: 20 }, termB: { x: 60, y: 20 } },
  buzzer:        { w: 60, h: 50, termA: { x: 0, y: 25 }, termB: { x: 60, y: 25 } },
  potentiometer: { w: 90, h: 50, termA: { x: 0, y: 30 }, termB: { x: 90, y: 30 } },
  ammeter:       { w: 60, h: 40, termA: { x: 0, y: 20 }, termB: { x: 60, y: 20 } },
  voltmeter:     { w: 50, h: 60, termA: { x: 25, y: 0 }, termB: { x: 25, y: 60 } },
  ground:        { w: 50, h: 50, termA: { x: 25, y: 0 }, termB: { x: 25, y: 0 } }, // single terminal
}

// LED characteristics for sim
const LED_VF: Record<string, number> = {
  led_red: 2.0,
  led_blue: 3.0,
  led_green: 2.1,
}
const LED_IF_NOMINAL = 0.02   // 20 mA
const LED_IF_MAX = 0.030      // 30 mA → cháy
const LED_IF_MIN = 0.003      // 3 mA → mới bắt đầu sáng

// ───────────────────────────────────────────────────────────────────
// Utilities — rotate terminals
// ───────────────────────────────────────────────────────────────────

function rotatePoint(p: { x: number; y: number }, w: number, h: number, deg: 0 | 90 | 180 | 270) {
  switch (deg) {
    case 0:   return p
    case 90:  return { x: h - p.y, y: p.x }
    case 180: return { x: w - p.x, y: h - p.y }
    case 270: return { x: p.y,     y: w - p.x }
  }
}

function rotatedSize(g: CompGeometry, deg: 0 | 90 | 180 | 270) {
  if (deg === 90 || deg === 270) return { w: g.h, h: g.w }
  return { w: g.w, h: g.h }
}

function getTerminalPos(c: PlacedComponent, term: 'a' | 'b') {
  const g = GEOM[c.type]
  const p = term === 'a' ? g.termA : g.termB
  const r = rotatePoint(p, g.w, g.h, c.rotation)
  return { x: c.x + r.x, y: c.y + r.y }
}

function snapToGrid(v: number, grid = 20) {
  return Math.round(v / grid) * grid
}

function snapPoint(p: Point2): Point2 {
  return { x: snapToGrid(p.x), y: snapToGrid(p.y) }
}

function newId() {
  return Math.random().toString(36).slice(2, 9)
}

// ───────────────────────────────────────────────────────────────────
// Wire routing — Manhattan (orthogonal) path
// ───────────────────────────────────────────────────────────────────

/**
 * Tự sinh waypoint giữa 2 terminal tạo dáng Z vuông góc (Manhattan).
 * Dùng khi user chưa custom waypoints — kết quả thẩm mỹ hơn line thẳng chéo.
 */
function autoRouteWaypoints(p1: Point2, p2: Point2): Point2[] {
  // Đã thẳng theo trục → không cần waypoint
  if (p1.x === p2.x || p1.y === p2.y) return []
  const dx = Math.abs(p2.x - p1.x)
  const dy = Math.abs(p2.y - p1.y)
  // dx > dy → đi ngang chủ đạo, chia ở giữa theo X (Z nằm ngang)
  // ngược lại → đi dọc chủ đạo, chia ở giữa theo Y (Z thẳng đứng)
  if (dx >= dy) {
    const midX = snapToGrid((p1.x + p2.x) / 2)
    return [{ x: midX, y: p1.y }, { x: midX, y: p2.y }]
  } else {
    const midY = snapToGrid((p1.y + p2.y) / 2)
    return [{ x: p1.x, y: midY }, { x: p2.x, y: midY }]
  }
}

/**
 * Full điểm path = [p1, ...waypoints, p2]. Mỗi đoạn giữa 2 điểm liên tiếp,
 * nếu chưa thẳng trục thì tự thêm corner để bend 90° (horizontal-first).
 */
function expandOrthogonal(pts: Point2[]): Point2[] {
  if (pts.length < 2) return pts
  const out: Point2[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1]
    const b = pts[i]
    if (a.x !== b.x && a.y !== b.y) {
      // Thêm corner trung gian — horizontal first (giống bo mạch PCB)
      out.push({ x: b.x, y: a.y })
    }
    out.push(b)
  }
  return out
}

function buildOrthogonalPath(p1: Point2, p2: Point2, waypoints: Point2[]): string {
  const raw = [p1, ...waypoints, p2]
  const expanded = expandOrthogonal(raw)
  return expanded.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
}

/** Khoảng cách điểm tới đoạn thẳng — để chọn segment khi insert waypoint. */
function distToSegment(p: Point2, a: Point2, b: Point2): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

// ───────────────────────────────────────────────────────────────────
// Component SVG symbols (drawn in original orientation, rotated via <g>)
// ───────────────────────────────────────────────────────────────────

function ComponentSymbol({ c, isSelected, isLit, ledOn, ledBurnt, reading }: {
  c: PlacedComponent
  isSelected: boolean
  isLit: boolean      // for bulb-style
  ledOn: boolean
  ledBurnt: boolean
  reading?: number    // measured value for ammeter / voltmeter
}) {
  const g = GEOM[c.type]
  const t = c.type

  const stroke = isSelected ? '#22d3ee' : '#cbd5e1'
  const sw = isSelected ? 2.5 : 1.8

  const led = (color: string) => {
    const fill =
      ledBurnt ? '#1f2937' :
      ledOn    ? color    : '#374151'
    const glow = ledOn && !ledBurnt
    return (
      <>
        {glow && (
          <circle cx={30} cy={20} r={18} fill={color} opacity={0.35}>
            <animate attributeName="r" values="14;20;14" dur="1.2s" repeatCount="indefinite" />
          </circle>
        )}
        <line x1={0}  y1={20} x2={15} y2={20} stroke={stroke} strokeWidth={sw} />
        <line x1={45} y1={20} x2={60} y2={20} stroke={stroke} strokeWidth={sw} />
        <polygon points="15,8 15,32 35,20" fill={fill} stroke={stroke} strokeWidth={1.5} />
        <line x1={35} y1={8} x2={35} y2={32} stroke={stroke} strokeWidth={sw} />
        {/* light ray arrows */}
        {ledOn && !ledBurnt && (
          <>
            <line x1={20} y1={4}  x2={28} y2={-3} stroke={color} strokeWidth={1.5} />
            <line x1={28} y1={4}  x2={36} y2={-3} stroke={color} strokeWidth={1.5} />
            <polygon points="28,-3 24,-1 26,-6" fill={color} />
            <polygon points="36,-3 32,-1 34,-6" fill={color} />
          </>
        )}
        {ledBurnt && (
          <text x={30} y={48} textAnchor="middle" fontSize={9} fill="#f87171">🔥 cháy</text>
        )}
      </>
    )
  }

  switch (t) {
    case 'battery_9v':
    case 'battery_aa': {
      const volts = c.value ?? (t === 'battery_9v' ? 9 : 1.5)
      return (
        <>
          <line x1={0}  y1={20} x2={28} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={42} y1={20} x2={70} y2={20} stroke={stroke} strokeWidth={sw} />
          {/* long line = + */}
          <line x1={28} y1={6}  x2={28} y2={34} stroke={stroke} strokeWidth={2.5} />
          {/* short line = - */}
          <line x1={42} y1={12} x2={42} y2={28} stroke={stroke} strokeWidth={2.5} />
          <text x={24} y={4}  fontSize={9} fill="#fbbf24" textAnchor="end">+</text>
          <text x={46} y={4}  fontSize={9} fill="#94a3b8">−</text>
          <text x={35} y={50} textAnchor="middle" fontSize={9} fill="#cbd5e1">
            {volts}V
          </text>
        </>
      )
    }
    case 'led_red':   return led('#ef4444')
    case 'led_blue':  return led('#3b82f6')
    case 'led_green': return led('#22c55e')

    case 'resistor': {
      const r = c.value ?? 220
      // zigzag from x=15 to x=65
      const zig = 'M 15 20 L 22 12 L 30 28 L 38 12 L 46 28 L 54 12 L 62 28 L 65 20'
      return (
        <>
          <line x1={0}  y1={20} x2={15} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={65} y1={20} x2={80} y2={20} stroke={stroke} strokeWidth={sw} />
          <path d={zig} fill="none" stroke={stroke} strokeWidth={sw} />
          <text x={40} y={50} textAnchor="middle" fontSize={9} fill="#cbd5e1">{r}Ω</text>
        </>
      )
    }

    case 'switch': {
      const on = c.on === true
      return (
        <>
          <line x1={0}  y1={20} x2={20} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={50} y1={20} x2={70} y2={20} stroke={stroke} strokeWidth={sw} />
          <circle cx={20} cy={20} r={3} fill={stroke} />
          <circle cx={50} cy={20} r={3} fill={stroke} />
          {/* lever */}
          {on ? (
            <line x1={20} y1={20} x2={50} y2={20} stroke="#22c55e" strokeWidth={2.5} />
          ) : (
            <line x1={20} y1={20} x2={48} y2={6} stroke="#f59e0b" strokeWidth={2.5} />
          )}
          <text x={35} y={50} textAnchor="middle" fontSize={9} fill={on ? '#22c55e' : '#f59e0b'}>
            {on ? 'ĐÓNG' : 'MỞ'}
          </text>
        </>
      )
    }

    case 'inductor': {
      const mH = c.value ?? 10
      // 4 small bumps
      const bumps = 'M 15 20 q 5 -10 10 0 q 5 -10 10 0 q 5 -10 10 0 q 5 -10 10 0'
      return (
        <>
          <line x1={0}  y1={20} x2={15} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={65} y1={20} x2={80} y2={20} stroke={stroke} strokeWidth={sw} />
          <path d={bumps} fill="none" stroke={stroke} strokeWidth={sw} />
          <text x={40} y={50} textAnchor="middle" fontSize={9} fill="#cbd5e1">{mH}mH</text>
        </>
      )
    }

    case 'capacitor': {
      const uF = c.value ?? 100
      return (
        <>
          <line x1={0}  y1={20} x2={26} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={34} y1={20} x2={60} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={26} y1={6}  x2={26} y2={34} stroke={stroke} strokeWidth={2.5} />
          <line x1={34} y1={6}  x2={34} y2={34} stroke={stroke} strokeWidth={2.5} />
          <text x={30} y={50} textAnchor="middle" fontSize={9} fill="#cbd5e1">{uF}μF</text>
        </>
      )
    }

    case 'buzzer': {
      return (
        <>
          <line x1={0}  y1={25} x2={15} y2={25} stroke={stroke} strokeWidth={sw} />
          <line x1={45} y1={25} x2={60} y2={25} stroke={stroke} strokeWidth={sw} />
          <circle cx={30} cy={25} r={14} fill="none" stroke={stroke} strokeWidth={sw} />
          <polygon points="24,18 24,32 36,25" fill={stroke} opacity={isLit ? 1 : 0.5} />
          {isLit && (
            <>
              <text x={30} y={6}  textAnchor="middle" fontSize={10} fill="#f59e0b">♪</text>
              <text x={30} y={50} textAnchor="middle" fontSize={9} fill="#f59e0b">BEEP</text>
            </>
          )}
        </>
      )
    }

    case 'potentiometer': {
      const r = c.value ?? 500
      const zig = 'M 15 30 L 22 22 L 30 38 L 38 22 L 46 38 L 54 22 L 62 38 L 70 22 L 75 30'
      return (
        <>
          <line x1={0}  y1={30} x2={15} y2={30} stroke={stroke} strokeWidth={sw} />
          <line x1={75} y1={30} x2={90} y2={30} stroke={stroke} strokeWidth={sw} />
          <path d={zig} fill="none" stroke={stroke} strokeWidth={sw} />
          {/* arrow on top (wiper) */}
          <line x1={45} y1={4} x2={45} y2={14} stroke="#22d3ee" strokeWidth={2} />
          <polygon points="45,14 41,8 49,8" fill="#22d3ee" />
          <text x={45} y={50} textAnchor="middle" fontSize={9} fill="#cbd5e1">{r}Ω</text>
        </>
      )
    }

    case 'ground': {
      return (
        <>
          <line x1={25} y1={0} x2={25} y2={15} stroke={stroke} strokeWidth={sw} />
          <line x1={8}  y1={18} x2={42} y2={18} stroke={stroke} strokeWidth={2.5} />
          <line x1={14} y1={26} x2={36} y2={26} stroke={stroke} strokeWidth={2.5} />
          <line x1={20} y1={34} x2={30} y2={34} stroke={stroke} strokeWidth={2.5} />
          <text x={25} y={48} textAnchor="middle" fontSize={9} fill="#cbd5e1">GND</text>
        </>
      )
    }

    case 'ammeter': {
      // Circle with "A" letter, horizontal terminals
      // Reading shown in mA below
      const mA = reading !== undefined ? reading * 1000 : null
      return (
        <>
          <line x1={0}  y1={20} x2={15} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={45} y1={20} x2={60} y2={20} stroke={stroke} strokeWidth={sw} />
          <circle cx={30} cy={20} r={14} fill="#0f172a" stroke="#22d3ee" strokeWidth={1.8} />
          <text x={30} y={24.5} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#22d3ee">A</text>
          {mA !== null ? (
            <text x={30} y={50} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#34d399">
              {mA < 1 ? `${(mA * 1000).toFixed(0)} μA` : mA < 1000 ? `${mA.toFixed(1)} mA` : `${(mA / 1000).toFixed(2)} A`}
            </text>
          ) : (
            <text x={30} y={50} textAnchor="middle" fontSize={8} fill="#64748b">Ampe kế</text>
          )}
        </>
      )
    }

    case 'voltmeter': {
      // Circle with "V" letter, vertical terminals (top + bottom)
      // Reading shown in V on right side
      const V = reading
      return (
        <>
          <line x1={25} y1={0}  x2={25} y2={12} stroke={stroke} strokeWidth={sw} />
          <line x1={25} y1={48} x2={25} y2={60} stroke={stroke} strokeWidth={sw} />
          <circle cx={25} cy={30} r={14} fill="#0f172a" stroke="#a78bfa" strokeWidth={1.8} />
          <text x={25} y={34.5} textAnchor="middle" fontSize={13} fontWeight="bold" fill="#a78bfa">V</text>
          {V !== undefined ? (
            <text x={45} y={33} fontSize={9} fontWeight="bold" fill="#34d399">
              {V.toFixed(2)} V
            </text>
          ) : (
            <text x={45} y={33} fontSize={8} fill="#64748b">Vôn kế</text>
          )}
        </>
      )
    }

    case 'emf_cell': {
      // Battery symbol with ξ, r labels — emphasises internal resistance
      const emf = c.emf ?? c.value ?? 1.5
      const rIn = c.internalR ?? 0.5
      return (
        <>
          {/* leads */}
          <line x1={0}  y1={25} x2={28} y2={25} stroke={stroke} strokeWidth={sw} />
          <line x1={52} y1={25} x2={80} y2={25} stroke={stroke} strokeWidth={sw} />
          {/* cell + plate (long) */}
          <line x1={28} y1={8}  x2={28} y2={42} stroke="#fbbf24" strokeWidth={3} />
          {/* cell - plate (short) */}
          <line x1={52} y1={14} x2={52} y2={36} stroke={stroke} strokeWidth={3} />
          {/* polarity */}
          <text x={24} y={6}  fontSize={10} fill="#fbbf24" textAnchor="end" fontWeight="bold">+</text>
          <text x={56} y={6}  fontSize={10} fill="#94a3b8" fontWeight="bold">−</text>
          {/* dashed box highlighting internal-r model */}
          <rect x={22} y={6} width={36} height={38} fill="none" stroke="#fbbf24"
                strokeWidth={0.8} strokeDasharray="2 2" opacity={0.6} />
          {/* labels */}
          <text x={40} y={50} textAnchor="middle" fontSize={9} fill="#fbbf24" fontWeight="bold">
            ξ={emf}V · r={rIn}Ω
          </text>
        </>
      )
    }
  }
}

// ───────────────────────────────────────────────────────────────────
// Templates (mạch mẫu)
// ───────────────────────────────────────────────────────────────────

interface Template {
  id: string
  emoji: string
  name: string
  hint: string
  build: () => { components: PlacedComponent[]; wires: Wire[] }
}

const TEMPLATES: Template[] = [
  {
    id: 'simple-led',
    emoji: '🔆',
    name: 'Mạch đèn LED đơn giản',
    hint: 'Pin 9V + điện trở 220Ω + LED đỏ',
    build: () => {
      const bat = { id: 'bat', type: 'battery_9v' as const, x: 100, y: 120, value: 9, rotation: 0 as const }
      const res = { id: 'res', type: 'resistor' as const,   x: 240, y: 120, value: 220, rotation: 0 as const }
      const led = { id: 'led', type: 'led_red' as const,    x: 380, y: 120, rotation: 0 as const }
      return {
        components: [bat, res, led],
        wires: [
          { id: 'w1', fromId: 'bat', fromTerminal: 'b', toId: 'res', toTerminal: 'a' },
          { id: 'w2', fromId: 'res', fromTerminal: 'b', toId: 'led', toTerminal: 'a' },
          { id: 'w3', fromId: 'led', fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
        ],
      }
    },
  },
  {
    id: 'switch-led',
    emoji: '🔘',
    name: 'Mạch có công tắc',
    hint: 'Pin + công tắc + R + LED — bật/tắt được',
    build: () => {
      const bat = { id: 'bat', type: 'battery_9v' as const, x: 80,  y: 120, value: 9, rotation: 0 as const }
      const sw  = { id: 'sw',  type: 'switch' as const,     x: 210, y: 120, on: false, rotation: 0 as const }
      const res = { id: 'res', type: 'resistor' as const,   x: 320, y: 120, value: 220, rotation: 0 as const }
      const led = { id: 'led', type: 'led_red' as const,    x: 440, y: 120, rotation: 0 as const }
      return {
        components: [bat, sw, res, led],
        wires: [
          { id: 'w1', fromId: 'bat', fromTerminal: 'b', toId: 'sw',  toTerminal: 'a' },
          { id: 'w2', fromId: 'sw',  fromTerminal: 'b', toId: 'res', toTerminal: 'a' },
          { id: 'w3', fromId: 'res', fromTerminal: 'b', toId: 'led', toTerminal: 'a' },
          { id: 'w4', fromId: 'led', fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
        ],
      }
    },
  },
  {
    id: 'pot-dim',
    emoji: '🔧',
    name: 'Mạch biến trở mờ đèn',
    hint: 'Pin + biến trở (0-1kΩ) + LED — chỉnh độ sáng',
    build: () => {
      const bat = { id: 'bat', type: 'battery_9v' as const,    x: 80,  y: 120, value: 9, rotation: 0 as const }
      const pot = { id: 'pot', type: 'potentiometer' as const, x: 220, y: 115, value: 500, rotation: 0 as const }
      const led = { id: 'led', type: 'led_green' as const,     x: 380, y: 120, rotation: 0 as const }
      return {
        components: [bat, pot, led],
        wires: [
          { id: 'w1', fromId: 'bat', fromTerminal: 'b', toId: 'pot', toTerminal: 'a' },
          { id: 'w2', fromId: 'pot', fromTerminal: 'b', toId: 'led', toTerminal: 'a' },
          { id: 'w3', fromId: 'led', fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
        ],
      }
    },
  },
  {
    id: 'alarm',
    emoji: '🔔',
    name: 'Mạch còi báo động',
    hint: 'Pin + công tắc + buzzer — bật là kêu',
    build: () => {
      const bat = { id: 'bat', type: 'battery_9v' as const, x: 80,  y: 120, value: 9, rotation: 0 as const }
      const sw  = { id: 'sw',  type: 'switch' as const,     x: 230, y: 120, on: true, rotation: 0 as const }
      const bz  = { id: 'bz',  type: 'buzzer' as const,     x: 380, y: 115, rotation: 0 as const }
      return {
        components: [bat, sw, bz],
        wires: [
          { id: 'w1', fromId: 'bat', fromTerminal: 'b', toId: 'sw', toTerminal: 'a' },
          { id: 'w2', fromId: 'sw',  fromTerminal: 'b', toId: 'bz', toTerminal: 'a' },
          { id: 'w3', fromId: 'bz',  fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
        ],
      }
    },
  },
  {
    id: 'parallel-leds',
    emoji: '💡',
    name: 'Mạch 2 LED song song',
    hint: '2 LED + 2 điện trở song song trên cùng pin',
    build: () => {
      const bat = { id: 'bat', type: 'battery_9v' as const, x: 80,  y: 160, value: 9, rotation: 0 as const }
      const r1  = { id: 'r1',  type: 'resistor' as const,   x: 230, y: 80,  value: 220, rotation: 0 as const }
      const l1  = { id: 'l1',  type: 'led_red' as const,    x: 370, y: 80,  rotation: 0 as const }
      const r2  = { id: 'r2',  type: 'resistor' as const,   x: 230, y: 240, value: 220, rotation: 0 as const }
      const l2  = { id: 'l2',  type: 'led_green' as const,  x: 370, y: 240, rotation: 0 as const }
      return {
        components: [bat, r1, l1, r2, l2],
        wires: [
          // top branch
          { id: 'w1', fromId: 'bat', fromTerminal: 'b', toId: 'r1', toTerminal: 'a' },
          { id: 'w2', fromId: 'r1',  fromTerminal: 'b', toId: 'l1', toTerminal: 'a' },
          { id: 'w3', fromId: 'l1',  fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
          // bottom branch
          { id: 'w4', fromId: 'bat', fromTerminal: 'b', toId: 'r2', toTerminal: 'a' },
          { id: 'w5', fromId: 'r2',  fromTerminal: 'b', toId: 'l2', toTerminal: 'a' },
          { id: 'w6', fromId: 'l2',  fromTerminal: 'b', toId: 'bat', toTerminal: 'a' },
        ],
      }
    },
  },
  {
    id: 'sgk11-bai26',
    emoji: '🔬',
    name: 'Bài 26 SGK — Đo ξ & r pin điện hoá (Vật lý 11)',
    hint: 'Mạch đo suất điện động ξ và điện trở trong r của pin theo SGK Kết nối Tri thức',
    build: () => {
      // Layout: pin top-left → K → A → R(biến trở) → R₀ → about pin- (loop closes)
      // Voltmeter parallel across M (between K and A) ↔ N (between R₀ and pin-)
      // Canvas: 880×500. Pin at left, components along top, R₀ on bottom return path.
      const pin    = { id: 'pin',  type: 'emf_cell' as const,      x: 60,  y: 220, emf: 1.5, internalR: 0.5, value: 1.5, rotation: 0 as const }
      const swK    = { id: 'sw_k', type: 'switch' as const,        x: 200, y: 100, on: true, rotation: 0 as const }
      const amp    = { id: 'amp',  type: 'ammeter' as const,       x: 360, y: 100, rotation: 0 as const }
      const rVar   = { id: 'r_var', type: 'potentiometer' as const, x: 520, y: 95, value: 50, rotation: 0 as const }
      const r0     = { id: 'r0',   type: 'resistor' as const,      x: 640, y: 240, value: 10, rotation: 0 as const }
      const volt   = { id: 'volt', type: 'voltmeter' as const,     x: 380, y: 280, rotation: 0 as const }
      return {
        components: [pin, swK, amp, rVar, r0, volt],
        wires: [
          // Loop: pin(+) → K → A → R → R₀ → pin(-)
          { id: 'w1', fromId: 'pin',   fromTerminal: 'b', toId: 'sw_k',  toTerminal: 'a' }, // pin+ → K (left)
          { id: 'w2', fromId: 'sw_k',  fromTerminal: 'b', toId: 'amp',   toTerminal: 'a' }, // K → A (node M)
          { id: 'w3', fromId: 'amp',   fromTerminal: 'b', toId: 'r_var', toTerminal: 'a' }, // A → R
          { id: 'w4', fromId: 'r_var', fromTerminal: 'b', toId: 'r0',    toTerminal: 'a' }, // R → R₀ (top)
          { id: 'w5', fromId: 'r0',    fromTerminal: 'b', toId: 'pin',   toTerminal: 'a' }, // R₀ → pin- (node N)
          // Voltmeter parallel: V+ at M (sw_k:b), V- at N (r0:b)
          { id: 'w6', fromId: 'volt',  fromTerminal: 'a', toId: 'sw_k',  toTerminal: 'b' },
          { id: 'w7', fromId: 'volt',  fromTerminal: 'b', toId: 'r0',    toTerminal: 'b' },
        ],
      }
    },
  },
]

// ───────────────────────────────────────────────────────────────────
// Simulation — BFS graph traversal + Ohm's law
// ───────────────────────────────────────────────────────────────────

/**
 * Node = "componentId:terminal" (e.g. "bat:b"). Battery + is terminal b, − is a.
 * Wires create direct edges. Inside each component, the path goes a ↔ b
 * (resistance/voltage drop depends on component type & state).
 *
 * For DC steady state:
 *   - wire / ground / switch(on) / ammeter: R = 0
 *   - switch(off): open (no edge)
 *   - resistor / pot: R = value
 *   - inductor: R = 0 (DC short)
 *   - capacitor: open (DC steady state)
 *   - LED: open if reverse bias OR forward but treated as Vf drop
 *   - buzzer: R = 16
 *   - battery: voltage source, internal R ~ 0
 *
 * We compute by BFS path from bat+ to bat− and sum resistance / forward drops.
 * If multiple paths exist, treat each as a parallel branch and sum currents.
 */
function simulate(
  components: PlacedComponent[],
  wires: Wire[],
): SimResult {
  const ledStates: Record<string, 'off' | 'on' | 'burnt'> = {}
  const meterReadings: Record<string, number> = {}
  components.filter(c => c.type.startsWith('led_')).forEach(c => { ledStates[c.id] = 'off' })
  components.filter(c => c.type === 'ammeter' || c.type === 'voltmeter').forEach(c => {
    meterReadings[c.id] = 0
  })

  // Find sources: legacy battery OR emf_cell (with internal R)
  const sources = components.filter(c =>
    c.type === 'battery_9v' || c.type === 'battery_aa' || c.type === 'emf_cell'
  )
  if (sources.length === 0) {
    return {
      ok: false,
      message: '⚠ Chưa có nguồn điện — thêm pin hoặc pin điện hoá vào mạch.',
      level: 'info', ledStates, meterReadings,
    }
  }
  const src = sources[0]   // use first source
  const isEmfCell = src.type === 'emf_cell'
  const V = isEmfCell
    ? (src.emf ?? src.value ?? 1.5)
    : (src.value ?? (src.type === 'battery_9v' ? 9 : 1.5))
  const internalR = isEmfCell ? (src.internalR ?? 0.5) : 0

  // Build adjacency: nodeKey -> list of { to, R, vDrop, fromComp }
  // nodeKey = `${compId}:${term}` for component terminals
  type Edge = { to: string; R: number; vDrop: number; compId: string }
  const adj: Map<string, Edge[]> = new Map()
  const addEdge = (a: string, b: string, R: number, vDrop: number, compId: string) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ to: b, R, vDrop, compId })
    adj.get(b)!.push({ to: a, R, vDrop: -vDrop, compId })
  }
  // For diodes / LEDs: only allow forward direction (a → b = anode → cathode).
  // Reverse direction is OPEN (no edge added) — reverse-biased diode blocks current.
  // FIX (2026-05-27): trước đó addEdge cả 2 chiều với vDrop sign-flip → BFS đi ngược
  // qua LED ăn -Vf vào pathV → effectiveV = V - (-Vf) = V + Vf (sai vật lý).
  const addDirectedEdge = (a: string, b: string, R: number, vDrop: number, compId: string) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ to: b, R, vDrop, compId })
    // KHÔNG add reverse edge — diode/LED chiều ngược OPEN
  }

  // Wires: zero-resistance edges
  for (const w of wires) {
    addEdge(`${w.fromId}:${w.fromTerminal}`, `${w.toId}:${w.toTerminal}`, 0, 0, `wire-${w.id}`)
  }

  // Internal edges (within each component)
  for (const c of components) {
    const a = `${c.id}:a`
    const b = `${c.id}:b`
    switch (c.type) {
      case 'battery_9v':
      case 'battery_aa':
      case 'emf_cell':
        // source handled separately — DON'T add internal edge here (the V source is the boundary)
        break
      case 'resistor':
        addEdge(a, b, c.value ?? 220, 0, c.id)
        break
      case 'switch':
        if (c.on) addEdge(a, b, 0, 0, c.id)
        break
      case 'inductor':
        addEdge(a, b, 0.1, 0, c.id)   // DC: nearly short
        break
      case 'capacitor':
        // open in DC steady state — skip
        break
      case 'buzzer':
        addEdge(a, b, 16, 0, c.id)
        break
      case 'potentiometer':
        addEdge(a, b, c.value ?? 500, 0, c.id)
        break
      case 'ammeter':
        // Ideal ammeter: ~0Ω, current flows through, we'll read it after sim
        addEdge(a, b, 0.001, 0, c.id)
        break
      case 'voltmeter':
        // Ideal voltmeter: ~∞Ω in parallel — model with very high R so essentially no current
        addEdge(a, b, 1e9, 0, c.id)
        break
      case 'ground':
        // single terminal — only a, used as 0V reference (no internal edge needed)
        break
      case 'led_red':
      case 'led_blue':
      case 'led_green':
        // LED is non-linear; treat as Vf drop + small dynamic R (~5Ω) in forward direction ONLY.
        // Convention: forward from a → b (anode → cathode).
        // Reverse direction: OPEN (no edge) — reverse-biased diode blocks current.
        addDirectedEdge(a, b, 5, LED_VF[c.type], c.id)
        break
    }
  }

  // BFS to find ANY path from src+:b to src−:a (b=positive, a=negative)
  const start = `${src.id}:b`
  const goal  = `${src.id}:a`

  if (!adj.has(start) || !adj.has(goal)) {
    return {
      ok: false,
      message: '⚠ Mạch hở — nguồn chưa được nối với phần còn lại.',
      level: 'warn', ledStates, meterReadings,
    }
  }

  // Find ALL simple paths from start to goal (DFS), then pick the lowest-resistance one.
  // We bias toward non-voltmeter paths because voltmeter has 1e9 Ω.
  // For typical SGK circuits this is small enough.
  interface QItem { node: string; pathR: number; pathV: number; visited: Set<string>; trail: string[] }
  const seed: QItem = { node: start, pathR: 0, pathV: 0, visited: new Set([start]), trail: [] }
  const allPaths: QItem[] = []
  const dfs = (cur: QItem, depth: number) => {
    if (depth > 40) return
    if (cur.node === goal) { allPaths.push(cur); return }
    for (const edge of adj.get(cur.node) ?? []) {
      if (cur.visited.has(edge.to)) continue
      const nv = new Set(cur.visited); nv.add(edge.to)
      dfs({
        node: edge.to,
        pathR: cur.pathR + edge.R,
        pathV: cur.pathV + edge.vDrop,
        visited: nv,
        trail: [...cur.trail, edge.compId],
      }, depth + 1)
    }
  }
  dfs(seed, 0)

  // Pick the path with the LOWEST resistance that excludes voltmeter (voltmeter is a sense element)
  const realPaths = allPaths.filter(p =>
    !p.trail.some(id => components.find(c => c.id === id)?.type === 'voltmeter')
  )
  let foundPath: QItem | null = null
  if (realPaths.length > 0) {
    foundPath = realPaths.reduce((best, p) => (p.pathR < best.pathR ? p : best), realPaths[0])
  } else if (allPaths.length > 0) {
    foundPath = allPaths.reduce((best, p) => (p.pathR < best.pathR ? p : best), allPaths[0])
  }

  if (!foundPath) {
    // Check if it's because of an open switch
    const openSwitches = components.filter(c => c.type === 'switch' && !c.on)
    if (openSwitches.length > 0) {
      return {
        ok: false,
        message: '🔘 Mạch hở — có công tắc đang MỞ. Click vào công tắc để đóng.',
        level: 'warn', ledStates, meterReadings,
      }
    }
    // Check if there's a LED in the components — possible reverse-bias
    // (BFS-with-LED-as-unidirectional-edge sẽ fail nếu LED ngược chiều dòng)
    const hasLEDinCircuit = components.some(c => c.type.startsWith('led_'))
    if (hasLEDinCircuit) {
      return {
        ok: false,
        message: '🔌 LED có thể đang lắp NGƯỢC CỰC — kiểm tra chiều anode (+) phải nối phía + của nguồn. Hoặc dây chưa nối kín.',
        level: 'warn', ledStates, meterReadings,
      }
    }
    return {
      ok: false,
      message: '⚠ Mạch chưa khép kín — chưa có đường dẫn từ + về − của nguồn.',
      level: 'warn', ledStates, meterReadings,
    }
  }

  // Detect short circuit: path with R≈0 and no Vdrop (no resistor/LED in path)
  const usedCompIds = new Set(foundPath.trail)
  const hasResistor   = components.some(c => usedCompIds.has(c.id) && (c.type === 'resistor' || c.type === 'potentiometer' || c.type === 'buzzer'))
  const hasLED        = components.some(c => usedCompIds.has(c.id) && c.type.startsWith('led_'))
  if (!hasResistor && !hasLED && (foundPath.pathR + internalR) < 0.5 && !isEmfCell) {
    return {
      ok: false,
      message: '💥 ĐOẢN MẠCH! Pin nối trực tiếp bằng dây — nguy hiểm, hãy thêm điện trở.',
      level: 'error',
      current: 999,
      ledStates,
      meterReadings,
    }
  }

  // Apply Ohm's law: I = (V - sum_Vdrop) / (R_total + internal R)
  const effectiveV = V - foundPath.pathV
  if (effectiveV <= 0) {
    // Forward voltage drop exceeds source — LED won't light
    components
      .filter(c => usedCompIds.has(c.id) && c.type.startsWith('led_'))
      .forEach(c => { ledStates[c.id] = 'off' })
    return {
      ok: true,
      message: '⚠ Áp nguồn quá thấp so với Vf của LED — không đủ để LED phát sáng.',
      level: 'warn',
      current: 0,
      ledStates,
      meterReadings,
    }
  }
  const Rtot = Math.max(foundPath.pathR + internalR, 0.01)
  const I = effectiveV / Rtot

  // Update LED states
  components
    .filter(c => c.type.startsWith('led_'))
    .forEach(c => {
      if (!usedCompIds.has(c.id)) {
        ledStates[c.id] = 'off'
      } else if (I > LED_IF_MAX) {
        ledStates[c.id] = 'burnt'
      } else if (I > LED_IF_MIN) {
        ledStates[c.id] = 'on'
      } else {
        ledStates[c.id] = 'off'
      }
    })

  // ─── Meter readings ─────────────────────────────────────────────
  // Ammeter: I through the series circuit (if it's on the active path)
  components.filter(c => c.type === 'ammeter').forEach(c => {
    meterReadings[c.id] = usedCompIds.has(c.id) ? I : 0
  })
  // Voltmeter: voltage across its terminals.
  // For typical SGK Bài 26: voltmeter is across the source's terminals (M ↔ N),
  // which equals U = ξ - I·r (terminal voltage). Approximation: we assume the
  // voltmeter is across the entire EXTERNAL circuit (everything except source + voltmeter itself).
  components.filter(c => c.type === 'voltmeter').forEach(c => {
    // External voltage drop = source EMF minus drop across internal resistance
    // = I × R_external. R_external = Rtot - internalR.
    const Rext = Rtot - internalR
    const Uterminal = I * Rext
    meterReadings[c.id] = Uterminal
  })

  // Build message
  let message = `✓ Mạch hoàn chỉnh — Dòng điện I = ${I.toFixed(3)} A (${(I * 1000).toFixed(1)} mA)`
  let level: SimResult['level'] = 'success'

  if (I > LED_IF_MAX && hasLED) {
    message = `🔥 LED CHÁY! Dòng ${(I * 1000).toFixed(1)} mA vượt 30 mA — cần thêm điện trở (≥${Math.ceil((effectiveV - 2) / LED_IF_NOMINAL)} Ω).`
    level = 'error'
  } else if (I < LED_IF_MIN && hasLED) {
    message = `⚡ Dòng quá yếu (${(I * 1000).toFixed(2)} mA) — LED mờ/không sáng. Giảm điện trở.`
    level = 'warn'
  } else if (isEmfCell) {
    const Uterm = I * (Rtot - internalR)
    message = `✓ Đo được: I = ${(I * 1000).toFixed(1)} mA · U = ${Uterm.toFixed(3)} V (U = ξ - I·r)`
  }

  return { ok: true, message, level, current: I, ledStates, meterReadings }
}

// ───────────────────────────────────────────────────────────────────
// SGK 11 Bài 26 — Measurement table + auto-plot panel
// ───────────────────────────────────────────────────────────────────

interface Sgk26PanelProps {
  measurements: Array<{ R: number; U: number; I: number }>
  regression: { slope: number; intercept: number; emf: number; rComputed: number } | null
  r0: number
  onRecord: () => void
  onDelete: (idx: number) => void
  onClear: () => void
  hasSim: boolean
  currentR?: number
  currentI: number
  currentU: number
}

function Sgk26MeasurementPanel({
  measurements, regression, r0, onRecord, onDelete, onClear,
  hasSim, currentR, currentI, currentU,
}: Sgk26PanelProps) {
  // SVG plot dims
  const PW = 320, PH = 200
  const PAD_L = 36, PAD_R = 12, PAD_T = 14, PAD_B = 30

  const xs = measurements.map(m => m.I * 1000) // mA
  const ys = measurements.map(m => m.U)        // V

  const xMin = 0
  const xMax = Math.max(1, ...xs) * 1.15 || 1
  const yMin = 0
  const yMax = Math.max(0.1, ...ys) * 1.15 || 2

  const x2px = (x: number) => PAD_L + (x - xMin) / (xMax - xMin) * (PW - PAD_L - PAD_R)
  const y2px = (y: number) => PH - PAD_B - (y - yMin) / (yMax - yMin) * (PH - PAD_T - PAD_B)

  // Build regression line endpoints (in mA / V)
  let lineX1 = 0, lineY1 = 0, lineX2 = 0, lineY2 = 0
  if (regression) {
    // U = intercept + slope_per_A * I_A
    // Convert slope to per-mA for the chart: slope_mA = slope / 1000
    const slopePerMA = regression.slope / 1000
    lineX1 = xMin
    lineY1 = regression.intercept + slopePerMA * xMin
    lineX2 = xMax
    lineY2 = regression.intercept + slopePerMA * xMax
  }

  return (
    <div className="mt-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-zinc-950/60 border border-indigo-500/30 p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h4 className="text-sm font-bold text-indigo-200 inline-flex items-center gap-1.5">
          <FlaskConical className="w-4 h-4" />
          Bảng 26.1 — Kết quả đo ξ và r pin điện hoá
        </h4>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRecord}
            disabled={!hasSim}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:scale-[1.02] transition-transform shadow shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Ghi số đo hiện tại
          </button>
          <button
            onClick={onClear}
            disabled={measurements.length === 0}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3 h-3" /> Xoá bảng
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="text-[10px] text-indigo-300/80 mb-2">
        Đổi giá trị biến trở R (chọn biến trở → đổi giá trị) → bấm "▶ Mô phỏng" → "Ghi số đo".
        Lặp lại 5-7 lần với R khác nhau để vẽ đồ thị U vs I.
      </div>

      {/* Current readings preview */}
      {hasSim && (
        <div className="mb-2 px-2.5 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-700/60 text-[11px] inline-flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-zinc-400">Số đo hiện tại:</span>
          <span className="text-cyan-300">R = <b>{currentR ?? '—'} Ω</b></span>
          <span className="text-emerald-300">U = <b>{currentU.toFixed(3)} V</b></span>
          <span className="text-amber-300">I = <b>{(currentI * 1000).toFixed(2)} mA</b></span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3">
        {/* Table */}
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 overflow-hidden">
          <div className="max-h-[260px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-zinc-900/80 sticky top-0">
                <tr className="text-zinc-400">
                  <th className="px-2 py-1.5 text-left w-8">#</th>
                  <th className="px-2 py-1.5 text-right">R (Ω)</th>
                  <th className="px-2 py-1.5 text-right">U (V)</th>
                  <th className="px-2 py-1.5 text-right">I (mA)</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {measurements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-zinc-500 text-[11px]">
                      Chưa có số đo nào.<br />
                      <span className="text-[10px]">Đổi R → mô phỏng → ghi.</span>
                    </td>
                  </tr>
                ) : measurements.map((m, i) => (
                  <tr key={i} className="border-t border-zinc-800/60 hover:bg-zinc-900/50">
                    <td className="px-2 py-1 text-zinc-500">{i + 1}</td>
                    <td className="px-2 py-1 text-right text-cyan-300">{m.R.toFixed(0)}</td>
                    <td className="px-2 py-1 text-right text-emerald-300">{m.U.toFixed(3)}</td>
                    <td className="px-2 py-1 text-right text-amber-300">{(m.I * 1000).toFixed(2)}</td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => onDelete(i)}
                        title="Xoá dòng"
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3 h-3 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Plot + computed values */}
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 p-2.5">
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-indigo-200">
            <LineChart className="w-3.5 h-3.5" /> Hình 26.3 — Đồ thị U vs I
          </div>
          <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full h-auto bg-zinc-900/40 rounded">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <g key={`gy-${t}`}>
                <line
                  x1={PAD_L} x2={PW - PAD_R}
                  y1={PH - PAD_B - t * (PH - PAD_T - PAD_B)}
                  y2={PH - PAD_B - t * (PH - PAD_T - PAD_B)}
                  stroke="#1e293b" strokeWidth={0.5}
                />
                <text x={PAD_L - 3} y={PH - PAD_B - t * (PH - PAD_T - PAD_B) + 3}
                      fontSize={8} fill="#64748b" textAnchor="end">
                  {(yMin + t * (yMax - yMin)).toFixed(1)}
                </text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map(t => (
              <g key={`gx-${t}`}>
                <line
                  x1={PAD_L + t * (PW - PAD_L - PAD_R)}
                  x2={PAD_L + t * (PW - PAD_L - PAD_R)}
                  y1={PAD_T} y2={PH - PAD_B}
                  stroke="#1e293b" strokeWidth={0.5}
                />
                <text x={PAD_L + t * (PW - PAD_L - PAD_R)} y={PH - PAD_B + 12}
                      fontSize={8} fill="#64748b" textAnchor="middle">
                  {(xMin + t * (xMax - xMin)).toFixed(0)}
                </text>
              </g>
            ))}
            {/* Axes */}
            <line x1={PAD_L} y1={PH - PAD_B} x2={PW - PAD_R} y2={PH - PAD_B}
                  stroke="#475569" strokeWidth={1} />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PH - PAD_B}
                  stroke="#475569" strokeWidth={1} />
            {/* Axis labels */}
            <text x={PW - PAD_R} y={PH - 6} fontSize={9} fill="#94a3b8" textAnchor="end">
              I (mA)
            </text>
            <text x={4} y={PAD_T + 4} fontSize={9} fill="#94a3b8">U (V)</text>

            {/* Regression line */}
            {regression && (
              <line
                x1={x2px(lineX1)} y1={y2px(lineY1)}
                x2={x2px(lineX2)} y2={y2px(lineY2)}
                stroke="#22d3ee" strokeWidth={1.5} strokeDasharray="3 3"
              />
            )}

            {/* Data points */}
            {measurements.map((m, i) => (
              <circle
                key={i}
                cx={x2px(m.I * 1000)} cy={y2px(m.U)}
                r={3.5} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1}
              />
            ))}

            {/* Intercept marker (U₀ = ξ) */}
            {regression && (
              <g>
                <circle cx={x2px(0)} cy={y2px(regression.intercept)} r={4}
                        fill="#a78bfa" stroke="#fff" strokeWidth={1} />
                <text x={x2px(0) + 6} y={y2px(regression.intercept) - 4}
                      fontSize={9} fill="#c4b5fd" fontWeight="bold">
                  ξ ≈ {regression.intercept.toFixed(2)}V
                </text>
              </g>
            )}
          </svg>

          {/* Computed values */}
          <div className="mt-2 text-[11px] space-y-1">
            {measurements.length < 2 ? (
              <div className="text-zinc-500">Cần ≥ 2 số đo để vẽ đường hồi quy.</div>
            ) : regression && (
              <>
                <div className="flex justify-between text-zinc-300">
                  <span>Hệ số cắt (U₀, khi I=0):</span>
                  <span className="font-bold text-purple-300">
                    ξ = {regression.intercept.toFixed(3)} V
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Hệ số góc đồ thị U(I):</span>
                  <span className="font-bold text-cyan-300">
                    {regression.slope.toFixed(2)} V/A
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>R₀ (cố định):</span>
                  <span className="font-bold text-zinc-200">{r0} Ω</span>
                </div>
                <div className="flex justify-between border-t border-zinc-700 pt-1 mt-1">
                  <span className="text-emerald-300">r = −slope − R₀:</span>
                  <span className="font-bold text-emerald-300">
                    {regression.rComputed >= 0
                      ? `${regression.rComputed.toFixed(3)} Ω`
                      : `${regression.rComputed.toFixed(3)} Ω (⚠ âm — đo lại)`}
                  </span>
                </div>
                <div className="mt-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-[11px]">
                  Kết luận: ξ ≈ <b>{regression.intercept.toFixed(2)} V</b>, r ≈{' '}
                  <b>{Math.max(0, regression.rComputed).toFixed(2)} Ω</b>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Main component
// ───────────────────────────────────────────────────────────────────

/**
 * Imperative API exposed via forwardRef → wrapper components (LabChallengeBlock)
 * có thể đọc snapshot hiện tại + simResult để submit, hoặc load reference.
 */
export interface AnalogCircuitHandle {
  getSnapshot(): { components: PlacedComponent[]; wires: Wire[]; simResult: SimResult | null }
  loadSnapshot(snap: { components?: PlacedComponent[]; wires?: Wire[] }): void
  runSimulation(): void
}

interface AnalogCircuitProps {
  /** Initial state — load template/reference khi mount */
  initialSnapshot?: { components?: PlacedComponent[]; wires?: Wire[] }
}

function AnalogCircuitBuilderInner(
  { initialSnapshot }: AnalogCircuitProps,
  ref: React.Ref<AnalogCircuitHandle>,
): JSX.Element {
  const [components, setComponents] = useState<PlacedComponent[]>([])
  const [wires, setWires]           = useState<Wire[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [wireStart, setWireStart]   = useState<{ componentId: string; terminal: 'a' | 'b' } | null>(null)
  const [mode, setMode]             = useState<Mode>('select')
  const [simResult, setSimResult]   = useState<SimResult | null>(null)
  // User: "nút tắt mở giả lập cần hoạt động tốt hơn"
  // Continuous simulation toggle — khi ON, tự re-simulate mỗi khi mạch đổi
  const [simRunning, setSimRunning] = useState<boolean>(() => {
    try { return localStorage.getItem('analogCircuit:simRunning') !== 'false' }
    catch { return true }
  })
  useEffect(() => {
    try { localStorage.setItem('analogCircuit:simRunning', String(simRunning)) } catch { /* ignore */ }
  }, [simRunning])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSavedDialog, setShowSavedDialog] = useState(false)
  const [savedList, setSavedList]   = useState<SavedCircuit[]>([])
  const [hoverTermKey, setHoverTermKey] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // Đang kéo waypoint của dây nào, index thứ mấy
  const [draggingWaypoint, setDraggingWaypoint] = useState<{ wireId: string; index: number } | null>(null)
  // Bài 26 SGK measurements table
  const [measurements, setMeasurements] = useState<Array<{ R: number; U: number; I: number }>>([])
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const VIEWBOX_W = 880
  const VIEWBOX_H = 500

  // Load saved on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('analogCircuit:saved')
      if (raw) setSavedList(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Load initial snapshot từ prop (challenge reference) — chạy 1 lần
  useEffect(() => {
    if (initialSnapshot) {
      if (Array.isArray(initialSnapshot.components)) setComponents(initialSnapshot.components)
      if (Array.isArray(initialSnapshot.wires))      setWires(initialSnapshot.wires)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Expose imperative API cho parent (LabChallengeBlock)
  useImperativeHandle(ref, () => ({
    getSnapshot: () => ({ components, wires, simResult }),
    loadSnapshot: (snap) => {
      if (Array.isArray(snap.components)) setComponents(snap.components)
      if (Array.isArray(snap.wires))      setWires(snap.wires)
      setSelectedId(null); setWireStart(null); setSimResult(null)
    },
    runSimulation: () => {
      const r = simulate(components, wires)
      setSimResult(r)
    },
  }), [components, wires, simResult])

  const selected = useMemo(
    () => components.find(c => c.id === selectedId) ?? null,
    [components, selectedId]
  )

  // ─── Add / remove ────────────────────────────────────────────────

  const handlePaletteDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('text/plain', type)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/plain') as ComponentType
    if (!type || !PALETTE.some(p => p.type === type)) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = VIEWBOX_W / rect.width
    const scaleY = VIEWBOX_H / rect.height
    const x = snapToGrid((e.clientX - rect.left) * scaleX)
    const y = snapToGrid((e.clientY - rect.top)  * scaleY)
    const p = PALETTE.find(it => it.type === type)!
    const newComp: PlacedComponent = {
      id: newId(),
      type,
      x: Math.max(0, Math.min(x, VIEWBOX_W - GEOM[type].w)),
      y: Math.max(0, Math.min(y, VIEWBOX_H - GEOM[type].h)),
      rotation: 0,
      value: p.defaultValue,
      on: type === 'switch' ? false : undefined,
    }
    setComponents(cs => [...cs, newComp])
    setSelectedId(newComp.id)
  }

  const deleteComponent = (id: string) => {
    setComponents(cs => cs.filter(c => c.id !== id))
    setWires(ws => ws.filter(w => w.fromId !== id && w.toId !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const deleteWire = (id: string) => {
    setWires(ws => ws.filter(w => w.id !== id))
  }

  // ─── Wire waypoint operations ────────────────────────────────────
  // Convert mouse event → snapped canvas coordinates
  const mouseToCanvas = (clientX: number, clientY: number): Point2 | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return {
      x: snapToGrid((clientX - rect.left) * (VIEWBOX_W / rect.width)),
      y: snapToGrid((clientY - rect.top)  * (VIEWBOX_H / rect.height)),
    }
  }

  /** Insert waypoint vào dây tại vị trí gần đoạn được click nhất */
  const insertWaypointOnWire = (wireId: string, at: Point2) => {
    setWires(ws => ws.map(w => {
      if (w.id !== wireId) return w
      const fromComp = components.find(c => c.id === w.fromId)
      const toComp   = components.find(c => c.id === w.toId)
      if (!fromComp || !toComp) return w
      const p1 = getTerminalPos(fromComp, w.fromTerminal)
      const p2 = getTerminalPos(toComp,   w.toTerminal)
      const wp = w.waypoints && w.waypoints.length > 0
        ? w.waypoints
        : autoRouteWaypoints(p1, p2)
      // Build full path [p1, wp[0], wp[1], ..., p2] và tìm đoạn gần điểm click nhất
      const pts: Point2[] = [p1, ...wp, p2]
      let bestIdx = 0
      let bestDist = Infinity
      for (let i = 0; i < pts.length - 1; i++) {
        const d = distToSegment(at, pts[i], pts[i + 1])
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }
      // Insert waypoint vào sau index bestIdx (giữa pts[bestIdx] và pts[bestIdx+1])
      // waypoints array tương ứng pts[1..n-2], nên insert index trong waypoints = bestIdx
      const nextWp = [...wp]
      nextWp.splice(bestIdx, 0, snapPoint(at))
      return { ...w, waypoints: nextWp }
    }))
  }

  const removeWaypoint = (wireId: string, index: number) => {
    setWires(ws => ws.map(w => {
      if (w.id !== wireId || !w.waypoints) return w
      const next = w.waypoints.filter((_, i) => i !== index)
      return { ...w, waypoints: next }
    }))
  }

  // Drag waypoint
  useEffect(() => {
    if (!draggingWaypoint) return
    const onMove = (e: MouseEvent) => {
      const pos = mouseToCanvas(e.clientX, e.clientY)
      if (!pos) return
      setWires(ws => ws.map(w => {
        if (w.id !== draggingWaypoint.wireId || !w.waypoints) return w
        const next = w.waypoints.map((p, i) => i === draggingWaypoint.index ? pos : p)
        return { ...w, waypoints: next }
      }))
    }
    const onUp = () => setDraggingWaypoint(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingWaypoint])

  const rotateSelected = () => {
    if (!selected) return
    const next: 0 | 90 | 180 | 270 = ((selected.rotation + 90) % 360) as 0 | 90 | 180 | 270
    setComponents(cs => cs.map(c => c.id === selected.id ? { ...c, rotation: next } : c))
  }

  // ─── Drag existing component ─────────────────────────────────────

  const handleComponentMouseDown = (e: React.MouseEvent, c: PlacedComponent) => {
    if (mode === 'delete') { deleteComponent(c.id); return }
    e.stopPropagation()
    setSelectedId(c.id)
    const svg = svgRef.current; if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = VIEWBOX_W / rect.width
    const scaleY = VIEWBOX_H / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top)  * scaleY
    dragOffsetRef.current = { dx: mx - c.x, dy: my - c.y }
    setDraggingId(c.id)
  }

  useEffect(() => {
    if (!draggingId) return
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current; if (!svg || !dragOffsetRef.current) return
      const rect = svg.getBoundingClientRect()
      const scaleX = VIEWBOX_W / rect.width
      const scaleY = VIEWBOX_H / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top)  * scaleY
      const nx = snapToGrid(mx - dragOffsetRef.current.dx)
      const ny = snapToGrid(my - dragOffsetRef.current.dy)
      setComponents(cs => cs.map(c => {
        if (c.id !== draggingId) return c
        const { w, h } = rotatedSize(GEOM[c.type], c.rotation)
        return {
          ...c,
          x: Math.max(0, Math.min(nx, VIEWBOX_W - w)),
          y: Math.max(0, Math.min(ny, VIEWBOX_H - h)),
        }
      }))
    }
    const onUp = () => { setDraggingId(null); dragOffsetRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [draggingId])

  // ─── Keyboard: Delete / Esc / R ───────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteComponent(selectedId)
      } else if (e.key === 'Escape') {
        setSelectedId(null)
        setWireStart(null)
      } else if (e.key.toLowerCase() === 'r' && selected) {
        rotateSelected()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected])

  // ─── Terminal click → wire drawing ───────────────────────────────

  const handleTerminalClick = (e: React.MouseEvent, compId: string, term: 'a' | 'b') => {
    e.stopPropagation()
    if (mode === 'delete') return
    if (!wireStart) {
      setWireStart({ componentId: compId, terminal: term })
    } else {
      if (wireStart.componentId === compId && wireStart.terminal === term) {
        setWireStart(null); return
      }
      // create wire (avoid duplicates)
      const exists = wires.some(w =>
        (w.fromId === wireStart.componentId && w.fromTerminal === wireStart.terminal &&
         w.toId === compId && w.toTerminal === term) ||
        (w.toId === wireStart.componentId && w.toTerminal === wireStart.terminal &&
         w.fromId === compId && w.fromTerminal === term)
      )
      if (!exists) {
        setWires(ws => [...ws, {
          id: newId(),
          fromId: wireStart.componentId,
          fromTerminal: wireStart.terminal,
          toId: compId,
          toTerminal: term,
        }])
      }
      setWireStart(null)
    }
  }

  const handleCanvasClick = () => {
    setSelectedId(null)
    setWireStart(null)
  }

  // ─── Switch click toggles ────────────────────────────────────────

  const toggleSwitch = (id: string) => {
    setComponents(cs => cs.map(c => c.id === id ? { ...c, on: !c.on } : c))
    setSimResult(null)
  }

  // ─── Run simulation ──────────────────────────────────────────────

  const runSim = () => {
    const r = simulate(components, wires)
    setSimResult(r)
  }

  // Auto re-simulate khi simRunning + mạch thay đổi (debounce 80ms)
  // → User vừa nối dây hoặc đổi giá trị, kết quả tự cập nhật ngay
  useEffect(() => {
    if (!simRunning) return
    const tid = setTimeout(() => {
      if (components.length > 0) {
        const r = simulate(components, wires)
        setSimResult(r)
      }
    }, 80)
    return () => clearTimeout(tid)
  }, [components, wires, simRunning])

  // ─── Clear all ───────────────────────────────────────────────────

  const clearAll = () => {
    if (components.length === 0) return
    if (!confirm('Xoá tất cả linh kiện và dây nối?')) return
    setComponents([]); setWires([]); setSelectedId(null); setWireStart(null); setSimResult(null)
  }

  // ─── Save / Load ─────────────────────────────────────────────────

  const saveCircuit = () => {
    const name = prompt('Tên cho mạch này?', `Mạch ${new Date().toLocaleString('vi-VN')}`)
    if (!name) return
    const saved: SavedCircuit = { name, savedAt: Date.now(), components, wires }
    const next = [saved, ...savedList].slice(0, 20)
    setSavedList(next)
    try { localStorage.setItem('analogCircuit:saved', JSON.stringify(next)) } catch { /* ignore */ }
    alert(`Đã lưu "${name}" vào trình duyệt.`)
  }

  const loadSaved = (sc: SavedCircuit) => {
    setComponents(sc.components)
    setWires(sc.wires)
    setSelectedId(null); setWireStart(null); setSimResult(null)
    setShowSavedDialog(false)
  }

  const deleteSaved = (idx: number) => {
    if (!confirm('Xoá mạch đã lưu này?')) return
    const next = savedList.filter((_, i) => i !== idx)
    setSavedList(next)
    try { localStorage.setItem('analogCircuit:saved', JSON.stringify(next)) } catch { /* ignore */ }
  }

  // ─── Load template ───────────────────────────────────────────────

  const loadTemplate = (tpl: Template) => {
    const { components: cs, wires: ws } = tpl.build()
    setComponents(cs)
    setWires(ws)
    setSelectedId(null); setWireStart(null); setSimResult(null)
    setShowTemplates(false)
    // Reset Bài 26 measurements when switching templates
    setMeasurements([])
  }

  // ─── Edit selected value ─────────────────────────────────────────

  const updateValue = (id: string, value: number) => {
    setComponents(cs => cs.map(c => c.id === id ? { ...c, value } : c))
  }

  // ─── Bài 26 SGK helpers ──────────────────────────────────────────

  // Detect SGK Bài 26 active circuit: must have emf_cell + ammeter + voltmeter
  const isSgk26Active = useMemo(() => (
    components.some(c => c.type === 'emf_cell') &&
    components.some(c => c.type === 'ammeter') &&
    components.some(c => c.type === 'voltmeter')
  ), [components])

  // Hardcoded fixed resistor R₀ for the SGK template (used in r calculation)
  const SGK_R0 = 10

  const recordMeasurement = () => {
    if (!simResult?.ok) {
      alert('Hãy bấm "▶ Mô phỏng" trước khi ghi số đo.')
      return
    }
    // Find variable resistor (potentiometer or resistor labelled "r_var")
    const rVar = components.find(c => c.id === 'r_var') ??
                 components.find(c => c.type === 'potentiometer')
    if (!rVar) {
      alert('Mạch chưa có biến trở để ghi giá trị R.')
      return
    }
    const ammeter   = components.find(c => c.type === 'ammeter')
    const voltmeter = components.find(c => c.type === 'voltmeter')
    if (!ammeter || !voltmeter) {
      alert('Mạch chưa có cả ampe kế và vôn kế.')
      return
    }
    const I = simResult.meterReadings?.[ammeter.id] ?? simResult.current ?? 0
    const U = simResult.meterReadings?.[voltmeter.id] ?? 0
    const R = rVar.value ?? 0
    // Avoid duplicates at the exact same R value — replace
    setMeasurements(prev => {
      const filtered = prev.filter(m => Math.abs(m.R - R) > 0.5)
      return [...filtered, { R, U, I }].sort((a, b) => b.R - a.R)
    })
  }

  const deleteMeasurement = (idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx))
  }

  const clearMeasurements = () => {
    if (measurements.length === 0) return
    if (confirm('Xoá toàn bộ bảng số đo?')) setMeasurements([])
  }

  // Linear regression on (I, U) → slope, intercept (= ξ when I=0)
  const regression = useMemo(() => {
    const n = measurements.length
    if (n < 2) return null
    const xs = measurements.map(m => m.I)
    const ys = measurements.map(m => m.U)
    const sumX  = xs.reduce((s, x) => s + x, 0)
    const sumY  = ys.reduce((s, y) => s + y, 0)
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
    const sumX2 = xs.reduce((s, x) => s + x * x, 0)
    const denom = n * sumX2 - sumX * sumX
    if (Math.abs(denom) < 1e-12) return null
    const slope     = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    // Slope = -(R₀ + r) → r = -slope - R₀
    const rComputed = -slope - SGK_R0
    return { slope, intercept, emf: intercept, rComputed }
  }, [measurements])

  // ─── Render ──────────────────────────────────────────────────────

  const ledStates = simResult?.ledStates ?? {}
  const isBuzzerLit = !!(simResult?.ok && (simResult.current ?? 0) > 0.01 &&
    components.some(c => c.type === 'buzzer'))

  return (
    <div className="rounded-2xl bg-card dark:bg-zinc-900/50 border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-gradient-to-r from-cyan-500/10 to-blue-500/10 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
            <Zap className="w-5 h-5 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-cyan-200 truncate">
              🔌 Mạch điện Analog — Tự lắp ghép
            </h3>
            <p className="text-[11px] text-zinc-400 truncate">
              Kéo linh kiện · Click 2 terminal nối dây · Click dây thêm node · Kéo node bẻ vuông góc · Bấm "Mô phỏng"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/60 border border-border rounded-lg p-1">
            <button
              onClick={() => setMode('select')}
              title="Chế độ chọn / kéo / sửa"
              className={`p-1.5 rounded-md transition ${mode === 'select' ? 'bg-cyan-500/30 text-cyan-200' : 'text-zinc-400 hover:text-foreground'}`}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMode('wire')}
              title="Chế độ nối dây — click 2 terminal"
              className={`p-1.5 rounded-md transition ${mode === 'wire' ? 'bg-amber-500/30 text-amber-200' : 'text-zinc-400 hover:text-foreground'}`}
            >
              <Cable className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMode('delete')}
              title="Chế độ xoá — click linh kiện hoặc dây"
              className={`p-1.5 rounded-md transition ${mode === 'delete' ? 'bg-rose-500/30 text-rose-200' : 'text-zinc-400 hover:text-foreground'}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Sim toggle + manual run — user yêu cầu "nút tắt mở giả lập tốt hơn" */}
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => {
                setSimRunning(r => !r)
                if (!simRunning) runSim()
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-transform hover:scale-[1.02] shadow ${
                simRunning
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/30'
                  : 'bg-zinc-700 text-zinc-300 border border-zinc-600'
              }`}
              title={simRunning ? 'Đang chạy — bấm để TẮT giả lập' : 'Đang tắt — bấm để BẬT'}>
              {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {simRunning ? 'Đang chạy' : 'Bật giả lập'}
              {simRunning && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse" />
              )}
            </button>
            <button
              onClick={runSim}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 hover:text-emerald-200 hover:bg-zinc-700 border border-border transition"
              title="Chạy lại 1 lần (manual refresh)">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            {/* User: "sau khi ghép thủ công xong thì có nút lưu thành 1 mạch cụ thể"
                Prominent save button — hiện khi đã có components, nổi bật ở top bar */}
            {components.length > 0 && (
              <button
                onClick={saveCircuit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-[1.02] transition-transform shadow shadow-amber-500/30"
                title="Lưu mạch hiện tại với tên để tái sử dụng">
                <Save className="w-3.5 h-3.5" /> Lưu thành mạch
              </button>
            )}
            {components.length > 0 && savedList.length > 0 && (
              <button
                onClick={() => setShowSavedDialog(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 text-amber-300 hover:bg-zinc-700 border border-amber-500/30 transition"
                title={`${savedList.length} mạch đã lưu — click để mở`}>
                <FolderOpen className="w-3.5 h-3.5" /> {savedList.length}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr] gap-0">
        {/* Palette */}
        <aside className="border-r border-border bg-zinc-950/40 p-3 max-h-[600px] overflow-y-auto">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-bold">
            Linh kiện ({PALETTE.length})
          </div>
          <div className="space-y-1.5">
            {PALETTE.map(p => (
              <div
                key={p.type}
                draggable
                onDragStart={e => handlePaletteDragStart(e, p.type)}
                title={p.hint}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-900/70 border border-border hover:border-cyan-500/60 hover:bg-zinc-800/80 cursor-grab active:cursor-grabbing transition group"
              >
                <span className="text-lg">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-zinc-200 truncate group-hover:text-cyan-200">{p.label}</div>
                  {p.defaultValue !== undefined && (
                    <div className="text-[9px] text-zinc-500">{p.defaultValue}{p.unit}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className="relative">
              <button
                onClick={() => setShowTemplates(v => !v)}
                className="w-full inline-flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-[11px] bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30 transition"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Mạch mẫu
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showTemplates && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-zinc-950 border border-indigo-500/40 rounded-lg shadow-2xl p-1 max-h-72 overflow-y-auto">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => loadTemplate(t)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-indigo-500/20 text-zinc-200 text-[11px] transition"
                    >
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>{t.emoji}</span> {t.name}
                      </div>
                      <div className="text-[9px] text-zinc-500">{t.hint}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={saveCircuit}
              disabled={components.length === 0}
              className="w-full inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" /> Lưu mạch
            </button>
            <button
              onClick={() => setShowSavedDialog(true)}
              className="w-full inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] bg-zinc-800/70 border border-border text-zinc-300 hover:bg-zinc-800 transition"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Mạch đã lưu ({savedList.length})
            </button>
            <button
              onClick={clearAll}
              disabled={components.length === 0}
              className="w-full inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả
            </button>
          </div>
        </aside>

        {/* Canvas + status */}
        <div className="p-3">
          {/* Wire mode hint */}
          {mode === 'wire' && (
            <div className="mb-2 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-200 text-[11px] inline-flex items-center gap-2">
              <Cable className="w-3 h-3" />
              {wireStart
                ? `Đang vẽ dây từ ${wireStart.componentId.slice(0, 4)}:${wireStart.terminal} — click terminal khác để nối`
                : 'Chế độ nối dây — click vào 1 chấm đỏ (terminal) để bắt đầu'}
            </div>
          )}
          {mode === 'delete' && (
            <div className="mb-2 px-3 py-1.5 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-200 text-[11px] inline-flex items-center gap-2">
              <Trash2 className="w-3 h-3" /> Chế độ xoá — click linh kiện hoặc dây để xoá
            </div>
          )}

          <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-border overflow-hidden">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
              className="w-full h-auto block"
              style={{ maxHeight: 500, cursor: mode === 'delete' ? 'crosshair' : 'default' }}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onClick={handleCanvasClick}
            >
              {/* Grid background */}
              <defs>
                <pattern id="acb-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="0.5" cy="0.5" r="0.5" fill="#334155" />
                </pattern>
                <filter id="acb-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <rect width={VIEWBOX_W} height={VIEWBOX_H} fill="url(#acb-grid)" />

              {/* Empty state */}
              {components.length === 0 && (
                <g>
                  <text x={VIEWBOX_W / 2} y={VIEWBOX_H / 2 - 12} textAnchor="middle"
                        fontSize={16} fill="#64748b">
                    Kéo linh kiện từ palette bên trái vào đây
                  </text>
                  <text x={VIEWBOX_W / 2} y={VIEWBOX_H / 2 + 12} textAnchor="middle"
                        fontSize={11} fill="#475569">
                    Hoặc bấm "📚 Mạch mẫu" để tải mạch có sẵn
                  </text>
                </g>
              )}

              {/* ── READING LABELS — render BEFORE wires để dây luôn nằm trên
                   User: "fix lỗi mạch điện các dây nối không hiển thị"
                   Order: labels (background) → wires → components → terminals
                   → dây không bao giờ bị che bởi label rectangle */}
              {simResult?.ok && simResult.current != null && components.map(c => {
                const g = GEOM[c.type]
                const I = simResult.current ?? 0
                const ledState = simResult.ledStates[c.id] ?? 'off'
                let primary = ''
                let secondary = ''
                let labelColor = '#22d3ee'
                if (c.type === 'resistor' && c.value) {
                  const Vdrop = I * c.value
                  primary = `U = ${Vdrop.toFixed(2)} V`
                  secondary = `I = ${(I * 1000).toFixed(1)} mA · R = ${c.value}Ω`
                  labelColor = '#fbbf24'
                } else if (c.type === 'ammeter') {
                  const meter = simResult.meterReadings?.[c.id] ?? I
                  primary = `${(meter * 1000).toFixed(1)} mA`
                  secondary = `${meter.toFixed(4)} A`
                  labelColor = '#34d399'
                } else if (c.type === 'voltmeter') {
                  const V = simResult.meterReadings?.[c.id] ?? 0
                  primary = `${V.toFixed(2)} V`
                  secondary = 'Vôn kế'
                  labelColor = '#a78bfa'
                } else if (c.type === 'battery_9v' || c.type === 'battery_aa' || c.type === 'emf_cell') {
                  const emf = c.value ?? 9
                  primary = `ξ = ${emf} V`
                  secondary = `I = ${(I * 1000).toFixed(1)} mA`
                  labelColor = '#f97316'
                } else if (c.type.startsWith('led_')) {
                  primary = ledState === 'on' ? `${(I * 1000).toFixed(1)} mA · ON` : ledState === 'burnt' ? '🔥 CHÁY!' : 'OFF'
                  secondary = ledState === 'burnt' ? 'I > 30 mA' : ledState === 'on' ? 'Sáng' : 'Quá thấp'
                  labelColor = ledState === 'burnt' ? '#ef4444' : ledState === 'on' ? '#fbbf24' : '#71717a'
                } else if (c.type === 'switch') {
                  primary = c.on ? 'ĐÓNG' : 'MỞ'
                  secondary = c.on ? 'Cho dòng đi qua' : 'Hở mạch'
                  labelColor = c.on ? '#34d399' : '#ef4444'
                }
                if (!primary) return null
                const labelX = c.x + g.w / 2
                const labelY = c.y + g.h + 4
                return (
                  <g key={`lbl-${c.id}`} style={{ pointerEvents: 'none' }}>
                    {/* Translucent rect — dây hoặc waypoint sau này render LÊN TRÊN */}
                    <rect
                      x={labelX - 50}
                      y={labelY}
                      width={100}
                      height={secondary ? 26 : 14}
                      rx={3}
                      fill="rgba(0,0,0,0.65)"
                      stroke={labelColor}
                      strokeWidth={0.6}
                    />
                    <text
                      x={labelX}
                      y={labelY + 10}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="bold"
                      fontFamily="ui-monospace, monospace"
                      fill={labelColor}>
                      {primary}
                    </text>
                    {secondary && (
                      <text
                        x={labelX}
                        y={labelY + 21}
                        textAnchor="middle"
                        fontSize={7}
                        fontFamily="ui-monospace, monospace"
                        fill="rgba(255,255,255,0.75)">
                        {secondary}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Wires — Manhattan routing với waypoints draggable */}
              {wires.map(w => {
                const fromComp = components.find(c => c.id === w.fromId)
                const toComp   = components.find(c => c.id === w.toId)
                if (!fromComp || !toComp) return null
                const p1 = getTerminalPos(fromComp, w.fromTerminal)
                const p2 = getTerminalPos(toComp,   w.toTerminal)
                const isLive = simResult?.ok && (simResult.current ?? 0) > LED_IF_MIN
                const color = isLive ? '#22d3ee' : '#64748b'
                // Sử dụng waypoints custom của user, fallback sang auto Z-route
                const wp = (w.waypoints && w.waypoints.length > 0)
                  ? w.waypoints
                  : autoRouteWaypoints(p1, p2)
                const d = buildOrthogonalPath(p1, p2, wp)
                return (
                  <g key={w.id}>
                    {/* hit area — click để thêm waypoint (hoặc xoá nếu mode delete) */}
                    <path
                      d={d} fill="none" stroke="transparent" strokeWidth={12}
                      style={{ cursor: mode === 'delete' ? 'crosshair' : 'copy' }}
                      onClick={e => {
                        e.stopPropagation()
                        if (mode === 'delete') { deleteWire(w.id); return }
                        const at = mouseToCanvas(e.clientX, e.clientY)
                        if (at) insertWaypointOnWire(w.id, at)
                      }}
                    />
                    {/* Dây hiển thị */}
                    <path
                      d={d} fill="none" stroke={color} strokeWidth={2.2}
                      strokeLinejoin="round" strokeLinecap="round"
                      filter={isLive ? 'url(#acb-glow)' : undefined}
                      pointerEvents="none"
                    />
                    {/* Waypoint handles — drag để di chuyển, double-click để xoá.
                        Ẩn khi đang giả lập (isLive) để dòng cyan glow liền mạch — không
                        bị các ô vuông gray trông như "dây đứt". */}
                    {!isLive && wp.map((point, idx) => {
                      // Chỉ render handle cho waypoints user-controlled (có trong w.waypoints).
                      // Auto-route waypoints chỉ render khi user chưa custom, sẽ thành custom
                      // sau lần drag/click đầu tiên.
                      const isUserWaypoint = !!(w.waypoints && w.waypoints[idx])
                      const isDragging = draggingWaypoint?.wireId === w.id && draggingWaypoint?.index === idx
                      return (
                        <g key={`${w.id}-wp-${idx}`}>
                          <rect
                            x={point.x - 5} y={point.y - 5} width={10} height={10}
                            rx={2}
                            fill={isUserWaypoint ? (isDragging ? '#fbbf24' : '#22d3ee') : '#475569'}
                            stroke={isUserWaypoint ? '#ffffff' : '#94a3b8'}
                            strokeWidth={1.2}
                            opacity={isUserWaypoint ? 0.95 : 0.55}
                            style={{ cursor: 'move' }}
                            onMouseDown={e => {
                              e.stopPropagation()
                              // Nếu là auto-waypoint thì commit thành user-waypoint trước khi drag
                              if (!isUserWaypoint) {
                                setWires(ws => ws.map(ww =>
                                  ww.id === w.id ? { ...ww, waypoints: wp.map(p => ({ ...p })) } : ww
                                ))
                              }
                              setDraggingWaypoint({ wireId: w.id, index: idx })
                            }}
                            onDoubleClick={e => {
                              e.stopPropagation()
                              if (isUserWaypoint) removeWaypoint(w.id, idx)
                            }}
                          >
                            <title>{isUserWaypoint
                              ? 'Kéo để di chuyển · Double-click để xoá'
                              : 'Kéo để bắt đầu chỉnh tay'}
                            </title>
                          </rect>
                        </g>
                      )
                    })}
                  </g>
                )
              })}

              {/* Wire-in-progress preview line */}
              {wireStart && (() => {
                const startComp = components.find(c => c.id === wireStart.componentId)
                if (!startComp) return null
                const p = getTerminalPos(startComp, wireStart.terminal)
                return (
                  <circle cx={p.x} cy={p.y} r={7} fill="none" stroke="#fbbf24" strokeWidth={2}>
                    <animate attributeName="r" values="6;10;6" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                )
              })()}

              {/* Components */}
              {components.map(c => {
                const g = GEOM[c.type]
                const isSelected = c.id === selectedId
                const isLED = c.type.startsWith('led_')
                const ledState = ledStates[c.id] ?? 'off'

                // bbox for highlight (use rotated size)
                const { w: rw, h: rh } = rotatedSize(g, c.rotation)

                return (
                  <g key={c.id}>
                    {isSelected && (
                      <rect
                        x={c.x - 4} y={c.y - 4}
                        width={rw + 8} height={rh + 8}
                        fill="none" stroke="#22d3ee" strokeWidth={1.5}
                        strokeDasharray="4 3" rx={4}
                      />
                    )}
                    {/* Rotated symbol group */}
                    <g
                      transform={`translate(${c.x}, ${c.y}) rotate(${c.rotation}, ${g.w / 2}, ${g.h / 2})`}
                      onMouseDown={e => handleComponentMouseDown(e, c)}
                      onDoubleClick={e => {
                        e.stopPropagation()
                        if (c.type === 'switch') toggleSwitch(c.id)
                      }}
                      style={{ cursor: mode === 'delete' ? 'crosshair' : 'move' }}
                    >
                      <ComponentSymbol
                        c={c}
                        isSelected={isSelected}
                        isLit={isBuzzerLit && c.type === 'buzzer'}
                        ledOn={isLED && ledState === 'on'}
                        ledBurnt={isLED && ledState === 'burnt'}
                        reading={simResult?.meterReadings?.[c.id]}
                      />
                    </g>

                    {/* Inline reading label cho TẤT CẢ component khi simulating
                        User: "thêm các chỉ số của điện trở, ampe kế..." */}
                    {/* Reading labels moved to separate pass below — tránh che dây nối */}

                    {/* Terminals (in absolute coords so they're not rotated visually) */}
                    {/* Khi đang giả lập (simIsLive): fade terminals xuống để dòng cyan
                        liền mạch — không bị các chấm đỏ ngắt quãng trông như "đứt dây" */}
                    {['a', 'b'].map(term => {
                      if (c.type === 'ground' && term === 'b') return null
                      const tp = getTerminalPos(c, term as 'a' | 'b')
                      const termKey = `${c.id}:${term}`
                      const isHover = hoverTermKey === termKey
                      const isWireStartTerm = wireStart?.componentId === c.id && wireStart.terminal === term
                      const simIsLive = simResult?.ok && (simResult.current ?? 0) > LED_IF_MIN
                      // Khi sim đang chạy + không hover/select → ẩn hẳn để wire liền mạch
                      const termOpacity = simIsLive && !isHover && !isWireStartTerm ? 0 : 1
                      return (
                        <circle
                          key={term}
                          cx={tp.x} cy={tp.y}
                          r={isHover || isWireStartTerm ? 6 : 4}
                          fill={isWireStartTerm ? '#fbbf24' : isHover ? '#f87171' : '#ef4444'}
                          stroke={isHover || isWireStartTerm ? '#ffffff' : 'none'}
                          strokeWidth={1.5}
                          opacity={termOpacity}
                          style={{ cursor: 'crosshair', transition: 'opacity 0.25s' }}
                          onMouseEnter={() => setHoverTermKey(termKey)}
                          onMouseLeave={() => setHoverTermKey(prev => prev === termKey ? null : prev)}
                          onClick={e => handleTerminalClick(e, c.id, term as 'a' | 'b')}
                        />
                      )
                    })}
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Status / Sim result */}
          {simResult && (
            <div className={`mt-3 rounded-lg border p-3 text-sm flex items-start gap-2 ${
              simResult.level === 'success' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' :
              simResult.level === 'warn'    ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' :
              simResult.level === 'error'   ? 'bg-rose-500/10 border-rose-500/40 text-rose-200' :
                                              'bg-blue-500/10 border-blue-500/40 text-blue-200'
            }`}>
              {simResult.level === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> :
               simResult.level === 'error'   ? <XCircle      className="w-4 h-4 mt-0.5 shrink-0" /> :
                                               <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <div className="font-bold">{simResult.message}</div>
                {simResult.ok && simResult.current !== undefined && simResult.current < 999 && (
                  <div className="text-[11px] opacity-80 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span>Dòng điện: <b>{(simResult.current * 1000).toFixed(2)} mA</b></span>
                    {Object.entries(simResult.ledStates).map(([id, st]) => {
                      const comp = components.find(c => c.id === id)
                      if (!comp) return null
                      const color = comp.type === 'led_red' ? 'đỏ' : comp.type === 'led_blue' ? 'xanh dương' : 'xanh lá'
                      const icon = st === 'on' ? '💡 SÁNG' : st === 'burnt' ? '🔥 CHÁY' : '⚫ tắt'
                      return <span key={id}>LED {color}: <b>{icon}</b></span>
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected component inspector */}
          {selected && (
            <div className="mt-3 rounded-lg border border-cyan-500/40 bg-cyan-500/5 p-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-lg">{PALETTE.find(p => p.type === selected.type)?.emoji}</span>
                <span className="font-bold text-cyan-200">
                  {PALETTE.find(p => p.type === selected.type)?.label}
                </span>
              </div>
              {(() => {
                const p = PALETTE.find(it => it.type === selected.type)
                // Special editor for EMF cell — EMF + internal R both editable
                if (selected.type === 'emf_cell') {
                  const emf = selected.emf ?? selected.value ?? 1.5
                  const rIn = selected.internalR ?? 0.5
                  return (
                    <>
                      <label className="flex items-center gap-1.5">
                        <span className="text-zinc-400">ξ:</span>
                        <input
                          type="number"
                          value={emf}
                          step={0.1}
                          min={0}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0
                            setComponents(cs => cs.map(c => c.id === selected.id
                              ? { ...c, emf: v, value: v } : c))
                          }}
                          className="w-20 px-2 py-1 rounded bg-zinc-900/80 border border-border text-foreground"
                        />
                        <span className="text-zinc-400">V</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span className="text-zinc-400">r:</span>
                        <input
                          type="number"
                          value={rIn}
                          step={0.1}
                          min={0}
                          onChange={e => {
                            const v = parseFloat(e.target.value) || 0
                            setComponents(cs => cs.map(c => c.id === selected.id
                              ? { ...c, internalR: v } : c))
                          }}
                          className="w-20 px-2 py-1 rounded bg-zinc-900/80 border border-border text-foreground"
                        />
                        <span className="text-zinc-400">Ω</span>
                      </label>
                    </>
                  )
                }
                if (p?.defaultValue !== undefined) {
                  const step = selected.type === 'resistor' ? 10
                    : selected.type === 'potentiometer' ? 10
                    : selected.type === 'capacitor' ? 10
                    : selected.type === 'inductor' ? 1
                    : 0.5
                  return (
                    <label className="flex items-center gap-1.5">
                      <span className="text-zinc-400">Giá trị:</span>
                      <input
                        type="number"
                        value={selected.value ?? p.defaultValue}
                        step={step}
                        min={0}
                        onChange={e => updateValue(selected.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 rounded bg-zinc-900/80 border border-border text-foreground"
                      />
                      <span className="text-zinc-400">{p.unit}</span>
                    </label>
                  )
                }
                return null
              })()}
              {selected.type === 'switch' && (
                <button
                  onClick={() => toggleSwitch(selected.id)}
                  className={`px-2 py-1 rounded font-bold ${
                    selected.on
                      ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
                      : 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                  }`}
                >
                  {selected.on ? 'ĐÓNG (bật)' : 'MỞ (tắt)'}
                </button>
              )}
              <button
                onClick={rotateSelected}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 border border-border text-zinc-200 hover:bg-zinc-700"
                title="Xoay 90° (phím R)"
              >
                <RotateCw className="w-3 h-3" /> Xoay
              </button>
              <button
                onClick={() => deleteComponent(selected.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30"
              >
                <Trash2 className="w-3 h-3" /> Xoá
              </button>
              <span className="text-[10px] text-zinc-500 ml-auto">
                Phím R = xoay · Delete = xoá · Esc = bỏ chọn
              </span>
            </div>
          )}

          {/* Bài 26 SGK — Measurement table + auto-plot */}
          {isSgk26Active && (
            <Sgk26MeasurementPanel
              measurements={measurements}
              regression={regression}
              r0={SGK_R0}
              onRecord={recordMeasurement}
              onDelete={deleteMeasurement}
              onClear={clearMeasurements}
              hasSim={!!simResult?.ok}
              currentR={(components.find(c => c.id === 'r_var')
                ?? components.find(c => c.type === 'potentiometer'))?.value}
              currentI={simResult?.meterReadings?.[components.find(c => c.type === 'ammeter')?.id ?? ''] ?? simResult?.current ?? 0}
              currentU={simResult?.meterReadings?.[components.find(c => c.type === 'voltmeter')?.id ?? ''] ?? 0}
            />
          )}
        </div>
      </div>

      {/* Footer hướng dẫn */}
      <div className="border-t border-border bg-zinc-950/60 px-5 py-3 text-[11px] text-zinc-400">
        <div className="font-bold text-zinc-300 mb-1 inline-flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Hướng dẫn nhanh:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5">
          <div><b className="text-cyan-300">1.</b> Kéo linh kiện từ palette vào canvas</div>
          <div><b className="text-cyan-300">2.</b> Click 2 chấm đỏ (terminal) để vẽ dây</div>
          <div><b className="text-cyan-300">3.</b> Bấm "▶ Mô phỏng" để xem LED có sáng</div>
          <div><b className="text-cyan-300">4.</b> Double-click công tắc để bật/tắt</div>
        </div>
      </div>

      {/* Saved circuits dialog */}
      {showSavedDialog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
             onClick={() => setShowSavedDialog(false)}>
          <div className="bg-zinc-950 border border-border rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
               onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h4 className="font-bold text-cyan-200 inline-flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Mạch đã lưu ({savedList.length})
              </h4>
              <button onClick={() => setShowSavedDialog(false)}
                      className="text-zinc-400 hover:text-foreground text-xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-3 space-y-1.5">
              {savedList.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-sm">
                  Chưa có mạch nào được lưu.<br />
                  <span className="text-xs">Tạo mạch rồi bấm "💾 Lưu mạch" để lưu vào trình duyệt.</span>
                </div>
              ) : savedList.map((sc, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-border hover:border-cyan-500/40 transition">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-100 truncate">{sc.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {new Date(sc.savedAt).toLocaleString('vi-VN')} ·
                      {' '}{sc.components.length} linh kiện · {sc.wires.length} dây
                    </div>
                  </div>
                  <button onClick={() => loadSaved(sc)}
                          className="px-2 py-1 rounded text-xs bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30">
                    Tải
                  </button>
                  <button onClick={() => deleteSaved(i)}
                          className="p-1 rounded text-rose-300 hover:bg-rose-500/20">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AnalogCircuitBuilder = forwardRef<AnalogCircuitHandle, AnalogCircuitProps>(AnalogCircuitBuilderInner)
AnalogCircuitBuilder.displayName = 'AnalogCircuitBuilder'
export default AnalogCircuitBuilder
