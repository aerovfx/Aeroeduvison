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
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [localWeather, setLocalWeather] = useState<any>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
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

  // Get user's location and weather
  const getUserLocationWeather = async () => {
    setLoadingLocation(true);
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lon: longitude });
            
            // Fetch weather for user's location
            try {
              const response = await fetch(`http://localhost:8013/weather/current?lat=${latitude}&lon=${longitude}`, {
                signal: AbortSignal.timeout(3000) // 3 second timeout
              });
              if (response.ok) {
                const data = await response.json();
                setLocalWeather(data);
              }
            } catch (error) {
              // Silently fail if weather service is not available
              // This is optional feature, app should work without it
              console.log('Weather service unavailable (optional feature)');
            }
            setLoadingLocation(false);
          },
          (error) => {
            console.error('Error getting location:', error);
            setLoadingLocation(false);
          }
        );
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      setLoadingLocation(false);
    }
  };

  // Generate weather-based suggestions
  const getWeatherSuggestions = (weather: any) => {
    if (!weather) return [];
    
    const suggestions: { icon: string; text: string; type: string }[] = [];
    const temp = weather.temperature?.current || 0;
    const rain = weather.rain?.['1h'] || 0;
    const wind = weather.wind?.speed || 0;
    const humidity = weather.humidity || 0;
    
    // Temperature suggestions
    if (temp < 15) {
      suggestions.push({ icon: '🧥', text: 'Mặc áo ấm, trời se lạnh!', type: 'warning' });
    } else if (temp > 32) {
      suggestions.push({ icon: '🥵', text: 'Trời nóng! Uống nhiều nước!', type: 'danger' });
    } else if (temp >= 20 && temp <= 28) {
      suggestions.push({ icon: '😊', text: 'Thời tiết tuyệt vời!', type: 'success' });
    }
    
    // Rain suggestions
    if (rain > 0.5) {
      suggestions.push({ icon: '☔', text: 'Mang dù đi! Sắp có mưa!', type: 'warning' });
    }
    if (rain > 5) {
      suggestions.push({ icon: '⛈️', text: 'Mưa lớn! Hạn chế ra ngoài!', type: 'danger' });
    }
    
    // Wind suggestions
    if (wind > 10) {
      suggestions.push({ icon: '💨', text: 'Gió mạnh! Cẩn thận khi di chuyển!', type: 'warning' });
    }
    
    // Humidity suggestions
    if (humidity > 80) {
      suggestions.push({ icon: '💧', text: 'Độ ẩm cao, cảm giác oi bức', type: 'info' });
    } else if (humidity < 30) {
      suggestions.push({ icon: '🌵', text: 'Không khí khô, dưỡng ẩm da', type: 'info' });
    }
    
    // Activity suggestions
    if (temp >= 18 && temp <= 28 && rain === 0 && wind < 8) {
      suggestions.push({ icon: '🏃', text: 'Thời tiết hoàn hảo cho hoạt động ngoài trời!', type: 'success' });
    }
    
    return suggestions;
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'danger': return 'from-red-500 to-orange-500';
      case 'warning': return 'from-yellow-500 to-orange-500';
      case 'success': return 'from-green-500 to-emerald-500';
      case 'info': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const quickStats = {
    totalExperiments: (pythonLabs.total || 7) + 1, // +1 for Weather module
    completed: 0,
    totalXP: 1000, // 850 + 150 (Weather)
    earnedXP: 0
  };

  // Group Python simulations by category
  const categorizedSims = pythonLabs.simulations.reduce((acc: any, sim: any) => {
    const category = sim.category || 'Other';
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

  const categoryColors: { [key: string]: string } = {
    'Cơ học': 'from-pink-100 to-pink-200',
    'Quang học': 'from-yellow-100 to-yellow-200',
    'Điện từ': 'from-blue-100 to-blue-200',
    'Sóng': 'from-cyan-100 to-cyan-200',
    'Nhiệt học': 'from-orange-100 to-orange-200',
    'Thị giác máy tính': 'from-teal-100 to-teal-200',
    'Computer Vision': 'from-emerald-100 to-emerald-200',
    'Procedural Generation': 'from-indigo-100 to-indigo-200',
    'Machine Learning': 'from-purple-100 to-purple-200'
  };

  const weatherModule = {
    name: 'Thời tiết',
    emoji: '🌤️',
    description: 'Bản đồ thời tiết thế giới với Windy, cảnh báo động đất & sóng thần real-time',
    features: [
      '🌬️ Wind flow animation',
      '🌊 Earthquake & Tsunami alerts',
      '🗺️ Interactive world map',
      '🤖 AI weather predictions'
    ],
    xp: 150,
    link: '/dashboard/weather'
  };

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

          {/* Weather Module - Featured */}
          <Card className="mb-8 bg-gradient-to-br from-sky-100 via-blue-100 to-cyan-100 border-2 border-sky-300 overflow-hidden relative group hover:shadow-2xl transition-all duration-500">
            <div className="absolute top-0 right-0 text-9xl opacity-10">🌍</div>
            <div className="absolute bottom-0 left-0 text-7xl opacity-10">⚡</div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-4xl font-bold text-sky-900 flex items-center gap-3 mb-2">
                    <span className="text-6xl animate-bounce">{weatherModule.emoji}</span>
                    {weatherModule.name}
                  </CardTitle>
                  <CardDescription className="text-lg text-sky-700">
                    {weatherModule.description}
                  </CardDescription>
                </div>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 text-lg px-4 py-2">
                  <Star className="h-5 w-5 mr-2" />
                  +{weatherModule.xp} XP
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              {/* User Location Weather */}
              {!localWeather && !loadingLocation && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-200/50 to-pink-200/50 backdrop-blur rounded-xl border-2 border-purple-300">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">📍</div>
                      <div>
                        <h4 className="font-bold text-purple-900">Xem thời tiết tại vị trí của bạn</h4>
                        <p className="text-sm text-purple-700">Nhận cảnh báo và gợi ý cá nhân hóa</p>
                      </div>
                    </div>
                    <Button 
                      onClick={getUserLocationWeather}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                    >
                      📍 Lấy vị trí của tôi
                    </Button>
                  </div>
                </div>
              )}

              {loadingLocation && (
                <div className="mb-6 p-6 bg-white/70 backdrop-blur rounded-xl border-2 border-sky-300 text-center">
                  <div className="animate-spin text-5xl mb-3">🌍</div>
                  <p className="text-sky-700 font-medium">Đang xác định vị trí của bạn...</p>
                </div>
              )}

              {localWeather && (
                <div className="mb-6 space-y-4">
                  {/* Current Weather at User Location */}
                  <div className="p-5 bg-gradient-to-br from-white/90 to-sky-50/90 backdrop-blur rounded-2xl border-2 border-sky-400 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-sky-900 flex items-center gap-2 mb-1">
                          📍 Thời tiết tại vị trí của bạn
                        </h3>
                        <p className="text-sky-700">{localWeather.city || 'Vị trí hiện tại'}</p>
                      </div>
                      <Button
                        onClick={getUserLocationWeather}
                        variant="outline"
                        size="sm"
                        className="border-sky-400"
                      >
                        🔄 Cập nhật
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">🌡️</div>
                        <div className="text-3xl font-bold text-orange-700">
                          {localWeather.temperature?.current?.toFixed(0)}°C
                        </div>
                        <div className="text-xs text-orange-600">Nhiệt độ</div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">💨</div>
                        <div className="text-3xl font-bold text-blue-700">
                          {localWeather.wind?.speed?.toFixed(1)}
                        </div>
                        <div className="text-xs text-blue-600">m/s</div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-100 to-teal-100 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">💧</div>
                        <div className="text-3xl font-bold text-cyan-700">
                          {localWeather.humidity}%
                        </div>
                        <div className="text-xs text-cyan-600">Độ ẩm</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl p-4 text-center">
                        <div className="text-3xl mb-1">☁️</div>
                        <div className="text-3xl font-bold text-purple-700">
                          {localWeather.clouds}%
                        </div>
                        <div className="text-xs text-purple-600">Mây</div>
                      </div>
                    </div>

                    <div className="p-3 bg-sky-50 rounded-lg text-center">
                      <p className="text-sm text-sky-900 capitalize font-medium">
                        {localWeather.weather?.description}
                      </p>
                    </div>
                  </div>

                  {/* Weather Suggestions */}
                  {getWeatherSuggestions(localWeather).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-sky-900 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                        Gợi ý & Cảnh báo cho bạn:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getWeatherSuggestions(localWeather).map((suggestion, idx) => (
                          <div 
                            key={idx}
                            className={`p-4 bg-gradient-to-r ${getSuggestionColor(suggestion.type)} text-white rounded-xl shadow-md flex items-center gap-3 animate-pulse`}
                          >
                            <div className="text-3xl">{suggestion.icon}</div>
                            <p className="font-semibold">{suggestion.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardContent className="relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Features */}
                <div className="lg:col-span-2 space-y-3">
                  <h3 className="font-bold text-sky-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Tính năng đặc biệt:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {weatherModule.features.map((feature, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/70 backdrop-blur rounded-xl p-4 border-2 border-sky-200 hover:border-sky-400 transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="font-semibold text-sky-900">
                          {feature}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col justify-center items-center bg-white/50 backdrop-blur rounded-2xl p-6 border-2 border-sky-300">
                  <div className="text-6xl mb-4 transform group-hover:scale-125 transition-transform">
                    🗺️
                  </div>
                  <h4 className="font-bold text-xl text-sky-900 mb-2 text-center">
                    Khám phá ngay!
                  </h4>
                  <p className="text-sm text-sky-700 text-center mb-4">
                    Xem thời tiết toàn cầu & cảnh báo thiên tai
                  </p>
                  <Link href={weatherModule.link} className="w-full">
                    <Button 
                      size="lg" 
                      className="w-full bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-500 hover:from-sky-600 hover:via-blue-600 hover:to-cyan-600 text-white shadow-xl transform hover:scale-105 transition-all"
                    >
                      Mở Weather Map
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  
                  <div className="mt-4 flex items-center gap-2 text-xs text-sky-600">
                    <Info className="h-4 w-4" />
                    <span>Powered by Windy.com & USGS</span>
                  </div>
                </div>
              </div>

              {/* Tech Stack */}
              <div className="mt-6 p-4 bg-gradient-to-r from-sky-200/50 to-cyan-200/50 backdrop-blur rounded-xl border border-sky-300">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="text-sm font-medium text-sky-900">🛠️ Tech Stack:</div>
                  {['OpenWeatherMap API', 'USGS Earthquakes', 'Windy.com', 'AI Predictions'].map((tech, idx) => (
                    <Badge key={idx} className="bg-white/80 text-sky-700 border border-sky-300">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Python Simulations - All Categories */}
          <Card className="mb-8 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 border-2 border-indigo-300 overflow-hidden relative">
            <div className="absolute top-0 right-0 text-9xl opacity-10">🐍</div>
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold text-indigo-900 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-yellow-500" />
                    Python Simulations & Labs
                  </CardTitle>
                  <CardDescription className="text-lg mt-2 text-indigo-700">
                    {pythonLabs.total} thí nghiệm được code bằng Python thật! Mỗi danh mục có nhiều labs cool! 🎨
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Cards */}
                {Object.entries(categorizedSims).map(([category, sims]: [string, any]) => {
                  const emoji = categoryIcons[category] || '🔬';
                  const colorGradient = categoryColors[category] || 'from-gray-100 to-gray-200';
                  const simCount = sims.length;
                  const totalXP = sims.reduce((sum: number, sim: any) => sum + (sim.xp || 0), 0);
                  
                  return (
                    <Card 
                      key={category}
                      className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${colorGradient} border-2 border-gray-200 overflow-hidden relative`}
                    >
                      {/* Decorative circles */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/30 rounded-full -mr-10 -mt-10"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/30 rounded-full -ml-8 -mb-8"></div>
                      
                      <CardContent className="p-5 relative z-10">
                        <div className="text-center mb-4">
                          <div className="text-6xl mb-3 transform group-hover:scale-125 transition-transform">
                            {emoji}
                          </div>
                          <h3 className="font-bold text-xl text-gray-900 mb-2">{category}</h3>
                          <div className="flex items-center justify-center gap-2">
                            <Badge className="bg-white/80 text-gray-700 border border-gray-300">
                              {simCount} labs
                            </Badge>
                            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0">
                              <Star className="h-3 w-3 mr-1" />
                              {totalXP} XP
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Preview of first 2 labs */}
                        <div className="space-y-2 mb-4">
                          {sims.slice(0, 2).map((sim: any) => (
                            <div 
                              key={sim.id}
                              className="text-xs bg-white/60 backdrop-blur rounded-lg p-2 border border-white/50"
                            >
                              <div className="font-semibold text-gray-900 line-clamp-1">
                                {sim.name}
                              </div>
                              <div className="text-gray-600 flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {sim.duration}
                                </span>
                                <span>•</span>
                                <span>+{sim.xp} XP</span>
                              </div>
                            </div>
                          ))}
                          {simCount > 2 && (
                            <div className="text-xs text-center text-gray-600 font-medium">
                              +{simCount - 2} thí nghiệm nữa
                            </div>
                          )}
                        </div>

                        <Link href={`/dashboard/labtwin/labs?category=${encodeURIComponent(category)}`}>
                          <Button 
                            size="sm" 
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md"
                          >
                            Khám phá {category}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Quick access to all labs */}
              <div className="mt-6 p-4 bg-white/50 backdrop-blur rounded-xl border-2 border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🎯</div>
                    <div>
                      <h4 className="font-bold text-indigo-900">Tất cả Python Simulations</h4>
                      <p className="text-sm text-indigo-700">
                        Xem danh sách đầy đủ {pythonLabs.total} thí nghiệm Python
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/labtwin/labs">
                    <Button className="bg-white text-indigo-600 hover:bg-indigo-50 border-2 border-indigo-300">
                      Xem tất cả
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

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

