'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, RotateCcw, BookOpen, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';

export default function InclinedPlaneDiagram() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(30); // degrees
  const [showForces, setShowForces] = useState(true);
  const [showComponents, setShowComponents] = useState(true);
  const [ballRadius, setBallRadius] = useState(40);
  const [animationOffset, setAnimationOffset] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const rad = (angle * Math.PI) / 180;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Ground reference line
    ctx.beginPath();
    ctx.moveTo(50, height - 80);
    ctx.lineTo(width - 50, height - 80);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw inclined plane
    const planeStartX = 100;
    const planeStartY = height - 80;
    const planeLength = 500;
    const planeEndX = planeStartX + planeLength * Math.cos(rad);
    const planeEndY = planeStartY - planeLength * Math.sin(rad);

    // Plane surface
    ctx.beginPath();
    ctx.moveTo(planeStartX, planeStartY);
    ctx.lineTo(planeEndX, planeEndY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Plane support (triangle)
    ctx.beginPath();
    ctx.moveTo(planeStartX, planeStartY);
    ctx.lineTo(planeEndX, planeEndY);
    ctx.lineTo(planeEndX, planeStartY);
    ctx.closePath();
    ctx.fillStyle = '#cbd5e1';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Angle arc
    ctx.beginPath();
    ctx.arc(planeStartX, planeStartY, 60, -rad, 0);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Angle label
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${angle}°`, planeStartX + 50, planeStartY - 20);

    // Ball position on the plane
    const ballDist = 200 + animationOffset;
    const ballX = planeStartX + ballDist * Math.cos(rad);
    const ballY = planeStartY - ballDist * Math.sin(rad) - ballRadius;

    // Ball shadow
    ctx.beginPath();
    ctx.ellipse(ballX, planeStartY - ballRadius * 0.3, ballRadius * 0.8, ballRadius * 0.3, -rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fill();

    // Draw ball with 3D effect
    const ballGradient = ctx.createRadialGradient(
      ballX - ballRadius * 0.3, 
      ballY - ballRadius * 0.3, 
      ballRadius * 0.2,
      ballX, 
      ballY, 
      ballRadius
    );
    ballGradient.addColorStop(0, '#fef3c7');
    ballGradient.addColorStop(0.5, '#fbbf24');
    ballGradient.addColorStop(1, '#d97706');

    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = ballGradient;
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Contact point
    const contactX = ballX + ballRadius * Math.sin(rad);
    const contactY = ballY + ballRadius * Math.cos(rad);
    
    ctx.beginPath();
    ctx.arc(contactX, contactY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Contact point label
    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('N', contactX + 20, contactY + 20);

    if (showForces) {
      const arrowScale = 2.5;
      const g = 9.8 * arrowScale; // Gravity magnitude

      // Weight vector (mg) - pointing straight down
      const weightLength = g;
      ctx.beginPath();
      ctx.moveTo(ballX, ballY);
      ctx.lineTo(ballX, ballY + weightLength);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Arrowhead for weight
      drawArrowhead(ctx, ballX, ballY + weightLength, Math.PI / 2, '#ef4444');
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('P = mg', ballX + 40, ballY + weightLength / 2);

      if (showComponents) {
        // Normal force (N) - perpendicular to plane
        const normalLength = g * Math.cos(rad) * 0.9;
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(
          ballX - normalLength * Math.sin(rad),
          ballY - normalLength * Math.cos(rad)
        );
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        drawArrowhead(
          ctx,
          ballX - normalLength * Math.sin(rad),
          ballY - normalLength * Math.cos(rad),
          Math.PI / 2 + rad,
          '#22c55e'
        );
        ctx.fillStyle = '#22c55e';
        ctx.fillText('N', ballX - normalLength * Math.sin(rad) - 20, ballY - normalLength * Math.cos(rad) - 10);

        // Parallel component (mg·sinθ) - along the plane
        const parallelLength = g * Math.sin(rad);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(
          ballX + parallelLength * Math.cos(rad),
          ballY + parallelLength * Math.sin(rad)
        );
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        drawArrowhead(
          ctx,
          ballX + parallelLength * Math.cos(rad),
          ballY + parallelLength * Math.sin(rad),
          -rad,
          '#3b82f6'
        );
        ctx.fillStyle = '#3b82f6';
        ctx.fillText('mg·sinθ', ballX + parallelLength * Math.cos(rad) / 2 + 30, ballY + parallelLength * Math.sin(rad) / 2 + 20);

        // Perpendicular component (mg·cosθ)
        const perpLength = g * Math.cos(rad);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(
          ballX + perpLength * Math.sin(rad),
          ballY - perpLength * Math.cos(rad)
        );
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        drawArrowhead(
          ctx,
          ballX + perpLength * Math.sin(rad),
          ballY - perpLength * Math.cos(rad),
          Math.PI / 2 - rad,
          '#a855f7'
        );
        ctx.fillStyle = '#a855f7';
        ctx.fillText('mg·cosθ', ballX + perpLength * Math.sin(rad) + 40, ballY - perpLength * Math.cos(rad) / 2);

        // Right angle marker
        ctx.beginPath();
        ctx.moveTo(ballX, ballY - 20);
        ctx.lineTo(ballX - 15 * Math.sin(rad), ballY - 20 - 15 * Math.cos(rad));
        ctx.lineTo(ballX + 15 * Math.cos(rad), ballY - 20 + 15 * Math.sin(rad));
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Friction force (if ball is rolling)
    if (showForces && animationOffset > 0) {
      const frictionLength = 40;
      ctx.beginPath();
      ctx.moveTo(ballX, ballY);
      ctx.lineTo(
        ballX - frictionLength * Math.cos(rad),
        ballY - frictionLength * Math.sin(rad)
      );
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      drawArrowhead(
        ctx,
        ballX - frictionLength * Math.cos(rad),
        ballY - frictionLength * Math.sin(rad),
        Math.PI - rad,
        '#f97316'
      );
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('F<sub>ms</sub>', ballX - frictionLength * Math.cos(rad) - 30, ballY - frictionLength * Math.sin(rad) - 10);
    }

    // Height indicator
    const heightVal = ballDist * Math.sin(rad);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(ballX - 80, ballY);
    ctx.lineTo(ballX - 80, planeStartY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`h = ${heightVal.toFixed(1)}m`, ballX - 90, (ballY + planeStartY) / 2);

  }, [angle, showForces, showComponents, ballRadius, animationOffset]);

  // Animation for rolling ball
  useEffect(() => {
    if (animationOffset > 0) {
      const timer = setTimeout(() => {
        setAnimationOffset(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [animationOffset]);

  const drawArrowhead = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    color: string
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-12, 8);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  };

  const handleRoll = () => {
    setAnimationOffset(100);
  };

  const handleReset = () => {
    setAnimationOffset(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg">
              <Settings className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📐 Quả Bóng Trên Mặt Phẳng Nghiêng
              </h1>
              <p className="text-slate-600 text-lg">Phân tích lực và chuyển động trên mặt phẳng nghiêng</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <BookOpen className="h-3 w-3 mr-1" />
              Vật lý 10
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <ArrowDown className="h-3 w-3 mr-1" />
              Phân tích lực
            </Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Settings className="h-3 w-3 mr-1" />
              Interactive
            </Badge>
          </div>
        </div>

        {/* Main Diagram */}
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              Sơ đồ lực tác dụng
            </CardTitle>
            <CardDescription>Điều chỉnh góc nghiêng và xem phân tích lực</CardDescription>
          </CardHeader>
          <CardContent>
            <canvas 
              ref={canvasRef} 
              width={800} 
              height={500}
              className="w-full h-auto rounded-xl border-2 border-slate-200"
            />
            
            {/* Controls */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Góc nghiêng (θ)
                  </label>
                  <Slider 
                    value={[angle]}
                    onValueChange={(val) => setAngle(val[0])}
                    min={5}
                    max={60}
                    step={5}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5°</span>
                    <span className="text-blue-600 font-bold">{angle}°</span>
                    <span>60°</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Bán kính bóng
                  </label>
                  <Slider 
                    value={[ballRadius]}
                    onValueChange={(val) => setBallRadius(val[0])}
                    min={20}
                    max={60}
                    step={5}
                    className="py-2"
                  />
                  <span className="text-xs text-slate-500">{ballRadius}px</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="showForces"
                    checked={showForces}
                    onChange={(e) => setShowForces(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="showForces" className="text-sm font-medium text-slate-700">
                    Hiển thị vector lực
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="showComponents"
                    checked={showComponents}
                    onChange={(e) => setShowComponents(e.target.checked)}
                    disabled={!showForces}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="showComponents" className="text-sm font-medium text-slate-700">
                    Phân tích thành phần lực
                  </label>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleRoll}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Thả bóng
                  </Button>
                  <Button 
                    onClick={handleReset}
                    variant="outline"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Force Legend */}
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Chú thích các lực</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="w-8 h-1 bg-red-500 rounded"></div>
                <div>
                  <div className="font-semibold text-red-800">P = mg</div>
                  <div className="text-xs text-red-600">Trọng lực (hướng xuống)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-1 bg-green-500 rounded"></div>
                <div>
                  <div className="font-semibold text-green-800">N</div>
                  <div className="text-xs text-green-600">Phản lực (vuông góc mặt phẳng)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-8 h-1 bg-blue-500 rounded"></div>
                <div>
                  <div className="font-semibold text-blue-800">mg·sinθ</div>
                  <div className="text-xs text-blue-600">Thành phần song song (gây lăn)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="w-8 h-1 bg-purple-500 rounded"></div>
                <div>
                  <div className="font-semibold text-purple-800">mg·cosθ</div>
                  <div className="text-xs text-purple-600">Thành phần vuông góc</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="w-8 h-1 bg-orange-500 rounded"></div>
                <div>
                  <div className="font-semibold text-orange-800">F<sub>ms</sub></div>
                  <div className="text-xs text-orange-600">Lực ma sát (chống lại chuyển động)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theory Section */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <BookOpen className="h-6 w-6 text-blue-500" />
              Phân tích vật lý
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-bold text-blue-900">📐 Các lực tác dụng</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold">•</span>
                    <span><strong>Trọng lực P:</strong> Luôn hướng thẳng đứng xuống dưới</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span><strong>Phản lực N:</strong> Vuông góc với mặt phẳng nghiêng</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Thành phần song song:</strong> mg·sinθ gây ra gia tốc lăn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500 font-bold">•</span>
                    <span><strong>Thành phần vuông góc:</strong> mg·cosθ cân bằng bởi phản lực</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-bold text-purple-900">📊 Công thức</h3>
                <div className="bg-white p-4 rounded-lg border-2 border-purple-200 space-y-2">
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-700">P = mg</div>
                    <div className="text-xs text-slate-600">Trọng lực</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="text-sm font-bold text-blue-700">P<sub>∥</sub> = mg·sinθ</div>
                      <div className="text-xs text-slate-600">Song song</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <div className="text-sm font-bold text-purple-700">P<sub>⊥</sub> = mg·cosθ</div>
                      <div className="text-xs text-slate-600">Vuông góc</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-700">N = mg·cosθ</div>
                    <div className="text-xs text-slate-600">Phản lực</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <h3 className="font-bold text-yellow-900 mb-2">💡 Nhận xét quan trọng</h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Khi θ = 0°: Vật đứng yên trên mặt phẳng ngang</li>
                <li>• Khi θ tăng: Thành phần mg·sinθ tăng → gia tốc lăn tăng</li>
                <li>• Khi θ = 90°: Vật rơi tự do (mg·sin90° = mg)</li>
                <li>• Phản lực N giảm khi góc nghiêng tăng</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
