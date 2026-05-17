/**
 * ScrollToTopButton — Floating button hiện khi scroll > threshold px.
 * Click → smooth scroll to top.
 *
 * Hỗ trợ 2 mode:
 *   - Window scroll (default): listen window.scrollY, dùng cho standalone pages
 *   - Container scroll: tự detect parent có overflow-y-auto (vd DashboardLayout
 *     có <main overflow-y-auto>), listen container scrollTop
 *
 * Tự nhận diện container bằng querySelector('main[class*="overflow"]') nếu
 * không có scroll window. Fallback graceful nếu không tìm thấy.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'

interface Props {
  threshold?: number
  position?: 'bottom-right' | 'bottom-left'
  bottomOffset?: number
  /** CSS selector của container có scroll (default: auto-detect main hoặc window) */
  containerSelector?: string
}

export default function ScrollToTopButton({
  threshold = 400,
  position = 'bottom-right',
  bottomOffset = 16,
  containerSelector,
}: Props) {
  const [visible, setVisible] = useState(false)
  const scrollerRef = useRef<HTMLElement | Window | null>(null)

  useEffect(() => {
    // Resolve scroll container
    let scroller: HTMLElement | Window
    if (containerSelector) {
      const el = document.querySelector<HTMLElement>(containerSelector)
      scroller = el || window
    } else {
      // Auto-detect: ưu tiên <main> với overflow-y, fallback window
      const mainEl = document.querySelector<HTMLElement>('main')
      if (mainEl && getComputedStyle(mainEl).overflowY === 'auto') {
        scroller = mainEl
      } else {
        scroller = window
      }
    }
    scrollerRef.current = scroller

    const getScrollY = () =>
      scroller === window
        ? window.scrollY
        : (scroller as HTMLElement).scrollTop

    const onScroll = () => {
      setVisible(getScrollY() > threshold)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [threshold, containerSelector])

  const handleClick = () => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (scroller === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      (scroller as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (!visible) return null

  const posClass = position === 'bottom-right' ? 'right-4 md:right-6' : 'left-4 md:left-6'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      className={`fixed z-30 ${posClass}
                  w-11 h-11 rounded-full
                  bg-cyan-500/90 hover:bg-cyan-500 active:bg-cyan-600
                  text-white shadow-lg shadow-cyan-500/30
                  border-2 border-cyan-300/40
                  flex items-center justify-center
                  transition-all duration-200
                  active:scale-95`}
      style={{
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0))`,
      }}
    >
      <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
    </button>
  )
}
