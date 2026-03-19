"use client"

import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef, ReactNode } from "react"

interface NeumorphicInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const NeumorphicInput = forwardRef<HTMLInputElement, NeumorphicInputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-semibold text-white/40 mb-2 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "neu-input w-full px-4 py-3 text-white/85 placeholder-white/25",
              "transition-all duration-300",
              "focus:shadow-[0_0_15px_rgba(120,100,255,0.1)] focus:ring-1 focus:ring-[hsl(245,85%,65%)]/30",
              icon && "pl-10",
              error && "border-red-500/50 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    )
  }
)

NeumorphicInput.displayName = "NeumorphicInput"
