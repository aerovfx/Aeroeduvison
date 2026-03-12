'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Plane, Wind, BookOpen, Info, Move } from 'lucide-react';

interface Anchor {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  spin: number;
  type: 'vortex' | 'tube';
  maxRadius: number;
}

interface Particle {
  type: string;
  x: number;
  y: number;
  cx: number;
  cy: number;
  life: number;
  maxLife: number;
  color: string;
  angle: number;
  radius: number;
  maxRadius: number;
  vx: number;
  vy: number;
  spin: number;
  history: {x: number; y: number}[];
}

interface PlaneCoords {
  N: {x: number; y: number};
  RT?: {x: number; y: number};
  LT?: {x: number; y: number};
  TT?: {x: number; y: number};
  TB?: {x: number; y: number};
  TE1?: {x: number; y: number};
  TE2?: {x: number; y: number};
  TE3?: {x: number; y: number};
  TE4?: {x: number; y: number};
  C?: {x: number; y: number};
}

export default function AdvancedCFDSimulation() {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const planeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentModel, setCurrentModel] = useState<'b2' | 'image' | 'paper'>('b2');
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [particleCount, setParticleCount] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  
  const anchorsRef = useRef<Anchor[]>([
    { id: 'vortex_left', label: 'Mút trái', x: 0.2, y: 0.7, color: '147, 51, 234', spin: -0.18, type: 'vortex', maxRadius: 45 },
    { id: 'vortex_right', label: 'Mút phải', x: 0.8, y: 0.2, color: '147, 51, 234', spin: 0.18, type: 'vortex', maxRadius: 40 },
    { id: 'tube_1', label: 'Ống xoáy 1', x: 0.45, y: 0.7, color: '79, 70, 229', spin: -0.3, type: 'tube', maxRadius: 8 },
    { id: 'tube_2', label: 'Ống xoáy 2', x: 0.65, y: 0.5, color: '79, 70, 229', spin: 0.3, type: 'tube', maxRadius: 8 }
  ]);
  
  const draggedAnchorRef = useRef<Anchor | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  // Tọa độ các mẫu máy bay
  const getPlaneCoords = (): PlaneCoords => {
    const cx = width / 2;
    const cy = height / 2;
    const bobbingX = Math.sin(timeRef.current * 0.002) * 3;
    const bobbingY = Math.cos(timeRef.current * 0.0015) * 4;
    const offset = { x: cx + bobbingX - 30, y: cy + bobbingY - 50 };

    if (currentModel === 'paper') {
      return {
        N: { x: offset.x - 140, y: offset.y - 230 },
        RT: { x: offset.x + 180, y: offset.y + 30 },
        LT: { x: offset.x - 80, y: offset.y + 130 },
        TT: { x: offset.x + 30, y: offset.y + 60 },
        TB: { x: offset.x + 50, y: offset.y + 160 }
      };
    } else {
      return {
        N: { x: offset.x - 100, y: offset.y - 130 },
        RT: { x: offset.x + 180, y: offset.y - 20 },
        LT: { x: offset.x - 220, y: offset.y + 130 },
        TE1: { x: offset.x - 130, y: offset.y + 110 },
        TE2: { x: offset.x - 50, y: offset.y + 60 },
        TE3: { x: offset.x + 50, y: offset.y + 40 },
        TE4: { x: offset.x + 120, y: offset.y + 10 },
        C: { x: offset.x, y: offset.y + 80 }
      };
    }
  };

  // Xử lý upload ảnh
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => setUploadedImage(img);
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Xử lý kéo thả anchor
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (currentModel !== 'image' || !uploadedImage) return;
    
    const rect = fxCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    for (const anchor of anchorsRef.current) {
      const ax = anchor.x * width;
      const ay = anchor.y * height;
      if (Math.hypot(mx - ax, my - ay) < 25) {
        draggedAnchorRef.current = anchor;
        break;
      }
    }
  }, [currentModel, uploadedImage, width, height]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedAnchorRef.current) return;
    
    const rect = fxCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    draggedAnchorRef.current.x = Math.max(0, Math.min(1, (e.clientX - rect.left) / width));
    draggedAnchorRef.current.y = Math.max(0, Math.min(1, (e.clientY - rect.top) / height));
  }, [width, height]);

  const handleMouseUp = useCallback(() => {
    draggedAnchorRef.current = null;
  }, []);

  // Vẽ máy bay giấy
  const drawPaperPlane = useCallback((ctx: CanvasRenderingContext2D, coords: PlaneCoords) => {
    const { N, RT, LT, TT, TB } = coords;
    
    // Left wing
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TB.x, TB.y); ctx.lineTo(LT.x, LT.y);
    ctx.closePath();
    const gradLW = ctx.createLinearGradient(N.x, N.y, LT.x, LT.y);
    gradLW.addColorStop(0, '#f8fafc');
    gradLW.addColorStop(0.5, '#e0f2fe');
    gradLW.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradLW;
    ctx.fill();

    // Fuselage
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.lineTo(TB.x, TB.y);
    ctx.closePath();
    const gradFuse = ctx.createLinearGradient(N.x, N.y, TB.x, TB.y);
    gradFuse.addColorStop(0, '#94a3b8');
    gradFuse.addColorStop(1, '#475569');
    ctx.fillStyle = gradFuse;
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.lineTo(RT.x, RT.y);
    ctx.closePath();
    const gradRW = ctx.createLinearGradient((N.x! + TT.x!) / 2 - 20, (N.y! + TT.y!) / 2, RT.x!, RT.y!);
    gradRW.addColorStop(0, '#1d4ed8');
    gradRW.addColorStop(0.1, '#38bdf8');
    gradRW.addColorStop(0.25, '#ffffff');
    gradRW.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradRW;
    ctx.fill();

    // Outlines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(LT.x, LT.y); ctx.lineTo(TB.x, TB.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(RT.x, RT.y); ctx.lineTo(TT.x, TT.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(N.x, N.y); ctx.lineTo(TT.x, TT.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(TT.x, TT.y); ctx.lineTo(TB.x, TB.y); ctx.stroke();
  }, []);

  // Vẽ máy bay B-2
  const drawB2Plane = useCallback((ctx: CanvasRenderingContext2D, coords: PlaneCoords) => {
    const { N, RT, LT, TE1, TE2, TE3, TE4, C } = coords;
    
    ctx.beginPath();
    ctx.moveTo(N.x, N.y);
    ctx.quadraticCurveTo(-180, -30, LT.x, LT.y);
    ctx.lineTo(TE1.x, TE1.y);
    ctx.lineTo(TE2.x, TE2.y);
    ctx.lineTo(C.x, C.y);
    ctx.lineTo(TE3.x, TE3.y);
    ctx.lineTo(TE4.x, TE4.y);
    ctx.lineTo(RT.x, RT.y);
    ctx.quadraticCurveTo(70, -100, N.x, N.y);
    ctx.closePath();

    const mainGrad = ctx.createLinearGradient(N.x, N.y, C.x, C.y);
    mainGrad.addColorStop(0, '#ef4444');
    mainGrad.addColorStop(0.15, '#1e3a8a');
    mainGrad.addColorStop(0.35, '#3b82f6');
    mainGrad.addColorStop(0.65, '#ffffff');
    mainGrad.addColorStop(0.85, '#fca5a5');
    mainGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = mainGrad;
    ctx.fill();

    // Pressure distribution effect
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(N.x, N.y);
    ctx.quadraticCurveTo(-180, -30, LT.x, LT.y);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 45;
    ctx.filter = 'blur(12px)';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(N.x, N.y);
    ctx.quadraticCurveTo(70, -100, RT.x, RT.y);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 35;
    ctx.stroke();
    ctx.restore();
    ctx.filter = 'none';
    
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  // Vẽ aircraft
  const drawAircraft = useCallback(() => {
    const canvas = planeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    if (currentModel === 'image') {
      if (uploadedImage) {
        const imgRatio = uploadedImage.width / uploadedImage.height;
        const canvasRatio = width / height;
        let drawW, drawH, drawX, drawY;

        if (imgRatio > canvasRatio) {
          drawH = height;
          drawW = uploadedImage.width * (height / uploadedImage.height);
          drawX = (width - drawW) / 2;
          drawY = 0;
        } else {
          drawW = width;
          drawH = uploadedImage.height * (width / uploadedImage.width);
          drawX = 0;
          drawY = (height - drawH) / 2;
        }
        ctx.drawImage(uploadedImage, drawX, drawY, drawW, drawH);
      } else {
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Chưa có ảnh. Vui lòng tải ảnh lên.", width / 2, height / 2);
      }
    } else {
      const coords = getPlaneCoords();
      if (currentModel === 'paper') {
        drawPaperPlane(ctx, coords);
      } else {
        drawB2Plane(ctx, coords);
      }
    }
    ctx.restore();
  }, [currentModel, uploadedImage, width, height, drawPaperPlane, drawB2Plane]);

  // Tạo particle
  const createParticle = useCallback((type: string, startX?: number, startY?: number, customProps?: Partial<Particle>): Particle => {
    const coords = getPlaneCoords();
    const bobbingX = Math.sin(timeRef.current * 0.002) * 3;
    const bobbingY = Math.cos(timeRef.current * 0.0015) * 4;
    const offset = { x: width / 2 + bobbingX - 30, y: height / 2 + bobbingY - 50 };

    if (currentModel === 'image') {
      return {
        type,
        x: startX || 0,
        y: startY || 0,
        cx: startX || 0,
        cy: startY || 0,
        life: 0,
        maxLife: 200 + Math.random() * 50,
        color: customProps?.color || '147, 51, 234',
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        maxRadius: customProps?.maxRadius || 30,
        vx: 4.0,
        vy: 2.5,
        spin: customProps?.spin || 0.2,
        history: []
      };
    } else if (currentModel === 'paper') {
      const isLeft = type === 'vortex_left';
      const x = isLeft ? offset.x + coords.LT!.x - offset.x : offset.x + coords.RT!.x - offset.x;
      const y = isLeft ? offset.y + coords.LT!.y - offset.y : offset.y + coords.RT!.y - offset.y;
      return {
        type,
        x, y, cx: x, cy: y,
        life: 0,
        maxLife: 120 + Math.random() * 50,
        color: isLeft ? '34, 197, 94' : '56, 189, 248',
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        maxRadius: 99,
        vx: 2.5 + Math.random(),
        vy: 2 + Math.random(),
        spin: isLeft ? -0.15 : 0.15,
        history: []
      };
    } else {
      // B-2 model
      let x, y, color, maxRadius, spin;
      if (type === 'vortex_left') {
        x = offset.x + coords.LT!.x - offset.x;
        y = offset.y + coords.LT!.y - offset.y;
        color = '147, 51, 234';
        maxRadius = 45;
        spin = -0.18;
      } else if (type === 'vortex_right') {
        x = offset.x + coords.RT!.x - offset.x;
        y = offset.y + coords.RT!.y - offset.y;
        color = '147, 51, 234';
        maxRadius = 40;
        spin = 0.18;
      } else {
        const isLeft = type === 'tube_left';
        x = offset.x + (isLeft ? coords.TE1!.x - offset.x : coords.TE4!.x - offset.x);
        y = offset.y + (isLeft ? coords.TE1!.y - offset.y : coords.TE4!.y - offset.y);
        color = '79, 70, 229';
        maxRadius = 8;
        spin = isLeft ? -0.3 : 0.3;
      }
      return {
        type,
        x, y, cx: x, cy: y,
        life: 0,
        maxLife: 180 + Math.random() * 50,
        color,
        angle: Math.random() * Math.PI * 2,
        radius: 0,
        maxRadius,
        vx: 2.5 + Math.random(),
        vy: 2 + Math.random(),
        spin,
        history: []
      };
    }
  }, [currentModel, width, height, getPlaneCoords]);

  // Update và vẽ particle
  const updateAndDrawParticle = useCallback((ctx: CanvasRenderingContext2D, p: Particle): boolean => {
    p.life++;
    p.cx += p.vx;
    p.cy += p.vy;

    if (p.radius < p.maxRadius) p.radius += 0.8;
    p.angle += p.spin;
    p.x = p.cx + Math.cos(p.angle) * p.radius;
    p.y = p.cy + Math.sin(p.angle) * p.radius * 0.45;
    p.history.push({ x: p.x, y: p.y });
    if (p.history.length > 30) p.history.shift();

    if (p.history.length < 2) return true;
    
    const progress = p.life / p.maxLife;
    const alpha = (1 - progress) * 0.8;

    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = `rgba(${p.color}, ${alpha})`;
    const baseWidth = p.type.includes('tube') ? 1.5 : 3;
    ctx.lineWidth = baseWidth + progress * 2;
    ctx.stroke();

    if (p.type.includes('vortex')) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    return p.life < p.maxLife;
  }, []);

  // Vẽ anchors
  const drawAnchors = useCallback(() => {
    if (currentModel !== 'image' || !uploadedImage) return;
    
    const ctx = fxCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    for (const anchor of anchorsRef.current) {
      const ax = anchor.x * width;
      const ay = anchor.y * height;
      
      ctx.beginPath();
      ctx.arc(ax, ay, 12, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${anchor.color}, 0.5)`;
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(anchor.label, ax, ay - 20);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }, [currentModel, uploadedImage, width, height]);

  // Animation loop
  useEffect(() => {
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWidth(w);
      setHeight(h);
      
      if (fxCanvasRef.current) {
        fxCanvasRef.current.width = w;
        fxCanvasRef.current.height = h;
      }
      if (planeCanvasRef.current) {
        planeCanvasRef.current.width = w;
        planeCanvasRef.current.height = h;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      timeRef.current += 16;
      const fxCtx = fxCanvasRef.current?.getContext('2d');
      if (!fxCtx) return;

      fxCtx.clearRect(0, 0, width, height);
      drawAircraft();

      // Spawn particles
      if (currentModel === 'image' && uploadedImage) {
        for (const anchor of anchorsRef.current) {
          const count = anchor.type === 'vortex' ? 3 : 1;
          for (let i = 0; i < count; i++) {
            particlesRef.current.push(createParticle(anchor.type, anchor.x * width, anchor.y * height, anchor));
          }
        }
      } else if (currentModel === 'paper') {
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push(createParticle('vortex_left'));
          particlesRef.current.push(createParticle('vortex_right'));
        }
      } else {
        for (let i = 0; i < 4; i++) {
          particlesRef.current.push(createParticle('vortex_left'));
          particlesRef.current.push(createParticle('vortex_right'));
        }
        for (let i = 0; i < 2; i++) {
          particlesRef.current.push(createParticle('tube_left'));
          particlesRef.current.push(createParticle('tube_right'));
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current.filter(p =>
        updateAndDrawParticle(fxCtx, p)
      );

      setParticleCount(particlesRef.current.length);
      drawAnchors();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentModel, uploadedImage, width, height, drawAircraft, createParticle, updateAndDrawParticle, drawAnchors]);

  const getModelDescription = () => {
    switch (currentModel) {
      case 'b2':
        return 'Mô phỏng Phân bố Áp suất (Đỏ: Cao, Xanh: Thấp) và ống xoáy rìa cánh máy bay ném bom B-2.';
      case 'image':
        return 'Sử dụng chính bức ảnh bạn có làm nền. Kéo thả các điểm neo để đặt vị trí sinh luồng xoáy!';
      case 'paper':
        return 'Mô phỏng nghệ thuật xoáy khí động học của Máy bay Giấy.';
    }
  };

  const getBackgroundColor = () => {
    switch (currentModel) {
      case 'b2':
        return 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)';
      case 'image':
        return '#111827';
      case 'paper':
        return 'linear-gradient(180deg, #a4cbf2 0%, #d4e8fa 45%, #e1c0a0 100%)';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      {/* Canvas Layers */}
      <div className="relative w-screen h-screen">
        <canvas 
          ref={bgCanvasRef}
          className="absolute inset-0 w-full h-full transition-all duration-500"
          style={{ background: getBackgroundColor(), zIndex: 1 }}
        />
        <canvas 
          ref={planeCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ filter: 'drop-shadow(0px 30px 40px rgba(0,0,0,0.3))', zIndex: 2 }}
        />
        <canvas 
          ref={fxCanvasRef}
          className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
          style={{ mixBlendMode: 'screen', zIndex: 3 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Info Panel */}
        {showInfo && (
          <Card className="absolute top-4 left-4 z-10 w-80 bg-white/95 backdrop-blur-sm shadow-xl border-white/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Vortices & Wake CFD
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInfo(false)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              <CardDescription className="text-xs">
                {getModelDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={currentModel} onValueChange={(v) => setCurrentModel(v as any)}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="b2">✈️ Máy bay B-2 (Đồ họa 2D)</SelectItem>
                  <SelectItem value="image">📷 Dùng Ảnh Thật Của Bạn</SelectItem>
                  <SelectItem value="paper">📄 Máy bay Giấy</SelectItem>
                </SelectContent>
              </Select>

              {currentModel === 'image' && (
                <div className="pt-3 border-t border-dashed border-slate-300">
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button
                    onClick={() => document.getElementById('imageUpload')?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Tải Ảnh Lên
                  </Button>
                  <p className="text-xs text-red-500 font-bold mt-2 text-center">
                    <Move className="inline h-3 w-3 mr-1" />
                    Kéo thả các điểm neo để điều chỉnh vị trí!
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Wind className="h-3 w-3" />
                <span>{particleCount} hạt khí động</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toggle Info Button */}
        {!showInfo && (
          <Button
            onClick={() => setShowInfo(true)}
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm"
          >
            <Info className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
