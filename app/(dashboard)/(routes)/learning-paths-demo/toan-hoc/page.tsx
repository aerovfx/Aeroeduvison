'use client';

"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, BookOpen, CheckCircle, Clock, PlayCircle, Star, Target } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

export default function ToanHocLearningPathPage() {
  const { t } = useLanguage();
  
  const learningPath = {
    id: "toan-hoc",
    title: "Toán học cơ bản",
    description: "Học các khái niệm toán học cơ bản từ lớp 10-12",
    icon: Calculator,
    color: "bg-blue-500",
    progress: 25,
    completed: 5,
    total: 20,
    level: "Lớp 10-12",
    duration: "16 tuần",
    difficulty: "Cơ bản"
  };

  const chapters = [
    {
      id: "toan-hoc-10-1",
      title: "Tập hợp và mệnh đề",
      description: "Khái niệm tập hợp, mệnh đề và phủ định",
      level: "Lớp 10",
      duration: "45 phút",
      isCompleted: true,
      isLocked: false,
      xp: 50
    },
    {
      id: "toan-hoc-10-2", 
      title: "Hàm số bậc nhất",
      description: "Đồ thị và tính chất của hàm số y = ax + b",
      level: "Lớp 10",
      duration: "60 phút",
      isCompleted: true,
      isLocked: false,
      xp: 60
    },
    {
      id: "toan-hoc-10-3",
      title: "Hàm số bậc hai",
      description: "Parabol và các tính chất của hàm số y = ax² + bx + c",
      level: "Lớp 10", 
      duration: "50 phút",
      isCompleted: true,
      isLocked: false,
      xp: 55
    },
    {
      id: "toan-hoc-10-4",
      title: "Phương trình bậc nhất",
      description: "Giải phương trình ax + b = 0 và ứng dụng",
      level: "Lớp 10",
      duration: "55 phút", 
      isCompleted: true,
      isLocked: false,
      xp: 65
    },
    {
      id: "toan-hoc-10-5",
      title: "Phương trình bậc hai",
      description: "Công thức nghiệm và định lý Vi-ét",
      level: "Lớp 10",
      duration: "70 phút",
      isCompleted: true,
      isLocked: false,
      xp: 70
    },
    {
      id: "toan-hoc-11-1",
      title: "Lượng giác cơ bản",
      description: "Sin, cos, tan và các công thức lượng giác",
      level: "Lớp 11",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "toan-hoc-11-2",
      title: "Tổ hợp và xác suất",
      description: "Hoán vị, chỉnh hợp, tổ hợp và xác suất",
      level: "Lớp 11",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "toan-hoc-11-3",
      title: "Dãy số và cấp số",
      description: "Cấp số cộng, cấp số nhân và giới hạn",
      level: "Lớp 11",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "toan-hoc-11-4",
      title: "Giới hạn hàm số",
      description: "Giới hạn tại một điểm và tại vô cực",
      level: "Lớp 11",
      duration: "55 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "toan-hoc-12-1",
      title: "Đạo hàm",
      description: "Khái niệm đạo hàm và các quy tắc tính đạo hàm",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "toan-hoc-12-2",
      title: "Ứng dụng đạo hàm",
      description: "Khảo sát hàm số và bài toán tối ưu",
      level: "Lớp 12",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "toan-hoc-12-3",
      title: "Nguyên hàm",
      description: "Khái niệm nguyên hàm và bảng nguyên hàm cơ bản",
      level: "Lớp 12",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "toan-hoc-12-4",
      title: "Tích phân",
      description: "Tích phân xác định và ứng dụng tính diện tích",
      level: "Lớp 12",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "toan-hoc-12-5",
      title: "Số phức",
      description: "Khái niệm số phức và các phép toán",
      level: "Lớp 12",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "toan-hoc-12-6",
      title: "Khối đa diện",
      description: "Thể tích khối chóp, khối lăng trụ",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    }
  ];

  const achievements = [
    {
      id: "toan-hoc-basics",
      title: "Toán học cơ bản",
      description: "Hoàn thành 5 bài học đầu tiên",
      isUnlocked: true,
      xp: 100
    },
    {
      id: "toan-hoc-intermediate", 
      title: "Toán học trung cấp",
      description: "Hoàn thành 10 bài học",
      isUnlocked: false,
      xp: 200
    },
    {
      id: "toan-hoc-advanced",
      title: "Toán học nâng cao", 
      description: "Hoàn thành tất cả bài học",
      isUnlocked: false,
      xp: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning-paths-demo" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại lộ trình học tập
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-blue-500 rounded-xl text-white">
              <Calculator className="h-8 w-8" />
            
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
                  <Target className="h-5 w-5 text-blue-600" />
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
                                     chapter.isLocked ? "text-gray-400" : "text-blue-600";
                    
                    return (
                      <div
                        key={chapter.id}
                        className={`p-4 border-l-4 ${
                          chapter.isCompleted ? "border-green-500 bg-green-50" :
                          chapter.isLocked ? "border-gray-300 bg-gray-50" :
                          "border-blue-500 bg-blue-50"
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
                              <Link href={`/learning-paths-demo/toan-hoc/learn/${chapter.id}`}>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                  <span className="font-semibold text-blue-600">300 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian học:</span>
                  <span className="font-semibold">4.5 giờ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-semibold text-blue-600">25%</span>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sẵn sàng bắt đầu?</h3>
                <p className="text-sm mb-4 opacity-90">
                  Đăng nhập để truy cập đầy đủ nội dung và theo dõi tiến độ
                </p>
                <Button className="bg-white text-blue-600 hover:bg-gray-100 w-full">
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
