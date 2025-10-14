"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Wind, Star, Zap, Play, Info, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AerodynamicsViewer } from "@/components/simulations/aerodynamics-viewer";
import { AerodynamicsOptimizer } from "@/components/simulations/aerodynamics-optimizer";

export default function AerodynamicsPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentSimulation, setCurrentSimulation] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('airfoil');

  const API_ENDPOINT = "http://localhost:8007";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/aerodynamics/data.json').then(r => r.json()),
          fetch('/labs/aerodynamics/manifest.json').then(r => r.json())
        ]);
        
        setData(simData);
        setManifest(manifestData);
        setCurrentSimulation(simData.defaultSimulation);
      } catch (error) {
        console.error('Error loading aerodynamics data:', error);
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
      // Get preset config
      const presets = await fetch(`${API_ENDPOINT}/presets`).then(r => r.json());
      const preset = presets.presets.find((p: any) => p.id === presetId);
      
      if (!preset) throw new Error('Preset not found');

      // Run simulation
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
      alert('Không thể kết nối đến Python API. Đảm bảo server đang chạy: python api.py');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải simulation động lực học không khí...</p>
        </div>
      </div>
    );
  }

  if (!data || !manifest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Wind className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu simulation</p>
          <Link href="/dashboard/labtwin/labs" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
              <Wind className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {manifest.nameVi || manifest.name}
              </h1>
              <p className="text-gray-600 text-lg mb-3">
                {manifest.descriptionVi || manifest.description}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {manifest.difficulty || 'Advanced'}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Navier-Stokes Solver
                </Badge>
                <Badge variant="outline">WebGL Visualization</Badge>
                <Badge variant="outline">AI Optimization</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="simulation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="simulation" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Mô phỏng
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Tối ưu hóa AI
            </TabsTrigger>
            <TabsTrigger value="theory" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lý thuyết
            </TabsTrigger>
          </TabsList>

          {/* Simulation Tab */}
          <TabsContent value="simulation" className="space-y-6">
            {/* Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Chọn kịch bản
                </CardTitle>
                <CardDescription>
                  Chọn một preset hoặc tùy chỉnh cấu hình của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.presets?.map((preset: any) => (
                    <Button
                      key={preset.id}
                      variant={selectedPreset === preset.id ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col items-center gap-2"
                      onClick={() => runSimulation(preset.id)}
                      disabled={loading}
                    >
                      <span className="text-2xl">{preset.icon}</span>
                      <span className="font-medium">{preset.name}</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {preset.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Viewer */}
            {currentSimulation && (
              <AerodynamicsViewer 
                simulationData={currentSimulation}
              />
            )}

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Info className="h-5 w-5" />
                  Hướng dẫn sử dụng
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-800 space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Chọn một kịch bản từ các preset có sẵn</li>
                  <li>Nhấn Play để xem animation dòng khí</li>
                  <li>Chuyển đổi giữa các chế độ hiển thị: Vận tốc, Áp suất, Đường dòng</li>
                  <li>Quan sát lực cản (Drag) và lực nâng (Lift) thay đổi theo thời gian</li>
                  <li>Sử dụng tab "Tối ưu hóa AI" để tìm hình dạng tốt nhất</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            <AerodynamicsOptimizer 
              apiEndpoint={API_ENDPOINT}
              onOptimizationComplete={(result) => {
                console.log('Optimization complete:', result);
              }}
            />
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Phương trình Navier-Stokes</CardTitle>
                <CardDescription>
                  Phương trình cơ bản mô tả chuyển động của chất lỏng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm">
                  <div>∂u/∂t + (u·∇)u = -∇p + ν∇²u + f</div>
                  <div className="mt-2">∇·u = 0  (incompressibility)</div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-semibold">Các thành phần:</h4>
                  <ul className="space-y-2 text-sm">
                    <li><strong>u</strong>: Trường vận tốc (velocity field)</li>
                    <li><strong>p</strong>: Trường áp suất (pressure field)</li>
                    <li><strong>ν</strong>: Độ nhớt động học (kinematic viscosity)</li>
                    <li><strong>f</strong>: Lực ngoài (external forces)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phương pháp giải số</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">1. Diffusion (Khuếch tán)</h4>
                  <p className="text-gray-600">
                    Vận tốc lan truyền do độ nhớt, sử dụng phương pháp Gauss-Seidel
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">2. Advection (Vận chuyển)</h4>
                  <p className="text-gray-600">
                    Vận tốc được vận chuyển theo dòng chảy, sử dụng phương pháp Semi-Lagrangian
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">3. Projection (Chiếu)</h4>
                  <p className="text-gray-600">
                    Đảm bảo tính không nén được (incompressibility) bằng cách loại bỏ divergence
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lực và hệ số</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Drag Force (Lực cản)</h4>
                  <p className="text-gray-600 mb-2">
                    Lực cản là lực cản trở chuyển động, tác động theo phương dòng chảy
                  </p>
                  <div className="bg-gray-100 p-3 rounded font-mono">
                    Cd = Fd / (0.5 × ρ × v² × A)
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Lift Force (Lực nâng)</h4>
                  <p className="text-gray-600 mb-2">
                    Lực nâng tác động vuông góc với dòng chảy, tạo ra bởi chênh lệch áp suất
                  </p>
                  <div className="bg-gray-100 p-3 rounded font-mono">
                    Cl = Fl / (0.5 × ρ × v² × A)
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ứng dụng thực tế</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">✈️</span>
                    <div>
                      <strong>Thiết kế máy bay:</strong> Tối ưu hóa cánh máy bay để giảm lực cản và tăng lực nâng
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">🚗</span>
                    <div>
                      <strong>Ô tô:</strong> Thiết kế thân xe aerodynamic để tiết kiệm nhiên liệu
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">💨</span>
                    <div>
                      <strong>Tua-bin gió:</strong> Tối ưu hóa cánh quạt để tăng hiệu suất
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">🏗️</span>
                    <div>
                      <strong>Xây dựng:</strong> Phân tích tác động của gió lên các tòa nhà cao tầng
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

