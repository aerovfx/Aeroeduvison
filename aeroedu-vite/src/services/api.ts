/**
 * Axios instance chung cho toàn bộ app
 * Thay thế fetch() trong Next.js Server Components
 * Tự động attach JWT, refresh token khi hết hạn
 */
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { coldStart } from '@/lib/coldStart'

// Luôn dùng /api để đi qua Vite proxy → tránh CORS
// VITE_API_URL chỉ dùng trong vite.config.ts làm proxy target
const BASE_URL = '/api'

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
