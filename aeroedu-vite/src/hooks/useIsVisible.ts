/**
 * useIsVisible — Track whether a DOM element is in viewport via IntersectionObserver.
 *
 * Use cases:
 *   - Pause canvas render loops when canvas scrolled off-screen (battery saver mobile)
 *   - Lazy-init expensive components
 *
 * @param ref Element to observe
 * @param options IntersectionObserver options (threshold, rootMargin)
 * @returns boolean — true if any part of element visible in viewport
 */
import { useEffect, useState, type RefObject } from 'react'

export function useIsVisible(
  ref: RefObject<Element | null>,
  options: IntersectionObserverInit = { threshold: 0.01 },
): boolean {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: always visible (SSR or ancient browsers)
      setIsVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting)
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, options.threshold, options.rootMargin, options.root])

  return isVisible
}
