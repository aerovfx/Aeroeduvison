/**
 * Navbar — port từ app/(dashboard)/layout.tsx
 * Thay useRouter (next/navigation) → useNavigate (react-router-dom)
 * Thay useSession() → useAuth()
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Brain, Search, ArrowRight, LogOut, Settings, User, Bell, CheckCheck, FileText, UserPlus, UserCheck, UserX, Menu, Palette, Eye, RefreshCw, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguagePicker } from '@/components/ui/LanguagePicker'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { notificationsService, type Notification } from '@/services/notifications.service'

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
export function Navbar({ onMenuClick }: { onMenuClick?: () => void } = {}) {
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
        {/* Hamburger — only on mobile (lg và trên đã thấy sidebar) */}
        <button
          onClick={onMenuClick}
          aria-label="Mở menu"
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors text-foreground/70 hover:text-foreground"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo (mobile — ẩn khi đã có hamburger) */}
        <Brain className="w-5 h-5 text-[hsl(262,83%,58%)] hidden" />

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
          <NotificationBell />


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
                    {user?.id && (
                      <Link
                        to={`/u/${user.id}`}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                      >
                        <Eye className="w-4 h-4" />
                        Trang cá nhân công khai
                      </Link>
                    )}
                    <Link
                      to="/profile/customize"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                    >
                      <Palette className="w-4 h-4" />
                      Tùy chỉnh trang cá nhân
                    </Link>
                    <Link
                      to="/profile/security"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                    >
                      <Lock className="w-4 h-4" />
                      Bảo mật & 2FA
                    </Link>
                    {/* Làm lại khảo sát — chỉ hiển thị cho TEACHER/PARENT/ADMIN
                        (STUDENT không cần khảo sát nghề) */}
                    {user?.role !== 'STUDENT' && (
                      <Link
                        to="/profile/career-survey?retake=1"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Làm lại khảo sát nghề
                      </Link>
                    )}
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

// ─── NotificationBell ──────────────────────────────────────────────────────
// Polling 30s khi mounted. Click → dropdown 20 latest. Click 1 thông báo →
// mark read + navigate tới link (vd /student/assignments?focus=<id>).
function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()

  const fetchList = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const r = await notificationsService.list({ limit: 20 })
      setList(r.notifications)
      setUnread(r.unreadCount)
    } catch { /* silent — bell không cần spam toast */ }
  }, [isAuthenticated])

  // Initial + poll mỗi 30s khi tab visible + refetch instant khi tab
  // chuyển từ hidden → visible (user quay lại từ tab khác → thấy ngay
  // notification mới, không phải đợi tới chu kỳ poll tiếp theo).
  useEffect(() => {
    fetchList()
    if (!isAuthenticated) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchList()
    }, 30_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchList()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchList, isAuthenticated])

  const handleClickItem = async (n: Notification) => {
    setOpen(false)
    if (!n.read) {
      try {
        await notificationsService.markRead(n.id)
        setList(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
        setUnread(u => Math.max(0, u - 1))
      } catch {}
    }
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = async () => {
    setLoading(true)
    try {
      const r = await notificationsService.markAllRead()
      if (r.marked > 0) {
        setList(prev => prev.map(x => ({ ...x, read: true })))
        setUnread(0)
      }
    } catch {} finally { setLoading(false) }
  }

  if (!isAuthenticated) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Thông báo"
        className="relative p-2 rounded-lg hover:bg-accent transition text-muted-foreground hover:text-foreground"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-80 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden animate-fade-in">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Thông báo</p>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={loading}
                  className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1 disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {list.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Chưa có thông báo nào.
                </div>
              ) : (
                list.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleClickItem(n)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-accent transition flex gap-3',
                      !n.read && 'bg-purple-500/5'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      n.type === 'assignment'    ? 'bg-blue-500/20 text-blue-500' :
                      n.type === 'link_request'  ? 'bg-yellow-500/20 text-yellow-500' :
                      n.type === 'link_approved' ? 'bg-emerald-500/20 text-emerald-500' :
                      n.type === 'link_rejected' ? 'bg-red-500/20 text-red-500' :
                      'bg-gray-500/20 text-gray-500'
                    )}>
                      {n.type === 'assignment'    ? <FileText className="w-4 h-4" /> :
                       n.type === 'link_request'  ? <UserPlus className="w-4 h-4" /> :
                       n.type === 'link_approved' ? <UserCheck className="w-4 h-4" /> :
                       n.type === 'link_rejected' ? <UserX className="w-4 h-4" /> :
                       <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm truncate', !n.read ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
