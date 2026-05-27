/**
 * DocsIndex — Trang /docs (mục lục tổng).
 *
 * Hiển thị các bài viết nhóm theo category dạng card.
 * 2026-05-27: Thêm CTA "Hỏi Trợ lý AeroEdu" lên đầu — assistant đã được
 * trained với 13 skill module bao phủ toàn bộ docs content (lib/aero-skills.cjs),
 * khuyến nghị user hỏi trực tiếp thay vì đọc từng bài.
 */
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Sparkles, MessageCircle } from 'lucide-react'
import { DocsLayout } from './DocsLayout'
import { ARTICLES, CATEGORY_LABELS, CATEGORY_ORDER } from './articles'
import usePageTitle from '@/hooks/usePageTitle'

export default function DocsIndex() {
  usePageTitle('Tài liệu hệ thống')
  return (
    <DocsLayout>
      {/* Hero */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Tài liệu hệ thống</h1>
        <p className="text-muted-foreground">
          Hướng dẫn sử dụng AeroEduVision — từ đăng ký tới soạn đề LaTeX và phân tích dữ liệu lớp.
        </p>
      </div>

      {/* ─── CTA: Trợ lý AeroEdu (recommended) ─── */}
      <div className="mb-8 rounded-2xl p-5 sm:p-6 border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-cyan-500/5 to-blue-500/10 shadow-lg">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Hỏi Trợ lý AeroEdu thay vì đọc tài liệu
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[10px] font-bold uppercase tracking-wide">
                Khuyến nghị
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Trợ lý đã được nạp <strong>13 skill module</strong> bao phủ toàn bộ tính năng + hướng dẫn
              + khắc phục lỗi. Hỏi bằng câu nói tự nhiên — phản hồi tức thì, có ví dụ + link tới đúng trang.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'AeroEdu là gì?',
                'Làm sao tạo đề thi?',
                'Hướng dẫn dùng LabTwin',
                'Mời học sinh vào dự án STEM',
                'Lỗi đăng nhập 2FA',
              ].map((q) => (
                <span
                  key={q}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-xs text-muted-foreground hover:text-foreground hover:border-violet-500/40 transition-colors cursor-default"
                  title="Bấm vào trợ lý AeroEdu góc dưới phải để hỏi câu này"
                >
                  <MessageCircle className="w-3 h-3" />
                  {q}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-3">
              💡 Click vào icon <span className="inline-block w-5 h-5 align-middle rounded-md bg-gradient-to-br from-violet-500 to-cyan-500" /> ở góc dưới phải mọi trang để mở trợ lý.
              Hoặc tiếp tục đọc tài liệu tĩnh bên dưới ↓
            </p>
          </div>
        </div>
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
