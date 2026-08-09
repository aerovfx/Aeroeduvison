/**
 * Axios instance chung cho toàn bộ app
 * Thay thế fetch() trong Next.js Server Components
 * Tự động attach JWT, refresh token khi hết hạn
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { coldStart } from '@/lib/coldStart'

// ── Base URL resolution ──
// Web (Vite dev + production same-origin): /api  → đi qua proxy / nginx → backend
// Capacitor native (iOS/Android): app chạy từ capacitor://localhost — phải gọi
//   tuyệt đối tới https://inphysic.com/api, KHÔNG có proxy.
// Tauri desktop (macOS/Win/Linux): app chạy từ tauri://localhost — cũng KHÔNG có
//   proxy, phải gọi tuyệt đối. Detect qua window.__TAURI_INTERNALS__ (v2) /
//   window.__TAURI__ (v1). CORS cho tauri origin đã thêm ở server.cjs.
// Detect Capacitor qua window.Capacitor (injected bởi WebView bridge).
function resolveBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const w = window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean }
      __TAURI_INTERNALS__?: unknown
      __TAURI__?: unknown
    }
    const isTauri = !!(w.__TAURI_INTERNALS__ || w.__TAURI__)
    // Override qua env nếu cần switch sang staging
    const native = (import.meta.env.VITE_API_URL_NATIVE as string | undefined)
      || 'http://127.0.0.1:43127/api'
    if (w.Capacitor?.isNativePlatform?.()) return native
    // Tauri: app đóng gói (PROD) chạy từ tauri://localhost → gọi tuyệt đối.
    //   Khi `tauri dev` (import.meta.env.PROD === false) frontend ở localhost:5173
    //   → dùng /api qua Vite proxy (beforeDevCommand trỏ proxy sang inphysic.com)
    //   để tránh CORS ở origin dev.
    if (isTauri && import.meta.env.PROD) return native
  }
  return '/api'
}
const BASE_URL = resolveBaseUrl()

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true, // gửi httpOnly cookie (JWT) tự động
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach access token + start timer ──
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStore.getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    // Track start time để detect cold-start latency
    ;(config as InternalAxiosRequestConfig & { __startTs?: number }).__startTs = Date.now()
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response success: detect latency cao = cold start dấu hiệu ──
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const cfg = response.config as InternalAxiosRequestConfig & { __startTs?: number }
    const took = cfg.__startTs ? Date.now() - cfg.__startTs : 0
    if (took > coldStart.THRESHOLD_MS) {
      coldStart.markActive()
      coldStart.markRecovered()  // succeeded → schedule clear
    } else if (coldStart.isActive()) {
      coldStart.markRecovered()
    }
    return response
  },
  (err) => Promise.reject(err),
)

// Helper: sleep N ms
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Response interceptor: auto-refresh khi 401 ───────────
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Chỉ auto-refresh khi nhận 401 (Unauthorized) — không retry khi 500/502/503
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Chờ refresh xong rồi retry
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      // Cold start tolerance: thử /refresh tối đa 3 lần với backoff 2s, 4s.
      // Nếu cuối cùng vẫn fail → clear token + redirect login.
      const REFRESH_ATTEMPTS = [0, 2000, 4000]
      let lastErr: unknown = null
      for (let i = 0; i < REFRESH_ATTEMPTS.length; i++) {
        if (REFRESH_ATTEMPTS[i] > 0) {
          coldStart.markActive()
          await sleep(REFRESH_ATTEMPTS[i])
        }
        try {
          const { data } = await api.post('/auth/refresh', {}, { withCredentials: true })
          const newToken = data.accessToken
          tokenStore.setAccessToken(newToken)
          refreshSubscribers.forEach((cb) => cb(newToken))
          refreshSubscribers = []
          coldStart.markRecovered()
          isRefreshing = false
          return api(originalRequest)
        } catch (refreshErr) {
          lastErr = refreshErr
          const status = (refreshErr as AxiosError)?.response?.status
          // Nếu 401 (token thực sự invalid) → đừng retry, bỏ luôn
          if (status === 401) break
          // Nếu 5xx hoặc network → cold start có thể, retry
        }
      }

      // Refresh chính thức fail sau retries
      void lastErr
      tokenStore.clear()
      isRefreshing = false
      coldStart.markRecovered()
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login'
      }
      return Promise.reject(error)
    }

    return Promise.reject(error)
  },
)

// ── Token store: memory (nhanh) + sessionStorage (sống qua F5) ──
// sessionStorage an toàn hơn localStorage: tự xóa khi đóng tab/browser,
// không chia sẻ giữa các tab, không tồn tại vĩnh viễn trên máy user.
const SESSION_KEY = '__aeroedu_at__'

export const tokenStore = {
  _token: null as string | null,

  getAccessToken(): string | null {
    // Ưu tiên memory; fallback sessionStorage khi vừa F5
    if (this._token) return this._token
    try {
      const stored = sessionStorage.getItem(SESSION_KEY)
      if (stored) {
        this._token = stored   // restore vào memory
        return stored
      }
    } catch { /* private-mode browsers may throw */ }
    return null
  },

  setAccessToken(token: string) {
    this._token = token
    try { sessionStorage.setItem(SESSION_KEY, token) } catch { /* ignore */ }
  },

  clear() {
    this._token = null
    try { sessionStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  },
}

export default api
