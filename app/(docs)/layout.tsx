import { docsConfig } from "@/docs/config"
import { DocsSidebarNav } from "@/components/docs-sidebar-nav"
import { SiteHeader } from "@/components/site-header"

interface DocsLayoutProps {
    children: React.ReactNode
}

export default function DocsLayout({ children }: DocsLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <div className="container flex-1 items-start md:grid md:grid-cols-[280px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
                <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:sticky md:block">
                    <div className="h-full px-3 py-6 pr-6 lg:px-4 lg:py-8">
                        <DocsSidebarNav items={docsConfig.sidebarNav} />
                    </div>
                </aside>
                <main className="relative max-w-4xl py-6 lg:gap-10 lg:py-8 xl:gap-6">
                    <div className="mx-auto w-full min-w-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
