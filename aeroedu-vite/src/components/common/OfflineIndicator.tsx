/**
 * OfflineIndicator — banner mỏng hiện khi mất mạng.
 *
 * - Offline: banner amber cố định top "📡 Mất kết nối — đang dùng dữ liệu đã lưu"
 * - Vừa online lại: toast xanh "Đã kết nối lại" 2s rồi ẩn
 *
 * Dùng useOnlineStatus (Capacitor Network trên native, navigator.onLine web).
 * Render dưới safe-area top (notch) qua class data-app-header.
 */
import { useEffect, useRef, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { online } = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const wasOffline = useRef(false)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
    } else if (wasOffline.current) {
      // Vừa online lại → flash "reconnected" 2s
      wasOffline.current = false
      setShowReconnected(true)
      const t = setTimeout(() => setShowReconnected(false), 2000)
      return () => clearTimeout(t)
    }
  }, [online])

  if (online && !showReconnected) return null

  return (
    <div
      data-app-header
      className={`fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 py-1.5 text-xs font-semibold transition-all ${
        online
          ? 'bg-emerald-500 text-white'
          : 'bg-amber-500 text-black'
      }`}
      style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}
    >
      {online ? (
        <><Wifi className="w-3.5 h-3.5" /> Đã kết nối lại</>
      ) : (
        <><WifiOff className="w-3.5 h-3.5" /> Mất kết nối — đang dùng dữ liệu đã lưu</>
      )}
    </div>
  )
}
