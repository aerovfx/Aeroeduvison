
/**
 * MediaPipe Console Filter - Fixed Version
 * Prevents MediaPipe INFO logs from appearing as errors
 */

// Apply console filter immediately
if (typeof window !== 'undefined') {
    const originalError = console.error;

    console.error = (...args: any[]) => {
        const message = args.join(' ');

        // Filter MediaPipe INFO messages
        const infoPatterns = [
            'INFO: Created TensorFlow Lite XNNPACK delegate for CPU',
            'INFO: Created TensorFlow Lite delegate for GPU',
            'INFO: TfLiteGpuDelegate',
            'INFO: Created 1 GPU delegate',
            'INFO: Initialized TensorFlow Lite runtime',
            'INFO: Graph successfully started',
            'INFO: OpenGL ES',
            'INFO: NNAPI',
            'INFO: Instantiated',
            'INFO: Initialized'
        ];

        // Check if this is an INFO message we should filter
        const shouldFilter = infoPatterns.some(pattern => message.includes(pattern));

        if (shouldFilter) {
            // Convert to console.log with colored prefix for visibility
            console.log('%c[MediaPipe INFO]%c', 'color: #4CAF50; font-weight: bold', 'color: inherit', ...args);
            return;
        }

        // Let real errors through
        originalError.apply(console, args);
    };
}

/**
 * Safe MediaPipe Detection Wrapper
 * Adds null checks and error handling
 */
export class SafeMediaPipeDetector {
    /**
     * Safely detect face landmarks
     */
    static detectFace(
        faceLandmarker: any | null,
        video: HTMLVideoElement,
        timestamp: number
    ): any | null {
        if (!faceLandmarker) {
            // console.warn('Face landmarker not initialized');
            return null;
        }

        if (!video || video.readyState < 2) {
            return null;
        }

        try {
            // Silence TFLite INFO logs during detection
            const originalInfo = console.info;
            console.info = () => { };

            const result = faceLandmarker.detectForVideo(video, timestamp);

            console.info = originalInfo;
            return result;
        } catch (error) {
            console.error('Face detection error:', error);
            return null;
        }
    }

    /**
     * Safely detect hand landmarks
     */
    static detectHands(
        handLandmarker: any | null,
        video: HTMLVideoElement,
        timestamp: number
    ): any | null {
        if (!handLandmarker) {
            // console.warn('Hand landmarker not initialized');
            return null;
        }

        if (!video || video.readyState < 2) {
            return null;
        }

        try {
            const originalInfo = console.info;
            console.info = () => { };

            const result = handLandmarker.detectForVideo(video, timestamp);

            console.info = originalInfo;
            return result;
        } catch (error) {
            console.error('Hand detection error:', error);
            return null;
        }
    }

    /**
     * Check if detector is ready
     */
    static isReady(detector: any | null): boolean {
        return detector !== null && detector !== undefined;
    }
}

export default SafeMediaPipeDetector;
