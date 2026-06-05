/** Thư viện MẪU MẠCH (netlist + sơ đồ chân) cho module Thiết kế mạch. Mỗi mẫu
 *  khai báo linh kiện + CHÂN và các "net" = chân nào nối chân nào (sơ đồ chân).
 *  GV/HS mở ra → tự định tuyến → xuất Gerber/JLCPCB. Toạ độ board tính bằng MM. */
import type { PcbComponent, PcbNet, PcbLayout, PcbType } from '@/types/pcb'

export interface TemplateDef { ref: string; type: PcbType; value: string; pins: string[]; px: number; py: number }
export interface PcbTemplate {
  id: string; emoji: string; title: string; desc: string
  board: { w: number; h: number }
  pour?: { net: string; layer: 'top' | 'bottom' }
  defs: TemplateDef[]
  nets: { name: string; nodes: [string, string][] }[]
}

/** Dựng {components, nets, layout} từ một PcbTemplate. */
export function buildTemplate(t: PcbTemplate): { title: string; components: PcbComponent[]; nets: PcbNet[]; layout: PcbLayout } {
  const components: PcbComponent[] = t.defs.map((d, i) => ({
    id: `${t.id}${i}`, type: d.type, ref: d.ref, value: d.value, pins: [...d.pins],
    x: 70 + (i % 5) * 220, y: 70 + Math.floor(i / 5) * 180,   // toạ độ sơ đồ nguyên lý
  }))
  const nets: PcbNet[] = t.nets.map((n, i) => ({ id: `${t.id}n${i}`, name: n.name, nodes: n.nodes.map(([comp, pin]) => ({ comp, pin })) }))
  const placements: PcbLayout['placements'] = {}
  t.defs.forEach((d) => { placements[d.ref] = { x: d.px, y: d.py, rot: 0 } })
  return { title: t.title, components, nets, layout: { board: t.board, placements, traces: [], pour: t.pour ?? { net: 'GND', layer: 'bottom' } } }
}

// ── Mẫu 1: BO PHÂN TÍCH VIDEO BẰNG AI (kiểu ESP32-CAM, dùng Orbit Core) ──────
//  Camera song song 8-bit (D2-D9 + PCLK/VSYNC/HREF/XCLK) + SCCB (I2C) cấu hình
//  camera, lưu khung hình ra thẻ microSD (SPI), nạp/stream qua UART, LED báo.
const AI_VIDEO: PcbTemplate = {
  id: 'aiv', emoji: '🎥', title: 'Bo phân tích video bằng AI (Orbit Core)',
  desc: 'Camera OV2640 → Orbit Core (AI SoC) phân tích khung hình, lưu microSD, stream qua UART. Bus song song 8-bit + SCCB I2C.',
  board: { w: 95, h: 75 },
  defs: [
    // Cột NGUỒN (trái)
    { ref: 'J1', type: 'HDR', value: 'USB-C 5V vào', pins: ['5V', 'GND'], px: 10, py: 10 },
    { ref: 'C1', type: 'C', value: '470µF', pins: ['1', '2'], px: 10, py: 24 },
    { ref: 'U2', type: 'IC', value: 'AMS1117-3.3', pins: ['IN', 'GND', 'OUT'], px: 10, py: 38 },
    { ref: 'C3', type: 'C', value: '10µF', pins: ['1', '2'], px: 10, py: 52 },
    // MCU (giữa) + tụ lọc sát chân
    { ref: 'U1', type: 'MCU', value: 'Orbit Core (AI SoC)', pins: ['5V', '3V3', 'GND', 'EN', 'IO0', 'SIOC', 'SIOD', 'XCLK', 'PCLK', 'VSYNC', 'HREF', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'SDCS', 'SDMOSI', 'SDMISO', 'SDSCK', 'LED', 'TX', 'RX'], px: 42, py: 37 },
    { ref: 'C2', type: 'C', value: '100nF', pins: ['1', '2'], px: 42, py: 10 },
    // Đầu cắm CAMERA / THẺ NHỚ (phải)
    { ref: 'J2', type: 'HDR', value: 'Camera OV2640', pins: ['3V3', 'GND', 'SIOC', 'SIOD', 'XCLK', 'PCLK', 'VSYNC', 'HREF', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'], px: 82, py: 26 },
    { ref: 'J3', type: 'HDR', value: 'Thẻ microSD', pins: ['3V3', 'GND', 'CS', 'MOSI', 'MISO', 'SCK'], px: 82, py: 56 },
    // Trở kéo (cột giữa-phải)
    { ref: 'R1', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 60, py: 22 },
    { ref: 'R2', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 60, py: 34 },
    { ref: 'R4', type: 'R', value: '10kΩ', pins: ['1', '2'], px: 60, py: 46 },
    // Hàng dưới: nút + LED + UART
    { ref: 'J4', type: 'HDR', value: 'UART nạp/stream', pins: ['5V', 'GND', 'TX', 'RX'], px: 10, py: 66 },
    { ref: 'SW2', type: 'SW', value: 'BOOT', pins: ['1', '2'], px: 26, py: 66 },
    { ref: 'SW1', type: 'SW', value: 'RESET', pins: ['1', '2'], px: 38, py: 66 },
    { ref: 'R3', type: 'R', value: '330Ω', pins: ['1', '2'], px: 52, py: 66 },
    { ref: 'LED1', type: 'LED', value: 'trạng thái', pins: ['A', 'K'], px: 66, py: 66 },
  ],
  nets: [
    { name: '+5V', nodes: [['J1', '5V'], ['U2', 'IN'], ['C1', '1'], ['U1', '5V'], ['J4', '5V']] },
    { name: 'GND', nodes: [['J1', 'GND'], ['U2', 'GND'], ['C1', '2'], ['C2', '2'], ['C3', '2'], ['U1', 'GND'], ['J2', 'GND'], ['J3', 'GND'], ['LED1', 'K'], ['J4', 'GND'], ['SW1', '2'], ['SW2', '2']] },
    { name: '+3V3', nodes: [['U2', 'OUT'], ['C2', '1'], ['C3', '1'], ['U1', '3V3'], ['J2', '3V3'], ['J3', '3V3'], ['R1', '1'], ['R2', '1'], ['R4', '1']] },
    { name: 'SCCB_SIOC', nodes: [['U1', 'SIOC'], ['J2', 'SIOC'], ['R1', '2']] },
    { name: 'SCCB_SIOD', nodes: [['U1', 'SIOD'], ['J2', 'SIOD'], ['R2', '2']] },
    { name: 'CAM_XCLK', nodes: [['U1', 'XCLK'], ['J2', 'XCLK']] },
    { name: 'CAM_PCLK', nodes: [['U1', 'PCLK'], ['J2', 'PCLK']] },
    { name: 'CAM_VSYNC', nodes: [['U1', 'VSYNC'], ['J2', 'VSYNC']] },
    { name: 'CAM_HREF', nodes: [['U1', 'HREF'], ['J2', 'HREF']] },
    { name: 'CAM_D2', nodes: [['U1', 'D2'], ['J2', 'D2']] },
    { name: 'CAM_D3', nodes: [['U1', 'D3'], ['J2', 'D3']] },
    { name: 'CAM_D4', nodes: [['U1', 'D4'], ['J2', 'D4']] },
    { name: 'CAM_D5', nodes: [['U1', 'D5'], ['J2', 'D5']] },
    { name: 'CAM_D6', nodes: [['U1', 'D6'], ['J2', 'D6']] },
    { name: 'CAM_D7', nodes: [['U1', 'D7'], ['J2', 'D7']] },
    { name: 'CAM_D8', nodes: [['U1', 'D8'], ['J2', 'D8']] },
    { name: 'CAM_D9', nodes: [['U1', 'D9'], ['J2', 'D9']] },
    { name: 'SD_CS', nodes: [['U1', 'SDCS'], ['J3', 'CS']] },
    { name: 'SD_MOSI', nodes: [['U1', 'SDMOSI'], ['J3', 'MOSI']] },
    { name: 'SD_MISO', nodes: [['U1', 'SDMISO'], ['J3', 'MISO']] },
    { name: 'SD_SCK', nodes: [['U1', 'SDSCK'], ['J3', 'SCK']] },
    { name: 'LED_DRV', nodes: [['U1', 'LED'], ['R3', '1']] },
    { name: 'LED_A', nodes: [['R3', '2'], ['LED1', 'A']] },
    { name: 'UART_TX', nodes: [['U1', 'TX'], ['J4', 'TX']] },
    { name: 'UART_RX', nodes: [['U1', 'RX'], ['J4', 'RX']] },
    { name: 'RESET', nodes: [['U1', 'EN'], ['R4', '2'], ['SW1', '1']] },
    { name: 'BOOT', nodes: [['U1', 'IO0'], ['SW2', '1']] },
  ],
}

// ── Mẫu 2: NHẤP NHÁY LED (cơ bản nhất — GPIO + điện trở hạn dòng) ────────────
const LED_BLINK: PcbTemplate = {
  id: 'blk', emoji: '💡', title: 'Nhấp nháy LED (cơ bản)',
  desc: 'Mạch nhập môn: Orbit Core điều khiển 1 LED qua điện trở hạn dòng 330Ω + tụ lọc nguồn.',
  board: { w: 44, h: 32 },
  defs: [
    { ref: 'J1', type: 'HDR', value: 'Nguồn 5V', pins: ['5V', 'GND'], px: 8, py: 10 },
    { ref: 'U1', type: 'MCU', value: 'Orbit Core', pins: ['5V', '3V3', 'GND', 'IO2'], px: 22, py: 16 },
    { ref: 'C1', type: 'C', value: '100nF', pins: ['1', '2'], px: 16, py: 26 },
    { ref: 'R1', type: 'R', value: '330Ω', pins: ['1', '2'], px: 34, py: 12 },
    { ref: 'LED1', type: 'LED', value: 'LED đỏ', pins: ['A', 'K'], px: 38, py: 22 },
  ],
  nets: [
    { name: '+5V', nodes: [['J1', '5V'], ['U1', '5V']] },
    { name: 'GND', nodes: [['J1', 'GND'], ['U1', 'GND'], ['C1', '2'], ['LED1', 'K']] },
    { name: '+3V3', nodes: [['U1', '3V3'], ['C1', '1']] },
    { name: 'LED_DRV', nodes: [['U1', 'IO2'], ['R1', '1']] },
    { name: 'LED_A', nodes: [['R1', '2'], ['LED1', 'A']] },
  ],
}

// ── Mẫu 3: NÚT CẢM BIẾN IoT (ESP32 + cảm biến I2C + LED báo) ─────────────────
const SENSOR_NODE: PcbTemplate = {
  id: 'sen', emoji: '🌡️', title: 'Nút cảm biến IoT (I2C)',
  desc: 'ESP32 đọc cảm biến BME280 (nhiệt/ẩm/áp) qua I2C có điện trở kéo lên, ổn áp 3.3V, LED báo trạng thái.',
  board: { w: 56, h: 40 },
  defs: [
    { ref: 'J1', type: 'HDR', value: 'USB 5V', pins: ['5V', 'GND'], px: 8, py: 8 },
    { ref: 'U2', type: 'IC', value: 'AMS1117-3.3', pins: ['IN', 'GND', 'OUT'], px: 8, py: 22 },
    { ref: 'C1', type: 'C', value: '10µF', pins: ['1', '2'], px: 18, py: 8 },
    { ref: 'C2', type: 'C', value: '100nF', pins: ['1', '2'], px: 18, py: 30 },
    { ref: 'U1', type: 'MCU', value: 'ESP32', pins: ['5V', '3V3', 'GND', 'SDA', 'SCL', 'IO2'], px: 28, py: 18 },
    { ref: 'U3', type: 'SENSOR', value: 'BME280', pins: ['VCC', 'GND', 'SDA', 'SCL'], px: 45, py: 12 },
    { ref: 'R3', type: 'R', value: '330Ω', pins: ['1', '2'], px: 30, py: 33 },
    { ref: 'R1', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 35, py: 26 },
    { ref: 'R2', type: 'R', value: '4.7kΩ', pins: ['1', '2'], px: 45, py: 26 },
    { ref: 'LED1', type: 'LED', value: 'trạng thái', pins: ['A', 'K'], px: 48, py: 34 },
  ],
  nets: [
    { name: '+5V', nodes: [['J1', '5V'], ['U2', 'IN'], ['U1', '5V']] },
    { name: 'GND', nodes: [['J1', 'GND'], ['U2', 'GND'], ['U1', 'GND'], ['U3', 'GND'], ['C1', '2'], ['C2', '2'], ['LED1', 'K']] },
    { name: '+3V3', nodes: [['U2', 'OUT'], ['U1', '3V3'], ['U3', 'VCC'], ['C1', '1'], ['C2', '1'], ['R1', '1'], ['R2', '1']] },
    { name: 'I2C_SDA', nodes: [['U1', 'SDA'], ['U3', 'SDA'], ['R1', '2']] },
    { name: 'I2C_SCL', nodes: [['U1', 'SCL'], ['U3', 'SCL'], ['R2', '2']] },
    { name: 'LED_DRV', nodes: [['U1', 'IO2'], ['R3', '1']] },
    { name: 'LED_A', nodes: [['R3', '2'], ['LED1', 'A']] },
  ],
}

// ── Mẫu 4: DRONE FLIGHT CONTROLLER (ESP32 + IMU + 4 motor) ───────────────────
const DRONE: PcbTemplate = {
  id: 'dr', emoji: '🚁', title: 'Drone Flight Controller',
  desc: 'Bộ điều khiển bay drone: ESP32 + IMU MPU6050 (I2C), 4 ngõ ESC motor, nguồn LiPo 2S→3.3V, đo pin, LED.',
  board: { w: 60, h: 64 },
  defs: [
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
  ],
  nets: [
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
  ],
}

export const PCB_TEMPLATES: PcbTemplate[] = [AI_VIDEO, SENSOR_NODE, LED_BLINK, DRONE]
export { DRONE }
