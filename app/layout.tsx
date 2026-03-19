import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthSessionProvider } from '@/components/providers/session-provider'
import { ToastProvider } from '@/components/providers/toaster-provider'
import { ConfettiProvider } from '@/components/providers/confetti-provider'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AeroEdu - Interactive Learning Platform',
  description: 'An innovative learning platform with virtual labs and AI-powered content generation',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=t||(d?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');})();`,
          }}
        />
      </head>
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
