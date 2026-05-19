/**
 * HelpTooltip — Inline ? icon với popup hướng dẫn ngắn.
 *
 * UX:
 *   - Desktop: hover để mở, leave để đóng
 *   - Mobile (touch): tap để mở, tap outside để đóng
 *   - Auto-position theo viewport (không tràn màn hình)
 *   - Keyboard a11y: Tab + Enter để mở, Esc để đóng
 *
 * 2 cách dùng:
 *
 *   1. Standalone (chỉ icon ?):
 *      <HelpTooltip moduleKey="taodethi" tipKey="upload-pdf" />
 *
 *   2. Wrap content (icon ? sau element):
 *      <HelpTooltip moduleKey="taodethi" tipKey="upload-pdf">
 *        <label>Upload PDF</label>
 *      </HelpTooltip>
 *
 *   3. Custom text (không cần content data):
 *      <HelpTooltip text="Giải thích ngắn ở đây" />
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import { getTooltip } from '@/lib/teacher-help-content'

interface HelpTooltipProps {
  moduleKey?: string
  tipKey?: string
  text?: string  // Override để truyền text trực tiếp
  children?: React.ReactNode
  iconSize?: number
  className?: string
  /** Position preferences — auto-flip nếu tràn viewport */
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function HelpTooltip({
  moduleKey,
  tipKey,
  text,
  children,
  iconSize = 14,
  className = '',
  side = 'top',
}: HelpTooltipProps) {
  const tipText = text || (moduleKey && tipKey ? getTooltip(moduleKey, tipKey) : null)
  if (!tipText) return children ? <>{children}</> : null

  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; placement: typeof side }>({
    top: 0, left: 0, placement: side,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Detect touch device
  const isTouch = typeof window !== 'undefined'
    && (('ontouchstart' in window) || navigator.maxTouchPoints > 0)

  // Position calculation — chạy mỗi khi open hoặc resize
  const updatePos = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return
    const tRect = triggerRef.current.getBoundingClientRect()
    const ttRect = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const gap = 8

    let placement: typeof side = side
    let top = 0, left = 0

    // Try preferred side
    const tryPos = (p: typeof side) => {
      switch (p) {
        case 'top':    return { top: tRect.top - ttRect.height - gap,  left: tRect.left + tRect.width/2 - ttRect.width/2 }
        case 'bottom': return { top: tRect.bottom + gap,                left: tRect.left + tRect.width/2 - ttRect.width/2 }
        case 'left':   return { top: tRect.top + tRect.height/2 - ttRect.height/2, left: tRect.left - ttRect.width - gap }
        case 'right':  return { top: tRect.top + tRect.height/2 - ttRect.height/2, left: tRect.right + gap }
      }
    }
    const fits = (p: { top: number; left: number }) =>
      p.top >= 4 && p.left >= 4
      && p.top + ttRect.height <= vh - 4
      && p.left + ttRect.width <= vw - 4

    const preferred = tryPos(side)
    if (fits(preferred)) {
      ({ top, left } = preferred)
    } else {
      // Flip: try opposite side
      const oppMap = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
      const flipped = tryPos(oppMap[side])
      if (fits(flipped)) {
        placement = oppMap[side]
        ;({ top, left } = flipped)
      } else {
        // Fallback: bottom center clamped
        placement = 'bottom'
        top = Math.min(tRect.bottom + gap, vh - ttRect.height - 4)
        left = Math.max(4, Math.min(vw - ttRect.width - 4, tRect.left + tRect.width/2 - ttRect.width/2))
      }
    }
    setPos({ top, left, placement })
  }, [side])

  useEffect(() => {
    if (!open) return
    // RAF để đợi tooltip render xong, lấy đúng size
    const raf = requestAnimationFrame(updatePos)
    window.addEventListener('resize', updatePos)
    window.addEventListener('scroll', updatePos, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updatePos)
      window.removeEventListener('scroll', updatePos, true)
    }
  }, [open, updatePos])

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      if (tooltipRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerHandlers = isTouch
    ? { onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) } }
    : {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus:      () => setOpen(true),
        onBlur:       () => setOpen(false),
        onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) },
      }

  return (
    <>
      <span className={`inline-flex items-center gap-1 ${className}`}>
        {children}
        <button
          ref={triggerRef}
          type="button"
          aria-label="Hướng dẫn"
          aria-expanded={open}
          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-full"
          style={{ minWidth: 20, minHeight: 20 }}
          {...triggerHandlers}
        >
          <HelpCircle size={iconSize} strokeWidth={2.25} />
        </button>
      </span>

      {open && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-[9999] max-w-xs rounded-lg bg-popover text-popover-foreground shadow-lg border px-3 py-2 text-sm leading-relaxed pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
          style={{ top: pos.top, left: pos.left }}
        >
          {tipText}
          {/* Arrow indicator */}
          <span
            aria-hidden
            className="absolute w-2 h-2 bg-popover border-l border-t border-border rotate-45"
            style={
              pos.placement === 'top'    ? { bottom: -5, left: '50%', marginLeft: -4, transform: 'rotate(225deg)' } :
              pos.placement === 'bottom' ? { top: -5,    left: '50%', marginLeft: -4 } :
              pos.placement === 'left'   ? { right: -5,  top: '50%', marginTop: -4, transform: 'rotate(135deg)' } :
                                          { left: -5,    top: '50%', marginTop: -4, transform: 'rotate(-45deg)' }
            }
          />
        </div>,
        document.body
      )}
    </>
  )
}

export default HelpTooltip
