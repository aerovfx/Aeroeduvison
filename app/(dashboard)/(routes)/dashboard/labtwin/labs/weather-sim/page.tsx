'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, Gauge, Eye, ArrowLeft, Activity, Loader2, Settings, TrendingUp, Info, Trophy, CheckCircle, Play, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  visibility: number;
}

interface ForecastData {
  hour: number;
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

export default function WeatherSimPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [historicalData, setHistoricalData] = useState<WeatherData[]>([]);
  
  // Lab completion tracking
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Simulation parameters
  const [baseTemp, setBaseTemp] = useState(25); // °C
  const [baseHumidity, setBaseHumidity] = useState(60); // %
  const [basePressure, setBasePressure] = useState(1013); // hPa
  const [season, setSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('summer');
  const [timeOfDay, setTimeOfDay] = useState(12); // hour (0-23)
  
  // Track initial values
  const initialValues = useRef({
    baseTemp: 25,
    baseHumidity: 60,
    basePressure: 1013,
    season: 'summer' as 'spring' | 'summer' | 'autumn' | 'winter',
    timeOfDay: 12
  });
  
  // Lab configuration
  const config = {
    name: "weather-sim",
    title: "Theo dõi thời tiết",
    description: "Mô phỏng và phân tích các yếu tố khí tượng",
    category: "Khí tượng",
    level: "Dễ",
    duration: "25 phút",
    xp: 120,
    port: 8027
  };

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Interaction detection
  useEffect(() => {
    if (!isMounted) return;
    
    const hasChanged = 
      baseTemp !== initialValues.current.baseTemp ||
      baseHumidity !== initialValues.current.baseHumidity ||
      basePressure !== initialValues.current.basePressure ||
      season !== initialValues.current.season ||
      timeOfDay !== initialValues.current.timeOfDay;
    
    if (hasChanged && !hasInteracted) {
      setHasInteracted(true);
    }
  }, [baseTemp, baseHumidity, basePressure, season, timeOfDay, isMounted, hasInteracted]);

  // Generate weather data based on parameters
  const generateWeatherData = (): WeatherData => {
    // Season adjustments
    const seasonTempOffset = {
      spring: 0,
      summer: 5,
      autumn: -5,
      winter: -15
    };
    
    // Time of day temperature variation (diurnal cycle)
    const timeVariation = 5 * Math.sin((timeOfDay - 6) * Math.PI / 12);
    
    // Calculate temperature
    const temperature = baseTemp + seasonTempOffset[season] + timeVariation + (Math.random() - 0.5) * 2;
    
    // Calculate humidity (inverse relation with temperature)
    const humidity = Math.max(20, Math.min(100, baseHumidity - (temperature - baseTemp) * 2 + (Math.random() - 0.5) * 10));
    
    // Calculate pressure
    const pressure = basePressure + (Math.random() - 0.5) * 5;
    
    // Wind speed (higher in winter, during pressure changes)
    const windSpeed = Math.abs(basePressure - 1013) / 5 + (season === 'winter' ? 5 : 0) + Math.random() * 5;
    
    // Wind direction (random)
    const windDirection = Math.random() * 360;
    
    // Precipitation (higher humidity = more likely)
    const precipitation = humidity > 80 ? Math.random() * 10 : 0;
    
    // Cloud cover (related to humidity and precipitation)
    const cloudCover = Math.min(100, humidity * 0.8 + precipitation * 5);
    
    // Visibility (affected by precipitation and cloud cover)
    const visibility = Math.max(1, 10 - (precipitation * 0.5) - (cloudCover * 0.03));
    
    return {
      timestamp: new Date().toLocaleTimeString(),
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
      pressure: parseFloat(pressure.toFixed(1)),
      windSpeed: parseFloat(windSpeed.toFixed(1)),
      windDirection: parseFloat(windDirection.toFixed(0)),
      precipitation: parseFloat(precipitation.toFixed(1)),
      cloudCover: parseFloat(cloudCover.toFixed(1)),
      visibility: parseFloat(visibility.toFixed(1))
    };
  };

  // Generate 24-hour forecast
  const generateForecast = (): ForecastData[] => {
    const forecast: ForecastData[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const timeVariation = 5 * Math.sin((hour - 6) * Math.PI / 12);
      const temp = baseTemp + timeVariation;
      const humidity = Math.max(30, Math.min(90, baseHumidity - timeVariation * 2));
      const windSpeed = 5 + Math.random() * 10;
      
      let condition = 'Nắng';
      if (humidity > 80) condition = 'Mưa';
      else if (humidity > 60) condition = 'Nhiều mây';
      else if (humidity > 40) condition = 'Ít mây';
      
      forecast.push({
        hour,
        temp: parseFloat(temp.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(1)),
        windSpeed: parseFloat(windSpeed.toFixed(1)),
        condition
      });
    }
    
    return forecast;
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      // Generate current weather
      const weather = generateWeatherData();
      setCurrentWeather(weather);
      
      // Generate forecast
      const forecastData = generateForecast();
      setForecast(forecastData);
      
      // Generate historical data (last 24 hours)
      const historical: WeatherData[] = [];
      for (let i = 23; i >= 0; i--) {
        historical.push(generateWeatherData());
      }
      setHistoricalData(historical);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Simulation error:', error);
    }
    setLoading(false);
  };

  const resetSimulation = () => {
    setBaseTemp(initialValues.current.baseTemp);
    setBaseHumidity(initialValues.current.baseHumidity);
    setBasePressure(initialValues.current.basePressure);
    setSeason(initialValues.current.season);
    setTimeOfDay(initialValues.current.timeOfDay);
    setCurrentWeather(null);
    setForecast([]);
    setHistoricalData([]);
    setHasInteracted(false);
  };

  const completeLab = async () => {
    if (!hasInteracted || isCompleted) return;
    
    setIsCompleting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsCompleted(true);
      
      toast({
        title: "🎉 Hoàn thành thí nghiệm!",
        description: `Chúc mừng! Bạn đã nhận được +${config.xp} XP`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error completing lab:', error);
      toast({
        title: "❌ Lỗi",
        description: "Không thể hoàn thành thí nghiệm. Vui lòng thử lại.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Get weather condition icon
  const getWeatherIcon = () => {
    if (!currentWeather) return <Cloud className="h-16 w-16 text-gray-400" />;
    
    if (currentWeather.precipitation > 5) return <CloudRain className="h-16 w-16 text-blue-500" />;
    if (currentWeather.cloudCover > 70) return <Cloud className="h-16 w-16 text-gray-500" />;
    return <Sun className="h-16 w-16 text-yellow-500" />;
  };

  // Get wind direction text
  const getWindDirection = (degrees: number): string => {
    const directions = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  // Loading state
  if (!isMounted) {
    return (

      <VisionThemeWrapper title="Weather Sim" subtitle="Hệ thống học tập thông minh">
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button
        onClick={() => router.push('/dashboard/labtwin/labs')}
        variant="outline"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Quay lại danh sách
      </Button>
      
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Cloud className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">{config.title}</h1>
        
              </div>
        <p className="text-lg text-muted-foreground">
          {config.description}
        </p>
        
        {/* Tags */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant="secondary" className="px-3 py-1">
            {config.category}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.level}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            {config.duration}
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            +{config.xp} XP
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-blue-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="flex items-center space-x-2 text-blue-900">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Điều chỉnh tham số</span>
              </CardTitle>
              <CardDescription>
                Thiết lập điều kiện thời tiết
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Season Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <Label className="text-sm font-bold mb-2 block text-green-900">
                    Mùa
                  </Label>
                  <Select value={season} onValueChange={(value: any) => setSeason(value)}>
                    <SelectTrigger className="bg-white border-green-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spring">Mùa xuân</SelectItem>
                      <SelectItem value="summer">Mùa hè</SelectItem>
                      <SelectItem value="autumn">Mùa thu</SelectItem>
                      <SelectItem value="winter">Mùa đông</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="bg-amber-50 p-4 rounded-lg border-2 border-amber-200">
                  <Label className="text-sm font-bold mb-2 block text-amber-900">
                    Giờ trong ngày
                  </Label>
                  <Select value={timeOfDay.toString()} onValueChange={(value) => setTimeOfDay(parseInt(value))}>
                    <SelectTrigger className="bg-white border-amber-300 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 24}, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i}:00 {i < 12 ? 'SA' : 'CH'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Temperature Slider */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-xl border-2 border-red-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-red-900 flex items-center gap-2">
                    <Thermometer className="h-4 w-4" />
                    Nhiệt độ cơ sở
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-red-300 shadow-md">
                    <span className="text-2xl font-bold text-red-600">{baseTemp}°C</span>
                  </div>
                </div>
                <Slider
                  value={[baseTemp]}
                  onValueChange={([value]) => setBaseTemp(value)}
                  min={-10}
                  max={45}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-2 px-1">
                  <span className="font-medium">-10°</span>
                  <span className="font-medium">10°</span>
                  <span className="font-medium">25°</span>
                  <span className="font-medium">35°</span>
                  <span className="font-medium">45°</span>
                </div>
              </div>
              
              {/* Humidity Slider */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border-2 border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-blue-900 flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    Độ ẩm cơ sở
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-blue-300 shadow-md">
                    <span className="text-2xl font-bold text-blue-600">{baseHumidity}%</span>
                  </div>
                </div>
                <Slider
                  value={[baseHumidity]}
                  onValueChange={([value]) => setBaseHumidity(value)}
                  min={20}
                  max={100}
                  step={5}
                  className="mt-2 h-3 cursor-pointer"
                />
              </div>
              
              {/* Pressure Slider */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border-2 border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-purple-900 flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Áp suất khí quyển
                  </Label>
                  <div className="bg-white px-5 py-2 rounded-lg border-2 border-purple-300 shadow-md">
                    <span className="text-2xl font-bold text-purple-600">{basePressure} hPa</span>
                  </div>
                </div>
                <Slider
                  value={[basePressure]}
                  onValueChange={([value]) => setBasePressure(value)}
                  min={980}
                  max={1040}
                  step={1}
                  className="mt-2 h-3 cursor-pointer"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex space-x-2">
                  <Button 
                    onClick={runSimulation}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    size="lg"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                    <span>{loading ? 'Đang mô phỏng...' : 'Chạy mô phỏng'}</span>
                  </Button>
                  
                  <Button 
                    onClick={resetSimulation}
                    variant="outline"
                    className="border-2"
                    size="lg"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    <span>{t('common.reset')}</span>
                  </Button>
                </div>
                
                {/* Complete Lab Button */}
                <Button 
                  onClick={completeLab}
                  disabled={!hasInteracted || isCompleted || isCompleting}
                  className={`w-full ${
                    isCompleted 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                  }`}
                  size="lg"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>✅ Đã hoàn thành</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="h-5 w-5 mr-2" />
                      <span>Hoàn thành thí nghiệm (+{config.xp} XP)</span>
                    </>
                  )}
                </Button>
                
                {!hasInteracted && !isCompleted && (
                  <p className="text-xs text-center text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    💡 Thay đổi thông số thí nghiệm để kích hoạt nút hoàn thành
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Current Weather Display */}
          {currentWeather && (
            <Card className="border-2 border-indigo-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="flex items-center space-x-2 text-indigo-900">
                  <Activity className="h-5 w-5 text-indigo-600" />
                  <span>Thời tiết hiện tại</span>
                </CardTitle>
                <CardDescription>
                  Cập nhật: {currentWeather.timestamp}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center mb-6">
                  {getWeatherIcon()}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-red-700 mb-2">
                      <Thermometer className="h-4 w-4" />
                      <span className="text-sm font-semibold">Nhiệt độ</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">{currentWeather.temperature}°C</div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Droplets className="h-4 w-4" />
                      <span className="text-sm font-semibold">Độ ẩm</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{currentWeather.humidity}%</div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-700 mb-2">
                      <Gauge className="h-4 w-4" />
                      <span className="text-sm font-semibold">Áp suất</span>
                    </div>
                    <div className="text-xl font-bold text-purple-900">{currentWeather.pressure} hPa</div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 mb-2">
                      <Wind className="h-4 w-4" />
                      <span className="text-sm font-semibold">Gió</span>
                    </div>
                    <div className="text-xl font-bold text-green-900">{currentWeather.windSpeed} km/h</div>
                    <div className="text-xs text-green-700">{getWindDirection(currentWeather.windDirection)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <div className="text-xs text-blue-700 mb-1">Mây che phủ</div>
                    <div className="text-lg font-bold text-blue-900">{currentWeather.cloudCover}%</div>
                  </div>
                  
                  <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200 text-center">
                    <div className="text-xs text-cyan-700 mb-1">Lượng mưa</div>
                    <div className="text-lg font-bold text-cyan-900">{currentWeather.precipitation} mm</div>
                  </div>
                  
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-700 mb-1 flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3" />
                      Tầm nhìn
                    </div>
                    <div className="text-lg font-bold text-slate-900">{currentWeather.visibility} km</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Charts */}
          {historicalData.length > 0 && (
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Biểu đồ thời tiết
                </CardTitle>
                <CardDescription>
                  Dữ liệu 24 giờ qua
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="temperature" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="temperature">Nhiệt độ</TabsTrigger>
                    <TabsTrigger value="humidity">Độ ẩm</TabsTrigger>
                    <TabsTrigger value="wind">Gió</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="temperature">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={historicalData}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis label={{ value: 'Nhiệt độ (°C)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="temperature" stroke="#EF4444" fillOpacity={1} fill="url(#colorTemp)" name="Nhiệt độ" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="humidity">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis label={{ value: 'Độ ẩm (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="humidity" stroke="#3B82F6" strokeWidth={3} name="Độ ẩm" />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="wind">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis label={{ value: 'Tốc độ gió (km/h)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="windSpeed" stroke="#22C55E" strokeWidth={3} name="Tốc độ gió" />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          {/* 24h Forecast */}
          {forecast.length > 0 && (
            <Card className="border-2 border-teal-200 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
                <CardTitle className="flex items-center space-x-2 text-teal-900">
                  <Info className="h-5 w-5 text-teal-600" />
                  <span>Dự báo 24h</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {forecast.filter((_, i) => i % 3 === 0).map((item) => (
                    <div key={item.hour} className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-blue-900">{item.hour}:00</div>
                          <div className="text-xs text-blue-700">{item.condition}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-red-600">{item.temp}°C</div>
                          <div className="text-xs text-blue-600">{item.humidity}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Info Card */}
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50">
              <CardTitle className="flex items-center space-x-2 text-slate-900">
                <Info className="h-5 w-5 text-slate-600" />
                <span>Hướng dẫn</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ul className="text-sm space-y-2 list-disc list-inside text-gray-600">
                <li>Chọn mùa và giờ trong ngày</li>
                <li>Điều chỉnh nhiệt độ cơ sở (-10 đến 45°C)</li>
                <li>Thay đổi độ ẩm (20-100%)</li>
                <li>Điều chỉnh áp suất (980-1040 hPa)</li>
                <li>Nhấn &quot;Chạy mô phỏng&quot; để xem kết quả</li>
                <li>Quan sát:</li>
                <ul className="ml-6 mt-1 space-y-1">
                  <li>Nhiệt độ thay đổi theo mùa và giờ</li>
                  <li>Độ ẩm cao → Mưa</li>
                  <li>Áp suất thấp → Gió mạnh</li>
                  <li>Mây che phủ ảnh hưởng tầm nhìn</li>
                </ul>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}
