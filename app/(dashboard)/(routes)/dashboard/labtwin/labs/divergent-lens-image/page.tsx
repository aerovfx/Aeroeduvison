'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Eye, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, CheckCircle, Trophy, Minimize2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

export default function DivergentLensImagePage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [objectDistance, setObjectDistance] = useState(30); // cm (d)
  const focalLength = 15; // cm (f) - negative for divergent lens
  const [imageDistance, setImageDistance] = useState(0); // d' (always negative for divergent)
  const [magnification, setMagnification] = useState(0); // k = -d'/d (always positive and < 1)
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values to detect changes
  const initialValues = useRef({
    objectDistance: 30
  });

  // Lab configuration
  const config = {
    name: "divergent-lens-image",
    title: "Ảnh của vật qua thấu kính phân kỳ",
    description: "Quan sát ảnh ảo, thu nhỏ, cùng chiều qua thấu kính phân kỳ",
    category: "Quang học",
    level: "Lớp 11",
    duration: "40 phút",
    xp: 75,
    port: 8021
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

  // Calculate image characteristics for divergent lens
  useEffect(() => {
    if (objectDistance > 0) {
      // For divergent lens: f is negative
      // 1/f = 1/d + 1/d'
      // => d' = (f * d) / (d - f)
      // With f negative: d' = (-|f| * d) / (d - (-|f|)) = (-|f| * d) / (d + |f|)
      const dPrime = -(focalLength * objectDistance) / (objectDistance + focalLength);
      setImageDistance(dPrime);
      
      // Magnification: k = -d'/d
      // Since d' is negative, k = -(-value)/d = positive value < 1
      const k = -dPrime / objectDistance;
      setMagnification(k);
    }
  }, [objectDistance, focalLength]);

  // Generate comparison data
  const generateComparisonData = () => {
    const distances = [10, 20, 30, 40, 50, 60];
    return distances.map(d => {
      const dPrime = -(focalLength * d) / (d + focalLength);
      const k = -dPrime / d;
      return {
        d,
        dPrime: dPrime.toFixed(1),
        k: k.toFixed(2)
      };
    });
  };

  // Draw simulation on canvas
  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 1000;
    canvas.height = 500;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const scale = 6; // pixels per cm
    const lensX = canvas.width / 2 + 100; // Offset to show virtual image on left
    
    // Draw optical axis
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw lens (divergent/biconcave)
    const lensHeight = 180;
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(lensX, centerY - lensHeight / 2);
    ctx.quadraticCurveTo(lensX - 15, centerY - lensHeight / 4, lensX, centerY);
    ctx.quadraticCurveTo(lensX - 15, centerY + lensHeight / 4, lensX, centerY + lensHeight / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(lensX, centerY - lensHeight / 2);
    ctx.quadraticCurveTo(lensX + 15, centerY - lensHeight / 4, lensX, centerY);
    ctx.quadraticCurveTo(lensX + 15, centerY + lensHeight / 4, lensX, centerY + lensHeight / 2);
    ctx.stroke();
    
    // Draw virtual focal points (dashed)
    const focalPointLeft = lensX - (focalLength * scale);
    const focalPointRight = lensX + (focalLength * scale);
    
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(focalPointLeft, centerY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(focalPointRight, centerY, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('F', focalPointLeft - 5, centerY - 12);
    ctx.fillText('F', focalPointRight - 5, centerY - 12);
    
    // Object
    const objectX = lensX - (objectDistance * scale);
    const objectHeight = 70;
    
    ctx.strokeStyle = '#EF4444';
    ctx.fillStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(objectX, centerY);
    ctx.lineTo(objectX, centerY - objectHeight);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(objectX, centerY - objectHeight);
    ctx.lineTo(objectX - 10, centerY - objectHeight + 15);
    ctx.lineTo(objectX + 10, centerY - objectHeight + 15);
    ctx.closePath();
    ctx.fill();
    
    // Object label
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Vật', objectX - 20, centerY + 25);
    
    // Draw rays
    const rayStartX = objectX;
    const rayStartY = centerY - objectHeight;
    
    // Ray 1: Parallel to axis, diverges as if from focal point on left
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    ctx.lineTo(lensX, rayStartY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // After lens - diverging
    ctx.beginPath();
    ctx.moveTo(lensX, rayStartY);
    // Ray diverges as if from focal point
    const divergeSlope = (rayStartY - centerY) / (lensX - focalPointLeft);
    ctx.lineTo(canvas.width, rayStartY + divergeSlope * (canvas.width - lensX));
    ctx.stroke();
    
    // Extension to virtual image (dashed)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#F59E0BAA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lensX, rayStartY);
    const virtualImageX = lensX + (imageDistance * scale);
    const imageHeight = objectHeight * Math.abs(magnification);
    ctx.lineTo(virtualImageX, centerY - imageHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Ray 2: Toward center, continues straight (but shifted)
    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    ctx.lineTo(lensX, centerY + (rayStartY - centerY) * (lensX / rayStartX));
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Continue after lens
    ctx.beginPath();
    ctx.moveTo(lensX, centerY);
    const slope2 = (centerY - rayStartY) / (lensX - rayStartX);
    ctx.lineTo(canvas.width, centerY - slope2 * (canvas.width - lensX));
    ctx.stroke();
    
    // Extension to virtual image (dashed)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#EC4899AA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lensX, centerY);
    ctx.lineTo(virtualImageX, centerY - imageHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Ray 3: Toward right focal point, emerges parallel
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    // Aim toward right focal point
    const towardFSlope = (centerY - rayStartY) / (focalPointRight - rayStartX);
    const lensIntersectY = rayStartY + towardFSlope * (lensX - rayStartX);
    ctx.lineTo(lensX, lensIntersectY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Emerge parallel to axis
    ctx.beginPath();
    ctx.moveTo(lensX, lensIntersectY);
    ctx.lineTo(canvas.width, lensIntersectY);
    ctx.stroke();
    
    // Extension to virtual image (dashed)
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#8B5CF6AA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lensX, lensIntersectY);
    ctx.lineTo(virtualImageX, centerY - imageHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw virtual image
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#9333EA';
    ctx.fillStyle = '#9333EA';
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(virtualImageX, centerY);
    ctx.lineTo(virtualImageX, centerY - imageHeight);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(virtualImageX, centerY - imageHeight);
    ctx.lineTo(virtualImageX - 10, centerY - imageHeight + 15);
    ctx.lineTo(virtualImageX + 10, centerY - imageHeight + 15);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.setLineDash([]);
    
    // Image label
    ctx.fillStyle = '#7C3AED';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Ảnh ảo', virtualImageX - 30, centerY + 25);
    
    // Distance labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(objectX + 30, centerY + 40, 120, 28);
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`d = ${objectDistance} cm`, objectX + 35, centerY + 60);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(virtualImageX + 30, centerY + 40, 130, 28);
    ctx.fillStyle = '#9333EA';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`d' = ${imageDistance.toFixed(1)} cm`, virtualImageX + 35, centerY + 60);
    
    // Focal length label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(focalPointLeft + 10, centerY - 40, 100, 25);
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`f = -${focalLength} cm`, focalPointLeft + 15, centerY - 22);
    
  }, [objectDistance, imageDistance, magnification, focalLength, isMounted]);

  // Detect parameter changes
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = objectDistance !== initialValues.current.objectDistance;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [objectDistance, isMounted, hasInteracted]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      toast({
        title: "🔬 Mô phỏng đang chạy",
        description: "Quan sát ảnh ảo được tạo bởi thấu kính phân kỳ...",
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
            objectDistance,
            imageDistance: imageDistance.toFixed(1),
            magnification: magnification.toFixed(2)
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
    setObjectDistance(30);
    setHasInteracted(false);
    initialValues.current = { objectDistance: 30 };
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading divergent lens simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <VisionThemeWrapper title="Divergent Lens Image" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
          <Minimize2 className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="secondary">{config.category}</Badge>
          <Badge variant="secondary">{config.level}</Badge>
          <Badge variant="secondary">{config.duration}</Badge>
        </div>
        
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
                <Eye className="h-5 w-5" />
                <span>Sơ đồ tạo ảnh qua thấu kính phân kỳ</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Di chuyển vật để quan sát ảnh ảo luôn nhỏ hơn vật
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-6">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-white"
                  width={1000}
                  height={500}
                />
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Object Distance Slider */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-purple-900">
                      Khoảng cách vật (d)
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-purple-300 shadow-md">
                      <span className="text-3xl font-bold text-purple-600">{objectDistance} cm</span>
                    </div>
                  </div>
                  <Slider
                    value={[objectDistance]}
                    onValueChange={(value) => setObjectDistance(value[0])}
                    max={80}
                    min={10}
                    step={1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>10 cm</span>
                    <span>30 cm</span>
                    <span>50 cm</span>
                    <span>80 cm</span>
                  </div>
                </div>
                
                {/* Results */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 shadow-sm text-center">
                    <div className="text-sm text-purple-600 font-semibold mb-1">Khoảng cách ảnh</div>
                    <div className="text-xl font-bold text-purple-800">
                      {imageDistance.toFixed(1)} cm
                    </div>
                  </div>
                  
                  <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-200 shadow-sm text-center">
                    <div className="text-sm text-pink-600 font-semibold mb-1">Độ phóng đại</div>
                    <div className="text-xl font-bold text-pink-800">
                      k = {magnification.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200 shadow-sm text-center">
                    <div className="text-sm text-indigo-600 font-semibold mb-1">Tỷ lệ kích thước</div>
                    <div className="text-xl font-bold text-indigo-800">
                      {(magnification * 100).toFixed(0)}%
                    </div>
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
                      💡 Thay đổi vị trí vật để quan sát ảnh ảo
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
                      <span>Vật (màu đỏ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-purple-500 rounded border border-dashed"></div>
                      <span>Ảnh ảo (màu tím, nét đứt)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-amber-500 rounded"></div>
                      <div className="w-8 h-1 bg-pink-500 rounded"></div>
                      <div className="w-8 h-1 bg-violet-500 rounded"></div>
                      <span>Tia sáng đặc trưng</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-red-500 border-dashed rounded-full"></div>
                      <span>Tiêu điểm ảo (F)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Image Characteristics */}
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                Đặc điểm ảnh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="bg-purple-100 p-4 rounded-lg border-2 border-purple-300">
                <h3 className="font-bold text-purple-900 mb-2">Ảnh qua thấu kính phân kỳ</h3>
                <ul className="text-sm space-y-2 text-purple-800">
                  <li>✓ Luôn là ảnh ảo</li>
                  <li>✓ Luôn cùng chiều với vật</li>
                  <li>✓ Luôn nhỏ hơn vật (k &lt; 1)</li>
                  <li>✓ Ở cùng phía với vật</li>
                  <li>✓ d&apos; &lt; 0 (âm)</li>
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 p-4 rounded-lg border-2 border-pink-300 text-center">
                <div className="text-sm text-pink-700 font-semibold mb-2">Vị trí ảnh</div>
                <div className="text-2xl font-bold text-pink-900">
                  {Math.abs(imageDistance).toFixed(1)} cm
                </div>
                <div className="text-xs text-pink-700 mt-1">(Cùng phía vật)</div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Minimize2 className="h-5 w-5 text-indigo-600" />
                Bảng đo
              </CardTitle>
              <CardDescription>
                Quan hệ giữa d, d&apos; và k
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-100">
                      <TableHead className="text-center font-bold">d (cm)</TableHead>
                      <TableHead className="text-center font-bold">d&apos; (cm)</TableHead>
                      <TableHead className="text-center font-bold">k</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateComparisonData().map((row, index) => (
                      <TableRow 
                        key={index}
                        className={`
                          ${Math.abs(row.d - objectDistance) <= 5 ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <TableCell className="text-center font-medium">{row.d}</TableCell>
                        <TableCell className="text-center text-purple-700">{row.dPrime}</TableCell>
                        <TableCell className="text-center font-medium text-pink-700">{row.k}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 text-xs text-gray-600">
                <p>• Tiêu cự: f = -{focalLength} cm</p>
                <p>• d&apos; luôn âm (ảnh ảo)</p>
                <p>• 0 &lt; k &lt; 1 (ảnh nhỏ hơn vật)</p>
              </div>
            </CardContent>
          </Card>

          {/* Comparison with Convergent Lens */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-teal-600" />
                So sánh với thấu kính hội tụ
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-bold text-center bg-green-100 p-2 rounded">Hội tụ</div>
                  <div className="font-bold text-center bg-purple-100 p-2 rounded">Phân kỳ</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">Ảnh thật/ảo</div>
                  <div className="bg-purple-50 p-2 rounded border font-bold">Luôn ảo</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">Cùng/ngược chiều</div>
                  <div className="bg-purple-50 p-2 rounded border font-bold">Luôn cùng chiều</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded border">Lớn/nhỏ hơn</div>
                  <div className="bg-purple-50 p-2 rounded border font-bold">Luôn nhỏ hơn</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theory */}
          <Card className="border-2 border-amber-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Công thức
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-amber-100 to-yellow-100 p-4 rounded-lg border-2 border-amber-300">
                  <div className="text-center font-mono text-lg font-bold text-amber-900">
                    1/f = 1/d + 1/d&apos;
                  </div>
                  <div className="text-center text-xs text-amber-700 mt-2">
                    f &lt; 0 (âm) cho thấu kính phân kỳ
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-pink-100 to-purple-100 p-4 rounded-lg border-2 border-pink-300">
                  <div className="text-center font-mono text-lg font-bold text-pink-900">
                    k = -d&apos;/d
                  </div>
                  <div className="text-center text-xs text-pink-700 mt-2">
                    0 &lt; k &lt; 1 (ảnh luôn nhỏ hơn vật)
                  </div>
                </div>
                
                <div className="text-xs space-y-1 text-gray-700">
                  <div>• <strong>f = -{focalLength} cm:</strong> Tiêu cự (âm)</div>
                  <div>• <strong>d = {objectDistance} cm:</strong> Khoảng cách vật</div>
                  <div>• <strong>d&apos; = {imageDistance.toFixed(1)} cm:</strong> Khoảng cách ảnh (âm)</div>
                  <div>• <strong>k = {magnification.toFixed(2)}:</strong> Độ phóng đại (&lt;1)</div>
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

