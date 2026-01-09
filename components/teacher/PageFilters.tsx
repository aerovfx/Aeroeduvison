import { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onSearchSubmit?: (e: React.FormEvent) => void
  placeholder?: string
  filters?: ReactNode
  className?: string
}

export function PageFilters({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  placeholder = "Tìm kiếm...",
  filters,
  className
}: PageFiltersProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchSubmit?.(e)
  }

  return (
    <div className={cn("flex flex-col sm:flex-row gap-4 mb-6", className)}>
      <form onSubmit={handleSubmit} className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
      {filters && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters}
        </div>
      )}
    </div>
  )
}
