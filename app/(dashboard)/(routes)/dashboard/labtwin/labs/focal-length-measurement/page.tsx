'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Ruler, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, CheckCircle, Trophy, Target, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

interface MeasurementData {
  objectDistance: number; // d
  imageDistance: number; // d'
  calculatedFocalLength: number; // f = (d * d') / (d + d')
}

export default function FocalLengthMeasurementPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [objectDistance, setObjectDistance] = useState(30); // cm (d)
  const [lensPosition, setLensPosition] = useState(200); // pixels
  const [trueFocalLength] = useState(15); // cm - the "true" focal length of the lens
  const [measurements, setMeasurements] = useState<MeasurementData[]>([]);
  
  // Calculated values
  const [imageDistance, setImageDistance] = useState(0); // d'
  const [calculatedF, setCalculatedF] = useState(0);
  const [averageFocalLength, setAverageFocalLength] = useState(0);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values to detect changes
  const initialValues = useRef({
    objectDistance: 30,
    lensPosition: 200
  });

  // Lab configuration
  const config = {
    name: "focal-length-measurement",
    title: "Xác định tiêu điểm và tiêu cự thấu kính hội tụ",
    description: "Đo tiêu cự thấu kính bằng phương pháp thực nghiệm",
    category: "Quang học",
    level: "Lớp 11",
    duration: "45 phút",
    xp: 80,
    port: 8019
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

  // Calculate image distance using thin lens equation: 1/f = 1/d + 1/d'
  useEffect(() => {
    if (objectDistance > 0) {
      // 1/d' = 1/f - 1/d
      const imageDistCalc = (trueFocalLength * objectDistance) / (objectDistance - trueFocalLength);
      setImageDistance(imageDistCalc);
      
      // Calculate f from d and d': f = (d * d') / (d + d')
      if (imageDistCalc > 0) {
        const f = (objectDistance * imageDistCalc) / (objectDistance + imageDistCalc);
        setCalculatedF(f);
      }
    }
  }, [objectDistance, trueFocalLength]);

  // Calculate average focal length from measurements
  useEffect(() => {
    if (measurements.length > 0) {
      const sum = measurements.reduce((acc, m) => acc + m.calculatedFocalLength, 0);
      const avg = sum / measurements.length;
      setAverageFocalLength(avg);
    }
  }, [measurements]);

  // Generate chart data
  const generateChartData = () => {
    const data = [];
    for (let d = 20; d <= 100; d += 5) {
      const dPrime = (trueFocalLength * d) / (d - trueFocalLength);
      if (dPrime > 0 && dPrime < 200) {
        data.push({
          d: d,
          dPrime: dPrime.toFixed(1),
          f: ((d * dPrime) / (d + dPrime)).toFixed(2)
        });
      }
    }
    return data;
  };

  // Draw experimental setup
  useEffect(() => {
    if (!isMounted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 900;
    canvas.height = 400;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const scale = 5; // pixels per cm
    
    // Draw optical bench (base)
    ctx.fillStyle = '#A0AEC0';
    ctx.fillRect(0, centerY + 120, canvas.width, 20);
    
    // Draw optical axis
    ctx.setLineDash([10, 5]);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Object position (fixed at left)
    const objectX = 100;
    const objectHeight = 60;
    
    // Draw object (arrow)
    ctx.strokeStyle = '#DC2626';
    ctx.fillStyle = '#DC2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(objectX, centerY);
    ctx.lineTo(objectX, centerY - objectHeight);
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(objectX, centerY - objectHeight);
    ctx.lineTo(objectX - 8, centerY - objectHeight + 15);
    ctx.lineTo(objectX + 8, centerY - objectHeight + 15);
    ctx.closePath();
    ctx.fill();
    
    // Object label
    ctx.fillStyle = '#991B1B';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Vật', objectX - 15, centerY + 30);
    
    // Lens position
    const lensX = objectX + (objectDistance * scale);
    const lensHeight = 150;
    
    // Draw lens (convergent)
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
    
    // Lens label
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Thấu kính', lensX - 35, centerY + 30);
    
    // Draw focal points
    const focalPointLeft = lensX - (trueFocalLength * scale);
    const focalPointRight = lensX + (trueFocalLength * scale);
    
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.arc(focalPointLeft, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(focalPointRight, centerY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('F', focalPointLeft - 5, centerY - 12);
    ctx.fillText('F', focalPointRight - 5, centerY - 12);
    
    // Image position (if valid)
    if (imageDistance > 0 && imageDistance < 150) {
      const imageX = lensX + (imageDistance * scale);
      const imageMagnification = -imageDistance / objectDistance;
      const imageHeight = objectHeight * Math.abs(imageMagnification);
      
      // Draw image (inverted arrow)
      ctx.strokeStyle = '#3B82F6';
      ctx.fillStyle = '#3B82F6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(imageX, centerY);
      ctx.lineTo(imageX, centerY + imageHeight);
      ctx.stroke();
      
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(imageX, centerY + imageHeight);
      ctx.lineTo(imageX - 8, centerY + imageHeight - 15);
      ctx.lineTo(imageX + 8, centerY + imageHeight - 15);
      ctx.closePath();
      ctx.fill();
      
      // Image label
      ctx.fillStyle = '#1E40AF';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Ảnh', imageX - 15, centerY + 30);
      
      // Draw screen/canvas
      ctx.strokeStyle = '#6366F1';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(imageX, centerY - 80);
      ctx.lineTo(imageX, centerY + 80);
      ctx.stroke();
    }
    
    // Draw key rays
    // Ray 1: Through center
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(objectX, centerY - objectHeight);
    ctx.lineTo(lensX, centerY - objectHeight * lensX / objectX);
    if (imageDistance > 0) {
      const imageX = lensX + (imageDistance * scale);
      ctx.lineTo(imageX, centerY + (imageHeight || 0));
    }
    ctx.stroke();
    
    // Ray 2: Parallel to axis, through focal point
    ctx.strokeStyle = '#EC4899';
    ctx.beginPath();
    ctx.moveTo(objectX, centerY - objectHeight);
    ctx.lineTo(lensX, centerY - objectHeight);
    if (imageDistance > 0) {
      const imageX = lensX + (imageDistance * scale);
      ctx.lineTo(imageX, centerY + (imageHeight || 0));
    }
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Distance labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(objectX + 20, centerY + 50, 120, 30);
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`d = ${objectDistance.toFixed(1)} cm`, objectX + 25, centerY + 70);
    
    if (imageDistance > 0 && imageDistance < 150) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(lensX + 20, centerY + 50, 130, 30);
      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`d' = ${imageDistance.toFixed(1)} cm`, lensX + 25, centerY + 70);
    }
    
    // Focal length label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(focalPointRight + 10, centerY - 40, 100, 25);
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`f = ${trueFocalLength} cm`, focalPointRight + 15, centerY - 22);
    
  }, [objectDistance, imageDistance, trueFocalLength, isMounted]);

  // Add measurement
  const addMeasurement = () => {
    if (imageDistance > 0) {
      const newMeasurement: MeasurementData = {
        objectDistance,
        imageDistance,
        calculatedFocalLength: calculatedF
      };
      setMeasurements([...measurements, newMeasurement]);
      
      toast({
        title: "✅ Đã thêm phép đo",
        description: `Tiêu cự đo được: ${calculatedF.toFixed(2)} cm`,
        duration: 3000,
      });
    }
  };

  // Clear all measurements
  const clearMeasurements = () => {
    setMeasurements([]);
    toast({
      title: "🗑️ Đã xóa dữ liệu",
      description: "Tất cả phép đo đã được xóa",
      duration: 2000,
    });
  };

  // Detect parameter changes
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      objectDistance !== initialValues.current.objectDistance ||
      lensPosition !== initialValues.current.lensPosition;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [objectDistance, lensPosition, isMounted, hasInteracted]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      toast({
        title: "🔬 Đang chạy thí nghiệm",
        description: "Quan sát vị trí ảnh thay đổi...",
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
            measurements: measurements.length,
            averageFocalLength: averageFocalLength.toFixed(2)
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
    setLensPosition(200);
    setMeasurements([]);
    setHasInteracted(false);
    initialValues.current = {
      objectDistance: 30,
      lensPosition: 200
    };
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading focal length measurement...</p>
        </div>
      </div>
    );
  }

  return (
    <VisionThemeWrapper title="Focal Length Measurement" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
          <Ruler className="h-8 w-8 text-purple-600" />
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
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Thí nghiệm đo tiêu cự</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Di chuyển vật để tìm vị trí ảnh rõ nét và đo khoảng cách
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-6">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-white"
                  width={900}
                  height={400}
                />
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Object Distance Slider */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-red-900">
                      Khoảng cách vật (d)
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-red-300 shadow-md">
                      <span className="text-3xl font-bold text-red-600">{objectDistance} cm</span>
                    </div>
                  </div>
                  <Slider
                    value={[objectDistance]}
                    onValueChange={(value) => setObjectDistance(value[0])}
                    max={100}
                    min={20}
                    step={1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span>20 cm</span>
                    <span>50 cm</span>
                    <span>100 cm</span>
                  </div>
                </div>
                
                {/* Measurement Results */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 shadow-sm text-center">
                    <div className="text-sm text-blue-600 font-semibold mb-1">Khoảng cách ảnh (d&apos;)</div>
                    <div className="text-2xl font-bold text-blue-800">
                      {imageDistance > 0 ? `${imageDistance.toFixed(1)} cm` : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 shadow-sm text-center">
                    <div className="text-sm text-green-600 font-semibold mb-1">Tiêu cự đo được (f)</div>
                    <div className="text-2xl font-bold text-green-800">
                      {calculatedF > 0 ? `${calculatedF.toFixed(2)} cm` : 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 shadow-sm text-center">
                    <div className="text-sm text-purple-600 font-semibold mb-1">Số phép đo</div>
                    <div className="text-2xl font-bold text-purple-800">{measurements.length}</div>
                  </div>
                </div>
                
                {/* Measurement Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={addMeasurement}
                    disabled={imageDistance <= 0}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Lưu phép đo
                  </Button>
                  
                  <Button 
                    onClick={clearMeasurements}
                    disabled={measurements.length === 0}
                    variant="outline"
                    className="border-2"
                    size="lg"
                  >
                    Xóa dữ liệu
                  </Button>
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
                      <span>{loading ? 'Đang chạy...' : 'Chạy thí nghiệm'}</span>
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
                      💡 Thay đổi khoảng cách vật và thực hiện phép đo để kích hoạt nút hoàn thành
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Đồ thị quan hệ d và d&apos;
              </CardTitle>
              <CardDescription>
                Mối quan hệ giữa khoảng cách vật và khoảng cách ảnh
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={generateChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="d" 
                    label={{ value: "Khoảng cách vật d (cm)", position: "bottom", offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: "Khoảng cách ảnh d&apos; (cm)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #3B82F6',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <ReferenceLine 
                    x={objectDistance} 
                    stroke="#EF4444" 
                    strokeDasharray="5 5"
                    label="Vị trí hiện tại"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dPrime" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    name="d&apos; (cm)"
                    dot={{ fill: '#3B82F6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Average Focal Length */}
          {measurements.length > 0 && (
            <Card className="border-2 border-green-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Kết quả đo
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-6 rounded-xl border-2 border-green-300 text-center">
                  <div className="text-sm text-green-700 font-semibold mb-2">Tiêu cự trung bình</div>
                  <div className="text-4xl font-bold text-green-900 mb-2">
                    {averageFocalLength.toFixed(2)} cm
                  </div>
                  <div className="text-xs text-green-700">
                    Từ {measurements.length} phép đo
                  </div>
                  <div className="mt-4 text-xs text-green-600">
                    Tiêu cự thực: {trueFocalLength} cm
                  </div>
                  <div className="mt-1 text-xs text-green-600">
                    Sai số: {Math.abs(averageFocalLength - trueFocalLength).toFixed(2)} cm
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Measurement Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-indigo-600" />
                Bảng phép đo
              </CardTitle>
              <CardDescription>
                Các phép đo đã thực hiện
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {measurements.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Chưa có phép đo nào
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-100">
                        <TableHead className="text-center font-bold">#</TableHead>
                        <TableHead className="text-center font-bold">d (cm)</TableHead>
                        <TableHead className="text-center font-bold">d&apos; (cm)</TableHead>
                        <TableHead className="text-center font-bold">f (cm)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {measurements.map((m, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell className="text-center">{m.objectDistance.toFixed(1)}</TableCell>
                          <TableCell className="text-center">{m.imageDistance.toFixed(1)}</TableCell>
                          <TableCell className="text-center font-bold text-green-700">
                            {m.calculatedFocalLength.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Thin Lens Formula */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-teal-600" />
                Công thức thấu kính mỏng
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg border-2 border-teal-300">
                  <div className="text-center font-mono text-xl font-bold text-teal-900 mb-2">
                    1/f = 1/d + 1/d&apos;
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-4 rounded-lg border-2 border-blue-300">
                  <div className="text-center font-mono text-lg font-bold text-blue-900">
                    f = (d × d&apos;) / (d + d&apos;)
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-700">•</span>
                    <div>
                      <span className="font-semibold">f:</span> Tiêu cự
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-700">•</span>
                    <div>
                      <span className="font-semibold">d:</span> Khoảng cách từ vật đến thấu kính
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-teal-700">•</span>
                    <div>
                      <span className="font-semibold">d&apos;:</span> Khoảng cách từ ảnh đến thấu kính
                    </div>
                  </div>
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

