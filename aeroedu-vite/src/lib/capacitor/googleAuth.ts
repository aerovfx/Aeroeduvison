/**
 * googleAuth.ts — Google Sign-In NATIVE (iOS) qua @capgo/capacitor-social-login.
 *
 * Vì sao cần: app native chạy ở `capacitor://localhost` (WKWebView) → Google
 * Identity Services (GSI) từ chối origin + chặn embedded webview. Nên trên native
 * ta dùng Google Sign-In SDK native (ASWebAuthenticationSession) lấy ID token, rồi
 * gửi lên BE `/api/auth/google` (BE verify ID token qua tokeninfo — chấp nhận token
 * từ bất kỳ Google client nào). Web vẫn dùng GSI như cũ (Login.tsx).
 *
 * Cấu hình: cần iOS OAuth client ID (Google Cloud → Credentials → iOS client cho
 * bundle com.aeroedu.inphysic). KHÔNG phải bí mật. Đặt qua env VITE_GOOGLE_IOS_CLIENT_ID
 * lúc build, hoặc sửa hằng IOS_CLIENT_ID bên dưới. Reversed client ID phải đăng ký
 * làm URL scheme trong Info.plist (CFBundleURLTypes).
 *
 * Import plugin theo dynamic import → KHÔNG phình web bundle; chỉ nạp khi chạy native.
 */
import { isNative } from './native'

// iOS OAuth client ID. ⚠️ THAY giá trị thật (Google Cloud iOS client).
const IOS_CLIENT_ID: string =
  (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined) ||
  '667564078289-kmhvq5mogn90q3o0kfm49vgk6n9dpelc.apps.googleusercontent.com'

let initialized = false

/** Có dùng được Google native không (đang chạy native + đã cấu hình client ID). */
export function isNativeGoogleAvailable(): boolean {
  return isNative() && !IOS_CLIENT_ID.startsWith('__SET_')
}

async function ensureInit() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  if (!initialized) {
    await SocialLogin.initialize({ google: { iOSClientId: IOS_CLIENT_ID } })
    initialized = true
  }
  return SocialLogin
}

/**
 * Đăng nhập Google native → trả ID token (gửi BE `/api/auth/google`).
 * Reject nếu user huỷ hoặc không lấy được token.
 */
export async function nativeGoogleSignIn(): Promise<string> {
  const SocialLogin = await ensureInit()
  const res = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  })
  const result = res?.result as { idToken?: string | null } | undefined
  const idToken = result?.idToken
  if (!idToken) throw new Error('Không lấy được ID token từ Google')
  return idToken
}
