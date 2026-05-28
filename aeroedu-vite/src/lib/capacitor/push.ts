/**
 * Push notifications — đăng ký APNs (iOS) / FCM (Android) device token,
 * gửi lên backend để dispatch thông báo (đề thi mới, deadline bài tập, chat).
 *
 * No-op trên web (PWA web push sẽ làm riêng sau). Chỉ chạy Capacitor native.
 *
 * Flow:
 *   1. requestPushPermission() — xin quyền (iOS popup)
 *   2. register() → nhận device token qua event 'registration'
 *   3. POST /api/devices/register {token, platform} → backend lưu DeviceToken
 *   4. Listener 'pushNotificationReceived' (foreground) + 'actionPerformed'
 *      (user tap notification) → điều hướng tới route trong data.route
 */
import { isNative, getPlatform } from './native'
import { api } from '@/services/api'

let registered = false

export interface PushSetupResult {
  granted: boolean
  token?: string
  reason?: string
}

/**
 * Khởi tạo push. Gọi SAU khi user đã login (cần userId để gắn token).
 * @param navigate điều hướng khi user tap notification
 */
export async function setupPush(navigate?: (path: string) => void): Promise<PushSetupResult> {
  if (registered) return { granted: true }
  if (!isNative()) return { granted: false, reason: 'not native' }

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // 1. Check + request permission
    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== 'granted') {
      return { granted: false, reason: 'permission denied' }
    }

    // 2. Listeners (set TRƯỚC khi register để không miss event)
    await PushNotifications.removeAllListeners()

    PushNotifications.addListener('registration', async (token) => {
      // 3. Gửi token lên backend
      try {
        await api.post('/devices/register', {
          token: token.value,
          platform: getPlatform(),  // 'ios' | 'android'
        })
        console.info('[push] token registered with backend')
      } catch (e) {
        console.warn('[push] backend register fail:', e)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.warn('[push] registration error:', err)
    })

    // Foreground: notification đến khi app đang mở → có thể show in-app toast
    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      window.dispatchEvent(new CustomEvent('push:received', { detail: notif }))
    })

    // User tap notification → điều hướng tới route (data.route từ payload)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const route = action.notification?.data?.route
      if (route && navigate) navigate(route)
    })

    // 4. Register với APNs/FCM
    await PushNotifications.register()
    registered = true
    return { granted: true }
  } catch (e: any) {
    console.warn('[push] setup fail:', e)
    return { granted: false, reason: e?.message || 'error' }
  }
}

/** Gỡ token khỏi backend khi logout (ngừng nhận push) */
export async function teardownPush(): Promise<void> {
  if (!isNative()) return
  try {
    await api.post('/devices/unregister', { platform: getPlatform() }).catch(() => {})
    const { PushNotifications } = await import('@capacitor/push-notifications')
    await PushNotifications.removeAllListeners()
    registered = false
  } catch { /* ignore */ }
}
