'use client';

"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  Target,
  Users,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Award,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Home,
  UserCheck,
  FileText,
  Video,
  Settings,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";

interface LearningPathAnalytics {
  totalPaths: number;
  activePaths: number;
  totalStudents: number;
  averageCompletionRate: number;
  averageRating: number;
  totalCourses: number;
  totalLessons: number;
  totalStudyTime: number;
  topPerformingPaths: Array<{
    id: string;
    title: string;
    students: number;
    completionRate: number;
    rating: number;
    category: string;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
    students: number;
    completionRate: number;
    averageRating: number;
  }>;
  difficultyStats: Array<{
    difficulty: string;
    count: number;
    students: number;
    completionRate: number;
    averageRating: number;
  }>;
  dailyStats: Array<{
    date: string;
    newEnrollments: number;
    completions: number;
    studyTime: number;
  }>;
  instructorStats: Array<{
    id: string;
    name: string;
    paths: number;
    students: number;
    averageRating: number;
    completionRate: number;
  }>;
}

const LearningPathAnalyticsPage = () => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("30d");

  const analytics: LearningPathAnalytics = {
    totalPaths: 4,
    activePaths: 4,
    totalStudents: 677,
    averageCompletionRate: 74.4,
    averageRating: 4.7,
    totalCourses: 31,
    totalLessons: 177,
    totalStudyTime: 460,
    topPerformingPaths: [
      {
        id: "1",
        title: "Lộ trình Toán học từ cơ bản đến nâng cao",
        students: 234,
        completionRate: 78.5,
        rating: 4.7,
        category: "Toán học"
      },
      {
        id: "2",
        title: "Tiếng Anh giao tiếp thực tế",
        students: 189,
        completionRate: 82.3,
        rating: 4.8,
        category: "Tiếng Anh"
      },
      {
        id: "3",
        title: "Lập trình Python từ Zero to Hero",
        students: 156,
        completionRate: 65.4,
        rating: 4.6,
        category: "Lập trình"
      }
    ],
    categoryStats: [
      {
        category: "Toán học",
        count: 1,
        students: 234,
        completionRate: 78.5,
        averageRating: 4.7
      },
      {
        category: "Tiếng Anh",
        count: 1,
        students: 189,
        completionRate: 82.3,
        averageRating: 4.8
      },
      {
        category: "Lập trình",
        count: 1,
        students: 156,
        completionRate: 65.4,
        averageRating: 4.6
      },
      {
        category: "Vật lý",
        count: 1,
        students: 98,
        completionRate: 71.2,
        averageRating: 4.5
      }
    ],
    difficultyStats: [
      {
        difficulty: "Cơ bản",
        count: 2,
        students: 390,
        completionRate: 72.0,
        averageRating: 4.7
      },
      {
        difficulty: "Trung bình",
        count: 2,
        students: 287,
        completionRate: 76.8,
        averageRating: 4.7
      },
      {
        difficulty: "Nâng cao",
        count: 0,
        students: 0,
        completionRate: 0,
        averageRating: 0
      }
    ],
    dailyStats: [
      { date: "2024-12-20", newEnrollments: 12, completions: 8, studyTime: 45 },
      { date: "2024-12-21", newEnrollments: 15, completions: 11, studyTime: 52 },
      { date: "2024-12-22", newEnrollments: 8, completions: 6, studyTime: 38 },
      { date: "2024-12-23", newEnrollments: 18, completions: 13, studyTime: 61 },
      { date: "2024-12-24", newEnrollments: 6, completions: 4, studyTime: 29 },
      { date: "2024-12-25", newEnrollments: 3, completions: 2, studyTime: 18 },
      { date: "2024-12-26", newEnrollments: 11, completions: 9, studyTime: 47 }
    ],
    instructorStats: [
      {
        id: "teacher1",
        name: "Thầy Nguyễn Minh Toán",
        paths: 1,
        students: 234,
        averageRating: 4.7,
        completionRate: 78.5
      },
      {
        id: "teacher2",
        name: "Cô Sarah Johnson",
        paths: 1,
        students: 189,
        averageRating: 4.8,
        completionRate: 82.3
      },
      {
        id: "teacher3",
        name: "Thầy Lê Văn Code",
        paths: 1,
        students: 156,
        averageRating: 4.6,
        completionRate: 65.4
      },
      {
        id: "teacher4",
        name: "Thầy Phạm Minh Lý",
        paths: 1,
        students: 98,
        averageRating: 4.5,
        completionRate: 71.2
      }
    ]
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Cơ bản":
        return "bg-green-100 text-green-800";
      case "Trung bình":
        return "bg-yellow-100 text-yellow-800";
      case "Nâng cao":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Toán học":
        return "bg-blue-100 text-blue-800";
      case "Tiếng Anh":
        return "bg-green-100 text-green-800";
      case "Lập trình":
        return "bg-purple-100 text-purple-800";
      case "Vật lý":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
            <Link href="/admin/learning-path" className="hover:text-blue-600">Learning Path</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{t('analytics.title')}</span>
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
            <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
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
                Thống kê Lộ trình học
              </h1>
              <p className="text-gray-600">
                Phân tích hiệu suất và xu hướng của các lộ trình học
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="90d">90 ngày qua</option>
                <option value="1y">1 năm qua</option>
              </select>
              <Button variant="outline" asChild>
                <Link href="/admin/learning-path">
                  <Target className="h-4 w-4 mr-2" />
                  Quay lại Learning Path
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng lộ trình</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalPaths}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +2 so với tháng trước
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng học viên</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalStudents.toLocaleString()}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +15% so với tháng trước
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tỷ lệ hoàn thành</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.averageCompletionRate}%</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +3.2% so với tháng trước
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đánh giá TB</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.averageRating}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +0.1 so với tháng trước
                  </p>
                </div>
                <Star className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Paths */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Lộ trình hiệu suất cao nhất
              </CardTitle>
              <CardDescription>
                Top 3 lộ trình có tỷ lệ hoàn thành cao nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPerformingPaths.map((path, index) => (
                  <div key={path.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{path.title}</p>
                        <p className="text-xs text-gray-600">{path.students} học viên</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{path.completionRate}%</p>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span className="text-xs">{path.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Hiệu suất theo danh mục
              </CardTitle>
              <CardDescription>
                Thống kê theo từng môn học
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.categoryStats.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getCategoryColor(category.category)}>
                          {category.category}
                        </Badge>
                        <span className="text-sm font-medium">{category.count} lộ trình</span>
                      </div>
                      <span className="text-sm text-gray-600">{category.students} học viên</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Hoàn thành: {category.completionRate}%</span>
                      <div className="flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        <span>{category.averageRating}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${category.completionRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Difficulty Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-600" />
              Phân tích theo độ khó
            </CardTitle>
            <CardDescription>
              Thống kê hiệu suất theo mức độ khó của lộ trình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {analytics.difficultyStats.map((stat, index) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                  <Badge className={`mb-3 ${getDifficultyColor(stat.difficulty)}`}>
                    {stat.difficulty}
                  </Badge>
                  <div className="space-y-2">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                      <p className="text-sm text-gray-600">Lộ trình</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600">{stat.students}</p>
                      <p className="text-sm text-gray-600">Học viên</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{stat.completionRate}%</p>
                      <p className="text-sm text-gray-600">Hoàn thành</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-yellow-600">{stat.averageRating}</p>
                      <p className="text-sm text-gray-600">Đánh giá</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructor Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Hiệu suất Giảng viên
            </CardTitle>
            <CardDescription>
              Thống kê hiệu suất của các giảng viên tạo lộ trình
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.instructorStats.map((instructor, index) => (
                <div key={instructor.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-sm font-bold text-blue-600">
                        {instructor.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{instructor.name}</p>
                      <p className="text-sm text-gray-600">{instructor.paths} lộ trình • {instructor.students} học viên</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{instructor.completionRate}%</p>
                      <p className="text-xs text-gray-600">Hoàn thành</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold">{instructor.averageRating}</span>
                      </div>
                      <p className="text-xs text-gray-600">Đánh giá</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              Hoạt động hàng ngày (7 ngày qua)
            </CardTitle>
            <CardDescription>
              Xu hướng đăng ký mới và hoàn thành lộ trình theo ngày
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.dailyStats.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {new Date(day.date).getDate()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(day.date).toLocaleDateString('vi-VN', { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-gray-600">{day.studyTime}h học tập</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{day.newEnrollments}</p>
                      <p className="text-xs text-gray-600">Đăng ký mới</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-blue-600">{day.completions}</p>
                      <p className="text-xs text-gray-600">Hoàn thành</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">{day.studyTime}h</p>
                      <p className="text-xs text-gray-600">Thời gian học</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LearningPathAnalyticsPage;
