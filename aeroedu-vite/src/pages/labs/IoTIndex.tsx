/**
 * IoTIndex — Trang hub các thí nghiệm IoT, tách thành card riêng có PHÂN NHÓM
 * (giống LabsIndex/LabTwin). Mỗi thí nghiệm có ROUTE riêng → dễ nhúng vào bài
 * học (iframe/deep-link) và CHIA SẺ (nút copy link mỗi card).
 *
 * Circuit Arduino dùng route sẵn có /dashboard/iot-lab/sketch/:id (IoTLab tự mở
 * đúng mạch). Công cụ mô phỏng dùng các route con đã có.
 */
import { Link } from 'react-router-dom'
import {
  Cpu, Wifi, Gauge, Wrench, BookOpen, Activity, Sigma, CircuitBoard, FileCode2,
  Lightbulb, Radio, Clock, Move3d, Ruler, Zap,
} from 'lucide-react'
import ShareMenu from '@/components/common/ShareMenu'

type Group = 'arduino' | 'sensor' | 'network' | 'tools'
interface IoTItem {
  name: string
  desc: string
  path: string
  icon: typeof Cpu
  level?: 'Dễ' | 'Trung bình' | 'Nâng cao'
  group: Group
}

const C = '/dashboard/iot-lab/sketch'
const ITEMS: IoTItem[] = [
  // ── Arduino — Cơ bản ──
  { name: 'Blink LED — UNO', desc: 'Nhấp nháy LED · digitalWrite · delay', path: `${C}/blink-uno`, icon: Lightbulb, level: 'Dễ', group: 'arduino' },
  { name: 'Blink LED — ESP32', desc: 'GPIO ESP32 · nền tảng IoT', path: `${C}/blink-esp32`, icon: Lightbulb, level: 'Dễ', group: 'arduino' },
  { name: 'Đèn giao thông', desc: '3 LED tuần tự · state machine', path: `${C}/traffic-light`, icon: Radio, level: 'Dễ', group: 'arduino' },
  { name: 'Button + LED', desc: 'Đọc nút nhấn · digitalRead · debounce', path: `${C}/button-led`, icon: Zap, level: 'Dễ', group: 'arduino' },
  { name: 'LED Chaser', desc: 'Hiệu ứng Knight Rider · mảng chân', path: `${C}/chaser`, icon: Activity, level: 'Dễ', group: 'arduino' },

  // ── Cảm biến & Điều khiển ──
  { name: 'PWM Dimmer', desc: 'Biến trở chỉnh độ sáng · analogRead/Write', path: `${C}/pwm-dimmer`, icon: Gauge, level: 'Trung bình', group: 'sensor' },
  { name: 'Servo Sweep', desc: 'Quét servo 0–180° · thư viện Servo', path: `${C}/servo-sweep`, icon: Move3d, level: 'Trung bình', group: 'sensor' },
  { name: 'Siêu âm HC-SR04', desc: 'Đo khoảng cách · echo/trigger', path: `${C}/ultrasonic`, icon: Ruler, level: 'Trung bình', group: 'sensor' },
  { name: 'DHT22 Nhiệt-Ẩm', desc: 'Cảm biến nhiệt độ & độ ẩm', path: `${C}/dht22`, icon: Gauge, level: 'Trung bình', group: 'sensor' },

  // ── IoT / Mạng ──
  { name: 'ESP32 Web Server', desc: 'Bật/tắt LED qua HTTP · WiFi', path: `${C}/esp32-web`, icon: Wifi, level: 'Nâng cao', group: 'network' },
  { name: 'NTP Clock + LCD', desc: 'Đồng hồ NTP hiển thị LCD 1602 I²C', path: `${C}/esp32-ntp-lcd`, icon: Clock, level: 'Nâng cao', group: 'network' },

  // ── Công cụ & Mô phỏng ──
  { name: 'Arduino Sim', desc: 'Viết code .ino → chạy real-time', path: '/dashboard/iot-lab/emulator', icon: FileCode2, group: 'tools' },
  { name: 'Mạch Analog', desc: 'Lắp ghép battery, R, LED, tụ', path: '/dashboard/iot-lab/circuit-builder', icon: Wrench, group: 'tools' },
  { name: '8 Mạch mẫu', desc: 'Nối tiếp, song song, RC…', path: '/dashboard/iot-lab/circuit-presets', icon: BookOpen, group: 'tools' },
  { name: 'Mô phỏng mạch', desc: 'RLC, dao động, đồ thị', path: '/dashboard/iot-lab/circuit-simulator', icon: Activity, group: 'tools' },
  { name: 'Bán dẫn', desc: 'Diode, NE555, Op-Amp', path: '/dashboard/iot-lab/semiconductor', icon: Sigma, group: 'tools' },
  { name: 'Cổng Logic', desc: 'AND, OR, NOT, Flip-Flop', path: '/dashboard/iot-lab/digital-logic', icon: Cpu, group: 'tools' },
  { name: 'Wokwi Custom', desc: 'Tự thiết kế bo mạch', path: '/dashboard/iot-lab/custom-board', icon: CircuitBoard, group: 'tools' },
]

const GROUPS: { id: Group; label: string; emoji: string }[] = [
  { id: 'arduino', label: 'Arduino — Cơ bản', emoji: '💡' },
  { id: 'sensor', label: 'Cảm biến & Điều khiển', emoji: '🎚️' },
  { id: 'network', label: 'IoT / Mạng', emoji: '📡' },
  { id: 'tools', label: 'Công cụ & Mô phỏng', emoji: '🛠️' },
]
const LEVEL_COLOR: Record<string, string> = { 'Dễ': '#22c55e', 'Trung bình': '#f59e0b', 'Nâng cao': '#ef4444' }

export default function IoTIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-5 text-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="text-cyan-400" /> IoT Lab — Thí nghiệm điện tử & vi điều khiển
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Mỗi thí nghiệm có đường dẫn riêng — bấm <b className="text-cyan-300">🔗</b> để chia sẻ hoặc nhúng vào bài học.
          </p>
        </div>

        {GROUPS.map((g) => {
          const items = ITEMS.filter((it) => it.group === g.id)
          if (!items.length) return null
          return (
            <section key={g.id} className="mb-7">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">
                {g.emoji} {g.label} <span className="text-slate-600">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((it) => {
                  const Icon = it.icon
                  return (
                    <Link key={it.path} to={it.path}
                      className="group relative p-4 rounded-xl bg-slate-900/60 border border-border hover:border-cyan-500/50 hover:scale-[1.01] transition-all">
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <ShareMenu path={it.path} title={it.name} embeddable />
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="font-semibold text-sm text-foreground group-hover:text-cyan-200 transition-colors">{it.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{it.desc}</div>
                          {it.level && (
                            <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ color: LEVEL_COLOR[it.level], background: `${LEVEL_COLOR[it.level]}1a`, border: `1px solid ${LEVEL_COLOR[it.level]}40` }}>
                              {it.level}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
