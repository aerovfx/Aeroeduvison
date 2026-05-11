/**
 * DocsArticle — Trang /docs/:slug (render 1 bài viết).
 *
 * Scroll lên top khi đổi bài. Hỗ trợ anchor (#section-id) — browser tự scroll
 * vì các <h2 id="..."> có scroll-mt-24.
 */
import { useParams, Link, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, Clock } from 'lucide-react'
import { DocsLayout } from './DocsLayout'
import { getArticleBySlug, ARTICLES } from './articles'

export default function DocsArticle() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticleBySlug(slug) : undefined

  // Scroll up khi navigate sang bài khác (anchor sẽ override)
  useEffect(() => {
    if (window.location.hash) {
      // có anchor → để browser handle
      const el = document.getElementById(window.location.hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!article) {
    return <Navigate to="/docs" replace />
  }

  // Bài tiếp theo / trước trong cùng category
  const sameCat = ARTICLES.filter((a) => a.category === article.category)
  const idx = sameCat.findIndex((a) => a.slug === article.slug)
  const prev = idx > 0 ? sameCat[idx - 1] : null
  const next = idx < sameCat.length - 1 ? sameCat[idx + 1] : null

  return (
    <DocsLayout>
      <div className="mb-6">
        <Link
          to="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Tất cả tài liệu
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">{article.title}</h1>
        <p className="text-muted-foreground">{article.summary}</p>
        {article.readTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70 mt-2">
            <Clock className="w-3 h-3" />
            Đọc trong {article.readTime}
          </div>
        )}
      </div>

      <div className="prose-doc">
        {article.content}
      </div>

      {/* Prev / Next nav */}
      {(prev || next) && (
        <nav className="mt-12 pt-6 border-t border-border grid grid-cols-2 gap-3">
          {prev ? (
            <Link
              to={`/docs/${prev.slug}`}
              className="block p-3 rounded-lg border border-border hover:border-[hsl(262,83%,58%)]/40 transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-1">← Trước</div>
              <div className="text-sm font-medium text-foreground">{prev.title}</div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to={`/docs/${next.slug}`}
              className="block p-3 rounded-lg border border-border hover:border-[hsl(262,83%,58%)]/40 transition-colors text-right"
            >
              <div className="text-xs text-muted-foreground mb-1">Tiếp →</div>
              <div className="text-sm font-medium text-foreground">{next.title}</div>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
    </DocsLayout>
  )
}
