/**
 * PublicProfile — Trang cá nhân công khai
 * Route: /u/:userId
 *
 * Hiển thị: hero banner, avatar + frame, bio markdown, stats (HS/GV),
 * skills, social links, achievements gallery, showcase items.
 *
 * Yêu cầu đăng nhập để xem (anti-scrape). Visibility do chủ profile
 * kiểm soát qua /profile/customize.
 */
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  User, Edit3, Trophy, Award, Code, Sparkles, BookOpen, Users, Calendar,
  Facebook, Youtube, Github, Globe, Star, GraduationCap, Flame,
} from 'lucide-react'
import { userProfileService } from '@/services/userProfile.service'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type {
  BannerStyle, AvatarFrame, ThemeColor,
  StudentProfileStats, TeacherProfileStats,
} from '@/types/profile'

// ── Theme color helpers ─────────────────────────────────────
const THEME_RING: Record<ThemeColor, string> = {
  purple: 'ring-purple-500/40 text-purple-300 bg-purple-500/10',
  blue:   'ring-blue-500/40 text-blue-300 bg-blue-500/10',
  green:  'ring-green-500/40 text-green-300 bg-green-500/10',
  red:    'ring-red-500/40 text-red-300 bg-red-500/10',
  pink:   'ring-pink-500/40 text-pink-300 bg-pink-500/10',
  amber:  'ring-amber-500/40 text-amber-300 bg-amber-500/10',
  cyan:   'ring-cyan-500/40 text-cyan-300 bg-cyan-500/10',
  slate:  'ring-slate-500/40 text-slate-300 bg-slate-500/10',
}
const THEME_ACCENT: Record<ThemeColor, string> = {
  purple: 'text-purple-400',
  blue:   'text-blue-400',
  green:  'text-green-400',
  red:    'text-red-400',
  pink:   'text-pink-400',
  amber:  'text-amber-400',
  cyan:   'text-cyan-400',
  slate:  'text-slate-400',
}

function bannerClass(style?: BannerStyle): string {
  if (!style || style === 'custom-image') return 'banner-gradient-purple'
  return `banner-${style}`
}
function frameClass(frame?: AvatarFrame): string {
  if (!frame || frame === 'none') return ''
  return `avatar-frame-${frame}`
}

function isTeacherStats(s: unknown): s is TeacherProfileStats {
  return !!s && typeof s === 'object' && 'coursesTaught' in (s as object)
}

// ── Stat card ────────────────────────────────────────────────
function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/[0.07] transition-colors">
      <div className={cn('mb-2', accent)}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

// ── Section wrapper ──────────────────────────────────────────
function Section({ title, icon, children }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

// ── Skeleton ─────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 sm:h-64 bg-white/10 rounded-2xl" />
      <div className="-mt-16 ml-6 w-32 h-32 rounded-full bg-white/10 border-4 border-[#0a0a0a]" />
      <div className="mt-4 ml-6 h-8 w-48 bg-white/10 rounded" />
      <div className="mt-2 ml-6 h-4 w-32 bg-white/10 rounded" />
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/10 rounded-xl" />)}
      </div>
    </div>
  )
}

export default function PublicProfile() {
  const { userId = '' } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const isOwner = currentUser?.id === userId

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => userProfileService.getProfile(userId),
    enabled: !!userId,
    staleTime: 60_000,
  })

  const themeColor: ThemeColor = (data?.profile?.themeColor as ThemeColor) || 'purple'
  const ringCls = THEME_RING[themeColor]
  const accentCls = THEME_ACCENT[themeColor]

  // Convert bio markdown → safe HTML (lightweight, không cần markdown lib)
  const bioHtml = useMemo(() => {
    const raw = data?.profile?.bio || ''
    if (!raw) return ''
    return raw
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>')
  }, [data?.profile?.bio])

  if (isLoading) {
    return <div className="p-6 lg:p-8 max-w-5xl mx-auto"><ProfileSkeleton /></div>
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 text-center">
          <div className="text-red-300 font-semibold mb-2">Không tải được trang cá nhân</div>
          <div className="text-sm text-gray-400">Người dùng này có thể không tồn tại hoặc bạn cần đăng nhập lại.</div>
        </div>
      </div>
    )
  }

  const { user, profile, stats, achievements } = data
  const bannerCls = bannerClass(profile?.bannerStyle as BannerStyle)
  const frameCls = frameClass(profile?.avatarFrame as AvatarFrame)
  const visibility = profile?.visibility || {}
  const showBio = visibility.bio !== false && !!data.profile?.bio
  const showStats = visibility.stats !== false && !!stats
  const showSkills = visibility.skills !== false && (profile?.skills?.length || 0) > 0
  const showSocials = visibility.socials !== false &&
    Object.values(profile?.socials || {}).some(Boolean)
  const showAchievements = visibility.achievements !== false && achievements.length > 0
  const showShowcase = visibility.showcase !== false && (profile?.showcase?.length || 0) > 0

  const roleLabel =
    user.role === 'TEACHER' ? 'GV' : user.role === 'ADMIN' ? 'Quản trị' : 'HS'
  const roleColor =
    user.role === 'TEACHER' ? 'bg-blue-500/20 text-blue-300 ring-blue-500/40'
    : user.role === 'ADMIN' ? 'bg-red-500/20 text-red-300 ring-red-500/40'
    : 'bg-purple-500/20 text-purple-300 ring-purple-500/40'

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* ═══════════ Hero Banner + Avatar ═══════════ */}
      <div className="relative">
        <div
          className={cn('h-48 sm:h-64 rounded-2xl overflow-hidden relative', bannerCls)}
          style={profile?.bannerStyle === 'custom-image' && profile?.bannerImageUrl ? {
            background: `url("${profile.bannerImageUrl}") center / cover no-repeat`,
          } : undefined}
        >
          {/* Overlay subtle để text dễ đọc */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

          {/* Edit button cho chủ profile */}
          {isOwner && (
            <Link
              to="/profile/customize"
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white text-sm font-medium transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Tùy chỉnh
            </Link>
          )}
        </div>

        {/* Avatar overlapping banner */}
        <div className="absolute left-4 sm:left-8 -bottom-12 sm:-bottom-16">
          <div className={cn('relative', frameCls)}>
            <div className={cn(
              'w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-700',
              !frameCls && 'ring-4 ring-[#0a0a0a]'
            )}>
              {user.image ? (
                <img src={user.image} alt={user.name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-purple-300 bg-purple-500/20">
                  {(user.name || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Name + Role + Joined ═══════════ */}
      <div className="mt-16 sm:mt-20 px-2 sm:px-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {user.name || 'Người dùng ẩn danh'}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1', roleColor)}>
                {roleLabel}
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN', { year: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Bio ═══════════ */}
      {showBio && (
        <section className="mt-6 rounded-2xl bg-white/[0.03] border border-white/10 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-3">
            <Sparkles className={cn('w-5 h-5', accentCls)} />
            Giới thiệu
          </h2>
          <div
            className="text-sm sm:text-base text-gray-300 leading-relaxed prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: bioHtml }}
          />
        </section>
      )}

      {/* ═══════════ Stats ═══════════ */}
      {showStats && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Trophy className={cn('w-5 h-5', accentCls)} />
            Thống kê
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {isTeacherStats(stats) ? (
              <>
                <StatCard icon={<BookOpen className="w-5 h-5" />}
                  label="Khoá đã dạy" value={stats.coursesTaught} accent={accentCls} />
                <StatCard icon={<Users className="w-5 h-5" />}
                  label="Học sinh" value={stats.studentsCount} accent={accentCls} />
                <StatCard icon={<GraduationCap className="w-5 h-5" />}
                  label="Năm kinh nghiệm" value={stats.yearsExperience} accent={accentCls} />
              </>
            ) : (
              <>
                <StatCard icon={<Sparkles className="w-5 h-5" />}
                  label="Điểm XP" value={(stats as StudentProfileStats).xp.toLocaleString()} accent={accentCls} />
                <StatCard icon={<Star className="w-5 h-5" />}
                  label="Cấp độ" value={(stats as StudentProfileStats).level} accent={accentCls} />
                <StatCard icon={<BookOpen className="w-5 h-5" />}
                  label="Khoá đã đăng ký" value={(stats as StudentProfileStats).completedCourses} accent={accentCls} />
                {!!(stats as StudentProfileStats).streak && (
                  <StatCard icon={<Flame className="w-5 h-5" />}
                    label="Chuỗi ngày" value={(stats as StudentProfileStats).streak!} accent={accentCls} />
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ═══════════ Skills ═══════════ */}
      {showSkills && (
        <div className="mt-6">
          <Section title="Kỹ năng & sở thích" icon={<Code className={cn('w-5 h-5', accentCls)} />}>
            <div className="flex flex-wrap gap-2">
              {profile!.skills!.map((skill, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm ring-1 transition-transform hover:scale-105',
                    ringCls,
                  )}
                >
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ═══════════ Socials ═══════════ */}
      {showSocials && (
        <div className="mt-6">
          <Section title="Liên hệ" icon={<Globe className={cn('w-5 h-5', accentCls)} />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile?.socials?.facebook && (
                <a href={profile.socials.facebook} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 transition-colors text-sm text-white">
                  <Facebook className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="truncate">Facebook</span>
                </a>
              )}
              {profile?.socials?.youtube && (
                <a href={profile.socials.youtube} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-colors text-sm text-white">
                  <Youtube className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="truncate">YouTube</span>
                </a>
              )}
              {profile?.socials?.github && (
                <a href={profile.socials.github} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-colors text-sm text-white">
                  <Github className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="truncate">GitHub</span>
                </a>
              )}
              {profile?.socials?.website && (
                <a href={profile.socials.website} target="_blank" rel="noopener noreferrer"
                   className={cn(
                     'flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 transition-colors text-sm text-white',
                     `hover:bg-${themeColor}-500/10 hover:border-${themeColor}-500/30`
                   )}>
                  <Globe className={cn('w-4 h-4 flex-shrink-0', accentCls)} />
                  <span className="truncate">Website</span>
                </a>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ═══════════ Achievements ═══════════ */}
      {showAchievements && (
        <div className="mt-6">
          <Section title="Bộ sưu tập huy hiệu" icon={<Award className={cn('w-5 h-5', accentCls)} />}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'aspect-square rounded-xl border flex flex-col items-center justify-center p-3 text-center transition-transform hover:scale-105 cursor-default',
                    a.tier === 'gold'     ? 'bg-amber-500/10 border-amber-500/30'
                  : a.tier === 'silver'   ? 'bg-slate-300/10 border-slate-300/30'
                  : a.tier === 'platinum' ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-orange-700/10 border-orange-700/30'
                  )}
                  title={a.description || a.title}
                >
                  <Trophy className={cn(
                    'w-8 h-8 mb-1',
                    a.tier === 'gold' ? 'text-amber-400'
                    : a.tier === 'silver' ? 'text-slate-300'
                    : a.tier === 'platinum' ? 'text-cyan-300'
                    : 'text-orange-400'
                  )} />
                  <div className="text-xs font-medium text-white line-clamp-2">{a.title}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ═══════════ Showcase ═══════════ */}
      {showShowcase && (
        <div className="mt-6 mb-12">
          <Section
            title={user.role === 'TEACHER' ? 'Khoá học nổi bật' : 'Dự án nổi bật'}
            icon={<Sparkles className={cn('w-5 h-5', accentCls)} />}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile!.showcase!.map((item, i) => (
                <a
                  key={i}
                  href={item.url || '#'}
                  target={item.url ? '_blank' : undefined}
                  rel={item.url ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'group rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 overflow-hidden transition-colors',
                    !item.url && 'cursor-default'
                  )}
                >
                  {item.image && (
                    <div className="aspect-video bg-gray-800 overflow-hidden">
                      <img src={item.image} alt={item.title}
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="font-semibold text-white text-sm">{item.title}</div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* Empty state nếu profile gần như trống và mình là chủ */}
      {isOwner && !showBio && !showSkills && !showSocials && !showShowcase && (
        <div className="mt-8 rounded-2xl bg-white/[0.03] border border-dashed border-white/20 p-10 text-center">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-300 font-medium">Trang cá nhân của bạn còn trống</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Hãy thêm giới thiệu, kỹ năng, liên hệ để mọi người biết về bạn nhiều hơn.
          </p>
          <Link
            to="/profile/customize"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Tùy chỉnh trang cá nhân
          </Link>
        </div>
      )}
    </div>
  )
}
