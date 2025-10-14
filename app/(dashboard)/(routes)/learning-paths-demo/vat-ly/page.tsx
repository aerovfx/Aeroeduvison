"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, BookOpen, CheckCircle, Clock, PlayCircle, Star, Target } from "lucide-react";

// Disable static generation
export const dynamic = 'force-dynamic'

export default function VatLyLearningPathPage() {
  const learningPath = {
    id: "vat-ly",
    title: "Vật lý",
    description: "Hiểu các định luật vật lý và ứng dụng thực tế",
    icon: Zap,
    color: "bg-purple-500",
    progress: 10,
    completed: 2,
    total: 18,
    level: "Lớp 10-12",
    duration: "14 tuần",
    difficulty: "Trung bình"
  };

  const chapters = [
    {
      id: "vat-ly-10-1",
      title: "Chuyển động cơ học",
      description: "Vị trí, quãng đường, vận tốc và gia tốc",
      level: "Lớp 10",
      duration: "45 phút",
      isCompleted: true,
      isLocked: false,
      xp: 50
    },
    {
      id: "vat-ly-10-2", 
      title: "Chuyển động thẳng đều",
      description: "Phương trình chuyển động và đồ thị vận tốc",
      level: "Lớp 10",
      duration: "60 phút",
      isCompleted: true,
      isLocked: false,
      xp: 60
    },
    {
      id: "vat-ly-10-3",
      title: "Chuyển động thẳng biến đổi đều",
      description: "Gia tốc không đổi và các công thức tính toán",
      level: "Lớp 10", 
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "vat-ly-10-4",
      title: "Sự rơi tự do",
      description: "Chuyển động của vật rơi dưới tác dụng của trọng lực",
      level: "Lớp 10",
      duration: "55 phút", 
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "vat-ly-10-5",
      title: "Chuyển động tròn đều",
      description: "Tốc độ góc, chu kỳ và tần số",
      level: "Lớp 10",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "vat-ly-11-1",
      title: "Động lực học chất điểm",
      description: "Các định luật Newton và lực ma sát",
      level: "Lớp 11",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "vat-ly-11-2",
      title: "Công và công suất",
      description: "Khái niệm công, công suất và hiệu suất",
      level: "Lớp 11",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "vat-ly-11-3",
      title: "Động năng và thế năng",
      description: "Năng lượng cơ học và định luật bảo toàn",
      level: "Lớp 11",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "vat-ly-11-4",
      title: "Động lượng",
      description: "Khái niệm động lượng và định luật bảo toàn",
      level: "Lớp 11",
      duration: "55 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "vat-ly-12-1",
      title: "Dao động điều hòa",
      description: "Con lắc lò xo và con lắc đơn",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "vat-ly-12-2",
      title: "Sóng cơ học",
      description: "Sóng dọc, sóng ngang và giao thoa sóng",
      level: "Lớp 12",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "vat-ly-12-3",
      title: "Điện trường",
      description: "Khái niệm điện trường và cường độ điện trường",
      level: "Lớp 12",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "vat-ly-12-4",
      title: "Dòng điện không đổi",
      description: "Định luật Ohm và mạch điện",
      level: "Lớp 12",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "vat-ly-12-5",
      title: "Từ trường",
      description: "Khái niệm từ trường và lực từ",
      level: "Lớp 12",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "vat-ly-12-6",
      title: "Cảm ứng điện từ",
      description: "Hiện tượng cảm ứng và định luật Faraday",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    }
  ];

  const achievements = [
    {
      id: "vat-ly-basics",
      title: "Vật lý cơ bản",
      description: "Hoàn thành 5 bài học đầu tiên",
      isUnlocked: false,
      xp: 100
    },
    {
      id: "vat-ly-intermediate", 
      title: "Vật lý trung cấp",
      description: "Hoàn thành 10 bài học",
      isUnlocked: false,
      xp: 200
    },
    {
      id: "vat-ly-advanced",
      title: "Vật lý nâng cao", 
      description: "Hoàn thành tất cả bài học",
      isUnlocked: false,
      xp: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning-paths-demo" className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại lộ trình học tập
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-purple-500 rounded-xl text-white">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{learningPath.title}</h1>
              <p className="text-gray-600 mt-1">{learningPath.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">{learningPath.level}</Badge>
                <Badge variant="outline">{learningPath.duration}</Badge>
                <Badge variant="outline">{learningPath.difficulty}</Badge>
              </div>
            </div>
          </div>

          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">Tiến độ học tập</span>
                </div>
                <span className="text-sm text-gray-600">
                  {learningPath.completed}/{learningPath.total} bài học
                </span>
              </div>
              <Progress value={learningPath.progress} className="h-3 mb-2" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{learningPath.progress}% hoàn thành</span>
                <span>{learningPath.total - learningPath.completed} bài còn lại</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Nội dung học tập
                </CardTitle>
                <CardDescription>
                  Học từ cơ bản đến nâng cao theo chương trình lớp 10-12
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {chapters.map((chapter, index) => {
                    const Icon = chapter.isCompleted ? CheckCircle : 
                                chapter.isLocked ? Clock : PlayCircle;
                    const iconColor = chapter.isCompleted ? "text-green-600" : 
                                     chapter.isLocked ? "text-gray-400" : "text-purple-600";
                    
                    return (
                      <div
                        key={chapter.id}
                        className={`p-4 border-l-4 ${
                          chapter.isCompleted ? "border-green-500 bg-green-50" :
                          chapter.isLocked ? "border-gray-300 bg-gray-50" :
                          "border-purple-500 bg-purple-50"
                        } hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Icon className={`h-6 w-6 ${iconColor}`} />
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {index + 1}. {chapter.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {chapter.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {chapter.level}
                                </Badge>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {chapter.duration}
                                </span>
                                <span className="text-xs text-yellow-600 flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  +{chapter.xp} XP
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {chapter.isCompleted && (
                              <Badge className="bg-green-100 text-green-800">
                                Hoàn thành
                              </Badge>
                            )}
                            {!chapter.isLocked && !chapter.isCompleted && (
                              <Link href={`/learning-paths-demo/vat-ly/learn/${chapter.id}`}>
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                                  Bắt đầu
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  Thành tích
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-3 rounded-lg border-2 ${
                      achievement.isUnlocked 
                        ? "border-yellow-300 bg-yellow-50" 
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{achievement.title}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {achievement.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-yellow-600 font-medium">
                          +{achievement.xp} XP
                        </div>
                        {achievement.isUnlocked && (
                          <CheckCircle className="h-4 w-4 text-green-600 mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thống kê nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng XP kiếm được:</span>
                  <span className="font-semibold text-purple-600">110 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian học:</span>
                  <span className="font-semibold">1.75 giờ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-semibold text-purple-600">10%</span>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sẵn sàng bắt đầu?</h3>
                <p className="text-sm mb-4 opacity-90">
                  Đăng nhập để truy cập đầy đủ nội dung và theo dõi tiến độ
                </p>
                <Button className="bg-white text-purple-600 hover:bg-gray-100 w-full">
                  Đăng nhập ngay
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
