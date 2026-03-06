"use client"

import { PanelLeft, PanelRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/docs-layout-wrapper"

export function DocsSidebarToggles() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    setLeftSidebarOpen,
    setRightSidebarOpen,
  } = useSidebar()

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 md:bottom-8 md:right-8">
      <Button
        variant="outline"
        size="icon"
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className={cn(
          "h-10 w-10 rounded-full shadow-lg transition-all hover:scale-110",
          leftSidebarOpen && "bg-primary text-primary-foreground"
        )}
        title={leftSidebarOpen ? "Ẩn sidebar trái" : "Hiện sidebar trái"}
        aria-label={leftSidebarOpen ? "Ẩn sidebar trái" : "Hiện sidebar trái"}
      >
        {leftSidebarOpen ? (
          <PanelLeft className="h-5 w-5" />
        ) : (
          <X className="h-5 w-5" />
        )}
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className={cn(
          "h-10 w-10 rounded-full shadow-lg transition-all hover:scale-110",
          rightSidebarOpen && "bg-primary text-primary-foreground"
        )}
        title={rightSidebarOpen ? "Ẩn sidebar phải" : "Hiện sidebar phải"}
        aria-label={rightSidebarOpen ? "Ẩn sidebar phải" : "Hiện sidebar phải"}
      >
        {rightSidebarOpen ? (
          <PanelRight className="h-5 w-5" />
        ) : (
          <X className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
}
