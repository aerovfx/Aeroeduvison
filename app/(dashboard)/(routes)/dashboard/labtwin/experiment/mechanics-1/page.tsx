"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Zap, Clock, Target, BarChart3 } from "lucide-react";

export default function UniformMotionExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [velocity, setVelocity] = useState([5]); // m/s
  const [time, setTime] = useState(0);
  const [position, setPosition] = useState(0);
  const [dataPoints, setDataPoints] = useState<{time: number, position: number, velocity: number}[]>([]);

  const startTime = useRef<number>(0);
  const lastTime = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Vẽ trục tọa độ
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, canvas.height - 50);
      ctx.lineTo(canvas.width - 50, canvas.height - 50);
      ctx.moveTo(50, 50);
      ctx.lineTo(50, canvas.height - 50);
      ctx.stroke();

      // Vẽ nhãn trục
      ctx.fillStyle = '#374151';
      ctx.font = '14px Arial';
      ctx.fillText('Vị trí (m)', 20, 30);
      ctx.fillText('Thời gian (s)', canvas.width - 100, canvas.height - 20);

      // Vẽ vật thể
      const currentPos = position * 10 + 50; // Scale for visualization
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(currentPos, canvas.height - 50, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Vẽ vector vận tốc
      if (isRunning) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(currentPos, canvas.height - 50);
        ctx.lineTo(currentPos + velocity[0] * 5, canvas.height - 50);
        ctx.stroke();
        
        // Mũi tên
        ctx.beginPath();
        ctx.moveTo(currentPos + velocity[0] * 5, canvas.height - 50);
        ctx.lineTo(currentPos + velocity[0] * 5 - 8, canvas.height - 55);
        ctx.lineTo(currentPos + velocity[0] * 5 - 8, canvas.height - 45);
        ctx.closePath();
        ctx.fill();
      }

      // Vẽ đồ thị vị trí theo thời gian
      if (dataPoints.length > 1) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        dataPoints.forEach((point, index) => {
          const x = 50 + point.time * 20;
          const y = canvas.height - 50 - point.position * 2;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Vẽ các điểm dữ liệu
        ctx.fillStyle = '#10B981';
        dataPoints.forEach((point) => {
          const x = 50 + point.time * 20;
          const y = canvas.height - 50 - point.position * 2;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Hiển thị thông tin
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 60, 80);
      ctx.fillText(`Vị trí: ${position.toFixed(1)}m`, 60, 105);
      ctx.fillText(`Vận tốc: ${velocity[0]} m/s`, 60, 130);
    };

    draw();
  }, [position, time, velocity, isRunning, dataPoints]);

  useEffect(() => {
    if (isRunning) {
      const animate = (currentTime: number) => {
        if (!startTime.current) {
          startTime.current = currentTime;
          lastTime.current = currentTime;
        }

        const deltaTime = (currentTime - lastTime.current) / 1000;
        const totalTime = (currentTime - startTime.current) / 1000;

        setTime(totalTime);
        setPosition(prev => {
          const newPos = prev + velocity[0] * deltaTime;
          
          // Thêm điểm dữ liệu mỗi 0.5 giây
          if (Math.floor(totalTime * 2) > dataPoints.length) {
            setDataPoints(prev => [...prev, { time: totalTime, position: newPos, velocity: velocity[0] }]);
          }
          
          return newPos;
        });

        lastTime.current = currentTime;

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, velocity, dataPoints.length]);

  const startExperiment = () => {
    setIsRunning(true);
    startTime.current = 0;
    lastTime.current = 0;
  };

  const pauseExperiment = () => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const resetExperiment = () => {
    setIsRunning(false);
    setTime(0);
    setPosition(0);
    setDataPoints([]);
    startTime.current = 0;
    lastTime.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning-paths-demo/labtwin" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại LabTwin
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-red-500 rounded-xl text-white">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chuyển động thẳng đều</h1>
              <p className="text-gray-600 mt-1">Mô phỏng chuyển động thẳng đều với đồ thị vận tốc</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Cơ học</Badge>
                <Badge variant="outline">Lớp 10</Badge>
                <Badge variant="outline">30 phút</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Simulation */}
          <div className="lg:col-span-2 space-y-6">
            {/* Canvas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Mô phỏng chuyển động
                </CardTitle>
                <CardDescription>
                  Quan sát chuyển động thẳng đều và đồ thị vị trí theo thời gian
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="border rounded-lg bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Điều khiển thí nghiệm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Vận tốc */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Vận tốc: {velocity[0]} m/s
                  </label>
                  <Slider
                    value={velocity}
                    onValueChange={(value) => setVelocity(value)}
                    max={20}
                    min={1}
                    step={0.5}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 m/s</span>
                    <span>20 m/s</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={isRunning ? pauseExperiment : startExperiment}
                    className={`flex-1 ${
                      isRunning 
                        ? "bg-yellow-600 hover:bg-yellow-700" 
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Tạm dừng
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Bắt đầu
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={resetExperiment}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Dữ liệu hiện tại
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {time.toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600">Thời gian</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {position.toFixed(1)}m
                  </div>
                  <div className="text-sm text-gray-600">Vị trí</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {velocity[0]} m/s
                  </div>
                  <div className="text-sm text-gray-600">Vận tốc</div>
                </div>
              </CardContent>
            </Card>

            {/* Data Points */}
            <Card>
              <CardHeader>
                <CardTitle>Dữ liệu thí nghiệm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {dataPoints.length > 0 ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-gray-600 bg-gray-100 p-2 rounded">
                        <div>Thời gian (s)</div>
                        <div>Vị trí (m)</div>
                        <div>Vận tốc (m/s)</div>
                      </div>
                      {dataPoints.slice(-10).map((point, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-white p-2 rounded border">
                          <div>{point.time.toFixed(1)}</div>
                          <div>{point.position.toFixed(1)}</div>
                          <div>{point.velocity}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Chưa có dữ liệu. Bắt đầu thí nghiệm để thu thập dữ liệu.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Theory */}
            <Card>
              <CardHeader>
                <CardTitle>Lý thuyết</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Định nghĩa:</strong> Chuyển động thẳng đều là chuyển động có quỹ đạo thẳng và có vận tốc không đổi.
                </div>
                <div>
                  <strong>Công thức:</strong> s = v × t
                </div>
                <div>
                  <strong>Trong đó:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• s: quãng đường (m)</li>
                    <li>• v: vận tốc (m/s)</li>
                    <li>• t: thời gian (s)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

