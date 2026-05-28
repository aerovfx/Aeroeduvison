/**
 * Capacitor config — iOS app shell cho AeroEdu (inphysic.com)
 *
 * Build pipeline:
 *   cd aeroedu-vite && npm run build       # build Vite SPA → aeroedu-vite/dist
 *   npx cap sync ios                         # copy dist + sync native plugins
 *   npx cap open ios                         # mở Xcode
 *
 * Lưu ý cấu hình:
 *   - webDir trỏ tới aeroedu-vite/dist (NOT root dist) — giữ monorepo structure
 *   - server.iosScheme: 'capacitor' → file:// trong WKWebView
 *     (default; KHÔNG override sang https vì sẽ phá http-only cookie behavior
 *     của Capacitor — cookies vẫn được proxy qua bridge nếu cần)
 *   - server.allowNavigation: chỉ inphysic.com + cdn cần cho MediaPipe
 *   - ios.contentInset: 'automatic' để respect safe-area (notch + Dynamic Island)
 *   - plugins config: splash + status bar matching app theme
 */
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aeroedu.inphysic',
  appName: 'AeroEdu',
  webDir: 'dist',

  // ── Server config ──
  // Để tận dụng SPA routing + tránh CORS, chạy assets từ bundle local (default).
  // Native plugins (Camera, Push, Filesystem) work qua bridge regardless of scheme.
  server: {
    iosScheme: 'capacitor',         // capacitor://localhost
    // Allow navigation tới production domain cho deeplink + HTTPS API
    allowNavigation: [
      'inphysic.com',
      '*.inphysic.com',
      'storage.googleapis.com',     // GCS media + MediaPipe models
      'cdn.jsdelivr.net',           // MediaPipe WASM CDN
      'api.qrserver.com',           // QR generator
    ],
    // Mở external link trong system browser, KHÔNG trong WebView
    androidScheme: 'https',
  },

  // ── iOS native config ──
  ios: {
    contentInset: 'automatic',      // Respect safe-area (notch + Dynamic Island)
    backgroundColor: '#0a0f1e',     // Match theme
    scrollEnabled: true,
    allowsLinkPreview: false,       // Disable 3D Touch preview popup
    handleApplicationNotifications: true,
  },

  // ── Plugin config ──
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0a0f1e',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#22d3ee',      // cyan-400 matches brand
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',                // Dark content trên light bg, hoặc ngược lại
      backgroundColor: '#0a0f1e',
      overlaysWebView: false,
    },
    App: {
      // Deep-link routes — Universal Links + custom scheme
      // Will configure trong Phase 2 với App.addListener('appUrlOpen')
    },
    Preferences: {
      group: 'AeroEduPrefs',        // Shared App Group prefix
    },
  },
}

export default config
