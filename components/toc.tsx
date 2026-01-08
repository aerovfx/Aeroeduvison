"use client"

import * as React from "react"
import { PanelRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/docs-layout-wrapper"

interface TocItem {
  title: string
  url: string
  depth: number
  items?: TocItem[]
}

interface TocProps {
  toc: TocItem[]
}

export function DashboardTableOfContents({ toc }: TocProps) {
  const [activeHeading, setActiveHeading] = React.useState<string>("")
  const { rightSidebarOpen, setRightSidebarOpen } = useSidebar()

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id)
          }
        })
      },
      { rootMargin: "-80px 0px -80% 0px" }
    )

    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6")
    headings.forEach((heading) => observer.observe(heading))

    return () => observer.disconnect()
  }, [])

  if (!toc || toc.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {/* Toggle Button */}
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <p className="font-medium">On This Page</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="h-8 w-8"
          title={rightSidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
          aria-label={rightSidebarOpen ? "Ẩn sidebar" : "Hiện sidebar"}
        >
          {rightSidebarOpen ? (
            <PanelRight className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
      <Tree toc={toc} activeItem={activeHeading} setActiveHeading={setActiveHeading} />
    </div>
  )
}

interface TreeProps {
  toc: TocItem[]
  level?: number
  activeItem?: string
  setActiveHeading?: (id: string) => void
}

function Tree({ toc, level = 0, activeItem, setActiveHeading }: TreeProps) {
  return (
    <ul className={cn("m-0 list-none", { "pl-4": level !== 0 })}>
      {toc.map((item, index) => (
        <li key={index} className={cn("mt-0 pt-2")}>
          <a
            href={item.url}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault()
              const targetId = item.url.replace("#", "")
              const element = document.getElementById(targetId)
              if (element) {
                // Calculate offset for fixed header
                const headerOffset = 80
                const elementPosition = element.getBoundingClientRect().top
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                window.scrollTo({
                  top: offsetPosition,
                  behavior: "smooth"
                })
                
                // Update URL hash without triggering scroll
                window.history.pushState(null, "", item.url)
                
                // Update active state
                setActiveHeading?.(targetId)
              }
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLAnchorElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                const targetId = item.url.replace("#", "")
                const element = document.getElementById(targetId)
                if (element) {
                  const headerOffset = 80
                  const elementPosition = element.getBoundingClientRect().top
                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                  })
                  
                  window.history.pushState(null, "", item.url)
                  setActiveHeading?.(targetId)
                }
              }
            }}
            className={cn(
              "inline-block no-underline transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
              item.url === `#${activeItem}`
                ? "text-foreground font-medium"
                : "text-muted-foreground",
              {
                "text-sm": item.depth >= 4,
                "text-base": item.depth === 2,
                "text-sm font-medium": item.depth === 3,
              }
            )}
          >
            {item.title}
          </a>
          {item.items && item.items.length > 0 && (
            <Tree toc={item.items} level={level + 1} activeItem={activeItem} setActiveHeading={setActiveHeading} />
          )}
        </li>
      ))}
    </ul>
  )
}
