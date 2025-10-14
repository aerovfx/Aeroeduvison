"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Target, BarChart3, Sun, Beaker } from "lucide-react";

export default function LightRefractionExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [incidentAngle, setIncidentAngle] = useState([30]); // degrees
  const [refractiveIndex1, setRefractiveIndex1] = useState([1.0]); // air
  const [refractiveIndex2, setRefractiveIndex2] = useState([1.5]); // glass
  const [lightSpeed, setLightSpeed] = useState(5); // animation speed
  const [time, setTime] = useState(0);
  // const [criticalAngle, setCriticalAngle] = useState(0); // Removed duplicate declaration

  const startTime = useRef<number>(0);
  const lastTime = useRef<number>(0);

  // Calculate refraction angle using Snell's law
  const calculateRefractionAngle = () => {
    const n1 = refractiveIndex1[0];
    const n2 = refractiveIndex2[0];
    const angle1 = (incidentAngle[0] * Math.PI) / 180;
    
    const sinAngle2 = (n1 * Math.sin(angle1)) / n2;
    
    if (Math.abs(sinAngle2) > 1) {
      // Total internal reflection
      return null;
    }
    
    const angle2 = Math.asin(sinAngle2);
    return (angle2 * 180) / Math.PI;
  };

  // Calculate critical angle
  const calculateCriticalAngle = () => {
    const n1 = refractiveIndex1[0];
    const n2 = refractiveIndex2[0];
    
    if (n1 <= n2) return null; // No critical angle if n1 <= n2
    
    const criticalAngleRad = Math.asin(n2 / n1);
    return (criticalAngleRad * 180) / Math.PI;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const interfaceY = centerY;

      // Draw interface line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, interfaceY);
      ctx.lineTo(canvas.width, interfaceY);
      ctx.stroke();

      // Draw normal line (perpendicular to interface)
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, 50);
      ctx.lineTo(centerX, canvas.height - 50);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw incident ray
      const angle1Rad = (incidentAngle[0] * Math.PI) / 180;
      const rayLength = 150;
      
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(centerX, interfaceY);
      ctx.lineTo(
        centerX - Math.sin(angle1Rad) * rayLength,
        interfaceY - Math.cos(angle1Rad) * rayLength
      );
      ctx.stroke();

      // Draw arrow on incident ray
      const arrowX = centerX - Math.sin(angle1Rad) * (rayLength - 20);
      const arrowY = interfaceY - Math.cos(angle1Rad) * (rayLength - 20);
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX + Math.sin(angle1Rad + 0.3) * 15, arrowY + Math.cos(angle1Rad + 0.3) * 15);
      ctx.lineTo(arrowX + Math.sin(angle1Rad - 0.3) * 15, arrowY + Math.cos(angle1Rad - 0.3) * 15);
      ctx.closePath();
      ctx.fill();

      // Draw refracted ray or reflected ray
      const refractedAngle = calculateRefractionAngle();
      const critical = calculateCriticalAngle();

      if (refractedAngle !== null) {
        // Refraction occurs
        const angle2Rad = (refractedAngle * Math.PI) / 180;
        
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX, interfaceY);
        ctx.lineTo(
          centerX + Math.sin(angle2Rad) * rayLength,
          interfaceY + Math.cos(angle2Rad) * rayLength
        );
        ctx.stroke();

        // Draw arrow on refracted ray
        const arrowX2 = centerX + Math.sin(angle2Rad) * (rayLength - 20);
        const arrowY2 = interfaceY + Math.cos(angle2Rad) * (rayLength - 20);
        ctx.beginPath();
        ctx.moveTo(arrowX2, arrowY2);
        ctx.lineTo(arrowX2 - Math.sin(angle2Rad + 0.3) * 15, arrowY2 - Math.cos(angle2Rad + 0.3) * 15);
        ctx.lineTo(arrowX2 - Math.sin(angle2Rad - 0.3) * 15, arrowY2 - Math.cos(angle2Rad - 0.3) * 15);
        ctx.closePath();
        ctx.fill();
      } else {
        // Total internal reflection
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        const reflectedAngleRad = -angle1Rad;
        
        ctx.beginPath();
        ctx.moveTo(centerX, interfaceY);
        ctx.lineTo(
          centerX - Math.sin(reflectedAngleRad) * rayLength,
          interfaceY - Math.cos(reflectedAngleRad) * rayLength
        );
        ctx.stroke();

        // Draw arrow on reflected ray
        const arrowX3 = centerX - Math.sin(reflectedAngleRad) * (rayLength - 20);
        const arrowY3 = interfaceY - Math.cos(reflectedAngleRad) * (rayLength - 20);
        ctx.beginPath();
        ctx.moveTo(arrowX3, arrowY3);
        ctx.lineTo(arrowX3 + Math.sin(reflectedAngleRad + 0.3) * 15, arrowY3 + Math.cos(reflectedAngleRad + 0.3) * 15);
        ctx.lineTo(arrowX3 + Math.sin(reflectedAngleRad - 0.3) * 15, arrowY3 + Math.cos(reflectedAngleRad - 0.3) * 15);
        ctx.closePath();
        ctx.fill();
      }

      // Draw light ray animation
      if (isRunning) {
        const progress = (time * lightSpeed) % 1;
        const lightX = centerX - Math.sin(angle1Rad) * rayLength * progress;
        const lightY = interfaceY - Math.cos(angle1Rad) * rayLength * progress;
        
        // Draw light particle
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(lightX, lightY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw glow effect
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(lightX, lightY, 4, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw labels
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      
      // Angle labels
      ctx.fillText(`${incidentAngle[0].toFixed(1)}°`, centerX - 80, interfaceY - 20);
      if (refractedAngle !== null) {
        ctx.fillText(`${refractedAngle.toFixed(1)}°`, centerX + 80, interfaceY + 30);
      } else {
        ctx.fillText('Phản xạ toàn phần', centerX + 100, interfaceY - 20);
      }

      // Material labels
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px Arial';
      ctx.fillText(`n₁ = ${refractiveIndex1[0]}`, 50, 100);
      ctx.fillText(`n₂ = ${refractiveIndex2[0]}`, 50, canvas.height - 100);

      // Draw prism effect
      if (refractiveIndex2[0] > 1.4) {
        // Draw glass prism
        ctx.fillStyle = 'rgba(173, 216, 230, 0.3)';
        ctx.beginPath();
        ctx.moveTo(0, interfaceY);
        ctx.lineTo(canvas.width, interfaceY);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
      }

      // Reset text alignment
      ctx.textAlign = 'left';

      // Draw info
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 20, 30);
      ctx.fillText(`Góc tới: ${incidentAngle[0].toFixed(1)}°`, 20, 55);
      
      if (refractedAngle !== null) {
        ctx.fillText(`Góc khúc xạ: ${refractedAngle.toFixed(1)}°`, 20, 80);
      } else {
        ctx.fillText(`Phản xạ toàn phần`, 20, 80);
      }
      
      if (critical !== null) {
        ctx.fillText(`Góc tới hạn: ${critical.toFixed(1)}°`, 20, 105);
      }
    };

    draw();
  }, [incidentAngle, refractiveIndex1, refractiveIndex2, time, isRunning]);

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
  }, [isRunning]);

  const startExperiment = () => {
    setIsRunning(true);
    startTime.current = 0;
    lastTime.current = 0;
    setTime(0);
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
    startTime.current = 0;
    lastTime.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const refractedAngle = calculateRefractionAngle();
  const criticalAngle = calculateCriticalAngle();

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
            <div className="p-4 bg-purple-500 rounded-xl text-white">
              <Beaker className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Khúc xạ ánh sáng</h1>
              <p className="text-gray-600 mt-1">Thí nghiệm khúc xạ qua lăng kính và thấu kính</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Quang học</Badge>
                <Badge variant="outline">Lớp 11</Badge>
                <Badge variant="outline">45 phút</Badge>
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
                  Mô phỏng khúc xạ ánh sáng
                </CardTitle>
                <CardDescription>
                  Quan sát hiện tượng khúc xạ và phản xạ toàn phần
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
                {/* Incident Angle */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Góc tới: {incidentAngle[0]}°
                  </label>
                  <Slider
                    value={incidentAngle}
                    onValueChange={setIncidentAngle}
                    max={89}
                    min={0}
                    step={1}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0°</span>
                    <span>89°</span>
                  </div>
                </div>

                {/* Refractive Index 1 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chiết suất môi trường 1: {refractiveIndex1[0]}
                  </label>
                  <Slider
                    value={refractiveIndex1}
                    onValueChange={setRefractiveIndex1}
                    max={2.0}
                    min={1.0}
                    step={0.1}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1.0 (không khí)</span>
                    <span>2.0</span>
                  </div>
                </div>

                {/* Refractive Index 2 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Chiết suất môi trường 2: {refractiveIndex2[0]}
                  </label>
                  <Slider
                    value={refractiveIndex2}
                    onValueChange={setRefractiveIndex2}
                    max={2.5}
                    min={1.0}
                    step={0.1}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1.0 (không khí)</span>
                    <span>2.5 (kim cương)</span>
                  </div>
                </div>

                {/* Light Speed */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tốc độ ánh sáng: {lightSpeed}
                  </label>
                  <Slider
                    value={[lightSpeed]}
                    onValueChange={(value) => setLightSpeed(value[0])}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Chậm</span>
                    <span>Nhanh</span>
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

                {/* Analysis */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Phân tích:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Góc tới: {incidentAngle[0].toFixed(1)}°</div>
                    {refractedAngle !== null ? (
                      <div>Góc khúc xạ: {refractedAngle.toFixed(1)}°</div>
                    ) : (
                      <div className="text-green-600 font-medium">Phản xạ toàn phần</div>
                    )}
                    {criticalAngle !== null && (
                      <div>Góc tới hạn: {criticalAngle.toFixed(1)}°</div>
                    )}
                    <div>Chiết suất: {refractiveIndex1[0]} → {refractiveIndex2[0]}</div>
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
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {incidentAngle[0]}°
                  </div>
                  <div className="text-sm text-gray-600">Góc tới</div>
                </div>
                {refractedAngle !== null ? (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {refractedAngle.toFixed(1)}°
                    </div>
                    <div className="text-sm text-gray-600">Góc khúc xạ</div>
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      Phản xạ toàn phần
                    </div>
                    <div className="text-sm text-gray-600">Hiện tượng</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Material Properties */}
            <Card>
              <CardHeader>
                <CardTitle>Chiết suất vật liệu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Không khí:</span>
                    <span className="font-medium">1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Nước:</span>
                    <span className="font-medium">1.33</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thủy tinh:</span>
                    <span className="font-medium">1.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sapphire:</span>
                    <span className="font-medium">1.77</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kim cương:</span>
                    <span className="font-medium">2.42</span>
                  </div>
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
                  <strong>Định luật Snell:</strong> n₁sin(θ₁) = n₂sin(θ₂)
                </div>
                <div>
                  <strong>Trong đó:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• n₁, n₂: chiết suất môi trường</li>
                    <li>• θ₁: góc tới</li>
                    <li>• θ₂: góc khúc xạ</li>
                  </ul>
                </div>
                <div>
                  <strong>Phản xạ toàn phần:</strong> xảy ra khi n₁ &gt; n₂ và góc tới lớn hơn góc tới hạn.
                </div>
                <div>
                  <strong>Góc tới hạn:</strong> θc = arcsin(n₂/n₁)
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
