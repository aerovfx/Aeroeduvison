import { Category } from '@mediapipe/tasks-vision';

export type EmotionType =
    // Basic emotions (7)
    | 'happy' | 'sad' | 'angry' | 'surprised' | 'fearful' | 'disgusted' | 'neutral'
    // Extended emotions (15)
    | 'very_happy' | 'laughing' | 'smirking' | 'confused' | 'worried' | 'thinking'
    | 'sleepy' | 'kiss' | 'tongue_out' | 'wink' | 'crying' | 'screaming'
    | 'annoyed' | 'concentrating' | 'poker_face'
    // New Additions (20)
    | 'suspicious' | 'bored' | 'excited' | 'shy' | 'confident' | 'arrogant'
    | 'humble' | 'grateful' | 'regretful' | 'hopeful' | 'desperate' | 'exhausted'
    | 'energetic' | 'anxious' | 'relieved' | 'jealous' | 'envious' | 'proud'
    | 'ashamed' | 'guilty';

export interface Emotion {
    type: EmotionType;
    confidence: number;
    timestamp: number;
    blendshapes?: Record<string, number>;
}

export interface EmotionStats {
    happy: number; sad: number; angry: number; surprised: number; fearful: number; disgusted: number; neutral: number;
    very_happy: number; laughing: number; smirking: number; confused: number; worried: number; thinking: number;
    sleepy: number; kiss: number; tongue_out: number; wink: number; crying: number; screaming: number;
    annoyed: number; concentrating: number; poker_face: number;
    suspicious: number; bored: number; excited: number; shy: number; confident: number; arrogant: number;
    humble: number; grateful: number; regretful: number; hopeful: number; desperate: number; exhausted: number;
    energetic: number; anxious: number; relieved: number; jealous: number; envious: number; proud: number;
    ashamed: number; guilty: number;
    total: number;
    [key: string]: number; // index signature
}

export const createEmptyStats = (): EmotionStats => ({
    happy: 0, sad: 0, angry: 0, surprised: 0, fearful: 0, disgusted: 0, neutral: 0,
    very_happy: 0, laughing: 0, smirking: 0, confused: 0, worried: 0, thinking: 0,
    sleepy: 0, kiss: 0, tongue_out: 0, wink: 0, crying: 0, screaming: 0,
    annoyed: 0, concentrating: 0, poker_face: 0,
    suspicious: 0, bored: 0, excited: 0, shy: 0, confident: 0, arrogant: 0,
    humble: 0, grateful: 0, regretful: 0, hopeful: 0, desperate: 0, exhausted: 0,
    energetic: 0, anxious: 0, relieved: 0, jealous: 0, envious: 0, proud: 0,
    ashamed: 0, guilty: 0,
    total: 0
});

export const EMOTION_CONFIG: Record<EmotionType, {
    emoji: string; color: string; label: string; labelVi: string; category: string;
}> = {
    // Basic
    happy: { emoji: '😊', color: '#10b981', label: 'Happy', labelVi: 'Vui vẻ', category: 'positive' },
    sad: { emoji: '😢', color: '#3b82f6', label: 'Sad', labelVi: 'Buồn', category: 'negative' },
    angry: { emoji: '😠', color: '#ef4444', label: 'Angry', labelVi: 'Tức giận', category: 'negative' },
    surprised: { emoji: '😲', color: '#f59e0b', label: 'Surprised', labelVi: 'Ngạc nhiên', category: 'neutral' },
    fearful: { emoji: '😨', color: '#8b5cf6', label: 'Fearful', labelVi: 'Sợ hãi', category: 'negative' },
    disgusted: { emoji: '🤢', color: '#84cc16', label: 'Disgusted', labelVi: 'Ghê tởm', category: 'negative' },
    neutral: { emoji: '😐', color: '#6b7280', label: 'Neutral', labelVi: 'Bình thường', category: 'neutral' },
    // Extended
    very_happy: { emoji: '😄', color: '#10b981', label: 'Very Happy', labelVi: 'Rất vui', category: 'positive' },
    laughing: { emoji: '😆', color: '#10b981', label: 'Laughing', labelVi: 'Cười', category: 'positive' },
    smirking: { emoji: '😏', color: '#a855f7', label: 'Smirking', labelVi: 'Nhếch mép', category: 'special' },
    confused: { emoji: '😕', color: '#f59e0b', label: 'Confused', labelVi: 'Bối rối', category: 'neutral' },
    worried: { emoji: '😟', color: '#3b82f6', label: 'Worried', labelVi: 'Lo lắng', category: 'negative' },
    thinking: { emoji: '🤔', color: '#6366f1', label: 'Thinking', labelVi: 'Suy nghĩ', category: 'neutral' },
    sleepy: { emoji: '😪', color: '#6b7280', label: 'Sleepy', labelVi: 'Buồn ngủ', category: 'neutral' },
    kiss: { emoji: '😘', color: '#ec4899', label: 'Kiss', labelVi: 'Hôn', category: 'positive' },
    tongue_out: { emoji: '😛', color: '#f59e0b', label: 'Tongue Out', labelVi: 'Lè lưỡi', category: 'special' },
    wink: { emoji: '😉', color: '#a855f7', label: 'Wink', labelVi: 'Nháy mắt', category: 'special' },
    crying: { emoji: '😭', color: '#3b82f6', label: 'Crying', labelVi: 'Khóc', category: 'negative' },
    screaming: { emoji: '😱', color: '#ef4444', label: 'Screaming', labelVi: 'La hét', category: 'negative' },
    annoyed: { emoji: '😒', color: '#f59e0b', label: 'Annoyed', labelVi: 'Bực mình', category: 'negative' },
    concentrating: { emoji: '🧐', color: '#6366f1', label: 'Concentrating', labelVi: 'Tập trung', category: 'neutral' },
    poker_face: { emoji: '😶', color: '#6b7280', label: 'Poker Face', labelVi: 'Mặt đơ', category: 'neutral' },
    // New Additions
    suspicious: { emoji: '🤨', color: '#f59e0b', label: 'Suspicious', labelVi: 'Nghi ngờ', category: 'negative' },
    bored: { emoji: '🥱', color: '#9ca3af', label: 'Bored', labelVi: 'Chán', category: 'negative' },
    excited: { emoji: '🤩', color: '#eab308', label: 'Excited', labelVi: 'Hào hứng', category: 'positive' },
    shy: { emoji: '😳', color: '#fca5a5', label: 'Shy', labelVi: 'Ngại ngùng', category: 'neutral' },
    confident: { emoji: '😎', color: '#3b82f6', label: 'Confident', labelVi: 'Tự tin', category: 'positive' },
    arrogant: { emoji: '😤', color: '#7f1d1d', label: 'Arrogant', labelVi: 'Kiêu ngạo', category: 'negative' },
    humble: { emoji: '🙇', color: '#8b5cf6', label: 'Humble', labelVi: 'Khiêm tốn', category: 'positive' },
    grateful: { emoji: '🥰', color: '#ec4899', label: 'Grateful', labelVi: 'Biết ơn', category: 'positive' },
    regretful: { emoji: '😞', color: '#6b7280', label: 'Regretful', labelVi: 'Hối hận', category: 'negative' },
    hopeful: { emoji: '🤞', color: '#10b981', label: 'Hopeful', labelVi: 'Hy vọng', category: 'positive' },
    desperate: { emoji: '😩', color: '#1e293b', label: 'Desperate', labelVi: 'Tuyệt vọng', category: 'negative' },
    exhausted: { emoji: '😫', color: '#475569', label: 'Exhausted', labelVi: 'Kiệt sức', category: 'negative' },
    energetic: { emoji: '⚡', color: '#facc15', label: 'Energetic', labelVi: 'Năng nổ', category: 'positive' },
    anxious: { emoji: '😰', color: '#0f766e', label: 'Anxious', labelVi: 'Lo âu', category: 'negative' },
    relieved: { emoji: '😌', color: '#a7f3d0', label: 'Relieved', labelVi: 'Nhẹ nhõm', category: 'positive' },
    jealous: { emoji: '😒', color: '#16a34a', label: 'Jealous', labelVi: 'Ghen tị', category: 'negative' },
    envious: { emoji: '👿', color: '#4c1d95', label: 'Envious', labelVi: 'Đố kỵ', category: 'negative' },
    proud: { emoji: '🦁', color: '#f59e0b', label: 'Proud', labelVi: 'Tự hào', category: 'positive' },
    ashamed: { emoji: '😣', color: '#991b1b', label: 'Ashamed', labelVi: 'Xấu hổ', category: 'negative' },
    guilty: { emoji: '😓', color: '#374151', label: 'Guilty', labelVi: 'Tội lỗi', category: 'negative' }
};

export class AdvancedEmotionDetector {
    private minConfidence: number = 40;
    private blendshapeCache: Map<string, number> = new Map();

    setMinConfidence(value: number) { this.minConfidence = value; }

    detectEmotion(blendshapes: Category[]): Emotion | null {
        if (!blendshapes || blendshapes.length === 0) return null;
        this.cacheBlendshapes(blendshapes);

        // Calculate scores
        const scores: Partial<Record<EmotionType, number>> = {
            happy: this.calcHappy(), sad: this.calcSad(), angry: this.calcAngry(),
            surprised: this.calcSurprised(), fearful: this.calcFearful(), disgusted: this.calcDisgusted(),
            neutral: this.calcNeutral(), very_happy: this.calcVeryHappy(), laughing: this.calcLaughing(),
            smirking: this.calcSmirking(), confused: this.calcConfused(), worried: this.calcWorried(),
            thinking: this.calcThinking(), sleepy: this.calcSleepy(), kiss: this.calcKiss(),
            tongue_out: this.calcTongueOut(), wink: this.calcWink(), crying: this.calcCrying(),
            screaming: this.calcScreaming(), annoyed: this.calcAnnoyed(), concentrating: this.calcConcentrating(),
            poker_face: this.calcPokerFace(),
            // New Additions
            suspicious: this.calcSuspicious(), bored: this.calcBored(), excited: this.calcExcited(),
            shy: this.calcShy(), confident: this.calcConfident(), arrogant: this.calcArrogant(),
            humble: this.calcHumble(), grateful: this.calcGrateful(), regretful: this.calcRegretful(),
            hopeful: this.calcHopeful(), desperate: this.calcDesperate(), exhausted: this.calcExhausted(),
            energetic: this.calcEnergetic(), anxious: this.calcAnxious(), relieved: this.calcRelieved(),
            jealous: this.calcJealous(), envious: this.calcEnvious(), proud: this.calcProud(),
            ashamed: this.calcAshamed(), guilty: this.calcGuilty()
        };

        let maxType: EmotionType = 'neutral';
        let maxScore = scores.neutral || 0;

        Object.entries(scores).forEach(([type, score]) => {
            if (score && score > maxScore) {
                maxType = type as EmotionType;
                maxScore = score;
            }
        });

        if (maxScore < this.minConfidence && maxType !== 'neutral') return null;

        return {
            type: maxType,
            confidence: Math.min(100, Math.max(0, maxScore)),
            timestamp: Date.now(),
            blendshapes: Object.fromEntries(this.blendshapeCache)
        };
    }

    private cacheBlendshapes(blendshapes: Category[]) {
        this.blendshapeCache.clear();
        blendshapes.forEach(shape => {
            const name = shape.categoryName || shape.displayName; // Handle both
            if (name) this.blendshapeCache.set(name, shape.score * 100);
        });
    }

    private get(name: string) { return this.blendshapeCache.get(name) || 0; }

    // --- Algorithms ---
    private calcHappy() { return (this.get('mouthSmileLeft') * 0.35 + this.get('mouthSmileRight') * 0.35 + this.get('cheekSquintLeft') * 0.15 + this.get('cheekSquintRight') * 0.15); }
    private calcSad() { return (this.get('mouthFrownLeft') * 0.4 + this.get('mouthFrownRight') * 0.4 + this.get('browInnerUp') * 0.2); }
    private calcAngry() { return (this.get('browDownLeft') * 0.25 + this.get('browDownRight') * 0.25 + this.get('mouthPressLeft') * 0.15 + this.get('mouthPressRight') * 0.15); }
    private calcSurprised() { return (this.get('eyeWideLeft') * 0.25 + this.get('eyeWideRight') * 0.25 + this.get('jawOpen') * 0.3); }
    private calcFearful() { return (this.get('eyeWideLeft') * 0.25 + this.get('eyeWideRight') * 0.25 + this.get('browInnerUp') * 0.2 + this.get('mouthStretchLeft') * 0.15); }
    private calcDisgusted() { return (this.get('noseSneerLeft') * 0.35 + this.get('noseSneerRight') * 0.35 + this.get('mouthUpperUpLeft') * 0.15); }
    private calcNeutral() { return Math.max(0, 100 - (this.calcHappy() + this.calcSad() + this.calcAngry() + this.calcSurprised()) / 2); }

    // Extended
    private calcVeryHappy() { return Math.min(100, this.calcHappy() * 0.6 + this.get('jawOpen') * 0.2 + this.get('eyeSquintLeft') * 0.2); }
    private calcLaughing() { return Math.min(100, this.calcVeryHappy() * 0.5 + this.get('jawOpen') * 0.3 + this.get('cheekPuff') * 0.2); }
    private calcSmirking() { return Math.min(100, Math.abs(this.get('mouthSmileLeft') - this.get('mouthSmileRight')) * 0.5 + this.get('mouthPressLeft') * 0.3 + 30); }
    private calcConfused() { return Math.min(100, this.get('browInnerUp') * 0.4 + Math.abs(this.get('browDownLeft') - this.get('browDownRight')) * 0.3); }
    private calcWorried() { return (this.get('browInnerUp') * 0.35 + this.get('mouthFrownLeft') * 0.17); }
    private calcThinking() { return (this.get('mouthPucker') * 0.3 + this.get('browDownLeft') * 0.2 + this.get('eyeSquintLeft') * 0.15); }
    private calcSleepy() { return (this.get('eyeBlinkLeft') * 0.3 + this.get('eyeBlinkRight') * 0.3 + this.get('jawOpen') * 0.1); }
    private calcKiss() { return (this.get('mouthPucker') * 0.5 + this.get('mouthFunnel') * 0.3); }
    private calcTongueOut() { return (this.get('tongueOut') * 0.8 + this.get('jawOpen') * 0.2); }
    private calcWink() {
        // User Algorithm: asymmetry * 70% + smile * 30%
        const asymmetry = Math.abs(this.get('eyeBlinkLeft') - this.get('eyeBlinkRight'));
        const smile = (this.get('mouthSmileLeft') + this.get('mouthSmileRight')) / 2;
        return (asymmetry * 0.7 + smile * 0.3);
    }
    private calcCrying() { return Math.min(100, this.calcSad() * 0.5 + this.get('jawOpen') * 0.2 + this.get('eyeSquintLeft') * 0.1); }
    private calcScreaming() { return Math.min(100, this.get('jawOpen') * 0.5 + this.get('eyeWideLeft') * 0.3); }
    private calcAnnoyed() { return (this.get('eyeSquintLeft') * 0.2 + this.get('browDownLeft') * 0.175); }
    private calcConcentrating() { return (this.get('eyeSquintLeft') * 0.2 + this.get('browDownLeft') * 0.15 + this.get('mouthPressLeft') * 0.15); }
    private calcPokerFace() { return Math.max(0, 100 - (this.get('jawOpen') + this.get('mouthSmileLeft') + this.get('browInnerUp')) * 2); }

    // --- New Emotions Calculations ---
    private calcSuspicious() { return (this.get('browDownLeft') + this.get('browDownRight')) * 0.4 + (this.get('eyeSquintLeft') + this.get('eyeSquintRight')) * 0.4 + this.get('mouthFrownLeft') * 0.2; }
    private calcBored() { return (this.get('eyeBlinkLeft') + this.get('eyeBlinkRight')) * 0.2 + this.get('mouthClose') * 0.3 + (1 - this.get('jawOpen')) * 0.5; }
    private calcExcited() { return (this.get('eyeWideLeft') + this.get('eyeWideRight')) * 0.4 + this.get('mouthSmileLeft') * 0.3 + this.get('jawOpen') * 0.3; }
    private calcShy() { return (this.get('eyeLookDownLeft') + this.get('eyeLookDownRight')) * 0.5 + this.get('mouthSmileLeft') * 0.2; }
    private calcConfident() { return (this.get('browInnerUp') * 0.3 + (1 - this.get('browDownLeft')) * 0.2 + this.get('mouthSmileLeft') * 0.2 + this.get('jawForward') * 0.3); }
    private calcArrogant() { return this.get('eyeLookDownLeft') * 0.3 + this.get('browOuterUpLeft') * 0.3 + this.get('mouthFrownLeft') * 0.2 + this.get('jawForward') * 0.2; }
    private calcHumble() { return this.get('eyeLookDownLeft') * 0.4 + this.get('browInnerUp') * 0.3 + this.get('mouthSmileLeft') * 0.3; }
    private calcGrateful() { return this.get('eyeSquintLeft') * 0.3 + this.get('mouthSmileLeft') * 0.4 + this.get('browInnerUp') * 0.3; }
    private calcRegretful() { return this.get('browInnerUp') * 0.4 + this.get('mouthFrownLeft') * 0.3 + this.get('eyeLookDownLeft') * 0.3; }
    private calcHopeful() { return this.get('eyeWideLeft') * 0.3 + this.get('browInnerUp') * 0.4 + this.get('mouthSmileLeft') * 0.3; }
    private calcDesperate() { return this.get('browInnerUp') * 0.5 + this.get('mouthFrownLeft') * 0.3 + this.get('eyeWideLeft') * 0.2; }
    private calcExhausted() { return this.get('eyeBlinkLeft') * 0.4 + this.get('mouthPucker') * 0.2 + (this.get('jawOpen') * 0.4); }
    private calcEnergetic() { return this.get('eyeWideLeft') * 0.4 + this.get('mouthSmileLeft') * 0.3 + this.get('browOuterUpLeft') * 0.3; }
    private calcAnxious() { return this.get('jawLeft') * 0.3 + this.get('mouthPucker') * 0.2 + this.get('browInnerUp') * 0.2 + this.get('eyeSquintLeft') * 0.3; }
    private calcRelieved() { return this.get('mouthSmileLeft') * 0.3 + this.get('eyeBlinkLeft') * 0.4 + (1 - this.get('browDownLeft')) * 0.3; }
    private calcJealous() { return this.get('eyeSquintLeft') * 0.4 + this.get('mouthFrownLeft') * 0.3 + this.get('browDownLeft') * 0.3; }
    private calcEnvious() { return this.get('eyeSquintLeft') * 0.4 + this.get('mouthFrownLeft') * 0.4 + this.get('jawForward') * 0.2; }
    private calcProud() { return this.get('jawForward') * 0.4 + this.get('mouthSmileLeft') * 0.3 + this.get('browOuterUpLeft') * 0.3; }
    private calcAshamed() { return this.get('eyeLookDownLeft') * 0.6 + this.get('browInnerUp') * 0.2 + this.get('mouthFrownLeft') * 0.2; }
    private calcGuilty() { return this.get('eyeLookDownLeft') * 0.4 + this.get('eyeSquintLeft') * 0.3 + this.get('mouthFrownLeft') * 0.3; }
}

export class EmotionStatsTracker {
    private stats: EmotionStats = createEmptyStats();
    private history: { type: string, t: number }[] = [];

    record(emotion: Emotion) {
        this.stats.total++;
        // @ts-ignore
        if (this.stats[emotion.type] !== undefined) this.stats[emotion.type]++;
        this.history.push({ type: emotion.type, t: emotion.timestamp });
        if (this.history.length > 5000) this.history.shift();
    }

    getStats(): EmotionStats { return { ...this.stats }; }

    reset() {
        this.stats = createEmptyStats();
        this.history = [];
    }

    export() {
        return JSON.stringify({ stats: this.stats, history: this.history, timestamp: Date.now() }, null, 2);
    }
}

interface FloatingEmoji {
    id: number;
    emoji: string;
    x: number; y: number;
    vy: number;
    scale: number;
    opacity: number;
    life: number;
}

export class FloatingEmojiManager {
    private emojis: FloatingEmoji[] = [];
    private nextId = 0;

    spawn(emotion: Emotion, x: number, y: number) {
        const config = EMOTION_CONFIG[emotion.type];
        if (!config) return;
        this.emojis.push({
            id: this.nextId++,
            emoji: config.emoji,
            x, y,
            vy: -2,
            scale: 0.5,
            opacity: 1,
            life: 1.0
        });
    }

    update() {
        this.emojis.forEach(e => {
            e.y += e.vy;
            e.life -= 0.015;
            if (e.life > 0.8) e.scale += 0.05;
            if (e.life < 0.3) e.opacity = e.life / 0.3;
        });
        this.emojis = this.emojis.filter(e => e.life > 0);
    }

    draw(ctx: CanvasRenderingContext2D, emoji?: FloatingEmoji) {
        const drawItem = (e: FloatingEmoji) => {
            ctx.save();
            ctx.globalAlpha = e.opacity;
            ctx.font = `${Math.round(40 * e.scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255,255,255,0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText(e.emoji, e.x, e.y);
            ctx.restore();
        };

        if (emoji) drawItem(emoji);
    }

    getEmojis() { return this.emojis; }
    clear() { this.emojis = []; }
}
