import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, GraduationCap, CheckCircle2 } from 'lucide-react'
import { authService } from '@/services/auth.service'

const schema = z.object({
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu không khớp',
  path: ['confirmPassword'],
})

export default function ResetPasswordPage() {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string; confirmPassword: string }>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ password }: { password: string; confirmPassword: string }) => {
    if (!token) { setError('Token không hợp lệ'); return }
    setError(null)
    try {
      await authService.resetPassword({ token, password })
      setDone(true)
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch {
      setError('Đặt lại mật khẩu thất bại. Token có thể đã hết hạn.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ai-page-bg)] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(262,83%,58%)] to-[hsl(217,91%,60%)] flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">AeroEduVision</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          {done ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-[hsl(142,76%,36%)] mx-auto mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-2">Đặt lại thành công!</h2>
              <p className="text-muted-foreground text-sm">Đang chuyển về trang đăng nhập...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-1">Đặt lại mật khẩu</h1>
              <p className="text-muted-foreground text-sm mb-6">Nhập mật khẩu mới của bạn</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Mật khẩu mới</label>
                  <input
                    {...register('password')}
                    type="password"
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
                  />
                  {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message as string}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Xác nhận mật khẩu</label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message as string}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white font-medium text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Đặt lại mật khẩu
                </button>
              </form>

              <p className="mt-6 text-center text-sm">
                <Link to="/auth/login" className="text-[hsl(262,83%,58%)] hover:underline">
                  ← Quay lại đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
