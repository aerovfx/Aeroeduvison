'use client';

"use client"

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Cloud, MapPin, TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RealWorldMap } from "@/components/weather/real-world-map";
import { WindyStyleMap } from "@/components/weather/windy-style-map";
import { useLanguage } from '@/contexts/LanguageContext';

export default function WeatherPage() {
  const { t } = useLanguage();
  
  const API_ENDPOINT = "http://localhost:8013";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Link>
          
          <div className="flex items-start gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-400 via-cyan-400 to-sky-400 rounded-2xl text-white shadow-lg">
              <Cloud className="h-12 w-12" />
            
              </div>
            <div className="flex-1">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-600 bg-clip-text text-transparent mb-2">
                🌍 World Weather
              </h1>
              <p className="text-gray-600 text-xl mb-3">
                Thời tiết thực tế từ khắp nơi trên thế giới! 🌤️
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white border-0">
                  <MapPin className="h-3 w-3 mr-1" />
                  15+ thành phố
                </Badge>
                <Badge className="bg-gradient-to-r from-green-400 to-emerald-400 text-white border-0">
                  Real-time Data
                </Badge>
                <Badge className="bg-gradient-to-r from-purple-400 to-pink-400 text-white border-0">
                  OpenWeatherMap API
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="windy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80">
            <TabsTrigger value="windy">🌬️ Windy Map</TabsTrigger>
            <TabsTrigger value="map">🗺️ Basic Map</TabsTrigger>
            <TabsTrigger value="info">ℹ️ Thông tin</TabsTrigger>
          </TabsList>

          <TabsContent value="windy" className="space-y-6">
            <WindyStyleMap apiEndpoint={API_ENDPOINT} />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <RealWorldMap apiEndpoint={API_ENDPOINT} />
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Info className="h-6 w-6" />
                  Về Weather Module
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Nguồn dữ liệu</h3>
                  <p className="text-gray-700">
                    Sử dụng <a href="https://openweathermap.org" target="_blank" className="text-blue-600 hover:underline">OpenWeatherMap API</a> để lấy dữ liệu thời tiết thực tế từ khắp nơi trên thế giới.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Thành phố được theo dõi</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['🇻🇳 Hà Nội', '🇻🇳 TP.HCM', '🇻🇳 Đà Nẵng', '🇯🇵 Tokyo', '🇰🇷 Seoul', '🇨🇳 Beijing', '🇸🇬 Singapore', '🇹🇭 Bangkok', '🇬🇧 London', '🇫🇷 Paris', '🇺🇸 New York', '🇦🇺 Sydney'].map((city, idx) => (
                      <Badge key={idx} variant="outline" className="justify-start">
                        {city}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Hướng dẫn</h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Click vào các điểm trên bản đồ để xem chi tiết</li>
                    <li>Màu sắc thể hiện nhiệt độ (xanh lạnh → đỏ nóng)</li>
                    <li>Dữ liệu tự động cập nhật mỗi 10 phút</li>
                    <li>Click vào thẻ thành phố bên dưới để xem nhanh</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

