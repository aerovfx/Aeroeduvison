'use client';

"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  Target,
  Users,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  CheckCircle,
  Play,
  Eye,
  Edit,
  MoreHorizontal,
  Home,
  UserCheck,
  FileText,
  Video,
  Settings,
  BarChart3,
  Award,
  Calendar,
  Filter,
  Search,
  Plus,
  ArrowRight,
  Bookmark,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  totalCourses: number;
  totalLessons: number;
  estimatedDuration: number; // in hours
  enrolledStudents: number;
  completionRate: number;
  averageRating: number;
  status: "active" | "draft" | "archived";
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  courses: Array<{
    id: string;
    title: string;
    order: number;
    isCompleted: boolean;
    duration: number;
  }>;
  tags: string[];
  isFeatured: boolean;
}

const LearningPathManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [learningPaths] = useState<LearningPath[]>([
    {
      id: "1",
      title: "Lộ trình Toán học từ cơ bản đến nâng cao",
      description: "Học toán từ những khái niệm cơ bản nhất đến các bài toán phức tạp, phù hợp cho học sinh từ lớp 6 đến lớp 12",
      category: "Toán học",
      difficulty: "beginner",
      totalCourses: 8,
      totalLessons: 45,
      estimatedDuration: 120,
      enrolledStudents: 234,
      completionRate: 78.5,
      averageRating: 4.7,
      status: "active",
      createdAt: "2024-12-01",
      updatedAt: "2024-12-20",
      author: {
        id: "teacher1",
        name: "Thầy Nguyễn Minh Toán",
        avatar: "/avatars/teacher1.jpg"
      },
      courses: [
        { id: "c1", title: "Số tự nhiên và phép tính", order: 1, isCompleted: false, duration: 15 },
        { id: "c2", title: "Phân số và số thập phân", order: 2, isCompleted: false, duration: 18 },
        { id: "c3", title: "Hình học cơ bản", order: 3, isCompleted: false, duration: 20 },
        { id: "c4", title: "Đại số sơ cấp", order: 4, isCompleted: false, duration: 22 },
        { id: "c5", title: "Hàm số và đồ thị", order: 5, isCompleted: false, duration: 25 },
        { id: "c6", title: "Lượng giác", order: 6, isCompleted: false, duration: 20 }
      ],
      tags: ["Toán học", "Cơ bản", "Nâng cao", "Lớp 6-12"],
      isFeatured: true
    },
    {
      id: "2",
      title: "Tiếng Anh giao tiếp thực tế",
      description: "Lộ trình học tiếng Anh giao tiếp từ cơ bản đến nâng cao, tập trung vào thực hành và ứng dụng thực tế",
      category: "Tiếng Anh",
      difficulty: "intermediate",
      totalCourses: 6,
      totalLessons: 38,
      estimatedDuration: 90,
      enrolledStudents: 189,
      completionRate: 82.3,
      averageRating: 4.8,
      status: "active",
      createdAt: "2024-11-15",
      updatedAt: "2024-12-18",
      author: {
        id: "teacher2",
        name: "Cô Sarah Johnson",
        avatar: "/avatars/teacher2.jpg"
      },
      courses: [
        { id: "c7", title: "Phát âm cơ bản", order: 1, isCompleted: false, duration: 12 },
        { id: "c8", title: "Từ vựng thường dùng", order: 2, isCompleted: false, duration: 15 },
        { id: "c9", title: "Ngữ pháp cơ bản", order: 3, isCompleted: false, duration: 18 },
        { id: "c10", title: "Giao tiếp hàng ngày", order: 4, isCompleted: false, duration: 20 },
        { id: "c11", title: "Giao tiếp công việc", order: 5, isCompleted: false, duration: 15 },
        { id: "c12", title: "Thuyết trình và thảo luận", order: 6, isCompleted: false, duration: 10 }
      ],
      tags: ["Tiếng Anh", "Giao tiếp", "Thực hành", "Ứng dụng"],
      isFeatured: true
    },
    {
      id: "3",
      title: "Lập trình Python từ Zero to Hero",
      description: "Học lập trình Python từ những dòng code đầu tiên đến xây dựng ứng dụng thực tế",
      category: "Lập trình",
      difficulty: "beginner",
      totalCourses: 10,
      totalLessons: 52,
      estimatedDuration: 150,
      enrolledStudents: 156,
      completionRate: 65.4,
      averageRating: 4.6,
      status: "active",
      createdAt: "2024-10-20",
      updatedAt: "2024-12-15",
      author: {
        id: "teacher3",
        name: "Thầy Lê Văn Code",
        avatar: "/avatars/teacher3.jpg"
      },
      courses: [
        { id: "c13", title: "Python cơ bản", order: 1, isCompleted: false, duration: 20 },
        { id: "c14", title: "Biến và kiểu dữ liệu", order: 2, isCompleted: false, duration: 15 },
        { id: "c15", title: "Cấu trúc điều khiển", order: 3, isCompleted: false, duration: 18 },
        { id: "c16", title: "Hàm và module", order: 4, isCompleted: false, duration: 22 },
        { id: "c17", title: "Xử lý file và exception", order: 5, isCompleted: false, duration: 16 },
        { id: "c18", title: "OOP trong Python", order: 6, isCompleted: false, duration: 25 },
        { id: "c19", title: "Thư viện phổ biến", order: 7, isCompleted: false, duration: 20 },
        { id: "c20", title: "Web development với Flask", order: 8, isCompleted: false, duration: 14 }
      ],
      tags: ["Python", "Lập trình", "Web development", "OOP"],
      isFeatured: false
    },
    {
      id: "4",
      title: "Vật lý ứng dụng - Từ lý thuyết đến thực hành",
      description: "Khám phá vật lý qua các thí nghiệm thực tế và ứng dụng trong đời sống hàng ngày",
      category: "Vật lý",
      difficulty: "intermediate",
      totalCourses: 7,
      totalLessons: 42,
      estimatedDuration: 100,
      enrolledStudents: 98,
      completionRate: 71.2,
      averageRating: 4.5,
      status: "active",
      createdAt: "2024-09-10",
      updatedAt: "2024-12-10",
      author: {
        id: "teacher4",
        name: "Thầy Phạm Minh Lý",
        avatar: "/avatars/teacher4.jpg"
      },
      courses: [
        { id: "c21", title: "Cơ học cơ bản", order: 1, isCompleted: false, duration: 18 },
        { id: "c22", title: "Nhiệt động lực học", order: 2, isCompleted: false, duration: 16 },
        { id: "c23", title: "Điện từ học", order: 3, isCompleted: false, duration: 20 },
        { id: "c24", title: "Quang học", order: 4, isCompleted: false, duration: 14 },
        { id: "c25", title: "Sóng và dao động", order: 5, isCompleted: false, duration: 12 },
        { id: "c26", title: "Vật lý hiện đại", order: 6, isCompleted: false, duration: 10 },
        { id: "c27", title: "Thí nghiệm thực hành", order: 7, isCompleted: false, duration: 10 }
      ],
      tags: ["Vật lý", "Thí nghiệm", "Ứng dụng", "Thực hành"],
      isFeatured: false
    }
  ]);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <Badge className="bg-green-100 text-green-800">Cơ bản</Badge>;
      case "intermediate":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "advanced":
        return <Badge className="bg-red-100 text-red-800">Nâng cao</Badge>;
      default:
        return <Badge variant="secondary">{difficulty}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Bản nháp</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Đã lưu trữ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredPaths = learningPaths.filter(path => {
    const matchesSearch = path.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.author.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || path.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || path.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPaths = learningPaths.length;
  const activePaths = learningPaths.filter(p => p.status === "active").length;
  const totalStudents = learningPaths.reduce((sum, p) => sum + p.enrolledStudents, 0);
  const averageCompletionRate = learningPaths.reduce((sum, p) => sum + p.completionRate, 0) / learningPaths.length;
  const averageRating = learningPaths.reduce((sum, p) => sum + p.averageRating, 0) / learningPaths.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/admin/dashboard" className="hover:text-blue-600 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Learning Path Management</span>
          </nav>
        </div>

        {/* Quick Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">
                <UserCheck className="h-4 w-4 mr-2" />
                Users
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Courses
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/quiz">
                <FileText className="h-4 w-4 mr-2" />
                Quiz
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700">
              <Target className="h-4 w-4 mr-2" />
              Learning Path
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/assignments">
                <FileText className="h-4 w-4 mr-2" />
                Assignments
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/video">
                <Video className="h-4 w-4 mr-2" />
                Video
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/permissions">
                <Settings className="h-4 w-4 mr-2" />
                Permissions
              </Link>
            </Button>
          
              <LanguageSwitcherCompact /></div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quản lý Lộ trình học
              </h1>
              <p className="text-gray-600">
                Giám sát và quản lý các lộ trình học do giáo viên thiết kế
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/admin/learning-path/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/learning-path/approve">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Phê duyệt
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
                  <p className="text-sm font-medium text-gray-600">Tổng lộ trình</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPaths}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">{activePaths}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Học viên tham gia</p>
                  <p className="text-2xl font-bold text-purple-600">{totalStudents.toLocaleString()}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tỷ lệ hoàn thành</p>
                  <p className="text-2xl font-bold text-orange-600">{averageCompletionRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đánh giá TB</p>
                  <p className="text-2xl font-bold text-yellow-600">{averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
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
                    placeholder="Tìm kiếm lộ trình học..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="Toán học">Toán học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Lập trình">Lập trình</option>
                  <option value="Vật lý">Vật lý</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="draft">Bản nháp</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Paths Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPaths.map((path) => (
            <Card key={path.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg line-clamp-2">{path.title}</CardTitle>
                      {path.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Nổi bật
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2 mb-3">
                      {path.description}
                    </CardDescription>
                    <div className="flex items-center gap-2 mb-3">
                      {getDifficultyBadge(path.difficulty)}
                      {getStatusBadge(path.status)}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/learning-path/${path.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/learning-path/${path.id}/review`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Xem xét nội dung
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/learning-path/${path.id}/analytics`}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Thống kê
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/learning-path/${path.id}/approve`}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Phê duyệt
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Edit className="mr-2 h-4 w-4" />
                        Tạm dừng
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Author Info */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {path.author.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{path.author.name}</p>
                      <p className="text-xs text-gray-600">{path.category}</p>
                    </div>
                  </div>

                  {/* Path Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{path.totalCourses}</p>
                      <p className="text-xs text-gray-600">Khóa học</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{path.totalLessons}</p>
                      <p className="text-xs text-gray-600">Bài học</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-lg font-bold text-purple-600">{path.estimatedDuration}h</p>
                      <p className="text-xs text-gray-600">Thời gian</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-lg font-bold text-orange-600">{path.enrolledStudents}</p>
                      <p className="text-xs text-gray-600">Học viên</p>
                    </div>
                  </div>

                  {/* Progress & Rating */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tỷ lệ hoàn thành</span>
                      <span className="text-sm font-bold text-green-600">{path.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${path.completionRate}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm font-medium">{path.averageRating}</span>
                      </div>
                      <span className="text-xs text-gray-600">Cập nhật: {path.updatedAt}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {path.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/admin/learning-path/${path.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Xem chi tiết
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <Link href={`/admin/learning-path/${path.id}/analytics`}>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Thống kê
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPaths.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy lộ trình học nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc kiểm tra lại dữ liệu
              </p>
              <Button variant="outline" asChild>
                <Link href="/admin/learning-path/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Xem thống kê tổng quan
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LearningPathManagement;
