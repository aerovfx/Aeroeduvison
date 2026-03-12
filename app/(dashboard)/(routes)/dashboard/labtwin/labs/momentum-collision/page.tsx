'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, RotateCcw, TrendingUp, Activity, BookOpen } from 'lucide-react';

interface Ball {
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  radius: number;
  mass: number;
  color: string;
  label: string;
  isHeld: boolean;
  vx: number;
  vy: number;
  onSlope: boolean;
}

export default function MomentumSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State controls
  const [massA, setMassA] = useState(2.0);
  const [massC, setMassC] = useState(1.0);
  const [isRunning, setIsRunning] = useState(false);
  const [momentumA, setMomentumA] = useState(0);
  const [momentumC, setMomentumC] = useState(0);

  // Physics constants
  const g = 0.15;
  const friction = 0.995;
  const slopeAngleRef = useRef(Math.PI / 10);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>();

  // Initialize balls
  const init = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const groundY = canvas.height - 50;
    const slopeStartX = canvas.width * 0.1;
    const slopeStartY = 100;
    const slopeEndX = canvas.width * 0.7;

    // Calculate slope angle
    const visualDx = slopeEndX - (slopeStartX - 40);
    const visualDy = groundY - (slopeStartY + 20);
    slopeAngleRef.current = Math.atan2(visualDy, visualDx);

    const startA = { x: slopeStartX, y: slopeStartY };
    const distanceDownSlope = canvas.width * 0.35;
    const startC = { 
      x: startA.x + Math.cos(slopeAngleRef.current) * distanceDownSlope, 
      y: startA.y + Math.sin(slopeAngleRef.current) * distanceDownSlope 
    };

    ballsRef.current = [
      {
        x: startA.x, y: startA.y,
        initialX: startA.x, initialY: startA.y,
        radius: 20, mass: massA, color: '#fbbf24', label: 'A',
        isHeld: false, vx: 0, vy: 0, onSlope: true
      },
      {
        x: startC.x, y: startC.y,
        initialX: startC.x, initialY: startC.y,
        radius: 20, mass: massC, color: '#10b981', label: 'C',
        isHeld: true, vx: 0, vy: 0, onSlope: true
      }
    ];
  };

  // Draw and update
  const drawScene = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const groundY = canvas.height - 50;
    const slopeStartX = canvas.width * 0.1;
    const slopeStartY = 100;
    const slopeEndX = canvas.width * 0.7;

    // Draw inclined plane
    ctx.beginPath();
    ctx.moveTo(slopeStartX - 40, slopeStartY + 20);
    ctx.lineTo(slopeStartX - 40, groundY);
    ctx.lineTo(slopeEndX, groundY);
    ctx.lineTo(slopeStartX - 40, slopeStartY + 20);
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.stroke();
    ctx.closePath();

    // Draw slope line
    ctx.beginPath();
    ctx.moveTo(slopeStartX - 40, slopeStartY + 20);
    ctx.lineTo(slopeEndX, groundY);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.closePath();

    // Draw ground
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.strokeStyle = '#475569';
    ctx.stroke();
    ctx.closePath();

    // Update and draw balls
    ballsRef.current.forEach(ball => {
      if (isRunning && !ball.isHeld) {
        if (ball.onSlope) {
          const ax = g * Math.cos(slopeAngleRef.current);
          const ay = g * Math.sin(slopeAngleRef.current);
          ball.vx += ax;
          ball.vy += ay;
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y + ball.radius >= groundY) {
          ball.y = groundY - ball.radius;
          if (ball.onSlope) {
            const speed = Math.sqrt(ball.vx**2 + ball.vy**2);
            ball.vx = speed * Math.sign(ball.vx);
            ball.vy = 0;
            ball.onSlope = false;
          }
          ball.vx *= friction;
        }
      }

      // Draw ball
      const gradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius/4, ball.x, ball.y, ball.radius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, ball.color);
      
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.closePath();

      // Label
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ball.label, ball.x, ball.y - ball.radius - 10);

      // Velocity vector
      const speed = Math.sqrt(ball.vx**2 + ball.vy**2);
      if (speed > 0.1) {
        const angle = Math.atan2(ball.vy, ball.vx);
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        const arrowLen = speed * 10;
        ctx.lineTo(ball.x + Math.cos(angle) * arrowLen, ball.y + Math.sin(angle) * arrowLen);
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.save();
        ctx.translate(ball.x + Math.cos(angle) * arrowLen, ball.y + Math.sin(angle) * arrowLen);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.fillStyle = '#e11d48';
        ctx.fill();
        ctx.restore();
      }
    });

    // Collision detection
    const bA = ballsRef.current[0];
    const bC = ballsRef.current[1];
    if (bA && bC) {
      const dx = bC.x - bA.x;
      const dy = bC.y - bA.y;
      const distance = Math.sqrt(dx*dx + dy*dy);

      if (distance < bA.radius + bC.radius) {
        bC.isHeld = false;

        let nx = 1, ny = 0;
        if (distance > 0) {
          nx = dx / distance;
          ny = dy / distance;
        }
        
        const dvx = bC.vx - bA.vx;
        const dvy = bC.vy - bA.vy;
        const vn = dvx * nx + dvy * ny;
        
        if (vn < 0) {
          const m1 = bA.mass;
          const m2 = bC.mass;
          const restitution = 1;
          const impulse = -(1 + restitution) * vn / (1 / m1 + 1 / m2);
          
          bA.vx -= (impulse / m1) * nx;
          bA.vy -= (impulse / m1) * ny;
          bC.vx += (impulse / m2) * nx;
          bC.vy += (impulse / m2) * ny;
        }

        const overlap = bA.radius + bC.radius - distance;
        bA.x -= (overlap / 2) * nx;
        bA.y -= (overlap / 2) * ny;
        bC.x += (overlap / 2) * nx;
        bC.y += (overlap / 2) * ny;
      }

      // Update momentum display
      const pA = bA.mass * Math.sqrt(bA.vx**2 + bA.vy**2);
      const pC = bC.mass * Math.sqrt(bC.vx**2 + bC.vy**2);
      setMomentumA(pA);
      setMomentumC(pC);
    }

    animationRef.current = requestAnimationFrame(drawScene);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth || 800;
      canvas.height = 400;
    }
    init();
    drawScene();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isRunning) init();
  }, [massA, massC]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    init();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚡ Động Lượng & Va Chạm
              </h1>
              <p className="text-slate-600 text-lg">Thí nghiệm bảo toàn động lượng trên mặt phẳng nghiêng</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <BookOpen className="h-3 w-3 mr-1" />
              Vật lý 10
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <TrendingUp className="h-3 w-3 mr-1" />
              Bảo toàn động lượng
            </Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Play className="h-3 w-3 mr-1" />
              Interactive
            </Badge>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-bold text-white">A</div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{massA.toFixed(1)}kg</div>
                  <div className="text-xs text-gray-600">Khối lượng A</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-white">C</div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{massC.toFixed(1)}kg</div>
                  <div className="text-xs text-gray-600">Khối lượng C</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{momentumA.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">pA (kg.m/s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{momentumC.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">pC (kg.m/s)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simulation Canvas */}
        <Card className="border-2 border-blue-200 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              Mô phỏng va chạm
            </CardTitle>
            <CardDescription>Quan sát sự truyền động lượng giữa 2 bóng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <canvas 
                ref={canvasRef} 
                className="w-full h-[400px] rounded-xl border-b-4 border-gray-600"
                style={{ background: 'linear-gradient(to bottom, #f0f9ff, #e0f2fe)' }}
              />
              
              {/* Overlay Stats */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-yellow-100 p-2 rounded shadow text-sm border border-yellow-300">
                  <strong className="text-yellow-800">Bóng A:</strong> 
                  <span className="text-yellow-700 ml-2">p = {momentumA.toFixed(2)} kg.m/s</span>
                </div>
                <div className="bg-green-100 p-2 rounded shadow text-sm border border-green-300">
                  <strong className="text-green-800">Bóng C:</strong> 
                  <span className="text-green-700 ml-2">p = {momentumC.toFixed(2)} kg.m/s</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Khối lượng bóng A (kg)
                </label>
                <Slider 
                  value={[massA]}
                  onValueChange={(val) => setMassA(val[0])}
                  min={0.5}
                  max={5}
                  step={0.5}
                  disabled={isRunning}
                  className="py-2"
                />
                <span className="text-xs text-blue-600 font-bold">{massA.toFixed(1)} kg</span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Khối lượng bóng C (kg)
                </label>
                <Slider 
                  value={[massC]}
                  onValueChange={(val) => setMassC(val[0])}
                  min={0.5}
                  max={5}
                  step={0.5}
                  disabled={isRunning}
                  className="py-2"
                />
                <span className="text-xs text-green-600 font-bold">{massC.toFixed(1)} kg</span>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleStart}
                  disabled={isRunning}
                  className={`flex-1 font-bold ${
                    isRunning 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isRunning ? 'Đang chạy...' : 'Thả bóng (A)'}
                </Button>
                <Button 
                  onClick={handleReset}
                  variant="outline"
                  className="border-gray-400 hover:bg-gray-100"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theory Section */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <BookOpen className="h-6 w-6 text-blue-500" />
              Giải thích vật lý
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-yellow-500">
                <h3 className="font-bold text-yellow-800 mb-2">📊 Động lượng (p = m·v)</h3>
                <p className="text-sm text-gray-700">
                  Khi bóng A lăn xuống, nó tích lũy vận tốc nhờ trọng lực, dẫn đến tăng động lượng. 
                  Động lượng tỉ lệ thuận với khối lượng và vận tốc.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
                <h3 className="font-bold text-purple-800 mb-2">💥 Va chạm</h3>
                <p className="text-sm text-gray-700">
                  Khi A chạm C, một phần hoặc toàn bộ động lượng được truyền từ A sang C. 
                  Trong va chạm đàn hồi, cả động lượng và động năng được bảo toàn.
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
                <h3 className="font-bold text-green-800 mb-2">♻️ Bảo toàn động lượng</h3>
                <p className="text-sm text-gray-700">
                  Trong hệ kín không có ngoại lực, tổng động lượng của hệ (A + C) được bảo toàn 
                  trước và sau va chạm: <strong className="text-green-700">p<sub>total</sub> = constant</strong>
                </p>
              </div>
            </div>

            <div className="bg-blue-100 p-4 rounded-xl border border-blue-200">
              <h3 className="font-bold text-blue-900 mb-2">📐 Công thức tính</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-center text-lg font-bold text-blue-700 mb-1">
                    p = m · v
                  </div>
                  <div className="text-xs text-gray-600">
                    <strong>p:</strong> Động lượng (kg.m/s)<br/>
                    <strong>m:</strong> Khối lượng (kg)<br/>
                    <strong>v:</strong> Vận tốc (m/s)
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-center text-lg font-bold text-purple-700 mb-1">
                    p<sub>trước</sub> = p<sub>sau</sub>
                  </div>
                  <div className="text-xs text-gray-600">
                    Định luật bảo toàn động lượng<br/>
                    m<sub>A</sub>v<sub>A</sub> + m<sub>C</sub>v<sub>C</sub> = constant
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Section */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <BookOpen className="h-5 w-5 text-green-500" />
              Câu hỏi kiểm tra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold text-green-900 mb-3">
                  Câu 1: Nếu tăng khối lượng bóng A từ 2kg lên 4kg, động lượng của hệ sau va chạm sẽ thay đổi như thế nào?
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {['Giữ nguyên', 'Tăng gấp đôi', 'Giảm một nửa', 'Tăng gấp bốn'].map((answer, i) => (
                    <Button key={i} variant="outline" className="justify-start h-auto py-3">
                      <span className="w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center mr-2 text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {answer}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-green-200 text-sm text-green-700">
                  <strong>Đáp án:</strong> B - Tăng gấp đôi (vì p = m·v, khi m tăng gấp đôi thì p cũng tăng gấp đôi)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
