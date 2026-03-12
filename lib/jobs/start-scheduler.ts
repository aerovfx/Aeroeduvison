/**
 * Start background jobs scheduler
 * Import this in your main app entry point
 */

import { scheduler } from './scheduler'
import { RateLimiter } from '@/lib/rate-limiter'

// Start scheduler when app starts
if (process.env.NODE_ENV === 'production') {
  // Start background jobs
  scheduler.start()
  
  // Cleanup old rate limit records every hour
  setInterval(() => {
    RateLimiter.cleanup()
  }, 60 * 60 * 1000)
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...')
    scheduler.stop()
    process.exit(0)
  })
  
  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...')
    scheduler.stop()
    process.exit(0)
  })
  
  console.log('✅ Background jobs scheduler initialized')
}

export { scheduler }
