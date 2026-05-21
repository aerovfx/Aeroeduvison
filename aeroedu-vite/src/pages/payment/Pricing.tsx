/**
 * Pricing — Bảng giá 3 đối tượng: Giáo viên / Học sinh / Phụ huynh
 * Route: /pricing
 *
 * - Tab switcher để lọc theo audience
 * - Badge "Phổ biến nhất" cho gói recommended
 * - Tự detect role user → pre-select tab phù hợp
 */
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, ShieldCheck, Zap, Star, Building2, GraduationCap, Users, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

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

export default function PricingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('teacher')

  // Detect user role → pre-select tab
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        const role = (u.role || '').toUpperCase()
        if (AUDIENCE_ROLE_MAP[role]) setActiveTab(AUDIENCE_ROLE_MAP[role])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    api.get('/payment/plans')
      .then(r => setPlans(r.data.plans || []))
      .catch(() => toast.error('Không tải được danh sách gói'))
      .finally(() => setLoading(false))
  }, [])

  const visiblePlans = useMemo(
    () => plans.filter(p => !p.audience || p.audience === activeTab),
    [plans, activeTab],
  )

  const activeTabCfg = TAB_CONFIG.find(t => t.id === activeTab)!

  const handleSelect = async (plan: Plan) => {
    setCreating(plan.id)
    try {
      const me = await api.get('/auth/me').catch(() => null)
      const u = me?.data || {}
      const { data } = await api.post('/payment/orders', {
        planId: plan.id,
        userId: u.id, userEmail: u.email, userName: u.name,
      })
      navigate(`/payment/${data.order.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi tạo đơn'
      toast.error(msg)
    } finally {
      setCreating(null)
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
            Chọn gói phù hợp với bạn
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
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
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
            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  background: isPopular
                    ? `linear-gradient(135deg, ${tabColor}10, ${tabColor}06)`
                    : 'var(--ai-card-bg)',
                  border: isPopular
                    ? `2px solid ${tabColor}55`
                    : '1px solid var(--ai-card-border)',
                  borderRadius: 18, padding: isPopular ? '32px 28px 28px' : 28,
                  boxShadow: isPopular
                    ? `0 8px 40px ${tabColor}20`
                    : 'var(--shadow)',
                  display: 'flex', flexDirection: 'column', gap: 18,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* Popular badge */}
                {isPopular && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{plan.name}</h3>
                    {plan.badge && (
                      <span style={{
                        background: 'rgba(251,146,60,0.15)', color: '#fb923c',
                        border: '1px solid rgba(251,146,60,0.3)',
                        borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      }}>
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 800, color: isPopular ? tabColor : 'hsl(var(--foreground))' }}>
                    {fmt(plan.amount)}
                  </div>
                  <div style={{ color: 'var(--ai-muted-text)', fontSize: 13, marginTop: 4 }}>
                    {plan.durationDays >= 365 ? '/ năm' : plan.durationDays === 30 ? '/ tháng' : `${plan.durationDays} ngày`}
                    {plan.durationDays >= 365 && plan.amount > 0 && (
                      <span style={{ marginLeft: 8, color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                        ≈ {fmt(Math.round(plan.amount / 12))}/tháng
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13.5 }}>
                      <CheckCircle2 size={15} style={{ color: isPopular ? tabColor : '#34d399', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ color: 'hsl(var(--foreground)/0.85)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <button
                  onClick={() => handleSelect(plan)}
                  disabled={creating === plan.id}
                  style={{
                    marginTop: 4,
                    background: isPopular
                      ? `linear-gradient(90deg, ${tabColor}, ${tabColor}cc)`
                      : 'transparent',
                    color: isPopular ? '#fff' : tabColor,
                    border: isPopular ? 'none' : `1.5px solid ${tabColor}55`,
                    borderRadius: 11,
                    padding: '13px 0', fontWeight: 700, fontSize: 14,
                    cursor: creating === plan.id ? 'not-allowed' : 'pointer',
                    opacity: creating === plan.id ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity 0.15s',
                  }}
                >
                  {creating === plan.id
                    ? <><Loader2 size={14} className="animate-spin" /> Đang tạo...</>
                    : isPopular ? <><Zap size={14} /> Bắt đầu ngay</> : 'Chọn gói này'
                  }
                </button>
              </div>
            )
          })}
        </div>

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
