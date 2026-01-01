"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

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
      <p className="font-medium">On This Page</p>
      <Tree toc={toc} activeItem={activeHeading} />
    </div>
  )
}

interface TreeProps {
  toc: TocItem[]
  level?: number
  activeItem?: string
}

function Tree({ toc, level = 0, activeItem }: TreeProps) {
  return (
    <ul className={cn("m-0 list-none", { "pl-4": level !== 0 })}>
      {toc.map((item, index) => (
        <li key={index} className={cn("mt-0 pt-2")}>
          <a
            href={item.url}
            className={cn(
              "inline-block no-underline transition-colors hover:text-foreground",
              item.url === `#${activeItem}`
                ? "text-foreground"
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
            <Tree toc={item.items} level={level + 1} activeItem={activeItem} />
          )}
        </li>
      ))}
    </ul>
  )
}
