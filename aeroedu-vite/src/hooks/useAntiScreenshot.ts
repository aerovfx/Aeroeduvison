/**
 * useAntiScreenshot — phát hiện screenshot key combos và hiển thị cảnh báo
 * Như Udemy: block các phím tắt screenshot phổ biến + cảnh báo
 *
 * Keys detected:
 * - PrintScreen (Windows)
 * - Win+Shift+S (Snipping Tool)
 * - Cmd+Shift+4 / Cmd+Shift+5 / Cmd+Shift+3 (macOS)
 * - Cmd+Ctrl+Shift+4 (macOS)
 *
 * Returns: { showWarning, dismissWarning }
 * Usage: Add <AntiScreenshotWarning /> to DashboardLayout
 */
import { useState, useEffect, useCallback } from 'react'

export function useAntiScreenshot() {
  const [showWarning, setShowWarning] = useState(false)

  const trigger = useCallback(() => {
    setShowWarning(true)
  }, [])

  const dismissWarning = useCallback(() => {
    setShowWarning(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key, code, shiftKey, metaKey, ctrlKey } = e

      // PrintScreen (Windows)
      if (code === 'PrintScreen' || key === 'PrintScreen') {
        e.preventDefault()
        trigger()
        return
      }

      // Win+Shift+S — Windows Snipping Tool
      if (shiftKey && key === 'S' && (e.getModifierState?.('OS') || ctrlKey)) {
        // ctrlKey is used as a proxy for Win key detection in some environments
        trigger()
        return
      }

      // macOS: Cmd+Shift+3 / Cmd+Shift+4 / Cmd+Shift+5
      if (metaKey && shiftKey && (key === '3' || key === '4' || key === '5')) {
        e.preventDefault()
        trigger()
        return
      }

      // macOS: Cmd+Ctrl+Shift+4
      if (metaKey && ctrlKey && shiftKey && key === '4') {
        e.preventDefault()
        trigger()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [trigger])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (!showWarning) return
    const t = setTimeout(() => setShowWarning(false), 5000)
    return () => clearTimeout(t)
  }, [showWarning])

  return { showWarning, dismissWarning }
}
