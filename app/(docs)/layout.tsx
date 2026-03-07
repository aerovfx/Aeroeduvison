import { docsConfig } from "@/docs/config"
import { DocsSidebarNav } from "@/components/docs-sidebar-nav"
import { SiteHeader } from "@/components/site-header"
import { DocsLayoutWrapper } from "@/components/docs-layout-wrapper"

interface DocsLayoutProps {
    children: React.ReactNode
}

export default function DocsLayout({ children }: DocsLayoutProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <SiteHeader />
            <DocsLayoutWrapper
                leftSidebar={<DocsSidebarNav items={docsConfig.sidebarNav} />}
            >
                {children}
            </DocsLayoutWrapper>
        </div>
    )
}
