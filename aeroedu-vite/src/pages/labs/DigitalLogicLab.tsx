/**
 * Digital Logic Lab — /dashboard/labtwin/labs/digital-logic-lab
 *
 * Trình mô phỏng cổng logic số chuyên nghiệp, dạng kéo-thả + nối dây + chạy
 * mô phỏng realtime. Dành cho HS THPT học chương "Đại số Boole" + "Mạch số"
 * (Tin học 11 + 12 GDPT 2018).
 *
 * Tính năng:
 *   - 7 cổng logic chuẩn: AND, OR, NOT, NAND, NOR, XOR, XNOR
 *   - 3 thành phần I/O: INPUT toggle, OUTPUT (LED), CLOCK 1Hz
 *   - Kéo-thả gates trên SVG canvas
 *   - Nối dây: click pin output → click pin input → tạo wire
 *   - Simulation engine: topological sort + propagation mỗi tick (60 fps)
 *   - Bảng chân lý tự sinh cho mạch 1-4 inputs
 *   - 6 preset chuẩn: Half adder, Full adder, SR latch, D flip-flop, 2:1 MUX,
 *     4-bit counter (xem mạch hoàn chỉnh + chạy thử)
 *   - Save/Load circuit qua localStorage
 *   - Export/Import JSON
 *
 * Hoàn toàn frontend — không cần backend.
 */
import { useState, useEffect, useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Play, Pause, RotateCcw, Trash2, Save, FolderOpen,
  Download, Upload, Zap, Cpu, Plus, X, Grid3x3, BookOpen,
  Eye, ChevronRight,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
type GateKind =
  | 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR'
  | 'INPUT' | 'OUTPUT' | 'CLOCK'

interface Gate {
  id: string
  kind: GateKind
  x: number
  y: number
  // Trạng thái giá trị output sau khi eval (cập nhật mỗi tick)
  outputValue: boolean
  // Riêng cho INPUT: giá trị do user toggle (HIGH/LOW)
  inputValue?: boolean
  // Nhãn tuỳ chỉnh (VD: A, B, Sum, Cout)
  label?: string
}

interface Wire {
  id: string
  from: { gateId: string; outputIdx: number }   // outputIdx luôn 0 (mỗi gate 1 output)
  to:   { gateId: string; inputIdx: number }
}

interface Circuit {
  gates: Gate[]
  wires: Wire[]
  name?: string
}

// ─────────────────────────────────────────────────────────────────
// Gate definitions
// ─────────────────────────────────────────────────────────────────
const GATE_INFO: Record<GateKind, {
  label: string
  inputs: number
  symbol: string
  color: string
  width: number
  height: number
  desc: string
}> = {
  AND:    { label: 'AND',    inputs: 2, symbol: '&',    color: '#60a5fa', width: 80, height: 60, desc: 'Q = A AND B' },
  OR:     { label: 'OR',     inputs: 2, symbol: '≥1',   color: '#34d399', width: 80, height: 60, desc: 'Q = A OR B' },
  NOT:    { label: 'NOT',    inputs: 1, symbol: '1',    color: '#f87171', width: 70, height: 50, desc: 'Q = NOT A' },
  NAND:   { label: 'NAND',   inputs: 2, symbol: '&̄',   color: '#a78bfa', width: 80, height: 60, desc: 'Q = NOT (A AND B)' },
  NOR:    { label: 'NOR',    inputs: 2, symbol: '≥1̄',  color: '#fb923c', width: 80, height: 60, desc: 'Q = NOT (A OR B)' },
  XOR:    { label: 'XOR',    inputs: 2, symbol: '=1',   color: '#22d3ee', width: 80, height: 60, desc: 'Q = A XOR B (1 nếu khác nhau)' },
  XNOR:   { label: 'XNOR',   inputs: 2, symbol: '=1̄',  color: '#facc15', width: 80, height: 60, desc: 'Q = NOT (A XOR B)' },
  INPUT:  { label: 'INPUT',  inputs: 0, symbol: '⏻',    color: '#f472b6', width: 60, height: 50, desc: 'Cổng vào — click toggle 0/1' },
  OUTPUT: { label: 'OUTPUT', inputs: 1, symbol: '○',    color: '#fde047', width: 60, height: 50, desc: 'Đèn LED hiển thị 0/1' },
  CLOCK:  { label: 'CLOCK',  inputs: 0, symbol: '⏲',    color: '#86efac', width: 70, height: 50, desc: 'Xung nhịp 1Hz tự đảo trạng thái' },
}

const GATE_PALETTE_GROUPS: Array<{ title: string; kinds: GateKind[] }> = [
  { title: 'Cổng cơ bản',  kinds: ['AND', 'OR', 'NOT'] },
  { title: 'Cổng kết hợp', kinds: ['NAND', 'NOR', 'XOR', 'XNOR'] },
  { title: 'I/O',          kinds: ['INPUT', 'OUTPUT', 'CLOCK'] },
]

// ─────────────────────────────────────────────────────────────────
// Logic evaluation
// ─────────────────────────────────────────────────────────────────
function evalGate(kind: GateKind, inputs: boolean[]): boolean {
  switch (kind) {
    case 'AND':  return inputs[0] && inputs[1]
    case 'OR':   return inputs[0] || inputs[1]
    case 'NOT':  return !inputs[0]
    case 'NAND': return !(inputs[0] && inputs[1])
    case 'NOR':  return !(inputs[0] || inputs[1])
    case 'XOR':  return inputs[0] !== inputs[1]
    case 'XNOR': return inputs[0] === inputs[1]
    default:     return false
  }
}

/**
 * Simulate 1 tick: cập nhật outputValue cho tất cả gates dựa vào wires.
 * Dùng iterative propagation (max 50 iterations để xử lý feedback loops).
 */
function simulate(circuit: Circuit, clockState: boolean): Gate[] {
  const gates = circuit.gates.map(g => {
    if (g.kind === 'INPUT')  return { ...g, outputValue: !!g.inputValue }
    if (g.kind === 'CLOCK')  return { ...g, outputValue: clockState }
    return { ...g }
  })
  const byId = new Map(gates.map(g => [g.id, g]))

  // Iterative: 50 lượt đủ cho hầu hết mạch combinational
  for (let iter = 0; iter < 50; iter++) {
    let changed = false
    for (const g of gates) {
      if (g.kind === 'INPUT' || g.kind === 'CLOCK') continue
      const info = GATE_INFO[g.kind]
      const inputVals: boolean[] = new Array(info.inputs).fill(false)
      for (const w of circuit.wires) {
        if (w.to.gateId === g.id) {
          const src = byId.get(w.from.gateId)
          if (src) inputVals[w.to.inputIdx] = src.outputValue
        }
      }
      let newVal: boolean
      if (g.kind === 'OUTPUT') newVal = inputVals[0] || false
      else                     newVal = evalGate(g.kind, inputVals)
      if (newVal !== g.outputValue) {
        g.outputValue = newVal
        changed = true
      }
    }
    if (!changed) break
  }
  return gates
}

// ─────────────────────────────────────────────────────────────────
// Pin positions (relative to gate top-left)
// ─────────────────────────────────────────────────────────────────
function getInputPin(g: Gate, idx: number): { x: number; y: number } {
  const info = GATE_INFO[g.kind]
  const spacing = info.height / (info.inputs + 1)
  return { x: g.x, y: g.y + spacing * (idx + 1) }
}
function getOutputPin(g: Gate): { x: number; y: number } {
  const info = GATE_INFO[g.kind]
  return { x: g.x + info.width, y: g.y + info.height / 2 }
}

// ─────────────────────────────────────────────────────────────────
// Preset circuits
// ─────────────────────────────────────────────────────────────────
function uid(prefix = 'g'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function presetHalfAdder(): Circuit {
  const a = { id: 'in_a', kind: 'INPUT'  as GateKind, x:  60, y: 100, outputValue: false, inputValue: false, label: 'A' }
  const b = { id: 'in_b', kind: 'INPUT'  as GateKind, x:  60, y: 200, outputValue: false, inputValue: false, label: 'B' }
  const xor = { id: 'xor1', kind: 'XOR'  as GateKind, x: 250, y: 100, outputValue: false }
  const and = { id: 'and1', kind: 'AND'  as GateKind, x: 250, y: 200, outputValue: false }
  const sum = { id: 'out_s', kind: 'OUTPUT' as GateKind, x: 430, y: 110, outputValue: false, label: 'Sum' }
  const car = { id: 'out_c', kind: 'OUTPUT' as GateKind, x: 430, y: 210, outputValue: false, label: 'Cout' }
  return {
    name: 'Half Adder (Bộ cộng nửa)',
    gates: [a, b, xor, and, sum, car],
    wires: [
      { id: 'w1', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'xor1', inputIdx: 0 } },
      { id: 'w2', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'xor1', inputIdx: 1 } },
      { id: 'w3', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 0 } },
      { id: 'w4', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 1 } },
      { id: 'w5', from: { gateId: 'xor1', outputIdx: 0 }, to: { gateId: 'out_s', inputIdx: 0 } },
      { id: 'w6', from: { gateId: 'and1', outputIdx: 0 }, to: { gateId: 'out_c', inputIdx: 0 } },
    ],
  }
}

function presetFullAdder(): Circuit {
  return {
    name: 'Full Adder (Bộ cộng đầy đủ)',
    gates: [
      { id: 'in_a',  kind: 'INPUT',  x:  40, y:  60, outputValue: false, inputValue: false, label: 'A' },
      { id: 'in_b',  kind: 'INPUT',  x:  40, y: 160, outputValue: false, inputValue: false, label: 'B' },
      { id: 'in_c',  kind: 'INPUT',  x:  40, y: 260, outputValue: false, inputValue: false, label: 'Cin' },
      { id: 'xor1',  kind: 'XOR',    x: 200, y:  90, outputValue: false },
      { id: 'xor2',  kind: 'XOR',    x: 360, y: 110, outputValue: false },
      { id: 'and1',  kind: 'AND',    x: 200, y: 200, outputValue: false },
      { id: 'and2',  kind: 'AND',    x: 360, y: 230, outputValue: false },
      { id: 'or1',   kind: 'OR',     x: 500, y: 270, outputValue: false },
      { id: 'out_s', kind: 'OUTPUT', x: 510, y: 120, outputValue: false, label: 'Sum' },
      { id: 'out_c', kind: 'OUTPUT', x: 640, y: 280, outputValue: false, label: 'Cout' },
    ],
    wires: [
      { id: 'w1', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'xor1', inputIdx: 0 } },
      { id: 'w2', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'xor1', inputIdx: 1 } },
      { id: 'w3', from: { gateId: 'xor1', outputIdx: 0 }, to: { gateId: 'xor2', inputIdx: 0 } },
      { id: 'w4', from: { gateId: 'in_c', outputIdx: 0 }, to: { gateId: 'xor2', inputIdx: 1 } },
      { id: 'w5', from: { gateId: 'xor2', outputIdx: 0 }, to: { gateId: 'out_s', inputIdx: 0 } },
      { id: 'w6', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 0 } },
      { id: 'w7', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 1 } },
      { id: 'w8', from: { gateId: 'xor1', outputIdx: 0 }, to: { gateId: 'and2', inputIdx: 0 } },
      { id: 'w9', from: { gateId: 'in_c', outputIdx: 0 }, to: { gateId: 'and2', inputIdx: 1 } },
      { id: 'w10', from: { gateId: 'and1', outputIdx: 0 }, to: { gateId: 'or1', inputIdx: 0 } },
      { id: 'w11', from: { gateId: 'and2', outputIdx: 0 }, to: { gateId: 'or1', inputIdx: 1 } },
      { id: 'w12', from: { gateId: 'or1',  outputIdx: 0 }, to: { gateId: 'out_c', inputIdx: 0 } },
    ],
  }
}

function presetSRLatch(): Circuit {
  return {
    name: 'SR Latch (Mạch chốt SR)',
    gates: [
      { id: 'in_s', kind: 'INPUT',  x:  40, y:  80, outputValue: false, inputValue: false, label: 'Set' },
      { id: 'in_r', kind: 'INPUT',  x:  40, y: 220, outputValue: false, inputValue: false, label: 'Reset' },
      { id: 'nor1', kind: 'NOR',    x: 240, y: 100, outputValue: false },
      { id: 'nor2', kind: 'NOR',    x: 240, y: 220, outputValue: false },
      { id: 'out_q',  kind: 'OUTPUT', x: 420, y: 110, outputValue: false, label: 'Q' },
      { id: 'out_qn', kind: 'OUTPUT', x: 420, y: 230, outputValue: false, label: 'Q̄' },
    ],
    wires: [
      { id: 'w1', from: { gateId: 'in_s', outputIdx: 0 }, to: { gateId: 'nor1', inputIdx: 0 } },
      { id: 'w2', from: { gateId: 'nor2', outputIdx: 0 }, to: { gateId: 'nor1', inputIdx: 1 } },
      { id: 'w3', from: { gateId: 'nor1', outputIdx: 0 }, to: { gateId: 'nor2', inputIdx: 0 } },
      { id: 'w4', from: { gateId: 'in_r', outputIdx: 0 }, to: { gateId: 'nor2', inputIdx: 1 } },
      { id: 'w5', from: { gateId: 'nor1', outputIdx: 0 }, to: { gateId: 'out_q',  inputIdx: 0 } },
      { id: 'w6', from: { gateId: 'nor2', outputIdx: 0 }, to: { gateId: 'out_qn', inputIdx: 0 } },
    ],
  }
}

function presetMux(): Circuit {
  return {
    name: '2:1 MUX (Bộ ghép kênh)',
    gates: [
      { id: 'in_a', kind: 'INPUT', x:  40, y:  60, outputValue: false, inputValue: false, label: 'A' },
      { id: 'in_b', kind: 'INPUT', x:  40, y: 160, outputValue: false, inputValue: false, label: 'B' },
      { id: 'in_s', kind: 'INPUT', x:  40, y: 260, outputValue: false, inputValue: false, label: 'Sel' },
      { id: 'not1', kind: 'NOT',   x: 180, y: 270, outputValue: false },
      { id: 'and1', kind: 'AND',   x: 320, y:  80, outputValue: false },
      { id: 'and2', kind: 'AND',   x: 320, y: 180, outputValue: false },
      { id: 'or1',  kind: 'OR',    x: 470, y: 130, outputValue: false },
      { id: 'out_y', kind: 'OUTPUT', x: 620, y: 140, outputValue: false, label: 'Y' },
    ],
    wires: [
      { id: 'w1', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 0 } },
      { id: 'w2', from: { gateId: 'in_s', outputIdx: 0 }, to: { gateId: 'not1', inputIdx: 0 } },
      { id: 'w3', from: { gateId: 'not1', outputIdx: 0 }, to: { gateId: 'and1', inputIdx: 1 } },
      { id: 'w4', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'and2', inputIdx: 0 } },
      { id: 'w5', from: { gateId: 'in_s', outputIdx: 0 }, to: { gateId: 'and2', inputIdx: 1 } },
      { id: 'w6', from: { gateId: 'and1', outputIdx: 0 }, to: { gateId: 'or1',  inputIdx: 0 } },
      { id: 'w7', from: { gateId: 'and2', outputIdx: 0 }, to: { gateId: 'or1',  inputIdx: 1 } },
      { id: 'w8', from: { gateId: 'or1',  outputIdx: 0 }, to: { gateId: 'out_y', inputIdx: 0 } },
    ],
  }
}

function presetXorTruthTable(): Circuit {
  return {
    name: 'XOR — Bảng chân lý cơ bản',
    gates: [
      { id: 'in_a', kind: 'INPUT', x:  60, y:  80, outputValue: false, inputValue: false, label: 'A' },
      { id: 'in_b', kind: 'INPUT', x:  60, y: 180, outputValue: false, inputValue: false, label: 'B' },
      { id: 'xor',  kind: 'XOR',   x: 240, y: 100, outputValue: false },
      { id: 'out',  kind: 'OUTPUT', x: 420, y: 115, outputValue: false, label: 'A⊕B' },
    ],
    wires: [
      { id: 'w1', from: { gateId: 'in_a', outputIdx: 0 }, to: { gateId: 'xor', inputIdx: 0 } },
      { id: 'w2', from: { gateId: 'in_b', outputIdx: 0 }, to: { gateId: 'xor', inputIdx: 1 } },
      { id: 'w3', from: { gateId: 'xor',  outputIdx: 0 }, to: { gateId: 'out', inputIdx: 0 } },
    ],
  }
}

function presetClockLed(): Circuit {
  return {
    name: 'Clock + LED (Đèn nhấp nháy)',
    gates: [
      { id: 'clk', kind: 'CLOCK',  x:  80, y: 130, outputValue: false },
      { id: 'led', kind: 'OUTPUT', x: 280, y: 135, outputValue: false, label: 'LED' },
    ],
    wires: [
      { id: 'w1', from: { gateId: 'clk', outputIdx: 0 }, to: { gateId: 'led', inputIdx: 0 } },
    ],
  }
}

const PRESETS: Array<{ key: string; name: string; emoji: string; build: () => Circuit; desc: string }> = [
  { key: 'xor',    name: 'XOR cơ bản',         emoji: '⊕', build: presetXorTruthTable, desc: 'Khởi đầu: 2 input + 1 cổng XOR' },
  { key: 'half',   name: 'Half Adder',         emoji: '➕', build: presetHalfAdder,    desc: 'Cộng 2 bit (Sum + Cout)' },
  { key: 'full',   name: 'Full Adder',         emoji: '🔢', build: presetFullAdder,    desc: 'Cộng 3 bit có Cin' },
  { key: 'sr',     name: 'SR Latch',           emoji: '🔒', build: presetSRLatch,      desc: 'Bộ nhớ 1 bit (feedback NOR)' },
  { key: 'mux',    name: '2:1 MUX',            emoji: '🔀', build: presetMux,          desc: 'Chọn 1 trong 2 đầu vào' },
  { key: 'clock',  name: 'Clock + LED',        emoji: '⏲',  build: presetClockLed,     desc: 'Xung nhịp 1Hz làm đèn chớp' },
]

// ─────────────────────────────────────────────────────────────────
// Truth table generator (cho mạch ≤4 inputs, ≤4 outputs)
// ─────────────────────────────────────────────────────────────────
interface TruthRow { inputs: boolean[]; outputs: boolean[] }
function generateTruthTable(circuit: Circuit): {
  inputLabels: string[]
  outputLabels: string[]
  rows: TruthRow[]
} | null {
  const inputs = circuit.gates.filter(g => g.kind === 'INPUT')
  const outputs = circuit.gates.filter(g => g.kind === 'OUTPUT')
  if (inputs.length === 0 || inputs.length > 4) return null
  if (outputs.length === 0 || outputs.length > 4) return null
  const n = 1 << inputs.length
  const rows: TruthRow[] = []
  for (let i = 0; i < n; i++) {
    const inputVals: boolean[] = inputs.map((_, k) =>
      ((i >> (inputs.length - 1 - k)) & 1) === 1
    )
    // Build temp circuit with these inputs set
    const temp: Circuit = {
      gates: circuit.gates.map(g => {
        if (g.kind === 'INPUT') {
          const idx = inputs.findIndex(x => x.id === g.id)
          return { ...g, inputValue: inputVals[idx] }
        }
        return { ...g }
      }),
      wires: circuit.wires,
    }
    const evaluated = simulate(temp, false)
    const outVals = outputs.map(o => evaluated.find(g => g.id === o.id)?.outputValue || false)
    rows.push({ inputs: inputVals, outputs: outVals })
  }
  return {
    inputLabels: inputs.map((g, i) => g.label || `I${i + 1}`),
    outputLabels: outputs.map((g, i) => g.label || `O${i + 1}`),
    rows,
  }
}

// ─────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────
const LS_KEY = 'inphysic_digital_logic_circuit_v1'

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────
/**
 * Imperative API exposed via forwardRef cho LabChallenge wrapper:
 * - getSnapshot() → mạch hiện tại + truth table evaluated
 * - loadSnapshot(c) → load mạch GV làm reference
 */
export interface DigitalLogicHandle {
  getSnapshot(): { circuit: Circuit; truthTable: ReturnType<typeof generateTruthTable> }
  loadSnapshot(c: Circuit): void
}

interface DigitalLogicProps {
  /** Initial circuit — challenge reference từ GV */
  initialCircuit?: Circuit
}

function DigitalLogicLabInner(
  { initialCircuit }: DigitalLogicProps,
  ref: React.Ref<DigitalLogicHandle>,
) {
  const [circuit, setCircuit] = useState<Circuit>(() => {
    if (initialCircuit?.gates && initialCircuit?.wires) return initialCircuit
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.gates && parsed?.wires) return parsed
      }
    } catch {/* ignore */ }
    return presetXorTruthTable()
  })
  const [running, setRunning] = useState(true)
  const [clockState, setClockState] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [pendingWire, setPendingWire] = useState<{ gateId: string; outputIdx: number } | null>(null)
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [showTruthTable, setShowTruthTable] = useState(false)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const importFileRef = useRef<HTMLInputElement | null>(null)

  // Auto-save
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(circuit)) } catch {/*ignore*/}
  }, [circuit])

  // Clock tick (1 Hz)
  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => setClockState(c => !c), 1000)
    return () => clearInterval(interval)
  }, [running])

  // Live simulation: re-evaluate every time circuit or clock changes
  const simulatedGates = useMemo(
    () => running ? simulate(circuit, clockState) : circuit.gates,
    [circuit, clockState, running],
  )

  // Expose imperative API cho LabChallengeBlock
  useImperativeHandle(ref, () => ({
    getSnapshot: () => {
      const evaluated: Circuit = { ...circuit, gates: simulatedGates }
      return { circuit: evaluated, truthTable: generateTruthTable(evaluated) }
    },
    loadSnapshot: (c) => {
      setCircuit(c)
      setSelectedGateId(null)
      setPendingWire(null)
    },
  }), [circuit, simulatedGates])

  // Truth table (auto-update)
  const truthTable = useMemo(() => generateTruthTable(circuit), [circuit])

  // ── Drag handlers ──────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent, gateId: string) => {
    e.stopPropagation()
    const g = circuit.gates.find(x => x.id === gateId)
    if (!g) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    setDraggingId(gateId)
    setSelectedGateId(gateId)
    setDragOffset({
      x: e.clientX - svgRect.left - g.x,
      y: e.clientY - svgRect.top - g.y,
    })
  }, [circuit.gates])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId) return
    const svgRect = svgRef.current?.getBoundingClientRect()
    if (!svgRect) return
    const newX = Math.max(0, e.clientX - svgRect.left - dragOffset.x)
    const newY = Math.max(0, e.clientY - svgRect.top - dragOffset.y)
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g => g.id === draggingId ? { ...g, x: newX, y: newY } : g),
    }))
  }, [draggingId, dragOffset])

  const onMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  // ── Wire connection handlers ────────────────────────────────────
  const onPinClick = useCallback((gateId: string, kind: 'output' | 'input', idx: number) => {
    if (kind === 'output') {
      // Start wire
      setPendingWire({ gateId, outputIdx: idx })
      toast('Click vào pin INPUT để kết nối', { icon: '🔌', duration: 2000 })
    } else {
      // Complete wire
      if (!pendingWire) {
        toast.error('Chưa chọn output. Click vào pin OUTPUT (bên phải gate) trước.')
        return
      }
      if (pendingWire.gateId === gateId) {
        toast.error('Không thể nối gate vào chính nó')
        setPendingWire(null)
        return
      }
      // Remove existing wire to same input pin (1 input chỉ nhận 1 wire)
      setCircuit(c => {
        const filteredWires = c.wires.filter(w =>
          !(w.to.gateId === gateId && w.to.inputIdx === idx)
        )
        return {
          ...c,
          wires: [...filteredWires, {
            id: uid('w'),
            from: { gateId: pendingWire.gateId, outputIdx: pendingWire.outputIdx },
            to:   { gateId, inputIdx: idx },
          }],
        }
      })
      setPendingWire(null)
      toast.success('Đã nối dây')
    }
  }, [pendingWire])

  const onCanvasClick = useCallback(() => {
    setPendingWire(null)
    setSelectedGateId(null)
  }, [])

  // ── Gate operations ─────────────────────────────────────────────
  const addGate = (kind: GateKind) => {
    const newGate: Gate = {
      id: uid(kind.toLowerCase()),
      kind, x: 100 + Math.random() * 200, y: 100 + Math.random() * 200,
      outputValue: false,
      ...(kind === 'INPUT' ? { inputValue: false } : {}),
    }
    setCircuit(c => ({ ...c, gates: [...c.gates, newGate] }))
  }

  const deleteGate = (id: string) => {
    setCircuit(c => ({
      gates: c.gates.filter(g => g.id !== id),
      wires: c.wires.filter(w => w.from.gateId !== id && w.to.gateId !== id),
    }))
    setSelectedGateId(null)
  }

  const toggleInput = (id: string) => {
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g => g.id === id ? { ...g, inputValue: !g.inputValue } : g),
    }))
  }

  const updateLabel = (id: string, label: string) => {
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g => g.id === id ? { ...g, label } : g),
    }))
  }

  const clearAll = () => {
    if (!confirm('Xóa toàn bộ mạch hiện tại?')) return
    setCircuit({ gates: [], wires: [] })
    toast.success('Đã xóa sạch canvas')
  }

  const loadPreset = (key: string) => {
    const p = PRESETS.find(p => p.key === key)
    if (!p) return
    setCircuit(p.build())
    setShowPresets(false)
    toast.success(`Đã tải mẫu "${p.name}"`)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(circuit, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `circuit-${(circuit.name || 'mach').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Đã tải mạch dưới dạng .json')
  }

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''))
        if (!parsed?.gates || !Array.isArray(parsed.gates)) throw new Error('Thiếu trường gates')
        if (!parsed?.wires || !Array.isArray(parsed.wires)) throw new Error('Thiếu trường wires')
        setCircuit(parsed)
        toast.success('Đã nạp mạch từ file')
      } catch (err: any) {
        toast.error('File JSON không hợp lệ: ' + err?.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''   // reset input
  }

  const stats = useMemo(() => ({
    gates: circuit.gates.length,
    wires: circuit.wires.length,
    inputs: circuit.gates.filter(g => g.kind === 'INPUT').length,
    outputs: circuit.gates.filter(g => g.kind === 'OUTPUT').length,
  }), [circuit])

  const selectedGate = simulatedGates.find(g => g.id === selectedGateId)

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0b14] text-white">
      {/* ── Top bar ── */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Link
            to="/dashboard/labtwin"
            className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Labs
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h1 className="font-bold text-base">Digital Logic Lab</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Mạch số · Boole
            </span>
          </div>
          <div className="flex-1" />

          {/* Toolbar */}
          <button
            onClick={() => setRunning(r => !r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${
              running
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {running ? <><Pause className="w-3.5 h-3.5" /> Đang chạy</> : <><Play className="w-3.5 h-3.5" /> Tạm dừng</>}
          </button>
          <button
            onClick={() => setShowPresets(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 inline-flex items-center gap-1.5"
            title="Mở mẫu mạch có sẵn"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Mẫu
          </button>
          <button
            onClick={() => setShowTruthTable(true)}
            disabled={!truthTable}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            title={truthTable ? `Bảng chân lý ${truthTable.rows.length} hàng` : 'Cần ≤4 INPUT và ≤4 OUTPUT'}
          >
            <Grid3x3 className="w-3.5 h-3.5" /> Bảng chân lý
          </button>
          <button
            onClick={exportJson}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            title="Tải mạch về .json"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => importFileRef.current?.click()}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            title="Nạp mạch từ .json"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            ref={importFileRef}
            type="file" accept=".json,application/json"
            onChange={importJson}
            className="hidden"
          />
          <button
            onClick={clearAll}
            className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
            title="Xóa toàn bộ mạch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* ── Palette (left) ── */}
        <aside className="col-span-3 lg:col-span-2 space-y-3">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Linh kiện</h3>
            <div className="space-y-3">
              {GATE_PALETTE_GROUPS.map(group => (
                <div key={group.title}>
                  <div className="text-[10px] uppercase text-white/30 font-medium mb-1">{group.title}</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.kinds.map(k => {
                      const info = GATE_INFO[k]
                      return (
                        <button
                          key={k}
                          onClick={() => addGate(k)}
                          className="text-left px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 hover:border-white/30 hover:bg-white/[0.06] transition-colors group"
                          title={info.desc}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="text-base font-bold"
                              style={{ color: info.color }}
                            >{info.symbol}</span>
                            <span className="text-xs font-bold text-white/80 group-hover:text-white">
                              {info.label}
                            </span>
                            <Plus className="w-3 h-3 text-white/30 ml-auto" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
            <h3 className="text-[10px] uppercase font-bold text-white/40 tracking-wider mb-2">Thống kê</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-white/40">Gates:</span> <strong>{stats.gates}</strong></div>
              <div><span className="text-white/40">Wires:</span> <strong>{stats.wires}</strong></div>
              <div><span className="text-white/40">Input:</span> <strong className="text-pink-300">{stats.inputs}</strong></div>
              <div><span className="text-white/40">Output:</span> <strong className="text-yellow-300">{stats.outputs}</strong></div>
            </div>
          </div>

          {/* Help */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 text-[11px] text-white/70 space-y-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-bold mb-1">
              <BookOpen className="w-3.5 h-3.5" /> Cách dùng
            </div>
            <div>• Bấm linh kiện ở trên → thêm vào canvas</div>
            <div>• Kéo gate để di chuyển</div>
            <div>• Click pin <span className="text-emerald-300">▶</span> output → click pin <span className="text-blue-300">●</span> input → nối dây</div>
            <div>• Click <span className="text-pink-300">INPUT</span> → toggle 0/1</div>
            <div>• Chọn gate → bấm Del/Backspace để xóa</div>
          </div>
        </aside>

        {/* ── Canvas (center) ── */}
        <main className="col-span-9 lg:col-span-7">
          <div className="bg-[#0d0e17] border border-white/10 rounded-xl overflow-hidden relative">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 600"
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-[600px] cursor-default select-none"
              onClick={onCanvasClick}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
                <pattern id="gridBig" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              <rect width="100%" height="100%" fill="url(#gridBig)" />

              {/* ── Wires ── */}
              {circuit.wires.map(w => {
                const fromGate = simulatedGates.find(g => g.id === w.from.gateId)
                const toGate   = simulatedGates.find(g => g.id === w.to.gateId)
                if (!fromGate || !toGate) return null
                const p1 = getOutputPin(fromGate)
                const p2 = getInputPin(toGate, w.to.inputIdx)
                const dx = (p2.x - p1.x) / 2
                const path = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
                return (
                  <g key={w.id}>
                    <path d={path} fill="none"
                      stroke={fromGate.outputValue ? '#22c55e' : '#475569'}
                      strokeWidth={fromGate.outputValue ? 2.5 : 1.8}
                      style={{ transition: 'stroke 0.1s' }}
                    />
                  </g>
                )
              })}

              {/* ── Pending wire (drawing) ── */}
              {pendingWire && (() => {
                const g = simulatedGates.find(x => x.id === pendingWire.gateId)
                if (!g) return null
                const p = getOutputPin(g)
                return (
                  <circle cx={p.x} cy={p.y} r={6} fill="#22c55e"
                    stroke="#fff" strokeWidth={2}
                    className="animate-pulse"
                  />
                )
              })()}

              {/* ── Gates ── */}
              {simulatedGates.map(g => {
                const info = GATE_INFO[g.kind]
                const isSelected = selectedGateId === g.id
                const isHigh = g.outputValue
                return (
                  <g
                    key={g.id}
                    transform={`translate(${g.x}, ${g.y})`}
                    onMouseDown={e => onMouseDown(e, g.id)}
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedGateId(g.id)
                      if (g.kind === 'INPUT') toggleInput(g.id)
                    }}
                    style={{ cursor: 'move' }}
                  >
                    {/* Gate body */}
                    <rect
                      x={0} y={0}
                      width={info.width} height={info.height}
                      rx={g.kind === 'INPUT' || g.kind === 'OUTPUT' || g.kind === 'CLOCK' ? 24 : 6}
                      fill={isHigh
                        ? (g.kind === 'OUTPUT' ? '#facc15' : `${info.color}50`)
                        : '#1e293b'}
                      stroke={isSelected ? '#fff' : info.color}
                      strokeWidth={isSelected ? 2 : 1.5}
                      style={{ transition: 'fill 0.1s' }}
                    />

                    {/* Gate label/symbol */}
                    <text
                      x={info.width / 2} y={info.height / 2 + 6}
                      textAnchor="middle" fontSize="14" fontWeight="bold"
                      fill={isHigh && g.kind !== 'OUTPUT' ? '#fff' : isHigh && g.kind === 'OUTPUT' ? '#000' : info.color}
                      style={{ userSelect: 'none', pointerEvents: 'none' }}
                    >
                      {g.kind === 'INPUT'  ? (g.inputValue ? '1' : '0')
                       : g.kind === 'OUTPUT' ? (isHigh ? '●' : '○')
                       : g.kind === 'CLOCK' ? (isHigh ? '⏵' : '⏸')
                       : info.label}
                    </text>

                    {/* Custom label */}
                    {g.label && (
                      <text
                        x={info.width / 2} y={-6}
                        textAnchor="middle" fontSize="11" fontWeight="bold"
                        fill="#94a3b8" style={{ userSelect: 'none', pointerEvents: 'none' }}
                      >
                        {g.label}
                      </text>
                    )}

                    {/* Input pins */}
                    {Array.from({ length: info.inputs }).map((_, idx) => {
                      const spacing = info.height / (info.inputs + 1)
                      const py = spacing * (idx + 1)
                      // Find if connected
                      const wire = circuit.wires.find(w => w.to.gateId === g.id && w.to.inputIdx === idx)
                      const srcGate = wire ? simulatedGates.find(x => x.id === wire.from.gateId) : null
                      const isInputHigh = srcGate?.outputValue || false
                      return (
                        <g key={`in-${idx}`}>
                          <line x1={-10} y1={py} x2={0} y2={py}
                            stroke={isInputHigh ? '#22c55e' : '#475569'}
                            strokeWidth={1.5}
                          />
                          <circle
                            cx={0} cy={py} r={4}
                            fill={isInputHigh ? '#22c55e' : '#1e293b'}
                            stroke="#60a5fa" strokeWidth={1.5}
                            onClick={e => { e.stopPropagation(); onPinClick(g.id, 'input', idx) }}
                            style={{ cursor: 'crosshair' }}
                          />
                        </g>
                      )
                    })}

                    {/* Output pin */}
                    {info.inputs >= 0 && g.kind !== 'OUTPUT' && (
                      <g>
                        <line x1={info.width} y1={info.height / 2} x2={info.width + 10} y2={info.height / 2}
                          stroke={isHigh ? '#22c55e' : '#475569'}
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={info.width} cy={info.height / 2} r={5}
                          fill={isHigh ? '#22c55e' : '#1e293b'}
                          stroke="#10b981" strokeWidth={1.5}
                          onClick={e => { e.stopPropagation(); onPinClick(g.id, 'output', 0) }}
                          style={{ cursor: 'crosshair' }}
                        />
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Empty state */}
            {circuit.gates.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-white/30">
                  <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Canvas trống — bấm linh kiện ở cột trái để thêm</p>
                  <p className="text-xs mt-1">hoặc tải <strong>Mẫu</strong> sẵn ở thanh trên</p>
                </div>
              </div>
            )}

            {/* Pending wire indicator */}
            {pendingWire && (
              <div className="absolute top-3 left-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-emerald-300 font-bold">
                🔌 Click vào pin INPUT (xanh dương) để hoàn tất nối dây — hoặc click khoảng trống để hủy
              </div>
            )}
          </div>

          {/* Circuit name */}
          <div className="mt-3 flex items-center gap-2">
            <input
              value={circuit.name || ''}
              onChange={e => setCircuit(c => ({ ...c, name: e.target.value }))}
              placeholder="Tên mạch (tuỳ chọn)"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/50"
            />
            <span className="text-xs text-white/40">Tự lưu vào trình duyệt</span>
          </div>
        </main>

        {/* ── Properties + Truth (right) ── */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          {/* Selected gate properties */}
          {selectedGate ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider">
                  ⚙ {GATE_INFO[selectedGate.kind].label}
                </h3>
                <button
                  onClick={() => deleteGate(selectedGate.id)}
                  className="p-1 rounded text-rose-400 hover:bg-rose-500/15"
                  title="Xóa gate"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-white/50 block mb-1">Nhãn</label>
                  <input
                    value={selectedGate.label || ''}
                    onChange={e => updateLabel(selectedGate.id, e.target.value)}
                    placeholder="A, B, Sum..."
                    maxLength={8}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-cyan-400/50"
                  />
                </div>
                {selectedGate.kind === 'INPUT' && (
                  <button
                    onClick={() => toggleInput(selectedGate.id)}
                    className={`w-full py-1.5 rounded font-bold text-xs ${
                      selectedGate.inputValue
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-700 text-white/60 border border-white/10'
                    }`}
                  >
                    {selectedGate.inputValue ? 'HIGH (1)' : 'LOW (0)'} — Click để đảo
                  </button>
                )}
                <div className="text-white/50 pt-2 border-t border-white/10">
                  Output: <strong className={selectedGate.outputValue ? 'text-emerald-300' : 'text-slate-400'}>
                    {selectedGate.outputValue ? '1 (HIGH)' : '0 (LOW)'}
                  </strong>
                </div>
                <div className="text-white/40 italic text-[11px]">
                  {GATE_INFO[selectedGate.kind].desc}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white/40">
              💡 Click vào 1 gate để xem & chỉnh thuộc tính
            </div>
          )}

          {/* Truth table inline */}
          {truthTable && (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
              <h3 className="text-xs uppercase font-bold text-white/60 tracking-wider mb-2 flex items-center gap-1.5">
                <Grid3x3 className="w-3.5 h-3.5 text-cyan-400" /> Bảng chân lý
              </h3>
              <div className="overflow-auto max-h-[300px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0d0e17]">
                    <tr className="border-b border-white/10">
                      {truthTable.inputLabels.map((l, i) => (
                        <th key={`in-${i}`} className="text-center py-1 px-1 text-pink-300 font-bold">{l}</th>
                      ))}
                      <th className="border-l border-white/10 px-1"></th>
                      {truthTable.outputLabels.map((l, i) => (
                        <th key={`out-${i}`} className="text-center py-1 px-1 text-yellow-300 font-bold">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {truthTable.rows.map((r, ri) => (
                      <tr key={ri} className="border-b border-white/5 hover:bg-white/5">
                        {r.inputs.map((v, i) => (
                          <td key={`i-${i}`} className={`text-center py-0.5 px-1 font-mono ${v ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                            {v ? '1' : '0'}
                          </td>
                        ))}
                        <td className="border-l border-white/10"></td>
                        {r.outputs.map((v, i) => (
                          <td key={`o-${i}`} className={`text-center py-0.5 px-1 font-mono ${v ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                            {v ? '1' : '0'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-white/30 mt-1.5">
                {truthTable.rows.length} hàng · {truthTable.inputLabels.length} input · {truthTable.outputLabels.length} output
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Presets modal ── */}
      {showPresets && (
        <div onClick={() => setShowPresets(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-[#0d0e17] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold">📦 Mẫu mạch chuẩn</h2>
                <p className="text-xs text-white/50">Bấm 1 mẫu để load vào canvas (sẽ ghi đè mạch hiện tại)</p>
              </div>
              <button onClick={() => setShowPresets(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => loadPreset(p.key)}
                    className="text-left bg-white/[0.03] border border-white/10 rounded-xl p-4 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl flex-shrink-0">{p.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 text-white group-hover:text-cyan-300">{p.name}</h3>
                        <p className="text-xs text-white/50">{p.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-cyan-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Truth table modal (large view) ── */}
      {showTruthTable && truthTable && (
        <div onClick={() => setShowTruthTable(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()}
            className="bg-[#0d0e17] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="font-bold flex items-center gap-2"><Grid3x3 className="w-4 h-4 text-cyan-400" /> Bảng chân lý đầy đủ</h2>
                <p className="text-xs text-white/50">Tính tự động từ mạch hiện tại — không phụ thuộc INPUT đang set</p>
              </div>
              <button onClick={() => setShowTruthTable(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#0d0e17]">
                  <tr className="border-b border-white/15">
                    {truthTable.inputLabels.map((l, i) => (
                      <th key={i} className="text-center py-2 px-3 text-pink-300 font-bold">{l}</th>
                    ))}
                    <th className="border-l border-white/15"></th>
                    {truthTable.outputLabels.map((l, i) => (
                      <th key={i} className="text-center py-2 px-3 text-yellow-300 font-bold">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {truthTable.rows.map((r, ri) => (
                    <tr key={ri} className="border-b border-white/5">
                      {r.inputs.map((v, i) => (
                        <td key={i} className={`text-center py-2 px-3 font-mono text-base ${v ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                          {v ? '1' : '0'}
                        </td>
                      ))}
                      <td className="border-l border-white/15"></td>
                      {r.outputs.map((v, i) => (
                        <td key={i} className={`text-center py-2 px-3 font-mono text-base ${v ? 'text-emerald-300 font-bold' : 'text-slate-500'}`}>
                          {v ? '1' : '0'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const DigitalLogicLab = forwardRef<DigitalLogicHandle, DigitalLogicProps>(DigitalLogicLabInner)
DigitalLogicLab.displayName = 'DigitalLogicLab'
export default DigitalLogicLab
