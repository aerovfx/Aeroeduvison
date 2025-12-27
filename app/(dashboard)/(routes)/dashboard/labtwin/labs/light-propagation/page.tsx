'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, Eye } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface LightRay {
  start: [number, number];
  end: [number, number];
  blocked: boolean;
}

interface SimulationData {
  lightSource: [number, number];
  holes: [number, number][];
  rays: LightRay[];
  screen: [number, number][];
  blockedRays: number;
}

export default function LightPropagationPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  
  // Parameters
  const [lightAngle, setLightAngle] = useState(0);
  const [holeSize, setHoleSize] = useState(10);
  const [numHoles, setNumHoles] = useState(1);
  const [screenDistance, setScreenDistance] = useState(200);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);

  // Configuration
  const config = {
    name: "light-propagation",
    title: "Sự truyền thẳng của ánh sáng",
    description: "Quan sát và chứng minh ánh sáng truyền theo đường thẳng",
    category: "Quang học",
    level: "Lớp 7",
    duration: "30 phút",
    xp: 60,
    port: 8018
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate simulation
  const calculateSimulation = (): SimulationData => {
    const sourceX = 100;
    const sourceY = 200;
    
    const holes: [number, number][] = [];
    const centerY = 200;
    const holeSpacing = 50;
    
    for (let i = 0; i < numHoles; i++) {
      const y = centerY + (i - (numHoles - 1) / 2) * holeSpacing;
      holes.push([300, y]);
    }
    
    const rays: LightRay[] = [];
    const numRays = 15;
    
    for (let i = 0; i < numRays; i++) {
      const angleOffset = (i - numRays / 2) * 3 + lightAngle;
      const angleRad = (angleOffset * Math.PI) / 180;
      
      // Check if ray passes through any hole
      let blocked = true;
      let endX = 300;
      let endY = sourceY + (endX - sourceX) * Math.tan(angleRad);
      
      for (const hole of holes) {
        const [holeX, holeY] = hole;
        if (Math.abs(endY - holeY) < holeSize) {
          blocked = false;
          endX = 300 + screenDistance;
          endY = holeY + (endX - holeX) * Math.tan(angleRad);
          break;
        }
      }
      
      rays.push({
        start: [sourceX, sourceY],
        end: [endX, endY],
        blocked
      });
    }
    
    const screen: [number, number][] = [
      [300 + screenDistance, 0],
      [300 + screenDistance, 400]
    ];
    
    const blockedRays = rays.filter(r => r.blocked).length;
    
    return {
      lightSource: [sourceX, sourceY],
      holes,
      rays,
      screen,
      blockedRays
    };
  };

  useEffect(() => {
    if (!isMounted) return;
    const data = calculateSimulation();
    setSimulationData(data);
  }, [lightAngle, holeSize, numHoles, screenDistance, isMounted]);

  // Draw canvas
  useEffect(() => {
    if (!isMounted || !simulationData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 600;
    canvas.height = 400;
    
    // Clear canvas
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw light source (bulb)
    const [sourceX, sourceY] = simulationData.lightSource;
    const gradient = ctx.createRadialGradient(sourceX, sourceY, 5, sourceX, sourceY, 30);
    gradient.addColorStop(0, '#FFF59D');
    gradient.addColorStop(0.5, '#FFD54F');
    gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(sourceX - 30, sourceY - 30, 60, 60);
    
    // Draw light bulb
    ctx.fillStyle = '#FFF59D';
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw rays
    simulationData.rays.forEach(ray => {
      if (ray.blocked) {
        // Blocked rays (dim red)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.lineWidth = 1;
      } else {
        // Passing rays (bright yellow)
        ctx.shadowColor = 'rgba(255, 235, 59, 0.5)';
        ctx.shadowBlur = 5;
        ctx.strokeStyle = '#FFEB3B';
        ctx.lineWidth = 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(ray.start[0], ray.start[1]);
      ctx.lineTo(ray.end[0], ray.end[1]);
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    
    // Draw barrier with holes
    ctx.fillStyle = '#424242';
    ctx.fillRect(295, 0, 10, canvas.height);
    
    // Draw holes
    simulationData.holes.forEach(([x, y]) => {
      ctx.clearRect(x - 5, y - holeSize, 10, holeSize * 2);
      ctx.strokeStyle = '#FF9800';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 5, y - holeSize, 10, holeSize * 2);
    });
    
    // Draw screen
    const [[screenX, screenY1], [, screenY2]] = simulationData.screen;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(screenX - 5, screenY1, 10, screenY2 - screenY1);
    
    // Draw light spots on screen
    simulationData.rays.forEach(ray => {
      if (!ray.blocked) {
        const spotGradient = ctx.createRadialGradient(ray.end[0], ray.end[1], 0, ray.end[0], ray.end[1], 15);
        spotGradient.addColorStop(0, 'rgba(255, 235, 59, 0.8)');
        spotGradient.addColorStop(1, 'rgba(255, 235, 59, 0)');
        ctx.fillStyle = spotGradient;
        ctx.beginPath();
        ctx.arc(ray.end[0], ray.end[1], 15, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    // Draw labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Nguồn sáng', sourceX - 30, sourceY - 40);
    ctx.fillText('Tấm chắn', 260, 30);
    ctx.fillText('Màn hứng', screenX + 10, 30);
    
  }, [simulationData, isMounted, holeSize]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      for (let t = 0; t <= 3; t += 0.1) {
        setTime(t);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setTime(0);
    setLightAngle(0);
    setHoleSize(10);
    setNumHoles(1);
    setScreenDistance(200);
  };

  if (!isMounted) {
    return (

      <VisionThemeWrapper title="Light Propagation" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Eye className="h-8 w-8 text-yellow-600" />
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Simulation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Mô phỏng truyền thẳng ánh sáng</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ánh sáng chỉ đi qua các lỗ nhỏ và tạo điểm sáng trên màn
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-4">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-gray-900"
                  width={600}
                  height={400}
                />
              </div>
              
              {/* Current Parameters Display */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Số lỗ</div>
                    <div className="text-lg font-semibold">{numHoles}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tia bị chặn</div>
                    <div className="text-lg font-semibold">{simulationData?.blockedRays || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tia qua</div>
                    <div className="text-lg font-semibold">
                      {simulationData ? simulationData.rays.length - simulationData.blockedRays : 0}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Light Angle Slider */}
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-xl border-2 border-yellow-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-yellow-900 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Góc nghiêng nguồn sáng
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-yellow-300 shadow-md">
                      <span className="text-3xl font-bold text-yellow-600">{lightAngle}°</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[lightAngle]}
                      onValueChange={(value) => setLightAngle(value[0])}
                      max={30}
                      min={-30}
                      step={1}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">-30°</span>
                      <span className="font-medium">0°</span>
                      <span className="font-medium">30°</span>
                    </div>
                  </div>
                </div>

                {/* Hole Size Slider */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-orange-900 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Kích thước lỗ
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-orange-300 shadow-md">
                      <span className="text-3xl font-bold text-orange-600">{holeSize}px</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[holeSize]}
                      onValueChange={(value) => setHoleSize(value[0])}
                      max={30}
                      min={5}
                      step={1}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">Nhỏ</span>
                      <span className="font-medium">Vừa</span>
                      <span className="font-medium">Lớn</span>
                    </div>
                  </div>
                </div>
                
                {/* Number of Holes */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="text-sm font-bold mb-2 block text-blue-900">
                    Số lượng lỗ
                  </label>
                  <Select value={numHoles.toString()} onValueChange={(v) => setNumHoles(parseInt(v))}>
                    <SelectTrigger className="bg-white border-blue-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 lỗ</SelectItem>
                      <SelectItem value="2">2 lỗ</SelectItem>
                      <SelectItem value="3">3 lỗ</SelectItem>
                      <SelectItem value="4">4 lỗ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700"
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
                
                {/* Legend */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Chú thích màu sắc
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-yellow-400 rounded"></div>
                      <span>Tia sáng qua lỗ (màu vàng)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-red-500 opacity-30 rounded"></div>
                      <span>Tia bị chặn (màu đỏ mờ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-4 bg-gray-600 rounded"></div>
                      <span>Tấm chắn</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Current Data */}
          <Card className="border-2 border-yellow-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-600" />
                Dữ liệu hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200 shadow-sm">
                <div className="text-sm text-blue-600 font-semibold">Thời gian</div>
                <div className="text-2xl font-bold text-blue-800">{time.toFixed(1)}s</div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg text-center border-2 border-yellow-200 shadow-sm">
                <div className="text-sm text-yellow-600 font-semibold">Tia truyền qua</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {simulationData ? simulationData.rays.length - simulationData.blockedRays : 0}
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg text-center border-2 border-red-200 shadow-sm">
                <div className="text-sm text-red-600 font-semibold">Tia bị chặn</div>
                <div className="text-2xl font-bold text-red-800">
                  {simulationData?.blockedRays || 0}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observation Guide */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-teal-600" />
                Hướng dẫn quan sát
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">1.</span>
                  <div>Ánh sáng từ nguồn phát ra theo <span className="font-bold">đường thẳng</span></div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">2.</span>
                  <div>Chỉ các tia đi qua lỗ mới chiếu lên màn</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">3.</span>
                  <div>Các tia khác bị tấm chắn ngăn lại</div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">4.</span>
                  <div>Điểm sáng trên màn chứng minh ánh sáng truyền thẳng</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card className="border-2 border-amber-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Dụng cụ thí nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">💡 Đèn pin / Nguồn sáng</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">🔲 Tấm có lỗ nhỏ</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">📄 Màn hứng trắng</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">📦 Hộp quang học</span>
              </div>
            </CardContent>
          </Card>

          {/* Lab Info */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-600" />
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
                  <Badge className="bg-gradient-to-r from-yellow-600 to-amber-600 font-bold">
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

