// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
var Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `docs/**/*.md`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string"
    },
    published: {
      type: "boolean",
      default: true
    }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => `/${doc._raw.flattenedPath}`
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/")
    },
    toc: {
      type: "json",
      resolve: (doc) => {
        const content = doc.body.raw || "";
        const headings = content.match(/^##*\s+.+$/gm) || [];
        return headings.map((heading) => {
          const level = heading.match(/^#+/)?.[0].length || 1;
          const title = heading.replace(/^#+\s+/, "");
          const url = `#${title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
          return { title, url, depth: level };
        });
      }
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: "./docs",
  documentTypes: [Doc],
  disableImportAliasWarning: true,
  // Ignore markdown files in root directory and other non-docs folders
  ignore: [
    "**/node_modules/**",
    "**/.git/**",
    "**/.claude/**",
    "**/.contentlayer/**",
    "**/desktop-current-app/**",
    "**/*.mdx",
    // Ignore root-level markdown files (only process docs/**/*.md)
    "*.md"
  ],
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypePrettyCode,
        {
          theme: "github-dark",
          onVisitLine(node) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
          onVisitHighlightedLine(node) {
            node.properties.className.push("line--highlighted");
          },
          onVisitHighlightedWord(node) {
            node.properties.className = ["word--highlighted"];
          }
        }
      ],
      [
        rehypeAutolinkHeadings,
        {
          properties: {
            className: ["subheading-anchor"],
            ariaLabel: "Link to section"
          }
        }
      ]
    ]
  }
});
export {
  Doc,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-ZVWVWSFN.mjs.map
