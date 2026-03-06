'use client';

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft,
  Gift,
  Star,
  Trophy,
  Zap,
  Crown,
  Gem,
  Sparkles,
  CheckCircle
} from "lucide-react";

export default function KhoBauPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [selectedTreasure, setSelectedTreasure] = useState<number | null>(null);
  const [openedTreasures, setOpenedTreasures] = useState<number[]>([]);

  const treasures = [
    {
      id: 1,
      title: "Kho báu Kiến thức",
      description: "Chứa đựng những kiến thức quý giá về toán học",
      reward: "✈️ +50 XP",
      icon: "✈️",
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Kho báu Thành tích",
      description: "Ghi nhận những thành tích học tập xuất sắc",
      reward: "🏆 +100 XP",
      icon: "🏆",
      color: "bg-yellow-500"
    },
    {
      id: 3,
      title: "Kho báu Trí tuệ",
      description: "Mở ra những bí mật của toán học cao cấp",
      reward: "💎 +75 XP",
      icon: "💎",
      color: "bg-purple-500"
    },
    {
      id: 4,
      title: "Kho báu Ma thuật",
      description: "Chứa những công thức toán học kỳ diệu",
      reward: "✨ +125 XP",
      icon: "✨",
      color: "bg-pink-500"
    },
    {
      id: 5,
      title: "Kho báu Hoàng gia",
      description: "Kho báu dành cho những học sinh xuất sắc nhất",
      reward: "👑 +200 XP",
      icon: "👑",
      color: "bg-red-500"
    }
  ];

  const handleOpenTreasure = (treasureId: number) => {
    setSelectedTreasure(treasureId);
    if (!openedTreasures.includes(treasureId)) {
      setOpenedTreasures([...openedTreasures, treasureId]);
    }
  };

  const handleBack = () => {
    router.push("/dashboard/learning");
  };

  const getRewardAmount = (treasureId: number) => {
    const treasure = treasures.find(t => t.id === treasureId);
    return treasure?.reward.match(/\d+/)?.[0] || "0";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Kho báu</h1>
                <p className="text-gray-600">Khám phá những phần thưởng đặc biệt</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">+0 XP</Badge>
              <Badge className="bg-yellow-100 text-yellow-700">Kho báu</Badge>
            </div>
          </div>
        </div>
      
              </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <Card className="mb-8 text-center bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300">
          <CardHeader>
            <div className="text-6xl mb-4">🏴‍☠️</div>
            <CardTitle className="text-3xl text-yellow-800">Chào mừng đến Kho báu!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-yellow-700 mb-4">
              Chúc mừng bạn đã hoàn thành các bài học! Hãy chọn một kho báu để nhận phần thưởng đặc biệt.
            </p>
            <div className="flex items-center justify-center gap-2 text-yellow-600">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">Mỗi kho báu chỉ có thể mở một lần</span>
              <Sparkles className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Treasures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {treasures.map((treasure) => (
            <Card 
              key={treasure.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
                openedTreasures.includes(treasure.id) 
                  ? 'ring-2 ring-green-400 bg-green-50' 
                  : 'hover:shadow-lg'
              }`}
            >
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full ${treasure.color} flex items-center justify-center mx-auto mb-4 text-2xl`}>
                  {openedTreasures.includes(treasure.id) ? "🎁" : treasure.icon}
                </div>
                <CardTitle className="text-xl">{treasure.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 mb-4">{treasure.description}</p>
                
                {openedTreasures.includes(treasure.id) ? (
                  <div className="bg-green-100 p-4 rounded-lg border border-green-300">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Đã mở!</span>
                    </div>
                    <p className="text-green-700 font-semibold">{treasure.reward}</p>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleOpenTreasure(treasure.id)}
                    className={`w-full ${treasure.color} hover:opacity-90 text-white`}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Mở kho báu
                  </Button>
                )}
              </CardContent>
              
              {openedTreasures.includes(treasure.id) && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Đã mở
                  </Badge>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Reward Summary */}
        {openedTreasures.length > 0 && (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Star className="h-6 w-6 text-yellow-500" />
                <h3 className="text-xl font-semibold text-green-800">Tổng kết phần thưởng</h3>
                <Star className="h-6 w-6 text-yellow-500" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {openedTreasures.length}
                  </div>
                  <div className="text-sm text-gray-600">Kho báu đã mở</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {openedTreasures.reduce((total, id) => total + parseInt(getRewardAmount(id)), 0)}
                  </div>
                  <div className="text-sm text-gray-600">XP nhận được</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((openedTreasures.length / treasures.length) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Tiến độ</div>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  onClick={() => {
                    router.push("/dashboard/learning?completed=6");
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Hoàn thành (+0 XP)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Mẹo khám phá kho báu</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Hoàn thành các bài học để mở khóa kho báu</li>
                  <li>• Mỗi kho báu chỉ có thể mở một lần</li>
                  <li>• Kho báu càng hiếm, phần thưởng càng lớn</li>
                  <li>• Tiếp tục học để khám phá thêm nhiều kho báu mới</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
