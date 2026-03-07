"use client"

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FlaskConical, BookOpen, CheckCircle, Clock, PlayCircle, Star, Target, Zap, Waves, Atom, Settings, Sparkles, ArrowRight, Camera, Activity, Brain } from "lucide-react";

export default function LabTwinPage() {
  const [pythonLabs, setPythonLabs] = useState<any>({ simulations: [], total: 0 });
  
  useEffect(() => {
    const loadPythonSimulations = async () => {
      try {
        const response = await fetch('/labs/index.json');
        if (response.ok) {
          const data = await response.json();
          setPythonLabs(data);
        }
      } catch (error) {
        console.error('Error loading Python simulations:', error);
      }
    };
    
    loadPythonSimulations();
  }, []);
  const labTwin = {
    id: "labtwin",
    title: "LabTwin - Phòng thí nghiệm ảo",
    description: "Khám phá các hiện tượng vật lý thông qua thí nghiệm tương tác",
    icon: FlaskConical,
    color: "bg-blue-500",
    progress: 0,
    completed: 0,
    total: 8,
    level: "Lớp 10-12",
    duration: "12 tuần",
    difficulty: "Trung bình"
  };

  const experiments = [
    {
      id: "ml-training",
      title: "🎓 ML Model Training",
      description: "Đào tạo mô hình nhận dạng chữ viết tay với TensorFlow",
      category: "Machine Learning",
      icon: Brain,
      level: "Nâng cao",
      duration: "90 phút",
      isCompleted: false,
      isLocked: false,
      xp: 150,
      features: ["MNIST/EMNIST datasets", "Real-time training", "Model export", "WebSocket progress"],
      isNew: true,
      isExternal: true
    },
    {
      id: "video-tracking",
      title: "🎬 Video Trajectory Tracking",
      description: "Upload video và theo dõi chuyển động vật thể qua từng frame",
      category: "Thị giác máy tính",
      icon: Camera,
      level: "Nâng cao",
      duration: "60 phút",
      isCompleted: false,
      isLocked: false,
      xp: 120,
      features: ["Upload video", "Click tracking", "Export CSV", "Real-time analysis"],
      isNew: true
    },
    {
      id: "mechanics-1",
      title: "Chuyển động thẳng đều",
      description: "Mô phỏng chuyển động thẳng đều với đồ thị vận tốc",
      category: "Cơ học",
      icon: Zap,
      level: "Lớp 10",
      duration: "30 phút",
      isCompleted: false,
      isLocked: false,
      xp: 60,
      features: ["Đồ thị vận tốc", "Tính toán quãng đường", "Thay đổi vận tốc"]
    },
    {
      id: "mechanics-2",
      title: "Chuyển động rơi tự do",
      description: "Thí nghiệm rơi tự do với gia tốc trọng trường",
      category: "Cơ học",
      icon: Zap,
      level: "Lớp 10",
      duration: "35 phút",
      isCompleted: false,
      isLocked: false,
      xp: 70,
      features: ["Mô phỏng rơi tự do", "Đo thời gian rơi", "Tính gia tốc g"]
    },
    {
      id: "waves-1",
      title: "Sóng cơ học",
      description: "Mô phỏng sóng dọc và sóng ngang",
      category: "Sóng",
      icon: Waves,
      level: "Lớp 12",
      duration: "40 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80,
      features: ["Sóng dọc/ngang", "Tần số sóng", "Bước sóng"]
    },
    {
      id: "waves-2",
      title: "Giao thoa sóng",
      description: "Thí nghiệm giao thoa sóng nước và sóng âm",
      category: "Sóng",
      icon: Waves,
      level: "Lớp 12",
      duration: "45 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85,
      features: ["Giao thoa sóng", "Vân giao thoa", "Tính toán khoảng vân"]
    },
    {
      id: "electricity-1",
      title: "Điện trường",
      description: "Mô phỏng điện trường của các điện tích điểm",
      category: "Điện từ",
      icon: Atom,
      level: "Lớp 11",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 90,
      features: ["Điện trường", "Đường sức điện", "Lực Coulomb"]
    },
    {
      id: "electricity-2",
      title: "Mạch điện DC",
      description: "Thí nghiệm mạch điện một chiều với điện trở",
      category: "Điện từ",
      icon: Atom,
      level: "Lớp 11",
      duration: "40 phút",
      isCompleted: false,
      isLocked: false,
      xp: 75,
      features: ["Mạch điện DC", "Định luật Ohm", "Mắc nối tiếp/song song"]
    },
    {
      id: "optics-1",
      title: "Khúc xạ ánh sáng",
      description: "Thí nghiệm khúc xạ qua lăng kính và thấu kính",
      category: "Quang học",
      icon: Settings,
      level: "Lớp 11",
      duration: "45 phút",
      isCompleted: false,
      isLocked: false,
      xp: 80,
      features: ["Khúc xạ ánh sáng", "Định luật Snell", "Lăng kính"]
    },
    {
      id: "thermodynamics-1",
      title: "Nhiệt động lực học",
      description: "Mô phỏng quá trình nhiệt động của khí lý tưởng",
      category: "Nhiệt học",
      icon: Settings,
      level: "Lớp 10",
      duration: "50 phút",
      isCompleted: false,
      isLocked: false,
      xp: 85,
      features: ["Khí lý tưởng", "Định luật Boyle", "Đồ thị PV"]
    }
  ];

  const categories = [
    { name: "Cơ học", count: 2, color: "bg-red-500" },
    { name: "Thị giác máy tính", count: 1, color: "bg-indigo-500" },
    { name: "Sóng", count: 2, color: "bg-green-500" },
    { name: "Điện từ", count: 2, color: "bg-blue-500" },
    { name: "Quang học", count: 1, color: "bg-purple-500" },
    { name: "Nhiệt học", count: 1, color: "bg-orange-500" }
  ];

  const achievements = [
    {
      id: "labtwin-basics",
      title: "Nhà thí nghiệm mới",
      description: "Hoàn thành 3 thí nghiệm đầu tiên",
      isUnlocked: false,
      xp: 150
    },
    {
      id: "labtwin-mechanics",
      title: "Chuyên gia cơ học",
      description: "Hoàn thành tất cả thí nghiệm cơ học",
      isUnlocked: false,
      xp: 200
    },
    {
      id: "labtwin-master",
      title: "Bậc thầy LabTwin",
      description: "Hoàn thành tất cả thí nghiệm",
      isUnlocked: false,
      xp: 500
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại Dashboard
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-blue-500 rounded-xl text-white">
              <FlaskConical className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{labTwin.title}</h1>
              <p className="text-gray-600 mt-1">{labTwin.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary">{labTwin.level}</Badge>
                <Badge variant="outline">{labTwin.duration}</Badge>
                <Badge variant="outline">{labTwin.difficulty}</Badge>
              </div>
            </div>
          </div>

          {/* Video Tracking Tool - Highlighted Section */}
          <Card className="mb-6 border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardHeader className="bg-gradient-to-r from-emerald-100 to-teal-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg text-white">
                    <Camera className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      🎬 Video Trajectory Tracking
                      <Badge className="bg-emerald-600 text-white">NEW</Badge>
                      <Badge className="bg-yellow-500 text-white">AI-Powered</Badge>
                    </CardTitle>
                    <CardDescription>
                      Upload video và theo dõi chuyển động vật thể qua từng frame với công nghệ computer vision
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Tính năng chính
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Upload video hoặc kéo thả file MP4, AVI, MOV</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Click vào video để đánh dấu vị trí vật thể theo thời gian</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Vẽ đường quỹ đạo 2D trực tiếp trên video</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Xuất dữ liệu CSV với tọa độ (x, y, t) để phân tích</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>Phù hợp cho thí nghiệm vật lý: chuyển động ném, rơi tự do, con lắc...</span>
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-600" />
                      Thông tin
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cấp độ:</span>
                        <Badge variant="outline">Nâng cao</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Thời lượng:</span>
                        <span className="font-medium">60 phút</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">XP thưởng:</span>
                        <span className="font-medium text-yellow-600 flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          +120 XP
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Danh mục:</span>
                        <Badge className="bg-emerald-100 text-emerald-800">Thị giác máy tính</Badge>
                      </div>
                    </div>
                  </div>
                  <Link href="/dashboard/labtwin/video-tracking" className="mt-6">
                    <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg">
                      <Camera className="mr-2 h-5 w-5" />
                      Bắt đầu Video Tracking
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Python Simulations Section */}
          {pythonLabs.simulations.length > 0 && (
            <Card className="mb-6 border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg text-white">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        🐍 Python Simulations
                        <Badge className="bg-purple-600 text-white">
                          {pythonLabs.total} simulations
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Mô phỏng vật lý được tạo bằng Python, hiển thị trực tiếp với Canvas animation
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pythonLabs.simulations.map((sim: any) => {
                    const iconMap: { [key: string]: any } = {
                      'Zap': Zap,
                      'Settings': Settings,
                      'Atom': Atom,
                      'Waves': Waves,
                      'Camera': Camera,
                      'Activity': Activity,
                      'FlaskConical': FlaskConical
                    };
                    const Icon = iconMap[sim.icon] || FlaskConical;
                    
                    const categoryColors: { [key: string]: string } = {
                      'Cơ học': 'bg-red-500',
                      'Quang học': 'bg-purple-500',
                      'Điện từ': 'bg-blue-500',
                      'Sóng': 'bg-green-500',
                      'Thị giác máy tính': 'bg-emerald-500',
                    };
                    const categoryColor = categoryColors[sim.category] || 'bg-gray-500';
                    
                    return (
                      <div
                        key={sim.id}
                        className="p-4 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 hover:border-purple-400 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 ${categoryColor} rounded-lg text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{sim.name}</h4>
                            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                              {sim.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {sim.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sim.level}
                          </Badge>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sim.duration}
                          </span>
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            +{sim.xp} XP
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {sim.features?.slice(0, 3).map((feature: string, idx: number) => (
                            <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>

                        <Link href={`/dashboard/labtwin/labs/${sim.id}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                            Bắt đầu mô phỏng
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-purple-200">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span>Được tạo bằng Python • Tự động build • Canvas animation</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      v1.0.0
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Tiến độ thí nghiệm</span>
                </div>
                <span className="text-sm text-gray-600">
                  {labTwin.completed}/{labTwin.total} thí nghiệm
                </span>
              </div>
              <Progress value={labTwin.progress} className="h-3 mb-2" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{labTwin.progress}% hoàn thành</span>
                <span>{labTwin.total - labTwin.completed} thí nghiệm còn lại</span>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Danh mục thí nghiệm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categories.map((category) => (
                  <div
                    key={category.name}
                    className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className={`w-8 h-8 ${category.color} rounded-lg mb-2`}></div>
                    <h3 className="font-semibold text-sm">{category.name}</h3>
                    <p className="text-xs text-gray-600">{category.count} thí nghiệm</p>
                  </div>
                ))}
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
                  <FlaskConical className="h-5 w-5" />
                  Thí nghiệm tương tác
                </CardTitle>
                <CardDescription>
                  Thí nghiệm Canvas với controls tương tác để hiểu sâu các hiện tượng vật lý
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {experiments.map((experiment, index) => {
                    const Icon = experiment.icon;
                    const categoryColor = categories.find(c => c.name === experiment.category)?.color || "bg-gray-500";
                    
                    return (
                      <div
                        key={experiment.id}
                        className={`p-4 border-l-4 ${
                          experiment.isCompleted ? "border-green-500 bg-green-50" :
                          experiment.isLocked ? "border-gray-300 bg-gray-50" :
                          "border-blue-500 bg-blue-50"
                        } hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Icon className="h-6 w-6 text-blue-600" />
                              <div className={`absolute -top-1 -right-1 w-3 h-3 ${categoryColor} rounded-full`}></div>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {index + 1}. {experiment.title}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {experiment.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
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
                              <div className="flex flex-wrap gap-1 mt-2">
                                {experiment.features.map((feature, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {experiment.isCompleted && (
                              <Badge className="bg-green-100 text-green-800">
                                Hoàn thành
                              </Badge>
                            )}
                            {!experiment.isLocked && !experiment.isCompleted && (
                              <Link href={
                                experiment.id === 'ml-training' ? `/dashboard/labtwin/ml-training` :
                                experiment.id === 'video-tracking' ? `/dashboard/labtwin/video-tracking` :
                                `/dashboard/labtwin/experiment/${experiment.id}`
                              }>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                  {experiment.isNew && <Badge className="mr-2 bg-yellow-500 text-white px-1 py-0 text-xs">NEW</Badge>}
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
                  <span className="font-semibold text-blue-600">0 XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thời gian thí nghiệm:</span>
                  <span className="font-semibold">0 giờ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-semibold text-blue-600">0%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thí nghiệm hoàn thành:</span>
                  <span className="font-semibold text-green-600">0/8</span>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold mb-2">Sẵn sàng khám phá?</h3>
                <p className="text-sm mb-4 opacity-90">
                  Bắt đầu thí nghiệm đầu tiên để trải nghiệm phòng thí nghiệm ảo
                </p>
                <Link href="/dashboard/labtwin/experiment/mechanics-1">
                  <Button className="bg-white text-blue-600 hover:bg-gray-100 w-full">
                    Bắt đầu thí nghiệm
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}