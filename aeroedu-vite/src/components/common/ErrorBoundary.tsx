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
    const msg = String(error?.message || '');
    if (
      /Failed to fetch dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Importing a module script failed/i.test(msg)
    ) {
      const key = '__chunk_reloaded_at__';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(key, String(Date.now()));
        console.warn('[ErrorBoundary] stale chunk → auto reload');
        setTimeout(() => window.location.reload(), 200);
      }
    }
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

    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 480, width: '100%',
          background: 'var(--ai-card-bg)', border: '1px solid var(--ai-card-border)',
          borderRadius: 16, padding: 28, textAlign: 'center',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 28,
            background: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
            Trang gặp lỗi
          </h2>
          <p style={{ margin: '8px 0 16px', color: 'var(--ai-muted-text)', fontSize: 13 }}>
            {error.message || 'Lỗi không xác định. Vui lòng thử lại hoặc quay về trang chủ.'}
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
          </details>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button onClick={this.reset} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 10,
              background: 'hsl(var(--primary))', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <RefreshCw size={14} /> Thử lại
            </button>
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

