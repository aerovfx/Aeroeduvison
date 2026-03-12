"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (nodes: Element[]) => Promise<unknown>
    }
  }
}

interface LaTeXPreviewProps {
  content: string
  className?: string
}

export function LaTeXPreview({ content, className = "" }: LaTeXPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!content.trim() || !containerRef.current) return
    const el = containerRef.current
    el.textContent = content
    if (typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([el]).catch(() => {
        // Giữ nội dung gốc nếu LaTeX lỗi
      })
    }
  }, [content])

  if (!content.trim()) return null

  return (
    <div
      ref={containerRef}
      className={`text-sm text-muted-foreground border rounded-md p-3 bg-muted/30 ${className}`}
    />
  )
}

export function LaTeXHint() {
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Công thức LaTeX: inline <code className="bg-muted px-1 rounded">{`$x^2$`}</code> hoặc{" "}
      <code className="bg-muted px-1 rounded">{`\\( \\frac{a}{b} \\)`}</code>; công thức hiển thị{" "}
      <code className="bg-muted px-1 rounded">{`$$E = mc^2$$`}</code> hoặc{" "}
      <code className="bg-muted px-1 rounded">{`\\[ \\int_0^1 f(x)dx \\]`}</code>
    </p>
  )
}
