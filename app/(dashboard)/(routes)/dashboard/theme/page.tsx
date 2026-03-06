'use client';

"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Palette,
  Sparkles,
  Heart,
  Star,
  Sun,
  Moon,
  Rainbow,
  Flower,
  TreePine,
  Waves,
  Mountain,
  Zap,
  Crown,
  Gem,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ThemePage() {
  const { t } = useLanguage();
  
  const [selectedTheme, setSelectedTheme] = useState('rainbow');

  // Theme definitions for kids
  const themes = [
    {
      id: 'rainbow',
      name: 'Cầu Vồng',
      emoji: '🌈',
      description: 'Màu sắc rực rỡ như cầu vồng',
      colors: {
        navbar: 'from-red-400 to-pink-400',
        toolbar: 'from-orange-400 to-yellow-400',
        header: 'from-green-400 to-blue-400',
        paper: 'from-purple-400 to-pink-400',
        background: 'from-indigo-400 to-purple-400',
        footer: 'from-pink-400 to-red-400'
      }
    },
    {
      id: 'ocean',
      name: 'Đại Dương',
      emoji: '🌊',
      description: 'Xanh dương mát mẻ như biển cả',
      colors: {
        navbar: 'from-blue-500 to-cyan-500',
        toolbar: 'from-cyan-500 to-teal-500',
        header: 'from-teal-500 to-blue-600',
        paper: 'from-blue-600 to-indigo-600',
        background: 'from-indigo-600 to-purple-600',
        footer: 'from-purple-600 to-blue-700'
      }
    },
    {
      id: 'sunset',
      name: 'Hoàng Hôn',
      emoji: '🌅',
      description: 'Màu cam ấm áp như hoàng hôn',
      colors: {
        navbar: 'from-orange-400 to-red-400',
        toolbar: 'from-red-400 to-pink-400',
        header: 'from-pink-400 to-purple-400',
        paper: 'from-purple-400 to-indigo-400',
        background: 'from-indigo-400 to-blue-400',
        footer: 'from-blue-400 to-teal-400'
      }
    },
    {
      id: 'forest',
      name: 'Rừng Xanh',
      emoji: '🌲',
      description: 'Xanh lá tươi mát như rừng',
      colors: {
        navbar: 'from-green-500 to-emerald-500',
        toolbar: 'from-emerald-500 to-teal-500',
        header: 'from-teal-500 to-cyan-500',
        paper: 'from-cyan-500 to-blue-500',
        background: 'from-blue-500 to-indigo-500',
        footer: 'from-indigo-500 to-purple-500'
      }
    },
    {
      id: 'lavender',
      name: 'Hoa Oải Hương',
      emoji: '💜',
      description: 'Tím nhẹ nhàng như hoa oải hương',
      colors: {
        navbar: 'from-purple-400 to-violet-400',
        toolbar: 'from-violet-400 to-purple-500',
        header: 'from-purple-500 to-indigo-500',
        paper: 'from-indigo-500 to-blue-500',
        background: 'from-blue-500 to-cyan-500',
        footer: 'from-cyan-500 to-teal-500'
      }
    },
    {
      id: 'cotton-candy',
      name: 'Kẹo Bông',
      emoji: '🍭',
      description: 'Hồng ngọt ngào như kẹo bông',
      colors: {
        navbar: 'from-pink-400 to-rose-400',
        toolbar: 'from-rose-400 to-pink-500',
        header: 'from-pink-500 to-purple-500',
        paper: 'from-purple-500 to-indigo-500',
        background: 'from-indigo-500 to-blue-500',
        footer: 'from-blue-500 to-cyan-500'
      }
    },
    {
      id: 'golden',
      name: 'Vàng Rực',
      emoji: '✨',
      description: 'Vàng lấp lánh như ánh nắng',
      colors: {
        navbar: 'from-yellow-400 to-orange-400',
        toolbar: 'from-orange-400 to-red-400',
        header: 'from-red-400 to-pink-400',
        paper: 'from-pink-400 to-purple-400',
        background: 'from-purple-400 to-indigo-400',
        footer: 'from-indigo-400 to-blue-400'
      }
    },
    {
      id: 'mint',
      name: 'Bạc Hà',
      emoji: '🌿',
      description: 'Xanh bạc hà tươi mát',
      colors: {
        navbar: 'from-emerald-400 to-teal-400',
        toolbar: 'from-teal-400 to-cyan-400',
        header: 'from-cyan-400 to-blue-400',
        paper: 'from-blue-400 to-indigo-400',
        background: 'from-indigo-400 to-purple-400',
        footer: 'from-purple-400 to-pink-400'
      }
    },
    {
      id: 'cherry',
      name: 'Anh Đào',
      emoji: '🌸',
      description: 'Hồng nhạt như hoa anh đào',
      colors: {
        navbar: 'from-rose-300 to-pink-300',
        toolbar: 'from-pink-300 to-purple-300',
        header: 'from-purple-300 to-indigo-300',
        paper: 'from-indigo-300 to-blue-300',
        background: 'from-blue-300 to-cyan-300',
        footer: 'from-cyan-300 to-teal-300'
      }
    }
  ];

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    toast.success(`Đã chọn theme ${themes.find(t => t.id === themeId)?.name}! 🎨`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="text-4xl">🎨
              </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chọn Giao Diện Yêu Thích
          </h1>
          <div className="text-4xl">✨</div>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Chọn một trong những mẫu giao diện đẹp mắt dưới đây để làm cho việc học tập của bạn trở nên thú vị hơn!
        </p>
      </div>

      {/* Theme Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        {themes.map((theme) => (
          <Card 
            key={theme.id} 
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${
              selectedTheme === theme.id ? 'ring-4 ring-blue-500 shadow-2xl' : ''
            }`}
            onClick={() => handleThemeSelect(theme.id)}
          >
            {/* Theme Preview */}
            <div className="p-4 space-y-2">
              {/* Navbar */}
              <div className={`h-3 bg-gradient-to-r ${theme.colors.navbar} rounded-t-lg`}></div>
              
              {/* Toolbar */}
              <div className={`h-2 bg-gradient-to-r ${theme.colors.toolbar} rounded`}></div>
              
              {/* Main Content Area */}
              <div className="grid grid-cols-3 gap-1">
                {/* Header */}
                <div className={`h-8 bg-gradient-to-r ${theme.colors.header} rounded col-span-3`}></div>
                
                {/* Paper */}
                <div className={`h-6 bg-gradient-to-r ${theme.colors.paper} rounded col-span-2`}></div>
                
                {/* Background */}
                <div className={`h-6 bg-gradient-to-r ${theme.colors.background} rounded`}></div>
                
                {/* Footer */}
                <div className={`h-4 bg-gradient-to-r ${theme.colors.footer} rounded col-span-3`}></div>
              </div>
            </div>

            {/* Theme Info */}
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{theme.emoji}</span>
                  <h3 className="font-bold text-lg">{theme.name}</h3>
                </div>
                {selectedTheme === theme.id && (
                  <Badge className="bg-green-500 text-white">
                    <Check className="h-3 w-3 mr-1" />
                    Đã chọn
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{theme.description}</p>
            </CardContent>

            {/* Selection Overlay */}
            {selectedTheme === theme.id && (
              <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                <div className="bg-white rounded-full p-3 shadow-lg">
                  <Check className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Apply Button */}
      <div className="text-center mt-8">
        <Button 
          size="lg" 
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg"
          onClick={() => toast.success('Theme đã được áp dụng! 🎉')}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Áp Dụng Theme
        </Button>
      </div>

      {/* Theme Description */}
      <div className="max-w-4xl mx-auto mt-12">
        <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                🌟 Tại sao nên chọn theme phù hợp?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="text-center">
                  <div className="text-4xl mb-2">👀</div>
                  <h4 className="font-semibold text-blue-700 mb-2">Dễ nhìn</h4>
                  <p className="text-sm text-gray-600">Màu sắc phù hợp giúp mắt không bị mỏi khi học tập</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">😊</div>
                  <h4 className="font-semibold text-purple-700 mb-2">Vui vẻ</h4>
                  <p className="text-sm text-gray-600">Giao diện đẹp mắt tạo cảm giác thích thú khi học</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">🎯</div>
                  <h4 className="font-semibold text-green-700 mb-2">Tập trung</h4>
                  <p className="text-sm text-gray-600">Theme phù hợp giúp tập trung tốt hơn vào bài học</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
