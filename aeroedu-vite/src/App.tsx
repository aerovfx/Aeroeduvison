/**
 * App.tsx — entry point chính của Vite app
 * Thay thế app/layout.tsx (Next.js root layout)
 */
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRouter } from '@/router'
import { ColdStartIndicator } from '@/components/common/ColdStartIndicator'
import ArkAssistant from '@/components/ai/ArkAssistant'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ColdStartIndicator />
          <AppRouter />
          {/* 🤖 ByteDance Ark Bot — floating chat all pages
              Bot-aware role: HS/GV/Admin → tailored system prompt */}
          <ArkAssistant />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
