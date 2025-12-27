'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

"use client";

import { useState } from "react";
import { Sparkles, Palette, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';

export default function LogoDesignPage() {
  const { t } = useLanguage();
  
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (


    <VisionThemeWrapper title="Logo Design" subtitle="Hệ thống học tập thông minh">
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              AeroEdu Logo Design
            </h1>
          
              </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Thiết kế logo với phong cách Gradient Minimalism, thể hiện triết lý cá nhân hóa học tập
          </p>
        </div>

        {/* Main Logo Display */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <div className="logo-icon w-20 h-20 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-2xl relative mr-6 shadow-2xl">
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl text-white drop-shadow-lg">
                    ✈
                  </span>
                </div>
                <h2 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                  AeroEdu
                </h2>
              </div>
              <p className="text-xl text-gray-600 mb-8">Cá nhân hóa để bay cao</p>
              
              {/* Color Palette */}
              <div className="flex justify-center space-x-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-500 shadow-lg"></div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 shadow-lg"></div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 shadow-lg"></div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-500 shadow-lg"></div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={() => copyToClipboard('AeroEdu')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Đã copy!' : 'Copy tên'}
                </Button>
                <Button variant="outline" className="border-2">
                  <Download className="w-4 h-4 mr-2" />
                  Tải xuống
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Variations */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-blue-600" />
                <span>Logo Compact</span>
              </CardTitle>
              <CardDescription>Phiên bản nhỏ gọn cho mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="logo-icon w-12 h-12 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-xl relative shadow-lg">
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl text-white">
                    ✈
                  </span>
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                  AeroEdu
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-purple-600" />
                <span>Logo Minimal</span>
              </CardTitle>
              <CardDescription>Phiên bản tối giản cho favicon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-3 p-6 bg-gray-50 rounded-lg">
                <div className="logo-icon w-10 h-10 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-lg relative shadow-lg">
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg text-white">
                    ✈
                  </span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x bg-clip-text text-transparent">
                  AeroEdu
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-cyan-600" />
                <span>Icon Only</span>
              </CardTitle>
              <CardDescription>Chỉ biểu tượng cho app icon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                <div className="logo-icon w-16 h-16 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-2xl relative shadow-xl">
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl text-white drop-shadow-lg">
                    ✈
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Design Philosophy */}
        <Card className="bg-gradient-to-r from-red-50 via-teal-50 to-green-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <span>Triết lý thiết kế</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-gray-800">🎯 Khái niệm chính</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>Aero</strong>: Bay cao, tự do, không giới hạn</li>
                  <li>• <strong>Edu</strong>: Giáo dục, học tập cá nhân hóa</li>
                  <li>• <strong>Gradient</strong>: Đa dạng, linh hoạt</li>
                  <li>• <strong>Minimalism</strong>: Đơn giản, hiệu quả</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-gray-800">🌈 Ý nghĩa màu sắc</h4>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-red-500"></div>
                    <span><strong>Đỏ cam</strong>: Năng động, nhiệt huyết</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-teal-400 to-teal-500"></div>
                    <span><strong>Xanh mint</strong>: Sáng tạo, đổi mới</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                    <span><strong>Xanh dương</strong>: Tin cậy, chuyên nghiệp</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500"></div>
                    <span><strong>Xanh lá</strong>: Tăng trưởng, phát triển</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/60 rounded-lg p-6 border-l-4 border-blue-500">
              <h4 className="font-semibold text-lg mb-3 text-gray-800">💡 Thông điệp</h4>
              <p className="text-gray-700 leading-relaxed">
                Logo AeroEdu được thiết kế với phong cách <strong>Gradient Minimalism</strong>, 
                kết hợp biểu tượng máy bay ✈️ tượng trưng cho ước mơ bay cao và gradient 
                màu sắc nổi bật thể hiện sự đa dạng trong cá nhân hóa học tập. 
                Mỗi học sinh có con đường riêng, nhưng tất cả đều hướng tới mục tiêu bay cao trong tương lai.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Technical Specs */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-purple-600" />
              <span>Thông số kỹ thuật</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Typography</h4>
                <p className="text-sm text-gray-600">Segoe UI, 48px, Bold</p>
                <p className="text-sm text-gray-600">Gradient text effect</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Icon</h4>
                <p className="text-sm text-gray-600">80x80px, Rounded corners</p>
                <p className="text-sm text-gray-600">Gradient background</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Animation</h4>
                <p className="text-sm text-gray-600">4s gradient shift</p>
                <p className="text-sm text-gray-600">Smooth transitions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes gradient-x {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        
        .animate-gradient-x {
          animation: gradient-x 4s ease infinite;
        }
      `}</style>
    </div>
    </VisionThemeWrapper>
  );
}
