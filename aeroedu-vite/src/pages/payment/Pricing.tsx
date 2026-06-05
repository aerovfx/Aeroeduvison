/**
 * Pricing — Bảng giá 3 đối tượng: Giáo viên / Học sinh / Phụ huynh
 * Route: /pricing
 *
 * - Tab switcher để lọc theo audience
 * - Badge "Phổ biến nhất" cho gói recommended
 * - Tự detect role user → pre-select tab phù hợp
 * - Hiển thị subscription hiện tại: "Đang sử dụng" + ngày còn lại + nút Gia hạn
 * - Hiện banner nếu có đơn AWAITING_REVIEW
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckCircle2, ShieldCheck, Zap, Star, Building2,
  GraduationCap, Users, BookOpen, Clock, AlertTriangle, Crown, Sparkles,
  RotateCcw, Apple,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import {
  isIapAvailable, planIsIapEligible, buyPlan, restorePurchases,
  initIap, getProductInfo,
} from '@/lib/capacitor/iap'

interface Plan {
  id: string
  name: string
  amount: number
  durationDays: number
  features: string[]
  audience?: string
  popular?: boolean
  badge?: string
}

interface ActiveSubscription {
  orderId: string
  planId: string
  planName: string
  audience: string | null
  amount: number
  startedAt: string
  expiresAt: string
  daysUsed: number
  daysRemaining: number
  durationDays: number
  percentUsed: number
  isExpiringSoon: boolean
  features: string[]
  source?: string   // trial | paid | admin | apple-iap
  status?: string   // trialing | active | expired
}

interface PendingOrder {
  orderId: string
  planId: string
  planName: string
  amount: number
  status: string
  createdAt: string
}

interface SubscriptionStatus {
  activeSubscription: ActiveSubscription | null
  pendingOrder: PendingOrder | null
  orderCount: number
  paidCount: number
  lifetimeSpend: number
}

type Tab = 'teacher' | 'student' | 'parent'

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  {
    id: 'teacher',
    label: 'Giáo viên',
    icon: <BookOpen size={16} />,
    desc: 'Soạn đề, chấm bài, quản lý lớp bằng AI',
    color: '#818cf8',
  },
  {
    id: 'student',
    label: 'Học sinh',
    icon: <GraduationCap size={16} />,
    desc: 'Gia sư AI 24/7, ôn thi cá nhân hoá',
    color: '#34d399',
  },
  {
    id: 'parent',
    label: 'Phụ huynh',
    icon: <Users size={16} />,
    desc: 'Theo dõi tiến độ, nhận báo cáo AI',
    color: '#fb923c',
  },
]

const AUDIENCE_ROLE_MAP: Record<string, Tab> = {
  TEACHER: 'teacher',
  ADMIN: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
}

const fmt = (n: number) =>
  n === 0 ? 'Miễn phí' : new Intl.NumberFormat('vi-VN').format(n) + 'đ'

// Plan tier ranking (in audience) — dùng để quyết định nút Upgrade vs Downgrade
const PLAN_TIER: Record<string, number> = {
  'basic-1m':   1,
  'pro-1m':     2,
  'pro-1y':     3,
  'school-1y':  4,
  'student-1m': 1,
  'student-1y': 2,
  'parent-1m':  1,
  'parent-1y':  2,
}

export default function PricingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('teacher')
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null)
  const [isAuthed, setIsAuthed] = useState(false)
  // ── Apple IAP (chỉ khi chạy trong app iOS) ──
  const native = isIapAvailable()
  const [restoring, setRestoring] = useState(false)
  const [iapPrices, setIapPrices] = useState<Record<string, string>>({})

  // Detect user role → pre-select tab
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        const role = (u.role || '').toUpperCase()
        if (AUDIENCE_ROLE_MAP[role]) setActiveTab(AUDIENCE_ROLE_MAP[role])
        setIsAuthed(true)
      }
    } catch { /* ignore */ }
  }, [])

  // Load plans + (nếu logged in) load subscription status
  useEffect(() => {
    const calls: Promise<unknown>[] = [
      api.get('/payment/plans').then(r => setPlans(r.data.plans || [])),
    ]
    if (isAuthed) {
      calls.push(
        api.get('/payment/my-subscription')
          .then(r => setSubStatus(r.data))
          .catch(() => { /* not authed or no data */ })
      )
    }
    Promise.all(calls)
      .catch(() => toast.error('Không tải được danh sách gói'))
      .finally(() => setLoading(false))
  }, [isAuthed])

  // Nạp StoreKit products → lấy giá thật của Apple (đúng tiền tệ máy người dùng)
  useEffect(() => {
    if (!native) return
    let cancelled = false
    initIap().then(ok => {
      if (!ok || cancelled) return
      const prices: Record<string, string> = {}
      for (const p of plans) {
        if (!planIsIapEligible(p.id)) continue
        const info = getProductInfo(p.id)
        if (info?.price) prices[p.id] = info.price
      }
      if (!cancelled && Object.keys(prices).length) setIapPrices(prices)
    }).catch(() => { /* IAP optional */ })
    return () => { cancelled = true }
  }, [native, plans])

  const refreshSub = () =>
    api.get('/payment/my-subscription').then(r => setSubStatus(r.data)).catch(() => { /* ignore */ })

  // Auto-jump to active subscription tab
  useEffect(() => {
    if (subStatus?.activeSubscription?.audience) {
      const aud = subStatus.activeSubscription.audience as Tab
      if (TAB_CONFIG.some(t => t.id === aud)) setActiveTab(aud)
    }
  }, [subStatus])

  const visiblePlans = useMemo(
    () => plans.filter(p => !p.audience || p.audience === activeTab),
    [plans, activeTab],
  )

  const activeTabCfg = TAB_CONFIG.find(t => t.id === activeTab)!
  const activeSub = subStatus?.activeSubscription || null
  const pendingOrder = subStatus?.pendingOrder || null

  const handleSelect = async (plan: Plan, mode: 'new' | 'renew' | 'upgrade') => {
    // ── Trong app iOS: gói đủ điều kiện → BẮT BUỘC mua qua Apple IAP ──
    // (Apple Guideline 3.1.1: nội dung số phải thanh toán qua StoreKit.)
    if (native && planIsIapEligible(plan.id)) {
      setCreating(plan.id)
      try {
        await buyPlan(plan.id)
        toast.success('Mua thành công! Quyền truy cập đã được kích hoạt.')
        await refreshSub()
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Giao dịch không hoàn tất'
        if (!/huỷ|cancel/i.test(msg)) toast.error(msg)
      } finally {
        setCreating(null)
      }
      return
    }
    // ── Trong app iOS nhưng gói KHÔNG bán qua IAP (school-1y B2B):
    // KHÔNG mở luồng thanh toán ngoài (tránh vi phạm Apple 3.1.1) → liên hệ tư vấn.
    if (native && !planIsIapEligible(plan.id)) {
      navigate('/contact-sales')
      return
    }
    // ── Web: luồng VietQR cũ ──
    setCreating(plan.id)
    try {
      const me = await api.get('/auth/me').catch(() => null)
      const u = me?.data || {}
      const { data } = await api.post('/payment/orders', {
        planId: plan.id,
        userId: u.id, userEmail: u.email, userName: u.name,
        metadata: { mode },
      })
      navigate(`/payment/${data.order.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi tạo đơn'
      toast.error(msg)
    } finally {
      setCreating(null)
    }
  }

  const handleRestore = async () => {
    setRestoring(true)
    try {
      await restorePurchases()
      await refreshSub()
      toast.success('Đã khôi phục giao dịch (nếu có).')
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Không khôi phục được')
    } finally {
      setRestoring(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ai-page-bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* ── Active subscription banner ──────────────────── */}
        {activeSub && (
          <div style={{
            background: activeSub.isExpiringSoon
              ? 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,146,60,0.08))'
              : 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(16,185,129,0.05))',
            border: activeSub.isExpiringSoon
              ? '1px solid rgba(251,191,36,0.4)'
              : '1px solid rgba(52,211,153,0.3)',
            borderRadius: 16, padding: '18px 22px', marginBottom: 28,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: activeSub.isExpiringSoon ? 'rgba(251,191,36,0.2)' : 'rgba(52,211,153,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {activeSub.isExpiringSoon
                ? <AlertTriangle size={22} style={{ color: '#fbbf24' }} />
                : <Crown size={22} style={{ color: '#34d399' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {activeSub.source === 'trial'
                  ? (activeSub.isExpiringSoon ? '🎁 Bản dùng thử sắp kết thúc — đăng ký để giữ quyền' : '🎁 Đang dùng thử miễn phí 3 tháng')
                  : (activeSub.isExpiringSoon ? 'Gói sắp hết hạn — gia hạn ngay' : 'Bạn đang sử dụng')}
                {' · '}
                <span style={{ color: activeSub.isExpiringSoon ? '#fbbf24' : '#34d399' }}>
                  {activeSub.planName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--ai-muted-text)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={13} /> Còn <strong style={{ color: 'hsl(var(--foreground))' }}>{activeSub.daysRemaining} ngày</strong>
                </span>
                <span>Đã dùng {activeSub.daysUsed}/{activeSub.durationDays} ngày</span>
                <span>Hết hạn: {new Date(activeSub.expiresAt).toLocaleDateString('vi-VN')}</span>
              </div>
              {/* Progress bar */}
              <div style={{
                marginTop: 8, height: 5, borderRadius: 999,
                background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${activeSub.percentUsed}%`, height: '100%',
                  background: activeSub.isExpiringSoon
                    ? 'linear-gradient(90deg, #fbbf24, #fb923c)'
                    : 'linear-gradient(90deg, #34d399, #10b981)',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Pending order alert ─────────────────────────── */}
        {pendingOrder && (
          <div style={{
            background: 'rgba(99,102,241,0.10)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <Loader2 size={18} className="animate-spin" style={{ color: '#818cf8' }} />
            <div style={{ flex: 1, fontSize: 13.5 }}>
              <strong>Đơn đang chờ duyệt:</strong> {pendingOrder.planName} — {fmt(pendingOrder.amount)}
              {pendingOrder.status === 'PENDING' && ' (chưa chuyển khoản)'}
              {pendingOrder.status === 'AWAITING_REVIEW' && ' (đang chờ admin xác nhận)'}
            </div>
            <button
              onClick={() => navigate(`/payment/${pendingOrder.orderId}`)}
              style={{
                background: 'rgba(99,102,241,0.2)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Xem đơn →
            </button>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)',
            borderRadius: 999, padding: '6px 16px', marginBottom: 16,
            fontSize: 13, color: '#818cf8', fontWeight: 600,
          }}>
            <Zap size={14} /> Nâng cấp bất kỳ lúc nào · Huỷ dễ dàng
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            {activeSub ? 'Nâng cấp hoặc gia hạn gói' : 'Chọn gói phù hợp với bạn'}
          </h1>
          <p style={{ color: 'var(--ai-muted-text)', fontSize: 15, margin: 0, maxWidth: 480, marginInline: 'auto' }}>
            Thanh toán bằng chuyển khoản VietQR — xác nhận trong vài phút.
            Hỗ trợ 24/7 cho tất cả gói.
          </p>
        </div>

        {/* ── Tab switcher ────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 44,
          flexWrap: 'wrap',
        }}>
          {TAB_CONFIG.map(tab => {
            const active = tab.id === activeTab
            const hasActive = activeSub?.audience === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                  border: active ? `1.5px solid ${tab.color}` : '1.5px solid var(--ai-card-border)',
                  background: active ? `${tab.color}18` : 'var(--ai-card-bg)',
                  color: active ? tab.color : 'var(--ai-muted-text)',
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                {tab.label}
                {hasActive && (
                  <span style={{
                    position: 'absolute', top: -5, right: -5,
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#34d399',
                    border: '2px solid var(--ai-page-bg)',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab description ─────────────────────────────── */}
        <div style={{
          textAlign: 'center', marginBottom: 32,
          fontSize: 14, color: 'var(--ai-muted-text)',
        }}>
          <span style={{ color: activeTabCfg.color, fontWeight: 600 }}>{activeTabCfg.label}</span>
          {' — '}{activeTabCfg.desc}
        </div>

        {/* ── Plans grid ──────────────────────────────────── */}
        <div style={{
          display: 'grid', gap: 20,
          gridTemplateColumns: `repeat(${Math.min(visiblePlans.length, 3)}, 1fr)`,
        }}
        className="pricing-grid"
        >
          {visiblePlans.map(plan => {
            const isPopular = plan.popular
            const tabColor = activeTabCfg.color
            const isCurrent = activeSub?.planId === plan.id
            const currentTier = activeSub ? PLAN_TIER[activeSub.planId] || 0 : 0
            const thisTier = PLAN_TIER[plan.id] || 0
            const isUpgrade = activeSub && activeSub.audience === plan.audience && thisTier > currentTier
            const isDowngrade = activeSub && activeSub.audience === plan.audience && thisTier < currentTier && !isCurrent

            // Mode để gửi backend metadata
            const mode = isCurrent ? 'renew' : isUpgrade ? 'upgrade' : 'new'

            // Highlight effect: current > popular > normal
            const highlight = isCurrent || isPopular

            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: isCurrent
                    ? 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(16,185,129,0.04))'
                    : isPopular
                      ? `linear-gradient(135deg, ${tabColor}10, ${tabColor}06)`
                      : 'var(--ai-card-bg)',
                  border: isCurrent
                    ? '2px solid rgba(52,211,153,0.5)'
                    : isPopular
                      ? `2px solid ${tabColor}55`
                      : '1px solid var(--ai-card-border)',
                  borderRadius: 18,
                  padding: highlight ? '32px 28px 28px' : 28,
                  boxShadow: isCurrent
                    ? '0 8px 40px rgba(52,211,153,0.18)'
                    : isPopular
                      ? `0 8px 40px ${tabColor}20`
                      : 'var(--shadow)',
                  display: 'flex', flexDirection: 'column', gap: 18,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  opacity: isDowngrade ? 0.65 : 1,
                }}
              >
                {/* Current / Popular badge */}
                {isCurrent ? (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #34d399, #10b981)',
                    color: '#fff', borderRadius: 999, padding: '4px 16px',
                    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    boxShadow: '0 2px 12px rgba(52,211,153,0.45)',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <CheckCircle2 size={11} fill="currentColor" stroke="white" strokeWidth={2.5} />
                    Đang sử dụng
                  </div>
                ) : isPopular && (
                  <div style={{
                    position: 'absolute', top: -13, left: '50%',
                    transform: 'translateX(-50%)',
                    background: `linear-gradient(90deg, ${tabColor}, ${tabColor}cc)`,
                    color: '#fff', borderRadius: 999, padding: '4px 16px',
                    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    boxShadow: `0 2px 12px ${tabColor}55`,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Star size={11} fill="currentColor" /> Phổ biến nhất
                  </div>
                )}

                {/* Plan header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{plan.name}</h3>
                    {plan.badge && !isCurrent && (
                      <span style={{
                        background: 'rgba(251,146,60,0.15)', color: '#fb923c',
                        border: '1px solid rgba(251,146,60,0.3)',
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      }}>
                        {plan.badge}
                      </span>
                    )}
                    {isUpgrade && (
                      <span style={{
                        background: 'rgba(129,140,248,0.15)', color: '#818cf8',
                        border: '1px solid rgba(129,140,248,0.3)',
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        <Sparkles size={10} /> Nâng cấp
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 34, fontWeight: 800,
                    color: isCurrent ? '#34d399' : isPopular ? tabColor : 'hsl(var(--foreground))',
                  }}>
                    {native && iapPrices[plan.id] ? iapPrices[plan.id] : fmt(plan.amount)}
                  </div>
                  <div style={{ color: 'var(--ai-muted-text)', fontSize: 13, marginTop: 4 }}>
                    {plan.durationDays >= 365 ? '/ năm' : plan.durationDays === 30 ? '/ tháng' : `${plan.durationDays} ngày`}
                    {plan.durationDays >= 365 && plan.amount > 0 && (
                      <span style={{ marginLeft: 8, color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                        ≈ {fmt(Math.round(plan.amount / 12))}/tháng
                      </span>
                    )}
                  </div>
                  {isCurrent && activeSub && (
                    <div style={{
                      marginTop: 8, fontSize: 12, color: '#34d399', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Clock size={12} /> Còn {activeSub.daysRemaining} ngày — hết hạn {new Date(activeSub.expiresAt).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5 }}>
                      <CheckCircle2 size={15} style={{
                        color: isCurrent ? '#34d399' : isPopular ? tabColor : '#34d399',
                        flexShrink: 0, marginTop: 1,
                      }} />
                      <span style={{ color: 'hsl(var(--foreground)/0.85)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <button
                  onClick={() => handleSelect(plan, mode)}
                  disabled={creating === plan.id || !!pendingOrder}
                  style={{
                    marginTop: 4,
                    background: isCurrent
                      ? 'linear-gradient(90deg, #34d399, #10b981)'
                      : isUpgrade
                        ? `linear-gradient(90deg, ${tabColor}, ${tabColor}cc)`
                        : isPopular
                          ? `linear-gradient(90deg, ${tabColor}, ${tabColor}cc)`
                          : 'transparent',
                    color: (isCurrent || isUpgrade || isPopular) ? '#fff' : tabColor,
                    border: (isCurrent || isUpgrade || isPopular) ? 'none' : `1.5px solid ${tabColor}55`,
                    borderRadius: 11,
                    padding: '13px 0', fontWeight: 700, fontSize: 14,
                    cursor: (creating === plan.id || pendingOrder) ? 'not-allowed' : 'pointer',
                    opacity: (creating === plan.id || pendingOrder) ? 0.55 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity 0.15s',
                  }}
                  title={pendingOrder ? 'Hoàn tất đơn đang chờ duyệt trước' : undefined}
                >
                  {creating === plan.id ? (
                    <><Loader2 size={14} className="animate-spin" /> {native && planIsIapEligible(plan.id) ? 'Đang xử lý...' : 'Đang tạo...'}</>
                  ) : native && planIsIapEligible(plan.id) ? (
                    <><Apple size={14} /> {isCurrent ? 'Gia hạn qua App Store' : 'Mua qua App Store'}</>
                  ) : native ? (
                    <><Building2 size={14} /> Liên hệ tư vấn</>
                  ) : isCurrent ? (
                    <><Clock size={14} /> Gia hạn ngay</>
                  ) : isUpgrade ? (
                    <><Sparkles size={14} /> Nâng cấp lên đây</>
                  ) : isDowngrade ? (
                    'Chuyển xuống gói này'
                  ) : isPopular ? (
                    <><Zap size={14} /> Bắt đầu ngay</>
                  ) : 'Chọn gói này'}
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Restore Purchases (Apple yêu cầu cho app có IAP) ── */}
        {native && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              onClick={handleRestore}
              disabled={restoring}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground)/0.8)', borderRadius: 10,
                padding: '10px 18px', fontWeight: 600, fontSize: 13,
                cursor: restoring ? 'not-allowed' : 'pointer', opacity: restoring ? 0.6 : 1,
              }}
            >
              {restoring
                ? <><Loader2 size={14} className="animate-spin" /> Đang khôi phục...</>
                : <><RotateCcw size={14} /> Khôi phục giao dịch đã mua</>}
            </button>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ai-muted-text)' }}>
              Thanh toán xử lý an toàn qua App Store của Apple. Có thể quản lý hoặc huỷ trong Cài đặt → Apple ID → Đăng ký.
            </div>
          </div>
        )}

        {/* ── Lifetime spend (for logged in) ──────────────── */}
        {isAuthed && subStatus && subStatus.lifetimeSpend > 0 && (
          <div style={{
            marginTop: 24, textAlign: 'center', fontSize: 13,
            color: 'var(--ai-muted-text)',
          }}>
            💎 Tổng chi tiêu trên AeroEdu: <strong style={{ color: 'hsl(var(--foreground))' }}>{fmt(subStatus.lifetimeSpend)}</strong>
            {' · '}
            {subStatus.paidCount} đơn đã thanh toán
          </div>
        )}

        {/* ── Enterprise CTA ───────────────────────────────── */}
        {activeTab === 'teacher' && (
          <div style={{
            marginTop: 32, padding: '24px 32px', borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(99,102,241,0.04))',
            border: '1px solid rgba(129,140,248,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(129,140,248,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={22} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Gói Trường học / Trung tâm</div>
                <div style={{ color: 'var(--ai-muted-text)', fontSize: 13 }}>
                  Trên 100 giáo viên? Liên hệ để nhận báo giá tùy chỉnh và onboarding tận nơi.
                </div>
              </div>
            </div>
            <a
              href="mailto:contact@inphysic.com?subject=Báo giá School Plan"
              style={{
                background: 'rgba(129,140,248,0.15)', color: '#818cf8',
                border: '1px solid rgba(129,140,248,0.3)',
                borderRadius: 10, padding: '10px 20px',
                fontWeight: 600, fontSize: 13, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Liên hệ tư vấn →
            </a>
          </div>
        )}

        {/* ── Parent FAQ mini ──────────────────────────────── */}
        {activeTab === 'parent' && (
          <div style={{
            marginTop: 32, padding: '24px 32px', borderRadius: 16,
            background: 'rgba(251,146,60,0.06)',
            border: '1px solid rgba(251,146,60,0.2)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#fb923c' }}>
              🎯 Phụ huynh cần biết
            </div>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', fontSize: 13, color: 'var(--ai-muted-text)' }}>
              <div>✅ <strong>Theo dõi nhiều con</strong> — 1 tài khoản quản lý tất cả</div>
              <div>✅ <strong>Báo cáo email tự động</strong> — nhận vào cuối tuần</div>
              <div>✅ <strong>Liên kết với GV</strong> — nhận thông báo bài tập, điểm</div>
              <div>✅ <strong>AI hướng nghiệp</strong> — gợi ý ngành phù hợp cho con</div>
            </div>
          </div>
        )}

        {/* ── Trust bar ────────────────────────────────────── */}
        <div style={{
          marginTop: 40, display: 'flex', justifyContent: 'center',
          flexWrap: 'wrap', gap: 24,
          color: 'var(--ai-muted-text)', fontSize: 13,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={15} style={{ color: '#34d399' }} /> Thanh toán VietQR an toàn
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={15} style={{ color: '#34d399' }} /> Kích hoạt trong vài phút
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={15} style={{ color: '#fbbf24' }} fill="#fbbf24" /> Hơn 5,000+ người dùng tin tưởng
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 1024px) and (min-width: 769px) {
          .pricing-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  )
}
