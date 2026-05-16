/**
 * NewsIndex — Trang /news (danh sách tin tức theo phong cách Soha).
 *
 * Layout:
 *   - Bài mới nhất nổi bật (large card)
 *   - Grid 2x3 các bài còn lại
 *   - Sidebar phải: tin xem nhiều
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Clock, Sparkles } from 'lucide-react'
import { NewsLayout } from './NewsLayout'
import {
  NEWS,
  CATEGORY_LABELS,
  formatVietnameseDate,
  formatViewCount,
  type NewsArticle,
} from './articles'
import { useAuth } from '@/hooks/useAuth'

export default function NewsIndex() {
  const { user } = useAuth()

  // Reco-ranked feed: dùng rankNews mixer khi có user (sẽ personalize theo
  // weakTopics đọc từ localStorage history). Fallback sort theo date cho
  // anonymous browsing.
  const dateSorted = [...NEWS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
  const [ranked, setRanked] = useState<NewsArticle[]>(dateSorted)
  const [usingReco, setUsingReco] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      try {
        const { rankNews, buildContext } = await import('@/lib/reco')
        // Weak topics đọc từ history — nếu user mới chưa làm bài, default rỗng
        const ctx = buildContext({
          userId: user?.id ?? null,
          userName: user?.name ?? undefined,
        })
        const r = await rankNews(NEWS, ctx, { topK: NEWS.length })
        if (!cancelled && r.length > 0) {
          setRanked(r)
          setUsingReco(true)
        }
      } catch (e) {
        console.warn('[NewsIndex] reco failed, fallback:', e)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const featured = ranked[0]
  const rest = ranked.slice(1)
  const mostViewed = [...NEWS].sort((a, b) => b.views - a.views).slice(0, 5)

  return (
    <NewsLayout breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: 'Tin tức' }]}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Main feed */}
        <div>
          {/* Personalization badge — chỉ hiện khi user đăng nhập + reco active */}
          {usingReco && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-3 h-3" />
              Sắp xếp riêng cho bạn
            </div>
          )}
          {/* Featured article */}
          {featured && (
            <Link
              to={`/news/${featured.slug}`}
              className="block group mb-8 pb-6 border-b border-border"
            >
              <img
                src={featured.heroImage}
                alt={featured.title}
                className="w-full aspect-[16/9] object-cover rounded-md mb-4"
              />
              <span className="inline-block text-[11px] font-bold uppercase tracking-wide text-[hsl(262,83%,58%)] mb-2">
                {CATEGORY_LABELS[featured.category]}
              </span>
              <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight text-foreground group-hover:text-[hsl(262,83%,58%)] transition-colors mb-2">
                {featured.title}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed line-clamp-3 mb-2">
                {featured.sapo}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{featured.author}</span>
                <span>·</span>
                <span>{formatVietnameseDate(featured.publishedAt)}</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {formatViewCount(featured.views)}
                </span>
              </div>
            </Link>
          )}

          {/* Rest grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {rest.map((n) => (
              <Link
                key={n.slug}
                to={`/news/${n.slug}`}
                className="block group"
              >
                <img
                  src={n.heroImage}
                  alt={n.title}
                  className="w-full aspect-[16/9] object-cover rounded-md mb-3"
                />
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[hsl(262,83%,58%)] mb-1.5">
                  {CATEGORY_LABELS[n.category]}
                </span>
                <h3 className="text-[17px] font-bold leading-snug text-foreground group-hover:text-[hsl(262,83%,58%)] transition-colors mb-1.5 line-clamp-2">
                  {n.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {n.sapo}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{formatVietnameseDate(n.publishedAt)}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {formatViewCount(n.views)}
                  </span>
                  {n.readTime && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {n.readTime}
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar phải */}
        <aside className="space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-b-2 border-[hsl(262,83%,58%)] pb-2 mb-3">
              Tin xem nhiều
            </h3>
            <ol className="space-y-3">
              {mostViewed.map((n, i) => (
                <li key={n.slug} className="flex gap-3">
                  <span className="text-2xl font-bold text-[hsl(262,83%,58%)] leading-none flex-shrink-0 w-6">
                    {i + 1}
                  </span>
                  <Link
                    to={`/news/${n.slug}`}
                    className="text-sm font-medium leading-snug text-foreground hover:text-[hsl(262,83%,58%)] transition-colors line-clamp-3"
                  >
                    {n.title}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg bg-[hsl(262,83%,58%)]/5 border border-[hsl(262,83%,58%)]/20 p-4">
            <h3 className="font-bold text-foreground mb-1">📚 Tài liệu hệ thống</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Hướng dẫn sử dụng đầy đủ cho học sinh + giáo viên.
            </p>
            <Link
              to="/docs"
              className="text-xs font-medium text-[hsl(262,83%,58%)] hover:underline"
            >
              Xem tất cả tài liệu →
            </Link>
          </div>
        </aside>
      </div>
    </NewsLayout>
  )
}
