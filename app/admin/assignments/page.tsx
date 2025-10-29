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
  FileText, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Send,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Assignment {
  id: string;
  title: string;
  description: string;
  course: string;
  instructor: string;
  dueDate: string;
  assignedDate: string;
  totalStudents: number;
  submittedStudents: number;
  status: "active" | "completed" | "overdue";
  gradeType: "auto" | "manual";
  maxScore: number;
  averageScore: number;
}

const AssignmentsManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [assignments] = useState<Assignment[]>([
    {
      id: "1",
      title: "Bài tập về nhà - Toán lớp 6",
      description: "Giải các bài toán về phân số và số thập phân",
      course: "Toán học lớp 6",
      instructor: "Trần Thị Bình",
      dueDate: "2024-12-25",
      assignedDate: "2024-12-18",
      totalStudents: 45,
      submittedStudents: 38,
      status: "active",
      gradeType: "manual",
      maxScore: 100,
      averageScore: 85.5
    },
    {
      id: "2",
      title: "Thực hành Vật lý - Định luật Ohm",
      description: "Thực hành đo điện trở và kiểm tra định luật Ohm",
      course: "Vật lý lớp 8",
      instructor: "Lê Văn Minh",
      dueDate: "2024-12-22",
      assignedDate: "2024-12-15",
      totalStudents: 32,
      submittedStudents: 32,
      status: "completed",
      gradeType: "auto",
      maxScore: 100,
      averageScore: 92.3
    },
    {
      id: "3",
      title: "Báo cáo Hóa học - Phản ứng hóa học",
      description: "Viết báo cáo về các loại phản ứng hóa học",
      course: "Hóa học lớp 9",
      instructor: "Phạm Thị Lan",
      dueDate: "2024-12-20",
      assignedDate: "2024-12-10",
      totalStudents: 28,
      submittedStudents: 25,
      status: "overdue",
      gradeType: "manual",
      maxScore: 100,
      averageScore: 78.7
    },
    {
      id: "4",
      title: "Essay Tiếng Anh - My Family",
      description: "Viết bài luận về gia đình bằng tiếng Anh",
      course: "Tiếng Anh lớp 7",
      instructor: "John Smith",
      dueDate: "2024-12-30",
      assignedDate: "2024-12-20",
      totalStudents: 40,
      submittedStudents: 12,
      status: "active",
      gradeType: "manual",
      maxScore: 100,
      averageScore: 0
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Đang hoạt động</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Quá hạn</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGradeTypeBadge = (gradeType: string) => {
    switch (gradeType) {
      case "auto":
        return <Badge className="bg-green-100 text-green-800">Tự động</Badge>;
      case "manual":
        return <Badge className="bg-yellow-100 text-yellow-800">Thủ công</Badge>;
      default:
        return <Badge variant="secondary">{gradeType}</Badge>;
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || assignment.course === courseFilter;
    const matchesStatus = statusFilter === "all" || assignment.status === statusFilter;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalAssignments = assignments.length;
  const activeAssignments = assignments.filter(a => a.status === "active").length;
  const completedAssignments = assignments.filter(a => a.status === "completed").length;
  const overdueAssignments = assignments.filter(a => a.status === "overdue").length;
  const totalStudents = assignments.reduce((sum, a) => sum + a.totalStudents, 0);
  const submittedStudents = assignments.reduce((sum, a) => sum + a.submittedStudents, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quản lý bài tập
              </h1>
              <p className="text-gray-600">
                Phân công và theo dõi bài tập về nhà
              </p>
            
              <LanguageSwitcherCompact /></div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tạo bài tập mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng bài tập</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-blue-600">{activeAssignments}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoàn thành</p>
                  <p className="text-2xl font-bold text-green-600">{completedAssignments}</p>
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
                  <p className="text-2xl font-bold text-red-600">{overdueAssignments}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng học sinh</p>
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
                  <p className="text-sm font-medium text-gray-600">Đã nộp</p>
                  <p className="text-2xl font-bold text-orange-600">{submittedStudents}</p>
                </div>
                <Send className="h-8 w-8 text-orange-600" />
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
                    placeholder="Tìm kiếm bài tập..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả khóa học</option>
                  <option value="Toán học lớp 6">Toán học lớp 6</option>
                  <option value="Vật lý lớp 8">Vật lý lớp 8</option>
                  <option value="Hóa học lớp 9">Hóa học lớp 9</option>
                  <option value="Tiếng Anh lớp 7">Tiếng Anh lớp 7</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="overdue">Quá hạn</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách bài tập ({filteredAssignments.length})</CardTitle>
            <CardDescription>
              Quản lý và theo dõi tiến độ nộp bài của học sinh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Bài tập</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Khóa học</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Giáo viên</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Hạn nộp</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tiến độ</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Trạng thái</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{assignment.title}</p>
                          <p className="text-sm text-gray-600 line-clamp-2">{assignment.description}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-900">{assignment.course}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-900">{assignment.instructor}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                          {assignment.dueDate}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{assignment.submittedStudents}/{assignment.totalStudents}</span>
                            <span>{Math.round((assignment.submittedStudents / assignment.totalStudents) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(assignment.submittedStudents / assignment.totalStudents) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {getStatusBadge(assignment.status)}
                          {getGradeTypeBadge(assignment.gradeType)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end">
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
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Tải xuống
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {filteredAssignments.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy bài tập nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc tạo bài tập mới
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo bài tập mới
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AssignmentsManagement;
