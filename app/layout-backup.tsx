import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { ToastProvider } from '@/components/providers/toaster-provider'
import { ConfettiProvider } from '@/components/providers/confetti-provider'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { XPProvider } from '@/contexts/XPContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aeroschool - Learning Management System',
  description: 'A comprehensive learning management system for mathematics education',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthSessionProvider>
          <ThemeProvider>
            <LanguageProvider>
              <XPProvider>
                <ConfettiProvider />
                <ToastProvider />
                {children}
              </XPProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
