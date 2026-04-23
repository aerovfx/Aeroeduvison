/**
 * AuthContext — thay thế NextAuth SessionProvider
 *
 * Thay vì useSession() từ next-auth/react, dùng useAuth() từ hook này.
 * JWT access token lưu in-memory, refresh token là httpOnly cookie.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '@/services/auth.service'
import { tokenStore } from '@/services/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Hydrate user từ Rust auth-service khi refresh trang
  // Tương đương getServerSession() trong Next.js layout.tsx
  useEffect(() => {
    async function restoreSession() {
      // ── Guard: nếu không có token lưu → chưa đăng nhập, bỏ qua API call ──
      // Không gọi /api/auth/me khi chắc chắn không có session.
      // Tránh console spam 500 khi backend chưa chạy hoặc user chưa login.
      if (!tokenStore.getAccessToken()) {
        setIsLoading(false)
        return
      }

      try {
        // Thử getMe() trực tiếp (token còn trong sessionStorage hoặc memory)
        const me = await authService.getMe()
        setUser(me)
      } catch {
        // Token hết hạn → thử refresh bằng Bearer expired-token
        try {
          await authService.refresh()
          const me = await authService.getMe()
          setUser(me)
        } catch {
          // Refresh cũng thất bại → chưa đăng nhập / token invalid
          tokenStore.clear()
          setUser(null)
        }
      } finally {
        setIsLoading(false)
      }
    }
    restoreSession()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authService.login({ email, password })
    setUser(user)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user } = await authService.register({ name, email, password })
    setUser(user)
  }, [])

  // Google OAuth — nhận ID token từ GSI, đổi lấy JWT của app, set user state
  // Cần đi qua đây (thay vì gọi authService trực tiếp) để setUser() chạy,
  // nếu không isAuthenticated=false khi navigate('/dashboard') → ProtectedRoute
  // kick về /auth/login lần đầu (chỉ lần 2 mới vào được vì restoreSession chạy
  // trên token đã lưu trong sessionStorage).
  const googleLogin = useCallback(async (credential: string) => {
    const { user } = await authService.googleLogin(credential)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext phải được dùng trong AuthProvider')
  return ctx
}
