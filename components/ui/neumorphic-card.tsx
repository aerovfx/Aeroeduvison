"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface NeumorphicCardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'primary' | 'success' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  hover?: boolean
  onClick?: () => void
}

export function NeumorphicCard({
  children,
  className,
  variant = 'default',
  size = 'md',
  hover = true,
  onClick,
}: NeumorphicCardProps) {
  const baseStyles = "rounded-2xl transition-all duration-300"
  
  const variantStyles = {
    default: "neu-card",
    primary: "neu-card neu-shadow-primary",
    success: "neu-card neu-shadow-success",
    gradient: "bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.3)]",
  }
  
  const sizeStyles = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  }
  
  const hoverStyles = hover ? "hover:shadow-xl hover:-translate-y-1" : ""
  
  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        hoverStyles,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
