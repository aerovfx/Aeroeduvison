'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Activity, Play, RotateCcw, Loader2, Settings, BarChart3, Zap, Pause, LineChart, Grid3x3, Eye, Download, Trophy, CheckCircle, Info, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  };
}

export default function PhysicsMotionPage() {
  const { t } = useLanguage();
  
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [activeTab, setActiveTab] = useState('free-fall');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Visualization options
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showAccelerationVector, setShowAccelerationVector] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphType, setGraphType] = useState<'position' | 'velocity' | 'acceleration'>('position');
  
  // Track initial values for interaction detection
  const initialValues = useRef({
    freeFall: { h0: 100, v0: 0, g: 9.8 },
    projectile: { v0: 20, angle: 45, h0: 0, g: 9.8 },
    activeTab: 'free-fall'
  });
  
  // Simulation parameters
  const [freeFallParams, setFreeFallParams] = useState({
    h0: 100,
    v0: 0,
    g: 9.8
  });
  
  const [projectileParams, setProjectileParams] = useState({
    v0: 20,
    angle: 45,
    h0: 0,
    g: 9.8
  });
  
  const [harmonicParams, setHarmonicParams] = useState({
    A: 0.1,
    omega: 6.28,
    phi: 0
  });

  const [uniformParams, setUniformParams] = useState({
    v: 10,
    x0: 0,
    duration: 10
  });

  const [acceleratedParams, setAcceleratedParams] = useState({
    v0: 0,
    a: 2,
    x0: 0,
    duration: 10
  });

  const [circularParams, setCircularParams] = useState({
    r: 5,
    omega: 1,
    duration: 10
  });

  const [pendulumParams, setPendulumParams] = useState({
    L: 1,
    theta0: 30,
    duration: 10
  });

  // Lab configuration
  const config = {
    name: "physics-motion",
    title: "Chuyển động vật lý cơ bản",
    description: "Chuyển động thẳng, biến đổi, tròn đều",
    category: "Cơ học",
    level: "Dễ",
    duration: "20 phút",
    xp: 120,
    port: 8007
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      freeFallParams.h0 !== initialValues.current.freeFall.h0 ||
      freeFallParams.v0 !== initialValues.current.freeFall.v0 ||
      freeFallParams.g !== initialValues.current.freeFall.g ||
      projectileParams.v0 !== initialValues.current.projectile.v0 ||
      projectileParams.angle !== initialValues.current.projectile.angle ||
      projectileParams.h0 !== initialValues.current.projectile.h0 ||
      activeTab !== initialValues.current.activeTab;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [freeFallParams, projectileParams, activeTab, isMounted, hasInteracted]);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check backend status (optional - set to offline by default)
    const ENABLE_BACKEND_CHECK = false; // Set to true if you have physics backend running
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline'); // Use client-side simulation
      return;
    }

    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8007/api/health`, {
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
        velocity_at_ground: v0 - g * timeToGround,
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
    const numPoints = 100;
    
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
        range: range
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
        max_height: A
      }
    };
  };

  const calculateUniform = (v: number, x0: number, duration: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const numPoints = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);
      const x = x0 + v * t;
      
      trajectory.push({
        t,
        x,
        y: 0,
        vx: v,
        vy: 0,
        ax: 0,
        ay: 0
      });
    }
    
    return {
      trajectory,
      results: {
        range: x0 + v * duration
      }
    };
  };

  const calculateAccelerated = (v0: number, a: number, x0: number, duration: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const numPoints = 100;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);
      const x = x0 + v0 * t + 0.5 * a * t * t;
      const vx = v0 + a * t;
      
      trajectory.push({
        t,
        x,
        y: 0,
        vx,
        vy: 0,
        ax: a,
        ay: 0
      });
    }
    
    const finalX = x0 + v0 * duration + 0.5 * a * duration * duration;
    const finalV = v0 + a * duration;
    
    return {
      trajectory,
      results: {
        range: finalX,
        velocity_at_ground: finalV
      }
    };
  };

  const calculateCircular = (r: number, omega: number, duration: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const numPoints = 200;
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);
      const theta = omega * t;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const vx = -r * omega * Math.sin(theta);
      const vy = r * omega * Math.cos(theta);
      const ax = -r * omega * omega * Math.cos(theta);
      const ay = -r * omega * omega * Math.sin(theta);
      
      trajectory.push({
        t,
        x,
        y,
        vx,
        vy,
        ax,
        ay
      });
    }
    
    const v = r * omega;
    const ac = r * omega * omega;
    
    return {
      trajectory,
      results: {
        max_height: r,
        velocity_at_ground: v
      }
    };
  };

  const calculatePendulum = (L: number, theta0Deg: number, duration: number): SimulationData => {
    const trajectory: MotionState[] = [];
    const numPoints = 200;
    const g = 9.8;
    const theta0 = (theta0Deg * Math.PI) / 180;
    const omega0 = Math.sqrt(g / L);
    
    for (let i = 0; i < numPoints; i++) {
      const t = (i * duration) / (numPoints - 1);
      const theta = theta0 * Math.cos(omega0 * t);
      const x = L * Math.sin(theta);
      const y = -L * Math.cos(theta);
      const vx = L * theta0 * omega0 * Math.cos(theta) * (-Math.sin(omega0 * t));
      const vy = L * theta0 * omega0 * Math.sin(theta) * (-Math.sin(omega0 * t));
      
      trajectory.push({
        t,
        x,
        y,
        vx,
        vy,
        ax: 0,
        ay: -g
      });
    }
    
    return {
      trajectory,
      results: {
        max_height: L * (1 - Math.cos(theta0))
      }
    };
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      // Simulate lab completion (offline mode)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
      });
    } catch (error) {
      console.error('Error completing lab:', error);
      toast({
        title: "❌ Lỗi",
        description: "Không thể hoàn thành thí nghiệm. Vui lòng thử lại.",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      let data: SimulationData;
      
      if (activeTab === 'free-fall') {
        data = calculateFreeFall(freeFallParams.h0, freeFallParams.v0, freeFallParams.g);
      } else if (activeTab === 'projectile') {
        data = calculateProjectile(projectileParams.v0, projectileParams.angle, projectileParams.h0, projectileParams.g);
      } else if (activeTab === 'harmonic') {
        data = calculateHarmonic(harmonicParams.A, harmonicParams.omega, harmonicParams.phi);
      } else if (activeTab === 'uniform') {
        data = calculateUniform(uniformParams.v, uniformParams.x0, uniformParams.duration);
      } else if (activeTab === 'accelerated') {
        data = calculateAccelerated(acceleratedParams.v0, acceleratedParams.a, acceleratedParams.x0, acceleratedParams.duration);
      } else if (activeTab === 'circular') {
        data = calculateCircular(circularParams.r, circularParams.omega, circularParams.duration);
      } else {
        data = calculatePendulum(pendulumParams.L, pendulumParams.theta0, pendulumParams.duration);
      }
      
      setSimulationData(data);
      
      // Try to use backend if available
      if (backendStatus === 'online') {
        try {
          const endpoint = activeTab === 'free-fall' ? '/api/free-fall' : 
                          activeTab === 'projectile' ? '/api/projectile' : '/api/harmonic';
          const params = activeTab === 'free-fall' ? freeFallParams :
                        activeTab === 'projectile' ? projectileParams : harmonicParams;
          
          const response = await fetch(`http://localhost:8007${endpoint}`, {
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

  // Enhanced Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Set up coordinate system
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
    
    // Add some padding to bounds
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    minX -= rangeX * 0.15;
    maxX += rangeX * 0.15;
    minY -= rangeY * 0.15;
    maxY += rangeY * 0.15;
    
    // Scale factors
    const scaleX = graphWidth / (maxX - minX);
    const scaleY = graphHeight / (maxY - minY);
    
    const toScreenX = (x: number) => padding + (x - minX) * scaleX;
    const toScreenY = (y: number) => height - padding - (y - minY) * scaleY;
    
    // Draw grid
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
    
    // Draw trajectory with gradient
    const trajectoryGradient = ctx.createLinearGradient(
      toScreenX(simulationData.trajectory[0].x),
      toScreenY(simulationData.trajectory[0].y),
      toScreenX(simulationData.trajectory[simulationData.trajectory.length - 1].x),
      toScreenY(simulationData.trajectory[simulationData.trajectory.length - 1].y)
    );
    trajectoryGradient.addColorStop(0, '#3b82f6');
    trajectoryGradient.addColorStop(1, '#8b5cf6');
    
    ctx.strokeStyle = trajectoryGradient;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
    ctx.shadowBlur = 5;
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
      
      // Draw trail points
      if (showTrail && index % 5 === 0 && point.t <= currentTime) {
        ctx.save();
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw current position
    const currentIdx = simulationData.trajectory.findIndex(p => p.t >= currentTime);
    const currentPoint = currentIdx >= 0 ? simulationData.trajectory[currentIdx] : 
                         simulationData.trajectory[simulationData.trajectory.length - 1];
    
    if (currentPoint) {
      const x = toScreenX(currentPoint.x);
      const y = toScreenY(currentPoint.y);
      
      // Draw object with shadow
      ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
      ctx.shadowBlur = 15;
      
      // Draw as a circle with gradient
      const objGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
      objGradient.addColorStop(0, '#fca5a5');
      objGradient.addColorStop(1, '#ef4444');
      ctx.fillStyle = objGradient;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Draw velocity vector
      if (showVelocityVector && (currentPoint.vx !== 0 || currentPoint.vy !== 0)) {
        const scale = 0.5;
        const vxScreen = currentPoint.vx * scaleX * scale;
        const vyScreen = -currentPoint.vy * scaleY * scale;
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vxScreen, y + vyScreen);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(vyScreen, vxScreen);
        ctx.fillStyle = '#10b981';
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
        
        // Label
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('v', x + vxScreen + 15, y + vyScreen);
      }
      
      // Draw acceleration vector
      if (showAccelerationVector && (currentPoint.ax !== 0 || currentPoint.ay !== 0)) {
        const scale = 1;
        const axScreen = currentPoint.ax * scaleX * scale;
        const ayScreen = -currentPoint.ay * scaleY * scale;
        
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + axScreen, y + ayScreen);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(ayScreen, axScreen);
        ctx.fillStyle = '#f59e0b';
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
        
        // Label
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('a', x + axScreen + 15, y + ayScreen);
      }
      
      // Draw info box
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      const infoX = x + 20;
      const infoY = y - 50;
      ctx.fillRect(infoX, infoY, 140, 45);
      ctx.strokeRect(infoX, infoY, 140, 45);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px Arial';
      ctx.fillText(`t = ${currentPoint.t.toFixed(2)} s`, infoX + 5, infoY + 15);
      ctx.fillText(`x = ${currentPoint.x.toFixed(2)} m`, infoX + 5, infoY + 28);
      ctx.fillText(`y = ${currentPoint.y.toFixed(2)} m`, infoX + 5, infoY + 41);
    }
    
    // Draw labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('X (m)', width - 60, height - 25);
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y (m)', 0, 0);
    ctx.restore();
    
  }, [simulationData, currentTime, showGrid, showTrail, showVelocityVector, showAccelerationVector]);

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Activity className="h-8 w-8 text-blue-600" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card className="border-2 border-purple-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <CardTitle className="flex items-center space-x-2 text-purple-900">
              <Settings className="h-5 w-5 text-purple-600" />
              <span>Điều khiển thí nghiệm</span>
            </CardTitle>
            <CardDescription>
              Chọn loại chuyển động và điều chỉnh tham số
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 gap-1">
                <TabsTrigger value="free-fall">Rơi tự do</TabsTrigger>
                <TabsTrigger value="projectile">Ném xiên</TabsTrigger>
                <TabsTrigger value="harmonic">Dao động</TabsTrigger>
                <TabsTrigger value="uniform">Đều</TabsTrigger>
                <TabsTrigger value="accelerated">Nhanh dần</TabsTrigger>
                <TabsTrigger value="circular">Tròn</TabsTrigger>
                <TabsTrigger value="pendulum">Con lắc</TabsTrigger>
              </TabsList>
              
              <TabsContent value="free-fall" className="space-y-4">
                <div className="space-y-4">
                  {/* Height Slider - Enhanced */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-bold text-purple-900 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Độ cao ban đầu
                      </Label>
                      <div className="bg-white px-5 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                        <span className="text-2xl font-bold text-purple-600">{freeFallParams.h0} m</span>
                      </div>
                    </div>
                    <Slider
                      value={[freeFallParams.h0]}
                      onValueChange={([value]) => setFreeFallParams(prev => ({ ...prev, h0: value }))}
                      min={0}
                      max={200}
                      step={1}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">0m</span>
                      <span className="font-medium">50m</span>
                      <span className="font-medium">100m</span>
                      <span className="font-medium">150m</span>
                      <span className="font-medium">200m</span>
                    </div>
                  </div>
                  
                  {/* Velocity Slider - Enhanced */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-bold text-green-900 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Vận tốc ban đầu
                      </Label>
                      <div className="bg-white px-5 py-2 rounded-lg border-2 border-green-300 shadow-md">
                        <span className="text-2xl font-bold text-green-600">{freeFallParams.v0} m/s</span>
                      </div>
                    </div>
                    <Slider
                      value={[freeFallParams.v0]}
                      onValueChange={([value]) => setFreeFallParams(prev => ({ ...prev, v0: value }))}
                      min={-20}
                      max={20}
                      step={0.5}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">-20</span>
                      <span className="font-medium">-10</span>
                      <span className="font-medium">0</span>
                      <span className="font-medium">10</span>
                      <span className="font-medium">20</span>
                    </div>
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
                  {/* Velocity Slider - Enhanced */}
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-bold text-blue-900 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Vận tốc ban đầu
                      </Label>
                      <div className="bg-white px-5 py-2 rounded-lg border-2 border-blue-300 shadow-md">
                        <span className="text-2xl font-bold text-blue-600">{projectileParams.v0} m/s</span>
                      </div>
                    </div>
                    <Slider
                      value={[projectileParams.v0]}
                      onValueChange={([value]) => setProjectileParams(prev => ({ ...prev, v0: value }))}
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
                        <Activity className="h-4 w-4" />
                        Góc ném
                      </Label>
                      <div className="bg-white px-5 py-2 rounded-lg border-2 border-amber-300 shadow-md">
                        <span className="text-2xl font-bold text-amber-600">{projectileParams.angle}°</span>
                      </div>
                    </div>
                    <Slider
                      value={[projectileParams.angle]}
                      onValueChange={([value]) => setProjectileParams(prev => ({ ...prev, angle: value }))}
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

              <TabsContent value="uniform" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Vận tốc (m/s): {uniformParams.v}</Label>
                    <Slider
                      value={[uniformParams.v]}
                      onValueChange={([value]) => setUniformParams(prev => ({ ...prev, v: value }))}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vị trí ban đầu (m): {uniformParams.x0}</Label>
                    <Slider
                      value={[uniformParams.x0]}
                      onValueChange={([value]) => setUniformParams(prev => ({ ...prev, x0: value }))}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Thời gian (s): {uniformParams.duration}</Label>
                    <Slider
                      value={[uniformParams.duration]}
                      onValueChange={([value]) => setUniformParams(prev => ({ ...prev, duration: value }))}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accelerated" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Vận tốc ban đầu (m/s): {acceleratedParams.v0}</Label>
                    <Slider
                      value={[acceleratedParams.v0]}
                      onValueChange={([value]) => setAcceleratedParams(prev => ({ ...prev, v0: value }))}
                      min={0}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Gia tốc (m/s²): {acceleratedParams.a.toFixed(1)}</Label>
                    <Slider
                      value={[acceleratedParams.a]}
                      onValueChange={([value]) => setAcceleratedParams(prev => ({ ...prev, a: value }))}
                      min={0.1}
                      max={10}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Vị trí ban đầu (m): {acceleratedParams.x0}</Label>
                    <Slider
                      value={[acceleratedParams.x0]}
                      onValueChange={([value]) => setAcceleratedParams(prev => ({ ...prev, x0: value }))}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Thời gian (s): {acceleratedParams.duration}</Label>
                    <Slider
                      value={[acceleratedParams.duration]}
                      onValueChange={([value]) => setAcceleratedParams(prev => ({ ...prev, duration: value }))}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="circular" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Bán kính (m): {circularParams.r}</Label>
                    <Slider
                      value={[circularParams.r]}
                      onValueChange={([value]) => setCircularParams(prev => ({ ...prev, r: value }))}
                      min={1}
                      max={20}
                      step={0.5}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Tần số góc (rad/s): {circularParams.omega.toFixed(2)}</Label>
                    <Slider
                      value={[circularParams.omega]}
                      onValueChange={([value]) => setCircularParams(prev => ({ ...prev, omega: value }))}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Thời gian (s): {circularParams.duration}</Label>
                    <Slider
                      value={[circularParams.duration]}
                      onValueChange={([value]) => setCircularParams(prev => ({ ...prev, duration: value }))}
                      min={1}
                      max={30}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pendulum" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label>Chiều dài dây (m): {pendulumParams.L.toFixed(1)}</Label>
                    <Slider
                      value={[pendulumParams.L]}
                      onValueChange={([value]) => setPendulumParams(prev => ({ ...prev, L: value }))}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Góc ban đầu (độ): {pendulumParams.theta0}</Label>
                    <Slider
                      value={[pendulumParams.theta0]}
                      onValueChange={([value]) => setPendulumParams(prev => ({ ...prev, theta0: value }))}
                      min={5}
                      max={60}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Thời gian (s): {pendulumParams.duration}</Label>
                    <Slider
                      value={[pendulumParams.duration]}
                      onValueChange={([value]) => setPendulumParams(prev => ({ ...prev, duration: value }))}
                      min={1}
                      max={30}
                      step={1}
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
                  className="flex-1"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
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
              
              {/* Complete Lab Button */}
              <div className="pt-3 border-t">
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
                
                {/* Hint text when not interacted */}
                {!hasInteracted && !isCompleted && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200 mt-2">
                    💡 Thay đổi thông số thí nghiệm để kích hoạt nút hoàn thành
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="border-2 border-indigo-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardTitle className="flex items-center justify-between text-indigo-900">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-indigo-600" />
                <span>Mô phỏng trực quan</span>
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
                className="border rounded shadow-md w-full"
              />
              
              {/* Vector Controls */}
              <div className="flex items-center justify-center space-x-6 p-3 bg-gray-50 rounded-lg">
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
                <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-blue-50 rounded-lg">
                  {Object.entries(simulationData.results).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {key === 'time_to_ground' && '⏱️ Thời gian chạm đất:'}
                        {key === 'velocity_at_ground' && '🚀 Vận tốc chạm đất:'}
                        {key === 'max_height' && '📏 Độ cao cực đại:'}
                        {key === 'range' && '📐 Tầm xa:'}
                        {key === 'time_of_flight' && '⏱️ Thời gian bay:'}
                      </span>
                      <span className="text-blue-700 font-bold">
                        {typeof value === 'number' ? value.toFixed(2) : value}
                        {key.includes('time') && ' s'}
                        {key.includes('velocity') && ' m/s'}
                        {key.includes('height') && ' m'}
                        {key.includes('range') && ' m'}
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
        <Card className="border-2 border-teal-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
            <CardTitle className="flex items-center justify-between text-teal-900">
              <div className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-teal-600" />
                <span>Đồ thị thời gian thực</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={graphType === 'position' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('position')}
                >
                  Vị trí
                </Button>
                <Button
                  variant={graphType === 'velocity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('velocity')}
                >
                  Vận tốc
                </Button>
                <Button
                  variant={graphType === 'acceleration' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('acceleration')}
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

      {/* Info Card */}
      <Card className="border-2 border-slate-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
          <CardTitle className="flex items-center space-x-2 text-slate-900">
            <Info className="h-5 w-5 text-slate-600" />
            <span>Thông tin mô phỏng</span>
          </CardTitle>
          <CardDescription>
            Cấp độ, điểm thưởng và hướng dẫn sử dụng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="text-3xl mb-2">📚</div>
              <h4 className="font-semibold text-blue-900">Cấp độ</h4>
              <p className="text-sm text-blue-700">{config['level']}</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
              <div className="text-3xl mb-2">⭐</div>
              <h4 className="font-semibold text-yellow-900">Phần thưởng XP</h4>
              <p className="text-sm text-yellow-700">+{config['xp']} XP</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="text-3xl mb-2">🔬</div>
              <h4 className="font-semibold text-purple-900">Danh mục</h4>
              <p className="text-sm text-purple-700">{config['category']}</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-green-900">Trạng thái</h4>
              <Badge variant={backendStatus === 'online' ? 'default' : 'secondary'}>
                {backendStatus === 'online' ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-yellow-500" />
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>Chọn loại chuyển động từ các tab trên cùng</li>
              <li>Điều chỉnh các thông số bằng thanh trượt</li>
              <li>Nhấn &quot;Tính toán&quot; để xem quỹ đạo</li>
              <li>Sử dụng các nút &quot;Chạy&quot;, &quot;Tạm dừng&quot;, {t('common.reset')} để điều khiển animation</li>
              <li>Bật/tắt lưới, vết, và vector để xem chi tiết hơn</li>
              <li>Xem đồ thị thời gian thực ở phần bên dưới</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Graph Canvas Component
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
    
    // Clear canvas with gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fefce8');
    bgGradient.addColorStop(1, '#fef3c7');
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
    
    // Scale with padding
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
    
    // Draw X component (blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYX(yDataX[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw Y component (red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.t);
      const y = toScreenYY(yDataY[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
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
    
    // Draw current points
    const currentIdx = data.findIndex(p => p.t >= currentTime);
    if (currentIdx >= 0) {
      const point = data[currentIdx];
      
      // X component point
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYX(yDataX[currentIdx]), 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Y component point
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(toScreenX(point.t), toScreenYY(yDataY[currentIdx]), 5, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('Thời gian (s)', width / 2 - 30, height - 10);
    
    // Legend
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(width - 150, 20, 20, 3);
    ctx.fillStyle = '#1f2937';
    ctx.font = '11px Arial';
    ctx.fillText(yLabelX, width - 125, 25);
    
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(width - 150, 35, 20, 3);
    ctx.fillStyle = '#1f2937';
    ctx.fillText(yLabelY, width - 125, 40);
    
    // Draw axis labels with values
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    
    // Time axis labels
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * rangeT;
      const x = toScreenX(t);
      ctx.fillText(t.toFixed(1), x - 10, height - padding + 20);
    }
    
    // Y axis labels (X component)
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
      className="border rounded shadow-md w-full"
    />
    </VisionThemeWrapper>
  );
}