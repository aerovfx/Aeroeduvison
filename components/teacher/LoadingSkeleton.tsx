import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

export function TableLoadingSkeleton({ rows = 5, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
          <div className="h-8 w-20 bg-muted rounded flex-shrink-0" />
          <div className="h-8 w-24 bg-muted rounded flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function CardLoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 border rounded-lg animate-pulse space-y-4", className)}>
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="h-8 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-3/4" />
    </div>
  )
}
