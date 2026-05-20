/**
 * AntiScreenshotWarning — Bảo vệ nội dung NHẸ NHÀNG
 *
 * Phiên bản 3 (2026-05-20):
 *   ❌ XOÁ blur toàn màn hình (bị trigger khi user refresh / chuyển tab)
 *   ❌ XOÁ modal warning chiếm full screen
 *   ✅ GIỮ watermark grid (passive, không cản UX)
 *   ✅ THÊM toast nhỏ ở góc dưới phải khi phát hiện phím tắt screenshot
 *
 * Component này render:
 *   1. Watermark luôn hiển thị (lưới chéo + email user) — bảo vệ thụ động,
 *      ảnh chụp rò rỉ vẫn truy được nguồn
 *   2. Toast cảnh báo ngắn (2.5s) khi user nhấn phím tắt bị chặn —
 *      KHÔNG modal full screen, KHÔNG blur, KHÔNG yêu cầu dismiss
 */
import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAntiScreenshot } from '@/hooks/useAntiScreenshot'

// ── Watermark Grid ─────────────────────────────────────────────────────────
function WatermarkGrid({ userLabel }: { userLabel: string }) {
  // Lưới watermark — diagonal, opacity rất thấp để không ảnh hưởng đọc,
  // nhưng đủ để ảnh chụp dính label người dùng (truy nguồn)
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden select-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -30deg,
            transparent 0px,
            transparent 240px,
            rgba(255,255,255,0.025) 240px,
            rgba(255,255,255,0.025) 241px
          )`,
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: 0.035,
          transform: 'rotate(-22deg) scale(1.3)',
          fontSize: '13px',
          color: '#fff',
          fontWeight: 600,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          lineHeight: '52px',
          textShadow: '0 0 4px rgba(255,255,255,0.6)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, auto)', gap: '32px 80px' }}>
          {Array.from({ length: 64 }).map((_, i) => (
            <span key={i}>inphysic.com · {userLabel}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AntiScreenshotWarning() {
  const { toastMsg } = useAntiScreenshot()
  const [userLabel, setUserLabel] = useState('inphysic.com')

  // Đọc thông tin user cho watermark
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        const email = u.email || u.username || u.id || 'guest'
        setUserLabel(email)
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <>
      {/* Watermark luôn hiển thị (mờ nhạt — không ảnh hưởng đọc) */}
      <WatermarkGrid userLabel={userLabel} />

      {/* Toast cảnh báo nhỏ góc dưới phải khi phát hiện phím tắt screenshot */}
      {toastMsg && (
        <div
          className="fixed bottom-4 right-4 z-[10000] max-w-sm animate-fade-in"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[hsl(0,0%,8%)]/95 border border-red-500/30 shadow-2xl shadow-red-500/20 backdrop-blur"
            style={{ pointerEvents: 'auto' }}
          >
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/85 leading-relaxed flex-1">
              {toastMsg}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
