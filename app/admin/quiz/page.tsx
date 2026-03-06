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
  HelpCircle, 
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
  Play,
  CheckCircle,
  AlertCircle,
  Home,
  UserCheck,
  BookOpen,
  FileText,
  Video,
  Settings,
  BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  questions: number;
  duration: number;
  attempts: number;
  averageScore: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  author: string;
}

const QuizManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [quizzes] = useState<Quiz[]>([
    {
      id: "1",
      title: "Kiểm tra Toán lớp 6 - Chương 1",
      description: "Bài kiểm tra về số tự nhiên và các phép tính cơ bản",
      category: "Toán học",
      difficulty: "easy",
      questions: 20,
      duration: 45,
      attempts: 156,
      averageScore: 85.5,
      status: "published",
      createdAt: "2024-12-15",
      author: "Trần Thị Bình"
    },
    {
      id: "2",
      title: "Vật lý 8 - Định luật Newton",
      description: "Kiểm tra kiến thức về các định luật Newton",
      category: "Vật lý",
      difficulty: "medium",
      questions: 15,
      duration: 60,
      attempts: 89,
      averageScore: 72.3,
      status: "published",
      createdAt: "2024-12-10",
      author: "Lê Văn Minh"
    },
    {
      id: "3",
      title: "Hóa học 9 - Phản ứng oxi hóa khử",
      description: "Bài kiểm tra về phản ứng oxi hóa khử và cân bằng phương trình",
      category: "Hóa học",
      difficulty: "hard",
      questions: 25,
      duration: 90,
      attempts: 45,
      averageScore: 68.7,
      status: "draft",
      createdAt: "2024-12-18",
      author: "Phạm Thị Lan"
    },
    {
      id: "4",
      title: "Tiếng Anh 7 - Thì hiện tại đơn",
      description: "Kiểm tra ngữ pháp về thì hiện tại đơn",
      category: "Tiếng Anh",
      difficulty: "easy",
      questions: 18,
      duration: 30,
      attempts: 234,
      averageScore: 91.2,
      status: "published",
      createdAt: "2024-12-05",
      author: "John Smith"
    }
  ]);

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-800">Dễ</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-800">Khó</Badge>;
      default:
        return <Badge variant="secondary">{difficulty}</Badge>;
    }
  };

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

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || quiz.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || quiz.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter(q => q.status === "published").length;
  const draftQuizzes = quizzes.filter(q => q.status === "draft").length;
  const totalAttempts = quizzes.reduce((sum, q) => sum + q.attempts, 0);
  const averageScore = quizzes.reduce((sum, q) => sum + q.averageScore, 0) / quizzes.length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <a href="/admin/dashboard" className="hover:text-blue-600 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </a>
            <span>/</span>
            <span className="text-gray-900 font-medium">Quiz Management</span>
          </nav>
        </div>

        {/* Quick Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/dashboard">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/users">
                <UserCheck className="h-4 w-4 mr-2" />
                Users
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/courses">
                <BookOpen className="h-4 w-4 mr-2" />
                Courses
              </a>
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              Quiz
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/assignments">
                <FileText className="h-4 w-4 mr-2" />
                Assignments
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/video">
                <Video className="h-4 w-4 mr-2" />
                Video
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/permissions">
                <Settings className="h-4 w-4 mr-2" />
                Permissions
              </a>
            </Button>
          
              <LanguageSwitcherCompact /></div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quản lý bài kiểm tra
              </h1>
              <p className="text-gray-600">
                Quản lý và giám sát các bài quiz, kiểm tra, đề thi trong hệ thống
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <a href="/admin/quiz/import">
                  <Plus className="h-4 w-4 mr-2" />
                  Import Quiz
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/admin/quiz/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê tổng quan
                </a>
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
                  <p className="text-sm font-medium text-gray-600">Tổng bài kiểm tra</p>
                  <p className="text-2xl font-bold text-gray-900">{totalQuizzes}</p>
                </div>
                <HelpCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã xuất bản</p>
                  <p className="text-2xl font-bold text-green-600">{publishedQuizzes}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bản nháp</p>
                  <p className="text-2xl font-bold text-yellow-600">{draftQuizzes}</p>
                </div>
                <Edit className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng lượt làm</p>
                  <p className="text-2xl font-bold text-purple-600">{totalAttempts}</p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Điểm TB</p>
                  <p className="text-2xl font-bold text-orange-600">{averageScore.toFixed(1)}%</p>
                </div>
                <Star className="h-8 w-8 text-orange-600" />
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
                    placeholder="Tìm kiếm bài kiểm tra..."
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

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{quiz.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">
                      {quiz.description}
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
                      <DropdownMenuItem asChild>
                        <a href={`/admin/quiz/${quiz.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/admin/quiz/${quiz.id}/review`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Xem xét nội dung
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/admin/quiz/${quiz.id}/approve`}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Phê duyệt
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/admin/quiz/${quiz.id}/suspend`}>
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Tạm dừng
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href={`/admin/quiz/${quiz.id}/analytics`}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Xem thống kê
                        </a>
                      </DropdownMenuItem>
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
                  {/* Quiz Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Danh mục:</span>
                      <Badge variant="outline">{quiz.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Độ khó:</span>
                      {getDifficultyBadge(quiz.difficulty)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Trạng thái:</span>
                      {getStatusBadge(quiz.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Tác giả:</span>
                      <span className="text-sm font-medium">{quiz.author}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{quiz.questions}</p>
                      <p className="text-xs text-gray-600">Câu hỏi</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{quiz.duration}p</p>
                      <p className="text-xs text-gray-600">Thời gian</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{quiz.attempts}</p>
                      <p className="text-xs text-gray-600">Lượt làm</p>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Điểm trung bình</span>
                      <span className="text-lg font-bold text-green-600">{quiz.averageScore}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${quiz.averageScore}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href={`/admin/quiz/${quiz.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Xem chi tiết
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" asChild>
                      <a href={`/admin/quiz/${quiz.id}/analytics`}>
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Thống kê
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuizzes.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy bài kiểm tra nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc kiểm tra lại dữ liệu
              </p>
              <Button variant="outline" asChild>
                <a href="/admin/quiz/import">
                  <Plus className="h-4 w-4 mr-2" />
                  Import Quiz từ file
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuizManagement;
