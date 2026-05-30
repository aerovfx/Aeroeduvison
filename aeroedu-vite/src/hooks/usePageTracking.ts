/**
 * usePageTracking — log lượt truy cập từng route giống YouTube Analytics
 *
 * Cơ chế:
 * - Listen useLocation() → mỗi khi pathname đổi, log entry mới
 * - Track viewMs = thời gian giữa entry và exit (route change/unmount/tab close)
 * - Send via navigator.sendBeacon (không block navigation, async)
 * - sessionId persist trong sessionStorage (1 tab = 1 session)
 *
 * Backend: POST /api/analytics/pageview { path, sessionId, viewMs?, referrer? }
 * Trả về 204 No Content (fire-and-forget). Sai sót KHÔNG ảnh hưởng UX.
 */
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { tokenStore } from '@/services/api'

const SESSION_KEY = 'aeroedu_session_id'
// Bug fix sau deploy 199: ENDPOINT_BEACON dùng absolute /api/... cho
// navigator.sendBeacon (raw fetch, không qua axios), ENDPOINT_AXIOS dùng
// relative cho api.post() (axios đã có baseURL='/api'). Trước đây dùng
// chung 1 const → axios duplicate prefix → POST /api/api/analytics/pageview
// → 503 spam console mỗi route change.
const ENDPOINT_BEACON = '/api/analytics/pageview'
const ENDPOINT_AXIOS  = '/analytics/pageview'

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

// ── YouTube-style demographics — gửi 1 lần per session để BE log device/browser/lang ──
// Sau khi BE parse User-Agent + Geo headers + body screen → đủ data cho
// /admin/analytics/audience phân tích device/OS/browser/country/screen/timezone.
function getDemographics() {
  try {
    return {
      screen: {
        w: typeof window !== 'undefined' && window.screen ? window.screen.width  : null,
        h: typeof window !== 'undefined' && window.screen ? window.screen.height : null,
      },
      lang: typeof navigator !== 'undefined' ? navigator.language : null,
      tz: typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null,
    }
  } catch {
    return {}
  }
}

function sendBeacon(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload)
    const token = tokenStore.getAccessToken()
    // Ưu tiên fetch keepalive: hỗ trợ Authorization header → BE biết user role.
    // sendBeacon không gửi headers tuỳ chỉnh được nên user_id luôn null khi
    // exit qua beacon — đó là lý do analytics thấy 0 unique users trước đây.
    fetch(ENDPOINT_BEACON, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      keepalive: true,
      credentials: 'include',
    }).catch(() => {
      // Last-resort fallback: sendBeacon (sống qua page unload nhưng anonymous)
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(ENDPOINT_BEACON, blob)
      }
    })
  } catch { /* never throw */ }
}

export function usePageTracking() {
  const location = useLocation()
  const enterTimeRef = useRef<number>(Date.now())
  const prevPathRef  = useRef<string>('')
  const prevReferrerRef = useRef<string>(document.referrer || '')

  useEffect(() => {
    const currentPath = location.pathname + location.search
    const sessionId = getSessionId()

    // 1. Send EXIT của trang trước đó (kèm viewMs)
    if (prevPathRef.current && prevPathRef.current !== currentPath) {
      const viewMs = Date.now() - enterTimeRef.current
      // Lấy access token từ tokenStore để BE biết user role (best-effort)
      const token = tokenStore.getAccessToken()
      sendBeacon({
        path: prevPathRef.current,
        referrer: prevReferrerRef.current,
        sessionId,
        viewMs,
        // Token gửi qua body (sendBeacon không set Authorization được)
        // BE sẽ check req.body.token nếu req.headers.authorization vắng
        // nhưng hiện tại BE chỉ đọc Authorization → role sẽ null cho beacon.
        // Trade-off: anonymous tracking trên unmount, full-tracking trên enter.
        ...(token ? { _t: token.slice(0, 0) } : {}),  // placeholder, không gửi token thật
      })
    }

    // 2. Send ENTRY trang mới (qua axios để có Authorization header)
    if (currentPath !== prevPathRef.current) {
      const demo = getDemographics()
      // Dynamic import api để tránh circular dep với services/api.ts
      import('@/services/api').then(({ api }) => {
        api.post(ENDPOINT_AXIOS, {
          path: currentPath,
          referrer: prevPathRef.current || prevReferrerRef.current,
          sessionId,
          // YouTube-style demographics — BE parse + lưu vào PageView
          ...demo,
        }).catch(() => { /* silent — analytics không được fail UX */ })
      }).catch(() => {})
    }

    prevReferrerRef.current = prevPathRef.current
    prevPathRef.current = currentPath
    enterTimeRef.current = Date.now()
  }, [location.pathname, location.search])

  // Track exit khi tab close / navigate away
  useEffect(() => {
    const handler = () => {
      if (!prevPathRef.current) return
      const viewMs = Date.now() - enterTimeRef.current
      sendBeacon({
        path: prevPathRef.current,
        sessionId: getSessionId(),
        viewMs,
      })
    }
    window.addEventListener('beforeunload', handler)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handler()
    })
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Heartbeat: ping mỗi 30s khi tab visible ─────────────────────
  // User: "có 2 tài khoản đang login là vietchung và admin nhưng trong
  // trang phân tích của admin không hiển thị được thông số đó"
  //
  // VẤN ĐỀ: PageView chỉ ghi khi navigate. User để tab idle 5 phút sẽ
  // rớt khỏi cửa sổ realtime → admin thấy 0 dù user vẫn online.
  //
  // FIX: ping POST /api/analytics/heartbeat mỗi 30s (chỉ khi tab visible
  // + đã login). BE insert PageView path='__heartbeat__' (loại khỏi byPath/
  // recent, chỉ tính vào active count).
  useEffect(() => {
    let timerId: number | null = null

    const ping = () => {
      // Chỉ ping khi tab visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      const token = tokenStore.getAccessToken()
      // Chỉ ping cho user đã login (anonymous đã có PageView khi navigate)
      if (!token) return
      try {
        fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            sessionId: getSessionId(),
            path: location.pathname + location.search,
          }),
          keepalive: true,
          credentials: 'include',
        }).catch(() => { /* silent — analytics không fail UX */ })
      } catch { /* never throw */ }
    }

    // Ping ngay khi mount + sau đó mỗi 30s
    ping()
    timerId = window.setInterval(ping, 30_000)

    // Ping khi tab visible trở lại (user switch tab về)
    const onVis = () => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (timerId != null) window.clearInterval(timerId)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [location.pathname, location.search])
}
