/**
 * Lazy loader cho Google Identity Services client.
 *
 * Trước đây script `https://accounts.google.com/gsi/client` được đặt trong
 * index.html với `async defer` → vẫn bị browser pre-parse + request ngay lúc
 * load landing page, kéo FCP chậm thêm ~200-400ms và cost 1 DNS + TLS +
 * network round-trip đến accounts.google.com.
 *
 * Hàm này chỉ inject <script> khi UI thực sự cần GSI (trang /auth/login).
 * Các lần gọi sau sẽ tái sử dụng cùng promise (singleton).
 */

const GSI_SRC = 'https://accounts.google.com/gsi/client'

let gsiPromise: Promise<void> | null = null

export function loadGsi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gsiPromise) return gsiPromise

  gsiPromise = new Promise<void>((resolve, reject) => {
    // Nếu script đã được thêm bởi caller khác, chỉ cần chờ nó load
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    )
    if (existing) {
      if ((existing as any)._gsiLoaded) return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('GSI load failed')), { once: true })
      return
    }

    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.addEventListener(
      'load',
      () => {
        ;(s as any)._gsiLoaded = true
        resolve()
      },
      { once: true }
    )
    s.addEventListener('error', () => reject(new Error('GSI load failed')), { once: true })
    document.head.appendChild(s)
  })

  return gsiPromise
}
