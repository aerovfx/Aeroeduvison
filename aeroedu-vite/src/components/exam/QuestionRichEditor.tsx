/**
 * QuestionRichEditor — Wrapper compact của RichTextEditor cho biên tập câu hỏi.
 *
 * Khác với lesson-plan editor full-page:
 *   - Min-height 220px (vs full screen)
 *   - Plain text ↔ HTML conversion cho backward compat:
 *     + Loading: nếu value là plain text (no HTML tags) → wrap `<p>`
 *     + onChange: trả về HTML
 *   - Placeholder mặc định gợi ý LaTeX inline ($x^2$) và block ($$\int...$$)
 *
 * Cho phép GV soạn câu hỏi như Word:
 *   - Heading / Bold / Italic / Underline / Color / Highlight
 *   - Align L/C/R/J / List / Quote / Code / Table
 *   - LaTeX inline + block (gõ $x^2$ tự render KaTeX)
 *   - Image (qua link), formula via Σ button
 *
 * Lazy-load RichTextEditor (TipTap heavy ~150kb) — chỉ tải khi mở editor.
 */
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

const RichTextEditor = lazy(() => import('@/components/lesson-plan/RichTextEditor'))

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  /** Cho phép GV biên tập (true mặc định) hoặc chỉ xem (false) */
  editable?: boolean
}

/**
 * Detect content có phải HTML không. Heuristic đơn giản: có `<` thì coi là HTML.
 */
function isHtml(s: string): boolean {
  return /<[a-z][^>]*>/i.test(s)
}

/**
 * Escape plain text → HTML-safe + wrap `<p>` để TipTap parse được.
 * Giữ xuống dòng `\n` thành `<br>`.
 */
function plainToHtml(s: string): string {
  const escaped = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')
  return `<p>${escaped}</p>`
}

export function QuestionRichEditor({
  value,
  onChange,
  placeholder = 'Nhập câu hỏi. Hỗ trợ $x^2$ inline, $$\\int x\\,dx$$ block, ảnh & bảng.',
  minHeight = 220,
  editable = true,
}: Props) {
  // Normalize input — plain text → wrap <p>
  const htmlValue = isHtml(value) ? value : plainToHtml(value)

  return (
    <div
      className="border rounded-md overflow-hidden bg-card"
      style={{ minHeight }}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Đang tải editor...
          </div>
        }
      >
        <RichTextEditor
          value={htmlValue}
          onChange={(html) => onChange(html)}
          placeholder={placeholder}
          editable={editable}
        />
      </Suspense>
    </div>
  )
}

/**
 * QuestionContentView — Render read-only nội dung câu hỏi.
 *
 * Auto-detect HTML vs plain text:
 *   - HTML (có <tag>) → dangerouslySetInnerHTML (giữ formatting + KaTeX đã render)
 *   - Plain text với $...$ → fall back qua MathText (legacy)
 *
 * Dùng class .tiptap-display để css-target formatting (bold, headings, tables,
 * KaTeX rendered) — xem aeroedu-vite/src/index.css.
 */
import { MathText } from '@/components/common/MathText'
import TikzFigure from '@/components/common/TikzFigure'
import { hasTikz, extractTikzForJax, stripTikzAndPreamble } from '@/lib/tikz'

interface ViewProps {
  content: string
  className?: string
  /** 'span' (inline) hoặc 'div' (block) — span cho list items, div cho main */
  as?: 'span' | 'div'
}

export function QuestionContentView({ content, className = '', as = 'div' }: ViewProps) {
  if (!content) return null

  // GV dán/gõ mã TikZ (kể cả document standalone đầy đủ) thẳng vào nội dung →
  // render thành HÌNH bằng tikzjax. Chỉ ở chế độ block (as='div'); span (list
  // item) giữ nguyên text để không vỡ layout.
  if (as === 'div' && hasTikz(content)) {
    const tikz = extractTikzForJax(content)
    const prose = stripTikzAndPreamble(content)
    if (tikz) {
      return (
        <div className={`tiptap-display ${className}`}>
          {prose && <MathText as="div" className="mb-2">{prose}</MathText>}
          <TikzFigure code={tikz} />
        </div>
      )
    }
  }

  if (isHtml(content)) {
    const Tag = as as 'div' | 'span'
    return (
      <Tag
        className={`tiptap-display ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }
  // Legacy plain text with $...$ math
  return <MathText as={as} className={className}>{content}</MathText>
}

export default QuestionRichEditor
