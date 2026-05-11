/**
 * DocsIndex — Trang /docs (mục lục tổng).
 *
 * Hiển thị các bài viết nhóm theo category dạng card.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, Clock } from 'lucide-react'
import { DocsLayout } from './DocsLayout'
import { ARTICLES, CATEGORY_LABELS, CATEGORY_ORDER } from './articles'

export default function DocsIndex() {
  return (
    <DocsLayout>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Tài liệu hệ thống</h1>
        <p className="text-muted-foreground">
          Hướng dẫn sử dụng AeroEduVision — từ đăng ký tới soạn đề LaTeX và phân tích dữ liệu lớp.
          Mọi thuật ngữ kỹ thuật đều có chú thích — bấm vào icon{' '}
          <span className="inline-block px-1 py-0.5 rounded bg-muted text-xs font-mono">📖</span>{' '}
          để xem giải thích.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {[
          { slug: 'getting-started', emoji: '🚀', title: 'Bắt đầu' },
          { slug: 'student-guide',   emoji: '🎓', title: 'Học sinh' },
          { slug: 'teacher-guide',   emoji: '👩‍🏫', title: 'Giáo viên' },
          { slug: 'glossary',        emoji: '📚', title: 'Thuật ngữ' },
        ].map((q) => (
          <Link
            key={q.slug}
            to={`/docs/${q.slug}`}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-[hsl(262,83%,58%)]/40 hover:shadow-md transition-all"
          >
            <span className="text-2xl">{q.emoji}</span>
            <span className="font-medium text-foreground">{q.title}</span>
            <ArrowRight className="ml-auto w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      {/* Full TOC */}
      {CATEGORY_ORDER.map((cat) => {
        const items = ARTICLES.filter((a) => a.category === cat)
        if (items.length === 0) return null
        return (
          <section key={cat} className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((a) => (
                <Link
                  key={a.slug}
                  to={`/docs/${a.slug}`}
                  className="block p-4 rounded-lg border border-border bg-card hover:border-[hsl(262,83%,58%)]/40 transition-all"
                >
                  <div className="font-semibold text-foreground mb-1">{a.title}</div>
                  <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {a.summary}
                  </div>
                  {a.readTime && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Clock className="w-3 h-3" />
                      {a.readTime}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </DocsLayout>
  )
}
