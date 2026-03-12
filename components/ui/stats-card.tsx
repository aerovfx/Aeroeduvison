"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ title, value, description, icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && <div className="p-2 bg-blue-100 rounded-lg">{icon}</div>}
        </div>
        <div className="text-3xl font-bold mb-1">{value}</div>
        {description && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{description}</span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
