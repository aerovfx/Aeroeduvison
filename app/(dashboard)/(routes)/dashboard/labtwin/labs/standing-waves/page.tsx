'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Play, RotateCcw, Loader2, Settings, Trophy, CheckCircle, Info, Pause, TrendingUp, Activity, Music, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface StandingWaveData {
  wave: { x: number; y: number }[];
  modes: {
    wavelength: number;
    frequency: number;
    nodes: number[];
    antinodes: number[];
  };
  results: {
    boundaryType: string;
    harmonicNumber: number;
    wavelength: number;
    frequency: number;
    waveSpeed: number;
    tension: number;
  };
}

export default function StandingWavesPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<StandingWaveData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Simulation parameters
  const [boundaryType, setBoundaryType] = useState<'both-fixed' | 'one-open'>('both-fixed');
  const [harmonicNumber, setHarmonicNumber] = useState(1);
  const [stringLength, setStringLength] = useState(100); // cm
  const [tension, setTension] = useState(10); // N
  const [linearDensity, setLinearDensity] = useState(0.01); // kg/m
  
  // Track initial values for interaction detection
  const initialValues = useRef({
    boundaryType: 'both-fixed' as 'both-fixed' | 'one-open',
    harmonicNumber: 1,
    stringLength: 100,
    tension: 10,
    linearDensity: 0.01
  });
  
  // Lab configuration
  const config = {
    name: "standing-waves",
    title: "Sóng dừng",
    description: "Khám phá sóng dừng trên dây và trong ống sáo",
    category: "Sóng",
    level: "Trung bình",
    duration: "35 phút",
    xp: 200,
    port: 8026
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      boundaryType !== initialValues.current.boundaryType ||
      harmonicNumber !== initialValues.current.harmonicNumber ||
      stringLength !== initialValues.current.stringLength ||
      tension !== initialValues.current.tension ||
      linearDensity !== initialValues.current.linearDensity;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [boundaryType, harmonicNumber, stringLength, tension, linearDensity, isMounted, hasInteracted]);

  useEffect(() => {
    if (!isMounted) return;
    setBackendStatus('offline');
  }, [isMounted]);

  // Physics calculation
  const calculateStandingWave = (
    type: 'both-fixed' | 'one-open',
    n: number,
    L: number,
    T: number,
    mu: number
  ): StandingWaveData => {
    const L_m = L / 100; // Convert cm to m
    
    // Wave speed: v = √(T/μ)
    const v = Math.sqrt(T / mu);
    
    let wavelength: number;
    let frequency: number;
    let nodes: number[] = [];
    let antinodes: number[] = [];
    
    if (type === 'both-fixed') {
      // Both ends fixed (guitar string, violin)
      // λ = 2L/n
      wavelength = (2 * L_m) / n;
      frequency = v / wavelength;
      
      // Nodes: x = kL/n for k = 0, 1, 2, ..., n
      for (let k = 0; k <= n; k++) {
        nodes.push((k * L) / n);
      }
      
      // Antinodes: x = (2k+1)L/(2n) for k = 0, 1, 2, ..., n-1
      for (let k = 0; k < n; k++) {
        antinodes.push(((2 * k + 1) * L) / (2 * n));
      }
    } else {
      // One end open (pipe, flute)
      // λ = 4L/(2n-1)
      wavelength = (4 * L_m) / (2 * n - 1);
      frequency = v / wavelength;
      
      // Nodes: x = (2k)L/(2n-1) for k = 0, 1, 2, ..., n-1
      for (let k = 0; k < n; k++) {
        nodes.push((2 * k * L) / (2 * n - 1));
      }
      
      // Antinodes: x = (2k+1)L/(2n-1) for k = 0, 1, 2, ..., n
      for (let k = 0; k <= n; k++) {
        antinodes.push(((2 * k + 1) * L) / (2 * n - 1));
      }
    }
    
    // Generate wave shape
    const wave = [];
    const numPoints = 200;
    const amplitude = 10; // cm for visualization
    
    for (let i = 0; i <= numPoints; i++) {
      const x = (i * L) / numPoints;
      const x_m = (i * L_m) / numPoints;
      
      let y: number;
      if (type === 'both-fixed') {
        y = amplitude * Math.sin((n * Math.PI * x_m) / L_m);
      } else {
        y = amplitude * Math.cos(((2 * n - 1) * Math.PI * x_m) / (2 * L_m));
      }
      
      wave.push({
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2))
      });
    }
    
    return {
      wave,
      modes: {
        wavelength,
        frequency,
        nodes,
        antinodes
      },
      results: {
        boundaryType: type === 'both-fixed' ? '2 đầu cố định' : '1 đầu cố định, 1 đầu tự do',
        harmonicNumber: n,
        wavelength,
        frequency,
        waveSpeed: v,
        tension: T
      }
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = calculateStandingWave(boundaryType, harmonicNumber, stringLength, tension, linearDensity);
      setSimulationData(data);
      setAnimationTime(0);
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setBoundaryType(initialValues.current.boundaryType);
    setHarmonicNumber(initialValues.current.harmonicNumber);
    setStringLength(initialValues.current.stringLength);
    setTension(initialValues.current.tension);
    setLinearDensity(initialValues.current.linearDensity);
    setSimulationData(null);
    setHasInteracted(false);
    setIsAnimating(false);
    setAnimationTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
        duration: 5000,
      });
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

  // Animation loop
  const startAnimation = () => {
    if (!simulationData) return;
    setIsAnimating(true);
    lastTimeRef.current = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      
      setAnimationTime(prev => prev + deltaTime);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Canvas drawing with animation
  useEffect(() => {
    if (!isMounted || !simulationData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const padding = 60;
    
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#eff6ff');
    gradient.addColorStop(1, '#dbeafe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Scale for visualization
    const graphWidth = width - 2 * padding;
    const scaleX = graphWidth / stringLength;
    
    // Draw equilibrium line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, centerY);
    ctx.lineTo(width - padding, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw boundary indicators
    if (boundaryType === 'both-fixed') {
      // Left fixed end
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(padding - 10, centerY - 30, 10, 60);
      
      // Right fixed end
      ctx.fillRect(width - padding, centerY - 30, 10, 60);
    } else {
      // Left fixed end
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(padding - 10, centerY - 30, 10, 60);
      
      // Right open end (no wall)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(width - padding, centerY - 40);
      ctx.lineTo(width - padding, centerY + 40);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw standing wave with animation
    const omega = 2 * Math.PI * simulationData.results.frequency;
    const timeFactor = isAnimating ? Math.cos(omega * animationTime) : 1;
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    
    simulationData.wave.forEach((point, index) => {
      const x = padding + point.x * scaleX;
      const y = centerY - point.y * timeFactor * 2;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw nodes (always stationary)
    ctx.fillStyle = '#ef4444';
    simulationData.modes.nodes.forEach(nodeX => {
      const x = padding + nodeX * scaleX;
      ctx.beginPath();
      ctx.arc(x, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw antinodes (maximum amplitude points)
    ctx.fillStyle = '#22c55e';
    simulationData.modes.antinodes.forEach(antinodeX => {
      const x = padding + antinodeX * scaleX;
      ctx.beginPath();
      ctx.arc(x, centerY, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Bậc n = ${simulationData.results.harmonicNumber}`, padding, 30);
    ctx.fillText(`λ = ${(simulationData.results.wavelength * 100).toFixed(1)} cm`, padding, 50);
    ctx.fillText(`f = ${simulationData.results.frequency.toFixed(1)} Hz`, padding, 70);
    
    // Legend
    ctx.font = '11px Arial';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● Nút sóng (nodes)', width - padding - 120, 30);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('● Bụng sóng (antinodes)', width - padding - 120, 45);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('— Sóng dừng', width - padding - 120, 60);
    
  }, [simulationData, isMounted, isAnimating, animationTime, boundaryType, stringLength]);

  // Loading state
  if (!isMounted) {
    return (
      <VisionThemeWrapper title="Standing Waves" subtitle="Hệ thống học tập thông minh">
        <div className="container mx-auto p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      </VisionThemeWrapper>
    );
  }

  // Applications data
  const applications = [
    {
      name: "Đàn Guitar / Violin",
      type: "2 đầu cố định",
      description: "Dây đàn rung động với cả hai đầu cố định. Tạo ra các họa âm khác nhau khi thay đổi điểm ấn.",
      icon: "🎸"
    },
    {
      name: "Sáo / Ống sáo",
      type: "1 đầu cố định",
      description: "Cột không khí trong ống sáo dao động. Một đầu kín (nút), một đầu hở (bụng).",
      icon: "🎶"
    },
    {
      name: "Tiêu / Kèn",
      type: "2 đầu cố định hoặc 1 đầu",
      description: "Tùy vào cách thổi và thiết kế, tạo ra âm thanh khác nhau.",
      icon: "🎺"
    },
    {
      name: "Ống nghiệm (thí nghiệm)",
      type: "1 đầu cố định",
      description: "Sử dụng âm thoa để tạo sóng dừng trong ống nghiệm chứa nước.",
      icon: "🧪"
    }
  ];

  return (
    <VisionThemeWrapper title="Standing Waves" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Button
        onClick={() => router.push('/dashboard/labtwin/labs')}
        variant="outline"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Radio className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        {/* Tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1">
            {config.category}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.level}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.duration}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            +{config.xp} XP
          </Badge>
        </div>
        
        {/* Backend Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'secondary'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Local Mode' : 'Checking...'}
            </span>
          </Badge>
        </div>
      </div>

      {/* Main Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Điều khiển thí nghiệm</span>
              </CardTitle>
              <CardDescription>
                Điều chỉnh điều kiện biên và tham số sóng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Boundary Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <Label className="text-sm font-bold mb-2 block text-blue-900">
                    Điều kiện biên
                  </Label>
                  <Select value={boundaryType} onValueChange={(value: 'both-fixed' | 'one-open') => setBoundaryType(value)}>
                    <SelectTrigger className="bg-white border-blue-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both-fixed">2 đầu cố định (Guitar)</SelectItem>
                      <SelectItem value="one-open">1 đầu cố định (Sáo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <Label className="text-sm font-bold mb-2 block text-green-900">
                    Bậc sóng (n)
                  </Label>
                  <Select value={harmonicNumber.toString()} onValueChange={(value) => setHarmonicNumber(parseInt(value))}>
                    <SelectTrigger className="bg-white border-green-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          Bậc {n} {n === 1 ? '(cơ bản)' : `(họa âm ${n-1})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* String Length Slider */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-purple-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Chiều dài dây/ống (L)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                    <span className="text-2xl font-bold text-purple-600">{stringLength} cm</span>
                  </div>
                </div>
                <Slider
                  value={[stringLength]}
                  onValueChange={([value]) => setStringLength(value)}
                  min={20}
                  max={200}
                  step={5}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">20</span>
                  <span className="font-medium">65</span>
                  <span className="font-medium">110</span>
                  <span className="font-medium">155</span>
                  <span className="font-medium">200</span>
                </div>
              </div>
              
              {/* Tension Slider */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border-2 border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-amber-900 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Lực căng dây (T)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-amber-300 shadow-md">
                    <span className="text-2xl font-bold text-amber-600">{tension} N</span>
                  </div>
                </div>
                <Slider
                  value={[tension]}
                  onValueChange={([value]) => setTension(value)}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">1</span>
                  <span className="font-medium">15</span>
                  <span className="font-medium">25</span>
                  <span className="font-medium">35</span>
                  <span className="font-medium">50</span>
                </div>
              </div>
              
              {/* Linear Density Slider */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-green-900">Mật độ tuyến tính (μ)</Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-green-300 shadow-md">
                    <span className="text-2xl font-bold text-green-600">{linearDensity.toFixed(3)} kg/m</span>
                  </div>
                </div>
                <Slider
                  value={[linearDensity * 1000]}
                  onValueChange={([value]) => setLinearDensity(value / 1000)}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex space-x-2">
                  <Button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    size="lg"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    <span>{loading ? 'Đang tính...' : 'Chạy mô phỏng'}</span>
                  </Button>
                  
                  <Button 
                    onClick={resetSimulation}
                    variant="outline"
                    className="border-2"
                    size="lg"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    <span>{t('common.reset')}</span>
                  </Button>
                </div>
                
                {/* Animation Controls */}
                {simulationData && (
                  <Button 
                    onClick={isAnimating ? stopAnimation : startAnimation}
                    variant="outline"
                    className="w-full border-2 border-green-300 hover:bg-green-50"
                    size="lg"
                  >
                    {isAnimating ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        <span>Dừng sóng</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        <span>Bắt đầu dao động</span>
                      </>
                    )}
                  </Button>
                )}
                
                {/* Complete Lab Button */}
                <Button 
                  onClick={completeLab}
                  disabled={!hasInteracted || isCompleted || isCompleting}
                  className={`w-full ${
                    isCompleted 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  }`}
                  size="lg"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>✅ Đã hoàn thành</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="h-5 w-5 mr-2" />
                      <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
                    </>
                  )}
                </Button>
                
                {/* Hint text */}
                {!hasInteracted && !isCompleted && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    💡 Thay đổi thông số thí nghiệm để kích hoạt nút hoàn thành
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Visualization */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center space-x-2 text-indigo-900">
                <Radio className="h-5 w-5 text-indigo-600" />
                <span>Sóng dừng</span>
              </CardTitle>
              <CardDescription>
                Hình dạng sóng dừng với nút và bụng sóng
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <canvas
                ref={canvasRef}
                width={700}
                height={300}
                className="border rounded shadow-md w-full"
              />
            </CardContent>
          </Card>
          
          {/* Applications */}
          <Card className="border-2 border-green-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Music className="h-5 w-5 text-green-600" />
                Ứng dụng thực tế
              </CardTitle>
              <CardDescription>
                Sóng dừng trong nhạc cụ và thí nghiệm
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {applications.map((app, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{app.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 mb-1">{app.name}</h4>
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {app.type}
                        </Badge>
                        <p className="text-sm text-gray-600">
                          {app.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          {/* Results Card */}
          {simulationData && (
            <Card className="border-2 border-teal-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                <CardTitle className="flex items-center space-x-2 text-teal-900">
                  <Info className="h-5 w-5 text-teal-600" />
                  <span>Kết quả</span>
                </CardTitle>
                <CardDescription>
                  Các thông số sóng dừng
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">Bước sóng (λ)</div>
                  <div className="text-xl font-bold text-blue-900">
                    {(simulationData.results.wavelength * 100).toFixed(1)} cm
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">Tần số (f)</div>
                  <div className="text-xl font-bold text-amber-900">
                    {simulationData.results.frequency.toFixed(1)} Hz
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-700 mb-1">Tốc độ sóng (v)</div>
                  <div className="text-xl font-bold text-green-900">
                    {simulationData.results.waveSpeed.toFixed(1)} m/s
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">Số nút sóng</div>
                  <div className="text-xl font-bold text-purple-900">
                    {simulationData.modes.nodes.length}
                  </div>
                </div>
                
                <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="text-xs text-pink-700 mb-1">Số bụng sóng</div>
                  <div className="text-xl font-bold text-pink-900">
                    {simulationData.modes.antinodes.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Theory Card */}
          <Card className="border-2 border-cyan-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
              <CardTitle className="flex items-center space-x-2 text-cyan-900">
                <Info className="h-5 w-5 text-cyan-600" />
                <span>Công thức</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="both-fixed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="both-fixed">2 đầu cố định</TabsTrigger>
                  <TabsTrigger value="one-open">1 đầu mở</TabsTrigger>
                </TabsList>
                
                <TabsContent value="both-fixed" className="space-y-3">
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      λ = 2L/n
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Bước sóng</div>
                  </div>
                  
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      f = nv/(2L)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Tần số</div>
                  </div>
                  
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      v = √(T/μ)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Tốc độ sóng</div>
                  </div>
                </TabsContent>
                
                <TabsContent value="one-open" className="space-y-3">
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      λ = 4L/(2n-1)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Bước sóng</div>
                  </div>
                  
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      f = (2n-1)v/(4L)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Tần số</div>
                  </div>
                  
                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900 text-xs">
                      v = √(T/μ)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Tốc độ sóng</div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Info Card */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="flex items-center space-x-2 text-slate-900">
                <Info className="h-5 w-5 text-slate-600" />
                <span>Hướng dẫn</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="text-xs space-y-2 list-disc list-inside text-gray-600">
                <li>Chọn điều kiện biên (2 đầu cố định hoặc 1 đầu mở)</li>
                <li>Chọn bậc sóng n (1-8)</li>
                <li>Điều chỉnh chiều dài L (20-200 cm)</li>
                <li>Thay đổi lực căng T (1-50 N)</li>
                <li>Nhấn &quot;Chạy mô phỏng&quot;</li>
                <li>Nhấn &quot;Bắt đầu dao động&quot; để xem animation</li>
                <li>Quan sát:</li>
                <ul className="ml-6 mt-1 space-y-1">
                  <li className="text-red-600">● Nút sóng (nodes) - không dao động</li>
                  <li className="text-green-600">● Bụng sóng (antinodes) - dao động max</li>
                  <li>2 đầu cố định: λ = 2L/n</li>
                  <li>1 đầu mở: λ = 4L/(2n-1)</li>
                </ul>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </VisionThemeWrapper>
  );
}

