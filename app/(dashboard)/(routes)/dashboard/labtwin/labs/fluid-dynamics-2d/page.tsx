'use client';

"use client";

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, Play, RotateCcw, Activity, Loader2, Pause, LineChart, Zap, Target, Circle, Droplet, Wind, Eye, Sparkles, Waves } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'rectangle' | 'circle' | 'airfoil' | 'car' | 'cylinder';
  radius?: number;
  angle?: number; // for airfoil angle of attack
  lift?: number;
  drag?: number;
}

interface HistoryPoint {
  time: number;
  avgVelocity: number;
  avgPressure: number;
  avgVorticity: number;
  turbulence: number;
  liftCoefficient: number;
  dragCoefficient: number;
  totalLift: number;
  totalDrag: number;
}

// Helper function to draw airfoil shape
function drawAirfoil(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, angle: number = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  const chord = width;
  const thickness = height * 0.12; // 12% thickness ratio
  
  ctx.beginPath();
  
  // Upper surface (NACA 0012 approximation)
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const xt = t * chord;
    const yt = thickness * chord * 5 * (0.2969 * Math.sqrt(t) - 0.1260 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1036 * t * t * t * t);
    
    if (i === 0) {
      ctx.moveTo(xt, yt);
    } else {
      ctx.lineTo(xt, yt);
    }
  }
  
  // Lower surface
  for (let i = 100; i >= 0; i--) {
    const t = i / 100;
    const xt = t * chord;
    const yt = -thickness * chord * 5 * (0.2969 * Math.sqrt(t) - 0.1260 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1036 * t * t * t * t);
    
    ctx.lineTo(xt, yt);
  }
  
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.restore();
}

// Helper function to draw F1 car shape
function drawF1Car(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  ctx.save();
  ctx.translate(x, y);
  
  // Main car body (yellow F1 style)
  ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.strokeStyle = 'rgba(200, 170, 0, 0.8)';
  ctx.lineWidth = 2;
  
  // Car body outline
  ctx.beginPath();
  ctx.moveTo(width * 0.05, height * 0.4);
  ctx.quadraticCurveTo(width * 0.15, height * 0.2, width * 0.25, height * 0.15);
  ctx.lineTo(width * 0.75, height * 0.15);
  ctx.quadraticCurveTo(width * 0.85, height * 0.2, width * 0.95, height * 0.4);
  ctx.lineTo(width * 0.95, height * 0.6);
  ctx.quadraticCurveTo(width * 0.85, height * 0.8, width * 0.75, height * 0.85);
  ctx.lineTo(width * 0.25, height * 0.85);
  ctx.quadraticCurveTo(width * 0.15, height * 0.8, width * 0.05, height * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Front wing
  ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
  ctx.fillRect(0, height * 0.35, width * 0.08, height * 0.05);
  ctx.fillRect(0, height * 0.6, width * 0.08, height * 0.05);
  
  // Rear wing
  ctx.fillRect(width * 0.92, height * 0.35, width * 0.08, height * 0.05);
  ctx.fillRect(width * 0.92, height * 0.6, width * 0.08, height * 0.05);
  
  // Wheels (dark circles for turbulence zones)
  ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.1, height * 0.08, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.9, height * 0.08, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.1, height * 0.08, 0, 2 * Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.9, height * 0.08, 0, 2 * Math.PI);
  ctx.fill();
  
  // Cockpit
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.fillRect(width * 0.35, height * 0.25, width * 0.3, height * 0.5);
  
  // Sidepods
  ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
  ctx.fillRect(width * 0.45, height * 0.3, width * 0.15, height * 0.4);
  ctx.fillRect(width * 0.4, height * 0.3, width * 0.15, height * 0.4);
  
  ctx.restore();
}

// Fluid Grid Canvas Component
function FluidGridCanvas({ 
  velocityField, 
  pressureField,
  vorticityField,
  displayMode,
  obstacles,
  showParticles,
  showVectors,
  vectorDensity
}: { 
  velocityField: number[][][], 
  pressureField: number[][],
  vorticityField: number[][],
  displayMode: 'velocity' | 'pressure' | 'vorticity',
  obstacles: Obstacle[],
  showParticles: boolean,
  showVectors: boolean,
  vectorDensity: number[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || velocityField.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with CFD-style background (darker for better vector visibility)
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#1e3a8a'); // Dark blue
    bgGradient.addColorStop(0.5, '#1e40af'); // Medium blue  
    bgGradient.addColorStop(1, '#1d4ed8'); // Lighter blue
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    const gridWidth = velocityField.length;
    const gridHeight = velocityField[0].length;
    const cellWidth = width / gridWidth;
    const cellHeight = height / gridHeight;
    
    // Draw field based on display mode
    if (displayMode === 'velocity') {
      // Draw velocity field with CFD-style visualization
      const maxSpeed = Math.max(...velocityField.flat().map(v => Math.sqrt(v[0]**2 + v[1]**2)));
      
      for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
          const vx = velocityField[i][j][0];
          const vy = velocityField[i][j][1];
          const speed = Math.sqrt(vx * vx + vy * vy);
          
          // CFD-style color mapping (dark blue to bright yellow/red for better contrast)
          let r, g, b;
          if (maxSpeed > 0) {
            const normalizedSpeed = speed / maxSpeed;
            if (normalizedSpeed < 0.25) {
              // Dark blue to cyan
              const t = normalizedSpeed / 0.25;
              r = Math.floor(30 * t);
              g = Math.floor(100 + 155 * t);
              b = Math.floor(200 + 55 * t);
            } else if (normalizedSpeed < 0.5) {
              // Cyan to green
              const t = (normalizedSpeed - 0.25) / 0.25;
              r = Math.floor(30 + 50 * t);
              g = 255;
              b = Math.floor(255 * (1 - t));
            } else if (normalizedSpeed < 0.75) {
              // Green to yellow
              const t = (normalizedSpeed - 0.5) / 0.25;
              r = Math.floor(80 + 175 * t);
              g = 255;
              b = Math.floor(100 * (1 - t));
            } else {
              // Yellow to red
              const t = (normalizedSpeed - 0.75) / 0.25;
              r = 255;
              g = Math.floor(255 * (1 - t));
              b = 0;
            }
          } else {
            r = g = b = 30;
          }
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
          ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
      }
    } else if (displayMode === 'pressure') {
      // Draw pressure field
      for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
          const pressure = pressureField[i][j];
          
          // Color based on pressure
          const intensity = Math.max(0, Math.min(100, 50 + pressure * 50));
          const hue = pressure > 0 ? 0 : 240; // Red for high, Blue for low
          
          ctx.fillStyle = `hsl(${hue}, 70%, ${intensity}%)`;
          ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
      }
    } else if (displayMode === 'vorticity') {
      // Draw vorticity field
      for (let i = 0; i < gridWidth; i++) {
        for (let j = 0; j < gridHeight; j++) {
          const vort = vorticityField[i][j];
          
          // Color based on vorticity
          const intensity = Math.max(0, Math.min(100, 50 + Math.abs(vort) * 100));
          const hue = vort > 0 ? 60 : 280; // Yellow for positive, Purple for negative
          
          ctx.fillStyle = `hsl(${hue}, 70%, ${intensity}%)`;
          ctx.fillRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
        }
      }
    }
    
    // Draw velocity vectors (CFD style like the image - white vectors on colored background)
    const maxSpeed = Math.max(...velocityField.flat().map(v => Math.sqrt(v[0]**2 + v[1]**2)));
    
    // Higher density vectors for better flow visualization (like the image)
    const density = vectorDensity[0];
    for (let i = 0; i < gridWidth; i += density) {
      for (let j = 0; j < gridHeight; j += density) {
        const vx = velocityField[i][j][0];
        const vy = velocityField[i][j][1];
        const speed = Math.sqrt(vx * vx + vy * vy);
        
        if (speed > 0.03 && maxSpeed > 0) {
          const x = (i + 0.5) * cellWidth;
          const y = (j + 0.5) * cellHeight;
          
          // Vector length proportional to speed (shorter for better visibility)
          const normalizedSpeed = speed / maxSpeed;
          const len = Math.max(6, Math.min(18, normalizedSpeed * 15));
          
          // White vectors with slight transparency (like the image)
          const vectorColor = `rgba(255, 255, 255, ${0.7 + normalizedSpeed * 0.3})`;
          
          // Draw vector arrow
          const angle = Math.atan2(vy, vx);
          const endX = x + Math.cos(angle) * len;
          const endY = y + Math.sin(angle) * len;
          
          // Arrow shaft (thinner, more elegant)
          ctx.strokeStyle = vectorColor;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          
          // Arrow head (smaller, more proportional)
          ctx.fillStyle = vectorColor;
          const headLength = Math.max(2, len * 0.2);
          const headAngle = Math.PI / 4;
          
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - headAngle),
            endY - headLength * Math.sin(angle - headAngle)
          );
          ctx.lineTo(
            endX - headLength * Math.cos(angle + headAngle),
            endY - headLength * Math.sin(angle + headAngle)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    
    // Draw obstacles
    obstacles.forEach(obs => {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.lineWidth = 2;
      
      if (obs.type === 'rectangle') {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'circle' && obs.radius) {
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (obs.type === 'airfoil') {
        drawAirfoil(ctx, obs.x, obs.y, obs.width, obs.height, obs.angle || 0);
      } else if (obs.type === 'car') {
        drawF1Car(ctx, obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'cylinder') {
        // Draw cylinder (for comparison)
        ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius || obs.width/2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    
    // Draw velocity legend bar (CFD style)
    if (displayMode === 'velocity') {
      const legendWidth = 30;
      const legendHeight = 200;
      const legendX = 10;
      const legendY = 10;
      const maxSpeed = Math.max(...velocityField.flat().map(v => Math.sqrt(v[0]**2 + v[1]**2)));
      
      // Draw legend background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(legendX - 5, legendY - 5, legendWidth + 80, legendHeight + 20);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(legendX - 5, legendY - 5, legendWidth + 80, legendHeight + 20);
      
      // Draw color gradient
      for (let i = 0; i < legendHeight; i++) {
        const t = i / legendHeight;
        let r, g, b;
        
        if (t < 0.25) {
          // Blue to cyan
          const localT = t / 0.25;
          r = 0;
          g = Math.floor(255 * localT);
          b = 255;
        } else if (t < 0.5) {
          // Cyan to green
          const localT = (t - 0.25) / 0.25;
          r = 0;
          g = 255;
          b = Math.floor(255 * (1 - localT));
        } else if (t < 0.75) {
          // Green to yellow
          const localT = (t - 0.5) / 0.25;
          r = Math.floor(255 * localT);
          g = 255;
          b = 0;
        } else {
          // Yellow to red
          const localT = (t - 0.75) / 0.25;
          r = 255;
          g = Math.floor(255 * (1 - localT));
          b = 0;
        }
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(legendX, legendY + i, legendWidth, 1);
      }
      
      // Draw legend labels
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(t('physics-motion.velocity'), legendX - 5, legendY - 10);
      ctx.font = '10px Arial';
      ctx.fillText('[m/s]', legendX - 5, legendY + legendHeight + 15);
      
      // Draw scale values
      const scaleValues = [0, 0.25, 0.5, 0.75, 1];
      scaleValues.forEach((scale, index) => {
        const value = (1 - scale) * maxSpeed;
        const y = legendY + scale * legendHeight;
        
        ctx.fillStyle = '#000000';
        ctx.font = '9px Arial';
        ctx.fillText(value.toExponential(2), legendX + legendWidth + 5, y + 3);
        
        // Draw tick marks
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(legendX + legendWidth, y);
        ctx.lineTo(legendX + legendWidth + 3, y);
        ctx.stroke();
      });
    }
    
  }, [velocityField, pressureField, vorticityField, displayMode, obstacles, showParticles, showVectors, vectorDensity]);
  
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full bg-gradient-to-br from-blue-50 to-white"
    />
  );
}

// Particle Canvas Component
function ParticleCanvas({ 
  particles,
  obstacles
}: { 
  particles: Particle[],
  obstacles: Obstacle[]
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear with fade effect (light background)
    ctx.fillStyle = 'rgba(230, 243, 255, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw particles
    particles.forEach(p => {
      const alpha = p.life;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw particle trail
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.5) {
        ctx.strokeStyle = p.color.replace(')', `, ${alpha * 0.3})`).replace('rgb', 'rgba');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 5, p.y - p.vy * 5);
        ctx.stroke();
      }
    });
    
    // Draw obstacles
    obstacles.forEach(obs => {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
      ctx.lineWidth = 2;
      
      if (obs.type === 'rectangle') {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === 'circle' && obs.radius) {
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
    });
    
  }, [particles, obstacles]);
  
  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full bg-gradient-to-br from-blue-50 to-white"
    />
  );
}

// Graph Canvas Component
function FluidGraphCanvas({ 
  data, 
  currentTime, 
  graphType
}: { 
  data: HistoryPoint[], 
  currentTime: number, 
  graphType: 'velocity' | 'pressure' | 'vorticity' | 'turbulence' | 'lift' | 'drag'
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
    let yData: number[] = [];
    let yLabel = '';
    let color = '#3b82f6';
    
    if (graphType === 'velocity') {
      yData = data.map(p => p.avgVelocity);
      yLabel = 'Vận tốc trung bình (m/s)';
      color = '#10b981';
    } else if (graphType === 'pressure') {
      yData = data.map(p => p.avgPressure);
      yLabel = 'Áp suất trung bình (Pa)';
      color = '#ef4444';
    } else if (graphType === 'vorticity') {
      yData = data.map(p => p.avgVorticity);
      yLabel = 'Độ xoáy trung bình (1/s)';
      color = '#8b5cf6';
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
    }
    
    const tData = data.map(p => p.time);
    const minT = Math.min(...tData);
    const maxT = Math.max(...tData);
    const minY = Math.min(...yData);
    const maxY = Math.max(...yData);
    
    const rangeT = maxT - minT || 1;
    const rangeY = maxY - minY || 1;
    
    const scaleX = graphWidth / rangeT;
    const scaleY = graphHeight / (rangeY * 1.2);
    
    const toScreenX = (t: number) => padding + (t - minT) * scaleX;
    const toScreenY = (y: number) => height - padding - ((y - minY) + rangeY * 0.1) * scaleY;
    
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
    
    // Draw line with glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color + '80';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    data.forEach((point, i) => {
      const x = toScreenX(point.time);
      const y = toScreenY(yData[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Fill area under curve
    ctx.fillStyle = color + '20';
    ctx.beginPath();
    ctx.moveTo(toScreenX(data[0].time), height - padding);
    data.forEach((point, i) => {
      ctx.lineTo(toScreenX(point.time), toScreenY(yData[i]));
    });
    ctx.lineTo(toScreenX(data[data.length - 1].time), height - padding);
    ctx.closePath();
    ctx.fill();
    
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
      
      // Current point
      ctx.shadowBlur = 10;
      ctx.shadowColor = color + 'CC';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(toScreenX(data[currentIdx].time), toScreenY(yData[currentIdx]), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Labels
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('⏱️ Thời gian (s)', width / 2 - 40, height - 10);
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
    
    // Legend
    const legendX = width - 220;
    const legendY = 15;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(legendX - 10, legendY, 210, 30);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 10, legendY, 210, 30);
    
    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY + 10, 25, 4);
    ctx.fillStyle = '#1f2937';
    ctx.font = '11px Arial';
    ctx.fillText(yLabel, legendX + 30, legendY + 14);
    
  }, [data, currentTime, graphType]);
  
  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={300}
      className="border-2 border-blue-200 rounded-lg shadow-lg w-full"
    />
  );
}

export default function FluidDynamics2DPage() {
  const { t } = useLanguage();
  
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'laminar' | 'turbulent' | 'vortex' | 'airfoil' | 'f1car' | 'cylinder'>('laminar');
  const [displayMode, setDisplayMode] = useState<'velocity' | 'pressure' | 'vorticity'>('velocity');
  const [graphType, setGraphType] = useState<'velocity' | 'pressure' | 'vorticity' | 'turbulence' | 'lift' | 'drag'>('velocity');
  const [showParticles, setShowParticles] = useState(true);
  const [showVectors, setShowVectors] = useState(true);
  const [vectorDensity, setVectorDensity] = useState([2]);
  const [animationSpeed, setAnimationSpeed] = useState([1]);
  
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Fluid simulation state
  const gridSize = 40;
  const [velocityField, setVelocityField] = useState<number[][][]>([]);
  const [pressureField, setPressureField] = useState<number[][]>([]);
  const [vorticityField, setVorticityField] = useState<number[][]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [graphHistory, setGraphHistory] = useState<HistoryPoint[]>([]);
  
  // Fluid parameters
  const [viscosity, setViscosity] = useState([0.1]);
  const [density, setDensity] = useState([1.0]);
  const [inflowVelocity, setInflowVelocity] = useState([5]);
  const [reynoldsNumber, setReynoldsNumber] = useState(100);

  // Lab configuration
  const config = {
    name: "Fluid Dynamics 2D",
    title: "Động lực học chất lỏng 2D",
    description: "Mô phỏng dòng chảy chất lỏng với Navier-Stokes",
    category: t('labs.physics'),
    level: "Advanced",
    xp: 150,
    port: 8016
  };

  // Check backend status
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:${config.port}/api/health`, {
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

  // Initialize fluid field
  useEffect(() => {
    const initField = () => {
      const vel: number[][][] = [];
      const press: number[][] = [];
      const vort: number[][] = [];
      
      for (let i = 0; i < gridSize; i++) {
        vel[i] = [];
        press[i] = [];
        vort[i] = [];
        for (let j = 0; j < gridSize; j++) {
          vel[i][j] = [0, 0];
          press[i][j] = 0;
          vort[i][j] = 0;
        }
      }
      
      setVelocityField(vel);
      setPressureField(press);
      setVorticityField(vort);
    };
    
    initField();
  }, [gridSize]);

  // Initialize obstacles based on active tab
  useEffect(() => {
    const obs: Obstacle[] = [];
    
    if (activeTab === 'airfoil') {
      // Add airfoil at center
      obs.push({
        x: 250,
        y: 200,
        width: 100,
        height: 80,
        type: 'airfoil',
        angle: 0.1, // 5.7 degrees angle of attack
        lift: 0,
        drag: 0
      });
    } else if (activeTab === 'f1car') {
      // Add F1 car in center
      obs.push({
        x: 200,
        y: 180,
        width: 200,
        height: 40,
        type: 'car',
        lift: 0,
        drag: 0
      });
    } else if (activeTab === 'cylinder') {
      // Add cylinder for comparison
      obs.push({
        x: 300,
        y: 200,
        width: 0,
        height: 0,
        type: 'cylinder',
        radius: 40,
        lift: 0,
        drag: 0
      });
    } else if (activeTab === 'vortex') {
      // Add rectangular obstacles to create vortex
      obs.push({
        x: 200,
        y: 150,
        width: 30,
        height: 100,
        type: 'rectangle'
      });
      obs.push({
        x: 400,
        y: 150,
        width: 30,
        height: 100,
        type: 'rectangle'
      });
    }
    
    setObstacles(obs);
  }, [activeTab]);

  // Animation function
  const startAnimation = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    lastTimeRef.current = performance.now();
    
    const animate = (currentFrameTime: number) => {
      const deltaTime = Math.min((currentFrameTime - lastTimeRef.current) / 1000, 0.033) * animationSpeed[0];
      lastTimeRef.current = currentFrameTime;
      
      const newTime = currentTime + deltaTime;
      
      // Update velocity field
      const newVelField = velocityField.map((row, i) =>
        row.map((cell, j) => {
          let vx = cell[0];
          let vy = cell[1];
          
          // Apply inflow at left boundary with smooth profile
          if (i === 0) {
            if (activeTab === 'laminar') {
              // Smooth parabolic profile
              const centerY = gridSize / 2;
              const dy = (j - centerY) / centerY;
              const profile = Math.max(0, 1 - dy * dy);
              vx = inflowVelocity[0] * profile;
              vy = 0;
            } else if (activeTab === 'turbulent') {
              const centerY = gridSize / 2;
              const dy = (j - centerY) / centerY;
              const profile = Math.max(0, 1 - dy * dy);
              vx = inflowVelocity[0] * profile + (Math.random() - 0.5) * 2;
              vy = (Math.random() - 0.5) * 1;
            } else if (activeTab === 'vortex') {
              const centerY = gridSize / 2;
              const dy = j - centerY;
              vx = inflowVelocity[0] * 0.8;
              vy = Math.sin(dy * 0.2) * 3;
            } else if (activeTab === 'obstacle') {
              vx = inflowVelocity[0];
              vy = 0;
            }
          }
          
          // Diffusion (viscosity)
          const neighbors = [
            i > 0 ? velocityField[i-1][j] : [0, 0],
            i < gridSize - 1 ? velocityField[i+1][j] : [0, 0],
            j > 0 ? velocityField[i][j-1] : [0, 0],
            j < gridSize - 1 ? velocityField[i][j+1] : [0, 0]
          ];
          
          const avgVx = neighbors.reduce((sum, n) => sum + n[0], 0) / 4;
          const avgVy = neighbors.reduce((sum, n) => sum + n[1], 0) / 4;
          
          vx += (avgVx - vx) * viscosity[0] * deltaTime;
          vy += (avgVy - vy) * viscosity[0] * deltaTime;
          
          // Check collision with obstacles
          const cellX = (i / gridSize) * 600;
          const cellY = (j / gridSize) * 400;
          
          for (const obs of obstacles) {
            if (obs.type === 'circle' && obs.radius) {
              const dx = cellX - obs.x;
              const dy = cellY - obs.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist < obs.radius) {
                // Reflect velocity
                const angle = Math.atan2(dy, dx);
                const speed = Math.sqrt(vx * vx + vy * vy);
                vx = Math.cos(angle) * speed * 0.8;
                vy = Math.sin(angle) * speed * 0.8;
              }
            } else if (obs.type === 'rectangle') {
              if (cellX >= obs.x && cellX <= obs.x + obs.width &&
                  cellY >= obs.y && cellY <= obs.y + obs.height) {
                vx = -vx * 0.5;
                vy = -vy * 0.5;
              }
            }
          }
          
          // Damping
          vx *= 0.99;
          vy *= 0.99;
          
          return [vx, vy];
        })
      );
      
      // Update pressure field (simplified)
      const newPressField = newVelField.map((row, i) =>
        row.map((cell, j) => {
          const divergence = 
            (i < gridSize - 1 ? newVelField[i+1][j][0] - cell[0] : 0) +
            (j < gridSize - 1 ? newVelField[i][j+1][1] - cell[1] : 0);
          return -divergence * density[0];
        })
      );
      
      // Update vorticity field
      const newVortField = newVelField.map((row, i) =>
        row.map((cell, j) => {
          const dvx_dy = j < gridSize - 1 ? newVelField[i][j+1][0] - cell[0] : 0;
          const dvy_dx = i < gridSize - 1 ? newVelField[i+1][j][1] - cell[1] : 0;
          return dvy_dx - dvx_dy;
        })
      );
      
      // Update particles
      const newParticles = particles
        .map(p => {
          // Get velocity from field
          const gridX = Math.floor((p.x / 600) * gridSize);
          const gridY = Math.floor((p.y / 400) * gridSize);
          
          if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
            const fieldVel = newVelField[gridX][gridY];
            
            return {
              ...p,
              x: p.x + fieldVel[0] * deltaTime * 10,
              y: p.y + fieldVel[1] * deltaTime * 10,
              vx: fieldVel[0],
              vy: fieldVel[1],
              life: p.life - deltaTime * 0.3
            };
          }
          return { ...p, life: 0 };
        })
        .filter(p => p.life > 0 && p.x >= 0 && p.x < 600 && p.y >= 0 && p.y < 400);
      
      // Add new particles at inlet
      if (showParticles && newParticles.length < 500) {
        for (let i = 0; i < 3; i++) {
          newParticles.push({
            x: 10,
            y: Math.random() * 400,
            vx: 0,
            vy: 0,
            life: 1,
            color: `rgb(${100 + Math.random() * 155}, ${150 + Math.random() * 105}, 255)`
          });
        }
      }
      
      // Calculate statistics
      const avgVelocity = newVelField.reduce((sum, row) => 
        sum + row.reduce((s, cell) => s + Math.sqrt(cell[0]**2 + cell[1]**2), 0) / gridSize, 0
      ) / gridSize;
      
      const avgPressure = newPressField.reduce((sum, row) =>
        sum + row.reduce((s, cell) => s + cell, 0) / gridSize, 0
      ) / gridSize;
      
      const avgVorticity = newVortField.reduce((sum, row) =>
        sum + row.reduce((s, cell) => s + Math.abs(cell), 0) / gridSize, 0
      ) / gridSize;
      
      const turbulence = newVelField.reduce((sum, row, i) =>
        sum + row.reduce((s, cell, j) => {
          const neighbors = [
            i > 0 ? newVelField[i-1][j] : [0, 0],
            i < gridSize - 1 ? newVelField[i+1][j] : [0, 0]
          ];
          const variance = neighbors.reduce((v, n) => 
            v + Math.abs(n[0] - cell[0]) + Math.abs(n[1] - cell[1]), 0
          );
          return s + variance;
        }, 0) / gridSize, 0
      ) / gridSize;
      
      // Calculate aerodynamic coefficients
      let totalLift = 0;
      let totalDrag = 0;
      let liftCoefficient = 0;
      let dragCoefficient = 0;
      
      if (obstacles.length > 0) {
        const obstacle = obstacles[0];
        const obstacleArea = obstacle.type === 'airfoil' ? obstacle.width * obstacle.height / 1000 :
                           obstacle.type === 'car' ? obstacle.width * obstacle.height / 1000 :
                           obstacle.type === 'cylinder' ? Math.PI * (obstacle.radius || 0) ** 2 / 1000 : 1;
        
        // Calculate forces on obstacle surface
        const freestreamVelocity = inflowVelocity[0];
        const dynamicPressure = 0.5 * density[0] * freestreamVelocity ** 2;
        
        // Simplified lift and drag calculation
        if (obstacle.type === 'airfoil') {
          const angleOfAttack = obstacle.angle || 0;
          liftCoefficient = 2 * Math.PI * angleOfAttack; // Thin airfoil theory
          dragCoefficient = 0.01 + 0.1 * angleOfAttack ** 2; // Profile drag + induced drag
        } else if (obstacle.type === 'car') {
          liftCoefficient = -0.3; // F1 cars generate downforce (negative lift)
          dragCoefficient = 0.8; // Typical F1 drag coefficient
        } else if (obstacle.type === 'cylinder') {
          liftCoefficient = 0; // No lift for cylinder
          dragCoefficient = 1.2; // Typical cylinder drag coefficient
        }
        
        totalLift = liftCoefficient * dynamicPressure * obstacleArea;
        totalDrag = dragCoefficient * dynamicPressure * obstacleArea;
      }
      
      // Update history
      const newHistory = [...graphHistory, {
        time: newTime,
        avgVelocity,
        avgPressure,
        avgVorticity,
        turbulence,
        liftCoefficient,
        dragCoefficient,
        totalLift,
        totalDrag
      }];
      
      if (newHistory.length > 500) {
        newHistory.shift();
      }
      
      setVelocityField(newVelField);
      setPressureField(newPressField);
      setVorticityField(newVortField);
      setParticles(newParticles);
      setGraphHistory(newHistory);
      setCurrentTime(newTime);
      
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
    pauseAnimation();
    setCurrentTime(0);
    setGraphHistory([]);
    setParticles([]);
    
    // Reset fields
    const vel: number[][][] = [];
    const press: number[][] = [];
    const vort: number[][] = [];
    
    for (let i = 0; i < gridSize; i++) {
      vel[i] = [];
      press[i] = [];
      vort[i] = [];
      for (let j = 0; j < gridSize; j++) {
        vel[i][j] = [0, 0];
        press[i][j] = 0;
        vort[i][j] = 0;
      }
    }
    
    setVelocityField(vel);
    setPressureField(press);
    setVorticityField(vort);
  };

  // Calculate Reynolds number
  useEffect(() => {
    const L = 1; // Characteristic length
    const Re = (density[0] * inflowVelocity[0] * L) / (viscosity[0] + 0.01);
    setReynoldsNumber(Math.round(Re));
  }, [density, inflowVelocity, viscosity]);

  return (
    <VisionThemeWrapper title="Fluid Dynamics 2D" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
          <Waves className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
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
          <Badge variant="outline" className="text-purple-600 border-purple-200">
            <Wind className="h-3 w-3 mr-1" />
            <span>Re = {reynoldsNumber}</span>
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Flow Type Selection */}
          <Card className="border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-blue-600" />
                <span>Loại dòng chảy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
                  <TabsTrigger value="laminar">Tầng</TabsTrigger>
                  <TabsTrigger value="turbulent">Rối</TabsTrigger>
                  <TabsTrigger value="vortex">Xoáy</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-3 mt-2">
                  <TabsTrigger value="airfoil">Airfoil</TabsTrigger>
                  <TabsTrigger value="f1car">F1 Car</TabsTrigger>
                  <TabsTrigger value="cylinder">Cylinder</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Fluid Parameters */}
          <Card className="border-2 border-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Thông số chất lỏng</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Độ nhớt (μ): {viscosity[0].toFixed(2)} Pa·s</Label>
                <Slider
                  value={viscosity}
                  onValueChange={setViscosity}
                  max={1}
                  min={0.01}
                  step={0.01}
                  className="w-full"
                  disabled={isAnimating}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Mật độ (ρ): {density[0].toFixed(2)} kg/m³</Label>
                <Slider
                  value={density}
                  onValueChange={setDensity}
                  max={2}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                  disabled={isAnimating}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Vận tốc dòng vào: {inflowVelocity[0].toFixed(1)} m/s</Label>
                <Slider
                  value={inflowVelocity}
                  onValueChange={setInflowVelocity}
                  max={10}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                  disabled={isAnimating}
                />
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-sm font-semibold">Số Reynolds: {reynoldsNumber}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {reynoldsNumber < 2300 ? '🌊 Dòng chảy tầng (Laminar)' :
                   reynoldsNumber < 4000 ? '🌀 Chuyển tiếp' :
                   '💨 Dòng chảy rối (Turbulent)'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="border-2 border-green-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5 text-green-600" />
                <span>Điều khiển</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  onClick={isAnimating ? pauseAnimation : startAnimation}
                  className={`flex-1 ${isAnimating ? 'bg-gradient-to-r from-yellow-600 to-orange-600' : 'bg-gradient-to-r from-green-600 to-blue-600'}`}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : isAnimating ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {isAnimating ? 'Tạm dừng' : 'Bắt đầu'}
                </Button>
                <Button 
                  onClick={stopAnimation}
                  variant="outline"
                  className="border-2 border-red-200 hover:bg-red-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Tốc độ mô phỏng: {animationSpeed[0]}x</Label>
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

        {/* Right Column - Visualization */}
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
                    id="particles"
                    checked={showParticles}
                    onCheckedChange={setShowParticles}
                  />
                  <Label htmlFor="particles" className="text-sm">Hạt dòng chảy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="vectors"
                    checked={showVectors}
                    onCheckedChange={setShowVectors}
                  />
                  <Label htmlFor="vectors" className="text-sm">Vector vận tốc</Label>
                </div>
              </div>
              
              {showVectors && (
                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-medium">Mật độ vector</Label>
                  <Slider
                    value={vectorDensity}
                    onValueChange={setVectorDensity}
                    max={5}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Dày (1)</span>
                    <span>Mỏng (5)</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm mb-2 block">Chế độ hiển thị:</Label>
                  <div className="flex space-x-2">
                    <Button
                      variant={displayMode === 'velocity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('velocity')}
                      className="flex-1"
                    >
                      Vận tốc
                    </Button>
                    <Button
                      variant={displayMode === 'pressure' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('pressure')}
                      className="flex-1"
                    >
                      Áp suất
                    </Button>
                    <Button
                      variant={displayMode === 'vorticity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDisplayMode('vorticity')}
                      className="flex-1"
                    >
                      Độ xoáy
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Field Visualization Canvas */}
          {showVectors && (
            <Card className="border-2 border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Trường {displayMode === 'velocity' ? 'Vận tốc' : displayMode === 'pressure' ? 'Áp suất' : 'Độ xoáy'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FluidGridCanvas
                  velocityField={velocityField}
                  pressureField={pressureField}
                  vorticityField={vorticityField}
                  displayMode={displayMode}
                  obstacles={obstacles}
                  showParticles={showParticles}
                  showVectors={showVectors}
                  vectorDensity={vectorDensity}
                />
              </CardContent>
            </Card>
          )}

          {/* Particle Visualization Canvas */}
          {showParticles && (
            <Card className="border-2 border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Droplet className="h-5 w-5 text-blue-600" />
                  <span>Dòng hạt - {particles.length} particles</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ParticleCanvas
                  particles={particles}
                  obstacles={obstacles}
                />
                
                {/* Real-time Info */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <span className="font-semibold">⏱️ Thời gian:</span> {currentTime.toFixed(2)}s
                  </div>
                  <div className="p-2 bg-green-50 rounded border border-green-200">
                    <span className="font-semibold">🚀 Hạt:</span> {particles.length}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Real-time Graphs */}
      {graphHistory.length > 1 && (
        <Card className="border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LineChart className="h-5 w-5 text-blue-600" />
                <span>Đồ thị Phân tích Dòng chảy - Real-time</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant={graphType === 'velocity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('velocity')}
                >
                  🚀 Vận tốc
                </Button>
                <Button
                  variant={graphType === 'pressure' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('pressure')}
                >
                  💨 Áp suất
                </Button>
                <Button
                  variant={graphType === 'vorticity' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGraphType('vorticity')}
                >
                  🌀 Độ xoáy
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
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FluidGraphCanvas
              data={graphHistory}
              currentTime={currentTime}
              graphType={graphType}
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
                  <Waves className="h-4 w-4 mr-2 text-blue-600" />
                  Navier-Stokes Equations
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li><strong>Bảo toàn khối lượng</strong>: ∇·v = 0 (không nén được)</li>
                  <li><strong>Bảo toàn động lượng</strong>: ρ(∂v/∂t + v·∇v) = -∇p + μ∇²v</li>
                  <li><strong>Số Reynolds</strong>: Re = ρvL/μ</li>
                  <li><strong>Độ xoáy</strong>: ω = ∇ × v</li>
                </ul>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Droplet className="h-4 w-4 mr-2 text-green-600" />
                  Aerodynamics
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li><strong>Airfoil</strong>: NACA 0012, tính toán CL, CD</li>
                  <li><strong>F1 Car</strong>: Downforce (-CL), high drag</li>
                  <li><strong>Cylinder</strong>: High drag, no lift</li>
                  <li><strong>Lift</strong>: CL = L/(0.5ρV²S)</li>
                  <li><strong>Drag</strong>: CD = D/(0.5ρV²S)</li>
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
                  <li>Chọn loại dòng chảy từ 4 tabs</li>
                  <li>Điều chỉnh độ nhớt, mật độ, vận tốc</li>
                  <li>Nhấn <strong>&quot;Bắt đầu&quot;</strong> để chạy mô phỏng</li>
                  <li>Quan sát trường vận tốc/áp suất/độ xoáy</li>
                  <li>Xem dòng hạt chuyển động</li>
                  <li>Phân tích đồ thị real-time</li>
                </ul>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Target className="h-4 w-4 mr-2 text-yellow-600" />
                  Ứng dụng thực tế
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
                  <li>Thiết kế máy bay, ô tô (khí động học)</li>
                  <li>Dự đoán thời tiết (khí tượng học)</li>
                  <li>Thiết kế đường ống, bơm nước</li>
                  <li>Mô phỏng dòng máu trong cơ thể</li>
                  <li>Nghiên cứu ô nhiễm không khí</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </VisionThemeWrapper>
  );
}

