import { notFound } from "next/navigation"
import { allDocs } from "contentlayer/generated"

import { Mdx } from "@/components/mdx-components"
import { DocsPageHeader } from "@/components/docs-page-header"
import { DocsPager } from "@/components/docs-pager"
import { DashboardTableOfContents } from "@/components/toc"

import "@/styles/mdx.css"
import "@/styles/docs.css"
import { Metadata } from "next"
import { absoluteUrl } from "@/lib/utils"

interface DocPageProps {
    params: {
        slug: string[]
    }
}

async function getDocFromParams({ params }: DocPageProps) {
    const slug = params.slug?.join("/") || ""
    const doc = allDocs.find((doc) => doc.slugAsParams === slug)

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
        return {}
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

export async function generateStaticParams(): Promise<
    DocPageProps["params"][]
> {
    return allDocs.map((doc) => ({
        slug: doc.slugAsParams.split("/"),
    }))
}

export default async function DocPage({ params }: DocPageProps) {
    const doc = await getDocFromParams({ params })

    if (!doc) {
        notFound()
    }

    return (
        <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_250px] xl:gap-16">
            <div className="mx-auto w-full min-w-0">
                <DocsPageHeader heading={doc.title} text={doc.description} />
                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <Mdx code={doc.body.code} />
                </div>
                <hr className="my-8 border-border" />
                <DocsPager doc={doc} />
            </div>
            {doc.toc && doc.toc.length > 0 && (
                <div className="hidden text-sm xl:block">
                    <div className="sticky top-16 -mt-10 h-[calc(100vh-4rem)] overflow-y-auto">
                        <DashboardTableOfContents toc={doc.toc} />
                    </div>
                </div>
            )}
        </main>
    )
}
