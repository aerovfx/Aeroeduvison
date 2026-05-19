/**
 * TeacherHelpDrawer — Drawer slide-in từ phải, chứa hướng dẫn module.
 *
 * UX:
 *   - Mở bằng floating button (HelpFAB) hoặc gọi trực tiếp open prop
 *   - Mobile: full screen drawer
 *   - Desktop (≥sm): drawer 420px slide từ phải
 *   - Có search bar global (tìm khắp tất cả modules)
 *   - Esc / click backdrop để đóng
 *   - Body scroll lock khi mở
 *
 * Cách dùng:
 *   1. Mặc định (FAB tự động):
 *      <TeacherHelpDrawer moduleKey="taodethi" />
 *
 *   2. Controlled (mở/đóng bên ngoài):
 *      const [open, setOpen] = useState(false)
 *      <TeacherHelpDrawer moduleKey="taodethi" open={open} onOpenChange={setOpen} />
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, BookOpen, Search, Lightbulb, ArrowRight, HelpCircle } from 'lucide-react'
import { getHelpEntry, searchHelp, type HelpEntry } from '@/lib/teacher-help-content'

interface TeacherHelpDrawerProps {
  moduleKey: string
  /** Controlled mode — nếu pass thì component KHÔNG tự render FAB */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Hide floating button (khi đã có custom trigger từ ngoài) */
  hideFab?: boolean
}

export function TeacherHelpDrawer({
  moduleKey,
  open: controlledOpen,
  onOpenChange,
  hideFab = false,
}: TeacherHelpDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const entry = getHelpEntry(moduleKey)
  const searchResults = useMemo(
    () => searchQuery.trim() ? searchHelp(searchQuery) : [],
    [searchQuery]
  )

  // Body scroll lock + Esc to close
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <>
      {/* Floating action button — auto-show trừ khi hideFab */}
      {!isControlled && !hideFab && !isOpen && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở hướng dẫn sử dụng"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <BookOpen className="w-5 h-5" strokeWidth={2.25} />
          <span className="hidden sm:inline font-semibold text-sm">Hướng dẫn</span>
        </button>
      )}

      {/* Drawer */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex animate-in fade-in duration-200"
          aria-modal="true"
          role="dialog"
          aria-labelledby="help-drawer-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel — full width mobile, 420px desktop */}
          <aside
            className="relative ml-auto h-full w-full sm:max-w-md bg-card border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
          >
            {/* Header */}
            <header className="flex items-center gap-3 px-5 py-4 border-b bg-muted/30">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow">
                <BookOpen className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="help-drawer-title" className="font-bold text-foreground text-base truncate">
                  Hướng dẫn sử dụng
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {entry?.title || 'Module này chưa có nội dung'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng"
                className="p-2 -m-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Search bar */}
            <div className="px-5 py-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm trong toàn bộ hướng dẫn…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            {/* Body — content scrollable */}
            <div
              className="flex-1 overflow-y-auto p-5 space-y-5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {searchQuery.trim() ? (
                <SearchResults
                  results={searchResults}
                  query={searchQuery}
                  onPick={() => setSearchQuery('')}
                />
              ) : entry ? (
                <ModuleHelp entry={entry} />
              ) : (
                <EmptyState moduleKey={moduleKey} />
              )}
            </div>

            {/* Footer */}
            <footer className="px-5 py-3 border-t bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">
                Còn thắc mắc? Liên hệ{' '}
                <a href="mailto:support@inphysic.com" className="text-purple-600 dark:text-purple-400 font-medium hover:underline">
                  support@inphysic.com
                </a>
              </p>
            </footer>
          </aside>
        </div>,
        document.body
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────

function ModuleHelp({ entry }: { entry: HelpEntry }) {
  return (
    <div className="space-y-5">
      {/* Summary card */}
      <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 p-4">
        <h3 className="font-bold text-foreground text-base mb-1.5">{entry.title}</h3>
        <p className="text-sm text-foreground/85 leading-relaxed">{entry.summary}</p>
      </div>

      {/* Sections */}
      {entry.sections.map((s, i) => (
        <section key={i} className="space-y-2">
          <h4 className="flex items-center gap-2 font-bold text-foreground text-sm">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-black">
              {i + 1}
            </span>
            {s.heading}
          </h4>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line pl-8">
            {s.content}
          </p>
          {s.tip && (
            <div className="ml-8 mt-2 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong className="font-semibold">Mẹo:</strong> {s.tip}
              </p>
            </div>
          )}
        </section>
      ))}

      {/* Tooltip preview */}
      {Object.keys(entry.tooltips).length > 0 && (
        <section className="pt-3 border-t">
          <h4 className="flex items-center gap-2 font-bold text-foreground text-sm mb-3">
            <HelpCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Tooltip giải nghĩa nhanh
          </h4>
          <dl className="space-y-2">
            {Object.entries(entry.tooltips).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-muted/50 p-3">
                <dt className="font-mono text-xs text-purple-700 dark:text-purple-300 mb-1">
                  {k}
                </dt>
                <dd className="text-sm text-foreground/85 leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}

function SearchResults({
  results,
  query,
  onPick,
}: {
  results: ReturnType<typeof searchHelp>
  query: string
  onPick: () => void
}) {
  if (results.length === 0) {
    return (
      <div className="text-center py-10">
        <Search className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-sm text-foreground/85 font-medium mb-1">
          Không tìm thấy "{query}"
        </p>
        <p className="text-xs text-muted-foreground">
          Thử từ khoá khác hoặc bỏ search để xem hướng dẫn module hiện tại.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Tìm thấy {results.length} kết quả cho "{query}":
      </p>
      {results.map(({ moduleKey, entry }) => (
        <button
          key={moduleKey}
          onClick={onPick}
          className="w-full text-left p-4 rounded-xl bg-card border hover:border-purple-500/40 hover:bg-accent/30 transition-all group"
        >
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground text-sm mb-1">{entry.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {entry.summary}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </button>
      ))}
    </div>
  )
}

function EmptyState({ moduleKey }: { moduleKey: string }) {
  return (
    <div className="text-center py-10">
      <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm text-foreground font-medium mb-1">
        Chưa có hướng dẫn cho module này
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Module key: <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/85">{moduleKey}</code>
      </p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
        Thêm content tại{' '}
        <code className="px-1.5 py-0.5 rounded bg-muted text-foreground/85">src/lib/teacher-help-content.ts</code>
      </p>
    </div>
  )
}

export default TeacherHelpDrawer
