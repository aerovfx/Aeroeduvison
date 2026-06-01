/**
 * arCapabilities — phát hiện khả năng AR của thiết bị.
 *
 * Quyết định đường AR:
 *  - Android/Chrome/Quest có WebXR `immersive-ar` → model-viewer ar-mode "webxr"/"scene-viewer"
 *  - iOS Safari (kể cả app Capacitor) → Quick Look qua "quick-look" (cần file .usdz)
 *  - Desktop → không AR, hiển thị QR để mở trên điện thoại
 */

export interface ARCaps {
  /** Có `navigator.xr` (WebXR khả dụng) */
  webxrAR: boolean
  isIOS: boolean
  isMobile: boolean
  isDesktop: boolean
}

export function detectARSync(): ARCaps {
  if (typeof navigator === 'undefined') {
    return { webxrAR: false, isIOS: false, isMobile: false, isDesktop: true }
  }
  const ua = navigator.userAgent || ''
  const maxTouch = (navigator as any).maxTouchPoints || 0
  // iPadOS 13+ giả lập "MacIntel" nhưng có cảm ứng
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && maxTouch > 1)
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || maxTouch > 0
  return {
    webxrAR: !!(navigator as any).xr,
    isIOS,
    isMobile,
    isDesktop: !isMobile,
  }
}

/** Kiểm tra sâu hơn: thực sự hỗ trợ session immersive-ar hay không. */
export async function detectAR(): Promise<ARCaps> {
  const base = detectARSync()
  let webxrAR = false
  const xr = (navigator as any).xr
  if (xr?.isSessionSupported) {
    try {
      webxrAR = await xr.isSessionSupported('immersive-ar')
    } catch {
      webxrAR = false
    }
  }
  return { ...base, webxrAR }
}
