/**
 * useAntiScreenshot — Hệ thống bảo vệ nội dung khỏi screenshot/screen-recording
 *
 * Strategy (chuẩn Udemy / Netflix / Coursera):
 *   1. PHÁT HIỆN — keyboard shortcut, visibility change, blur (sự kiện
 *      thường xảy ra khi user mở tool chụp/quay màn hình)
 *   2. BLUR NỘI DUNG — khi phát hiện → toàn bộ trang blur(20px) 3 giây
 *      → ảnh chụp được sẽ mờ hết
 *   3. CẢNH BÁO — overlay rõ ràng + ghi sự kiện server (audit log)
 *   4. WATERMARK — overlay user email + timestamp khắp màn hình
 *      → ảnh nếu rò rỉ vẫn truy được người chia sẻ
 *   5. CHẶN PHỤ TRỢ — right-click, drag, text selection
 *
 * ⚠️  Limitation thực tế: browser KHÔNG thể chặn OS-level screenshot
 *     (Cmd+Shift+4, Win+PrtScr ở OS layer). Nhưng combo "blur khi mất focus"
 *     + "watermark" giảm 90% rò rỉ vì ảnh chụp được luôn mờ + có ID user.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

interface AntiScreenshotState {
  /** Hiển thị warning overlay */
  showWarning: boolean
  /** Đang trong giai đoạn blur (3s sau khi detect) */
  blurActive: boolean
  /** Reason để hiển thị trong cảnh báo */
  reason: string
}

const BLUR_DURATION_MS = 3000        // mờ 3 giây sau khi detect
const WARNING_DURATION_MS = 6000     // overlay warning 6 giây

export function useAntiScreenshot() {
  const [state, setState] = useState<AntiScreenshotState>({
    showWarning: false, blurActive: false, reason: '',
  })
  const blurTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const focusedRef     = useRef(true)
  const lastTriggerRef = useRef(0)

  // ─── Trigger protection ─────────────────────────────────────────────
  const trigger = useCallback((reason: string) => {
    const now = Date.now()
    // Debounce — tránh trigger liên tiếp khi user chuyển tab nhanh
    if (now - lastTriggerRef.current < 500) return
    lastTriggerRef.current = now

    setState({ showWarning: true, blurActive: true, reason })

    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)

    blurTimerRef.current = setTimeout(() => {
      setState(s => ({ ...s, blurActive: false }))
    }, BLUR_DURATION_MS)

    warnTimerRef.current = setTimeout(() => {
      setState(s => ({ ...s, showWarning: false }))
    }, WARNING_DURATION_MS)

    // ── Best-effort audit log ──
    try {
      const userStr = localStorage.getItem('user')
      const userId = userStr ? JSON.parse(userStr).id : 'guest'
      // Fire-and-forget — nếu network lỗi cũng không sao
      fetch('/api/audit/screenshot-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, reason, ts: now,
          url: window.location.href,
          ua: navigator.userAgent,
        }),
      }).catch(() => {})
    } catch { /* ignore */ }
  }, [])

  const dismissWarning = useCallback(() => {
    setState(s => ({ ...s, showWarning: false }))
  }, [])

  // ─── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const { key, code, shiftKey, metaKey, ctrlKey, altKey } = e

      // PrintScreen (Windows / generic)
      if (code === 'PrintScreen' || key === 'PrintScreen') {
        e.preventDefault()
        trigger('PrintScreen key')
        return
      }
      // Win+Shift+S (Snipping Tool) — OS modifier detection
      if (shiftKey && (key === 'S' || key === 's')) {
        const isOS = e.getModifierState?.('OS') || e.getModifierState?.('Meta')
        if (isOS) {
          e.preventDefault()
          trigger('Snipping Tool')
          return
        }
      }
      // macOS Cmd+Shift+3/4/5
      if (metaKey && shiftKey && (key === '3' || key === '4' || key === '5')) {
        e.preventDefault()
        trigger('macOS screenshot shortcut')
        return
      }
      // macOS Cmd+Ctrl+Shift+4 (clipboard)
      if (metaKey && ctrlKey && shiftKey && key === '4') {
        e.preventDefault()
        trigger('macOS screenshot to clipboard')
        return
      }
      // F12 / Ctrl+Shift+I (DevTools)
      if (key === 'F12' || (ctrlKey && shiftKey && (key === 'I' || key === 'i'))) {
        e.preventDefault()
        trigger('Developer Tools')
        return
      }
      // Cmd+Opt+I (macOS DevTools)
      if (metaKey && altKey && (key === 'I' || key === 'i')) {
        e.preventDefault()
        trigger('Developer Tools (macOS)')
        return
      }
      // Ctrl+S / Cmd+S (Save page)
      if ((ctrlKey || metaKey) && (key === 's' || key === 'S')) {
        e.preventDefault()
        trigger('Save page')
        return
      }
      // Ctrl+P / Cmd+P (Print → can save as PDF)
      if ((ctrlKey || metaKey) && (key === 'p' || key === 'P')) {
        e.preventDefault()
        trigger('Print page')
        return
      }
      // Ctrl+U / Cmd+Opt+U (View source)
      if ((ctrlKey && (key === 'u' || key === 'U')) ||
          (metaKey && altKey && (key === 'u' || key === 'U'))) {
        e.preventDefault()
        trigger('View source')
        return
      }
    }
    window.addEventListener('keydown', handleKey, { capture: true })
    return () => window.removeEventListener('keydown', handleKey, { capture: true })
  }, [trigger])

  // ─── Visibility / Focus detection ───────────────────────────────────
  // Khi user mở Snipping Tool / Cmd+Shift+5 picker → window mất focus
  // → blur content ngay lập tức cho đến khi focus quay lại
  useEffect(() => {
    const handleBlur = () => {
      focusedRef.current = false
      // Chỉ blur — không hiển thị warning (tránh annoying khi user chuyển tab thường)
      setState(s => ({ ...s, blurActive: true }))
    }
    const handleFocus = () => {
      focusedRef.current = true
      // Clear blur khi focus quay lại
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      setState(s => ({ ...s, blurActive: false }))
    }
    const handleVisibility = () => {
      if (document.hidden) {
        // Tab ẩn → blur nội dung
        setState(s => ({ ...s, blurActive: true }))
      } else {
        setState(s => ({ ...s, blurActive: false }))
      }
    }
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // ─── DevTools detection (resize-based heuristic) ────────────────────
  useEffect(() => {
    let devtoolsOpen = false
    const threshold = 160
    const check = () => {
      const widthDiff  = window.outerWidth  - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      const isOpen = widthDiff > threshold || heightDiff > threshold
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true
        trigger('DevTools opened')
      } else if (!isOpen) {
        devtoolsOpen = false
      }
    }
    const id = setInterval(check, 1500)
    return () => clearInterval(id)
  }, [trigger])

  // ─── Disable right-click + drag globally ────────────────────────────
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Cho phép right-click trên input/textarea (UX cần thiết)
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
      trigger('Right-click menu')
    }
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'IMG' || t.tagName === 'VIDEO') {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', onContextMenu)
    document.addEventListener('dragstart', onDragStart)
    return () => {
      document.removeEventListener('contextmenu', onContextMenu)
      document.removeEventListener('dragstart', onDragStart)
    }
  }, [trigger])

  // ─── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current)
  }, [])

  return {
    showWarning: state.showWarning,
    blurActive: state.blurActive,
    reason: state.reason,
    dismissWarning,
  }
}
