/**
 * Two-Factor Authentication (2FA / TOTP) — frontend service
 *
 * Backend (server.cjs):
 *   POST /api/auth/2fa/setup          → Bearer JWT: tạo secret + otpauth URL
 *   POST /api/auth/2fa/enable         → Bearer JWT: confirm 6-digit code → enable
 *   POST /api/auth/2fa/disable        → Bearer JWT: tắt 2FA (password required)
 *   POST /api/auth/2fa/verify-login   → Public: tempToken + code → access token
 *   GET  /api/auth/2fa/status         → Bearer JWT: trạng thái
 */
import api, { tokenStore } from './api'
import type { User } from '@/types'

export interface TwoFactorSetupResponse {
  secret: string
  otpauthUrl: string
  qrCodeData: string // = otpauthUrl, rendered as QR
}

export interface TwoFactorEnableResponse {
  ok: true
  backupCodes: string[]
}

export interface TwoFactorStatus {
  enabled: boolean
  enabledAt: string | null
  backupCodesRemaining: number
}

export interface TwoFactorVerifyLoginResponse {
  user: User
  tokens: { accessToken: string; refreshToken?: string }
}

export const twoFactorService = {
  setup: async (): Promise<TwoFactorSetupResponse> => {
    const { data } = await api.post<TwoFactorSetupResponse>('/auth/2fa/setup')
    return data
  },

  enable: async (code: string): Promise<TwoFactorEnableResponse> => {
    const { data } = await api.post<TwoFactorEnableResponse>('/auth/2fa/enable', { code })
    return data
  },

  disable: async (password: string, code?: string): Promise<{ ok: true }> => {
    const { data } = await api.post<{ ok: true }>('/auth/2fa/disable', { password, code })
    return data
  },

  status: async (): Promise<TwoFactorStatus> => {
    const { data } = await api.get<TwoFactorStatus>('/auth/2fa/status')
    return data
  },

  /**
   * Hoàn tất login khi server trả require2FA. Trả về user và auto-store
   * access token vào tokenStore (giống authService.login).
   */
  verifyLogin: async (tempToken: string, code: string): Promise<{ user: User }> => {
    const { data } = await api.post<TwoFactorVerifyLoginResponse>('/auth/2fa/verify-login', {
      tempToken,
      code,
    })
    tokenStore.setAccessToken(data.tokens.accessToken)
    return { user: data.user }
  },
}
