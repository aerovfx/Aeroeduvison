'use client';

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSTEM } from "@/contexts/STEMContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Zap,
  FlaskConical,
  Cpu,
  Wrench,
  Calculator,
  Users,
  Calendar,
  Clock,
  Star,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Bookmark,
  Share,
  Download,
  Upload,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  Home,
  BookOpen,
  FileText,
  Video,
  UserCheck
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface STEMProject {
  id: string;
  title: string;
  description: string;
  category: "Science" | "Technology" | "Engineering" | "Math";
  status: "draft" | "in-progress" | "review" | "completed" | "published";
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  progress: number; // 0-100
  milestones: Array<{
    id: string;
    title: string;
    status: "pending" | "in-progress" | "completed";
    dueDate: string;
  }>;
  feedback: Array<{
    id: string;
    author: string;
    content: string;
    date: string;
    type: "suggestion" | "approval" | "revision";
  }>;
  isPublic: boolean;
  thumbnail?: string;
}

const StudentSTEMDashboard = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  
  const { projects, loadProjects } = useSTEM();

  useEffect(() => {
    // Show loading for a brief moment to simulate data fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    // Try to load from API in background (optional)
    loadProjects().catch(err => {
      console.log('API load attempt failed, using mock data:', err);
    });

    return () => clearTimeout(timer);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Bản nháp</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">Đang thực hiện</Badge>;
      case "review":
        return <Badge className="bg-yellow-100 text-yellow-800">Chờ duyệt</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "published":
        return <Badge className="bg-purple-100 text-purple-800">Đã xuất bản</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Science":
        return <FlaskConical className="h-5 w-5 text-blue-600" />;
      case "Technology":
        return <Cpu className="h-5 w-5 text-green-600" />;
      case "Engineering":
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case "Math":
        return <Calculator className="h-5 w-5 text-purple-600" />;
      default:
        return <Zap className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Science":
        return "bg-blue-100 text-blue-800";
      case "Technology":
        return "bg-green-100 text-green-800";
      case "Engineering":
        return "bg-orange-100 text-orange-800";
      case "Math":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === "completed").length,
    inProgress: projects.filter(p => p.status === "in-progress").length,
    draft: projects.filter(p => p.status === "draft").length,
    review: projects.filter(p => p.status === "review").length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
                    <p className="text-gray-600">Đang tải dự án STEM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Dự án STEM của tôi
              </h1>
              <p className="text-gray-600">
                Quản lý và theo dõi các dự án STEM mà bạn đang tham gia
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard/stem/templates">
                  <Download className="h-4 w-4 mr-2" />
                  Mẫu dự án
                </Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard/stem/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo dự án mới
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng dự án</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang thực hiện</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bản nháp</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
                </div>
                <Edit className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chờ duyệt</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.review}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm dự án..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Bản nháp</option>
                  <option value="in-progress">Đang thực hiện</option>
                  <option value="review">Chờ duyệt</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="published">Đã xuất bản</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả lĩnh vực</option>
                  <option value="Science">Khoa học</option>
                  <option value="Technology">Công nghệ</option>
                  <option value="Engineering">Kỹ thuật</option>
                  <option value="Math">Toán học</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                      {getCategoryIcon(project.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(project.status)}
                        <Badge className={getCategoryColor(project.category)}>
                          {project.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <a href={`/dashboard/stem/${project.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/dashboard/stem/${project.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/dashboard/stem/${project.id}/timeline`}>
                          <Calendar className="mr-2 h-4 w-4" />
                          Timeline
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Share className="mr-2 h-4 w-4" />
                        Chia sẻ
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <CardDescription className="text-sm mb-4 line-clamp-3">
                  {project.description}
                </CardDescription>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Tiến độ</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Nhóm ({project.teamMembers.length})</span>
                  </div>
                  <div className="flex -space-x-2">
                    {project.teamMembers.slice(0, 3).map((member) => (
                      <div key={member.id} className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-xs font-bold text-blue-600">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    ))}
                    {project.teamMembers.length > 3 && (
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-xs font-bold text-gray-600">
                          +{project.teamMembers.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Instructor & Due Date */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4" />
                    <span>{project.instructor.name}</span>
                  </div>
                  {project.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(project.dueDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {project.feedback.length > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                    <MessageSquare className="h-4 w-4" />
                    <span>{project.feedback.length} phản hồi từ giáo viên</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`/dashboard/stem/${project.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      Xem
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`/dashboard/stem/${project.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Sửa
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy dự án nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc tạo dự án STEM mới
              </p>
              <Button asChild>
                <Link href="/dashboard/stem/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo dự án mới
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentSTEMDashboard;
