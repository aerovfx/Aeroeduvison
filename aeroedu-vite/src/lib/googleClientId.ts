/**
 * Google OAuth Client ID resolver — đa tầng fallback
 *
 * Ưu tiên (cao → thấp):
 *   1. URL query param ?gci=...                — debug/override tạm thời
 *   2. localStorage 'aeroedu.googleClientId'   — override vĩnh viễn cho client
 *   3. import.meta.env.VITE_GOOGLE_CLIENT_ID   — baked vào bundle khi build
 *   4. window.__AEROEDU_GOOGLE_CLIENT_ID__     — runtime config (server-injected)
 *   5. GOOGLE_CLIENT_ID_FALLBACK               — hardcode public fallback
 *
 * Vì sao phải có 5 tầng?
 *   - OAuth Client ID là PUBLIC identifier (không phải secret). An toàn dựa trên
 *     "Authorized JavaScript origins" trong Google Cloud Console, không phải vào
 *     việc giấu chuỗi này.
 *   - Vite inline `import.meta.env.VITE_*` lúc BUILD, nên nếu Docker build thiếu
 *     build-arg `VITE_GOOGLE_CLIENT_ID` (do thiếu .env, gitignore, CI thiếu
 *     secret …) thì biến rỗng → button "Sign in with Google" biến mất hoặc
 *     OAuth báo "invalid_client" mà không có lỗi rõ ràng.
 *   - Nếu fallback hardcode bị Google xoá / move sang project khác → vẫn cho
 *     phép user override bằng localStorage hoặc query param mà KHÔNG cần
 *     rebuild & redeploy. Chỉ cần dán Client ID mới vào Console / URL.
 *
 * Cách sửa nhanh nếu gặp "Error 401: invalid_client":
 *   - Console: localStorage.setItem('aeroedu.googleClientId', 'xxx.apps.googleusercontent.com')
 *   - URL    : thêm ?gci=xxx.apps.googleusercontent.com vào /login (1 lần)
 *   - Lâu dài: sửa giá trị GOOGLE_CLIENT_ID_FALLBACK bên dưới rồi rebuild.
 */

export const GOOGLE_CLIENT_ID_FALLBACK =
  '667564078289-7lv5ipchhsgahfu44vqhtj68tkuovcrc.apps.googleusercontent.com'

const STORAGE_KEY = 'aeroedu.googleClientId'
const QUERY_KEY = 'gci'

declare global {
  interface Window {
    __AEROEDU_GOOGLE_CLIENT_ID__?: string
  }
}

/**
 * Chặt hơn chỉ kiểm endsWith — phải match toàn chuỗi (không có rác trước).
 *
 * Lịch sử: ngày 2026-04-21 build script `deploy-cloudbuild.sh` có bug
 * echo log ra stdout → bị $() nuốt vào giá trị → build-arg truyền
 * cho Vite là "  VITE_GOOGLE_CLIENT_ID: loaded from ...\n<real-id>".
 * Hàm cũ chỉ check endsWith nên chuỗi rác vẫn pass → Google trả
 * invalid_client. Bây giờ enforce full-string match + không whitespace
 * để frontend không "vô tình" gửi dữ liệu bẩn sang Google.
 */
const CLIENT_ID_RE = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i

function isLikelyClientId(v: string | null | undefined): v is string {
  if (!v) return false
  const s = v.trim()
  if (/\s/.test(s)) return false // reject newline/whitespace in middle
  return CLIENT_ID_RE.test(s)
}

/**
 * Resolves the Google Client ID using a 5-tier precedence chain.
 * Persist override from URL ?gci=... into localStorage (one-shot bootstrap).
 */
export function getGoogleClientId(): string {
  // 1) URL query param (?gci=…) — bootstrap override, persist & strip
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search)
      const fromQuery = params.get(QUERY_KEY)
      if (isLikelyClientId(fromQuery)) {
        try { localStorage.setItem(STORAGE_KEY, fromQuery.trim()) } catch { /* ignore */ }
        // remove ?gci= from URL bar so it doesn't stick around / get shared
        params.delete(QUERY_KEY)
        const newSearch = params.toString()
        const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash
        try { window.history.replaceState(null, '', newUrl) } catch { /* ignore */ }
        return fromQuery.trim()
      }
    } catch { /* ignore parse errors */ }
  }

  // 2) localStorage override — survives reloads
  if (typeof window !== 'undefined') {
    try {
      const fromLS = localStorage.getItem(STORAGE_KEY)
      if (isLikelyClientId(fromLS)) return fromLS.trim()
    } catch { /* ignore (private mode etc.) */ }
  }

  // 3) Vite build-time env
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (isLikelyClientId(fromEnv)) return fromEnv.trim()

  // 4) Runtime window injection (cho server-rendered config)
  if (typeof window !== 'undefined' && isLikelyClientId(window.__AEROEDU_GOOGLE_CLIENT_ID__)) {
    return window.__AEROEDU_GOOGLE_CLIENT_ID__!.trim()
  }

  // 5) Hardcode fallback — public ID, an toàn để commit
  return GOOGLE_CLIENT_ID_FALLBACK
}

/** Cho phép gọi từ DevTools để sửa nhanh khi gặp invalid_client mà không rebuild. */
export function setGoogleClientIdOverride(id: string): void {
  if (!isLikelyClientId(id)) {
    throw new Error('Client ID phải có dạng ...apps.googleusercontent.com')
  }
  try { localStorage.setItem(STORAGE_KEY, id.trim()) } catch { /* ignore */ }
}

export function clearGoogleClientIdOverride(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

// Expose helpers vào window cho dev / hỗ trợ cuối ngày
if (typeof window !== 'undefined') {
  // @ts-expect-error - intentional debug surface
  window.aeroeduSetGoogleClientId = setGoogleClientIdOverride
  // @ts-expect-error - intentional debug surface
  window.aeroeduClearGoogleClientId = clearGoogleClientIdOverride
}
