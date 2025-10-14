"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Waves, Clock, Target, BarChart3 } from "lucide-react";

export default function MechanicalWaveExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [frequency, setFrequency] = useState([2]); // Hz
  const [amplitude, setAmplitude] = useState([50]); // pixels
  const [waveType, setWaveType] = useState<'longitudinal' | 'transverse'>('transverse');
  const [time, setTime] = useState(0);
  const [dataPoints, setDataPoints] = useState<{time: number, position: number, displacement: number}[]>([]);

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
      ctx.moveTo(50, canvas.height / 2);
      ctx.lineTo(canvas.width - 50, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 50);
      ctx.lineTo(canvas.width / 2, canvas.height - 50);
      ctx.stroke();

      // Vẽ nhãn trục
      ctx.fillStyle = '#374151';
      ctx.font = '14px Arial';
      ctx.fillText('Vị trí (m)', canvas.width - 100, canvas.height - 20);
      ctx.fillText('Biên độ', 20, 30);

      const centerY = canvas.height / 2;
      const startX = 100;
      const endX = canvas.width - 100;
      const wavelength = (endX - startX) / 2;

      if (waveType === 'transverse') {
        // Vẽ sóng ngang
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let x = startX; x < endX; x += 2) {
          const position = (x - startX) / wavelength;
          const wave = amplitude[0] * Math.sin(2 * Math.PI * (position - frequency[0] * time));
          const y = centerY + wave;
          
          if (x === startX) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Vẽ các điểm trên sóng
        ctx.fillStyle = '#3B82F6';
        for (let i = 0; i < 8; i++) {
          const x = startX + (i * wavelength / 4);
          const position = (x - startX) / wavelength;
          const wave = amplitude[0] * Math.sin(2 * Math.PI * (position - frequency[0] * time));
          const y = centerY + wave;
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      } else {
        // Vẽ sóng dọc
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        
        for (let x = startX; x < endX; x += 10) {
          const position = (x - startX) / wavelength;
          const displacement = amplitude[0] * 0.3 * Math.sin(2 * Math.PI * (position - frequency[0] * time));
          
          ctx.beginPath();
          ctx.moveTo(x + displacement, centerY - 20);
          ctx.lineTo(x + displacement, centerY + 20);
          ctx.stroke();
        }

        // Vẽ các hạt
        ctx.fillStyle = '#3B82F6';
        for (let i = 0; i < 8; i++) {
          const x = startX + (i * wavelength / 4);
          const position = (x - startX) / wavelength;
          const displacement = amplitude[0] * 0.3 * Math.sin(2 * Math.PI * (position - frequency[0] * time));
          
          ctx.beginPath();
          ctx.arc(x + displacement, centerY, 6, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Vẽ vector lan truyền sóng
      if (isRunning) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + 50, centerY - 60);
        ctx.lineTo(startX + 100, centerY - 60);
        ctx.stroke();
        
        // Mũi tên
        ctx.beginPath();
        ctx.moveTo(startX + 100, centerY - 60);
        ctx.lineTo(startX + 95, centerY - 65);
        ctx.lineTo(startX + 95, centerY - 55);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#EF4444';
        ctx.font = '12px Arial';
        ctx.fillText('Lan truyền', startX + 55, centerY - 65);
      }

      // Hiển thị thông tin
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Loại sóng: ${waveType === 'transverse' ? 'Sóng ngang' : 'Sóng dọc'}`, 60, 80);
      ctx.fillText(`Tần số: ${frequency[0]} Hz`, 60, 105);
      ctx.fillText(`Biên độ: ${amplitude[0]}`, 60, 130);
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 60, 155);

      // Tính và hiển thị bước sóng
      const waveSpeed = 10; // m/s (giả định)
      const calculatedWavelength = waveSpeed / frequency[0];
      ctx.fillText(`Bước sóng: ${calculatedWavelength.toFixed(1)}m`, 60, 180);
    };

    draw();
  }, [frequency, amplitude, waveType, time, isRunning]);

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

        // Thêm điểm dữ liệu mỗi 0.5 giây
        if (Math.floor(totalTime * 2) > dataPoints.length) {
          const wavelength = 10 / frequency[0]; // waveSpeed / frequency
          const position = 5; // vị trí cố định để quan sát
          const displacement = amplitude[0] * Math.sin(2 * Math.PI * (position / wavelength - frequency[0] * totalTime));
          
          setDataPoints(prev => [...prev, { 
            time: totalTime, 
            position: position, 
            displacement: displacement 
          }]);
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
  }, [isRunning, frequency, amplitude, dataPoints.length]);

  const startExperiment = () => {
    setIsRunning(true);
    startTime.current = 0;
    lastTime.current = 0;
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
            <div className="p-4 bg-green-500 rounded-xl text-white">
              <Waves className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sóng cơ học</h1>
              <p className="text-gray-600 mt-1">Mô phỏng sóng dọc và sóng ngang</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Sóng</Badge>
                <Badge variant="outline">Lớp 12</Badge>
                <Badge variant="outline">40 phút</Badge>
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
                  Mô phỏng sóng cơ học
                </CardTitle>
                <CardDescription>
                  Quan sát sóng dọc và sóng ngang với các thông số khác nhau
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
                {/* Loại sóng */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Loại sóng
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setWaveType('transverse')}
                      variant={waveType === 'transverse' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      disabled={isRunning}
                    >
                      Sóng ngang
                    </Button>
                    <Button
                      onClick={() => setWaveType('longitudinal')}
                      variant={waveType === 'longitudinal' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      disabled={isRunning}
                    >
                      Sóng dọc
                    </Button>
                  </div>
                </div>

                {/* Tần số */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tần số: {frequency[0]} Hz
                  </label>
                  <Slider
                    value={frequency}
                    onValueChange={setFrequency}
                    max={5}
                    min={0.5}
                    step={0.1}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5 Hz</span>
                    <span>5 Hz</span>
                  </div>
                </div>

                {/* Biên độ */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Biên độ: {amplitude[0]}
                  </label>
                  <Slider
                    value={amplitude}
                    onValueChange={setAmplitude}
                    max={100}
                    min={10}
                    step={5}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10</span>
                    <span>100</span>
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

                {/* Wave Properties */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tính chất sóng:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Tần số: {frequency[0]} Hz</div>
                    <div>Bước sóng: {(10 / frequency[0]).toFixed(2)}m</div>
                    <div>Tốc độ sóng: 10 m/s</div>
                    <div>Chu kỳ: {(1 / frequency[0]).toFixed(2)}s</div>
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
                    {frequency[0]} Hz
                  </div>
                  <div className="text-sm text-gray-600">Tần số</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {amplitude[0]}
                  </div>
                  <div className="text-sm text-gray-600">Biên độ</div>
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
                        <div>Độ lệch</div>
                      </div>
                      {dataPoints.slice(-10).map((point, index) => (
                        <div key={index} className="grid grid-cols-3 gap-2 text-sm bg-white p-2 rounded border">
                          <div>{point.time.toFixed(1)}</div>
                          <div>{point.position.toFixed(1)}</div>
                          <div>{point.displacement.toFixed(1)}</div>
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
                  <strong>Sóng ngang:</strong> Phương dao động vuông góc với phương lan truyền.
                </div>
                <div>
                  <strong>Sóng dọc:</strong> Phương dao động trùng với phương lan truyền.
                </div>
                <div>
                  <strong>Công thức:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• λ = v/f (bước sóng)</li>
                    <li>• T = 1/f (chu kỳ)</li>
                    <li>• v = λf (tốc độ sóng)</li>
                  </ul>
                </div>
                <div>
                  <strong>Trong đó:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• λ: bước sóng (m)</li>
                    <li>• v: tốc độ sóng (m/s)</li>
                    <li>• f: tần số (Hz)</li>
                    <li>• T: chu kỳ (s)</li>
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

