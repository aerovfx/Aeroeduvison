"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Star, Clock, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HarmonicMotionViewer } from "@/components/simulations/harmonic-motion-viewer";

export default function HarmonicMotionLabPage() {
  const [data, setData] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [simData, manifestData] = await Promise.all([
          fetch('/labs/harmonic-motion/data.json').then(r => r.json()),
          fetch('/labs/harmonic-motion/manifest.json').then(r => r.json())
        ]);
        setData(simData);
        setManifest(manifestData);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  if (loading || !data || !manifest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-700">Đang tải...</div>
        </div>
      </div>
    );
  }
  
  const handlePresetClick = (presetId: string) => {
    setSelectedPreset(presetId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/labtwin/labs" 
            className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách labs
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-orange-500 rounded-xl text-white">
              <Activity className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{manifest.name}</h1>
              <p className="text-gray-600 mb-4">{manifest.description}</p>
              
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {manifest.category}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {manifest.level}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {manifest.duration}
                </div>
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <Star className="h-4 w-4" />
                  +{manifest.xp} XP
                </div>
                <Badge className="bg-orange-600 text-sm">
                  v{manifest.version}
                </Badge>
              </div>
            </div>
          </div>

          {/* Features */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-orange-600" />
                Tính năng nổi bật
              </h3>
              <div className="flex flex-wrap gap-2">
                {manifest.features.map((feature: string, index: number) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Mục tiêu học tập</h3>
              <ul className="space-y-2">
                {manifest.learning_objectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">✓</span>
                    <span className="text-gray-700">{objective}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Presets Info */}
          <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                🎯 Presets dao động (Click để áp dụng)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.presets.map((preset: any) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset.id)}
                    className={`text-center p-3 bg-white rounded-lg border-2 transition-all hover:shadow-lg hover:scale-105 ${
                      selectedPreset === preset.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-orange-200'
                    }`}
                  >
                    <div className="text-3xl mb-1">{preset.icon}</div>
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-500">A={preset.A}cm, f={preset.f}Hz</div>
                  </button>
                ))}
              </div>
              {selectedPreset && (
                <div className="mt-3 text-sm text-orange-700 bg-orange-100 p-2 rounded">
                  ✓ Đã chọn preset: {data.presets.find((p: any) => p.id === selectedPreset)?.name}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Simulation */}
        <div className="max-w-7xl mx-auto">
          <HarmonicMotionViewer data={data} selectedPreset={selectedPreset} />
        </div>

        {/* Theory */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">📚 Lý thuyết</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-orange-700 mb-2">
                  Định nghĩa
                </h4>
                <p className="text-gray-600 text-sm">
                  {data.theory.definition}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-orange-700 mb-2">
                  Đặc điểm
                </h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {data.theory.characteristics.map((char: string, index: number) => (
                    <li key={index}>{char}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-orange-700 mb-2">
                  Ví dụ thực tế
                </h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {data.theory.examples.map((example: string, index: number) => (
                    <li key={index}>{example}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Được tạo bởi Python Simulation • Version {data.version}</p>
          <p className="mt-1">
            Dữ liệu được tạo từ: <code className="bg-gray-100 px-2 py-1 rounded">/python-simulations/harmonic-motion/</code>
          </p>
        </div>
      </div>
    </div>
  );
}
