/**
 * DocRef — Inline citation to a doc article.
 *
 * Usage:
 *   <DocRef term="LaTeX" slug="latex-editor" />
 *   <DocRef term="ma trận đề" slug="exam-matrix" anchor="distribution" />
 *   <DocRef slug="glossary" anchor="ocr">OCR</DocRef>
 *
 * Renders an inline link styled như chú thích (subtle underline + book icon)
 * mở `/docs/:slug` trong tab mới. Hover tooltip hiển thị tiêu đề bài viết.
 */
import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface DocRefProps {
  /** Slug bài docs đích — vd "latex-editor", "exam-matrix" */
  slug: string
  /** Anchor (id) trong bài để cuộn đến section cụ thể */
  anchor?: string
  /** Text hiển thị; nếu không cung cấp dùng `term` hoặc `children` */
  term?: string
  /** Tooltip phụ — mặc định "Xem tài liệu" */
  tooltip?: string
  /** ClassName tuỳ chỉnh */
  className?: string
  /** Children — nếu cung cấp sẽ dùng thay cho `term` */
  children?: ReactNode
  /** Ẩn icon sách (mặc định hiện) */
  hideIcon?: boolean
}

export function DocRef({
  slug,
  anchor,
  term,
  tooltip = 'Xem tài liệu',
  className,
  children,
  hideIcon = false,
}: DocRefProps) {
  const href = anchor ? `/docs/${slug}#${anchor}` : `/docs/${slug}`
  const label = children ?? term ?? slug

  return (
    <Link
      to={href}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltip}
      className={cn(
        'inline-flex items-baseline gap-0.5 text-[hsl(262,83%,58%)]',
        'underline decoration-dotted decoration-[hsl(262,83%,58%)]/40 underline-offset-2',
        'hover:decoration-solid hover:decoration-[hsl(262,83%,58%)]',
        'transition-colors',
        className,
      )}
    >
      <span>{label}</span>
      {!hideIcon && (
        <BookOpen className="w-3 h-3 self-center opacity-60" aria-hidden="true" />
      )}
    </Link>
  )
}

export default DocRef
