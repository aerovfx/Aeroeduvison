import { notFound } from "next/navigation"
import type { Doc } from "../../../../.contentlayer/generated/types"
import { Mdx } from "@/components/mdx-components"
import { DocsPageHeader } from "@/components/docs-page-header"
import { DocsPager } from "@/components/docs-pager"
import { DashboardTableOfContents } from "@/components/toc"
import { DocsHomePage } from "@/components/docs-home-page"
import { readMarkdownFile } from "@/lib/markdown-fallback"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { DocsPageContent } from "@/components/docs-page-content"

import "@/styles/mdx.css"
import "@/styles/docs.css"
import { Metadata } from "next"
import { absoluteUrl } from "@/lib/utils"

// Import allDocs from generated files
// Note: Contentlayer generates these files automatically during dev/build
// The webpack alias in next.config.js maps "contentlayer/generated" to ".contentlayer/generated"
let allDocs: Doc[] = []

// Use dynamic require with error handling
try {
  // Try webpack alias first (configured in next.config.js)
  // @ts-ignore - Dynamic require for contentlayer
  const generated = require("contentlayer/generated")
  allDocs = generated.allDocs || []
} catch {
  // Fallback: try relative path
  try {
    const generated = require("../../../../.contentlayer/generated/index.mjs")
    allDocs = generated.allDocs || []
  } catch {
    // Files not generated yet - will be generated when contentlayer runs
    allDocs = []
  }
}

interface DocPageProps {
    params: {
        slug?: string[]
    }
}

async function getDocFromParams({ params }: DocPageProps) {
    const slug = params.slug?.join("/") || ""
    
    // If slug is empty, return null (will render home page)
    if (!slug) {
        return null
    }
    
    // Debug: Log available docs and slug
    if (process.env.NODE_ENV === "development" && allDocs.length === 0) {
        console.warn("[Docs] Contentlayer files not generated yet. Slug:", slug)
        console.warn("[Docs] Available docs count:", allDocs.length)
    }
    
    const doc = allDocs.find((doc) => doc.slugAsParams === slug)

    // If doc not found, try alternative slug formats
    if (!doc && allDocs.length > 0) {
        // Try with/without trailing slash
        const altSlug = slug.endsWith("/") ? slug.slice(0, -1) : slug + "/"
        const altDoc = allDocs.find((doc) => doc.slugAsParams === altSlug)
        if (altDoc) return altDoc
        
        // Try matching by partial path
        const partialMatch = allDocs.find((doc) => 
            doc.slugAsParams.includes(slug) || slug.includes(doc.slugAsParams)
        )
        if (partialMatch) {
            console.warn(`[Docs] Partial match found: ${partialMatch.slugAsParams} for ${slug}`)
            return partialMatch
        }
    }

    if (!doc) {
        return null
    }

    return doc
}

export async function generateMetadata({
    params,
}: DocPageProps): Promise<Metadata> {
    const doc = await getDocFromParams({ params })

    if (!doc) {
        return {
            title: "Documentation | AeroEduVison",
            description: "Hướng dẫn đầy đủ để xây dựng và sử dụng hệ thống LMS với AI, simulations, và OCR grading.",
        }
    }

    return {
        title: doc.title,
        description: doc.description,
        openGraph: {
            title: doc.title,
            description: doc.description,
            type: "article",
            url: absoluteUrl(doc.slug),
        },
        twitter: {
            card: "summary_large_image",
            title: doc.title,
            description: doc.description,
        },
    }
}

// Disable static generation to prevent OOM during Docker build
// generateStaticParams removed — pages render on-demand at request time
export const dynamic = 'force-dynamic'

export default async function DocPage({ params }: DocPageProps) {
    const doc = await getDocFromParams({ params })
    const slug = params.slug?.join("/") || ""

    // If no slug or doc not found and slug is empty, show home page
    if (!doc && (!params.slug || params.slug.length === 0)) {
        return <DocsHomePage />
    }

    // If contentlayer hasn't generated files yet, try fallback markdown reader
    if (!doc && allDocs.length === 0 && slug) {
        const fallbackDoc = readMarkdownFile(slug)
        
        if (fallbackDoc) {
            // Generate TOC from markdown content
            const headings = fallbackDoc.content.match(/^##*\s+.+$/gm) || []
            const toc = headings.map((heading) => {
                const level = heading.match(/^#+/)?.[0].length || 1
                const title = heading.replace(/^#+\s+/, "")
                const url = `#${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
                return { title, url, depth: level }
            })
            
            // Convert markdown to MDX-compatible format
            // For now, we'll use a simple markdown renderer
            return (
                <DocsPageContent toc={toc}>
                    <DocsPageHeader heading={fallbackDoc.title} text={fallbackDoc.description} />
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <MarkdownRenderer content={fallbackDoc.content} />
                    </div>
                    <hr className="my-8 border-border" />
                    <DocsPager doc={{
                        title: fallbackDoc.title,
                        slug: fallbackDoc.slug,
                        slugAsParams: fallbackDoc.slugAsParams,
                    }} />
                </DocsPageContent>
            )
        }
        
        // If fallback also fails, show helpful message
        return (
            <main className="relative py-6 lg:gap-10 lg:py-8">
                <div className="mx-auto w-full min-w-0 max-w-3xl">
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900 dark:bg-yellow-900/20">
                        <h1 className="text-2xl font-bold mb-4">Contentlayer đang generate files...</h1>
                        <p className="text-muted-foreground mb-4">
                            Trang <code className="bg-muted px-2 py-1 rounded">{slug}</code> đang được tạo.
                        </p>
                        <div className="space-y-2">
                            <p className="font-medium">Vui lòng:</p>
                            <ol className="list-decimal list-inside space-y-1 text-sm">
                                <li>Đợi vài giây để contentlayer generate files</li>
                                <li>Refresh trang này</li>
                                <li>Nếu vẫn lỗi, restart dev server: <code className="bg-muted px-2 py-1 rounded">npm run dev</code></li>
                            </ol>
                        </div>
                        <div className="mt-4">
                            <a 
                                href="/docs" 
                                className="text-primary hover:underline"
                            >
                                ← Quay về Documentation Home
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // If doc not found and slug exists, show 404
    if (!doc) {
        notFound()
    }

    // Render doc page
    return (
        <DocsPageContent toc={doc.toc}>
            <DocsPageHeader heading={doc.title} text={doc.description} />
            <div className="prose prose-slate dark:prose-invert max-w-none">
                <Mdx code={doc.body.code} />
            </div>
            <hr className="my-8 border-border" />
            <DocsPager doc={doc} />
        </DocsPageContent>
    )
}
