/**
 * Login Page — bilingual (VI / EN)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, GraduationCap, Shield, KeyRound, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'
import { loadGsi } from '@/lib/loadGsi'
import { getGoogleClientId } from '@/lib/googleClientId'
import { isNative } from '@/lib/capacitor/native'
import { isNativeGoogleAvailable, nativeGoogleSignIn } from '@/lib/capacitor/googleAuth'
import { twoFactorService } from '@/services/twoFactor.service'

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
  // 2FA challenge state — khi server trả require2FA, lưu tempToken và hiển thị
  // màn nhập mã 6 số (hoặc 8 ký tự backup code).
  const [twoFactorState, setTwoFactorState] = useState<{
    tempToken: string
  } | null>(null)
  const { login, googleLogin, complete2FALogin } = useAuth()
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
        // Hiện ĐÚNG lý do từ server (vd "Tài khoản đã bị khoá", "Google
        // credential không hợp lệ", "Lỗi xác thực Google…") thay vì luôn báo
        // generic → dễ chẩn đoán. Không có response (lỗi mạng) → generic.
        const data = err?.response?.data
        setError(data?.error || t('loginGoogleError'))
      } finally {
        setGoogleLoading(false)
      }
    },
    [from, navigate, t, googleLogin]
  )

  // ── Native (iOS app): Google Sign-In qua SDK native (GSI không chạy trong
  // WKWebView). Lấy idToken → cùng đường googleLogin() như web. ──
  const handleNativeGoogle = useCallback(async () => {
    setGoogleLoading(true)
    setError(null)
    try {
      const idToken = await nativeGoogleSignIn()
      await googleLogin(idToken)
      navigate(from, { replace: true })
    } catch (err: any) {
      const msg = String(err?.message || '')
      // User huỷ hộp thoại Google → không coi là lỗi.
      if (/cancel|canceled|cancelled|-5|user.*dismiss/i.test(msg)) { /* im lặng */ }
      else {
        const data = err?.response?.data
        setError(data?.error || t('loginGoogleError'))
      }
    } finally {
      setGoogleLoading(false)
    }
  }, [from, navigate, t, googleLogin])

  // Always keep callbackRef up-to-date so the stable arrow fn below
  // always calls the latest version (avoids stale closure on navigate-back)
  useEffect(() => {
    callbackRef.current = handleGoogleCredential
  }, [handleGoogleCredential])

  // ── Khởi tạo Google GSI (1 lần/session) và render button (mỗi lần mount) ──
  // Script gsi/client được lazy-load (trước đây đặt trong <head> của index.html
  // → block FCP trên MỌI trang, kể cả Landing không dùng Google Sign-In).
  useEffect(() => {
    // Native (iOS app) → KHÔNG dùng GSI (không chạy trong WKWebView); dùng nút
    // native riêng gọi nativeGoogleSignIn(). Bỏ qua toàn bộ setup GSI.
    if (isNative()) return
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
      const result = await login(data.email, data.password)
      if (result.kind === 'require2FA') {
        // Server yêu cầu 2FA → chuyển sang màn nhập mã (KHÔNG navigate yet)
        setTwoFactorState({ tempToken: result.tempToken })
        return
      }
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
          {twoFactorState ? (
            <TwoFactorChallenge
              tempToken={twoFactorState.tempToken}
              onCancel={() => {
                setTwoFactorState(null)
                setError(null)
              }}
              onSuccess={(user) => {
                complete2FALogin(user)
                navigate(from, { replace: true })
              }}
            />
          ) : (
          <>
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

          {/* ── Google Sign-In ── web: button render bởi GSI SDK; native (app iOS):
                nút riêng gọi Google SDK native (GSI không chạy trong WKWebView) ── */}
          {googleLoading ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-input py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loginGoogleLoading')}
            </div>
          ) : isNativeGoogleAvailable() ? (
            <button
              type="button"
              onClick={handleNativeGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background py-2.5 text-sm font-medium text-foreground hover:bg-accent transition"
              style={{ minHeight: '44px' }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              {language === 'vi' ? 'Đăng nhập với Google' : 'Sign in with Google'}
            </button>
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
          </>
          )}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 2FA challenge sau khi user nhập email/password đúng và server yêu
// cầu mã 2 lớp. Hỗ trợ cả mã TOTP (6 số) và backup code (8 ký tự).
// ════════════════════════════════════════════════════════════════
function TwoFactorChallenge({
  tempToken,
  onSuccess,
  onCancel,
}: {
  tempToken: string
  onSuccess: (user: any) => void
  onCancel: () => void
}) {
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [useBackup])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const minLen = useBackup ? 8 : 6
    const cleaned = useBackup
      ? code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
      : code.replace(/\D/g, '').slice(0, 6)
    if (cleaned.length < minLen) {
      setError(useBackup ? 'Mã dự phòng phải có 8 ký tự' : 'Mã phải có 6 chữ số')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { user } = await twoFactorService.verifyLogin(tempToken, cleaned)
      onSuccess(user)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Mã không đúng. Thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-5 h-5 text-purple-400" />
        <h1 className="text-2xl font-bold text-foreground">Xác thực 2 lớp</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        {useBackup
          ? 'Nhập mã dự phòng 8 ký tự (chỉ dùng được 1 lần).'
          : 'Mở ứng dụng Authenticator và nhập mã 6 số hiện tại.'}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          ref={inputRef}
          type="text"
          inputMode={useBackup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          value={code}
          onChange={e => {
            setCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))
            setError(null)
          }}
          maxLength={useBackup ? 8 : 6}
          placeholder={useBackup ? 'ABCD2345' : '000000'}
          className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-2xl font-mono text-center tracking-[0.4em] outline-none focus:ring-2 focus:ring-ring uppercase"
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Đang xác thực...' : 'Xác thực'}
        </button>
      </form>

      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => {
            setUseBackup(b => !b)
            setCode('')
            setError(null)
          }}
          className="text-[hsl(262,83%,58%)] hover:underline flex items-center gap-1.5"
        >
          <KeyRound className="w-3.5 h-3.5" />
          {useBackup ? 'Dùng mã từ ứng dụng' : 'Mất điện thoại? Dùng mã dự phòng'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Đăng nhập tài khoản khác
        </button>
      </div>
    </div>
  )
}
