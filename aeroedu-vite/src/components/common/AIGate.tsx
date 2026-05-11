/**
 * AIGate — Gate tính năng AI theo gói (FREE/PREMIUM/PRO).
 *
 * Cách dùng:
 *   <AIGate feature="ai_content_gen">
 *     <MyAIComponent />
 *   </AIGate>
 *
 * Nếu user chưa có entitlement cho feature, hiển thị overlay "Nâng cấp gói" thay
 * vì content bên trong. ADMIN/TEACHER tự động được full quyền.
 *
 * Feature keys:
 *   ai_tutor_basic           — Free OK
 *   ai_tutor_unlimited       — Premium+
 *   ai_content_gen           — Premium+
 *   ocr_digitize             — Premium+
 *   transcript_whisper       — Premium+
 *   quiz_extract_ai          — Premium+
 *   aura_3d                  — Premium+
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Lock, Sparkles, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { api } from '@/services/api'

interface EntitlementResp {
  allowed: boolean
  plan: 'FREE' | 'PREMIUM' | 'PRO' | 'GUEST'
  reason: string
  upgradeUrl?: string
}

interface AIGateProps {
  feature: string
  children: ReactNode
  /** Tiêu đề overlay (mặc định: "Tính năng AI nâng cao") */
  title?: string
  /** Mô tả ngắn cho overlay */
  description?: string
  /** Cho phép render content mờ phía sau (mặc định true) */
  showPreview?: boolean
}

export function AIGate({
  feature,
  children,
  title = 'Tính năng AI nâng cao',
  description,
  showPreview = true,
}: AIGateProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['entitlement', feature],
    queryFn: () =>
      api
        .get<EntitlementResp>(`/entitlements/check`, { params: { feature } })
        .then((r) => r.data)
        .catch(() => ({ allowed: false, plan: 'GUEST' as const, reason: 'Không thể xác thực' })),
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Đang kiểm tra quyền truy cập…
      </div>
    )
  }

  if (data?.allowed) return <>{children}</>

  return (
    <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-purple-500/5">
      {/* Blurred preview behind */}
      {showPreview && (
        <div className="pointer-events-none select-none opacity-30 blur-sm">
          {children}
        </div>
      )}

      {/* Overlay */}
      <div className={`${showPreview ? 'absolute inset-0' : ''} flex flex-col items-center justify-center p-8 sm:p-12 text-center backdrop-blur-sm`}>
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 mb-3">
          <Sparkles className="w-3 h-3" /> Gói Premium / Pro
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mb-6 leading-relaxed">
          {description || data?.reason || 'Vui lòng nâng cấp gói để mở khoá.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={data?.upgradeUrl || '/pricing'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm shadow-lg hover:scale-[1.02] transition-transform"
          >
            Xem các gói
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/docs/payment"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Tìm hiểu thêm
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground/70">
          Tài khoản giáo viên hoặc admin được dùng đầy đủ tính năng AI mặc định.
        </p>
      </div>
    </div>
  )
}

export default AIGate
