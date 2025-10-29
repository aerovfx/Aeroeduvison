'use client';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Play, RotateCcw, Activity, Loader2, Lightbulb, Table as TableIcon, Info, ArrowRight, CheckCircle, Trophy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';

interface RefractionData {
  n1: number;
  n2: number;
  angle_in_deg: number;
  angle_out_deg: number | null;
  is_total_reflection: boolean;
  critical_angle: number | null;
  rays: {
    incident_ray: number[][];
    refracted_ray: number[][] | null;
    reflected_ray: number[][] | null;
  };
}

interface Material {
  name: string;
  n: number;
  color: string;
}

export default function RefractionPage() {
  const { t } = useLanguage();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [refractionData, setRefractionData] = useState<RefractionData | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Parameters
  const [angleIn, setAngleIn] = useState(30);
  const [selectedMaterial1, setSelectedMaterial1] = useState("air");
  const [selectedMaterial2, setSelectedMaterial2] = useState("water");
  const [time, setTime] = useState(0);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Track initial values to detect changes
  const initialValues = useRef({
    angleIn: 30,
    material1: "air",
    material2: "water"
  });
  
  // Materials
  const materials: Record<string, Material> = {
    air: { name: "Không khí", n: 1.0, color: "#E0F2FE" },
    water: { name: "Nước", n: 1.33, color: "#0EA5E9" },
    glass: { name: "Thủy tinh", n: 1.5, color: "#60A5FA" },
    diamond: { name: "Kim cương", n: 2.42, color: "#E0E7FF" },
    oil: { name: "Dầu", n: 1.47, color: "#FCD34D" }
  };

  // Lab configuration
  const config = {
    name: "Refraction",
    title: "Khúc xạ ánh sáng",
    description: "Thí nghiệm khúc xạ qua lăng kính và thấu kính",
    category: "Quang học",
    level: "Lớp 11",
    duration: "45 phút",
    xp: 80,
    port: 8017
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check backend status
    const checkBackend = async () => {
      try {
        const response = await fetch(`http://localhost:8017/api/health`);
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
  }, [isMounted]);

  // Calculate angle table data
  const calculateAngleTable = () => {
    const n1 = materials[selectedMaterial1].n;
    const n2 = materials[selectedMaterial2].n;
    const tableData = [];
    
    for (let angle = 0; angle <= 80; angle += 10) {
      const data = calculateRefraction(n1, n2, angle);
      tableData.push({
        angleIn: angle,
        angleOut: data.angle_out_deg,
        isTotalReflection: data.is_total_reflection
      });
    }
    return tableData;
  };

  // Calculate refraction using Snell's law
  const calculateRefraction = (n1: number, n2: number, angleInDeg: number): RefractionData => {
    const angleInRad = (angleInDeg * Math.PI) / 180;
    const sinAngleOut = (n1 * Math.sin(angleInRad)) / n2;
    
    let angleOutDeg: number | null = null;
    let isTotalReflection = false;
    let criticalAngle: number | null = null;
    
    if (Math.abs(sinAngleOut) > 1.0) {
      isTotalReflection = true;
    } else {
      angleOutDeg = (Math.asin(sinAngleOut) * 180) / Math.PI;
    }
    
    if (n2 < n1) {
      criticalAngle = (Math.asin(n2 / n1) * 180) / Math.PI;
    }
    
    // Generate ray points
    const interfaceY = 0;
    const incidentLength = 100;
    const incidentStart = [
      -incidentLength * Math.sin(angleInRad),
      interfaceY + incidentLength * Math.cos(angleInRad)
    ];
    
    let rays: any = {
      incident_ray: [incidentStart, [0, interfaceY]],
      refracted_ray: null,
      reflected_ray: null
    };
    
    if (isTotalReflection) {
      // Total internal reflection
      const reflectedLength = 100;
      const reflectedEnd = [
        reflectedLength * Math.sin(angleInRad),
        interfaceY + reflectedLength * Math.cos(angleInRad)
      ];
      rays.reflected_ray = [[0, interfaceY], reflectedEnd];
    } else {
      // Refraction
      const angleOutRad = (angleOutDeg! * Math.PI) / 180;
      const refractedLength = 100;
      const refractedEnd = [
        refractedLength * Math.sin(angleOutRad),
        interfaceY - refractedLength * Math.cos(angleOutRad)
      ];
      rays.refracted_ray = [[0, interfaceY], refractedEnd];
      
      // Partial reflection
      const reflectedLength = 30;
      const reflectedEnd = [
        reflectedLength * Math.sin(angleInRad),
        interfaceY + reflectedLength * Math.cos(angleInRad)
      ];
      rays.reflected_ray = [[0, interfaceY], reflectedEnd];
    }
    
    return {
      n1,
      n2,
      angle_in_deg: angleInDeg,
      angle_out_deg: angleOutDeg,
      is_total_reflection: isTotalReflection,
      critical_angle: criticalAngle,
      rays
    };
  };

  // Update simulation when parameters change
  useEffect(() => {
    if (!isMounted) return;
    
    const updateSimulation = async () => {
      const n1 = materials[selectedMaterial1].n;
      const n2 = materials[selectedMaterial2].n;
      
      if (backendStatus === 'online') {
        try {
          // Use backend API
          const response = await fetch('http://localhost:8017/api/refraction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              n1,
              n2,
              angle_in_deg: angleIn
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            setRefractionData(result.data);
          } else {
            // Fallback to client-side calculation
            const data = calculateRefraction(n1, n2, angleIn);
            setRefractionData(data);
          }
        } catch (error) {
          console.error('Backend error, using client-side calculation:', error);
          // Fallback to client-side calculation
          const data = calculateRefraction(n1, n2, angleIn);
          setRefractionData(data);
        }
      } else {
        // Use client-side calculation
        const data = calculateRefraction(n1, n2, angleIn);
        setRefractionData(data);
      }
    };
    
    updateSimulation();
  }, [angleIn, selectedMaterial1, selectedMaterial2, backendStatus, isMounted]);

  // Draw simulation on canvas
  useEffect(() => {
    if (!isMounted || !refractionData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = 600;
    canvas.height = 400;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up coordinate system (center origin)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw materials with gradients
    const material1 = materials[selectedMaterial1];
    const material2 = materials[selectedMaterial2];
    
    // Material 1 gradient (top)
    const gradient1 = ctx.createLinearGradient(0, 0, 0, centerY);
    gradient1.addColorStop(0, material1.color);
    gradient1.addColorStop(1, material1.color + 'CC');
    ctx.fillStyle = gradient1;
    ctx.fillRect(0, 0, canvas.width, centerY);
    
    // Material 2 gradient (bottom)
    const gradient2 = ctx.createLinearGradient(0, centerY, 0, canvas.height);
    gradient2.addColorStop(0, material2.color + 'CC');
    gradient2.addColorStop(1, material2.color);
    ctx.fillStyle = gradient2;
    ctx.fillRect(0, centerY, canvas.width, canvas.height - centerY);
    
    // Draw interface line with shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 5;
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 5]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    
    // Draw normal line (dashed)
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw incident ray (red) with glow effect
    if (refractionData.rays.incident_ray) {
      const [start, end] = refractionData.rays.incident_ray;
      
      // Glow effect
      ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX + start[0], centerY - start[1]);
      ctx.lineTo(centerX + end[0], centerY - end[1]);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw arrow
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const arrowLength = 12;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(centerX + end[0], centerY - end[1]);
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle - Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle + Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('Tia tới', centerX + start[0] / 2 - 30, centerY - start[1] / 2 - 10);
    }
    
    // Draw refracted ray (blue) with glow effect
    if (refractionData.rays.refracted_ray) {
      const [start, end] = refractionData.rays.refracted_ray;
      
      // Glow effect
      ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX + start[0], centerY - start[1]);
      ctx.lineTo(centerX + end[0], centerY - end[1]);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw arrow
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const arrowLength = 12;
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(centerX + end[0], centerY - end[1]);
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle - Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle + Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Label
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 13px Arial';
      ctx.fillText('Tia khúc xạ', centerX + end[0] / 2 + 10, centerY + Math.abs(end[1]) / 2 + 20);
    }
    
    // Draw reflected ray (green) with glow effect
    if (refractionData.rays.reflected_ray) {
      const [start, end] = refractionData.rays.reflected_ray;
      const isTotal = refractionData.is_total_reflection;
      
      // Glow effect
      ctx.shadowColor = isTotal ? 'rgba(147, 51, 234, 0.5)' : 'rgba(34, 197, 94, 0.4)';
      ctx.shadowBlur = isTotal ? 12 : 8;
      ctx.strokeStyle = isTotal ? '#9333EA' : '#22C55E';
      ctx.lineWidth = isTotal ? 4 : 3;
      ctx.globalAlpha = isTotal ? 1.0 : 0.6;
      ctx.beginPath();
      ctx.moveTo(centerX + start[0], centerY - start[1]);
      ctx.lineTo(centerX + end[0], centerY - end[1]);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      
      // Draw arrow
      const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
      const arrowLength = isTotal ? 12 : 10;
      ctx.fillStyle = isTotal ? '#9333EA' : '#22C55E';
      ctx.beginPath();
      ctx.moveTo(centerX + end[0], centerY - end[1]);
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle - Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        centerX + end[0] - arrowLength * Math.cos(angle + Math.PI / 6),
        centerY - end[1] + arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      
      // Label
      if (isTotal) {
        ctx.fillStyle = '#7C3AED';
        ctx.font = 'bold 13px Arial';
        ctx.fillText('Phản xạ toàn phần', centerX + end[0] / 2 + 10, centerY - end[1] / 2 - 10);
      }
    }
    
    // Draw angle arcs and labels
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    
    // Incident angle arc
    const arcRadius = 40;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arcRadius, -Math.PI / 2, -Math.PI / 2 + (refractionData.angle_in_deg * Math.PI / 180), false);
    ctx.stroke();
    
    // Angle label with background
    const labelX = centerX + 50;
    const labelY = centerY - 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(labelX - 5, labelY - 18, 45, 24);
    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`i = ${refractionData.angle_in_deg.toFixed(1)}°`, labelX, labelY);
    
    if (refractionData.angle_out_deg && !refractionData.is_total_reflection) {
      // Refracted angle arc
      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(centerX, centerY, arcRadius, Math.PI / 2, Math.PI / 2 - (refractionData.angle_out_deg * Math.PI / 180), true);
      ctx.stroke();
      
      // Refracted angle label with background
      const labelX2 = centerX + 50;
      const labelY2 = centerY + 40;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(labelX2 - 5, labelY2 - 18, 50, 24);
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`r = ${refractionData.angle_out_deg.toFixed(1)}°`, labelX2, labelY2);
    }
    
    // Draw material labels with background boxes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(10, 10, 140, 35);
    ctx.fillRect(10, canvas.height - 45, 140, 35);
    
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(material1.name, 20, 30);
    ctx.font = '14px Arial';
    ctx.fillText(`n₁ = ${refractionData.n1}`, 20, 40);
    
    ctx.font = 'bold 16px Arial';
    ctx.fillText(material2.name, 20, canvas.height - 30);
    ctx.font = '14px Arial';
    ctx.fillText(`n₂ = ${refractionData.n2}`, 20, canvas.height - 20);
    
  }, [refractionData, isMounted, selectedMaterial1, selectedMaterial2, materials]);

  // Detect parameter changes
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      angleIn !== initialValues.current.angleIn ||
      selectedMaterial1 !== initialValues.current.material1 ||
      selectedMaterial2 !== initialValues.current.material2;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [angleIn, selectedMaterial1, selectedMaterial2, isMounted, hasInteracted]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      // Simulate time progression
      for (let t = 0; t <= 5; t += 0.1) {
        setTime(t);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      // Call API to save completion and award XP
      const response = await fetch('/api/lab-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          labId: 'refraction',
          labName: config.title,
          xpEarned: config.xp,
          parameters: {
            angleIn,
            material1: selectedMaterial1,
            material2: selectedMaterial2
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        setIsCompleted(true);
        
        toast({
          title: "🎉 Hoàn thành thí nghiệm!",
          description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
          duration: 5000,
        });
      } else {
        throw new Error('Failed to complete lab');
      }
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

  const resetSimulation = () => {
    setTime(0);
    setAngleIn(30);
    setSelectedMaterial1("air");
    setSelectedMaterial2("water");
    // Reset interaction tracking but keep completion status
    setHasInteracted(false);
    initialValues.current = {
      angleIn: 30,
      material1: "air",
      material2: "water"
    };
  };

  // Prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading refraction simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Settings className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Khúc xạ ánh sáng</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          Thí nghiệm khúc xạ qua lăng kính và thấu kính
        </p>
        
        {/* Tags */}
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="secondary">Quang học</Badge>
          <Badge variant="secondary">Lớp 11</Badge>
          <Badge variant="secondary">45 phút</Badge>
        </div>
        
        {/* Backend Status */}
        <div className="flex items-center justify-center space-x-2">
          <Badge 
            variant={backendStatus === 'online' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>
              {backendStatus === 'online' ? 'Backend Online' : 
               backendStatus === 'offline' ? 'Backend Offline' : 'Checking...'}
            </span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Port 8017
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Simulation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Mô phỏng khúc xạ ánh sáng</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Quan sát hiện tượng khúc xạ và phản xạ toàn phần
              </p>
            </CardHeader>
            <CardContent>
              {/* Canvas */}
              <div className="flex justify-center mb-4">
                <canvas 
                  ref={canvasRef}
                  className="border-4 border-gray-300 rounded-xl shadow-2xl bg-white"
                  width={600}
                  height={400}
                />
              </div>
              
              {/* Current Parameters Display */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Thời gian</div>
                    <div className="text-lg font-semibold">{time.toFixed(1)}s</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Góc tới</div>
                    <div className="text-lg font-semibold">{refractionData?.angle_in_deg.toFixed(1)}°</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Góc khúc xạ</div>
                    <div className="text-lg font-semibold">
                      {refractionData?.angle_out_deg ? `${refractionData.angle_out_deg.toFixed(1)}°` : 'Phản xạ toàn phần'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Controls */}
              <div className="space-y-6">
                {/* Enhanced Angle Slider */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-bold text-purple-900 flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Góc tới (i)
                    </label>
                    <div className="bg-white px-6 py-3 rounded-lg border-2 border-purple-300 shadow-md">
                      <span className="text-3xl font-bold text-purple-600">{angleIn}°</span>
                    </div>
                  </div>
                  <div className="relative">
                    <Slider
                      value={[angleIn]}
                      onValueChange={(value) => setAngleIn(value[0])}
                      max={80}
                      min={0}
                      step={1}
                      className="mt-2 h-3 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                      <span className="font-medium">0°</span>
                      <span className="font-medium">20°</span>
                      <span className="font-medium">40°</span>
                      <span className="font-medium">60°</span>
                      <span className="font-medium">80°</span>
                    </div>
                  </div>
                </div>
                
                {/* Material Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="text-sm font-bold mb-2 block text-blue-900">
                      Môi trường 1 (trên)
                    </label>
                    <Select value={selectedMaterial1} onValueChange={setSelectedMaterial1}>
                      <SelectTrigger className="bg-white border-blue-300 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(materials).map(([key, material]) => (
                          <SelectItem key={key} value={key}>
                            {material.name} (n = {material.n})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="text-sm font-bold mb-2 block text-green-900">
                      Môi trường 2 (dưới)
                    </label>
                    <Select value={selectedMaterial2} onValueChange={setSelectedMaterial2}>
                      <SelectTrigger className="bg-white border-green-300 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(materials).map(([key, material]) => (
                          <SelectItem key={key} value={key}>
                            {material.name} (n = {material.n})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={runSimulation}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
                  
                  {/* Complete Lab Button */}
                  <Button 
                    onClick={completeLab}
                    disabled={!hasInteracted || isCompleted || isCompleting}
                    className={`w-full flex items-center justify-center space-x-2 ${
                      isCompleted 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                    }`}
                    size="lg"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span>✅ Đã hoàn thành</span>
                      </>
                    ) : (
                      <>
                        <Trophy className="h-5 w-5" />
                        <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
                      </>
                    )}
                  </Button>
                  
                  {!hasInteracted && !isCompleted && (
                    <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      💡 Thay đổi thông số thí nghiệm để kích hoạt nút hoàn thành
                    </p>
                  )}
                </div>
                
                {/* Legend */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Chú thích màu sắc
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-red-500 rounded"></div>
                      <span>Tia tới (màu đỏ)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded"></div>
                      <span>Tia khúc xạ (màu xanh)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-green-500 rounded"></div>
                      <span>Tia phản xạ (màu xanh lá)</span>
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
          <Card className="border-2 border-purple-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Dữ liệu hiện tại
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center border-2 border-blue-200 shadow-sm">
                <div className="text-sm text-blue-600 font-semibold">Thời gian</div>
                <div className="text-2xl font-bold text-blue-800">{time.toFixed(1)}s</div>
              </div>
              
              <div className="bg-pink-50 p-4 rounded-lg text-center border-2 border-pink-200 shadow-sm">
                <div className="text-sm text-pink-600 font-semibold">Góc tới (i)</div>
                <div className="text-2xl font-bold text-pink-800">{refractionData?.angle_in_deg.toFixed(1)}°</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg text-center border-2 border-green-200 shadow-sm">
                <div className="text-sm text-green-600 font-semibold">Góc khúc xạ (r)</div>
                <div className="text-2xl font-bold text-green-800">
                  {refractionData?.angle_out_deg ? `${refractionData.angle_out_deg.toFixed(1)}°` : 'Phản xạ toàn phần'}
                </div>
              </div>
              
              {refractionData?.is_total_reflection && (
                <div className="bg-purple-100 p-4 rounded-lg border-2 border-purple-300 shadow-sm">
                  <div className="text-center">
                    <div className="text-purple-900 font-bold text-lg mb-1">⚡ Phản xạ toàn phần</div>
                    {refractionData.critical_angle && (
                      <div className="text-sm text-purple-700">
                        Góc tới hạn: <span className="font-bold">{refractionData.critical_angle.toFixed(1)}°</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Angle Data Table */}
          <Card className="border-2 border-indigo-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <TableIcon className="h-5 w-5 text-indigo-600" />
                Bảng góc tới - góc khúc xạ
              </CardTitle>
              <CardDescription>
                Phụ thuộc giữa góc tới (i) và góc khúc xạ (r)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-indigo-100">
                      <TableHead className="text-center font-bold text-indigo-900">
                        Góc tới (i)
                      </TableHead>
                      <TableHead className="text-center font-bold text-indigo-900">
                        <ArrowRight className="h-4 w-4 inline" />
                      </TableHead>
                      <TableHead className="text-center font-bold text-indigo-900">
                        Góc khúc xạ (r)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculateAngleTable().map((row, index) => (
                      <TableRow 
                        key={index}
                        className={`
                          ${Math.abs(row.angleIn - angleIn) <= 5 ? 'bg-yellow-50 font-semibold border-l-4 border-yellow-400' : ''}
                          ${row.isTotalReflection ? 'bg-purple-50' : ''}
                          hover:bg-gray-50 transition-colors
                        `}
                      >
                        <TableCell className="text-center font-medium">
                          {row.angleIn}°
                        </TableCell>
                        <TableCell className="text-center">
                          <ArrowRight className="h-4 w-4 mx-auto text-gray-400" />
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {row.isTotalReflection ? (
                            <span className="text-purple-600 font-bold text-xs">
                              Phản xạ toàn phần
                            </span>
                          ) : (
                            <span className="text-green-700">
                              {row.angleOut?.toFixed(1)}°
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 text-xs text-gray-500 flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border-l-4 border-yellow-400 rounded"></div>
                <span>Góc hiện tại</span>
              </div>
            </CardContent>
          </Card>

          {/* Material Properties */}
          <Card className="border-2 border-amber-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-600" />
                Chiết suất vật liệu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6">
              {Object.entries(materials).map(([key, material]) => (
                <div 
                  key={key}
                  className={`
                    flex justify-between items-center p-3 rounded-lg border-2 transition-all
                    ${(selectedMaterial1 === key || selectedMaterial2 === key) 
                      ? 'bg-amber-100 border-amber-400 shadow-md font-bold' 
                      : 'bg-gray-50 border-gray-200'}
                  `}
                >
                  <span className="font-medium">{material.name}:</span>
                  <span className="font-bold text-lg">n = {material.n}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Snell's Law Formula */}
          <Card className="border-2 border-teal-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-teal-600" />
                Định luật Snell
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="bg-gradient-to-r from-teal-100 to-cyan-100 p-4 rounded-lg border-2 border-teal-300 mb-4">
                <div className="text-center font-mono text-xl font-bold text-teal-900">
                  n₁ × sin(i) = n₂ × sin(r)
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">•</span>
                  <div>
                    <span className="font-semibold">n₁, n₂:</span> Chiết suất của hai môi trường
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">•</span>
                  <div>
                    <span className="font-semibold">i:</span> Góc tới
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-teal-700">•</span>
                  <div>
                    <span className="font-semibold">r:</span> Góc khúc xạ
                  </div>
                </div>
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
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 font-bold">
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
  );
}