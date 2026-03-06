'use client';

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Clock,
  Star,
  Eye,
  CheckCircle,
  AlertCircle,
  Home,
  UserCheck,
  BookOpen,
  FileText,
  Video,
  Settings,
  Calendar,
  Target,
  Award,
  Activity
} from "lucide-react";

interface QuizAnalytics {
  totalQuizzes: number;
  publishedQuizzes: number;
  draftQuizzes: number;
  totalAttempts: number;
  averageScore: number;
  completionRate: number;
  topPerformingQuizzes: Array<{
    id: string;
    title: string;
    attempts: number;
    averageScore: number;
    completionRate: number;
  }>;
  categoryStats: Array<{
    category: string;
    count: number;
    averageScore: number;
    totalAttempts: number;
  }>;
  dailyStats: Array<{
    date: string;
    attempts: number;
    completions: number;
    averageScore: number;
  }>;
  difficultyStats: Array<{
    difficulty: string;
    count: number;
    averageScore: number;
    completionRate: number;
  }>;
}

const QuizAnalyticsPage = () => {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("7d");

  const analytics: QuizAnalytics = {
    totalQuizzes: 24,
    publishedQuizzes: 18,
    draftQuizzes: 6,
    totalAttempts: 1247,
    averageScore: 78.5,
    completionRate: 85.2,
    topPerformingQuizzes: [
      {
        id: "1",
        title: "Kiểm tra Toán lớp 6 - Chương 1",
        attempts: 156,
        averageScore: 85.5,
        completionRate: 92.3
      },
      {
        id: "2",
        title: "Tiếng Anh 7 - Thì hiện tại đơn",
        attempts: 234,
        averageScore: 91.2,
        completionRate: 88.7
      },
      {
        id: "3",
        title: "Vật lý 8 - Định luật Newton",
        attempts: 89,
        averageScore: 72.3,
        completionRate: 79.8
      }
    ],
    categoryStats: [
      {
        category: "Toán học",
        count: 8,
        averageScore: 82.1,
        totalAttempts: 456
      },
      {
        category: "Tiếng Anh",
        count: 6,
        averageScore: 87.3,
        totalAttempts: 389
      },
      {
        category: "Vật lý",
        count: 5,
        averageScore: 74.8,
        totalAttempts: 234
      },
      {
        category: "Hóa học",
        count: 5,
        averageScore: 71.2,
        totalAttempts: 168
      }
    ],
    dailyStats: [
      { date: "2024-12-20", attempts: 45, completions: 38, averageScore: 79.2 },
      { date: "2024-12-21", attempts: 52, completions: 44, averageScore: 81.5 },
      { date: "2024-12-22", attempts: 38, completions: 32, averageScore: 76.8 },
      { date: "2024-12-23", attempts: 41, completions: 35, averageScore: 78.9 },
      { date: "2024-12-24", attempts: 29, completions: 25, averageScore: 82.1 },
      { date: "2024-12-25", attempts: 18, completions: 15, averageScore: 85.3 },
      { date: "2024-12-26", attempts: 47, completions: 40, averageScore: 77.6 }
    ],
    difficultyStats: [
      {
        difficulty: "Dễ",
        count: 12,
        averageScore: 89.2,
        completionRate: 94.5
      },
      {
        difficulty: "Trung bình",
        count: 8,
        averageScore: 76.8,
        completionRate: 82.3
      },
      {
        difficulty: "Khó",
        count: 4,
        averageScore: 65.4,
        completionRate: 71.2
      }
    ]
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Dễ":
        return "bg-green-100 text-green-800";
      case "Trung bình":
        return "bg-yellow-100 text-yellow-800";
      case "Khó":
        return "bg-red-100 text-red-800";
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
            <a href="/admin/dashboard" className="hover:text-blue-600 flex items-center">
              <Home className="h-4 w-4 mr-1" />
              Dashboard
            </a>
            <span>/</span>
            <a href="/admin/quiz" className="hover:text-blue-600">Quiz Management</a>
            <span>/</span>
            <span className="text-gray-900 font-medium">{t('analytics.title')}</span>
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
            <Button variant="outline" size="sm" asChild>
              <a href="/admin/quiz">
                <FileText className="h-4 w-4 mr-2" />
                Quiz
              </a>
            </Button>
            <Button variant="outline" size="sm" className="bg-blue-50 border-blue-200 text-blue-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
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
                Thống kê Quiz
              </h1>
              <p className="text-gray-600">
                Phân tích hiệu suất và xu hướng của các bài kiểm tra
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
                <a href="/admin/quiz">
                  <FileText className="h-4 w-4 mr-2" />
                  Quay lại Quiz
                </a>
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
                  <p className="text-sm font-medium text-gray-600">Tổng Quiz</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalQuizzes}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12% so với tháng trước
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng lượt làm</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalAttempts.toLocaleString()}</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8% so với tháng trước
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
                  <p className="text-sm font-medium text-gray-600">Điểm TB</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
                  <p className="text-xs text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +2.3% so với tháng trước
                  </p>
                </div>
                <Target className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tỷ lệ hoàn thành</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
                  <p className="text-xs text-red-600 flex items-center mt-1">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -1.2% so với tháng trước
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Quizzes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2 text-yellow-600" />
                Quiz hiệu suất cao nhất
              </CardTitle>
              <CardDescription>
                Top 3 quiz có điểm trung bình cao nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topPerformingQuizzes.map((quiz, index) => (
                  <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{quiz.title}</p>
                        <p className="text-xs text-gray-600">{quiz.attempts} lượt làm</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{quiz.averageScore}%</p>
                      <p className="text-xs text-gray-600">{quiz.completionRate}% hoàn thành</p>
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
                      <span className="font-medium text-sm">{category.category}</span>
                      <span className="text-sm text-gray-600">{category.count} quiz</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Điểm TB: {category.averageScore}%</span>
                      <span>{category.totalAttempts} lượt làm</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${category.averageScore}%` }}
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
              Thống kê hiệu suất theo mức độ khó của quiz
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
                      <p className="text-sm text-gray-600">Quiz</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-600">{stat.averageScore}%</p>
                      <p className="text-sm text-gray-600">Điểm TB</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-blue-600">{stat.completionRate}%</p>
                      <p className="text-sm text-gray-600">Hoàn thành</p>
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
              Xu hướng lượt làm quiz và điểm số theo ngày
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
                      <p className="text-xs text-gray-600">{day.attempts} lượt làm</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-green-600">{day.completions}</p>
                      <p className="text-xs text-gray-600">Hoàn thành</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-blue-600">{day.averageScore}%</p>
                      <p className="text-xs text-gray-600">Điểm TB</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-purple-600">
                        {((day.completions / day.attempts) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-600">Tỷ lệ HT</p>
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

export default QuizAnalyticsPage;
