/**
 * AntiScreenshotWarning — hệ thống bảo vệ nội dung 3-lớp:
 *
 *   1. BLUR LAYER — toàn bộ #app-root → filter:blur(24px) khi blurActive=true
 *      → ảnh chụp được sẽ mờ tịt
 *   2. WATERMARK GRID — overlay đầy màn hình với email + thời gian
 *      → ảnh nếu rò rỉ vẫn truy được user
 *   3. WARNING MODAL — cảnh báo rõ ràng khi phát hiện screenshot shortcut
 *
 * Tích hợp vào DashboardLayout → áp dụng toàn bộ dashboard.
 */
import { useEffect, useState } from 'react'
import { ShieldAlert, X, Lock } from 'lucide-react'
import { useAntiScreenshot } from '@/hooks/useAntiScreenshot'

// ── Watermark Grid ─────────────────────────────────────────────────────────
function WatermarkGrid({ userLabel }: { userLabel: string }) {
  // Lưới watermark — diagonal, đủ dày để ảnh chụp luôn dính label
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
            transparent 180px,
            rgba(255,255,255,0.04) 180px,
            rgba(255,255,255,0.04) 181px
          )`,
        }}
      />
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: 0.045,
          transform: 'rotate(-22deg) scale(1.3)',
          fontSize: '14px',
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
  const { showWarning, blurActive, reason, dismissWarning } = useAntiScreenshot()
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

  // ── Apply / remove blur to #app-root khi blurActive thay đổi ──
  useEffect(() => {
    const root = document.getElementById('root') || document.body
    if (blurActive) {
      root.style.transition = 'filter 0.25s ease-in-out'
      root.style.filter = 'blur(24px) brightness(0.3)'
    } else {
      root.style.filter = ''
      // remove transition sau khi xong để không ảnh hưởng UI khác
      setTimeout(() => { root.style.transition = '' }, 300)
    }
    return () => {
      root.style.filter = ''
      root.style.transition = ''
    }
  }, [blurActive])

  return (
    <>
      {/* Watermark luôn hiển thị (mờ nhạt — không ảnh hưởng đọc) */}
      <WatermarkGrid userLabel={userLabel} />

      {/* Warning modal khi phát hiện screenshot shortcut */}
      {showWarning && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={dismissWarning}
        >
          <div
            className="relative mx-4 max-w-md w-full rounded-2xl border border-red-500/30 bg-[hsl(0,0%,7%)] p-7 text-center shadow-[0_0_80px_rgba(239,68,68,0.25)]"
            onClick={e => e.stopPropagation()}
            style={{ filter: 'none' }}  // ép modal không bị blur
          >
            <button
              onClick={dismissWarning}
              className="absolute right-3 top-3 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center relative">
                <ShieldAlert className="w-10 h-10 text-red-400" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center border-2 border-[hsl(0,0%,7%)]">
                  <Lock className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-lg font-bold text-white/90 mb-1">⚠ Phát hiện cố gắng chụp/ghi</h2>
            <p className="text-xs text-red-400/80 mb-4 font-mono">{reason}</p>

            <p className="text-sm text-white/55 leading-relaxed mb-5">
              Nội dung này được <strong className="text-white/80">bảo vệ bản quyền</strong>.
              Việc chụp màn hình, ghi hình, lưu trữ, hoặc phân phối lại tài liệu này
              KHÔNG được phép và có thể vi phạm <strong className="text-amber-300/80">
              Luật Sở hữu trí tuệ 50/2005/QH11
              </strong>.
            </p>

            <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/15 p-3 mb-5 text-left">
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                🔍 <strong>Phiên này được giám sát:</strong> tài khoản{' '}
                <span className="font-mono text-amber-200">{userLabel}</span>{' '}
                và thời điểm sự kiện đã được ghi nhận. Watermark trên màn hình
                giúp truy nguồn rò rỉ.
              </p>
            </div>

            <button
              onClick={dismissWarning}
              className="w-full py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-sm font-semibold text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all"
            >
              Tôi hiểu và tiếp tục học
            </button>
            <p className="text-[0.65rem] text-white/20 mt-3">
              Tự động đóng sau 6 giây · Nội dung tạm mờ 3 giây để bảo vệ
            </p>
          </div>
        </div>
      )}
    </>
  )
}
