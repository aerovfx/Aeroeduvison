/**
 * useAntiScreenshot — Chặn phím tắt screenshot/recording, KHÔNG làm phiền UX
 *
 * Phiên bản 3 (2026-05-20) — đáp ứng feedback user:
 *   "dừng việc thông báo bản quyền và thoát màn hình khi người dùng refresh trang"
 *
 * Thay đổi so với v2:
 *   ❌ XOÁ window blur/focus listener — vì refresh / switch tab thường cũng
 *      trigger → blur toàn màn hình rất phiền
 *   ❌ XOÁ visibilitychange listener — cùng lý do
 *   ❌ XOÁ DevTools heuristic — false positive khi user resize cửa sổ
 *   ❌ XOÁ modal warning chiếm toàn màn hình — thay bằng toast nhẹ
 *   ✅ GIỮ chặn phím tắt screenshot Windows/Mac (preventDefault capture phase)
 *   ✅ GIỮ chặn right-click + drag image/video
 *   ✅ GIỮ watermark grid (passive, không ảnh hưởng UI)
 *   ✅ GIỮ audit log fire-and-forget cho admin xem
 *
 * Phím chặn:
 *   Windows:  PrintScreen, Win+Shift+S, Win+G (Game Bar), Ctrl+S, Ctrl+P, F12
 *   macOS:    Cmd+Shift+3/4/5/6, Cmd+Ctrl+Shift+3/4, Cmd+S, Cmd+P,
 *             Cmd+Opt+I (DevTools), Cmd+Opt+U (View Source)
 *   Cross:    Ctrl+Shift+I (DevTools), Ctrl+U (View Source)
 *
 * ⚠️  Limitation: browser KHÔNG thể chặn OS-level screenshot 100%. Phím tắt
 *     được preventDefault ở capture phase, nhưng nếu OS bắt phím trước
 *     browser (rất hiếm với các phím trên), vẫn có thể chụp được.
 *     Watermark + audit log là layer phòng thủ thứ 2.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const TOAST_DURATION_MS = 2500  // toast hiển thị 2.5 giây

export function useAntiScreenshot() {
  // Thông báo dạng toast — ngắn gọn, không cản trở user
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTriggerRef = useRef(0)

  // ─── Hiển thị toast cảnh báo ───────────────────────────────────────
  const trigger = useCallback((reason: string) => {
    const now = Date.now()
    // Debounce 1 giây — tránh spam khi user nhấn liên tiếp
    if (now - lastTriggerRef.current < 1000) return
    lastTriggerRef.current = now

    setToastMsg(`⛔ ${reason} — nội dung được bảo vệ bản quyền`)

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(null), TOAST_DURATION_MS)

    // ── Best-effort audit log (silent, không block UI) ──
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
      }).catch(() => { /* network lỗi cũng không sao */ })
    } catch { /* ignore */ }
  }, [])

  const dismissWarning = useCallback(() => setToastMsg(null), [])

  // ─── CHẶN PHÍM TẮT ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const { key, code, shiftKey, metaKey, ctrlKey, altKey } = e
      const upperKey = (key || '').toUpperCase()

      // ── PrintScreen (Windows / generic) ──
      if (code === 'PrintScreen' || key === 'PrintScreen') {
        e.preventDefault(); e.stopPropagation()
        trigger('Phím PrintScreen bị chặn')
        return
      }

      // ── Win+Shift+S (Snipping Tool) ──
      // OS modifier ≈ Windows logo key. Một số trình duyệt dùng Meta.
      if (shiftKey && upperKey === 'S') {
        const isOS = e.getModifierState?.('OS') || e.getModifierState?.('Meta')
        if (isOS) {
          e.preventDefault(); e.stopPropagation()
          trigger('Snipping Tool bị chặn')
          return
        }
      }

      // ── Win+G (Xbox Game Bar — quay video Windows 10/11) ──
      if (e.getModifierState?.('OS') && upperKey === 'G') {
        e.preventDefault(); e.stopPropagation()
        trigger('Game Bar bị chặn')
        return
      }

      // ── macOS Cmd+Shift+3/4/5/6 (screenshot/recording) ──
      if (metaKey && shiftKey && ['3','4','5','6'].includes(key)) {
        e.preventDefault(); e.stopPropagation()
        trigger('Phím chụp macOS bị chặn')
        return
      }

      // ── macOS Cmd+Ctrl+Shift+3/4 (chụp vào clipboard) ──
      if (metaKey && ctrlKey && shiftKey && ['3','4'].includes(key)) {
        e.preventDefault(); e.stopPropagation()
        trigger('Chụp vào clipboard bị chặn')
        return
      }

      // ── F12 / Ctrl+Shift+I / Cmd+Opt+I (DevTools) ──
      if (key === 'F12') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn')
        return
      }
      if (ctrlKey && shiftKey && upperKey === 'I') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn')
        return
      }
      if (metaKey && altKey && upperKey === 'I') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools bị chặn')
        return
      }

      // ── Ctrl+S / Cmd+S (Lưu trang) ──
      if ((ctrlKey || metaKey) && !shiftKey && !altKey && upperKey === 'S') {
        e.preventDefault(); e.stopPropagation()
        trigger('Lưu trang bị chặn')
        return
      }

      // ── Ctrl+P / Cmd+P (In trang — có thể save PDF) ──
      if ((ctrlKey || metaKey) && !shiftKey && !altKey && upperKey === 'P') {
        e.preventDefault(); e.stopPropagation()
        trigger('In trang bị chặn')
        return
      }

      // ── Ctrl+U / Cmd+Opt+U (Xem source) ──
      if ((ctrlKey && upperKey === 'U' && !metaKey) ||
          (metaKey && altKey && upperKey === 'U')) {
        e.preventDefault(); e.stopPropagation()
        trigger('Xem source bị chặn')
        return
      }

      // ── Ctrl+Shift+P (Command palette DevTools) ──
      if (ctrlKey && shiftKey && upperKey === 'P') {
        e.preventDefault(); e.stopPropagation()
        trigger('DevTools command bị chặn')
        return
      }

      // ── Ctrl+Shift+C (Inspect element) ──
      if (ctrlKey && shiftKey && upperKey === 'C') {
        e.preventDefault(); e.stopPropagation()
        trigger('Inspect bị chặn')
        return
      }
    }

    // Capture phase — chặn TRƯỚC mọi handler khác trên trang
    window.addEventListener('keydown', handleKey, { capture: true })
    return () => window.removeEventListener('keydown', handleKey, { capture: true })
  }, [trigger])

  // ─── CHẶN right-click + drag image/video ──────────────────────────
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
      // Cho phép right-click trên input/textarea/contenteditable
      // (UX cần thiết — paste, copy, select all)
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return
      e.preventDefault()
      // KHÔNG trigger toast cho right-click — phổ biến và không nguy hiểm bằng key
    }
    const onDragStart = (e: DragEvent) => {
      const t = e.target as HTMLElement | null
      if (!t) return
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
  }, [])

  // ─── Cleanup ────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  return {
    /** Thông báo toast (null khi không có) */
    toastMsg,
    dismissWarning,
    // Legacy compat — luôn false để các nơi check không phải sửa
    showWarning: false,
    blurActive: false,
    reason: '',
  }
}
