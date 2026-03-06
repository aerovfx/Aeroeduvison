
import { SignLanguageType, SIGN_CONFIG } from './sign-language-config';

interface FingerState {
    thumb: 'open' | 'closed';
    index: 'open' | 'closed';
    middle: 'open' | 'closed';
    ring: 'open' | 'closed';
    pinky: 'open' | 'closed';
}

export class SignLanguageDetector {

    constructor() { }

    public detect(landmarks: any[]): SignLanguageType {
        if (!landmarks || landmarks.length !== 21) return 'UNKNOWN';

        const state = this.getFingerState(landmarks);
        const isOpen = (f: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky') => state[f] === 'open';
        const isClosed = (f: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky') => state[f] === 'closed';

        // --- 5 Fingers ---
        if (isOpen('index') && isOpen('middle') && isOpen('ring') && isOpen('pinky')) {
            if (isOpen('thumb')) return '5'; // 5 / HELLO
            return 'B'; // Thumb tucked
        }

        // --- 0 Fingers (Fist) ---
        if (isClosed('index') && isClosed('middle') && isClosed('ring') && isClosed('pinky')) {
            if (isOpen('thumb')) return 'A'; // Thumb along side
            return '0'; // S / E / Fist
        }

        // --- 1 Finger ---
        // Index Only
        if (isOpen('index') && isClosed('middle') && isClosed('ring') && isClosed('pinky')) {
            if (isOpen('thumb')) return 'L';
            return '1'; // D / 1
        }
        // Pinky Only
        if (isOpen('pinky') && isClosed('index') && isClosed('middle') && isClosed('ring')) {
            if (isOpen('thumb')) return 'Y'; // Thumb + Pinky = Y
            return 'I'; // Pinky only
        }

        // --- 2 Fingers ---
        // Index + Middle
        if (isOpen('index') && isOpen('middle') && isClosed('ring') && isClosed('pinky')) {
            if (isClosed('thumb')) return '2'; // V / U
            return '3'; // VSL 3 often uses thumb? If thumb open -> 3? No, VSL 3 is Thumb+Index+Middle
        }
        // Index + Pinky
        if (isOpen('index') && isOpen('pinky') && isClosed('middle') && isClosed('ring')) {
            if (isOpen('thumb')) return 'I_LOVE_YOU';
            return 'ROCK_ON';
        }

        // --- 3 Fingers ---
        // VSL 3: Thumb + Index + Middle
        // W: Index + Middle + Ring
        if (isOpen('index') && isOpen('middle') && isOpen('ring') && isClosed('pinky') && isClosed('thumb')) {
            return 'W'; // Or 6
        }
        if (isOpen('thumb') && isOpen('index') && isOpen('middle') && isClosed('ring') && isClosed('pinky')) {
            return '3';
        }
        if (isOpen('index') && isOpen('middle') && isOpen('ring') && isOpen('pinky') && isClosed('thumb')) {
            return '4';
        }

        // --- Special Pinches (Touching) ---
        // OK / F / 9: Thumb + Index Touch
        if (this.isPinch(landmarks)) {
            if (isOpen('middle') && isOpen('ring') && isOpen('pinky')) return 'OK';
        }

        return 'UNKNOWN';
    }

    private getFingerState(landmarks: any[]): FingerState {
        // Simple logic based on y-coordinates for upright hand
        // Tip (4, 8, 12, 16, 20) vs PIP (2, 6, 10, 14, 18) or MCP (5, 9, 13, 17)
        // 0=Wrist

        const isFingerOpen = (tipIdx: number, pipIdx: number) => {
            return landmarks[tipIdx].y < landmarks[pipIdx].y; // Assuming upright hand (y decreases upwards)
        };

        const isThumbOpen = () => {
            // Distance from Thumb Tip (4) to Index MCP (5)
            const dX = landmarks[4].x - landmarks[5].x;
            const dY = landmarks[4].y - landmarks[5].y;
            const dist = Math.sqrt(dX * dX + dY * dY);
            // If dist > 0.05 (normalized), roughly open? 
            // Better: Compare Tip-MCP distance to IP-MCP distance? 
            // Let's rely on x-offset for simplicity as most signs are vertical
            return dist > 0.1;
        };

        return {
            thumb: isThumbOpen() ? 'open' : 'closed',
            index: isFingerOpen(8, 6) ? 'open' : 'closed',
            middle: isFingerOpen(12, 10) ? 'open' : 'closed',
            ring: isFingerOpen(16, 14) ? 'open' : 'closed',
            pinky: isFingerOpen(20, 18) ? 'open' : 'closed'
        };
    }

    // Removed isThumbUp helper

    private isPinch(landmarks: any[]): boolean {
        // Distance between Index Tip (8) and Thumb Tip (4)
        const dx = landmarks[8].x - landmarks[4].x;
        const dy = landmarks[8].y - landmarks[4].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < 0.05; // Threshold
    }
}
