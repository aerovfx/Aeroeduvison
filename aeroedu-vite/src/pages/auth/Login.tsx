/**
 * Login Page — bilingual (VI / EN)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, GraduationCap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'
import { loadGsi } from '@/lib/loadGsi'
import { getGoogleClientId } from '@/lib/googleClientId'

// ── Module-level GSI guard ──────────────────────────────────
// useRef resets to false on every remount (navigate away → back).
// A module-level variable persists for the lifetime of the page session,
// preventing google.accounts.id.initialize() from being called more than once
// regardless of StrictMode double-effects or React Router remounts.
let _gsiInitialized = false

// ── Google GSI types ────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              width?: number
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              locale?: string
            }
          ) => void
          prompt: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const { t, language } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, googleLogin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const googleButtonRef = useRef<HTMLDivElement>(null)
  // callbackRef: keeps handleGoogleCredential current without re-initializing GSI
  const callbackRef = useRef<(r: { credential: string }) => void>(() => {})

  // Preserve full intended URL incl. ?query và #hash (vd học sinh quét QR
  // /student/exam-prep?startExam=ID&type=exam → cần giữ query để auto-start
  // đề thi sau khi login).
  const fromLocation = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from
  const from = fromLocation
    ? `${fromLocation.pathname || ''}${fromLocation.search || ''}${fromLocation.hash || ''}` || '/dashboard'
    : '/dashboard'

  // ── Google GSI callback — nhận credential sau khi user chọn tài khoản ──
  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setGoogleLoading(true)
      setError(null)
      try {
        // ── Đi qua AuthContext.googleLogin (KHÔNG gọi authService trực tiếp) ──
        // setUser() phải chạy trước khi navigate, nếu không ProtectedRoute
        // sẽ kick về login lần đầu vì isAuthenticated vẫn false (user state null).
        await googleLogin(response.credential)
        navigate(from, { replace: true })
      } catch (err: any) {
        // Server có thể trả 503 + { retryable: true, error: "..." } khi DB
        // quá tải — hiển thị thông điệp friendly thay vì generic.
        const data = err?.response?.data
        if (data?.retryable && data?.error) {
          setError(data.error)
        } else {
          setError(t('loginGoogleError'))
        }
      } finally {
        setGoogleLoading(false)
      }
    },
    [from, navigate, t, googleLogin]
  )

  // Always keep callbackRef up-to-date so the stable arrow fn below
  // always calls the latest version (avoids stale closure on navigate-back)
  useEffect(() => {
    callbackRef.current = handleGoogleCredential
  }, [handleGoogleCredential])

  // ── Khởi tạo Google GSI (1 lần/session) và render button (mỗi lần mount) ──
  // Script gsi/client được lazy-load (trước đây đặt trong <head> của index.html
  // → block FCP trên MỌI trang, kể cả Landing không dùng Google Sign-In).
  useEffect(() => {
    // Use env var if baked into bundle; otherwise fall back to hardcoded
    // public Client ID so the button never silently disappears in production
    // (see src/lib/googleClientId.ts for rationale).
    const clientId = getGoogleClientId()
    if (!clientId) return

    let cancelled = false

    const setupGSI = () => {
      if (cancelled) return
      if (!window.google?.accounts?.id || !googleButtonRef.current) return

      // initialize() → chỉ gọi 1 lần duy nhất trong toàn bộ page session
      // (_gsiInitialized là module-level, không bị reset khi component remount)
      if (!_gsiInitialized) {
        _gsiInitialized = true
        window.google.accounts.id.initialize({
          client_id: clientId,
          // Stable arrow fn — delegates to the latest callback via ref
          callback: (r: { credential: string }) => callbackRef.current(r),
          auto_select: false,
          cancel_on_tap_outside: true,
        })
      }

      // renderButton() → gọi mỗi lần mount để render vào DOM element hiện tại
      // (cần thiết khi user navigate away → back, DOM element đã thay đổi)
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: googleButtonRef.current.offsetWidth || 360,
        text: 'signin_with',
        locale: language === 'vi' ? 'vi' : 'en',
      })
    }

    // Lazy-load GSI script rồi khởi tạo
    loadGsi()
      .then(setupGSI)
      .catch((err) => {
        // Network hoặc GSI blocked → chỉ log, form email/password vẫn hoạt động
        console.warn('[Login] GSI load failed:', err)
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]) // re-render button khi đổi ngôn ngữ

  const loginSchema = z.object({
    email:    z.string().email(t('validEmail')),
    password: z.string().min(6, t('validPwdMin6')),
  })
  type LoginFormData = z.infer<typeof loginSchema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    try {
      await login(data.email, data.password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      // Phân loại lỗi theo nguồn:
      // - No response (network error / backend down) → networkError
      // - 5xx (server error, proxy fail)             → serverError
      // - 4xx { error/message } từ auth-service      → auth message
      type ApiErr = {
        response?: { status?: number; data?: { message?: string; error?: string } | string }
        request?: unknown
      }
      const e = err as ApiErr
      if (!e.response) {
        // Axios không nhận được response → backend offline hoặc mất mạng
        setError(t('networkError'))
      } else {
        const status = e.response.status ?? 0
        const d = typeof e.response.data === 'object' ? e.response.data : null
        const msg = d?.message || d?.error
        if (status === 502 || status === 503 || status === 504) {
          // Gateway/proxy không reach được auth-service (ECONNREFUSED / timeout)
          // → đây là lỗi service, không phải lỗi mạng của user
          setError(t('backendUnavailable'))
        } else if (status >= 500) {
          // 500: server lỗi nội bộ
          setError(msg || t('serverError'))
        } else {
          // 401/403: sai credentials hoặc account bị khóa
          setError(msg || t('loginError'))
        }
      }
    }
  }

  // ── Dismiss on outside click ─────────────────────────────────
  // Clicking the empty background (not the card, logo, or language picker)
  // returns user to the landing page. e.target === e.currentTarget ensures
  // only the outer wrapper itself triggers — any click that bubbles up from
  // a child element (card, input, LanguagePicker) is ignored.
  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      navigate('/')
    }
  }

  // ESC also dismisses — matches typical modal affordance
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[var(--ai-page-bg)] px-4"
      onMouseDown={handleBackdropMouseDown}
    >
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

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          <h1 className="text-2xl font-bold text-foreground mb-1">{t('loginTitle')}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t('loginSubtitle')}</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-foreground">
                  {t('fieldPassword')}
                </label>
                <Link to="/auth/forgot-password" className="text-xs text-[hsl(262,83%,58%)] hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white font-medium text-sm transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? t('loginLoading') : t('loginButton')}
            </button>
          </form>

          {/* ── Divider "Hoặc tiếp tục với" ── */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">
                {t('loginOrContinue')}
              </span>
            </div>
          </div>

          {/* ── Google Sign-In button (rendered by GSI SDK) ── */}
          {googleLoading ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loginGoogleLoading')}
            </div>
          ) : (
            <div
              ref={googleButtonRef}
              className="w-full overflow-hidden rounded-lg"
              style={{ minHeight: '44px' }}
            />
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('loginNoAccount')}{' '}
            <Link to="/auth/register" state={location.state}
              className="text-[hsl(262,83%,58%)] font-medium hover:underline">
              {t('loginRegisterLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
