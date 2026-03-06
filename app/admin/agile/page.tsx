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
  Kanban, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Circle,
  Calendar,
  User,
  Flag,
  FileText,
  Play,
  Pause,
  RotateCcw
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
  assignee: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in-progress" | "review" | "done";
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  tags: string[];
  createdAt: string;
}

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planning" | "active" | "completed";
  tasks: Task[];
}

const AgileManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [currentSprint] = useState<Sprint>({
    id: "1",
    name: "Sprint 1 - Học kỳ 1",
    startDate: "2024-12-01",
    endDate: "2024-12-31",
    status: "active",
    tasks: [
      {
        id: "1",
        title: "Thiết kế giao diện học tập",
        description: "Tạo mockup và prototype cho giao diện học tập mới",
        assignee: "Trần Thị Bình",
        priority: "high",
        status: "in-progress",
        dueDate: "2024-12-25",
        estimatedHours: 40,
        actualHours: 25,
        tags: ["UI/UX", "Frontend"],
        createdAt: "2024-12-01"
      },
      {
        id: "2",
        title: "Phát triển API backend",
        description: "Xây dựng các API cho hệ thống quản lý khóa học",
        assignee: "Nguyễn Văn Cường",
        priority: "high",
        status: "todo",
        dueDate: "2024-12-28",
        estimatedHours: 60,
        tags: ["Backend", "API"],
        createdAt: "2024-12-01"
      },
      {
        id: "3",
        title: "Viết tài liệu hướng dẫn",
        description: "Tạo tài liệu hướng dẫn sử dụng cho giáo viên",
        assignee: "Lê Thị Mai",
        priority: "medium",
        status: "review",
        dueDate: "2024-12-22",
        estimatedHours: 20,
        actualHours: 18,
        tags: ["Documentation"],
        createdAt: "2024-12-05"
      },
      {
        id: "4",
        title: "Kiểm thử hệ thống",
        description: "Thực hiện testing toàn bộ hệ thống",
        assignee: "Phạm Văn Đức",
        priority: "urgent",
        status: "done",
        dueDate: "2024-12-20",
        estimatedHours: 30,
        actualHours: 32,
        tags: ["Testing", "QA"],
        createdAt: "2024-12-01"
      },
      {
        id: "5",
        title: "Tối ưu hiệu suất",
        description: "Tối ưu hóa hiệu suất database và API",
        assignee: "Hoàng Thị Lan",
        priority: "medium",
        status: "todo",
        dueDate: "2024-12-30",
        estimatedHours: 25,
        tags: [t('analytics.performance'), "Database"],
        createdAt: "2024-12-10"
      }
    ]
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Khẩn cấp</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">Cao</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-800">Thấp</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "medium":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "low":
        return <AlertCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo":
        return <Circle className="h-4 w-4 text-gray-400" />;
      case "in-progress":
        return <Play className="h-4 w-4 text-blue-600" />;
      case "review":
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-gray-100 border-gray-200";
      case "in-progress":
        return "bg-blue-100 border-blue-200";
      case "review":
        return "bg-yellow-100 border-yellow-200";
      case "done":
        return "bg-green-100 border-green-200";
      default:
        return "bg-gray-100 border-gray-200";
    }
  };

  const columns = [
    { id: "todo", title: "To Do", status: "todo" },
    { id: "in-progress", title: "In Progress", status: "in-progress" },
    { id: "review", title: "Review", status: "review" },
    { id: "done", title: "Done", status: "done" }
  ];

  const filteredTasks = currentSprint.tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const todoTasks = filteredTasks.filter(t => t.status === "todo");
  const inProgressTasks = filteredTasks.filter(t => t.status === "in-progress");
  const reviewTasks = filteredTasks.filter(t => t.status === "review");
  const doneTasks = filteredTasks.filter(t => t.status === "done");

  const totalTasks = currentSprint.tasks.length;
  const completedTasks = currentSprint.tasks.filter(t => t.status === "done").length;
  const inProgressCount = currentSprint.tasks.filter(t => t.status === "in-progress").length;
  const overdueTasks = currentSprint.tasks.filter(t => 
    new Date(t.dueDate) < new Date() && t.status !== "done"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Agile Project Management
              </h1>
              <p className="text-gray-600">
                Quản lý kế hoạch, giao bài tập và theo dõi tiến độ dự án
              </p>
            
              <LanguageSwitcherCompact /></div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Tạo Sprint
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Tạo Task
              </Button>
            </div>
          </div>
        </div>

        {/* Sprint Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Kanban className="h-5 w-5 mr-2 text-blue-600" />
                  {currentSprint.name}
                </CardTitle>
                <CardDescription>
                  {currentSprint.startDate} - {currentSprint.endDate}
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
                <p className="text-sm text-gray-600">Tổng tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                <p className="text-sm text-gray-600">Đang thực hiện</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                <p className="text-sm text-gray-600">Hoàn thành</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{overdueTasks}</p>
                <p className="text-sm text-gray-600">Quá hạn</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Tìm kiếm tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
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

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(task => task.status === column.status);
            
            return (
              <div key={column.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {getStatusIcon(column.status)}
                    <span className="ml-2">{column.title}</span>
                    <Badge variant="secondary" className="ml-2">
                      {columnTasks.length}
                    </Badge>
                  </h3>
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 min-h-[400px]">
                  {columnTasks.map((task) => (
                    <Card 
                      key={task.id} 
                      className={`cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(task.status)}`}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Task Header */}
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                                <DropdownMenuItem>Chuyển trạng thái</DropdownMenuItem>
                                <DropdownMenuItem>Gán người khác</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600">
                                  Xóa task
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Priority */}
                          <div className="flex items-center justify-between">
                            {getPriorityIcon(task.priority)}
                            {getPriorityBadge(task.priority)}
                          </div>

                          {/* Assignee */}
                          <div className="flex items-center text-xs text-gray-600">
                            <User className="h-3 w-3 mr-1" />
                            {task.assignee}
                          </div>

                          {/* Due Date */}
                          <div className="flex items-center text-xs text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {task.dueDate}
                          </div>

                          {/* Time Tracking */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {task.actualHours || 0}h / {task.estimatedHours}h
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${((task.actualHours || 0) / task.estimatedHours) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AgileManagement;
