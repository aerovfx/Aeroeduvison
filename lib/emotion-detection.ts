/**
 * Shared emotion detection utilities.
 * Extracted from the deleted vision-tracker/advanced-emotion-recognition module
 * so that camera-management and emotion dashboard can both use them.
 */

export type EmotionType = 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral';

export const EMOTION_CONFIG: Record<EmotionType, { label: string; color: string; icon: string }> = {
  happy:     { label: 'Vui vẻ',      color: '#22c55e', icon: '😊' },
  sad:       { label: 'Buồn',        color: '#3b82f6', icon: '😢' },
  angry:     { label: 'Tức giận',    color: '#ef4444', icon: '😠' },
  surprised: { label: 'Ngạc nhiên',  color: '#f59e0b', icon: '😮' },
  fearful:   { label: 'Sợ hãi',     color: '#8b5cf6', icon: '😨' },
  disgusted: { label: 'Ghê tởm',    color: '#6b7280', icon: '🤢' },
  neutral:   { label: 'Bình thường', color: '#94a3b8', icon: '😐' },
};

interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

/**
 * Maps MediaPipe FaceLandmarker blendshape categories to high-level emotions.
 * Uses a weighted heuristic over Action-Unit-like blendshape scores.
 */
export class AdvancedEmotionDetector {
  detectEmotion(categories: BlendshapeCategory[]): { type: EmotionType; confidence: number } | null {
    if (!categories || categories.length === 0) return null;

    const get = (name: string): number => {
      const cat = categories.find(c => c.categoryName === name);
      return cat?.score ?? 0;
    };

    // Compute scores for each emotion based on blendshape activations
    const scores: Record<EmotionType, number> = {
      happy:
        get('mouthSmileLeft') * 0.35 +
        get('mouthSmileRight') * 0.35 +
        get('cheekSquintLeft') * 0.15 +
        get('cheekSquintRight') * 0.15,
      sad:
        get('mouthFrownLeft') * 0.25 +
        get('mouthFrownRight') * 0.25 +
        get('browInnerUp') * 0.25 +
        get('mouthLowerDownLeft') * 0.125 +
        get('mouthLowerDownRight') * 0.125,
      angry:
        get('browDownLeft') * 0.3 +
        get('browDownRight') * 0.3 +
        get('mouthFrownLeft') * 0.1 +
        get('mouthFrownRight') * 0.1 +
        get('jawForward') * 0.1 +
        get('noseSneerLeft') * 0.05 +
        get('noseSneerRight') * 0.05,
      surprised:
        get('browOuterUpLeft') * 0.2 +
        get('browOuterUpRight') * 0.2 +
        get('browInnerUp') * 0.2 +
        get('eyeWideLeft') * 0.1 +
        get('eyeWideRight') * 0.1 +
        get('jawOpen') * 0.2,
      fearful:
        get('browInnerUp') * 0.25 +
        get('eyeWideLeft') * 0.2 +
        get('eyeWideRight') * 0.2 +
        get('mouthFrownLeft') * 0.1 +
        get('mouthFrownRight') * 0.1 +
        get('jawOpen') * 0.15,
      disgusted:
        get('noseSneerLeft') * 0.3 +
        get('noseSneerRight') * 0.3 +
        get('mouthUpperUpLeft') * 0.15 +
        get('mouthUpperUpRight') * 0.15 +
        get('mouthFrownLeft') * 0.05 +
        get('mouthFrownRight') * 0.05,
      neutral: 0.18, // baseline bias so "neutral" wins when nothing is strongly active
    };

    // Find the dominant emotion
    let best: EmotionType = 'neutral';
    let bestScore = scores.neutral;
    for (const [emotion, score] of Object.entries(scores) as [EmotionType, number][]) {
      if (score > bestScore) {
        best = emotion;
        bestScore = score;
      }
    }

    // Confidence = dominant score clamped to [0, 1]
    const confidence = Math.min(1, Math.max(0, bestScore));
    return { type: best, confidence };
  }
}
