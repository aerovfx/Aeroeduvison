/**
 * NewsArticle — Trang /news/:slug — Layout chi tiết kiểu Soha.
 *
 * Cấu trúc:
 *   - Breadcrumb
 *   - Title H1 lớn
 *   - Sapo (lead) — đậm xám
 *   - Author + date + view + share
 *   - Hero image + caption
 *   - Body (text-justify) với sub-images, quotes, lists
 *   - Tags + share buttons
 *   - Sidebar phải: tin liên quan + tin xem nhiều
 *   - Footer: 4 cards tin khác cùng category
 */
import { useParams, Navigate, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Eye, Clock, Facebook, Twitter, Link2 } from 'lucide-react'
import { NewsLayout } from './NewsLayout'
import {
  getNewsBySlug,
  getRelatedNews,
  NEWS,
  CATEGORY_LABELS,
  formatVietnameseDate,
  formatViewCount,
} from './articles'

export default function NewsArticle() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getNewsBySlug(slug) : undefined

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!article) return <Navigate to="/news" replace />

  const related   = getRelatedNews(article.slug, 4)
  const sameCat   = NEWS.filter((n) => n.category === article.category && n.slug !== article.slug).slice(0, 4)
  const mostViewed = [...NEWS].sort((a, b) => b.views - a.views).slice(0, 5)

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl)
  }

  return (
    <NewsLayout
      breadcrumb={[
        { label: 'Trang chủ', to: '/' },
        { label: 'Tin tức', to: '/news' },
        { label: CATEGORY_LABELS[article.category] },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main article */}
        <article className="max-w-[720px]">
          {/* Category tag */}
          <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-[hsl(0,73%,45%)] mb-3">
            {CATEGORY_LABELS[article.category]}
          </span>

          {/* Title */}
          <h1 className="text-[28px] sm:text-[34px] font-bold leading-[1.2] text-foreground mb-4">
            {article.title}
          </h1>

          {/* Sapo (lead) */}
          <p className="text-[19px] leading-[1.55] font-semibold text-muted-foreground mb-5 border-l-4 border-[hsl(0,73%,45%)] pl-4">
            {article.sapo}
          </p>

          {/* Meta line */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground border-b border-border pb-4 mb-5">
            <span className="font-medium text-foreground">{article.author}</span>
            <span>·</span>
            <span>{formatVietnameseDate(article.publishedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatViewCount(article.views)}
            </span>
            {article.readTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {article.readTime}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90"
                title="Chia sẻ Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 rounded-full bg-[#1DA1F2] text-white flex items-center justify-center hover:opacity-90"
                title="Chia sẻ Twitter"
              >
                <Twitter className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="w-7 h-7 rounded-full bg-muted text-foreground flex items-center justify-center hover:bg-accent"
                title="Sao chép link"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hero image */}
          <figure className="mb-6">
            <img
              src={article.heroImage}
              alt={article.title}
              className="w-full rounded-md"
            />
            {article.heroCaption && (
              <figcaption className="text-sm text-muted-foreground italic mt-2 text-center px-3">
                {article.heroCaption}
              </figcaption>
            )}
          </figure>

          {/* Body */}
          <div className="text-foreground">
            {article.content}
          </div>

          {/* Tags */}
          <div className="mt-8 pt-5 border-t border-border">
            <div className="text-sm font-semibold mb-2 text-foreground">Từ khoá:</div>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ── Big share section — Facebook prominent ──────────── */}
          <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#1877F2]/8 to-[#1877F2]/2 border border-[#1877F2]/30">
            <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
              Bài viết hữu ích? Chia sẻ với bạn bè
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Giúp giáo viên và phụ huynh khác biết tới AeroEduVision.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-[#1877F2] hover:bg-[#0d62cf] text-white font-bold text-sm sm:text-base shadow-md transition"
              >
                <Facebook className="w-5 h-5" />
                Chia sẻ Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-[#1DA1F2] hover:bg-[#0c8bd9] text-white font-bold text-sm sm:text-base shadow-md transition"
              >
                <Twitter className="w-5 h-5" />
                Twitter
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 rounded-xl bg-muted hover:bg-accent text-foreground font-semibold text-sm sm:text-base border border-border transition"
              >
                <Link2 className="w-5 h-5" />
                Sao chép link
              </button>
            </div>
          </div>

          {/* Same-category footer */}
          {sameCat.length > 0 && (
            <section className="mt-10 pt-6 border-t-2 border-[hsl(0,73%,45%)]">
              <h2 className="text-base font-bold uppercase tracking-wider text-[hsl(0,73%,45%)] mb-4">
                Cùng chuyên mục
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sameCat.map((n) => (
                  <Link key={n.slug} to={`/news/${n.slug}`} className="flex gap-3 group">
                    <img
                      src={n.heroImage}
                      alt={n.title}
                      className="w-24 h-20 object-cover rounded-md flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-[hsl(0,73%,45%)] transition-colors line-clamp-3">
                        {n.title}
                      </h3>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {formatVietnameseDate(n.publishedAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          {/* Most viewed */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b-2 border-[hsl(0,73%,45%)] pb-2 mb-3">
              Tin xem nhiều
            </h3>
            <ol className="space-y-3">
              {mostViewed.map((n, i) => (
                <li key={n.slug} className="flex gap-3">
                  <span className="text-2xl font-bold text-[hsl(0,73%,45%)] leading-none flex-shrink-0 w-6">
                    {i + 1}
                  </span>
                  <Link
                    to={`/news/${n.slug}`}
                    className="text-sm font-medium leading-snug text-foreground hover:text-[hsl(0,73%,45%)] transition-colors line-clamp-3"
                  >
                    {n.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          {/* Related */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b-2 border-[hsl(0,73%,45%)] pb-2 mb-3">
              Tin liên quan
            </h3>
            <div className="space-y-3">
              {related.map((n) => (
                <Link key={n.slug} to={`/news/${n.slug}`} className="flex gap-3 group">
                  <img
                    src={n.heroImage}
                    alt={n.title}
                    className="w-20 h-16 object-cover rounded-md flex-shrink-0"
                  />
                  <h4 className="text-xs font-medium leading-snug text-foreground group-hover:text-[hsl(0,73%,45%)] transition-colors line-clamp-3">
                    {n.title}
                  </h4>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[hsl(0,73%,45%)]/5 border border-[hsl(0,73%,45%)]/20 p-4">
            <h3 className="font-bold text-foreground mb-1">📚 Tài liệu</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Hướng dẫn sử dụng đầy đủ cho học sinh + giáo viên.
            </p>
            <Link to="/docs" className="text-xs font-medium text-[hsl(0,73%,45%)] hover:underline">
              Xem tất cả →
            </Link>
          </div>
        </aside>
      </div>
    </NewsLayout>
  )
}
