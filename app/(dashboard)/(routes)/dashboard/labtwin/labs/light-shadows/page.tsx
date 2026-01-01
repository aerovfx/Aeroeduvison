'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Play, RotateCcw, Activity, Loader2, Lightbulb, Info, Moon, Sun } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from '@/contexts/LanguageContext';

interface ShadowData {
  lightSources: [number, number][];
  obstacles: { x: number; y: number; width: number; height: number }[];
  umbraRegions: { x: number; y: number; width: number; height: number }[];
  penumbraRegions: { x: number; y: number; width: number; height: number }[];
  screenX: number;
}

export default function LightShadowsPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(0);
  
  // Parameters - Light Shadows Simulation
  const [lightSourceType, setLightSourceType] = useState<'single' | 'double'>('double');
  const [lightSourceDistance, setLightSourceDistance] = useState(100); // Distance from light source
  const [obstacleSize, setObstacleSize] = useState(40); // Size of obstacle
  const [numObstacles, setNumObstacles] = useState(1); // Number of obstacles
  const [simulationData, setSimulationData] = useState<ShadowData | null>(null);

  // Configuration
  const config = {
    name: "light-shadows",
    title: "Hiện tượng Nguyệt thực - Bóng tối và Bóng nửa tối",
    description: "Mô phỏng hiện tượng nguyệt thực với vùng bóng tối (umbra) và bóng nửa tối (penumbra) của Trái Đất",
    category: "Quang học - Thiên văn",
    level: "Lớp 7",
    duration: "40 phút",
    xp: 80,
    port: 8019
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate shadows
  const calculateShadows = (): ShadowData => {
    const lightSources: [number, number][] = 
      lightSourceType === 'single' 
        ? [[100, 200]]
        : [[100, 150], [100, 250]];
    
    const obstacles: { x: number; y: number; width: number; height: number }[] = [];
    const centerY = 200;
    const obstacleSpacing = 80;
    
    for (let i = 0; i < numObstacles; i++) {
      const y = centerY + (i - (numObstacles - 1) / 2) * obstacleSpacing - obstacleSize / 2;
      obstacles.push({
        x: 300,
        y: y,
        width: 20,
        height: obstacleSize
      });
    }
    
    const screenX = 500;
    const umbraRegions: { x: number; y: number; width: number; height: number }[] = [];
    const penumbraRegions: { x: number; y: number; width: number; height: number }[] = [];
    
    if (lightSourceType === 'double' && obstacles.length > 0) {
      obstacles.forEach(obstacle => {
        const [light1, light2] = lightSources;
        
        // Calculate shadow boundaries for both lights
        const top1 = obstacle.y;
        const bottom1 = obstacle.y + obstacle.height;
        const top2 = obstacle.y;
        const bottom2 = obstacle.y + obstacle.height;
        
        // Umbra (complete shadow) - where no light reaches
        const umbraTop = Math.min(
          top1 + (top1 - light1[1]) * (screenX - obstacle.x) / (obstacle.x - light1[0]),
          top2 + (top2 - light2[1]) * (screenX - obstacle.x) / (obstacle.x - light2[0])
        );
        const umbraBottom = Math.max(
          bottom1 + (bottom1 - light1[1]) * (screenX - obstacle.x) / (obstacle.x - light1[0]),
          bottom2 + (bottom2 - light2[1]) * (screenX - obstacle.x) / (obstacle.x - light2[0])
        );
        
        if (umbraBottom > umbraTop) {
          umbraRegions.push({
            x: screenX - 10,
            y: umbraTop,
            width: 20,
            height: umbraBottom - umbraTop
          });
        }
        
        // Penumbra (partial shadow) - where some light reaches
        const penumbraTop1 = top1 + (top1 - light2[1]) * (screenX - obstacle.x) / (obstacle.x - light2[0]);
        const penumbraBottom2 = bottom2 + (bottom2 - light1[1]) * (screenX - obstacle.x) / (obstacle.x - light1[0]);
        
        // Top penumbra
        if (penumbraTop1 < umbraTop) {
          penumbraRegions.push({
            x: screenX - 10,
            y: penumbraTop1,
            width: 20,
            height: umbraTop - penumbraTop1
          });
        }
        
        // Bottom penumbra
        if (penumbraBottom2 > umbraBottom) {
          penumbraRegions.push({
            x: screenX - 10,
            y: umbraBottom,
            width: 20,
            height: penumbraBottom2 - umbraBottom
          });
        }
      });
    } else {
      // Single light source - only umbra
      obstacles.forEach(obstacle => {
        const light = lightSources[0];
        const top = obstacle.y;
        const bottom = obstacle.y + obstacle.height;
        
        const shadowTop = top + (top - light[1]) * (screenX - obstacle.x) / (obstacle.x - light[0]);
        const shadowBottom = bottom + (bottom - light[1]) * (screenX - obstacle.x) / (obstacle.x - light[0]);
        
        umbraRegions.push({
          x: screenX - 10,
          y: shadowTop,
          width: 20,
          height: shadowBottom - shadowTop
        });
      });
    }
    
    return {
      lightSources,
      obstacles,
      umbraRegions,
      penumbraRegions,
      screenX
    };
  };

  useEffect(() => {
    if (!isMounted) return;
    const data = calculateShadows();
    setSimulationData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obstacleSize, numObstacles, lightSourceType, isMounted]);

  // Draw canvas
  useEffect(() => {
    if (!isMounted || !simulationData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 600;
    canvas.height = 400;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw light rays from each source
    simulationData.lightSources.forEach((source: [number, number], idx: number) => {
      const [sourceX, sourceY] = source;
      
      // Draw light glow
      const gradient = ctx.createRadialGradient(sourceX, sourceY, 5, sourceX, sourceY, 40);
      gradient.addColorStop(0, idx === 0 ? '#FFF9C4' : '#FFECB3');
      gradient.addColorStop(0.5, idx === 0 ? '#FFE082' : '#FFD54F');
      gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(sourceX - 40, sourceY - 40, 80, 80);
      
      // Draw light bulb
      ctx.fillStyle = idx === 0 ? '#FFEB3B' : '#FFC107';
      ctx.beginPath();
      ctx.arc(sourceX, sourceY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#F57C00';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw light rays to screen
      simulationData.obstacles.forEach((obstacle: { x: number; y: number; width: number; height: number }) => {
        // Top ray
        ctx.strokeStyle = `rgba(255, 235, 59, 0.2)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(obstacle.x, obstacle.y);
        ctx.lineTo(simulationData.screenX, obstacle.y + (obstacle.y - sourceY) * (simulationData.screenX - obstacle.x) / (obstacle.x - sourceX));
        ctx.stroke();
        
        // Bottom ray
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(obstacle.x, obstacle.y + obstacle.height);
        ctx.lineTo(simulationData.screenX, obstacle.y + obstacle.height + (obstacle.y + obstacle.height - sourceY) * (simulationData.screenX - obstacle.x) / (obstacle.x - sourceX));
        ctx.stroke();
      });
    });
    
    // Draw obstacles
    simulationData.obstacles.forEach((obstacle: { x: number; y: number; width: number; height: number }) => {
      ctx.fillStyle = '#424242';
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      ctx.strokeStyle = '#757575';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
    
    // Draw screen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(simulationData.screenX - 10, 0, 20, canvas.height);
    
    // Draw penumbra regions (partial shadow - orange/amber for visibility)
    simulationData.penumbraRegions.forEach((region: { x: number; y: number; width: number; height: number }) => {
      // Gradient for penumbra - lighter shadow with orange tint
      const penumbraGradient = ctx.createLinearGradient(region.x, region.y, region.x + region.width, region.y);
      penumbraGradient.addColorStop(0, 'rgba(255, 152, 0, 0.5)'); // Orange
      penumbraGradient.addColorStop(0.5, 'rgba(255, 183, 77, 0.45)'); // Light orange
      penumbraGradient.addColorStop(1, 'rgba(255, 224, 130, 0.4)'); // Very light orange
      ctx.fillStyle = penumbraGradient;
      ctx.fillRect(region.x, region.y, region.width, region.height);
      
      // Border for clarity
      ctx.strokeStyle = 'rgba(255, 152, 0, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(region.x, region.y, region.width, region.height);
    });
    
    // Draw umbra regions (complete shadow - dark red/purple for visibility)
    simulationData.umbraRegions.forEach((region: { x: number; y: number; width: number; height: number }) => {
      // Gradient for umbra - dark shadow with red tint
      const umbraGradient = ctx.createLinearGradient(region.x, region.y, region.x + region.width, region.y);
      umbraGradient.addColorStop(0, 'rgba(139, 0, 0, 0.85)'); // Dark red
      umbraGradient.addColorStop(0.5, 'rgba(75, 0, 130, 0.9)'); // Indigo/Purple
      umbraGradient.addColorStop(1, 'rgba(25, 25, 112, 0.85)'); // Midnight blue
      ctx.fillStyle = umbraGradient;
      ctx.fillRect(region.x, region.y, region.width, region.height);
      
      // Border for clarity
      ctx.strokeStyle = 'rgba(139, 0, 0, 0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(region.x, region.y, region.width, region.height);
    });
    
    // Draw labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    simulationData.lightSources.forEach((source: [number, number], idx: number) => {
      ctx.fillText(`Nguồn ${idx + 1}`, source[0] - 25, source[1] - 30);
    });
    ctx.fillText('Vật cản', 280, 30);
    ctx.fillText('Màn hứng', simulationData.screenX - 30, 30);
    
    // Draw shadow labels
    if (simulationData.umbraRegions.length > 0) {
      ctx.fillStyle = '#FF5722';
      ctx.font = 'bold 10px Arial';
      ctx.fillText('Bóng tối', simulationData.screenX + 15, simulationData.umbraRegions[0].y + simulationData.umbraRegions[0].height / 2);
    }
    
    if (simulationData.penumbraRegions.length > 0) {
      ctx.fillStyle = '#FF9800';
      ctx.fillText('Bóng nửa tối', simulationData.screenX + 15, simulationData.penumbraRegions[0].y + simulationData.penumbraRegions[0].height / 2);
    }
    
  }, [simulationData, isMounted]);

  // Calculate data table
  const calculateShadowTable = () => {
    const data = [
      {
        numLights: 1,
        umbra: 'Có',
        penumbra: 'Không',
        totalShadow: 'Chỉ bóng tối'
      },
      {
        numLights: 2,
        umbra: 'Có',
        penumbra: 'Có',
        totalShadow: 'Cả 2 loại'
      }
    ];
    return data;
  };

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
    setLightSourceDistance(100);
    setObstacleSize(40);
    setNumObstacles(1);
    setLightSourceType('double');
  };

  if (!isMounted) {
    return (
      <VisionThemeWrapper>
        <div className="container mx-auto p-6 space-y-6">
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading simulation...</p>
          </div>
        </div>
      </VisionThemeWrapper>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Moon className="h-8 w-8 text-gray-700" />
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
                <Sun className="h-5 w-5" />
                <span>Mô phỏng bóng tối và bóng nửa tối</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quan sát sự hình thành vùng bóng tối (umbra) và bóng nửa tối (penumbra)
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
                    <div className="text-sm text-gray-600">Nguồn sáng</div>
                    <div className="text-lg font-semibold">{lightSourceType === 'single' ? '1' : '2'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bóng tối</div>
                    <div className="text-lg font-semibold">{simulationData?.umbraRegions.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bóng nửa tối</div>
                    <div className="text-lg font-semibold">{simulationData?.penumbraRegions.length || 0}</div>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Light Source Type */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border-2 border-amber-200 shadow-sm">
                  <label className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
                    <Sun className="h-5 w-5" />
                    Loại nguồn sáng
                  </label>
                  <Select value={lightSourceType} onValueChange={(v) => setLightSourceType(v as 'single' | 'double')}>
                    <SelectTrigger className="bg-white border-amber-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">1 nguồn sáng (chỉ bóng tối)</SelectItem>
                      <SelectItem value="double">2 nguồn sáng (cả 2 loại bóng)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Obstacle Size Slider */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border-2 border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Kích thước vật cản
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-gray-300 shadow-md">
                      <span className="text-3xl font-bold text-gray-600">{obstacleSize}px</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[obstacleSize]}
                      onValueChange={(value) => setObstacleSize(value[0])}
                      max={80}
                      min={20}
                      step={5}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">Nhỏ</span>
                      <span className="font-medium">Vừa</span>
                      <span className="font-medium">Lớn</span>
                    </div>
                  </div>
                </div>
                
                {/* Number of Obstacles */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <label className="text-sm font-bold mb-2 block text-blue-900">
                    Số lượng vật cản
                  </label>
                  <Select value={numObstacles.toString()} onValueChange={(v) => setNumObstacles(parseInt(v))}>
                    <SelectTrigger className="bg-white border-blue-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 vật</SelectItem>
                      <SelectItem value="2">2 vật</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-gray-600 to-slate-600 hover:from-gray-700 hover:to-slate-700"
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
                      <div className="w-8 h-4 rounded border-2 border-red-900" style={{ background: 'linear-gradient(to right, rgba(139, 0, 0, 0.85), rgba(75, 0, 130, 0.9))' }}></div>
                      <span className="font-medium">Bóng tối (Umbra) - Tối hoàn toàn (màu đỏ-tím đậm)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-4 rounded border-2 border-orange-500" style={{ background: 'linear-gradient(to right, rgba(255, 152, 0, 0.5), rgba(255, 224, 130, 0.4))' }}></div>
                      <span className="font-medium">Bóng nửa tối (Penumbra) - Tối một phần (màu cam-vàng)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-yellow-400 rounded opacity-30"></div>
                      <span>Tia sáng (màu vàng mờ)</span>
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
          <Card className="border-2 border-gray-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-gray-600" />
                Dữ liệu hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200 shadow-sm">
                <div className="text-sm text-blue-600 font-semibold">Thời gian</div>
                <div className="text-2xl font-bold text-blue-800">{time.toFixed(1)}s</div>
              </div>
              
              <div className="p-4 rounded-lg text-center border-2 border-red-900 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.3), rgba(75, 0, 130, 0.3))' }}>
                <div className="text-sm text-red-900 font-semibold">Vùng bóng tối (Umbra)</div>
                <div className="text-2xl font-bold text-red-950">
                  {simulationData?.umbraRegions.length || 0}
                </div>
                <div className="text-xs text-red-800 mt-1">Tối hoàn toàn</div>
              </div>
              
              <div className="p-4 rounded-lg text-center border-2 border-orange-500 shadow-sm" style={{ background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 224, 130, 0.2))' }}>
                <div className="text-sm text-orange-900 font-semibold">Vùng bóng nửa tối (Penumbra)</div>
                <div className="text-2xl font-bold text-orange-950">
                  {simulationData?.penumbraRegions.length || 0}
                </div>
                <div className="text-xs text-orange-800 mt-1">Tối một phần</div>
              </div>
            </CardContent>
          </Card>

          {/* Shadow Comparison Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-indigo-600" />
                So sánh loại bóng
              </CardTitle>
              <CardDescription>
                Phụ thuộc số nguồn sáng
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-100">
                      <TableHead className="text-center font-bold text-indigo-900">
                        Số nguồn
                      </TableHead>
                      <TableHead className="text-center font-bold text-indigo-900">
                        Bóng tối
                      </TableHead>
                      <TableHead className="text-center font-bold text-indigo-900">
                        Bóng nửa tối
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculateShadowTable().map((row, index) => (
                      <TableRow 
                        key={index}
                        className={`
                          ${row.numLights === (lightSourceType === 'single' ? 1 : 2) 
                            ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' 
                            : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <TableCell className="text-center font-medium">{row.numLights}</TableCell>
                        <TableCell className="text-center">
                          <span className={`${row.umbra === 'Có' ? 'text-gray-800 font-bold' : 'text-gray-400'}`}>
                            {row.umbra}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`${row.penumbra === 'Có' ? 'text-gray-600 font-bold' : 'text-gray-400'}`}>
                            {row.penumbra}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border-l-4 border-yellow-400 rounded"></div>
                <span>Cấu hình hiện tại</span>
              </div>
            </CardContent>
          </Card>

          {/* Theory */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-teal-600" />
                Kiến thức cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-red-900" style={{ background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.8), rgba(75, 0, 130, 0.8))' }}>
                  <div className="font-bold mb-2 text-white text-lg">🌑 Bóng tối (Umbra)</div>
                  <div className="text-sm text-white">Vùng <span className="font-bold underline">KHÔNG nhận được</span> ánh sáng từ BẤT KỲ nguồn nào</div>
                  <div className="text-xs text-red-200 mt-2">→ Màu đỏ-tím đậm trên canvas</div>
                </div>
                
                <div className="p-4 rounded-lg border-2 border-orange-500" style={{ background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.6), rgba(255, 224, 130, 0.5))' }}>
                  <div className="font-bold mb-2 text-orange-950 text-lg">🌗 Bóng nửa tối (Penumbra)</div>
                  <div className="text-sm text-orange-950">Vùng nhận được ánh sáng từ <span className="font-bold underline">MỘT PHẦN</span> nguồn</div>
                  <div className="text-xs text-orange-900 mt-2">→ Màu cam-vàng trên canvas</div>
                </div>
                
                <div className="text-xs text-gray-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <strong>Lưu ý:</strong> Bóng nửa tối chỉ xuất hiện khi có từ 2 nguồn sáng trở lên!
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
                <span className="font-medium">💡 Đèn chiếu (1-2 bóng)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">🔲 Vật cản (1-2 vật)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">📄 Màn hứng trắng</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <span className="font-medium">📏 Thước đo</span>
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
                  <Badge className="bg-gradient-to-r from-gray-600 to-slate-600 font-bold">
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

