// Filter out common MediaPipe console noise
if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        const str = args.map(a => String(a)).join(' ');
        if (str.includes('MediaPipe') || str.includes('GPU') || str.includes('WebGL')) {
            // Suppress specific warnings if needed, or just let them through but cleaner
            // return; 
        }
        originalWarn.apply(console, args);
    };
}
