/**
 * UserDetailModal — Admin xem chi tiết người dùng + thực hiện hành động.
 *
 * Hiển thị:
 *   - Avatar lớn + tên + email + role badges
 *   - Thông tin tài khoản: joined, last login, email verified, 2FA, banned
 *   - Hồ sơ: bio, careerSurvey (nếu có), skills
 *   - Hoạt động gần đây (LessonHistory)
 *   - Hành động: Khoá / Bỏ khoá / Đặt lại mật khẩu / Đổi vai trò / Xoá
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createPortal } from 'react-dom'
import {
  X, GraduationCap, Briefcase, Heart, Shield, ShieldCheck, Lock, Unlock,
  KeyRound, UserCog, Trash2, Calendar, Mail, Activity, BookOpen, AlertCircle,
  Check, Users as UsersIcon, Compass,
} from 'lucide-react'
import { adminUsersService, type AdminUser, type AccountType, type AdminUserDetail } from '@/services/adminUsers.service'

interface Props {
  userId: string
  currentUserId?: string
  onClose: () => void
  onBan: (u: AdminUser) => void
  onUnban: (u: AdminUser) => void
  onResetPassword: (u: AdminUser) => void
  onChangeRole: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
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

function initials(name: string | null, email: string) {
  const src = (name || email || '?').trim()
  const parts = src.split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return src.slice(0, 2).toUpperCase()
}

function avatarColor(seed: string) {
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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

function CareerSummary({ survey }: { survey: unknown }) {
  if (!survey || typeof survey !== 'object') return null
  const s = survey as Record<string, unknown>
  const careers = Array.isArray(s.selectedCareers) ? s.selectedCareers as string[]
                : Array.isArray(s.careers) ? s.careers as string[]
                : (typeof s.selectedCareer === 'string' ? [s.selectedCareer as string] : [])
  const skills = Array.isArray(s.skills) ? s.skills as Array<string | { name?: string }> : []
  const interests = Array.isArray(s.interests) ? s.interests as string[] : []
  if (careers.length === 0 && skills.length === 0 && interests.length === 0) return null
  return (
    <section className="bg-secondary/40 border border-border rounded-xl p-4">
      <h4 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-1.5">
        <Compass className="w-4 h-4 text-[hsl(262,83%,58%)]" />
        Khảo sát nghề nghiệp
      </h4>
      {careers.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Nghề quan tâm</div>
          <div className="flex flex-wrap gap-1.5">
            {careers.map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-[hsl(262,83%,58%)]/15 border border-[hsl(262,83%,58%)]/30 text-[hsl(262,83%,58%)]">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {skills.length > 0 && (
        <div className="mb-2">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Kỹ năng ({skills.length})</div>
          <div className="text-xs text-foreground">
            {skills.slice(0, 8).map((s, i) => (
              <span key={i} className="inline-block mr-1.5 mb-1 px-1.5 py-0.5 rounded bg-secondary border border-border">
                {typeof s === 'string' ? s : s?.name || '?'}
              </span>
            ))}
            {skills.length > 8 && <span className="text-muted-foreground">… +{skills.length - 8}</span>}
          </div>
        </div>
      )}
      {interests.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Sở thích</div>
          <div className="text-xs text-foreground">{interests.join(', ')}</div>
        </div>
      )}
    </section>
  )
}

export function UserDetailModal({
  userId, currentUserId, onClose,
  onBan, onUnban, onResetPassword, onChangeRole, onDelete,
}: Props) {
  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Lock scroll on body
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin-user-detail', userId],
    queryFn: () => adminUsersService.get(userId),
    enabled: !!userId,
    refetchOnWindowFocus: false,
  })

  const isSelf = currentUserId === userId

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur">
          <h2 className="text-lg font-bold text-foreground inline-flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[hsl(262,83%,58%)]" />
            Chi tiết người dùng
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Đang tải chi tiết…</div>
        ) : error || !user ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <p className="text-foreground font-semibold">Không tải được thông tin</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Vui lòng thử lại sau.'}
            </p>
          </div>
        ) : (
          <UserContent
            user={user}
            isSelf={isSelf}
            onBan={onBan}
            onUnban={onUnban}
            onResetPassword={onResetPassword}
            onChangeRole={onChangeRole}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function UserContent({
  user, isSelf,
  onBan, onUnban, onResetPassword, onChangeRole, onDelete,
}: {
  user: AdminUserDetail
  isSelf: boolean
  onBan: (u: AdminUser) => void
  onUnban: (u: AdminUser) => void
  onResetPassword: (u: AdminUser) => void
  onChangeRole: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
}) {
  const at = accountTypeLabel(user.accountType)
  const ATIcon = at.Icon

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Hero: avatar + name + badges */}
      <div className="flex items-start gap-4">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover border-2 border-border shadow-lg"
          />
        ) : (
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarColor(user.id)} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-2 border-white/10`}>
            {initials(user.name, user.email)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground truncate flex items-center gap-2">
            {user.name || '(chưa đặt tên)'}
            {isSelf && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Bạn
              </span>
            )}
          </h3>
          <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-0.5 truncate">
            <Mail className="w-3.5 h-3.5" />
            {user.email}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md border ${at.color}`}>
              <ATIcon className="w-3.5 h-3.5" />
              {at.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-muted/50 border border-border text-muted-foreground uppercase tracking-wide">
              role: {user.role}
            </span>
            {user.banned ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-300">
                <Lock className="w-3 h-3" /> Bị khoá
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <Check className="w-3 h-3" /> Active
              </span>
            )}
            {user.twoFactorEnabled && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300">
                <ShieldCheck className="w-3 h-3" /> 2FA
              </span>
            )}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-violet-500/15 border border-violet-500/30 text-violet-300">
                <Check className="w-3 h-3" /> Email xác thực
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <AlertCircle className="w-3 h-3" /> Email chưa xác thực
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banned banner */}
      {user.banned && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-sm">
          <Lock className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
          <div className="text-red-200">
            <div className="font-semibold">Tài khoản đang bị khoá</div>
            <div className="text-xs text-red-200/80 mt-0.5">
              Lý do: <em>{user.bannedReason || 'không ghi'}</em>
              {user.bannedAt && ` · từ ${formatDate(user.bannedAt)}`}
            </div>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <InfoCell Icon={Calendar} label="Tham gia" value={formatDate(user.createdAt)} />
        <InfoCell Icon={Activity} label="Đăng nhập cuối" value={user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Chưa từng'} />
        <InfoCell Icon={ShieldCheck} label="2FA" value={user.twoFactorEnabled ? 'Đã bật' : 'Tắt'} />
        {user.dateOfBirth && (
          <InfoCell Icon={Calendar} label="Sinh nhật" value={formatDate(user.dateOfBirth)} />
        )}
        {user.gender && <InfoCell Icon={UsersIcon} label="Giới tính" value={user.gender} />}
        {user.lastLoginIp && <InfoCell Icon={Compass} label="IP cuối" value={user.lastLoginIp} mono />}
      </div>

      {/* Bio */}
      {user.profile?.bio && (
        <section className="bg-secondary/40 border border-border rounded-xl p-4">
          <h4 className="text-sm font-semibold text-foreground mb-1.5">Giới thiệu</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.profile.bio}</p>
        </section>
      )}

      {/* Career survey */}
      <CareerSummary survey={user.careerSurvey} />

      {/* Recent activity */}
      {Array.isArray(user.recentActivity) && user.recentActivity.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[hsl(262,83%,58%)]" />
            Hoạt động gần đây
          </h4>
          <ul className="space-y-1.5">
            {user.recentActivity.slice(0, 10).map((ev) => (
              <li key={ev.id} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-secondary/40 border border-border">
                <span className="inline-block px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono uppercase tracking-wide text-[10px] shrink-0">
                  {ev.action}
                </span>
                <span className="text-foreground flex-1 truncate">{ev.title || '(không tiêu đề)'}</span>
                <span className="text-muted-foreground shrink-0">{formatDate(ev.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action buttons */}
      <div className="border-t border-border pt-4 flex flex-wrap gap-2">
        <ActionBtn
          Icon={UserCog}
          label="Đổi vai trò"
          onClick={() => onChangeRole(user)}
          disabled={isSelf}
        />
        <ActionBtn
          Icon={KeyRound}
          label="Đặt lại mật khẩu"
          onClick={() => onResetPassword(user)}
        />
        {user.banned ? (
          <ActionBtn
            Icon={Unlock}
            label="Bỏ khoá"
            tone="success"
            onClick={() => onUnban(user)}
          />
        ) : (
          <ActionBtn
            Icon={Lock}
            label="Khoá tài khoản"
            tone="warning"
            onClick={() => onBan(user)}
            disabled={isSelf}
          />
        )}
        <ActionBtn
          Icon={Trash2}
          label="Xoá tài khoản"
          tone="danger"
          onClick={() => onDelete(user)}
          disabled={isSelf}
        />
      </div>
    </div>
  )
}

function InfoCell({
  Icon, label, value, mono,
}: {
  Icon: typeof UsersIcon
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5 inline-flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`text-sm text-foreground truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</div>
    </div>
  )
}

function ActionBtn({
  Icon, label, onClick, disabled, tone,
}: {
  Icon: typeof UsersIcon
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'success' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'danger' ? 'bg-red-500/15 border-red-500/30 text-red-300 hover:bg-red-500/25'
    : tone === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
    : tone === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
    : 'bg-secondary border-border text-foreground hover:bg-secondary/80'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
