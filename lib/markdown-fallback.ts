import { readFileSync } from "fs"
import { join } from "path"

export interface MarkdownDoc {
  title: string
  description?: string
  content: string
  slug: string
  slugAsParams: string
}

/**
 * Simple frontmatter parser
 */
function parseFrontmatter(content: string): { data: Record<string, any>, content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { data: {}, content }
  }
  
  const frontmatter = match[1]
  const body = match[2]
  const data: Record<string, any> = {}
  
  // Simple YAML parser for basic key-value pairs
  frontmatter.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      let value = line.substring(colonIndex + 1).trim()
      
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      // Parse boolean
      if (value === 'true') value = true
      if (value === 'false') value = false
      
      data[key] = value
    }
  })
  
  return { data, content: body }
}

/**
 * Fallback: Read markdown file directly when contentlayer hasn't generated files
 */
export function readMarkdownFile(slug: string): MarkdownDoc | null {
  try {
    // Convert slug to file path
    // e.g., "beginner/index" -> "docs/beginner/index.md"
    const filePath = join(process.cwd(), "docs", `${slug}.md`)
    
    // Read file
    const fileContents = readFileSync(filePath, "utf8")
    
    // Parse frontmatter
    const { data, content } = parseFrontmatter(fileContents)
    
    return {
      title: data.title || "Untitled",
      description: data.description,
      content: content,
      slug: `/docs/${slug}`,
      slugAsParams: slug,
    }
  } catch (error) {
    console.error(`[Markdown Fallback] Error reading file for slug "${slug}":`, error)
    return null
  }
}

/**
 * Get all markdown files in docs directory
 */
export function getAllMarkdownFiles(): MarkdownDoc[] {
  const docs: MarkdownDoc[] = []
  const docsDir = join(process.cwd(), "docs")
  
  try {
    const { readdirSync, statSync } = require("fs")
    
    function walkDir(dir: string, basePath: string = "") {
      const files = readdirSync(dir)
      
      for (const file of files) {
        const filePath = join(dir, file)
        const stat = statSync(filePath)
        
        if (stat.isDirectory()) {
          walkDir(filePath, join(basePath, file))
        } else if (file.endsWith(".md")) {
          try {
            const fileContents = readFileSync(filePath, "utf8")
            const { data, content } = parseFrontmatter(fileContents)
            
            // Skip if not published
            if (data.published === false) {
              continue
            }
            
            const relativePath = join(basePath, file.replace(".md", ""))
            const slug = relativePath.replace(/\\/g, "/") // Normalize path separators
            
            docs.push({
              title: data.title || "Untitled",
              description: data.description,
              content: content,
              slug: `/docs/${slug}`,
              slugAsParams: slug,
            })
          } catch (error) {
            console.error(`[Markdown Fallback] Error reading ${filePath}:`, error)
          }
        }
      }
    }
    
    walkDir(docsDir)
  } catch (error) {
    console.error("[Markdown Fallback] Error reading docs directory:", error)
  }
  
  return docs
}
