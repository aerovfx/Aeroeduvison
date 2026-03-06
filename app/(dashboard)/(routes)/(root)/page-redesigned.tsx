"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, FlaskConical, Trophy, TrendingUp, Star, Zap, 
  Target, Award, Sparkles, ArrowRight, Brain, Rocket, 
  Heart, MessageCircle, Users, Calendar, Clock
} from "lucide-react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("Bạn");

  // Mock data - Replace with real data
  const stats = {
    xp: 1250,
    nextLevel: 2000,
    streak: 5,
    completed: 12,
    rank: "#156"
  };

  const quickActions = [
    {
      id: "labtwin",
      title: "🧪 Virtual Labs",
      desc: "Thí nghiệm vật lý siêu cool",
      color: "from-purple-400 to-pink-400",
      href: "/dashboard/labtwin",
      icon: FlaskConical,
      new: true
    },
    {
      id: "courses",
      title: "📚 Khóa học",
      desc: "Học theo lộ trình",
      color: "from-blue-400 to-cyan-400",
      href: "/dashboard/courses",
      icon: BookOpen
    },
    {
      id: "quiz",
      title: "🎯 Quiz",
      desc: "Ôn tập & kiểm tra",
      color: "from-green-400 to-emerald-400",
      href: "/dashboard/quiz",
      icon: Target
    },
    {
      id: "ai-tutor",
      title: "🤖 AI Tutor",
      desc: "Trợ giảng AI thông minh",
      color: "from-orange-400 to-red-400",
      href: "/dashboard/chat",
      icon: Brain
    }
  ];

  const recentActivities = [
    { emoji: "🧪", title: "Hoàn thành thí nghiệm", desc: "Khúc xạ ánh sáng", time: "2 giờ trước", xp: 80 },
    { emoji: "📝", title: "Làm bài quiz", desc: "Cơ học lớp 10", time: "1 ngày trước", xp: 50 },
    { emoji: "🎓", title: "Học bài mới", desc: "Điện trường", time: "2 ngày trước", xp: 100 }
  ];

  const achievements = [
    { emoji: "🔥", title: "Streak 5 ngày!", desc: "Giữ vững phong độ!", progress: 100 },
    { emoji: "⚡", title: "Tốc độ học", desc: "8/10 bài trong tuần", progress: 80 },
    { emoji: "🎯", title: "Độ chính xác", desc: "Quiz 95% đúng", progress: 95 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Welcome Banner */}
        <Card className="mb-8 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white border-0 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 text-9xl opacity-10">🎓</div>
          <CardContent className="p-8 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Chào {userName}! 👋
                </h1>
                <p className="text-xl text-white/90 mb-4">
                  Sẵn sàng cho một ngày học tập tuyệt vời chưa? 🚀
                </p>
                <div className="flex items-center gap-4">
                  <Badge className="bg-white/20 text-white border-0 text-base py-2 px-4">
                    <Star className="h-4 w-4 mr-2 fill-white" />
                    {stats.xp} XP
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 text-base py-2 px-4">
                    <Zap className="h-4 w-4 mr-2" />
                    {stats.streak} ngày streak
                  </Badge>
                  <Badge className="bg-white/20 text-white border-0 text-base py-2 px-4">
                    <Trophy className="h-4 w-4 mr-2" />
                    {stats.rank}
                  </Badge>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-8xl">🎉</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* XP Progress */}
        <Card className="mb-8 bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600" />
                <span className="font-bold text-amber-900">Tiến độ Level</span>
              </div>
              <span className="text-sm font-medium text-amber-700">
                {stats.xp}/{stats.nextLevel} XP
              </span>
            </div>
            <div className="h-4 bg-amber-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-full"
                style={{ width: `${(stats.xp / stats.nextLevel) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-amber-700 mt-2">
              Còn {stats.nextLevel - stats.xp} XP nữa là lên level! 💪
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Rocket className="h-6 w-6 text-purple-500" />
            Bắt đầu học ngay! 🎯
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.id} href={action.href}>
                  <Card className="group hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-gray-200 hover:border-purple-300 overflow-hidden relative cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/30 to-transparent rounded-full -mr-16 -mt-16"></div>
                    {action.new && (
                      <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 z-10">
                        NEW
                      </Badge>
                    )}
                    <CardContent className="p-6 relative z-10">
                      <div className={`w-16 h-16 bg-gradient-to-r ${action.color} rounded-2xl flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform shadow-lg`}>
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {action.desc}
                      </p>
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                      >
                        Bắt đầu
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Clock className="h-6 w-6 text-blue-600" />
                  Hoạt động gần đây
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((activity, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-white rounded-xl border-2 border-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{activity.emoji}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900">{activity.title}</h4>
                        <p className="text-sm text-gray-600">{activity.desc}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-500">{activity.time}</span>
                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 text-xs">
                            +{activity.xp} XP
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Achievements */}
          <div>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Award className="h-6 w-6 text-purple-600" />
                  Thành tích
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {achievements.map((ach, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{ach.emoji}</span>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{ach.title}</h4>
                          <p className="text-xs text-gray-600">{ach.desc}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-purple-700">{ach.progress}%</span>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                        style={{ width: `${ach.progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">📚</div>
              <div className="text-2xl font-bold text-pink-700">{stats.completed}</div>
              <div className="text-sm text-pink-600">Bài đã học</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">⏰</div>
              <div className="text-2xl font-bold text-green-700">2.5h</div>
              <div className="text-sm text-green-600">Học tuần này</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">🎯</div>
              <div className="text-2xl font-bold text-blue-700">87%</div>
              <div className="text-sm text-blue-600">Độ chính xác</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 text-center">
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-2xl font-bold text-purple-700">8</div>
              <div className="text-sm text-purple-600">Huy chương</div>
            </CardContent>
          </Card>
        </div>

        {/* Motivational CTA */}
        <Card className="mt-8 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">💪✨</div>
            <h2 className="text-3xl font-bold mb-3">Hãy tiếp tục phát huy nhé!</h2>
            <p className="text-xl mb-6 text-white/90">
              Bạn đang làm rất tốt! Mỗi ngày học một chút là tiến xa hơn một bước! 🚀
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard/labtwin">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold">
                  <FlaskConical className="mr-2 h-6 w-6" />
                  Thí nghiệm mới
                </Button>
              </Link>
              <Link href="/dashboard/quiz">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/20 px-8 py-6 text-lg font-bold">
                  <Target className="mr-2 h-6 w-6" />
                  Làm Quiz
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}



