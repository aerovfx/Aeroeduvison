/**
 * Arduino Transpile — chuyển Arduino C++ subset → async JS executable
 *
 * Hỗ trợ subset đủ cho sketch giáo dục:
 *   - Types: int, long, byte, bool, char[], float, unsigned int, const
 *   - Control: if/else, for, while, do-while, break, continue
 *   - Functions: setup(), loop(), + user-defined functions (void/return)
 *   - Operators: +, -, *, /, %, ++, --, +=, -=, *=, /=, ==, !=, <, >, <=, >=, &&, ||, !
 *   - Bitwise: &, |, ^, ~, <<, >>
 *   - Arduino API: pinMode, digitalWrite, digitalRead, analogWrite, analogRead,
 *     delay, delayMicroseconds, millis, micros, Serial.*, tone, noTone, map, constrain,
 *     min, max, abs, random, randomSeed
 *   - Constants: HIGH, LOW, INPUT, OUTPUT, INPUT_PULLUP, LED_BUILTIN, A0-A5, true, false
 *
 * Không hỗ trợ (sketch dùng sẽ lỗi):
 *   - Classes, structs, typedef
 *   - Pointers, arrays đa chiều phức tạp
 *   - #include (chỉ ignore <Arduino.h>)
 *   - String class (chỉ char arrays + concat)
 *   - Interrupts (attachInterrupt)
 *   - F() macro
 *
 * Output: async function take (runtime, signal) → wrap setup + loop:
 *   await setupBody()
 *   while (!signal.stopped) { await loopBody() }
 */

export interface TranspileResult {
  ok: true
  /** JS code (chưa wrap, dùng new AsyncFunction để eval) */
  jsCode: string
  /** User-defined function names */
  userFns: string[]
}

export interface TranspileError {
  ok: false
  error: string
  line?: number
}

const ARDUINO_API_FNS = new Set([
  'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead',
  'delay', 'delayMicroseconds', 'millis', 'micros', 'tone', 'noTone',
])
const ARDUINO_API_ASYNC = new Set([
  'delay', 'delayMicroseconds',
])

// Substitutions cho constants — direct text replace
const CONSTS: Record<string, string> = {
  'HIGH':         '1',
  'LOW':          '0',
  'true':         'true',
  'false':        'false',
  'INPUT_PULLUP': "'INPUT_PULLUP'",
  'OUTPUT':       "'OUTPUT'",
  'INPUT':        "'INPUT'",
  'LED_BUILTIN':  '13',
  'A0': '14', 'A1': '15', 'A2': '16', 'A3': '17', 'A4': '18', 'A5': '19',
}

/**
 * Strip C-style + C++ comments. Trả về source không còn comments để parse dễ.
 */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  const n = src.length
  while (i < n) {
    const c = src[i]
    const c2 = src[i + 1]
    // /* ... */
    if (c === '/' && c2 === '*') {
      const end = src.indexOf('*/', i + 2)
      if (end === -1) return out
      out += '\n'.repeat((src.substring(i, end).match(/\n/g) || []).length)
      i = end + 2
      continue
    }
    // // ...
    if (c === '/' && c2 === '/') {
      const nl = src.indexOf('\n', i)
      if (nl === -1) return out
      i = nl
      continue
    }
    // String literal — skip past closing "
    if (c === '"') {
      out += c
      i++
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < n) { out += src[i] + src[i + 1]; i += 2; continue }
        out += src[i]; i++
      }
      if (i < n) { out += src[i]; i++ }
      continue
    }
    out += c
    i++
  }
  return out
}

/**
 * Strip #include lines + #define lines (chỉ ignore — không xử lý macro).
 */
function stripPreprocessor(src: string): string {
  return src.split('\n').filter(l => !l.trim().startsWith('#')).join('\n')
}

/**
 * Substitute constants (HIGH/LOW/A0/...) — chỉ thay token đứng riêng,
 * tránh trùng với prefix biến (HighScore, OUTPUT_state...).
 */
function substituteConstants(src: string): string {
  let result = src
  for (const [k, v] of Object.entries(CONSTS)) {
    // \b word boundary để không match HighScore khi tìm HIGH
    const re = new RegExp(`\\b${k}\\b`, 'g')
    result = result.replace(re, v)
  }
  return result
}

/**
 * Replace Arduino types với let. char[] dùng String.
 * Preserve type khi đang trong parameter list của function definition.
 *
 *   int x = 5;       → let x = 5;
 *   long t = 0;      → let t = 0;
 *   byte b;          → let b;
 *   bool flag;       → let flag;
 *   float pi = 3.14; → let pi = 3.14;
 *   const int N=10;  → const N=10;
 *   unsigned int    → let
 *   char name[20] = "hi"; → let name = "hi";
 */
function replaceTypes(src: string): string {
  let r = src
  // unsigned int → let (single token)
  r = r.replace(/\bunsigned\s+(int|long|byte|char|short)\b/g, 'let')
  r = r.replace(/\b(int|long|byte|short|float|double|bool|boolean|char|void)\s+(?=\w+\s*[=;,(\[])/g,
    (m, ty) => {
      if (ty === 'void') return ''  // void f() → f()
      return 'let '
    })
  // const T x → const x
  r = r.replace(/\bconst\s+(int|long|byte|short|float|double|bool|char)\s+/g, 'const ')
  // char arr[N] → let arr   (drop the [N] size)
  r = r.replace(/(let\s+\w+)\s*\[\s*\d*\s*\]/g, '$1')
  // String type → let
  r = r.replace(/\bString\s+/g, 'let ')
  return r
}

/**
 * Make Arduino API calls async — wrap delay(), delayMicroseconds() with await.
 * Cũng convert Serial.print → runtime.Serial.print.
 *
 * NOTE: this assumes the calls happen within an `async function` context.
 */
function makeApiCallsAsync(src: string): string {
  let r = src
  // Convert digitalWrite/digitalRead/analogWrite/etc → runtime.X
  for (const fn of ARDUINO_API_FNS) {
    const re = new RegExp(`\\b${fn}\\s*\\(`, 'g')
    if (ARDUINO_API_ASYNC.has(fn)) {
      r = r.replace(re, `await runtime.${fn}(`)
    } else {
      r = r.replace(re, `runtime.${fn}(`)
    }
  }
  // millis()/micros() khi không có await
  r = r.replace(/\bmillis\s*\(\s*\)/g, 'runtime.millis()')
  r = r.replace(/\bmicros\s*\(\s*\)/g, 'runtime.micros()')
  // tone/noTone
  r = r.replace(/\btone\s*\(/g, 'runtime.tone(')
  r = r.replace(/\bnoTone\s*\(/g, 'runtime.noTone(')
  // Serial.begin/print/println/write
  r = r.replace(/\bSerial\.(begin|print|println|write|available|read)\s*\(/g,
    'runtime.Serial.$1(')
  return r
}

/**
 * Common utility functions Arduino có sẵn:
 *   map, constrain, min, max, abs, random
 */
const UTIL_PREFIX = `
const map = (x, in_min, in_max, out_min, out_max) =>
  (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
const constrain = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const min = (a, b) => Math.min(a, b);
const max = (a, b) => Math.max(a, b);
const abs = (x) => Math.abs(x);
const random = (a, b) => {
  if (b === undefined) return Math.floor(Math.random() * a);
  return Math.floor(Math.random() * (b - a)) + a;
};
const randomSeed = (_s) => { /* no-op */ };
const sqrt = Math.sqrt; const pow = Math.pow; const sin = Math.sin;
const cos = Math.cos; const tan = Math.tan; const PI = Math.PI;
`

/**
 * Extract setup() và loop() từ source. Trả về body của 2 hàm và phần khác
 * (variable globals, user-defined functions).
 */
function extractMainFns(src: string): {
  globals: string
  setupBody: string
  loopBody: string
  ok: boolean
  error?: string
} {
  // Match `(void )?setup() { ... }` và `(void )?loop() { ... }`
  const setupMatch = matchBracedFn(src, 'setup')
  const loopMatch = matchBracedFn(src, 'loop')
  if (!setupMatch) return { globals: '', setupBody: '', loopBody: '', ok: false, error: 'Không tìm thấy hàm setup()' }
  if (!loopMatch)  return { globals: '', setupBody: '', loopBody: '', ok: false, error: 'Không tìm thấy hàm loop()' }
  // Cắt 2 hàm khỏi source → còn lại là globals + user functions
  let globals = src
  globals = globals.substring(0, Math.min(setupMatch.start, loopMatch.start)) +
            globals.substring(Math.max(setupMatch.start, loopMatch.start) + (setupMatch.start < loopMatch.start ? loopMatch.length : setupMatch.length)) +
            globals.substring(
              Math.max(setupMatch.end, loopMatch.end),
              Math.max(setupMatch.end, loopMatch.end)
            )
  // Simpler: just replace both with empty
  globals = src
    .substring(0, setupMatch.start) + ' '.repeat(setupMatch.length) + src.substring(setupMatch.end)
  globals = globals
    .substring(0, loopMatch.start) + ' '.repeat(loopMatch.length) + globals.substring(loopMatch.end)
  return {
    globals: globals.trim(),
    setupBody: setupMatch.body,
    loopBody: loopMatch.body,
    ok: true,
  }
}

interface FnMatch { start: number; end: number; length: number; body: string }
function matchBracedFn(src: string, name: string): FnMatch | null {
  // Pattern: (void\s+)?<name>\s*\(\s*\)\s*\{
  const re = new RegExp(`(void\\s+)?\\b${name}\\s*\\(\\s*\\)\\s*\\{`, 'g')
  const m = re.exec(src)
  if (!m) return null
  const start = m.index
  const braceOpen = m.index + m[0].length - 1
  // Find matching closing brace
  let depth = 1, i = braceOpen + 1
  while (i < src.length && depth > 0) {
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '"') {
      // Skip string
      i++
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\') i++
        i++
      }
    } else if (c === "'") {
      // Skip char literal
      i++
      while (i < src.length && src[i] !== "'") {
        if (src[i] === '\\') i++
        i++
      }
    }
    i++
  }
  if (depth !== 0) return null
  const end = i
  const body = src.substring(braceOpen + 1, end - 1)
  return { start, end, length: end - start, body }
}

/**
 * Convert user-defined functions trong globals.
 *   void blink(int n) { ... }  →  async function blink(n) { ... }
 *   int sum(int a, int b)      →  async function sum(a, b)
 *
 * Cách đơn giản: regex match `(returnType)?\s+name\s*\((args)\)\s*\{`
 * → thay bằng `async function name(args) {`. Args cũng strip type prefix.
 */
function convertUserFunctions(src: string): { code: string; names: string[] } {
  const names: string[] = []
  const code = src.replace(
    /\b(void|int|long|byte|bool|boolean|float|double|char|String)\s+(\w+)\s*\(([^)]*)\)\s*\{/g,
    (_m, _ty, name, args) => {
      names.push(name)
      const cleanArgs = args
        .split(',')
        .map((a: string) => a.trim())
        .filter(Boolean)
        .map((a: string) => {
          // Strip type from param: "int x" → "x"; "const char* s" → "s"
          const parts = a.split(/\s+/)
          return parts[parts.length - 1].replace(/^\*+/, '')
        })
        .join(', ')
      return `async function ${name}(${cleanArgs}) {`
    }
  )
  return { code, names }
}

/**
 * Add `await` calls to user-defined functions.
 * Sau khi convert, mọi user fn cần await prefix.
 */
function addAwaitToUserFns(src: string, names: string[]): string {
  let r = src
  for (const n of names) {
    // Match `n(...)` không phải trong context `async function n(`
    // Đơn giản: chỉ thay `n(` thành `await n(` ở chỗ KHÔNG có "function " trước
    const re = new RegExp(`(?<!function\\s)(?<!await\\s)\\b${n}\\s*\\(`, 'g')
    r = r.replace(re, `await ${n}(`)
  }
  return r
}

/**
 * Convert return type ép cho consistency:
 *   return X;  → return X;  (giữ nguyên — JS xử lý OK)
 */

export function transpileArduino(source: string): TranspileResult | TranspileError {
  try {
    let src = source
    src = stripComments(src)
    src = stripPreprocessor(src)
    src = substituteConstants(src)
    src = replaceTypes(src)
    // Now extract setup() and loop()
    const ex = extractMainFns(src)
    if (!ex.ok) return { ok: false, error: ex.error || 'Parse error' }
    // Globals: convert user functions
    const { code: globalsConverted, names: userFns } = convertUserFunctions(ex.globals)
    // API calls async — for all 3 chunks
    const globalsApi = makeApiCallsAsync(globalsConverted)
    const setupApi   = makeApiCallsAsync(ex.setupBody)
    const loopApi    = makeApiCallsAsync(ex.loopBody)
    // Add await to user fn calls in setup/loop
    const setupFinal = addAwaitToUserFns(setupApi, userFns)
    const loopFinal  = addAwaitToUserFns(loopApi, userFns)
    const globalsFinal = addAwaitToUserFns(globalsApi, userFns)

    // Build final JS
    const jsCode = `${UTIL_PREFIX}
${globalsFinal}

// ── setup() ──
async function __setup() {
${setupFinal}
}

// ── loop() ──
async function __loop() {
${loopFinal}
}

await __setup();
while (!signal.stopped) {
  try {
    await __loop();
  } catch (e) {
    if (e && e.message === '__STOPPED__') return;
    throw e;
  }
}
`
    return { ok: true, jsCode, userFns }
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown transpile error' }
  }
}

/**
 * Build và execute sketch trong sandboxed async function.
 * Trả về Promise — resolve khi signal.stopped hoặc reject với error.
 */
export async function executeSketch(
  jsCode: string,
  runtime: any,
  signal: { stopped: boolean }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  try {
    const fn = new AsyncFunction('runtime', 'signal', jsCode)
    await fn(runtime, signal)
  } catch (e: any) {
    if (e?.message === '__STOPPED__') return
    throw e
  }
}
