/**
 * PWA / Service Worker registration — manual (vite-plugin-pwa injectRegister: false).
 *
 * Behavior:
 *   - Chỉ register ở production (dev mode SW gây cache headache, đã tắt qua plugin)
 *   - Trên Capacitor native, KHÔNG register SW (WKWebView handle navigation riêng,
 *     SW có thể conflict với deeplink + native plugins)
 *   - Khi có update available → emit CustomEvent('pwa:update-available') để UI
 *     hiển thị banner "Có bản mới — bấm để cập nhật" (sẽ implement ở Phase tiếp)
 *   - Khi user accept → skipWaiting() + reload
 */

let updateAvailable = false

export interface PwaRegistrationResult {
  /** SW đã register thành công */
  registered: boolean
  /** Lý do skip (nếu skip) */
  skipReason?: string
  /** Function gọi để accept update + reload */
  applyUpdate?: () => Promise<void>
}

export async function registerPwa(): Promise<PwaRegistrationResult> {
  // Skip dev mode
  if (import.meta.env.DEV) {
    return { registered: false, skipReason: 'dev mode' }
  }
  // Skip Capacitor native — WKWebView không cần SW (assets serve từ bundle local)
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    return { registered: false, skipReason: 'capacitor native' }
  }
  // Skip nếu browser không support
  if (!('serviceWorker' in navigator)) {
    return { registered: false, skipReason: 'no service worker support' }
  }

  try {
    // Dynamic import — workbox-window là extra ~12KB chỉ load khi cần
    const { Workbox } = await import('workbox-window')
    const wb = new Workbox('/sw.js', { scope: '/' })

    // TỰ ĐỘNG cập nhật: khi có bản mới (SW vào "waiting") → skipWaiting NGAY thay
    // vì chờ banner (banner chưa implement) → tránh kẹt bản cũ trong cache PWA.
    wb.addEventListener('waiting', () => {
      updateAvailable = true
      window.dispatchEvent(new CustomEvent('pwa:update-available'))
      console.info('[pwa] New version → tự skipWaiting (auto-update)')
      wb.messageSkipWaiting()
    })

    // SW mới kiểm soát trang → reload nạp bản mới. Chỉ xảy ra khi UPDATE (không
    // ở lần cài đầu) nên không gây reload thừa; guard tránh reload lặp.
    let reloaded = false
    wb.addEventListener('controlling', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })

    await wb.register()
    console.info('[pwa] Service worker registered')

    const applyUpdate = async () => {
      if (!updateAvailable) return
      wb.messageSkipWaiting()
    }
    return { registered: true, applyUpdate }
  } catch (err) {
    console.warn('[pwa] register fail:', err)
    return { registered: false, skipReason: String(err) }
  }
}
