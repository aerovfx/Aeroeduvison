/**
 * Axios instance chung cho toàn bộ app
 * Thay thế fetch() trong Next.js Server Components
 * Tự động attach JWT, refresh token khi hết hạn
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

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

// ── Request interceptor: attach access token nếu có ──────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Token được lưu trong memory (không dùng localStorage vì bảo mật)
    const token = tokenStore.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

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

      try {
        const { data } = await api.post('/auth/refresh', {}, { withCredentials: true })
        const newToken = data.accessToken
        tokenStore.setAccessToken(newToken)
        refreshSubscribers.forEach((cb) => cb(newToken))
        refreshSubscribers = []
        return api(originalRequest)
      } catch {
        // Refresh thất bại → clear token; redirect chỉ khi đang không ở trang auth
        tokenStore.clear()
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
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
