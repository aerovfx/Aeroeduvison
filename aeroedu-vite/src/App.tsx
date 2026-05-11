/**
 * App.tsx — entry point chính của Vite app
 * Thay thế app/layout.tsx (Next.js root layout)
 */
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AppRouter } from '@/router'
import { ColdStartIndicator } from '@/components/common/ColdStartIndicator'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ColdStartIndicator />
          <AppRouter />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
