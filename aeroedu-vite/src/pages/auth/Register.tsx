/**
 * Register Page — bilingual (VI / EN)
 */
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, GraduationCap, User as UserIcon, Briefcase } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'

export default function RegisterPage() {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT')
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
      await registerUser(data.name, data.email, data.password, role)
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

          {/* Role picker — Học sinh / Giáo viên (mặc định Học sinh) */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-foreground mb-2">Bạn là:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('STUDENT')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  role === 'STUDENT'
                    ? 'border-[hsl(262,83%,58%)] bg-[hsl(262,83%,58%)]/8 text-foreground'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                }`}
              >
                <UserIcon className={`w-5 h-5 ${role === 'STUDENT' ? 'text-[hsl(262,83%,58%)]' : ''}`} />
                <span className="font-semibold text-sm">Học sinh</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  Học, làm bài thi, dùng AI Tutor cơ bản
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole('TEACHER')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  role === 'TEACHER'
                    ? 'border-[hsl(175,80%,45%)] bg-[hsl(175,80%,45%)]/8 text-foreground'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                }`}
              >
                <Briefcase className={`w-5 h-5 ${role === 'TEACHER' ? 'text-[hsl(175,80%,45%)]' : ''}`} />
                <span className="font-semibold text-sm">Giáo viên</span>
                <span className="text-[11px] text-muted-foreground text-center leading-tight">
                  Soạn đề, ma trận, quản lý lớp
                </span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
              Tài khoản Giáo viên có thêm module soạn đề + quản lý lớp. Có thể nâng cấp sau qua liên hệ admin.
            </p>
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
