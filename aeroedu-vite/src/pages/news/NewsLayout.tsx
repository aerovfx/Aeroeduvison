/**
 * NewsLayout — Layout chung trang tin tức theo phong cách Soha.
 *
 * Khác Docs: KHÔNG có sidebar TOC bên trái. Có top bar đỏ, breadcrumb,
 * và sidebar phải hiển thị tin liên quan (chỉ ở trang article).
 */
import { Link } from 'react-router-dom'
import { Newspaper, ChevronLeft, ChevronRight, Home } from 'lucide-react'
import type { ReactNode } from 'react'

interface NewsLayoutProps {
  children: ReactNode
  /** Breadcrumb items, vd [{label: 'Trang chủ', to: '/'}, ...] */
  breadcrumb?: { label: string; to?: string }[]
}

export function NewsLayout({ children, breadcrumb = [] }: NewsLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar gradient — đồng bộ với màu chủ đạo của site (purple → blue) */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[hsl(262,83%,58%)] via-[hsl(245,75%,55%)] to-[hsl(210,85%,55%)] text-white shadow-md">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-1 text-sm hover:underline" title="Trang chủ">
            <Home className="w-4 h-4" />
          </Link>
          <div className="h-4 w-px bg-white/40" />
          <Link to="/news" className="flex items-center gap-2 font-bold text-base hover:underline">
            <Newspaper className="w-5 h-5" />
            <span>AeroEduVision News</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-xs">
            <Link to="/docs" className="hover:underline opacity-90">Tài liệu</Link>
            <Link to="/dashboard" className="hover:underline opacity-90">Dashboard</Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="border-b border-border bg-card/30">
          <div className="max-w-[1200px] mx-auto px-4 py-2 text-xs text-muted-foreground">
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center">
                {i > 0 && <ChevronRight className="w-3 h-3 mx-1 opacity-50" />}
                {b.to ? (
                  <Link to={b.to} className="hover:text-[hsl(262,83%,58%)] hover:underline">{b.label}</Link>
                ) : (
                  <span className="text-foreground font-medium">{b.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {children}
      </div>

      {/* Footer thin */}
      <footer className="border-t border-border py-6 mt-12 bg-card/30">
        <div className="max-w-[1200px] mx-auto px-4 text-xs text-muted-foreground flex items-center justify-between flex-wrap gap-2">
          <div>
            © {new Date().getFullYear()} AeroEduVision · Tin tức &amp; cập nhật sản phẩm
          </div>
          <Link to="/" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Quay về trang chủ
          </Link>
        </div>
      </footer>
    </div>
  )
}

export default NewsLayout
