/**
 * Arduino Emulator — /dashboard/iot-lab/emulator
 *
 * Trang mô phỏng Arduino full-stack chạy trong browser:
 *  - Code editor (textarea monospace) cho HS viết sketch C++
 *  - Transpile real-time sang JS qua arduino-transpile.ts
 *  - Execute trong AsyncFunction sandbox với arduino-runtime.ts
 *  - SVG schematic hiển thị 14 digital pins (LED state, color theo PWM)
 *    + 6 analog inputs (A0-A5)
 *  - Virtual hardware: Button click trên UI (pin 2), Potentiometer slider (A0)
 *  - Serial monitor giả lập (auto-scroll, max 200 dòng)
 *  - 6 preset sketches builtin
 *  - Speed slider (0.25x – 5x) — chia delay()
 *
 * Subset C++ hỗ trợ: setup/loop, if/for/while, pinMode/digitalWrite/Read,
 * analogWrite/Read, delay, Serial.print/ln, user-defined functions.
 * Không hỗ trợ: classes, structs, pointers, #include, String class.
 */
import { useState, useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Link } from 'react-router-dom'
import {
  Play, Pause, RotateCcw, Cpu, Code2, Terminal, AlertTriangle, Zap,
  ChevronLeft, FileCode2, Lightbulb, Sliders, CircuitBoard,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { ArduinoRuntime, type RuntimeSnapshot, type StopSignal } from '@/lib/arduino-runtime'
import { transpileArduino, executeSketch } from '@/lib/arduino-transpile'
import {
  ArduinoBoardSVG, LED, PushButton, Potentiometer, Resistor,
  type LEDColor,
} from '@/components/iot/ArduinoComponents'

// ─── Preset sketches ───────────────────────────────────────────────
interface Preset {
  id: string
  name: string
  emoji: string
  description: string
  code: string
}

const PRESETS: Preset[] = [
  {
    id: 'blink',
    name: 'Blink LED',
    emoji: '💡',
    description: 'Hello world của Arduino — chớp tắt LED tại pin 13 mỗi giây.',
    code: `// Blink — chớp tắt LED built-in (pin 13) mỗi giây
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  Serial.println("LED ON");
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`,
  },
  {
    id: 'button-led',
    name: 'Button + LED',
    emoji: '🔘',
    description: 'Bấm button pin 2 → LED pin 13 sáng. Click trên schematic để toggle button.',
    code: `// Button (pin 2) điều khiển LED (pin 13)
const int BTN = 2;
const int LED = 13;

void setup() {
  pinMode(BTN, INPUT_PULLUP);
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int state = digitalRead(BTN);
  if (state == LOW) {     // button pressed (active low)
    digitalWrite(LED, HIGH);
    Serial.println("Pressed");
  } else {
    digitalWrite(LED, LOW);
  }
  delay(50);
}`,
  },
  {
    id: 'pwm-fade',
    name: 'PWM Fade (LED breathe)',
    emoji: '🌬',
    description: 'LED pin 9 mờ dần rồi sáng dần (PWM 0-255). Hiệu ứng "thở".',
    code: `// LED pin 9 fade in-out qua PWM
const int LED = 9;
int brightness = 0;
int direction = 5;

void setup() {
  pinMode(LED, OUTPUT);
}

void loop() {
  analogWrite(LED, brightness);
  brightness = brightness + direction;
  if (brightness <= 0 || brightness >= 255) {
    direction = -direction;
  }
  delay(30);
}`,
  },
  {
    id: 'pot-read',
    name: 'Potentiometer → LED brightness',
    emoji: '🎚',
    description: 'Đọc giá trị A0 (potentiometer 0-1023) → map sang PWM 0-255 cho LED pin 9.',
    code: `// A0 potentiometer điều khiển độ sáng LED pin 9
const int POT = A0;
const int LED = 9;

void setup() {
  pinMode(LED, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(POT);            // 0-1023
  int brightness = map(value, 0, 1023, 0, 255);
  analogWrite(LED, brightness);
  Serial.print("Pot: ");
  Serial.print(value);
  Serial.print(" → LED: ");
  Serial.println(brightness);
  delay(100);
}`,
  },
  {
    id: 'traffic-light',
    name: 'Đèn giao thông',
    emoji: '🚦',
    description: '3 LED đỏ (11), vàng (10), xanh (9) chạy theo chu kỳ giao thông thực tế.',
    code: `// Đèn giao thông tại pin 11 (đỏ), 10 (vàng), 9 (xanh)
const int RED = 11;
const int YELLOW = 10;
const int GREEN = 9;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
}

void loop() {
  // Đèn xanh 3s
  digitalWrite(GREEN, HIGH);
  delay(3000);
  digitalWrite(GREEN, LOW);
  // Đèn vàng 1s
  digitalWrite(YELLOW, HIGH);
  delay(1000);
  digitalWrite(YELLOW, LOW);
  // Đèn đỏ 3s
  digitalWrite(RED, HIGH);
  delay(3000);
  digitalWrite(RED, LOW);
}`,
  },
  {
    id: 'chaser',
    name: 'LED Chaser (Knight Rider)',
    emoji: '🏎',
    description: '6 LED pin 8-13 chạy đèn pha kiểu Knight Rider, tự đảo chiều.',
    code: `// Knight Rider — 6 LED chạy đèn pha qua lại
int leds[] = { 8, 9, 10, 11, 12, 13 };
int n = 6;
int pos = 0;
int dir = 1;

void setup() {
  for (int i = 0; i < n; i++) {
    pinMode(leds[i], OUTPUT);
  }
}

void loop() {
  // Tắt hết
  for (int i = 0; i < n; i++) {
    digitalWrite(leds[i], LOW);
  }
  // Bật đèn hiện tại
  digitalWrite(leds[pos], HIGH);
  delay(100);
  pos = pos + dir;
  if (pos >= n - 1 || pos <= 0) {
    dir = -dir;
  }
}`,
  },
]

// ─── Component ─────────────────────────────────────────────────────

/**
 * Imperative API exposed cho LabChallengeBlock:
 * - getSnapshot() → code hiện tại + pin states snapshot sau khi chạy
 * - loadSnapshot({ code }) → load code GV làm reference
 */
export interface ArduinoEmulatorHandle {
  getSnapshot(): { code: string; pinStates: RuntimeSnapshot | null; error: string | null }
  loadSnapshot(snap: { code: string }): void
}

interface ArduinoProps {
  /** Initial code — challenge reference */
  initialCode?: string
}

function ArduinoEmulatorInner(
  { initialCode }: ArduinoProps,
  ref: React.Ref<ArduinoEmulatorHandle>,
) {
  const [code, setCode] = useState(initialCode || PRESETS[0].code)
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speed, setSpeed] = useState(1.0)
  const [activePresetId, setActivePresetId] = useState(PRESETS[0].id)
  const [analogA0, setAnalogA0] = useState(512)
  const [showPresets, setShowPresets] = useState(true)

  const runtimeRef = useRef<ArduinoRuntime | null>(null)
  const signalRef = useRef<StopSignal>({ stopped: true })
  const codeAreaRef = useRef<HTMLTextAreaElement | null>(null)

  // ── Run / Stop / Reset ──
  const start = useCallback(async () => {
    setError(null)
    const result = transpileArduino(code)
    if (!result.ok) {
      setError(result.error)
      toast.error('Transpile lỗi: ' + result.error)
      return
    }
    // Init runtime
    signalRef.current = { stopped: false }
    const rt = new ArduinoRuntime(signalRef.current, { speed, maxDelayMs: 30_000 })
    rt.start()
    runtimeRef.current = rt
    rt.subscribe(() => setSnapshot(rt.snapshot()))
    setSnapshot(rt.snapshot())
    setRunning(true)

    try {
      await executeSketch(result.jsCode, rt, signalRef.current)
    } catch (e: any) {
      const msg = e?.message || 'Runtime error'
      rt.error = msg
      setError(msg)
      toast.error('Runtime: ' + msg.slice(0, 100))
    } finally {
      setRunning(false)
      setSnapshot(rt.snapshot())
    }
  }, [code, speed])

  const stop = useCallback(() => {
    signalRef.current.stopped = true
    setRunning(false)
  }, [])

  const reset = useCallback(() => {
    stop()
    setTimeout(() => {
      runtimeRef.current = null
      setSnapshot(null)
      setError(null)
    }, 100)
  }, [stop])

  const loadPreset = (preset: Preset) => {
    if (running) stop()
    setCode(preset.code)
    setActivePresetId(preset.id)
    setError(null)
    setTimeout(() => setSnapshot(null), 50)
  }

  // ── Update analog A0 (potentiometer slider) ──
  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.setExternalAnalogIn(14, analogA0)
  }, [analogA0])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { signalRef.current.stopped = true }
  }, [])

  // Expose imperative API cho LabChallengeBlock
  useImperativeHandle(ref, () => ({
    getSnapshot: () => ({ code, pinStates: snapshot, error }),
    loadSnapshot: (snap) => {
      if (typeof snap.code === 'string') setCode(snap.code)
      setSnapshot(null); setError(null)
    },
  }), [code, snapshot, error])

  // ── Toggle pin 2 (virtual button) ──
  const togglePin2 = useCallback(() => {
    if (!runtimeRef.current) return
    const current = runtimeRef.current.digitalRead(2)
    runtimeRef.current.setExternalDigitalIn(2, current ? 0 : 1)
  }, [])

  // ── Render ──
  return (
    <div className="min-h-screen bg-[#0a0612] text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/dashboard/iot-lab" className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> IoT Lab
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <Cpu className="w-5 h-5 text-emerald-400" />
          <h1 className="font-bold">Arduino Emulator</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            ⚡ Pure JS · subset C++
          </span>
          <div className="flex-1" />

          {/* Speed control */}
          <div className="inline-flex items-center gap-2 text-xs">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Tốc độ:</span>
            <select
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              disabled={running}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none disabled:opacity-40"
            >
              <option value={0.25}>0.25x (chậm)</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x (chuẩn)</option>
              <option value={2}>2x</option>
              <option value={5}>5x (nhanh)</option>
            </select>
          </div>

          {/* Controls */}
          {!running ? (
            <button
              onClick={start}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
            >
              <Play className="w-3.5 h-3.5" fill="currentColor" /> Chạy
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-white inline-flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" /> Dừng
            </button>
          )}
          <button
            onClick={reset}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10"
            title="Reset hardware"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* Left: presets */}
        {showPresets && (
          <aside className="col-span-3 lg:col-span-2 space-y-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Sketch mẫu</h3>
                <button onClick={() => setShowPresets(false)} className="text-[10px] text-white/40 hover:text-white">▶</button>
              </div>
              <div className="space-y-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => loadPreset(p)}
                    className={`w-full text-left px-2 py-2 rounded-lg border transition-colors ${
                      activePresetId === p.id
                        ? 'bg-emerald-500/15 border-emerald-500/40'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                    }`}
                    title={p.description}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-xs font-bold text-white">{p.name}</span>
                    </div>
                    <div className="text-[10px] text-white/50 leading-tight line-clamp-2 pl-5">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pin reference */}
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 text-[11px] text-white/70 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
                <Lightbulb className="w-3.5 h-3.5" /> Pin map
              </div>
              <div>• <strong>D0-D13</strong> digital I/O</div>
              <div>• <strong>D3,5,6,9,10,11</strong> PWM (analogWrite)</div>
              <div>• <strong>A0-A5</strong> analog input</div>
              <div>• <strong>D13</strong> LED_BUILTIN</div>
              <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50">
                Click LED pin 2 trên schematic để toggle button. Kéo slider A0 cho potentiometer.
              </div>
            </div>
          </aside>
        )}
        {!showPresets && (
          <aside className="col-span-1 lg:col-span-1">
            <button onClick={() => setShowPresets(true)} className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs">◀</button>
          </aside>
        )}

        {/* Center: code editor */}
        <main className={`${showPresets ? 'col-span-9 lg:col-span-5' : 'col-span-11 lg:col-span-6'}`}>
          <div className="bg-[#0d0e17] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-xs">
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white/80">sketch.ino</span>
              <span className="text-white/40">·</span>
              <span className="text-white/50">{code.length} ký tự · {code.split('\n').length} dòng</span>
              <div className="flex-1" />
              {running && (
                <span className="text-[10px] inline-flex items-center gap-1 text-emerald-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> đang chạy
                </span>
              )}
            </div>
            <textarea
              ref={codeAreaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              className="w-full p-3 bg-[#06030f] text-white/90 font-mono text-xs leading-relaxed outline-none resize-none"
              style={{ height: 480, minHeight: 400, tabSize: 2 }}
            />
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold mb-1">Lỗi</div>
                  <div className="font-mono">{error}</div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Right: schematic + serial */}
        <aside className={`${showPresets ? 'col-span-12 lg:col-span-5' : 'col-span-12 lg:col-span-5'} space-y-3`}>
          {/* Schematic */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-1.5">
              <CircuitBoard className="w-3.5 h-3.5 text-cyan-400" /> Schematic
            </h3>
            <Schematic snapshot={snapshot} onPin2Toggle={togglePin2} potValue={analogA0} />
          </div>

          {/* Analog input slider */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-violet-400" /> Potentiometer A0
              </h3>
              <span className="text-xs font-mono text-violet-300">{analogA0}</span>
            </div>
            <input
              type="range"
              min={0}
              max={1023}
              value={analogA0}
              onChange={e => setAnalogA0(Number(e.target.value))}
              className="w-full accent-violet-400"
            />
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>0</span><span>512</span><span>1023</span>
            </div>
          </div>

          {/* Serial Monitor */}
          <div className="bg-[#06030f] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 text-xs">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white/80">Serial Monitor</span>
              <span className="text-white/40 ml-1">· 9600 baud</span>
              <div className="flex-1" />
              <span className="text-[10px] text-white/40">{snapshot?.serial.length || 0} dòng</span>
            </div>
            <SerialMonitor lines={snapshot?.serial || []} />
          </div>
        </aside>
      </div>

      {/* Help hint */}
      <div className="max-w-[1600px] mx-auto px-4 pb-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-white/60 leading-relaxed">
          💡 <strong className="text-emerald-300">Cách dùng:</strong> Chọn sketch mẫu bên trái → bấm <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] font-mono">▶ Chạy</kbd>.
          Sửa code, bấm Chạy lại để xem kết quả mới. <strong>Subset C++ hỗ trợ:</strong> setup/loop,
          if/for/while, pinMode, digitalWrite/Read, analogWrite/Read, delay, Serial.print/ln,
          tone, user functions (void/return), int/long/byte/bool/float, const, ++/--/+=/-= operators.
          <br/>
          ⚠ <strong className="text-rose-300">Không hỗ trợ:</strong> class/struct/pointer/#include/String class.
          Sketch sai sẽ throw error — đọc message ở khung đỏ.
        </div>
      </div>
    </div>
  )
}

const ArduinoEmulator = forwardRef<ArduinoEmulatorHandle, ArduinoProps>(ArduinoEmulatorInner)
ArduinoEmulator.displayName = 'ArduinoEmulator'
export default ArduinoEmulator

// ─── Schematic component (realistic) ──────────────────────────────
function Schematic({
  snapshot, onPin2Toggle, potValue,
}: { snapshot: RuntimeSnapshot | null; onPin2Toggle: () => void; potValue: number }) {
  const pins = snapshot?.pins || {}

  // LED color rotation cho external LEDs (mỗi pin 1 màu khác)
  const ledColorMap: Record<number, LEDColor> = {
    8: 'red', 9: 'yellow', 10: 'green', 11: 'blue', 12: 'orange', 13: 'yellow',
  }

  const ledBrightness = (n: number): number => {
    const p = pins[n]
    if (!p) return 0
    if (p.kind === 'pwm') return p.value / 255
    return p.value > 0 ? 1 : 0
  }
  const ledOn = (n: number): boolean => {
    const p = pins[n]
    if (!p) return false
    if (p.kind === 'pwm') return p.value > 8
    return p.value > 0
  }

  return (
    <svg viewBox="0 0 540 460" className="w-full" style={{ background: '#06030f', borderRadius: 8 }}>
      {/* Background grid (subtle) */}
      <defs>
        <pattern id="schemBg" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="540" height="460" fill="url(#schemBg)" />

      {/* Arduino board PCB chi tiết */}
      <ArduinoBoardSVG pinStates={pins as any} onPinClick={(p) => p === 2 && onPin2Toggle()} />

      {/* External LEDs row dưới board (pin 8-13 sleek breadboard area) */}
      <g>
        {/* Connection wires từ board pin lên LED */}
        {[8, 9, 10, 11, 12, 13].map((pin, idx) => {
          const x = 100 + idx * 60
          const on = ledOn(pin)
          // Board pin position (D8-D13 in top header)
          const boardPinX = 192 + (pin - 8) * 24
          const boardPinY = 67
          return (
            <g key={`wire-${pin}`}>
              <line
                x1={boardPinX} y1={boardPinY}
                x2={x} y2={400}
                stroke={on ? '#fbbf24' : '#475569'}
                strokeWidth={1.5}
                opacity={on ? 0.8 : 0.5}
              />
            </g>
          )
        })}

        {/* LEDs */}
        {[8, 9, 10, 11, 12, 13].map((pin, idx) => {
          const x = 100 + idx * 60
          return (
            <LED
              key={`led-${pin}`}
              cx={x} cy={400}
              on={ledOn(pin)}
              brightness={ledBrightness(pin)}
              color={ledColorMap[pin]}
              label={`D${pin}`}
            />
          )
        })}
      </g>

      {/* Push button kết nối pin 2 (click để toggle) */}
      <g onClick={onPin2Toggle}>
        {/* Wire từ board D2 xuống button */}
        <line
          x1={192 + (2 - 0) * 24 /* D2 ở bottom row */} y1={284}
          x2={70} y2={400}
          stroke={pins[2]?.value ? '#22c55e' : '#475569'} strokeWidth={1.5}
          opacity={0.7}
        />
        <PushButton cx={70} cy={400} pressed={!!pins[2]?.value} label="BTN→D2" />
      </g>

      {/* Resistor mẫu trang trí gần LED row */}
      <Resistor cx={460} cy={420} bands={['red', 'red', 'brown', 'gold']} label="220Ω" />

      {/* Potentiometer kết nối A0 */}
      <g>
        <line x1={185} y1={279 /* A0 pin */} x2={500} y2={120} stroke="#a78bfa" strokeWidth={1.5} opacity={0.6} />
        <Potentiometer cx={500} cy={120} value={potValue / 1023} label="POT→A0" />
      </g>

      {/* Status bar bottom */}
      <text x={40} y={448} fill="#10b981" fontSize="11" fontFamily="monospace">
        ⏱ {snapshot ? (snapshot.uptimeMs / 1000).toFixed(1) : '0.0'}s
      </text>
      {snapshot?.running && (
        <g>
          <circle cx={490} cy={444} r={4} fill="#10b981">
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
          </circle>
          <text x={500} y={448} fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold">RUNNING</text>
        </g>
      )}
      {!snapshot && (
        <text x={490} y={448} textAnchor="end" fill="#64748b" fontSize="10" fontFamily="monospace">
          Bấm ▶ Chạy để khởi động
        </text>
      )}
    </svg>
  )
}

// ─── Serial Monitor component ──────────────────────────────────────
function SerialMonitor({ lines }: { lines: Array<{ t: number; text: string }> }) {
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [lines.length])

  if (lines.length === 0) {
    return (
      <div className="p-3 text-xs text-white/30 italic h-48 flex items-center justify-center">
        Bấm "Chạy" để xem output...
      </div>
    )
  }

  return (
    <div className="h-48 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-white/30 flex-shrink-0">{(l.t / 1000).toFixed(2)}s</span>
          <span className="text-emerald-300 whitespace-pre-wrap break-all">{l.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
