'use client';

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  LayoutDashboard,
  Users, 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Video, 
  Map, 
  MessageCircle, 
  Trophy, 
  Microscope,
  Kanban,
  Settings,
  BarChart3,
  Activity,
  ArrowRight,
  Shield,
  Zap
} from "lucide-react";

interface AdminModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  isFixed: boolean;
  isEnabled: boolean;
  stats: {
    total: number;
    active: number;
    pending?: number;
  };
}

const AdminPage = () => {
  const { t } = useLanguage();
  const router = useRouter();

  // Redirect to dashboard on load
  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);
  const [modules] = useState<AdminModule[]>([
    // Fixed modules (cannot be disabled)
    {
      id: "dashboard",
      name: t('dashboard.title'),
      description: "Tổng quan hệ thống và thống kê",
      icon: LayoutDashboard,
      href: "/admin/dashboard",
      isFixed: true,
      isEnabled: true,
      stats: { total: 0, active: 0, pending: 0 }
    },
    {
      id: "users",
      name: "Quản lý người dùng",
      description: "Quản lý học sinh, giáo viên và quản trị viên",
      icon: Users,
      href: "/admin/users",
      isFixed: true,
      isEnabled: true,
      stats: { total: 1250, active: 1180, pending: 70 }
    },
    {
      id: "courses",
      name: "Quản lý khóa học",
      description: "Tạo và quản lý các khóa học, chương trình học",
      icon: BookOpen,
      href: "/admin/courses",
      isFixed: true,
      isEnabled: true,
      stats: { total: 45, active: 42, pending: 3 }
    },
    {
      id: "quiz",
      name: "Quản lý bài kiểm tra",
      description: "Tạo và quản lý các bài quiz, kiểm tra, đề thi",
      icon: HelpCircle,
      href: "/admin/quiz",
      isFixed: true,
      isEnabled: true,
      stats: { total: 280, active: 265, pending: 15 }
    },
    {
      id: "assignments",
      name: "Quản lý bài tập",
      description: "Phân công và theo dõi bài tập về nhà",
      icon: FileText,
      href: "/admin/assignments",
      isFixed: true,
      isEnabled: true,
      stats: { total: 180, active: 165, pending: 15 }
    },
    {
      id: "video",
      name: "Quản lý video",
      description: "Quản lý thư viện video bài giảng",
      icon: Video,
      href: "/admin/video",
      isFixed: true,
      isEnabled: true,
      stats: { total: 320, active: 310, pending: 10 }
    },
    // Toggleable modules
    {
      id: "learning-path",
      name: "Lộ trình học tập",
      description: "Thiết kế và quản lý lộ trình học cá nhân hóa",
      icon: Map,
      href: "/admin/learning-path",
      isFixed: false,
      isEnabled: true,
      stats: { total: 25, active: 20, pending: 5 }
    },
    {
      id: "live-chat",
      name: "Dạy kèm trực tuyến",
      description: "Hệ thống chat và video call 1-1",
      icon: MessageCircle,
      href: "/admin/live-chat",
      isFixed: false,
      isEnabled: false,
      stats: { total: 0, active: 0, pending: 0 }
    },
    {
      id: "competition",
      name: "Cuộc thi",
      description: "Tổ chức và quản lý các cuộc thi học tập",
      icon: Trophy,
      href: "/admin/competition",
      isFixed: false,
      isEnabled: true,
      stats: { total: 8, active: 3, pending: 5 }
    },
    {
      id: "stem",
      name: "STEM Projects",
      description: "Quản lý các dự án khoa học, kỹ thuật",
      icon: Microscope,
      href: "/admin/stem",
      isFixed: false,
      isEnabled: false,
      stats: { total: 0, active: 0, pending: 0 }
    },
    {
      id: "agile",
      name: "Agile Project Management",
      description: "Quản lý kế hoạch, giao bài tập và theo dõi tiến độ dự án",
      icon: Kanban,
      href: "/admin/agile",
      isFixed: false,
      isEnabled: true,
      stats: { total: 12, active: 8, pending: 4 }
    }
  ]);

  const handleModuleClick = (module: AdminModule) => {
    if (module.isEnabled) {
      router.push(module.href);
    }
  };

  const fixedModules = modules.filter(m => m.isFixed);
  const toggleableModules = modules.filter(m => !m.isFixed);

  const totalUsers = modules.find(m => m.id === "users")?.stats.total || 0;
  const totalCourses = modules.find(m => m.id === "courses")?.stats.total || 0;
  const enabledModules = modules.filter(m => m.isEnabled).length;

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    
              <LanguageSwitcherCompact /></div>
  );

  // This code below will never be reached due to redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Quản trị hệ thống inPhysic
              </h1>
              <p className="text-gray-600">
                Trung tâm điều khiển và quản lý toàn bộ hệ thống
              </p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng người dùng</p>
                  <p className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Khóa học</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCourses}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Module hoạt động</p>
                  <p className="text-2xl font-bold text-gray-900">{enabledModules}/{modules.length}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trạng thái hệ thống</p>
                  <p className="text-2xl font-bold text-green-600">Hoạt động</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8 bg-white shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-600" />
              Hành động nhanh
            </CardTitle>
            <CardDescription>
              Các tác vụ thường xuyên sử dụng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                className="h-20 flex-col bg-blue-600 hover:bg-blue-700"
                onClick={() => router.push('/admin/dashboard')}
              >
                <LayoutDashboard className="h-6 w-6 mb-2" />
                <span>{t('dashboard.title')}</span>
              </Button>
              <Button 
                className="h-20 flex-col bg-green-600 hover:bg-green-700"
                onClick={() => router.push('/admin/users')}
              >
                <Users className="h-6 w-6 mb-2" />
                <span>Quản lý người dùng</span>
              </Button>
              <Button 
                className="h-20 flex-col bg-purple-600 hover:bg-purple-700"
                onClick={() => router.push('/admin/agile')}
              >
                <Kanban className="h-6 w-6 mb-2" />
                <span>Agile Management</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Modules */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Module cố định
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fixedModules.map((module) => (
              <Card 
                key={module.id} 
                className="border-l-4 border-l-blue-500 bg-white shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                onClick={() => handleModuleClick(module)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <module.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Cố định
                    </Badge>
                  </div>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{module.stats.total}</p>
                      <p className="text-xs text-gray-600">Tổng</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{module.stats.active}</p>
                      <p className="text-xs text-gray-600">Hoạt động</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{module.stats.pending || 0}</p>
                      <p className="text-xs text-gray-600">Chờ xử lý</p>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    Truy cập
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Toggleable Modules */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Module có thể bật/tắt
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toggleableModules.map((module) => (
              <Card 
                key={module.id} 
                className={`border-l-4 bg-white shadow-lg hover:shadow-xl transition-all duration-200 ${
                  module.isEnabled 
                    ? 'border-l-green-500 cursor-pointer' 
                    : 'border-l-gray-300 cursor-not-allowed opacity-60'
                }`}
                onClick={() => handleModuleClick(module)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        module.isEnabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <module.icon className={`h-5 w-5 ${
                          module.isEnabled ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <CardTitle className={`text-lg ${
                        module.isEnabled ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {module.name}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={module.isEnabled ? "default" : "secondary"}
                      className={module.isEnabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                    >
                      {module.isEnabled ? "Bật" : "Tắt"}
                    </Badge>
                  </div>
                  <CardDescription className={module.isEnabled ? "" : "text-gray-400"}>
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${
                        module.isEnabled ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {module.stats.total}
                      </p>
                      <p className={`text-xs ${module.isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        Tổng
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${
                        module.isEnabled ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {module.stats.active}
                      </p>
                      <p className={`text-xs ${module.isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        Hoạt động
                      </p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${
                        module.isEnabled ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {module.stats.pending || 0}
                      </p>
                      <p className={`text-xs ${module.isEnabled ? 'text-gray-600' : 'text-gray-400'}`}>
                        Chờ xử lý
                      </p>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    disabled={!module.isEnabled}
                  >
                    {module.isEnabled ? "Truy cập" : "Module đã tắt"}
                    {module.isEnabled && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;