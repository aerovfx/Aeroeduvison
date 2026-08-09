/**
 * Desktop (Tauri) helpers — nhận diện app native + route desktop.
 * ─────────────────────────────────────────────────────────────────
 * App đóng gói bằng Tauri v2 (xem aeroedu-vite/src-tauri). Khi chạy native,
 * window có __TAURI_INTERNALS__ (v2) / __TAURI__ (v1). Cùng logic detect với
 * services/api.ts nhưng tách ra để router + App dùng chung.
 */

/** True khi frontend đang chạy bên trong app Tauri (native desktop). */
export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }
  return !!(w.__TAURI_INTERNALS__ || w.__TAURI__)
}

/** Route thuộc bộ UI desktop standalone (/desktop, /desktop/...). */
export function isDesktopRoute(pathname: string): boolean {
  return pathname === '/desktop' || pathname.startsWith('/desktop/')
}

/**
 * Màn hình mặc định khi mở app native.
 *
 * Tauri phải chạy cùng dashboard production với bản web. `/desktop` chỉ là
 * gallery/prototype UI độc lập, không dùng DashboardLayout và không có đầy đủ
 * hành vi điều hướng nên không được dùng làm entry point của app phát hành.
 */
export const DESKTOP_HOME = '/dashboard'
