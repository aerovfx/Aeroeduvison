'use client';

"use client"

import { useState, useEffect } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, FlaskConical, Star, Clock, ArrowRight, Zap, Settings, Atom, Waves, Camera, Activity, Wind, Box, Info, Sparkles, Target, Brain, Filter, X, Flame } from "lucide-react";

const iconMap: { [key: string]: any } = {
  'Zap': Zap,
  'Settings': Settings,
  'Atom': Atom,
  'Waves': Waves,
  'Camera': Camera,
  'Activity': Activity,
  'FlaskConical': FlaskConical,
  'Wind': Wind,
  'Box': Box,
  'Brain': Brain,
  'Flame': Flame
};

export default function LabsIndexPage() {
  const { t } = useLanguage();
  
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category');
  
  const [labsData, setLabsData] = useState<any>({ simulations: [], total: 0, last_updated: null });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryFilter);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/labs/index.json');
        if (response.ok) {
          const data = await response.json();
          setLabsData(data);
        }
      } catch (error) {
        console.error('Error loading labs:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Update selected category from URL
  useEffect(() => {
    if (categoryFilter) {
      setSelectedCategory(categoryFilter);
    }
  }, [categoryFilter]);

  // Filter simulations by category
  const filteredSimulations = selectedCategory
    ? labsData.simulations.filter((sim: any) => sim.category === selectedCategory)
    : labsData.simulations;

  // Group by category for stats
  const categorizedSims = labsData.simulations.reduce((acc: any, sim: any) => {
    const category = sim.category || t('form.other');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(sim);
    return acc;
  }, {});

  const categoryIcons: { [key: string]: string } = {
    'Cơ học': '⚡',
    'Quang học': '💡',
    'Điện từ': '🔋',
    'Sóng': '🌊',
    'Nhiệt học': '🔥',
    'Thị giác máy tính': '👁️',
    'Computer Vision': '📷',
    'Procedural Generation': '🎲',
    'Machine Learning': '🤖'
  };

  const categoryColors: { [key: string]: { bg: string, text: string, border: string } } = {
    'Cơ học': { bg: 'bg-gradient-to-br from-pink-100 to-pink-200', text: 'text-pink-700', border: 'border-pink-300' },
    'Quang học': { bg: 'bg-gradient-to-br from-yellow-100 to-yellow-200', text: 'text-yellow-700', border: 'border-yellow-300' },
    'Điện từ': { bg: 'bg-gradient-to-br from-blue-100 to-blue-200', text: 'text-blue-700', border: 'border-blue-300' },
    'Sóng': { bg: 'bg-gradient-to-br from-cyan-100 to-cyan-200', text: 'text-cyan-700', border: 'border-cyan-300' },
    'Nhiệt học': { bg: 'bg-gradient-to-br from-orange-100 to-orange-200', text: 'text-orange-700', border: 'border-orange-300' },
    'Thị giác máy tính': { bg: 'bg-gradient-to-br from-teal-100 to-teal-200', text: 'text-teal-700', border: 'border-teal-300' },
    'Computer Vision': { bg: 'bg-gradient-to-br from-emerald-100 to-emerald-200', text: 'text-emerald-700', border: 'border-emerald-300' },
    'Procedural Generation': { bg: 'bg-gradient-to-br from-indigo-100 to-indigo-200', text: 'text-indigo-700', border: 'border-indigo-300' },
    'Machine Learning': { bg: 'bg-gradient-to-br from-purple-100 to-purple-200', text: 'text-purple-700', border: 'border-purple-300' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
                    <div className="text-lg text-gray-700">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard/labtwin" 
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại LabTwin
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-2xl text-white shadow-lg transform hover:scale-105 transition-transform">
              <FlaskConical className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                🧪 Virtual Labs
              </h1>
              <p className="text-gray-600 mt-1 text-lg">
                Khám phá khoa học qua các thí nghiệm ảo siêu cool! 🚀
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {labsData.total} thí nghiệm
                </Badge>
                <Badge className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-0">
                  <Target className="h-3 w-3 mr-1" />
                  100% interactive
                </Badge>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-gradient-to-br from-purple-100 via-pink-100 to-orange-100 border-2 border-purple-200 mb-6 overflow-hidden">
            <CardContent className="p-6 relative">
              <div className="absolute top-0 right-0 text-8xl opacity-10">🔬</div>
              <div className="relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl shadow-md">
                    <Sparkles className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-purple-900 mb-2">
                      🎮 Học bằng cách chơi!
                    </h3>
                    <p className="text-purple-700 text-sm mb-3">
                      Mỗi thí nghiệm là một trò chơi khoa học! Tương tác, thử nghiệm, và khám phá cách mọi thứ hoạt động. 
                      Python simulations thật + WebGL visualization + AI integration = Học vừa vui vừa hiểu! 🎉
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge className="bg-white/80 text-purple-700 border border-purple-200">
                        🐍 Python Simulations
                      </Badge>
                      <Badge className="bg-white/80 text-pink-700 border border-pink-200">
                        🎮 WebGL Visualization
                      </Badge>
                      <Badge className="bg-white/80 text-orange-700 border border-orange-200">
                        🤖 AI Integration
                      </Badge>
                      <Badge className="bg-white/80 text-blue-700 border border-blue-200">
                        🎯 Real Science
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Filter Bar */}
        {selectedCategory && (
          <Card className="mb-6 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Filter className="h-5 w-5 text-purple-700" />
                  <div>
                    <span className="text-sm text-purple-700 font-medium">Đang lọc theo:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl">{categoryIcons[selectedCategory]}</span>
                      <span className="font-bold text-purple-900">{selectedCategory}</span>
                      <Badge className="bg-purple-600 text-white">
                        {filteredSimulations.length} labs
                      </Badge>
                    </div>
                  </div>
                </div>
                <Link href="/dashboard/labtwin/labs">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Xóa filter
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Quick Filter */}
        {!selectedCategory && Object.keys(categorizedSims).length > 1 && (
          <Card className="mb-6 bg-white/80 backdrop-blur border-2 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Lọc theo danh mục:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(categorizedSims).sort().map((category) => {
                  const emoji = categoryIcons[category] || '🔬';
                  const count = categorizedSims[category].length;
                  const colors = categoryColors[category] || categoryColors['Cơ học'];
                  
                  return (
                    <Link key={category} href={`/dashboard/labtwin/labs?category=${encodeURIComponent(category)}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`${colors.bg} ${colors.border} border-2 hover:shadow-md transition-all`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="mr-2">{emoji}</span>
                        {category}
                        <Badge className="ml-2 bg-white/80 text-gray-700 border-0">
                          {count}
                        </Badge>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simulations Grid */}
        {filteredSimulations.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🥺</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {selectedCategory ? `Không có thí nghiệm nào trong danh mục "${selectedCategory}"` : 'Chưa có thí nghiệm nào'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory ? (
                  <Link href="/dashboard/labtwin/labs" className="text-purple-600 hover:text-purple-700 underline">
                    Xem tất cả danh mục
                  </Link>
                ) : (
                  'Chạy build script để tạo các thí nghiệm nhé!'
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Show category header if filtering */}
            {selectedCategory && (
              <div className="mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                  <span className="text-5xl">{categoryIcons[selectedCategory]}</span>
                  {selectedCategory}
                </h2>
                <p className="text-gray-600 text-lg">
                  {filteredSimulations.length} thí nghiệm trong danh mục này
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSimulations
              .sort((a: any, b: any) => {
                // Sort by difficulty, then by XP
                const difficultyOrder: { [key: string]: number } = {
                  'Dễ': 1,
                  'Trung bình': 2,
                  'Nâng cao': 3,
                  'Khó': 4
                };
                
                const aDiff = difficultyOrder[a.difficulty] || 2;
                const bDiff = difficultyOrder[b.difficulty] || 2;
                
                if (aDiff !== bDiff) return aDiff - bDiff;
                return (b.xp || 0) - (a.xp || 0);
              })
              .map((sim: any) => {
              const Icon = iconMap[sim.icon] || FlaskConical;
              const categoryStyle = categoryColors[sim.category] || categoryColors['Cơ học'];
              
              return (
                <Dialog key={sim.id}>
                  <Card 
                    className={`group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 ${categoryStyle.border} ${categoryStyle.bg} backdrop-blur overflow-hidden relative`}
                  >
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/20 rounded-full -ml-12 -mb-12"></div>
                    
                    <CardHeader className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-4 bg-white rounded-2xl shadow-lg ${categoryStyle.text} transform group-hover:rotate-12 transition-transform`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 shadow-md">
                          <Star className="h-3 w-3 mr-1 fill-white" />
                          +{sim.xp} XP
                        </Badge>
                      </div>
                      <CardTitle className={`text-xl font-bold ${categoryStyle.text}`}>
                        {sim.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 text-gray-700">
                        {sim.description}
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="relative z-10">
                      {/* Quick Info */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Badge className="bg-white/80 text-gray-700 border border-gray-200">
                          📚 {sim.level}
                        </Badge>
                        <Badge className="bg-white/80 text-gray-700 border border-gray-200">
                          <Clock className="h-3 w-3 mr-1" />
                          {sim.duration}
                        </Badge>
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex gap-2">
                        <Link href={`/dashboard/labtwin/labs/${sim.id}`} className="flex-1">
                          <Button className={`w-full bg-gradient-to-r ${categoryStyle.text.replace('text-', 'from-').replace('-700', '-400')} ${categoryStyle.text.replace('text-', 'to-').replace('-700', '-500')} text-white border-0 shadow-md hover:shadow-lg transform hover:scale-105 transition-all`}>
                            🚀 Bắt đầu
                          </Button>
                        </Link>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon" className="bg-white/80 hover:bg-white border-2">
                            <Info className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Detail Modal */}
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`p-4 ${categoryStyle.bg} rounded-2xl ${categoryStyle.text}`}>
                          <Icon className="h-10 w-10" />
                        </div>
                        <div>
                          <DialogTitle className="text-2xl">{sim.name}</DialogTitle>
                          <DialogDescription className="text-base mt-1">
                            {sim.description}
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                          <div className="text-2xl mb-1">⭐</div>
                          <div className="font-bold text-purple-700">{sim.xp} XP</div>
                          <div className="text-xs text-purple-600">Reward</div>
                        </Card>
                        <Card className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100">
                          <div className="text-2xl mb-1">📚</div>
                          <div className="font-bold text-blue-700">{sim.level}</div>
                          <div className="text-xs text-blue-600">{t('achievements.level')}</div>
                        </Card>
                        <Card className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100">
                          <div className="text-2xl mb-1">⏱️</div>
                          <div className="font-bold text-green-700">{sim.duration}</div>
                          <div className="text-xs text-green-600">Duration</div>
                        </Card>
                      </div>

                      {/* Features */}
                      {sim.features && sim.features.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Tính năng cool
                          </h3>
                          <div className="grid grid-cols-1 gap-2">
                            {sim.features.map((feature: string, index: number) => (
                              <div 
                                key={index}
                                className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                              >
                                <div className="text-lg">✨</div>
                                <span className="text-sm text-gray-700">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Learning Objectives */}
                      {sim.learning_objectives && sim.learning_objectives.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Target className="h-5 w-5 text-green-500" />
                            Bạn sẽ học được gì?
                          </h3>
                          <div className="space-y-2">
                            {sim.learning_objectives.map((obj: string, index: number) => (
                              <div 
                                key={index}
                                className="flex items-start gap-2 p-3 bg-green-50 rounded-lg"
                              >
                                <div className="text-green-500 font-bold">{index + 1}.</div>
                                <span className="text-sm text-gray-700">{obj}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {sim.tags && sim.tags.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-sm mb-2 text-gray-600">Tags:</h3>
                          <div className="flex flex-wrap gap-2">
                            {sim.tags.map((tag: string, index: number) => (
                              <Badge 
                                key={index}
                                variant="secondary"
                                className="bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 border-0"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action */}
                      <Link href={`/dashboard/labtwin/labs/${sim.id}`}>
                        <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg py-6">
                          🚀 Bắt đầu thí nghiệm ngay!
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
          </>
        )}

        {/* How it works section */}
        <Card className="mt-12 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              Cách hoạt động
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  1
                </div>
                <h4 className="font-semibold mb-2">Viết Python</h4>
                <p className="text-sm text-gray-600">
                  Viết mô phỏng vật lý trong <code className="bg-gray-100 px-1 rounded">/python-simulations/</code>
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  2
                </div>
                <h4 className="font-semibold mb-2">Build Data</h4>
                <p className="text-sm text-gray-600">
                  Chạy <code className="bg-gray-100 px-1 rounded">build.py</code> để tạo <code className="bg-gray-100 px-1 rounded">data.json</code>
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  3
                </div>
                <h4 className="font-semibold mb-2">Copy to Next.js</h4>
                <p className="text-sm text-gray-600">
                  Script tự động copy sang <code className="bg-gray-100 px-1 rounded">/public/labs/</code>
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                  4
                </div>
                <h4 className="font-semibold mb-2">Hiển thị</h4>
                <p className="text-sm text-gray-600">
                  Tự động hiển thị trong giao diện LabTwin
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Python Simulations đã chạy:</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="font-semibold text-purple-700">🧠 WFC Builder 3D</div>
                  <div className="text-gray-600">Wave Function Collapse + WebGL</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="font-semibold text-blue-700">🔧 Physics Engine 2D</div>
                  <div className="text-gray-600">Collision detection + Dynamics</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="font-semibold text-green-700">🧬 Neural Network</div>
                  <div className="text-gray-600">Training + Visualization</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="font-semibold text-orange-700">🌊 Fluid Dynamics</div>
                  <div className="text-gray-600">Navier-Stokes + WebGL</div>
                </div>
              </div>
              <code className="block bg-gray-900 text-green-400 p-3 rounded font-mono text-sm mt-3">
                cd python-simulations && python build-all.py
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>🧪 Python Simulations System • Tích hợp với LabTwin</p>
          <p className="mt-1">
            <strong>Đã chạy:</strong> WFC Builder 3D, Physics Engine 2D, Neural Network, Fluid Dynamics, Genetic Algorithm, Ray Tracing 3D
          </p>
          <p className="mt-1">
            Xem hướng dẫn tại: <code className="bg-gray-100 px-2 py-1 rounded">/python-simulations/README.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
