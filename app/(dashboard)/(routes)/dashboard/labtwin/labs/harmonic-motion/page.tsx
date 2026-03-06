'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Waves, Play, RotateCcw, Activity, Loader2, Settings, Zap, Trophy, CheckCircle, Info, Pause, TrendingUp, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface HarmonicData {
  oscillation: { t: number; x: number; v: number; a: number; E: number }[];
  results: {
    amplitude: number;
    frequency: number;
    period: number;
    omega: number;
    phase: number;
    maxVelocity: number;
    maxAcceleration: number;
    energy: number;
  };
}

export default function HarmonicMotionPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<HarmonicData | null>(null);
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
  const [amplitude, setAmplitude] = useState(5); // cm
  const [frequency, setFrequency] = useState(1); // Hz
  const [phase, setPhase] = useState(0); // rad
  const [mass, setMass] = useState(1); // kg
  
  // Track initial values for interaction detection
  const initialValues = useRef({
    amplitude: 5,
    frequency: 1,
    phase: 0,
    mass: 1
  });
  
  // Lab configuration
  const config = {
    name: "harmonic-motion",
    title: "Dao động điều hòa",
    description: "Khám phá dao động điều hòa của con lắc lò xo",
    category: "Sóng",
    level: "Trung bình",
    duration: "30 phút",
    xp: 180,
    port: 8010
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      amplitude !== initialValues.current.amplitude ||
      frequency !== initialValues.current.frequency ||
      phase !== initialValues.current.phase ||
      mass !== initialValues.current.mass;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [amplitude, frequency, phase, mass, isMounted, hasInteracted]);

  useEffect(() => {
    if (!isMounted) return;
    setBackendStatus('offline');
  }, [isMounted]);

  // Physics calculation
  const calculateHarmonic = (A: number, f: number, phi: number, m: number): HarmonicData => {
    const omega = 2 * Math.PI * f; // Angular frequency
    const T = 1 / f; // Period
    const k = m * omega * omega; // Spring constant
    
    // Generate oscillation data for 3 periods
    const oscillation = [];
    const numPoints = 200;
    const duration = 3 * T;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);
      
      // x(t) = A * cos(ωt + φ)
      const x = A * Math.cos(omega * t + phi);
      
      // v(t) = -A * ω * sin(ωt + φ)
      const v = -A * omega * Math.sin(omega * t + phi);
      
      // a(t) = -A * ω² * cos(ωt + φ) = -ω² * x
      const a = -omega * omega * x;
      
      // E = ½kx² + ½mv² (constant for ideal oscillation)
      const E = 0.5 * k * (x/100) * (x/100) + 0.5 * m * (v/100) * (v/100);
      
      oscillation.push({
        t: parseFloat(t.toFixed(3)),
        x: parseFloat(x.toFixed(2)),
        v: parseFloat(v.toFixed(2)),
        a: parseFloat(a.toFixed(2)),
        E: parseFloat(E.toFixed(4))
      });
    }
    
    return {
      oscillation,
      results: {
        amplitude: A,
        frequency: f,
        period: T,
        omega: omega,
        phase: phi,
        maxVelocity: A * omega,
        maxAcceleration: A * omega * omega,
        energy: 0.5 * k * (A/100) * (A/100)
      }
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = calculateHarmonic(amplitude, frequency, phase, mass);
      setSimulationData(data);
      setAnimationTime(0);
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setAmplitude(initialValues.current.amplitude);
    setFrequency(initialValues.current.frequency);
    setPhase(initialValues.current.phase);
    setMass(initialValues.current.mass);
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
      const deltaTime = (now - lastTimeRef.current) / 1000; // Convert to seconds
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
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#faf5ff');
    gradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Calculate current position
    const omega = simulationData.results.omega;
    const A = simulationData.results.amplitude;
    const phi = simulationData.results.phase;
    
    const x = isAnimating ? A * Math.cos(omega * animationTime + phi) : 0;
    const scale = 3; // pixels per cm
    const xPos = centerX + x * scale;
    
    // Draw spring (fixed on left)
    const springLeftX = 100;
    const springCoils = 15;
    const springWidth = xPos - springLeftX - 25;
    const coilHeight = 20;
    
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(springLeftX, centerY);
    
    for (let i = 0; i <= springCoils; i++) {
      const xOffset = springLeftX + (i * springWidth) / springCoils;
      const yOffset = centerY + (i % 2 === 0 ? -coilHeight : coilHeight);
      ctx.lineTo(xOffset, yOffset);
    }
    ctx.lineTo(xPos - 25, centerY);
    ctx.stroke();
    
    // Draw fixed wall
    ctx.fillStyle = '#475569';
    ctx.fillRect(80, centerY - 60, 20, 120);
    
    // Draw wall pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(80, centerY - 50 + i * 20);
      ctx.lineTo(70, centerY - 60 + i * 20);
      ctx.stroke();
    }
    
    // Draw mass
    const massSize = 50;
    const massGradient = ctx.createLinearGradient(
      xPos - massSize/2, centerY - massSize/2,
      xPos + massSize/2, centerY + massSize/2
    );
    massGradient.addColorStop(0, '#ef4444');
    massGradient.addColorStop(1, '#dc2626');
    
    ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = massGradient;
    ctx.fillRect(xPos - massSize/2, centerY - massSize/2, massSize, massSize);
    ctx.shadowBlur = 0;
    
    // Draw mass outline
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.strokeRect(xPos - massSize/2, centerY - massSize/2, massSize, massSize);
    
    // Draw mass label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${mass} kg`, xPos, centerY + 5);
    
    // Draw equilibrium line
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(centerX, 80);
    ctx.lineTo(centerX, height - 80);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw equilibrium label
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('O', centerX, 70);
    
    // Draw position indicator
    if (isAnimating) {
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`x = ${x.toFixed(1)} cm`, xPos, centerY - massSize/2 - 15);
    }
    
    // Draw amplitude markers
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    
    // +A marker
    const xMaxPos = centerX + A * scale;
    ctx.beginPath();
    ctx.moveTo(xMaxPos, 80);
    ctx.lineTo(xMaxPos, height - 80);
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('+A', xMaxPos, 70);
    
    // -A marker
    const xMinPos = centerX - A * scale;
    ctx.beginPath();
    ctx.moveTo(xMinPos, 80);
    ctx.lineTo(xMinPos, height - 80);
    ctx.stroke();
    ctx.fillText('-A', xMinPos, 70);
    
    ctx.setLineDash([]);
    
    // Draw legend
    ctx.font = '11px Arial';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'left';
    ctx.fillText('— Vị trí cân bằng (O)', 20, 30);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('--- Biên độ (A)', 20, 45);
    ctx.fillStyle = '#6366f1';
    ctx.fillText('— Lò xo', 20, 60);
    
  }, [simulationData, isMounted, isAnimating, animationTime, mass]);

  // Loading state
  if (!isMounted) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const positionData = simulationData?.oscillation || [];
  const velocityData = simulationData?.oscillation || [];
  const accelerationData = simulationData?.oscillation || [];
  const energyData = simulationData?.oscillation || [];

  return (
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
          <Waves className="h-8 w-8 text-purple-600" />
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
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center space-x-2 text-purple-900">
                <Settings className="h-5 w-5 text-purple-600" />
                <span>Điều khiển thí nghiệm</span>
              </CardTitle>
              <CardDescription>
                Điều chỉnh tham số dao động
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amplitude Slider - Enhanced */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-blue-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Biên độ (A)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-blue-300 shadow-md">
                    <span className="text-2xl font-bold text-blue-600">{amplitude} cm</span>
                  </div>
                </div>
                <Slider
                  value={[amplitude]}
                  onValueChange={([value]) => setAmplitude(value)}
                  min={1}
                  max={10}
                  step={0.5}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">1</span>
                  <span className="font-medium">3</span>
                  <span className="font-medium">5</span>
                  <span className="font-medium">7</span>
                  <span className="font-medium">10</span>
                </div>
              </div>
              
              {/* Frequency Slider - Enhanced */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border-2 border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-amber-900 flex items-center gap-2">
                    <Waves className="h-4 w-4" />
                    Tần số (f)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-amber-300 shadow-md">
                    <span className="text-2xl font-bold text-amber-600">{frequency} Hz</span>
                  </div>
                </div>
                <Slider
                  value={[frequency]}
                  onValueChange={([value]) => setFrequency(value)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">0.1</span>
                  <span className="font-medium">0.8</span>
                  <span className="font-medium">1.5</span>
                  <span className="font-medium">2.2</span>
                  <span className="font-medium">3.0</span>
                </div>
              </div>
              
              {/* Phase Slider */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-green-900 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Pha ban đầu (φ)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-green-300 shadow-md">
                    <span className="text-2xl font-bold text-green-600">{phase.toFixed(2)} rad</span>
                  </div>
                </div>
                <Slider
                  value={[phase]}
                  onValueChange={([value]) => setPhase(value)}
                  min={0}
                  max={2 * Math.PI}
                  step={0.1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">0</span>
                  <span className="font-medium">π/2</span>
                  <span className="font-medium">π</span>
                  <span className="font-medium">3π/2</span>
                  <span className="font-medium">2π</span>
                </div>
              </div>
              
              {/* Mass Slider */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-purple-900 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Khối lượng (m)
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                    <span className="text-2xl font-bold text-purple-600">{mass} kg</span>
                  </div>
                </div>
                <Slider
                  value={[mass]}
                  onValueChange={([value]) => setMass(value)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="mt-2 h-3 cursor-pointer"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex space-x-2">
                  <Button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
                        <span>Dừng dao động</span>
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
                <Waves className="h-5 w-5 text-indigo-600" />
                <span>Dao động lò xo</span>
              </CardTitle>
              <CardDescription>
                Chuyển động của vật nặng trên lò xo
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
          
          {/* Charts */}
          {simulationData && (
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Đồ thị dao động
                </CardTitle>
                <CardDescription>
                  Các đại lượng theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="position" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="position">Vị trí</TabsTrigger>
                    <TabsTrigger value="velocity">Vận tốc</TabsTrigger>
                    <TabsTrigger value="acceleration">Gia tốc</TabsTrigger>
                    <TabsTrigger value="energy">Năng lượng</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="position">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={positionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="t" 
                          label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'x (cm)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="x" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          name="Vị trí x(t)"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="velocity">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={velocityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="t" 
                          label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'v (cm/s)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="v" 
                          stroke="#22C55E" 
                          strokeWidth={3}
                          name="Vận tốc v(t)"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="acceleration">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={accelerationData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="t" 
                          label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'a (cm/s²)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="a" 
                          stroke="#EF4444" 
                          strokeWidth={3}
                          name="Gia tốc a(t)"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="energy">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={energyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="t" 
                          label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                          label={{ value: 'E (J)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="E" 
                          stroke="#9333EA" 
                          strokeWidth={3}
                          name="Năng lượng E(t)"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
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
                  Các thông số dao động
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">Chu kỳ (T)</div>
                  <div className="text-xl font-bold text-blue-900">
                    {simulationData.results.period.toFixed(3)} s
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">Tần số góc (ω)</div>
                  <div className="text-xl font-bold text-amber-900">
                    {simulationData.results.omega.toFixed(2)} rad/s
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-700 mb-1">V max</div>
                  <div className="text-xl font-bold text-green-900">
                    {simulationData.results.maxVelocity.toFixed(2)} cm/s
                  </div>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-xs text-red-700 mb-1">A max</div>
                  <div className="text-xl font-bold text-red-900">
                    {simulationData.results.maxAcceleration.toFixed(2)} cm/s²
                  </div>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-xs text-purple-700 mb-1">Năng lượng</div>
                  <div className="text-xl font-bold text-purple-900">
                    {simulationData.results.energy.toFixed(4)} J
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Data Table */}
          {simulationData && (
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <Info className="h-5 w-5 text-indigo-600" />
                  Bảng dữ liệu
                </CardTitle>
                <CardDescription>
                  Giá trị tại các thời điểm
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-100">
                        <TableHead className="text-center font-bold text-xs">t (s)</TableHead>
                        <TableHead className="text-center font-bold text-xs">x (cm)</TableHead>
                        <TableHead className="text-center font-bold text-xs">v (cm/s)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationData.oscillation.filter((_, i) => i % 20 === 0).map((point, index) => (
                        <TableRow 
                          key={index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="text-center text-xs font-medium">{point.t}</TableCell>
                          <TableCell className="text-center text-xs">{point.x}</TableCell>
                          <TableCell className="text-center text-xs">{point.v}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
              <div className="space-y-3 text-xs">
                <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    x = A·cos(ωt + φ)
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Vị trí</div>
                </div>
                
                <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    v = -Aω·sin(ωt + φ)
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Vận tốc</div>
                </div>
                
                <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    a = -ω²x
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Gia tốc</div>
                </div>
                
                <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    T = 2π√(m/k)
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Chu kỳ</div>
                </div>
              </div>
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
                <li>Điều chỉnh biên độ A (1-10 cm)</li>
                <li>Chọn tần số f (0.1-3 Hz)</li>
                <li>Thay đổi pha ban đầu φ (0-2π rad)</li>
                <li>Chọn khối lượng m (0.5-5 kg)</li>
                <li>Nhấn "Chạy mô phỏng"</li>
                <li>Nhấn "Bắt đầu dao động" để xem animation</li>
                <li>Quan sát các đồ thị:</li>
                <ul className="ml-6 mt-1 space-y-1">
                  <li>x(t) - Vị trí theo thời gian</li>
                  <li>v(t) - Vận tốc theo thời gian</li>
                  <li>a(t) - Gia tốc theo thời gian</li>
                  <li>E(t) - Năng lượng (bảo toàn)</li>
                </ul>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
