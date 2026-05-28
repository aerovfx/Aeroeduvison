/**
 * NativeBridge — khởi tạo Capacitor native bridge khi app chạy trong iOS/Android shell.
 *
 * Render null (không UI). Phải nằm TRONG <BrowserRouter> (dùng useNavigate)
 * và TRONG <ThemeProvider> (dùng useTheme cho status bar style).
 *
 * No-op hoàn toàn trên web browser thường (isNative() === false).
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuthContext } from '@/contexts/AuthContext'
import { initNative, setStatusBarStyle, isNative } from '@/lib/capacitor/native'
import { setupPush } from '@/lib/capacitor/push'

export function NativeBridge() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { isAuthenticated } = useAuthContext()

  // Init once on mount
  useEffect(() => {
    if (!isNative()) return
    initNative((path) => navigate(path), isDark)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update status bar khi đổi theme runtime
  useEffect(() => {
    if (!isNative()) return
    setStatusBarStyle(isDark)
  }, [isDark])

  // Push notifications — setup SAU khi login (cần userId gắn token)
  useEffect(() => {
    if (!isNative() || !isAuthenticated) return
    setupPush((path) => navigate(path))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  return null
}
