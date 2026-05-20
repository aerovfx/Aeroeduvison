/**
 * Security & 2FA — Profile › Bảo mật & 2FA
 *
 * Two sections:
 *   1) Đổi mật khẩu (chỉ hiện nếu user có password — Google-only thì ẩn)
 *   2) Xác thực 2 lớp (TOTP):
 *      - Trạng thái: enabled/disabled + thời điểm bật + số backup codes còn
 *      - Bật: 3-step wizard (Quét QR → Nhập mã 6 số → Lưu backup codes)
 *      - Tắt: modal yêu cầu password (+ optional 2FA code)
 *
 * Dark-first Tailwind. Vietnamese throughout. Match purple/indigo accent.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'react-hot-toast'
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Lock,
  Copy,
  Download,
  AlertTriangle,
  KeyRound,
  QrCode,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth.service'
import {
  twoFactorService,
  type TwoFactorSetupResponse,
  type TwoFactorStatus,
} from '@/services/twoFactor.service'

export default function SecurityPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupOpen, setSetupOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  // Some Google-only users không có password → ẩn section đổi mật khẩu
  const isGoogleOnly = useMemo(() => {
    // user object không trả password — heuristic: nếu email và không có cách nào
    // đổi password (server sẽ reject với error specific). Để đơn giản, vẫn hiển
    // thị form và để server trả error nếu Google-only.
    return false
  }, [])

  const fetchStatus = async () => {
    try {
      const s = await twoFactorService.status()
      setStatus(s)
    } catch (err) {
      console.warn('[security] fetch status:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSetupComplete = () => {
    setSetupOpen(false)
    fetchStatus()
  }

  const onDisableComplete = () => {
    setDisableOpen(false)
    fetchStatus()
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Bảo mật & 2FA</h1>
          <p className="text-muted-foreground text-sm">Quản lí mật khẩu và xác thực 2 lớp</p>
        </div>
      </div>

      {/* ── Đổi mật khẩu ───────────────────────────────────────── */}
      {!isGoogleOnly && <ChangePasswordSection />}

      {/* ── Xác thực 2 lớp ─────────────────────────────────────── */}
      <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              status?.enabled
                ? 'bg-emerald-500/20'
                : 'bg-muted'
            }`}>
              {status?.enabled
                ? <ShieldCheck className="w-5 h-5 text-emerald-400" />
                : <ShieldOff className="w-5 h-5 text-muted-foreground" />
              }
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Xác thực 2 lớp (2FA)</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Bảo vệ tài khoản bằng mã 6 số từ ứng dụng Google Authenticator / Authy / 1Password.
              </p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : status?.enabled ? (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30">
              Đã bật
            </span>
          ) : (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
              Chưa bật
            </span>
          )}
        </div>

        {status?.enabled && status.enabledAt && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Bật từ</p>
              <p className="text-sm text-foreground">
                {new Date(status.enabledAt).toLocaleString('vi-VN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mã dự phòng còn</p>
              <p className={`text-sm font-medium ${
                status.backupCodesRemaining > 3 ? 'text-foreground'
                : status.backupCodesRemaining > 0 ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                {status.backupCodesRemaining} / 10
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-wrap gap-2">
          {!status?.enabled ? (
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="px-4 py-2 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white text-sm font-medium flex items-center gap-2 transition"
            >
              <Shield className="w-4 h-4" />
              Bật xác thực 2 lớp
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDisableOpen(true)}
              className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-sm font-medium flex items-center gap-2 transition"
            >
              <ShieldOff className="w-4 h-4" />
              Tắt xác thực 2 lớp
            </button>
          )}
        </div>

        {status?.enabled && status.backupCodesRemaining <= 2 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-amber-200">
              Còn rất ít mã dự phòng. Bạn nên tắt & bật lại 2FA để tạo bộ mã mới (10 mã).
            </span>
          </div>
        )}
      </section>

      {/* Modals */}
      {setupOpen && (
        <SetupWizardModal
          email={user?.email || ''}
          onClose={() => setSetupOpen(false)}
          onComplete={onSetupComplete}
        />
      )}
      {disableOpen && (
        <DisableModal
          onClose={() => setDisableOpen(false)}
          onComplete={onDisableComplete}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Đổi mật khẩu
// ════════════════════════════════════════════════════════════════
function ChangePasswordSection() {
  const [show, setShow] = useState({ cur: false, n: false, c: false })
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next.length < 6) {
      toast.error('Mật khẩu mới tối thiểu 6 ký tự')
      return
    }
    if (next !== confirm) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    setSubmitting(true)
    try {
      await authService.changePassword(current, next)
      toast.success('Đổi mật khẩu thành công')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Đổi mật khẩu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring transition'

  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Đổi mật khẩu</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dùng mật khẩu mạnh, tối thiểu 6 ký tự (khuyến nghị ≥12 + chữ số + biểu tượng).
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {([
          { key: 'cur', label: 'Mật khẩu hiện tại', value: current, set: setCurrent, show: show.cur },
          { key: 'n', label: 'Mật khẩu mới', value: next, set: setNext, show: show.n },
          { key: 'c', label: 'Xác nhận mật khẩu mới', value: confirm, set: setConfirm, show: show.c },
        ] as const).map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-foreground mb-1.5">{field.label}</label>
            <div className="relative">
              <input
                type={field.show ? 'text' : 'password'}
                value={field.value}
                onChange={e => field.set(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
                required
                minLength={6}
              />
              <button
                type="button"
                aria-label={field.show ? 'Ẩn' : 'Hiện'}
                onClick={() => setShow(s => ({ ...s, [field.key]: !s[field.key as keyof typeof s] }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              >
                {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
        </button>
      </form>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// 2FA Setup Wizard (3 steps)
// ════════════════════════════════════════════════════════════════
function SetupWizardModal({
  email,
  onClose,
  onComplete,
}: {
  email: string
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Generate secret on mount
  useEffect(() => {
    let cancelled = false
    twoFactorService.setup()
      .then(d => {
        if (!cancelled) setSetupData(d)
      })
      .catch(err => {
        const e = err as { response?: { data?: { error?: string } } }
        if (!cancelled) setInitError(e.response?.data?.error || 'Không thể khởi tạo 2FA')
      })
    return () => { cancelled = true }
  }, [])

  // Focus on code input when going to step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => codeInputRef.current?.focus(), 50)
    }
  }, [step])

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) {
      setError('Mã phải có 6 chữ số')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { backupCodes } = await twoFactorService.enable(digits)
      setBackupCodes(backupCodes)
      setStep(3)
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Mã không đúng. Thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast.success('Đã copy toàn bộ 10 mã')
  }

  const downloadCodes = () => {
    const text = `AeroEduVision — Mã dự phòng 2FA (${email})
Tạo lúc: ${new Date().toLocaleString('vi-VN')}

Mỗi mã chỉ dùng được MỘT LẦN.
Lưu trữ an toàn (Notion, 1Password, két sắt) — KHÔNG share.

${backupCodes.map((c, i) => `${String(i + 1).padStart(2, '0')}. ${c}`).join('\n')}
`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aeroedu-2fa-backup-codes-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const copySecret = () => {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret)
    toast.success('Đã copy secret')
  }

  return (
    <ModalShell onClose={step === 3 ? undefined : onClose} title="Bật xác thực 2 lớp">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {([1, 2, 3] as const).map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === n ? 'bg-[hsl(262,83%,58%)] text-white'
              : step > n ? 'bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground'
            }`}>
              {step > n ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            {n < 3 && <div className={`w-8 h-0.5 ${step > n ? 'bg-emerald-500' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {initError ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {initError}
        </div>
      ) : !setupData ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Đang tạo khóa bí mật...</p>
        </div>
      ) : step === 1 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <QrCode className="w-4 h-4 text-purple-400" />
            <h3 className="font-medium">Quét QR bằng ứng dụng Authenticator</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Mở Google Authenticator, Authy hoặc 1Password và quét mã QR bên dưới.
          </p>

          <div className="flex justify-center bg-white p-4 rounded-lg">
            <QRCodeSVG value={setupData.otpauthUrl} size={200} level="M" />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              Không quét được? Nhập tay mã sau vào app:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-mono text-foreground break-all">
                {setupData.secret}
              </code>
              <button
                type="button"
                onClick={copySecret}
                className="shrink-0 p-2 rounded-lg bg-muted hover:bg-accent border border-border transition"
                title="Copy secret"
              >
                <Copy className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white text-sm font-medium transition"
            >
              Tiếp tục
            </button>
          </div>
        </div>
      ) : step === 2 ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h3 className="font-medium">Nhập mã 6 số từ ứng dụng</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Mở ứng dụng Authenticator vừa cấu hình và nhập mã 6 số hiện tại.
          </p>

          <input
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={code}
            onChange={e => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              setError(null)
            }}
            placeholder="000000"
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground text-2xl font-mono text-center tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition"
            >
              ← Quay lại
            </button>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="px-4 py-2 rounded-lg bg-[hsl(262,83%,58%)] hover:bg-[hsl(262,83%,50%)] text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Đang xác thực...' : 'Xác thực & Bật 2FA'}
            </button>
          </div>
        </form>
      ) : (
        // Step 3 — Backup codes
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-medium">2FA đã bật. Lưu 10 mã dự phòng bên dưới.</h3>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-amber-200">
              <p className="font-semibold mb-1">Đây là lần DUY NHẤT bạn thấy các mã này.</p>
              <p>Lưu trữ an toàn (Notion / 1Password / két sắt). Mỗi mã chỉ dùng được MỘT LẦN khi mất điện thoại.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted border border-border">
            {backupCodes.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-background">
                <span className="text-xs text-muted-foreground w-5">{String(i + 1).padStart(2, '0')}</span>
                <code className="flex-1 font-mono text-sm text-foreground tracking-wider">{c}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(c)
                    toast.success(`Copied: ${c}`)
                  }}
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition"
                  title="Copy mã"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyAllCodes}
              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-sm flex items-center gap-1.5 transition"
            >
              <Copy className="w-4 h-4" />
              Copy tất cả
            </button>
            <button
              type="button"
              onClick={downloadCodes}
              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-accent border border-border text-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4" />
              Tải .txt
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onComplete}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition"
            >
              Đã lưu, đóng
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ════════════════════════════════════════════════════════════════
// Disable 2FA modal
// ════════════════════════════════════════════════════════════════
function DisableModal({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: () => void
}) {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Vui lòng nhập mật khẩu')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await twoFactorService.disable(password, code || undefined)
      toast.success('Đã tắt xác thực 2 lớp')
      onComplete()
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Không thể tắt 2FA')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} title="Tắt xác thực 2 lớp">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-amber-200">
            Tắt 2FA sẽ giảm bảo mật tài khoản. Bạn vẫn cần đăng nhập lại từ thiết bị mới sau này — không có lớp xác thực thứ 2.
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Mật khẩu hiện tại
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Mã 6 số (khuyến nghị, nhưng không bắt buộc)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm font-mono tracking-widest text-center outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent transition"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-2 transition disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Đang tắt...' : 'Tắt 2FA'}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  )
}

// ════════════════════════════════════════════════════════════════
// Reusable modal shell
// ════════════════════════════════════════════════════════════════
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  /** undefined = không cho đóng bằng backdrop/ESC (vd khi đang ở step 3 backup codes) */
  onClose?: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
