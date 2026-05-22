/**
 * coldStart — Shared state để detect Cloud Run cold start
 *
 * Khi:
 *   - axios request latency > THRESHOLD_MS (3s) HOẶC
 *   - /auth/refresh trả 5xx
 *   → cho rằng đang cold start.
 *
 * Component <ColdStartIndicator /> subscribe state → hiển thị banner
 * "Đang khởi động dịch vụ…" với spinner + ETA cho user thấy thay vì
 * spam 401 console errors.
 *
 * Tự động clear khi 1 request thành công + latency < THRESHOLD_MS.
 */

type Listener = (active: boolean) => void

const THRESHOLD_MS = 3000
let active = false
let listeners: Listener[] = []
let clearTimer: ReturnType<typeof setTimeout> | null = null

function emit() {
  for (const l of listeners) l(active)
}

export const coldStart = {
  /** Đăng ký listener (component sẽ re-render khi state đổi). */
  subscribe(fn: Listener) {
    listeners.push(fn)
    fn(active)
    return () => { listeners = listeners.filter(l => l !== fn) }
  },
  /** Mark cold start active (called bởi axios interceptor). */
  markActive() {
    if (active) return
    active = true
    if (clearTimer) clearTimeout(clearTimer)
    emit()
  },
  /** Mark recovered — show success briefly then hide. */
  markRecovered() {
    if (!active) return
    if (clearTimer) clearTimeout(clearTimer)
    // Delay 1.5s để user thấy "Đã sẵn sàng" trước khi banner biến mất
    clearTimer = setTimeout(() => {
      active = false
      emit()
    }, 1500)
  },
  isActive() { return active },
  THRESHOLD_MS,
}
