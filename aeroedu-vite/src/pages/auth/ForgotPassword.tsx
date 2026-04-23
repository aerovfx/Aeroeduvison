/**
 * Forgot Password — bilingual (VI / EN)
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguagePicker } from '@/components/ui/LanguagePicker'

export default function ForgotPasswordPage() {
  const { t } = useLanguage()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const schema = z.object({ email: z.string().email(t('validEmail')) })

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<{ email: string }>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ email }: { email: string }) => {
    setError(null)
    try {
      await authService.forgotPassword({ email })
      setSent(true)
    } catch {
      setError(t('networkError'))
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
              <p className="text-muted-foreground text-sm mb-6">{t('forgotSuccess')}</p>
              <Link to="/auth/login" className="text-[hsl(262,83%,58%)] font-medium hover:underline text-sm">
                ← {t('forgotBackToLogin')}
              </Link>
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
