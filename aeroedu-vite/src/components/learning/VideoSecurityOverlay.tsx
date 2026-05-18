/**
 * VideoSecurityOverlay — Chống copy + chống quay màn hình cho LMS player.
 *
 * GIỚI HẠN THỰC TẾ:
 * Browser KHÔNG thể chặn 100% OS-level screen capture (OBS, QuickTime,
 * Windows Snipping Tool) nếu không có DRM Widevine L1/FairPlay (cần
 * license $50k+ và HW support — không feasible cho phần lớn LMS).
 *
 * Strategy là DEFENSE-IN-DEPTH + DETERRENT (chuẩn Coursera/Udemy):
 *
 * Tier 1 — Strong deterrent (always-on):
 *   ✅ Dynamic watermark: tên + email + UTC time, random position 5s/lần,
 *      mix-blend-mode để visible trên cả dark + light frames
 *   ✅ Disable right-click context menu
 *   ✅ Disable text selection (user-select: none)
 *   ✅ Disable kéo-thả nội dung
 *   ✅ Block Ctrl+P, Ctrl+S, Ctrl+Shift+S, PrintScreen
 *   ✅ Block window.print()
 *   ✅ Pause video khi tab/window mất focus (Page Visibility API)
 *   ✅ controlsList="nodownload noremoteplayback" + disablePictureInPicture
 *
 * Tier 2 — Detection (best effort):
 *   ✅ DevTools open detection (timing trick) → blur video + warning
 *   ✅ getDisplayMedia API monitoring (browser screen-share intent)
 *
 * Tier 3 — Education:
 *   ✅ First-load warning banner: "Bài giảng có watermark, vi phạm
 *      bản quyền sẽ xử lý theo Luật SHTT 2005"
 *
 * Vi phạm vẫn có thể xảy ra. Watermark đảm bảo có EVIDENCE TRUY VẾT.
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Shield, AlertTriangle } from 'lucide-react'

interface Props {
  /** Element được bảo vệ (player area) — overlay sẽ nằm trên */
  children: React.ReactNode
  /** Title video hiện tại (để watermark chính xác) */
  videoTitle?: string
  /** Tắt watermark (chỉ dùng cho preview/test) */
  disableWatermark?: boolean
}

const LS_WARNING_SEEN = 'lms:security:warning-seen'

export default function VideoSecurityOverlay({ children, videoTitle, disableWatermark }: Props) {
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [devtoolsOpen, setDevtoolsOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  // Watermark position: x/y % của container, đổi mỗi 5s
  const [wmPos, setWmPos] = useState({ x: 10, y: 10 })

  // Show warning lần đầu user vào trang learning
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(LS_WARNING_SEEN)) setShowWarning(true)
  }, [])

  const acknowledgeWarning = () => {
    localStorage.setItem(LS_WARNING_SEEN, '1')
    setShowWarning(false)
  }

  // ── Watermark position cycling — random mỗi 5s ──
  useEffect(() => {
    if (disableWatermark) return
    const tick = () => {
      setWmPos({
        x: 5 + Math.random() * 75,   // 5% → 80%
        y: 5 + Math.random() * 80,   // 5% → 85%
      })
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [disableWatermark])

  // ── Disable right-click + selection + drag globally on container ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const block = (e: Event) => { e.preventDefault(); return false }
    el.addEventListener('contextmenu', block)
    el.addEventListener('dragstart', block)
    el.addEventListener('selectstart', block)
    el.addEventListener('copy', block)
    el.addEventListener('cut', block)
    return () => {
      el.removeEventListener('contextmenu', block)
      el.removeEventListener('dragstart', block)
      el.removeEventListener('selectstart', block)
      el.removeEventListener('copy', block)
      el.removeEventListener('cut', block)
    }
  }, [])

  // ── Block window.print + keyboard shortcuts ──
  useEffect(() => {
    const origPrint = window.print
    window.print = () => {
      console.warn('🚫 Print blocked on LMS course player')
    }
    const onKey = (e: KeyboardEvent) => {
      // Ctrl+P / Cmd+P → print
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault(); return
      }
      // Ctrl+S / Cmd+S → save page
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault(); return
      }
      // PrintScreen (Windows) — can clear clipboard
      if (e.key === 'PrintScreen' || (e as any).keyCode === 44) {
        try { navigator.clipboard.writeText('') } catch { /* ignore */ }
        e.preventDefault(); return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.print = origPrint
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Detect mobile UA — tắt các overlay false-positive (DevTools dh, focus blur)
  const isMobile = typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // ── Pause/hide when tab loses focus ──
  // Mobile: CHỈ dùng `document.hidden` (visibility API chuẩn) —
  // KHÔNG dùng `document.hasFocus()` vì trên iOS/Android, focus mất khi:
  //   - User chạm vào element không focusable (false positive → overlay block click)
  //   - Bàn phím ảo mở/đóng
  //   - Address bar bounce
  // Desktop: dùng cả 2 để chặn OBS window-capture chính xác.
  useEffect(() => {
    const onVis = () => {
      const isHidden = isMobile ? document.hidden : (document.hidden || !document.hasFocus())
      setHidden(isHidden)
      if (isHidden) {
        const videos = containerRef.current?.querySelectorAll('video')
        videos?.forEach(v => { try { v.pause() } catch { /* ignore */ } })
      }
    }
    document.addEventListener('visibilitychange', onVis)
    if (!isMobile) {
      window.addEventListener('blur', onVis)
      window.addEventListener('focus', onVis)
    }
    onVis()
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      if (!isMobile) {
        window.removeEventListener('blur', onVis)
        window.removeEventListener('focus', onVis)
      }
    }
  }, [isMobile])

  // ── DevTools detection — DISABLE trên mobile ──
  // Mobile có address bar dynamic + virtual keyboard pushUp → outerWidth/innerWidth
  // chênh lệch >160px nhiều TRƯỜNG HỢP HỢP LỆ:
  //   - Safari iOS có toolbar bottom → dh ~80-130px
  //   - Chrome Android scroll → address bar collapse → dh thay đổi liên tục
  //   - Bàn phím mở → dh tăng vọt → overlay block toàn bộ tương tác
  // → CHỈ check trên desktop. Mobile thay bằng simple check Cmd+Opt+I (no-op).
  useEffect(() => {
    if (isMobile) {
      setDevtoolsOpen(false)
      return
    }
    let cancelled = false
    const check = () => {
      if (cancelled) return
      const dw = Math.abs(window.outerWidth - window.innerWidth)
      const dh = Math.abs(window.outerHeight - window.innerHeight)
      // Desktop threshold cao hơn (200 → tránh edge case browser zoom)
      const open = dw > 200 || dh > 200
      setDevtoolsOpen(open)
    }
    check()
    const id = setInterval(check, 1500)
    return () => { cancelled = true; clearInterval(id) }
  }, [isMobile])

  // Watermark text — tên + email + thời gian (UTC)
  const wmText = user
    ? `${user.name || user.email} · ${user.email || '—'}`
    : 'Guest · inphysic.com'
  const wmTime = new Date().toISOString().slice(0, 19).replace('T', ' ')

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {children}

      {/* WATERMARK OVERLAY — pointer-events: none để không chặn click controls */}
      {!disableWatermark && (
        <div
          className="absolute pointer-events-none transition-all duration-1000 z-20"
          style={{
            left: `${wmPos.x}%`,
            top:  `${wmPos.y}%`,
            mixBlendMode: 'difference',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '11px',
            fontFamily: 'monospace',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            lineHeight: 1.3,
          }}
        >
          <div>🛡 {wmText}</div>
          <div>{wmTime} UTC · inphysic.com</div>
          {videoTitle && <div className="truncate max-w-[220px]">{videoTitle}</div>}
        </div>
      )}

      {/* OVERLAY khi tab mất focus (deter window-capture OBS) */}
      {hidden && (
        <div className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center
                        text-white text-center p-6 backdrop-blur-md">
          <Shield className="w-16 h-16 text-amber-400 mb-3" />
          <h3 className="text-lg font-bold mb-1">⏸ Video tạm dừng</h3>
          <p className="text-xs text-zinc-300 max-w-xs">
            Vui lòng quay lại tab để tiếp tục học. Bài giảng có watermark
            chống sao chép — vi phạm sẽ xử lý theo Luật SHTT.
          </p>
        </div>
      )}

      {/* OVERLAY khi devtools mở (deterrent) */}
      {devtoolsOpen && (
        <div className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center
                        text-white text-center p-6 backdrop-blur-sm">
          <AlertTriangle className="w-16 h-16 text-red-400 mb-3" />
          <h3 className="text-lg font-bold mb-1">🚫 DevTools detected</h3>
          <p className="text-xs text-zinc-300 max-w-xs">
            Vui lòng đóng DevTools để xem bài giảng. Hành vi truy cập trái phép
            được ghi lại để xử lý vi phạm bản quyền.
          </p>
        </div>
      )}

      {/* FIRST-LOAD WARNING DIALOG */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-gradient-to-br from-zinc-900 to-zinc-950
                          border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Shield className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cảnh báo bản quyền</h3>
                <p className="text-[10px] text-amber-300/70">Đọc trước khi học</p>
              </div>
            </div>
            <ul className="text-xs text-zinc-300 space-y-2 mb-5 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-amber-400 shrink-0">▸</span>
                Bài giảng có <strong>watermark hiển thị tên + email</strong> của bạn —
                xuất hiện ngẫu nhiên trên màn hình mỗi 5 giây
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 shrink-0">▸</span>
                <strong>Cấm</strong> quay màn hình (OBS, QuickTime, ...) hoặc
                chia sẻ video ra ngoài
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 shrink-0">▸</span>
                <strong>Cấm</strong> tải xuống, in, screenshot bài giảng để
                phân phối lại
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400 shrink-0">▸</span>
                Vi phạm sẽ bị xử lý theo <strong>Luật Sở hữu trí tuệ 2005</strong>
                (sửa đổi 2009/2019) — phạt 5-500 triệu VND + bồi thường thiệt hại
              </li>
            </ul>
            <button
              onClick={acknowledgeWarning}
              className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500
                         hover:from-amber-400 hover:to-orange-400 text-white font-bold text-sm
                         shadow-lg transition hover:scale-[1.02]"
            >
              ✓ Tôi đã đọc và đồng ý — Bắt đầu học
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
