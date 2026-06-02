/**
 * Graph Lab — GeoGebra-style interactive function plotter
 *
 * Features:
 * ─ Left sidebar: equation list (y = f(x)). Each row = input + color + toggle + delete.
 * ─ Main canvas: SVG plot with axes, grid, pan (drag), zoom (wheel).
 * ─ Virtual keyboard (123 / f(x) / ABC) with common symbols — click to insert.
 * ─ Sample presets: parabola, sin, cos, tan, exp, ln, sqrt, abs, rational.
 * ─ Fit-to-view, zoom in/out, reset view.
 * ─ Cursor tracking: shows (x, y) under the mouse + f(x) values for all visible functions.
 *
 * Expression grammar (recursive descent):
 *   expr   := term (('+'|'-') term)*
 *   term   := factor (('*'|'/') factor)*
 *   factor := unary ('^' factor)?              // right-assoc
 *   unary  := '-' unary | power
 *   power  := primary
 *   primary:= number | ident ('(' args ')' | ε) | '(' expr ')' | '|' expr '|'
 *
 * Supports implicit multiplication: 2x, 3sin(x), (x+1)(x-1).
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus, Eye, EyeOff, Trash2, ZoomIn, ZoomOut, Maximize2,
  Calculator, FunctionSquare, Hash, RotateCcw, Boxes, X,
} from 'lucide-react'

// Lazy: chỉ nạp three/drei/AR khi user mở chế độ 3D
const GraphAR3D = lazy(() => import('@/components/labs/GraphAR3D'))

// ─────────────────────────────────────────────────────────────
// Expression parser & evaluator
// ─────────────────────────────────────────────────────────────

type Tok =
  | { t: 'num'; v: number }
  | { t: 'ident'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'bar' } | { t: 'comma' }
  | { t: 'eof' }

function tokenize(src: string): Tok[] {
  const toks: Tok[] = []
  let i = 0
  const isDigit = (c: string) => c >= '0' && c <= '9'
  const isAlpha = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'
  while (i < src.length) {
    const c = src[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    // Numbers
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1] ?? ''))) {
      let j = i
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++
      // Exponent
      if (j < src.length && (src[j] === 'e' || src[j] === 'E')) {
        j++
        if (src[j] === '+' || src[j] === '-') j++
        while (j < src.length && isDigit(src[j])) j++
      }
      toks.push({ t: 'num', v: Number(src.slice(i, j)) })
      i = j
      continue
    }
    // Identifier
    if (isAlpha(c)) {
      let j = i + 1
      while (j < src.length && (isAlpha(src[j]) || isDigit(src[j]))) j++
      toks.push({ t: 'ident', v: src.slice(i, j).toLowerCase() })
      i = j
      continue
    }
    // Operators / punctuation
    if ('+-*/^'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue }
    if (c === '(') { toks.push({ t: 'lp' }); i++; continue }
    if (c === ')') { toks.push({ t: 'rp' }); i++; continue }
    if (c === '|') { toks.push({ t: 'bar' }); i++; continue }
    if (c === ',') { toks.push({ t: 'comma' }); i++; continue }
    // Unicode replacements
    if (c === '−') { toks.push({ t: 'op', v: '-' }); i++; continue }
    if (c === '·' || c === '×') { toks.push({ t: 'op', v: '*' }); i++; continue }
    if (c === '÷') { toks.push({ t: 'op', v: '/' }); i++; continue }
    if (c === '²') { toks.push({ t: 'op', v: '^' }); toks.push({ t: 'num', v: 2 }); i++; continue }
    if (c === '³') { toks.push({ t: 'op', v: '^' }); toks.push({ t: 'num', v: 3 }); i++; continue }
    if (c === 'π') { toks.push({ t: 'ident', v: 'pi' }); i++; continue }
    throw new Error(`Ký tự không hợp lệ: "${c}"`)
  }
  toks.push({ t: 'eof' })
  return toks
}

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, ln: Math.log, log: (x: number) => Math.log10(x),
  log2: (x: number) => Math.log2(x),
  sqrt: Math.sqrt, cbrt: Math.cbrt,
  abs: Math.abs, sign: Math.sign,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  min: Math.min, max: Math.max,
  pow: Math.pow,
}

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 }

type Node =
  | { k: 'num'; v: number }
  | { k: 'var'; v: string }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; l: Node; r: Node }
  | { k: 'call'; name: string; args: Node[] }
  | { k: 'abs'; a: Node }

function parse(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const eat = () => toks[p++]
  const expect = (tt: string, v?: string) => {
    const tk = toks[p]
    if (tk.t !== tt || (v !== undefined && (tk as { v: string }).v !== v)) {
      throw new Error(`Kỳ vọng ${tt}${v ? ` "${v}"` : ''}, thấy ${tk.t}`)
    }
    return eat()
  }

  function parseExpr(): Node {
    let lhs = parseTerm()
    while (peek().t === 'op' && ((peek() as { v: string }).v === '+' || (peek() as { v: string }).v === '-')) {
      const op = (eat() as { v: string }).v as '+' | '-'
      const r = parseTerm()
      lhs = { k: 'bin', op, l: lhs, r }
    }
    return lhs
  }
  function parseTerm(): Node {
    let lhs = parseFactor()
    while (true) {
      const tk = peek()
      if (tk.t === 'op' && ((tk as { v: string }).v === '*' || (tk as { v: string }).v === '/')) {
        const op = (eat() as { v: string }).v as '*' | '/'
        const r = parseFactor()
        lhs = { k: 'bin', op, l: lhs, r }
        continue
      }
      // Implicit multiplication: 2x, 2(x+1), x sin(...)
      // Note: '|' excluded to avoid ambiguity inside |abs| expressions.
      // Users can write 2*|x| explicitly, or prefer abs(x).
      if (tk.t === 'ident' || tk.t === 'lp' || tk.t === 'num') {
        // Don't consume — require the left side is a primary-ish thing
        const r = parseFactor()
        lhs = { k: 'bin', op: '*', l: lhs, r }
        continue
      }
      break
    }
    return lhs
  }
  // Unary minus has LOWER precedence than '^' (so -x^2 = -(x^2)).
  // Grammar:
  //   factor := unary
  //   unary  := '-' unary | power
  //   power  := primary ('^' unary)?    // right-associative
  function parseFactor(): Node {
    return parseUnary()
  }
  function parseUnary(): Node {
    if (peek().t === 'op' && (peek() as { v: string }).v === '-') {
      eat()
      return { k: 'neg', a: parseUnary() }
    }
    if (peek().t === 'op' && (peek() as { v: string }).v === '+') {
      eat()
      return parseUnary()
    }
    return parsePower()
  }
  function parsePower(): Node {
    const base = parsePrimary()
    if (peek().t === 'op' && (peek() as { v: string }).v === '^') {
      eat()
      const exp = parseUnary()  // right-assoc; allows -x in exponent
      return { k: 'bin', op: '^', l: base, r: exp }
    }
    return base
  }
  function parsePrimary(): Node {
    const tk = peek()
    if (tk.t === 'num') { eat(); return { k: 'num', v: (tk as { v: number }).v } }
    if (tk.t === 'lp') {
      eat()
      const n = parseExpr()
      expect('rp')
      return n
    }
    if (tk.t === 'bar') {
      eat()
      const n = parseExpr()
      expect('bar')
      return { k: 'abs', a: n }
    }
    if (tk.t === 'ident') {
      const name = (eat() as { v: string }).v
      if (peek().t === 'lp') {
        eat()
        const args: Node[] = []
        if (peek().t !== 'rp') {
          args.push(parseExpr())
          while (peek().t === 'comma') { eat(); args.push(parseExpr()) }
        }
        expect('rp')
        return { k: 'call', name, args }
      }
      return { k: 'var', v: name }
    }
    throw new Error(`Biểu thức không hợp lệ ở ký tự ${p}`)
  }

  const n = parseExpr()
  if (peek().t !== 'eof') throw new Error('Biểu thức thừa ký tự sau dấu cuối')
  return n
}

function evalNode(n: Node, x: number, y: number = 0): number {
  switch (n.k) {
    case 'num': return n.v
    case 'var':
      if (n.v === 'x') return x
      if (n.v === 'y') return y
      if (n.v in CONSTANTS) return CONSTANTS[n.v]
      throw new Error(`Biến không biết: ${n.v}`)
    case 'neg': return -evalNode(n.a, x, y)
    case 'abs': return Math.abs(evalNode(n.a, x, y))
    case 'bin': {
      const a = evalNode(n.l, x, y), b = evalNode(n.r, x, y)
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return a / b
        case '^': return Math.pow(a, b)
      }
      return NaN
    }
    case 'call': {
      const f = FUNCTIONS[n.name]
      if (!f) throw new Error(`Hàm không hỗ trợ: ${n.name}`)
      return f(...n.args.map((a) => evalNode(a, x, y)))
    }
  }
}

// Kiểm tra cây AST có sử dụng biến `y` không (để biết bất phương trình 1D hay 2D)
function usesVarY(n: Node): boolean {
  switch (n.k) {
    case 'num': return false
    case 'var': return n.v === 'y'
    case 'neg':
    case 'abs': return usesVarY(n.a)
    case 'bin': return usesVarY(n.l) || usesVarY(n.r)
    case 'call': return n.args.some(usesVarY)
  }
}

function compileFunction(src: string): { ok: true; eval: (x: number) => number } | { ok: false; err: string } {
  try {
    // Normalize Unicode math symbols (cho user dùng được ký tự từ bàn phím khoa học)
    let s = normalizeMathSrc(src.trim())
    // Strip leading "y =" or "f(x) ="
    s = s.replace(/^\s*y\s*=\s*/i, '').replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, '')
    if (!s) return { ok: false, err: 'Biểu thức rỗng' }
    const node = parse(s)
    return {
      ok: true,
      eval: (x: number) => {
        try { return evalNode(node, x) } catch { return NaN }
      },
    }
  } catch (e) {
    return { ok: false, err: (e as Error).message }
  }
}

// Compile hàm 2 biến z = f(x, y) cho chế độ mặt 3D.
function compileSurface(src: string): { ok: true; eval: (x: number, y: number) => number } | { ok: false; err: string } {
  try {
    let s = normalizeMathSrc(src.trim())
    s = s.replace(/^\s*z\s*=\s*/i, '').replace(/^\s*f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*/i, '')
    if (!s) return { ok: false, err: 'Biểu thức rỗng' }
    const node = parse(s)
    return {
      ok: true,
      eval: (x: number, y: number) => {
        try { return evalNode(node, x, y) } catch { return NaN }
      },
    }
  } catch (e) {
    return { ok: false, err: (e as Error).message }
  }
}

// ─────────────────────────────────────────────────────────────
// Inequality parser & compiler
// Hỗ trợ: 3x < 2, y > x^2, x^2 + y^2 <= 4, y < sin(x), etc.
// Cũng nhận dạng Unicode từ bàn phím khoa học: ≤ ≥ (U+2264, U+2265)
// Output diff(x,y) = lhs(x,y) - rhs(x,y) → so sánh với 0 theo op.
// ─────────────────────────────────────────────────────────────

type IneqOp = '<' | '<=' | '>' | '>='

// Normalize Unicode math symbols → ASCII trước khi parse.
// User: "Ký tự không hợp lệ: '≤'" — bàn phím khoa học gửi U+2264.
function normalizeMathSrc(src: string): string {
  return src
    .replace(/≤/g, '<=')        // U+2264 less-than or equal
    .replace(/≥/g, '>=')        // U+2265 greater-than or equal
    .replace(/⩽/g, '<=')        // U+2A7D variants
    .replace(/⩾/g, '>=')        // U+2A7E variants
    .replace(/≠/g, '!=')        // U+2260 not equal (chưa hỗ trợ nhưng map an toàn)
}

// Detect operator vị trí đầu tiên (longest-match: '<=' trước '<')
// Source đã được normalizeMathSrc → chỉ cần check ASCII variants.
function findIneqOp(src: string): { op: IneqOp; pos: number } | null {
  const candidates: { op: IneqOp; len: number }[] = [
    { op: '<=', len: 2 }, { op: '>=', len: 2 },
    { op: '<',  len: 1 }, { op: '>',  len: 1 },
  ]
  let best: { op: IneqOp; pos: number } | null = null
  for (const c of candidates) {
    const idx = src.indexOf(c.op)
    if (idx === -1) continue
    if (best === null || idx < best.pos) best = { op: c.op, pos: idx }
  }
  return best
}

type CompiledInequality = {
  op: IneqOp
  diff: (x: number, y: number) => number
  hasY: boolean
  isStrict: boolean  // < và > → boundary dashed
}

function compileInequality(src: string):
  { ok: true; ineq: CompiledInequality } | { ok: false; err: string } {
  try {
    // Normalize Unicode (≤ → <=, ≥ → >=) trước khi tìm operator
    let s = normalizeMathSrc(src.trim())
    // Strip leading "y =" hoặc "f(x) =" (không áp dụng — vì có thể nhầm với <=)
    const found = findIneqOp(s)
    if (!found) return { ok: false, err: 'Không tìm thấy toán tử bất đẳng thức' }
    const lhsSrc = s.slice(0, found.pos).trim()
    const rhsSrc = s.slice(found.pos + found.op.length).trim()
    if (!lhsSrc || !rhsSrc) return { ok: false, err: 'Thiếu vế trái hoặc phải' }
    const lhsNode = parse(lhsSrc)
    const rhsNode = parse(rhsSrc)
    const hasY = usesVarY(lhsNode) || usesVarY(rhsNode)
    return {
      ok: true,
      ineq: {
        op: found.op,
        diff: (x: number, y: number) => {
          try { return evalNode(lhsNode, x, y) - evalNode(rhsNode, x, y) }
          catch { return NaN }
        },
        hasY,
        isStrict: found.op === '<' || found.op === '>',
      },
    }
  } catch (e) {
    return { ok: false, err: (e as Error).message }
  }
}

// Detect bất phương trình — chấp nhận cả ASCII (<, >, <=, >=) và Unicode
// (≤ U+2264, ≥ U+2265, ⩽ U+2A7D, ⩾ U+2A7E) từ bàn phím khoa học.
function isInequalitySrc(src: string): boolean {
  return /<=?|>=?|[≤≥⩽⩾]/.test(src)
}

// ─────────────────────────────────────────────────────────────
// Types & presets
// ─────────────────────────────────────────────────────────────

type EquationRow = {
  id: string
  src: string
  color: string
  visible: boolean
}

const COLORS = [
  '#22d3ee', '#fbbf24', '#a3e635', '#f472b6',
  '#a78bfa', '#fb923c', '#34d399', '#f87171',
  '#60a5fa', '#c084fc', '#facc15', '#2dd4bf',
]

const PRESETS: { label: string; src: string }[] = [
  // ── Bất phương trình ĐẶC TRƯNG — demo dùng ký tự ≤ ≥ Unicode ──
  // (Test parser nhận diện ký tự từ bàn phím khoa học)
  { label: '2x + y ≤ 2', src: '2x + y ≤ 2' },            // nửa mặt phẳng tuyến tính
  { label: 'x² + y² ≤ 9', src: 'x^2 + y^2 ≤ 9' },        // hình tròn đặc
  // ── Các bất phương trình khác ──
  { label: '3x < 2', src: '3x < 2' },
  { label: 'y < x²', src: 'y < x^2' },
  { label: 'y ≥ |x|', src: 'y ≥ abs(x)' },
  { label: 'y > sin(x)', src: 'y > sin(x)' },
  // ── Hàm số y = f(x) ──
  { label: 'x²', src: 'x^2' },
  { label: 'x³', src: 'x^3' },
  { label: 'sin(x)', src: 'sin(x)' },
  { label: 'cos(x)', src: 'cos(x)' },
  { label: 'tan(x)', src: 'tan(x)' },
  { label: 'eˣ', src: 'exp(x)' },
  { label: 'ln(x)', src: 'ln(x)' },
  { label: '√x', src: 'sqrt(x)' },
  { label: '|x|', src: 'abs(x)' },
  { label: '1/x', src: '1/x' },
  { label: 'x²−4', src: 'x^2 - 4' },
  { label: 'sin(x)·eˣ', src: 'sin(x) * exp(-x^2/4)' },
]

// ─────────────────────────────────────────────────────────────
// Plot canvas
// ─────────────────────────────────────────────────────────────

type Compiled = {
  row: EquationRow
  // function mode (y = f(x))
  fn: (x: number) => number
  err: string | null
  // inequality mode — set khi src chứa <, <=, >, >=
  ineq?: CompiledInequality
}

function niceStep(range: number, targetTicks = 10): number {
  const raw = range / targetTicks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  let step: number
  if (norm < 1.5) step = 1
  else if (norm < 3) step = 2
  else if (norm < 7) step = 5
  else step = 10
  return step * mag
}

function formatTick(v: number): string {
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e4 || a < 1e-3) return v.toExponential(1)
  if (a >= 10) return v.toFixed(0)
  if (a >= 1) return v.toFixed(1)
  return v.toFixed(2)
}

function Plot({
  compiled, viewport, onViewportChange, height = 560,
}: {
  compiled: Compiled[]
  viewport: { xMin: number; xMax: number; yMin: number; yMax: number }
  onViewportChange: (v: { xMin: number; xMax: number; yMin: number; yMax: number }) => void
  height?: number
}) {
  const ref = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: height })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<{ x0: number; y0: number; v0: typeof viewport } | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(320, Math.floor(r.width)), h: height })
    })
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [height])

  const { w, h } = size
  const { xMin, xMax, yMin, yMax } = viewport

  const xS = (x: number) => ((x - xMin) / (xMax - xMin)) * w
  const yS = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h
  const xInv = (px: number) => xMin + (px / w) * (xMax - xMin)
  const yInv = (py: number) => yMin + ((h - py) / h) * (yMax - yMin)

  const stepX = niceStep(xMax - xMin)
  const stepY = niceStep(yMax - yMin)
  const minorX = stepX / 5
  const minorY = stepY / 5

  const ticksX: number[] = []
  for (let v = Math.ceil(xMin / stepX) * stepX; v <= xMax + 1e-9; v += stepX) ticksX.push(v)
  const ticksY: number[] = []
  for (let v = Math.ceil(yMin / stepY) * stepY; v <= yMax + 1e-9; v += stepY) ticksY.push(v)
  const minorTicksX: number[] = []
  for (let v = Math.ceil(xMin / minorX) * minorX; v <= xMax + 1e-9; v += minorX) minorTicksX.push(v)
  const minorTicksY: number[] = []
  for (let v = Math.ceil(yMin / minorY) * minorY; v <= yMax + 1e-9; v += minorY) minorTicksY.push(v)

  // ─── Inequality regions (shaded) + boundary curves ───
  // For each inequality, sample N_x columns. At each x:
  //   - If hasY: scan y from yMin..yMax, find sign transitions of diff(x,y),
  //     mark intervals where (op === '<' || '<=') ? diff<0 : diff>0 is true
  //   - Else (1D): diff(x,*) constant in y → either entire column in or out
  // Draw filled rect for each "in" interval. Boundary points (sign flip) →
  // collect into a path with strokeDasharray (strict) hoặc solid.
  const ineqRender = useMemo(() => {
    const inequalities = compiled.filter((c) => c.row.visible && !c.err && c.ineq)
    if (inequalities.length === 0) return { fills: [], boundaries: [] }
    const Nx = 180  // số cột x (đủ chi tiết, không quá nặng)
    const Ny = 120  // số dòng y mỗi cột
    const fills: { x: number; y: number; w: number; h: number; color: string; key: string }[] = []
    const boundaries: { d: string; color: string; isStrict: boolean; key: string }[] = []

    for (const c of inequalities) {
      const { op, diff, hasY, isStrict } = c.ineq!
      const color = c.row.color
      const colW = w / Nx
      // For 1D (no y): mỗi cột chỉ cần 1 lần evaluate
      if (!hasY) {
        let prevSign: number | null = null
        let prevPx = 0
        const boundaryPts: { px: number; py?: number }[] = []
        for (let i = 0; i <= Nx; i++) {
          const x = xMin + ((xMax - xMin) * i) / Nx
          const d = diff(x, 0)
          if (!Number.isFinite(d)) { prevSign = null; continue }
          const inside = (op === '<' || op === '<=') ? d < 0 : d > 0
          const sign = d < 0 ? -1 : d > 0 ? 1 : 0
          const px = xS(x)
          // Sign change → boundary
          if (prevSign !== null && sign !== 0 && sign !== prevSign) {
            // Interpolate: boundary px ~ between prevPx and px
            boundaryPts.push({ px: (prevPx + px) / 2 })
          }
          if (inside) {
            fills.push({
              x: px - colW / 2, y: 0, w: colW + 0.5, h,
              color, key: `${c.row.id}-${i}`,
            })
          }
          prevSign = sign
          prevPx = px
        }
        // Vertical line boundary at each bp
        for (const bp of boundaryPts) {
          boundaries.push({
            d: `M${bp.px.toFixed(2)},0 L${bp.px.toFixed(2)},${h}`,
            color, isStrict, key: `${c.row.id}-bnd-${bp.px.toFixed(2)}`,
          })
        }
        continue
      }

      // 2D: scan each x column, find y intervals where inside=true
      // Collect boundary points by detecting sign transitions in each column
      const dy = (yMax - yMin) / Ny
      const boundaryByCol: { px: number; py: number }[] = []
      for (let i = 0; i <= Nx; i++) {
        const x = xMin + ((xMax - xMin) * i) / Nx
        const px = xS(x)
        // Sample diff at Ny+1 y values
        const samples: number[] = new Array(Ny + 1)
        for (let j = 0; j <= Ny; j++) {
          const y = yMin + dy * j
          samples[j] = diff(x, y)
        }
        // Walk through samples, build intervals where "inside" is true
        let intervalStart: number | null = null
        for (let j = 0; j <= Ny; j++) {
          const d = samples[j]
          const inside = Number.isFinite(d) && ((op === '<' || op === '<=') ? d < 0 : d > 0)
          if (inside && intervalStart === null) intervalStart = j
          if ((!inside || j === Ny) && intervalStart !== null) {
            const yStart = yMin + dy * intervalStart
            const yEnd = yMin + dy * (inside ? j : j - 1)
            const pyTop = yS(Math.max(yStart, yEnd))
            const pyBot = yS(Math.min(yStart, yEnd))
            fills.push({
              x: px - colW / 2, y: pyTop, w: colW + 0.5, h: Math.max(0.5, pyBot - pyTop),
              color, key: `${c.row.id}-${i}-${intervalStart}`,
            })
            intervalStart = null
          }
          // Detect boundary: sign flip between samples[j-1] and samples[j]
          if (j > 0) {
            const a = samples[j - 1], b = samples[j]
            if (Number.isFinite(a) && Number.isFinite(b) && a * b < 0) {
              // Linear interp for the zero crossing
              const t = a / (a - b)
              const yZero = (yMin + dy * (j - 1)) + dy * t
              boundaryByCol.push({ px, py: yS(yZero) })
            }
          }
        }
      }
      // Connect boundary points across columns into smooth path(s)
      // Sort by px, but multiple py per px possible → group nearest
      if (boundaryByCol.length > 1) {
        // Simple: just connect consecutive points
        let d = ''
        let lastPx = -Infinity
        for (const pt of boundaryByCol) {
          if (pt.px - lastPx > colW * 3) {
            d += `M${pt.px.toFixed(2)},${pt.py.toFixed(2)} `
          } else {
            d += `L${pt.px.toFixed(2)},${pt.py.toFixed(2)} `
          }
          lastPx = pt.px
        }
        boundaries.push({ d: d.trim(), color, isStrict, key: `${c.row.id}-bnd` })
      }
    }
    return { fills, boundaries }
  }, [compiled, xMin, xMax, yMin, yMax, w, h])

  // ─── Intersection points between functions ───
  // Pair-wise: tìm sign change của (f_i - f_j) qua sampling, refine bằng
  // bisection/linear interp. Hiển thị chấm tròn lớn + tooltip toạ độ.
  const intersections = useMemo(() => {
    const fns = compiled.filter((c) => c.row.visible && !c.err && !c.ineq)
    if (fns.length < 2) return [] as { x: number; y: number; ids: [string, string]; colors: [string, string] }[]
    const N = 600  // sample density — đủ tinh cho hầu hết hàm bậc cao
    const out: { x: number; y: number; ids: [string, string]; colors: [string, string] }[] = []
    const dx = (xMax - xMin) / N
    const TOL = (xMax - xMin) * 1e-6
    // Helper: bisection refine sign change x_a, x_b — trả về x với |g(x)| ≈ 0
    const refine = (g: (x: number) => number, xa: number, xb: number): number | null => {
      let a = xa, b = xb
      let ga = g(a), gb = g(b)
      if (!Number.isFinite(ga) || !Number.isFinite(gb) || ga * gb > 0) return null
      for (let iter = 0; iter < 40; iter++) {
        if (Math.abs(b - a) < TOL) break
        const m = (a + b) / 2
        const gm = g(m)
        if (!Number.isFinite(gm)) return null
        if (gm === 0) return m
        if (ga * gm < 0) { b = m; gb = gm } else { a = m; ga = gm }
      }
      return (a + b) / 2
    }
    for (let i = 0; i < fns.length; i++) {
      for (let j = i + 1; j < fns.length; j++) {
        const fA = fns[i], fB = fns[j]
        const g = (x: number) => {
          try {
            const ya = fA.fn(x), yb = fB.fn(x)
            if (!Number.isFinite(ya) || !Number.isFinite(yb)) return NaN
            return ya - yb
          } catch { return NaN }
        }
        let prevX = xMin
        let prevG = g(prevX)
        for (let k = 1; k <= N; k++) {
          const x = xMin + dx * k
          const gNow = g(x)
          if (Number.isFinite(prevG) && Number.isFinite(gNow) && prevG !== 0 && gNow !== 0 && prevG * gNow < 0) {
            const xCross = refine(g, prevX, x)
            if (xCross !== null) {
              let yA = NaN
              try { yA = fA.fn(xCross) } catch {}
              if (Number.isFinite(yA) && yA >= yMin - (yMax - yMin) * 0.05 && yA <= yMax + (yMax - yMin) * 0.05) {
                // Dedup gần (cùng pair + cách < 1px display)
                const last = out[out.length - 1]
                const samePair = last && last.ids[0] === fA.row.id && last.ids[1] === fB.row.id
                if (!samePair || Math.abs(xS(last.x) - xS(xCross)) > 2) {
                  out.push({
                    x: xCross, y: yA,
                    ids: [fA.row.id, fB.row.id],
                    colors: [fA.row.color, fB.row.color],
                  })
                }
              }
            }
          }
          prevX = x
          prevG = gNow
        }
      }
    }
    // Cap để tránh render quá nhiều (vd hàm dao động)
    return out.slice(0, 40)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled, xMin, xMax, yMin, yMax])

  // ─── Snap cursor tới giao điểm gần nhất (trong bán kính 14px) ───
  const SNAP_RADIUS_PX = 14
  const snappedIntersection = useMemo(() => {
    if (!cursor) return null
    const cx = xS(cursor.x), cy = yS(cursor.y)
    let bestIdx = -1
    let bestDist = Infinity
    intersections.forEach((p, idx) => {
      const ddx = xS(p.x) - cx, ddy = yS(p.y) - cy
      const dist = Math.sqrt(ddx * ddx + ddy * ddy)
      if (dist <= SNAP_RADIUS_PX && dist < bestDist) {
        bestIdx = idx
        bestDist = dist
      }
    })
    return bestIdx >= 0 ? intersections[bestIdx] : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, intersections, w, h, xMin, xMax, yMin, yMax])

  // Compute paths for each function. Break path on NaN / discontinuities.
  const paths = useMemo(() => {
    const N = Math.max(400, Math.min(1500, Math.floor(w * 1.5)))
    return compiled.filter((c) => c.row.visible && !c.err && !c.ineq).map((c) => {
      const segments: string[] = []
      let current: string | null = null
      let prevY: number | null = null
      for (let i = 0; i <= N; i++) {
        const x = xMin + ((xMax - xMin) * i) / N
        let y: number
        try { y = c.fn(x) } catch { y = NaN }
        const valid =
          Number.isFinite(y) &&
          y > yMin - (yMax - yMin) * 5 &&
          y < yMax + (yMax - yMin) * 5
        // Detect asymptote: huge jump between consecutive samples
        const jumpTooBig = prevY !== null && Number.isFinite(prevY) && Number.isFinite(y) &&
          Math.abs(y - prevY) > (yMax - yMin) * 3
        if (!valid || jumpTooBig) {
          if (current !== null) segments.push(current)
          current = null
          prevY = y
          continue
        }
        const px = xS(x).toFixed(2)
        const py = yS(y).toFixed(2)
        if (current === null) current = `M${px},${py}`
        else current += ` L${px},${py}`
        prevY = y
      }
      if (current !== null) segments.push(current)
      return { d: segments.join(' '), color: c.row.color, id: c.row.id }
    })
  }, [compiled, xMin, xMax, yMin, yMax, w, h])

  // Mouse interactions
  const onMouseDown = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    setDragging({ x0: e.clientX - r.left, y0: e.clientY - r.top, v0: viewport })
  }
  const onMouseMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const px = e.clientX - r.left, py = e.clientY - r.top
    setCursor({ x: xInv(px), y: yInv(py) })
    if (dragging) {
      const dx = px - dragging.x0, dy = py - dragging.y0
      const rx = (dragging.v0.xMax - dragging.v0.xMin) / w
      const ry = (dragging.v0.yMax - dragging.v0.yMin) / h
      onViewportChange({
        xMin: dragging.v0.xMin - dx * rx,
        xMax: dragging.v0.xMax - dx * rx,
        yMin: dragging.v0.yMin + dy * ry,
        yMax: dragging.v0.yMax + dy * ry,
      })
    }
  }
  const onMouseUp = () => setDragging(null)
  const onMouseLeave = () => { setDragging(null); setCursor(null) }

  // Native non-passive wheel listener — React onWheel mặc định passive
  // → e.preventDefault() bị bỏ qua + cảnh báo console. Phải attach qua
  // addEventListener({ passive: false }) để zoom không scroll page.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const px = e.clientX - r.left, py = e.clientY - r.top
      const cx = xInv(px), cy = yInv(py)
      const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15
      onViewportChange({
        xMin: cx - (cx - xMin) * factor,
        xMax: cx + (xMax - cx) * factor,
        yMin: cy - (cy - yMin) * factor,
        yMax: cy + (yMax - cy) * factor,
      })
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [xMin, xMax, yMin, yMax, xInv, yInv, onViewportChange])

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-[#0a0f1a]">
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        style={{ display: 'block', cursor: dragging ? 'grabbing' : 'crosshair' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        /* wheel handled via native non-passive listener in useEffect */
      >
        {/* Minor gridlines */}
        {minorTicksX.map((t, i) => (
          <line key={`mvx${i}`} x1={xS(t)} y1={0} x2={xS(t)} y2={h}
                stroke="#111827" strokeWidth={0.5} />
        ))}
        {minorTicksY.map((t, i) => (
          <line key={`mhy${i}`} x1={0} y1={yS(t)} x2={w} y2={yS(t)}
                stroke="#111827" strokeWidth={0.5} />
        ))}
        {/* Major gridlines */}
        {ticksX.map((t, i) => (
          <line key={`vx${i}`} x1={xS(t)} y1={0} x2={xS(t)} y2={h}
                stroke="#1e293b" strokeWidth={0.8} />
        ))}
        {ticksY.map((t, i) => (
          <line key={`hy${i}`} x1={0} y1={yS(t)} x2={w} y2={yS(t)}
                stroke="#1e293b" strokeWidth={0.8} />
        ))}
        {/* Axes */}
        {yMin <= 0 && yMax >= 0 && (
          <line x1={0} y1={yS(0)} x2={w} y2={yS(0)} stroke='var(--td-muted)' strokeWidth={1.3} />
        )}
        {xMin <= 0 && xMax >= 0 && (
          <line x1={xS(0)} y1={0} x2={xS(0)} y2={h} stroke='var(--td-muted)' strokeWidth={1.3} />
        )}

        {/* Tick labels */}
        {ticksX.map((t, i) => {
          if (Math.abs(t) < stepX / 10) return null
          const px = xS(t)
          const py = yMin <= 0 && yMax >= 0 ? yS(0) + 12 : h - 4
          return (
            <text key={`tlx${i}`} x={px} y={py}
                  fill="#64748b" fontSize={10} textAnchor="middle" fontFamily="monospace">
              {formatTick(t)}
            </text>
          )
        })}
        {ticksY.map((t, i) => {
          if (Math.abs(t) < stepY / 10) return null
          const py = yS(t)
          const px = xMin <= 0 && xMax >= 0 ? xS(0) - 6 : 4
          return (
            <text key={`tly${i}`} x={px} y={py + 3}
                  fill="#64748b" fontSize={10}
                  textAnchor={xMin <= 0 && xMax >= 0 ? 'end' : 'start'}
                  fontFamily="monospace">
              {formatTick(t)}
            </text>
          )
        })}
        {/* Origin label */}
        {xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0 && (
          <text x={xS(0) - 6} y={yS(0) + 12} fill="#64748b" fontSize={10}
                textAnchor="end" fontFamily="monospace">0</text>
        )}

        {/* Inequality regions — vẽ TRƯỚC function paths để không che curves */}
        {ineqRender.fills.map((f) => (
          <rect key={f.key} x={f.x} y={f.y} width={f.w} height={f.h}
                fill={f.color} fillOpacity={0.18} stroke="none" />
        ))}
        {/* Inequality boundaries: dashed (strict <,>) hoặc solid (<=,>=) */}
        {ineqRender.boundaries.map((b) => (
          <path key={b.key} d={b.d} fill="none"
                stroke={b.color} strokeWidth={2.2}
                strokeDasharray={b.isStrict ? '6 4' : undefined}
                strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* Function paths */}
        {paths.map((p) => (
          <path key={p.id} d={p.d} fill="none"
                stroke={p.color} strokeWidth={2}
                strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {/* Intersection points — chấm tròn vàng (snap = lớn hơn + glow) */}
        {intersections.map((p, idx) => {
          const isSnap = snappedIntersection === p
          const cx = xS(p.x), cy = yS(p.y)
          if (cx < -12 || cx > w + 12 || cy < -12 || cy > h + 12) return null
          return (
            <g key={`isect-${idx}`} pointerEvents="none">
              {isSnap && (
                <>
                  <circle cx={cx} cy={cy} r={20} fill="#fbbf24" fillOpacity={0.18} />
                  <circle cx={cx} cy={cy} r={14} fill="#fbbf24" fillOpacity={0.28} />
                </>
              )}
              <circle cx={cx} cy={cy} r={isSnap ? 10 : 5.5}
                      fill="#fbbf24" stroke="#0a0f1a" strokeWidth={isSnap ? 2.5 : 1.75} />
              <circle cx={cx} cy={cy} r={isSnap ? 4.5 : 2.5} fill="#fff" />
            </g>
          )
        })}

        {/* Cursor marker + value readout */}
        {cursor && (
          <g>
            <line x1={xS(snappedIntersection?.x ?? cursor.x)} y1={0}
                  x2={xS(snappedIntersection?.x ?? cursor.x)} y2={h}
                  stroke={snappedIntersection ? '#fbbf24' : '#475569'}
                  strokeWidth={snappedIntersection ? 1 : 0.6}
                  strokeDasharray="3 3" />
            <line x1={0} y1={yS(snappedIntersection?.y ?? cursor.y)}
                  x2={w} y2={yS(snappedIntersection?.y ?? cursor.y)}
                  stroke={snappedIntersection ? '#fbbf24' : '#475569'}
                  strokeWidth={snappedIntersection ? 1 : 0.6}
                  strokeDasharray="3 3" />
            {!snappedIntersection && compiled.filter((c) => c.row.visible && !c.err && !c.ineq).map((c) => {
              let y: number
              try { y = c.fn(cursor.x) } catch { y = NaN }
              if (!Number.isFinite(y)) return null
              const py = yS(y)
              if (py < -10 || py > h + 10) return null
              return (
                <circle key={`ct${c.row.id}`}
                        cx={xS(cursor.x)} cy={py} r={4}
                        fill={c.row.color} stroke="#0a0f1a" strokeWidth={2} />
              )
            })}
          </g>
        )}

        {/* Snap coordinate label cạnh giao điểm */}
        {snappedIntersection && (() => {
          const cx = xS(snappedIntersection.x)
          const cy = yS(snappedIntersection.y)
          const label = `(${snappedIntersection.x.toFixed(3)}, ${snappedIntersection.y.toFixed(3)})`
          // Lệch label lên-phải; nếu vượt biên → flip xuống/trái
          const flipRight = cx + 140 > w
          const flipDown = cy - 30 < 6
          const tx = flipRight ? cx - 14 : cx + 14
          const ty = flipDown ? cy + 28 : cy - 14
          const anchor = flipRight ? 'end' : 'start'
          return (
            <g pointerEvents="none">
              <rect x={anchor === 'end' ? tx - 132 : tx - 4} y={ty - 16}
                    width={136} height={22} rx={5}
                    fill="#0a0f1a" fillOpacity={0.92}
                    stroke="#fbbf24" strokeWidth={1.2} />
              <text x={tx + (anchor === 'end' ? -8 : 4)} y={ty}
                    fill="#fbbf24" fontSize={13} fontFamily="monospace"
                    fontWeight={700} textAnchor={anchor}>
                🎯 {label}
              </text>
            </g>
          )
        })()}

        {/* Axis labels */}
        <text x={w - 8} y={yMin <= 0 && yMax >= 0 ? yS(0) - 6 : h - 20}
              fill='var(--td-muted)' fontSize={11}
              textAnchor="end" fontFamily="monospace" fontStyle="italic">x</text>
        <text x={xMin <= 0 && xMax >= 0 ? xS(0) + 8 : 14} y={14}
              fill='var(--td-muted)' fontSize={11} fontFamily="monospace" fontStyle="italic">y</text>
      </svg>

      {/* Cursor readout */}
      {cursor && (
        <div className={`pointer-events-none absolute right-2 top-2 rounded-lg border px-2.5 py-1.5 font-mono text-foreground ${
          snappedIntersection
            ? 'bg-amber-900/40 border-amber-400 text-[11.5px] shadow-[0_0_18px_rgba(251,191,36,0.35)]'
            : 'bg-slate-900/85 border-border text-[10.5px]'
        }`}>
          {snappedIntersection ? (
            <>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <span>🎯</span><span>Giao điểm</span>
              </div>
              <div className="text-[13px] leading-tight">
                x = <span className="text-amber-200 font-bold">{snappedIntersection.x.toFixed(4)}</span>
              </div>
              <div className="text-[13px] leading-tight">
                y = <span className="text-amber-200 font-bold">{snappedIntersection.y.toFixed(4)}</span>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: snappedIntersection.colors[0] }} />
                <span className="text-slate-300">∩</span>
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: snappedIntersection.colors[1] }} />
              </div>
            </>
          ) : (
            <>
              <div>x = <span className="text-cyan-300">{cursor.x.toFixed(3)}</span></div>
              <div>y = <span className="text-amber-300">{cursor.y.toFixed(3)}</span></div>
              {compiled.filter((c) => c.row.visible && !c.err).slice(0, 4).map((c) => {
                let y: number
                try { y = c.fn(cursor.x) } catch { y = NaN }
                return (
                  <div key={c.row.id} className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c.row.color }} />
                    <span className="text-slate-400">f({cursor.x.toFixed(2)})</span>
                    <span className="text-white">=</span>
                    <span style={{ color: c.row.color }}>
                      {Number.isFinite(y) ? y.toFixed(3) : '—'}
                    </span>
                  </div>
                )
              })}
              {intersections.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-700 text-[9.5px] text-slate-400">
                  💡 {intersections.length} giao điểm — rê chuột gần để snap
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Virtual keyboard
// ─────────────────────────────────────────────────────────────

type KbMode = '123' | 'fx' | 'abc'

function VirtualKeyboard({
  mode, setMode, onInsert, onBackspace, onClear, onSubmit,
}: {
  mode: KbMode
  setMode: (m: KbMode) => void
  onInsert: (s: string) => void
  onBackspace: () => void
  onClear: () => void
  onSubmit: () => void
}) {
  const rows123: (string | { label: string; val: string })[][] = [
    ['x', 'y', { label: 'π', val: 'pi' }, 'e', '7', '8', '9', { label: '×', val: '*' }, { label: '÷', val: '/' }],
    [{ label: 'x²', val: '^2' }, { label: '^', val: '^' }, { label: '√', val: 'sqrt(' }, { label: '|a|', val: 'abs(' }, '4', '5', '6', '+', '-'],
    ['(', ')', ',', '.', '1', '2', '3', '=', 'Enter'],
    ['<', '>', '≤', '≥', '0', 'ans', '←', '→', '⌫'],
  ]
  const rowsFx: (string | { label: string; val: string })[][] = [
    [{ label: 'sin', val: 'sin(' }, { label: 'cos', val: 'cos(' }, { label: 'tan', val: 'tan(' },
     { label: 'asin', val: 'asin(' }, { label: 'acos', val: 'acos(' }, { label: 'atan', val: 'atan(' }],
    [{ label: 'sinh', val: 'sinh(' }, { label: 'cosh', val: 'cosh(' }, { label: 'tanh', val: 'tanh(' },
     { label: 'eˣ', val: 'exp(' }, { label: 'ln', val: 'ln(' }, { label: 'log', val: 'log(' }],
    [{ label: '√', val: 'sqrt(' }, { label: '∛', val: 'cbrt(' }, { label: '|a|', val: 'abs(' },
     { label: 'floor', val: 'floor(' }, { label: 'ceil', val: 'ceil(' }, { label: 'sign', val: 'sign(' }],
    [{ label: 'x²', val: '^2' }, { label: 'x³', val: '^3' }, { label: 'x^n', val: '^' },
     { label: 'π', val: 'pi' }, 'e', { label: '⌫', val: '⌫' }],
  ]
  const rowsAbc: (string | { label: string; val: string })[][] = [
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    ['i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
    ['q', 'r', 's', 't', 'u', 'v', 'w', 'x'],
    ['y', 'z', { label: '⌫', val: '⌫' }],
  ]
  const rows = mode === '123' ? rows123 : mode === 'fx' ? rowsFx : rowsAbc

  const press = (k: string | { label: string; val: string }) => {
    const val = typeof k === 'string' ? k : k.val
    if (val === '⌫') { onBackspace(); return }
    if (val === 'Enter' || val === '=') { onSubmit(); return }
    if (val === '←' || val === '→' || val === 'ans') return
    onInsert(val)
  }
  const label = (k: string | { label: string; val: string }) =>
    typeof k === 'string' ? k : k.label

  return (
    <div className="rounded-2xl border border-border bg-slate-900/60 p-2">
      {/* Mode tabs */}
      <div className="mb-2 flex gap-1 text-[11px]">
        {([
          { id: '123' as KbMode, icon: Hash, label: '123' },
          { id: 'fx'  as KbMode, icon: FunctionSquare, label: 'f(x)' },
          { id: 'abc' as KbMode, icon: Calculator, label: 'ABC' },
        ]).map((m) => {
          const Icon = m.icon
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono ${
                active
                  ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-secondary'
              }`}
            >
              <Icon size={12} />
              {m.label}
            </button>
          )
        })}
        <div className="flex-1" />
        <button onClick={onClear}
                className="px-3 py-1 rounded-lg bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/40 font-mono">
          AC
        </button>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map((k, ki) => {
              const isEnter = (typeof k === 'string' && k === 'Enter') || (typeof k === 'object' && k.val === 'Enter')
              const isBksp  = (typeof k === 'string' && k === '⌫')      || (typeof k === 'object' && k.val === '⌫')
              return (
                <button
                  key={ki}
                  onClick={() => press(k)}
                  className={`flex-1 rounded-lg py-2 text-sm font-mono transition ${
                    isEnter
                      ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/50 hover:bg-emerald-500/30'
                      : isBksp
                      ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/40 hover:bg-rose-500/25'
                      : 'bg-slate-800/70 text-foreground ring-1 ring-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {label(k)}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

let nextId = 1
const mkId = () => `fn-${nextId++}`

export default function GraphLab() {
  // Demo mặc định: 1 hàm số + 2 bất phương trình đặc trưng dùng Unicode ≤
  // Cover 3 dạng: y = f(x), tuyến tính nửa mặt phẳng, hình tròn đặc.
  const [rows, setRows] = useState<EquationRow[]>([
    { id: mkId(), src: 'x^2',          color: COLORS[0], visible: true },
    { id: mkId(), src: '2x + y ≤ 2',   color: COLORS[3], visible: true },  // pink
    { id: mkId(), src: 'x^2 + y^2 ≤ 9', color: COLORS[7], visible: true }, // red
  ])
  const [activeId, setActiveId] = useState<string>(rows[0]?.id ?? '')
  const [kbMode, setKbMode] = useState<KbMode>('fx')
  const [kbOpen, setKbOpen] = useState(true)
  const [viewport, setViewport] = useState({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })
  const [ar3dOpen, setAr3dOpen] = useState(false)
  // Mặt 3D z = f(x, y) — chỉ dùng trong overlay 3D
  const [surfaceRows, setSurfaceRows] = useState<EquationRow[]>([
    { id: mkId(), src: 'x^2 - y^2', color: COLORS[4], visible: true },
  ])
  const compiledSurfaces = useMemo(
    () => surfaceRows.map((row) => {
      const r = compileSurface(row.src)
      return { row, fn: r.ok ? r.eval : (() => NaN), err: r.ok ? null : r.err }
    }),
    [surfaceRows],
  )
  const addSurface = () =>
    setSurfaceRows((rs) => [...rs, { id: mkId(), src: '', color: COLORS[(rs.length + 4) % COLORS.length], visible: true }])
  const updateSurface = (id: string, src: string) =>
    setSurfaceRows((rs) => rs.map((r) => (r.id === id ? { ...r, src } : r)))
  const deleteSurface = (id: string) =>
    setSurfaceRows((rs) => rs.filter((r) => r.id !== id))
  const toggleSurface = (id: string) =>
    setSurfaceRows((rs) => rs.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r)))

  const compiled: Compiled[] = useMemo(
    () => rows.map((row) => {
      // Detect inequality (chứa <, <=, >, >=) → compile inequality mode
      if (isInequalitySrc(row.src)) {
        const ir = compileInequality(row.src)
        if (ir.ok) {
          return { row, fn: () => NaN, err: null, ineq: ir.ineq }
        }
        return { row, fn: () => NaN, err: ir.err }
      }
      // Function mode (y = f(x))
      const r = compileFunction(row.src)
      return r.ok
        ? { row, fn: r.eval, err: null }
        : { row, fn: () => NaN, err: r.err }
    }),
    [rows],
  )

  const addRow = (src = '') => {
    const color = COLORS[rows.length % COLORS.length]
    const row: EquationRow = { id: mkId(), src, color, visible: true }
    setRows((r) => [...r, row])
    setActiveId(row.id)
  }
  const updateSrc = (id: string, src: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, src } : r)))
  const deleteRow = (id: string) =>
    setRows((rs) => {
      const next = rs.filter((r) => r.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? '')
      return next
    })
  const toggleVisible = (id: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r)))
  const cycleColor = (id: string) =>
    setRows((rs) => rs.map((r) => {
      if (r.id !== id) return r
      const idx = COLORS.indexOf(r.color)
      return { ...r, color: COLORS[(idx + 1) % COLORS.length] }
    }))

  // Keyboard insertion → active row
  const insertIntoActive = (s: string) => {
    if (!activeId) { addRow(s); return }
    setRows((rs) => rs.map((r) => (r.id === activeId ? { ...r, src: r.src + s } : r)))
  }
  const backspaceActive = () => {
    setRows((rs) => rs.map((r) =>
      r.id === activeId ? { ...r, src: r.src.slice(0, -1) } : r))
  }
  const clearActive = () => {
    setRows((rs) => rs.map((r) => (r.id === activeId ? { ...r, src: '' } : r)))
  }
  const submitActive = () => {
    // If active row has an expression, append a new empty row for the next function
    const active = rows.find((r) => r.id === activeId)
    if (active && active.src.trim()) addRow()
  }

  // View controls
  const zoom = (factor: number) => {
    const cx = (viewport.xMin + viewport.xMax) / 2
    const cy = (viewport.yMin + viewport.yMax) / 2
    setViewport({
      xMin: cx - (cx - viewport.xMin) * factor,
      xMax: cx + (viewport.xMax - cx) * factor,
      yMin: cy - (cy - viewport.yMin) * factor,
      yMax: cy + (viewport.yMax - cy) * factor,
    })
  }
  const resetView = () => setViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 })
  const fitToView = () => {
    const visible = compiled.filter((c) => c.row.visible && !c.err)
    if (visible.length === 0) return resetView()
    let yMin = Infinity, yMax = -Infinity
    const N = 400
    for (let i = 0; i <= N; i++) {
      const x = viewport.xMin + ((viewport.xMax - viewport.xMin) * i) / N
      visible.forEach((c) => {
        try {
          const y = c.fn(x)
          if (Number.isFinite(y)) {
            yMin = Math.min(yMin, y)
            yMax = Math.max(yMax, y)
          }
        } catch { /* skip */ }
      })
    }
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) return
    const pad = (yMax - yMin) * 0.15 + 0.5
    setViewport((v) => ({ ...v, yMin: yMin - pad, yMax: yMax + pad }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-foreground">
      <div className="max-w-[1400px] mx-auto space-y-3">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-gradient-to-r from-indigo-900/40 via-slate-900/80 to-fuchsia-900/30 px-4 py-3 flex items-center gap-3">
          <div className="rounded-xl bg-card p-2 ring-1 ring-cyan-400/50">
            <FunctionSquare size={22} className="text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-white">Graph Lab</div>
            <div className="text-xs text-slate-400">
              Vẽ đồ thị toán học — nhập phương trình <span className="font-mono text-cyan-300">y = f(x)</span> hoặc bất phương trình <span className="font-mono text-rose-300">y &lt; x²</span> · <span className="font-mono text-rose-300">3x &lt; 2</span> · <span className="font-mono text-rose-300">x²+y² ≤ 4</span>. Kéo thả để pan, lăn chuột để zoom.
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => zoom(1 / 1.25)} title="Zoom in"
                    className="p-2 rounded-lg bg-slate-800/70 ring-1 ring-slate-700 hover:bg-slate-700">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => zoom(1.25)} title="Zoom out"
                    className="p-2 rounded-lg bg-slate-800/70 ring-1 ring-slate-700 hover:bg-slate-700">
              <ZoomOut size={16} />
            </button>
            <button onClick={fitToView} title="Fit y-range"
                    className="p-2 rounded-lg bg-slate-800/70 ring-1 ring-slate-700 hover:bg-slate-700">
              <Maximize2 size={16} />
            </button>
            <button onClick={resetView} title="Reset view"
                    className="p-2 rounded-lg bg-slate-800/70 ring-1 ring-slate-700 hover:bg-slate-700">
              <RotateCcw size={16} />
            </button>
            <button onClick={() => setAr3dOpen(true)} title="Xem đồ thị 3D / AR"
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 text-white text-xs font-bold hover:from-violet-500 hover:to-cyan-500">
              <Boxes size={16} /> 3D / AR
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3">
          {/* Left sidebar: equation list */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-border bg-slate-900/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Đại số
                </div>
                <button onClick={() => addRow()}
                        className="flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 ring-1 ring-cyan-400/40 hover:bg-cyan-500/25">
                  <Plus size={12} /> Thêm
                </button>
              </div>

              <div className="space-y-2">
                {rows.map((row, idx) => {
                  const comp = compiled.find((c) => c.row.id === row.id)
                  const isActive = row.id === activeId
                  return (
                    <div
                      key={row.id}
                      onClick={() => setActiveId(row.id)}
                      className={`rounded-xl border p-2 transition cursor-text ${
                        isActive
                          ? 'border-transparent bg-secondary ring-1 ring-cyan-400/50'
                          : 'border-border bg-slate-900/40 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); cycleColor(row.id) }}
                          className="w-5 h-5 rounded-full ring-2 ring-slate-900"
                          style={{ background: row.color }}
                          title="Đổi màu"
                        />
                        <span className="text-[10px] font-mono text-slate-500">
                          f<sub>{idx + 1}</sub>(x) =
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVisible(row.id) }}
                          className="ml-auto text-slate-400 hover:text-foreground"
                          title={row.visible ? 'Ẩn' : 'Hiện'}
                        >
                          {row.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteRow(row.id) }}
                          className="text-slate-500 hover:text-rose-400"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        value={row.src}
                        onChange={(e) => updateSrc(row.id, e.target.value)}
                        onFocus={() => setActiveId(row.id)}
                        placeholder="ví dụ: x^2 + 3x − 2  hoặc  y < x^2"
                        spellCheck={false}
                        className={`mt-1.5 w-full bg-transparent px-1 py-1 font-mono text-sm outline-none ${
                          comp?.err ? 'text-rose-300' : 'text-foreground'
                        }`}
                        style={{ borderBottom: `1.5px solid ${row.color}40` }}
                      />
                      {comp?.err && (
                        <div className="mt-1 text-[10px] text-rose-400 font-mono">⚠ {comp.err}</div>
                      )}
                    </div>
                  )
                })}

                {rows.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-slate-500">
                    Chưa có phương trình. Nhấn "Thêm" hoặc chọn preset bên dưới.
                  </div>
                )}
              </div>
            </div>

            {/* Presets */}
            <div className="rounded-2xl border border-border bg-slate-900/60 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Mẫu nhanh
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.src}
                    onClick={() => addRow(p.src)}
                    className="rounded-lg bg-slate-800/70 px-2 py-1.5 text-[11px] font-mono text-foreground ring-1 ring-slate-700 hover:bg-slate-700 hover:text-cyan-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Keyboard toggle */}
            <button
              onClick={() => setKbOpen((o) => !o)}
              className="w-full rounded-2xl border border-border bg-slate-900/40 p-3 text-[11px] font-semibold text-foreground/80 hover:bg-card"
            >
              {kbOpen ? '↓ Ẩn bàn phím toán học' : '↑ Hiện bàn phím toán học'}
            </button>
          </aside>

          {/* Main area */}
          <section className="space-y-3 min-w-0">
            <Plot
              compiled={compiled}
              viewport={viewport}
              onViewportChange={setViewport}
              height={560}
            />

            {/* Viewport info + legend */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-slate-900/50 px-3 py-2 text-[11px] font-mono">
              <span className="text-slate-400">
                x ∈ [<span className="text-cyan-300">{viewport.xMin.toFixed(2)}</span>, <span className="text-cyan-300">{viewport.xMax.toFixed(2)}</span>]
              </span>
              <span className="text-slate-400">
                y ∈ [<span className="text-amber-300">{viewport.yMin.toFixed(2)}</span>, <span className="text-amber-300">{viewport.yMax.toFixed(2)}</span>]
              </span>
              <span className="flex-1" />
              {compiled.filter((c) => c.row.visible && !c.err).map((c, i) => (
                <span key={c.row.id} className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: c.row.color }} />
                  <span className="text-foreground/80">f{i + 1}: {c.row.src}</span>
                </span>
              ))}
            </div>

            {kbOpen && (
              <VirtualKeyboard
                mode={kbMode}
                setMode={setKbMode}
                onInsert={insertIntoActive}
                onBackspace={backspaceActive}
                onClear={clearActive}
                onSubmit={submitActive}
              />
            )}

            <div className="rounded-2xl border border-border bg-slate-900/40 p-3 text-[11px] text-slate-400 leading-relaxed">
              <div className="mb-1 font-semibold text-foreground">Cú pháp</div>
              <div className="font-mono">
                <span className="text-cyan-300">Toán tử:</span> + − * / ^ · | a |{'  '}
                <span className="text-cyan-300">Hàm:</span> sin cos tan asin acos atan sinh cosh tanh exp ln log log2 sqrt cbrt abs sign floor ceil round min max pow{'  '}
                <span className="text-cyan-300">Hằng:</span> pi (π) e tau{'  '}
                <span className="text-cyan-300">Nhân ngầm:</span> 2x, 3sin(x), (x+1)(x−1)
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ════════ Overlay: đồ thị 3D + AR ════════ */}
      {ar3dOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/10">
            <Boxes size={18} className="text-cyan-300" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">Đồ thị 3D — Thực tế tăng cường</div>
              <div className="text-[11px] text-slate-400 truncate">
                Đường cong y=f(x) + mặt cong <b className="text-fuchsia-300">z=f(x,y)</b> · xoay để xem · nút <b className="text-cyan-300">AR</b> đặt lên bàn
              </div>
            </div>
            <button onClick={() => setAr3dOpen(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/90 text-white text-xs font-bold hover:bg-rose-500">
              <X size={14} /> Đóng
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">Đang tải 3D…</div>}>
              <GraphAR3D
                functions={compiled
                  .filter((c) => c.row.visible && !c.err && !c.ineq)
                  .map((c) => ({ fn: c.fn, color: c.row.color }))}
                surfaces={compiledSurfaces
                  .filter((c) => c.row.visible && !c.err)
                  .map((c) => ({ fn: c.fn, color: c.row.color }))}
                viewport={viewport}
              />
            </Suspense>

            {/* Panel nhập mặt z=f(x,y) */}
            <div className="absolute top-3 left-3 w-[250px] max-w-[80vw] rounded-xl bg-slate-900/85 border border-white/10 backdrop-blur p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-300">Mặt 3D · z = f(x, y)</span>
                <button onClick={addSurface}
                        className="flex items-center gap-1 rounded-lg bg-fuchsia-500/20 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-fuchsia-400/40 hover:bg-fuchsia-500/30">
                  <Plus size={11} /> Thêm
                </button>
              </div>
              {surfaceRows.map((row) => {
                const c = compiledSurfaces.find((s) => s.row.id === row.id)
                return (
                  <div key={row.id} className="rounded-lg bg-white/5 px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-[10px] font-mono text-slate-400">z=</span>
                      <input
                        value={row.src}
                        onChange={(e) => updateSurface(row.id, e.target.value)}
                        placeholder="x^2 - y^2"
                        spellCheck={false}
                        className="flex-1 min-w-0 bg-transparent text-xs font-mono text-white outline-none"
                      />
                      <button onClick={() => toggleSurface(row.id)} className="text-slate-400 hover:text-white" title={row.visible ? 'Ẩn' : 'Hiện'}>
                        {row.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button onClick={() => deleteSurface(row.id)} className="text-slate-500 hover:text-rose-400" title="Xóa">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {c?.err && <div className="mt-0.5 text-[10px] text-rose-400 font-mono">⚠ {c.err}</div>}
                  </div>
                )
              })}
              <div className="text-[10px] text-slate-500 leading-snug">
                Ví dụ: <span className="font-mono text-fuchsia-200">x^2 - y^2</span> · <span className="font-mono text-fuchsia-200">sin(x)*cos(y)</span> · <span className="font-mono text-fuchsia-200">sin(sqrt(x^2+y^2))</span>
              </div>
            </div>

            {compiled.filter((c) => c.row.visible && !c.err && !c.ineq).length === 0 &&
             compiledSurfaces.filter((c) => c.row.visible && !c.err).length === 0 && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="rounded-xl bg-slate-900/80 border border-white/10 px-4 py-3 text-center text-slate-300 text-sm max-w-xs">
                  Chưa có gì để vẽ. Thêm hàm <span className="font-mono text-cyan-300">y=f(x)</span> ở ngoài, hoặc mặt <span className="font-mono text-fuchsia-300">z=f(x,y)</span> ở panel trái.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
