"use client"

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Code2, BookOpen, CheckCircle, Clock, PlayCircle, Star, Target } from "lucide-react";

export default function PythonLearningPathPage() {
  const learningPath = {
    id: "python",
    title: "Python Programming",
    description: "Lập trình Python từ cơ bản đến nâng cao cho học sinh STEM",
    icon: Code2,
    color: "bg-orange-500",
    progress: 0,
    completed: 0,
    total: 32,
    level: "Lớp 10-12",
    duration: "16 tuần",
    difficulty: "Nâng cao"
  };

  const chapters = [
    {
      id: "python-10-1",
      title: "Giới thiệu Python",
      description: "Cài đặt môi trường và làm quen với Python",
      level: "Lớp 10",
      duration: "45 phút",
      isCompleted: false,
      isLocked: false,
      xp: 50
    },
    {
      id: "python-10-2", 
      title: "Biến và kiểu dữ liệu",
      description: "Khái niệm biến, kiểu dữ liệu cơ bản trong Python",
      level: "Lớp 10",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "python-10-3",
      title: "Input/Output",
      description: "Nhập xuất dữ liệu với input() và print()",
      level: "Lớp 10", 
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "python-10-4",
      title: "Toán tử và biểu thức",
      description: "Các toán tử số học, so sánh và logic",
      level: "Lớp 10",
      duration: "55 phút", 
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "python-10-5",
      title: "Cấu trúc điều khiển if/else",
      description: "Câu lệnh điều kiện và logic điều khiển",
      level: "Lớp 10",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "python-10-6",
      title: "Vòng lặp for/while",
      description: "Cấu trúc lặp và ứng dụng thực tế",
      level: "Lớp 10",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60
    },
    {
      id: "python-10-7",
      title: "break/continue",
      description: "Điều khiển vòng lặp với break và continue",
      level: "Lớp 10",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "python-10-8",
      title: "Bài tập thực hành",
      description: "Luyện tập với các bài toán cơ bản",
      level: "Lớp 10",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 55
    },
    {
      id: "python-11-1",
      title: "List và Tuple",
      description: "Cấu trúc dữ liệu danh sách và tuple",
      level: "Lớp 11",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "python-11-2",
      title: "Set và Dictionary",
      description: "Tập hợp và từ điển trong Python",
      level: "Lớp 11",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "python-11-3",
      title: "List Comprehension",
      description: "Cách viết code Pythonic với list comprehension",
      level: "Lớp 11",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "python-11-4",
      title: "Quản lý điểm số",
      description: "Dự án thực tế quản lý điểm số học sinh",
      level: "Lớp 11",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "python-11-5",
      title: "Định nghĩa hàm",
      description: "Tạo và sử dụng hàm trong Python",
      level: "Lớp 11",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "python-11-6",
      title: "Tham số và return",
      description: "Truyền tham số và trả về giá trị",
      level: "Lớp 11",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "python-11-7",
      title: "Module và thư viện",
      description: "Sử dụng module có sẵn và tạo module riêng",
      level: "Lớp 11",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "python-11-8",
      title: "Thư viện toán học",
      description: "Sử dụng math module cho các phép toán",
      level: "Lớp 11",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 65
    },
    {
      id: "python-12-1",
      title: "Class và Object",
      description: "Khái niệm lập trình hướng đối tượng",
      level: "Lớp 12",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "python-12-2",
      title: "Constructor và Method",
      description: "__init__ và các phương thức trong class",
      level: "Lớp 12",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "python-12-3",
      title: "Kế thừa",
      description: "Inheritance và polymorphism trong Python",
      level: "Lớp 12",
      duration: "85 phút",
      isCompleted: false,
      isLocked: false,
      xp: 90
    },
    {
      id: "python-12-4",
      title: "Hệ thống quản lý",
      description: "Dự án quản lý thông tin với OOP",
      level: "Lớp 12",
      duration: "90 phút",
      isCompleted: false,
      isLocked: false,
      xp: 95
    },
    {
      id: "python-12-5",
      title: "Đọc và ghi file",
      description: "Xử lý file text và CSV",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "python-12-6",
      title: "Exception Handling",
      description: "Xử lý lỗi với try/except/finally",
      level: "Lớp 12",
      duration: "65 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70
    },
    {
      id: "python-12-7",
      title: "Phân tích dữ liệu",
      description: "Xử lý và phân tích dữ liệu cơ bản",
      level: "Lớp 12",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "python-12-8",
      title: "NumPy cơ bản",
      description: "Thư viện NumPy cho tính toán số học",
      level: "Lớp 12",
      duration: "75 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80
    },
    {
      id: "python-12-9",
      title: "Pandas cơ bản",
      description: "Xử lý dữ liệu với Pandas DataFrame",
      level: "Lớp 12",
      duration: "80 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85
    },
    {
      id: "python-12-10",
      title: "Matplotlib cơ bản",
      description: "Vẽ biểu đồ và trực quan hóa dữ liệu",
      level: "Lớp 12",
      duration: "70 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75
    },
    {
      id: "python-12-11",
      title: "Phân tích thí nghiệm",
      description: "Ứng dụng Python trong phân tích kết quả thí nghiệm",
      level: "Lớp 12",
      duration: "85 phút",
      isCompleted: false,
      isLocked: false,
      xp: 90
    },
    {
      id: "python-12-12",
      title: "Máy tính khoa học",
      description: "Xây dựng máy tính khoa học với Python",
      level: "Lớp 12",
      duration: "90 phút",
      isCompleted: false,
      isLocked: false,
      xp: 95
    },
    {
      id: "python-12-13",
      title: "Phân tích dữ liệu khí hậu",
      description: "Dự án phân tích dữ liệu thời tiết",
      level: "Lớp 12",
      duration: "95 phút",
      isCompleted: false,
      isLocked: false,
      xp: 100
    },
    {
      id: "python-12-14",
      title: "Mô phỏng vật lý",
      description: "Mô phỏng các hiện tượng vật lý",
      level: "Lớp 12",
      duration: "100 phút",
      isCompleted: false,
      isLocked: false,
      xp: 105
    },
    {
      id: "python-12-15",
      title: "Dự án cuối khóa",
      description: "Dự án tổng hợp tất cả kiến thức đã học",
      level: "Lớp 12",
      duration: "120 phút",
      isCompleted: false,
      isLocked: false,
      xp: 120
    }
  ];

  const achievements = [
    {
      id: "python-basics",
      title: "Python cơ bản",
      description: "Hoàn thành 8 bài học đầu tiên",
      isUnlocked: false,
      xp: 100
    },
    {
      id: "python-intermediate", 
      title: "Python trung cấp",
      description: "Hoàn thành 16 bài học",
      isUnlocked: false,
      xp: 200
    },
    {
      id: "python-advanced",
      title: "Python nâng cao", 
      description: "Hoàn thành tất cả bài học",
      isUnlocked: false,
      xp: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/learning-paths-demo" className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại lộ trình học tập
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-orange-500 rounded-xl text-white">
              <Code2 className="h-8 w-8" />
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
                  <Target className="h-5 w-5 text-orange-600" />
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
                                     chapter.isLocked ? "text-gray-400" : "text-orange-600";
                    
                    return (
                      <div
                        key={chapter.id}
                        className={`p-4 border-l-4 ${
                          chapter.isCompleted ? "border-green-500 bg-green-50" :
                          chapter.isLocked ? "border-gray-300 bg-gray-50" :
                          "border-orange-500 bg-orange-50"
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
                              <Link href={`/learning-paths-demo/python/learn/${chapter.id}`}>
                                <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
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
                  <span className="font-semibold text-orange-600">0 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian học:</span>
                  <span className="font-semibold">0 giờ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-semibold text-orange-600">0%</span>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sẵn sàng bắt đầu?</h3>
                <p className="text-sm mb-4 opacity-90">
                  Đăng nhập để truy cập đầy đủ nội dung và theo dõi tiến độ
                </p>
                <Button className="bg-white text-orange-600 hover:bg-gray-100 w-full">
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
