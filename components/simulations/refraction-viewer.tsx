"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Info, Play, Pause } from "lucide-react";

interface RefractionViewerProps {
  data: any;
}

export function RefractionViewer({ data }: RefractionViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [angle, setAngle] = useState([30]);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  
  const scenario = data.scenarios[selectedScenario];
  const currentFrame = scenario.frames[Math.floor((angle[0] - 10) / 70 * (scenario.frames.length - 1))];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Vẽ môi trường 1 (phía trên)
    ctx.fillStyle = data.materials.find((m: any) => Math.abs(m.n - currentFrame.n1) < 0.01)?.color || '#E0F2FE';
    ctx.fillRect(0, 0, width, centerY);

    // Vẽ môi trường 2 (phía dưới)
    ctx.fillStyle = data.materials.find((m: any) => Math.abs(m.n - currentFrame.n2) < 0.01)?.color || '#0EA5E9';
    ctx.fillRect(0, centerY, width, height - centerY);

    // Vẽ mặt phân cách
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vẽ pháp tuyến
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    const rays = currentFrame.rays;
    const scale = 2;
    const offsetX = width / 2;
    const offsetY = centerY;

    // Vẽ tia tới
    if (rays.incident_ray) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const [start, end] = rays.incident_ray;
      ctx.moveTo(offsetX + start[0] * scale, offsetY - start[1] * scale);
      ctx.lineTo(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.stroke();

      // Mũi tên
      const angle_arrow = Math.atan2(end[1] - start[1], end[0] - start[0]);
      ctx.save();
      ctx.translate(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.rotate(-angle_arrow);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -8);
      ctx.lineTo(-15, 8);
      ctx.closePath();
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.restore();
    }

    // Vẽ tia khúc xạ
    if (rays.refracted_ray) {
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const [start, end] = rays.refracted_ray;
      ctx.moveTo(offsetX + start[0] * scale, offsetY - start[1] * scale);
      ctx.lineTo(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.stroke();

      // Mũi tên
      const angle_arrow = Math.atan2(start[1] - end[1], end[0] - start[0]);
      ctx.save();
      ctx.translate(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.rotate(-angle_arrow);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -8);
      ctx.lineTo(-15, 8);
      ctx.closePath();
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.restore();
    }

    // Vẽ tia phản xạ
    if (rays.reflected_ray && !currentFrame.is_total_reflection) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      const [start, end] = rays.reflected_ray;
      ctx.moveTo(offsetX + start[0] * scale, offsetY - start[1] * scale);
      ctx.lineTo(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Vẽ phản xạ toàn phần
    if (currentFrame.is_total_reflection && rays.reflected_ray) {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const [start, end] = rays.reflected_ray;
      ctx.moveTo(offsetX + start[0] * scale, offsetY - start[1] * scale);
      ctx.lineTo(offsetX + end[0] * scale, offsetY - end[1] * scale);
      ctx.stroke();
    }

    // Vẽ nhãn
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`n₁ = ${currentFrame.n1}`, 20, 30);
    ctx.fillText(`n₂ = ${currentFrame.n2}`, 20, centerY + 30);

  }, [currentFrame, data.materials]);

  const handleAngleChange = (value: number[]) => {
    setAngle(value);
  };

  return (
    <div className="space-y-6">
      {/* Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Mô phỏng khúc xạ ánh sáng
          </CardTitle>
          <CardDescription>{scenario.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="border-2 border-gray-200 rounded-lg bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Điều khiển</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Môi trường
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

          {/* Angle Control */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Góc tới: {angle[0]}°
            </label>
            <Slider
              value={angle}
              onValueChange={handleAngleChange}
              min={10}
              max={80}
              step={1}
              className="w-full"
            />
          </div>
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Góc tới</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentFrame.angle_in_deg.toFixed(1)}°
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Góc khúc xạ</div>
              <div className="text-2xl font-bold text-green-600">
                {currentFrame.angle_out_deg ? currentFrame.angle_out_deg.toFixed(1) + '°' : 'N/A'}
              </div>
            </div>
          </div>

          {currentFrame.is_total_reflection && (
            <Badge className="w-full justify-center bg-purple-600 text-white text-lg py-2">
              ⚡ Phản xạ toàn phần
            </Badge>
          )}

          {currentFrame.critical_angle && (
            <div className="text-sm text-gray-600">
              Góc tới hạn: <span className="font-semibold">{currentFrame.critical_angle.toFixed(1)}°</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theory */}
      <Card>
        <CardHeader>
          <CardTitle>Định luật Snell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-center">
            n₁ × sin(θ₁) = n₂ × sin(θ₂)
          </div>
          <div>
            <strong>Trong đó:</strong>
            <ul className="ml-4 mt-2 space-y-1">
              <li>• n₁, n₂: Chiết suất của hai môi trường</li>
              <li>• θ₁: Góc tới</li>
              <li>• θ₂: Góc khúc xạ</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


