/**
 * useAntiScreenshot v4 (2026-05-21) — Chặn screenshot mạnh hơn
 *
 * VẤN ĐỀ: macOS bắt Cmd+Shift+3/4/5 ở OS layer TRƯỚC khi đến browser.
 * Browser KHÔNG thể preventDefault — keystroke không bao giờ tới JS.
 * → Phải dùng cơ chế gián tiếp: detect focus loss + blur ngay tức thì.
 *
 * STRATEGY v4 (multi-layer defense):
 *   1. ⚡ INSTANT BLUR ON FOCUS LOSS — khi window mất focus (xảy ra
 *      0.1-0.3s sau khi Cmd+Shift+4 picker xuất hiện), ngay lập tức
 *      blur(40px) toàn bộ #root. Ảnh chụp sẽ thấy màn hình MỜ TỊT.
 *   2. 🏷 PROMINENT WATERMARK — overlay user email + IP rõ ràng ở
 *      4 góc + center diagonal lưới đậm. Mọi ảnh rò rỉ có ID user.
 *   3. ⌨️ KEYBOARD CAPTURE — vẫn try chặn cho Windows/Linux + cảnh báo
 *      qua toast. Mac không catch được nhưng cũng không hại.
 *   4. 📹 SCREEN RECORDING DETECTION — monitor getDisplayMedia API,
 *      nếu user start screen recording → toast + audit log.
 *   5. 🔍 DEVTOOLS DETECTION đã bỏ (false positive khi resize).
 *
 * Trade-off: blur ngắn (300ms) khi user chuyển tab có thể gây flash,
 * nhưng đảm bảo screenshot tool không capture được nội dung rõ nét.
 *
 * Toast warning: hiển thị nhẹ ở góc dưới — không ngăn cản UX.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const TOAST_DURATION_MS = 2500
const BLUR_DURATION_MS = 500    // blur 500ms khi focus loss
const BLUR_AMOUNT_PX = 40       // strong blur — screenshot không đọc được

export function useAntiScreenshot() {
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [blurActive, setBlurActive] = useState(false)
  const toastTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTriggerRef = useRef(0)

  // ─── Trigger toast (key combo detected) ──────────────────────
  const trigger = useCallback((reason: string) => {
    const now = Date.now()
    if (now - lastTriggerRef.current < 1000) return
    lastTriggerRef.current = now

    setToastMsg(`⛔ ${reason} — nội dung được bảo vệ bản quyền`)

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), TOAST_DURATION_MS)

    // Audit log fire-and-forget
    try {
      const userStr = localStorage.getItem('user')
      const userId  = userStr ? JSON.parse(userStr).id : 'guest'
      fetch('/api/audit/screenshot-attempt', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, reason, ts: now,
          url: window.location.href,
          ua: navigator.userAgent,
        }),
      }).catch(() => {})
    } catch { /* ignore */ }
  }, [])

  // ─── Instant blur on focus loss (catches macOS screenshot picker) ──
  // Khi user nhấn Cmd+Shift+4, macOS hiển thị crosshair picker. Window
  // browser mất focus trong khoảnh khắc đó. Ta blur(40px) ngay → ảnh
  // chụp được sẽ là màn hình mờ tịt. Khi user click chọn vùng / thoát
  // → focus quay lại → blur tan dần.
  useEffect(() => {
    const handleFocusLoss = () => {
      // Blur ngay tức thì — kể cả nếu false positive (user chuyển tab thường)
      // vẫn OK vì user không nhìn page lúc đó. Khi focus quay lại → blur tan.
      setBlurActive(true)
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      // Khi window blur kéo dài >2s → có khả năng đang screen recording
      // → blur kéo dài thêm (không tự clear). Khi focus quay lại sẽ clear.
    }
    const handleFocusGain = () => {
      // Delay nhẹ 300ms để chắc chắn screenshot tool đã tắt
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      blurTimerRef.current = setTimeout(() => setBlurActive(false), 300)
    }
    const handleVisibility = () => {
      if (document.hidden) handleFocusLoss()
      else handleFocusGain()
    }

    window.addEventListener('blur', handleFocusLoss)
    window.addEventListener('focus', handleFocusGain)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', handleFocusLoss)
      window.removeEventListener('focus', handleFocusGain)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // ─── Screen recording detection ─────────────────────────────
  // Nếu user start screen recording qua browser API → audit log
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices as MediaDevices | undefined
    if (!mediaDevices?.getDisplayMedia) return
    const original = mediaDevices.getDisplayMedia.bind(mediaDevices)
    // Wrap getDisplayMedia để phát hiện screen recording attempts
    ;(mediaDevices as { getDisplayMedia: typeof original }).getDisplayMedia = async (
      ...args: Parameters<typeof original>
    ) => {
      trigger('Phát hiện screen recording (getDisplayMedia)')
      return original(...args)
    }
  }, [trigger])

  // ─── Keyboard shortcuts (Windows/Linux + a few Mac that still bubble) ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const { key, code, shiftKey, metaKey, ctrlKey, altKey } = e
      const upperKey = (key || '').toUpperCase()

      // PrintScreen
      if (code === 'PrintScreen' || key === 'PrintScreen') {
        e.preventDefault(); e.stopPropagation()
        trigger('Phím PrintScreen bị chặn'); return
      }
      // Win+Shift+S
      if (shiftKey && upperKey === 'S') {
        const isOS = e.getModifierState?.('OS') || e.getModifierState?.('Meta')
        if (isOS) {
          e.preventDefault(); e.stopPropagation()
          trigger('Snipping Tool bị chặn'); return
        }
      }
      // Win+G Game Bar
      if (e.getModifierState?.('OS') && upperKey === 'G') {
        e.preventDefault(); e.stopPropagation()
        trigger('Game Bar bị chặn'); return
      }
      // macOS Cmd+Shift+3/4/5/6 — SE thấy keystroke trong 1 vài trường hợp
      // (nếu OS đã configure tắt shortcut hoặc browser được focus đặc biệt)
      if (metaKey && shiftKey && ['3','4','5','6'].includes(key)) {
        e.preventDefault(); e.stopPropagation()
        trigger('Phím chụp macOS bị chặn (cảnh báo: macOS thường bắt trước browser)')
        return
      }
      // macOS Cmd+Ctrl+Shift+3/4
      if (metaKey && ctrlKey && shiftKey && ['3','4'].includes(key)) {
        e.preventDefault(); e.stopPropagation()
        trigger('Chụp vào clipboard bị chặn'); return
      }
      // F12 / Ctrl+Shift+I / Cmd+Opt+I DevTools
      if (key === 'F12') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn'); return
      }
      if (ctrlKey && shiftKey && upperKey === 'I') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn'); return
      }
      if (metaKey && altKey && upperKey === 'I') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn'); return
      }
      // Ctrl/Cmd + S Save page
      if ((ctrlKey || metaKey) && !shiftKey && !altKey && upperKey === 'S') {
        e.preventDefault(); e.stopPropagation()
        trigger('Lưu trang bị chặn'); return
      }
      // Ctrl/Cmd + P Print
      if ((ctrlKey || metaKey) && !shiftKey && !altKey && upperKey === 'P') {
        e.preventDefault(); e.stopPropagation()
        trigger('In trang bị chặn'); return
      }
      // Ctrl+U / Cmd+Opt+U View source
      if ((ctrlKey && upperKey === 'U' && !metaKey) ||
          (metaKey && altKey && upperKey === 'U')) {
        e.preventDefault(); e.stopPropagation()
        trigger('Xem source bị chặn'); return
      }
    }
    window.addEventListener('keydown', handleKey, { capture: true })
    return () => window.removeEventListener('keydown', handleKey, { capture: true })
  }, [trigger])

  // ─── Right-click + drag ────────────────────────────────────
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
    }
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      if (t.tagName === 'IMG' || t.tagName === 'VIDEO') e.preventDefault()
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [])

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    if (blurTimerRef.current)  clearTimeout(blurTimerRef.current)
  }, [])

  return { toastMsg, blurActive, blurAmount: BLUR_AMOUNT_PX, blurDuration: BLUR_DURATION_MS }
}
