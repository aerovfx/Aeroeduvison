/** Thư viện ký hiệu sơ đồ nguyên lý + vị trí chân cho từng loại linh kiện. */
import type { PcbComponent, PcbType } from '@/types/pcb'

type Cat = '2pin' | 'power' | 'box'
export const TEMPLATES: Record<PcbType, { label: string; value: string; pins: string[]; cat: Cat; icon: string }> = {
  R:      { label: 'Điện trở',     value: '1kΩ',    pins: ['1', '2'], cat: '2pin', icon: '▭' },
  C:      { label: 'Tụ điện',      value: '100nF',  pins: ['1', '2'], cat: '2pin', icon: '‖' },
  LED:    { label: 'LED',          value: 'đỏ',     pins: ['A', 'K'], cat: '2pin', icon: '◄' },
  D:      { label: 'Diode',        value: '1N4148', pins: ['A', 'K'], cat: '2pin', icon: '▷' },
  SW:     { label: 'Nút nhấn',     value: '',       pins: ['1', '2'], cat: '2pin', icon: '⎚' },
  BAT:    { label: 'Nguồn pin',    value: '5V',     pins: ['+', '-'], cat: '2pin', icon: '🔋' },
  Q:      { label: 'Transistor',   value: 'NPN',    pins: ['B', 'C', 'E'], cat: 'box', icon: 'Q' },
  GND:    { label: 'Mass (GND)',   value: '',       pins: ['GND'], cat: 'power', icon: '⏚' },
  VCC:    { label: 'Nguồn (VCC)',  value: '5V',     pins: ['VCC'], cat: 'power', icon: '⌁' },
  MCU:    { label: 'Vi điều khiển', value: 'ESP32', pins: ['3V3', 'GND', 'D2', 'D4', 'TX', 'RX'], cat: 'box', icon: '▣' },
  IC:     { label: 'IC',           value: 'NE555',  pins: ['1', '2', '3', '4', '5', '6', '7', '8'], cat: 'box', icon: '▤' },
  SENSOR: { label: 'Cảm biến',     value: 'DHT22',  pins: ['VCC', 'DATA', 'GND'], cat: 'box', icon: '◎' },
  HDR:    { label: 'Cổng/Header',  value: '',       pins: ['1', '2', '3', '4'], cat: 'box', icon: '⋮' },
}
export const catOf = (t: PcbType) => TEMPLATES[t].cat

export function compSize(c: PcbComponent): { w: number; h: number } {
  const cat = catOf(c.type)
  if (cat === '2pin') return { w: 100, h: 56 }
  if (cat === 'power') return { w: 56, h: 58 }
  const n = Math.max(1, c.pins.length); const rows = Math.ceil(n / 2)
  return { w: 140, h: Math.max(70, rows * 24 + 28) }
}

/** Vị trí chân (local) theo loại — trả {name,x,y}. */
export function pinLocal(c: PcbComponent): { name: string; x: number; y: number }[] {
  const cat = catOf(c.type)
  if (cat === '2pin') return [
    { name: c.pins[0] || '1', x: 0, y: 28 },
    { name: c.pins[1] || '2', x: 100, y: 28 },
  ]
  if (cat === 'power') return [{ name: c.pins[0] || 'GND', x: 28, y: 0 }]
  const { w } = compSize(c); const half = Math.ceil(c.pins.length / 2)
  return c.pins.map((name, i) => i < half
    ? { name, x: 0, y: 28 + i * 24 }
    : { name, x: w, y: 28 + (i - half) * 24 })
}

const OL = { stroke: '#334155', strokeWidth: 2 } as const

/** Vẽ ký hiệu (glyph + nhãn + cuống chân). KHÔNG kèm vòng tròn chân (editor vẽ riêng). */
export function Glyph({ c }: { c: PcbComponent }) {
  const cat = catOf(c.type); const { w, h } = compSize(c)
  const label = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end' = 'middle', fs = 11, fill = '#0f172a') =>
    <text x={x} y={y} fontSize={fs} fontWeight="bold" textAnchor={anchor} fill={fill}>{t}</text>

  if (cat === '2pin') {
    const cy = 28
    const stub = <><line x1={0} y1={cy} x2={30} y2={cy} {...OL} /><line x1={70} y1={cy} x2={100} y2={cy} {...OL} /></>
    let body = null
    if (c.type === 'R') body = <rect x={30} y={cy - 9} width={40} height={18} rx={3} fill="#fff" {...OL} />
    else if (c.type === 'C') body = <><line x1={45} y1={cy - 12} x2={45} y2={cy + 12} {...OL} /><line x1={55} y1={cy - 12} x2={55} y2={cy + 12} {...OL} /></>
    else if (c.type === 'LED' || c.type === 'D') body = <><polygon points={`38,${cy - 11} 38,${cy + 11} 58,${cy}`} fill="#fff" {...OL} /><line x1={58} y1={cy - 11} x2={58} y2={cy + 11} {...OL} />{c.type === 'LED' && <><line x1={60} y1={cy - 14} x2={68} y2={cy - 22} stroke="#f59e0b" strokeWidth={1.6} /><line x1={66} y1={cy - 12} x2={74} y2={cy - 20} stroke="#f59e0b" strokeWidth={1.6} /></>}</>
    else if (c.type === 'BAT') body = <><line x1={42} y1={cy - 14} x2={42} y2={cy + 14} {...OL} /><line x1={50} y1={cy - 7} x2={50} y2={cy + 7} {...OL} /><line x1={58} y1={cy - 14} x2={58} y2={cy + 14} {...OL} /></>
    else if (c.type === 'SW') body = <><circle cx={36} cy={cy} r={2.5} fill="#334155" /><circle cx={64} cy={cy} r={2.5} fill="#334155" /><line x1={36} y1={cy} x2={62} y2={cy - 12} {...OL} /></>
    return <g>{stub}{body}{label(50, 12, c.ref, 'middle', 11, '#7c3aed')}{c.value && label(50, h - 2, c.value)}</g>
  }
  if (cat === 'power') {
    if (c.type === 'GND') return <g><line x1={28} y1={0} x2={28} y2={20} {...OL} /><line x1={14} y1={20} x2={42} y2={20} {...OL} /><line x1={19} y1={28} x2={37} y2={28} {...OL} /><line x1={23} y1={36} x2={33} y2={36} {...OL} />{label(28, 50, 'GND', 'middle', 9, '#64748b')}</g>
    return <g><line x1={28} y1={0} x2={28} y2={16} {...OL} /><polygon points="20,16 36,16 28,4" fill="#ef4444" stroke="#334155" strokeWidth={1.5} />{label(28, 44, c.value || 'VCC', 'middle', 10, '#ef4444')}</g>
  }
  // box
  return <g>
    <rect x={6} y={20} width={w - 12} height={h - 26} rx={5} fill="#fff" stroke="#334155" strokeWidth={2} />
    {label(w / 2, 14, c.ref, 'middle', 11, '#7c3aed')}
    {label(w / 2, h / 2 + 4, c.value, 'middle', 11, '#0f172a')}
    {pinLocal(c).map((p, i) => (
      <text key={i} x={p.x === 0 ? 12 : w - 12} y={p.y + 3} fontSize={8.5} fill="#475569" textAnchor={p.x === 0 ? 'start' : 'end'}>{p.name}</text>
    ))}
    {pinLocal(c).map((p, i) => <line key={'s' + i} x1={p.x} y1={p.y} x2={p.x === 0 ? 6 : w - 6} y2={p.y} {...OL} />)}
  </g>
}
