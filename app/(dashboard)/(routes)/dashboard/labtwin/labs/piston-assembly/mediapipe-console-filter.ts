/**
 * MediaPipe Console Filter
 * Suppresses INFO/WARNING logs from MediaPipe that incorrectly use console.error()
 */

if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

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

  const infoPatterns = [
    'INFO:',
    'Created TensorFlow Lite',
    'Graph successfully started running'
  ];

  console.error = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (shouldSuppress) {
      const isInfo = infoPatterns.some(pattern => message.includes(pattern));
      if (isInfo) {
        console.log('%c[MediaPipe Info]%c', 
          'color: #48bb78; font-weight: bold', 
          'color: inherit', 
          ...args
        );
      }
      return;
    }
    
    originalError.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    const message = args[0]?.toString() || '';
    const shouldSuppress = suppressPatterns.some(pattern => 
      message.includes(pattern)
    );
    
    if (shouldSuppress) {
      return;
    }
    
    originalWarn.apply(console, args);
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c[MediaPipe Filter]%c Active - Suppressing INFO/WARNING logs',
      'color: #667eea; font-weight: bold',
      'color: #a0aec0'
    );
  }
}

export {};

