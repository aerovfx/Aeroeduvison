/**
 * Customize — Tùy chỉnh trang cá nhân
 * Route: /profile/customize
 *
 * Cho user chỉnh: banner gradient/image, avatar frame, theme color,
 * bio markdown (500 chars), skills tags, social links, visibility toggles.
 * Có preview pane bên phải hiển thị live preview.
 */
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  Save, Eye, Edit3, Palette, Image as ImageIcon, Sparkles, Code,
  Facebook, Youtube, Github, Globe, Lock, Unlock, ArrowLeft, Check,
} from 'lucide-react'
import { userProfileService } from '@/services/userProfile.service'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import type {
  BannerStyle, AvatarFrame, ThemeColor, UserProfile, ProfileVisibility,
} from '@/types/profile'

// ── Preset constants ────────────────────────────────────────
const BANNER_PRESETS: { id: BannerStyle; label: string; preview: string }[] = [
  { id: 'gradient-purple', label: 'Tím Galaxy',    preview: 'banner-gradient-purple' },
  { id: 'gradient-blue',   label: 'Xanh Cyber',    preview: 'banner-gradient-blue' },
  { id: 'gradient-sunset', label: 'Hoàng hôn',     preview: 'banner-gradient-sunset' },
  { id: 'gradient-aurora', label: 'Cực quang',     preview: 'banner-gradient-aurora' },
  { id: 'gradient-ocean',  label: 'Đại dương',     preview: 'banner-gradient-ocean' },
  { id: 'gradient-forest', label: 'Rừng xanh',     preview: 'banner-gradient-forest' },
  { id: 'gradient-mono',   label: 'Đơn sắc',       preview: 'banner-gradient-mono' },
  { id: 'custom-image',    label: 'Ảnh tùy chỉnh', preview: 'bg-white/5 border border-dashed border-white/30' },
]

const FRAME_PRESETS: { id: AvatarFrame; label: string }[] = [
  { id: 'none',     label: 'Không khung' },
  { id: 'gold',     label: 'Viền vàng' },
  { id: 'neon',     label: 'Neon phát sáng' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'hexagon',  label: 'Lục giác' },
  { id: 'animated', label: 'Cầu vồng động' },
]

const THEME_PRESETS: { id: ThemeColor; label: string; bg: string }[] = [
  { id: 'purple', label: 'Tím',   bg: 'bg-purple-500' },
  { id: 'blue',   label: 'Xanh',  bg: 'bg-blue-500' },
  { id: 'green',  label: 'Lá',    bg: 'bg-green-500' },
  { id: 'red',    label: 'Đỏ',    bg: 'bg-red-500' },
  { id: 'pink',   label: 'Hồng',  bg: 'bg-pink-500' },
  { id: 'amber',  label: 'Hổ phách', bg: 'bg-amber-500' },
  { id: 'cyan',   label: 'Lam',   bg: 'bg-cyan-500' },
  { id: 'slate',  label: 'Xám',   bg: 'bg-slate-500' },
]

// ── Form state type ──────────────────────────────────────────
interface FormState {
  bio: string
  bannerStyle: BannerStyle
  bannerImageUrl: string
  avatarFrame: AvatarFrame
  themeColor: ThemeColor
  skillsText: string  // comma-separated input
  facebook: string
  youtube: string
  github: string
  website: string
  visibility: ProfileVisibility
}

const DEFAULT_FORM: FormState = {
  bio: '',
  bannerStyle: 'gradient-purple',
  bannerImageUrl: '',
  avatarFrame: 'none',
  themeColor: 'purple',
  skillsText: '',
  facebook: '',
  youtube: '',
  github: '',
  website: '',
  visibility: {
    bio: true, stats: true, skills: true,
    socials: true, achievements: true, showcase: true,
  },
}

// ── URL validator ────────────────────────────────────────────
function isValidUrl(s: string): boolean {
  if (!s) return true
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    return u.hostname.includes('.')
  } catch { return false }
}

export default function Customize() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [showMobilePreview, setShowMobilePreview] = useState(false)

  // ── Load existing profile ─────────────────────────────────
  const { data: existing, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => userProfileService.getMyProfile(),
  })

  // Hydrate form once when existing arrives
  useEffect(() => {
    if (!existing?.profile) return
    const p = existing.profile
    setForm({
      bio: p.bio || '',
      bannerStyle: (p.bannerStyle as BannerStyle) || 'gradient-purple',
      bannerImageUrl: p.bannerImageUrl || '',
      avatarFrame: (p.avatarFrame as AvatarFrame) || 'none',
      themeColor: (p.themeColor as ThemeColor) || 'purple',
      skillsText: (p.skills || []).join(', '),
      facebook: p.socials?.facebook || '',
      youtube: p.socials?.youtube || '',
      github: p.socials?.github || '',
      website: p.socials?.website || '',
      visibility: {
        bio: p.visibility?.bio ?? true,
        stats: p.visibility?.stats ?? true,
        skills: p.visibility?.skills ?? true,
        socials: p.visibility?.socials ?? true,
        achievements: p.visibility?.achievements ?? true,
        showcase: p.visibility?.showcase ?? true,
      },
    })
  }, [existing])

  // ── Save mutation ─────────────────────────────────────────
  const save = useMutation({
    mutationFn: (patch: Partial<UserProfile>) => userProfileService.updateMyProfile(patch),
    onSuccess: () => {
      toast.success('Đã lưu trang cá nhân!')
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      if (user?.id) qc.invalidateQueries({ queryKey: ['user-profile', user.id] })
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lưu không thành công, thử lại nhé.')
    },
  })

  // ── Derived: parsed skills ───────────────────────────────
  const skillsArr = useMemo(() => form.skillsText
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20), [form.skillsText])

  // Bio char counter
  const bioLen = form.bio.length

  // ── Submit handler ───────────────────────────────────────
  const handleSave = () => {
    // URL validation
    for (const [key, val] of Object.entries({
      facebook: form.facebook, youtube: form.youtube,
      github: form.github, website: form.website,
    })) {
      if (val && !isValidUrl(val)) {
        toast.error(`Link ${key} không hợp lệ`)
        return
      }
    }
    if (form.bannerStyle === 'custom-image' && form.bannerImageUrl && !isValidUrl(form.bannerImageUrl)) {
      toast.error('URL ảnh banner không hợp lệ')
      return
    }

    save.mutate({
      bio: form.bio.trim(),
      bannerStyle: form.bannerStyle,
      bannerImageUrl: form.bannerStyle === 'custom-image' ? form.bannerImageUrl.trim() : '',
      avatarFrame: form.avatarFrame,
      themeColor: form.themeColor,
      skills: skillsArr,
      socials: {
        facebook: form.facebook.trim(),
        youtube: form.youtube.trim(),
        github: form.github.trim(),
        website: form.website.trim(),
      },
      visibility: form.visibility,
    })
  }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(s => ({ ...s, [k]: v }))

  const toggleVis = (k: keyof ProfileVisibility) =>
    setForm(s => ({ ...s, visibility: { ...s.visibility, [k]: !s.visibility[k] } }))

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-white/10 rounded" />
          <div className="h-96 bg-white/10 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-purple-400" />
              Tùy chỉnh trang cá nhân
            </h1>
            <p className="text-sm text-gray-400">Trang của bạn sẽ hiển thị tại <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs">/u/{user?.id || 'me'}</code></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Link
              to={`/u/${user.id}`}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
            >
              <Eye className="w-4 h-4" />
              Xem công khai
            </Link>
          )}
          <button
            onClick={() => setShowMobilePreview(v => !v)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showMobilePreview ? 'Sửa' : 'Xem'}
          </button>
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {save.isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Lưu
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr,420px] gap-6">
        {/* ═══════════ FORM PANE ═══════════ */}
        <div className={cn('space-y-6', showMobilePreview && 'hidden lg:block')}>

          {/* ── Banner picker ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              Banner trang cá nhân
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {BANNER_PRESETS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setField('bannerStyle', b.id)}
                  className={cn(
                    'relative h-16 rounded-lg overflow-hidden transition-all',
                    b.preview,
                    form.bannerStyle === b.id
                      ? 'ring-2 ring-purple-400 scale-[1.02]'
                      : 'ring-1 ring-white/10 hover:ring-white/30'
                  )}
                  title={b.label}
                >
                  {b.id === 'custom-image' && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-300 text-center px-1">
                      Ảnh tùy chỉnh
                    </span>
                  )}
                  {form.bannerStyle === b.id && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 truncate font-medium">
                    {b.label}
                  </span>
                </button>
              ))}
            </div>
            {form.bannerStyle === 'custom-image' && (
              <input
                type="url"
                value={form.bannerImageUrl}
                onChange={e => setField('bannerImageUrl', e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="mt-3 w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            )}
          </section>

          {/* ── Avatar frame ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Khung ảnh đại diện
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {FRAME_PRESETS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setField('avatarFrame', f.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all',
                    form.avatarFrame === f.id
                      ? 'bg-purple-500/20 ring-1 ring-purple-400'
                      : 'bg-white/5 hover:bg-white/10'
                  )}
                  title={f.label}
                >
                  <div className={cn('relative', f.id !== 'none' && `avatar-frame-${f.id}`)}>
                    <div className={cn(
                      'w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-200',
                      f.id === 'none' && 'ring-2 ring-white/10'
                    )}>
                      {(user?.name || 'U')[0].toUpperCase()}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 text-center leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Theme color ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              Màu chủ đạo
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {THEME_PRESETS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setField('themeColor', t.id)}
                  className={cn(
                    'aspect-square rounded-lg transition-transform',
                    t.bg,
                    form.themeColor === t.id
                      ? 'scale-110 ring-2 ring-white/60 shadow-lg'
                      : 'hover:scale-105'
                  )}
                  title={t.label}
                >
                  {form.themeColor === t.id && (
                    <Check className="w-5 h-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* ── Bio ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Edit3 className="w-4 h-4 text-purple-400" />
                Giới thiệu
              </h2>
              <span className={cn(
                'text-xs',
                bioLen > 500 ? 'text-red-400' : bioLen > 450 ? 'text-amber-400' : 'text-gray-500'
              )}>
                {bioLen}/500
              </span>
            </div>
            <textarea
              value={form.bio}
              onChange={e => setField('bio', e.target.value.slice(0, 500))}
              rows={5}
              placeholder="Viết vài dòng giới thiệu về bạn... Hỗ trợ **đậm**, *nghiêng*, `code`"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Hỗ trợ markdown nhẹ: <code>**đậm**</code>, <code>*nghiêng*</code>, <code>`code`</code>
            </p>
          </section>

          {/* ── Skills ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <Code className="w-4 h-4 text-purple-400" />
              Kỹ năng & sở thích
            </h2>
            <input
              type="text"
              value={form.skillsText}
              onChange={e => setField('skillsText', e.target.value)}
              placeholder="Vật lí, Toán, Lập trình, Robotics, Đàn guitar"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Phân tách bằng dấu phẩy. Tối đa 20 mục, mỗi mục ≤ 24 ký tự.
            </p>
            {skillsArr.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skillsArr.map((s, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-purple-500/15 text-purple-300 ring-1 ring-purple-500/30">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── Social links ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <Globe className="w-4 h-4 text-purple-400" />
              Liên hệ
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {([
                { k: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400' },
                { k: 'youtube',  label: 'YouTube',  icon: Youtube,  color: 'text-red-400' },
                { k: 'github',   label: 'GitHub',   icon: Github,   color: 'text-gray-300' },
                { k: 'website',  label: 'Website',  icon: Globe,    color: 'text-purple-400' },
              ] as const).map(item => {
                const Icon = item.icon
                const value = form[item.k]
                const invalid = value && !isValidUrl(value)
                return (
                  <div key={item.k}>
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <Icon className={cn('w-3 h-3', item.color)} />
                      {item.label}
                    </label>
                    <input
                      type="url"
                      value={value}
                      onChange={e => setField(item.k, e.target.value)}
                      placeholder={`https://${item.k}.com/...`}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg bg-white/5 border text-sm text-white placeholder-gray-500 focus:outline-none',
                        invalid ? 'border-red-500 focus:border-red-400' : 'border-white/10 focus:border-purple-500'
                      )}
                    />
                    {invalid && <p className="mt-1 text-xs text-red-400">URL không hợp lệ</p>}
                  </div>
                )
              })}
            </div>
          </section>

          {/* ── Visibility toggles ── */}
          <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white mb-3">
              <Lock className="w-4 h-4 text-purple-400" />
              Hiển thị công khai
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Tắt để ẩn section khỏi người xem khác (bạn vẫn nhìn thấy khi tự xem).
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { k: 'bio',          label: 'Giới thiệu' },
                { k: 'stats',        label: 'Thống kê' },
                { k: 'skills',       label: 'Kỹ năng' },
                { k: 'socials',      label: 'Liên hệ' },
                { k: 'achievements', label: 'Huy hiệu' },
                { k: 'showcase',     label: 'Dự án/Khoá' },
              ] as const).map(item => {
                const on = form.visibility[item.k] !== false
                return (
                  <button
                    key={item.k}
                    onClick={() => toggleVis(item.k)}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      on
                        ? 'bg-green-500/10 text-green-300 ring-1 ring-green-500/30'
                        : 'bg-white/5 text-gray-400 ring-1 ring-white/10'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      {on ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {item.label}
                    </span>
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      on ? 'bg-green-500/20' : 'bg-white/10'
                    )}>
                      {on ? 'HIỆN' : 'ẨN'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        {/* ═══════════ PREVIEW PANE ═══════════ */}
        <aside className={cn(
          'lg:sticky lg:top-4 lg:self-start',
          !showMobilePreview && 'hidden lg:block'
        )}>
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/10 flex items-center gap-2 text-xs text-gray-400">
              <Eye className="w-3.5 h-3.5" />
              Xem trước trang công khai
            </div>
            <PreviewPane form={form} userName={user?.name || ''} userImage={user?.image || null} />
          </div>
          {/* Mobile Save button (duplicate khi preview mode) */}
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="lg:hidden mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {save.isPending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Lưu thay đổi
          </button>
        </aside>
      </div>
    </div>
  )
}

// ── Preview pane component ──────────────────────────────────
function PreviewPane({
  form, userName, userImage,
}: { form: FormState; userName: string; userImage: string | null }) {
  const bannerCls = form.bannerStyle === 'custom-image'
    ? 'bg-white/5'
    : `banner-${form.bannerStyle}`
  const frameCls = form.avatarFrame !== 'none' ? `avatar-frame-${form.avatarFrame}` : ''
  const skillsArr = form.skillsText
    .split(',').map(s => s.trim()).filter(Boolean).slice(0, 20)

  const bioHtml = useMemo(() => {
    if (!form.bio) return ''
    return form.bio
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-white/10 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br/>')
  }, [form.bio])

  return (
    <div className="p-4">
      {/* Mini banner */}
      <div
        className={cn('h-28 rounded-xl overflow-hidden relative', bannerCls)}
        style={form.bannerStyle === 'custom-image' && form.bannerImageUrl ? {
          background: `url("${form.bannerImageUrl}") center / cover no-repeat`,
        } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Mini avatar */}
      <div className="relative -mt-10 ml-2">
        <div className={cn('inline-block', frameCls)}>
          <div className={cn(
            'w-20 h-20 rounded-full overflow-hidden bg-gray-700',
            !frameCls && 'ring-4 ring-[#0a0a0a]'
          )}>
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-purple-300 bg-purple-500/20">
                {(userName || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 px-2">
        <div className="text-lg font-bold text-white truncate">{userName || 'Tên của bạn'}</div>

        {form.bio && form.visibility.bio !== false && (
          <div
            className="mt-3 text-xs text-gray-300 leading-relaxed line-clamp-6"
            dangerouslySetInnerHTML={{ __html: bioHtml }}
          />
        )}

        {skillsArr.length > 0 && form.visibility.skills !== false && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {skillsArr.slice(0, 8).map((s, i) => (
              <span key={i} className={cn(
                'px-2 py-0.5 rounded-full text-[10px] ring-1',
                `bg-${form.themeColor}-500/10 text-${form.themeColor}-300 ring-${form.themeColor}-500/30`
              )}>
                {s}
              </span>
            ))}
            {skillsArr.length > 8 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-gray-400">
                +{skillsArr.length - 8}
              </span>
            )}
          </div>
        )}

        {form.visibility.socials !== false &&
          (form.facebook || form.youtube || form.github || form.website) && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {form.facebook && <Facebook className="w-4 h-4 text-blue-400" />}
            {form.youtube && <Youtube className="w-4 h-4 text-red-400" />}
            {form.github && <Github className="w-4 h-4 text-gray-300" />}
            {form.website && <Globe className="w-4 h-4 text-purple-400" />}
          </div>
        )}

        <p className="mt-4 text-[10px] text-gray-500 italic">
          Đây là bản xem rút gọn. Nhấn Lưu để cập nhật trang công khai.
        </p>
      </div>
    </div>
  )
}
