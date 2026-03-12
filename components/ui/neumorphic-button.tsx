"use client"

import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, ReactNode } from "react"

interface NeumorphicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function NeumorphicButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}: NeumorphicButtonProps) {
  const baseStyles = "neu-button font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variantStyles = {
    primary: "bg-gradient-to-br from-blue-500 to-blue-600 text-white neu-shadow-primary",
    secondary: "bg-gradient-to-br from-purple-500 to-purple-600 text-white neu-shadow",
    accent: "bg-gradient-to-br from-teal-500 to-teal-600 text-white neu-shadow",
    outline: "bg-white text-gray-700 border-2 border-gray-200 neu-shadow hover:border-blue-300",
  }
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm rounded-lg",
    md: "px-6 py-3 text-base rounded-xl",
    lg: "px-8 py-4 text-lg rounded-2xl",
  }
  
  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        loading && "opacity-70 cursor-wait",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  )
}
