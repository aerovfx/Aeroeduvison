/** Kiểu dữ liệu module thiết kế mạch (PCB/Schematic) có AI hỗ trợ. */

export type PcbType = 'R' | 'C' | 'LED' | 'D' | 'Q' | 'SW' | 'BAT' | 'GND' | 'VCC' | 'MCU' | 'IC' | 'SENSOR' | 'HDR'

export interface PcbComponent {
  id: string
  type: PcbType
  ref: string        // R1, C1, U1…
  value: string      // 220Ω, 100nF, ESP32…
  pins: string[]     // tên các chân
  x: number
  y: number
}
export interface PcbNetNode { comp: string; pin: string }  // comp = ref
export interface PcbNet { id: string; name: string; nodes: PcbNetNode[] }

// ── Bố trí PCB (Giai đoạn 2) — toạ độ tính bằng MM ──
export interface PcbPlacement { x: number; y: number; rot: number }  // rot: 0/90/180/270 độ
export interface PcbTrace { id: string; layer: 'top' | 'bottom'; width: number; pts: { x: number; y: number }[] }
export interface PcbLayout {
  board: { w: number; h: number }
  placements: Record<string, PcbPlacement>   // key = ref linh kiện
  traces: PcbTrace[]
}

export interface PcbDoc {
  components: PcbComponent[]
  nets: PcbNet[]
  layout?: PcbLayout
}
