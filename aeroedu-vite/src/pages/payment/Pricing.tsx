/**
 * Pricing — chọn gói + tạo order thanh toán
 * Route: /pricing
 *
 * Sau khi tạo order: navigate /payment/:orderId để hiển thị thông tin chuyển khoản.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface Plan {
  id: string
  name: string
  amount: number
  durationDays: number
  features: string[]
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

export default function PricingPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    api.get('/payment/plans')
      .then(r => setPlans(r.data.plans || []))
      .catch(() => toast.error('Không tải được danh sách gói'))
      .finally(() => setLoading(false))
  }, [])

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
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px' }}>Bảng giá AeroEdu</h1>
          <p style={{ color: 'var(--ai-muted-text)', fontSize: 16, margin: 0 }}>
            Thanh toán bằng chuyển khoản ngân hàng — xác nhận trong vài phút.
          </p>
        </div>

        <div style={{
          display: 'grid', gap: 20,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              background: 'var(--ai-card-bg)',
              border: '1px solid var(--ai-card-border)',
              borderRadius: 16, padding: 28,
              boxShadow: 'var(--shadow)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{plan.name}</h3>
                <div style={{ marginTop: 12, fontSize: 32, fontWeight: 800, color: 'hsl(var(--primary))' }}>
                  {fmt(plan.amount)}
                </div>
                <div style={{ color: 'var(--ai-muted-text)', fontSize: 13, marginTop: 4 }}>
                  {plan.durationDays} ngày
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={creating === plan.id}
                style={{
                  marginTop: 'auto',
                  background: 'linear-gradient(90deg, #ec4899, #db2777)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 0', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', opacity: creating === plan.id ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                {creating === plan.id
                  ? <><Loader2 size={14} className="animate-spin" /> Đang tạo...</>
                  : <>Chọn gói này</>
                }
              </button>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 32, display: 'flex', justifyContent: 'center', gap: 8,
          color: 'var(--ai-muted-text)', fontSize: 13,
        }}>
          <ShieldCheck size={16} /> Chuyển khoản qua VietQR — tự động đối soát.
        </div>
      </div>
    </div>
  )
}
