"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award,
  Clock,
  Target,
  Zap,
  Star
} from "lucide-react";
import { AnimatedCounter } from "./animated-counter";

interface QuickStatsProps {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalXP: number;
  streak: number;
  achievements: number;
}

export const QuickStats = ({
  totalCourses,
  completedCourses,
  inProgressCourses,
  totalXP,
  streak,
  achievements
}: QuickStatsProps) => {
  const stats = [
    {
      label: "📚 Tổng khóa học",
      value: totalCourses,
      icon: BookOpen,
      color: "text-pink-600",
      bgColor: "bg-gradient-to-br from-pink-50 to-rose-50",
      borderColor: "border-pink-200",
      gradient: "from-pink-500 to-rose-500"
    },
    {
      label: "🏆 Đã hoàn thành",
      value: completedCourses,
      icon: Award,
      color: "text-orange-600",
      bgColor: "bg-gradient-to-br from-orange-50 to-yellow-50",
      borderColor: "border-orange-200",
      gradient: "from-orange-500 to-yellow-500"
    },
    {
      label: "⏰ Đang học",
      value: inProgressCourses,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-gradient-to-br from-purple-50 to-pink-50",
      borderColor: "border-purple-200",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      label: "⭐ Tổng XP",
      value: totalXP.toLocaleString(),
      icon: Star,
      color: "text-rose-600",
      bgColor: "bg-gradient-to-br from-rose-50 to-pink-50",
      borderColor: "border-rose-200",
      gradient: "from-rose-500 to-pink-500"
    },
    {
      label: "📈 Chuỗi ngày",
      value: `${streak} ngày`,
      icon: Target,
      color: "text-yellow-600",
      bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50",
      borderColor: "border-yellow-200",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      label: "🎯 Thành tích",
      value: achievements,
      icon: Zap,
      color: "text-pink-600",
      bgColor: "bg-gradient-to-br from-pink-50 to-purple-50",
      borderColor: "border-pink-200",
      gradient: "from-pink-500 to-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index} 
            className={`${stat.bgColor} ${stat.borderColor} border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group transform hover:scale-105 active:scale-95`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                    {typeof stat.value === 'number' ? (
                      <AnimatedCounter value={stat.value} />
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
