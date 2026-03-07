"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Zap, Play, Pause, RotateCcw, TrendingUp, Activity, 
  Target, Gauge, Brain, Download, Settings
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

interface MotionSimulatorProps {
  apiEndpoint: string;
}

export function MotionSimulator({ apiEndpoint }: MotionSimulatorProps) {
  const [motionType, setMotionType] = useState<'free_fall' | 'projectile' | 'harmonic'>('projectile');
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [aiPrediction, setAiPrediction] = useState<any>(null);
  
  // Parameters
  const [h0, setH0] = useState(0);
  const [v0, setV0] = useState(20);
  const [angle, setAngle] = useState(45);
  const [amplitude, setAmplitude] = useState(0.1);
  const [frequency, setFrequency] = useState(1.0);
  const [damping, setDamping] = useState(0);
  const [airResistance, setAirResistance] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Run simulation
  const runSimulation = async () => {
    try {
      let endpoint = '';
      let body = {};
      
      if (motionType === 'free_fall') {
        endpoint = `${apiEndpoint}/api/simulate/free-fall`;
        body = { h0, v0: 0, mass: 1.0 };
      } else if (motionType === 'projectile') {
        endpoint = `${apiEndpoint}/api/simulate/projectile`;
        body = { v0, angle, h0, mass: 1.0, air_resistance: airResistance };
        
        // Get AI prediction
        const predRes = await fetch(`${apiEndpoint}/api/predict/landing`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ v0, angle, h0 })
        });
        
        if (predRes.ok) {
          const predData = await predRes.json();
          setAiPrediction(predData.prediction);
        }
      } else {
        endpoint = `${apiEndpoint}/api/simulate/harmonic`;
        body = { amplitude, frequency, phase: 0, damping, mass: 1.0 };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      
      if (!response.ok) throw new Error('Simulation failed');
      
      const data = await response.json();
      setSimulationData(data.simulation);
      setCurrentFrame(0);
      setIsAnimating(false);
      
      console.log('✅ Simulation complete:', data);
    } catch (error) {
      console.error('Simulation error:', error);
    }
  };

  // Animation
  useEffect(() => {
    if (!isAnimating || !simulationData) return;
    
    const totalFrames = simulationData.trajectory.time.length;
    
    const animate = () => {
      setCurrentFrame(prev => {
        if (prev >= totalFrames - 1) {
          setIsAnimating(false);
          return prev;
        }
        return prev + 2; // Speed up animation
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, simulationData]);

  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || !simulationData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#e0e7ff');
    gradient.addColorStop(1, '#fef3c7');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, height);
      ctx.stroke();
    }
    for (let i = 0; i < height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Draw ground
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, height - 30, width, 30);
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, height - 5, width, 5);
    
    const trajectory = simulationData.trajectory;
    
    if (motionType === 'projectile') {
      const x_data = trajectory.x;
      const y_data = trajectory.y;
      
      // Find scale
      const maxX = Math.max(...x_data);
      const maxY = Math.max(...y_data);
      const scaleX = (width - 100) / maxX;
      const scaleY = (height - 100) / maxY;
      
      // Draw full trajectory (ghost)
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < x_data.length; i++) {
        const x = 50 + x_data[i] * scaleX;
        const y = height - 40 - y_data[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // Draw current path
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= currentFrame && i < x_data.length; i++) {
        const x = 50 + x_data[i] * scaleX;
        const y = height - 40 - y_data[i] * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // Draw ball
      if (currentFrame < x_data.length) {
        const ballX = 50 + x_data[currentFrame] * scaleX;
        const ballY = height - 40 - y_data[currentFrame] * scaleY;
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(ballX, height - 35, 15, 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Ball
        const ballGradient = ctx.createRadialGradient(ballX - 5, ballY - 5, 5, ballX, ballY, 20);
        ballGradient.addColorStop(0, '#fbbf24');
        ballGradient.addColorStop(1, '#f59e0b');
        ctx.fillStyle = ballGradient;
        ctx.beginPath();
        ctx.arc(ballX, ballY, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Ball highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(ballX - 4, ballY - 4, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Velocity vector
        const vx = trajectory.vx[currentFrame];
        const vy = trajectory.vy[currentFrame];
        const vScale = 3;
        
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(ballX + vx * vScale, ballY - vy * vScale);
        ctx.stroke();
        
        // Arrow head
        const arrowAngle = Math.atan2(-vy, vx);
        const arrowSize = 8;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(ballX + vx * vScale, ballY - vy * vScale);
        ctx.lineTo(
          ballX + vx * vScale - arrowSize * Math.cos(arrowAngle - Math.PI / 6),
          ballY - vy * vScale + arrowSize * Math.sin(arrowAngle - Math.PI / 6)
        );
        ctx.lineTo(
          ballX + vx * vScale - arrowSize * Math.cos(arrowAngle + Math.PI / 6),
          ballY - vy * vScale + arrowSize * Math.sin(arrowAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
      
    } else if (motionType === 'harmonic') {
      // Harmonic oscillation visualization
      const positions = trajectory.position;
      const maxPos = Math.max(...positions.map(Math.abs));
      const scale = (width - 200) / (2 * maxPos);
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Draw equilibrium line
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw spring/pendulum
      const currentPos = positions[currentFrame] || 0;
      const x = centerX + currentPos * scale;
      
      // Spring coil
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, 50);
      const coils = 10;
      const coilWidth = 20;
      for (let i = 0; i < coils; i++) {
        const y = 50 + (i / coils) * (centerY - 100);
        ctx.lineTo(centerX + (i % 2 === 0 ? coilWidth : -coilWidth), y);
      }
      ctx.lineTo(x, centerY - 40);
      ctx.stroke();
      
      // Mass
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(x - 30, centerY - 40, 60, 60);
      ctx.strokeStyle = '#5b21b6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 30, centerY - 40, 60, 60);
      
      // Position indicator
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`x = ${currentPos.toFixed(3)}m`, x, centerY + 50);
    }
    
  }, [simulationData, currentFrame, motionType]);

  // Prepare chart data
  const getChartData = () => {
    if (!simulationData) return [];
    
    const trajectory = simulationData.trajectory;
    const data = [];
    
    for (let i = 0; i < trajectory.time.length; i += 5) { // Sample every 5 points
      if (motionType === 'projectile') {
        data.push({
          time: trajectory.time[i].toFixed(2),
          x: trajectory.x[i].toFixed(2),
          y: trajectory.y[i].toFixed(2),
          speed: trajectory.speed[i].toFixed(2)
        });
      } else if (motionType === 'free_fall') {
        data.push({
          time: trajectory.time[i].toFixed(2),
          height: trajectory.position[i].toFixed(2),
          velocity: Math.abs(trajectory.velocity[i]).toFixed(2)
        });
      } else {
        data.push({
          time: trajectory.time[i].toFixed(2),
          position: trajectory.position[i].toFixed(3),
          velocity: trajectory.velocity[i].toFixed(3)
        });
      }
    }
    
    return data;
  };

  const resetAnimation = () => {
    setCurrentFrame(0);
    setIsAnimating(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Motion Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Motion Type Selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">Chọn loại chuyển động:</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => {setMotionType('free_fall'); resetAnimation();}}
                variant={motionType === 'free_fall' ? 'default' : 'outline'}
                className={motionType === 'free_fall' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : ''}
              >
                📉 Rơi tự do
              </Button>
              <Button
                onClick={() => {setMotionType('projectile'); resetAnimation();}}
                variant={motionType === 'projectile' ? 'default' : 'outline'}
                className={motionType === 'projectile' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
              >
                🎯 Ném xiên
              </Button>
              <Button
                onClick={() => {setMotionType('harmonic'); resetAnimation();}}
                variant={motionType === 'harmonic' ? 'default' : 'outline'}
                className={motionType === 'harmonic' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}
              >
                〰️ Dao động
              </Button>
            </div>
          </div>

          {/* Parameters based on motion type */}
          {motionType === 'free_fall' && (
            <div className="space-y-3">
              <div>
                <Label>Độ cao ban đầu (h₀): {h0}m</Label>
                <Slider
                  value={[h0]}
                  onValueChange={(v) => setH0(v[0])}
                  min={1}
                  max={200}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {motionType === 'projectile' && (
            <div className="space-y-3">
              <div>
                <Label>Vận tốc ban đầu (v₀): {v0} m/s</Label>
                <Slider
                  value={[v0]}
                  onValueChange={(v) => setV0(v[0])}
                  min={5}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Góc bắn (θ): {angle}°</Label>
                <Slider
                  value={[angle]}
                  onValueChange={(v) => setAngle(v[0])}
                  min={1}
                  max={89}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Độ cao ban đầu (h₀): {h0}m</Label>
                <Slider
                  value={[h0]}
                  onValueChange={(v) => setH0(v[0])}
                  min={0}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={airResistance}
                  onCheckedChange={setAirResistance}
                />
                <Label>Sức cản không khí</Label>
              </div>
            </div>
          )}

          {motionType === 'harmonic' && (
            <div className="space-y-3">
              <div>
                <Label>Biên độ (A): {amplitude}m</Label>
                <Slider
                  value={[amplitude * 100]}
                  onValueChange={(v) => setAmplitude(v[0] / 100)}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Tần số (f): {frequency} Hz</Label>
                <Slider
                  value={[frequency * 10]}
                  onValueChange={(v) => setFrequency(v[0] / 10)}
                  min={1}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Hệ số cản (γ): {damping.toFixed(2)}</Label>
                <Slider
                  value={[damping * 100]}
                  onValueChange={(v) => setDamping(v[0] / 100)}
                  min={0}
                  max={100}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button onClick={runSimulation} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
              <Zap className="mr-2 h-4 w-4" />
              Chạy mô phỏng
            </Button>
            <Button 
              onClick={() => setIsAnimating(!isAnimating)} 
              disabled={!simulationData}
              variant="outline"
            >
              {isAnimating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={resetAnimation}
              disabled={!simulationData}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Prediction (for projectile) */}
      {aiPrediction && motionType === 'projectile' && (
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-600">Tầm xa</div>
                <div className="text-xl font-bold text-blue-600">
                  {aiPrediction.landing_distance.toFixed(2)}m
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-600">Độ cao max</div>
                <div className="text-xl font-bold text-purple-600">
                  {aiPrediction.max_height.toFixed(2)}m
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-600">Thời gian bay</div>
                <div className="text-xl font-bold text-green-600">
                  {aiPrediction.flight_time.toFixed(2)}s
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <div className="text-xs text-gray-600">V khi chạm đất</div>
                <div className="text-xl font-bold text-orange-600">
                  {aiPrediction.impact_velocity.toFixed(2)}m/s
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-center text-gray-600">
              Confidence: {(aiPrediction.confidence * 100).toFixed(0)}% (Analytical solution)
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canvas Visualization */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Trajectory Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={1000}
            height={600}
            className="w-full border-2 border-purple-100 rounded-lg bg-gradient-to-br from-sky-50 to-yellow-50"
          />
          
          {simulationData && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">
                Frame: {currentFrame} / {simulationData.trajectory.time.length}
              </div>
              <div className="text-sm">
                Time: {simulationData.trajectory.time[currentFrame]?.toFixed(2) || 0}s
              </div>
              {motionType === 'projectile' && (
                <div className="text-sm">
                  Position: ({simulationData.trajectory.x[currentFrame]?.toFixed(1) || 0}m, 
                  {simulationData.trajectory.y[currentFrame]?.toFixed(1) || 0}m)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results & Charts */}
      {simulationData && (
        <Tabs defaultValue="trajectory" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trajectory">📈 Quỹ đạo</TabsTrigger>
            <TabsTrigger value="velocity">🚀 Vận tốc</TabsTrigger>
            <TabsTrigger value="energy">⚡ Năng lượng</TabsTrigger>
            <TabsTrigger value="results">📊 Kết quả</TabsTrigger>
          </TabsList>

          <TabsContent value="trajectory">
            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ quỹ đạo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {motionType === 'projectile' ? (
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" label={{value: 'X (m)', position: 'insideBottom', offset: -5}} />
                      <YAxis label={{value: 'Y (m)', angle: -90, position: 'insideLeft'}} />
                      <Tooltip />
                      <Line type="monotone" dataKey="y" stroke="#7c3aed" strokeWidth={3} dot={false} />
                    </LineChart>
                  ) : (
                    <LineChart data={getChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" label={{value: 'Time (s)', position: 'insideBottom', offset: -5}} />
                      <YAxis label={{value: motionType === 'harmonic' ? 'Position (m)' : 'Height (m)', angle: -90, position: 'insideLeft'}} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey={motionType === 'harmonic' ? 'position' : 'height'} 
                        stroke="#7c3aed" 
                        strokeWidth={3} 
                        dot={false} 
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="velocity">
            <Card>
              <CardHeader>
                <CardTitle>Biểu đồ vận tốc</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {motionType === 'projectile' && (
                      <Line type="monotone" dataKey="speed" stroke="#3b82f6" strokeWidth={2} name="Tốc độ (m/s)" />
                    )}
                    {motionType === 'free_fall' && (
                      <Line type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={2} name="Vận tốc (m/s)" />
                    )}
                    {motionType === 'harmonic' && (
                      <Line type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={2} name="Vận tốc (m/s)" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="energy">
            <Card>
              <CardHeader>
                <CardTitle>Năng lượng</CardTitle>
                <CardDescription>Định luật bảo toàn năng lượng</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={simulationData.energy.potential.map((_, i) => ({
                    time: simulationData.trajectory.time[i],
                    PE: simulationData.energy.potential[i].toFixed(2),
                    KE: simulationData.energy.kinetic[i].toFixed(2),
                    Total: simulationData.energy.total[i].toFixed(2)
                  })).filter((_, i) => i % 5 === 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="PE" stackId="1" stroke="#f59e0b" fill="#fbbf24" name="Thế năng (J)" />
                    <Area type="monotone" dataKey="KE" stackId="1" stroke="#3b82f6" fill="#60a5fa" name="Động năng (J)" />
                    <Line type="monotone" dataKey="Total" stroke="#10b981" strokeWidth={2} name="Tổng (J)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle>Kết quả phân tích</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(simulationData.results).map(([key, value]: [string, any]) => (
                    <div key={key} className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border">
                      <div className="text-xs text-gray-600 capitalize mb-1">
                        {key.replace('_', ' ')}
                      </div>
                      <div className="text-lg font-bold text-purple-700">
                        {typeof value === 'number' ? value.toFixed(2) : value || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>

                {simulationData.theoretical && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-2">Theoretical Values:</h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      {Object.entries(simulationData.theoretical).map(([key, value]: [string, any]) => (
                        <div key={key}>
                          <span className="text-gray-600">{key.replace('_', ' ')}:</span>
                          <span className="ml-2 font-bold">{value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

