"use client"

import { useState, useEffect, createContext, useContext } from "react"
import { PanelLeft, PanelRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarContextType {
  leftSidebarOpen: boolean
  rightSidebarOpen: boolean
  setLeftSidebarOpen: (open: boolean) => void
  setRightSidebarOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  setLeftSidebarOpen: () => {},
  setRightSidebarOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

interface DocsLayoutWrapperProps {
  children: React.ReactNode
  leftSidebar: React.ReactNode
  rightSidebar?: React.ReactNode
}

export function DocsLayoutWrapper({
  children,
  leftSidebar,
  rightSidebar,
}: DocsLayoutWrapperProps) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedLeft = localStorage.getItem("docs-left-sidebar-open")
    const savedRight = localStorage.getItem("docs-right-sidebar-open")
    
    if (savedLeft !== null) {
      setLeftSidebarOpen(savedLeft === "true")
    }
    if (savedRight !== null) {
      setRightSidebarOpen(savedRight === "true")
    }
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        leftSidebarOpen,
        rightSidebarOpen,
        setLeftSidebarOpen,
        setRightSidebarOpen,
      }}
    >
      <div className="flex min-h-screen flex-col bg-background">
        <div className="container flex-1 items-start">
          <div className="flex w-full gap-6">
            {/* Left Sidebar */}
            <aside
              className={cn(
                "fixed top-14 z-30 -ml-2 h-[calc(100vh-3.5rem)]",
                "shrink-0 overflow-y-auto border-r",
                "bg-background/95 backdrop-blur",
                "supports-[backdrop-filter]:bg-background/60",
                "transition-all duration-300 ease-in-out",
                "md:sticky md:top-14",
                leftSidebarOpen
                  ? "w-[220px] translate-x-0 opacity-100"
                  : "w-0 -translate-x-full opacity-0 md:translate-x-0 md:border-0 md:overflow-hidden"
              )}
            >
              <div className="h-full px-3 py-6 pr-6 lg:px-4 lg:py-8">
                {leftSidebar}
              </div>
            </aside>

            {/* Left Sidebar Toggle Button (when closed) */}
            {!leftSidebarOpen && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLeftSidebarOpen(true)}
                className={cn(
                  "fixed left-0 top-1/2 z-40 -translate-y-1/2",
                  "h-10 w-6 rounded-r-full rounded-l-none",
                  "shadow-lg transition-all hover:scale-110",
                  "md:left-0"
                )}
                title="Hiện sidebar trái"
                aria-label="Hiện sidebar trái"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Main Content */}
            <main
              className={cn(
                "relative w-full py-6 lg:py-8",
                "transition-all duration-300 ease-in-out",
                "mx-auto",
                leftSidebarOpen && rightSidebarOpen
                  ? "max-w-3xl"
                  : leftSidebarOpen || rightSidebarOpen
                  ? "max-w-4xl"
                  : "max-w-5xl"
              )}
            >
              {children}
            </main>
          </div>
        </div>

        {/* Toggle Buttons - Now inside sidebars */}
      </div>
    </SidebarContext.Provider>
  )
}
