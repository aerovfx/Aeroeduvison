"use client"

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Download, Settings, Zap, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AerodynamicsViewerProps {
  simulationData: any;
  onSimulationComplete?: () => void;
}

export function AerodynamicsViewer({ simulationData, onSimulationComplete }: AerodynamicsViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [visualizationMode, setVisualizationMode] = useState<'velocity' | 'pressure' | 'streamlines'>('velocity');
  const [showVectors, setShowVectors] = useState(true);
  
  const frames = simulationData?.results || [];
  const config = simulationData?.config || {};
  const forces = frames[currentFrame]?.forces || { drag: 0, lift: 0 };

  // WebGL rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = config.width || 200;
    const height = config.height || 100;
    const scale = Math.min(canvas.width / width, canvas.height / height);

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frame = frames[currentFrame];
    if (!frame) return;

    // Draw based on visualization mode
    if (visualizationMode === 'velocity') {
      drawVelocityField(ctx, frame, scale);
    } else if (visualizationMode === 'pressure') {
      drawPressureField(ctx, frame, scale);
    } else if (visualizationMode === 'streamlines') {
      drawStreamlines(ctx, frame, scale);
    }

    // Draw density field (colored smoke)
    drawDensityField(ctx, frame, scale);

    // Draw obstacles
    drawObstacles(ctx, config.obstacles || [], scale);

    // Draw velocity vectors if enabled
    if (showVectors && visualizationMode !== 'streamlines') {
      drawVelocityVectors(ctx, frame, scale);
    }

  }, [currentFrame, visualizationMode, showVectors, frames, config]);

  const drawVelocityField = (ctx: CanvasRenderingContext2D, frame: any, scale: number) => {
    const velocityField = frame.velocityField || [];
    
    velocityField.forEach((point: any) => {
      const x = point.x * scale;
      const y = point.y * scale;
      const magnitude = point.magnitude;
      
      // Color based on velocity magnitude
      const hue = Math.min(240 - magnitude * 40, 240); // Blue to red
      const saturation = 70;
      const lightness = 50 + magnitude * 5;
      
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
  };

  const drawPressureField = (ctx: CanvasRenderingContext2D, frame: any, scale: number) => {
    // Pressure visualization (simplified)
    const velocityField = frame.velocityField || [];
    const pRange = frame.pressureRange || { min: -1, max: 1 };
    
    velocityField.forEach((point: any) => {
      const x = point.x * scale;
      const y = point.y * scale;
      
      // Approximate pressure from velocity (Bernoulli's principle)
      const pressure = -0.5 * point.magnitude * point.magnitude;
      const normalized = (pressure - pRange.min) / (pRange.max - pRange.min);
      
      const hue = 240 * (1 - normalized); // Blue (low) to red (high)
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    });
  };

  const drawStreamlines = (ctx: CanvasRenderingContext2D, frame: any, scale: number) => {
    const streamlines = frame.streamlines || [];
    
    streamlines.forEach((line: any[], idx: number) => {
      if (line.length < 2) return;
      
      // Color each streamline differently
      const hue = (idx * 137.5) % 360; // Golden angle
      ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      ctx.moveTo(line[0][0] * scale, line[0][1] * scale);
      for (let i = 1; i < line.length; i++) {
        ctx.lineTo(line[i][0] * scale, line[i][1] * scale);
      }
      
      ctx.stroke();
    });
  };

  const drawDensityField = (ctx: CanvasRenderingContext2D, frame: any, scale: number) => {
    const densityField = frame.densityField || [];
    
    densityField.forEach((point: any) => {
      const x = point.x * scale;
      const y = point.y * scale;
      const density = point.density;
      
      if (density > 0.05) {
        // Smoke/dye visualization
        const alpha = Math.min(density, 1.0);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 3 * scale);
        gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(100, 200, 255, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    });
  };

  const drawObstacles = (ctx: CanvasRenderingContext2D, obstacles: any[], scale: number) => {
    obstacles.forEach((obstacle: any) => {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.strokeStyle = 'rgba(255, 150, 150, 1)';
      ctx.lineWidth = 2;
      
      if (obstacle.shape === 'circle') {
        const { x, y, radius } = obstacle.params;
        ctx.beginPath();
        ctx.arc(x * scale, y * scale, radius * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (obstacle.shape === 'rectangle') {
        const { x, y, width, height } = obstacle.params;
        ctx.fillRect(x * scale, y * scale, width * scale, height * scale);
        ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
      } else if (obstacle.shape === 'airfoil') {
        // Simplified airfoil drawing
        const { x, y, chord, thickness } = obstacle.params;
        ctx.beginPath();
        ctx.ellipse(
          x * scale + chord * scale / 2, 
          y * scale, 
          chord * scale / 2, 
          thickness * chord * scale, 
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
      }
    });
  };

  const drawVelocityVectors = (ctx: CanvasRenderingContext2D, frame: any, scale: number) => {
    const velocityField = frame.velocityField || [];
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    
    velocityField.forEach((point: any, idx: number) => {
      if (idx % 3 !== 0) return; // Sample fewer vectors
      
      const x = point.x * scale;
      const y = point.y * scale;
      const vx = point.vx * scale * 2;
      const vy = point.vy * scale * 2;
      
      if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + vx, y + vy);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(vy, vx);
        const headSize = 3;
        ctx.beginPath();
        ctx.moveTo(x + vx, y + vy);
        ctx.lineTo(
          x + vx - headSize * Math.cos(angle - Math.PI / 6),
          y + vy - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x + vx, y + vy);
        ctx.lineTo(
          x + vx - headSize * Math.cos(angle + Math.PI / 6),
          y + vy - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          setIsPlaying(false);
          if (onSimulationComplete) onSimulationComplete();
          return prev;
        }
        return next;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, frames.length, onSimulationComplete]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `aerodynamics-frame-${currentFrame}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Main Canvas */}
      <Card>
        <CardContent className="p-6">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full rounded-lg bg-gray-900 border border-gray-700"
          />
          
          {/* Controls */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                onClick={handlePlayPause}
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Tạm dừng' : 'Phát'}
              </Button>
              
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Tải ảnh
              </Button>
              
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Frame: {currentFrame + 1} / {frames.length}
                </span>
              </div>
            </div>
            
            {/* Playback Speed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Tốc độ phát</label>
                <span className="text-sm text-gray-600">{playbackSpeed}x</span>
              </div>
              <Slider
                value={[playbackSpeed]}
                onValueChange={(values) => setPlaybackSpeed(values[0])}
                min={0.5}
                max={3}
                step={0.5}
                className="w-full"
              />
            </div>
            
            {/* Frame Scrubber */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Vị trí</label>
              <Slider
                value={[currentFrame]}
                onValueChange={(values) => {
                  setCurrentFrame(values[0]);
                  setIsPlaying(false);
                }}
                min={0}
                max={frames.length - 1}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualization Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tùy chọn hiển thị
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={visualizationMode} onValueChange={(v: any) => setVisualizationMode(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="velocity">Vận tốc</TabsTrigger>
              <TabsTrigger value="pressure">Áp suất</TabsTrigger>
              <TabsTrigger value="streamlines">Đường dòng</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Hiển thị vector vận tốc</span>
            <Button
              variant={showVectors ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVectors(!showVectors)}
            >
              {showVectors ? "Bật" : "Tắt"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forces Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wind className="h-5 w-5 text-blue-500" />
              Lực cản (Drag)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {forces.drag_coefficient?.toFixed(4) || '0.0000'}
              </div>
              <div className="text-sm text-gray-600">
                Hệ số lực cản (Cd)
              </div>
              <Badge variant={Math.abs(forces.drag_coefficient) < 0.5 ? "success" : "warning"}>
                {Math.abs(forces.drag_coefficient) < 0.5 ? "Tốt" : "Cao"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-purple-500" />
              Lực nâng (Lift)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">
                {forces.lift_coefficient?.toFixed(4) || '0.0000'}
              </div>
              <div className="text-sm text-gray-600">
                Hệ số lực nâng (Cl)
              </div>
              <Badge variant={Math.abs(forces.lift_coefficient) > 0.1 ? "success" : "secondary"}>
                {Math.abs(forces.lift_coefficient) > 0.1 ? "Có lực nâng" : "Đối xứng"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

