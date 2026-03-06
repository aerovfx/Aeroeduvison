'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import './dashboard.css';

interface HandData {
    id: number;
    handedness: string;
    confidence: number;
    landmarks: Array<{ x: number; y: number; z: number }>;
    gesture: string;
}

interface FaceData {
    id: number;
    landmarks: Array<{ x: number; y: number; z: number }>;
    emotion: string;
    confidence: number;
}

interface TrackingData {
    timestamp: number;
    fps: number;
    frame_id: number;
    hands_count: number;
    faces_count: number;
    hands: HandData[];
    faces: FaceData[];
}

interface ActivityLog {
    message: string;
    time: string;
}

export default function HandTrackingDashboard() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const [isConnected, setIsConnected] = useState(false);
    const [serverUrl, setServerUrl] = useState('');
    const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);

    // Server URL from environment or default
    const defaultServerUrl = process.env.NEXT_PUBLIC_TRACKING_SERVER_URL || 'ws://localhost:8080/ws/tracking';

    const addActivity = useCallback((message: string) => {
        const time = new Date().toLocaleTimeString('vi-VN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        setActivityLog(prev => [{ message, time }, ...prev.slice(0, 19)]);
    }, []);

    const drawHandLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: Array<{ x: number; y: number }>, color: string) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],  // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],  // Index
            [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],  // Ring
            [0, 17], [17, 18], [18, 19], [19, 20],  // Pinky
            [5, 9], [9, 13], [13, 17]  // Palm
        ];

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        connections.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
                ctx.beginPath();
                ctx.moveTo(landmarks[start].x * width, landmarks[start].y * height);
                ctx.lineTo(landmarks[end].x * width, landmarks[end].y * height);
                ctx.stroke();
            }
        });

        // Draw landmarks
        ctx.fillStyle = color;
        landmarks.forEach(lm => {
            ctx.beginPath();
            ctx.arc(lm.x * width, lm.y * height, 5, 0, 2 * Math.PI);
            ctx.fill();
        });
    }, []);

    const connectWebSocket = useCallback(() => {
        const url = serverUrl || defaultServerUrl;

        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        addActivity(`🔌 Đang kết nối: ${url}`);

        const ws = new WebSocket(url);

        ws.onopen = () => {
            setIsConnected(true);
            addActivity('✅ Kết nối server thành công');
            // Send ping every 30s to keep connection alive
            const pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send('ping');
                }
            }, 30000);
            ws.addEventListener('close', () => clearInterval(pingInterval));
        };

        ws.onmessage = (event) => {
            try {
                const data: TrackingData = JSON.parse(event.data);
                setTrackingData(data);

                if (!canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');
                if (!ctx) return;

                // Clear canvas
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

                // Draw hands with different colors
                const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'];
                data.hands.forEach((hand, idx) => {
                    const color = colors[idx % colors.length];
                    drawHandLandmarks(ctx, hand.landmarks, color);
                });

                // Draw face mesh (simplified - just key points)
                data.faces.forEach((face, idx) => {
                    const color = colors[(idx + 3) % colors.length];
                    ctx.fillStyle = color;
                    face.landmarks.forEach(lm => {
                        ctx.beginPath();
                        ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 3, 0, 2 * Math.PI);
                        ctx.fill();
                    });
                });

            } catch (error) {
                console.error('Error parsing tracking data:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            addActivity('❌ Lỗi kết nối server');
        };

        ws.onclose = () => {
            setIsConnected(false);
            addActivity('⚠️ Mất kết nối server, đang thử kết nối lại...');

            // Auto-reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                connectWebSocket();
            }, 3000);
        };

        wsRef.current = ws;
    }, [serverUrl, defaultServerUrl, addActivity, drawHandLandmarks]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connectWebSocket]);

    const handleConnect = () => {
        if (serverUrl) {
            if (wsRef.current) {
                wsRef.current.close();
            }
            connectWebSocket();
        }
    };

    return (
        <div className="container">
            <div className="header">
                <h1>🤚 Bảng Điều Khiển Theo Dõi Đa Người</h1>
                <p>Server-side tracking với Cloud Run (35-50 người @ 15 FPS)</p>
                <div className="status-badge">
                    <span className={`status-dot ${isConnected ? 'connected' : ''}`}></span>
                    <span>{isConnected ? 'Đã kết nối' : 'Chưa kết nối'}</span>
                </div>
            </div>

            {/* Server Connection */}
            <div className="bento-item" style={{ gridColumn: 'span 12', marginBottom: '20px' }}>
                <div className="item-title">
                    <div className="title-icon">🔌</div>
                    Kết Nối Server
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="text"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                        placeholder={defaultServerUrl}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#d1d9e6',
                            boxShadow: 'inset 4px 4px 8px rgba(163, 177, 198, 0.4), inset -4px -4px 8px rgba(255, 255, 255, 0.6)'
                        }}
                    />
                    <button
                        onClick={handleConnect}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '4px 4px 8px rgba(163, 177, 198, 0.4)'
                        }}
                    >
                        Kết Nối
                    </button>
                </div>
            </div>

            <div className="bento-grid">
                {/* Main Video Feed */}
                <div className="bento-item item-large">
                    <div className="item-title">
                        <div className="title-icon">📹</div>
                        Camera Feed (Server-side)
                    </div>
                    <div style={{ position: 'relative' }}>
                        <canvas ref={canvasRef} width={1280} height={720} style={{
                            width: '100%',
                            borderRadius: '16px',
                            background: '#d1d9e6',
                            minHeight: '400px'
                        }} />
                    </div>
                </div>

                {/* Metrics */}
                <div className="bento-item item-medium">
                    <div className="item-title">
                        <div className="title-icon">📊</div>
                        Metrics
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="metric">
                            <div className="metric-value">{trackingData?.fps.toFixed(1) || '0'}</div>
                            <div className="metric-label">FPS</div>
                        </div>
                        <div className="metric">
                            <div className="metric-value">{trackingData?.hands_count || 0}</div>
                            <div className="metric-label">Bàn Tay</div>
                        </div>
                        <div className="metric">
                            <div className="metric-value">{trackingData?.faces_count || 0}</div>
                            <div className="metric-label">Khuôn Mặt</div>
                        </div>
                    </div>
                </div>

                {/* Detected Hands */}
                <div className="bento-item" style={{ gridColumn: 'span 6' }}>
                    <div className="item-title">
                        <div className="title-icon">✋</div>
                        Bàn Tay Phát Hiện
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {trackingData?.hands.map((hand, idx) => (
                            <div key={idx} style={{
                                padding: '8px 12px',
                                marginBottom: '8px',
                                background: '#d1d9e6',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem'
                            }}>
                                <span>Hand {hand.id}: {hand.handedness}</span>
                                <span style={{ fontWeight: 700 }}>{hand.gesture}</span>
                            </div>
                        ))}
                        {(!trackingData || trackingData.hands.length === 0) && (
                            <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                                Chưa phát hiện bàn tay
                            </div>
                        )}
                    </div>
                </div>

                {/* Detected Faces */}
                <div className="bento-item" style={{ gridColumn: 'span 6' }}>
                    <div className="item-title">
                        <div className="title-icon">😊</div>
                        Khuôn Mặt Phát Hiện
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {trackingData?.faces.map((face, idx) => (
                            <div key={idx} style={{
                                padding: '8px 12px',
                                marginBottom: '8px',
                                background: '#d1d9e6',
                                borderRadius: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem'
                            }}>
                                <span>Face {face.id}</span>
                                <span style={{ fontWeight: 700 }}>{face.emotion} ({Math.round(face.confidence * 100)}%)</span>
                            </div>
                        ))}
                        {(!trackingData || trackingData.faces.length === 0) && (
                            <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                                Chưa phát hiện khuôn mặt
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity Log */}
                <div className="bento-item" style={{ gridColumn: 'span 12' }}>
                    <div className="item-title">
                        <div className="title-icon">📝</div>
                        Nhật Ký Hoạt Động
                    </div>
                    <div className="activity-log">
                        {activityLog.length === 0 ? (
                            <div className="loading">Chưa có hoạt động...</div>
                        ) : (
                            activityLog.map((log, i) => (
                                <div key={i} className="activity-item">
                                    [{log.time}] {log.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
        .status-dot.connected {
          background: linear-gradient(135deg, #00f260, #0575e6);
        }
      `}</style>
        </div>
    );
}
