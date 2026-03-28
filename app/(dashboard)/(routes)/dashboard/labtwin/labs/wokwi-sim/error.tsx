'use client'

import { useEffect } from 'react'

export default function WokwiSimError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Wokwi Sim Error:', error)
  }, [error])

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', background: '#1a1a2e', color: '#e0e0e0', minHeight: '50vh' }}>
      <h2 style={{ color: '#ff6b6b', fontSize: '1.25rem' }}>Wokwi Sim Error</h2>
      <pre style={{
        background: '#0d0d1a',
        padding: '1rem',
        borderRadius: '8px',
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '1px solid #ff6b6b33',
        marginTop: '1rem',
        fontSize: '0.8rem',
        lineHeight: 1.5,
      }}>
{`Error: ${error.message}

Digest: ${error.digest || 'N/A'}

Stack:
${error.stack || 'No stack trace'}`}
      </pre>
      <button
        onClick={reset}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: '#4a4af0',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}
      >
        Retry
      </button>
    </div>
  )
}
