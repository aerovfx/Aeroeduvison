/**
 * Admin Users hub — quản lý HS / GV / PH / Admin tập trung.
 *
 * Tabs: Tất cả / Học sinh / Giáo viên / Phụ huynh / Admin
 * - Tìm kiếm tên/email (debounce 300ms)
 * - Lọc theo trạng thái (active / banned)
 * - Sắp xếp (mới nhất / cũ nhất / tên A-Z / lần cuối)
 * - Pagination 50/trang
 * - Actions: Xem chi tiết, đổi vai trò, đặt lại mật khẩu, khoá, bỏ khoá, xoá
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Users as UsersIcon, GraduationCap, Heart, Shield, Briefcase,
  Search, MoreVertical, Eye, KeyRound, Lock, Unlock, Trash2,
  Check, X, AlertCircle, Calendar, ChevronLeft, ChevronRight,
  Activity, ShieldCheck, UserCog, Sparkles,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import {
  adminUsersService,
  getRoleAndAccountType,
  type AdminUser,
  type AccountType,
  type ListUsersParams,
} from '@/services/adminUsers.service'
import { UserDetailModal } from '@/components/admin/UserDetailModal'

/* ──────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────── */

function initials(name: string | null, email: string) {
  const src = (name || email || '?').trim()
  const parts = src.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function avatarColor(seed: string) {
  // Stable color per user id
  const colors = [
    'from-purple-500 to-indigo-500',
    'from-rose-500 to-pink-500',
    'from-amber-500 to-orange-500',
    'from-emerald-500 to-teal-500',
    'from-sky-500 to-cyan-500',
    'from-violet-500 to-fuchsia-500',
    'from-lime-500 to-green-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  const day = 24 * 3600_000
  if (diff < 60_000) return 'vừa xong'
  if (diff < 3600_000) return `${Math.round(diff / 60_000)} phút trước`
  if (diff < day) return `${Math.round(diff / 3600_000)} giờ trước`
  if (diff < 30 * day) return `${Math.round(diff / day)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function accountTypeLabel(t: AccountType): { label: string; color: string; Icon: typeof UsersIcon } {
  switch (t) {
    case 'STUDENT': return { label: 'Học sinh', color: 'bg-sky-500/15 border-sky-500/30 text-sky-300', Icon: GraduationCap }
    case 'TEACHER': return { label: 'Giáo viên', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300', Icon: Briefcase }
    case 'PARENT':  return { label: 'Phụ huynh', color: 'bg-rose-500/15 border-rose-500/30 text-rose-300', Icon: Heart }
    case 'ADMIN':   return { label: 'Admin',     color: 'bg-amber-500/15 border-amber-500/30 text-amber-300', Icon: Shield }
    default:        return { label: '—',         color: 'bg-muted text-muted-foreground', Icon: UsersIcon }
  }
}

/* ──────────────────────────────────────────────
   Page
─────────────────────────────────────────────── */

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const currentUser = useCurrentUser()

  const [activeTab, setActiveTab] = useState<'ALL' | AccountType>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [sortKey, setSortKey] = useState<'createdAt-desc' | 'createdAt-asc' | 'name-asc' | 'name-desc' | 'lastLoginAt-desc'>('createdAt-desc')
  const [page, setPage] = useState(1)
  const limit = 50

  const [detailUserId, setDetailUserId] = useState<string | null>(null)
  const [actionMenuFor, setActionMenuFor] = useState<string | null>(null)

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [activeTab, statusFilter, sortKey])

  // Close menu when clicking outside
  const tableRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!tableRef.current?.contains(e.target as Node)) setActionMenuFor(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const queryParams: ListUsersParams = useMemo(() => {
    const [sortBy, sortOrder] = sortKey.split('-') as [ListUsersParams['sortBy'], 'asc' | 'desc']
    return {
      accountType: activeTab === 'ALL' ? undefined : activeTab,
      search: debouncedSearch || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
      sortBy, sortOrder,
      page, limit,
    }
  }, [activeTab, debouncedSearch, statusFilter, sortKey, page])

  // ── Data ──
  const { data: stats } = useQuery({
    queryKey: ['admin-users-stats'],
    queryFn: () => adminUsersService.stats(),
    refetchOnWindowFocus: false,
  })

  const { data: listData, isLoading } = useQuery({
    queryKey: ['admin-users-list', queryParams],
    queryFn: () => adminUsersService.list(queryParams),
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  })

  const users = listData?.users || []
  const total = listData?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['admin-users-list'] })
    qc.invalidateQueries({ queryKey: ['admin-users-stats'] })
    qc.invalidateQueries({ queryKey: ['admin-user-detail'] })
  }

  // ── Mutations ──
  const banMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminUsersService.ban(id, reason),
    onSuccess: () => { toast.success('Đã khoá tài khoản'); invalidate() },
    onError: (e: Error) => toast.error(`Khoá thất bại: ${e.message}`),
  })

  const unbanMut = useMutation({
    mutationFn: (id: string) => adminUsersService.unban(id),
    onSuccess: () => { toast.success('Đã bỏ khoá tài khoản'); invalidate() },
    onError: (e: Error) => toast.error(`Bỏ khoá thất bại: ${e.message}`),
  })

  const resetPwdMut = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) => adminUsersService.resetPassword(id, pwd),
    onSuccess: () => toast.success('Đã đặt lại mật khẩu'),
    onError: (e: Error) => toast.error(`Đặt lại mật khẩu thất bại: ${e.message}`),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminUsersService.update>[1] }) => adminUsersService.update(id, data),
    onSuccess: () => { toast.success('Đã cập nhật'); invalidate() },
    onError: (e: Error) => toast.error(`Cập nhật thất bại: ${e.message}`),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminUsersService.delete(id),
    onSuccess: () => { toast.success('Đã xoá tài khoản'); invalidate() },
    onError: (e: Error) => toast.error(`Xoá thất bại: ${e.message}`),
  })

  // ── Action handlers ──
  function handleBan(u: AdminUser) {
    const reason = window.prompt(`Nhập lý do khoá tài khoản "${u.name || u.email}":`, 'Spam / vi phạm nội quy')
    if (!reason || !reason.trim()) return
    banMut.mutate({ id: u.id, reason: reason.trim() })
    setActionMenuFor(null)
  }

  function handleResetPwd(u: AdminUser) {
    const pwd = window.prompt(`Nhập mật khẩu MỚI cho "${u.name || u.email}" (≥ 8 ký tự):`, '')
    if (!pwd || pwd.length < 8) {
      if (pwd !== null) toast.error('Mật khẩu phải ≥ 8 ký tự')
      return
    }
    resetPwdMut.mutate({ id: u.id, pwd })
    setActionMenuFor(null)
  }

  function handleDelete(u: AdminUser) {
    const ok = window.confirm(`Xoá tài khoản "${u.name || u.email}"?\n\nTài khoản sẽ bị khoá vĩnh viễn (soft delete).\nKhông thể đăng nhập nữa nhưng dữ liệu vẫn còn để giữ tham chiếu.`)
    if (!ok) return
    deleteMut.mutate(u.id)
    setActionMenuFor(null)
  }

  function handleChangeRole(u: AdminUser) {
    // accountType (UI) — phân biệt PARENT (role=TEACHER+accountType=PARENT)
    // với GV thông thường.
    const currentUi: AccountType = u.accountType || (u.role as AccountType)
    const newRole = window.prompt(
      `Đổi vai trò cho "${u.name || u.email}"\nHiện tại: ${currentUi}\n\nNhập STUDENT / TEACHER / PARENT / ADMIN:`,
      currentUi,
    )
    if (!newRole) return
    const upper = newRole.toUpperCase() as AccountType
    if (!['STUDENT', 'TEACHER', 'PARENT', 'ADMIN'].includes(upper)) {
      toast.error('Vai trò không hợp lệ (chọn STUDENT / TEACHER / PARENT / ADMIN)')
      return
    }
    const { role, accountType } = getRoleAndAccountType(upper)
    updateMut.mutate({ id: u.id, data: { role, accountType } })
    setActionMenuFor(null)
  }

  // ── Tab config ──
  const tabs: { key: 'ALL' | AccountType; label: string; count: number; Icon: typeof UsersIcon; activeColor: string }[] = [
    { key: 'ALL',     label: 'Tất cả',    count: stats?.total ?? 0,    Icon: UsersIcon,     activeColor: 'from-purple-500 to-indigo-500' },
    { key: 'STUDENT', label: 'Học sinh',  count: stats?.students ?? 0, Icon: GraduationCap, activeColor: 'from-sky-500 to-cyan-500' },
    { key: 'TEACHER', label: 'Giáo viên', count: stats?.teachers ?? 0, Icon: Briefcase,     activeColor: 'from-emerald-500 to-teal-500' },
    { key: 'PARENT',  label: 'Phụ huynh', count: stats?.parents ?? 0,  Icon: Heart,         activeColor: 'from-rose-500 to-pink-500' },
    { key: 'ADMIN',   label: 'Admin',     count: stats?.admins ?? 0,   Icon: Shield,        activeColor: 'from-amber-500 to-orange-500' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <UserCog className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Tổng cộng {stats?.total ?? 0} người dùng
            {(stats?.twoFactorEnabledCount ?? 0) > 0 && ` · ${stats?.twoFactorEnabledCount} bật 2FA`}
            {(stats?.bannedCount ?? 0) > 0 && ` · ${stats?.bannedCount} bị khoá`}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Tổng cộng"
          value={stats?.total ?? 0}
          subtitle={(stats?.newThisMonth ?? 0) > 0 ? `+${stats?.newThisMonth} tháng này` : 'Chưa có người mới'}
          Icon={UsersIcon}
          color="from-purple-500 to-indigo-500"
        />
        <StatCard
          title="Hoạt động 7 ngày"
          value={stats?.activeLast7d ?? 0}
          subtitle="Đăng nhập gần đây"
          Icon={Activity}
          color="from-emerald-500 to-teal-500"
        />
        <StatCard
          title="Đã bật 2FA"
          value={stats?.twoFactorEnabledCount ?? 0}
          subtitle="Bảo mật cao"
          Icon={ShieldCheck}
          color="from-sky-500 to-cyan-500"
        />
        <StatCard
          title="Bị khoá"
          value={stats?.bannedCount ?? 0}
          subtitle="Cần xem xét"
          Icon={Lock}
          color="from-rose-500 to-pink-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => {
          const active = activeTab === t.key
          const Icon = t.Icon
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                active
                  ? `border-transparent bg-gradient-to-r ${t.activeColor} text-white shadow-md`
                  : 'border-border bg-card text-foreground hover:border-border/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              <span
                className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                  active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="bg-card border border-border rounded-2xl p-3 sm:p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(262,83%,58%)]/30 focus:border-[hsl(262,83%,58%)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(262,83%,58%)]/30"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="banned">Bị khoá</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
          className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(262,83%,58%)]/30"
        >
          <option value="createdAt-desc">Mới nhất</option>
          <option value="createdAt-asc">Cũ nhất</option>
          <option value="name-asc">Tên A → Z</option>
          <option value="name-desc">Tên Z → A</option>
          <option value="lastLoginAt-desc">Lần cuối đăng nhập</option>
        </select>
      </div>

      {/* Table */}
      <div ref={tableRef} className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Đang tải…</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UsersIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Không có người dùng nào khớp</p>
            <p className="text-sm text-muted-foreground mt-1">Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Người dùng</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Vai trò</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Trạng thái</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Tạo lúc</th>
                  <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Lần cuối</th>
                  <th className="text-right px-4 py-3 font-medium w-16">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const at = accountTypeLabel(u.accountType)
                  const ATIcon = at.Icon
                  const isSelf = currentUser?.id === u.id
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border/60 last:border-b-0 hover:bg-secondary/40 transition-colors"
                    >
                      {/* User cell */}
                      <td className="px-4 py-3">
                        <button
                          className="flex items-center gap-3 text-left group/u"
                          onClick={() => setDetailUserId(u.id)}
                        >
                          {u.image ? (
                            <img
                              src={u.image}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(u.id)} flex items-center justify-center text-white text-xs font-bold border border-white/10`}>
                              {initials(u.name, u.email)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate group-hover/u:text-[hsl(262,83%,58%)] transition-colors">
                              {u.name || '(chưa đặt tên)'}
                              {isSelf && (
                                <span className="ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                          </div>
                        </button>
                      </td>

                      {/* Role badge */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border ${at.color}`}>
                          <ATIcon className="w-3 h-3" />
                          {at.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {u.banned ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-300">
                              <Lock className="w-3 h-3" />
                              Bị khoá
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          )}
                          {u.twoFactorEnabled && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300" title="Đã bật xác thực 2 lớp">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              2FA
                            </span>
                          )}
                          {!u.emailVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300" title="Email chưa xác thực">
                              <AlertCircle className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {relativeTime(u.createdAt)}
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="text-xs text-muted-foreground">
                          {u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Chưa đăng nhập'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setActionMenuFor((prev) => (prev === u.id ? null : u.id))
                          }}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title="Hành động"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenuFor === u.id && (
                          <div className="absolute right-3 top-10 z-20 w-52 bg-popover border border-border rounded-xl shadow-2xl p-1.5 text-sm">
                            <MenuItem Icon={Eye} label="Xem chi tiết" onClick={() => { setDetailUserId(u.id); setActionMenuFor(null) }} />
                            <MenuItem Icon={UserCog} label="Đổi vai trò" onClick={() => handleChangeRole(u)} disabled={isSelf} />
                            <MenuItem Icon={KeyRound} label="Đặt lại mật khẩu" onClick={() => handleResetPwd(u)} />
                            {u.banned ? (
                              <MenuItem
                                Icon={Unlock}
                                label="Bỏ khoá tài khoản"
                                onClick={() => { unbanMut.mutate(u.id); setActionMenuFor(null) }}
                                tone="success"
                              />
                            ) : (
                              <MenuItem
                                Icon={Lock}
                                label="Khoá tài khoản"
                                onClick={() => handleBan(u)}
                                disabled={isSelf}
                                tone="warning"
                              />
                            )}
                            <div className="h-px bg-border my-1" />
                            <MenuItem
                              Icon={Trash2}
                              label="Xoá tài khoản"
                              onClick={() => handleDelete(u)}
                              disabled={isSelf}
                              tone="danger"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/30 text-xs text-muted-foreground">
            <div>
              Hiển thị <span className="font-semibold text-foreground">{(page - 1) * limit + 1}</span>–
              <span className="font-semibold text-foreground">{Math.min(page * limit, total)}</span> /{' '}
              <span className="font-semibold text-foreground">{total}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onBan={handleBan}
          onUnban={(u) => unbanMut.mutate(u.id)}
          onResetPassword={handleResetPwd}
          onChangeRole={handleChangeRole}
          onDelete={handleDelete}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────
   Sub-components
─────────────────────────────────────────────── */

function StatCard({
  title, value, subtitle, Icon, color,
}: {
  title: string
  value: number
  subtitle: string
  Icon: typeof UsersIcon
  color: string
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{title}</div>
        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value.toLocaleString('vi-VN')}</div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        {subtitle}
      </div>
    </div>
  )
}

function MenuItem({
  Icon, label, onClick, disabled, tone,
}: {
  Icon: typeof UsersIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'success' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'danger' ? 'text-red-300 hover:bg-red-500/15'
    : tone === 'warning' ? 'text-amber-300 hover:bg-amber-500/15'
    : tone === 'success' ? 'text-emerald-300 hover:bg-emerald-500/15'
    : 'text-foreground hover:bg-secondary'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {disabled && <X className="w-3 h-3 ml-auto opacity-60" />}
    </button>
  )
}
