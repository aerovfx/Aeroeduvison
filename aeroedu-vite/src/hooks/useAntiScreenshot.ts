/**
 * useAntiScreenshot v5 (2026-05-21) — Proactive modifier-key blur
 *
 * ROOT CAUSE v4 không hoạt động: macOS Cmd+Shift+4 KHÔNG fire blur event
 * vì picker overlay crosshair, browser vẫn giữ focus đúng nghĩa OS-level.
 * User chụp được ảnh rõ nét dù v4 đã có focus-loss listener.
 *
 * STRATEGY v5 — KEY MODIFIER DETECTION:
 *   1. ⚡ PROACTIVE BLUR — listen keydown cho metaKey/ctrlKey + shiftKey
 *      → blur(40px) NGAY khi user vừa NHẤN Cmd+Shift (chưa nhả + chưa
 *      nhấn số 3/4/5). Khi nhấn số → screenshot tool activate → màn hình
 *      đã blur sẵn ≥50ms trước → ảnh capture được là MÀN HÌNH MỜ.
 *   2. ⌨️ KEYUP CLEAR — khi user nhả Cmd HOẶC Shift → clear blur 300ms
 *      → UI quay lại bình thường.
 *   3. 👆 POINTER LEAVE — cursor di chuyển ra ngoài viewport (lên menu bar
 *      macOS hoặc app khác) → blur 600ms (auto-clear).
 *   4. 🪟 FOCUS LOSS — vẫn giữ cho Windows Snipping Tool + switch tab.
 *   5. 🏷 PROMINENT WATERMARK + 4 CORNER BADGES — vẫn giữ từ v4.
 *   6. 📹 SCREEN RECORDING DETECTION via getDisplayMedia.
 *
 * Trade-off: Cmd+Shift+Z (redo), Cmd+Shift+T (reopen tab), Cmd+Shift+]
 * (next tab) sẽ blur 800ms. Tolerable vì shortcuts này hiếm dùng trên
 * trang admin, và blur tự tan nhanh.
 *
 * GIỚI HẠN browser KHÔNG thể vượt qua:
 * - iPhone screenshot (volume + power)
 * - Camera ngoài chụp màn hình vật lý
 * - macOS Cmd+Shift+5 với screen recording — picker bám chặt
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

  // ─── v5: PROACTIVE BLUR ON MODIFIER KEY ──────────────────────
  // INSIGHT mới: macOS Cmd+Shift+4 KHÔNG fire window.blur event vì picker
  // chỉ overlay crosshair, không thực sự switch app.
  // → Phải detect Cmd+Shift COMBO ngay khi user vừa NHẤN (chưa nhả).
  //   Sau đó nếu user nhấn 3/4/5/6 → screenshot tool activate → màn hình
  //   ĐÃ BLUR sẵn ≥ 50ms TRƯỚC khi picker capture.
  //
  // False positive: Cmd+Shift+Z (redo), Cmd+Shift+T (reopen tab),
  // Cmd+Shift+] (next tab), v.v. → blur 800ms rồi tự tan.
  // Trade-off: hơi flash khi dùng shortcut hợp lệ, nhưng đảm bảo screenshot
  // luôn capture được màn hình mờ.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Modifier key kết hợp + Shift → CÓ THỂ sắp nhấn screenshot key
      // metaKey = Cmd (Mac) / Win key (Windows)
      // ctrlKey = Ctrl (Windows/Linux)
      const hasDangerousMod = (e.metaKey || e.ctrlKey) && e.shiftKey
      if (hasDangerousMod) {
        setBlurActive(true)
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
        // Auto-clear sau 800ms nếu user không nhả Cmd/Shift
        blurTimerRef.current = setTimeout(() => setBlurActive(false), 800)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      // Khi user nhả Cmd HOẶC Shift → no longer dangerous → clear blur
      // sau 300ms (đủ thời gian cho screenshot tool đã tắt)
      const stillDangerous = (e.metaKey || e.ctrlKey) && e.shiftKey
      if (!stillDangerous) {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
        blurTimerRef.current = setTimeout(() => setBlurActive(false), 300)
      }
    }
    // Backup: window blur cũng trigger (cho switch tab + Snipping Tool Win)
    const handleFocusLoss = () => {
      setBlurActive(true)
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
    const handleFocusGain = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      blurTimerRef.current = setTimeout(() => setBlurActive(false), 300)
    }
    const handleVisibility = () => {
      if (document.hidden) handleFocusLoss()
      else handleFocusGain()
    }
    // POINTER LEAVE: khi cursor rời browser viewport (di chuyển sang menu bar
    // macOS hoặc app khác) → có thể chuẩn bị screenshot
    const handlePointerLeave = (e: PointerEvent) => {
      // Chỉ trigger nếu cursor thực sự ra ngoài viewport
      if (e.clientY <= 0 || e.clientX <= 0 ||
          e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setBlurActive(true)
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
        blurTimerRef.current = setTimeout(() => setBlurActive(false), 600)
      }
    }
    const handlePointerEnter = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
      blurTimerRef.current = setTimeout(() => setBlurActive(false), 150)
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    window.addEventListener('keyup', handleKeyUp, { capture: true })
    window.addEventListener('blur', handleFocusLoss)
    window.addEventListener('focus', handleFocusGain)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('pointerenter', handlePointerEnter)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true })
      window.removeEventListener('keyup', handleKeyUp, { capture: true })
      window.removeEventListener('blur', handleFocusLoss)
      window.removeEventListener('focus', handleFocusGain)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('pointerenter', handlePointerEnter)
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
