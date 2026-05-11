/**
 * DocsLayout — Layout chung cho mọi trang /docs/*
 *
 * Layout 2 cột:
 *   - Sidebar trái (TOC nhóm theo category)
 *   - Main content
 *
 * Trên mobile sidebar tự ẩn (truy cập qua nút).
 */
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BookOpen, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ARTICLES, CATEGORY_LABELS, CATEGORY_ORDER } from './articles'

interface DocsLayoutProps {
  children: React.ReactNode
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            title="Quay lại Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-border mx-1" />
          <Link to="/docs" className="flex items-center gap-2 font-semibold text-foreground">
            <BookOpen className="w-5 h-5 text-[hsl(262,83%,58%)]" />
            <span>Tài liệu AeroEduVision</span>
          </Link>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-auto md:hidden px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-accent"
          >
            {mobileOpen ? 'Đóng' : 'Mục lục'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 px-4 py-6">
        {/* Sidebar TOC */}
        <aside
          className={cn(
            'md:w-64 flex-shrink-0',
            mobileOpen ? 'block' : 'hidden md:block',
          )}
        >
          <nav className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
            {CATEGORY_ORDER.map((cat) => {
              const items = ARTICLES.filter((a) => a.category === cat)
              if (items.length === 0) return null
              return (
                <div key={cat} className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-2">
                    {CATEGORY_LABELS[cat]}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((a) => (
                      <li key={a.slug}>
                        <NavLink
                          to={`/docs/${a.slug}`}
                          end
                          className={({ isActive }) =>
                            cn(
                              'block px-2 py-1.5 rounded-md text-sm transition-colors',
                              isActive
                                ? 'bg-[hsl(262,83%,58%)]/10 text-[hsl(262,83%,58%)] font-medium'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                            )
                          }
                          onClick={() => setMobileOpen(false)}
                        >
                          {a.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            <div className="pt-3 mt-3 border-t border-border text-[11px] text-muted-foreground px-2">
              {ARTICLES.length} bài · Cập nhật {new Date().getFullYear()}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <article className="max-w-3xl">
            {children}
          </article>
        </main>
      </div>
    </div>
  )
}

export default DocsLayout
