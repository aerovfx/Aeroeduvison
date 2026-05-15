/**
 * Arduino Runtime — virtual board state + async API cho code transpile
 *
 * Phục vụ Arduino Emulator (/dashboard/iot-lab/emulator). Cung cấp 1 đối
 * tượng `runtime` được pass vào sketch đã transpile từ Arduino C++ → JS.
 *
 * API tương thích Arduino API cơ bản:
 *   - pinMode(pin, mode)        OUTPUT / INPUT / INPUT_PULLUP
 *   - digitalWrite(pin, value)  HIGH / LOW
 *   - digitalRead(pin)          → 0/1
 *   - analogWrite(pin, value)   0-255 PWM (duty cycle)
 *   - analogRead(pin)           A0-A5 → 0-1023
 *   - delay(ms)                 await pause
 *   - delayMicroseconds(us)
 *   - millis() / micros()       → uint32
 *   - Serial.begin / print / println / write
 *   - tone(pin, freq, dur?)     buzzer (tracked, không phát thật)
 *   - noTone(pin)
 *
 * Hardware mô phỏng:
 *   - 14 digital pins (0-13) + 6 analog (A0-A5 alias 14-19)
 *   - LED built-in tại pin 13
 *   - Virtual button tại pin 2 (user click trên UI để toggle)
 *   - Virtual potentiometer tại A0 (slider 0-1023)
 *   - Serial buffer (max 200 lines, auto-trim)
 *
 * Stop mechanism: signal.stopped flag. Sketch transpile xong wrap với
 * `while (!signal.stopped) { loop(); }` để có thể dừng từ ngoài.
 */

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'
export type PinState = 0 | 1
export type PinKind = 'digital' | 'pwm' | 'analog-in'

export interface PinInfo {
  num: number
  mode: PinMode
  /** 0/1 cho digital, 0-255 cho PWM, 0-1023 cho analog-in */
  value: number
  kind: PinKind
}

export interface SerialLine {
  t: number       // ms since runtime start
  text: string
}

export interface RuntimeSnapshot {
  /** epoch ms từ khi runtime bắt đầu */
  uptimeMs: number
  pins: Record<number, PinInfo>
  serial: SerialLine[]
  /** Thông báo lỗi runtime nếu sketch crash */
  error: string | null
  /** Đang chạy không */
  running: boolean
}

export interface RuntimeOptions {
  /** Nhân tốc độ (1.0 default; 2.0 = 2x speed). delay() chia theo speed. */
  speed?: number
  /** Cap delay tối đa cho 1 lần delay (ms) — tránh user gõ delay(1000000) treo */
  maxDelayMs?: number
  /** Cap số dòng serial buffer */
  maxSerialLines?: number
}

const DEFAULT_OPTS: Required<RuntimeOptions> = {
  speed: 1.0,
  maxDelayMs: 60_000,
  maxSerialLines: 200,
}

/** Signal object để dừng runtime từ ngoài. */
export interface StopSignal { stopped: boolean }

export class ArduinoRuntime {
  private startedAt = 0
  private pins = new Map<number, PinInfo>()
  private serialLines: SerialLine[] = []
  private opts: Required<RuntimeOptions>
  private signal: StopSignal
  /** Pin states ngoài sketch điều khiển (button clicks, pot value) */
  private externalDigitalIn = new Map<number, PinState>()
  private externalAnalogIn = new Map<number, number>()
  /** Pin gán tones — chỉ track, không phát audio (tránh phiền) */
  private tones = new Map<number, { freq: number; until: number }>()
  /** Optional callback khi sketch crash */
  private onError?: (err: string) => void
  /** Optional callback khi mọi state thay đổi (cho re-render) */
  private onUpdate?: () => void
  private listeners: Array<() => void> = []
  public error: string | null = null

  constructor(signal: StopSignal, opts: RuntimeOptions = {}) {
    this.signal = signal
    this.opts = { ...DEFAULT_OPTS, ...opts }
    // Init pins
    for (let i = 0; i < 14; i++) {
      this.pins.set(i, { num: i, mode: 'INPUT', value: 0, kind: 'digital' })
    }
    // Analog A0-A5 (alias 14-19)
    for (let i = 14; i < 20; i++) {
      this.pins.set(i, { num: i, mode: 'INPUT', value: 0, kind: 'analog-in' })
    }
    // Default analog A0 = 512 (mid-range potentiometer)
    this.externalAnalogIn.set(14, 512)
    // LED_BUILTIN at 13
  }

  start() { this.startedAt = performance.now() }
  reset() {
    this.startedAt = performance.now()
    this.serialLines = []
    this.error = null
    this.tones.clear()
    this.signal.stopped = false
    for (const p of this.pins.values()) { p.mode = 'INPUT'; p.value = 0 }
    this.externalAnalogIn.set(14, 512)
    this.emit()
  }

  setExternalDigitalIn(pin: number, v: PinState) {
    this.externalDigitalIn.set(pin, v)
    const p = this.pins.get(pin)
    if (p && p.mode !== 'OUTPUT') { p.value = v; this.emit() }
  }
  setExternalAnalogIn(pin: number, v: number) {
    const clamped = Math.max(0, Math.min(1023, Math.floor(v)))
    this.externalAnalogIn.set(pin, clamped)
    const p = this.pins.get(pin)
    if (p) { p.value = clamped; this.emit() }
  }

  /** Subscribe to state changes — for React re-render */
  subscribe(fn: () => void) {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter(l => l !== fn) }
  }
  private emit() { this.onUpdate?.(); for (const l of this.listeners) l() }

  snapshot(): RuntimeSnapshot {
    const pins: Record<number, PinInfo> = {}
    for (const [k, v] of this.pins) pins[k] = { ...v }
    return {
      uptimeMs: this.startedAt ? performance.now() - this.startedAt : 0,
      pins,
      serial: this.serialLines.slice(),
      error: this.error,
      running: !this.signal.stopped,
    }
  }

  // ─── Arduino API ──────────────────────────────────────────────
  pinMode(pin: number, mode: PinMode) {
    const p = this.pins.get(pin)
    if (!p) throw new Error(`Invalid pin: ${pin}`)
    p.mode = mode
    // INPUT_PULLUP default value 1
    if (mode === 'INPUT_PULLUP' && !this.externalDigitalIn.has(pin)) p.value = 1
    this.emit()
  }
  digitalWrite(pin: number, value: number | boolean) {
    const p = this.pins.get(pin)
    if (!p) throw new Error(`Invalid pin: ${pin}`)
    const v: PinState = value ? 1 : 0
    if (p.mode !== 'OUTPUT') {
      // Auto-set OUTPUT if not (tolerant)
      p.mode = 'OUTPUT'
    }
    p.kind = 'digital'
    p.value = v
    this.emit()
  }
  digitalRead(pin: number): PinState {
    const p = this.pins.get(pin)
    if (!p) return 0
    if (p.mode === 'OUTPUT') return p.value > 0 ? 1 : 0
    // Read from external input
    return (this.externalDigitalIn.get(pin) ?? (p.mode === 'INPUT_PULLUP' ? 1 : 0))
  }
  analogWrite(pin: number, value: number) {
    const p = this.pins.get(pin)
    if (!p) throw new Error(`Invalid pin: ${pin}`)
    const v = Math.max(0, Math.min(255, Math.floor(value)))
    p.mode = 'OUTPUT'
    p.kind = 'pwm'
    p.value = v
    this.emit()
  }
  analogRead(pin: number): number {
    // Accept "A0" → 14 conversion done in transpiler; pin is already 14-19
    const realPin = pin < 14 ? pin + 14 : pin
    const p = this.pins.get(realPin)
    if (!p) return 0
    return this.externalAnalogIn.get(realPin) ?? p.value
  }
  async delay(ms: number) {
    const realMs = Math.max(0, Math.min(this.opts.maxDelayMs, ms)) / this.opts.speed
    if (realMs <= 0) { await new Promise(r => setTimeout(r, 0)); return }
    // Chia nhỏ thành interval 50ms để có thể stop sớm
    const chunks = Math.ceil(realMs / 50)
    const chunkMs = realMs / chunks
    for (let i = 0; i < chunks; i++) {
      if (this.signal.stopped) throw new Error('__STOPPED__')
      await new Promise(r => setTimeout(r, chunkMs))
    }
  }
  async delayMicroseconds(us: number) { return this.delay(us / 1000) }
  millis(): number { return this.startedAt ? Math.floor(performance.now() - this.startedAt) : 0 }
  micros(): number { return this.millis() * 1000 }

  // Serial namespace
  Serial = {
    begin: (_rate: number) => { /* no-op cho mô phỏng */ this.serialLog('Serial begin') },
    print: (...args: any[]) => this.serialAppend(args.map(formatArg).join(''), false),
    println: (...args: any[]) => this.serialAppend(args.map(formatArg).join(''), true),
    write: (v: any) => this.serialAppend(formatArg(v), false),
    available: () => 0,
    read: () => -1,
  }

  // Tone/noTone (tracked, không phát audio)
  tone(pin: number, freq: number, dur?: number) {
    const until = this.millis() + (dur ?? 60_000)
    this.tones.set(pin, { freq, until })
  }
  noTone(pin: number) { this.tones.delete(pin) }

  private serialLog(text: string) { this.serialAppend(text, true) }
  private serialAppend(text: string, newline: boolean) {
    const last = this.serialLines[this.serialLines.length - 1]
    if (last && !text.endsWith('\n') && !newline) {
      // Append vào dòng cuối
      last.text += text
    } else {
      this.serialLines.push({ t: this.millis(), text })
    }
    if (this.serialLines.length > this.opts.maxSerialLines) {
      this.serialLines = this.serialLines.slice(-this.opts.maxSerialLines)
    }
    this.emit()
  }
}

function formatArg(v: any): string {
  if (typeof v === 'number') {
    if (Number.isInteger(v)) return String(v)
    return v.toFixed(2)
  }
  if (typeof v === 'boolean') return v ? '1' : '0'
  if (v == null) return ''
  return String(v)
}

// ─── Arduino constants exposed to sketch ──────────────────────────
export const ARDUINO_CONSTS = {
  HIGH: 1,
  LOW: 0,
  INPUT: 'INPUT' as PinMode,
  OUTPUT: 'OUTPUT' as PinMode,
  INPUT_PULLUP: 'INPUT_PULLUP' as PinMode,
  LED_BUILTIN: 13,
  // Analog pin aliases
  A0: 14, A1: 15, A2: 16, A3: 17, A4: 18, A5: 19,
  // Common
  true: true, false: false,
}
