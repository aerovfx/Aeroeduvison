/**
 * Register Page — bilingual (VI / EN)
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, GraduationCap, User as UserIcon, Briefcase, Heart } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'

export default function RegisterPage() {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // UI-level account type. Backend chỉ có STUDENT / TEACHER.
  // PARENT chia chung tài khoản với TEACHER (cùng quyền quản lý lớp, xem báo
  // cáo học sinh — nhưng UI hiển thị "Phụ huynh" thay vì "Giáo viên").
  type AccountType = 'STUDENT' | 'TEACHER' | 'PARENT'
  const [accountType, setAccountType] = useState<AccountType>('STUDENT')
  // role thực để gửi BE: PARENT → TEACHER
  const role: 'STUDENT' | 'TEACHER' = accountType === 'STUDENT' ? 'STUDENT' : 'TEACHER'
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Preserve intended URL (vd học sinh quét QR đề thi → ?startExam=...)
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from
  const from = fromLocation
    ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}` || '/dashboard'
    : '/dashboard'

  const registerSchema = z.object({
    name:            z.string().min(2, t('validNameMin2')),
    email:           z.string().email(t('validEmail')),
    password:        z.string().min(8, t('validPwdMin8')),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t('validPwdMatch'),
    path: ['confirmPassword'],
  })
  type RegisterFormData = z.infer<typeof registerSchema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    try {
      await registerUser(data.name, data.email, data.password, role, accountType)
      // Lưu sub-type "PARENT" vào localStorage để UI ngay lập tức biết
      // (server cũng đã lưu UserProfile.accountType — bền qua thiết bị).
      if (accountType === 'PARENT') {
        try { localStorage.setItem('userSubType', 'PARENT') } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem('userSubType') } catch { /* ignore */ }
      }
      navigate(from, { replace: true })
    } catch (err: unknown) {
      type ApiErr = {
        response?: { status?: number; data?: { message?: string; error?: string } | string }
      }
      const e = err as ApiErr
      if (!e.response) {
        setError(t('networkError'))
      } else {
        const status = e.response.status ?? 0
        const d = typeof e.response.data === 'object' ? e.response.data : null
        const msg = d?.message || d?.error
        if (status === 502 || status === 503 || status === 504) {
          setError(t('backendUnavailable'))
        } else if (status >= 500) {
          setError(msg || t('serverError'))
        } else {
          setError(msg || t('registerError'))
        }
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ai-page-bg)] px-4">
      {/* Language picker — top right */}
      <div className="fixed top-4 right-4">
        <LanguagePicker />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">AeroEduVision</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('registerTitle')}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t('registerSubtitle')}</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Role picker — 3 lựa chọn: Học sinh / Giáo viên / Phụ huynh
              GHI CHÚ: Giáo viên & Phụ huynh dùng CHUNG 1 loại tài khoản (TEACHER)
              vì cả 2 đều cần quyền theo dõi tiến độ + quản lý nhóm HS.
              Khác biệt chỉ ở label hiển thị + tone UI. */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2">Bạn là:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('STUDENT')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                  accountType === 'STUDENT'
                    ? 'border-[hsl(262,83%,58%)] bg-[hsl(262,83%,58%)]/8 text-foreground'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                }`}
              >
                <UserIcon className={`w-5 h-5 ${accountType === 'STUDENT' ? 'text-[hsl(262,83%,58%)]' : ''}`} />
                <span className="font-semibold text-xs">Học sinh</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Học, làm thi, AI Tutor
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('TEACHER')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                  accountType === 'TEACHER'
                    ? 'border-[hsl(175,80%,45%)] bg-[hsl(175,80%,45%)]/8 text-foreground'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                }`}
              >
                <Briefcase className={`w-5 h-5 ${accountType === 'TEACHER' ? 'text-[hsl(175,80%,45%)]' : ''}`} />
                <span className="font-semibold text-xs">Giáo viên</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Soạn đề, quản lý lớp
                </span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('PARENT')}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                  accountType === 'PARENT'
                    ? 'border-[hsl(340,82%,60%)] bg-[hsl(340,82%,60%)]/8 text-foreground'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                }`}
              >
                <Heart className={`w-5 h-5 ${accountType === 'PARENT' ? 'text-[hsl(340,82%,60%)]' : ''}`} />
                <span className="font-semibold text-xs">Phụ huynh</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">
                  Theo dõi con học
                </span>
              </button>
            </div>
            {accountType === 'PARENT' && (
              <p className="text-[11px] text-pink-400 mt-2 leading-tight bg-pink-500/[0.06] border border-pink-500/15 rounded-lg p-2">
                💡 Tài khoản Phụ huynh dùng chung quyền với Giáo viên — cho phép theo dõi
                tiến độ con, xem điểm thi, nhận thông báo và liên hệ giáo viên.
              </p>
            )}
            {accountType === 'TEACHER' && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
                Tài khoản Giáo viên có module soạn đề + ma trận + quản lý lớp. Có thể
                nâng cấp gói AI sau qua liên hệ admin.
              </p>
            )}
            {accountType === 'STUDENT' && (
              <p className="text-[11px] text-muted-foreground mt-2 leading-tight">
                Tài khoản Học sinh học các khoá free, làm bài tập, đề thi GV giao, và
                dùng AI Tutor cơ bản miễn phí.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('fieldFullName')}
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('fieldEmail')}
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="example@email.com"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('fieldPassword')}
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('fieldConfirmPwd')}
              </label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? t('registerLoading') : t('registerButton')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('registerHasAccount')}{' '}
            <Link to="/auth/login" className="text-[hsl(262,83%,58%)] font-medium hover:underline">
              {t('registerLoginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
