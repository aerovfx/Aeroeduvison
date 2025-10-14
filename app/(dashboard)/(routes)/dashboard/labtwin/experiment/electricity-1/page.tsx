"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Atom, Clock, Target, BarChart3, Plus, Minus } from "lucide-react";

interface Charge {
  id: number;
  x: number;
  y: number;
  q: number; // charge in microCoulombs
  radius: number;
}

export default function ElectricFieldExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [charges, setCharges] = useState<Charge[]>([
    { id: 1, x: 200, y: 200, q: 1, radius: 15 },
    { id: 2, x: 400, y: 200, q: -1, radius: 15 }
  ]);
  const [selectedCharge, setSelectedCharge] = useState<number | null>(null);
  const [time, setTime] = useState(0);
  const [testParticle, setTestParticle] = useState({ x: 300, y: 150, vx: 0, vy: 0 });

  const startTime = useRef<number>(0);
  const lastTime = useRef<number>(0);

  // Calculate electric field at a point
  const calculateField = (x: number, y: number) => {
    let Ex = 0, Ey = 0;
    const k = 9e9; // Coulomb constant

    charges.forEach(charge => {
      const dx = x - charge.x;
      const dy = y - charge.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      
      if (r > charge.radius) {
        const E = (k * Math.abs(charge.q) * 1e-6) / (r * r);
        const Ex_charge = E * (dx / r) * (charge.q > 0 ? 1 : -1);
        const Ey_charge = E * (dy / r) * (charge.q > 0 ? 1 : -1);
        
        Ex += Ex_charge;
        Ey += Ey_charge;
      }
    });

    return { Ex, Ey };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw electric field lines
      if (isRunning) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;

        // Draw field lines from positive charges
        charges.forEach(charge => {
          if (charge.q > 0) {
            for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
              let x = charge.x + Math.cos(angle) * 20;
              let y = charge.y + Math.sin(angle) * 20;
              
              ctx.beginPath();
              ctx.moveTo(x, y);
              
              for (let i = 0; i < 50; i++) {
                const field = calculateField(x, y);
                const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
                
                if (magnitude < 100) break;
                
                const dx = field.Ex / magnitude * 5;
                const dy = field.Ey / magnitude * 5;
                
                x += dx;
                y += dy;
                
                if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) break;
                
                ctx.lineTo(x, y);
                
                // Check if we hit a charge
                let hitCharge = false;
                charges.forEach(otherCharge => {
                  const dist = Math.sqrt((x - otherCharge.x) ** 2 + (y - otherCharge.y) ** 2);
                  if (dist < otherCharge.radius + 10) {
                    hitCharge = true;
                  }
                });
                
                if (hitCharge) break;
              }
              
              ctx.stroke();
            }
          }
        });

        ctx.globalAlpha = 1;
      }

      // Draw charges
      charges.forEach(charge => {
        ctx.beginPath();
        ctx.arc(charge.x, charge.y, charge.radius, 0, 2 * Math.PI);
        
        if (charge.q > 0) {
          ctx.fillStyle = '#EF4444';
        } else {
          ctx.fillStyle = '#3B82F6';
        }
        
        ctx.fill();
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw charge symbol
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(charge.q > 0 ? '+' : '-', charge.x, charge.y);

        // Draw charge value
        ctx.fillStyle = '#1F2937';
        ctx.font = '12px Arial';
        ctx.fillText(`${Math.abs(charge.q)}μC`, charge.x, charge.y + charge.radius + 20);
      });

      // Draw test particle
      ctx.beginPath();
      ctx.arc(testParticle.x, testParticle.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#1F2937';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw velocity vector
      if (isRunning && (testParticle.vx !== 0 || testParticle.vy !== 0)) {
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(testParticle.x, testParticle.y);
        ctx.lineTo(
          testParticle.x + testParticle.vx * 10,
          testParticle.y + testParticle.vy * 10
        );
        ctx.stroke();
      }

      // Reset text alignment
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Draw info
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 20, 30);
      
      const field = calculateField(testParticle.x, testParticle.y);
      const fieldMagnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
      ctx.fillText(`Điện trường: ${fieldMagnitude.toFixed(0)} N/C`, 20, 55);
      ctx.fillText(`Vận tốc: ${Math.sqrt(testParticle.vx * testParticle.vx + testParticle.vy * testParticle.vy).toFixed(1)} m/s`, 20, 80);
    };

    draw();
  }, [charges, testParticle, time, isRunning]);

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

        // Update test particle position
        const field = calculateField(testParticle.x, testParticle.y);
        const q_test = 1e-6; // test charge in Coulombs
        const m_test = 1e-6; // test particle mass in kg
        
        const Fx = field.Ex * q_test;
        const Fy = field.Ey * q_test;
        
        const ax = Fx / m_test;
        const ay = Fy / m_test;
        
        setTestParticle(prev => ({
          x: prev.x + prev.vx * deltaTime * 100,
          y: prev.y + prev.vy * deltaTime * 100,
          vx: prev.vx + ax * deltaTime * 1000,
          vy: prev.vy + ay * deltaTime * 1000
        }));

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
  }, [isRunning, charges, testParticle.x, testParticle.y, testParticle.vx, testParticle.vy]);

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
    setTestParticle({ x: 300, y: 150, vx: 0, vy: 0 });
    startTime.current = 0;
    lastTime.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const addCharge = () => {
    const newCharge: Charge = {
      id: Date.now(),
      x: 300,
      y: 300,
      q: 1,
      radius: 15
    };
    setCharges(prev => [...prev, newCharge]);
  };

  const removeCharge = (id: number) => {
    setCharges(prev => prev.filter(charge => charge.id !== id));
  };

  const updateChargePosition = (id: number, x: number, y: number) => {
    setCharges(prev => prev.map(charge => 
      charge.id === id ? { ...charge, x, y } : charge
    ));
  };

  const updateChargeValue = (id: number, q: number) => {
    setCharges(prev => prev.map(charge => 
      charge.id === id ? { ...charge, q } : charge
    ));
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
            <div className="p-4 bg-blue-500 rounded-xl text-white">
              <Atom className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Điện trường</h1>
              <p className="text-gray-600 mt-1">Mô phỏng điện trường của các điện tích điểm</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Điện từ</Badge>
                <Badge variant="outline">Lớp 11</Badge>
                <Badge variant="outline">50 phút</Badge>
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
                  Mô phỏng điện trường
                </CardTitle>
                <CardDescription>
                  Quan sát điện trường và chuyển động của điện tích thử
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="border rounded-lg bg-gray-50 cursor-crosshair"
                    onMouseMove={(e) => {
                      if (selectedCharge) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        updateChargePosition(selectedCharge, x, y);
                      }
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      
                      // Check if clicking on a charge
                      let clickedCharge = null;
                      charges.forEach(charge => {
                        const dist = Math.sqrt((x - charge.x) ** 2 + (y - charge.y) ** 2);
                        if (dist <= charge.radius) {
                          clickedCharge = charge.id;
                        }
                      });
                      
                      setSelectedCharge(clickedCharge);
                      
                      // If not clicking on charge, move test particle
                      if (!clickedCharge) {
                        setTestParticle(prev => ({ ...prev, x, y, vx: 0, vy: 0 }));
                      }
                    }}
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
                {/* Charge Management */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quản lý điện tích
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={addCharge}
                      variant="outline"
                      size="sm"
                      disabled={isRunning}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm điện tích
                    </Button>
                    <Button
                      onClick={() => selectedCharge && removeCharge(selectedCharge)}
                      variant="outline"
                      size="sm"
                      disabled={isRunning || !selectedCharge}
                    >
                      <Minus className="mr-2 h-4 w-4" />
                      Xóa điện tích
                    </Button>
                  </div>
                </div>

                {/* Selected Charge Controls */}
                {selectedCharge && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Điện tích được chọn: {charges.find(c => c.id === selectedCharge)?.q}μC
                    </label>
                    <Slider
                      value={[charges.find(c => c.id === selectedCharge)?.q || 0]}
                      onValueChange={(value) => selectedCharge && updateChargeValue(selectedCharge, value[0])}
                      max={3}
                      min={-3}
                      step={0.5}
                      className="w-full"
                      disabled={isRunning}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-3μC</span>
                      <span>0μC</span>
                      <span>+3μC</span>
                    </div>
                  </div>
                )}

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

                {/* Instructions */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Hướng dẫn:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Click vào điện tích để chọn và di chuyển</li>
                    <li>• Click vào vùng trống để đặt điện tích thử</li>
                    <li>• Điện tích dương (đỏ) và âm (xanh)</li>
                    <li>• Đường màu xanh là đường sức điện</li>
                  </ul>
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
                    {charges.length}
                  </div>
                  <div className="text-sm text-gray-600">Số điện tích</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {testParticle.x.toFixed(0)}, {testParticle.y.toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-600">Vị trí điện tích thử</div>
                </div>
              </CardContent>
            </Card>

            {/* Charges List */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách điện tích</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {charges.map((charge, index) => (
                    <div
                      key={charge.id}
                      className={`p-3 rounded-lg border-2 ${
                        selectedCharge === charge.id 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            Điện tích {index + 1}
                          </div>
                          <div className="text-xs text-gray-600">
                            {charge.q}μC tại ({charge.x.toFixed(0)}, {charge.y.toFixed(0)})
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full ${
                          charge.q > 0 ? "bg-red-500" : "bg-blue-500"
                        }`}></div>
                      </div>
                    </div>
                  ))}
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
                  <strong>Điện trường:</strong> Là vùng không gian xung quanh điện tích, trong đó có lực tác dụng lên điện tích khác.
                </div>
                <div>
                  <strong>Công thức:</strong> E = k|q|/r²
                </div>
                <div>
                  <strong>Trong đó:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• E: cường độ điện trường (N/C)</li>
                    <li>• k: hằng số Coulomb (9×10⁹)</li>
                    <li>• q: điện tích (C)</li>
                    <li>• r: khoảng cách (m)</li>
                  </ul>
                </div>
                <div>
                  <strong>Lực điện:</strong> F = qE
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

