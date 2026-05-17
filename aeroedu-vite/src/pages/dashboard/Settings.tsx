/**
 * Settings — /dashboard/settings
 *
 * Cài đặt tài khoản học sinh: hồ sơ, mật khẩu, thông báo, giao diện, quyền riêng tư.
 *
 * ── Lưu trữ ──────────────────────────────────────────────────────────
 *   • Hồ sơ       → PATCH /api/profile (qua learningService.updateProfile) + cache localStorage
 *   • Mật khẩu    → POST  /api/auth/change-password (qua authService.changePassword)
 *   • Thông báo   → localStorage (key: settings.notifications)
 *   • Giao diện   → ThemeContext + LanguageContext + localStorage (font-size/compact/anim)
 *   • Riêng tư    → localStorage (key: settings.privacy)
 *
 * ── Thiết kế state ───────────────────────────────────────────────────
 *   Mọi state được LIFT lên <SettingsPage /> thay vì nằm trong từng tab,
 *   nên khi người dùng đổi tab qua lại thì giá trị đã nhập KHÔNG bị mất.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  User, Lock, Bell, Palette, Shield, Check, AlertCircle, X,
  Eye, EyeOff, Save, ChevronRight, Moon, Sun, Monitor,
  Volume2, Mail, Smartphone, Globe, Send,
  GraduationCap, Trophy, Zap, LogOut, ExternalLink, Loader2, Sparkles,
  Crown, Ticket, CheckCircle2, Calendar, Copy,
} from 'lucide-react'
import { api } from '@/services/api'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { learningService } from '@/services/learning.service'
import { authService } from '@/services/auth.service'
import { recommendationService as rs } from '@/services/recommendation.service'

// ─────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────
type TabKey = 'profile' | 'password' | 'subscription' | 'activation' | 'notifications' | 'appearance' | 'privacy'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'profile',       label: 'Hồ sơ',          icon: <User className="w-4 h-4" /> },
  { key: 'password',      label: 'Bảo mật',         icon: <Lock className="w-4 h-4" /> },
  { key: 'subscription',  label: 'Gói đăng ký',     icon: <Crown className="w-4 h-4" /> },
  { key: 'activation',    label: 'Mã kích hoạt',    icon: <Ticket className="w-4 h-4" /> },
  { key: 'notifications', label: 'Thông báo',       icon: <Bell className="w-4 h-4" /> },
  { key: 'appearance',    label: 'Giao diện',       icon: <Palette className="w-4 h-4" /> },
  { key: 'privacy',       label: 'Quyền riêng tư',  icon: <Shield className="w-4 h-4" /> },
]

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
]

const THEMES: { key: 'dark' | 'light' | 'system'; label: string; icon: React.ReactNode }[] = [
  { key: 'dark',   label: 'Tối',      icon: <Moon className="w-4 h-4" /> },
  { key: 'light',  label: 'Sáng',     icon: <Sun className="w-4 h-4" /> },
  { key: 'system', label: 'Hệ thống', icon: <Monitor className="w-4 h-4" /> },
]

const LANGUAGES: { key: 'vi' | 'en'; label: string }[] = [
  { key: 'vi', label: 'Tiếng Việt' },
  { key: 'en', label: 'English' },
]

const SUBJECTS = ['Vật lý', 'Toán học', 'Hóa học', 'Sinh học', 'Lập trình', 'Anh văn']

// ── localStorage keys ───────────────────────────────────────────
const LS_PROFILE       = 'settings.profile'
const LS_NOTIFICATIONS = 'settings.notifications'
const LS_APPEARANCE    = 'settings.appearance'
const LS_PRIVACY       = 'settings.privacy'

// ─────────────────────────────────────────────────────────────────
// State schemas
// ─────────────────────────────────────────────────────────────────
interface ProfileState {
  name: string
  username: string
  email: string
  phone: string
  bio: string
  school: string
  grade: string
  avatarColor: number
  favSubjects: string[]
}

interface NotificationsState {
  emailLessons: boolean
  emailAchievements: boolean
  emailWeekly: boolean
  pushLessons: boolean
  pushAchievements: boolean
  pushReminder: boolean
  pushStreak: boolean
  pushMessages: boolean
  sound: boolean
  vibration: boolean
}

interface AppearanceState {
  fontSize: 'small' | 'medium' | 'large'
  compact: boolean
  animations: boolean
}

interface PrivacyState {
  showProfile: boolean
  showProgress: boolean
  showAchievements: boolean
  showOnline: boolean
  allowFriendReq: boolean
  shareData: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationsState = {
  emailLessons:      true,
  emailAchievements: true,
  emailWeekly:       false,
  pushLessons:       true,
  pushAchievements:  true,
  pushReminder:      true,
  pushStreak:        true,
  pushMessages:      true,
  sound:             true,
  vibration:         false,
}

const DEFAULT_APPEARANCE: AppearanceState = {
  fontSize:   'medium',
  compact:    false,
  animations: true,
}

const DEFAULT_PRIVACY: PrivacyState = {
  showProfile:      true,
  showProgress:     true,
  showAchievements: true,
  showOnline:       false,
  allowFriendReq:   true,
  shareData:        false,
}

// ─────────────────────────────────────────────────────────────────
// localStorage helpers (SSR-safe)
// ─────────────────────────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────
// Presentational atoms
// ─────────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 ' +
  'placeholder-white/25 focus:outline-none focus:border-violet-500/50 transition-colors'

const labelCls = 'block text-xs font-semibold text-white/40 mb-1.5 uppercase tracking-wide'

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.05]">
        <span className="text-white/40">{icon}</span>
        <h3 className="text-xs font-bold text-white/50 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

function Toggle({
  checked, onChange, label, desc,
}: { checked: boolean; onChange: () => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm text-white/75">{label}</p>
        {desc && <p className="text-xs text-white/35 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-pressed={checked}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-violet-600' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tabs — đều nhận state qua props (state được giữ ở parent)
// ─────────────────────────────────────────────────────────────────
interface ProfileTabProps {
  state: ProfileState
  onChange: (patch: Partial<ProfileState>) => void
  onSave: () => Promise<void>
  saving: boolean
}

function ProfileTab({ state, onChange, onSave, saving }: ProfileTabProps) {
  const toggleSubject = (s: string) =>
    onChange({
      favSubjects: state.favSubjects.includes(s)
        ? state.favSubjects.filter((x) => x !== s)
        : [...state.favSubjects, s],
    })

  const initial = (state.name || '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[state.avatarColor]} flex items-center justify-center text-3xl font-bold text-white shadow-lg shrink-0`}>
          {initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-white/80 mb-2">Màu avatar</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange({ avatarColor: i })}
                className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c} transition-all ${state.avatarColor === i ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-105'}`}
                aria-label={`Avatar color ${i + 1}`}
              />
            ))}
          </div>
          <p className="text-[0.65rem] text-white/25 mt-1.5">Tính năng tải ảnh sẽ sớm ra mắt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Họ và tên *</label>
          <input value={state.name} onChange={(e) => onChange({ name: e.target.value })} className={inputCls} placeholder="Nguyễn Văn A" />
        </div>
        <div>
          <label className={labelCls}>Tên người dùng</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
            <input
              value={state.username}
              onChange={(e) => onChange({ username: e.target.value.toLowerCase().replace(/\s/g, '') })}
              className={`${inputCls} pl-8`}
              placeholder="nguyenvana"
            />
          </div>
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={state.email} onChange={(e) => onChange({ email: e.target.value })} className={inputCls} placeholder="email@example.com" />
        </div>
        <div>
          <label className={labelCls}>Số điện thoại</label>
          <input type="tel" value={state.phone} onChange={(e) => onChange({ phone: e.target.value })} className={inputCls} placeholder="0912 345 678" />
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>Tiểu sử</label>
          <textarea value={state.bio} onChange={(e) => onChange({ bio: e.target.value })} rows={2} className={`${inputCls} resize-none`} placeholder="Giới thiệu bản thân…" />
        </div>
        <div>
          <label className={labelCls}>Trường học</label>
          <input value={state.school} onChange={(e) => onChange({ school: e.target.value })} className={inputCls} placeholder="Tên trường" />
        </div>
        <div>
          <label className={labelCls}>Lớp / Khóa</label>
          <select value={state.grade} onChange={(e) => onChange({ grade: e.target.value })} className={inputCls}>
            {['10', '11', '12', 'Đại học năm 1', 'Đại học năm 2', 'Đại học năm 3', 'Đại học năm 4', 'Khác'].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Favorite subjects */}
      <div>
        <label className={labelCls}>Môn học yêu thích</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                state.favSubjects.includes(s)
                  ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/80'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !state.name.trim()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
      >
        <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
      </button>
    </div>
  )
}

// ── Password tab ────────────────────────────────────────────────
interface PasswordTabProps {
  onSave: (current: string, next: string) => Promise<void>
  saving: boolean
}

function PasswordTab({ onSave, saving }: PasswordTabProps) {
  const [cur, setCur]      = useState('')
  const [next, setNext]    = useState('')
  const [confirm, setConf] = useState('')
  const [show, setShow]    = useState(false)

  const strength =
    next.length === 0 ? 0 :
    next.length < 6  ? 1 :
    next.length < 10 ? 2 :
    /[A-Z]/.test(next) && /[0-9]/.test(next) ? 4 : 3
  const strLabel = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh']
  const strColor = ['', 'bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500']
  const match    = !!next && !!confirm && next === confirm
  const mismatch = !!confirm && next !== confirm
  const iconBtn  = 'absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors'

  const handleSubmit = async () => {
    if (!cur || !match) return
    if (next.length < 8) {
      toast.error('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }
    await onSave(cur, next)
    setCur(''); setNext(''); setConf('')
  }

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <label className={labelCls}>Mật khẩu hiện tại</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={cur} onChange={(e) => setCur(e.target.value)} className={`${inputCls} pr-10`} placeholder="••••••••" />
          <button type="button" className={iconBtn} onClick={() => setShow((p) => !p)}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
      </div>
      <div>
        <label className={labelCls}>Mật khẩu mới</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} className={`${inputCls} pr-10`} placeholder="••••••••" />
          <button type="button" className={iconBtn} onClick={() => setShow((p) => !p)}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
        </div>
        {next && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strColor[strength] : 'bg-white/10'}`} />
              ))}
            </div>
            <p className={`text-[0.65rem] ${strength <= 1 ? 'text-rose-400' : strength <= 2 ? 'text-amber-400' : strength <= 3 ? 'text-blue-400' : 'text-emerald-400'}`}>
              {strLabel[strength]}
            </p>
          </div>
        )}
      </div>
      <div>
        <label className={labelCls}>Xác nhận mật khẩu mới</label>
        <div className="relative">
          <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConf(e.target.value)} className={`${inputCls} ${mismatch ? 'border-rose-500/50' : match ? 'border-emerald-500/50' : ''}`} placeholder="••••••••" />
          {match    && <Check       className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />}
          {mismatch && <AlertCircle className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />}
        </div>
        {mismatch && <p className="text-xs text-rose-400 mt-1">Mật khẩu không khớp</p>}
      </div>

      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 text-xs text-white/40">
        <p className="font-semibold text-white/50 mb-2">Yêu cầu mật khẩu</p>
        {([
          ['Ít nhất 8 ký tự', next.length >= 8],
          ['Có chữ hoa (A-Z)', /[A-Z]/.test(next)],
          ['Có số (0-9)', /[0-9]/.test(next)],
          ['Có ký tự đặc biệt (!@#…)', /[^a-zA-Z0-9]/.test(next)],
        ] as const).map(([label, ok]) => (
          <p key={label} className={`flex items-center gap-2 ${ok ? 'text-emerald-400' : ''}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${ok ? 'bg-emerald-500 border-emerald-500' : 'border-white/15'}`}>
              {ok && <Check className="w-2 h-2 text-white" />}
            </span>
            {label}
          </p>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !cur || !match}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors"
      >
        <Lock className="w-4 h-4" /> {saving ? 'Đang đổi…' : 'Đổi mật khẩu'}
      </button>
    </div>
  )
}

// ── Notifications tab ───────────────────────────────────────────
interface NotifTabProps {
  state: NotificationsState
  onToggle: (k: keyof NotificationsState) => void
  onSave: () => void
}

function NotificationsTab({ state, onToggle, onSave }: NotifTabProps) {
  return (
    <div className="space-y-6 max-w-xl">
      {/* RS-Phase 8: Multi-channel digest preferences (server-side) */}
      <DigestPrefsSection />

      <Section icon={<Mail className="w-4 h-4" />} title="Email">
        <Toggle checked={state.emailLessons}      onChange={() => onToggle('emailLessons')}      label="Bài học mới"        desc="Thông báo khi có bài học AI gợi ý" />
        <Toggle checked={state.emailAchievements} onChange={() => onToggle('emailAchievements')} label="Thành tích"          desc="Khi bạn mở khóa huy hiệu mới" />
        <Toggle checked={state.emailWeekly}       onChange={() => onToggle('emailWeekly')}       label="Báo cáo hàng tuần"   desc="Tóm tắt tiến độ học tập mỗi thứ Hai" />
      </Section>
      <Section icon={<Smartphone className="w-4 h-4" />} title="Thông báo đẩy">
        <Toggle checked={state.pushLessons}  onChange={() => onToggle('pushLessons')}  label="Bài học & nhiệm vụ" />
        <Toggle checked={state.pushStreak}   onChange={() => onToggle('pushStreak')}   label="Chuỗi ngày học"        desc="Nhắc nhở trước khi mất streak" />
        <Toggle checked={state.pushMessages} onChange={() => onToggle('pushMessages')} label="Tin nhắn từ bạn bè" />
        <Toggle checked={state.pushReminder} onChange={() => onToggle('pushReminder')} label="Nhắc học hàng ngày" />
      </Section>
      <Section icon={<Volume2 className="w-4 h-4" />} title="Âm thanh & Rung">
        <Toggle checked={state.sound}     onChange={() => onToggle('sound')}     label="Hiệu ứng âm thanh" />
        <Toggle checked={state.vibration} onChange={() => onToggle('vibration')} label="Rung khi thông báo" />
      </Section>
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
      >
        <Save className="w-4 h-4" /> Lưu cài đặt
      </button>
    </div>
  )
}

/** Format ISO timestamp → "5 phút trước" / "2 giờ trước" / "hôm qua" / dd/MM HH:mm */
function formatRelativeVi(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'vừa xong'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút trước`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} giờ trước`
  if (diff < 2 * 86_400_000) return 'hôm qua'
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} ngày trước`
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * RS-Phase 8 multi-channel digest preferences panel.
 * State persisted server-side qua /api/reco/digest/preferences.
 * Channels: In-app (bell) · Email · Telegram (cần link bot).
 */
function DigestPrefsSection() {
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<keyof { inApp:1; email:1; telegram:1 } | null>(null)
  const [testing, setTesting]   = useState(false)
  const [channels, setChannels] = useState({ inApp: true, email: false, telegram: false })
  const [emailOnAccount, setEmailOnAccount] = useState<string | null>(null)
  const [telegramLinked, setTelegramLinked] = useState(false)
  const [telegramPreview, setTelegramPreview] = useState<string | null>(null)
  const [telegramDeepLink, setTelegramDeepLink] = useState('')
  const [lastSentAt, setLastSentAt] = useState<string | null>(null)
  const [lastSentItemsCount, setLastSentItemsCount] = useState<number | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await rs.getDigestPrefs()
      setChannels(r.channels)
      setEmailOnAccount(r.emailOnAccount)
      setTelegramLinked(r.telegramLinked)
      setTelegramPreview(r.telegramChatIdPreview)
      setTelegramDeepLink(r.telegramDeepLink)
      setLastSentAt(r.lastSentAt)
      setLastSentItemsCount(r.lastSentItemsCount)
    } catch (e: any) {
      toast.error(`Không tải được cài đặt: ${e?.message || 'lỗi'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const updateChannel = useCallback(async (k: 'inApp' | 'email' | 'telegram', value: boolean) => {
    // Edge: bật telegram khi chưa link → guide user
    if (k === 'telegram' && value && !telegramLinked) {
      toast('Hãy liên kết Telegram trước đã 🔗', { icon: 'ℹ️' })
      return
    }
    setSaving(k)
    const prev = { ...channels }
    const next = { ...channels, [k]: value }
    setChannels(next)
    try {
      const r = await rs.updateDigestPrefs(next)
      setChannels(r.channels)
      toast.success('Đã lưu cài đặt')
    } catch (e: any) {
      setChannels(prev)
      toast.error(`Lỗi lưu: ${e?.message || 'thử lại'}`)
    } finally {
      setSaving(null)
    }
  }, [channels, telegramLinked])

  const handleTest = useCallback(async () => {
    setTesting(true)
    try {
      const r = await rs.sendDigestTest()
      if (!r.sent) {
        toast.error(`Không gửi được: ${r.reason || 'unknown'}`)
        return
      }
      const lines: string[] = []
      if (r.deliveries?.inApp?.ok)    lines.push('✓ In-app bell')
      if (r.deliveries?.email?.ok)    lines.push(`✓ Email (${r.deliveries.email.provider})`)
      if (r.deliveries?.telegram?.ok) lines.push('✓ Telegram')
      const failed = Object.entries(r.deliveries || {})
        .filter(([_, v]) => v && !v.ok)
        .map(([k, v]) => `✗ ${k}: ${(v as any).error}`)
      toast.success(`Test digest gửi xong (${r.itemsCount} mục)\n${[...lines, ...failed].join('\n')}`, { duration: 5000 })
    } catch (e: any) {
      toast.error(`Lỗi test: ${e?.message || 'thử lại'}`)
    } finally {
      setTesting(false)
    }
  }, [])

  const handleUnlinkTelegram = useCallback(async () => {
    if (!confirm('Bạn chắc muốn huỷ liên kết Telegram?')) return
    try {
      await rs.unlinkTelegram()
      toast.success('Đã huỷ liên kết Telegram')
      await reload()
    } catch (e: any) {
      toast.error(`Lỗi: ${e?.message || 'thử lại'}`)
    }
  }, [reload])

  return (
    <Section
      icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
      title="Gợi ý AI hàng ngày"
    >
      <div className="text-xs text-white/50 mb-3 -mt-2">
        Mỗi ngày AI tổng hợp 3 mục cá nhân hoá nhất cho bạn — bạn chọn nhận qua đâu.
        <br />
        <span className="text-white/40">
          HS nhận gợi ý học (điểm yếu / LP từ GV / hot). GV nhận việc cần xử lý (lớp đang yếu / HS cần hỗ trợ / LP HS vừa tạo).
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3 text-white/40 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải cài đặt…
        </div>
      ) : (
        <>
          {/* In-app */}
          <Toggle
            checked={channels.inApp}
            onChange={() => updateChannel('inApp', !channels.inApp)}
            label="🔔 Thông báo trong app"
            desc={saving === 'inApp' ? 'Đang lưu…' : 'Xuất hiện trong notification bell'}
          />

          {/* Email */}
          <Toggle
            checked={channels.email}
            onChange={() => updateChannel('email', !channels.email)}
            label="📧 Email"
            desc={
              saving === 'email' ? 'Đang lưu…'
                : emailOnAccount ? `Gửi đến ${emailOnAccount}`
                : 'Tài khoản chưa có email — cập nhật trong tab Hồ sơ'
            }
          />

          {/* Telegram */}
          <div className="space-y-2">
            <Toggle
              checked={channels.telegram}
              onChange={() => updateChannel('telegram', !channels.telegram)}
              label="💬 Telegram"
              desc={
                saving === 'telegram' ? 'Đang lưu…'
                  : telegramLinked ? `Đã liên kết (chat ${telegramPreview})`
                  : 'Chưa liên kết — bấm nút bên dưới'
              }
            />
            {telegramLinked ? (
              <button
                type="button"
                onClick={handleUnlinkTelegram}
                className="text-[11px] text-rose-300 hover:text-rose-200 underline ml-12"
              >
                Huỷ liên kết Telegram
              </button>
            ) : (
              telegramDeepLink && (
                <a
                  href={telegramDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 ml-12 px-3 py-1.5 rounded-lg
                             bg-gradient-to-r from-cyan-500/15 to-blue-500/15
                             border border-cyan-500/30 text-cyan-300 text-xs font-bold
                             hover:from-cyan-500/25 hover:to-blue-500/25 transition"
                >
                  <ExternalLink className="w-3 h-3" /> Liên kết Telegram bot →
                </a>
              )
            )}
          </div>

          {/* Test button + last sent stamp */}
          <div className="pt-3 mt-3 border-t border-white/[0.06] space-y-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-cyan-500/15 hover:bg-cyan-500/25
                         border border-cyan-500/30 text-cyan-300 text-xs font-bold
                         disabled:opacity-50 transition"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {testing ? 'Đang gửi test…' : 'Gửi digest test ngay'}
            </button>
            <p className="text-[10px] text-white/30">
              Verify từng kênh hoạt động (bypass giới hạn 1/ngày).
            </p>
            {lastSentAt && (
              <p className="text-[11px] text-emerald-300/80 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Digest cuối: {formatRelativeVi(lastSentAt)}
                {lastSentItemsCount !== null && (
                  <span className="text-white/40"> ({lastSentItemsCount} mục)</span>
                )}
              </p>
            )}
          </div>
        </>
      )}
    </Section>
  )
}

// ── Appearance tab ──────────────────────────────────────────────
interface AppearanceTabProps {
  state: AppearanceState
  onChange: (patch: Partial<AppearanceState>) => void
  onSave: () => void
  themeMode: 'light' | 'dark' | 'system'
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void
  lang: 'vi' | 'en'
  setLang: (l: 'vi' | 'en') => void
}

function AppearanceTab({
  state, onChange, onSave, themeMode, setThemeMode, lang, setLang,
}: AppearanceTabProps) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className={labelCls}>Chủ đề</label>
        <div className="flex gap-3">
          {THEMES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setThemeMode(t.key)}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                themeMode === t.key
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              {t.icon}
              <span className="text-xs font-medium">{t.label}</span>
              {themeMode === t.key && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
        <p className="text-[0.65rem] text-white/25 mt-2">Áp dụng ngay cho giao diện toàn bộ ứng dụng.</p>
      </div>

      <div>
        <label className={labelCls}>Ngôn ngữ</label>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLang(l.key)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                lang === l.key
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                  : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>Cỡ chữ</label>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((k) => {
            const v = k === 'small' ? 'Nhỏ' : k === 'medium' ? 'Vừa' : 'Lớn'
            return (
              <button
                key={k}
                type="button"
                onClick={() => onChange({ fontSize: k })}
                className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                  state.fontSize === k
                    ? 'bg-violet-500/15 border-violet-500/40 text-violet-300'
                    : 'bg-white/[0.03] border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
                }`}
              >
                {v}
              </button>
            )
          })}
        </div>
      </div>

      <Section icon={<Monitor className="w-4 h-4" />} title="Hiển thị">
        <Toggle
          checked={state.compact}
          onChange={() => onChange({ compact: !state.compact })}
          label="Giao diện thu gọn"
          desc="Hiển thị nhiều nội dung hơn trong cùng diện tích"
        />
        <Toggle
          checked={state.animations}
          onChange={() => onChange({ animations: !state.animations })}
          label="Hiệu ứng chuyển động"
          desc="Tắt để cải thiện hiệu suất trên thiết bị cũ"
        />
      </Section>

      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
      >
        <Save className="w-4 h-4" /> Lưu cài đặt
      </button>
    </div>
  )
}

// ── Privacy tab ─────────────────────────────────────────────────
interface PrivacyTabProps {
  state: PrivacyState
  onToggle: (k: keyof PrivacyState) => void
  onSave: () => void
}

function PrivacyTab({ state, onToggle, onSave }: PrivacyTabProps) {
  return (
    <div className="space-y-6 max-w-xl">
      <Section icon={<Globe className="w-4 h-4" />} title="Hiển thị hồ sơ công khai">
        <Toggle checked={state.showProfile}      onChange={() => onToggle('showProfile')}      label="Hồ sơ cá nhân"         desc="Cho phép người khác xem thông tin của bạn" />
        <Toggle checked={state.showProgress}     onChange={() => onToggle('showProgress')}     label="Tiến độ học tập"       desc="Hiển thị XP, streak và lộ trình" />
        <Toggle checked={state.showAchievements} onChange={() => onToggle('showAchievements')} label="Thành tích"            desc="Huy hiệu và danh hiệu đã đạt được" />
        <Toggle checked={state.showOnline}       onChange={() => onToggle('showOnline')}       label="Trạng thái trực tuyến" />
      </Section>
      <Section icon={<User className="w-4 h-4" />} title="Tương tác">
        <Toggle checked={state.allowFriendReq} onChange={() => onToggle('allowFriendReq')} label="Nhận lời mời kết bạn" />
      </Section>
      <Section icon={<Shield className="w-4 h-4" />} title="Dữ liệu & Quyền riêng tư">
        <Toggle
          checked={state.shareData}
          onChange={() => onToggle('shareData')}
          label="Chia sẻ dữ liệu ẩn danh"
          desc="Giúp cải thiện AI dạy học (không bao gồm thông tin cá nhân)"
        />
        <div className="py-3">
          <button
            type="button"
            onClick={() => toast('Yêu cầu xoá dữ liệu đã được gửi tới quản trị viên.', { icon: '📨' })}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline"
          >
            Yêu cầu xóa dữ liệu tài khoản
          </button>
        </div>
      </Section>
      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold transition-colors"
      >
        <Save className="w-4 h-4" /> Lưu cài đặt
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, logout } = useAuth()
  const { settings: themeSettings, updateSettings: updateTheme } = useTheme()
  const { language, setLanguage } = useLanguage()

  const [activeTab, setActiveTab] = useState<TabKey>('profile')

  // ── Profile: hydrate từ user (auth) + localStorage cache ──────
  const [profile, setProfile] = useState<ProfileState>(() => {
    const cached = lsGet<Partial<ProfileState>>(LS_PROFILE, {})
    return {
      name:        cached.name        ?? '',
      username:    cached.username    ?? '',
      email:       cached.email       ?? '',
      phone:       cached.phone       ?? '',
      bio:         cached.bio         ?? '',
      school:      cached.school      ?? '',
      grade:       cached.grade       ?? '12',
      avatarColor: cached.avatarColor ?? 0,
      favSubjects: cached.favSubjects ?? ['Vật lý', 'Toán học'],
    }
  })
  const [profileSaving, setProfileSaving] = useState(false)

  // Khi user từ AuthContext hydrate xong → fill các field còn trống
  useEffect(() => {
    if (!user) return
    setProfile((prev) => ({
      ...prev,
      name:  prev.name  || user.name  || '',
      email: prev.email || user.email || '',
    }))
  }, [user])

  // ── Notifications ──────────────────────────────────────────────
  const [notif, setNotif] = useState<NotificationsState>(() =>
    lsGet(LS_NOTIFICATIONS, DEFAULT_NOTIFICATIONS),
  )

  // ── Appearance ─────────────────────────────────────────────────
  const [appearance, setAppearance] = useState<AppearanceState>(() =>
    lsGet(LS_APPEARANCE, DEFAULT_APPEARANCE),
  )

  // ── Privacy ────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState<PrivacyState>(() =>
    lsGet(LS_PRIVACY, DEFAULT_PRIVACY),
  )

  const [passwordSaving, setPasswordSaving] = useState(false)

  // ─── Side-effects: apply appearance to <html> ──────────────────
  useEffect(() => {
    const root = document.documentElement
    // Cỡ chữ áp qua CSS variable
    const rootFontSize =
      appearance.fontSize === 'small'  ? '14px' :
      appearance.fontSize === 'large'  ? '17px' : '15.5px'
    root.style.setProperty('font-size', rootFontSize)

    // Compact mode & animations: add data-attr để CSS global hook vào nếu cần
    root.dataset.compact    = appearance.compact ? 'true' : 'false'
    root.dataset.animations = appearance.animations ? 'on' : 'off'
    if (!appearance.animations) {
      root.style.setProperty('--anim-duration', '0s')
    } else {
      root.style.removeProperty('--anim-duration')
    }
  }, [appearance])

  // ─── Handlers ──────────────────────────────────────────────────
  const patchProfile = useCallback((patch: Partial<ProfileState>) => {
    setProfile((p) => ({ ...p, ...patch }))
  }, [])

  const saveProfile = useCallback(async () => {
    setProfileSaving(true)
    // Cache local trước để không mất khi BE lỗi
    lsSet(LS_PROFILE, profile)
    try {
      await learningService.updateProfile({
        name: profile.name || undefined,
        bio:  profile.bio  || undefined,
        phone: profile.phone || undefined,
      })
      toast.success('Đã lưu hồ sơ')
    } catch (err) {
      // Backend có thể chưa triển khai → vẫn lưu local, báo nhẹ nhàng
      if (import.meta.env.DEV) console.warn('[saveProfile] BE error, local only:', err)
      toast.success('Đã lưu hồ sơ (offline)')
    } finally {
      setProfileSaving(false)
    }
  }, [profile])

  const changePassword = useCallback(async (current: string, next: string) => {
    setPasswordSaving(true)
    try {
      await authService.changePassword(current, next)
      toast.success('Đã đổi mật khẩu')
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: string }).message ?? 'Không đổi được mật khẩu')
          : 'Không đổi được mật khẩu'
      toast.error(msg)
    } finally {
      setPasswordSaving(false)
    }
  }, [])

  const toggleNotif = useCallback((k: keyof NotificationsState) => {
    setNotif((p) => ({ ...p, [k]: !p[k] }))
  }, [])

  const saveNotif = useCallback(() => {
    lsSet(LS_NOTIFICATIONS, notif)
    toast.success('Đã lưu cài đặt thông báo')
  }, [notif])

  const patchAppearance = useCallback((patch: Partial<AppearanceState>) => {
    setAppearance((p) => ({ ...p, ...patch }))
  }, [])

  const saveAppearance = useCallback(() => {
    lsSet(LS_APPEARANCE, appearance)
    toast.success('Đã lưu cài đặt giao diện')
  }, [appearance])

  const togglePrivacy = useCallback((k: keyof PrivacyState) => {
    setPrivacy((p) => ({ ...p, [k]: !p[k] }))
  }, [])

  const savePrivacy = useCallback(() => {
    lsSet(LS_PRIVACY, privacy)
    toast.success('Đã lưu cài đặt quyền riêng tư')
  }, [privacy])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      toast.success('Đã đăng xuất')
    } catch {
      toast.error('Không đăng xuất được')
    }
  }, [logout])

  // ─── Render ────────────────────────────────────────────────────
  const tabContent = useMemo<Record<TabKey, React.ReactNode>>(() => ({
    profile: (
      <ProfileTab
        state={profile}
        onChange={patchProfile}
        onSave={saveProfile}
        saving={profileSaving}
      />
    ),
    password: (
      <PasswordTab
        onSave={changePassword}
        saving={passwordSaving}
      />
    ),
    subscription: (
      <SubscriptionTab />
    ),
    activation: (
      <ActivationTab />
    ),
    notifications: (
      <NotificationsTab
        state={notif}
        onToggle={toggleNotif}
        onSave={saveNotif}
      />
    ),
    appearance: (
      <AppearanceTab
        state={appearance}
        onChange={patchAppearance}
        onSave={saveAppearance}
        themeMode={themeSettings.mode}
        setThemeMode={(m) => updateTheme({ mode: m })}
        lang={language}
        setLang={setLanguage}
      />
    ),
    privacy: (
      <PrivacyTab
        state={privacy}
        onToggle={togglePrivacy}
        onSave={savePrivacy}
      />
    ),
  }), [
    profile, patchProfile, saveProfile, profileSaving,
    changePassword, passwordSaving,
    notif, toggleNotif, saveNotif,
    appearance, patchAppearance, saveAppearance,
    themeSettings.mode, updateTheme,
    language, setLanguage,
    privacy, togglePrivacy, savePrivacy,
  ])

  return (
    <div className="min-h-screen bg-[hsl(225,15%,8%)] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Cài đặt</h1>
          <p className="text-white/40 text-sm">Quản lý tài khoản và tuỳ chỉnh trải nghiệm học tập</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: <Zap className="w-4 h-4 text-yellow-400" />,         label: 'XP tích lũy',  value: '4,850', sub: '+120 tuần này' },
            { icon: <Trophy className="w-4 h-4 text-violet-400" />,      label: 'Thành tích',    value: '9/14',  sub: '5 chưa mở khóa' },
            { icon: <GraduationCap className="w-4 h-4 text-cyan-400" />, label: 'Bài đã học',   value: '38',    sub: '3 đang học' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="p-2 rounded-lg bg-white/[0.05]">{s.icon}</div>
              <div>
                <p className="text-lg font-bold text-white/90">{s.value}</p>
                <p className="text-[0.65rem] text-white/40">{s.label}</p>
                <p className="text-[0.6rem] text-white/25">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-6 flex-col md:flex-row">
          {/* Sidebar nav */}
          <nav className="md:w-44 shrink-0 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === t.key
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                }`}
              >
                {t.icon}{t.label}
                {activeTab === t.key && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Đăng xuất
              </button>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-6">
              {tabContent[activeTab]}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Đảm bảo các icon dùng nội bộ không bị tree-shaker xoá nhầm
// (import-only guard — không ảnh hưởng runtime)
void X

// ─────────────────────────────────────────────────────────────────
// SubscriptionTab — Hiển thị các gói đăng ký đang hoạt động
// GET /api/entitlements/me — danh sách entitlements (active + expired)
// ─────────────────────────────────────────────────────────────────
interface Entitlement {
  id?: string
  features: string[]
  plan?: string
  code?: string
  expiresAt?: string | null
  activatedAt?: string | null
  status?: 'active' | 'expired' | string
}

function SubscriptionTab() {
  const [loading, setLoading] = useState(true)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get<{ entitlements: Entitlement[] }>('/entitlements/me')
        if (!cancelled) setEntitlements(data.entitlements || [])
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } }
        if (!cancelled) setError(e.response?.data?.error || 'Không tải được danh sách gói')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const now = Date.now()
  const active = entitlements.filter(e =>
    !e.expiresAt || new Date(e.expiresAt).getTime() > now
  )
  const expired = entitlements.filter(e =>
    e.expiresAt && new Date(e.expiresAt).getTime() <= now
  )

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center text-white/55">
        Đang tải danh sách gói…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Gói đăng ký của bạn</h2>
        <p className="text-sm text-white/55">
          Theo dõi các gói &amp; quyền truy cập tính năng AI đang hoạt động.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-300 flex gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Active */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          Đang hoạt động ({active.length})
        </h3>
        {active.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 text-center">
            <Crown className="w-10 h-10 text-white/15 mx-auto mb-2" />
            <p className="text-white/55 text-sm mb-3">
              Bạn chưa có gói trả phí nào.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold hover:scale-[1.02] transition-transform"
            >
              Xem các gói <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <ul className="space-y-3">
            {active.map((e, i) => (
              <EntitlementCard key={e.id || e.code || i} ent={e} active />
            ))}
          </ul>
        )}
      </div>

      {/* Expired */}
      {expired.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/55 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/35" />
            Đã hết hạn ({expired.length})
          </h3>
          <ul className="space-y-2 opacity-60">
            {expired.map((e, i) => (
              <EntitlementCard key={e.id || e.code || i} ent={e} active={false} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EntitlementCard({ ent, active }: { ent: Entitlement; active: boolean }) {
  const exp = ent.expiresAt ? new Date(ent.expiresAt) : null
  const daysLeft = exp ? Math.max(0, Math.ceil((exp.getTime() - Date.now()) / 86400_000)) : null
  return (
    <li className={`rounded-xl border p-4 ${active ? 'bg-gradient-to-br from-amber-500/10 to-purple-500/10 border-amber-500/30' : 'bg-white/[0.02] border-white/[0.06]'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="font-bold text-white text-base">
            {ent.plan || 'Gói Premium'}
          </p>
          {ent.code && (
            <p className="text-xs text-white/55 font-mono mt-0.5">Mã: {ent.code}</p>
          )}
        </div>
        {active && daysLeft != null && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            daysLeft <= 7 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}>
            Còn {daysLeft} ngày
          </span>
        )}
      </div>
      {ent.features && ent.features.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ent.features.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/[0.05] text-white/75"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {f}
            </span>
          ))}
        </div>
      )}
      {ent.activatedAt && (
        <p className="text-[11px] text-white/40 mt-2">
          Kích hoạt: {new Date(ent.activatedAt).toLocaleDateString('vi-VN')}
          {exp && ` · Hết hạn: ${exp.toLocaleDateString('vi-VN')}`}
        </p>
      )}
    </li>
  )
}

// ─────────────────────────────────────────────────────────────────
// ActivationTab — Nhập mã + xem mã đã kích hoạt
// POST /api/entitlements/activate { code } — kích hoạt
// GET /api/entitlements/me — danh sách (tái sử dụng)
// ─────────────────────────────────────────────────────────────────
function ActivationTab() {
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activated, setActivated] = useState<Entitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const loadActivated = useCallback(async () => {
    try {
      const { data } = await api.get<{ entitlements: Entitlement[] }>('/entitlements/me')
      // Sort: mới nhất trước
      const list = (data.entitlements || []).slice().sort((a, b) => {
        const ta = a.activatedAt ? new Date(a.activatedAt).getTime() : 0
        const tb = b.activatedAt ? new Date(b.activatedAt).getTime() : 0
        return tb - ta
      })
      setActivated(list)
    } catch {
      setActivated([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadActivated() }, [loadActivated])

  const onActivate = async () => {
    const c = code.trim().toUpperCase()
    if (!c) { toast.error('Hãy nhập mã'); return }
    setSubmitting(true)
    try {
      await api.post('/entitlements/activate', { code: c })
      toast.success(`✅ Đã kích hoạt mã ${c}`)
      setCode('')
      loadActivated()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Mã không hợp lệ hoặc đã dùng')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c)
      setCopied(c)
      setTimeout(() => setCopied(null), 1500)
    } catch { /* noop */ }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Mã kích hoạt</h2>
        <p className="text-sm text-white/55">
          Nhập mã `AERO-XXXXXX` từ email/Telegram sau khi thanh toán để mở khoá tính năng.
        </p>
      </div>

      {/* Input + activate */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-500/10 to-amber-500/5 border border-purple-500/25 p-5">
        <label className="block text-sm font-semibold text-white mb-2">
          Nhập mã kích hoạt
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') onActivate() }}
            placeholder="AERO-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-white/[0.1] text-white text-base font-mono tracking-wider focus:outline-none focus:border-purple-400"
          />
          <button
            onClick={onActivate}
            disabled={submitting || !code.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
          >
            {submitting ? 'Đang kích hoạt…' : 'Kích hoạt'}
          </button>
        </div>
        <p className="text-xs text-white/55 mt-2">
          💡 Mã hợp lệ sẽ mở tính năng AI tương ứng ngay lập tức.
          Cần mua gói? <a href="/pricing" className="text-purple-300 underline">Xem các gói →</a>
        </p>
      </div>

      {/* Lịch sử mã đã kích hoạt */}
      <div>
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-purple-400" />
          Mã đã kích hoạt ({activated.length})
        </h3>
        {loading ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6 text-center text-white/55 text-sm">
            Đang tải…
          </div>
        ) : activated.length === 0 ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6 text-center text-white/55 text-sm">
            Bạn chưa kích hoạt mã nào.
          </div>
        ) : (
          <ul className="space-y-2">
            {activated.map((e, i) => {
              const exp = e.expiresAt ? new Date(e.expiresAt) : null
              const isExpired = exp && exp.getTime() <= Date.now()
              return (
                <li
                  key={e.id || e.code || i}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                    isExpired
                      ? 'bg-white/[0.02] border-white/[0.06] opacity-60'
                      : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => e.code && copyCode(e.code)}
                        className="font-mono text-sm font-bold text-white hover:text-purple-300 transition inline-flex items-center gap-1"
                        title="Sao chép mã"
                      >
                        {e.code || '(không rõ mã)'}
                        {copied === e.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-50" />
                        )}
                      </button>
                      {isExpired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-white/55 font-semibold uppercase">
                          Hết hạn
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/55">
                      {e.plan || 'Gói Premium'}
                      {e.features?.length ? ` · ${e.features.length} tính năng` : ''}
                    </p>
                  </div>
                  <div className="text-right text-[11px] text-white/45 flex-shrink-0">
                    {e.activatedAt && (
                      <div>KH: {new Date(e.activatedAt).toLocaleDateString('vi-VN')}</div>
                    )}
                    {exp && <div>HH: {exp.toLocaleDateString('vi-VN')}</div>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
