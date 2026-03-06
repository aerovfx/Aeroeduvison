"use client"

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ThermoFlowHeatmapProps {
  simulationData: any;
}

export function ThermoFlowHeatmap({ simulationData }: ThermoFlowHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const frames = simulationData?.results || [];
  const config = simulationData?.config || {};
  const stats = frames[currentFrame]?.statistics || { min: 0, max: 100, mean: 50 };

  // Render heatmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = config.width || 100;
    const height = config.height || 100;
    const scale = Math.min(canvas.width / width, canvas.height / height);

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const frame = frames[currentFrame];
    if (!frame) return;

    const heatmap = frame.heatmap || [];
    const minTemp = stats.min;
    const maxTemp = stats.max;

    // Draw heatmap
    heatmap.forEach((point: any) => {
      const x = point.x * scale;
      const y = point.y * scale;
      const temp = point.temperature;
      
      // Normalize temperature to 0-1
      const normalized = (temp - minTemp) / (maxTemp - minTemp + 0.001);
      
      // Color mapping: Blue (cold) → Red (hot)
      let r, g, b;
      if (normalized < 0.5) {
        // Blue to yellow
        const t = normalized * 2;
        r = Math.floor(t * 255);
        g = Math.floor(t * 255);
        b = Math.floor((1 - t) * 255);
      } else {
        // Yellow to red
        const t = (normalized - 0.5) * 2;
        r = 255;
        g = Math.floor((1 - t) * 255);
        b = 0;
      }
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      
      if (point.isObstacle) {
        ctx.fillStyle = '#444444';
      }
      
      ctx.fillRect(x, y, scale * 2, scale * 2);
    });

    // Draw hot regions highlights
    if (frame.hot_regions) {
      frame.hot_regions.slice(0, 20).forEach((region: any) => {
        const x = region[0] * scale;
        const y = region[1] * scale;
        
        // Draw circle
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + scale, y + scale, scale * 3, 0, Math.PI * 2);
        ctx.stroke();
      });
    }

    // Draw legend
    drawColorLegend(ctx, canvas.width - 60, 20, minTemp, maxTemp);

  }, [currentFrame, frames, config, stats]);

  const drawColorLegend = (ctx: CanvasRenderingContext2D, x: number, y: number, 
                          minTemp: number, maxTemp: number) => {
    const legendHeight = 200;
    const legendWidth = 30;
    
    // Draw gradient
    for (let i = 0; i < legendHeight; i++) {
      const normalized = 1 - (i / legendHeight);
      
      let r, g, b;
      if (normalized < 0.5) {
        const t = normalized * 2;
        r = Math.floor(t * 255);
        g = Math.floor(t * 255);
        b = Math.floor((1 - t) * 255);
      } else {
        const t = (normalized - 0.5) * 2;
        r = 255;
        g = Math.floor((1 - t) * 255);
        b = 0;
      }
      
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y + i, legendWidth, 1);
    }
    
    // Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, legendWidth, legendHeight);
    
    // Labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${maxTemp.toFixed(0)}°C`, x + legendWidth + 5, y + 12);
    ctx.fillText(`${minTemp.toFixed(0)}°C`, x + legendWidth + 5, y + legendHeight);
  };

  // Animation
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, 100 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, frames.length]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="w-full rounded-lg bg-gray-900 border-2 border-gray-700"
          />
          
          {/* Controls */}
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setIsPlaying(!isPlaying)}
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
              >
                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isPlaying ? 'Dừng' : 'Phát'}
              </Button>
              
              <Button onClick={() => { setIsPlaying(false); setCurrentFrame(0); }} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <Button onClick={() => {
                const link = document.createElement('a');
                link.download = `thermoflow-frame-${currentFrame}.png`;
                link.href = canvasRef.current?.toDataURL() || '';
                link.click();
              }} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Tải ảnh
              </Button>
              
              <div className="ml-auto">
                <span className="text-sm text-gray-600">
                  Frame: {currentFrame + 1} / {frames.length}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tốc độ: {playbackSpeed}x</label>
              <Slider
                value={[playbackSpeed]}
                onValueChange={(v) => setPlaybackSpeed(v[0])}
                min={0.5}
                max={3}
                step={0.5}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Vị trí</label>
              <Slider
                value={[currentFrame]}
                onValueChange={(v) => { setCurrentFrame(v[0]); setIsPlaying(false); }}
                min={0}
                max={frames.length - 1}
                step={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-red-700">{stats.max.toFixed(1)}°C</div>
            <div className="text-sm text-red-600">Nhiệt độ cao nhất</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-1">❄️</div>
            <div className="text-2xl font-bold text-blue-700">{stats.min.toFixed(1)}°C</div>
            <div className="text-sm text-blue-600">Nhiệt độ thấp nhất</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-1">📊</div>
            <div className="text-2xl font-bold text-green-700">{stats.mean.toFixed(1)}°C</div>
            <div className="text-sm text-green-600">Nhiệt độ trung bình</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-1">📈</div>
            <div className="text-2xl font-bold text-purple-700">{stats.std.toFixed(1)}°C</div>
            <div className="text-sm text-purple-600">Độ lệch chuẩn</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



