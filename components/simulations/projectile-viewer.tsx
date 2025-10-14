"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Info, Play, Pause, RotateCcw, TrendingUp } from "lucide-react";

interface ProjectileViewerProps {
  data: any;
}

export function ProjectileViewer({ data }: ProjectileViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasXtRef = useRef<HTMLCanvasElement>(null);
  const canvasYtRef = useRef<HTMLCanvasElement>(null);
  const canvasVtRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [angle, setAngle] = useState([45]);
  const [velocity, setVelocity] = useState([20]);
  const [gravity, setGravity] = useState([9.8]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number>();
  
  const scenario = data.scenarios[selectedScenario];
  
  // Lấy frame hiện tại dựa vào scenario mode
  const getCurrentFrame = () => {
    if (scenario.mode === 'angle') {
      const index = Math.floor((angle[0] - 15) / 60 * (scenario.frames.length - 1));
      return scenario.frames[Math.min(index, scenario.frames.length - 1)];
    } else if (scenario.mode === 'velocity') {
      const index = Math.floor((velocity[0] - 10) / 30 * (scenario.frames.length - 1));
      return scenario.frames[Math.min(index, scenario.frames.length - 1)];
    } else if (scenario.mode === 'gravity') {
      const index = scenario.planets?.findIndex((p: any) => Math.abs(p.g - gravity[0]) < 0.5) || 0;
      return scenario.frames[Math.min(Math.max(0, index), scenario.frames.length - 1)];
    }
    return scenario.frames[0];
  };

  const currentFrame = getCurrentFrame();

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const margin = 50;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Vẽ background
    ctx.fillStyle = '#F0F9FF';
    ctx.fillRect(0, 0, width, height);

    // Vẽ ground
    ctx.fillStyle = '#86EFAC';
    ctx.fillRect(0, height - margin, width, margin);

    // Vẽ lưới
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let x = margin; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - margin);
      ctx.stroke();
    }
    for (let y = 0; y < height - margin; y += 50) {
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Scale trajectory to fit canvas
    const maxX = currentFrame.range * 1.2;
    const maxY = currentFrame.max_height * 1.5;
    const scaleX = (width - margin * 2) / maxX;
    const scaleY = (height - margin * 2) / maxY;

    // Vẽ quỹ đạo đầy đủ
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    currentFrame.trajectory.forEach((point: any, index: number) => {
      const x = margin + point.x * scaleX;
      const y = height - margin - point.y * scaleY;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Vẽ các điểm trên quỹ đạo
    ctx.fillStyle = '#60A5FA';
    currentFrame.trajectory.forEach((point: any, index: number) => {
      if (index % 5 === 0) {
        const x = margin + point.x * scaleX;
        const y = height - margin - point.y * scaleY;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Animation: vẽ vật thể di chuyển
    if (isAnimating && animationProgress > 0) {
      const trajectoryIndex = Math.floor(animationProgress * (currentFrame.trajectory.length - 1));
      const point = currentFrame.trajectory[trajectoryIndex];
      
      if (point) {
        const x = margin + point.x * scaleX;
        const y = height - margin - point.y * scaleY;
        
        // Vẽ vật thể
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Vẽ vector vận tốc
        if (point.vx && point.vy) {
          const vScale = 3;
          ctx.strokeStyle = '#F97316';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + point.vx * vScale, y - point.vy * vScale);
          ctx.stroke();
          
          // Arrow head
          const angle = Math.atan2(-point.vy, point.vx);
          ctx.save();
          ctx.translate(x + point.vx * vScale, y - point.vy * vScale);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-10, -5);
          ctx.lineTo(-10, 5);
          ctx.closePath();
          ctx.fillStyle = '#F97316';
          ctx.fill();
          ctx.restore();
        }
        
        // Vẽ trail
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i <= trajectoryIndex; i++) {
          const p = currentFrame.trajectory[i];
          const px = margin + p.x * scaleX;
          const py = height - margin - p.y * scaleY;
          
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    } else {
      // Vẽ vật thể ở vị trí ban đầu
      const x = margin;
      const y = height - margin;
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Vẽ thông tin
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Tầm xa: ${currentFrame.range.toFixed(1)} m`, 10, 20);
    ctx.fillText(`Độ cao max: ${currentFrame.max_height.toFixed(1)} m`, 10, 40);
    ctx.fillText(`Thời gian: ${currentFrame.time_of_flight.toFixed(1)} s`, 10, 60);

  }, [currentFrame, isAnimating, animationProgress]);

  // Draw X vs Time graph
  useEffect(() => {
    const canvas = canvasXtRef.current;
    if (!canvas || !currentFrame.trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const t_max = currentFrame.time_of_flight;
    const x_max = currentFrame.range;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#F0F9FF';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let t = 0; t <= t_max; t += 0.5) {
      const x = padding + (t / t_max) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw x(t)
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    currentFrame.trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height - padding - (point.x / x_max) * (height - 2 * padding);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('x(t) - Vị trí ngang', 10, 25);
    ctx.fillText('t(s)', width - 40, height - 10);
    ctx.fillText('x(m)', 10, padding - 10);
  }, [currentFrame]);

  // Draw Y vs Time graph
  useEffect(() => {
    const canvas = canvasYtRef.current;
    if (!canvas || !currentFrame.trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const t_max = currentFrame.time_of_flight;
    const y_max = currentFrame.max_height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let t = 0; t <= t_max; t += 0.5) {
      const x = padding + (t / t_max) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw y(t)
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    currentFrame.trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height - padding - (point.y / (y_max * 1.2)) * (height - 2 * padding);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('y(t) - Độ cao', 10, 25);
    ctx.fillText('t(s)', width - 40, height - 10);
    ctx.fillText('y(m)', 10, padding - 10);
  }, [currentFrame]);

  // Draw V vs Time graph
  useEffect(() => {
    const canvas = canvasVtRef.current;
    if (!canvas || !currentFrame.trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const t_max = currentFrame.time_of_flight;
    const v_max = Math.max(...currentFrame.trajectory.map((p: any) => p.v));

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let t = 0; t <= t_max; t += 0.5) {
      const x = padding + (t / t_max) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw v(t)
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    currentFrame.trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height - padding - (point.v / v_max) * (height - 2 * padding);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('v(t) - Vận tốc', 10, 25);
    ctx.fillText('t(s)', width - 40, height - 10);
    ctx.fillText('v(m/s)', 10, padding - 10);
  }, [currentFrame]);

  return (
    <div className="space-y-6">
      {/* Charts with Tabs */}
      <Tabs defaultValue="trajectory" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trajectory">Quỹ đạo (x-y)</TabsTrigger>
          <TabsTrigger value="xt">x(t)</TabsTrigger>
          <TabsTrigger value="yt">y(t)</TabsTrigger>
          <TabsTrigger value="vt">v(t)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trajectory">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quỹ đạo chuyển động
              </CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={400}
                  className="border-2 border-gray-200 rounded-lg bg-white"
                />
              </div>
              
              <div className="flex gap-2 justify-center">
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
        </TabsContent>
        
        <TabsContent value="xt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Đồ thị vị trí ngang x(t)
              </CardTitle>
              <CardDescription>x = v₀ × cos(θ) × t</CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasXtRef}
                width={900}
                height={350}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="yt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Đồ thị độ cao y(t)
              </CardTitle>
              <CardDescription>y = v₀ × sin(θ) × t - ½gt²</CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasYtRef}
                width={900}
                height={350}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vt">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-red-600" />
                Đồ thị vận tốc v(t)
              </CardTitle>
              <CardDescription>v = √(vₓ² + vᵧ²)</CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasVtRef}
                width={900}
                height={350}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Điều khiển</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Chế độ
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
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Controls based on scenario */}
          {scenario.mode === 'angle' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Góc ném: {angle[0]}°
              </label>
              <Slider
                value={angle}
                onValueChange={setAngle}
                min={15}
                max={75}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {scenario.mode === 'velocity' && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Vận tốc ban đầu: {velocity[0]} m/s
              </label>
              <Slider
                value={velocity}
                onValueChange={setVelocity}
                min={10}
                max={40}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {scenario.mode === 'gravity' && scenario.planets && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Hành tinh
              </label>
              <div className="grid grid-cols-2 gap-2">
                {scenario.planets.map((planet: any) => (
                  <Button
                    key={planet.name}
                    variant={Math.abs(gravity[0] - planet.g) < 0.5 ? "default" : "outline"}
                    onClick={() => setGravity([planet.g])}
                    className="w-full"
                    style={{
                      backgroundColor: Math.abs(gravity[0] - planet.g) < 0.5 ? planet.color : undefined
                    }}
                  >
                    {planet.name}
                    <br />
                    <span className="text-xs">g = {planet.g} m/s²</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Dữ liệu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Góc ném</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentFrame.angle_deg.toFixed(1)}°
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Vận tốc</div>
              <div className="text-2xl font-bold text-green-600">
                {currentFrame.v0} m/s
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Tầm xa</div>
              <div className="text-2xl font-bold text-red-600">
                {currentFrame.range.toFixed(1)} m
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Độ cao max</div>
              <div className="text-2xl font-bold text-purple-600">
                {currentFrame.max_height.toFixed(1)} m
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">Vận tốc ngang (vₓ)</div>
              <div className="text-lg font-semibold">{currentFrame.v0x.toFixed(1)} m/s</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">Vận tốc dọc (vᵧ)</div>
              <div className="text-lg font-semibold">{currentFrame.v0y.toFixed(1)} m/s</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas */}
      <Card>
        <CardHeader>
          <CardTitle>Công thức</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Tầm xa:</div>
            <div className="font-mono text-sm">{data.formulas.range}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Độ cao tối đa:</div>
            <div className="font-mono text-sm">{data.formulas.max_height}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium mb-1">Thời gian bay:</div>
            <div className="font-mono text-sm">{data.formulas.time_of_flight}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

