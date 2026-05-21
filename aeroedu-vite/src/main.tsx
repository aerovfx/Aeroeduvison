import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

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
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 phút
      gcTime: 1000 * 60 * 10,      // 10 phút cache
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </React.StrictMode>,
)
