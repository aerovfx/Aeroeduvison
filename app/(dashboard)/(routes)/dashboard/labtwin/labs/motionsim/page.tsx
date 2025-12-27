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
import { Activity, Play, Pause, RotateCcw, Loader2, Settings, Eye, LineChart, Grid3x3, Zap, Sparkles, Wind, Anchor, Link2 } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  mass: number;
  radius: number;
  color: string;
  fixed: boolean;
  trail: { x: number; y: number; alpha: number }[];
}

interface Spring {
  particle1: number;
  particle2: number;
  restLength: number;
  stiffness: number;
  damping: number;
}

interface SimulationData {
  particles: Particle[];
  springs: Spring[];
  totalEnergy: number;
  totalMomentum: { x: number; y: number };
  collisionCount: number;
}

interface HistoryPoint {
  time: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
  momentumX: number;
  momentumY: number;
  velocity: number[];
}

export default function MotionSimProPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [activeScenario, setActiveScenario] = useState('gravity');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Visualization options
  const [showVelocityVector, setShowVelocityVector] = useState(true);
  const [showForceVector, setShowForceVector] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showSprings, setShowSprings] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [graphType, setGraphType] = useState<'energy' | 'momentum' | 'velocity'>('energy');
  
  // Physics parameters
  const [gravity, setGravity] = useState(9.8);
  const [dragCoefficient, setDragCoefficient] = useState(0.1);
  const [restitution, setRestitution] = useState(0.9);
  const [windForce, setWindForce] = useState(0);
  const [particleCount, setParticleCount] = useState(5);
  const [springCount, setSpringCount] = useState(2);
  
  // Lab configuration
  const config = {
    name: "MotionSim Pro",
    title: "Mô phỏng chuyển động nâng cao",
    description: "Chuyển động phức tạp với va chạm và tương tác",
    category: "Cơ học",
    level: "Nâng cao",
    xp: 250,
    port: 8005
  };

  const [graphHistory, setGraphHistory] = useState<HistoryPoint[]>([]);

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    // Backend check disabled - use offline mode (client-side simulation)
    const ENABLE_BACKEND_CHECK = false;
    
    if (!ENABLE_BACKEND_CHECK) {
      setBackendStatus('offline');
      return;
    }

    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8005/api/health`, {
          signal: AbortSignal.timeout(2000)
        });
        if (response.ok) {
          setBackendStatus('online');
        } else {
          setBackendStatus('offline');
        }
      } catch (error) {
        setBackendStatus('offline');
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Create different scenarios
  const createScenario = (type: string): SimulationData => {
    const particles: Particle[] = [];
    const springs: Spring[] = [];
    
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    if (type === 'gravity') {
      // Falling particles with different masses
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          id: i,
          x: 2 + i * 1.5,
          y: 2 + Math.random() * 2,
          vx: (Math.random() - 0.5) * 2,
          vy: 0,
          ax: 0,
          ay: 0,
          mass: 0.5 + Math.random() * 2,
          radius: 0.2 + (0.5 + Math.random() * 2) * 0.1,
          color: colors[i % colors.length],
          fixed: false,
          trail: []
        });
      }
    } else if (type === 'orbit') {
      // Central fixed mass with orbiting particles
      particles.push({
        id: 0,
        x: 5,
        y: 5,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        mass: 10,
        radius: 0.5,
        color: '#f59e0b',
        fixed: true,
        trail: []
      });
      
      for (let i = 1; i < particleCount; i++) {
        const angle = (i / (particleCount - 1)) * Math.PI * 2;
        const distance = 2 + Math.random() * 1;
        const speed = Math.sqrt(50 / distance);
        
        particles.push({
          id: i,
          x: 5 + distance * Math.cos(angle),
          y: 5 + distance * Math.sin(angle),
          vx: -speed * Math.sin(angle),
          vy: speed * Math.cos(angle),
          ax: 0,
          ay: 0,
          mass: 0.5,
          radius: 0.15,
          color: colors[i % colors.length],
          fixed: false,
          trail: []
        });
      }
    } else if (type === 'springs') {
      // Spring-mass system
      const gridSize = Math.ceil(Math.sqrt(particleCount));
      let id = 0;
      
      for (let row = 0; row < gridSize && id < particleCount; row++) {
        for (let col = 0; col < gridSize && id < particleCount; col++) {
          const isFixed = row === 0 && col % 2 === 0;
          particles.push({
            id: id,
            x: 2 + col * 1.5,
            y: 1 + row * 1.5,
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            mass: 1,
            radius: 0.2,
            color: isFixed ? '#6b7280' : colors[id % colors.length],
            fixed: isFixed,
            trail: []
          });
          
          // Create springs
          if (col > 0) {
            springs.push({
              particle1: id - 1,
              particle2: id,
              restLength: 1.5,
              stiffness: 50,
              damping: 0.5
            });
          }
          if (row > 0) {
            springs.push({
              particle1: id - gridSize,
              particle2: id,
              restLength: 1.5,
              stiffness: 50,
              damping: 0.5
            });
          }
          
          id++;
        }
      }
    } else if (type === 'collision') {
      // Collision scenario
      for (let i = 0; i < particleCount; i++) {
        const side = i % 2;
        particles.push({
          id: i,
          x: side === 0 ? 2 : 8,
          y: 3 + i * 0.8,
          vx: side === 0 ? 3 + Math.random() * 2 : -(3 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 1,
          ax: 0,
          ay: 0,
          mass: 0.8 + Math.random() * 1.2,
          radius: 0.2 + (0.8 + Math.random() * 1.2) * 0.08,
          color: colors[i % colors.length],
          fixed: false,
          trail: []
        });
      }
    } else if (type === 'pendulum') {
      // Multiple pendulums
      for (let i = 0; i < particleCount; i++) {
        // Anchor point
        particles.push({
          id: i * 2,
          x: 2 + i * 1.5,
          y: 1,
          vx: 0,
          vy: 0,
          ax: 0,
          ay: 0,
          mass: 1,
          radius: 0.1,
          color: '#6b7280',
          fixed: true,
          trail: []
        });
        
        // Pendulum bob
        particles.push({
          id: i * 2 + 1,
          x: 2 + i * 1.5 + (Math.random() - 0.5) * 2,
          y: 4,
          vx: 0,
          vy: 0,
          ax: 0,
          ay: 0,
          mass: 1,
          radius: 0.2,
          color: colors[i % colors.length],
          fixed: false,
          trail: []
        });
        
        springs.push({
          particle1: i * 2,
          particle2: i * 2 + 1,
          restLength: 3,
          stiffness: 100,
          damping: 0.1
        });
      }
    }
    
    return {
      particles,
      springs: springs.slice(0, springCount),
      totalEnergy: 0,
      totalMomentum: { x: 0, y: 0 },
      collisionCount: 0
    };
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const data = createScenario(activeScenario);
      setSimulationData(data);
      setGraphHistory([]);
      setCurrentTime(0);
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  // Physics calculations
  const applyForces = (particles: Particle[], springs: Spring[], dt: number) => {
    // Reset accelerations
    particles.forEach(p => {
      if (!p.fixed) {
        p.ax = 0;
        p.ay = 0;
      }
    });
    
    // Apply gravity
    particles.forEach(p => {
      if (!p.fixed) {
        p.ay += gravity;
      }
    });
    
    // Apply wind
    if (windForce !== 0) {
      particles.forEach(p => {
        if (!p.fixed) {
          p.ax += windForce;
        }
      });
    }
    
    // Apply drag
    particles.forEach(p => {
      if (!p.fixed) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0.01) {
          const dragMag = dragCoefficient * speed * speed;
          p.ax -= (p.vx / speed) * dragMag / p.mass;
          p.ay -= (p.vy / speed) * dragMag / p.mass;
        }
      }
    });
    
    // Apply spring forces
    springs.forEach(spring => {
      const p1 = particles[spring.particle1];
      const p2 = particles[spring.particle2];
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.01) {
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Spring force
        const extension = distance - spring.restLength;
        const springForce = spring.stiffness * extension;
        
        // Damping force
        const dvx = p2.vx - p1.vx;
        const dvy = p2.vy - p1.vy;
        const relativeVelocity = dvx * nx + dvy * ny;
        const dampingForce = spring.damping * relativeVelocity;
        
        const totalForce = springForce + dampingForce;
        
        if (!p1.fixed) {
          p1.ax += (totalForce * nx) / p1.mass;
          p1.ay += (totalForce * ny) / p1.mass;
        }
        
        if (!p2.fixed) {
          p2.ax -= (totalForce * nx) / p2.mass;
          p2.ay -= (totalForce * ny) / p2.mass;
        }
      }
    });
    
    // Gravitational attraction (for orbit scenario)
    if (activeScenario === 'orbit') {
      const central = particles[0];
      for (let i = 1; i < particles.length; i++) {
        const p = particles[i];
        const dx = central.x - p.x;
        const dy = central.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist > 0.1) {
          const force = (50 * central.mass) / distSq;
          p.ax += (force * dx / dist) / p.mass;
          p.ay += (force * dy / dist) / p.mass;
        }
      }
    }
  };

  const checkCollision = (p1: Particle, p2: Particle): boolean => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= (p1.radius + p2.radius);
  };

  const resolveCollision = (p1: Particle, p2: Particle) => {
    if (p1.fixed && p2.fixed) return;
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    
    // Separate particles
    const overlap = (p1.radius + p2.radius) - distance;
    if (overlap > 0) {
      if (p1.fixed) {
        p2.x += nx * overlap;
        p2.y += ny * overlap;
      } else if (p2.fixed) {
        p1.x -= nx * overlap;
        p1.y -= ny * overlap;
      } else {
        const total = p1.mass + p2.mass;
        p1.x -= nx * overlap * (p2.mass / total);
        p1.y -= ny * overlap * (p2.mass / total);
        p2.x += nx * overlap * (p1.mass / total);
        p2.y += ny * overlap * (p1.mass / total);
      }
    }
    
    // Calculate relative velocity
    const dvx = p2.vx - p1.vx;
    const dvy = p2.vy - p1.vy;
    const dvn = dvx * nx + dvy * ny;
    
    if (dvn >= 0) return;
    
    // Apply impulse
    if (p1.fixed) {
      p2.vx -= (1 + restitution) * dvn * nx;
      p2.vy -= (1 + restitution) * dvn * ny;
    } else if (p2.fixed) {
      p1.vx += (1 + restitution) * dvn * nx;
      p1.vy += (1 + restitution) * dvn * ny;
    } else {
      const impulse = (-(1 + restitution) * dvn) / (1 / p1.mass + 1 / p2.mass);
      
      p1.vx -= (impulse / p1.mass) * nx;
      p1.vy -= (impulse / p1.mass) * ny;
      p2.vx += (impulse / p2.mass) * nx;
      p2.vy += (impulse / p2.mass) * ny;
    }
  };

  const startAnimation = () => {
    if (!simulationData) return;
    
    setIsAnimating(true);
    setCurrentTime(0);
    lastTimeRef.current = performance.now();
    
    let animationParticles = JSON.parse(JSON.stringify(simulationData.particles));
    let collisionCount = 0;
    const history: HistoryPoint[] = [];
    
    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.033) * animationSpeed;
      lastTimeRef.current = timestamp;
      
      // Apply forces
      applyForces(animationParticles, simulationData.springs, deltaTime);
      
      // Update velocities and positions (Velocity Verlet)
      animationParticles.forEach((p: Particle) => {
        if (!p.fixed) {
          p.vx += p.ax * deltaTime;
          p.vy += p.ay * deltaTime;
          p.x += p.vx * deltaTime;
          p.y += p.vy * deltaTime;
          
          // Wall collisions
          if (p.x - p.radius < 0) {
            p.x = p.radius;
            p.vx = -p.vx * restitution;
          }
          if (p.x + p.radius > 10) {
            p.x = 10 - p.radius;
            p.vx = -p.vx * restitution;
          }
          if (p.y - p.radius < 0) {
            p.y = p.radius;
            p.vy = -p.vy * restitution;
          }
          if (p.y + p.radius > 10) {
            p.y = 10 - p.radius;
            p.vy = -p.vy * restitution;
          }
          
          // Add trail
          if (showTrail && Math.random() < 0.2) {
            p.trail.push({ x: p.x, y: p.y, alpha: 1 });
            if (p.trail.length > 30) {
              p.trail.shift();
            }
            p.trail.forEach((point, i) => {
              point.alpha = i / p.trail.length;
            });
          }
        }
      });
      
      // Particle-to-particle collisions
      for (let i = 0; i < animationParticles.length; i++) {
        for (let j = i + 1; j < animationParticles.length; j++) {
          if (checkCollision(animationParticles[i], animationParticles[j])) {
            resolveCollision(animationParticles[i], animationParticles[j]);
            collisionCount++;
          }
        }
      }
      
      // Calculate physics quantities
      let kineticEnergy = 0;
      let potentialEnergy = 0;
      let momentumX = 0;
      let momentumY = 0;
      const velocities: number[] = [];
      
      animationParticles.forEach((p: Particle) => {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        kineticEnergy += 0.5 * p.mass * speed * speed;
        potentialEnergy += p.mass * gravity * (10 - p.y);
        momentumX += p.mass * p.vx;
        momentumY += p.mass * p.vy;
        velocities.push(speed);
      });
      
      // Spring potential energy
      simulationData.springs.forEach(spring => {
        const p1 = animationParticles[spring.particle1];
        const p2 = animationParticles[spring.particle2];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const extension = distance - spring.restLength;
        potentialEnergy += 0.5 * spring.stiffness * extension * extension;
      });
      
      const newTime = currentTime + deltaTime;
      history.push({
        time: newTime,
        kineticEnergy,
        potentialEnergy,
        totalEnergy: kineticEnergy + potentialEnergy,
        momentumX,
        momentumY,
        velocity: velocities
      });
      
      if (history.length > 500) {
        history.shift();
      }
      
      // Update state
      setSimulationData(prev => prev ? {
        ...prev,
        particles: [...animationParticles],
        totalEnergy: kineticEnergy + potentialEnergy,
        totalMomentum: { x: momentumX, y: momentumY },
        collisionCount
      } : null);
      setGraphHistory([...history]);
      setCurrentTime(newTime);
      
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
    runSimulation();
  };

  useEffect(() => {
    if (!isAnimating && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, [isAnimating]);

  // Canvas drawing
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
    gradient.addColorStop(0, '#f0f9ff');
    gradient.addColorStop(0.5, '#e0f2fe');
    gradient.addColorStop(1, '#dbeafe');
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
    
    // Draw springs
    if (showSprings && simulationData.springs.length > 0) {
      simulationData.springs.forEach(spring => {
        const p1 = simulationData.particles[spring.particle1];
        const p2 = simulationData.particles[spring.particle2];
        
        const x1 = p1.x * scale;
        const y1 = p1.y * scale;
        const x2 = p2.x * scale;
        const y2 = p2.y * scale;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const extension = distance - spring.restLength * scale;
        
        // Color based on extension
        const stress = Math.abs(extension) / (spring.restLength * scale);
        const color = stress > 0.2 ? '#ef4444' : stress > 0.1 ? '#f59e0b' : '#10b981';
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }
    
    // Draw trails
    if (showTrail) {
      simulationData.particles.forEach((p) => {
        p.trail.forEach((point) => {
          ctx.fillStyle = hexToRgba(p.color, point.alpha * 0.4);
          ctx.beginPath();
          ctx.arc(point.x * scale, point.y * scale, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      });
    }
    
    // Draw particles
    simulationData.particles.forEach((p) => {
      const x = p.x * scale;
      const y = p.y * scale;
      const r = p.radius * scale;
      
      // Shadow
      if (!p.fixed) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
      }
      
      // Particle gradient
      const pGradient = ctx.createRadialGradient(x - r/3, y - r/3, 0, x, y, r);
      pGradient.addColorStop(0, p.fixed ? '#9ca3af' : hexToRgba(p.color, 0.3));
      pGradient.addColorStop(0.7, p.fixed ? '#6b7280' : p.color);
      pGradient.addColorStop(1, hexToRgba(p.fixed ? '#4b5563' : p.color, 0.8));
      
      ctx.fillStyle = pGradient;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Particle outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.stroke();
      
      // Mass label
      if (!p.fixed && r > 15) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${p.mass.toFixed(1)}`, x, y);
      }
      
      // Fixed anchor
      if (p.fixed) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('⚓', x, y);
      }
      
      // Velocity vector
      if (showVelocityVector && !p.fixed) {
        const vScale = 0.3;
        const vx = p.vx * scale * vScale;
        const vy = p.vy * scale * vScale;
        
        if (Math.abs(vx) > 2 || Math.abs(vy) > 2) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + vx, y + vy);
          ctx.stroke();
          
          const angle = Math.atan2(vy, vx);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.moveTo(x + vx, y + vy);
          ctx.lineTo(
            x + vx - 8 * Math.cos(angle - Math.PI / 6),
            y + vy - 8 * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x + vx - 8 * Math.cos(angle + Math.PI / 6),
            y + vy - 8 * Math.sin(angle + Math.PI / 6)
          );
          ctx.fill();
        }
      }
      
      // Force vector (acceleration)
      if (showForceVector && !p.fixed) {
        const fScale = 0.5;
        const fx = p.ax * scale * fScale;
        const fy = p.ay * scale * fScale;
        
        if (Math.abs(fx) > 2 || Math.abs(fy) > 2) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + fx, y + fy);
          ctx.stroke();
          
          const angle = Math.atan2(fy, fx);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(x + fx, y + fy);
          ctx.lineTo(
            x + fx - 8 * Math.cos(angle - Math.PI / 6),
            y + fy - 8 * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            x + fx - 8 * Math.cos(angle + Math.PI / 6),
            y + fy - 8 * Math.sin(angle + Math.PI / 6)
          );
          ctx.fill();
        }
      }
    });
    
    // Draw info panel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(10, 10, 220, 110);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 220, 110);
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`⏱️ Time: ${currentTime.toFixed(2)} s`, 20, 28);
    ctx.fillText(`⚡ Total E: ${simulationData.totalEnergy.toFixed(1)} J`, 20, 45);
    ctx.fillText(`💫 Momentum: ${Math.sqrt(simulationData.totalMomentum.x**2 + simulationData.totalMomentum.y**2).toFixed(1)} kg⋅m/s`, 20, 62);
    ctx.fillText(`🎯 Collisions: ${simulationData.collisionCount}`, 20, 79);
    ctx.fillText(`🔵 Particles: ${simulationData.particles.length}`, 20, 96);
    ctx.fillText(`🔗 Springs: ${simulationData.springs.length}`, 20, 113);
    
  }, [simulationData, showGrid, showTrail, showVelocityVector, showForceVector, showSprings, currentTime]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Mô phỏng chuyển động nâng cao
          </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Chuyển động phức tạp với va chạm và tương tác
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
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>Simulation Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeScenario} onValueChange={setActiveScenario}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="gravity">
                  <Zap className="h-4 w-4 mr-1" />
                  Trọng lực
                </TabsTrigger>
                <TabsTrigger value="orbit">
                  <Activity className="h-4 w-4 mr-1" />
                  Quỹ đạo
                </TabsTrigger>
                <TabsTrigger value="springs">
                  <Link2 className="h-4 w-4 mr-1" />
                  Lò xo
                </TabsTrigger>
              </TabsList>
              
              <TabsList className="grid w-full grid-cols-2 mt-2">
                <TabsTrigger value="collision">
                  💥 Va chạm
                </TabsTrigger>
                <TabsTrigger value="pendulum">
                  <Anchor className="h-4 w-4 mr-1" />
                  Con lắc
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeScenario} className="space-y-4 mt-4">
                <div>
                  <Label>Số hạt: {particleCount}</Label>
                  <Slider
                    value={[particleCount]}
                    onValueChange={([value]) => setParticleCount(value)}
                    min={2}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Trọng lực (m/s²): {gravity.toFixed(1)}</Label>
                  <Slider
                    value={[gravity]}
                    onValueChange={([value]) => setGravity(value)}
                    min={0}
                    max={20}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Lực cản không khí: {dragCoefficient.toFixed(2)}</Label>
                  <Slider
                    value={[dragCoefficient]}
                    onValueChange={([value]) => setDragCoefficient(value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Hệ số phục hồi: {restitution.toFixed(2)}</Label>
                  <Slider
                    value={[restitution]}
                    onValueChange={([value]) => setRestitution(value)}
                    min={0}
                    max={1}
                    step={0.05}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Lực gió (→): {windForce.toFixed(1)}</Label>
                  <Slider
                    value={[windForce]}
                    onValueChange={([value]) => setWindForce(value)}
                    min={-5}
                    max={5}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
                
                {(activeScenario === 'springs' || activeScenario === 'pendulum') && (
                  <div>
                    <Label>Số lò xo: {springCount}</Label>
                    <Slider
                      value={[springCount]}
                      onValueChange={([value]) => setSpringCount(value)}
                      min={1}
                      max={15}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Button 
                  onClick={runSimulation}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-2">Tạo mô phỏng</span>
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
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualization */}
        <Card className="border-2 border-purple-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span>Simulation Arena</span>
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
                className="border-2 border-blue-200 rounded-lg shadow-lg w-full"
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
                    Vận tốc
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showForceVector} 
                    onCheckedChange={setShowForceVector}
                    id="force-toggle"
                  />
                  <Label htmlFor="force-toggle" className="cursor-pointer flex items-center">
                    <div className="w-4 h-1 bg-red-500 mr-2"></div>
                    Lực
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={showSprings} 
                    onCheckedChange={setShowSprings}
                    id="springs-toggle"
                  />
                  <Label htmlFor="springs-toggle" className="cursor-pointer flex items-center">
                    <Link2 className="h-4 w-4 mr-1" />
                    Lò xo
                  </Label>
                </div>
              </div>
              
              {simulationData && (
                <div className="grid grid-cols-2 gap-3 text-sm p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">⚡ Tổng năng lượng:</span>
                    <span className="text-blue-700 font-bold">
                      {simulationData.totalEnergy.toFixed(2)} J
                    </span>
                  </div>
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">💫 Động lượng:</span>
                    <span className="text-purple-700 font-bold">
                      {Math.sqrt(
                        simulationData.totalMomentum.x ** 2 + 
                        simulationData.totalMomentum.y ** 2
                      ).toFixed(2)} kg⋅m/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center col-span-2">
                    <span className="font-medium text-gray-700">🎯 Kịch bản:</span>
                    <span className="text-green-700 font-bold">
                      {activeScenario === 'gravity' && 'Rơi tự do'}
                      {activeScenario === 'orbit' && 'Quỹ đạo'}
                      {activeScenario === 'springs' && 'Hệ lò xo'}
                      {activeScenario === 'collision' && 'Va chạm'}
                      {activeScenario === 'pendulum' && 'Con lắc'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      
              </div>

      {/* Real-time Graphs */}
      <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LineChart className="h-5 w-5 text-blue-600" />
              <span>Phân tích Real-time</span>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={graphType === 'energy' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGraphType('energy')}
                className={graphType === 'energy' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
              >
                ⚡ Năng lượng
              </Button>
              <Button
                variant={graphType === 'momentum' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGraphType('momentum')}
                className={graphType === 'momentum' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
              >
                💫 Động lượng
              </Button>
              <Button
                variant={graphType === 'velocity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGraphType('velocity')}
                className={graphType === 'velocity' ? 'bg-gradient-to-r from-blue-600 to-purple-600' : ''}
              >
                🚀 Vận tốc
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhysicsGraphCanvas 
            data={graphHistory}
            currentTime={currentTime}
            graphType={graphType}
          />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Thông tin Simulation
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
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-3xl mb-2">🔬</div>
              <h4 className="font-semibold text-green-900">Danh mục</h4>
              <p className="text-sm text-green-700">{config.category}</p>
            </div>
            <div className="text-center p-4 border-2 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-orange-900">Status</h4>
              <Badge variant={backendStatus === 'online' ? 'default' : 'secondary'} className="mt-1">
                {backendStatus === 'online' ? 'Online' : 'Local'}
              </Badge>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Zap className="h-4 w-4 mr-2 text-blue-600" />
              Các kịch bản mô phỏng
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li><strong>Trọng lực</strong>: Các hạt rơi tự do dưới tác dụng của trọng lực</li>
              <li><strong>Quỹ đạo</strong>: Hệ hành tinh với lực hấp dẫn hướng tâm</li>
              <li><strong>Lò xo</strong>: Hệ khối lượng - lò xo với dao động</li>
              <li><strong>Va chạm</strong>: Va chạm đàn hồi giữa nhiều hạt</li>
              <li><strong>Con lắc</strong>: Nhiều con lắc dao động độc lập</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-yellow-600" />
              Các lực và tương tác
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>⬇️ <strong>Trọng lực</strong>: F = m × g (điều chỉnh được)</li>
              <li>💨 <strong>Lực gió</strong>: Lực ngang tác động lên tất cả hạt</li>
              <li>🌊 <strong>Lực cản</strong>: F = -k × v² (tỷ lệ với bình phương vận tốc)</li>
              <li>🔗 <strong>Lực lò xo</strong>: F = -k × Δx - c × v</li>
              <li>🌌 <strong>Hấp dẫn</strong>: F = G × m₁ × m₂ / r²</li>
              <li>💥 <strong>Va chạm</strong>: Bảo toàn động lượng với hệ số phục hồi</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <h4 className="font-semibold mb-2 flex items-center">
              <Settings className="h-4 w-4 mr-2 text-green-600" />
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>Chọn một kịch bản mô phỏng từ các tab</li>
              <li>Điều chỉnh các tham số: số hạt, trọng lực, lực cản, v.v.</li>
              <li>Nhấn <strong>&quot;Tạo mô phỏng&quot;</strong> để khởi tạo hệ thống</li>
              <li>Nhấn <strong>&quot;Chạy&quot;</strong> để bắt đầu mô phỏng động</li>
              <li>Quan sát vector vận tốc (xanh lá) và lực (đỏ)</li>
              <li>Xem đồ thị real-time để phân tích năng lượng và động lượng</li>
              <li>Điều chỉnh tốc độ mô phỏng theo ý muốn</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Physics Graph Canvas Component
function PhysicsGraphCanvas({ 
  data, 
  currentTime, 
  graphType 
}: { 
  data: HistoryPoint[], 
  currentTime: number, 
  graphType: 'energy' | 'momentum' | 'velocity'
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
    bgGradient.addColorStop(0, '#f0f9ff');
    bgGradient.addColorStop(0.5, '#e0f2fe');
    bgGradient.addColorStop(1, '#dbeafe');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Get data based on graph type
    let datasets: { data: number[], label: string, color: string }[] = [];
    
    if (graphType === 'energy') {
      datasets = [
        { data: data.map(p => p.kineticEnergy), label: 'Động năng (J)', color: '#3b82f6' },
        { data: data.map(p => p.potentialEnergy), label: 'Thế năng (J)', color: '#10b981' },
        { data: data.map(p => p.totalEnergy), label: 'Tổng năng lượng (J)', color: '#8b5cf6' }
      ];
    } else if (graphType === 'momentum') {
      datasets = [
        { data: data.map(p => p.momentumX), label: 'Động lượng X (kg⋅m/s)', color: '#ef4444' },
        { data: data.map(p => p.momentumY), label: 'Động lượng Y (kg⋅m/s)', color: '#f59e0b' },
        { data: data.map(p => Math.sqrt(p.momentumX**2 + p.momentumY**2)), label: 'Tổng động lượng (kg⋅m/s)', color: '#8b5cf6' }
      ];
    } else {
      // Velocity - show first 3 particles
      const maxParticles = Math.min(3, data[0]?.velocity.length || 0);
      const colors = ['#3b82f6', '#ef4444', '#10b981'];
      for (let i = 0; i < maxParticles; i++) {
        datasets.push({
          data: data.map(p => p.velocity[i] || 0),
          label: `Vận tốc hạt ${i+1} (m/s)`,
          color: colors[i]
        });
      }
    }
    
    const tData = data.map(p => p.time);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    
    // Find global min/max for Y
    const allYData = datasets.flatMap(d => d.data);
    const minY = Math.min(...allYData);
    const maxY = Math.max(...allYData);
    
    const rangeT = maxT - minT || 1;
    const rangeY = maxY - minY || 1;
    
    const scaleX = graphWidth / rangeT;
    const scaleY = graphHeight / (rangeY * 1.2);
    
    const toScreenX = (t: number) => padding + (t - minT) * scaleX;
    const toScreenY = (y: number) => height - padding - ((y - minY) + rangeY * 0.1) * scaleY;
    
    // Draw grid
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
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
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Draw datasets
    datasets.forEach((dataset, idx) => {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = dataset.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      data.forEach((point, i) => {
        const x = toScreenX(point.time);
        const y = toScreenY(dataset.data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    
    // Draw current time indicator
    const currentIdx = data.findIndex(p => p.time >= currentTime);
    if (currentIdx >= 0) {
      const currentX = toScreenX(data[currentIdx].time);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentX, padding);
      ctx.lineTo(currentX, height - padding);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Current points
      datasets.forEach((dataset) => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = dataset.color;
        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(toScreenX(data[currentIdx].time), toScreenY(dataset.data[currentIdx]), 5, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
    
    // Labels
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⏱️ Thời gian (s)', width / 2, height - 10);
    
    // Y-axis label
    let yAxisLabel = '';
    if (graphType === 'energy') {
      yAxisLabel = '⚡ Năng lượng';
    } else if (graphType === 'momentum') {
      yAxisLabel = '💫 Động lượng';
    } else {
      yAxisLabel = '🚀 Vận tốc';
    }
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();
    
    // Legend
    const legendX = width - 280;
    const legendY = 15;
    const legendHeight = datasets.length * 25 + 20;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX - 10, legendY, 270, legendHeight);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY, 270, legendHeight);
    
    datasets.forEach((dataset, idx) => {
      ctx.fillStyle = dataset.color;
      ctx.fillRect(legendX, legendY + 10 + idx * 25, 25, 4);
      ctx.fillStyle = '#1e293b';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(dataset.label, legendX + 30, legendY + 14 + idx * 25);
    });
    
    // Axis tick labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const t = minT + (i / 5) * rangeT;
      const x = toScreenX(t);
      ctx.fillText(t.toFixed(1), x, height - padding + 20);
    }
    
    // Y axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = minY + (i / 5) * rangeY;
      const screenY = toScreenY(y);
      ctx.fillText(y.toFixed(1), padding - 10, screenY + 3);
    }
    
  }, [data, currentTime, graphType]);
  
  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={350}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full"
    />
    </VisionThemeWrapper>
  );
}
