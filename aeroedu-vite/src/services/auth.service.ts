/**
 * Auth Service — JWT-based auth với Rust auth-service
 *
 * Vite proxy: /api/* → aero-backend:8090 → auth-service:8092
 *
 * Endpoints (Rust auth-service):
 *   POST /api/auth/login          → { user, tokens: { accessToken, refreshToken? } }
 *   POST /api/auth/google         → { user, tokens: { accessToken } }  ← Google OAuth
 *   POST /api/auth/register       → { user, tokens: { accessToken } }
 *   GET  /api/auth/me             → User (Bearer token)
 *   POST /api/auth/logout         → 200
 *   POST /api/auth/refresh        → { accessToken }
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *   POST /api/auth/change-password
 */
import api, { tokenStore } from './api'
import type { User } from '@/types'

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  role?: 'STUDENT' | 'TEACHER'
  /** UI-only sub-type: STUDENT / TEACHER / PARENT. PARENT lưu vào UserProfile
   *  trên server để bền qua các thiết bị (không chỉ localStorage). */
  accountType?: 'STUDENT' | 'TEACHER' | 'PARENT'
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  password: string
}

interface AuthResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken?: string
  }
}

export const authService = {
  /**
   * Google OAuth — nhận credential (ID token) từ Google GSI
   * và trao đổi lấy JWT của app
   */
  googleLogin: async (credential: string): Promise<{ user: User }> => {
    const { data } = await api.post<AuthResponse>('/auth/google', { credential })
    tokenStore.setAccessToken(data.tokens.accessToken)
    return { user: data.user }
  },

  login: async (input: LoginInput): Promise<{ user: User }> => {
    const { data } = await api.post<AuthResponse>('/auth/login', input)
    tokenStore.setAccessToken(data.tokens.accessToken)
    return { user: data.user }
  },

  register: async (input: RegisterInput): Promise<{ user: User }> => {
    const { data } = await api.post<AuthResponse>('/auth/register', input)
    tokenStore.setAccessToken(data.tokens.accessToken)
    return { user: data.user }
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },

  // Dùng expired token (còn trong sessionStorage) để lấy access token mới
  // Gọi khi F5 và getMe() thất bại (token hết hạn)
  refresh: async (): Promise<void> => {
    // Bypass interceptor (dùng axios trực tiếp) để tránh vòng lặp 401 vô tận
    const axios = (await import('axios')).default
    const expiredToken = tokenStore.getAccessToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (expiredToken) {
      // Gửi expired token — Rust backend validate_token_ignore_expiry sẽ chấp nhận
      headers['Authorization'] = `Bearer ${expiredToken}`
    }
    const { data } = await axios.post(
      '/api/auth/refresh',
      {},
      { withCredentials: true, headers }
    )
    const newToken: string = data.accessToken || data.access_token || data.token
    if (!newToken) throw new Error('No access token in refresh response')
    tokenStore.setAccessToken(newToken)
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout').catch(() => {})
    tokenStore.clear()
  },

  forgotPassword: async (input: ForgotPasswordInput): Promise<void> => {
    await api.post('/auth/forgot-password', input)
  },

  resetPassword: async (input: ResetPasswordInput): Promise<void> => {
    await api.post('/auth/reset-password', input)
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },
}
