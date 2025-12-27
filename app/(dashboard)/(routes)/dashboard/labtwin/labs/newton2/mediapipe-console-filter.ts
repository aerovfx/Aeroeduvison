/**
 * MediaPipe Console Filter
 * Suppresses INFO/WARNING logs from MediaPipe that incorrectly use console.error()
 * This prevents Next.js dev overlay from showing non-critical messages as errors
 */

if (typeof window !== 'undefined') {
  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Patterns to suppress (MediaPipe INFO/WARNING messages)
  const suppressPatterns = [
    'INFO:',
    'Created TensorFlow Lite',
    'XNNPACK delegate',
    'Sets FaceBlendshapesGraph',
    'Using NORM_RECT without IMAGE_DIMENSIONS',
    'OpenGL error checking is disabled',
    'Graph successfully started running',
    'GL version:',
    'renderer: WebKit WebGL'
  ];

  // Patterns to convert to console.log (informational)
  const infoPatterns = [
    'INFO:',
    'Created TensorFlow Lite',
    'Graph successfully started running'
  ];

  /**
   * Patched console.error
   * Filters MediaPipe INFO messages and converts them to console.log
   */
  console.error = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    
    // Check if message should be suppressed
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (shouldSuppress) {
      // Check if it's an INFO message (should be logged, not errored)
      const isInfo = infoPatterns.some(pattern => message.includes(pattern));
      
      if (isInfo) {
        // Convert to console.log with [MediaPipe] prefix
        console.log('%c[MediaPipe Info]%c', 
          'color: #48bb78; font-weight: bold', 
          'color: inherit', 
          ...args
        );
      }
      // Otherwise, completely suppress (warnings)
      return;
    }
    
    // Call original console.error for real errors
    originalError.apply(console, args);
  };

  /**
   * Patched console.warn
   * Suppresses MediaPipe warnings that are not actionable
   */
  console.warn = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    
    // Suppress MediaPipe warnings
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (shouldSuppress) {
      return;
    }
    
    // Call original console.warn
    originalWarn.apply(console, args);
  };

  // Log that filter is active (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c[MediaPipe Filter]%c Active - Suppressing INFO/WARNING logs',
      'color: #667eea; font-weight: bold',
      'color: #a0aec0'
    );
  }
}

export {};

