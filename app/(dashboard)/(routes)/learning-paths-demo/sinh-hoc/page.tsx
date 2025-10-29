'use client';

"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Dna, BookOpen, CheckCircle, Clock, PlayCircle, Star, Target } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

export default function SinhHocLearningPathPage() {
  const { t } = useLanguage();
  
  const learningPath = {
    id: "sinh-hoc",
    title: "Sinh học",
    description: "Khám phá sự sống và các quá trình sinh học",
    icon: Dna,
    color: "bg-pink-500",
    progress: 0,
    completed: 0,
    total: 12,
    level: "Lớp 10-12",
    duration: "10 tuần",
    difficulty: "Trung bình"
  };

  const chapters = [
    {
      id: "sinh-hoc-10-1",
      title: "Thành phần hóa học của tế bào",
      description: "Nước, muối khoáng, cacbohidrat, lipit, protein",
      level: "Lớp 10",
      duration: "45 phút",
      isCompleted: false,
      isLocked: false,
      xp: 50
    },
    {
      id: "sinh-hoc-10-2", 
      title: "Cấu trúc tế bào",
      description: "Màng tế bào, tế bào chất và nhân tế bào",
      level: "Lớp 10",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "sinh-hoc-10-3",
      title: "Chuyển hóa vật chất và năng lượng",
      description: "Quang hợp và hô hấp tế bào",
      level: "Lớp 10", 
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "sinh-hoc-10-4",
      title: "Phân bào",
      description: "Nguyên phân và giảm phân",
      level: "Lớp 10",
      duration: "55 phút", 
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "sinh-hoc-11-1",
      title: "Cảm ứng ở thực vật",
      description: "Hướng động và ứng động",
      level: "Lớp 11",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "sinh-hoc-11-2",
      title: "Sinh trưởng và phát triển",
      description: "Hormone thực vật và quá trình phát triển",
      level: "Lớp 11",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "sinh-hoc-11-3",
      title: "Sinh sản ở thực vật",
      description: "Sinh sản hữu tính và vô tính",
      level: "Lớp 11",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "sinh-hoc-11-4",
      title: "Cảm ứng ở động vật",
      description: "Hệ thần kinh và phản xạ",
      level: "Lớp 11",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "sinh-hoc-12-1",
      title: "Di truyền học",
      description: "Gen, ADN và quy luật di truyền",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "sinh-hoc-12-2",
      title: "Biến dị",
      description: "Đột biến gen và đột biến NST",
      level: "Lớp 12",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "sinh-hoc-12-3",
      title: "Ứng dụng di truyền học",
      description: "Công nghệ gen và chọn giống",
      level: "Lớp 12",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "sinh-hoc-12-4",
      title: "Tiến hóa",
      description: "Bằng chứng tiến hóa và học thuyết Darwin",
      level: "Lớp 12",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    }
  ];

  const achievements = [
    {
      id: "sinh-hoc-basics",
      title: "Sinh học cơ bản",
      description: "Hoàn thành 5 bài học đầu tiên",
      isUnlocked: false,
      xp: 100
    },
    {
      id: "sinh-hoc-intermediate", 
      title: "Sinh học trung cấp",
      description: "Hoàn thành 8 bài học",
      isUnlocked: false,
      xp: 200
    },
    {
      id: "sinh-hoc-advanced",
      title: "Sinh học nâng cao", 
      description: "Hoàn thành tất cả bài học",
      isUnlocked: false,
      xp: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning-paths-demo" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại lộ trình học tập
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-pink-500 rounded-xl text-white">
              <Dna className="h-8 w-8" />
            
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
                  <Target className="h-5 w-5 text-pink-600" />
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
                                     chapter.isLocked ? "text-gray-400" : "text-pink-600";
                    
                    return (
                      <div
                        key={chapter.id}
                        className={`p-4 border-l-4 ${
                          chapter.isCompleted ? "border-green-500 bg-green-50" :
                          chapter.isLocked ? "border-gray-300 bg-gray-50" :
                          "border-pink-500 bg-pink-50"
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
                              <Link href={`/learning-paths-demo/sinh-hoc/learn/${chapter.id}`}>
                                <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
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
                  <span className="font-semibold text-pink-600">0 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian học:</span>
                  <span className="font-semibold">0 giờ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-semibold text-pink-600">0%</span>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sẵn sàng bắt đầu?</h3>
                <p className="text-sm mb-4 opacity-90">
                  Đăng nhập để truy cập đầy đủ nội dung và theo dõi tiến độ
                </p>
                <Button className="bg-white text-pink-600 hover:bg-gray-100 w-full">
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
