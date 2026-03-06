import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { ToastProvider } from '@/components/providers/toaster-provider'
import { ConfettiProvider } from '@/components/providers/confetti-provider'
import { LanguageProvider } from '@/contexts/LanguageContext'

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
          <LanguageProvider>
            <ConfettiProvider />
            <ToastProvider />
            {children}
          </LanguageProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}




