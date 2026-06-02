/**
 * App.tsx — entry point chính của Vite app
 * Thay thế app/layout.tsx (Next.js root layout)
 */
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRouter } from '@/router'
import { ColdStartIndicator } from '@/components/common/ColdStartIndicator'
import { NativeBridge } from '@/components/common/NativeBridge'
import { OfflineIndicator } from '@/components/common/OfflineIndicator'
import ArkAssistant from '@/components/ai/ArkAssistant'
import Mascot from '@/components/mascot/Mascot'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          {/* 📱 Capacitor native bridge (splash/status-bar/deep-link/back/haptics)
              — no-op trên web browser thường */}
          <NativeBridge />
          <OfflineIndicator />
          <ColdStartIndicator />
          <AppRouter />
          {/* 🤖 ByteDance Ark Bot — floating chat all pages
              Bot-aware role: HS/GV/Admin → tailored system prompt */}
          <ArkAssistant />
          {/* 🛸 Mascot Aero — gương mặt trợ lý + animation tương tác học tập */}
          <Mascot />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
