/**
 * ColdStartIndicator — Banner global hiện khi Cloud Run cold start
 *
 * Lý do tồn tại: Cloud Run `min-instances=0` để tiết kiệm chi phí, nhưng
 * sau idle thì container scale to zero. User mở trang gặp request latency
 * 5-8s + 401/500 retry → spam console errors.
 *
 * Component này subscribe coldStart state, hiện banner mềm "Đang khởi
 * động dịch vụ…" để user biết hệ thống đang warm up — KHÔNG phải lỗi.
 *
 * Mount 1 lần ở App root.
 */
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { coldStart } from '@/lib/coldStart'

export function ColdStartIndicator() {
  const [active, setActive] = useState(false)
  const [activatedAt, setActivatedAt] = useState<number | null>(null)
  const [recovered, setRecovered] = useState(false)

  useEffect(() => {
    let lastActive = false
    const unsub = coldStart.subscribe((a) => {
      if (a && !lastActive) {
        // Vừa kích hoạt
        setActivatedAt(Date.now())
        setRecovered(false)
        setActive(true)
      } else if (!a && lastActive) {
        // Vừa recover — hiện "Đã sẵn sàng" 1.5s rồi ẩn
        setRecovered(true)
        setTimeout(() => setActive(false), 1500)
      }
      lastActive = a
    })
    return unsub
  }, [])

  // Tick mỗi giây để update elapsed time (chỉ khi active + chưa recovered)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active || recovered) return
    const t = setInterval(() => setTick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [active, recovered])
  void tick

  if (!active) return null

  const elapsed = activatedAt ? Math.floor((Date.now() - activatedAt) / 1000) : 0

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: recovered
          ? 'linear-gradient(90deg, #16a34a, #22c55e)'
          : 'linear-gradient(90deg, #f59e0b, #f97316)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        maxWidth: 'calc(100vw - 32px)',
        animation: 'cold-start-slide-in 250ms ease-out',
      }}
    >
      <style>{`
        @keyframes cold-start-slide-in {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
      {recovered ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>Dịch vụ đã sẵn sàng</span>
        </>
      ) : (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>
            Đang khởi động dịch vụ… {elapsed > 0 && <span style={{ opacity: 0.85 }}>({elapsed}s)</span>}
          </span>
          {elapsed >= 10 && (
            <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 400 }}>
              · Mất thêm vài giây
            </span>
          )}
        </>
      )}
    </div>
  )
}

export default ColdStartIndicator
