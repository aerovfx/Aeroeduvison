"use client"

import { SessionProvider } from "next-auth/react"
import { XPProvider } from "@/contexts/XPContext"

export function CourseLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <XPProvider>
        {children}
      </XPProvider>
    </SessionProvider>
  )
}


