'use client';

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Users,
  Clock,
  Star,
  Eye,
  Edit,
  Trash2,
  Play
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  category: string;
  status: "published" | "draft" | "archived";
  students: number;
  rating: number;
  duration: string;
  price: number;
  createdAt: string;
  image?: string;
}

const CoursesManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [courses] = useState<Course[]>([
    {
      id: "1",
      title: "Toán học cơ bản",
      description: "Khóa học toán học cơ bản cho học sinh lớp 6-8",
      instructor: "Trần Thị Bình",
      category: "Toán học",
      status: "published",
      students: 245,
      rating: 4.8,
      duration: "12 tuần",
      price: 500000,
      createdAt: "2024-01-15"
    },
    {
      id: "2",
      title: "Vật lý nâng cao",
      description: "Khóa học vật lý nâng cao cho học sinh giỏi",
      instructor: "Lê Văn Minh",
      category: "Vật lý",
      status: "published",
      students: 89,
      rating: 4.9,
      duration: "16 tuần",
      price: 750000,
      createdAt: "2024-02-20"
    },
    {
      id: "3",
      title: "Hóa học hữu cơ",
      description: "Khóa học hóa học hữu cơ từ cơ bản đến nâng cao",
      instructor: "Phạm Thị Lan",
      category: "Hóa học",
      status: "draft",
      students: 0,
      rating: 0,
      duration: "14 tuần",
      price: 600000,
      createdAt: "2024-12-10"
    },
    {
      id: "4",
      title: "Tiếng Anh giao tiếp",
      description: "Khóa học tiếng Anh giao tiếp thực tế",
      instructor: "John Smith",
      category: "Tiếng Anh",
      status: "published",
      students: 156,
      rating: 4.7,
      duration: "10 tuần",
      price: 400000,
      createdAt: "2024-03-05"
    },
    {
      id: "5",
      title: "Lập trình Python",
      description: "Khóa học lập trình Python từ zero đến hero",
      instructor: "Nguyễn Văn Cường",
      category: "Lập trình",
      status: "archived",
      students: 78,
      rating: 4.6,
      duration: "20 tuần",
      price: 800000,
      createdAt: "2024-01-30"
    }
  ]);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || course.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || course.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">Đã xuất bản</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Bản nháp</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Đã lưu trữ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === "published").length;
  const draftCourses = courses.filter(c => c.status === "draft").length;
  const totalStudents = courses.reduce((sum, c) => sum + c.students, 0);
  const totalRevenue = courses.reduce((sum, c) => sum + (c.students * c.price), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quản lý khóa học
              </h1>
              <p className="text-gray-600">
                Tạo và quản lý các khóa học, chương trình học
              </p>
            
              <LanguageSwitcherCompact /></div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tạo khóa học mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng khóa học</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCourses}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã xuất bản</p>
                  <p className="text-2xl font-bold text-green-600">{publishedCourses}</p>
                </div>
                <Play className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bản nháp</p>
                  <p className="text-2xl font-bold text-yellow-600">{draftCourses}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng học viên</p>
                  <p className="text-2xl font-bold text-purple-600">{totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Doanh thu</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(totalRevenue / 1000000).toFixed(1)}M
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-600" />
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
                    placeholder="Tìm kiếm khóa học..."
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
                  <option value="Vật lý">Vật lý</option>
                  <option value="Hóa học">Hóa học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                  <option value="Lập trình">Lập trình</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="draft">Bản nháp</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">
                      {course.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem>Xuất bản</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Course Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Giảng viên:</span>
                      <span className="text-sm font-medium">{course.instructor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Danh mục:</span>
                      <Badge variant="outline">{course.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Trạng thái:</span>
                      {getStatusBadge(course.status)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{course.students}</p>
                      <p className="text-xs text-gray-600">Học viên</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">
                        {course.rating > 0 ? course.rating : "N/A"}
                      </p>
                      <p className="text-xs text-gray-600">Đánh giá</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{course.duration}</p>
                      <p className="text-xs text-gray-600">Thời gian</p>
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-xl font-bold text-green-600">
                        {formatPrice(course.price)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Xem
                      </Button>
                      <Button size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Sửa
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy khóa học nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc tạo khóa học mới
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo khóa học mới
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CoursesManagement;
