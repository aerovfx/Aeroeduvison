'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Cog, Hammer, Hand, Layers, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ScenarioId = 'engine' | 'house';

type AssemblyPart = {
  id: string;
  name: string;
  color: string;
  width: number;
  height: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  isAssembled: boolean;
  x: number;
  y: number;
};

const SCENARIOS: Record<ScenarioId, { title: string; description: string; parts: Omit<AssemblyPart, 'isAssembled' | 'x' | 'y'>[] }> =
  {
    engine: {
      title: 'Lắp ráp động cơ',
      description: 'Lắp trục khuỷu, xi lanh và piston theo đúng vị trí.',
      parts: [
        {
          id: 'crankshaft',
          name: 'Trục khuỷu',
          startX: 180,
          startY: 220,
          targetX: 0,
          targetY: 140,
          color: '#38bdf8',
          width: 140,
          height: 40
        },
        {
          id: 'cylinder',
          name: 'Xi lanh',
          startX: 180,
          startY: 420,
          targetX: 0,
          targetY: -20,
          color: '#fbbf24',
          width: 110,
          height: 160
        },
        {
          id: 'piston',
          name: 'Piston',
          startX: 180,
          startY: 620,
          targetX: 0,
          targetY: -50,
          color: '#f87171',
          width: 70,
          height: 60
        }
      ]
    },
    house: {
      title: 'Xây nhà',
      description: 'Lắp nền móng, tường và mái nhà theo thứ tự.',
      parts: [
        {
          id: 'foundation',
          name: 'Móng nhà',
          startX: 180,
          startY: 220,
          targetX: 0,
          targetY: 160,
          color: '#34d399',
          width: 160,
          height: 50
        },
        {
          id: 'walls',
          name: 'Tường nhà',
          startX: 180,
          startY: 420,
          targetX: 0,
          targetY: 40,
          color: '#60a5fa',
          width: 180,
          height: 140
        },
        {
          id: 'roof',
          name: 'Mái nhà',
          startX: 180,
          startY: 620,
          targetX: 0,
          targetY: -70,
          color: '#f97316',
          width: 200,
          height: 80
        }
      ]
    }
  };

declare global {
  interface Window {
    Hands?: any;
    Camera?: any;
  }
}

const PINCH_DISTANCE = 40;
const GRAB_DISTANCE = 90;
const TARGET_DISTANCE = 55;

export default function AssemblySimPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>('engine');
  const [isReady, setIsReady] = useState(false);
  const [handStatus, setHandStatus] = useState('CHƯA PHÁT HIỆN TAY');
  const [pinchStatus, setPinchStatus] = useState('Cử chỉ: Sẵn sàng');
  const [assembledCount, setAssembledCount] = useState(0);

  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const grabbedPartRef = useRef<AssemblyPart | null>(null);
  const partsRef = useRef<AssemblyPart[]>([]);
  const handPosRef = useRef({ x: 0, y: 0, isPinching: false });

  const scenarioData = SCENARIOS[scenario];

  const totalParts = scenarioData.parts.length;

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });

  const resetAssembly = () => {
    partsRef.current = scenarioData.parts.map((part) => ({
      ...part,
      isAssembled: false,
      x: part.startX,
      y: part.startY
    }));
    grabbedPartRef.current = null;
    handPosRef.current = { ...handPosRef.current, isPinching: false };
    setAssembledCount(0);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawHandHUD = (ctx: CanvasRenderingContext2D, x: number, y: number, pinching: boolean) => {
    ctx.fillStyle = pinching ? '#fbbf24' : '#38bdf8';
    ctx.shadowBlur = 15;
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const drawParts = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;

    partsRef.current.forEach((part) => {
      if (!part.isAssembled) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(centerX + part.targetX - part.width / 2, centerY + part.targetY - part.height / 2, part.width, part.height);
      }

      ctx.save();
      ctx.translate(part.x, part.y);
      if (grabbedPartRef.current?.id === part.id || part.isAssembled) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = part.color;
      }
      ctx.fillStyle = part.color;
      ctx.globalAlpha = part.isAssembled || grabbedPartRef.current?.id === part.id ? 1 : 0.85;
      ctx.fillRect(-part.width / 2, -part.height / 2, part.width, part.height);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(part.name.toUpperCase(), 0, part.height / 2 + 16);
      ctx.restore();

      if (grabbedPartRef.current?.id === part.id) {
        ctx.strokeStyle = part.color;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(handPosRef.current.x, handPosRef.current.y);
        ctx.lineTo(part.x, part.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  };

  const updateProgress = () => {
    const count = partsRef.current.filter((part) => part.isAssembled).length;
    setAssembledCount(count);
  };

  useEffect(() => {
    resetAssembly();
  }, [scenario]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let mounted = true;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const onResults = (results: any) => {
      if (!mounted) return;
      resize();
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(ctx, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        setHandStatus('HỆ THỐNG KẾT NỐI');

        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];

        const handX = (1 - indexTip.x) * canvas.width;
        const handY = indexTip.y * canvas.height;

        const tx = (1 - thumbTip.x) * canvas.width;
        const ty = thumbTip.y * canvas.height;
        const dist = Math.hypot(handX - tx, handY - ty);

        const isPinching = dist < PINCH_DISTANCE;
        handPosRef.current = { x: handX, y: handY, isPinching };
        setPinchStatus(isPinching ? 'Cử chỉ: ĐANG GIỮ' : 'Cử chỉ: TỰ DO');

        if (isPinching) {
          if (!grabbedPartRef.current) {
            partsRef.current.forEach((part) => {
              if (part.isAssembled) return;
              const d = Math.hypot(part.x - handX, part.y - handY);
              if (d < GRAB_DISTANCE) {
                grabbedPartRef.current = part;
              }
            });
          }
        } else {
          grabbedPartRef.current = null;
        }

        if (grabbedPartRef.current) {
          grabbedPartRef.current.x = handX;
          grabbedPartRef.current.y = handY;

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const targetRealX = centerX + grabbedPartRef.current.targetX;
          const targetRealY = centerY + grabbedPartRef.current.targetY;
          const distToTarget = Math.hypot(grabbedPartRef.current.x - targetRealX, grabbedPartRef.current.y - targetRealY);

          if (distToTarget < TARGET_DISTANCE) {
            grabbedPartRef.current.isAssembled = true;
            grabbedPartRef.current.x = targetRealX;
            grabbedPartRef.current.y = targetRealY;
            grabbedPartRef.current = null;
            updateProgress();
          }
        }

        drawHandHUD(ctx, handX, handY, isPinching);
      } else {
        setHandStatus('CHƯA PHÁT HIỆN TAY');
        setPinchStatus('Cử chỉ: Sẵn sàng');
        grabbedPartRef.current = null;
      }

      drawParts(ctx, canvas.width, canvas.height);
      ctx.restore();
    };

    const init = async () => {
      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js')
      ]);

      const Hands = window.Hands;
      const Camera = window.Camera;
      if (!Hands || !Camera) return;

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      const camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480
      });

      cameraRef.current = camera;
      await camera.start();
      if (mounted) {
        setIsReady(true);
      }
    };

    resize();
    init();

    window.addEventListener('resize', resize);
    return () => {
      mounted = false;
      window.removeEventListener('resize', resize);
      if (cameraRef.current?.stop) {
        cameraRef.current.stop();
      }
      if (handsRef.current?.close) {
        handsRef.current.close();
      }
    };
  }, [scenario]);

  const scenarioButtons = useMemo(
    () => [
      { id: 'engine', label: 'Động cơ', icon: Cog },
      { id: 'house', label: 'Xây nhà', icon: Hammer }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#050a0f] text-slate-100">
      <div className="container mx-auto px-4 py-6">
        <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-sky-400 hover:text-sky-300 mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại LabTwin
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-sky-300">Mô phỏng lắp ráp chi tiết</h1>
            <p className="text-slate-400 mt-1">
              Dùng cử chỉ chụm ngón để kéo linh kiện vào vùng lắp ráp trung tâm.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {scenarioButtons.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={scenario === item.id ? 'default' : 'outline'}
                  className={scenario === item.id ? 'bg-sky-500 text-white hover:bg-sky-600' : 'border-sky-500 text-sky-300'}
                  onClick={() => setScenario(item.id as ScenarioId)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
            <Button variant="outline" className="border-slate-600 text-slate-200" onClick={resetAssembly}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border border-sky-900 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-200">
                <Layers className="h-5 w-5" />
                Nhiệm vụ lắp ráp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Kịch bản</div>
                <div className="text-lg font-semibold text-slate-100 mt-1">{scenarioData.title}</div>
                <p className="text-slate-400 mt-1">{scenarioData.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Badge className="bg-sky-900/60 text-sky-200 border-0">Linh kiện: {totalParts}</Badge>
                <Badge className="bg-emerald-900/60 text-emerald-200 border-0">
                  Tiến độ: {assembledCount}/{totalParts}
                </Badge>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-500 uppercase">
                  <Hand className="h-4 w-4" />
                  Theo dõi tay
                </div>
                <div className="text-sm font-semibold text-sky-300">{handStatus}</div>
                <div className="text-xs text-slate-400 mt-1">{pinchStatus}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-xs text-slate-500 uppercase">Hướng dẫn nhanh</div>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>1. Chụm ngón cái + trỏ để gắp linh kiện.</li>
                  <li>2. Kéo linh kiện vào vùng mờ trung tâm.</li>
                  <li>3. Thả đúng vị trí để hoàn thành.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border border-sky-900 bg-slate-950/40 overflow-hidden">
            <CardContent className="relative p-0">
              {!isReady && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#050a0f]">
                  <div className="w-16 h-16 border-4 border-t-sky-500 border-sky-900 rounded-full animate-spin mb-4" />
                  <div className="text-sky-400 font-mono text-sm">ĐANG KHỞI TẠO MÔ PHỎNG...</div>
                </div>
              )}
              <canvas ref={canvasRef} className="h-[70vh] w-full" />
              <video
                ref={videoRef}
                playsInline
                className="absolute bottom-4 right-4 w-56 rounded-xl border-2 border-sky-400/80 opacity-70"
                style={{ transform: 'scaleX(-1)' }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
