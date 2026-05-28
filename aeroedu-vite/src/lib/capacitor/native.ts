/**
 * Capacitor native bridge — khởi tạo khi app chạy trong WKWebView (iOS) /
 * WebView (Android). No-op hoàn toàn trên web browser thường.
 *
 * Chức năng (Phase 2 — native polish):
 *   1. Hide splash screen sau khi React mount (tránh màn trắng nhấp nháy)
 *   2. Set status bar style theo theme (dark/light)
 *   3. Deep-link handler: app mở qua URL (universal link / custom scheme)
 *      → điều hướng tới đúng route (/join/:token, /a/:token, ...)
 *   4. Hardware back button (Android) → history.back hoặc exit
 *   5. App lifecycle: pause/resume → emit event cho posture monitor, etc.
 *   6. Keyboard: resize body khi bàn phím hiện (tránh che input)
 *
 * Tất cả dynamic import — KHÔNG tăng bundle web (chỉ load khi isNativePlatform).
 */

type NavigateFn = (path: string) => void

let initialized = false

/** Detect Capacitor native (iOS/Android shell) */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return !!cap?.isNativePlatform?.()
}

/** Get platform: 'ios' | 'android' | 'web' */
export function getPlatform(): string {
  if (typeof window === 'undefined') return 'web'
  const cap = (window as Window & { Capacitor?: { getPlatform?: () => string } }).Capacitor
  return cap?.getPlatform?.() ?? 'web'
}

/**
 * Chuyển deep-link URL → in-app route path.
 * VD: https://inphysic.com/join/ABC → /join/ABC
 *     com.aeroedu.inphysic://join/ABC → /join/ABC
 */
function urlToRoute(url: string): string | null {
  try {
    const u = new URL(url)
    // Custom scheme (com.aeroedu.inphysic://...) → pathname có thể nằm ở host
    if (u.protocol.startsWith('com.aeroedu')) {
      return '/' + (u.host + u.pathname).replace(/^\/+/, '')
    }
    // Universal link (https://inphysic.com/...) → lấy pathname + search
    if (u.hostname.includes('inphysic.com')) {
      return u.pathname + u.search
    }
    return u.pathname + u.search
  } catch {
    return null
  }
}

/**
 * Khởi tạo native bridge. Gọi 1 lần sau khi router sẵn sàng.
 * @param navigate — hàm điều hướng (vd từ useNavigate, hoặc window.location)
 * @param isDark   — theme hiện tại (để set status bar style)
 */
export async function initNative(navigate: NavigateFn, isDark: boolean = true): Promise<void> {
  if (initialized || !isNative()) return
  initialized = true

  const platform = getPlatform()

  // ── Đánh dấu html element để CSS scope safe-area cho native shell ──
  // (mobile.css safe-area chỉ áp dụng ≤640px; native cần mọi kích thước)
  document.documentElement.classList.add('capacitor-native', `platform-${platform}`)

  // ── Patch window.fetch: rewrite raw fetch('/api/...') → absolute ──
  // Nhiều component dùng raw fetch('/api/...') (URL tương đối). Trên native
  // app chạy từ capacitor://localhost → fetch('/api/...') resolve sai →
  // "Không thể tải". Axios `api` đã handle, nhưng raw fetch thì không.
  // Patch 1 lần: rewrite /api/* → https://inphysic.com/api/* + gắn auth token
  // + credentials. Fix toàn bộ ~20 file dùng raw fetch mà không phải sửa từng cái.
  try {
    const { tokenStore } = await import('@/services/api')
    const API_ORIGIN = (import.meta.env.VITE_API_URL_NATIVE as string | undefined)?.replace(/\/api\/?$/, '')
      || 'https://inphysic.com'
    const origFetch = window.fetch.bind(window)
    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
      if (typeof url === 'string' && url.startsWith('/api/')) {
        const abs = API_ORIGIN + url
        const headers = new Headers(init?.headers || (typeof input !== 'string' && !(input instanceof URL) ? (input as Request).headers : undefined))
        const token = tokenStore.getAccessToken()
        if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
        const nextInit: RequestInit = { ...init, headers, credentials: 'include' }
        return origFetch(abs, nextInit)
      }
      return origFetch(input as any, init)
    }
    console.info('[native] fetch patched → rewrite /api/* to', API_ORIGIN)
  } catch (e) {
    console.warn('[native] fetch patch fail:', e)
  }

  // ── Splash screen: hide sau khi app mount ──
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch (e) {
    console.warn('[native] splash hide fail:', e)
  }

  // ── Status bar: style theo theme ──
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
    if (platform === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0a0f1e' })
    }
  } catch (e) {
    console.warn('[native] status bar fail:', e)
  }

  // ── Deep links: app mở qua URL ──
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('appUrlOpen', (event: { url: string }) => {
      const route = urlToRoute(event.url)
      if (route) {
        console.info('[native] deep link →', route)
        navigate(route)
      }
    })

    // ── Hardware back button (Android) ──
    App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        // Ở root → minimize app thay vì exit đột ngột
        App.minimizeApp?.().catch(() => {})
      }
    })

    // ── App lifecycle: emit event cho các module (posture monitor pause khi background) ──
    App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      window.dispatchEvent(new CustomEvent('native:appStateChange', { detail: { isActive } }))
    })
  } catch (e) {
    console.warn('[native] app listeners fail:', e)
  }

  // ── Keyboard: resize body khi bàn phím hiện (iOS) ──
  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native })
    await Keyboard.setScroll({ isDisabled: false })
  } catch (e) {
    console.warn('[native] keyboard config fail:', e)
  }
}

/** Cập nhật status bar style khi user đổi theme runtime */
export async function setStatusBarStyle(isDark: boolean): Promise<void> {
  if (!isNative()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light })
  } catch { /* ignore */ }
}

/**
 * Haptic feedback — tactile cho nút quan trọng (nộp bài, hoàn thành, lỗi).
 * No-op trên web. Style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
 */
export async function haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
  if (!isNative()) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (style === 'success' || style === 'warning' || style === 'error') {
      const typeMap = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error }
      await Haptics.notification({ type: typeMap[style] })
    } else {
      const impactMap = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }
      await Haptics.impact({ style: impactMap[style] })
    }
  } catch { /* ignore */ }
}
