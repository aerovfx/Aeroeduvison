'use client';

"use client";

import Link from "next/link";
import { useState, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft,
  ArrowRight,
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
  Bookmark,
  Zap,
  Lock,
  Unlock,
  Download,
  Share,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Flag,
  MoreHorizontal
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
  order: number;
  isCompleted: boolean;
  duration: number; // in minutes
  lessons: number;
  difficulty: "easy" | "medium" | "hard";
  isLocked: boolean;
  progress: number; // 0-100
  thumbnail?: string;
  instructor: string;
  rating: number;
  students: number;
}

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
    bio?: string;
  };
  courses: Course[];
  tags: string[];
  isFeatured: boolean;
  prerequisites: string[];
  learningOutcomes: string[];
  targetAudience: string;
}

const LearningPathDetail = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0);

  // Mock data - in real app, this would be fetched based on resolvedParams.id
  const learningPath: LearningPath = {
    id: resolvedParams.id,
    title: "Lộ trình Toán học từ cơ bản đến nâng cao",
    description: "Học toán từ những khái niệm cơ bản nhất đến các bài toán phức tạp, phù hợp cho học sinh từ lớp 6 đến lớp 12. Lộ trình được thiết kế theo phương pháp học tập tiến bộ, giúp học sinh nắm vững kiến thức từng bước một cách hiệu quả.",
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
      avatar: "/avatars/teacher1.jpg",
      bio: "Giáo viên Toán với 10 năm kinh nghiệm, chuyên gia về phương pháp giảng dạy hiện đại và ứng dụng công nghệ trong giáo dục."
    },
    courses: [
      {
        id: "c1",
        title: "Số tự nhiên và phép tính",
        description: "Học về các số tự nhiên, các phép tính cơ bản và ứng dụng trong thực tế",
        order: 1,
        isCompleted: false,
        duration: 15,
        lessons: 6,
        difficulty: "easy",
        isLocked: false,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.8,
        students: 234
      },
      {
        id: "c2",
        title: "Phân số và số thập phân",
        description: "Khám phá phân số, số thập phân và các phép tính liên quan",
        order: 2,
        isCompleted: false,
        duration: 18,
        lessons: 7,
        difficulty: "easy",
        isLocked: true,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.7,
        students: 189
      },
      {
        id: "c3",
        title: "Hình học cơ bản",
        description: "Học về các hình học cơ bản, tính chu vi, diện tích",
        order: 3,
        isCompleted: false,
        duration: 20,
        lessons: 8,
        difficulty: "medium",
        isLocked: true,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.6,
        students: 156
      },
      {
        id: "c4",
        title: "Đại số sơ cấp",
        description: "Giới thiệu về biến số, phương trình và bất phương trình",
        order: 4,
        isCompleted: false,
        duration: 22,
        lessons: 9,
        difficulty: "medium",
        isLocked: true,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.5,
        students: 134
      },
      {
        id: "c5",
        title: "Hàm số và đồ thị",
        description: "Học về hàm số, đồ thị và ứng dụng trong thực tế",
        order: 5,
        isCompleted: false,
        duration: 25,
        lessons: 10,
        difficulty: "hard",
        isLocked: true,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.4,
        students: 98
      },
      {
        id: "c6",
        title: "Lượng giác",
        description: "Khám phá các hàm lượng giác và ứng dụng",
        order: 6,
        isCompleted: false,
        duration: 20,
        lessons: 5,
        difficulty: "hard",
        isLocked: true,
        progress: 0,
        instructor: "Thầy Nguyễn Minh Toán",
        rating: 4.3,
        students: 76
      }
    ],
    tags: ["Toán học", "Cơ bản", "Nâng cao", "Lớp 6-12"],
    isFeatured: true,
    prerequisites: [
      "Kiến thức toán cơ bản từ lớp 5",
      "Khả năng đọc hiểu tiếng Việt",
      "Máy tính hoặc thiết bị di động có kết nối internet"
    ],
    learningOutcomes: [
      "Nắm vững các khái niệm toán học cơ bản",
      "Thành thạo các phép tính số học",
      "Hiểu và áp dụng được hình học cơ bản",
      "Giải được các bài toán đại số sơ cấp",
      "Vẽ và phân tích được đồ thị hàm số",
      "Ứng dụng được lượng giác trong thực tế"
    ],
    targetAudience: "Học sinh từ lớp 6 đến lớp 12, người muốn củng cố kiến thức toán học cơ bản"
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return <Badge className="bg-green-100 text-green-800">Dễ</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "hard":
        return <Badge className="bg-red-100 text-red-800">Khó</Badge>;
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

  const currentCourse = learningPath.courses[currentCourseIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/learning-path">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{learningPath.title}</h1>
                <p className="text-gray-600">Tạo bởi {learningPath.author.name}</p>
              
              <LanguageSwitcherCompact /></div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/learning-path/${resolvedParams.id}/analytics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/learning-path/${resolvedParams.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Learning Path Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getDifficultyBadge(learningPath.difficulty)}
                      {getStatusBadge(learningPath.status)}
                      {learningPath.isFeatured && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Nổi bật
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      {learningPath.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{learningPath.totalCourses}</p>
                    <p className="text-sm text-gray-600">Khóa học</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{learningPath.totalLessons}</p>
                    <p className="text-sm text-gray-600">Bài học</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{learningPath.estimatedDuration}h</p>
                    <p className="text-sm text-gray-600">Thời gian</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{learningPath.enrolledStudents}</p>
                    <p className="text-sm text-gray-600">Học viên</p>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {learningPath.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Learning Outcomes */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Bạn sẽ học được gì:</h3>
                  <ul className="space-y-2">
                    {learningPath.learningOutcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Prerequisites */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Yêu cầu trước khi học:</h3>
                  <ul className="space-y-2">
                    {learningPath.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Course List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Danh sách khóa học
                </CardTitle>
                <CardDescription>
                  {learningPath.totalCourses} khóa học • {learningPath.totalLessons} bài học • {learningPath.estimatedDuration} giờ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {learningPath.courses.map((course, index) => (
                    <div
                      key={course.id}
                      className={`p-4 border rounded-lg transition-all cursor-pointer ${
                        currentCourseIndex === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${course.isLocked ? 'opacity-60' : ''}`}
                      onClick={() => !course.isLocked && setCurrentCourseIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-600 rounded-full font-bold">
                            {course.order}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{course.title}</h3>
                              {course.isLocked && <Lock className="h-4 w-4 text-gray-400" />}
                              {!course.isLocked && <Unlock className="h-4 w-4 text-green-500" />}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{course.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {course.duration} phút
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {course.lessons} bài
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {course.students} học viên
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1 mb-1">
                              <Star className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-medium">{course.rating}</span>
                            </div>
                            {getDifficultyBadge(course.difficulty)}
                          </div>
                          <Button
                            variant={course.isLocked ? "outline" : "default"}
                            size="sm"
                            disabled={course.isLocked}
                          >
                            {course.isLocked ? (
                              <>
                                <Lock className="h-4 w-4 mr-1" />
                                Khóa
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Bắt đầu
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructor Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Giảng viên
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {learningPath.author.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium">{learningPath.author.name}</h3>
                    <p className="text-sm text-gray-600">{learningPath.category}</p>
                  </div>
                </div>
                {learningPath.author.bio && (
                  <p className="text-sm text-gray-700 mb-4">{learningPath.author.bio}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Đánh giá:</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{learningPath.averageRating}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Thống kê
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Học viên đăng ký:</span>
                  <span className="font-medium">{learningPath.enrolledStudents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tỷ lệ hoàn thành:</span>
                  <span className="font-medium text-green-600">{learningPath.completionRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Đánh giá trung bình:</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{learningPath.averageRating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cập nhật lần cuối:</span>
                  <span className="text-sm">{learningPath.updatedAt}</span>
                </div>
              </CardContent>
            </Card>

            {/* Target Audience */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Đối tượng học
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{learningPath.targetAudience}</p>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Hành động Admin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href={`/admin/learning-path/${resolvedParams.id}/analytics`}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Xem thống kê chi tiết
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/admin/learning-path/${resolvedParams.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa lộ trình
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/admin/learning-path/${resolvedParams.id}/review`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Xem xét nội dung
                  </Link>
                </Button>
                <Button variant="outline" className="w-full">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Phê duyệt lộ trình
                </Button>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <Flag className="h-4 w-4 mr-2" />
                  Báo cáo vi phạm
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPathDetail;
