"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SpecialActivities } from "@/components/special-activities";
import { Trophy, Target, Clock, BookOpen, Zap, User, Star, Flame, Gift } from "lucide-react";
import { useXP } from "@/contexts/XPContext";
import Link from "next/link";

// Disable static generation
export const dynamic = 'force-dynamic'

export default function StudentDashboard() {
  const { data: session } = useSession();
  const { xpData, isLoading } = useXP();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loading = !mounted || isLoading;

  const recentProgress = [
    {
      course: "Toán học cơ bản",
      chapter: "Giá trị lượng giác",
      progress: 25,
      completed: 5,
      total: 20,
      lastAccessed: "2 giờ trước"
    },
    {
      course: "Hóa học",
      chapter: "Bảng tuần hoàn",
      progress: 60,
      completed: 9,
      total: 15,
      lastAccessed: "1 ngày trước"
    },
    {
      course: "Vật lý",
      chapter: "Điện tích và điện trường",
      progress: 10,
      completed: 1,
      total: 15,
      lastAccessed: "3 ngày trước"
    }
  ];

  const achievements = [
    {
      title: "Người học chăm chỉ",
      description: "Học liên tục 3 ngày",
      icon: Clock,
      color: "bg-blue-500",
      unlocked: true,
      xp: 20
    },
    {
      title: "Nhà toán học",
      description: "Hoàn thành 5 bài toán",
      icon: Target,
      color: "bg-green-500",
      unlocked: true,
      xp: 30
    },
    {
      title: "Thám hiểm khoa học",
      description: "Mở khóa 3 môn học",
      icon: BookOpen,
      color: "bg-purple-500",
      unlocked: false,
      xp: 50
    },
    {
      title: "Lập trình viên",
      description: "Hoàn thành khóa Python",
      icon: Zap,
      color: "bg-orange-500",
      unlocked: false,
      xp: 100
    }
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // User info
  const user = session?.user;
  const userName = user?.name || "Học viên";
  const userEmail = user?.email || "";
  
  // Calculate level from XP
  const level = Math.floor(xpData.totalXP / 100) + 1;
  const currentLevelXP = xpData.totalXP % 100;
  const xpToNextLevel = 100 - currentLevelXP;

  return (
    <div className="p-6 space-y-8">
      {/* User Welcome Card */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
              {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Xin chào, {userName}!</h2>
              <p className="text-white/80">{userEmail}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 hover:bg-white/30">
                  Cấp độ {level}
                </Badge>
                <Badge className="bg-white/20 hover:bg-white/30">
                  🔥 {xpData.streak} ngày streak
                </Badge>
              </div>
            </div>
            <Link href="/dashboard/profile">
              <Button variant="secondary" className="gap-2">
                <User className="w-4 h-4" />
                Xem hồ sơ
              </Button>
            </Link>
          </div>
          
          {/* Level Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cấp độ {level}</span>
              <span>{currentLevelXP}/100 XP</span>
            </div>
            <Progress value={currentLevelXP} className="h-2 bg-white/20" />
            <p className="text-xs text-white/70">
              Còn {xpToNextLevel} XP nữa để lên cấp {level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng XP</CardTitle>
            <Trophy className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{xpData.totalXP}</div>
            <p className="text-xs text-muted-foreground">
              Cấp độ {level}
            </p>
            <div className="mt-2">
              <Progress value={currentLevelXP} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gem</CardTitle>
            <Gift className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{xpData.gems}</div>
            <p className="text-xs text-muted-foreground">
              Đổi phần thưởng
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Thành tích</CardTitle>
            <Star className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{xpData.achievements.length}</div>
            <p className="text-xs text-muted-foreground">
              Đã mở khóa
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chuỗi học</CardTitle>
            <Flame className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{xpData.streak}</div>
            <p className="text-xs text-muted-foreground">
              Ngày liên tục
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Special Activities */}
      <SpecialActivities />

      {/* Recent Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Tiến độ gần đây</h3>
        
        <div className="space-y-4">
          {recentProgress.map((item, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{item.course}</CardTitle>
                    <CardDescription>{item.chapter}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.lastAccessed}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Tiến độ</span>
                    <span>{item.completed}/{item.total} bài học</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                  <div className="text-xs text-gray-500">
                    {item.progress}% hoàn thành
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Real Achievements from XP Context */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Thành tích đã mở khóa</h3>
          <Badge variant="outline" className="text-sm">
            {xpData.achievements.length} / {achievements.length + xpData.achievements.length}
          </Badge>
        </div>
        
        {xpData.achievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {xpData.achievements.map((achievement, index) => (
              <Card 
                key={achievement.id} 
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 hover:shadow-lg transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {achievement.name}
                        <Badge className="bg-green-100 text-green-800">
                          ✅ Đã đạt
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {achievement.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-green-600 font-medium">
                    +{achievement.xpReward} XP đã nhận
                  </div>
                  {achievement.unlockedAt && (
                    <div className="text-xs text-gray-500">
                      {new Date(achievement.unlockedAt).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Chưa có thành tích nào</p>
              <p className="text-sm text-gray-500 mt-1">
                Hoàn thành bài học đầu tiên để mở khóa thành tích!
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Mock achievements (locked) */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Thành tích có thể đạt được</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement, index) => {
              const IconComponent = achievement.icon;
              
              return (
                <Card 
                  key={index} 
                  className="opacity-60 hover:opacity-80 transition-opacity"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${achievement.color} text-white`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {achievement.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {achievement.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500">
                      🔒 Chưa mở khóa • +{achievement.xp} XP
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

