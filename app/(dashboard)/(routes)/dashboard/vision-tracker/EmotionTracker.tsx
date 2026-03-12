'use client';

import './mediapipe-console-filter';
import { useEffect, useRef, useState } from 'react';
import {
    FaceLandmarker,
    FilesetResolver,
    DrawingUtils
} from '@mediapipe/tasks-vision';
import './emotion-tracker.css';
import {
    AdvancedEmotionDetector,
    EmotionStatsTracker,
    FloatingEmojiManager,
    EMOTION_CONFIG,
    EmotionType,
    Emotion,
    EmotionStats,
    createEmptyStats
} from './advanced-emotion-recognition';

export default function EmotionTracker() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0); // Fix type

    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Emotion detection
    const emotionDetectorRef = useRef<AdvancedEmotionDetector>(new AdvancedEmotionDetector());
    const statsTrackerRef = useRef<EmotionStatsTracker>(new EmotionStatsTracker());
    const emojiManagerRef = useRef<FloatingEmojiManager>(new FloatingEmojiManager());

    // State
    const [cameraActive, setCameraActive] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Emotion state
    const [currentEmotion, setCurrentEmotion] = useState<Emotion | null>(null);
    const [emotionStats, setEmotionStats] = useState<EmotionStats>(createEmptyStats());
    const [minConfidence, setMinConfidence] = useState(40);

    // Last emoji spawn time (debounce)
    const lastEmojiSpawnRef = useRef<number>(0);

    // Helper to get face center
    const getFaceCenter = (landmarks: any[], width: number, height: number) => {
        // Use nose tip (landmark 1) as center
        const nose = landmarks[1];
        return {
            x: (1 - nose.x) * width, // Mirror X
            y: nose.y * height
        };
    };

    // Initialize MediaPipe
    const startCamera = async () => {
        if (isStarted) return;

        setIsStarted(true);
        setErrorMessage('');

        try {
            const wasmBase = typeof window !== "undefined" ? `${window.location.origin}/api/mediapipe-wasm/wasm` : "/api/mediapipe-wasm/wasm";
            const vision = await FilesetResolver.forVisionTasks(wasmBase);

            const faces = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5,
                outputFaceBlendshapes: true // CRITICAL: Enable blendshapes!
            });
            setFaceLandmarker(faces);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                videoRef.current.onloadedmetadata = async () => {
                    try {
                        if (videoRef.current) {
                            await videoRef.current.play();
                            setCameraActive(true);
                            setIsInitialized(true);
                        }
                    } catch (playError) {
                        setTimeout(async () => {
                            try {
                                if (videoRef.current) {
                                    await videoRef.current.play();
                                    setCameraActive(true);
                                    setIsInitialized(true);
                                }
                            } catch (retryError) {
                                setErrorMessage('❌ Không thể phát video.');
                                setIsStarted(false);
                            }
                        }, 100);
                    }
                };
            }
        } catch (error: any) {
            console.error('Initialization error:', error);
            setIsStarted(false);
            setErrorMessage(`❌ Lỗi: ${error.message}`);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }

        setCameraActive(false);
        setIsInitialized(false);
        setIsStarted(false);
        setFaceDetected(false);
    };

    useEffect(() => {
        return () => {
            stopCamera();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Update min confidence
    useEffect(() => {
        emotionDetectorRef.current.setMinConfidence(minConfidence);
    }, [minConfidence]);

    // Main detection loop
    useEffect(() => {
        if (!isInitialized || !faceLandmarker) return;

        const detect = () => {
            if (!videoRef.current || !canvasRef.current) {
                animationRef.current = requestAnimationFrame(detect);
                return;
            }

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx || video.readyState < 2) {
                animationRef.current = requestAnimationFrame(detect);
                return;
            }

            const startTime = performance.now();

            // Clear and draw video (mirrored)
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
            ctx.restore();

            // Detect faces
            const faceResults = faceLandmarker.detectForVideo(video, startTime);

            if (faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
                setFaceDetected(true);
                const faceLandmarks = faceResults.faceLandmarks[0];

                // Draw face mesh (subtle)
                const drawingUtils = new DrawingUtils(ctx);
                drawingUtils.drawConnectors(
                    faceLandmarks,
                    FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                    { color: 'rgba(255, 255, 255, 0.1)', lineWidth: 1 }
                );

                // Detect emotion from blendshapes
                if (faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
                    const blendshapes = faceResults.faceBlendshapes[0].categories;

                    const emotion = emotionDetectorRef.current.detectEmotion(blendshapes);

                    if (emotion) {
                        setCurrentEmotion(emotion);

                        // Record statistics
                        statsTrackerRef.current.record(emotion);
                        setEmotionStats(statsTrackerRef.current.getStats());

                        // Spawn floating emoji (debounced - once per second)
                        const now = Date.now();
                        if (now - lastEmojiSpawnRef.current > 1000) {
                            // Spawn at face center
                            const faceCenter = getFaceCenter(faceLandmarks, canvas.width, canvas.height);
                            emojiManagerRef.current.spawn(
                                emotion,
                                faceCenter.x,
                                faceCenter.y - 100 // Above face
                            );
                            lastEmojiSpawnRef.current = now;
                        }
                    }
                }
            } else {
                setFaceDetected(false);
                setCurrentEmotion(null);
            }

            // Update and draw floating emojis
            emojiManagerRef.current.update();
            const emojis = emojiManagerRef.current.getEmojis();
            emojis.forEach(emoji => {
                emojiManagerRef.current.draw(ctx, emoji);
            });

            // Draw current emotion label
            if (currentEmotion) {
                const config = EMOTION_CONFIG[currentEmotion.type];

                ctx.save();
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = config.color;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4;

                const text = `${config.emoji} ${config.labelVi} (${Math.round(currentEmotion.confidence)}%)`;
                ctx.fillText(text, canvas.width / 2, 40);
                ctx.restore();
            }

            animationRef.current = requestAnimationFrame(detect);
        };

        detect();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isInitialized, faceLandmarker, currentEmotion]);

    const resetStats = () => {
        statsTrackerRef.current.reset();
        setEmotionStats(createEmptyStats());
        emojiManagerRef.current.clear();
    };

    const exportStats = () => {
        const data = statsTrackerRef.current.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emotion-stats-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Calculate percentages
    const percentages = emotionStats.total > 0 ? Object.entries(EMOTION_CONFIG).reduce((acc, [key, _]) => {
        const emotionKey = key as EmotionType;
        acc[emotionKey] = (emotionStats[emotionKey] / emotionStats.total) * 100;
        return acc;
    }, {} as Record<EmotionType, number>) : {} as Record<EmotionType, number>;

    // Get top 5 emotions
    const topEmotions = Object.entries(percentages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .filter(([, pct]) => pct > 0);

    return (
        <div className="emotion-tracker-container">
            <div className="emotion-header">
                <h1>😊 Theo Dõi Cảm Xúc với MediaPipe Face Blendshapes</h1>
                <p className="emotion-subtitle">Phát hiện 22 biểu cảm từ 52 facial blendshapes • Floating emoji animations</p>
            </div>

            <div className="main-layout">
                <div className="left-panel">
                    <div className="camera-section">
                        <div className="section-header">
                            <h2>📷 Camera & Emotion Detection</h2>
                        </div>

                        <div className="video-canvas-container">
                            <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline />
                            <canvas
                                ref={canvasRef}
                                width={640}
                                height={480}
                                style={{ display: isInitialized ? 'block' : 'none' }}
                            />

                            {!isInitialized && (
                                <div className="camera-placeholder">
                                    <div className="placeholder-content">
                                        <div className="placeholder-icon">📹</div>
                                        <h3>Camera chưa được kích hoạt</h3>
                                        <p>Nhấn "Bắt đầu" để khởi động</p>
                                        {errorMessage && (
                                            <div className="error-message">{errorMessage}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Current Emotion Display */}
                        {isInitialized && currentEmotion && (
                            <div className="current-emotion-card" style={{
                                borderColor: EMOTION_CONFIG[currentEmotion.type].color
                            }}>
                                <div className="emotion-emoji">
                                    {EMOTION_CONFIG[currentEmotion.type].emoji}
                                </div>
                                <div className="emotion-info">
                                    <div className="emotion-name">
                                        {EMOTION_CONFIG[currentEmotion.type].labelVi}
                                    </div>
                                    <div className="emotion-confidence">
                                        Độ tin cậy: {Math.round(currentEmotion.confidence)}%
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="control-section">
                            {!isStarted ? (
                                <button className="btn-start" onClick={startCamera}>
                                    ▶️ Bắt đầu
                                </button>
                            ) : (
                                <>
                                    <button className="btn-stop" onClick={stopCamera}>
                                        ⏹️ Dừng
                                    </button>
                                    <button className="btn-reset" onClick={resetStats}>
                                        🔄 Đặt lại thống kê
                                    </button>
                                    <button className="btn-export" onClick={exportStats}>
                                        💾 Xuất dữ liệu
                                    </button>
                                </>
                            )}

                            {/* Min Confidence Slider */}
                            {isInitialized && (
                                <div className="confidence-control">
                                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: 600 }}>
                                            Độ tin cậy tối thiểu: {minConfidence}%
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={minConfidence}
                                            onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                                            className="confidence-slider"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="right-panel">
                    <h2>📊 Thống Kê Cảm Xúc</h2>

                    {/* Total Count */}
                    <div className="total-count-card">
                        <div className="count-icon">🎯</div>
                        <div className="count-info">
                            <div className="count-label">Tổng số phát hiện</div>
                            <div className="count-value">{emotionStats.total}</div>
                        </div>
                    </div>

                    {/* Top 5 Emotions */}
                    {topEmotions.length > 0 && (
                        <div className="top-emotions">
                            <h3>🏆 Top 5 Cảm Xúc</h3>
                            <div className="emotion-bars">
                                {topEmotions.map(([emotion, percentage]) => {
                                    const emotionType = emotion as EmotionType;
                                    const config = EMOTION_CONFIG[emotionType];
                                    const count = emotionStats[emotionType];

                                    return (
                                        <div key={emotion} className="emotion-bar-item">
                                            <div className="emotion-bar-header">
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="emotion-bar-emoji">{config.emoji}</span>
                                                    <span className="emotion-bar-label">{config.labelVi}</span>
                                                </span>
                                                <span className="emotion-bar-count">{count}</span>
                                            </div>
                                            <div className="emotion-bar-container">
                                                <div
                                                    className="emotion-bar-fill"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: config.color
                                                    }}
                                                />
                                            </div>
                                            <div className="emotion-bar-percentage">
                                                {percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* All Emotions Grid */}
                    <div className="all-emotions-grid">
                        <h3>📋 Tất Cả Cảm Xúc</h3>
                        <div className="emotion-grid">
                            {Object.entries(EMOTION_CONFIG).map(([emotion, config]) => {
                                const emotionType = emotion as EmotionType;
                                const count = emotionStats[emotionType];
                                const percentage = percentages[emotionType] || 0;

                                return (
                                    <div
                                        key={emotion}
                                        className={`emotion-grid-item ${count > 0 ? 'active' : ''}`}
                                        style={{ borderColor: count > 0 ? config.color : 'transparent' }}
                                    >
                                        <div className="emotion-grid-emoji">{config.emoji}</div>
                                        <div className="emotion-grid-label">{config.labelVi}</div>
                                        <div className="emotion-grid-count">{count}</div>
                                        {percentage > 0 && (
                                            <div className="emotion-grid-percentage">
                                                {percentage.toFixed(1)}%
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="status-group">
                        <div className="status-item">
                            <span className="status-label">Camera:</span>
                            <span className={`status-value ${cameraActive ? 'active' : ''}`}>
                                {cameraActive ? 'Hoạt động' : 'Tắt'}
                            </span>
                        </div>

                        <div className="status-item">
                            <span className="status-label">Mặt phát hiện:</span>
                            <span className={`status-value ${faceDetected ? 'active' : ''}`}>
                                {faceDetected ? 'Có' : 'Không'}
                            </span>
                        </div>

                        <div className="status-item">
                            <span className="status-label">Cảm xúc hiện tại:</span>
                            <span className="status-value">
                                {currentEmotion ? EMOTION_CONFIG[currentEmotion.type].emoji : '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
