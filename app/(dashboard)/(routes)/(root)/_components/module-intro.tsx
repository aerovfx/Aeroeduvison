"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  FlaskConical, 
  Map, 
  Trophy, 
  BookOpen,
  Users,
  TrendingUp,
  Star,
  Clock,
  Target
} from "lucide-react";

interface ModuleIntroProps {
  totalModules: number;
  totalUsers: number;
  averageRating: number;
  completionRate: number;
}

export const ModuleIntro = ({
  totalModules,
  totalUsers,
  averageRating,
  completionRate
}: ModuleIntroProps) => {
  const introStats = [
    {
      label: "Tổng module",
      value: totalModules,
      icon: Sparkles,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Các công cụ học tập"
    },
    {
      label: "Người dùng",
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Đang sử dụng"
    },
    {
      label: "Đánh giá TB",
      value: `${averageRating}/5`,
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "Từ người dùng"
    },
    {
      label: "Tỷ lệ hoàn thành",
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Khóa học"
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200 overflow-hidden relative">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-400/10 to-orange-400/10 rounded-full -ml-24 -mb-24"></div>
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Hệ thống Module Học Tập
            </CardTitle>
            <p className="text-gray-600 mt-1">
              Khám phá các công cụ học tập thông minh và hiện đại
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10">
        {/* Introduction Text */}
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed mb-4">
            Chào mừng bạn đến với hệ thống module học tập toàn diện! Chúng tôi cung cấp các công cụ 
            học tập thông minh, từ AI Content Generator đến Virtual Labs, giúp bạn học tập hiệu quả hơn.
          </p>
          
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
              <Target className="h-3 w-3 mr-1" />
              Cá nhân hóa
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <Clock className="h-3 w-3 mr-1" />
              Tiết kiệm thời gian
            </Badge>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <TrendingUp className="h-3 w-3 mr-1" />
              Hiệu quả cao
            </Badge>
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <Star className="h-3 w-3 mr-1" />
              Đánh giá tốt
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {introStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index}
                className={`${stat.bgColor} rounded-xl p-4 border border-white/50 hover:shadow-md transition-all duration-300 hover:-translate-y-1`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor} border border-white/50`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Module Categories */}
        <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
          <h3 className="font-semibold text-gray-900 mb-3">Danh mục Module</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
              <span className="text-gray-700">AI & Machine Learning</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"></div>
              <span className="text-gray-700">Khoa học & Thí nghiệm</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              <span className="text-gray-700">Học tập & Phát triển</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};











