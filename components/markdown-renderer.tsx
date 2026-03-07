"use client"

import React from "react"

interface MarkdownRendererProps {
  content: string
}

/**
 * Simple markdown renderer for fallback when contentlayer isn't ready
 * This is a basic implementation - for production, consider using react-markdown
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Split content into lines for processing
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentParagraph: string[] = []
  let inCodeBlock = false
  let codeBlockLanguage = ""
  let codeBlockContent: string[] = []

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ')
      if (text.trim()) {
        elements.push(
          <p key={elements.length} className="mb-4">
            {renderInlineMarkdown(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold **text**
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let key = 0

    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, (match, content) => {
      return `<strong>${content}</strong>`
    })
    
    // Italic
    text = text.replace(/\*(.+?)\*/g, (match, content) => {
      return `<em>${content}</em>`
    })
    
    // Links [text](url)
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, (match, linkText, url) => {
      return `<a href="${url}" class="text-primary hover:underline">${linkText}</a>`
    })
    
    // Code inline `code`
    text = text.replace(/`(.+?)`/g, (match, code) => {
      return `<code class="bg-muted px-1 py-0.5 rounded text-sm">${code}</code>`
    })

    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }

  lines.forEach((line, index) => {
    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        flushParagraph()
        elements.push(
          <pre key={elements.length} className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">
            <code className={`language-${codeBlockLanguage}`}>
              {codeBlockContent.join('\n')}
            </code>
          </pre>
        )
        codeBlockContent = []
        inCodeBlock = false
        codeBlockLanguage = ""
      } else {
        // Start code block
        flushParagraph()
        codeBlockLanguage = line.slice(3).trim()
        inCodeBlock = true
      }
      return
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      return
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      
      elements.push(
        <HeadingTag 
          key={elements.length} 
          id={id}
          className={`mb-4 mt-8 scroll-m-20 ${
            level === 1 ? 'text-4xl font-bold' :
            level === 2 ? 'text-3xl font-semibold' :
            level === 3 ? 'text-2xl font-semibold' :
            'text-xl font-semibold'
          }`}
        >
          {renderInlineMarkdown(text)}
        </HeadingTag>
      )
      return
    }

    // Lists
    if (line.match(/^[-*]\s+/)) {
      flushParagraph()
      const text = line.replace(/^[-*]\s+/, '')
      elements.push(
        <li key={elements.length} className="ml-4 mb-2">
          {renderInlineMarkdown(text)}
        </li>
      )
      return
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph()
      return
    }

    // Regular paragraph line
    currentParagraph.push(line)
  })

  flushParagraph()

  return <div className="markdown-content">{elements}</div>
}
