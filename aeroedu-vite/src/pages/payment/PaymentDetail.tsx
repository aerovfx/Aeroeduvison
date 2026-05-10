/**
 * PaymentDetail — chi tiết 1 đơn thanh toán
 * Route: /payment/:orderId
 *
 * Flow:
 *   1. Hiển thị thông tin chuyển khoản (số TK, tên, số tiền, mã GD) + QR VietQR
 *   2. User tự chuyển khoản qua app ngân hàng
 *   3. User nhấn "Tôi đã chuyển khoản" → POST /api/payment/orders/:id/notify
 *   4. Page poll status mỗi 4s; chuyển sang trạng thái thành công khi admin
 *      duyệt qua Telegram
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Copy, CheckCircle2, Loader2, Clock, AlertCircle, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/services/api'

interface BankInfo {
  bankCode: string
  bankName: string
  accountNo: string
  accountName: string
}
interface Order {
  id: string
  planId: string
  planName: string
  amount: number
  transferCode: string
  status: 'PENDING' | 'AWAITING_REVIEW' | 'PAID' | 'REJECTED'
  createdAt: string
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

function CopyField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    toast.success(`Đã sao chép ${label}`)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 10,
      border: '1px solid var(--ai-card-border)',
      background: 'var(--ai-card-bg)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--ai-muted-text)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </div>
        <div style={{
          fontSize: mono ? 16 : 14, fontWeight: 700,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
          color: 'hsl(var(--foreground))',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {value}
        </div>
      </div>
      <button onClick={onCopy} title="Sao chép" style={{
        background: 'transparent', border: '1px solid var(--ai-card-border)', borderRadius: 8,
        padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: copied ? '#22c55e' : 'var(--ai-muted-text)',
      }}>
        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

export default function PaymentDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [bank, setBank] = useState<BankInfo | null>(null)
  const [qrUrl, setQrUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [adminMissing, setAdminMissing] = useState(false)
  const pollRef = useRef<number | null>(null)

  // Initial load — gọi GET order; cũng cần lấy bank info + qr
  useEffect(() => {
    if (!orderId) return
    Promise.all([
      api.get(`/payment/orders/${orderId}`),
      api.get('/payment/bank'),
    ]).then(([orderRes, bankRes]) => {
      const o = orderRes.data.order as Order
      const b = bankRes.data as BankInfo
      setOrder(o); setBank(b)
      // VietQR URL: dùng client-side dựng cho responsive
      const params = new URLSearchParams({
        amount: String(o.amount), addInfo: o.transferCode, accountName: b.accountName,
      })
      setQrUrl(`https://img.vietqr.io/image/${b.bankCode}-${b.accountNo}-compact2.png?${params}`)
    })
      .catch(() => toast.error('Không tải được đơn hàng'))
      .finally(() => setLoading(false))
  }, [orderId])

  // Poll status mỗi 4s khi đang ở AWAITING_REVIEW
  useEffect(() => {
    if (!order || (order.status !== 'AWAITING_REVIEW' && order.status !== 'PENDING')) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      return
    }
    if (pollRef.current) return
    pollRef.current = window.setInterval(async () => {
      try {
        const r = await api.get(`/payment/orders/${order.id}`)
        setOrder(r.data.order)
      } catch { /* keep polling */ }
    }, 4000)
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [order?.id, order?.status])

  const handleNotify = async () => {
    if (!order) return
    setNotifying(true)
    setAdminMissing(false)
    try {
      await api.post(`/payment/orders/${order.id}/notify`)
      const r = await api.get(`/payment/orders/${order.id}`)
      setOrder(r.data.order)
      toast.success('Đã thông báo cho admin. Vui lòng đợi xác nhận.')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi'
      if (msg.includes('admin chat')) {
        setAdminMissing(true)
        toast.error('Admin chưa cấu hình Telegram. Xem hướng dẫn bên dưới.')
      } else {
        toast.error(msg)
      }
    } finally {
      setNotifying(false)
    }
  }

  if (loading || !order || !bank) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--ai-page-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'hsl(var(--primary))' }} />
      </div>
    )
  }

  const isPaid = order.status === 'PAID'
  const isRejected = order.status === 'REJECTED'
  const isAwaiting = order.status === 'AWAITING_REVIEW'
  const isPending = order.status === 'PENDING'

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--ai-page-bg)', color: 'hsl(var(--foreground))',
    }}>
      <div style={{
        background: 'var(--ai-card-bg)', borderBottom: '1px solid var(--ai-card-border)',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/pricing')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: '1px solid var(--ai-card-border)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
          color: 'var(--ai-muted-text)', fontSize: 13, fontWeight: 600,
        }}>
          <ArrowLeft size={14} /> Đổi gói
        </button>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Thanh toán đơn hàng</h1>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 24px' }}>

        {/* Status banner */}
        <div style={{
          background: isPaid ? 'rgba(34,197,94,0.10)'
                  : isRejected ? 'rgba(239,68,68,0.10)'
                  : isAwaiting ? 'rgba(59,130,246,0.10)'
                  : 'rgba(245,158,11,0.10)',
          border: `1px solid ${isPaid ? 'rgba(34,197,94,0.35)'
                            : isRejected ? 'rgba(239,68,68,0.35)'
                            : isAwaiting ? 'rgba(59,130,246,0.35)'
                            : 'rgba(245,158,11,0.35)'}`,
          borderRadius: 14, padding: 20, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {isPaid ? <CheckCircle2 size={28} style={{ color: '#22c55e' }} />
            : isRejected ? <AlertCircle size={28} style={{ color: '#ef4444' }} />
            : isAwaiting ? <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6' }} />
            : <Clock size={28} style={{ color: '#f59e0b' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {isPaid && '✅ Thanh toán thành công'}
              {isRejected && '❌ Đơn hàng bị từ chối'}
              {isAwaiting && '⏳ Đang chờ admin xác nhận'}
              {isPending && '🕐 Chờ bạn chuyển khoản'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ai-muted-text)', marginTop: 3 }}>
              {isPaid && 'Tài khoản của bạn đã được kích hoạt gói ' + order.planName}
              {isRejected && 'Vui lòng liên hệ hỗ trợ nếu bạn đã chuyển khoản.'}
              {isAwaiting && 'Hệ thống đang đợi xác nhận từ Telegram. Trang sẽ tự cập nhật.'}
              {isPending && 'Vui lòng chuyển khoản theo thông tin bên dưới.'}
            </div>
          </div>
          {isPaid && (
            <button onClick={() => navigate('/teacher/dashboard')} style={{
              background: '#22c55e', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              Vào Dashboard <ExternalLink size={14} />
            </button>
          )}
        </div>

        {!isPaid && !isRejected && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24,
            background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
            borderRadius: 16, padding: 24,
          }}>
            {/* Left — bank info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{order.planName}</h2>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'hsl(var(--primary))', marginTop: 6 }}>
                  {fmt(order.amount)}
                </div>
              </div>

              <CopyField label="Ngân hàng" value={bank.bankName} />
              <CopyField label="Số tài khoản" value={bank.accountNo} mono />
              <CopyField label="Chủ tài khoản" value={bank.accountName} />
              <CopyField label="Số tiền" value={String(order.amount)} mono />
              <CopyField label="Nội dung CK (BẮT BUỘC)" value={order.transferCode} mono />

              <div style={{
                marginTop: 8, padding: 12, borderRadius: 10,
                background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)',
                fontSize: 13, color: '#92400e',
              }}>
                ⚠️ Vui lòng <strong>ghi chính xác mã giao dịch</strong> trong nội dung chuyển khoản
                để hệ thống đối soát tự động.
              </div>

              {isPending && (
                <button onClick={handleNotify} disabled={notifying} style={{
                  marginTop: 8, background: '#22c55e', color: '#fff',
                  border: 'none', borderRadius: 10, padding: '12px 18px',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  opacity: notifying ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  {notifying
                    ? <><Loader2 size={14} className="animate-spin" /> Đang thông báo...</>
                    : <><CheckCircle2 size={14} /> Tôi đã chuyển khoản</>
                  }
                </button>
              )}
              {isAwaiting && (
                <div style={{
                  marginTop: 8, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                  color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Loader2 size={14} className="animate-spin" />
                  Đã thông báo cho admin — đang đợi duyệt qua Telegram.
                </div>
              )}
              {adminMissing && (
                <div style={{
                  marginTop: 8, padding: '12px 14px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)',
                  color: '#92400e',
                }}>
                  ⚠️ <strong>Cài đặt 1 lần:</strong> mở{' '}
                  <a href="https://t.me/Aeroedu_bot" target="_blank" rel="noreferrer"
                     style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                    https://t.me/Aeroedu_bot
                  </a>{' '}
                  rồi bấm <strong>Start</strong> để nhận thông báo đơn hàng.
                  Sau đó bấm "Tôi đã chuyển khoản" lại.
                </div>
              )}
            </div>

            {/* Right — QR */}
            <div style={{
              background: '#fff', border: '1px solid var(--ai-card-border)',
              borderRadius: 12, padding: 12, height: 'fit-content',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <div style={{ fontSize: 11, color: '#525252', fontWeight: 600, letterSpacing: 0.5 }}>
                QUÉT MÃ VIETQR
              </div>
              {qrUrl && (
                <img src={qrUrl} alt="VietQR" style={{
                  width: '100%', height: 'auto', borderRadius: 6,
                  background: '#f8fafc',
                }} />
              )}
              <div style={{ fontSize: 11, color: '#525252', textAlign: 'center', lineHeight: 1.4 }}>
                Mở app ngân hàng → quét mã.<br/>
                Số tiền & nội dung CK đã có sẵn.
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--ai-muted-text)', textAlign: 'center' }}>
          Mã đơn hàng: <code style={{ background: 'var(--ai-tabs-bg)', padding: '2px 6px', borderRadius: 4 }}>{order.id}</code>
        </div>
      </div>
    </div>
  )
}
