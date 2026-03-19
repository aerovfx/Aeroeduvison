/**
 * Sidebar Search Component
 * Quick search for navigation items
 */

"use client"

import { useState } from "react"
import { Search, X } from "lucide-react"

interface SidebarSearchProps {
  collapsed: boolean
}

export function SidebarSearch({ collapsed }: SidebarSearchProps) {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)

  if (collapsed) {
    return (
      <div className="px-3 mb-3">
        <button className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/[0.08] transition-colors">
          <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div className="px-3 mb-3">
      <div className={`relative rounded-lg transition-all ${
        focused 
          ? 'bg-white dark:bg-white/[0.04] ring-2 ring-purple-500/20' 
          : 'bg-gray-100 dark:bg-white/[0.04]'
      }`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Tìm kiếm..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-9 pr-8 py-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/[0.08]"
          >
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  )
}
