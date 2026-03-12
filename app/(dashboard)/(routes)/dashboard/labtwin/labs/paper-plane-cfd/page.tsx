'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Wind, Plane, Settings, Play, Pause, RotateCcw, BookOpen, TrendingUp } from 'lucide-react';

interface Particle {
  type: 'vortex_left' | 'vortex_right' | 'wake';
  x: number;
  y: number;
  cx: number;
  cy: number;
  life: number;
  maxLife: number;
  color: string;
  angle: number;
  radius: number;
  vx: number;
  vy: number;
  spin: number;
  size?: number;
  history: {x: number; y: number}[];
}

export default function PaperPlaneCFD() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  const planeCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isRunning, setIsRunning] = useState(true);
  const [windSpeed, setWindSpeed] = useState(1.0);
  const [showVortices, setShowVortices] = useState(true);
  const [showWake, setShowWake] = useState(true);
  const [particleCount, setParticleCount] = useState(0);
  
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Tọa độ 3D máy bay
  const getPlaneCoords = (bobbingX: number, bobbingY: number, cx: number, cy: number) => ({
    N:  { x: cx + bobbingX - 30 - 140, y: cy + bobbingY - 50 - 230 }, // Nose
    RT: { x: cx + bobbingX - 30 + 180,  y: cy + bobbingY - 50 + 30 },   // Right Tip
    LT: { x: cx + bobbingX - 30 - 80,   y: cy + bobbingY - 50 + 130 },  // Left Tip
    TT: { x: cx + bobbingX - 30 + 30,   y: cy + bobbingY - 50 + 60 },   // Tail Top
    TB: { x: cx + bobbingX - 30 + 50,   y: cy + bobbingY - 50 + 160 },  // Tail Bottom
  });

  const drawAirplane = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const bobbingX = Math.sin(timeRef.current * 0.002) * 3;
    const bobbingY = Math.cos(timeRef.current * 0.0015) * 4;
    const cx = width / 2;
    const cy = height / 2;
    const coords = getPlaneCoords(bobbingX, bobbingY, cx, cy);
    const { N, RT, LT, TT, TB } = coords;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // LEFT WING BOTTOM
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TB.x, TB.y); ctx.lineTo(LT.x, LT.y);
    ctx.closePath();
    const gradLW = ctx.createLinearGradient(N.x, N.y, LT.x, LT.y);
    gradLW.addColorStop(0, '#f8fafc');
    gradLW.addColorStop(0.5, '#e0f2fe');
    gradLW.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradLW;
    ctx.fill();

    // Vân khí động học cánh trái
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(150, 180, 120, 0.35)';
    ctx.lineWidth = 1.2;
    for(let i = 1; i <= 18; i++) {
      const t = i / 19;
      const sx = N.x + (TB.x - N.x) * t;
      const sy = N.y + (TB.y - N.y) * t;
      const ex = LT.x + (TB.x - LT.x) * t * 0.6;
      const ey = LT.y + (TB.y - LT.y) * t * 0.6;
      const ctrlX = sx - 60 * t;
      const ctrlY = sy + 80 * t;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey); ctx.stroke();
    }
    ctx.restore();

    // FUSELAGE
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.lineTo(TB.x, TB.y);
    ctx.closePath();
    const gradFuse = ctx.createLinearGradient(N.x, N.y, TB.x, TB.y);
    gradFuse.addColorStop(0, '#94a3b8');
    gradFuse.addColorStop(1, '#475569');
    ctx.fillStyle = gradFuse;
    ctx.fill();

    // RIGHT WING TOP
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.lineTo(RT.x, RT.y);
    ctx.closePath();
    const gradRW = ctx.createLinearGradient((N.x + TT.x)/2 - 20, (N.y + TT.y)/2, RT.x, RT.y);
    gradRW.addColorStop(0.0, '#1d4ed8');
    gradRW.addColorStop(0.1, '#38bdf8');
    gradRW.addColorStop(0.25, '#ffffff');
    gradRW.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = gradRW;
    ctx.fill();

    // Vân khí động học cánh phải
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
    ctx.lineWidth = 1.2;
    for(let i = 1; i <= 25; i++) {
      const t = i / 26;
      const sx = N.x + (TT.x - N.x) * t;
      const sy = N.y + (TT.y - N.y) * t;
      const ex = RT.x + (TT.x - RT.x) * t * 0.8;
      const ey = RT.y + (TT.y - RT.y) * t * 0.8;
      const ctrlX = sx + 140 * t;
      const ctrlY = sy - 40 * t;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey); ctx.stroke();
    }
    ctx.restore();

    // Đường viền
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(LT.x, LT.y); ctx.lineTo(TB.x, TB.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(RT.x, RT.y); ctx.lineTo(TT.x, TT.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TT.x, TT.y); ctx.lineTo(TB.x, TB.y); ctx.stroke();

    ctx.restore();
    return coords;
  };

  const createParticle = (type: Particle['type'], coords: any): Particle => {
    const { N, RT, LT, TT, TB } = coords;
    const baseWind = windSpeed;

    if (type === 'vortex_left') {
      return {
        type, x: LT.x, y: LT.y, cx: LT.x, cy: LT.y,
        life: 0, maxLife: 120 + Math.random() * 50,
        color: Math.random() > 0.5 ? '163, 230, 53' : '34, 197, 94',
        angle: Math.random() * Math.PI * 2, radius: 0,
        vx: 1.2 * baseWind, vy: 2.5 * baseWind, spin: -0.15,
        history: []
      };
    } else if (type === 'vortex_right') {
      return {
        type, x: RT.x, y: RT.y, cx: RT.x, cy: RT.y,
        life: 0, maxLife: 120 + Math.random() * 50,
        color: Math.random() > 0.5 ? '56, 189, 248' : '74, 222, 128',
        angle: Math.random() * Math.PI * 2, radius: 0,
        vx: 2.0 * baseWind, vy: 2.0 * baseWind, spin: 0.15,
        history: []
      };
    } else {
      const wakeColors = ['37, 99, 235', '29, 78, 216', '14, 165, 233', '16, 185, 129'];
      return {
        type,
        x: TB.x + (Math.random() * 40 - 20),
        y: TT.y + (Math.random() * 60 - 10),
        cx: TB.x + (Math.random() * 40 - 20),
        cy: TT.y + (Math.random() * 60 - 10),
        life: 0, maxLife: 180 + Math.random() * 100,
        color: wakeColors[Math.floor(Math.random() * wakeColors.length)],
        size: 15 + Math.random() * 25,
        vx: (2.5 + Math.random() * 1.5) * baseWind,
        vy: (3.5 + Math.random() * 2.0) * baseWind,
        angle: 0, radius: 0, spin: 0,
        history: []
      };
    }
  };

  const updateAndDrawParticle = (
    ctx: CanvasRenderingContext2D,
    p: Particle,
    index: number
  ): boolean => {
    p.life++;
    p.cx += p.vx;
    p.cy += p.vy;
    const progress = p.life / p.maxLife;

    if (p.type.includes('vortex')) {
      if (!showVortices) return false;
      p.radius += 0.5;
      p.angle += p.spin;
      p.x = p.cx + Math.cos(p.angle) * p.radius;
      p.y = p.cy + Math.sin(p.angle) * p.radius * 0.7;
      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > 25) p.history.shift();

      if (p.history.length < 2) return true;
      const alpha = (1 - progress) * 0.8;

      ctx.beginPath();
      ctx.moveTo(p.history[0].x, p.history[0].y);
      for (let i = 1; i < p.history.length; i++) {
        ctx.lineTo(p.history[i].x, p.history[i].y);
      }
      ctx.strokeStyle = `rgba(${p.color}, ${alpha})`;
      ctx.lineWidth = 2 + progress * 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
      ctx.fill();
    } else {
      if (!showWake) return false;
      p.x = p.cx + Math.sin(p.life * 0.05) * 10;
      p.y = p.cy;
      p.size = (p.size || 15) + 0.4;

      const alpha = (1 - Math.pow(progress, 1.5)) * 0.15;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size!);
      grad.addColorStop(0, `rgba(${p.color}, ${alpha})`);
      grad.addColorStop(1, `rgba(${p.color}, 0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size!, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    return p.life < p.maxLife;
  };

  useEffect(() => {
    const fxCanvas = fxCanvasRef.current;
    const planeCanvas = planeCanvasRef.current;
    if (!fxCanvas || !planeCanvas) return;

    const fxCtx = fxCanvas.getContext('2d');
    const planeCtx = planeCanvas.getContext('2d');
    if (!fxCtx || !planeCtx) return;

    const resize = () => {
      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
      planeCanvas.width = window.innerWidth;
      planeCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      if (!isRunning) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      timeRef.current += 16;
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      
      const coords = drawAirplane(planeCtx, planeCanvas.width, planeCanvas.height);

      // Spawn particles
      for (let i = 0; i < 2; i++) {
        particlesRef.current.push(createParticle('vortex_left', coords));
        particlesRef.current.push(createParticle('vortex_right', coords));
      }
      for (let i = 0; i < 5; i++) {
        particlesRef.current.push(createParticle('wake', coords));
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter((p, i) =>
        updateAndDrawParticle(fxCtx, p, i)
      );

      setParticleCount(particlesRef.current.length);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning, windSpeed, showVortices, showWake]);

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl text-white shadow-lg">
              <Plane className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                ✈️ CFD Máy Bay Giấy Nghệ Thuật
              </h1>
              <p className="text-slate-400 text-lg">Mô phỏng xoáy mút cánh & vệt xả dòng khí</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="bg-blue-900/50 text-blue-300 border-blue-700">
              <Wind className="h-3 w-3 mr-1" />
              Khí động học
            </Badge>
            <Badge className="bg-cyan-900/50 text-cyan-300 border-cyan-700">
              <TrendingUp className="h-3 w-3 mr-1" />
              CFD Simulation
            </Badge>
            <Badge className="bg-purple-900/50 text-purple-300 border-purple-700">
              <BookOpen className="h-3 w-3 mr-1" />
              Vật lý 12
            </Badge>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wind className="h-8 w-8 text-cyan-400" />
                <div>
                  <div className="text-2xl font-bold text-cyan-400">{windSpeed.toFixed(1)}x</div>
                  <div className="text-xs text-slate-400">Tốc độ gió</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-400"></div>
                <div>
                  <div className="text-2xl font-bold text-white">{particleCount}</div>
                  <div className="text-xs text-slate-400">Hạt khí động</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse"></div>
                <div>
                  <div className="text-2xl font-bold text-green-400">{isRunning ? 'ON' : 'OFF'}</div>
                  <div className="text-xs text-slate-400">Trạng thái</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-purple-400">60</div>
                  <div className="text-xs text-slate-400">FPS</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas Container */}
        <Card className="border-2 border-slate-700 overflow-hidden">
          <div className="relative" style={{ height: '600px' }}>
            <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(180deg, #a4cbf2 0%, #d4e8fa 45%, #e1c0a0 100%)', zIndex: 1 }} />
            <canvas ref={fxCanvasRef} className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'screen', zIndex: 2 }} />
            <canvas ref={planeCanvasRef} className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.15))', zIndex: 3 }} />
            
            {/* Info Overlay */}
            <div className="absolute top-4 left-4 z-10 bg-white/85 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/60">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Vortices & Wake CFD</h2>
              <p className="text-xs text-slate-600">Mô phỏng xoáy mút cánh & vệt xả dòng (Turbulence)</p>
            </div>
          </div>

          {/* Controls */}
          <CardContent className="p-6 bg-slate-800/50 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    <Wind className="inline h-4 w-4 mr-1" />
                    Tốc độ gió
                  </label>
                  <Slider 
                    value={[windSpeed]}
                    onValueChange={(val) => setWindSpeed(val[0])}
                    min={0.5}
                    max={3.0}
                    step={0.1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0.5x</span>
                    <span className="text-cyan-400 font-bold">{windSpeed.toFixed(1)}x</span>
                    <span>3.0x</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-300">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400"></div>
                      Xoáy mút cánh
                    </div>
                  </label>
                  <Switch
                    checked={showVortices}
                    onCheckedChange={setShowVortices}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-300">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500"></div>
                      Vệt xả đuôi
                    </div>
                  </label>
                  <Switch
                    checked={showWake}
                    onCheckedChange={setShowWake}
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button 
                  onClick={() => setIsRunning(!isRunning)}
                  className={`flex-1 font-bold ${
                    isRunning 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isRunning ? 'Tạm dừng' : 'Chạy'}
                </Button>
                <Button 
                  onClick={() => {
                    particlesRef.current = [];
                    setParticleCount(0);
                  }}
                  variant="outline"
                  className="border-slate-600 hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-bold text-slate-300 mb-2">Chú thích màu</h3>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded"></div>
                    <span>Xoáy trái (Vàng/Xanh)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-gradient-to-r from-cyan-400 to-green-400 rounded"></div>
                    <span>Xoáy phải (Xanh dương)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 bg-gradient-to-r from-blue-600 to-green-500 rounded"></div>
                    <span>Vệt đuôi (Xanh thẫm)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theory Section */}
        <Card className="border-2 border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-300">
              <BookOpen className="h-6 w-6 text-blue-400" />
              Khí Động Học & CFD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-300">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-green-500">
                <h3 className="font-bold text-green-300 mb-2">🌀 Xoáy Mút Cánh (Wingtip Vortices)</h3>
                <p className="text-sm">
                  Khi máy bay bay, chênh lệch áp suất giữa mặt trên và mặt dưới cánh tạo ra xoáy khí ở mút cánh. 
                  Xoáy này gây ra lực cản cảm ứng (induced drag), làm giảm hiệu suất bay.
                </p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-blue-500">
                <h3 className="font-bold text-blue-300 mb-2">💨 Vệt Xả (Wake Turbulence)</h3>
                <p className="text-sm">
                  Dòng khí rối loạn phía sau máy bay gọi là wake turbulence. 
                  Đây là lý do các máy bay phải giữ khoảng cách an toàn khi cất/hạ cánh.
                </p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-purple-500">
                <h3 className="font-bold text-purple-300 mb-2">📊 CFD (Computational Fluid Dynamics)</h3>
                <p className="text-sm">
                  CFD sử dụng phương pháp số để mô phỏng dòng chảy chất lưu. 
                  Ứng dụng trong thiết kế máy bay, ô tô, tàu thủy để tối ưu khí động học.
                </p>
              </div>
            </div>

            <div className="bg-blue-900/30 p-4 rounded-xl border border-blue-700">
              <h3 className="font-bold text-blue-300 mb-2">📐 Công Thức Khí Động Học</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="text-center text-lg font-bold text-green-400 mb-1">
                    Γ = ∮ v·ds
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong>Γ:</strong> Cường độ xoáy (Circulation)<br/>
                    <strong>v:</strong> Vận tốc dòng chảy
                  </div>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="text-center text-lg font-bold text-blue-400 mb-1">
                    D<sub>i</sub> = L² / (π·e·AR·q·S)
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong>D<sub>i</sub>:</strong> Lực cản cảm ứng<br/>
                    <strong>AR:</strong> Tỉ số sải cánh
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-900/30 p-4 rounded-xl border border-amber-700">
              <h3 className="font-bold text-amber-300 mb-2">💡 Ứng Dụng Thực Tế</h3>
              <ul className="space-y-2 text-sm text-amber-200">
                <li>• <strong>Winglets:</strong> Cánh nhỏ ở mút cánh giảm xoáy, tiết kiệm nhiên liệu</li>
                <li>• <strong>Khoảng cách an toàn:</strong> Máy bay nhỏ phải đợi sau máy bay lớn khi cất cánh</li>
                <li>• <strong>Thiết kế tối ưu:</strong> Giảm lực cản, tăng hiệu suất nhiên liệu</li>
                <li>• <strong>Đường bay:</strong> Tránh wake turbulence của máy bay đi trước</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
