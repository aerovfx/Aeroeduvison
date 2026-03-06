"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Info, Play, Pause, RotateCcw, TrendingUp, Calculator } from "lucide-react";

interface HarmonicMotionViewerProps {
  data: any;
  selectedPreset?: string | null;
}

export function HarmonicMotionViewer({ data, selectedPreset }: HarmonicMotionViewerProps) {
  const canvasXRef = useRef<HTMLCanvasElement>(null);
  const canvasVRef = useRef<HTMLCanvasElement>(null);
  const canvasERef = useRef<HTMLCanvasElement>(null);
  
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const animationRef = useRef<number>();
  
  // Custom parameters input
  const [customA, setCustomA] = useState("2.0");
  const [customF, setCustomF] = useState("1.0");
  const [customOmega, setCustomOmega] = useState("");
  const [customPhi, setCustomPhi] = useState("0");
  const [useCustom, setUseCustom] = useState(false);
  const [customData, setCustomData] = useState<any>(null);
  
  // Auto-switch to preset scenario when preset is selected
  useEffect(() => {
    if (selectedPreset) {
      const presetScenarioIndex = data.scenarios.findIndex((s: any) => 
        s.preset_id === selectedPreset
      );
      if (presetScenarioIndex !== -1) {
        setSelectedScenario(presetScenarioIndex);
        setSelectedVariation(0);
        setAnimationProgress(0);
      }
    }
  }, [selectedPreset, data.scenarios]);
  
  // Calculate custom trajectory on demand
  const calculateCustomTrajectory = () => {
    const A = parseFloat(customA) || 2.0;
    const f = parseFloat(customF) || 1.0;
    const omega = customOmega ? parseFloat(customOmega) : 2 * Math.PI * f;
    const phi = parseFloat(customPhi) || 0;
    const t_max = 2.0;
    const num_points = 500;
    
    const T = 1 / f;
    const v_max = A * omega;
    const a_max = A * omega * omega;
    const E_total = 0.5 * omega * omega * A * A;
    
    const trajectory = [];
    for (let i = 0; i < num_points; i++) {
      const t = (i / (num_points - 1)) * t_max;
      const x = A * Math.cos(omega * t + phi);
      const v = -A * omega * Math.sin(omega * t + phi);
      const a = -A * omega * omega * Math.cos(omega * t + phi);
      const Ek = 0.5 * v * v;
      const Ep = 0.5 * omega * omega * x * x;
      
      trajectory.push({
        t: parseFloat(t.toFixed(4)),
        x: parseFloat(x.toFixed(4)),
        v: parseFloat(v.toFixed(4)),
        a: parseFloat(a.toFixed(4)),
        Ek: parseFloat(Ek.toFixed(4)),
        Ep: parseFloat(Ep.toFixed(4))
      });
    }
    
    return {
      A, f, omega, phi, T, v_max, a_max, E_total, t_max, trajectory
    };
  };
  
  const scenario = data.scenarios[selectedScenario];
  const currentData = useCustom && customData 
    ? customData 
    : scenario.scenarios[selectedVariation].data;
  const trajectory = currentData.trajectory;
  
  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const animate = () => {
      setAnimationProgress(prev => {
        const next = prev + 0.005;
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

  // Draw position-time graph
  useEffect(() => {
    const canvas = canvasXRef.current;
    if (!canvas || !trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    
    const A = currentData.A;
    const t_max = currentData.t_max;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    
    // Vertical lines (time)
    for (let t = 0; t <= t_max; t += 0.2) {
      const x = padding + (t / t_max) * (width - 2 * padding);
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal lines (amplitude)
    for (let a = -A; a <= A; a += A/5) {
      const y = height/2 - (a / A) * (height/2 - padding);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(padding, height/2);
    ctx.lineTo(width - padding, height/2);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw trajectory
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height/2 - (point.x / A) * (height/2 - padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Amplitude lines
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // +A
    const yA = height/2 - (A / A) * (height/2 - padding);
    ctx.beginPath();
    ctx.moveTo(padding, yA);
    ctx.lineTo(width - padding, yA);
    ctx.stroke();
    
    // -A
    const yNA = height/2 - (-A / A) * (height/2 - padding);
    ctx.beginPath();
    ctx.moveTo(padding, yNA);
    ctx.lineTo(width - padding, yNA);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Animated point
    if (isAnimating && animationProgress > 0) {
      const frameIndex = Math.floor(animationProgress * (trajectory.length - 1));
      const point = trajectory[frameIndex];
      
      if (point) {
        const x = padding + (point.t / t_max) * (width - 2 * padding);
        const y = height/2 - (point.x / A) * (height/2 - padding);
        
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // Vertical line
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('x(t)', 10, 25);
    ctx.fillText('t(s)', width - 40, height - 10);
    
    ctx.font = '12px Arial';
    ctx.fillText(`+A`, padding - 30, yA);
    ctx.fillText(`-A`, padding - 30, yNA);

  }, [trajectory, currentData, isAnimating, animationProgress]);

  // Draw velocity-time graph
  useEffect(() => {
    const canvas = canvasVRef.current;
    if (!canvas || !trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    const v_max = currentData.v_max;
    const t_max = currentData.t_max;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    for (let t = 0; t <= t_max; t += 0.2) {
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
    ctx.moveTo(padding, height/2);
    ctx.lineTo(width - padding, height/2);
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();

    // Draw velocity
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height/2 - (point.v / v_max) * (height/2 - padding);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('v(t)', 10, 20);

  }, [trajectory, currentData]);

  // Draw energy-time graph
  useEffect(() => {
    const canvas = canvasERef.current;
    if (!canvas || !trajectory) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    const E_max = currentData.E_total;
    const t_max = currentData.t_max;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#FDE68A';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    for (let t = 0; t <= t_max; t += 0.2) {
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
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw kinetic energy
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height - padding - (point.Ek / E_max) * (height - 2 * padding);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw potential energy
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectory.forEach((point: any, index: number) => {
      const x = padding + (point.t / t_max) * (width - 2 * padding);
      const y = height - padding - (point.Ep / E_max) * (height - 2 * padding);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Total energy line
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const yTotal = height - padding - (E_max / E_max) * (height - 2 * padding);
    ctx.beginPath();
    ctx.moveTo(padding, yTotal);
    ctx.lineTo(width - padding, yTotal);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = '11px Arial';
    ctx.fillStyle = '#EF4444';
    ctx.fillText('Eₖ (động năng)', padding + 10, padding + 15);
    ctx.fillStyle = '#3B82F6';
    ctx.fillText('Eₚ (thế năng)', padding + 120, padding + 15);
    ctx.fillStyle = '#10B981';
    ctx.fillText('E (tổng)', padding + 220, padding + 15);

  }, [trajectory, currentData]);

  const getVariationLabel = () => {
    const variation = scenario.scenarios[selectedVariation];
    if (variation.phi_name) return `φ = ${variation.phi_name}`;
    if (variation.A) return `A = ${variation.A} cm`;
    if (variation.f) return `f = ${variation.f} Hz (T = ${variation.T}s)`;
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Điều khiển
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              onClick={() => setUseCustom(false)}
              variant={!useCustom ? "default" : "outline"}
              className="flex-1"
              size="sm"
            >
              Chế độ Preset
            </Button>
            <Button
              onClick={() => setUseCustom(true)}
              variant={useCustom ? "default" : "outline"}
              className="flex-1"
              size="sm"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Tùy chỉnh
            </Button>
          </div>

          {!useCustom ? (
            <>
              {/* Scenario Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Loại thay đổi
                </label>
                <Select
                  value={selectedScenario.toString()}
                  onValueChange={(value) => {
                    setSelectedScenario(parseInt(value));
                    setSelectedVariation(0);
                  }}
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

              {/* Variation Selection */}
              {scenario.scenarios.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {getVariationLabel()}
                  </label>
                  <Slider
                    value={[selectedVariation]}
                    onValueChange={(value) => setSelectedVariation(value[0])}
                    min={0}
                    max={scenario.scenarios.length - 1}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Custom Input Fields */}
              <div className="space-y-4 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                <h4 className="font-semibold text-sm text-orange-800 mb-3">
                  Nhập tham số tùy chỉnh
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="customA" className="text-xs">
                      Biên độ A (cm)
                    </Label>
                    <Input
                      id="customA"
                      type="number"
                      value={customA}
                      onChange={(e) => setCustomA(e.target.value)}
                      placeholder="2.0"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customF" className="text-xs">
                      Tần số f (Hz)
                    </Label>
                    <Input
                      id="customF"
                      type="number"
                      value={customF}
                      onChange={(e) => {
                        setCustomF(e.target.value);
                        if (e.target.value) {
                          const omega = 2 * Math.PI * parseFloat(e.target.value);
                          setCustomOmega(omega.toFixed(3));
                        }
                      }}
                      placeholder="1.0"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customOmega" className="text-xs">
                      Tần số góc ω (rad/s)
                    </Label>
                    <Input
                      id="customOmega"
                      type="number"
                      value={customOmega}
                      onChange={(e) => {
                        setCustomOmega(e.target.value);
                        if (e.target.value) {
                          const f = parseFloat(e.target.value) / (2 * Math.PI);
                          setCustomF(f.toFixed(3));
                        }
                      }}
                      placeholder="auto"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="customPhi" className="text-xs">
                      Pha ban đầu φ (rad)
                    </Label>
                    <Input
                      id="customPhi"
                      type="number"
                      value={customPhi}
                      onChange={(e) => setCustomPhi(e.target.value)}
                      placeholder="0"
                      step="0.1"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 space-y-1">
                  <div>💡 Gợi ý: φ = π/2 ≈ 1.571, π ≈ 3.142</div>
                  <div>📐 Quan hệ: ω = 2πf</div>
                </div>
                
                <Button
                  onClick={() => {
                    const newData = calculateCustomTrajectory();
                    setCustomData(newData);
                    setAnimationProgress(0);
                  }}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Tính toán & Vẽ đồ thị
                </Button>
              </div>
            </>
          )}

          {/* Animation Controls */}
          <div className="flex gap-2">
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

      {/* Graphs */}
      <Tabs defaultValue="position" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="position">Li độ x(t)</TabsTrigger>
          <TabsTrigger value="velocity">Vận tốc v(t)</TabsTrigger>
          <TabsTrigger value="energy">Năng lượng E(t)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle>Đồ thị li độ - thời gian</CardTitle>
              <CardDescription>
                x = A × cos(ωt + φ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasXRef}
                width={900}
                height={400}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="velocity">
          <Card>
            <CardHeader>
              <CardTitle>Đồ thị vận tốc - thời gian</CardTitle>
              <CardDescription>
                v = -Aω × sin(ωt + φ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasVRef}
                width={900}
                height={300}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="energy">
          <Card>
            <CardHeader>
              <CardTitle>Đồ thị năng lượng - thời gian</CardTitle>
              <CardDescription>
                Động năng, Thế năng và Cơ năng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasERef}
                width={900}
                height={300}
                className="w-full border-2 border-gray-200 rounded-lg"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Thông số dao động
            </div>
            {useCustom && customData && (
              <Badge className="bg-orange-600">
                <Calculator className="h-3 w-3 mr-1" />
                Tùy chỉnh
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Biên độ A</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentData.A} cm
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Tần số f</div>
              <div className="text-2xl font-bold text-green-600">
                {currentData.f.toFixed(2)} Hz
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Chu kỳ T</div>
              <div className="text-2xl font-bold text-purple-600">
                {currentData.T.toFixed(2)} s
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Pha φ</div>
              <div className="text-2xl font-bold text-orange-600">
                {currentData.phi.toFixed(2)} rad
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">ω (rad/s)</div>
              <div className="text-lg font-semibold">{currentData.omega.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">vₘₐₓ (cm/s)</div>
              <div className="text-lg font-semibold">{currentData.v_max.toFixed(2)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-600">aₘₐₓ (cm/s²)</div>
              <div className="text-lg font-semibold">{currentData.a_max.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulas */}
      <Card>
        <CardHeader>
          <CardTitle>Công thức</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Li độ:</div>
              <div className="font-mono text-sm">{data.formulas.position}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Vận tốc:</div>
              <div className="font-mono text-sm">{data.formulas.velocity}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Chu kỳ:</div>
              <div className="font-mono text-sm">{data.formulas.period}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Cơ năng:</div>
              <div className="font-mono text-sm">{data.formulas.total_energy}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

