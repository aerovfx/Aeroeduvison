"use client"

import { useState, useEffect } from "react";
import Link from "next/link";

export default function LabTwinDashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading LabTwin...</p>
          </div>
        </div>
      </div>
    );
  }
  const experiments = [
    {
      id: "mechanics-1",
      title: "Chuyển động thẳng đều",
      description: "Mô phỏng chuyển động thẳng đều với đồ thị vận tốc",
      category: "Cơ học",
      icon: Zap,
      level: "Lớp 10",
      duration: "30 phút",
      xp: 60,
      features: ["Đồ thị vận tốc", "Tính toán quãng đường", "Thay đổi vận tốc"],
      href: "/learning-paths-demo/labtwin/experiment/mechanics-1"
    },
    {
      id: "mechanics-2",
      title: "Rơi tự do",
      description: "Thí nghiệm rơi tự do với gia tốc trọng trường",
      category: "Cơ học",
      icon: Zap,
      level: "Lớp 10",
      duration: "35 phút",
      xp: 70,
      features: ["Mô phỏng rơi tự do", "Đo thời gian rơi", "Tính gia tốc g"],
      href: "/learning-paths-demo/labtwin/experiment/mechanics-2"
    },
    {
      id: "waves-1",
      title: "Sóng cơ học",
      description: "Mô phỏng sóng dọc và sóng ngang",
      category: "Sóng",
      icon: Waves,
      level: "Lớp 12",
      duration: "40 phút",
      xp: 80,
      features: ["Sóng dọc/ngang", "Tần số sóng", "Bước sóng"],
      href: "/learning-paths-demo/labtwin/experiment/waves-1"
    },
    {
      id: "electricity-1",
      title: "Điện trường",
      description: "Mô phỏng điện trường của các điện tích điểm",
      category: "Điện từ",
      icon: Atom,
      level: "Lớp 11",
      duration: "50 phút",
      xp: 90,
      features: ["Điện trường", "Đường sức điện", "Lực Coulomb"],
      href: "/learning-paths-demo/labtwin/experiment/electricity-1"
    },
    {
      id: "electricity-2",
      title: "Mạch điện DC",
      description: "Thí nghiệm mạch điện một chiều với điện trở",
      category: "Điện từ",
      icon: Atom,
      level: "Lớp 11",
      duration: "40 phút",
      xp: 75,
      features: ["Mạch điện DC", "Định luật Ohm", "Mắc nối tiếp/song song"],
      href: "/learning-paths-demo/labtwin/experiment/electricity-2"
    },
    {
      id: "optics-1",
      title: "Khúc xạ ánh sáng",
      description: "Thí nghiệm khúc xạ qua lăng kính và thấu kính",
      category: "Quang học",
      icon: Beaker,
      level: "Lớp 11",
      duration: "45 phút",
      xp: 80,
      features: ["Khúc xạ ánh sáng", "Định luật Snell", "Lăng kính"],
      href: "/learning-paths-demo/labtwin/experiment/optics-1"
    }
  ];

  const categories = [
    { name: "Cơ học", count: 2, color: "bg-red-500", icon: Zap },
    { name: "Sóng", count: 1, color: "bg-green-500", icon: Waves },
    { name: "Điện từ", count: 2, color: "bg-blue-500", icon: Atom },
    { name: "Quang học", count: 1, color: "bg-purple-500", icon: Beaker }
  ];

  const stats = {
    totalExperiments: 6,
    completed: 0,
    totalXP: 455,
    timeSpent: "0 giờ"
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-xl text-white">
              <FlaskConical className="h-8 w-8" />
            </div>
            LabTwin - Phòng thí nghiệm ảo
          </h1>
          <p className="text-gray-600 mt-2">
            Khám phá các hiện tượng vật lý thông qua thí nghiệm tương tác
          </p>
        </div>
        <Link href="/learning-paths-demo/labtwin">
          <Button className="bg-blue-600 hover:bg-blue-700">
            Xem tất cả thí nghiệm
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng thí nghiệm</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalExperiments}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <Star className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng XP</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalXP}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Thời gian học</p>
                <p className="text-2xl font-bold text-purple-600">{stats.timeSpent}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Danh mục thí nghiệm</CardTitle>
          <CardDescription>
            Khám phá các chủ đề vật lý khác nhau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.name}
                  className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                  </div>
                  <p className="text-xs text-gray-600">{category.count} thí nghiệm</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Featured Experiments */}
      <Card>
        <CardHeader>
          <CardTitle>Thí nghiệm nổi bật</CardTitle>
          <CardDescription>
            Bắt đầu với những thí nghiệm cơ bản nhất
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.slice(0, 3).map((experiment) => {
              const IconComponent = experiment.icon;
              return (
                <Card key={experiment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{experiment.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {experiment.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {experiment.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{experiment.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      {experiment.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {experiment.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          +{experiment.xp} XP
                        </span>
                      </div>
                    </div>

                    <Link href={experiment.href}>
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Bắt đầu thí nghiệm
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Experiments */}
      <Card>
        <CardHeader>
          <CardTitle>Tất cả thí nghiệm</CardTitle>
          <CardDescription>
            Danh sách đầy đủ các thí nghiệm có sẵn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {experiments.map((experiment, index) => {
              const IconComponent = experiment.icon;
              return (
                <div
                  key={experiment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {index + 1}. {experiment.title}
                      </h3>
                      <p className="text-sm text-gray-600">{experiment.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {experiment.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {experiment.level}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {experiment.duration}
                        </span>
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          +{experiment.xp} XP
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={experiment.href}>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Bắt đầu
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Hướng dẫn bắt đầu</CardTitle>
          <CardDescription className="text-blue-700">
            Làm quen với LabTwin trong vài phút
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h4 className="font-medium text-blue-900">Chọn thí nghiệm</h4>
                <p className="text-sm text-blue-700">Bắt đầu với "Chuyển động thẳng đều" để làm quen</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h4 className="font-medium text-blue-900">Điều chỉnh tham số</h4>
                <p className="text-sm text-blue-700">Sử dụng sliders và controls để thay đổi các giá trị</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h4 className="font-medium text-blue-900">Quan sát kết quả</h4>
                <p className="text-sm text-blue-700">Xem animation và dữ liệu thu thập được</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Link href="/learning-paths-demo/labtwin/experiment/mechanics-1">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Bắt đầu thí nghiệm đầu tiên
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
