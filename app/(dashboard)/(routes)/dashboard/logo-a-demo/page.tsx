'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import { useState } from "react";
import { Sparkles, Palette, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';

export default function LogoADemoPage() {
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


    <VisionThemeWrapper title="Logo A Demo" subtitle="Hệ thống học tập thông minh">
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              AeroEdu Logo A - Demo
            </h1>
          
              </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Logo chữ &quot;A&quot; với phong cách Gradient Minimalism đã được cập nhật trên toàn hệ thống
          </p>
        </div>

        {/* Main Logo Display */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="flex items-center justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-2xl relative mr-6 shadow-2xl overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[24px] border-l-transparent border-r-transparent border-b-white drop-shadow-lg"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-2 bg-white rounded-sm drop-shadow-lg"></div>
                  </div>
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
                <span>Logo A Compact</span>
              </CardTitle>
              <CardDescription>Phiên bản nhỏ gọn cho mobile</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-4 p-6 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-xl relative shadow-lg overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[14px] border-l-transparent border-r-transparent border-b-white drop-shadow-sm"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-1 bg-white rounded-sm drop-shadow-sm"></div>
                  </div>
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
                <span>Logo A Minimal</span>
              </CardTitle>
              <CardDescription>Phiên bản tối giản cho favicon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-3 p-6 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-lg relative shadow-lg overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[10px] border-l-transparent border-r-transparent border-b-white drop-shadow-sm"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-1 bg-white rounded-sm drop-shadow-sm"></div>
                  </div>
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
              <CardDescription>Chỉ biểu tượng chữ A cho app icon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 via-teal-400 to-green-400 bg-[length:300%_300%] animate-gradient-x rounded-2xl relative shadow-xl overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[18px] border-l-transparent border-r-transparent border-b-white drop-shadow-lg"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-1 bg-white rounded-sm drop-shadow-lg"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Implementation Status */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <Check className="w-6 h-6 text-green-600" />
              <span>Trạng thái triển khai</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-gray-800">✅ Đã cập nhật</h4>
                <ul className="space-y-2 text-gray-700">
                  <li>• <strong>Dashboard Layout</strong>: Header chính</li>
                  <li>• <strong>Sidebar Simple</strong>: Navigation sidebar</li>
                  <li>• <strong>Trang chính</strong>: Landing page</li>
                  <li>• <strong>Logo Design Page</strong>: Trang thiết kế logo</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-gray-800">🎨 Đặc điểm logo mới</h4>
                <div className="space-y-2 text-gray-700">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-red-500"></div>
                    <span><strong>Chữ &quot;A&quot;</strong>: Tạo bằng CSS triangles</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-teal-400 to-teal-500"></div>
                    <span><strong>Gradient</strong>: 4 màu chuyển động</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-blue-500"></div>
                    <span><strong>Animation</strong>: 4s gradient shift</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-green-500"></div>
                    <span><strong>Responsive</strong>: Tự động điều chỉnh</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/60 rounded-lg p-6 border-l-4 border-green-500">
              <h4 className="font-semibold text-lg mb-3 text-gray-800">🚀 Kết quả</h4>
              <p className="text-gray-700 leading-relaxed">
                Logo chữ &quot;A&quot; đã được cập nhật thành công trên toàn bộ hệ thống AeroEdu. 
                Logo mới thể hiện triết lý <strong>&quot;Cá nhân hóa để bay cao&quot;</strong> với thiết kế 
                Gradient Minimalism hiện đại. Chữ &quot;A&quot; tượng trưng cho sự khởi đầu và dẫn đầu, 
                kết hợp với gradient animation tạo cảm giác năng động và chuyên nghiệp.
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
                <h4 className="font-semibold mb-2">CSS Implementation</h4>
                <p className="text-sm text-gray-600">Border triangles cho chữ A</p>
                <p className="text-sm text-gray-600">Overflow hidden cho clean edges</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Animation</h4>
                <p className="text-sm text-gray-600">4s gradient shift</p>
                <p className="text-sm text-gray-600">Smooth transitions</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Responsive</h4>
                <p className="text-sm text-gray-600">Auto-adjusting sizes</p>
                <p className="text-sm text-gray-600">Mobile optimized</p>
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
