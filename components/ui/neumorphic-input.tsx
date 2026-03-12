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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "neu-input w-full px-4 py-3 text-gray-700 placeholder-gray-400",
              "transition-all duration-300",
              "focus:shadow-lg focus:ring-2 focus:ring-blue-500/20",
              icon && "pl-10",
              error && "border-red-500 focus:ring-red-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

NeumorphicInput.displayName = "NeumorphicInput"
