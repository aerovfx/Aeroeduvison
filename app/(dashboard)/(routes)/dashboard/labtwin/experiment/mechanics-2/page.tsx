"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Zap, Clock, Target, BarChart3 } from "lucide-react";

export default function FreeFallExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [initialHeight, setInitialHeight] = useState([100]); // meters
  const [time, setTime] = useState(0);
  const [height, setHeight] = useState(100);
  const [velocity, setVelocity] = useState(0);
  const [dataPoints, setDataPoints] = useState<{time: number, height: number, velocity: number}[]>([]);

  const startTime = useRef<number>(0);
  const lastTime = useRef<number>(0);
  const g = 9.8; // m/s²

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Vẽ mặt đất
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
      
      // Vẽ trục tọa độ
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(50, canvas.height - 50);
      ctx.moveTo(50, canvas.height - 50);
      ctx.lineTo(canvas.width - 50, canvas.height - 50);
      ctx.stroke();

      // Vẽ nhãn trục
      ctx.fillStyle = '#374151';
      ctx.font = '14px Arial';
      ctx.fillText('Độ cao (m)', 10, 30);
      ctx.fillText('Thời gian (s)', canvas.width - 100, canvas.height - 20);

      // Vẽ vật thể
      const currentHeight = Math.max(0, height);
      const y = canvas.height - 50 - (currentHeight / initialHeight[0]) * (canvas.height - 100);
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.arc(100, y, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Vẽ vector vận tốc
      if (isRunning && currentHeight > 0) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(100, y);
        ctx.lineTo(100, y + Math.min(velocity * 2, 30));
        ctx.stroke();
        
        // Mũi tên
        ctx.beginPath();
        ctx.moveTo(100, y + Math.min(velocity * 2, 30));
        ctx.lineTo(95, y + Math.min(velocity * 2, 30) - 8);
        ctx.lineTo(105, y + Math.min(velocity * 2, 30) - 8);
        ctx.closePath();
        ctx.fill();
      }

      // Vẽ đồ thị độ cao theo thời gian
      if (dataPoints.length > 1) {
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        dataPoints.forEach((point, index) => {
          const x = 200 + point.time * 30;
          const y = canvas.height - 50 - (point.height / initialHeight[0]) * (canvas.height - 100);
          
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
          const x = 200 + point.time * 30;
          const y = canvas.height - 50 - (point.height / initialHeight[0]) * (canvas.height - 100);
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
      }

      // Hiển thị thông tin
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 60, 80);
      ctx.fillText(`Độ cao: ${Math.max(0, height).toFixed(1)}m`, 60, 105);
      ctx.fillText(`Vận tốc: ${velocity.toFixed(1)} m/s`, 60, 130);
    };

    draw();
  }, [height, time, velocity, isRunning, dataPoints, initialHeight]);

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
        
        // Tính toán vận tốc và vị trí theo công thức rơi tự do
        const newVelocity = g * totalTime;
        const newHeight = initialHeight[0] - 0.5 * g * totalTime * totalTime;
        
        setVelocity(newVelocity);
        setHeight(Math.max(0, newHeight));
        
        // Thêm điểm dữ liệu mỗi 0.2 giây
        if (Math.floor(totalTime * 5) > dataPoints.length) {
          setDataPoints(prev => [...prev, { 
            time: totalTime, 
            height: Math.max(0, newHeight), 
            velocity: newVelocity 
          }]);
        }

        // Dừng khi chạm đất
        if (newHeight <= 0 && totalTime > 0) {
          setIsRunning(false);
          setHeight(0);
          setVelocity(g * Math.sqrt(2 * initialHeight[0] / g));
        }

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
  }, [isRunning, initialHeight, dataPoints.length]);

  const startExperiment = () => {
    setIsRunning(true);
    startTime.current = 0;
    lastTime.current = 0;
    setHeight(initialHeight[0]);
    setVelocity(0);
    setTime(0);
    setDataPoints([]);
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
    setHeight(initialHeight[0]);
    setVelocity(0);
    setDataPoints([]);
    startTime.current = 0;
    lastTime.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Tính thời gian rơi lý thuyết
  const theoreticalTime = Math.sqrt(2 * initialHeight[0] / g);
  const theoreticalVelocity = g * theoreticalTime;

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
              <h1 className="text-3xl font-bold text-gray-900">Chuyển động rơi tự do</h1>
              <p className="text-gray-600 mt-1">Thí nghiệm rơi tự do với gia tốc trọng trường</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Cơ học</Badge>
                <Badge variant="outline">Lớp 10</Badge>
                <Badge variant="outline">35 phút</Badge>
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
                  Mô phỏng rơi tự do
                </CardTitle>
                <CardDescription>
                  Quan sát chuyển động rơi tự do và đồ thị độ cao theo thời gian
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
                {/* Độ cao ban đầu */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Độ cao ban đầu: {initialHeight[0]} m
                  </label>
                  <Slider
                    value={initialHeight}
                    onValueChange={(value) => {
                      setInitialHeight(value);
                      if (!isRunning) {
                        setHeight(value[0]);
                      }
                    }}
                    max={200}
                    min={10}
                    step={10}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10 m</span>
                    <span>200 m</span>
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

                {/* Theoretical Values */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Giá trị lý thuyết:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Thời gian rơi: {theoreticalTime.toFixed(2)}s</div>
                    <div>Vận tốc khi chạm đất: {theoreticalVelocity.toFixed(1)} m/s</div>
                    <div>Gia tốc: {g} m/s²</div>
                  </div>
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
                    {Math.max(0, height).toFixed(1)}m
                  </div>
                  <div className="text-sm text-gray-600">Độ cao</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {velocity.toFixed(1)} m/s
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
                        <div>Độ cao (m)</div>
                        <div>Vận tốc (m/s)</div>
                      </div>
                      {dataPoints.slice(-10).map((point, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-white p-2 rounded border">
                          <div>{point.time.toFixed(1)}</div>
                          <div>{point.height.toFixed(1)}</div>
                          <div>{point.velocity.toFixed(1)}</div>
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
                  <strong>Định nghĩa:</strong> Rơi tự do là chuyển động thẳng nhanh dần đều theo phương thẳng đứng từ trên xuống dưới với gia tốc g.
                </div>
                <div>
                  <strong>Công thức:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• h = h₀ - ½gt²</li>
                    <li>• v = gt</li>
                    <li>• t = √(2h₀/g)</li>
                  </ul>
                </div>
                <div>
                  <strong>Trong đó:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• h: độ cao hiện tại (m)</li>
                    <li>• h₀: độ cao ban đầu (m)</li>
                    <li>• v: vận tốc (m/s)</li>
                    <li>• t: thời gian (s)</li>
                    <li>• g: gia tốc trọng trường (9.8 m/s²)</li>
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

