/**
 * Forgot Password — bilingual (VI / EN)
 * Polish 2026-05-20: thêm tip kiểm tra Spam + nút "Gửi lại email" với cooldown 30s
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, GraduationCap, CheckCircle2, Mail, AlertCircle } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState<string>('')
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const schema = z.object({ email: z.string().email(t('validEmail')) })

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ email: string }>({ resolver: zodResolver(schema) })

  // Countdown timer cho nút "Gửi lại"
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const onSubmit = async ({ email }: { email: string }) => {
    setError(null)
    try {
      await authService.forgotPassword({ email })
      setSentEmail(email)
      setSent(true)
      setCooldown(30) // 30s cooldown
    } catch {
      setError(t('networkError'))
    }
  }

  const onResend = async () => {
    if (cooldown > 0 || resending || !sentEmail) return
    setResending(true)
    setError(null)
    try {
      await authService.forgotPassword({ email: sentEmail })
      setCooldown(30)
    } catch {
      setError(t('networkError'))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ai-page-bg)] px-4">
      {/* Language picker — top right */}
      <div className="fixed top-4 right-4">
        <LanguagePicker />
      </div>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">AeroEduVision</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-[hsl(142,76%,36%)] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">{t('success')}!</h2>
              <p className="text-muted-foreground text-sm mb-4">{t('forgotSuccess')}</p>

              {sentEmail && (
                <div className="mb-4 p-3 rounded-lg bg-muted border border-border text-left flex items-start gap-2">
                  <Mail className="w-4 h-4 text-[hsl(262,83%,58%)] shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-foreground font-medium break-all">{sentEmail}</p>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Kiểm tra cả folder Spam / Quảng cáo
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 items-center">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={cooldown > 0 || resending}
                  className="text-sm text-[hsl(262,83%,58%)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {resending && <Loader2 className="w-3 h-3 animate-spin" />}
                  {cooldown > 0
                    ? `Gửi lại sau ${cooldown}s`
                    : resending
                      ? 'Đang gửi...'
                      : 'Gửi lại email'}
                </button>
                <Link to="/auth/login" className="text-[hsl(262,83%,58%)] font-medium hover:underline text-sm">
                  ← {t('forgotBackToLogin')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">{t('forgotTitle')}</h1>
              <p className="text-muted-foreground text-sm mb-6">{t('forgotSubtitle')}</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                    <p className="mt-1 text-xs text-destructive">{errors.email.message as string}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? t('forgotLoading') : t('forgotButton')}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/auth/login" className="text-[hsl(262,83%,58%)] hover:underline">
                  ← {t('forgotBackToLogin')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
