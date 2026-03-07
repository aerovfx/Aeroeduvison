"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  TrendingUp, 
  Calendar,
  Clock,
  Target,
  ArrowRight
} from "lucide-react";

interface WelcomeSectionProps {
  userName: string;
  userRole: string;
  lastLogin?: string;
  currentStreak?: number;
  nextGoal?: string;
}

export const WelcomeSection = ({
  userName,
  userRole,
  lastLogin,
  currentStreak = 0,
  nextGoal
}: WelcomeSectionProps) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Chào buổi sáng";
    if (hour < 18) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case "STUDENT":
        return {
          text: "Học viên",
          color: "bg-gradient-to-r from-blue-500 to-cyan-500",
          icon: "🎓"
        };
      case "TEACHER":
        return {
          text: "Giảng viên",
          color: "bg-gradient-to-r from-purple-500 to-pink-500",
          icon: "👨‍🏫"
        };
      case "ADMIN":
        return {
          text: "Quản trị viên",
          color: "bg-gradient-to-r from-orange-500 to-red-500",
          icon: "👑"
        };
      default:
        return {
          text: "Người dùng",
          color: "bg-gradient-to-r from-gray-500 to-gray-600",
          icon: "👤"
        };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <Card className="bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 border-2 border-pink-200 overflow-hidden relative shadow-xl">
      {/* Decorative background - Student style */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-300/20 to-rose-300/20 rounded-full -mr-32 -mt-32 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-300/20 to-yellow-300/20 rounded-full -ml-24 -mb-24 animate-bounce"></div>
      <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-gradient-to-br from-purple-300/15 to-pink-300/15 rounded-full animate-pulse"></div>
      
      <CardContent className="relative z-10 p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Welcome Message */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent">
                {getGreeting()}, {userName}! 👋
              </h1>
              <Badge className={`${roleBadge.color} text-white border-0 shadow-lg animate-pulse`}>
                <span className="mr-1">{roleBadge.icon}</span>
                {roleBadge.text}
              </Badge>
            </div>
            
            <p className="text-lg text-gray-600 max-w-2xl">
              Chào mừng bạn quay trở lại! Hãy tiếp tục hành trình học tập của bạn và khám phá những điều mới mẻ.
            </p>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {lastLogin && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Đăng nhập lần cuối: {lastLogin}</span>
                </div>
              )}
              {currentStreak > 0 && (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span>Chuỗi học tập: {currentStreak} ngày</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Student style */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 hover:from-pink-600 hover:via-rose-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95">
              <Sparkles className="h-4 w-4 mr-2" />
              📚 Bắt đầu học
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            {nextGoal && (
              <Button variant="outline" className="border-2 border-pink-200 hover:border-pink-300 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-300 transform hover:scale-105 active:scale-95">
                <TrendingUp className="h-4 w-4 mr-2" />
                🎯 Mục tiêu tiếp theo
              </Button>
            )}
          </div>
        </div>

        {/* Progress Indicator - Student style */}
        {currentStreak > 0 && (
          <div className="mt-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-pink-200 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">📈 Tiến độ hôm nay</span>
              <span className="text-sm text-pink-600 font-medium">Chuỗi {currentStreak} ngày</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2 font-medium">
              {currentStreak < 30 ? `🎯 Còn ${30 - currentStreak} ngày để đạt mục tiêu 30 ngày!` : "🎉 Chúc mừng! Bạn đã đạt mục tiêu 30 ngày!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
