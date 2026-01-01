'use client';

"use client";

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Camera, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, CheckCircle, Trophy, Image as ImageIcon, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

interface ImageCharacteristics {
  type: 'real' | 'virtual' | 'none';
  orientation: 'inverted' | 'upright' | 'none';
  size: 'larger' | 'smaller' | 'same' | 'none';
  position: string;
  magnification: number;
}

export default function ConvergentLensImagePage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [objectDistance, setObjectDistance] = useState(40); // cm (d)
  const focalLength = 15; // cm (f) - fixed for this lab
  const [imageDistance, setImageDistance] = useState(0); // d'
  const [magnification, setMagnification] = useState(0); // k = -d'/d
  const [imageChar, setImageChar] = useState<ImageCharacteristics | null>(null);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values to detect changes
  const initialValues = useRef({
    objectDistance: 40
  });

  // Lab configuration
  const config = {
    name: "convergent-lens-image",
    title: "Tạo ảnh của vật qua thấu kính hội tụ",
    description: "Quan sát đặc điểm ảnh thật, ảnh ảo qua thấu kính hội tụ",
    category: "Quang học",
    level: "Lớp 11",
    duration: "45 phút",
    xp: 85,
    port: 8020
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

  // Calculate image characteristics
  useEffect(() => {
    if (objectDistance > 0) {
      // Thin lens equation: 1/f = 1/d + 1/d'
      // => d' = (f * d) / (d - f)
      const dPrime = (focalLength * objectDistance) / (objectDistance - focalLength);
      setImageDistance(dPrime);
      
      // Magnification: k = -d'/d
      const k = -dPrime / objectDistance;
      setMagnification(k);
      
      // Determine image characteristics
      let characteristics: ImageCharacteristics;
      
      if (objectDistance < focalLength) {
        // Object inside focal point -> Virtual, upright, enlarged image
        characteristics = {
          type: 'virtual',
          orientation: 'upright',
          size: 'larger',
          position: `${Math.abs(dPrime).toFixed(1)} cm (cùng phía vật)`,
          magnification: k
        };
      } else if (objectDistance === focalLength) {
        // Object at focal point -> No image (rays parallel)
        characteristics = {
          type: 'none',
          orientation: 'none',
          size: 'none',
          position: 'Vô cực (không tạo ảnh)',
          magnification: 0
        };
      } else if (objectDistance < 2 * focalLength) {
        // Object between f and 2f -> Real, inverted, enlarged image
        characteristics = {
          type: 'real',
          orientation: 'inverted',
          size: 'larger',
          position: `${dPrime.toFixed(1)} cm (phía đối diện)`,
          magnification: k
        };
      } else if (objectDistance === 2 * focalLength) {
        // Object at 2f -> Real, inverted, same size image
        characteristics = {
          type: 'real',
          orientation: 'inverted',
          size: 'same',
          position: `${dPrime.toFixed(1)} cm (phía đối diện)`,
          magnification: k
        };
      } else {
        // Object beyond 2f -> Real, inverted, diminished image
        characteristics = {
          type: 'real',
          orientation: 'inverted',
          size: 'smaller',
          position: `${dPrime.toFixed(1)} cm (phía đối diện)`,
          magnification: k
        };
      }
      
      setImageChar(characteristics);
    }
  }, [objectDistance, focalLength]);

  // Generate case studies table
  const generateCaseStudies = () => {
    const cases = [
      { d: 10, range: 'd < f', type: 'Ảo', orientation: 'Cùng chiều', size: 'Lớn hơn' },
      { d: 15, range: 'd = f', type: 'Không có', orientation: '-', size: '-' },
      { d: 20, range: 'f < d < 2f', type: 'Thật', orientation: 'Ngược chiều', size: 'Lớn hơn' },
      { d: 30, range: 'd = 2f', type: 'Thật', orientation: 'Ngược chiều', size: 'Bằng vật' },
      { d: 50, range: 'd > 2f', type: 'Thật', orientation: 'Ngược chiều', size: 'Nhỏ hơn' }
    ];
    
    return cases.map(c => {
      const dPrime = (focalLength * c.d) / (c.d - focalLength);
      return {
        ...c,
        dPrime: dPrime > 0 && isFinite(dPrime) ? dPrime.toFixed(1) : '∞',
        k: c.d !== focalLength ? (-dPrime / c.d).toFixed(2) : '∞'
      };
    });
  };

  // Draw simulation on canvas
  useEffect(() => {
    if (!isMounted || !canvasRef.current || !imageChar) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 1000;
    canvas.height = 500;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const scale = 6; // pixels per cm
    const lensX = canvas.width / 2;
    
    // Draw optical axis
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw lens
    const lensHeight = 180;
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(lensX, centerY - lensHeight / 2);
    ctx.quadraticCurveTo(lensX + 15, centerY - lensHeight / 4, lensX, centerY);
    ctx.quadraticCurveTo(lensX + 15, centerY + lensHeight / 4, lensX, centerY + lensHeight / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(lensX, centerY - lensHeight / 2);
    ctx.quadraticCurveTo(lensX - 15, centerY - lensHeight / 4, lensX, centerY);
    ctx.quadraticCurveTo(lensX - 15, centerY + lensHeight / 4, lensX, centerY + lensHeight / 2);
    ctx.stroke();
    
    // Draw focal points
    const focalPointLeft = lensX - (focalLength * scale);
    const focalPointRight = lensX + (focalLength * scale);
    
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(focalPointLeft, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(focalPointRight, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('F', focalPointLeft - 5, centerY - 12);
    ctx.fillText('F', focalPointRight - 5, centerY - 12);
    
    // Draw 2F points
    const twoFLeft = lensX - (2 * focalLength * scale);
    const twoFRight = lensX + (2 * focalLength * scale);
    
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(twoFLeft, centerY, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(twoFRight, centerY, 4, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillText('2F', twoFLeft - 8, centerY - 12);
    ctx.fillText('2F', twoFRight - 8, centerY - 12);
    
    // Object
    const objectX = lensX - (objectDistance * scale);
    const objectHeight = 60;
    
    ctx.strokeStyle = '#DC2626';
    ctx.fillStyle = '#DC2626';
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
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Vật', objectX - 20, centerY + 25);
    
    // Draw rays
    const rayStartX = objectX;
    const rayStartY = centerY - objectHeight;
    
    // Ray 1: Parallel to axis, through focal point
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    ctx.lineTo(lensX, rayStartY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    if (imageChar.type !== 'none') {
      ctx.beginPath();
      ctx.moveTo(lensX, rayStartY);
      if (imageChar.type === 'real') {
        ctx.lineTo(focalPointRight, centerY);
        ctx.lineTo(lensX + 250, centerY + ((focalPointRight - lensX) / focalPointRight) * (centerY - rayStartY));
      } else {
        // Virtual image - show dashed extension
        ctx.setLineDash([5, 5]);
        const extendX = lensX - 250;
        const slope = (centerY - rayStartY) / (focalPointRight - lensX);
        ctx.lineTo(extendX, rayStartY - slope * (lensX - extendX));
        ctx.setLineDash([]);
      }
      ctx.stroke();
    }
    
    // Ray 2: Through optical center
    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    ctx.lineTo(lensX, rayStartY * (lensX / rayStartX));
    if (imageChar.type === 'real') {
      ctx.lineTo(lensX + 250, centerY + ((lensX + 250 - lensX) / rayStartX * rayStartY));
    } else if (imageChar.type === 'virtual') {
      ctx.setLineDash([5, 5]);
      ctx.lineTo(lensX - 250, centerY - ((lensX - (lensX - 250)) / rayStartX * rayStartY));
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Ray 3: Through focal point, parallel after lens
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(rayStartX, rayStartY);
    if (objectDistance > focalLength) {
      const intersectY = rayStartY + (focalPointLeft - rayStartX) * (centerY - rayStartY) / (lensX - rayStartX);
      ctx.lineTo(lensX, intersectY);
      ctx.lineTo(lensX + 250, intersectY);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw image if exists
    if (imageChar.type === 'real' && imageDistance > 0 && imageDistance < 100) {
      const imageX = lensX + (imageDistance * scale);
      const imageHeight = objectHeight * Math.abs(magnification);
      
      ctx.strokeStyle = '#3B82F6';
      ctx.fillStyle = '#3B82F6';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(imageX, centerY);
      if (imageChar.orientation === 'inverted') {
        ctx.lineTo(imageX, centerY + imageHeight);
      } else {
        ctx.lineTo(imageX, centerY - imageHeight);
      }
      ctx.stroke();
      
      // Arrow head
      ctx.beginPath();
      if (imageChar.orientation === 'inverted') {
        ctx.moveTo(imageX, centerY + imageHeight);
        ctx.lineTo(imageX - 10, centerY + imageHeight - 15);
        ctx.lineTo(imageX + 10, centerY + imageHeight - 15);
      } else {
        ctx.moveTo(imageX, centerY - imageHeight);
        ctx.lineTo(imageX - 10, centerY - imageHeight + 15);
        ctx.lineTo(imageX + 10, centerY - imageHeight + 15);
      }
      ctx.closePath();
      ctx.fill();
      
      // Image label
      ctx.fillStyle = '#1E40AF';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Ảnh', imageX - 20, centerY + 25);
      
      // Screen
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(imageX, centerY - 90);
      ctx.lineTo(imageX, centerY + 90);
      ctx.stroke();
    } else if (imageChar.type === 'virtual') {
      const imageX = lensX - (Math.abs(imageDistance) * scale);
      const imageHeight = objectHeight * Math.abs(magnification);
      
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#9333EA';
      ctx.fillStyle = '#9333EA';
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(imageX, centerY);
      ctx.lineTo(imageX, centerY - imageHeight);
      ctx.stroke();
      
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(imageX, centerY - imageHeight);
      ctx.lineTo(imageX - 10, centerY - imageHeight + 15);
      ctx.lineTo(imageX + 10, centerY - imageHeight + 15);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
      
      // Image label
      ctx.fillStyle = '#7C3AED';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('Ảnh ảo', imageX - 30, centerY + 25);
    }
    
    // Distance labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(objectX + 30, centerY + 40, 120, 28);
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`d = ${objectDistance} cm`, objectX + 35, centerY + 60);
    
    if (imageChar.type === 'real' && imageDistance > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(lensX + 30, centerY + 40, 130, 28);
      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`d' = ${imageDistance.toFixed(1)} cm`, lensX + 35, centerY + 60);
    }
    
  }, [objectDistance, focalLength, imageDistance, magnification, imageChar, isMounted]);

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
        description: "Quan sát sự tạo ảnh qua thấu kính...",
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
            imageType: imageChar?.type,
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
    setObjectDistance(40);
    setHasInteracted(false);
    initialValues.current = { objectDistance: 40 };
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading lens image simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <VisionThemeWrapper title="Convergent Lens Image" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
          <Camera className="h-8 w-8 text-purple-600" />
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
                <ImageIcon className="h-5 w-5" />
                <span>Sơ đồ tạo ảnh</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Di chuyển vật để quan sát các loại ảnh khác nhau
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
                    min={5}
                    step={1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>5 cm</span>
                    <span>15 cm (f)</span>
                    <span>30 cm (2f)</span>
                    <span>80 cm</span>
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
                      💡 Di chuyển vật để quan sát các loại ảnh khác nhau
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
                      <div className="w-8 h-1 bg-blue-500 rounded"></div>
                      <span>Ảnh thật (màu xanh, liền nét)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-purple-500 rounded border border-dashed"></div>
                      <span>Ảnh ảo (màu tím, nét đứt)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-amber-500 rounded"></div>
                      <div className="w-8 h-1 bg-pink-500 rounded"></div>
                      <div className="w-8 h-1 bg-violet-500 rounded"></div>
                      <span>Các tia sáng đặc biệt</span>
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
          {imageChar && (
            <Card className="border-2 border-purple-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-purple-600" />
                  Đặc điểm ảnh
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                <div className={`p-4 rounded-lg border-2 ${
                  imageChar.type === 'real' ? 'bg-blue-50 border-blue-200' :
                  imageChar.type === 'virtual' ? 'bg-purple-50 border-purple-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="text-sm font-semibold mb-1">Loại ảnh</div>
                  <div className="text-2xl font-bold">
                    {imageChar.type === 'real' ? '🖼️ Ảnh thật' :
                     imageChar.type === 'virtual' ? '👻 Ảnh ảo' :
                     '❌ Không có ảnh'}
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-green-700 font-semibold mb-1">Chiều ảnh</div>
                  <div className="text-xl font-bold text-green-900">
                    {imageChar.orientation === 'inverted' ? '⬇️ Ngược chiều' :
                     imageChar.orientation === 'upright' ? '⬆️ Cùng chiều' :
                     '-'}
                  </div>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                  <div className="text-sm text-amber-700 font-semibold mb-1">Kích thước</div>
                  <div className="text-xl font-bold text-amber-900">
                    {imageChar.size === 'larger' ? '📏 Lớn hơn vật' :
                     imageChar.size === 'smaller' ? '📐 Nhỏ hơn vật' :
                     imageChar.size === 'same' ? '📊 Bằng vật' :
                     '-'}
                  </div>
                </div>
                
                <div className="bg-pink-50 p-4 rounded-lg border-2 border-pink-200">
                  <div className="text-sm text-pink-700 font-semibold mb-1">Vị trí ảnh</div>
                  <div className="text-lg font-bold text-pink-900">
                    {imageChar.position}
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg border-2 border-indigo-200">
                  <div className="text-sm text-indigo-700 font-semibold mb-1">Độ phóng đại (k)</div>
                  <div className="text-2xl font-bold text-indigo-900">
                    {isFinite(magnification) ? magnification.toFixed(2) : '∞'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Case Studies Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-600" />
                Các trường hợp
              </CardTitle>
              <CardDescription>
                Phân loại ảnh theo vị trí vật
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-100">
                      <TableHead className="text-center font-bold">Vị trí vật</TableHead>
                      <TableHead className="text-center font-bold">Loại ảnh</TableHead>
                      <TableHead className="text-center font-bold">Kích thước</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generateCaseStudies().map((c, index) => (
                      <TableRow 
                        key={index}
                        className={`
                          ${Math.abs(c.d - objectDistance) <= 2 ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <TableCell className="text-center text-xs">
                          <div className="font-bold">{c.range}</div>
                          <div className="text-gray-500">d = {c.d} cm</div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-xs">
                          <div>{c.type}</div>
                          <div className="text-gray-500">{c.orientation}</div>
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          {c.size}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Theory */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-teal-600" />
                Công thức
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg border-2 border-teal-300">
                  <div className="text-center font-mono text-lg font-bold text-teal-900">
                    1/f = 1/d + 1/d&apos;
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg border-2 border-blue-300">
                  <div className="text-center font-mono text-lg font-bold text-blue-900">
                    k = -d&apos;/d
                  </div>
                </div>
                
                <div className="text-xs space-y-2 text-gray-700">
                  <div>• <strong>f = {focalLength} cm:</strong> Tiêu cự thấu kính</div>
                  <div>• <strong>d:</strong> Khoảng cách vật</div>
                  <div>• <strong>d&apos;:</strong> Khoảng cách ảnh</div>
                  <div>• <strong>k:</strong> Độ phóng đại</div>
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

