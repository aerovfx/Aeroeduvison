import { defineDocumentType, makeSource } from "contentlayer/source-files"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypePrettyCode from "rehype-pretty-code"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"

export const Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `**/*.md`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true,
    },
    description: {
      type: "string",
    },
    published: {
      type: "boolean",
      default: true,
    },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => `/${doc._raw.flattenedPath}`,
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/"),
    },
    toc: {
      type: "json",
      resolve: (doc) => {
        const content = doc.body.raw || ""
        const headings = content.match(/^##*\s+.+$/gm) || []
        return headings.map((heading) => {
          const level = heading.match(/^#+/)?.[0].length || 1
          const title = heading.replace(/^#+\s+/, "")
          const url = `#${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`
          return { title, url, depth: level }
        })
      },
    },
  },
}))

export default makeSource({
  contentDirPath: "./docs",
  documentTypes: [Doc],
  disableImportAliasWarning: true,
  // Only process docs in beginner/ (the only subdir with proper frontmatter).
  // All other .md files are technical notes without required 'title' field.
  contentDirInclude: ["beginner"],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: "github-dark",
          onVisitLine(node: any) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }]
            }
          },
          onVisitHighlightedLine(node: any) {
            node.properties.className.push("line--highlighted")
          },
          onVisitHighlightedWord(node: any) {
            node.properties.className = ["word--highlighted"]
          },
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section",
          },
        },
      ],
    ],
  },
})
