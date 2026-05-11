/**
 * AiSubscriptionGate — wrapper hiển thị banner "đăng ký gói" cho trang AI
 *
 * Cách dùng:
 *   <AiSubscriptionGate feature="ai_tutor" featureLabel="AI Tutor">
 *     <AiTutorContent />
 *   </AiSubscriptionGate>
 *
 * Logic:
 *   1. Gọi GET /api/entitlements/me để lấy entitlements user hiện tại
 *   2. Check feature có trong entitlements + chưa hết hạn → render children
 *   3. Nếu không → render banner upgrade (CTA → /pricing) thay cho content
 *
 * Khi BE chưa khả dụng (401/500), mặc định CHO PHÉP để không block UX.
 * (User vẫn dùng được nhưng API call thực tế sẽ bị server reject.)
 */
import { useEffect, useState } from 'react'
import { Sparkles, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'

interface Entitlement {
  feature: string
  expiresAt: string
}

const RECOMMENDED_PLAN: Record<string, { id: string; name: string; price: string }> = {
  ai_tutor:    { id: 'student-1m', name: 'Gói Học sinh', price: '49.000đ/tháng' },
  ai_homework: { id: 'student-1m', name: 'Gói Học sinh', price: '49.000đ/tháng' },
  ai_examprep: { id: 'student-1m', name: 'Gói Học sinh', price: '49.000đ/tháng' },
  ai_career:   { id: 'student-1y', name: 'Gói Học sinh — 1 năm', price: '490.000đ/năm' },
}

export function AiSubscriptionGate({
  feature,
  featureLabel,
  children,
  description,
  /** Nếu true: chỉ banner nhỏ ở trên, vẫn cho dùng. Nếu false: chặn full content. */
  softMode = false,
}: {
  feature: string
  featureLabel: string
  children: React.ReactNode
  description?: string
  softMode?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [hasFeature, setHasFeature] = useState(false)
  const [authed, setAuthed] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<{ entitlements: Entitlement[] }>('/entitlements/me')
        if (cancelled) return
        const now = Date.now()
        const ok = (res.data?.entitlements || []).some(
          (e) => e.feature === feature && new Date(e.expiresAt).getTime() > now,
        )
        setHasFeature(ok)
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } }
        if (e.response?.status === 401) setAuthed(false)
        // Fail-open: nếu API lỗi, giả định user có quyền (server sẽ reject sau nếu cần)
        setHasFeature(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [feature])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authed) {
    return <UpgradeBanner
      feature={feature}
      featureLabel={featureLabel}
      description={description}
      reason="login"
    />
  }

  if (hasFeature) return <>{children}</>

  if (softMode) {
    return (
      <>
        <UpgradeBanner feature={feature} featureLabel={featureLabel} description={description} reason="upgrade" compact />
        <div className="opacity-60 pointer-events-none">{children}</div>
      </>
    )
  }

  return <UpgradeBanner feature={feature} featureLabel={featureLabel} description={description} reason="upgrade" />
}

function UpgradeBanner({
  feature,
  featureLabel,
  description,
  reason,
  compact = false,
}: {
  feature: string
  featureLabel: string
  description?: string
  reason: 'login' | 'upgrade'
  compact?: boolean
}) {
  const plan = RECOMMENDED_PLAN[feature] || { id: 'student-1m', name: 'Gói Học sinh', price: '49.000đ/tháng' }

  if (compact) {
    return (
      <div className="mx-4 my-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 text-sm font-medium">Bạn đang xem chế độ giới hạn</p>
          <p className="text-amber-200/70 text-xs">Đăng ký {plan.name} ({plan.price}) để mở khoá đầy đủ {featureLabel}</p>
        </div>
        <Link to="/pricing"
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-amber-950 text-xs font-bold flex items-center gap-1">
          Mua ngay <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-gradient-to-br from-purple-500/[0.08] to-pink-500/[0.05] backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
          {reason === 'login' ? <Lock className="w-8 h-8 text-white" /> : <Sparkles className="w-8 h-8 text-white" />}
        </div>
        <h2 className="text-white text-2xl font-bold mb-2">
          {reason === 'login' ? 'Cần đăng nhập' : `Mở khoá ${featureLabel}`}
        </h2>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          {reason === 'login'
            ? 'Vui lòng đăng nhập để sử dụng các tính năng AI dành cho học sinh.'
            : description || `Tính năng "${featureLabel}" thuộc gói trả phí. Đăng ký để học hiệu quả với AI 24/7.`}
        </p>

        {reason === 'upgrade' && (
          <div className="bg-white/[0.04] rounded-2xl p-5 mb-5 text-left">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-white font-bold text-base">{plan.name}</h3>
              <p className="text-purple-300 font-black text-lg">{plan.price}</p>
            </div>
            <ul className="space-y-1.5 text-sm">
              {[
                'AI Tutor — Gia sư AI 24/7',
                'AI giải bài tập + giải thích chi tiết',
                'AI ôn thi cá nhân hoá',
                'Hỗ trợ tất cả môn học',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-white/75">
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {reason === 'login' ? (
            <Link to="/auth/login"
              className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold flex items-center justify-center gap-2">
              Đăng nhập <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/pricing"
                className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold flex items-center justify-center gap-2 shadow-xl">
                Đăng ký ngay <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/activate"
                className="px-5 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-white/80 font-medium flex items-center justify-center gap-2">
                Có mã kích hoạt?
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AiSubscriptionGate
