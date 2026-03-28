'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#1a1a2e', color: '#e0e0e0', minHeight: '100vh' }}>
      <h2 style={{ color: '#ff6b6b', fontSize: '1.5rem' }}>Dashboard Error</h2>
      <pre style={{
        background: '#0d0d1a',
        padding: '1rem',
        borderRadius: '8px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '1px solid #333'
      }}>
        <strong>Message:</strong> {error.message}
        {'\n\n'}
        <strong>Digest:</strong> {error.digest || 'N/A'}
        {'\n\n'}
        <strong>Stack:</strong> {error.stack}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: '#4a4af0',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
    </div>
  )
}
