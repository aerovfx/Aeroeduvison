"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, ChevronDown, PanelLeft, X, type LucideIcon } from "lucide-react"
import { useState, useEffect } from "react"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/docs-layout-wrapper"

export interface NavItem {
  title: string
  href?: string
  disabled?: boolean
  external?: boolean
  icon?: LucideIcon
  label?: string
  description?: string
}

export interface NavItemWithChildren extends NavItem {
  items?: NavItem[]
}

export interface DocsSidebarNavProps {
  items: NavItemWithChildren[]
}

export function DocsSidebarNav({ items }: DocsSidebarNavProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Set<number>>(new Set())
  const { leftSidebarOpen, setLeftSidebarOpen } = useSidebar()

  // Auto-open sections with active children
  useEffect(() => {
    const sectionsToOpen = new Set<number>()
    items.forEach((item, index) => {
      const hasActiveChild = item.items?.some(
        (child) => child.href === pathname
      )
      if (hasActiveChild) {
        sectionsToOpen.add(index)
      }
    })
    if (sectionsToOpen.size > 0) {
      setOpenSections(sectionsToOpen)
    }
  }, [pathname, items])

  const toggleSection = (index: number) => {
    setOpenSections((prev) => {
      const newOpenSections = new Set(prev)
      if (newOpenSections.has(index)) {
        newOpenSections.delete(index)
      } else {
        newOpenSections.add(index)
      }
      return newOpenSections
    })
  }

  const handleToggleClick = (index: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    toggleSection(index)
  }

  const handleToggleKeyDown = (index: number) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      toggleSection(index)
    }
  }

  return (
    <ScrollArea className="h-full py-6 pl-8 pr-6 lg:py-8">
      {/* Toggle Button */}
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <span className="text-sm font-semibold text-muted-foreground">Navigation</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="h-8 w-8"
          title={leftSidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
          aria-label={leftSidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
        >
          {leftSidebarOpen ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="w-full space-y-1">
        {items.map((item, index) => {
          const isOpen = openSections.has(index)
          const hasActiveChild = item.items?.some(
            (child) => child.href === pathname
          )

          return (
            <div key={index} className="space-y-1">
              {item.items && item.items.length > 0 ? (
                <>
                  <button
                    id={`docs-section-button-${index}`}
                    onClick={handleToggleClick(index)}
                    onKeyDown={handleToggleKeyDown(index)}
                    aria-expanded={isOpen}
                    aria-controls={`docs-section-${index}`}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      hasActiveChild && "bg-accent/50"
                    )}
                  >
                    <span>{item.title}</span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div 
                      id={`docs-section-${index}`}
                      className="ml-2 space-y-1 border-l pl-3"
                      role="region"
                      aria-labelledby={`docs-section-button-${index}`}
                    >
                      <DocsSidebarNavItems items={item.items} pathname={pathname} />
                    </div>
                  )}
                </>
              ) : (
                <h4 className="mb-1 rounded-md px-3 py-2 text-sm font-semibold tracking-tight text-foreground">
                  {item.title}
                </h4>
              )}
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}

interface DocsSidebarNavItemsProps {
  items: NavItem[]
  pathname: string | null
}

export function DocsSidebarNavItems({
  items,
  pathname,
}: DocsSidebarNavItemsProps) {
  return items.length ? (
    <div className="space-y-1">
      {items.map((item, index) =>
        item.href ? (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "flex w-full items-center rounded-md px-3 py-1.5 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              item.disabled && "cursor-not-allowed opacity-60",
              pathname === item.href
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground"
            )}
            target={item.external ? "_blank" : ""}
            rel={item.external ? "noreferrer" : ""}
          >
            <span className="truncate">{item.title}</span>
            {item.label && (
              <span className="ml-auto rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs leading-none text-[#000000] no-underline">
                {item.label}
              </span>
            )}
          </Link>
        ) : (
          <span
            key={index}
            className={cn(
              "flex w-full cursor-not-allowed items-center rounded-md px-3 py-1.5 text-sm text-muted-foreground",
              item.disabled && "opacity-60"
            )}
          >
            {item.title}
            {item.label && (
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-xs leading-none text-muted-foreground">
                {item.label}
              </span>
            )}
          </span>
        )
      )}
    </div>
  ) : null
}
