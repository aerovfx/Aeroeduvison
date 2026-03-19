"use client"

import { useState, useEffect } from "react"
import { SidebarRoutes } from "./sidebar-routes"
import { SidebarSearch } from "./sidebar-search"
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface SidebarProps {
  isOpen: boolean
  setSidebarOpen?: (isOpen: boolean) => void
}

const SIDEBAR_EXPANDED_WIDTH = 260
const SIDEBAR_COLLAPSED_WIDTH = 64

export const Sidebar = ({ isOpen, setSidebarOpen }: SidebarProps) => {
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleToggle = () => {
    setCollapsed(prev => !prev)
  }

  if (!mounted) {
    return (
      <aside
        className="h-full flex flex-col border-r border-gray-200 transition-all duration-300"
        style={{ width: `${SIDEBAR_EXPANDED_WIDTH}px` }}
      >
        <div className="p-4">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </aside>
    )
  }

  if (!isOpen) {
    return null
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH

  return (
    <aside
      className="h-full flex flex-col border-r border-gray-200 dark:border-white/[0.06] transition-all duration-300 overflow-hidden relative"
      style={{
        width: `${sidebarWidth}px`,
        minWidth: `${sidebarWidth}px`,
      }}
    >
      {/* Search Bar */}
      <SidebarSearch collapsed={collapsed} />

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar overflow-x-hidden">
        <SidebarRoutes collapsed={collapsed} />
      </nav>

      {/* AI Status footer - only when expanded */}
      {!collapsed && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-white/[0.06]">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-white/[0.02] dark:to-white/[0.01] border border-purple-100 dark:border-white/[0.06]">
            <div className="relative flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-[hsl(245,85%,65%)]" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">AI Assistant</span>
              <span className="text-[9px] text-gray-500 dark:text-gray-400">Always ready to help</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls: Theme toggle + Collapse button */}
      <div
        className={`flex items-center py-3 border-t border-gray-200 dark:border-white/[0.06] ${collapsed ? 'justify-center px-2' : 'justify-between px-3'}`}
      >
        {!collapsed && (
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        )}
        <button
          onClick={handleToggle}
          title={collapsed ? "Mở rộng sidebar" : "Thu nhỏ sidebar"}
          className={`flex items-center justify-center w-8 h-8 rounded-lg
            bg-gray-100 dark:bg-white/[0.04] hover:bg-gray-200 dark:hover:bg-white/[0.08]
            border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12]
            text-gray-600 dark:text-[hsl(215,15%,50%)] hover:text-gray-900 dark:hover:text-[hsl(210,20%,80%)]
            transition-all duration-200 group ${collapsed ? 'w-full' : ''}`}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            : <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          }
        </button>
      </div>
    </aside>
  )
}
