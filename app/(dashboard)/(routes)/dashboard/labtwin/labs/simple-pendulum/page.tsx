'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Play, RotateCcw, Loader2, Settings, Zap, Trophy, CheckCircle, Info, Pause, TrendingUp, Clock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface PendulumData {
  oscillation: { t: number; theta: number; omega: number; alpha: number; E: number }[];
  results: {
    length: number;
    mass: number;
    theta0: number;
    period: number;
    frequency: number;
    maxOmega: number;
    energy: number;
  };
}

export default function SimplePendulumPage() {
  const { t } = useLanguage();

  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<PendulumData | null>(null);
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
  const [length, setLength] = useState(100); // cm
  const [mass, setMass] = useState(1); // kg
  const [theta0, setTheta0] = useState(30); // degrees
  const [gravity, setGravity] = useState(9.8); // m/s²

  // Track initial values for interaction detection
  const initialValues = useRef({
    length: 100,
    mass: 1,
    theta0: 30,
    gravity: 9.8
  });

  // Lab configuration
  const config = {
    name: "simple-pendulum",
    title: "Con lắc đơn",
    description: "Khám phá dao động điều hòa của con lắc đơn",
    category: "Sóng",
    level: "Trung bình",
    duration: "30 phút",
    xp: 150,
    port: 8025
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;

    const hasChanged =
      length !== initialValues.current.length ||
      mass !== initialValues.current.mass ||
      theta0 !== initialValues.current.theta0 ||
      gravity !== initialValues.current.gravity;

    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [length, mass, theta0, gravity, isMounted, hasInteracted]);

  useEffect(() => {
    if (!isMounted) return;
    setBackendStatus('offline');
  }, [isMounted]);

  // Physics calculation (using small angle approximation for simplicity)
  const calculatePendulum = (L: number, m: number, theta0Deg: number, g: number): PendulumData => {
    const L_m = L / 100; // Convert cm to m
    const theta0_rad = (theta0Deg * Math.PI) / 180; // Convert to radians

    // Period: T = 2π√(L/g) (small angle approximation)
    const T = 2 * Math.PI * Math.sqrt(L_m / g);
    const f = 1 / T; // Frequency
    const omega0 = Math.sqrt(g / L_m); // Angular frequency

    // Generate oscillation data for 3 periods
    const oscillation = [];
    const numPoints = 200;
    const duration = 3 * T;

    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);

      // θ(t) = θ₀ * cos(ω₀t) (small angle approximation)
      const theta = theta0_rad * Math.cos(omega0 * t);

      // ω(t) = dθ/dt = -θ₀ * ω₀ * sin(ω₀t)
      const omega = -theta0_rad * omega0 * Math.sin(omega0 * t);

      // α(t) = dω/dt = -θ₀ * ω₀² * cos(ω₀t) = -ω₀² * θ
      const alpha = -omega0 * omega0 * theta;

      // Energy: E = ½mL²ω² + mgL(1-cosθ) ≈ ½mL²(θ₀²ω₀²) = constant
      const KE = 0.5 * m * (L_m * omega) * (L_m * omega);
      const PE = m * g * L_m * (1 - Math.cos(theta));
      const E = KE + PE;

      oscillation.push({
        t: parseFloat(t.toFixed(3)),
        theta: parseFloat((theta * 180 / Math.PI).toFixed(2)), // Convert to degrees
        omega: parseFloat(omega.toFixed(2)),
        alpha: parseFloat(alpha.toFixed(2)),
        E: parseFloat(E.toFixed(4))
      });
    }

    return {
      oscillation,
      results: {
        length: L,
        mass: m,
        theta0: theta0Deg,
        period: T,
        frequency: f,
        maxOmega: theta0_rad * omega0,
        energy: 0.5 * m * L_m * L_m * theta0_rad * theta0_rad * omega0 * omega0
      }
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = calculatePendulum(length, mass, theta0, gravity);
      setSimulationData(data);
      setAnimationTime(0);
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setLength(initialValues.current.length);
    setMass(initialValues.current.mass);
    setTheta0(initialValues.current.theta0);
    setGravity(initialValues.current.gravity);
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
    const pivotX = width / 2;
    const pivotY = 80;

    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fef3c7');
    gradient.addColorStop(1, '#fde68a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Calculate current angle
    const L_m = simulationData.results.length / 100;
    const omega0 = Math.sqrt(gravity / L_m);
    const theta0_rad = (simulationData.results.theta0 * Math.PI) / 180;

    const theta_rad = isAnimating
      ? theta0_rad * Math.cos(omega0 * animationTime)
      : theta0_rad;

    // Scale for display
    const scale = 2.5;
    const pendulumLength = simulationData.results.length * scale;

    // Calculate bob position
    const bobX = pivotX + pendulumLength * Math.sin(theta_rad);
    const bobY = pivotY + pendulumLength * Math.cos(theta_rad);

    // Draw reference lines (vertical)
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX, pivotY + pendulumLength + 50);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw arc showing theta0 range
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(
      pivotX,
      pivotY,
      pendulumLength * 0.3,
      Math.PI / 2 - theta0_rad,
      Math.PI / 2 + theta0_rad
    );
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw pendulum string
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();

    // Draw pivot point
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Draw pivot mount
    ctx.fillStyle = '#334155';
    ctx.fillRect(pivotX - 40, pivotY - 15, 80, 15);

    // Draw mount pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(pivotX - 30 + i * 15, pivotY - 15);
      ctx.lineTo(pivotX - 35 + i * 15, pivotY - 25);
      ctx.stroke();
    }

    // Draw pendulum bob (mass)
    const bobRadius = 20 + Math.sqrt(mass) * 5;
    const bobGradient = ctx.createRadialGradient(
      bobX - 5,
      bobY - 5,
      0,
      bobX,
      bobY,
      bobRadius
    );
    bobGradient.addColorStop(0, '#fbbf24');
    bobGradient.addColorStop(0.7, '#f59e0b');
    bobGradient.addColorStop(1, '#d97706');

    ctx.shadowColor = 'rgba(245, 158, 11, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = bobGradient;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw bob outline
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, bobY, bobRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw mass label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${mass} kg`, bobX, bobY + 4);

    // Draw angle indicator
    if (isAnimating) {
      const theta_deg = theta_rad * 180 / Math.PI;

      // Angle arc
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        pivotX,
        pivotY,
        60,
        Math.PI / 2,
        Math.PI / 2 + theta_rad,
        theta_rad < 0
      );
      ctx.stroke();

      // Angle label
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`θ = ${theta_deg.toFixed(1)}°`, pivotX, pivotY + 100);
    }

    // Draw length indicator
    const midX = pivotX + (bobX - pivotX) * 0.5;
    const midY = pivotY + (bobY - pivotY) * 0.5;

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial';
    ctx.fillText(`L = ${simulationData.results.length} cm`, midX + 20, midY);

    // Draw legend
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('--- Vị trí cân bằng', 20, 30);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('--- Biên độ góc', 20, 45);

  }, [simulationData, isMounted, isAnimating, animationTime, mass, gravity]);

  // Loading state
  if (!isMounted) {
    return (

      <VisionThemeWrapper title="Simple Pendulum" subtitle="Hệ thống học tập thông minh">
        <div className="container mx-auto p-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      </VisionThemeWrapper>
    );
  }

  // Prepare chart data
  const angleData = simulationData?.oscillation || [];
  const velocityData = simulationData?.oscillation || [];
  const accelerationData = simulationData?.oscillation || [];
  const energyData = simulationData?.oscillation || [];

  return (
    <VisionThemeWrapper title="Simple Pendulum" subtitle="Hệ thống học tập thông minh">
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
            <Clock className="h-8 w-8 text-amber-600" />
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
            <Card className="border-2 border-amber-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardTitle className="flex items-center space-x-2 text-amber-900">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <span>Điều khiển thí nghiệm</span>
                </CardTitle>
                <CardDescription>
                  Điều chỉnh tham số con lắc đơn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Length Slider - Enhanced */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-bold text-blue-900 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Chiều dài dây (L)
                    </Label>
                    <div className="bg-white px-5 py-2 rounded-lg border-2 border-blue-300 shadow-md">
                      <span className="text-2xl font-bold text-blue-600">{length} cm</span>
                    </div>
                  </div>
                  <Slider
                    value={[length]}
                    onValueChange={([value]) => setLength(value)}
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

                {/* Mass Slider - Enhanced */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border-2 border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-bold text-amber-900 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Khối lượng (m)
                    </Label>
                    <div className="bg-white px-5 py-2 rounded-lg border-2 border-amber-300 shadow-md">
                      <span className="text-2xl font-bold text-amber-600">{mass} kg</span>
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
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span className="font-medium">0.5</span>
                    <span className="font-medium">1.5</span>
                    <span className="font-medium">2.5</span>
                    <span className="font-medium">3.5</span>
                    <span className="font-medium">5.0</span>
                  </div>
                </div>

                {/* Initial Angle Slider */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-bold text-green-900 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Góc lệch ban đầu (θ₀)
                    </Label>
                    <div className="bg-white px-5 py-2 rounded-lg border-2 border-green-300 shadow-md">
                      <span className="text-2xl font-bold text-green-600">{theta0}°</span>
                    </div>
                  </div>
                  <Slider
                    value={[theta0]}
                    onValueChange={([value]) => setTheta0(value)}
                    min={5}
                    max={60}
                    step={5}
                    className="mt-2 h-3 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                    <span className="font-medium">5°</span>
                    <span className="font-medium">20°</span>
                    <span className="font-medium">35°</span>
                    <span className="font-medium">50°</span>
                    <span className="font-medium">60°</span>
                  </div>
                </div>

                {/* Gravity Slider */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-bold text-purple-900">Gia tốc trọng trường (g)</Label>
                    <div className="bg-white px-5 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                      <span className="text-2xl font-bold text-purple-600">{gravity} m/s²</span>
                    </div>
                  </div>
                  <Slider
                    value={[gravity]}
                    onValueChange={([value]) => setGravity(value)}
                    min={1}
                    max={20}
                    step={0.1}
                    className="mt-2 h-3 cursor-pointer"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex space-x-2">
                    <Button
                      onClick={runSimulation}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
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
                    className={`w-full ${isCompleted
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
            <Card className="border-2 border-orange-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                <CardTitle className="flex items-center space-x-2 text-orange-900">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span>Con lắc đơn</span>
                </CardTitle>
                <CardDescription>
                  Dao động của quả nặng trên dây treo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={500}
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
                  <Tabs defaultValue="angle" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="angle">Góc θ</TabsTrigger>
                      <TabsTrigger value="velocity">Vận tốc ω</TabsTrigger>
                      <TabsTrigger value="acceleration">Gia tốc α</TabsTrigger>
                      <TabsTrigger value="energy">Năng lượng</TabsTrigger>
                    </TabsList>

                    <TabsContent value="angle">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={angleData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="t"
                            label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                          />
                          <YAxis
                            label={{ value: 'θ (°)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="theta"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            name="Góc θ(t)"
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
                            label={{ value: 'ω (rad/s)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="omega"
                            stroke="#22C55E"
                            strokeWidth={3}
                            name="Vận tốc góc ω(t)"
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
                            label={{ value: 'α (rad/s²)', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="alpha"
                            stroke="#EF4444"
                            strokeWidth={3}
                            name="Gia tốc góc α(t)"
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
                    <div className="text-xs text-amber-700 mb-1">Tần số (f)</div>
                    <div className="text-xl font-bold text-amber-900">
                      {simulationData.results.frequency.toFixed(3)} Hz
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs text-green-700 mb-1">ω max</div>
                    <div className="text-xl font-bold text-green-900">
                      {simulationData.results.maxOmega.toFixed(3)} rad/s
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
                          <TableHead className="text-center font-bold text-xs">θ (°)</TableHead>
                          <TableHead className="text-center font-bold text-xs">ω (rad/s)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simulationData.oscillation.filter((_, i) => i % 20 === 0).map((point, index) => (
                          <TableRow
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <TableCell className="text-center text-xs font-medium">{point.t}</TableCell>
                            <TableCell className="text-center text-xs">{point.theta}</TableCell>
                            <TableCell className="text-center text-xs">{point.omega}</TableCell>
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
                      θ = θ₀·cos(ω₀t)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Góc lệch</div>
                  </div>

                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900">
                      ω₀ = √(g/L)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Tần số góc</div>
                  </div>

                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900">
                      T = 2π√(L/g)
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Chu kỳ</div>
                  </div>

                  <div className="p-2 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                    <div className="font-mono text-center font-bold text-cyan-900">
                      E = ½mL²ω²
                    </div>
                    <div className="text-xs text-center text-cyan-700 mt-1">Năng lượng</div>
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
                  <li>Điều chỉnh chiều dài dây L (20-200 cm)</li>
                  <li>Chọn khối lượng m (0.5-5 kg)</li>
                  <li>Chọn góc lệch ban đầu θ₀ (5-60°)</li>
                  <li>Thay đổi gia tốc g (1-20 m/s²)</li>
                  <li>Nhấn &quot;Chạy mô phỏng&quot;</li>
                  <li>Nhấn &quot;Bắt đầu dao động&quot; để xem animation</li>
                  <li>Quan sát:</li>
                  <ul className="ml-6 mt-1 space-y-1">
                    <li>Chu kỳ chỉ phụ thuộc L và g</li>
                    <li>Không phụ thuộc khối lượng m</li>
                    <li>Không phụ thuộc biên độ θ₀ (góc nhỏ)</li>
                    <li>Năng lượng được bảo toàn</li>
                  </ul>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </VisionThemeWrapper>
  );
}

