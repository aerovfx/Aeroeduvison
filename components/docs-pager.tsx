"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface DocsPagerProps {
  doc: {
    title: string
    slug: string
    slugAsParams: string
  }
}

export function DocsPager({ doc }: DocsPagerProps) {
  // This is a simplified version. In a real implementation,
  // you would calculate the previous and next documents
  // based on the navigation structure

  return (
    <div className="flex flex-row items-center justify-between">
      <div className="flex flex-row items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Docs
          </Link>
        </Button>
      </div>

      <div className="flex flex-row items-center space-x-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/docs/getting-started/introduction">
            Next: Introduction
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
