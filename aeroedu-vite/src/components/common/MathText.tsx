/**
 * MathText — Render text có công thức LaTeX inline + display
 *
 * Cú pháp:
 *   $...$       → inline math (Vd: $E = mc^2$)
 *   $$...$$     → display math (block, căn giữa, lớn hơn)
 *   \(...\)     → inline (alt syntax)
 *   \[...\]     → display (alt syntax)
 *   ```         → code block giữ nguyên (không parse math)
 *
 * Render qua KaTeX (~250KB JS+CSS, lazy load on first use). Bao bọc lỗi
 * → fallback hiện text gốc + tooltip lỗi (không crash trang).
 *
 * Cách dùng:
 *   <MathText>Định luật II Newton: $\vec{F} = m\vec{a}$ với $m$ là khối lượng.</MathText>
 *   <MathText display>$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$</MathText>
 */
import { useMemo, type CSSProperties } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathTextProps {
  children: string
  className?: string
  /** Force tất cả là display mode (block) — bỏ qua $/$$ markers */
  display?: boolean
  /** Tag wrapper (default: span). Dùng "div" cho block content. */
  as?: 'span' | 'div' | 'p'
  /** Inline style cho wrapper tag (vd màu chữ trên nền sáng). */
  style?: CSSProperties
}

// Regex tìm các đoạn math:
//   1. $$ ... $$  → display
//   2. \[ ... \]  → display
//   3. $ ... $    → inline
//   4. \( ... \)  → inline
// Phải parse $$ trước $ để tránh ngắt nhầm.
const MATH_REGEX = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g

function renderMathPiece(piece: string): { html: string; isMath: boolean } {
  // Display $$...$$
  if (piece.startsWith('$$') && piece.endsWith('$$')) {
    const tex = piece.slice(2, -2).trim()
    return safeRender(tex, true)
  }
  // Display \[...\]
  if (piece.startsWith('\\[') && piece.endsWith('\\]')) {
    const tex = piece.slice(2, -2).trim()
    return safeRender(tex, true)
  }
  // Inline $...$
  if (piece.startsWith('$') && piece.endsWith('$') && piece.length > 2) {
    const tex = piece.slice(1, -1).trim()
    return safeRender(tex, false)
  }
  // Inline \(...\)
  if (piece.startsWith('\\(') && piece.endsWith('\\)')) {
    const tex = piece.slice(2, -2).trim()
    return safeRender(tex, false)
  }
  return { html: '', isMath: false }
}

function safeRender(tex: string, displayMode: boolean): { html: string; isMath: true } {
  try {
    const html = katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',  // KHÔNG dùng MathML để tránh duplicate render
      trust: false,
    })
    return { html, isMath: true }
  } catch (err) {
    // Fallback: hiện text gốc bọc trong span đỏ + tooltip
    const safe = escapeHtml(displayMode ? `$$${tex}$$` : `$${tex}$`)
    const msg = escapeHtml(String((err as Error)?.message || 'LaTeX error'))
    return {
      html: `<span style="color:#f87171;border-bottom:1px dotted #f87171;cursor:help" title="${msg}">${safe}</span>`,
      isMath: true,
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function MathText({ children, className = '', display = false, as = 'span', style }: MathTextProps) {
  const html = useMemo(() => {
    const text = String(children ?? '')
    if (!text) return ''

    // Force display mode → render toàn bộ là 1 công thức
    if (display) {
      return safeRender(text.trim().replace(/^\$+|\$+$/g, ''), true).html
    }

    // Split text + math interleaved
    let result = ''
    let lastIdx = 0
    let m: RegExpExecArray | null
    MATH_REGEX.lastIndex = 0
    while ((m = MATH_REGEX.exec(text)) !== null) {
      // Plain text trước match
      if (m.index > lastIdx) {
        result += escapeHtml(text.slice(lastIdx, m.index))
      }
      const piece = renderMathPiece(m[0])
      result += piece.isMath ? piece.html : escapeHtml(m[0])
      lastIdx = m.index + m[0].length
    }
    // Remaining text sau math cuối
    if (lastIdx < text.length) {
      result += escapeHtml(text.slice(lastIdx))
    }
    // Preserve newlines → <br>
    return result.replace(/\n/g, '<br>')
  }, [children, display])

  const Tag = as
  return <Tag className={`math-text ${className}`} style={style} dangerouslySetInnerHTML={{ __html: html }} />
}

export default MathText
