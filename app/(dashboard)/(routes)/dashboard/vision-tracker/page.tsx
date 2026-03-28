// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { AdvancedEmotionDetector, EmotionStatsTracker, FloatingEmojiManager, EMOTION_CONFIG } from './advanced-emotion-recognition';
import { SignLanguageDetector } from './sign-language-detector';
import { SIGN_CONFIG } from './sign-language-config';
import SafeMediaPipeDetector from './SafeMediaPipeDetector';

export default function VisionTrackerPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState('Initializing...');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Logic Refs
    const emotionDetectorRef = useRef<AdvancedEmotionDetector | null>(null);
    const statsTrackerRef = useRef<EmotionStatsTracker | null>(null);
    const emojiManagerRef = useRef<FloatingEmojiManager | null>(null);
    const faceLandmarkerRef = useRef<any>(null);
    const mediaPipeVisionRef = useRef<{ FaceLandmarker: any; DrawingUtils: any } | null>(null);
    const handsRef = useRef<any>(null); // Legacy Hands
    const cameraRef = useRef<any>(null);
    const lastVideoTimeRef = useRef(-1);
    const signDetectorRef = useRef<SignLanguageDetector | null>(null);
    // Buffer biểu cảm để gửi gộp mỗi 30s → giảm tải (không gửi từng frame)
    const emotionBufferRef = useRef<{ emotionType: string; confidence: number }[]>([]);
    const emotionFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Guard: MediaPipe WASM must only be initialized once per page (avoids "Module.arguments" error with StrictMode double-mount)
    const visionInitOnceRef = useRef(false);

    // Initializer
    useEffect(() => {
        // Global error handler for WebGL errors
        const handleError = (event: ErrorEvent) => {
            if (event.message?.includes('maxTextureDimension2D') || 
                event.message?.includes('WebGL') ||
                event.message?.includes('WEBGL')) {
                console.error('❌ [Vision Tracker] Caught global WebGL error:', event.message);
                setStatus('GPU không hỗ trợ');
                setErrorMsg('WebGL/WebGPU không khả dụng trên thiết bị này. Vui lòng cập nhật trình duyệt hoặc driver.');
                event.preventDefault();
            }
        };

        window.addEventListener('error', handleError);

        // Initialize helpers
        emotionDetectorRef.current = new AdvancedEmotionDetector();
        statsTrackerRef.current = new EmotionStatsTracker();
        emojiManagerRef.current = new FloatingEmojiManager();
        signDetectorRef.current = new SignLanguageDetector();

        const initAI = async () => {
            try {
                // Check WebGL support before initializing
                const checkWebGLSupport = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        if (!gl) {
                            return false;
                        }
                        // Check for required extensions
                        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                        if (debugInfo) {
                            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                            console.log('WebGL Renderer:', renderer);
                        }
                        // Check max texture size
                        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                        console.log('Max Texture Size:', maxTextureSize);
                        if (maxTextureSize < 2048) {
                            console.warn('⚠️ Max texture size too small:', maxTextureSize);
                            return false;
                        }
                        return true;
                    } catch (e) {
                        console.error('WebGL support check failed:', e);
                        return false;
                    }
                };

                if (!checkWebGLSupport()) {
                    throw new Error('WebGL not supported or insufficient capabilities');
                }

                // Initialize new helpers
                initHeatmap();
                initActionUnits();

                // 1. Setup Vision Tasks (Face) — load MediaPipe only in browser via dynamic import (avoids SSR/Event errors)
                if (!visionInitOnceRef.current) {
                    visionInitOnceRef.current = true;
                    const MP = await import("@mediapipe/tasks-vision").catch((e) => {
                        visionInitOnceRef.current = false;
                        throw new Error(`MediaPipe load failed: ${e?.message || (e && typeof e === 'object' && 'type' in e ? `event ${(e as Event).type}` : String(e))}`);
                    });
                    const { FaceLandmarker: FL, FilesetResolver: FSR, DrawingUtils: DU } = MP;
                    if (!FL || !FSR || !DU) {
                        visionInitOnceRef.current = false;
                        throw new Error("MediaPipe module missing FaceLandmarker/FilesetResolver/DrawingUtils");
                    }
                    mediaPipeVisionRef.current = { FaceLandmarker: FL, DrawingUtils: DU };
                    // Serve WASM/JS via API route with correct MIME (avoids HTML 404 → "Unexpected token '<'" / ModuleFactory not set)
                    const wasmBase = typeof window !== "undefined" ? `${window.location.origin}/api/mediapipe-wasm/wasm` : "/api/mediapipe-wasm/wasm";
                    const vision = await FSR.forVisionTasks(wasmBase);
                    faceLandmarkerRef.current = await FL.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                            delegate: "CPU"
                        },
                        outputFaceBlendshapes: true,
                        runningMode: "VIDEO",
                        numFaces: 1
                    });
                    console.log("FaceLandmarker loaded");
                }

                // 2. Setup Legacy Hands (Check global window)
                const initHands = () => {
                    if (window.Hands && window.Camera) {
                        handsRef.current = new window.Hands({
                            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                        });
                        handsRef.current.setOptions({
                            maxNumHands: 2,
                            modelComplexity: 1,
                            minDetectionConfidence: 0.5,
                            minTrackingConfidence: 0.5
                        });
                        handsRef.current.onResults(onHandResults);

                        // Start Camera
                        if (videoRef.current) {
                            cameraRef.current = new window.Camera(videoRef.current, {
                                onFrame: async () => {
                                    if (videoRef.current) {
                                        // Send to Hands
                                        await handsRef.current.send({ image: videoRef.current });
                                    }
                                },
                                width: 1920,
                                height: 1080
                            });
                            cameraRef.current.start();
                            if (canvasRef.current) {
                                canvasRef.current.width = 1920;
                                canvasRef.current.height = 1080;
                            }
                            setStatus("System Ready");
                        }
                    } else {
                        setTimeout(initHands, 500);
                    }
                };
                initHands();
                initChart(); // Initialize charts
                // Gửi buffer biểu cảm mỗi 30s để giảm tải
                emotionFlushIntervalRef.current = setInterval(() => {
                    const buf = emotionBufferRef.current;
                    if (buf.length === 0) return;
                    emotionBufferRef.current = [];
                    fetch('/api/vision-tracker/emotion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ samples: buf })
                    }).catch(() => {});
                }, 30000);
            } catch (error) {
                visionInitOnceRef.current = false; // allow retry on next mount/reload
                let msg: string;
                let name = "Error";
                if (error instanceof Error) {
                    msg = error.message;
                    name = error.name;
                } else if (error && typeof error === "object" && "type" in error && typeof (error as Event).target !== "undefined") {
                    const ev = error as Event;
                    msg = `Load failed (${ev.type}): ${ev.target ? String((ev.target as any)?.src || (ev.target as any)?.href || "unknown") : "unknown"}`;
                } else {
                    msg = String(error);
                }
                
                // Handle WebGL/WebGPU errors
                if (msg.includes('maxTextureDimension2D') || msg.includes('WebGL') || msg.includes('WebGPU')) {
                    console.error("❌ [Vision Tracker] GPU/WebGL Error:", msg);
                    setStatus("GPU không hỗ trợ - WebGL/WebGPU không khả dụng");
                    setErrorMsg("Trình duyệt hoặc GPU của bạn không hỗ trợ WebGL/WebGPU cần thiết cho Vision Tracker. Vui lòng cập nhật trình duyệt hoặc driver đồ họa.");
                } else {
                    console.error("Failed to init AI:", name, msg, error);
                    setStatus("Error loading AI models");
                    setErrorMsg(msg);
                }
            }
        };

        if (window) initAI();

        return () => {
            // Cleanup error handler
            window.removeEventListener('error', handleError);
            
            // Stop camera
            if (cameraRef.current) {
                try {
                    cameraRef.current.stop();
                } catch (e) {
                    console.warn('Error stopping camera:', e);
                }
            }
            
            // Release hands
            if (handsRef.current) {
                try {
                    handsRef.current.close();
                } catch (e) {
                    console.warn('Error closing hands:', e);
                }
            }
            
            // Clear intervals
            if (emotionFlushIntervalRef.current) {
                clearInterval(emotionFlushIntervalRef.current);
                emotionFlushIntervalRef.current = null;
            }
            
            // Flush lần cuối nếu còn
            const buf = emotionBufferRef.current;
            if (buf.length > 0) {
                emotionBufferRef.current = [];
                fetch('/api/vision-tracker/emotion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ samples: buf }) }).catch(() => {});
            }
        };
    }, []);

    const processFaceFrame = () => {
        // Triggered by Camera onFrame
    };

    // We store face result to draw it inside `onHandResults` loop to prevent clearing
    const latestFaceResultRef = useRef<any>(null);

    const onHandResults = (handResults: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Video
        ctx.drawImage(handResults.image, 0, 0, canvas.width, canvas.height);

        // 2. Process & Draw Face (Using latest data available)
        if (faceLandmarkerRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            const video = videoRef.current;
            if (video && video.videoWidth > 0 && video.videoHeight > 0) {
                const videoTimeMs = video.currentTime * 1000;
                if (videoTimeMs > lastVideoTimeRef.current) {
                    lastVideoTimeRef.current = videoTimeMs;

                    const faceResult = SafeMediaPipeDetector.detectFace(
                        faceLandmarkerRef.current,
                        video,
                        videoTimeMs
                    );

                    if (faceResult && faceResult.faceLandmarks.length > 0) {
                        // Draw Mesh (use dynamically loaded MediaPipe classes)
                        const MP = mediaPipeVisionRef.current;
                        if (MP?.DrawingUtils && MP?.FaceLandmarker?.FACE_LANDMARKS_TESSELATION) {
                            const drawingUtils = new MP.DrawingUtils(ctx);
                            for (const landmarks of faceResult.faceLandmarks) {
                                drawingUtils.drawConnectors(landmarks, MP.FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
                            }
                        }

                        // Process Emotion & FACS
                        if (faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0) {
                            const blendshapes = faceResult.faceBlendshapes[0].categories;
                            const emotion = emotionDetectorRef.current?.detectEmotion(blendshapes);
                            updateActionUnits(blendshapes); // Update FACS Grid

                            if (emotion) {
                                // Update UI
                                updateEmotionUI(emotion);
                                statsTrackerRef.current?.record(emotion);
                                updateStatsUI();
                                // Buffer để gửi gộp lên server (giảm tải)
                                emotionBufferRef.current.push({ emotionType: emotion.type, confidence: emotion.confidence });
                                if (emotionBufferRef.current.length >= 30) flushEmotionBuffer();

                                // Spawn Emoji
                                if (Math.random() > 0.92) {
                                    emojiManagerRef.current?.spawn(emotion, canvas.width / 2 + (Math.random() - 0.5) * 200, canvas.height / 2 + (Math.random() - 0.5) * 200);
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Draw Hands
        if (handResults.multiHandLandmarks) {
            for (const landmarks of handResults.multiHandLandmarks) {
                window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                window.drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 2 });
                updateFingerBars(landmarks);
                updateHeatmap(landmarks); // Update Heatmap

                // Detect Sign Language
                const sign = signDetectorRef.current?.detect(landmarks);
                const gestureEl = document.getElementById('gestureDisplay');
                if (gestureEl) {
                    if (sign && sign !== 'UNKNOWN') {
                        const config = SIGN_CONFIG[sign];
                        // Safe check in case config missing
                        if (config) {
                            gestureEl.innerHTML = `<span style="font-size:1.2em">${config.emoji}</span> ${config.nameVi}`;
                            gestureEl.style.color = '#10b981';
                        } else {
                            gestureEl.innerText = sign;
                        }
                    } else {
                        gestureEl.innerText = '--';
                        gestureEl.style.color = '#fff';
                    }
                }
            }
        } else {
            updateHeatmap(null); // Clear heatmap if no hands
        }

        // 4. Draw Floating Emojis
        emojiManagerRef.current?.update();
        emojiManagerRef.current?.getEmojis().forEach(e => {
            emojiManagerRef.current?.draw(ctx, e);
        });

        ctx.restore();
    };

    // --- Flush emotion buffer lên server (gộp theo phút ở API) ---
    function flushEmotionBuffer() {
        const buf = emotionBufferRef.current;
        if (buf.length === 0) return;
        emotionBufferRef.current = [];
        fetch('/api/vision-tracker/emotion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ samples: buf })
        }).catch(() => {});
    }

    // --- Helper Functions ---
    const updateEmotionUI = (emotion: any) => {
        const config = EMOTION_CONFIG[emotion.type];
        if (!config) return;

        // Overlay Badge
        document.getElementById('emotionDisplayOverlay').innerText = config.label; // Label
        document.querySelector('.rec-emoji').innerText = config.emoji;
        document.getElementById('emotionConfidenceOverlay').innerText = Math.round(emotion.confidence) + '%';

        // Metrics Panel
        document.getElementById('emotionDisplay').innerText = config.label;
        document.getElementById('emotionConfidence').innerText = Math.round(emotion.confidence) + '%';

        // Timeline
        updateEmotionChartImpl(emotion.type, emotion.confidence);
    };

    // --- Charting ---
    let fingerChart: any;
    let emotionChart: any;

    function initChart() {
        if (!window.Chart) return;

        const emoCanvas = document.getElementById('emotionChart') as HTMLCanvasElement;
        if (emoCanvas) {
            const existing = window.Chart.getChart(emoCanvas);
            if (existing) existing.destroy();

            emotionChart = new window.Chart(emoCanvas, {
                type: 'line',
                data: { labels: Array(30).fill(''), datasets: [{ label: 'Confidence', data: Array(30).fill(0), borderColor: '#667eea', tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false, max: 100 } } }
            });
        }

        const fingCanvas = document.getElementById('fingerChart') as HTMLCanvasElement;
        if (fingCanvas) {
            const existing = window.Chart.getChart(fingCanvas);
            if (existing) existing.destroy();

            fingerChart = new window.Chart(fingCanvas, {
                type: 'line',
                data: { labels: Array(30).fill(''), datasets: [{ label: 'Pinch', data: Array(30).fill(0), borderColor: '#48bb78', tension: 0.4, fill: true, backgroundColor: 'rgba(72,187,120,0.1)' }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
            });
        }
    }

    function updateEmotionChartImpl(type: string, conf: number) {
        if (emotionChart) {
            emotionChart.data.datasets[0].data.shift();
            emotionChart.data.datasets[0].data.push(conf);
            emotionChart.update('none');
        }
    }

    function updateFingerBars(landmarks: any) {
        if (!landmarks) return;
        const names = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        const tips = [4, 8, 12, 16, 20];
        const bases = [2, 5, 9, 13, 17]; // MCP joints

        names.forEach((name, i) => {
            const tip = landmarks[tips[i]];
            const base = landmarks[bases[i]];
            // Calculate Euclidean distance (robust to rotation)
            const dist = Math.sqrt(Math.pow(tip.x - base.x, 2) + Math.pow(tip.y - base.y, 2));

            // Map distance to percentage (approx 0-0.25 range)
            // Thumb is shorter, others longer.
            // Using a simple scaler:
            let val = dist * 400; // 0.25 * 400 = 100%
            if (name === 'thumb') val = dist * 500; // Thumb needs more sensitivity

            const percent = Math.min(100, Math.max(0, val));

            const el = document.getElementById(`${name}Bar`);
            if (el) el.style.height = percent + '%';
        });

        // Update Pinch Chart
        const pinch = Math.max(0, 1 - Math.sqrt(Math.pow(landmarks[4].x - landmarks[8].x, 2) + Math.pow(landmarks[4].y - landmarks[8].y, 2)) * 5);
        document.getElementById('pinchStrength').innerText = pinch.toFixed(2);
        if (fingerChart) {
            fingerChart.data.datasets[0].data.shift();
            fingerChart.data.datasets[0].data.push(pinch);
            fingerChart.update('none');
        }
    }

    function detectGesture(landmarks) {
        const fingers = [];
        fingers.push(landmarks[4].x < landmarks[3].x);
        for (let i = 0; i < 4; i++)fingers.push(landmarks[8 + i * 4].y < landmarks[6 + i * 4].y);
        const open = fingers.filter(f => f).length;
        if (open === 0) return 'FIST';
        if (open === 5) return 'OPEN';
        if (open === 2 && fingers[1] && fingers[2]) return 'PEACE';
        return 'UNKNOWN';
    }

    // --- Restored Original Features ---

    function initHeatmap() {
        const heatmap = document.getElementById('heatmap');
        if (!heatmap) return;
        heatmap.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            cell.id = `heatmap-${i}`;
            heatmap.appendChild(cell);
        }
        updateHeatmap(null); // Init reset
    }

    function updateHeatmap(landmarks: any) {
        for (let i = 0; i < 30; i++) {
            const el = document.getElementById(`heatmap-${i}`);
            if (el) el.classList.remove('active');
        }
        if (landmarks && landmarks.length > 0) {
            const palm = landmarks[0];
            const gridX = Math.floor(palm.x * 6);
            const gridY = Math.floor(palm.y * 5);
            const index = gridY * 6 + gridX;
            if (index >= 0 && index < 30) {
                const el = document.getElementById(`heatmap-${index}`);
                if (el) {
                    el.classList.add('active');
                    if (index > 0) document.getElementById(`heatmap-${index - 1}`)?.classList.add('active');
                    if (index < 29) document.getElementById(`heatmap-${index + 1}`)?.classList.add('active');
                }
            }
        }
    }

    function initActionUnits() {
        const actionUnits = [
            { id: 'AU1', name: 'Inner Brow Raiser' },
            { id: 'AU2', name: 'Outer Brow Raiser' },
            { id: 'AU4', name: 'Brow Lowerer' },
            { id: 'AU5', name: 'Upper Lid Raiser' },
            { id: 'AU6', name: 'Cheek Raiser' },
            { id: 'AU12', name: 'Lip Corner Puller' },
            { id: 'AU15', name: 'Lip Corner Depressor' }
        ];

        const grid = document.getElementById('actionUnitsGrid');
        if (!grid) return;
        grid.innerHTML = '';
        actionUnits.forEach(au => {
            const item = document.createElement('div');
            item.className = 'au-item';
            item.id = `au-${au.id}`;
            item.innerHTML = `
                <div class="au-id">${au.id}</div>
                <div class="au-val" id="${au.id}-value">0%</div>
                <div class="au-name" style="font-size:0.5rem; color:#666">${au.name}</div>
            `;
            grid.appendChild(item);
        });
    }

    function updateActionUnits(blendshapes: any[]) {
        if (!blendshapes) return;
        const getScore = (name: string) => (blendshapes.find(s => s.categoryName === name || s.displayName === name)?.score || 0) * 100;

        // Map Blendshapes to FACS
        const AUs = {
            'AU1': getScore('browInnerUp'),
            'AU2': Math.max(getScore('browOuterUpLeft'), getScore('browOuterUpRight')),
            'AU4': getScore('browDownLeft'),
            'AU5': Math.max(getScore('eyeWideLeft'), getScore('eyeWideRight')),
            'AU6': getScore('cheekSquintLeft'),
            'AU12': getScore('mouthSmileLeft'),
            'AU15': getScore('mouthFrownLeft')
        };

        Object.entries(AUs).forEach(([id, val]) => {
            const el = document.getElementById(`au-${id}`);
            const valEl = document.getElementById(`${id}-value`);
            if (el && valEl) {
                valEl.textContent = Math.round(val) + '%';
                if (val > 30) el.style.borderColor = '#10b981';
                else el.style.borderColor = '#333';
            }
        });
    }

    function updateStatsUI() {
        if (!statsTrackerRef.current) return;
        const stats = statsTrackerRef.current.getStats();

        const totalEl = document.getElementById('totalEmotions');
        if (totalEl) totalEl.innerText = stats.total.toString();

        // 2. Top 5
        const sorted = Object.entries(stats)
            .filter(([k]) => k !== 'total' && !['timestamp', 'undefined'].includes(k))
            // @ts-ignore
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const top5Container = document.getElementById('statsTop5');
        if (top5Container) {
            top5Container.innerHTML = sorted.map(([type, count]) => {
                // @ts-ignore
                const config = EMOTION_CONFIG[type] || { emoji: '❓', labelVi: type, color: '#888' };
                // @ts-ignore
                const percent = (count / (stats.total || 1)) * 100;
                return `
                    <div class="stat-row">
                        <span style="width: 20px">${config.emoji}</span>
                        <span style="width: 80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600" title="${config.labelVi}">${config.labelVi}</span>
                        <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${percent}%; background: ${config.color}"></div></div>
                        <span style="width: 30px; text-align:right; color:#888; font-size:0.75rem">${count}</span>
                    </div>
                 `;
            }).join('');
        }

        // 3. Grid
        // Throttle: only update every 5 frames based on total count to avoid layout trashing
        if ((stats.total || 0) % 5 === 0) {
            const gridContainer = document.getElementById('statsGrid');
            if (gridContainer) {
                const all = Object.entries(EMOTION_CONFIG);
                gridContainer.innerHTML = all.map(([type, config]) => {
                    // @ts-ignore
                    const count = stats[type] || 0;
                    return `
                        <div class="grid-stat-item" style="opacity: ${count > 0 ? 1 : 0.3}; border-color: ${count > 0 ? config.color : 'transparent'}">
                            <div class="grid-emoji">${config.emoji}</div>
                            <div style="font-weight:700">${count}</div>
                        </div>
                     `;
                }).join('');
            }
        }
    }

    return (
        <div className="bento-wrapper">
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils" strategy="lazyOnload" />
            <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="lazyOnload" />

            <style jsx global>{`
                .bento-wrapper {
                    font-family: 'Inter', -apple-system, sans-serif;
                    background: #0f1014;
                    color: #e0e0e0;
                    padding: 0;
                    min-height: 100vh;
                    overflow-x: hidden;
                }
                .container { width: 100%; padding: 12px; box-sizing: border-box; }
                
                .bento-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
                
                .item-camera { 
                    grid-column: span 12; span 12; height: 75vh; 
                    border-radius: 16px; overflow: hidden; background: #000; position: relative;
                    border: 1px solid #333; box-shadow: 0 0 40px rgba(0,0,0,0.5);
                }

                .bento-item { background: #1e1e24; border-radius: 12px; padding: 12px; border: 1px solid #2d2d35; }
                .metric-value-big { font-size: 1.8rem; font-weight: 800; color: #fff; text-align: center; line-height: 1.2; }
                .item-title { font-size: 0.7rem; color: #71717a; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 1px; }

                /* Overlays */
                .recognition-badge {
                    position: absolute; top: 24px; left: 50%; transform: translateX(-50%);
                    background: rgba(15, 16, 20, 0.85); backdrop-filter: blur(12px);
                    padding: 8px 24px; border-radius: 100px;
                    border: 1px solid var(--glass-border);
                    display: flex; align-items: center; gap: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                }
                .rec-emoji { font-size: 2rem; }
                .rec-text { font-size: 1.2rem; font-weight: 700; color: #fff; }
                .rec-conf { color: #10b981; font-weight: 600; font-size: 0.9rem; }

                .overlay-stats { position: absolute; top: 24px; right: 24px; display: flex; gap: 8px; }
                .stat-pill { background: rgba(15,16,20, 0.8); backdrop-filter: blur(8px); padding: 6px 12px; border-radius: 12px; border: 1px solid var(--glass-bg); text-align: center; min-width: 80px; }
                .stat-val { font-size: 1.1rem; font-weight: 700; color: #fff; display: block; }
                .stat-lbl { font-size: 0.6rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
                .fs-btn { position: absolute; bottom: 24px; right: 24px; width: 48px; height: 48px; border-radius: 50%; background: var(--glass-bg); backdrop-filter: blur(4px); border: 1px solid var(--glass-border); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .fs-btn:hover { background: white; color: black; }

                /* Stats Dashboard */
                .stats-container { display: flex; gap: 16px; height: 100%; }
                .stats-top5 { flex: 1; display: flex; flex-direction: column; gap: 8px; }
                .stat-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; }
                .stat-bar-bg { flex: 1; height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
                .stat-bar-fill { height: 100%; background: #10b981; border-radius: 3px; transition: width 0.3s; }
                .stats-grid { flex: 1; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; align-content: start; }
                .grid-stat-item { background: #2d2d35; padding: 4px; border-radius: 4px; text-align: center; font-size: 0.7rem; display: flex; flex-direction: column; align-items: center; }
                .grid-emoji { font-size: 1.2rem; margin-bottom: 2px; }
                
                /* Components */
                .finger-grid { display: flex; gap: 6px; height: 60px; align-items: flex-end; }
                .finger-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .bar-bg { width: 100%; height: 100%; background: #2d2d35; border-radius: 4px; display: flex; align-items: flex-end; }
                .bar-fill { width: 100%; background: linear-gradient(to top, #10b981, #34d399); border-radius: 2px; transition: height 0.1s; }
                
                 /* Heatmap & FACS */
                .heatmap { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
                .heatmap-cell { aspect-ratio: 1; background: #2d2d35; border-radius: 4px; transition: background 0.1s; }
                .heatmap-cell.active { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }

                .facs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
                .au-item { background: #2d2d35; border: 1px solid #333; padding: 4px; border-radius: 6px; text-align: center; transition: border-color 0.2s; }
                .au-id { font-size: 0.6rem; font-weight: 700; color: #888; }
                .au-val { font-size: 0.9rem; font-weight: 800; color: #fff; }

                /* Grid Placement */
                .col-2 { grid-column: span 2; }
                .col-3 { grid-column: span 3; }
                .col-4 { grid-column: span 4; }
                .col-6 { grid-column: span 6; }
                .col-8 { grid-column: span 8; }
                .col-12 { grid-column: span 12; }
                @media (max-width: 1024px) {
                    .col-2, .col-3, .col-4 { grid-column: span 6; }
                    .item-camera { height: 60vh; }
                }
                #videoCanvas { width: 100%; height: 100%; object-fit: cover; }
            `}</style>

            <div className="container">
                <div className="bento-grid">
                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="col-12" style={{ gridColumn: 'span 12', marginBottom: '16px' }}>
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: '#fca5a5',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                    <div>
                                        <div style={{ fontWeight: 700, marginBottom: '4px' }}>Lỗi WebGL/WebGPU</div>
                                        <div style={{ opacity: 0.9 }}>{errorMsg}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setStatus('Skipped');
                                        setErrorMsg(null);
                                    }}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        borderRadius: '8px',
                                        padding: '8px 16px',
                                        color: '#fca5a5',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Bỏ qua
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bento-item item-camera">
                        <div id="videoContainer" style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <video id="videoElement" ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
                            <canvas id="videoCanvas" ref={canvasRef}></canvas>
                            <div className="recognition-badge">
                                <span className="rec-emoji">🤖</span>
                                <span className="rec-text" id="emotionDisplayOverlay">Initializing...</span>
                                <span className="rec-conf" id="emotionConfidenceOverlay"></span>
                            </div>
                            <div className="overlay-stats">
                                <div className="stat-pill"><span className="stat-val" id="gestureDisplay">--</span><span className="stat-lbl">Gesture</span></div>
                                <div className="stat-pill"><span className="stat-val" id="handsDisplay">0</span><span className="stat-lbl">Hand Count</span></div>
                            </div>
                            <button className="fs-btn" onClick={() => {
                                const el = document.getElementById('videoContainer');
                                if (!document.fullscreenElement) el?.requestFullscreen(); else document.exitFullscreen();
                            }}>⛶</button>
                        </div>
                    </div>

                    <div className="bento-item col-2">
                        <div className="item-title">Current Emotion</div>
                        <div className="metric-value-big" id="emotionDisplay" style={{ color: '#10b981' }}>--</div>
                        <div style={{ textAlign: 'center', color: '#555', fontSize: '0.8rem' }} id="emotionConfidence">0%</div>
                    </div>

                    <div className="bento-item col-2">
                        <div className="item-title">Pinch Strength</div>
                        <div className="metric-value-big" id="pinchStrength">0.00</div>
                    </div>

                    <div className="bento-item col-4">
                        <div className="item-title">Finger Extensions</div>
                        <div className="finger-grid">
                            {['thumb', 'index', 'middle', 'ring', 'pinky'].map(f => (
                                <div key={f} className="finger-col">
                                    <div className="bar-bg"><div className="bar-fill" id={`${f}Bar`} style={{ height: '10%' }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bento-item col-2">
                        <div className="item-title">Hand Heatmap</div>
                        <div id="heatmap" className="heatmap"></div>
                    </div>

                    <div className="bento-item col-2">
                        <div className="item-title">FACS Analysis</div>
                        <div id="actionUnitsGrid" className="facs-grid"></div>
                    </div>

                    <div className="bento-item col-8">
                        <div className="item-title">Emotion Statistics (Total: <span id="totalEmotions">0</span>)</div>
                        <div className="stats-container">
                            <div className="stats-top5" id="statsTop5">
                                {/* Top 5 bars */}
                            </div>
                            <div className="stats-grid" id="statsGrid">
                                {/* Grid */}
                            </div>
                        </div>
                    </div>

                    <div className="bento-item col-4">
                        <div className="item-title">Signal Analysis</div>
                        <div style={{ width: '100%', height: '80px', position: 'relative' }}>
                            <canvas id="fingerChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
