"use client"

import { SessionProvider } from "next-auth/react"

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider 
      basePath="/api/auth"
      refetchInterval={5}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}
