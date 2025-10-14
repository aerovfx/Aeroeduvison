"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FlaskConical, Star, Clock, ArrowRight, Sparkles, Target, Info, TrendingUp, Award, Zap } from "lucide-react";

export default function LabTwinPage() {
  const [pythonLabs, setPythonLabs] = useState<any>({ simulations: [], total: 0 });
  
  useEffect(() => {
    const loadPythonSimulations = async () => {
      try {
        const response = await fetch('/labs/index.json');
        if (response.ok) {
          const data = await response.json();
          setPythonLabs(data);
        }
      } catch (error) {
        console.error('Error loading Python simulations:', error);
      }
    };
    
    loadPythonSimulations();
  }, []);

  const quickStats = {
    totalExperiments: pythonLabs.total || 7,
    completed: 0,
    totalXP: 850,
    earnedXP: 0
  };

  const categories = [
    { id: 'physics', name: 'Cơ học', emoji: '⚡', color: 'from-pink-100 to-pink-200', count: 2 },
    { id: 'waves', name: 'Sóng', emoji: '🌊', color: 'from-blue-100 to-blue-200', count: 2 },
    { id: 'optics', name: 'Quang học', emoji: '💡', color: 'from-yellow-100 to-yellow-200', count: 1 },
    { id: 'cv', name: 'AI & Vision', emoji: '👁️', color: 'from-purple-100 to-purple-200', count: pythonLabs.total || 0 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-2xl text-white shadow-xl transform hover:scale-105 transition-transform">
              <FlaskConical className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                🧪 LabTwin
              </h1>
              <p className="text-gray-600 mt-1 text-xl">
                Phòng thí nghiệm ảo siêu cool! Khám phá khoa học như chơi game! 🚀
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-purple-700">{quickStats.totalExperiments}</div>
                <div className="text-sm text-purple-600">Thí nghiệm</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-green-700">{quickStats.completed}</div>
                <div className="text-sm text-green-600">Hoàn thành</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-2xl font-bold text-yellow-700">{quickStats.earnedXP}/{quickStats.totalXP}</div>
                <div className="text-sm text-yellow-600">XP Points</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-pink-700">0%</div>
                <div className="text-sm text-pink-600">Tiến độ</div>
              </CardContent>
            </Card>
          </div>

          {/* Featured: Python Simulations */}
          <Card className="mb-8 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 border-2 border-indigo-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 text-9xl opacity-10">🐍</div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-indigo-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-yellow-500" />
                    Python Simulations
                  </CardTitle>
                  <CardDescription className="text-lg mt-2 text-indigo-700">
                    {pythonLabs.total} mô phỏng vật lý được code bằng Python thật! 🎨
                  </CardDescription>
                </div>
                <Link href="/dashboard/labtwin/labs">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
                  >
                    Xem tất cả
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pythonLabs.simulations.slice(0, 6).map((sim: any) => (
                  <Card 
                    key={sim.id}
                    className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-indigo-200 bg-white/80 backdrop-blur"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-3xl">{getSimEmoji(sim.category)}</div>
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                          <Star className="h-3 w-3 mr-1" />
                          +{sim.xp}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{sim.name}</h3>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sim.description}</p>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">{sim.level}</Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {sim.duration}
                        </div>
                      </div>
                      <Link href={`/dashboard/labtwin/labs/${sim.id}`}>
                        <Button size="sm" className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white">
                          🚀 Bắt đầu
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="h-6 w-6 text-purple-500" />
              Danh mục thí nghiệm
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Card 
                  key={cat.id}
                  className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${cat.color} border-2 border-gray-200 cursor-pointer`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-5xl mb-3 transform group-hover:scale-125 transition-transform">
                      {cat.emoji}
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{cat.name}</h3>
                    <Badge variant="secondary" className="bg-white/80">
                      {cat.count} labs
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <Award className="h-6 w-6 text-amber-600" />
                  Thành tích của bạn
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: '🏆', title: 'Nhà khoa học mới', desc: 'Hoàn thành 3 thí nghiệm đầu', xp: 150, locked: true },
                  { icon: '⚡', title: 'Chuyên gia vật lý', desc: 'Hoàn thành tất cả thí nghiệm', xp: 500, locked: true },
                  { icon: '🌟', title: 'Bậc thầy Python', desc: 'Xem code của 5 simulations', xp: 200, locked: true }
                ].map((ach, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-xl flex items-center gap-3 ${ach.locked ? 'bg-white/50' : 'bg-white border-2 border-amber-300'}`}
                  >
                    <div className="text-3xl">{ach.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{ach.title}</h4>
                      <p className="text-xs text-gray-600">{ach.desc}</p>
                    </div>
                    <Badge className="bg-yellow-400 text-yellow-900">+{ach.xp}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                  Mục tiêu tuần này
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Hoàn thành 2 thí nghiệm</span>
                    <span className="text-sm text-blue-700">0/2</span>
                  </div>
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 w-0"></div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Kiếm 200 XP</span>
                    <span className="text-sm text-blue-700">0/200</span>
                  </div>
                  <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 w-0"></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white">
                    <Zap className="h-4 w-4 mr-2" />
                    Bắt đầu thí nghiệm ngay!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-0 shadow-2xl">
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🎓✨</div>
              <h2 className="text-3xl font-bold mb-3">Sẵn sàng khám phá khoa học?</h2>
              <p className="text-xl mb-6 text-white/90">
                Hơn {pythonLabs.total} thí nghiệm đang chờ bạn! Mỗi thí nghiệm là một cuộc phiêu lưu mới! 🚀
              </p>
              <Link href="/dashboard/labtwin/labs">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold shadow-xl">
                  <FlaskConical className="mr-2 h-6 w-6" />
                  Khám phá ngay!
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getSimEmoji(category: string): string {
  const emojiMap: { [key: string]: string } = {
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
  return emojiMap[category] || '🔬';
}


