'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, CheckCircle, Trophy, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

interface RayData {
  start: [number, number];
  end: [number, number];
  color: string;
}

export default function LensIdentificationPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [lensType, setLensType] = useState<'convergent' | 'divergent'>('convergent');
  const [focalLength, setFocalLength] = useState(15); // cm
  const [numRays, setNumRays] = useState(5);
  const [raySpacing, setRaySpacing] = useState(30); // pixels
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values to detect changes
  const initialValues = useRef({
    lensType: 'convergent' as 'convergent' | 'divergent',
    focalLength: 15,
    numRays: 5
  });

  // Lab configuration
  const config = {
    name: "lens-identification",
    title: "Nhận biết thấu kính hội tụ và phân kỳ",
    description: "Phân biệt thấu kính qua đặc điểm hội tụ và phân tán tia sáng",
    category: "Quang học",
    level: "Lớp 11",
    duration: "30 phút",
    xp: 60,
    port: 8018
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:${config.port}/api/health`);
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, [isMounted]);

  // Calculate ray paths through lens
  const calculateRayPaths = (): RayData[] => {
    const rays: RayData[] = [];
    const lensX = 300; // Center of lens in canvas coordinates
    const focalLengthPx = focalLength * 10; // Convert cm to pixels (scale factor)
    
    for (let i = 0; i < numRays; i++) {
      const offsetY = (i - Math.floor(numRays / 2)) * raySpacing;
      
      if (lensType === 'convergent') {
        // Convergent lens: parallel rays converge to focal point
        const focalPointX = lensX + focalLengthPx;
        const focalPointY = 0; // On optical axis
        
        rays.push({
          start: [-100, offsetY],
          end: [lensX, offsetY],
          color: '#EF4444' // Red for incident rays
        });
        
        rays.push({
          start: [lensX, offsetY],
          end: [focalPointX, focalPointY],
          color: '#3B82F6' // Blue for refracted rays
        });
      } else {
        // Divergent lens: parallel rays diverge as if from virtual focal point
        const focalPointX = lensX - focalLengthPx;
        const focalPointY = 0;
        
        rays.push({
          start: [-100, offsetY],
          end: [lensX, offsetY],
          color: '#EF4444' // Red for incident rays
        });
        
        // Calculate diverging ray direction
        const dx = lensX - focalPointX;
        const dy = offsetY - focalPointY;
        const length = 300;
        const scale = length / Math.sqrt(dx * dx + dy * dy);
        
        rays.push({
          start: [lensX, offsetY],
          end: [lensX + dx * scale, offsetY + dy * scale],
          color: '#9333EA' // Purple for diverging rays
        });
      }
    }
    
    return rays;
  };

  // Draw simulation on canvas
  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 800;
    canvas.height = 500;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Transform to center coordinates
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Draw optical axis (horizontal dashed line)
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw lens
    const lensHeight = 200;
    const lensX = 0;
    
    if (lensType === 'convergent') {
      // Convergent lens shape (biconvex)
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lensX, -lensHeight / 2);
      ctx.quadraticCurveTo(lensX + 20, -lensHeight / 4, lensX, 0);
      ctx.quadraticCurveTo(lensX + 20, lensHeight / 4, lensX, lensHeight / 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(lensX, -lensHeight / 2);
      ctx.quadraticCurveTo(lensX - 20, -lensHeight / 4, lensX, 0);
      ctx.quadraticCurveTo(lensX - 20, lensHeight / 4, lensX, lensHeight / 2);
      ctx.stroke();
      
      // Draw focal points
      const focalPointX = focalLength * 10;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(focalPointX, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-focalPointX, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      
      // Focal point labels
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('F', focalPointX - 5, -15);
      ctx.fillText('F', -focalPointX - 5, -15);
      
    } else {
      // Divergent lens shape (biconcave)
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(lensX, -lensHeight / 2);
      ctx.quadraticCurveTo(lensX - 20, -lensHeight / 4, lensX, 0);
      ctx.quadraticCurveTo(lensX - 20, lensHeight / 4, lensX, lensHeight / 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(lensX, -lensHeight / 2);
      ctx.quadraticCurveTo(lensX + 20, -lensHeight / 4, lensX, 0);
      ctx.quadraticCurveTo(lensX + 20, lensHeight / 4, lensX, lensHeight / 2);
      ctx.stroke();
      
      // Draw virtual focal points (dashed circles)
      const focalPointX = focalLength * 10;
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(-focalPointX, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(focalPointX, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Focal point labels
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('F', -focalPointX - 5, -15);
      ctx.fillText('F', focalPointX - 5, -15);
    }
    
    // Draw rays
    const rays = calculateRayPaths();
    rays.forEach(ray => {
      ctx.shadowColor = ray.color + '80';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ray.start[0], ray.start[1]);
      ctx.lineTo(ray.end[0], ray.end[1]);
      ctx.stroke();
      
      // Arrow at end
      const dx = ray.end[0] - ray.start[0];
      const dy = ray.end[1] - ray.start[1];
      const angle = Math.atan2(dy, dx);
      const arrowLength = 10;
      
      ctx.shadowBlur = 0;
      ctx.fillStyle = ray.color;
      ctx.beginPath();
      ctx.moveTo(ray.end[0], ray.end[1]);
      ctx.lineTo(
        ray.end[0] - arrowLength * Math.cos(angle - Math.PI / 6),
        ray.end[1] - arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ray.end[0] - arrowLength * Math.cos(angle + Math.PI / 6),
        ray.end[1] - arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    
    // Draw lens label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(lensX - 80, -lensHeight / 2 - 50, 160, 40);
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      lensType === 'convergent' ? 'Thấu kính hội tụ' : 'Thấu kính phân kỳ',
      lensX,
      -lensHeight / 2 - 30
    );
    ctx.fillStyle = '#6B7280';
    ctx.font = '14px Arial';
    ctx.fillText(`f = ${focalLength} cm`, lensX, -lensHeight / 2 - 15);
    
    ctx.restore();
  }, [lensType, focalLength, numRays, raySpacing, isMounted]);

  // Detect parameter changes
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      lensType !== initialValues.current.lensType ||
      focalLength !== initialValues.current.focalLength ||
      numRays !== initialValues.current.numRays;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [lensType, focalLength, numRays, isMounted, hasInteracted]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      toast({
        title: "🔬 Mô phỏng đang chạy",
        description: "Quan sát cách tia sáng đi qua thấu kính...",
        duration: 2000,
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      const response = await fetch('/api/lab-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          labId: config.name,
          labName: config.title,
          xpEarned: config.xp,
          parameters: {
            lensType,
            focalLength,
            numRays
          }
        })
      });

      if (response.ok) {
        setIsCompleted(true);
        
        toast({
          title: "🎉 Hoàn thành thí nghiệm!",
          description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
          duration: 5000,
        });
      } else {
        throw new Error('Failed to complete lab');
      }
    } catch (error) {
      console.error('Error completing lab:', error);
      toast({
        title: "❌ Lỗi",
        description: "Không thể hoàn thành thí nghiệm. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const resetSimulation = () => {
    setLensType('convergent');
    setFocalLength(15);
    setNumRays(5);
    setHasInteracted(false);
    initialValues.current = {
      lensType: 'convergent',
      focalLength: 15,
      numRays: 5
    };
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lens simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Eye className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        {/* Tags */}
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="secondary">{config.category}</Badge>
          <Badge variant="secondary">{config.level}</Badge>
          <Badge variant="secondary">{config.duration}</Badge>
        </div>
        
        {/* Backend Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
            </span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Port {config.port}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Simulation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Mô phỏng thấu kính</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quan sát sự hội tụ và phân tán của tia sáng song song
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-6">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-gradient-to-b from-sky-50 to-blue-50"
                  width={800}
                  height={500}
                />
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Lens Type Selector */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
                  <label className="text-lg font-bold text-purple-900 flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5" />
                    Loại thấu kính
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setLensType('convergent')}
                      variant={lensType === 'convergent' ? 'default' : 'outline'}
                      className={`h-auto py-4 ${lensType === 'convergent' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''}`}
                    >
                      <div className="text-center">
                        <div className="font-bold text-lg">Hội tụ</div>
                        <div className="text-xs mt-1 opacity-90">Biconvex</div>
                      </div>
                    </Button>
                    <Button
                      onClick={() => setLensType('divergent')}
                      variant={lensType === 'divergent' ? 'default' : 'outline'}
                      className={`h-auto py-4 ${lensType === 'divergent' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
                    >
                      <div className="text-center">
                        <div className="font-bold text-lg">Phân kỳ</div>
                        <div className="text-xs mt-1 opacity-90">Biconcave</div>
                      </div>
                    </Button>
                  </div>
                </div>
                
                {/* Focal Length Slider */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-amber-900">
                      Tiêu cự (f)
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-amber-300 shadow-md">
                      <span className="text-3xl font-bold text-amber-600">{focalLength} cm</span>
                    </div>
                  </div>
                  <Slider
                    value={[focalLength]}
                    onValueChange={(value) => setFocalLength(value[0])}
                    max={30}
                    min={5}
                    step={1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>5 cm</span>
                    <span>15 cm</span>
                    <span>30 cm</span>
                  </div>
                </div>
                
                {/* Number of Rays Slider */}
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border-2 border-cyan-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-cyan-900">
                      Số lượng tia sáng
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-cyan-300 shadow-md">
                      <span className="text-3xl font-bold text-cyan-600">{numRays}</span>
                    </div>
                  </div>
                  <Slider
                    value={[numRays]}
                    onValueChange={(value) => setNumRays(value[0])}
                    max={9}
                    min={3}
                    step={2}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>3</span>
                    <span>5</span>
                    <span>7</span>
                    <span>9</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={runSimulation}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      size="lg"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      <span>{loading ? 'Đang chạy...' : 'Chạy mô phỏng'}</span>
                    </Button>
                    
                    <Button 
                      onClick={resetSimulation}
                      variant="outline"
                      className="flex items-center space-x-2 border-2"
                      size="lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>{t('common.reset')}</span>
                    </Button>
                  </div>
                  
                  {/* Complete Lab Button */}
                  <Button 
                    onClick={completeLab}
                    disabled={!hasInteracted || isCompleted || isCompleting}
                    className={`w-full flex items-center justify-center space-x-2 ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    }`}
                    size="lg"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>✅ Đã hoàn thành</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5" />
                        <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
                      </>
                    )}
                  </Button>
                  
                  {!hasInteracted && !isCompleted && (
                    <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      💡 Thay đổi loại thấu kính hoặc thông số để kích hoạt nút hoàn thành
                    </p>
                  )}
                </div>
                
                {/* Legend */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Chú thích màu sắc
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-red-500 rounded"></div>
                      <span>Tia sáng tới (song song)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded"></div>
                      <span>Tia hội tụ (thấu kính hội tụ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-purple-500 rounded"></div>
                      <span>Tia phân kỳ (thấu kính phân kỳ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Tiêu điểm (F) - Thật</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-red-500 border-dashed rounded-full"></div>
                      <span>Tiêu điểm (F) - Ảo</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Lens Characteristics */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                Đặc điểm thấu kính
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {lensType === 'convergent' ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <h3 className="font-bold text-green-900 mb-2">Thấu kính hội tụ</h3>
                    <ul className="text-sm space-y-2 text-green-800">
                      <li>✓ Dày ở giữa, mỏng ở rìa</li>
                      <li>✓ Hội tụ tia sáng song song</li>
                      <li>✓ Có tiêu điểm thật (F)</li>
                      <li>✓ Tiêu cự dương (f &gt; 0)</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <div className="text-sm text-blue-600 font-semibold">Tiêu cự hiện tại</div>
                      <div className="text-3xl font-bold text-blue-800">+{focalLength} cm</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                    <h3 className="font-bold text-purple-900 mb-2">Thấu kính phân kỳ</h3>
                    <ul className="text-sm space-y-2 text-purple-800">
                      <li>✓ Mỏng ở giữa, dày ở rìa</li>
                      <li>✓ Phân tán tia sáng song song</li>
                      <li>✓ Có tiêu điểm ảo (F)</li>
                      <li>✓ Tiêu cự âm (f &lt; 0)</li>
                    </ul>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <div className="text-center">
                      <div className="text-sm text-pink-600 font-semibold">Tiêu cự hiện tại</div>
                      <div className="text-3xl font-bold text-pink-800">-{focalLength} cm</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-indigo-600" />
                So sánh
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-bold text-center bg-green-100 p-2 rounded">Hội tụ</div>
                  <div className="font-bold text-center bg-purple-100 p-2 rounded">Phân kỳ</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">Dày giữa</div>
                  <div className="bg-gray-50 p-2 rounded border">Mỏng giữa</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">Tiêu điểm thật</div>
                  <div className="bg-gray-50 p-2 rounded border">Tiêu điểm ảo</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">f &gt; 0</div>
                  <div className="bg-gray-50 p-2 rounded border">f &lt; 0</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theory Card */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-teal-600" />
                Lý thuyết
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-teal-900 mb-1">Tiêu điểm (F):</p>
                  <p className="text-gray-700">Điểm mà các tia sáng song song với trục chính hội tụ hoặc phân kỳ từ đó.</p>
                </div>
                <div>
                  <p className="font-semibold text-teal-900 mb-1">Tiêu cự (f):</p>
                  <p className="text-gray-700">Khoảng cách từ quang tâm O đến tiêu điểm F.</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                  <p className="font-mono text-center text-teal-900 font-bold">
                    OF = f
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lab Info */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-slate-600" />
                Thông tin thí nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Cấp độ:</span>
                  <Badge variant="secondary" className="font-semibold">{config.level}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Thời gian:</span>
                  <span className="text-sm font-bold text-slate-700">{config.duration}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Điểm XP:</span>
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 font-bold">
                    +{config.xp} XP
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-sm text-gray-700 font-medium">Danh mục:</span>
                  <span className="text-sm font-bold text-slate-700">{config.category}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}

