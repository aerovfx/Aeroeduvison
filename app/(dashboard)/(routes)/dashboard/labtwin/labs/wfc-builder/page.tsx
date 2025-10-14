"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Box, Sparkles, Play, Shuffle, Info, BookOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WFC3DViewer } from "@/components/simulations/wfc-3d-viewer";

export default function WFCBuilderPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentStructure, setCurrentStructure] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedTileset, setSelectedTileset] = useState<string>('building_blocks');
  const [dimensions, setDimensions] = useState({ width: 8, height: 8, depth: 8 });

  const API_ENDPOINT = "http://localhost:8008";

  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/wfc-builder/data.json').then(r => r.json()),
          fetch('/labs/wfc-builder/manifest.json').then(r => r.json())
        ]);
        
        setData(simData);
        setManifest(manifestData);
        
        // Set first sample as default
        if (simData.samples && simData.samples.length > 0) {
          setCurrentStructure(simData.samples[0].data);
        }
      } catch (error) {
        console.error('Error loading WFC data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const generateStructure = async (config?: any) => {
    setGenerating(true);

    try {
      const requestConfig = config || {
        width: dimensions.width,
        height: dimensions.height,
        depth: dimensions.depth,
        tileset: selectedTileset,
        seed: Math.floor(Math.random() * 10000),
        max_iterations: 2000
      };

      const response = await fetch(`${API_ENDPOINT}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestConfig)
      });

      if (!response.ok) throw new Error('Generation failed');

      const result = await response.json();
      setCurrentStructure(result);
    } catch (error) {
      console.error('Generation error:', error);
      alert('Không thể kết nối đến Python API. Đảm bảo server đang chạy: python api.py (port 8008)');
    } finally {
      setGenerating(false);
    }
  };

  const loadPreset = async (presetId: string) => {
    setSelectedPreset(presetId);
    
    try {
      const response = await fetch(`${API_ENDPOINT}/presets`);
      const data = await response.json();
      const preset = data.presets.find((p: any) => p.id === presetId);
      
      if (preset) {
        await generateStructure(preset.config);
      }
    } catch (error) {
      console.error('Preset loading error:', error);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = data.samples.find((s: any) => s.id === sampleId);
    if (sample) {
      setCurrentStructure(sample.data);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải WFC Builder...</p>
        </div>
      </div>
    );
  }

  if (!data || !manifest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Box className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Không thể tải dữ liệu WFC Builder</p>
          <Link href="/dashboard/labtwin/labs" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/labtwin/labs" className="inline-flex items-center text-indigo-600 hover:text-indigo-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <Box className="h-8 w-8" />
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
                  <Sparkles className="h-3 w-3" />
                  Wave Function Collapse
                </Badge>
                <Badge variant="outline">3D Voxel Generation</Badge>
                <Badge variant="outline">Procedural</Badge>
                <Badge variant="outline">AI Patterns</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="builder" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Box className="h-4 w-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="patterns" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Patterns
            </TabsTrigger>
            <TabsTrigger value="theory" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lý thuyết
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Generate Structure
                </CardTitle>
                <CardDescription>
                  Tạo cấu trúc 3D procedural với thuật toán Wave Function Collapse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Quick Presets</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {['small_house', 'tower', 'dungeon_small', 'complex_building', 'cube'].map((preset) => {
                      const icons: any = {
                        small_house: '🏠',
                        tower: '🗼',
                        dungeon_small: '🏰',
                        complex_building: '🏢',
                        cube: '🧊'
                      };
                      
                      return (
                        <Button
                          key={preset}
                          variant={selectedPreset === preset ? "default" : "outline"}
                          onClick={() => loadPreset(preset)}
                          disabled={generating}
                          className="h-auto py-3 flex flex-col items-center gap-1"
                        >
                          <span className="text-2xl">{icons[preset]}</span>
                          <span className="text-xs">{preset.replace('_', ' ')}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Or Samples */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Pre-generated Samples</label>
                  <div className="grid grid-cols-3 gap-2">
                    {data.samples?.map((sample: any) => (
                      <Button
                        key={sample.id}
                        variant="outline"
                        onClick={() => loadSample(sample.id)}
                        className="h-auto py-2"
                      >
                        {sample.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-4">Custom Configuration</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {/* Tileset */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tileset</label>
                      <Select value={selectedTileset} onValueChange={setSelectedTileset}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple_blocks">🟦 Simple Blocks</SelectItem>
                          <SelectItem value="building_blocks">🏠 Building</SelectItem>
                          <SelectItem value="dungeon">🏰 Dungeon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Width: {dimensions.width}</label>
                        <Slider
                          value={[dimensions.width]}
                          onValueChange={(v) => setDimensions({...dimensions, width: v[0]})}
                          min={3}
                          max={20}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Height: {dimensions.height}</label>
                        <Slider
                          value={[dimensions.height]}
                          onValueChange={(v) => setDimensions({...dimensions, height: v[0]})}
                          min={3}
                          max={20}
                          step={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Depth: {dimensions.depth}</label>
                        <Slider
                          value={[dimensions.depth]}
                          onValueChange={(v) => setDimensions({...dimensions, depth: v[0]})}
                          min={3}
                          max={20}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => generateStructure()}
                    disabled={generating}
                    className="w-full mt-6"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Shuffle className="h-4 w-4 mr-2" />
                        Generate New Structure
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 3D Viewer */}
            {currentStructure && (
              <WFC3DViewer
                voxels={currentStructure.voxels || []}
                dimensions={currentStructure.dimensions || dimensions}
                statistics={currentStructure.statistics}
              />
            )}

            {/* Instructions */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <Info className="h-5 w-5" />
                  Hướng dẫn
                </CardTitle>
              </CardHeader>
              <CardContent className="text-indigo-800 space-y-2">
                <ol className="list-decimal list-inside space-y-2">
                  <li>Chọn preset hoặc tùy chỉnh dimensions và tileset</li>
                  <li>Nhấn "Generate" để chạy thuật toán WFC</li>
                  <li>Drag để xoay, Shift+Drag để di chuyển 3D view</li>
                  <li>Sử dụng zoom controls để phóng to/thu nhỏ</li>
                  <li>Export structure bằng nút Download</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Pattern Styles
                </CardTitle>
                <CardDescription>
                  Các style pattern được tạo tự động bằng AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.pattern_styles?.map((style: any) => (
                    <Card key={style.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4 text-center">
                        <div className="text-4xl mb-2">{style.icon}</div>
                        <h3 className="font-semibold mb-1">{style.name}</h3>
                        <p className="text-xs text-gray-600 mb-2">{style.description}</p>
                        <Badge variant="secondary">{style.difficulty}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-yellow-900 mb-2">🎨 AI Pattern Generator</h3>
                <p className="text-yellow-800 text-sm">
                  Hệ thống AI có thể tự động phân tích ảnh hoặc scan để tạo tile patterns mới.
                  Các pattern được tạo với constraints phù hợp để đảm bảo kết quả hợp lệ.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wave Function Collapse Algorithm</CardTitle>
                <CardDescription>
                  Thuật toán procedural generation dựa trên constraint satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Nguyên lý hoạt động</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li><strong>Initialization</strong>: Mỗi cell có thể là bất kỳ tile nào</li>
                    <li><strong>Observe</strong>: Chọn cell với entropy thấp nhất (ít khả năng nhất)</li>
                    <li><strong>Collapse</strong>: Chọn ngẫu nhiên một tile cho cell đó</li>
                    <li><strong>Propagate</strong>: Cập nhật constraints cho các cell lân cận</li>
                    <li><strong>Repeat</strong>: Lặp lại cho đến khi hoàn thành hoặc contradiction</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Entropy</h3>
                  <p className="text-gray-700">
                    Entropy = số lượng tiles có thể đặt ở vị trí đó. Cell với entropy thấp nhất
                    sẽ được chọn để collapse tiếp theo (most constrained variable heuristic).
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Adjacency Rules</h3>
                  <p className="text-gray-700 mb-2">
                    Mỗi tile có rules xác định tile nào có thể nằm kế bên theo 6 hướng (+x, -x, +y, -y, +z, -z).
                  </p>
                  <div className="bg-gray-100 p-3 rounded font-mono text-xs">
                    adjacent_rules = {`{`}
                    <br />
                    &nbsp;&nbsp;'+x': ['tile1', 'tile2'],
                    <br />
                    &nbsp;&nbsp;'-x': ['tile3'],
                    <br />
                    &nbsp;&nbsp;...
                    <br />
                    {`}`}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ứng dụng</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span>🎮</span>
                    <div>
                      <strong>Game Development:</strong> Tạo map, dungeon, level tự động
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🏗️</span>
                    <div>
                      <strong>Architecture:</strong> Sinh mẫu kiến trúc modular
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🎨</span>
                    <div>
                      <strong>Art Generation:</strong> Tạo texture, pattern nghệ thuật
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>🌍</span>
                    <div>
                      <strong>Terrain Generation:</strong> Tạo địa hình tự nhiên
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


