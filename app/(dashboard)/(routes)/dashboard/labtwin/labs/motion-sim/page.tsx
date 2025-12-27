'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Activity, Play, Pause, RotateCcw, Loader2, Settings, Eye, LineChart, Grid3x3, Zap, Brain, Target } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface MotionState {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
}

interface SimulationData {
  trajectory: MotionState[];
  results: {
    time_to_ground?: number;
    velocity_at_ground?: number;
    max_height?: number;
    range?: number;
    time_of_flight?: number;
    period?: number;
    frequency?: number;
  };
}

export default function MotionSimPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [activeTab, setActiveTab] = useState('free-fall');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  // Visualization options
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showAccelerationVector, setShowAccelerationVector] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphType, setGraphType] = useState<'position' | 'velocity' | 'acceleration'>('position');
  
  // Simulation parameters
  const [freeFallParams, setFreeFallParams] = useState({
    h0: 100,
    v0: 0,
    g: 9.8
  });
  
  const [projectileParams, setProjectileParams] = useState({
    v0: 25,
    angle: 45,
    h0: 0,
    g: 9.8
  });
  
  const [harmonicParams, setHarmonicParams] = useState({
    A: 0.15,
    omega: 6.28,
    phi: 0
  });
  
  // Lab configuration
  const config = {
    name: "MotionSim",
    title: "Mô phỏng chuyển động vật lý",
    description: "Rơi tự do, ném xiên, dao động với AI",
    category: "Cơ học",
    level: "Trung bình",
    xp: 200,
    port: 8014
  };

  useEffect(() => {
    // Backend check disabled - use offline mode by default
    const ENABLE_BACKEND_CHECK = false;
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline');
      return;
    }

    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8014/api/health`, {
          signal: AbortSignal.timeout(2000) // Timeout after 2s
        });
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        // Silently set offline mode - this is expected behavior
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Physics calculations
  const calculateFreeFall = (h0: number, v0: number, g: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const timeToGround = (v0 + Math.sqrt(v0 * v0 + 2 * g * h0)) / g;
    const numPoints = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * timeToGround) / (numPoints - 1);
      const y = h0 + v0 * t - 0.5 * g * t * t;
      
      if (y < 0) break;
      
      trajectory.push({
        t,
        x: 0,
        y,
        vx: 0,
        vy: v0 - g * t,
        ax: 0,
        ay: -g
      });
    }
    
    return {
      trajectory,
      results: {
        time_to_ground: timeToGround,
        velocity_at_ground: Math.abs(v0 - g * timeToGround),
        max_height: h0 + (v0 > 0 ? v0 * v0 / (2 * g) : 0)
      }
    };
  };

  const calculateProjectile = (v0: number, angle: number, h0: number, g: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const angleRad = (angle * Math.PI) / 180;
    const v0x = v0 * Math.cos(angleRad);
    const v0y = v0 * Math.sin(angleRad);
    
    const timeOfFlight = (v0y + Math.sqrt(v0y * v0y + 2 * g * h0)) / g;
    const range = v0x * timeOfFlight;
    const maxHeight = h0 + v0y * v0y / (2 * g);
    const numPoints = 150;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * timeOfFlight) / (numPoints - 1);
      const x = v0x * t;
      const y = h0 + v0y * t - 0.5 * g * t * t;
      
      if (y < 0) break;
      
      trajectory.push({
        t,
        x,
        y,
        vx: v0x,
        vy: v0y - g * t,
        ax: 0,
        ay: -g
      });
    }
    
    return {
      trajectory,
      results: {
        time_of_flight: timeOfFlight,
        max_height: maxHeight,
        range: range,
        velocity_at_ground: Math.sqrt(v0x * v0x + Math.pow(v0y - g * timeOfFlight, 2))
      }
    };
  };

  const calculateHarmonic = (A: number, omega: number, phi: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const T = 2 * Math.PI / omega;
    const tMax = 2 * T;
    const numPoints = 200;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * tMax) / (numPoints - 1);
      const x = A * Math.cos(omega * t + phi);
      const vx = -A * omega * Math.sin(omega * t + phi);
      const ax = -A * omega * omega * Math.cos(omega * t + phi);
      
      trajectory.push({
        t,
        x,
        y: 0,
        vx,
        vy: 0,
        ax,
        ay: 0
      });
    }
    
    return {
      trajectory,
      results: {
        max_height: A,
        period: T,
        frequency: 1 / T
      }
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      let data: SimulationData;
      
      if (activeTab === 'free-fall') {
        data = calculateFreeFall(freeFallParams.h0, freeFallParams.v0, freeFallParams.g);
      } else if (activeTab === 'projectile') {
        data = calculateProjectile(projectileParams.v0, projectileParams.angle, projectileParams.h0, projectileParams.g);
      } else {
        data = calculateHarmonic(harmonicParams.A, harmonicParams.omega, harmonicParams.phi);
      }
      
      setSimulationData(data);
      
      // Try to use backend if available
      if (backendStatus === 'online') {
        try {
          const endpoint = activeTab === 'free-fall' ? '/api/free-fall' : 
                          activeTab === 'projectile' ? '/api/projectile' : '/api/harmonic';
          const params = activeTab === 'free-fall' ? freeFallParams :
                        activeTab === 'projectile' ? projectileParams : harmonicParams;
          
          const response = await fetch(`http://localhost:8014${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
          
          if (response.ok) {
            const backendData = await response.json();
            setSimulationData(backendData.data);
          }
        } catch (error) {
          console.log('Using local calculations');
        }
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const startAnimation = () => {
    if (!simulationData) return;
    
    setIsAnimating(true);
    setCurrentTime(0);
    startTimeRef.current = performance.now();
    
    const animate = (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000 * animationSpeed;
      const maxTime = simulationData.trajectory[simulationData.trajectory.length - 1].t;
      
      if (elapsed >= maxTime) {
        setCurrentTime(maxTime);
        setIsAnimating(false);
        return;
      }
      
      setCurrentTime(elapsed);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
  
  const stopAnimation = () => {
    setIsAnimating(false);
    setCurrentTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const resetSimulation = () => {
    setSimulationData(null);
    setCurrentTime(0);
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Enhanced Canvas drawing with AI-enhanced visuals
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // AI-enhanced gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#dbeafe');
    gradient.addColorStop(0.5, '#e0e7ff');
    gradient.addColorStop(1, '#f0f9ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Find bounds
    let minX = 0, maxX = 0, minY = 0, maxY = 0;
    simulationData.trajectory.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    minX -= rangeX * 0.15;
    maxX += rangeX * 0.15;
    minY -= rangeY * 0.15;
    maxY += rangeY * 0.15;
    
    const scaleX = graphWidth / (maxX - minX);
    const scaleY = graphHeight / (maxY - minY);
    
    const toScreenX = (x: number) => padding + (x - minX) * scaleX;
    const toScreenY = (y: number) => height - padding - (y - minY) * scaleY;
    
    // Draw grid with AI styling
    if (showGrid) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      const gridSpacingX = Math.pow(10, Math.floor(Math.log10((maxX - minX) / 10)));
      const gridSpacingY = Math.pow(10, Math.floor(Math.log10((maxY - minY) / 10)));
      
      for (let x = Math.ceil(minX / gridSpacingX) * gridSpacingX; x <= maxX; x += gridSpacingX) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(x), padding);
        ctx.lineTo(toScreenX(x), height - padding);
        ctx.stroke();
      }
      
      for (let y = Math.ceil(minY / gridSpacingY) * gridSpacingY; y <= maxY; y += gridSpacingY) {
        ctx.beginPath();
        ctx.moveTo(padding, toScreenY(y));
        ctx.lineTo(width - padding, toScreenY(y));
        ctx.stroke();
      }
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
    
    // Draw axes arrows
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(width - padding, height - padding);
    ctx.lineTo(width - padding - 10, height - padding - 5);
    ctx.lineTo(width - padding - 10, height - padding + 5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding - 5, padding + 10);
    ctx.lineTo(padding + 5, padding + 10);
    ctx.fill();
    
    // AI-enhanced trajectory with multi-color gradient
    const trajectoryGradient = ctx.createLinearGradient(
      toScreenX(simulationData.trajectory[0].x),
      toScreenY(simulationData.trajectory[0].y),
      toScreenX(simulationData.trajectory[simulationData.trajectory.length - 1].x),
      toScreenY(simulationData.trajectory[simulationData.trajectory.length - 1].y)
    );
    trajectoryGradient.addColorStop(0, '#3b82f6');
    trajectoryGradient.addColorStop(0.5, '#8b5cf6');
    trajectoryGradient.addColorStop(1, '#ec4899');
    
    ctx.strokeStyle = trajectoryGradient;
    ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    
    let firstPoint = true;
    simulationData.trajectory.forEach((point, index) => {
      const x = toScreenX(point.x);
      const y = toScreenY(point.y);
      
      if (firstPoint) {
        ctx.moveTo(x, y);
        firstPoint = false;
      } else {
        ctx.lineTo(x, y);
      }
      
      // AI-enhanced trail with fading effect
      if (showTrail && index % 4 === 0 && point.t <= currentTime) {
        ctx.save();
        const alpha = 0.6 * (point.t / currentTime);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw current position with AI glow effect
    const currentIdx = simulationData.trajectory.findIndex(p => p.t >= currentTime);
    const currentPoint = currentIdx >= 0 ? simulationData.trajectory[currentIdx] : 
                         simulationData.trajectory[simulationData.trajectory.length - 1];
    
    if (currentPoint) {
      const x = toScreenX(currentPoint.x);
      const y = toScreenY(currentPoint.y);
      
      // Pulsing glow effect
      const pulse = Math.sin(currentTime * 5) * 0.3 + 0.7;
      ctx.shadowColor = `rgba(236, 72, 153, ${pulse})`;
      ctx.shadowBlur = 20 * pulse;
      
      // Gradient sphere
      const objGradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, 14);
      objGradient.addColorStop(0, '#fecaca');
      objGradient.addColorStop(0.6, '#ef4444');
      objGradient.addColorStop(1, '#dc2626');
      ctx.fillStyle = objGradient;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Velocity vector
      if (showVelocityVector && (currentPoint.vx !== 0 || currentPoint.vy !== 0)) {
        const scale = 0.5;
        const vxScreen = currentPoint.vx * scaleX * scale;
        const vyScreen = -currentPoint.vy * scaleY * scale;
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vxScreen, y + vyScreen);
        ctx.stroke();
        
        const angle = Math.atan2(vyScreen, vxScreen);
        ctx.fillStyle = '#10b981';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x + vxScreen, y + vyScreen);
        ctx.lineTo(
          x + vxScreen - 10 * Math.cos(angle - Math.PI / 6),
          y + vyScreen - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x + vxScreen - 10 * Math.cos(angle + Math.PI / 6),
          y + vyScreen - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.fill();
        
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('v', x + vxScreen + 15, y + vyScreen);
      }
      
      // Acceleration vector
      if (showAccelerationVector && (currentPoint.ax !== 0 || currentPoint.ay !== 0)) {
        const scale = 1;
        const axScreen = currentPoint.ax * scaleX * scale;
        const ayScreen = -currentPoint.ay * scaleY * scale;
        
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + axScreen, y + ayScreen);
        ctx.stroke();
        
        const angle = Math.atan2(ayScreen, axScreen);
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(x + axScreen, y + ayScreen);
        ctx.lineTo(
          x + axScreen - 10 * Math.cos(angle - Math.PI / 6),
          y + ayScreen - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x + axScreen - 10 * Math.cos(angle + Math.PI / 6),
          y + ayScreen - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.fill();
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('a', x + axScreen + 15, y + ayScreen);
      }
      
      // AI-styled info box
      const boxGradient = ctx.createLinearGradient(x + 20, y - 60, x + 20, y - 5);
      boxGradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      boxGradient.addColorStop(1, 'rgba(240, 249, 255, 0.98)');
      ctx.fillStyle = boxGradient;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      const infoX = x + 20;
      const infoY = y - 60;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
      ctx.shadowBlur = 10;
      ctx.fillRect(infoX, infoY, 150, 55);
      ctx.strokeRect(infoX, infoY, 150, 55);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`⏱️ t = ${currentPoint.t.toFixed(2)} s`, infoX + 8, infoY + 18);
      ctx.fillText(`📍 x = ${currentPoint.x.toFixed(2)} m`, infoX + 8, infoY + 35);
      ctx.fillText(`📏 y = ${currentPoint.y.toFixed(2)} m`, infoX + 8, infoY + 52);
    }
    
    // AI-styled labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('X (m)', width - 60, height - 25);
    ctx.save();
    ctx.translate(25, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (m)', 0, 0);
    ctx.restore();
    
    // AI indicator badge
    if (backendStatus === 'online') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.fillRect(width - 100, 20, 80, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('🤖 AI Mode', width - 92, 38);
    }
    
  }, [simulationData, currentTime, showGrid, showTrail, showVelocityVector, showAccelerationVector, backendStatus]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with AI badge */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Brain className="h-8 w-8 text-purple-600 animate-pulse" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mô phỏng chuyển động vật lý với AI
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Rơi tự do, ném xiên, dao động - Powered by AI Analysis
        </p>
        
        {/* Backend Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'secondary'}
            className="flex items-center space-x-1"
          >
            {backendStatus === 'online' ? <Brain className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
            <span>
              {backendStatus === 'online' ? 'AI Backend Online' : 
               backendStatus === 'offline' ? 'Local Mode' : 'Checking...'}
            </span>
          </Badge>
        </div>
      </div>

      {/* Main Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card className="border-2 border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-purple-600" />
            <span>Simulation Controls</span>
          </CardTitle>
        </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="free-fall">
                  <Target className="h-4 w-4 mr-1" />
                  Rơi tự do
                </TabsTrigger>
                <TabsTrigger value="projectile">
                  <Zap className="h-4 w-4 mr-1" />
                  Ném xiên
                </TabsTrigger>
                <TabsTrigger value="harmonic">
                  <Activity className="h-4 w-4 mr-1" />
                  Dao động
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="free-fall" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Độ cao ban đầu (m): {freeFallParams.h0}</Label>
                    <Slider
                      value={[freeFallParams.h0]}
                      onValueChange={([value]) => setFreeFallParams(prev => ({ ...prev, h0: value }))}
                      min={10}
                      max={200}
                      step={5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vận tốc ban đầu (m/s): {freeFallParams.v0}</Label>
                    <Slider
                      value={[freeFallParams.v0]}
                      onValueChange={([value]) => setFreeFallParams(prev => ({ ...prev, v0: value }))}
                      min={-20}
                      max={20}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Gia tốc trọng trường (m/s²): {freeFallParams.g}</Label>
                    <Slider
                      value={[freeFallParams.g]}
                      onValueChange={([value]) => setFreeFallParams(prev => ({ ...prev, g: value }))}
                      min={1}
                      max={20}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="projectile" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Vận tốc ban đầu (m/s): {projectileParams.v0}</Label>
                    <Slider
                      value={[projectileParams.v0]}
                      onValueChange={([value]) => setProjectileParams(prev => ({ ...prev, v0: value }))}
                      min={5}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Góc ném (độ): {projectileParams.angle}</Label>
                    <Slider
                      value={[projectileParams.angle]}
                      onValueChange={([value]) => setProjectileParams(prev => ({ ...prev, angle: value }))}
                      min={0}
                      max={90}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Độ cao ban đầu (m): {projectileParams.h0}</Label>
                    <Slider
                      value={[projectileParams.h0]}
                      onValueChange={([value]) => setProjectileParams(prev => ({ ...prev, h0: value }))}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="harmonic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Biên độ (m): {harmonicParams.A.toFixed(2)}</Label>
                    <Slider
                      value={[harmonicParams.A]}
                      onValueChange={([value]) => setHarmonicParams(prev => ({ ...prev, A: value }))}
                      min={0.01}
                      max={0.5}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Tần số góc (rad/s): {harmonicParams.omega.toFixed(2)}</Label>
                    <Slider
                      value={[harmonicParams.omega]}
                      onValueChange={([value]) => setHarmonicParams(prev => ({ ...prev, omega: value }))}
                      min={1}
                      max={20}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Pha ban đầu (rad): {harmonicParams.phi.toFixed(2)}</Label>
                    <Slider
                      value={[harmonicParams.phi]}
                      onValueChange={([value]) => setHarmonicParams(prev => ({ ...prev, phi: value }))}
                      min={0}
                      max={2 * Math.PI}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
            <Button 
              onClick={runSimulation}
              disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                  <span className="ml-2">{backendStatus === 'online' ? 'AI Tính toán' : 'Tính toán'}</span>
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  onClick={startAnimation}
                  disabled={!simulationData || isAnimating}
                  variant="default"
                  size="sm"
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Chạy
                </Button>
                <Button 
                  onClick={pauseAnimation}
                  disabled={!isAnimating}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Tạm dừng
                </Button>
                <Button 
                  onClick={stopAnimation}
                  disabled={!simulationData}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
            </Button>
              </div>
              
              <div className="pt-2 border-t">
                <Label className="text-xs font-semibold mb-2 block">Tốc độ animation: {animationSpeed}x</Label>
                <Slider
                  value={[animationSpeed]}
                  onValueChange={([value]) => setAnimationSpeed(value)}
                  min={0.25}
                  max={3}
                  step={0.25}
                  className="mt-2"
                />
              </div>
          </div>
        </CardContent>
      </Card>

        {/* Visualization */}
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <span>AI Visualization</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showGrid} 
                    onCheckedChange={setShowGrid}
                    id="grid-toggle"
                  />
                  <Label htmlFor="grid-toggle" className="cursor-pointer flex items-center">
                    <Grid3x3 className="h-4 w-4 mr-1" />
                    Lưới
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showTrail} 
                    onCheckedChange={setShowTrail}
                    id="trail-toggle"
                  />
                  <Label htmlFor="trail-toggle" className="cursor-pointer">
                    Vết
                  </Label>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={450}
                className="border-2 border-purple-200 rounded-lg shadow-lg w-full"
              />
              
              {/* Vector Controls */}
              <div className="flex items-center justify-center space-x-6 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showVelocityVector} 
                    onCheckedChange={setShowVelocityVector}
                    id="velocity-toggle"
                  />
                  <Label htmlFor="velocity-toggle" className="cursor-pointer flex items-center">
                    <div className="w-4 h-1 bg-green-500 mr-2"></div>
                    Vector vận tốc (v)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showAccelerationVector} 
                    onCheckedChange={setShowAccelerationVector}
                    id="accel-toggle"
                  />
                  <Label htmlFor="accel-toggle" className="cursor-pointer flex items-center">
                    <div className="w-4 h-1 bg-amber-500 mr-2"></div>
                    Vector gia tốc (a)
                  </Label>
                </div>
              </div>
              
              {simulationData && (
                <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  {Object.entries(simulationData.results).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {key === 'time_to_ground' && '⏱️ Thời gian rơi:'}
                        {key === 'velocity_at_ground' && '🚀 Vận tốc cuối:'}
                        {key === 'max_height' && '📏 Cao cực đại:'}
                        {key === 'range' && '📐 Tầm xa:'}
                        {key === 'time_of_flight' && '⏱️ Thời gian bay:'}
                        {key === 'period' && '🔄 Chu kỳ:'}
                        {key === 'frequency' && '📊 Tần số:'}
                      </span>
                      <span className="text-purple-700 font-bold">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                        {key.includes('time') && key !== 'frequency' && ' s'}
                        {key.includes('velocity') && ' m/s'}
                        {key.includes('height') && ' m'}
                        {key.includes('range') && ' m'}
                        {key === 'frequency' && ' Hz'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          
              </CardContent>
        </Card>
      </div>

      {/* Real-time Graphs */}
      {simulationData && (
        <Card className="border-2 border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-purple-600" />
                <span>Đồ thị AI Analysis</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={graphType === 'position' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('position')}
                  className={graphType === 'position' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  Vị trí
                </Button>
                <Button
                  variant={graphType === 'velocity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('velocity')}
                  className={graphType === 'velocity' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  Vận tốc
                </Button>
                <Button
                  variant={graphType === 'acceleration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('acceleration')}
                  className={graphType === 'acceleration' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  Gia tốc
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GraphCanvas 
              data={simulationData.trajectory}
              currentTime={currentTime}
              graphType={graphType}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card with AI theming */}
      <Card className="border-2 border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Thông tin AI Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-3xl mb-2">📚</div>
              <h4 className="font-semibold text-blue-900">Cấp độ</h4>
              <p className="text-sm text-blue-700">{config.level}</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-3xl mb-2">⭐</div>
              <h4 className="font-semibold text-purple-900">Phần thưởng XP</h4>
              <p className="text-sm text-purple-700">+{config.xp} XP</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <div className="text-3xl mb-2">🔬</div>
              <h4 className="font-semibold text-pink-900">Danh mục</h4>
              <p className="text-sm text-pink-700">{config.category}</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-3xl mb-2">🤖</div>
              <h4 className="font-semibold text-green-900">AI Status</h4>
              <Badge variant={backendStatus === 'online' ? 'default' : 'secondary'} className="mt-1">
                {backendStatus === 'online' ? 'Active' : 'Local'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-purple-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Brain className="h-4 w-4 mr-2 text-purple-600" />
              AI-Powered Features
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>🎯 <strong>Smart Calculation</strong>: AI tính toán chính xác quỹ đạo</li>
              <li>🎨 <strong>Enhanced Visualization</strong>: Hiệu ứng AI gradient và glow</li>
              <li>📊 <strong>Real-time Analysis</strong>: Đồ thị và phân tích tức thì</li>
              <li>⚡ <strong>Smooth Animation</strong>: 60 FPS với hiệu ứng mượt mà</li>
              <li>🎮 <strong>Interactive Controls</strong>: Điều khiển linh hoạt tốc độ</li>
              <li>🔍 <strong>Vector Visualization</strong>: Xem vector vận tốc và gia tốc</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-600" />
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>Chọn loại chuyển động: <strong>Rơi tự do, Ném xiên, hoặc Dao động</strong></li>
              <li>Điều chỉnh các thông số bằng thanh trượt</li>
              <li>Nhấn <strong>&quot;AI Tính toán&quot;</strong> để xem quỹ đạo</li>
              <li>Sử dụng <strong>Play/Pause/Reset</strong> để điều khiển animation</li>
              <li>Bật/tắt lưới, vết, và vector để tùy chỉnh hiển thị</li>
              <li>Xem đồ thị phân tích vị trí, vận tốc, và gia tốc</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// AI-Enhanced Graph Canvas Component
function GraphCanvas({ 
  data, 
  currentTime, 
  graphType 
}: { 
  data: MotionState[], 
  currentTime: number, 
  graphType: 'position' | 'velocity' | 'acceleration' 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // AI gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fef3c7');
    bgGradient.addColorStop(0.5, '#fce7f3');
    bgGradient.addColorStop(1, '#ddd6fe');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 50;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Get data based on graph type
    let yDataX: number[] = [];
    let yDataY: number[] = [];
    let yLabelX = '';
    let yLabelY = '';
    
    if (graphType === 'position') {
      yDataX = data.map(p => p.x);
      yDataY = data.map(p => p.y);
      yLabelX = 'X (m)';
      yLabelY = 'Y (m)';
    } else if (graphType === 'velocity') {
      yDataX = data.map(p => p.vx);
      yDataY = data.map(p => p.vy);
      yLabelX = 'Vx (m/s)';
      yLabelY = 'Vy (m/s)';
    } else {
      yDataX = data.map(p => p.ax);
      yDataY = data.map(p => p.ay);
      yLabelX = 'Ax (m/s²)';
      yLabelY = 'Ay (m/s²)';
    }
    
    const tData = data.map(p => p.t);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    const minYX = Math.min(...yDataX);
    const maxYX = Math.max(...yDataX);
    const minYY = Math.min(...yDataY);
    const maxYY = Math.max(...yDataY);
    
    const rangeT = maxT - minT || 1;
    const rangeYX = maxYX - minYX || 1;
    const rangeYY = maxYY - minYY || 1;
    
    const scaleX = graphWidth / rangeT;
    const scaleYX = graphHeight / (rangeYX * 1.2);
    const scaleYY = graphHeight / (rangeYY * 1.2);
    
    const toScreenX = (t: number) => padding + (t - minT) * scaleX;
    const toScreenYX = (y: number) => height - padding - ((y - minYX) + rangeYX * 0.1) * scaleYX;
    const toScreenYY = (y: number) => height - padding - ((y - minYY) + rangeYY * 0.1) * scaleYY;
    
    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
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
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Draw X component with glow
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYX(yDataX[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw Y component with glow
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(236, 72, 153, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYY(yDataY[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw current time indicator
    const currentX = toScreenX(currentTime);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(currentX, padding);
    ctx.lineTo(currentX, height - padding);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw current points with pulse
    const currentIdx = data.findIndex(p => p.t >= currentTime);
    if (currentIdx >= 0) {
      const point = data[currentIdx];
      
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYX(yDataX[currentIdx]), 6, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYY(yDataY[currentIdx]), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Draw labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('⏱️ Thời gian (s)', width / 2 - 40, height - 10);
    
    // Legend with AI style
    const legendX = width - 180;
    const legendY = 15;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 10, legendY, 170, 50);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY, 170, 50);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(legendX, legendY + 10, 25, 4);
    ctx.fillStyle = '#1f2937';
    ctx.font = '12px Arial';
    ctx.fillText(yLabelX, legendX + 30, legendY + 15);
    
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(legendX, legendY + 30, 25, 4);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(yLabelY, legendX + 30, legendY + 35);
    
    // Time axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * rangeT;
      const x = toScreenX(t);
      ctx.fillText(t.toFixed(1), x - 10, height - padding + 20);
    }
    
    // Y axis labels
    ctx.fillStyle = '#3b82f6';
    for (let i = 0; i <= 5; i++) {
      const y = minYX + (i / 5) * rangeYX;
      const screenY = toScreenYX(y);
      ctx.fillText(y.toFixed(1), 5, screenY + 3);
    }
    
  }, [data, currentTime, graphType]);
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={300}
      className="border-2 border-purple-200 rounded-lg shadow-lg w-full"
    />
    </VisionThemeWrapper>
  );
}
