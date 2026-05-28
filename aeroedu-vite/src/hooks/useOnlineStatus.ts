/**
 * useOnlineStatus — theo dõi trạng thái kết nối mạng.
 *
 * Web: dùng navigator.onLine + online/offline events.
 * Native (Capacitor): dùng @capacitor/network (chính xác hơn — biết cả
 * wifi/cellular + reachability thật, không chỉ "có interface").
 *
 * Trả về { online, connectionType }.
 */
import { useEffect, useState } from 'react'
import { isNative } from '@/lib/capacitor/native'

export interface OnlineStatus {
  online: boolean
  connectionType: string  // 'wifi' | 'cellular' | 'none' | 'unknown'
}

export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  })

  useEffect(() => {
    let cleanupNative: (() => void) | undefined

    if (isNative()) {
      // Capacitor Network plugin — reachability thật
      import('@capacitor/network').then(({ Network }) => {
        Network.getStatus().then((s) => {
          setStatus({ online: s.connected, connectionType: s.connectionType })
        })
        const handle = Network.addListener('networkStatusChange', (s) => {
          setStatus({ online: s.connected, connectionType: s.connectionType })
        })
        cleanupNative = () => { handle.then((h) => h.remove()) }
      }).catch(() => { /* fallback to web events below */ })
    }

    // Web fallback events (cũng chạy song song — harmless)
    const onOnline = () => setStatus((s) => ({ ...s, online: true }))
    const onOffline = () => setStatus((s) => ({ ...s, online: false }))
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      cleanupNative?.()
    }
  }, [])

  return status
}
