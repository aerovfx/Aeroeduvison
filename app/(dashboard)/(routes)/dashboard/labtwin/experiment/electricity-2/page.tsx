"use client"

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Play, Pause, RotateCcw, Atom, Clock, Target, BarChart3, Zap } from "lucide-react";

interface Resistor {
  id: number;
  x: number;
  y: number;
  resistance: number;
  width: number;
  height: number;
}

export default function DCCircuitExperiment() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);
  const [voltage, setVoltage] = useState([12]); // Volts
  const [resistors, setResistors] = useState<Resistor[]>([
    { id: 1, x: 200, y: 200, resistance: 10, width: 80, height: 40 },
    { id: 2, x: 350, y: 200, resistance: 20, width: 80, height: 40 }
  ]);
  const [connectionType, setConnectionType] = useState<'series' | 'parallel'>('series');
  const [current, setCurrent] = useState(0);
  const [power, setPower] = useState(0);
  const [time, setTime] = useState(0);

  const startTime = useRef<number>(0);
  const lastTime = useRef<number>(0);

  // Calculate total resistance
  const calculateTotalResistance = () => {
    if (connectionType === 'series') {
      return resistors.reduce((total, resistor) => total + resistor.resistance, 0);
    } else {
      // Parallel connection
      const reciprocal = resistors.reduce((total, resistor) => total + 1 / resistor.resistance, 0);
      return reciprocal > 0 ? 1 / reciprocal : 0;
    }
  };

  // Calculate current using Ohm's law
  const calculateCurrent = () => {
    const totalResistance = calculateTotalResistance();
    return totalResistance > 0 ? voltage[0] / totalResistance : 0;
  };

  // Calculate power
  const calculatePower = () => {
    const currentValue = calculateCurrent();
    return currentValue * voltage[0];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw voltage source
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(50, 150, 60, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${voltage[0]}V`, 80, 200);

      // Draw positive and negative terminals
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(45, 140, 70, 10);
      ctx.fillText('+', 80, 145);
      
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(45, 250, 70, 10);
      ctx.fillText('-', 80, 255);

      // Draw resistors and connections
      if (connectionType === 'series') {
        // Series connection
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 4;
        
        // From voltage source to first resistor
        ctx.beginPath();
        ctx.moveTo(110, 200);
        ctx.lineTo(200, 200);
        ctx.stroke();

        // Between resistors
        ctx.beginPath();
        ctx.moveTo(280, 200);
        ctx.lineTo(350, 200);
        ctx.stroke();

        // Back to voltage source
        ctx.beginPath();
        ctx.moveTo(430, 200);
        ctx.lineTo(500, 200);
        ctx.lineTo(500, 300);
        ctx.lineTo(50, 300);
        ctx.lineTo(50, 250);
        ctx.stroke();

        // Draw resistors
        resistors.forEach((resistor, index) => {
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(resistor.x, resistor.y - resistor.height/2, resistor.width, resistor.height);
          
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 2;
          ctx.strokeRect(resistor.x, resistor.y - resistor.height/2, resistor.width, resistor.height);

          // Draw resistance value
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${resistor.resistance}Ω`, resistor.x + resistor.width/2, resistor.y);

          // Draw current arrows
          if (isRunning && current > 0) {
            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 16px Arial';
            const arrowX = resistor.x + resistor.width + 10;
            ctx.fillText('→', arrowX, resistor.y + 5);
          }
        });
      } else {
        // Parallel connection
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 4;
        
        // Main branches
        const branchY1 = 150;
        const branchY2 = 250;
        
        // From voltage source to junction
        ctx.beginPath();
        ctx.moveTo(110, 200);
        ctx.lineTo(200, 200);
        ctx.stroke();

        // Junction connections
        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.lineTo(200, branchY1);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.lineTo(200, branchY2);
        ctx.stroke();

        // Back from junction to voltage source
        ctx.beginPath();
        ctx.moveTo(400, branchY1);
        ctx.lineTo(400, 200);
        ctx.lineTo(500, 200);
        ctx.lineTo(500, 300);
        ctx.lineTo(50, 300);
        ctx.lineTo(50, 250);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(400, branchY2);
        ctx.lineTo(400, 200);
        ctx.stroke();

        // Draw resistors in parallel
        resistors.forEach((resistor, index) => {
          const y = index === 0 ? branchY1 : branchY2;
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(220, y - 20, resistor.width, 40);
          
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 2;
          ctx.strokeRect(220, y - 20, resistor.width, 40);

          // Draw resistance value
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`${resistor.resistance}Ω`, 260, y);

          // Draw current arrows
          if (isRunning && current > 0) {
            ctx.fillStyle = '#EF4444';
            ctx.font = 'bold 16px Arial';
            const currentBranch = voltage[0] / resistor.resistance;
            ctx.fillText('→', 340, y + 5);
            ctx.font = '10px Arial';
            ctx.fillText(`${currentBranch.toFixed(2)}A`, 350, y + 15);
          }
        });
      }

      // Draw voltmeter
      ctx.fillStyle = '#10B981';
      ctx.fillRect(520, 100, 60, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${voltage[0].toFixed(1)}V`, 550, 125);

      // Draw ammeter
      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(520, 260, 60, 40);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`${current.toFixed(2)}A`, 550, 285);

      // Reset text alignment
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // Draw info
      ctx.fillStyle = '#1F2937';
      ctx.font = '16px Arial';
      ctx.fillText(`Thời gian: ${time.toFixed(1)}s`, 20, 30);
      ctx.fillText(`Điện áp: ${voltage[0]}V`, 20, 55);
      ctx.fillText(`Dòng điện: ${current.toFixed(2)}A`, 20, 80);
      ctx.fillText(`Công suất: ${power.toFixed(2)}W`, 20, 105);
      ctx.fillText(`Điện trở tổng: ${calculateTotalResistance().toFixed(1)}Ω`, 20, 130);
    };

    draw();
  }, [voltage, resistors, connectionType, current, power, time, isRunning]);

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
        setCurrent(calculateCurrent());
        setPower(calculatePower());

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
  }, [isRunning, voltage, resistors, connectionType]);

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
    setCurrent(0);
    setPower(0);
    startTime.current = 0;
    lastTime.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const updateResistance = (id: number, resistance: number) => {
    setResistors(prev => prev.map(r => 
      r.id === id ? { ...r, resistance } : r
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
              <h1 className="text-3xl font-bold text-gray-900">Mạch điện DC</h1>
              <p className="text-gray-600 mt-1">Thí nghiệm mạch điện một chiều với điện trở</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">Điện từ</Badge>
                <Badge variant="outline">Lớp 11</Badge>
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
                  Mô phỏng mạch điện DC
                </CardTitle>
                <CardDescription>
                  Quan sát dòng điện và điện áp trong mạch điện trở
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
                {/* Connection Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Kiểu mắc
                  </label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConnectionType('series')}
                      variant={connectionType === 'series' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      disabled={isRunning}
                    >
                      Nối tiếp
                    </Button>
                    <Button
                      onClick={() => setConnectionType('parallel')}
                      variant={connectionType === 'parallel' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      disabled={isRunning}
                    >
                      Song song
                    </Button>
                  </div>
                </div>

                {/* Voltage */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Điện áp: {voltage[0]}V
                  </label>
                  <Slider
                    value={voltage}
                    onValueChange={setVoltage}
                    max={24}
                    min={1}
                    step={1}
                    className="w-full"
                    disabled={isRunning}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1V</span>
                    <span>24V</span>
                  </div>
                </div>

                {/* Resistors */}
                {resistors.map((resistor, index) => (
                  <div key={resistor.id}>
                    <label className="block text-sm font-medium mb-2">
                      Điện trở {index + 1}: {resistor.resistance}Ω
                    </label>
                    <Slider
                      value={[resistor.resistance]}
                      onValueChange={(value) => updateResistance(resistor.id, value[0])}
                      max={100}
                      min={1}
                      step={1}
                      className="w-full"
                      disabled={isRunning}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1Ω</span>
                      <span>100Ω</span>
                    </div>
                  </div>
                ))}

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

                {/* Circuit Analysis */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Phân tích mạch:</h4>
                  <div className="space-y-1 text-sm">
                    <div>Điện trở tổng: {calculateTotalResistance().toFixed(1)}Ω</div>
                    <div>Dòng điện: {calculateCurrent().toFixed(2)}A</div>
                    <div>Công suất: {calculatePower().toFixed(2)}W</div>
                    <div>Kiểu mắc: {connectionType === 'series' ? 'Nối tiếp' : 'Song song'}</div>
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
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {voltage[0]}V
                  </div>
                  <div className="text-sm text-gray-600">Điện áp</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {current.toFixed(2)}A
                  </div>
                  <div className="text-sm text-gray-600">Dòng điện</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {power.toFixed(2)}W
                  </div>
                  <div className="text-sm text-gray-600">Công suất</div>
                </div>
              </CardContent>
            </Card>

            {/* Resistors Info */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin điện trở</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {resistors.map((resistor, index) => (
                    <div key={resistor.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            R{index + 1}
                          </div>
                          <div className="text-xs text-gray-600">
                            {resistor.resistance}Ω
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {connectionType === 'series' 
                            ? `${current.toFixed(2)}A`
                            : `${(voltage[0] / resistor.resistance).toFixed(2)}A`
                          }
                        </div>
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
                  <strong>Định luật Ohm:</strong> U = R × I
                </div>
                <div>
                  <strong>Mắc nối tiếp:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• Rₜ = R₁ + R₂ + ...</li>
                    <li>• I = I₁ = I₂ = ...</li>
                    <li>• U = U₁ + U₂ + ...</li>
                  </ul>
                </div>
                <div>
                  <strong>Mắc song song:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    <li>• 1/Rₜ = 1/R₁ + 1/R₂ + ...</li>
                    <li>• U = U₁ = U₂ = ...</li>
                    <li>• I = I₁ + I₂ + ...</li>
                  </ul>
                </div>
                <div>
                  <strong>Công suất:</strong> P = U × I = I²R = U²/R
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

