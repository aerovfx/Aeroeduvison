/**
 * ErrorBoundary — wrap mỗi route lazy-load để 1 trang crash không kéo cả app
 * thành blank page. Hiển thị fallback UI với reload + back home.
 *
 * Tự reset state khi `resetKey` đổi (vd: pathname). Dùng RouteErrorBoundary
 * bên dưới để bind tự động vào react-router location.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
  resetKey?: string | number
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // Stale chunk: build mới deploy → bundle cũ user đang giữ trong tab bị 404.
    // Tự reload 1 lần (dùng sessionStorage flag tránh reload loop).
    // V2: expand regex để cover "MIME type" error (browser execute index.html
    // như JS module khi server SPA-fallback cho /assets/Foo-OLDHASH.js).
    const msg = String(error?.message || '').toLowerCase();
    if (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('loading css chunk') ||
      msg.includes('chunkloaderror') ||
      msg.includes('importing a module script failed') ||
      msg.includes('not a valid javascript mime type') ||
      msg.includes('text/html') ||
      msg.includes('expected a javascript module script')
    ) {
      const key = '__chunk_reloaded_at__';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(key, String(Date.now()));
        console.warn('[ErrorBoundary] stale chunk / MIME mismatch → auto reload');
        setTimeout(() => window.location.reload(), 200);
      }
    }
  }

  isStaleChunkError(): boolean {
    const msg = String(this.state.error?.message || '').toLowerCase()
    return (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('loading chunk') ||
      msg.includes('not a valid javascript mime type') ||
      msg.includes('text/html') ||
      msg.includes('importing a module script failed')
    )
  }

  hardReload = () => {
    // Clear all caches + reload — fix triệt để stale chunk
    try {
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      }
    } catch { /* ignore */ }
    // Bypass HTTP cache với cache-bust query
    const url = new URL(window.location.href)
    url.searchParams.set('_t', String(Date.now()))
    window.location.href = url.toString()
  }

  componentDidUpdate(prev: Props) {
    // Reset khi parent đổi resetKey (vd location.pathname đổi)
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset })

    const isStale = this.isStaleChunkError()

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 520, width: '100%',
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 16, padding: 28, textAlign: 'center',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 28,
            background: isStale ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.12)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            {isStale
              ? <RefreshCw size={28} style={{ color: '#f59e0b' }} />
              : <AlertTriangle size={28} style={{ color: '#ef4444' }} />}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
            {isStale ? '🔄 Cần tải lại trang' : 'Trang gặp lỗi'}
          </h2>
          <p style={{ margin: '8px 0 16px', color: 'var(--ai-muted-text)', fontSize: 13, lineHeight: 1.55 }}>
            {isStale ? (
              <>
                Hệ thống vừa cập nhật phiên bản mới — trình duyệt đang dùng file cũ.
                Bấm <strong>"Tải lại bản mới"</strong> để khắc phục.
              </>
            ) : (
              error.message || 'Lỗi không xác định. Vui lòng thử lại hoặc quay về trang chủ.'
            )}
          </p>
          <details style={{ textAlign: 'left', marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ai-muted-text)' }}>
              Chi tiết kỹ thuật
            </summary>
            <pre style={{
              background: 'var(--ai-tabs-bg)', padding: 10, borderRadius: 8,
              fontSize: 11, overflow: 'auto', maxHeight: 160, marginTop: 8,
              color: 'var(--ai-muted-text)',
            }}>
              {error.stack || String(error)}
            </pre>
            {isStale && (
              <p style={{ fontSize: 11, color: 'var(--ai-muted-text)', marginTop: 8, fontStyle: 'italic' }}>
                <strong>Nguyên nhân:</strong> Trang trước đó được nạp với 1 phiên bản,
                sau đó server đã cập nhật phiên bản mới với file JS có hash khác.
                Trình duyệt vẫn nhớ filename cũ nên load 404 → server trả HTML →
                browser không hiểu HTML là JS module.
              </p>
            )}
          </details>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isStale ? (
              <button onClick={this.hardReload} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(90deg, #f59e0b, #ea580c)', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                <RefreshCw size={14} /> Tải lại bản mới
              </button>
            ) : (
              <button onClick={this.reset} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10,
                background: 'hsl(var(--primary))', color: '#fff',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                <RefreshCw size={14} /> Thử lại
              </button>
            )}
            <a href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10,
              background: 'transparent', color: 'hsl(var(--foreground))',
              border: '1px solid var(--ai-card-border)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              <Home size={14} /> Trang chủ
            </a>
          </div>
        </div>
      </div>
    )
  }
}

// Wrapper auto-reset khi pathname đổi.
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}

