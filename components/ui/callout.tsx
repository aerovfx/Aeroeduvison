import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const variants = {
  default: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  destructive: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  success: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
  warning: "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
}

const icons = {
  default: Info,
  destructive: XCircle,
  success: CheckCircle,
  warning: AlertTriangle,
}

interface CalloutProps {
  children?: React.ReactNode
  type?: keyof typeof variants
  className?: string
}

export function Callout({ children, type = "default", className }: CalloutProps) {
  const Icon = icons[type]

  return (
    <div
      className={cn(
        "my-6 flex items-start gap-3 rounded-lg border p-4",
        variants[type],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}
