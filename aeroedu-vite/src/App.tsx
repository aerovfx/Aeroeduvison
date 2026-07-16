/**
 * App.tsx — entry point chính của Vite app
 * Thay thế app/layout.tsx (Next.js root layout)
 */
import { useLocation } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRouter } from '@/router'
import { ColdStartIndicator } from '@/components/common/ColdStartIndicator'
import { NativeBridge } from '@/components/common/NativeBridge'
import { OfflineIndicator } from '@/components/common/OfflineIndicator'
import ArkAssistant from '@/components/ai/ArkAssistant'
import Mascot from '@/components/mascot/Mascot'
import { isDesktopRoute } from '@/lib/desktop'

export default function App() {
  // Bộ UI desktop standalone tự vẽ chrome/mascot riêng → tắt các lớp phủ
  // web (mascot, trợ lý nổi, offline/cold-start) để giao diện native gọn gàng.
  const { pathname } = useLocation()
  const desktopShell = isDesktopRoute(pathname)

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          {/* 📱 Capacitor native bridge (splash/status-bar/deep-link/back/haptics)
              — no-op trên web browser thường */}
          <NativeBridge />
          {!desktopShell && <OfflineIndicator />}
          {!desktopShell && <ColdStartIndicator />}
          <AppRouter />
          {/* 🤖 ByteDance Ark Bot — floating chat all pages
              Bot-aware role: HS/GV/Admin → tailored system prompt */}
          {!desktopShell && <ArkAssistant />}
          {/* 🛸 Mascot Aero — gương mặt trợ lý + animation tương tác học tập */}
          {!desktopShell && <Mascot />}
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
