/**
 * Start background jobs scheduler
 * Import in main app entry point
 */

import { scheduler } from './scheduler'

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  scheduler.start()
  
  // Graceful shutdown
  process.on('SIGTERM', () => { scheduler.stop(); process.exit(0) })
  process.on('SIGINT', () => { scheduler.stop(); process.exit(0) })
}

export { scheduler }
