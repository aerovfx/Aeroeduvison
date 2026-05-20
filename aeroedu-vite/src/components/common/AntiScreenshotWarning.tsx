/**
 * AntiScreenshotWarning v4 (2026-05-21) — Bảo vệ nội dung mạnh hơn
 *
 * 4 lớp phòng thủ:
 *   1. WATERMARK GRID — luôn hiển thị, opacity vừa đủ để ảnh chụp dính
 *      email + thời gian. Density cao + tone đậm hơn v3.
 *   2. INSTANT BLUR ON FOCUS LOSS — khi window mất focus (xảy ra khi
 *      Cmd+Shift+4 picker xuất hiện hoặc switch tab), blur(40px) toàn
 *      bộ #root. Khi focus quay lại → fade out 300ms.
 *   3. CORNER ID BADGE — góc trên-trái + dưới-phải hiển thị email + IP
 *      lờ mờ. Mọi screenshot dính ít nhất 1 góc.
 *   4. TOAST WARNING — góc dưới phải khi phát hiện phím tắt screenshot
 *      (chỉ hữu hiệu cho Windows/Linux — macOS bắt phím trước browser).
 */
import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAntiScreenshot } from '@/hooks/useAntiScreenshot'

// ── Watermark Grid (v4: density + opacity tăng) ───────────────────────────
function WatermarkGrid({ userLabel, timeStr }: { userLabel: string; timeStr: string }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Diagonal lưới dày hơn */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -30deg,
            transparent 0px,
            transparent 160px,
            rgba(255,255,255,0.05) 160px,
            rgba(255,255,255,0.05) 161px
          )`,
        }}
      />
      {/* Watermark chữ — opacity gấp đôi v3 + nhiều dòng hơn */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: 0.07,
          transform: 'rotate(-22deg) scale(1.4)',
          fontSize: '14px',
          color: '#fff',
          fontWeight: 700,
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
          lineHeight: '48px',
          textShadow: '0 0 5px rgba(255,255,255,0.7)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, auto)', gap: '24px 60px' }}>
          {Array.from({ length: 100 }).map((_, i) => (
            <span key={i}>inphysic.com · {userLabel} · {timeStr}</span>
          ))}
        </div>
      </div>

      {/* CORNER BADGES — 4 góc, opacity cao hơn để rõ trên ảnh chụp */}
      {/* Top-left */}
      <div
        className="absolute top-2 left-2 px-2 py-1 rounded font-mono"
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.18)',
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
        }}
      >
        🛡 {userLabel} · {timeStr}
      </div>
      {/* Top-right */}
      <div
        className="absolute top-2 right-2 px-2 py-1 rounded font-mono"
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.18)',
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
        }}
      >
        inphysic.com · BẢN QUYỀN
      </div>
      {/* Bottom-left */}
      <div
        className="absolute bottom-2 left-2 px-2 py-1 rounded font-mono"
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.18)',
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
        }}
      >
        ⚠ Không chụp/ghi nội dung
      </div>
      {/* Bottom-right */}
      <div
        className="absolute bottom-2 right-2 px-2 py-1 rounded font-mono"
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.18)',
          background: 'rgba(0,0,0,0.15)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {userLabel}
      </div>
    </div>
  )
}

export function AntiScreenshotWarning() {
  const { toastMsg, blurActive, blurAmount } = useAntiScreenshot()
  const [userLabel, setUserLabel] = useState('inphysic.com')
  const [timeStr, setTimeStr] = useState('')

  // User label + timestamp (cập nhật mỗi phút để watermark "mới")
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) {
        const u = JSON.parse(raw)
        const email = u.email || u.username || u.id || 'guest'
        setUserLabel(email)
      }
    } catch { /* ignore */ }
    const update = () => {
      const d = new Date()
      setTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Apply / remove blur to #root khi blurActive thay đổi ──
  useEffect(() => {
    const root = document.getElementById('root') || document.body
    if (blurActive) {
      // Blur ngay tức thì — không transition để tránh delay
      root.style.filter = `blur(${blurAmount}px)`
    } else {
      // Fade out blur 300ms khi focus quay lại
      root.style.transition = 'filter 0.3s ease-out'
      root.style.filter = ''
      // Clean up transition sau 350ms
      setTimeout(() => { root.style.transition = '' }, 350)
    }
    return () => {
      root.style.filter = ''
      root.style.transition = ''
    }
  }, [blurActive, blurAmount])

  return (
    <>
      <WatermarkGrid userLabel={userLabel} timeStr={timeStr} />

      {/* Anti-screenshot overlay khi blur active — hiển thị 1 thông điệp
          lớn để ảnh chụp tool capture nội dung này thay vì content thật */}
      {blurActive && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none"
          style={{
            background: 'rgba(15,10,30,0.55)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className="text-center px-8 py-6 rounded-2xl border border-red-500/30 max-w-md mx-4"
            style={{
              background: 'rgba(15,10,30,0.85)',
              boxShadow: '0 0 60px rgba(239,68,68,0.3)',
              filter: 'none', // Modal KHÔNG bị blur
            }}
          >
            <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">
              🛡 Nội dung đang được bảo vệ
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Trang bị ẩn khi cửa sổ mất focus (thường xảy ra khi screenshot
              picker xuất hiện hoặc bạn chuyển tab).
            </p>
            <p className="text-xs text-amber-300 mt-3 font-mono">
              {userLabel} · {timeStr}
            </p>
          </div>
        </div>
      )}

      {/* Toast warning ở góc dưới phải khi phát hiện phím tắt */}
      {toastMsg && (
        <div
          className="fixed bottom-4 right-4 z-[10000] max-w-sm animate-fade-in"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[hsl(0,0%,8%)]/95 border border-red-500/30 shadow-2xl shadow-red-500/20 backdrop-blur"
            style={{ pointerEvents: 'auto', filter: 'none' }}
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
