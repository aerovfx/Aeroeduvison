"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("border-b border-white/[0.06] bg-white/[0.02] backdrop-blur-xl px-6 py-4", className)}>
      <div className="container mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90">{title}</h1>
          {description && <p className="text-sm text-white/40 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-4">{actions}</div>}
      </div>
    </div>
  )
}
