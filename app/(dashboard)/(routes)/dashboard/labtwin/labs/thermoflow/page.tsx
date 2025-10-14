"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Star, Play, Info, BookOpen, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ThermoFlowHeatmap } from "@/components/simulations/thermoflow-heatmap";

export default function ThermoFlowPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSimulation, setCurrentSimulation] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('single_source');

  const API_ENDPOINT = "http://localhost:8010";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/thermoflow/data.json').then(r => r.json()),
          fetch('/labs/thermoflow/manifest.json').then(r => r.json())
        ]);
        
        setData(simData);
        setManifest(manifestData);
        setCurrentSimulation(simData.defaultSimulation);
      } catch (error) {
        console.error('Error loading ThermoFlow data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const runSimulation = async (presetId: string) => {
    setLoading(true);
    setSelectedPreset(presetId);

    try {
      const presets = await fetch(`${API_ENDPOINT}/presets`).then(r => r.json());
      const preset = presets.presets.find((p: any) => p.id === presetId);
      
      if (!preset) throw new Error('Preset not found');

      const response = await fetch(`${API_ENDPOINT}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset.config)
      });

      if (!response.ok) throw new Error('Simulation failed');

      const result = await response.json();
      setCurrentSimulation(result);
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Không thể kết nối API. Chạy: python api.py (port 8010)');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải ThermoFlow...</p>
        </div>
      </div>
    );
  }

  if (!data || !manifest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Flame className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu</p>
          <Link href="/dashboard/labtwin/labs" className="text-orange-600 hover:text-orange-700 mt-2 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4 font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl text-white shadow-lg">
              <Flame className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                🔥 {manifest.nameVi || manifest.name}
              </h1>
              <p className="text-gray-600 text-lg mb-3">
                {manifest.descriptionVi || manifest.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-gradient-to-r from-orange-400 to-red-400 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Heat Equation PDE
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-0">
                  Heatmap Dynamic
                </Badge>
                <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0">
                  AI Prediction
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80">
            <TabsTrigger value="simulation">🔥 Mô phỏng</TabsTrigger>
            <TabsTrigger value="ai">🤖 AI Prediction</TabsTrigger>
            <TabsTrigger value="theory">📚 Lý thuyết</TabsTrigger>
          </TabsList>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            {/* Presets */}
            <Card className="bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Chọn kịch bản
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {data.presets?.map((preset: any) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => runSimulation(preset.id)}
                      disabled={loading}
                    >
                      <span className="text-3xl">{preset.icon}</span>
                      <span className="text-xs text-center">{preset.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Heatmap */}
            {currentSimulation && (
              <ThermoFlowHeatmap simulationData={currentSimulation} />
            )}

            {/* Info */}
            <Card className="bg-orange-50 border-orange-200 border-2">
              <CardContent className="p-6">
                <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Hướng dẫn
                </h3>
                <ul className="text-orange-800 space-y-2 text-sm">
                  <li>🎯 Chọn preset để xem các kịch bản khác nhau</li>
                  <li>▶️ Nhấn Play để xem animation truyền nhiệt</li>
                  <li>🌈 Màu sắc: Xanh (lạnh) → Vàng → Đỏ (nóng)</li>
                  <li>⭕ Vòng tròn cyan: Vùng nhiệt cao (AI prediction)</li>
                  <li>📊 Theo dõi thống kê nhiệt độ ở dưới</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  AI Hot Zone Prediction
                </CardTitle>
                <CardDescription className="text-purple-700">
                  Hệ thống AI tự động phát hiện và dự đoán vùng có nhiệt độ cao
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Cách hoạt động:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-purple-800">
                    <li>Tính mean (μ) và standard deviation (σ) của nhiệt độ</li>
                    <li>Threshold = μ + 1.5σ (có thể tùy chỉnh)</li>
                    <li>Tìm tất cả điểm có T &gt; threshold</li>
                    <li>Cluster các điểm gần nhau thành zones</li>
                    <li>Hiển thị với vòng tròn cyan trên heatmap</li>
                  </ol>
                </div>
                
                {currentSimulation && currentSimulation.hot_regions_prediction && (
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">Kết quả dự đoán:</h4>
                    <Badge className="bg-purple-600 text-white">
                      Phát hiện {currentSimulation.hot_regions_prediction.length} vùng nhiệt cao
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Phương trình truyền nhiệt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Heat Equation (PDE)</h3>
                  <div className="bg-gray-100 p-4 rounded font-mono">
                    ∂T/∂t = α∇²T
                  </div>
                  <p className="text-gray-700 mt-2">
                    Trong đó: <br/>
                    • T: Nhiệt độ (temperature) <br/>
                    • α: Độ khuếch tán nhiệt (thermal diffusivity) <br/>
                    • ∇²T: Laplacian (đạo hàm bậc 2)
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Finite Difference Method</h3>
                  <p className="text-gray-700">
                    Chia không gian thành grid và tính xấp xỉ đạo hàm bằng finite differences.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


