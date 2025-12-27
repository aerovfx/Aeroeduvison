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
import { Activity, Play, Pause, RotateCcw, Loader2, Settings, Eye, LineChart, Grid3x3, Zap, Sparkles, Target, Circle } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  id: number;
}

interface CollisionEvent {
  time: number;
  ball1: number;
  ball2: number;
  velocityBefore1: { vx: number; vy: number };
  velocityBefore2: { vx: number; vy: number };
  velocityAfter1: { vx: number; vy: number };
  velocityAfter2: { vx: number; vy: number };
  momentumBefore: number;
  momentumAfter: number;
  kineticEnergyBefore: number;
  kineticEnergyAfter: number;
}

interface SimulationData {
  balls: Ball[];
  collisions: CollisionEvent[];
  totalMomentum: { x: number; y: number };
  totalKineticEnergy: number;
}

interface HistoryPoint {
  time: number;
  totalMomentum: number;
  ball1Momentum: number;
  ball2Momentum: number;
  ball1Velocity: number;
  ball2Velocity: number;
  interactionForce: number;
}

export default function MomentumCollisionPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [activeTab, setActiveTab] = useState('elastic');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Visualization options
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showMomentumVector, setShowMomentumVector] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphType, setGraphType] = useState<'momentum' | 'energy' | 'velocity'>('momentum');
  
  // Collision parameters
  const [elasticParams, setElasticParams] = useState({
    mass1: 1.0,
    mass2: 1.0,
    v1: 5.0,
    v2: -3.0,
    restitution: 1.0
  });
  
  const [inelasticParams, setInelasticParams] = useState({
    mass1: 2.0,
    mass2: 1.5,
    v1: 4.0,
    v2: -2.0,
    restitution: 0.5
  });
  
  const [explosionParams, setExplosionParams] = useState({
    totalMass: 3.0,
    explosionEnergy: 50.0,
    angle: 45
  });

  // Lab configuration
  const config = {
    name: "Momentum Collision",
    title: "Động lượng và va chạm",
    description: "Va chạm đàn hồi, không đàn hồi, nổ",
    category: "Cơ học",
    level: "Nâng cao",
    xp: 250,
    port: 8015
  };

  const [collisionHistory, setCollisionHistory] = useState<CollisionEvent[]>([]);
  const [trails, setTrails] = useState<{ [key: number]: { x: number; y: number; alpha: number }[] }>({});
  const [graphHistory, setGraphHistory] = useState<HistoryPoint[]>([]);

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    // Backend check disabled - use offline mode by default
    const ENABLE_BACKEND_CHECK = false;
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline');
      return;
    }

    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8015/api/health`, {
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
  const calculateElasticCollision = (
    m1: number, m2: number, v1: number, v2: number, e: number
  ): SimulationData => {
    const v1f = ((m1 - e * m2) * v1 + m2 * (1 + e) * v2) / (m1 + m2);
    const v2f = ((m2 - e * m1) * v2 + m1 * (1 + e) * v1) / (m1 + m2);
    
    const ball1: Ball = {
      x: 2,
      y: 5,
      vx: v1,
      vy: 0,
      radius: 0.3 + m1 * 0.15,
      mass: m1,
      color: '#3b82f6',
      id: 1
    };
    
    const ball2: Ball = {
      x: 8,
      y: 5,
      vx: v2,
      vy: 0,
      radius: 0.3 + m2 * 0.15,
      mass: m2,
      color: '#ef4444',
      id: 2
    };
    
    const momentumBefore = m1 * v1 + m2 * v2;
    const momentumAfter = m1 * v1f + m2 * v2f;
    const keBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
    const keAfter = 0.5 * m1 * v1f * v1f + 0.5 * m2 * v2f * v2f;
    
    return {
      balls: [ball1, ball2],
      collisions: [],
      totalMomentum: { x: momentumBefore, y: 0 },
      totalKineticEnergy: keBefore
    };
  };

  const calculateInelasticCollision = (
    m1: number, m2: number, v1: number, v2: number, e: number
  ): SimulationData => {
    return calculateElasticCollision(m1, m2, v1, v2, e);
  };

  const calculateExplosion = (
    totalMass: number, energy: number, angle: number
  ): SimulationData => {
    const angleRad = (angle * Math.PI) / 180;
    const m1 = totalMass * 0.6;
    const m2 = totalMass * 0.4;
    
    const totalV = Math.sqrt(2 * energy / (m1 + m2));
    const v1 = (m2 / (m1 + m2)) * totalV;
    const v2 = -(m1 / (m1 + m2)) * totalV;
    
    const ball1: Ball = {
      x: 5,
      y: 5,
      vx: v1 * Math.cos(angleRad),
      vy: v1 * Math.sin(angleRad),
      radius: 0.3 + m1 * 0.1,
      mass: m1,
      color: '#8b5cf6',
      id: 1
    };
    
    const ball2: Ball = {
      x: 5,
      y: 5,
      vx: v2 * Math.cos(angleRad),
      vy: v2 * Math.sin(angleRad),
      radius: 0.3 + m2 * 0.1,
      mass: m2,
      color: '#ec4899',
      id: 2
    };
    
    return {
      balls: [ball1, ball2],
      collisions: [],
      totalMomentum: { x: 0, y: 0 },
      totalKineticEnergy: energy
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      let data: SimulationData;
      
      if (activeTab === 'elastic') {
        data = calculateElasticCollision(
          elasticParams.mass1,
          elasticParams.mass2,
          elasticParams.v1,
          elasticParams.v2,
          elasticParams.restitution
        );
      } else if (activeTab === 'inelastic') {
        data = calculateInelasticCollision(
          inelasticParams.mass1,
          inelasticParams.mass2,
          inelasticParams.v1,
          inelasticParams.v2,
          inelasticParams.restitution
        );
      } else {
        data = calculateExplosion(
          explosionParams.totalMass,
          explosionParams.explosionEnergy,
          explosionParams.angle
        );
      }
      
      setSimulationData(data);
      setCollisionHistory([]);
      setTrails({});
      setGraphHistory([]);
      
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const checkCollision = (ball1: Ball, ball2: Ball): boolean => {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (ball1.radius + ball2.radius);
  };

  const resolveCollision = (ball1: Ball, ball2: Ball, e: number) => {
    const dx = ball2.x - ball1.x;
    const dy = ball2.y - ball1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    
    const dvx = ball2.vx - ball1.vx;
    const dvy = ball2.vy - ball1.vy;
    const dvn = dvx * nx + dvy * ny;
    
    if (dvn >= 0) return;
    
    const impulse = (-(1 + e) * dvn) / (1 / ball1.mass + 1 / ball2.mass);
    
    ball1.vx -= (impulse / ball1.mass) * nx;
    ball1.vy -= (impulse / ball1.mass) * ny;
    ball2.vx += (impulse / ball2.mass) * nx;
    ball2.vy += (impulse / ball2.mass) * ny;
  };

  const startAnimation = () => {
    if (!simulationData) return;
    
    setIsAnimating(true);
    setCurrentTime(0);
    lastTimeRef.current = performance.now();
    
    // Create mutable copy of balls
    let animationBalls = JSON.parse(JSON.stringify(simulationData.balls));
    const animationTrails: { [key: number]: { x: number; y: number; alpha: number }[] } = {};
    const history: HistoryPoint[] = [];
    animationBalls.forEach((ball: Ball) => {
      animationTrails[ball.id] = [];
    });
    
    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033) * animationSpeed;
      lastTimeRef.current = timestamp;
      
      // Update positions
      animationBalls.forEach((ball: Ball) => {
        ball.x += ball.vx * deltaTime;
        ball.y += ball.vy * deltaTime;
        
        // Wall collisions
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.95;
        }
        if (ball.x + ball.radius > 10) {
          ball.x = 10 - ball.radius;
          ball.vx = -ball.vx * 0.95;
        }
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = -ball.vy * 0.95;
        }
        if (ball.y + ball.radius > 10) {
          ball.y = 10 - ball.radius;
          ball.vy = -ball.vy * 0.95;
        }
        
        // Add trail
        if (showTrail && Math.random() < 0.3) {
          animationTrails[ball.id].push({ x: ball.x, y: ball.y, alpha: 1 });
          if (animationTrails[ball.id].length > 50) {
            animationTrails[ball.id].shift();
          }
          animationTrails[ball.id].forEach((point, i) => {
            point.alpha = i / animationTrails[ball.id].length;
          });
        }
      });
      
      // Ball-to-ball collisions
      for (let i = 0; i < animationBalls.length; i++) {
        for (let j = i + 1; j < animationBalls.length; j++) {
          if (checkCollision(animationBalls[i], animationBalls[j])) {
            const e = activeTab === 'elastic' ? elasticParams.restitution :
                      activeTab === 'inelastic' ? inelasticParams.restitution : 1.0;
            resolveCollision(animationBalls[i], animationBalls[j], e);
            
            // Separate balls to prevent overlap
            const dx = animationBalls[j].x - animationBalls[i].x;
            const dy = animationBalls[j].y - animationBalls[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const overlap = (animationBalls[i].radius + animationBalls[j].radius) - distance;
            
            if (overlap > 0) {
              const nx = dx / distance;
              const ny = dy / distance;
              animationBalls[i].x -= nx * overlap * 0.5;
              animationBalls[i].y -= ny * overlap * 0.5;
              animationBalls[j].x += nx * overlap * 0.5;
              animationBalls[j].y += ny * overlap * 0.5;
            }
          }
        }
      }
      
      // Calculate total momentum
      const momentumX = animationBalls.reduce((sum, ball) => sum + ball.mass * ball.vx, 0);
      const momentumY = animationBalls.reduce((sum, ball) => sum + ball.mass * ball.vy, 0);
      const totalMomentum = Math.sqrt(momentumX * momentumX + momentumY * momentumY);
      
      // Calculate individual ball momentums (magnitude)
      const ball1Momentum = animationBalls.length > 0 ? 
        Math.sqrt((animationBalls[0].mass * animationBalls[0].vx) ** 2 + (animationBalls[0].mass * animationBalls[0].vy) ** 2) : 0;
      const ball2Momentum = animationBalls.length > 1 ? 
        Math.sqrt((animationBalls[1].mass * animationBalls[1].vx) ** 2 + (animationBalls[1].mass * animationBalls[1].vy) ** 2) : 0;
      
      // Calculate velocities (magnitude)
      const ball1Velocity = animationBalls.length > 0 ? 
        Math.sqrt(animationBalls[0].vx ** 2 + animationBalls[0].vy ** 2) : 0;
      const ball2Velocity = animationBalls.length > 1 ? 
        Math.sqrt(animationBalls[1].vx ** 2 + animationBalls[1].vy ** 2) : 0;
      
      // Calculate interaction force (simplified - based on collision detection)
      let interactionForce = 0;
      if (animationBalls.length >= 2) {
        const dx = animationBalls[1].x - animationBalls[0].x;
        const dy = animationBalls[1].y - animationBalls[0].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = animationBalls[0].radius + animationBalls[1].radius;
        
        if (distance < minDistance * 1.1) { // Within collision range
          interactionForce = Math.max(0, (minDistance - distance) * 100); // Simplified force calculation
        }
      }
      
      // Record history
      const newTime = currentTime + deltaTime;
      history.push({
        time: newTime,
        totalMomentum,
        ball1Momentum,
        ball2Momentum,
        ball1Velocity,
        ball2Velocity,
        interactionForce
      });
      
      // Limit history size
      if (history.length > 500) {
        history.shift();
      }
      
      // Update state
      setSimulationData(prev => prev ? { ...prev, balls: [...animationBalls] } : null);
      setTrails({ ...animationTrails });
      setGraphHistory([...history]);
      setCurrentTime(newTime);
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const pauseAnimation = () => {
    setIsAnimating(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  };
  
  const stopAnimation = () => {
    setIsAnimating(false);
    setCurrentTime(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    // Reset to initial state
    if (simulationData) {
      runSimulation();
    }
  };

  // Stop animation when isAnimating changes to false
  useEffect(() => {
    if (!isAnimating && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, [isAnimating]);

  // Enhanced Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const scale = Math.min(width, height) / 10;
    
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#fef3c7');
    gradient.addColorStop(0.5, '#fce7f3');
    gradient.addColorStop(1, '#e0e7ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * scale, 0);
        ctx.lineTo(i * scale, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * scale);
        ctx.lineTo(width, i * scale);
        ctx.stroke();
      }
    }
    
    // Draw border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, width, height);
    
    // Draw trails
    if (showTrail) {
      simulationData.balls.forEach((ball) => {
        const trail = trails[ball.id] || [];
        trail.forEach((point, i) => {
          ctx.fillStyle = hexToRgba(ball.color, point.alpha * 0.5);
          ctx.beginPath();
          ctx.arc(point.x * scale, point.y * scale, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }
    
    // Draw balls
    simulationData.balls.forEach((ball) => {
      const x = ball.x * scale;
      const y = ball.y * scale;
      const r = ball.radius * scale;
      
      // Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      
      // Ball gradient
      const ballGradient = ctx.createRadialGradient(x - r/3, y - r/3, 0, x, y, r);
      ballGradient.addColorStop(0, hexToRgba(ball.color, 0.3));
      ballGradient.addColorStop(0.7, ball.color);
      ballGradient.addColorStop(1, hexToRgba(ball.color, 0.8));
      
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Ball outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Mass label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${ball.mass.toFixed(1)}kg`, x, y);
      
      // Velocity vector
      if (showVelocityVector) {
        const vScale = 0.5;
        const vx = ball.vx * scale * vScale;
        const vy = ball.vy * scale * vScale;
        
        if (Math.abs(vx) > 1 || Math.abs(vy) > 1) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + vx, y + vy);
          ctx.stroke();
          
          const angle = Math.atan2(vy, vx);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(x + vx, y + vy);
          ctx.lineTo(
            x + vx - 10 * Math.cos(angle - Math.PI / 6),
            y + vy - 10 * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x + vx - 10 * Math.cos(angle + Math.PI / 6),
            y + vy - 10 * Math.sin(angle + Math.PI / 6)
          );
          ctx.fill();
          
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 11px Arial';
          ctx.fillText('v', x + vx + 15, y + vy - 5);
        }
      }
      
      // Momentum vector
      if (showMomentumVector) {
        const pScale = 0.3;
        const px = ball.vx * ball.mass * scale * pScale;
        const py = ball.vy * ball.mass * scale * pScale;
        
        if (Math.abs(px) > 1 || Math.abs(py) > 1) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + px, y + py);
          ctx.stroke();
          
          const angle = Math.atan2(py, px);
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(x + px, y + py);
          ctx.lineTo(
            x + px - 10 * Math.cos(angle - Math.PI / 6),
            y + py - 10 * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x + px - 10 * Math.cos(angle + Math.PI / 6),
            y + py - 10 * Math.sin(angle + Math.PI / 6)
          );
          ctx.fill();
          
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 11px Arial';
          ctx.fillText('p', x + px + 15, y + py - 5);
        }
      }
    });
    
    // Draw info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(10, 10, 200, 90);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 90);
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱️ Time: ${currentTime.toFixed(2)} s`, 20, 30);
    
    const totalP = simulationData.balls.reduce((sum, ball) => 
      sum + Math.sqrt(Math.pow(ball.vx * ball.mass, 2) + Math.pow(ball.vy * ball.mass, 2)), 0
    );
    const totalKE = simulationData.balls.reduce((sum, ball) => 
      sum + 0.5 * ball.mass * (ball.vx * ball.vx + ball.vy * ball.vy), 0
    );
    
    ctx.fillText(`💫 Momentum: ${totalP.toFixed(2)} kg⋅m/s`, 20, 50);
    ctx.fillText(`⚡ Energy: ${totalKE.toFixed(2)} J`, 20, 70);
    ctx.fillText(`🎯 Collisions: ${collisionHistory.length}`, 20, 90);
    
  }, [simulationData, showGrid, showTrail, showVelocityVector, showMomentumVector, currentTime, trails, collisionHistory]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Sparkles className="h-8 w-8 text-orange-600 animate-pulse" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Động lượng và Va chạm
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Va chạm đàn hồi, không đàn hồi, và nổ
        </p>
        
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card className="border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-orange-600" />
              <span>Collision Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="elastic">
                  <Circle className="h-4 w-4 mr-1" />
                  Đàn hồi
                </TabsTrigger>
                <TabsTrigger value="inelastic">
                  <Target className="h-4 w-4 mr-1" />
                  Không đàn hồi
                </TabsTrigger>
                <TabsTrigger value="explosion">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Nổ
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="elastic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Khối lượng vật 1 (kg): {elasticParams.mass1.toFixed(1)}</Label>
                    <Slider
                      value={[elasticParams.mass1]}
                      onValueChange={([value]) => setElasticParams(prev => ({ ...prev, mass1: value }))}
                      min={0.5}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Khối lượng vật 2 (kg): {elasticParams.mass2.toFixed(1)}</Label>
                    <Slider
                      value={[elasticParams.mass2]}
                      onValueChange={([value]) => setElasticParams(prev => ({ ...prev, mass2: value }))}
                      min={0.5}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vận tốc vật 1 (m/s): {elasticParams.v1.toFixed(1)}</Label>
                    <Slider
                      value={[elasticParams.v1]}
                      onValueChange={([value]) => setElasticParams(prev => ({ ...prev, v1: value }))}
                      min={-10}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vận tốc vật 2 (m/s): {elasticParams.v2.toFixed(1)}</Label>
                    <Slider
                      value={[elasticParams.v2]}
                      onValueChange={([value]) => setElasticParams(prev => ({ ...prev, v2: value }))}
                      min={-10}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Hệ số phục hồi: {elasticParams.restitution.toFixed(2)}</Label>
                    <Slider
                      value={[elasticParams.restitution]}
                      onValueChange={([value]) => setElasticParams(prev => ({ ...prev, restitution: value }))}
                      min={0.5}
                      max={1.0}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="inelastic" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Khối lượng vật 1 (kg): {inelasticParams.mass1.toFixed(1)}</Label>
                    <Slider
                      value={[inelasticParams.mass1]}
                      onValueChange={([value]) => setInelasticParams(prev => ({ ...prev, mass1: value }))}
                      min={0.5}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Khối lượng vật 2 (kg): {inelasticParams.mass2.toFixed(1)}</Label>
                    <Slider
                      value={[inelasticParams.mass2]}
                      onValueChange={([value]) => setInelasticParams(prev => ({ ...prev, mass2: value }))}
                      min={0.5}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vận tốc vật 1 (m/s): {inelasticParams.v1.toFixed(1)}</Label>
                    <Slider
                      value={[inelasticParams.v1]}
                      onValueChange={([value]) => setInelasticParams(prev => ({ ...prev, v1: value }))}
                      min={-10}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vận tốc vật 2 (m/s): {inelasticParams.v2.toFixed(1)}</Label>
                    <Slider
                      value={[inelasticParams.v2]}
                      onValueChange={([value]) => setInelasticParams(prev => ({ ...prev, v2: value }))}
                      min={-10}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Hệ số phục hồi: {inelasticParams.restitution.toFixed(2)}</Label>
                    <Slider
                      value={[inelasticParams.restitution]}
                      onValueChange={([value]) => setInelasticParams(prev => ({ ...prev, restitution: value }))}
                      min={0}
                      max={0.9}
                      step={0.05}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="explosion" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Tổng khối lượng (kg): {explosionParams.totalMass.toFixed(1)}</Label>
                    <Slider
                      value={[explosionParams.totalMass]}
                      onValueChange={([value]) => setExplosionParams(prev => ({ ...prev, totalMass: value }))}
                      min={1}
                      max={10}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Năng lượng nổ (J): {explosionParams.explosionEnergy.toFixed(1)}</Label>
                    <Slider
                      value={[explosionParams.explosionEnergy]}
                      onValueChange={([value]) => setExplosionParams(prev => ({ ...prev, explosionEnergy: value }))}
                      min={10}
                      max={200}
                      step={10}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Góc nổ (độ): {explosionParams.angle}</Label>
                    <Slider
                      value={[explosionParams.angle]}
                      onValueChange={([value]) => setExplosionParams(prev => ({ ...prev, angle: value }))}
                      min={0}
                      max={360}
                      step={15}
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
                  className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-2">Tính toán</span>
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
                <Label className="text-xs font-semibold mb-2 block">Tốc độ: {animationSpeed}x</Label>
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
        <Card className="border-2 border-red-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-red-600" />
                <span>Collision Arena</span>
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
                height={600}
                className="border-2 border-orange-200 rounded-lg shadow-lg w-full"
              />
              
              {/* Vector Controls */}
              <div className="flex items-center justify-center space-x-6 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showVelocityVector} 
                    onCheckedChange={setShowVelocityVector}
                    id="velocity-toggle"
                  />
                  <Label htmlFor="velocity-toggle" className="cursor-pointer flex items-center">
                    <div className="w-4 h-1 bg-green-500 mr-2"></div>
                    Vận tốc (v)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showMomentumVector} 
                    onCheckedChange={setShowMomentumVector}
                    id="momentum-toggle"
                  />
                  <Label htmlFor="momentum-toggle" className="cursor-pointer flex items-center">
                    <div className="w-4 h-1 bg-amber-500 mr-2"></div>
                    Động lượng (p)
                  </Label>
                </div>
              </div>
              
              {simulationData && (
                <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">💫 Tổng động lượng:</span>
                    <span className="text-orange-700 font-bold">
                      {Math.sqrt(
                        Math.pow(simulationData.totalMomentum.x, 2) + 
                        Math.pow(simulationData.totalMomentum.y, 2)
                      ).toFixed(2)} kg⋅m/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">⚡ Động năng:</span>
                    <span className="text-red-700 font-bold">
                      {simulationData.totalKineticEnergy.toFixed(2)} J
                    </span>
                  </div>
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">🎯 Loại va chạm:</span>
                    <span className="text-purple-700 font-bold">
                      {activeTab === 'elastic' && 'Đàn hồi'}
                      {activeTab === 'inelastic' && 'Không đàn hồi'}
                      {activeTab === 'explosion' && 'Nổ'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          
              </CardContent>
        </Card>
      </div>

      {/* Real-time Graphs */}
      {(
        <Card className="border-2 border-orange-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-orange-600" />
                <span>Đồ thị Bảo toàn - Real-time Analysis</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={graphType === 'momentum' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('momentum')}
                  className={graphType === 'momentum' ? 'bg-gradient-to-r from-orange-600 to-red-600' : ''}
                >
                  💫 Động lượng
                </Button>
                <Button
                  variant={graphType === 'velocity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('velocity')}
                  className={graphType === 'velocity' ? 'bg-gradient-to-r from-orange-600 to-red-600' : ''}
                >
                  🚀 Vận tốc
                </Button>
                <Button
                  variant={graphType === 'force' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('force')}
                  className={graphType === 'force' ? 'bg-gradient-to-r from-orange-600 to-red-600' : ''}
                >
                  ⚡ Lực tương tác
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
                  | Ball1: {graphHistory[graphHistory.length-1]?.ball1Momentum?.toFixed(2)}kg⋅m/s 
                  | Ball2: {graphHistory[graphHistory.length-1]?.ball2Momentum?.toFixed(2)}kg⋅m/s
                  | Force: {graphHistory[graphHistory.length-1]?.interactionForce?.toFixed(2)}N
                </span>
              )}
            </div>
            <ConservationGraphCanvas 
              data={graphHistory}
              currentTime={currentTime}
              graphType={graphType}
            />
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-2 border-orange-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-orange-600" />
            Thông tin Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="text-3xl mb-2">📚</div>
              <h4 className="font-semibold text-orange-900">Cấp độ</h4>
              <p className="text-sm text-orange-700">{config.level}</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <div className="text-3xl mb-2">⭐</div>
              <h4 className="font-semibold text-red-900">Phần thưởng XP</h4>
              <p className="text-sm text-red-700">+{config.xp} XP</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <div className="text-3xl mb-2">🔬</div>
              <h4 className="font-semibold text-yellow-900">Danh mục</h4>
              <p className="text-sm text-yellow-700">{config.category}</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-3xl mb-2">💥</div>
              <h4 className="font-semibold text-green-900">Status</h4>
              <Badge variant={backendStatus === 'online' ? 'default' : 'secondary'} className="mt-1">
                {backendStatus === 'online' ? 'Online' : 'Local'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-orange-600" />
              Các định luật bảo toàn
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>💫 <strong>Bảo toàn động lượng</strong>: p₁ + p₂ = const (tất cả loại va chạm)</li>
              <li>⚡ <strong>Bảo toàn năng lượng</strong>: KE₁ + KE₂ = const (chỉ va chạm đàn hồi)</li>
              <li>🎯 <strong>Hệ số phục hồi</strong>: e = |v₂&apos; - v₁&apos;| / |v₂ - v₁|</li>
              <li>💥 <strong>Va chạm đàn hồi</strong>: e = 1 (không mất năng lượng)</li>
              <li>🔻 <strong>Va chạm không đàn hồi</strong>: 0 &lt; e &lt; 1 (mất năng lượng)</li>
              <li>💢 <strong>Va chạm hoàn toàn không đàn hồi</strong>: e = 0 (dính chặt)</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Target className="h-4 w-4 mr-2 text-yellow-600" />
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>Chọn loại va chạm: <strong>Đàn hồi, Không đàn hồi, hoặc Nổ</strong></li>
              <li>Điều chỉnh khối lượng và vận tốc ban đầu</li>
              <li>Nhấn <strong>&quot;Tính toán&quot;</strong> để thiết lập va chạm</li>
              <li>Nhấn <strong>&quot;Chạy&quot;</strong> để xem mô phỏng trực quan</li>
              <li>Quan sát vector vận tốc (xanh) và động lượng (cam)</li>
              <li>Xem đồ thị real-time tracking động lượng và năng lượng</li>
              <li>Kiểm tra bảo toàn động lượng (đường xanh lá) trên đồ thị</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Conservation Graph Canvas Component
function ConservationGraphCanvas({ 
  data, 
  currentTime, 
  graphType 
}: { 
  data: HistoryPoint[], 
  currentTime: number, 
  graphType: 'momentum' | 'velocity' | 'force' 
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
    bgGradient.addColorStop(0, '#fff7ed');
    bgGradient.addColorStop(0.5, '#ffe4e6');
    bgGradient.addColorStop(1, '#fef3c7');
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
    let color1 = '#f97316';
    let color2 = '#ef4444';
    
    if (graphType === 'momentum') {
      yData1 = data.map(p => p.totalMomentum);
      yData2 = data.map(p => p.ball1Momentum);
      yLabel1 = 'Tổng động lượng hệ (kg⋅m/s)';
      yLabel2 = 'Động lượng vật 1 (kg⋅m/s)';
      color1 = '#8b5cf6'; // Purple for total momentum
      color2 = '#3b82f6'; // Blue for ball 1 momentum
    } else if (graphType === 'velocity') {
      yData1 = data.map(p => p.ball1Velocity);
      yData2 = data.map(p => p.ball2Velocity);
      yLabel1 = 'Vận tốc vật 1 (m/s)';
      yLabel2 = 'Vận tốc vật 2 (m/s)';
      color1 = '#10b981'; // Green for ball 1 velocity
      color2 = '#f59e0b'; // Orange for ball 2 velocity
    } else if (graphType === 'force') {
      yData1 = data.map(p => p.interactionForce);
      yData2 = [];
      yLabel1 = 'Lực tương tác (N)';
      color1 = '#ef4444'; // Red for force
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
    ctx.shadowColor = color1.replace(')', ', 0.5)').replace('#', 'rgba(').replace('#f97316', 'rgba(249, 115, 22, 0.5)').replace('#ef4444', 'rgba(239, 68, 68, 0.5)').replace('#3b82f6', 'rgba(59, 130, 246, 0.5)').replace('#8b5cf6', 'rgba(139, 92, 246, 0.5)');
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
      ctx.shadowColor = color2.replace(')', ', 0.5)').replace('#', 'rgba(').replace('#ec4899', 'rgba(236, 72, 153, 0.5)').replace('#3b82f6', 'rgba(59, 130, 246, 0.5)');
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
    
    // Draw third line for ball 2 momentum (only in momentum graph)
    if (graphType === 'momentum' && data.length > 0) {
      const ball2Data = data.map(p => p.ball2Momentum);
      if (ball2Data.length > 0) {
        const minY3 = Math.min(...ball2Data);
        const maxY3 = Math.max(...ball2Data);
        const rangeY3 = maxY3 - minY3 || 1;
        const scaleY3 = graphHeight / (rangeY3 * 1.2);
        const toScreenY3 = (y: number) => height - padding - ((y - minY3) + rangeY3 * 0.1) * scaleY3;
        
        ctx.strokeStyle = '#ef4444'; // Red for ball 2 momentum
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        data.forEach((point, i) => {
          const x = toScreenX(point.time);
          const y = toScreenY3(ball2Data[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
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
      ctx.shadowColor = color1.replace(')', ', 0.8)').replace('#', 'rgba(').replace('#f97316', 'rgba(249, 115, 22, 0.8)').replace('#ef4444', 'rgba(239, 68, 68, 0.8)').replace('#3b82f6', 'rgba(59, 130, 246, 0.8)').replace('#8b5cf6', 'rgba(139, 92, 246, 0.8)');
      ctx.fillStyle = color1;
      ctx.beginPath();
      ctx.arc(toScreenX(data[currentIdx].time), toScreenY1(yData1[currentIdx]), 6, 0, 2 * Math.PI);
      ctx.fill();
      
      if (yData2.length > 0) {
        ctx.shadowColor = color2.replace(')', ', 0.8)').replace('#', 'rgba(').replace('#ec4899', 'rgba(236, 72, 153, 0.8)').replace('#3b82f6', 'rgba(59, 130, 246, 0.8)');
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(toScreenX(data[currentIdx].time), toScreenY2(yData2[currentIdx]), 6, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // Draw ball 2 current point (only in momentum graph)
      if (graphType === 'momentum' && data.length > 0) {
        const ball2Data = data.map(p => p.ball2Momentum);
        if (ball2Data.length > 0 && ball2Data[currentIdx] !== undefined) {
          const minY3 = Math.min(...ball2Data);
          const maxY3 = Math.max(...ball2Data);
          const rangeY3 = maxY3 - minY3 || 1;
          const scaleY3 = graphHeight / (rangeY3 * 1.2);
          const toScreenY3 = (y: number) => height - padding - ((y - minY3) + rangeY3 * 0.1) * scaleY3;
          
          ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(toScreenX(data[currentIdx].time), toScreenY3(ball2Data[currentIdx]), 6, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      
      ctx.shadowBlur = 0;
    }
    
    // Labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('⏱️ Thời gian (s)', width / 2 - 40, height - 10);
    
    // Y-axis label
    let yAxisLabel = '';
    if (graphType === 'momentum') {
      yAxisLabel = '💫 Động lượng (kg⋅m/s)';
    } else if (graphType === 'velocity') {
      yAxisLabel = '🚀 Vận tốc (m/s)';
    } else if (graphType === 'force') {
      yAxisLabel = '⚡ Lực (N)';
    }
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
    
    // Legend
    const legendX = width - 220;
    const legendY = 15;
    const hasBall2 = graphType === 'momentum';
    const legendHeight = (yData2.length > 0 ? 50 : 30) + (hasBall2 ? 20 : 0);
    
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
    
    // Ball 2 legend (only in momentum graph)
    if (hasBall2) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(legendX, legendY + 50, 25, 4);
      ctx.fillStyle = '#1f2937';
      ctx.fillText('Động lượng vật 2 (kg⋅m/s)', legendX + 30, legendY + 54);
    }
    
    // Axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * rangeT;
      const x = toScreenX(t);
      ctx.fillText(t.toFixed(1), x - 10, height - padding + 20);
    }
    
    // Y axis labels
    ctx.fillStyle = color1;
    for (let i = 0; i <= 5; i++) {
      const y = minY1 + (i / 5) * rangeY1;
      const screenY = toScreenY1(y);
      ctx.fillText(y.toFixed(2), 5, screenY + 3);
    }
    
    // Conservation line (if momentum/energy should be constant)
    if (graphType === 'momentum' || graphType === 'energy') {
      const avgValue = yData1.reduce((a, b) => a + b, 0) / yData1.length;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, toScreenY1(avgValue));
      ctx.lineTo(width - padding, toScreenY1(avgValue));
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Label for average
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 10px Arial';
      const label = graphType === 'momentum' ? 'Bảo toàn' : 'Avg';
      ctx.fillText(`${label}: ${avgValue.toFixed(2)}`, width - padding - 80, toScreenY1(avgValue) - 10);
    }
    
  }, [data, currentTime, graphType]);
  
  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="border-2 border-orange-200 rounded-lg shadow-lg w-full"
    />
    </VisionThemeWrapper>
  );
}

