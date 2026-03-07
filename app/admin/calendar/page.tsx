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
  Calendar,
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
  Target,
  Award,
  Filter,
  Search,
  Plus,
  ArrowRight,
  Bookmark,
  Zap,
  Lock,
  Unlock,
  AlertCircle,
  Timer,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Calendar as Today,
  List,
  Grid3X3,
  Filter as FilterIcon,
  SortAsc,
  SortDesc
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category: "course" | "quiz" | "assignment" | "user" | "system" | "stem" | "learning-path";
  assignee: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  estimatedHours: number;
  actualHours?: number;
  tags: string[];
  isRecurring: boolean;
  recurringType?: "daily" | "weekly" | "monthly";
  dependencies?: string[];
  progress: number; // 0-100
  comments: Array<{
    id: string;
    author: string;
    content: string;
    createdAt: string;
  }>;
}

const CalendarManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [tasks] = useState<Task[]>([
    {
      id: "1",
      title: "Review và phê duyệt khóa học Toán 6",
      description: "Kiểm tra nội dung, chất lượng video và bài tập của khóa học Toán lớp 6",
      status: "in-progress",
      priority: "high",
      category: "course",
      assignee: {
        id: "admin1",
        name: "Admin Nguyễn Văn A",
        role: "ADMIN"
      },
      dueDate: "2024-12-30",
      createdAt: "2024-12-20",
      updatedAt: "2024-12-22",
      estimatedHours: 8,
      actualHours: 3,
      tags: ["Toán học", "Phê duyệt", "Lớp 6"],
      isRecurring: false,
      progress: 40,
      comments: [
        {
          id: "c1",
          author: "Admin Nguyễn Văn A",
          content: "Đã kiểm tra 3/8 bài học, chất lượng tốt",
          createdAt: "2024-12-22"
        }
      ]
    },
    {
      id: "2",
      title: "Tạo quiz kiểm tra giữa kỳ Vật lý 8",
      description: "Thiết kế bộ câu hỏi trắc nghiệm cho bài kiểm tra giữa kỳ môn Vật lý lớp 8",
      status: "todo",
      priority: "medium",
      category: "quiz",
      assignee: {
        id: "teacher1",
        name: "Thầy Lê Minh Lý",
        role: "TEACHER"
      },
      dueDate: "2025-01-05",
      createdAt: "2024-12-18",
      updatedAt: "2024-12-18",
      estimatedHours: 6,
      tags: ["Vật lý", "Quiz", "Giữa kỳ", "Lớp 8"],
      isRecurring: false,
      progress: 0,
      comments: []
    },
    {
      id: "3",
      title: "Chấm điểm assignment Lập trình Python",
      description: "Chấm điểm và đưa ra feedback cho 45 bài assignment của học sinh",
      status: "completed",
      priority: "high",
      category: "assignment",
      assignee: {
        id: "teacher2",
        name: "Cô Trần Lan Code",
        role: "TEACHER"
      },
      dueDate: "2024-12-25",
      createdAt: "2024-12-15",
      updatedAt: "2024-12-24",
      estimatedHours: 12,
      actualHours: 10,
      tags: ["Python", "Assignment", "Chấm điểm"],
      isRecurring: false,
      progress: 100,
      comments: [
        {
          id: "c2",
          author: "Cô Trần Lan Code",
          content: "Hoàn thành chấm điểm, chất lượng bài làm tốt",
          createdAt: "2024-12-24"
        }
      ]
    },
    {
      id: "4",
      title: "Kiểm tra và cập nhật thông tin người dùng",
      description: "Rà soát và cập nhật thông tin cá nhân của học sinh, giáo viên",
      status: "in-progress",
      priority: "low",
      category: "user",
      assignee: {
        id: "admin2",
        name: "Admin Trần Thị B",
        role: "ADMIN"
      },
      dueDate: "2025-01-10",
      createdAt: "2024-12-10",
      updatedAt: "2024-12-21",
      estimatedHours: 16,
      actualHours: 8,
      tags: ["User Management", "Cập nhật", "Thông tin"],
      isRecurring: true,
      recurringType: "monthly",
      progress: 50,
      comments: [
        {
          id: "c3",
          author: "Admin Trần Thị B",
          content: "Đã cập nhật 150/300 hồ sơ người dùng",
          createdAt: "2024-12-21"
        }
      ]
    },
    {
      id: "5",
      title: "Bảo trì hệ thống và backup dữ liệu",
      description: "Thực hiện bảo trì định kỳ hệ thống và backup dữ liệu quan trọng",
      status: "todo",
      priority: "urgent",
      category: "system",
      assignee: {
        id: "admin1",
        name: "Admin Nguyễn Văn A",
        role: "ADMIN"
      },
      dueDate: "2024-12-28",
      createdAt: "2024-12-20",
      updatedAt: "2024-12-20",
      estimatedHours: 4,
      tags: ["System", "Backup", "Bảo trì"],
      isRecurring: true,
      recurringType: "weekly",
      progress: 0,
      comments: []
    },
    {
      id: "6",
      title: "Phê duyệt dự án STEM Robot dọn rác",
      description: "Xem xét và phê duyệt dự án STEM về robot tự động dọn rác",
      status: "completed",
      priority: "medium",
      category: "stem",
      assignee: {
        id: "admin1",
        name: "Admin Nguyễn Văn A",
        role: "ADMIN"
      },
      dueDate: "2024-12-20",
      createdAt: "2024-12-15",
      updatedAt: "2024-12-19",
      estimatedHours: 3,
      actualHours: 2,
      tags: ["STEM", "Robot", "Phê duyệt"],
      isRecurring: false,
      progress: 100,
      comments: [
        {
          id: "c4",
          author: "Admin Nguyễn Văn A",
          content: "Dự án xuất sắc, đã phê duyệt cho triển lãm",
          createdAt: "2024-12-19"
        }
      ]
    },
    {
      id: "7",
      title: "Tạo lộ trình học Tiếng Anh giao tiếp",
      description: "Thiết kế lộ trình học tiếng Anh giao tiếp từ cơ bản đến nâng cao",
      status: "in-progress",
      priority: "high",
      category: "learning-path",
      assignee: {
        id: "teacher3",
        name: "Cô Sarah Johnson",
        role: "TEACHER"
      },
      dueDate: "2025-01-15",
      createdAt: "2024-12-12",
      updatedAt: "2024-12-22",
      estimatedHours: 20,
      actualHours: 8,
      tags: ["Tiếng Anh", "Giao tiếp", "Lộ trình"],
      isRecurring: false,
      progress: 35,
      comments: [
        {
          id: "c5",
          author: "Cô Sarah Johnson",
          content: "Đã hoàn thành 3/8 khóa học trong lộ trình",
          createdAt: "2024-12-22"
        }
      ]
    },
    {
      id: "8",
      title: "Cập nhật nội dung video Hóa học 9",
      description: "Cập nhật và cải thiện chất lượng video bài giảng Hóa học lớp 9",
      status: "todo",
      priority: "medium",
      category: "course",
      assignee: {
        id: "teacher4",
        name: "Thầy Phạm Minh Hóa",
        role: "TEACHER"
      },
      dueDate: "2025-01-08",
      createdAt: "2024-12-18",
      updatedAt: "2024-12-18",
      estimatedHours: 10,
      tags: ["Hóa học", "Video", "Cập nhật", "Lớp 9"],
      isRecurring: false,
      progress: 0,
      comments: []
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "todo":
        return <Badge className="bg-gray-100 text-gray-800">Chưa làm</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800">Đang làm</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Đã xong</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge className="bg-green-100 text-green-800">Thấp</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">Cao</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Khẩn cấp</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "course":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "quiz":
        return <FileText className="h-4 w-4 text-green-600" />;
      case "assignment":
        return <Edit className="h-4 w-4 text-purple-600" />;
      case "user":
        return <Users className="h-4 w-4 text-orange-600" />;
      case "system":
        return <Settings className="h-4 w-4 text-gray-600" />;
      case "stem":
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case "learning-path":
        return <Target className="h-4 w-4 text-indigo-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "course":
        return "bg-blue-100 text-blue-800";
      case "quiz":
        return "bg-green-100 text-green-800";
      case "assignment":
        return "bg-purple-100 text-purple-800";
      case "user":
        return "bg-orange-100 text-orange-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      case "stem":
        return "bg-yellow-100 text-yellow-800";
      case "learning-path":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignee.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || task.category === categoryFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
  });

  const todoTasks = tasks.filter(t => t.status === "todo").length;
  const inProgressTasks = tasks.filter(t => t.status === "in-progress").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== "completed").length;

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
            <span className="text-gray-900 font-medium">Calendar & Tasks</span>
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/learning-path">
                <Target className="h-4 w-4 mr-2" />
                Learning Path
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/stem">
                <Zap className="h-4 w-4 mr-2" />
                STEM
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
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
                Lịch & Quản lý Công việc
              </h1>
              <p className="text-gray-600">
                Theo dõi và quản lý các công việc, deadline và tiến độ dự án
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4 mr-2" />
                  Danh sách
                </Button>
                <Button
                  variant={viewMode === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Lịch
                </Button>
              </div>
              <Button variant="outline" asChild>
                <Link href="/admin/calendar/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </Link>
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo công việc
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
                  <p className="text-sm font-medium text-gray-600">Tổng công việc</p>
                  <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chưa làm</p>
                  <p className="text-2xl font-bold text-gray-600">{todoTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang làm</p>
                  <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                </div>
                <Play className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã xong</p>
                  <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quá hạn</p>
                  <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
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
                    placeholder="Tìm kiếm công việc..."
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
                  <option value="todo">Chưa làm</option>
                  <option value="in-progress">Đang làm</option>
                  <option value="completed">Đã xong</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="course">Khóa học</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="user">Người dùng</option>
                  <option value="system">Hệ thống</option>
                  <option value="stem">STEM</option>
                  <option value="learning-path">Lộ trình học</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả độ ưu tiên</option>
                  <option value="urgent">Khẩn cấp</option>
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Category Icon */}
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                      {getCategoryIcon(task.category)}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{task.title}</h3>
                        {task.isRecurring && (
                          <Badge variant="outline" className="text-xs">
                            <Timer className="h-3 w-3 mr-1" />
                            {task.recurringType}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{task.description}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                        <Badge className={getCategoryColor(task.category)}>
                          {task.category}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      {task.status === "in-progress" && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Tiến độ</span>
                            <span className="font-medium">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Task Details */}
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{task.assignee.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{task.estimatedHours}h</span>
                        </div>
                        {task.actualHours && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-4 w-4" />
                            <span>Đã dùng: {task.actualHours}h</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {task.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Đánh dấu hoàn thành
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Bắt đầu làm
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy công việc nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc tạo công việc mới
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo công việc mới
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CalendarManagement;
