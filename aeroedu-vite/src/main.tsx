import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { registerPwa } from './lib/pwa-register'
import './index.css'

// PWA / Service Worker — chạy sau khi React mount để không block initial render
// Phase 0 (Capacitor foundation). Production only — dev mode disabled.
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    registerPwa().catch(err => console.warn('[pwa] register error:', err))
  })
}

// ─── Chunk load error recovery ─────────────────────────────────────
// Khi deploy mới, browser có thể giữ index.html cũ trỏ tới chunk
// /assets/Foo-OLDHASH.js đã bị xoá. React.lazy / dynamic import fail
// với "'text/html' is not a valid JavaScript MIME type" hoặc
// "Failed to fetch dynamically imported module".
// → Tự reload page 1 lần (force fetch index.html mới với asset hash mới).
// Dùng sessionStorage để tránh infinite loop nếu reload không fix được.
const CHUNK_RELOAD_KEY = '__chunk_reload_attempt'
function isChunkLoadError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '').toLowerCase()
  return (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('not a valid javascript mime type') ||
    msg.includes('text/html') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('expected a javascript module script') ||
    msg.includes('error loading dynamically imported')
  )
}
function handleChunkError(err: unknown): boolean {
  if (!isChunkLoadError(err)) return false
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0')
    const now = Date.now()
    // Chỉ reload nếu chưa thử trong 60s gần đây (tránh infinite loop)
    if (now - last > 60_000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now))
      console.warn('[chunk-recovery] Detected stale chunk → reloading page')
      window.location.reload()
      return true
    }
  } catch { /* ignore */ }
  return false
}
// Vite 5+ emit 'vite:preloadError' khi modulepreload fail — best signal
window.addEventListener('vite:preloadError', (e: Event) => {
  e.preventDefault()
  handleChunkError((e as unknown as { payload?: Error }).payload)
})
// Catch dynamic import rejection (React.lazy fail)
window.addEventListener('unhandledrejection', (e) => {
  if (handleChunkError(e.reason)) e.preventDefault()
})
// Catch global script errors (script load fail)
window.addEventListener('error', (e) => {
  if (handleChunkError(e.error || e.message)) e.preventDefault()
})

// TanStack Query client — cấu hình tương tự với SWR/fetch trong Next.js
// gcTime tăng lên 24h để cache survive lâu cho offline mode (persist xuống
// localStorage). Khi offline, query trả cached data thay vì lỗi network.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 phút "fresh"
      gcTime: 1000 * 60 * 60 * 24,     // 24h giữ cache (offline survive)
      retry: 1,
      refetchOnWindowFocus: false,
      // Khi offline → không retry vô ích, dùng luôn cached data
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
})

// ─── Offline persistence (Phase 4 — iOS offline mode) ───
// Cache query state xuống localStorage → data hiển thị ngay khi offline /
// reload. Throttle 1s tránh write quá nhiều. maxAge 24h.
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'aero:query-cache',
  throttleTime: 1000,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,   // 24h
        // Chỉ persist query thành công (tránh cache lỗi)
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success',
        },
      }}
    >
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
