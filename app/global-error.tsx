'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console and expose on window for debugging
    console.error('[GLOBAL-ERROR]', error.message, error.stack)
    if (typeof window !== 'undefined') {
      ;(window as any).__NEXT_GLOBAL_ERROR = {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      }
    }
  }, [error])

  return (
    <html>
      <body style={{ padding: '2rem', fontFamily: 'monospace', background: '#1a1a2e', color: '#e0e0e0' }}>
        <h2 style={{ color: '#ff6b6b' }}>Global Error</h2>
        <pre style={{
          background: '#0d0d1a',
          padding: '1rem',
          borderRadius: '8px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: '1px solid #333'
        }}>
          {error.message}
          {'\n\n'}
          {error.digest}
          {'\n\n'}
          {error.stack}
        </pre>
        <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#4a4af0', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  )
}
