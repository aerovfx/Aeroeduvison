"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { docsConfig } from "@/docs/config"

interface DocsPagerProps {
  doc: {
    title: string
    slug: string
    slugAsParams: string
  }
}

// Helper function to find previous and next docs in navigation
function findAdjacentDocs(currentPath: string) {
  let prevDoc: { title: string; href: string } | null = null
  let nextDoc: { title: string; href: string } | null = null

  // Flatten all docs from sidebar nav
  const allDocs: Array<{ title: string; href: string }> = []
  docsConfig.sidebarNav.forEach((section) => {
    section.items.forEach((item) => {
      if (item.href) {
        allDocs.push({ title: item.title, href: item.href })
      }
    })
  })

  // Find current index
  const currentIndex = allDocs.findIndex((doc) => doc.href === currentPath)

  if (currentIndex > 0) {
    prevDoc = allDocs[currentIndex - 1]
  }

  if (currentIndex < allDocs.length - 1 && currentIndex >= 0) {
    nextDoc = allDocs[currentIndex + 1]
  }

  // If not found in nav, provide defaults
  if (currentIndex === -1) {
    // Default: back to docs home
    prevDoc = { title: "Documentation", href: "/docs" }
    
    // Try to find next in beginner section
    const beginnerIndex = allDocs.findIndex((doc) => doc.href === "/docs/beginner/index")
    if (beginnerIndex >= 0 && beginnerIndex < allDocs.length - 1) {
      nextDoc = allDocs[beginnerIndex + 1]
    }
  }

  return { prevDoc, nextDoc }
}

export function DocsPager({ doc }: DocsPagerProps) {
  const pathname = usePathname()
  const { prevDoc, nextDoc } = findAdjacentDocs(pathname || doc.slug)

  return (
    <div className="flex flex-row items-center justify-between border-t pt-6">
      <div className="flex flex-row items-center space-x-2">
        {prevDoc ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={prevDoc.href}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {prevDoc.title}
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Docs
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-row items-center space-x-2">
        {nextDoc ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={nextDoc.href}>
              {nextDoc.title}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div className="text-sm text-muted-foreground">End of section</div>
        )}
      </div>
    </div>
  )
}
