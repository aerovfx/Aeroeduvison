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
import { Settings, Play, RotateCcw, Activity, Loader2, Pause, LineChart, Zap, Target, Circle, ArrowRight, ArrowDown, ArrowUp, Eye, Sparkles } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface Object {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
}

interface Force {
  type: 'gravity' | 'friction' | 'spring' | 'applied';
  magnitude: number;
  direction: number; // in radians
  color: string;
}

interface HistoryPoint {
  time: number;
  position: number;
  velocity: number;
  netForce: number;
  gravityForce: number;
  frictionForce: number;
  appliedForce: number;
}

// Force Graph Canvas Component
function ForceGraphCanvas({ 
  data, 
  currentTime, 
  graphType,
  activeTab 
}: { 
  data: HistoryPoint[], 
  currentTime: number, 
  graphType: 'force' | 'velocity' | 'position',
  activeTab: 'friction' | 'gravity' | 'spring' | 'applied'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#eff6ff');
    bgGradient.addColorStop(0.5, '#e0e7ff');
    bgGradient.addColorStop(1, '#f3e8ff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 50;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Get data based on graph type
    let yData1: number[] = [];
    let yData2: number[] = [];
    let yLabel1 = '';
    let yLabel2 = '';
    let color1 = '#3b82f6';
    let color2 = '#ef4444';
    
    if (graphType === 'force') {
      yData1 = data.map(p => p.netForce);
      if (activeTab === 'gravity') {
        yData2 = data.map(p => p.gravityForce);
        yLabel1 = 'Tổng lực (N)';
        yLabel2 = 'Trọng lực (N)';
        color2 = '#ef4444';
      } else if (activeTab === 'friction') {
        yData2 = data.map(p => p.frictionForce);
        yLabel1 = 'Tổng lực (N)';
        yLabel2 = 'Lực ma sát (N)';
        color2 = '#f59e0b';
      } else if (activeTab === 'applied') {
        yData2 = data.map(p => p.appliedForce);
        yLabel1 = 'Tổng lực (N)';
        yLabel2 = 'Lực tác dụng (N)';
        color2 = '#8b5cf6';
      }
      color1 = '#3b82f6';
    } else if (graphType === 'velocity') {
      yData1 = data.map(p => p.velocity);
      yData2 = [];
      yLabel1 = 'Vận tốc (m/s)';
      color1 = '#10b981';
    } else if (graphType === 'position') {
      yData1 = data.map(p => p.position);
      yData2 = [];
      yLabel1 = 'Vị trí X (px)';
      color1 = '#f59e0b';
    }
    
    const tData = data.map(p => p.time);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    const minY1 = Math.min(...yData1);
    const maxY1 = Math.max(...yData1);
    const minY2 = yData2.length > 0 ? Math.min(...yData2) : 0;
    const maxY2 = yData2.length > 0 ? Math.max(...yData2) : 0;
    
    const rangeT = maxT - minT || 1;
    const rangeY1 = maxY1 - minY1 || 1;
    const rangeY2 = maxY2 - minY2 || 1;
    
    const scaleX = graphWidth / rangeT;
    const scaleY1 = graphHeight / (rangeY1 * 1.2);
    const scaleY2 = yData2.length > 0 ? graphHeight / (rangeY2 * 1.2) : 0;
    
    const toScreenX = (t: number) => padding + (t - minT) * scaleX;
    const toScreenY1 = (y: number) => height - padding - ((y - minY1) + rangeY1 * 0.1) * scaleY1;
    const toScreenY2 = (y: number) => height - padding - ((y - minY2) + rangeY2 * 0.1) * scaleY2;
    
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
    
    // Draw first line with glow
    ctx.strokeStyle = color1;
    ctx.lineWidth = 3;
    ctx.shadowColor = color1.replace(')', ', 0.5)').replace('#', 'rgba(').replace('#3b82f6', 'rgba(59, 130, 246, 0.5)').replace('#10b981', 'rgba(16, 185, 129, 0.5)').replace('#f59e0b', 'rgba(245, 158, 11, 0.5)');
    ctx.shadowBlur = 8;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.time);
      const y = toScreenY1(yData1[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw second line if exists
    if (yData2.length > 0) {
      ctx.strokeStyle = color2;
      ctx.lineWidth = 3;
      ctx.shadowColor = color2.replace(')', ', 0.5)').replace('#', 'rgba(').replace('#ef4444', 'rgba(239, 68, 68, 0.5)').replace('#f59e0b', 'rgba(245, 158, 11, 0.5)').replace('#8b5cf6', 'rgba(139, 92, 246, 0.5)');
      ctx.shadowBlur = 8;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = toScreenX(point.time);
        const y = toScreenY2(yData2[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    // Draw current time indicator
    const currentIdx = data.findIndex(p => p.time >= currentTime);
    if (currentIdx >= 0) {
      const currentX = toScreenX(data[currentIdx].time);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentX, padding);
      ctx.lineTo(currentX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Current point(s)
      ctx.shadowBlur = 10;
      ctx.shadowColor = color1.replace(')', ', 0.8)').replace('#', 'rgba(').replace('#3b82f6', 'rgba(59, 130, 246, 0.8)').replace('#10b981', 'rgba(16, 185, 129, 0.8)').replace('#f59e0b', 'rgba(245, 158, 11, 0.8)');
      ctx.fillStyle = color1;
      ctx.beginPath();
      ctx.arc(toScreenX(data[currentIdx].time), toScreenY1(yData1[currentIdx]), 6, 0, 2 * Math.PI);
      ctx.fill();
      
      if (yData2.length > 0) {
        ctx.shadowColor = color2.replace(')', ', 0.8)').replace('#', 'rgba(').replace('#ef4444', 'rgba(239, 68, 68, 0.8)').replace('#f59e0b', 'rgba(245, 158, 11, 0.8)').replace('#8b5cf6', 'rgba(139, 92, 246, 0.8)');
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(toScreenX(data[currentIdx].time), toScreenY2(yData2[currentIdx]), 6, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    
    // Labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('⏱️ Thời gian (s)', width / 2 - 40, height - 10);
    
    // Y-axis label
    let yAxisLabel = '';
    if (graphType === 'force') {
      yAxisLabel = '⚡ Lực (N)';
    } else if (graphType === 'velocity') {
      yAxisLabel = '🚀 Vận tốc (m/s)';
    } else if (graphType === 'position') {
      yAxisLabel = '📍 Vị trí (px)';
    }
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
    
    // Legend
    const legendX = width - 220;
    const legendY = 15;
    const legendHeight = yData2.length > 0 ? 50 : 30;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX - 10, legendY, 210, legendHeight);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY, 210, legendHeight);
    
    ctx.fillStyle = color1;
    ctx.fillRect(legendX, legendY + 10, 25, 4);
    ctx.fillStyle = '#1f2937';
    ctx.font = '11px Arial';
    ctx.fillText(yLabel1, legendX + 30, legendY + 14);
    
    if (yData2.length > 0) {
      ctx.fillStyle = color2;
      ctx.fillRect(legendX, legendY + 30, 25, 4);
      ctx.fillStyle = '#1f2937';
      ctx.fillText(yLabel2, legendX + 30, legendY + 34);
    }
    
  }, [data, currentTime, graphType, activeTab]);
  
  return (

  
    <VisionThemeWrapper title="Mechaforce" subtitle="Hệ thống học tập thông minh">
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full"
    />
  );
}

export default function MechaForcePage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'friction' | 'spring' | 'gravity' | 'applied'>('friction');
  const [graphType, setGraphType] = useState<'force' | 'velocity' | 'position'>('force');
  const [showVectors, setShowVectors] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState([1]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [object, setObject] = useState<Object>({
    x: 100,
    y: 200,
    vx: 0,
    vy: 0,
    mass: 2,
    radius: 20,
    color: '#3b82f6'
  });
  
  const [forces, setForces] = useState<Force[]>([]);
  const [graphHistory, setGraphHistory] = useState<HistoryPoint[]>([]);
  const [trail, setTrail] = useState<{x: number, y: number, alpha: number}[]>([]);
  
  // Force parameters
  const [frictionParams, setFrictionParams] = useState({
    coefficient: 0.1,
    normalForce: 19.6 // mg
  });
  
  const [gravityParams, setGravityParams] = useState({
    strength: 9.8,
    direction: Math.PI / 2 // downward
  });
  
  const [springParams, setSpringParams] = useState({
    stiffness: 50,
    equilibriumX: 100,
    equilibriumY: 200
  });
  
  const [appliedParams, setAppliedParams] = useState({
    magnitude: 20,
    direction: 0, // rightward
    duration: 2
  });
  
  // Lab configuration
  const config = {
    name: "MechaForce",
    title: "Mô phỏng lực cơ học",
    description: "Phân tích lực, mômen, chuyển động cơ học",
    category: "Cơ học",
    level: "Trung bình",
    xp: 180,
    port: 8004
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
        const response = await fetch(`http://localhost:8004/api/health`, {
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

  // Calculate forces based on active tab
  const calculateForces = (obj: Object): Force[] => {
    const newForces: Force[] = [];
    
    if (activeTab === 'gravity') {
      newForces.push({
        type: 'gravity',
        magnitude: gravityParams.strength * obj.mass,
        direction: gravityParams.direction,
        color: '#ef4444'
      });
    }
    
    if (activeTab === 'friction') {
      const frictionForce = frictionParams.coefficient * frictionParams.normalForce;
      newForces.push({
        type: 'friction',
        magnitude: frictionForce,
        direction: Math.atan2(obj.vy, obj.vx) + Math.PI, // opposite to velocity
        color: '#f59e0b'
      });
    }
    
    if (activeTab === 'spring') {
      const dx = obj.x - springParams.equilibriumX;
      const dy = obj.y - springParams.equilibriumY;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      const springForce = springParams.stiffness * displacement;
      newForces.push({
        type: 'spring',
        magnitude: springForce,
        direction: Math.atan2(-dy, -dx), // toward equilibrium
        color: '#10b981'
      });
    }
    
    if (activeTab === 'applied') {
      newForces.push({
        type: 'applied',
        magnitude: appliedParams.magnitude,
        direction: appliedParams.direction,
        color: '#8b5cf6'
      });
    }
    
    return newForces;
  };

  const startAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setCurrentTime(0);
    setGraphHistory([]);
    setTrail([]);
    lastTimeRef.current = performance.now();
    
    let animationObject = { ...object };
    const history: HistoryPoint[] = [];
    const animationTrail: {x: number, y: number, alpha: number}[] = [];
    
    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033) * animationSpeed[0];
      lastTimeRef.current = timestamp;
      
      // Calculate forces
      const currentForces = calculateForces(animationObject);
      setForces(currentForces);
      
      // Calculate net force
      let netForceX = 0;
      let netForceY = 0;
      
      currentForces.forEach(force => {
        netForceX += force.magnitude * Math.cos(force.direction);
        netForceY += force.magnitude * Math.sin(force.direction);
      });
      
      // Apply forces (F = ma)
      const accelerationX = netForceX / animationObject.mass;
      const accelerationY = netForceY / animationObject.mass;
      
      // Update velocity and position
      animationObject.vx += accelerationX * deltaTime;
      animationObject.vy += accelerationY * deltaTime;
      animationObject.x += animationObject.vx * deltaTime;
      animationObject.y += animationObject.vy * deltaTime;
      
      // Boundary conditions
      const canvas = canvasRef.current;
      if (canvas) {
        if (animationObject.x < animationObject.radius) {
          animationObject.x = animationObject.radius;
          animationObject.vx = -animationObject.vx * 0.8;
        }
        if (animationObject.x > canvas.width - animationObject.radius) {
          animationObject.x = canvas.width - animationObject.radius;
          animationObject.vx = -animationObject.vx * 0.8;
        }
        if (animationObject.y < animationObject.radius) {
          animationObject.y = animationObject.radius;
          animationObject.vy = -animationObject.vy * 0.8;
        }
        if (animationObject.y > canvas.height - animationObject.radius) {
          animationObject.y = canvas.height - animationObject.radius;
          animationObject.vy = -animationObject.vy * 0.8;
        }
      }
      
      // Record history
      const newTime = currentTime + deltaTime;
      history.push({
        time: newTime,
        position: animationObject.x,
        velocity: Math.sqrt(animationObject.vx ** 2 + animationObject.vy ** 2),
        netForce: Math.sqrt(netForceX ** 2 + netForceY ** 2),
        gravityForce: activeTab === 'gravity' ? currentForces.find(f => f.type === 'gravity')?.magnitude || 0 : 0,
        frictionForce: activeTab === 'friction' ? currentForces.find(f => f.type === 'friction')?.magnitude || 0 : 0,
        appliedForce: activeTab === 'applied' ? currentForces.find(f => f.type === 'applied')?.magnitude || 0 : 0
      });
      
      // Limit history size
      if (history.length > 500) {
        history.shift();
      }
      
      // Add trail point
      if (showTrail && Math.random() < 0.3) {
        animationTrail.push({ x: animationObject.x, y: animationObject.y, alpha: 1 });
        if (animationTrail.length > 100) {
          animationTrail.shift();
        }
        animationTrail.forEach((point, i) => {
          point.alpha = i / animationTrail.length;
        });
      }
      
      // Update state
      setObject({ ...animationObject });
      setGraphHistory([...history]);
      setTrail([...animationTrail]);
      setCurrentTime(newTime);
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    setIsAnimating(false);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    setIsAnimating(false);
    setCurrentTime(0);
    setGraphHistory([]);
    setTrail([]);
    setObject({
      x: 100,
      y: 200,
      vx: 0,
      vy: 0,
      mass: 2,
      radius: 20,
      color: '#3b82f6'
    });
  };

  // Canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i <= canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
      
      // Draw trail
      if (showTrail && trail.length > 1) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        trail.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      }
      
      // Draw forces
      if (showVectors) {
        forces.forEach(force => {
          const startX = object.x;
          const startY = object.y;
          const endX = startX + force.magnitude * Math.cos(force.direction) * 5;
          const endY = startY + force.magnitude * Math.sin(force.direction) * 5;
          
          // Draw force vector
          ctx.strokeStyle = force.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Draw arrowhead
          const angle = Math.atan2(endY - startY, endX - startX);
          const arrowLength = 10;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          
          // Draw force label
          ctx.fillStyle = force.color;
          ctx.font = '12px Arial';
          ctx.fillText(
            `${force.type}: ${force.magnitude.toFixed(1)}N`,
            endX + 5,
            endY - 5
          );
        });
      }
      
      // Draw object
      ctx.fillStyle = object.color;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(object.x, object.y, object.radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw object outline
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw mass label
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${object.mass}kg`, object.x, object.y + 5);
      ctx.textAlign = 'left';
    };
    
    render();
  }, [object, forces, showVectors, showTrail, trail]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Mô phỏng lực cơ học</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          Phân tích lực, mômen, chuyển động cơ học
        </p>
        
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
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            <Settings className="h-3 w-3 mr-1" />
            <span>Level: {config.level}</span>
          </Badge>
          <Badge variant="outline" className="text-green-600 border-green-200">
            <Zap className="h-3 w-3 mr-1" />
            <span>+{config.xp} XP</span>
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Force Type Selection */}
          <Card className="border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Loại Lực</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                  <TabsTrigger value="friction">Ma sát</TabsTrigger>
                  <TabsTrigger value="gravity">Trọng lực</TabsTrigger>
                  <TabsTrigger value="spring">Lò xo</TabsTrigger>
                  <TabsTrigger value="applied">Lực tác dụng</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Parameters */}
          <div className="space-y-6">
        {/* Force Parameters */}
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>Thông số Lực</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === 'friction' && (
              <>
                <div className="space-y-2">
                  <Label>Hệ số ma sát: {frictionParams.coefficient}</Label>
                  <Slider
                    value={[frictionParams.coefficient]}
                    onValueChange={([value]) => setFrictionParams(prev => ({ ...prev, coefficient: value }))}
                    max={1}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phản lực pháp tuyến: {frictionParams.normalForce} N</Label>
                  <Slider
                    value={[frictionParams.normalForce]}
                    onValueChange={([value]) => setFrictionParams(prev => ({ ...prev, normalForce: value }))}
                    max={50}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
            
            {activeTab === 'gravity' && (
              <>
                <div className="space-y-2">
                  <Label>Gia tốc trọng trường: {gravityParams.strength} m/s²</Label>
                  <Slider
                    value={[gravityParams.strength]}
                    onValueChange={([value]) => setGravityParams(prev => ({ ...prev, strength: value }))}
                    max={20}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hướng: {Math.round(gravityParams.direction * 180 / Math.PI)}°</Label>
                  <Slider
                    value={[gravityParams.direction]}
                    onValueChange={([value]) => setGravityParams(prev => ({ ...prev, direction: value }))}
                    max={2 * Math.PI}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
            
            {activeTab === 'spring' && (
              <>
                <div className="space-y-2">
                  <Label>Độ cứng lò xo: {springParams.stiffness} N/m</Label>
                  <Slider
                    value={[springParams.stiffness]}
                    onValueChange={([value]) => setSpringParams(prev => ({ ...prev, stiffness: value }))}
                    max={200}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vị trí cân bằng X: {springParams.equilibriumX}</Label>
                  <Slider
                    value={[springParams.equilibriumX]}
                    onValueChange={([value]) => setSpringParams(prev => ({ ...prev, equilibriumX: value }))}
                    max={400}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vị trí cân bằng Y: {springParams.equilibriumY}</Label>
                  <Slider
                    value={[springParams.equilibriumY]}
                    onValueChange={([value]) => setSpringParams(prev => ({ ...prev, equilibriumY: value }))}
                    max={400}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </>
            )}
            
            {activeTab === 'applied' && (
              <>
                <div className="space-y-2">
                  <Label>Độ lớn lực: {appliedParams.magnitude} N</Label>
                  <Slider
                    value={[appliedParams.magnitude]}
                    onValueChange={([value]) => setAppliedParams(prev => ({ ...prev, magnitude: value }))}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hướng: {Math.round(appliedParams.direction * 180 / Math.PI)}°</Label>
                  <Slider
                    value={[appliedParams.direction]}
                    onValueChange={([value]) => setAppliedParams(prev => ({ ...prev, direction: value }))}
                    max={2 * Math.PI}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Object Properties */}
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Circle className="h-5 w-5 text-blue-600" />
              <span>Thuộc tính Vật thể</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Khối lượng: {object.mass} kg</Label>
              <Slider
                value={[object.mass]}
                onValueChange={([value]) => setObject(prev => ({ ...prev, mass: value }))}
                max={10}
                min={0.1}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Bán kính: {object.radius} px</Label>
              <Slider
                value={[object.radius]}
                onValueChange={([value]) => setObject(prev => ({ ...prev, radius: value }))}
                max={50}
                min={5}
                step={1}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
          </div>
        </div>

        {/* Right Column - Canvas & Visualization */}
        <div className="space-y-6">
          {/* Visualization Options */}
          <Card className="border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-blue-600" />
                <span>Tùy chọn hiển thị</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vectors"
                    checked={showVectors}
                    onCheckedChange={setShowVectors}
                  />
                  <Label htmlFor="vectors" className="text-sm">Vector lực</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="trail"
                    checked={showTrail}
                    onCheckedChange={setShowTrail}
                  />
                  <Label htmlFor="trail" className="text-sm">Đường đi</Label>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm">Tốc độ: {animationSpeed[0]}x</Label>
                  <Slider
                    value={animationSpeed}
                    onValueChange={setAnimationSpeed}
                    max={3}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Canvas */}
          <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Mô phỏng Lực cơ học</span>
            </div>
            <div className="flex space-x-2">
              {!isAnimating ? (
                <Button onClick={startAnimation} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu
                </Button>
              ) : (
                <Button onClick={pauseAnimation} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Tạm dừng
                </Button>
              )}
              <Button onClick={stopAnimation} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="border-2 border-blue-200 rounded-lg shadow-lg w-full bg-gradient-to-br from-blue-50 to-purple-50"
            />
            {/* Real-time Info */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
              <div className="text-sm space-y-1">
                <div className="flex items-center space-x-2">
                  <Circle className="h-3 w-3 text-blue-600" />
                  <span>Vị trí: ({object.x.toFixed(0)}, {object.y.toFixed(0)})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowRight className="h-3 w-3 text-green-600" />
                  <span>Vận tốc: {(Math.sqrt(object.vx**2 + object.vy**2)).toFixed(2)} m/s</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-red-600" />
                  <span>Lực tổng: {forces.reduce((sum, f) => sum + f.magnitude, 0).toFixed(2)} N</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-3 w-3 text-purple-600" />
                  <span>Thời gian: {currentTime.toFixed(2)}s</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Graphs */}
      {graphHistory.length > 1 && (
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-blue-600" />
                <span>Đồ thị Phân tích Lực - Real-time</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={graphType === 'force' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('force')}
                  className={graphType === 'force' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  ⚡ Lực
                </Button>
                <Button
                  variant={graphType === 'velocity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('velocity')}
                  className={graphType === 'velocity' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  🚀 Vận tốc
                </Button>
                <Button
                  variant={graphType === 'position' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('position')}
                  className={graphType === 'position' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
                >
                  📍 Vị trí
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Debug info */}
            <div className="mb-2 text-xs text-gray-500">
              Data points: {graphHistory.length} | Current time: {currentTime.toFixed(2)}s
              {graphHistory.length > 0 && (
                <span className="ml-4">
                  | Net Force: {graphHistory[graphHistory.length-1]?.netForce?.toFixed(2)}N
                  | Velocity: {graphHistory[graphHistory.length-1]?.velocity?.toFixed(2)}m/s
                </span>
              )}
            </div>
            <ForceGraphCanvas 
              data={graphHistory}
              currentTime={currentTime}
              graphType={graphType}
              activeTab={activeTab}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Thông tin Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-blue-600" />
                  Các loại lực
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li><strong>Ma sát</strong>: Lực cản chuyển động, ngược hướng vận tốc</li>
                  <li><strong>Trọng lực</strong>: Lực hút xuống dưới, F = mg</li>
                  <li><strong>Lò xo</strong>: Lực hồi phục, F = -kx (về vị trí cân bằng)</li>
                  <li><strong>Lực tác dụng</strong>: Ngoại lực với độ lớn và hướng cố định</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-600" />
                  Định luật Newton
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li><strong>Định luật II</strong>: F = ma (Lực = khối lượng × gia tốc)</li>
                  <li><strong>Vector tổng</strong>: ΣF = F₁ + F₂ + F₃ + ...</li>
                  <li><strong>Gia tốc</strong>: a = ΣF / m</li>
                  <li><strong>Chuyển động</strong>: x = x₀ + v₀t + ½at²</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-purple-600" />
                  Cách sử dụng
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Chọn loại lực từ 4 tab</li>
                  <li>Điều chỉnh thông số bằng sliders</li>
                  <li>Nhấn <strong>&quot;Bắt đầu&quot;</strong> để chạy mô phỏng</li>
                  <li>Quan sát vector lực và chuyển động</li>
                  <li>Xem đồ thị real-time tracking</li>
                  <li>Thay đổi tốc độ và tùy chọn hiển thị</li>
                </ul>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-yellow-600" />
                  Hướng dẫn sử dụng
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Thử nghiệm với các loại lực khác nhau</li>
                  <li>Quan sát vector lực (mũi tên có màu)</li>
                  <li>Xem đồ thị Force vs Time</li>
                  <li>Phân tích Velocity và Position</li>
                  <li>Hiểu mối quan hệ F = ma</li>
                </ul>
              </div>
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
