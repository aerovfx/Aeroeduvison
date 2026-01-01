
import React, { useRef, useEffect, useState } from 'react';
import Script from 'next/script';
import { SignLanguageDetector } from './sign-language-detector';
import { SignLanguageType, SIGN_CONFIG, getSignsByCategory } from './sign-language-config';

// Add MediaPipe types
declare global {
    interface Window {
        Hands: any;
        Camera: any;
        DrawingUtils: any;
    }
}

type Mode = 'practice' | 'alphabet' | 'numbers' | 'words' | 'quiz';

export default function SignLanguageTracker() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handsRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const detectorRef = useRef<SignLanguageDetector>(new SignLanguageDetector());
    const [status, setStatus] = useState('Initializing...');
    const [currentSign, setCurrentSign] = useState<SignLanguageType | 'UNKNOWN'>('UNKNOWN');
    const [mode, setMode] = useState<Mode>('practice');
    const [quizTarget, setQuizTarget] = useState<SignLanguageType | null>(null);
    const [score, setScore] = useState(0);
    const [totalQuiz, setTotalQuiz] = useState(0);

    useEffect(() => {
        let isMounted = true;

        async function init() {
            if (typeof window === 'undefined' || !window.Hands || !window.Camera) return;

            const hands = new window.Hands({
                locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            hands.onResults(onResults);
            handsRef.current = hands;

            if (videoRef.current) {
                const camera = new window.Camera(videoRef.current, {
                    onFrame: async () => {
                        if (videoRef.current && handsRef.current) {
                            await handsRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 1280,
                    height: 720
                });
                camera.start();
                cameraRef.current = camera;
                setStatus('Ready to specific signs!');
            }
        }

        // Delay init to allow scripts to load
        const timer = setTimeout(init, 1000);
        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (cameraRef.current) cameraRef.current.stop();
        };
    }, []);

    const onResults = (results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw skeleton
                const drawingUtils = new (window as any).DrawingUtils(ctx);
                drawingUtils.drawConnectors(landmarks, (window as any).Hands.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
                drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1 });

                // Detect Sign
                const detected = detectorRef.current.detect(landmarks);
                if (detected !== 'UNKNOWN') {
                    setCurrentSign(detected);

                    // Quiz Logic
                    if (mode === 'quiz' && quizTarget && detected === quizTarget) {
                        setScore(s => s + 1);
                        setTotalQuiz(t => t + 1);
                        nextQuiz();
                    }
                }
            }
        }
        ctx.restore();
    };

    const nextQuiz = () => {
        const categories = ['alphabet', 'number', 'word', 'special'] as const;
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const signs = getSignsByCategory(randomCat as any);
        const randomSign = signs[Math.floor(Math.random() * signs.length)];
        setQuizTarget(randomSign);
    };

    const startQuiz = () => {
        setMode('quiz');
        setScore(0);
        setTotalQuiz(0);
        nextQuiz();
    };

    // --- UI Components ---

    const renderTabs = () => (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {(['practice', 'alphabet', 'numbers', 'words', 'quiz'] as const).map(m => (
                <button
                    key={m}
                    onClick={() => m === 'quiz' ? startQuiz() : setMode(m)}
                    className={`px-4 py-2 rounded-lg capitalize font-bold transition-all ${mode === m ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    {m} Mode
                </button>
            ))}
        </div>
    );

    const renderSignGrid = (category: any) => {
        const signs = getSignsByCategory(category);
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-1">
                {signs.map(sign => {
                    const config = SIGN_CONFIG[sign];
                    const isActive = currentSign === sign;
                    return (
                        <div key={sign} className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${isActive ? 'bg-emerald-500/20 border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20' : 'bg-gray-800 border-gray-700 opacity-60'}`}>
                            <div className="text-3xl">{config.emoji}</div>
                            <div className="font-bold text-white">{config.nameEn}</div>
                            <div className="text-xs text-gray-400">{config.nameVi}</div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderQuizPanel = () => {
        if (!quizTarget) return null;
        const config = SIGN_CONFIG[quizTarget];
        return (
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col items-center gap-4 text-center">
                <div className="text-sm uppercase tracking-widest text-emerald-400 font-bold">🎯 Your Mission</div>
                <div className="text-6xl animate-bounce">{config.emoji}</div>
                <div>
                    <div className="text-2xl font-bold text-white mb-1">Make sign: <span className="text-emerald-400">{config.nameEn}</span></div>
                    <div className="text-gray-400">{config.nameVi}</div>
                </div>
                <div className="text-sm bg-gray-900 px-4 py-2 rounded-lg text-gray-300 border border-gray-700">
                    💡 Hint: {config.description}
                </div>
                <div className="flex gap-8 mt-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">{score}</div>
                        <div className="text-xs text-gray-500 uppercase">Correct</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-gray-500">{totalQuiz}</div>
                        <div className="text-xs text-gray-600 uppercase">Total</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#0f1014] text-white p-4 font-sans">
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils" strategy="lazyOnload" />

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Header */}
                <div className="lg:col-span-12 flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500">Sign Language Master 🤟</h1>
                        <p className="text-gray-400 text-sm">Learn & Practice Vietnamese Sign Language (VSL)</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-mono ${status.includes('Ready') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {status}
                    </div>
                </div>

                {/* Main Camera Area */}
                <div className="lg:col-span-8 relative rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-2xl aspect-video group">
                    <video ref={videoRef} className="hidden" playsInline muted autoPlay></video>
                    <canvas ref={canvasRef} className="w-full h-full object-cover transform scale-x-[-1]" width={1280} height={720}></canvas>

                    {/* Overlay: Current Detection */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 flex items-center gap-3">
                        <span className="text-2xl">{currentSign !== 'UNKNOWN' ? SIGN_CONFIG[currentSign]?.emoji : '❓'}</span>
                        <span className="font-bold text-lg">{currentSign !== 'UNKNOWN' ? SIGN_CONFIG[currentSign]?.nameVi : 'Waiting...'}</span>
                    </div>

                    <div className="absolute bottom-4 left-4 text-xs text-white/50 bg-black/40 px-2 py-1 rounded">
                        Camera: 1280x720 • FPS: Realtime
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="lg:col-span-4 flex flex-col h-full gap-4">
                    {/* Tabs */}
                    {renderTabs()}

                    {/* Dynamic Content based on Mode */}
                    <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-800 p-4">
                        {mode === 'practice' && (
                            <div className="space-y-4">
                                <div className="text-center p-8 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                                    <div className="text-4xl mb-2">👋</div>
                                    <h3 className="font-bold text-lg">Free Practice Mode</h3>
                                    <p className="text-gray-400 text-sm">Make any sign to see detection.</p>
                                </div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-8">Recent Detections</div>
                                {/* Placeholder for history if needed */}
                            </div>
                        )}

                        {mode === 'alphabet' && (
                            <div>
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">🔤 Alphabet <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">26 Signs</span></h3>
                                {renderSignGrid('alphabet')}
                            </div>
                        )}

                        {mode === 'numbers' && (
                            <div>
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">🔢 Numbers <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">0-10</span></h3>
                                {renderSignGrid('number')}
                            </div>
                        )}

                        {mode === 'words' && (
                            <div>
                                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">💬 Vocabulary <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Common Words</span></h3>
                                {renderSignGrid('word')}
                            </div>
                        )}

                        {mode === 'quiz' && renderQuizPanel()}
                    </div>

                    {/* Info Card */}
                    {currentSign !== 'UNKNOWN' && mode !== 'quiz' && (
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl animate-fade-in">
                            <div className="flex items-start gap-3">
                                <div className="text-4xl bg-black/20 p-2 rounded-lg">{SIGN_CONFIG[currentSign]?.emoji}</div>
                                <div>
                                    <div className="font-bold text-emerald-400 text-lg">{SIGN_CONFIG[currentSign]?.nameVi}</div>
                                    <div className="text-white text-md font-medium">{SIGN_CONFIG[currentSign]?.nameEn}</div>
                                    <div className="text-gray-400 text-xs mt-1 leading-relaxed">{SIGN_CONFIG[currentSign]?.description}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
