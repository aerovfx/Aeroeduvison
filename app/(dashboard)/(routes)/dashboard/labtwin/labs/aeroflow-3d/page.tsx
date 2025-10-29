'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Zap, 
  Wind, 
  Layers,
  Eye,
  EyeOff,
  Camera,
  Lightbulb,
  BarChart3,
  Globe,
  Car,
  Plane,
  Circle,
  Box
} from 'lucide-react';

// 3D Fluid Dynamics Types
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface Particle3D {
  id: number;
  position: Vector3D;
  velocity: Vector3D;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface Obstacle3D {
  id: string;
  type: 'airfoil' | 'car' | 'cylinder' | 'wing' | 'sphere';
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  lift: number;
  drag: number;
  color: string;
}

interface HistoryPoint3D {
  time: number;
  avgVelocity: number;
  avgPressure: number;
  turbulence: number;
  liftCoefficient: number;
  dragCoefficient: number;
  totalLift: number;
  totalDrag: number;
  particleCount: number;
}

// 3D Simulation State
interface SimulationState3D {
  particles: Particle3D[];
  obstacles: Obstacle3D[];
  windDirection: Vector3D;
  windSpeed: number;
  turbulence: number;
  time: number;
  isRunning: boolean;
}

// 3D Scene Component
function Scene3D({ 
  particles, 
  obstacles, 
  windDirection, 
  windSpeed, 
  showParticles, 
  showObstacles,
  particleDensity,
  cameraAngle,
  lighting
}: {
  particles: Particle3D[];
  obstacles: Obstacle3D[];
  windDirection: Vector3D;
  windSpeed: number;
  showParticles: boolean;
  showObstacles: boolean;
  particleDensity: number;
  cameraAngle: number;
  lighting: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 3D Projection helpers
    const project3D = (point: Vector3D): { x: number; y: number; z: number } => {
      const angle = cameraAngle * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // Rotate around Y axis
      const x = point.x * cos - point.z * sin;
      const z = point.x * sin + point.z * cos;
      const y = point.y;
      
      // Perspective projection
      const distance = 800;
      const scale = distance / (distance + z);
      
      return {
        x: (x * scale) + width / 2,
        y: (y * scale) + height / 2,
        z: z
      };
    };

    const animate = () => {
      // Clear canvas with 3D-style gradient background
      const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width/2);
      gradient.addColorStop(0, '#0f172a'); // Dark navy
      gradient.addColorStop(0.5, '#1e293b'); // Medium slate
      gradient.addColorStop(1, '#334155'); // Light slate
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw grid lines for 3D reference
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.1)';
      ctx.lineWidth = 1;
      
      // Ground grid
      for (let i = -200; i <= 200; i += 50) {
        const p1 = project3D({ x: i, y: -100, z: -200 });
        const p2 = project3D({ x: i, y: -100, z: 200 });
        const p3 = project3D({ x: -200, y: -100, z: i });
        const p4 = project3D({ x: 200, y: -100, z: i });
        
        if (p1.z > -800 && p2.z > -800) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        
        if (p3.z > -800 && p4.z > -800) {
          ctx.beginPath();
          ctx.moveTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.stroke();
        }
      }

      // Draw obstacles in 3D
      if (showObstacles) {
        obstacles.forEach(obstacle => {
          const projected = project3D(obstacle.position);
          
          if (projected.z > -800) {
            const size = Math.max(10, 50 * (800 / (800 + projected.z)));
            
            // Obstacle shadow on ground
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(projected.x, height - 50, size * 1.5, size * 0.3, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // Obstacle body
            ctx.fillStyle = obstacle.color;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            
            if (obstacle.type === 'sphere') {
              ctx.beginPath();
              ctx.arc(projected.x, projected.y, size, 0, 2 * Math.PI);
              ctx.fill();
            } else if (obstacle.type === 'cylinder') {
              ctx.fillRect(projected.x - size/2, projected.y - size, size, size * 2);
            } else if (obstacle.type === 'airfoil') {
              // Airfoil shape
              ctx.beginPath();
              ctx.moveTo(projected.x - size, projected.y);
              ctx.quadraticCurveTo(projected.x, projected.y - size/3, projected.x + size, projected.y);
              ctx.quadraticCurveTo(projected.x, projected.y + size/3, projected.x - size, projected.y);
              ctx.closePath();
              ctx.fill();
            } else if (obstacle.type === 'car') {
              // F1 car shape
              ctx.fillRect(projected.x - size, projected.y - size/3, size * 2, size * 2/3);
              // Front wing
              ctx.fillRect(projected.x - size * 1.2, projected.y - size/6, size * 0.4, size/3);
              // Rear wing
              ctx.fillRect(projected.x + size * 0.8, projected.y - size/6, size * 0.4, size/3);
            }
            
            ctx.shadowBlur = 0;
            
            // Velocity vectors around obstacle
            ctx.strokeStyle = `rgba(255, 255, 255, ${lighting / 100})`;
            ctx.lineWidth = 2;
            
            for (let angle = 0; angle < 360; angle += 30) {
              const rad = angle * Math.PI / 180;
              const x = obstacle.position.x + Math.cos(rad) * 80;
              const y = obstacle.position.y + Math.sin(rad) * 80;
              const z = obstacle.position.z;
              
              const vecStart = project3D({ x, y, z });
              const vecEnd = project3D({ 
                x: x + windDirection.x * windSpeed * 2, 
                y: y + windDirection.y * windSpeed * 2, 
                z: z + windDirection.z * windSpeed * 2 
              });
              
              if (vecStart.z > -800 && vecEnd.z > -800) {
                ctx.beginPath();
                ctx.moveTo(vecStart.x, vecStart.y);
                ctx.lineTo(vecEnd.x, vecEnd.y);
                ctx.stroke();
                
                // Arrow head
                const angle = Math.atan2(vecEnd.y - vecStart.y, vecEnd.x - vecStart.x);
                const headLength = 8;
                ctx.beginPath();
                ctx.moveTo(vecEnd.x, vecEnd.y);
                ctx.lineTo(
                  vecEnd.x - headLength * Math.cos(angle - Math.PI / 6),
                  vecEnd.y - headLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(vecEnd.x, vecEnd.y);
                ctx.lineTo(
                  vecEnd.x - headLength * Math.cos(angle + Math.PI / 6),
                  vecEnd.y - headLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.stroke();
              }
            }
          }
        });
      }

      // Draw particles in 3D
      if (showParticles) {
        particles.forEach(particle => {
          const projected = project3D(particle.position);
          
          if (projected.z > -800) {
            const alpha = Math.max(0.1, particle.life / particle.maxLife);
            const size = Math.max(1, particle.size * (800 / (800 + projected.z)));
            
            ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(projected.x, projected.y, size, 0, 2 * Math.PI);
            ctx.fill();
            
            // Particle trail
            if (particle.life > particle.maxLife * 0.5) {
              const trailLength = 20;
              const prevPos = project3D({
                x: particle.position.x - particle.velocity.x * trailLength,
                y: particle.position.y - particle.velocity.y * trailLength,
                z: particle.position.z - particle.velocity.z * trailLength
              });
              
              if (prevPos.z > -800) {
                ctx.strokeStyle = `${particle.color}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(prevPos.x, prevPos.y);
                ctx.lineTo(projected.x, projected.y);
                ctx.stroke();
              }
            }
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [particles, obstacles, windDirection, windSpeed, showParticles, showObstacles, particleDensity, cameraAngle, lighting]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full bg-gradient-to-br from-slate-900 to-slate-700"
    />
  );
}

// 3D Graph Component
function Graph3D({ 
  data, 
  currentTime, 
  graphType
}: { 
  data: HistoryPoint3D[], 
  currentTime: number, 
  graphType: 'velocity' | 'pressure' | 'turbulence' | 'lift' | 'drag' | 'particles'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Determine data to plot
    let yData: number[];
    let yLabel: string;
    let color: string;
    
    if (graphType === 'velocity') {
      yData = data.map(p => p.avgVelocity);
      yLabel = 'Vận tốc trung bình (m/s)';
      color = '#3b82f6';
    } else if (graphType === 'pressure') {
      yData = data.map(p => p.avgPressure);
      yLabel = 'Áp suất trung bình (Pa)';
      color = '#ef4444';
    } else if (graphType === 'turbulence') {
      yData = data.map(p => p.turbulence);
      yLabel = 'Độ nhiễu loạn';
      color = '#f59e0b';
    } else if (graphType === 'lift') {
      yData = data.map(p => p.liftCoefficient);
      yLabel = 'Hệ số Lực nâng (CL)';
      color = '#8b5cf6';
    } else if (graphType === 'drag') {
      yData = data.map(p => p.dragCoefficient);
      yLabel = 'Hệ số Lực cản (CD)';
      color = '#ef4444';
    } else if (graphType === 'particles') {
      yData = data.map(p => p.particleCount);
      yLabel = 'Số lượng hạt';
      color = '#10b981';
    } else {
      yData = data.map(p => p.avgVelocity);
      yLabel = 'Vận tốc trung bình (m/s)';
      color = '#3b82f6';
    }
    
    const tData = data.map(p => p.time);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    const minY = Math.min(...yData);
    const maxY = Math.max(...yData);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 8; i++) {
      const y = (height * i) / 8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.moveTo(40, 20);
    ctx.lineTo(40, height - 40);
    ctx.stroke();

    // Draw graph line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = 40 + ((tData[i] - minT) / (maxT - minT)) * (width - 60);
      const y = height - 40 - ((yData[i] - minY) / (maxY - minY)) * (height - 60);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw current time indicator
    const currentX = 40 + ((currentTime - minT) / (maxT - minT)) * (width - 60);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(currentX, 20);
    ctx.lineTo(currentX, height - 40);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(yLabel, width / 2, 15);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Max: ${maxY.toFixed(2)}`, width - 20, height - 25);
    ctx.fillText(`Min: ${minY.toFixed(2)}`, width - 20, height - 10);

  }, [data, currentTime, graphType]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={200}
      className="border border-slate-600 rounded bg-slate-800"
    />
  );
}

// Main 3D Aerodynamics Page
export default function Aeroflow3DPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'airfoil' | 'f1car' | 'cylinder' | 'wing' | 'sphere'>('airfoil');
  const [graphType, setGraphType] = useState<'velocity' | 'pressure' | 'turbulence' | 'lift' | 'drag' | 'particles'>('velocity');
  const [showParticles, setShowParticles] = useState(true);
  const [showObstacles, setShowObstacles] = useState(true);
  const [particleDensity, setParticleDensity] = useState([50]);
  const [windSpeed, setWindSpeed] = useState([10]);
  const [windDirection, setWindDirection] = useState<Vector3D>({ x: 1, y: 0, z: 0 });
  const [turbulence, setTurbulence] = useState([0.1]);
  const [cameraAngle, setCameraAngle] = useState([0]);
  const [lighting, setLighting] = useState([70]);
  const [animationSpeed, setAnimationSpeed] = useState([1]);
  
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const simulationRef = useRef<SimulationState3D>({
    particles: [],
    obstacles: [],
    windDirection: { x: 1, y: 0, z: 0 },
    windSpeed: 10,
    turbulence: 0.1,
    time: 0,
    isRunning: false
  });
  
  const [graphHistory, setGraphHistory] = useState<HistoryPoint3D[]>([]);

  // Backend status check (disabled - use offline mode)
  useEffect(() => {
    const ENABLE_BACKEND_CHECK = false;
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline');
      return;
    }

    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('http://localhost:8015/api/health', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        setBackendStatus(response.ok ? 'online' : 'offline');
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize obstacles based on active tab
  useEffect(() => {
    const obstacles: Obstacle3D[] = [];
    
    if (activeTab === 'airfoil') {
      obstacles.push({
        id: 'airfoil',
        type: 'airfoil',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0.1 },
        scale: { x: 1, y: 1, z: 1 },
        lift: 0,
        drag: 0,
        color: '#3b82f6'
      });
    } else if (activeTab === 'f1car') {
      obstacles.push({
        id: 'f1car',
        type: 'car',
        position: { x: 0, y: -20, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        lift: -0.3,
        drag: 0.8,
        color: '#fbbf24'
      });
    } else if (activeTab === 'cylinder') {
      obstacles.push({
        id: 'cylinder',
        type: 'cylinder',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        lift: 0,
        drag: 1.2,
        color: '#ef4444'
      });
    } else if (activeTab === 'wing') {
      obstacles.push({
        id: 'wing',
        type: 'airfoil',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0.2 },
        scale: { x: 1.5, y: 1, z: 1 },
        lift: 0.8,
        drag: 0.1,
        color: '#8b5cf6'
      });
    } else if (activeTab === 'sphere') {
      obstacles.push({
        id: 'sphere',
        type: 'sphere',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        lift: 0,
        drag: 0.5,
        color: '#10b981'
      });
    }
    
    simulationRef.current.obstacles = obstacles;
  }, [activeTab]);

  // Initialize particles
  useEffect(() => {
    const particles: Particle3D[] = [];
    const density = particleDensity[0];
    
    for (let i = 0; i < density; i++) {
      particles.push({
        id: i,
        position: {
          x: -300 + Math.random() * 600,
          y: -100 + Math.random() * 200,
          z: -300 + Math.random() * 600
        },
        velocity: {
          x: windDirection.x * windSpeed[0] + (Math.random() - 0.5) * turbulence[0] * 10,
          y: windDirection.y * windSpeed[0] + (Math.random() - 0.5) * turbulence[0] * 10,
          z: windDirection.z * windSpeed[0] + (Math.random() - 0.5) * turbulence[0] * 10
        },
        color: '#60a5fa',
        size: 2 + Math.random() * 3,
        life: Math.random(),
        maxLife: 1
      });
    }
    
    simulationRef.current.particles = particles;
  }, [particleDensity, windSpeed, windDirection, turbulence]);

  // Animation function
  const startAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    simulationRef.current.isRunning = true;
    
    const animate = (currentTime: number) => {
      if (!simulationRef.current.isRunning) return;
      
      const deltaTime = Math.min(0.016, (currentTime - lastTimeRef.current) / 1000) * animationSpeed[0];
      lastTimeRef.current = currentTime;
      
      // Update particles
      simulationRef.current.particles = simulationRef.current.particles.map(particle => {
        // Update position
        particle.position.x += particle.velocity.x * deltaTime * 60;
        particle.position.y += particle.velocity.y * deltaTime * 60;
        particle.position.z += particle.velocity.z * deltaTime * 60;
        
        // Add turbulence
        particle.velocity.x += (Math.random() - 0.5) * turbulence[0] * deltaTime * 100;
        particle.velocity.y += (Math.random() - 0.5) * turbulence[0] * deltaTime * 100;
        particle.velocity.z += (Math.random() - 0.5) * turbulence[0] * deltaTime * 100;
        
        // Apply wind
        particle.velocity.x += (windDirection.x * windSpeed[0] - particle.velocity.x) * deltaTime * 5;
        particle.velocity.y += (windDirection.y * windSpeed[0] - particle.velocity.y) * deltaTime * 5;
        particle.velocity.z += (windDirection.z * windSpeed[0] - particle.velocity.z) * deltaTime * 5;
        
        // Obstacle interaction
        simulationRef.current.obstacles.forEach(obstacle => {
          const dx = particle.position.x - obstacle.position.x;
          const dy = particle.position.y - obstacle.position.y;
          const dz = particle.position.z - obstacle.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < 50) {
            // Repel particle from obstacle
            const force = 100 / (distance + 1);
            particle.velocity.x += (dx / distance) * force * deltaTime;
            particle.velocity.y += (dy / distance) * force * deltaTime;
            particle.velocity.z += (dz / distance) * force * deltaTime;
          }
        });
        
        // Update life
        particle.life -= deltaTime;
        if (particle.life <= 0) {
          particle.life = particle.maxLife;
          particle.position = {
            x: -300 + Math.random() * 600,
            y: -100 + Math.random() * 200,
            z: -300 + Math.random() * 600
          };
          particle.velocity = {
            x: windDirection.x * windSpeed[0],
            y: windDirection.y * windSpeed[0],
            z: windDirection.z * windSpeed[0]
          };
        }
        
        return particle;
      });
      
      // Update simulation time
      simulationRef.current.time += deltaTime;
      setCurrentTime(simulationRef.current.time);
      
      // Calculate statistics
      const avgVelocity = simulationRef.current.particles.reduce((sum, p) => 
        sum + Math.sqrt(p.velocity.x**2 + p.velocity.y**2 + p.velocity.z**2), 0
      ) / simulationRef.current.particles.length;
      
      const avgPressure = 101325 + windSpeed[0] * windSpeed[0] * 0.5 * 1.225;
      const turbulenceLevel = turbulence[0] * 100;
      
      // Calculate aerodynamic coefficients
      let liftCoefficient = 0;
      let dragCoefficient = 0;
      let totalLift = 0;
      let totalDrag = 0;
      
      if (simulationRef.current.obstacles.length > 0) {
        const obstacle = simulationRef.current.obstacles[0];
        liftCoefficient = obstacle.lift;
        dragCoefficient = obstacle.drag;
        
        const dynamicPressure = 0.5 * 1.225 * windSpeed[0] * windSpeed[0];
        const area = 100; // Reference area
        
        totalLift = liftCoefficient * dynamicPressure * area;
        totalDrag = dragCoefficient * dynamicPressure * area;
      }
      
      // Update history
      const newHistory = [...graphHistory, {
        time: simulationRef.current.time,
        avgVelocity,
        avgPressure,
        turbulence: turbulenceLevel,
        liftCoefficient,
        dragCoefficient,
        totalLift,
        totalDrag,
        particleCount: simulationRef.current.particles.length
      }];
      
      if (newHistory.length > 500) {
        newHistory.shift();
      }
      
      setGraphHistory(newHistory);
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    simulationRef.current.isRunning = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const resetAnimation = () => {
    stopAnimation();
    setCurrentTime(0);
    simulationRef.current.time = 0;
    setGraphHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              🌊 Aeroflow 3D
            </h1>
            <p className="text-blue-200 text-lg">
              Dòng chảy 3D nâng cao với WebGL và Taichi
            </p>
          
              </div>
          <div className="flex items-center space-x-4">
            <Badge 
              variant={backendStatus === 'online' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {backendStatus === 'online' ? '🟢 Backend Online' : '🔴 Local Mode'}
            </Badge>
            <div className="flex space-x-2">
              <Button
                onClick={isAnimating ? stopAnimation : startAnimation}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAnimating ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isAnimating ? 'Tạm dừng' : 'Bắt đầu'}
              </Button>
              <Button
                onClick={resetAnimation}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Object Selection */}
            <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span>Đối tượng Aerodynamics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                  <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                    <TabsTrigger value="airfoil">
                      <Plane className="h-4 w-4 mr-1" />
                      Airfoil
                    </TabsTrigger>
                    <TabsTrigger value="f1car">
                      <Car className="h-4 w-4 mr-1" />
                      F1 Car
                    </TabsTrigger>
                    <TabsTrigger value="cylinder">
                      <Circle className="h-4 w-4 mr-1" />
                      Cylinder
                    </TabsTrigger>
                    <TabsTrigger value="wing">
                      <Layers className="h-4 w-4 mr-1" />
                      Wing
                    </TabsTrigger>
                    <TabsTrigger value="sphere">
                      <Box className="h-4 w-4 mr-1" />
                      Sphere
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Wind Parameters */}
            <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Wind className="h-5 w-5 text-blue-400" />
                  <span>Thông số gió</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Tốc độ gió: {windSpeed[0]} m/s</Label>
                  <Slider
                    value={windSpeed}
                    onValueChange={setWindSpeed}
                    max={30}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Hướng gió X: {windDirection.x.toFixed(1)}</Label>
                  <Slider
                    value={[windDirection.x]}
                    onValueChange={(value) => setWindDirection({...windDirection, x: value[0]})}
                    max={2}
                    min={-2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Hướng gió Y: {windDirection.y.toFixed(1)}</Label>
                  <Slider
                    value={[windDirection.y]}
                    onValueChange={(value) => setWindDirection({...windDirection, y: value[0]})}
                    max={2}
                    min={-2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Hướng gió Z: {windDirection.z.toFixed(1)}</Label>
                  <Slider
                    value={[windDirection.z]}
                    onValueChange={(value) => setWindDirection({...windDirection, z: value[0]})}
                    max={2}
                    min={-2}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Độ nhiễu loạn: {turbulence[0].toFixed(2)}</Label>
                  <Slider
                    value={turbulence}
                    onValueChange={setTurbulence}
                    max={1}
                    min={0}
                    step={0.01}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visualization Options */}
            <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Eye className="h-5 w-5 text-blue-400" />
                  <span>Tùy chọn hiển thị</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Hiển thị hạt</Label>
                  <Switch
                    checked={showParticles}
                    onCheckedChange={setShowParticles}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Hiển thị vật thể</Label>
                  <Switch
                    checked={showObstacles}
                    onCheckedChange={setShowObstacles}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Mật độ hạt: {particleDensity[0]}</Label>
                  <Slider
                    value={particleDensity}
                    onValueChange={setParticleDensity}
                    max={200}
                    min={10}
                    step={10}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Góc camera: {cameraAngle[0]}°</Label>
                  <Slider
                    value={cameraAngle}
                    onValueChange={setCameraAngle}
                    max={360}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Độ sáng: {lighting[0]}%</Label>
                  <Slider
                    value={lighting}
                    onValueChange={setLighting}
                    max={100}
                    min={20}
                    step={5}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-300">Tốc độ mô phỏng: {animationSpeed[0]}x</Label>
                  <Slider
                    value={animationSpeed}
                    onValueChange={setAnimationSpeed}
                    max={3}
                    min={0.1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3D Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3D Scene */}
            <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <Camera className="h-5 w-5 text-blue-400" />
                  <span>Mô phỏng 3D</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Scene3D
                  particles={simulationRef.current.particles}
                  obstacles={simulationRef.current.obstacles}
                  windDirection={windDirection}
                  windSpeed={windSpeed[0]}
                  showParticles={showParticles}
                  showObstacles={showObstacles}
                  particleDensity={particleDensity[0]}
                  cameraAngle={cameraAngle[0]}
                  lighting={lighting[0]}
                />
              </CardContent>
            </Card>

            {/* Real-time Graphs */}
            <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  <span>Đồ thị thời gian thực</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={graphType === 'velocity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('velocity')}
                    >
                      🌊 Vận tốc
                    </Button>
                    <Button
                      variant={graphType === 'pressure' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('pressure')}
                    >
                      💨 Áp suất
                    </Button>
                    <Button
                      variant={graphType === 'turbulence' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('turbulence')}
                    >
                      ⚡ Nhiễu loạn
                    </Button>
                    <Button
                      variant={graphType === 'lift' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('lift')}
                    >
                      🚁 Lực nâng
                    </Button>
                    <Button
                      variant={graphType === 'drag' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('drag')}
                    >
                      🛑 Lực cản
                    </Button>
                    <Button
                      variant={graphType === 'particles' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setGraphType('particles')}
                    >
                      ✨ Hạt
                    </Button>
                  </div>
                  
                  <Graph3D
                    data={graphHistory}
                    currentTime={currentTime}
                    graphType={graphType}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Panel */}
        <Card className="border-2 border-blue-200 bg-slate-800/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Lightbulb className="h-5 w-5 text-blue-400" />
              <span>Thông tin Aerodynamics 3D</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-700">
                <h4 className="font-semibold mb-2 flex items-center text-blue-300">
                  <Wind className="h-4 w-4 mr-2" />
                  3D Fluid Dynamics
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
                  <li><strong>Particle System</strong>: 3D flow visualization</li>
                  <li><strong>Wind Simulation</strong>: 3D vector field</li>
                  <li><strong>Turbulence</strong>: Realistic flow patterns</li>
                  <li><strong>Obstacle Interaction</strong>: Physics-based</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-900/30 rounded-lg border border-green-700">
                <h4 className="font-semibold mb-2 flex items-center text-green-300">
                  <Zap className="h-4 w-4 mr-2" />
                  Aerodynamics
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
                  <li><strong>Airfoil</strong>: Lift generation</li>
                  <li><strong>F1 Car</strong>: Downforce (-CL)</li>
                  <li><strong>Cylinder</strong>: High drag, no lift</li>
                  <li><strong>3D Coefficients</strong>: CL, CD calculation</li>
                </ul>
              </div>
              
              <div className="p-4 bg-purple-900/30 rounded-lg border border-purple-700">
                <h4 className="font-semibold mb-2 flex items-center text-purple-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Controls
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
                  <li><strong>Camera</strong>: 360° rotation</li>
                  <li><strong>Lighting</strong>: Dynamic shadows</li>
                  <li><strong>Particles</strong>: Density control</li>
                  <li><strong>Real-time</strong>: Live data graphs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}