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

export interface PcbDoc {
  components: PcbComponent[]
  nets: PcbNet[]
}
