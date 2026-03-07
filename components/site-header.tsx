"use client"

import Link from "next/link"
import { Brain, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DocsSidebarNav } from "@/components/docs-sidebar-nav"
import { docsConfig } from "@/docs/config"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Brain className="h-6 w-6" />
            <span className="font-bold text-xl bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-clip-text text-transparent">
              AeroEdu
            </span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search will be added here */}
          </div>
          <nav className="flex items-center space-x-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="ghost" size="sm">
                Docs
              </Button>
            </Link>
          </nav>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 w-[300px] sm:w-[400px]">
            <div className="px-6">
              <Link href="/" className="flex items-center space-x-2">
                <Brain className="h-6 w-6" />
                <span className="font-bold text-xl">AeroEdu</span>
              </Link>
            </div>
            <div className="mt-6">
              <DocsSidebarNav items={docsConfig.sidebarNav} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
