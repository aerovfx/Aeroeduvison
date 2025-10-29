'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Play, RotateCcw, Loader2, Settings, Zap, Trophy, CheckCircle, Info, Target, TrendingUp, BarChart3, Pause, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProjectileData {
  trajectory: { t: number; x: number; y: number; vx: number; vy: number }[];
  results: {
    timeOfFlight: number;
    maxHeight: number;
    range: number;
    maxHeightTime: number;
  };
}

export default function ProjectileMotionPage() {
  const { t } = useLanguage();
  
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<ProjectileData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Simulation parameters
  const [velocity, setVelocity] = useState(20);
  const [angle, setAngle] = useState(45);
  const [height, setHeight] = useState(0);
  const [gravity, setGravity] = useState(9.8);
  
  // Track initial values for interaction detection
  const initialValues = useRef({
    velocity: 20,
    angle: 45,
    height: 0,
    gravity: 9.8
  });
  
  // Lab configuration
  const config = {
    name: "projectile",
    title: "Chuyển động ném xiên",
    description: "Khám phá chuyển động ném xiên và quỹ đạo parabol",
    category: "Cơ học",
    level: "Dễ",
    duration: "25 phút",
    xp: 120,
    port: 8016
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      velocity !== initialValues.current.velocity ||
      angle !== initialValues.current.angle ||
      height !== initialValues.current.height ||
      gravity !== initialValues.current.gravity;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [velocity, angle, height, gravity, isMounted, hasInteracted]);

  useEffect(() => {
    if (!isMounted) return;
    setBackendStatus('offline');
  }, [isMounted]);

  // Physics calculation
  const calculateProjectile = (v0: number, angleDeg: number, h0: number, g: number): ProjectileData => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const v0x = v0 * Math.cos(angleRad);
    const v0y = v0 * Math.sin(angleRad);
    
    // Time of flight
    const timeOfFlight = (v0y + Math.sqrt(v0y * v0y + 2 * g * h0)) / g;
    
    // Max height
    const maxHeight = h0 + (v0y * v0y) / (2 * g);
    const maxHeightTime = v0y / g;
    
    // Range
    const range = v0x * timeOfFlight;
    
    // Generate trajectory
    const trajectory = [];
    const numPoints = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * timeOfFlight) / (numPoints - 1);
      const x = v0x * t;
      const y = h0 + v0y * t - 0.5 * g * t * t;
      
      if (y < 0) break;
      
      trajectory.push({
        t: parseFloat(t.toFixed(2)),
        x: parseFloat(x.toFixed(2)),
        y: parseFloat(y.toFixed(2)),
        vx: parseFloat(v0x.toFixed(2)),
        vy: parseFloat((v0y - g * t).toFixed(2))
      });
    }
    
    return {
      trajectory,
      results: {
        timeOfFlight,
        maxHeight,
        range,
        maxHeightTime
      }
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = calculateProjectile(velocity, angle, height, gravity);
      setSimulationData(data);
      setAnimationProgress(0);
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setVelocity(initialValues.current.velocity);
    setAngle(initialValues.current.angle);
    setHeight(initialValues.current.height);
    setGravity(initialValues.current.gravity);
    setSimulationData(null);
    setHasInteracted(false);
    setIsAnimating(false);
    setAnimationProgress(0);
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
    setAnimationProgress(0);
    
    const startTime = Date.now();
    const duration = simulationData.results.timeOfFlight * 1000; // Convert to ms
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
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
    
    // Clear canvas with gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Find bounds
    const maxX = Math.max(...simulationData.trajectory.map(p => p.x));
    const maxY = Math.max(...simulationData.trajectory.map(p => p.y));
    
    const scaleX = graphWidth / (maxX * 1.1);
    const scaleY = graphHeight / (maxY * 1.2);
    
    const toScreenX = (x: number) => padding + x * scaleX;
    const toScreenY = (y: number) => height - padding - y * scaleY;
    
    // Draw grid
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i / 10) * graphWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
      
      const y = padding + (i / 10) * graphHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Draw full trajectory (faded if animating)
    const trajectoryGradient = ctx.createLinearGradient(
      toScreenX(0),
      toScreenY(0),
      toScreenX(maxX),
      toScreenY(0)
    );
    trajectoryGradient.addColorStop(0, '#3b82f6');
    trajectoryGradient.addColorStop(0.5, '#8b5cf6');
    trajectoryGradient.addColorStop(1, '#ec4899');
    
    ctx.strokeStyle = trajectoryGradient;
    ctx.lineWidth = isAnimating ? 1.5 : 3;
    ctx.globalAlpha = isAnimating ? 0.3 : 1;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    
    simulationData.trajectory.forEach((point, index) => {
      const x = toScreenX(point.x);
      const y = toScreenY(point.y);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    
    // Draw animated trajectory if animating
    if (isAnimating && animationProgress > 0) {
      const currentIndex = Math.floor(animationProgress * (simulationData.trajectory.length - 1));
      const visibleTrajectory = simulationData.trajectory.slice(0, currentIndex + 1);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      
      visibleTrajectory.forEach((point, index) => {
        const x = toScreenX(point.x);
        const y = toScreenY(point.y);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw animated object
      if (visibleTrajectory.length > 0) {
        const currentPoint = visibleTrajectory[visibleTrajectory.length - 1];
        const objX = toScreenX(currentPoint.x);
        const objY = toScreenY(currentPoint.y);
        
        // Object glow
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(objX, objY, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Velocity vector
        const vScale = 2;
        const vxScreen = currentPoint.vx * vScale;
        const vyScreen = -currentPoint.vy * vScale;
        
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(objX, objY);
        ctx.lineTo(objX + vxScreen, objY + vyScreen);
        ctx.stroke();
        
        // Arrow
        const vAngle = Math.atan2(vyScreen, vxScreen);
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.moveTo(objX + vxScreen, objY + vyScreen);
        ctx.lineTo(
          objX + vxScreen - 10 * Math.cos(vAngle - Math.PI / 6),
          objY + vyScreen - 10 * Math.sin(vAngle - Math.PI / 6)
        );
        ctx.lineTo(
          objX + vxScreen - 10 * Math.cos(vAngle + Math.PI / 6),
          objY + vyScreen - 10 * Math.sin(vAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Draw static points (if not animating)
    if (!isAnimating) {
      // Start point
      const startX = toScreenX(0);
      const startY = toScreenY(simulationData.trajectory[0].y);
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(startX, startY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // End point
      const endPoint = simulationData.trajectory[simulationData.trajectory.length - 1];
      const endX = toScreenX(endPoint.x);
      const endY = toScreenY(endPoint.y);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(endX, endY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Max height point
      const maxHeightPoint = simulationData.trajectory.reduce((max, p) => p.y > max.y ? p : max);
      const maxHX = toScreenX(maxHeightPoint.x);
      const maxHY = toScreenY(maxHeightPoint.y);
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(maxHX, maxHY, 8, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw dashed line to max height
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(maxHX, maxHY);
      ctx.lineTo(maxHX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('X (m)', width - 60, height - 25);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (m)', 0, 0);
    ctx.restore();
    
    // Legend
    ctx.font = '11px Arial';
    ctx.fillStyle = '#10b981';
    ctx.fillText('● Điểm xuất phát', padding + 10, padding + 20);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('● Độ cao cực đại', padding + 10, padding + 35);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● Điểm chạm đất', padding + 10, padding + 50);
    if (isAnimating) {
      ctx.fillStyle = '#22c55e';
      ctx.fillText('→ Vector vận tốc', padding + 10, padding + 65);
    }
    
  }, [simulationData, isMounted, isAnimating, animationProgress]);

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
  const trajectoryChartData = simulationData?.trajectory.map(p => ({
    x: p.x,
    y: p.y,
  })) || [];

  const velocityChartData = simulationData?.trajectory.filter((_, i) => i % 10 === 0).map(p => ({
    t: p.t,
    vx: Math.abs(p.vx),
    vy: Math.abs(p.vy),
    v: Math.sqrt(p.vx * p.vx + p.vy * p.vy),
  })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Target className="h-8 w-8 text-blue-600" />
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
                Điều chỉnh tham số ném xiên
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Velocity Slider - Enhanced */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-blue-900 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Vận tốc ban đầu
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-blue-300 shadow-md">
                    <span className="text-2xl font-bold text-blue-600">{velocity} m/s</span>
                  </div>
                </div>
                <Slider
                  value={[velocity]}
                  onValueChange={([value]) => setVelocity(value)}
                  min={5}
                  max={50}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">5</span>
                  <span className="font-medium">15</span>
                  <span className="font-medium">25</span>
                  <span className="font-medium">35</span>
                  <span className="font-medium">50</span>
                </div>
              </div>
              
              {/* Angle Slider - Enhanced */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border-2 border-amber-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-amber-900 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Góc ném
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-amber-300 shadow-md">
                    <span className="text-2xl font-bold text-amber-600">{angle}°</span>
                  </div>
                </div>
                <Slider
                  value={[angle]}
                  onValueChange={([value]) => setAngle(value)}
                  min={0}
                  max={90}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">0°</span>
                  <span className="font-medium">30°</span>
                  <span className="font-medium">45°</span>
                  <span className="font-medium">60°</span>
                  <span className="font-medium">90°</span>
                </div>
              </div>
              
              {/* Height Slider */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-green-900 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Độ cao ban đầu
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-green-300 shadow-md">
                    <span className="text-2xl font-bold text-green-600">{height} m</span>
                  </div>
                </div>
                <Slider
                  value={[height]}
                  onValueChange={([value]) => setHeight(value)}
                  min={0}
                  max={50}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">0</span>
                  <span className="font-medium">15</span>
                  <span className="font-medium">25</span>
                  <span className="font-medium">35</span>
                  <span className="font-medium">50</span>
                </div>
              </div>
              
              {/* Gravity Slider */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-purple-900">Gia tốc trọng trường</Label>
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
                  <div className="flex space-x-2">
                    <Button 
                      onClick={isAnimating ? stopAnimation : startAnimation}
                      variant="outline"
                      className="flex-1 border-2 border-green-300 hover:bg-green-50"
                      size="lg"
                    >
                      {isAnimating ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          <span>Dừng</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          <span>Xem Animation</span>
                        </>
                      )}
                    </Button>
                  </div>
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
                <Target className="h-5 w-5 text-indigo-600" />
                <span>Quỹ đạo chuyển động</span>
              </CardTitle>
              <CardDescription>
                Parabol của vật ném xiên {isAnimating && `(${Math.round(animationProgress * 100)}%)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <canvas
                ref={canvasRef}
                width={700}
                height={450}
                className="border rounded shadow-md w-full"
              />
            </CardContent>
          </Card>
          
          {/* Charts */}
          {simulationData && (
            <>
              {/* Trajectory Chart */}
              <Card className="border-2 border-blue-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Đồ thị quỹ đạo
                  </CardTitle>
                  <CardDescription>
                    Mối quan hệ giữa tầm xa (x) và độ cao (y)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trajectoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="x" 
                        label={{ value: 'Tầm xa (m)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Độ cao (m)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '2px solid #3B82F6',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="y" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        name="Độ cao"
                        dot={{ fill: '#3B82F6', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Velocity Chart */}
              <Card className="border-2 border-green-200 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    Đồ thị vận tốc
                  </CardTitle>
                  <CardDescription>
                    Thành phần vận tốc theo thời gian
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={velocityChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="t" 
                        label={{ value: 'Thời gian (s)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Vận tốc (m/s)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="vx" fill="#3B82F6" name="Vx (ngang)" />
                      <Bar dataKey="vy" fill="#22C55E" name="Vy (đứng)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
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
                  Các thông số quan trọng
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-700 mb-1">⏱️ Thời gian bay</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {simulationData.results.timeOfFlight.toFixed(2)} s
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-700 mb-1">📏 Độ cao cực đại</div>
                  <div className="text-2xl font-bold text-amber-900">
                    {simulationData.results.maxHeight.toFixed(2)} m
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-700 mb-1">📐 Tầm xa</div>
                  <div className="text-2xl font-bold text-green-900">
                    {simulationData.results.range.toFixed(2)} m
                  </div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm text-purple-700 mb-1">⏳ Thời điểm đạt h_max</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {simulationData.results.maxHeightTime.toFixed(2)} s
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
                  Bảng dữ liệu quỹ đạo
                </CardTitle>
                <CardDescription>
                  Các điểm quan trọng trên quỹ đạo
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-100">
                        <TableHead className="text-center font-bold">t (s)</TableHead>
                        <TableHead className="text-center font-bold">x (m)</TableHead>
                        <TableHead className="text-center font-bold">y (m)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationData.trajectory.filter((_, i) => i % 10 === 0).map((point, index) => (
                        <TableRow 
                          key={index}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="text-center font-medium">{point.t}</TableCell>
                          <TableCell className="text-center">{point.x}</TableCell>
                          <TableCell className="text-center">{point.y}</TableCell>
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
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    x = v₀ · cos(α) · t
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Tầm xa</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    y = h₀ + v₀·sin(α)·t - ½gt²
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Độ cao</div>
                </div>
                
                <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg border-2 border-cyan-300">
                  <div className="font-mono text-center font-bold text-cyan-900">
                    h_max = h₀ + v₀²·sin²(α)/(2g)
                  </div>
                  <div className="text-xs text-center text-cyan-700 mt-1">Độ cao cực đại</div>
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
              <ul className="text-sm space-y-2 list-disc list-inside text-gray-600">
                <li>Điều chỉnh vận tốc ban đầu (5-50 m/s)</li>
                <li>Chọn góc ném (0-90 độ)</li>
                <li>Thay đổi độ cao ban đầu (0-50 m)</li>
                <li>Nhấn "Chạy mô phỏng" để xem quỹ đạo</li>
                <li>Nhấn "Xem Animation" để xem chuyển động</li>
                <li>Xem đồ thị và bảng dữ liệu chi tiết</li>
                <li>Quan sát các điểm quan trọng:</li>
                <ul className="ml-6 mt-1 space-y-1">
                  <li className="text-green-600">● Điểm xuất phát</li>
                  <li className="text-amber-600">● Độ cao cực đại</li>
                  <li className="text-red-600">● Điểm chạm đất</li>
                  <li className="text-green-600">→ Vector vận tốc (khi animation)</li>
                </ul>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
