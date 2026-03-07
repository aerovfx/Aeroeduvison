"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Info, Play, Pause, RotateCcw, Eye, Grid3x3, Maximize2 } from "lucide-react";

interface MotionTrackingViewerProps {
  data: any;
}

export function MotionTrackingViewer({ data }: MotionTrackingViewerProps) {
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const canvas3dRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [selectedDistance, setSelectedDistance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number>();
  
  const scenario = data.scenarios[selectedScenario];
  const currentData = scenario.scenarios[selectedDistance].data;
  const trajectory3d = currentData.trajectory_3d;
  const trajectory2d = currentData.trajectory_2d;
  
  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const animate = () => {
      setAnimationProgress(prev => {
        const next = prev + 0.01;
        if (next >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return next;
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating]);

  // Draw 2D projection
  useEffect(() => {
    const canvas = canvas2dRef.current;
    if (!canvas || !trajectory2d) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Camera center
    const cx = currentData.cx;
    const cy = currentData.cy;
    ctx.strokeStyle = '#94A3B8';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, height);
    ctx.moveTo(0, cy);
    ctx.lineTo(width, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw trajectory
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectory2d.forEach((point: any, index: number) => {
      if (index === 0) {
        ctx.moveTo(point.px, point.py);
      } else {
        ctx.lineTo(point.px, point.py);
      }
    });
    ctx.stroke();

    // Draw points
    trajectory2d.forEach((point: any, index: number) => {
      const alpha = index / trajectory2d.length;
      ctx.fillStyle = `rgba(59, 130, 246, ${0.3 + alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(point.px, point.py, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Animated object
    if (isAnimating && animationProgress > 0) {
      const frameIndex = Math.floor(animationProgress * (trajectory2d.length - 1));
      const point = trajectory2d[frameIndex];
      
      if (point) {
        // Object
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(point.px, point.py, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        // Bounding box
        const halfWidth = point.width_px / 2;
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(point.px - halfWidth, point.py - 10, point.width_px, 20);
        
        // Label
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(`Width: ${point.width_px.toFixed(0)}px`, point.px + halfWidth + 10, point.py);
      }
    }

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('2D Image Projection', 10, 25);
    ctx.font = '12px Arial';
    ctx.fillText(`Center: (${cx}, ${cy})`, 10, 45);

  }, [trajectory2d, currentData, isAnimating, animationProgress]);

  // Draw 3D trajectory
  useEffect(() => {
    const canvas = canvas3dRef.current;
    if (!canvas || !trajectory3d) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#F0F9FF';
    ctx.fillRect(0, 0, width, height);

    // Simple 3D projection (isometric)
    const scale = 30;
    const centerX = width / 2;
    const centerY = height / 2;

    const project = (x: number, y: number, z: number) => {
      const angle = Math.PI / 6;
      const px = centerX + (x - z * Math.cos(angle)) * scale;
      const py = centerY - (y + z * Math.sin(angle)) * scale;
      return [px, py];
    };

    // Draw axes
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    
    // X axis (red)
    ctx.strokeStyle = '#EF4444';
    ctx.beginPath();
    const [x0, y0] = project(0, 0, 0);
    const [x1, y1] = project(5, 0, 0);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('X', x1 + 5, y1);

    // Y axis (green)
    ctx.strokeStyle = '#10B981';
    ctx.beginPath();
    const [y2, y3] = project(0, 5, 0);
    ctx.moveTo(x0, y0);
    ctx.lineTo(y2, y3);
    ctx.stroke();
    ctx.fillStyle = '#10B981';
    ctx.fillText('Y', y2 + 5, y3);

    // Z axis (blue)
    ctx.strokeStyle = '#3B82F6';
    ctx.beginPath();
    const [z2, z3] = project(0, 0, 5);
    ctx.moveTo(x0, y0);
    ctx.lineTo(z2, z3);
    ctx.stroke();
    ctx.fillStyle = '#3B82F6';
    ctx.fillText('Z', z2 + 5, z3);

    // Draw trajectory
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    trajectory3d.forEach((point: any, index: number) => {
      const [px, py] = project(point.x, point.y, point.z);
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();

    // Draw points
    trajectory3d.forEach((point: any, index: number) => {
      const [px, py] = project(point.x, point.y, point.z);
      const alpha = index / trajectory3d.length;
      ctx.fillStyle = `rgba(139, 92, 246, ${0.3 + alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Animated object
    if (isAnimating && animationProgress > 0) {
      const frameIndex = Math.floor(animationProgress * (trajectory3d.length - 1));
      const point = trajectory3d[frameIndex];
      
      if (point) {
        const [px, py] = project(point.x, point.y, point.z);
        
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 15, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    // Label
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('3D World Coordinates', 10, 25);

  }, [trajectory3d, isAnimating, animationProgress]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Điều khiển mô phỏng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Loại chuyển động & Vật thể
            </label>
            <Select
              value={selectedScenario.toString()}
              onValueChange={(value) => setSelectedScenario(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.scenarios.map((s: any, index: number) => (
                  <SelectItem key={index} value={index.toString()}>
                    {s.preset_icon} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distance Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Khoảng cách ban đầu: {scenario.scenarios[selectedDistance].initial_z}m
            </label>
            <Slider
              value={[selectedDistance]}
              onValueChange={(value) => setSelectedDistance(value[0])}
              min={0}
              max={scenario.scenarios.length - 1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{scenario.scenarios[0].initial_z}m</span>
              <span>{scenario.scenarios[scenario.scenarios.length - 1].initial_z}m</span>
            </div>
          </div>

          {/* Animation Controls */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (animationProgress >= 1) setAnimationProgress(0);
              }}
              className={isAnimating ? "bg-yellow-600" : "bg-green-600"}
            >
              {isAnimating ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Tạm dừng
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Chạy animation
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                setIsAnimating(false);
                setAnimationProgress(0);
              }}
              variant="outline"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <Tabs defaultValue="2d" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="2d">
            <Eye className="mr-2 h-4 w-4" />
            2D Image Projection
          </TabsTrigger>
          <TabsTrigger value="3d">
            <Grid3x3 className="mr-2 h-4 w-4" />
            3D World Space
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="2d">
          <Card>
            <CardHeader>
              <CardTitle>2D Camera View</CardTitle>
              <CardDescription>
                Hình chiếu 2D trên cảm biến camera (pixels)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvas2dRef}
                width={1280}
                height={720}
                className="w-full border-2 border-gray-200 rounded-lg bg-white"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="3d">
          <Card>
            <CardHeader>
              <CardTitle>3D Trajectory</CardTitle>
              <CardDescription>
                Quỹ đạo trong không gian 3D (meters)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvas3dRef}
                width={800}
                height={600}
                className="w-full border-2 border-gray-200 rounded-lg bg-white"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Thông số camera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Focal Length</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentData.focal_length}px
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">FPS</div>
              <div className="text-2xl font-bold text-green-600">
                {currentData.fps}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Real Width</div>
              <div className="text-2xl font-bold text-purple-600">
                {currentData.real_width}m
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Duration</div>
              <div className="text-2xl font-bold text-orange-600">
                {currentData.duration}s
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas */}
      <Card>
        <CardHeader>
          <CardTitle>Công thức Camera Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Distance Estimation:</div>
            <div className="font-mono text-sm">{data.formulas.distance_estimation}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Projection X:</div>
            <div className="font-mono text-sm">{data.formulas.projection_x}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Projection Y:</div>
            <div className="font-mono text-sm">{data.formulas.projection_y}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


