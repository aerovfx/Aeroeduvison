/**
 * Activate — nhập mã kích hoạt nhận từ email
 * Route: /activate?code=AERO-XXXX-XXXX
 *
 * Sau khi POST /api/entitlements/activate thành công:
 *   - Hiển thị danh sách feature đã unlock + ngày hết hạn
 *   - CTA "Vào Wayground" → /teacher/wayground
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  KeyRound, CheckCircle2, Loader2, Sparkles, ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface ActivationResult {
  code: string
  planId: string
  features: string[]
  expiresAt: string
  entitlements?: Array<{ feature: string; expiresAt: string }>
}

interface FeatureMap { [key: string]: string }

export default function ActivatePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [code, setCode] = useState(params.get('code') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const [featureMap, setFeatureMap] = useState<FeatureMap>({})

  useEffect(() => {
    api.get('/entitlements/plan-features')
      .then(r => setFeatureMap(r.data.features || {}))
      .catch(() => { /* non-blocking */ })
  }, [])

  // Auto-submit nếu đã có code trong query param
  useEffect(() => {
    const c = params.get('code')
    if (c && !result && !loading) {
      setCode(c)
      // Submit sau 1 tick để UI mount xong
      setTimeout(() => doActivate(c), 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doActivate = async (codeToTry?: string) => {
    const c = (codeToTry || code).trim().toUpperCase()
    if (!c) { toast.error('Hãy nhập mã'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/entitlements/activate', { code: c })
      if (!data.ok) throw new Error(data.error || 'Lỗi không xác định')
      setResult(data)
      toast.success('Kích hoạt thành công! 🎉')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (err as { message?: string })?.message
        || 'Lỗi'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 24px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            marginBottom: 16,
          }}>
            <KeyRound size={28} style={{ color: '#fff' }} />
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Kích hoạt tính năng</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--ai-muted-text)', fontSize: 14 }}>
            Nhập mã 12 ký tự bạn nhận được trong email sau khi thanh toán.
          </p>
        </div>

        {!result && (
          <div style={{
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 16, padding: 28, boxShadow: 'var(--shadow)',
          }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-muted-text)',
              letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Mã kích hoạt
            </label>
            <input
              autoFocus
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && doActivate()}
              placeholder="AERO-XXXX-XXXX"
              style={{
                width: '100%', marginTop: 8, padding: '14px 16px',
                fontSize: 20, fontFamily: 'ui-monospace, monospace',
                fontWeight: 700, letterSpacing: 2, textAlign: 'center',
                background: 'var(--ai-tabs-bg)',
                border: '2px solid var(--ai-card-border)',
                borderRadius: 12, color: 'hsl(var(--foreground))',
                outline: 'none',
              }}
            />
            <button
              onClick={() => doActivate()}
              disabled={loading || code.length < 6}
              style={{
                marginTop: 14, width: '100%',
                background: 'linear-gradient(90deg, #ec4899, #db2777)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '14px 0', fontWeight: 700, fontSize: 15,
                cursor: loading || code.length < 6 ? 'not-allowed' : 'pointer',
                opacity: loading || code.length < 6 ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Đang kích hoạt...</>
                : <>Kích hoạt <Sparkles size={16} /></>
              }
            </button>

            <div style={{
              marginTop: 18, padding: 12, borderRadius: 10,
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.20)',
              fontSize: 12, color: 'var(--ai-muted-text)', lineHeight: 1.5,
            }}>
              💡 Chưa có mã? <a href="/pricing" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }}>Đăng ký gói</a>{' '}
              để nhận mã qua email.
            </div>
          </div>
        )}

        {result && (
          <div style={{
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 16, padding: 28, boxShadow: 'var(--shadow)',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 32,
              background: 'rgba(34,197,94,0.15)', marginBottom: 16,
            }}>
              <CheckCircle2 size={32} style={{ color: '#22c55e' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Kích hoạt thành công!</h2>
            <p style={{ margin: '8px 0 24px', color: 'var(--ai-muted-text)', fontSize: 14 }}>
              Mã <code style={{ background: 'var(--ai-tabs-bg)', padding: '2px 8px', borderRadius: 4 }}>
                {result.code}
              </code> đã được áp dụng cho gói <strong>{result.planId}</strong>.<br/>
              Hết hạn: <strong>{new Date(result.expiresAt).toLocaleDateString('vi-VN')}</strong>
            </p>

            <div style={{
              background: 'var(--ai-tabs-bg)', borderRadius: 12, padding: 16, textAlign: 'left',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ai-muted-text)',
                letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
                Tính năng được mở khoá
              </div>
              {result.features.map(f => (
                <div key={f} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', fontSize: 14,
                }}>
                  <ShieldCheck size={16} style={{ color: '#22c55e' }} />
                  {featureMap[f] || f}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/teacher/dashboard')} style={{
                flex: 1, background: 'transparent', border: '1px solid var(--ai-card-border)',
                color: 'hsl(var(--foreground))', borderRadius: 10, padding: '11px 0',
                fontWeight: 600, fontSize: 14, cursor: 'pointer',
              }}>
                Vào Dashboard
              </button>
              <button onClick={() => navigate('/teacher/wayground')} style={{
                flex: 1, background: 'linear-gradient(90deg, #ec4899, #db2777)',
                color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                Tạo đề ngay <Sparkles size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
