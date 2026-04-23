/**
 * Silences verbose MediaPipe WASM and TensorFlow Lite console output.
 * Import this file once (side-effect import) before initialising MediaPipe.
 */
const _warn = console.warn.bind(console)
const _log  = console.log.bind(console)
const _error = console.error.bind(console)

const NOISE: RegExp[] = [
  /Created TensorFlow Lite XNNPACK delegate/,
  /Falling back to the CPU backend/,
  /XNNPACK delegate/i,
  /TfLiteWebModelRunner/,
  /MediaPipe Tasks/,
  /wasm streaming compile failed/i,
  /falling back to ArrayBuffer instantiation/i,
]

const isMuted = (args: unknown[]) =>
  typeof args[0] === 'string' && NOISE.some(r => r.test(args[0] as string))

console.warn  = (...a) => { if (!isMuted(a)) _warn(...a)  }
console.log   = (...a) => { if (!isMuted(a)) _log(...a)   }
console.error = (...a) => { if (!isMuted(a)) _error(...a) }
