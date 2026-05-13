/**
 * Navbar — port từ app/(dashboard)/layout.tsx
 * Thay useRouter (next/navigation) → useNavigate (react-router-dom)
 * Thay useSession() → useAuth()
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Brain, Search, ArrowRight, LogOut, Settings, User, Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguagePicker } from '@/components/ui/LanguagePicker'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

// Quick-navigate routes cho Command Palette
const quickRoutes = [
  { label: 'Dashboard', href: '/dashboard', section: 'Overview' },
  { label: 'Analytics', href: '/dashboard/analytics', section: 'Overview' },
  { label: 'Achievements', href: '/dashboard/achievements', section: 'Overview' },
  { label: 'Gia Sư AI', href: '/ai-tutor', section: 'Learning' },
  { label: 'Learning Path', href: '/learning-paths', section: 'Learning' },
  { label: 'LabTwin', href: '/dashboard/labtwin', section: 'Labs & Tools' },
  { label: 'STEM Projects', href: '/dashboard/stem', section: 'Labs & Tools' },
  { label: 'Ma trận đề', href: '/teacher/exam-matrix', section: 'Teacher' },
  { label: 'Ngân hàng câu hỏi', href: '/teacher/question-bank', section: 'Teacher' },
  { label: 'Admin Dashboard', href: '/admin/overview', section: 'Admin' },
]

// ─── Command Palette ──────────────────────────────────────────────────────────
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { t } = useLanguage()

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = query
    ? quickRoutes.filter(
        (r) =>
          r.label.toLowerCase().includes(query.toLowerCase()) ||
          r.section.toLowerCase().includes(query.toLowerCase()),
      )
    : quickRoutes.slice(0, 6)

  const handleSelect = (href: string) => {
    navigate(href)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">{t('noResults')}</p>
          ) : (
            filtered.map((route) => (
              <button
                key={route.href}
                onClick={() => handleSelect(route.href)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent text-sm text-left transition"
              >
                <span className="font-medium text-foreground">{route.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{route.section}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export function Navbar() {
  const [cmdOpen, setCmdOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  // Cmd+K / Ctrl+K → mở Command Palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((o) => !o)
      }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/auth/login')
  }, [logout, navigate])

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <>
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3">
        {/* Logo area (mobile) */}
        <Brain className="w-5 h-5 text-[hsl(262,83%,58%)] md:hidden" />

        {/* Search bar / Command Palette trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:text-foreground transition w-64"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{t('search')}</span>
          <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
        </button>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Language picker */}
          <LanguagePicker />

          {/* Notifications */}
          <button
            aria-label={t('notifications')}
            className="relative p-2 rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(262,83%,58%)]" />
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user?.image ? (
                  <img src={user.image} alt={user.name || ''} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="text-sm font-medium text-foreground hidden sm:block max-w-28 truncate">
                {user?.name || user?.email}
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-[190]" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden animate-fade-in">
                  <div className="px-3 py-2.5 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/profile/basic-information"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                    >
                      <User className="w-4 h-4" />
                      {t('profile')}
                    </Link>
                    <Link
                      to="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                    >
                      <Settings className="w-4 h-4" />
                      {t('settings')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
