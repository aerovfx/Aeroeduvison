"use client"

import { useSidebar } from "@/components/docs-layout-wrapper"
import { DashboardTableOfContents } from "@/components/toc"
import { useEffect } from "react"
import { PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DocsPageContentProps {
  children: React.ReactNode
  toc?: Array<{ title: string; url: string; depth: number }>
}

export function DocsPageContent({ children, toc }: DocsPageContentProps) {
  const { rightSidebarOpen, setRightSidebarOpen } = useSidebar()

  // Auto-show right sidebar if TOC exists
  useEffect(() => {
    if (toc && toc.length > 0 && !rightSidebarOpen) {
      // Optionally auto-show, or let user toggle manually
      // setRightSidebarOpen(true)
    }
  }, [toc, rightSidebarOpen, setRightSidebarOpen])

  return (
    <>
      <div className="w-full">
        {children}
      </div>
      {toc && toc.length > 0 && (
        <>
          <aside
            className={cn(
              "hidden xl:block fixed top-14 right-0 z-30",
              "w-[250px] h-[calc(100vh-3.5rem)]",
              "overflow-y-auto border-l bg-background/95 backdrop-blur",
              "supports-[backdrop-filter]:bg-background/60",
              "px-4 py-6",
              "transition-transform duration-300 ease-in-out",
              rightSidebarOpen
                ? "translate-x-0"
                : "translate-x-full"
            )}
          >
            <DashboardTableOfContents toc={toc} />
          </aside>

          {/* Right Sidebar Toggle Button (when closed) */}
          {!rightSidebarOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setRightSidebarOpen(true)}
              className={cn(
                "fixed right-0 top-1/2 z-40 -translate-y-1/2",
                "h-10 w-6 rounded-l-full rounded-r-none",
                "shadow-lg transition-all hover:scale-110",
                "hidden xl:flex"
              )}
              title="Hiện sidebar phải"
              aria-label="Hiện sidebar phải"
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </>
  )
}
