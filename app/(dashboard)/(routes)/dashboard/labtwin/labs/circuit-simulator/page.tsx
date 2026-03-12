'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Zap, Power, Settings2, Info, Lightbulb, Battery, ToggleLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

const CircuitSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State quản lý mô phỏng
  const [isClosed, setIsClosed] = useState(false);
  const [voltage, setVoltage] = useState(5);
  const [flowType, setFlowType] = useState<'conventional' | 'electron'>('conventional');
  const [current, setCurrent] = useState(0);

  // Sử dụng ref để lưu trữ state mới nhất cho animation loop
  const stateRef = useRef({ isClosed, voltage, flowType, offset: 0 });

  useEffect(() => {
    stateRef.current = { ...stateRef.current, isClosed, voltage, flowType };
    // Tính toán dòng điện theo định luật Ohm (I = V/R, giả sử R = 10Ω)
    setCurrent(isClosed ? voltage / 10 : 0);
  }, [isClosed, voltage, flowType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;

    // Định nghĩa các đoạn đường đi của dòng điện
    const segments = [
      { x1: 120, y1: 150, x2: 120, y2: 60, len: 90 },
      { x1: 120, y1: 60, x2: 250, y2: 60, len: 130 },
      { x1: 250, y1: 60, x2: 330, y2: 60, len: 80 },
      { x1: 330, y1: 60, x2: 480, y2: 60, len: 150 },
      { x1: 480, y1: 60, x2: 480, y2: 180, len: 120 },
      { x1: 480, y1: 180, x2: 480, y2: 260, len: 80 },
      { x1: 480, y1: 260, x2: 480, y2: 380, len: 120 },
      { x1: 480, y1: 380, x2: 120, y2: 380, len: 360 },
      { x1: 120, y1: 380, x2: 120, y2: 310, len: 70 },
      { x1: 120, y1: 310, x2: 120, y2: 150, len: 160 }
    ];
    const totalLen = segments.reduce((acc, seg) => acc + seg.len, 0);

    const getPointAtDistance = (d: number) => {
      d = ((d % totalLen) + totalLen) % totalLen;
      let currentLen = 0;
      for (let i = 0; i < segments.length; i++) {
        let seg = segments[i];
        if (d <= currentLen + seg.len) {
          let ratio = (d - currentLen) / seg.len;
          let x = seg.x1 + (seg.x2 - seg.x1) * ratio;
          let y = seg.y1 + (seg.y2 - seg.y1) * ratio;
          let angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
          return { x, y, angle, d };
        }
        currentLen += seg.len;
      }
      return { x: segments[0].x1, y: segments[0].y1, angle: 0, d: 0 };
    };

    const drawCircuit = (ctx: CanvasRenderingContext2D, state: any) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Dây dương (Đỏ)
      ctx.beginPath();
      ctx.moveTo(120, 150);
      ctx.lineTo(120, 60);
      ctx.lineTo(250, 60);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#dc2626';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(330, 60);
      ctx.lineTo(480, 60);
      ctx.lineTo(480, 180);
      ctx.stroke();

      // Dây âm (Đen)
      ctx.beginPath();
      ctx.moveTo(480, 260);
      ctx.lineTo(480, 380);
      ctx.lineTo(120, 380);
      ctx.lineTo(120, 310);
      ctx.strokeStyle = '#1f2937';
      ctx.stroke();

      // Công tắc
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(250, 60, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(330, 60, 6, 0, Math.PI * 2); ctx.fill();
      
      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#4b5563';
      ctx.moveTo(250, 60);
      if (state.isClosed) {
        ctx.lineTo(330, 60);
      } else {
        ctx.lineTo(315, 20);
      }
      ctx.stroke();

      // Bóng đèn
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(455, 250, 50, 30);
      ctx.fillStyle = '#4b5563';
      ctx.beginPath(); ctx.arc(480, 280, 15, 0, Math.PI, false); ctx.fill();
      
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(455, 255 + i * 8);
        ctx.lineTo(505, 257 + i * 8);
        ctx.stroke();
      }

      // Vỏ thủy tinh
      ctx.beginPath();
      ctx.arc(480, 200, 50, 0, Math.PI * 2);
      if (state.isClosed) {
        let gradient = ctx.createRadialGradient(480, 200, 10, 480, 200, 50);
        const alpha = Math.min(0.4 + state.voltage * 0.05, 1);
        gradient.addColorStop(0, `rgba(253, 224, 71, ${alpha + 0.2})`);
        gradient.addColorStop(1, `rgba(253, 224, 71, ${alpha * 0.3})`);
        ctx.fillStyle = gradient;
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 10 + state.voltage * 4;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Dây tóc bóng đèn
      ctx.strokeStyle = state.isClosed ? '#fef08a' : '#6b7280';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(465, 250); ctx.lineTo(465, 210);
      ctx.lineTo(475, 185); ctx.lineTo(485, 185);
      ctx.lineTo(495, 210); ctx.lineTo(495, 250);
      ctx.stroke();

      // Pin
      ctx.fillStyle = '#111827';
      ctx.fillRect(80, 230, 80, 80);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(80, 150, 80, 80);
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.strokeRect(80, 150, 80, 160);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(100, 135, 40, 15);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', 120, 190);
      ctx.fillText('-', 120, 270);

      // Hạt di chuyển
      const numParticles = 18;
      const spacing = totalLen / numParticles;

      for (let i = 0; i < numParticles; i++) {
        let d = state.offset + i * spacing;
        let pt = getPointAtDistance(d);

        if (pt.d > 1200) continue;
        if (!state.isClosed && pt.d > 220 && pt.d < 330) continue;

        ctx.save();
        ctx.translate(pt.x, pt.y);

        if (state.flowType === 'conventional') {
          ctx.rotate(pt.angle);
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-6, 8);
          ctx.lineTo(-6, -8);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('-', 0, 1);
        }
        ctx.restore();
      }

      // Nhãn
      ctx.fillStyle = '#4b5563';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Nguồn DC', 120, 340);
      ctx.fillText('Công tắc', 290, 40);
      ctx.fillText('Bóng đèn', 480, 410);
    };

    const render = () => {
      const state = stateRef.current;
      
      if (state.isClosed) {
        const baseSpeed = 0.5 + (state.voltage * 0.1);
        state.offset += (state.flowType === 'conventional' ? baseSpeed : -baseSpeed);
      }
      
      drawCircuit(ctx, state);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl text-white shadow-lg">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ⚡ Mạch Điện DC Cơ Bản
              </h1>
              <p className="text-slate-600 text-lg">Khám phá dòng điện một chiều và định luật Ohm</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
              <Battery className="h-3 w-3 mr-1" />
              Vật lý 11
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <Lightbulb className="h-3 w-3 mr-1" />
              Điện học
            </Badge>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <Settings2 className="h-3 w-3 mr-1" />
              Interactive
            </Badge>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Battery className="h-8 w-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">{voltage}V</div>
                  <div className="text-xs text-gray-600">Điện áp</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{current.toFixed(2)}A</div>
                  <div className="text-xs text-gray-600">Dòng điện</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Settings2 className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-600">10Ω</div>
                  <div className="text-xs text-gray-600">Điện trở</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Power className={`h-8 w-8 ${isClosed ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <div className={`text-2xl font-bold ${isClosed ? 'text-green-600' : 'text-gray-400'}`}>
                    {isClosed ? 'ON' : 'OFF'}
                  </div>
                  <div className="text-xs text-gray-600">Trạng thái</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Control Panel */}
          <div className="w-full lg:w-1/3 space-y-6">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5 text-blue-500" />
                  Điều khiển mạch
                </CardTitle>
                <CardDescription>Bật/tắt công tắc để đóng/ngắt mạch</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setIsClosed(!isClosed)}
                  className={`w-full py-6 text-lg font-semibold transition-all duration-300 ${
                    isClosed 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                  }`}
                >
                  <ToggleLeft className={`h-6 w-6 mr-2 ${isClosed ? '' : 'animate-pulse'}`} />
                  {isClosed ? 'Tắt Công Tắc (Mở Mạch)' : 'Bật Công Tắc (Đóng Mạch)'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-purple-500" />
                  Điện áp nguồn (Voltage)
                </CardTitle>
                <CardDescription>Điều chỉnh điện áp từ 1V đến 12V</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Điện áp:</span>
                  <span className="text-blue-600">{voltage} V</span>
                </div>
                <Slider 
                  value={[voltage]}
                  onValueChange={(val) => setVoltage(val[0])}
                  min={1}
                  max={12}
                  step={1}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>1V</span>
                  <span>12V</span>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                  💡 <strong>Định luật Ohm:</strong> I = V/R = {voltage}V / 10Ω = <strong>{current.toFixed(2)}A</strong>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-pink-200">
              <CardHeader>
                <CardTitle className="text-lg">Chế độ hiển thị dòng điện</CardTitle>
                <CardDescription>Chọn cách hiển thị dòng điện</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-pink-50 transition-colors">
                  <input 
                    type="radio" 
                    name="flowType" 
                    value="conventional"
                    checked={flowType === 'conventional'}
                    onChange={() => setFlowType('conventional')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-700">Dòng điện quy ước</div>
                    <div className="text-xs text-slate-500">Chảy từ Cực Dương (+) sang Cực Âm (-)</div>
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">→</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-pink-50 transition-colors">
                  <input 
                    type="radio" 
                    name="flowType" 
                    value="electron"
                    checked={flowType === 'electron'}
                    onChange={() => setFlowType('electron')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-red-700">Dòng Electron thực tế</div>
                    <div className="text-xs text-slate-500">Electron (-) di chuyển về Cực Dương (+)</div>
                  </div>
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-xs">
                    e⁻
                  </div>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Simulation Canvas */}
          <div className="w-full lg:w-2/3">
            <Card className="border-2 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  Mô phỏng mạch điện
                </CardTitle>
                <CardDescription>Quan sát dòng điện chạy trong mạch kín</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center bg-white rounded-xl">
                <canvas 
                  ref={canvasRef} 
                  width={600} 
                  height={450} 
                  className="max-w-full h-auto"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Theory Section */}
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-6 w-6 text-blue-500" />
              Lý thuyết về Nguồn điện DC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-blue-900">📚 Nguồn điện một chiều (DC)</h3>
                <p className="text-sm leading-relaxed">
                  Mô phỏng này thể hiện mạch điện sử dụng nguồn một chiều (DC - Direct Current) như Pin hoặc Ắc-quy. 
                  Trong mạch DC, dòng điện chỉ chảy theo một hướng duy nhất từ cực dương (+) sang cực âm (-).
                </p>
                <p className="text-sm leading-relaxed">
                  <strong>Ngược lại:</strong> Nguồn điện xoay chiều (AC - Alternating Current) từ các ổ cắm điện trong nhà 
                  có dòng điện đổi chiều liên tục (50-60 lần mỗi giây).
                </p>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-purple-900">⚡ Định luật Ohm</h3>
                <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                  <div className="text-center text-2xl font-bold text-purple-700 mb-2">
                    I = V / R
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div><strong>I:</strong> Cường độ dòng điện (Ampe)</div>
                    <div><strong>V:</strong> Hiệu điện thế (Volt)</div>
                    <div><strong>R:</strong> Điện trở (Ohm)</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-2">💡 Quy ước lịch sử về chiều dòng điện</h3>
              <p className="text-sm text-yellow-800 leading-relaxed">
                Trước khi phát hiện ra electron (cuối thế kỷ 19), các nhà khoa học quy ước dòng điện chảy từ 
                <strong> cực dương (+) sang cực âm (-)</strong>. Sau này, khoa học chứng minh dòng chuyển dời thực tế 
                là các <strong>electron mang điện tích âm (-)</strong> chạy từ cực âm sang cực dương. Tuy nhiên, 
                quy ước cũ vẫn được sử dụng rộng rãi trong thiết kế mạch điện và giáo dục ngày nay.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Section */}
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Lightbulb className="h-5 w-5 text-green-500" />
              Câu hỏi kiểm tra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="font-semibold text-green-900 mb-3">
                  Câu 1: Khi tăng điện áp từ 5V lên 10V, dòng điện trong mạch sẽ thay đổi như thế nào?
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {['Giữ nguyên', 'Tăng gấp đôi', 'Giảm một nửa', 'Tăng gấp ba'].map((answer, i) => (
                    <Button key={i} variant="outline" className="justify-start h-auto py-3">
                      <span className="w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center mr-2 text-sm font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {answer}
                    </Button>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-green-200 text-sm text-green-700">
                  <strong>Đáp án:</strong> B - Tăng gấp đôi (theo định luật Ohm: I tỉ lệ thuận với V)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CircuitSimulation;
