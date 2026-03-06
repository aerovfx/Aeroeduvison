// Filter MediaPipe console messages
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  const mediapipePatterns = [
    /MediaPipe/,
    /hand_landmarker/,
    /WASM/,
    /Initialization/,
    /GPU delegate/
  ];
  
  const shouldFilter = (message: string) => {
    return mediapipePatterns.some(pattern => pattern.test(message));
  };
  
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalLog.apply(console, args);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalWarn.apply(console, args);
    }
  };
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (!shouldFilter(message)) {
      originalError.apply(console, args);
    }
  };
}

