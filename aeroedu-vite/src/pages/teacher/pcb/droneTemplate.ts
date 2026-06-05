/** Mẫu PCB "Drone Flight Controller" — netlist + bố trí sẵn, dùng để giáo viên
 *  mở ra, định tuyến và xuất Gerber (in mạch drone). Toạ độ board tính bằng MM. */
import type { PcbComponent, PcbNet, PcbLayout, PcbType } from '@/types/pcb'

interface Def { ref: string; type: PcbType; value: string; pins: string[]; px: number; py: number }

// [ref, type, value, pins, board x(mm), board y(mm)]
const DEFS: Def[] = [
  { ref: 'BT1', type: 'BAT', value: '2S LiPo 7.4V', pins: ['+', '-'], px: 30, py: 7 },
  { ref: 'D1', type: 'D', value: '1N5819 (chống ngược)', pins: ['A', 'K'], px: 42, py: 7 },
  { ref: 'U3', type: 'IC', value: 'AMS1117-3.3', pins: ['IN', 'GND', 'OUT'], px: 30, py: 17 },
  { ref: 'C3', type: 'C', value: '470µF', pins: ['1', '2'], px: 44, py: 16 },
  { ref: 'C1', type: 'C', value: '10µF', pins: ['1', '2'], px: 46, py: 30 },
  { ref: 'C2', type: 'C', value: '100nF', pins: ['1', '2'], px: 46, py: 37 },
  { ref: 'U1', type: 'MCU', value: 'ESP32 (FC)', pins: ['3V3', 'GND', 'M1', 'M2', 'M3', 'M4', 'SDA', 'SCL', 'RX', 'LED', 'BATADC', '5V'], px: 31, py: 36 },
  { ref: 'U2', type: 'SENSOR', value: 'MPU6050 (IMU)', pins: ['VCC', 'GND', 'SDA', 'SCL', 'INT'], px: 14, py: 35 },
  { ref: 'R1', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 10, py: 50 },
  { ref: 'R2', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 22, py: 50 },
  { ref: 'R3', type: 'R', value: '330Ω', pins: ['1', '2'], px: 40, py: 50 },
  { ref: 'LED1', type: 'LED', value: 'trạng thái', pins: ['A', 'K'], px: 40, py: 58 },
  { ref: 'R4', type: 'R', value: '10kΩ', pins: ['1', '2'], px: 51, py: 27 },
  { ref: 'R5', type: 'R', value: '3.3kΩ', pins: ['1', '2'], px: 51, py: 44 },
  { ref: 'J1', type: 'HDR', value: 'Bộ thu RX', pins: ['5V', 'GND', 'PPM', 'NC'], px: 28, py: 53 },
  { ref: 'J2', type: 'HDR', value: 'Motor 1', pins: ['SIG', '+', '-'], px: 8, py: 8 },
  { ref: 'J3', type: 'HDR', value: 'Motor 2', pins: ['SIG', '+', '-'], px: 52, py: 8 },
  { ref: 'J4', type: 'HDR', value: 'Motor 3', pins: ['SIG', '+', '-'], px: 8, py: 58 },
  { ref: 'J5', type: 'HDR', value: 'Motor 4', pins: ['SIG', '+', '-'], px: 52, py: 50 },
]

const NETS: { name: string; nodes: [string, string][] }[] = [
  { name: 'VBAT', nodes: [['BT1', '+'], ['D1', 'A']] },
  { name: 'VBAT_SW', nodes: [['D1', 'K'], ['U3', 'IN'], ['C3', '1'], ['R4', '1'], ['J2', '+'], ['J3', '+'], ['J4', '+'], ['J5', '+']] },
  { name: '+3V3', nodes: [['U3', 'OUT'], ['U1', '3V3'], ['U2', 'VCC'], ['C1', '1'], ['C2', '1'], ['R1', '1'], ['R2', '1']] },
  { name: 'GND', nodes: [['BT1', '-'], ['U3', 'GND'], ['U1', 'GND'], ['U2', 'GND'], ['C3', '2'], ['C1', '2'], ['C2', '2'], ['R5', '2'], ['LED1', 'K'], ['J1', 'GND'], ['J2', '-'], ['J3', '-'], ['J4', '-'], ['J5', '-']] },
  { name: 'I2C_SDA', nodes: [['U1', 'SDA'], ['U2', 'SDA'], ['R1', '2']] },
  { name: 'I2C_SCL', nodes: [['U1', 'SCL'], ['U2', 'SCL'], ['R2', '2']] },
  { name: 'MOTOR1', nodes: [['U1', 'M1'], ['J2', 'SIG']] },
  { name: 'MOTOR2', nodes: [['U1', 'M2'], ['J3', 'SIG']] },
  { name: 'MOTOR3', nodes: [['U1', 'M3'], ['J4', 'SIG']] },
  { name: 'MOTOR4', nodes: [['U1', 'M4'], ['J5', 'SIG']] },
  { name: 'RX_PPM', nodes: [['U1', 'RX'], ['J1', 'PPM']] },
  { name: '+5V_RX', nodes: [['U1', '5V'], ['J1', '5V']] },
  { name: 'LED_DRV', nodes: [['U1', 'LED'], ['R3', '1']] },
  { name: 'LED_A', nodes: [['R3', '2'], ['LED1', 'A']] },
  { name: 'BAT_SENSE', nodes: [['R4', '2'], ['R5', '1'], ['U1', 'BATADC']] },
]

export function makeDroneTemplate(): { title: string; components: PcbComponent[]; nets: PcbNet[]; layout: PcbLayout } {
  const components: PcbComponent[] = DEFS.map((d, i) => ({
    id: `dr${i}`, type: d.type, ref: d.ref, value: d.value, pins: [...d.pins],
    x: 70 + (i % 5) * 220, y: 70 + Math.floor(i / 5) * 180,   // toạ độ sơ đồ
  }))
  const nets: PcbNet[] = NETS.map((n, i) => ({ id: `dn${i}`, name: n.name, nodes: n.nodes.map(([comp, pin]) => ({ comp, pin })) }))
  const placements: PcbLayout['placements'] = {}
  DEFS.forEach((d) => { placements[d.ref] = { x: d.px, y: d.py, rot: 0 } })

  // GND đã được PHỦ ĐỒNG (ground plane) ở lớp dưới — nối toàn bộ 14 chân GND,
  // tự hở đồng quanh chân khác net (không chập). Đường nguồn/tín hiệu còn lại
  // để GV/HS tự định tuyến theo ratsnest (tránh tự-route sai gây chập).
  return {
    title: 'Drone Flight Controller (mẫu)',
    components, nets,
    layout: { board: { w: 60, h: 64 }, placements, traces: [], pour: { net: 'GND', layer: 'bottom' } },
  }
}
