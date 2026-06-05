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
    <div className="min-h-screen bg-[#0b1626] p-5 text-foreground"
      style={{ backgroundImage: 'radial-gradient(900px 380px at 50% -8%, rgba(224,138,60,.10), transparent 60%), linear-gradient(rgba(231,194,75,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(231,194,75,.035) 1px, transparent 1px)', backgroundSize: 'auto, 26px 26px, 26px 26px' }}>
      <div className="max-w-6xl mx-auto">
        {/* Bảng hero kiểu bo mạch — nền navy, viền/lỗ bắt vít vàng đồng */}
        <div className="relative mb-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0e1d2f] to-[#13263b] p-5 overflow-hidden">
          {(['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'] as const).map((p) => (
            <span key={p} className={`absolute ${p} w-2.5 h-2.5 rounded-full bg-amber-400/70 ring-2 ring-amber-900/50`} />
          ))}
          <h1 className="text-2xl font-black flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/30 grid place-items-center"><CircuitBoard className="w-6 h-6 text-amber-300" /></span>
            <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">IoT Lab — Thí nghiệm điện tử & vi điều khiển</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            Mỗi thí nghiệm có đường dẫn riêng — bấm <b className="text-amber-300">🔗</b> để chia sẻ hoặc nhúng vào bài học. Giao diện bo mạch chuẩn xưởng: đồng/vàng trên nền navy.
          </p>
        </div>

        {GROUPS.map((g) => {
          const items = ITEMS.filter((it) => it.group === g.id)
          if (!items.length) return null
          return (
            <section key={g.id} className="mb-7">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300/80 mb-3">
                {g.emoji} {g.label} <span className="text-slate-600">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((it) => {
                  const Icon = it.icon
                  return (
                    <Link key={it.path} to={it.path}
                      className="group relative p-4 rounded-xl bg-[#0f2034]/70 border border-amber-500/10 hover:border-amber-400/50 hover:shadow-[0_0_0_1px_rgba(231,194,75,.25)] hover:-translate-y-0.5 transition-all">
                      <span className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-400/40" />
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <ShareMenu path={it.path} title={it.name} embeddable />
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-amber-300" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="font-semibold text-sm text-slate-100 group-hover:text-amber-200 transition-colors">{it.name}</div>
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
