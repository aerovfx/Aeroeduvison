'use client';

"use client";

import LinkIcon from "next/link";
import { useState, use, useEffect } from "react";
import { useSTEM } from "@/contexts/STEMContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft,
  Edit,
  Share,
  Download,
  Calendar,
  Users,
  Clock,
  Star,
  MessageSquare,
  Bookmark,
  Zap,
  FlaskConical,
  Cpu,
  Wrench,
  Calculator,
  UserCheck,
  FileText,
  Image,
  Video,
  LinkIcon as LinkIconIcon,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  Home,
  BookOpen,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Play,
  Timer
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  dueDate: string;
  deliverables: Array<{
    id: string;
    title: string;
    type: "image" | "video" | "document" | "code" | "presentation";
    url: string;
    description: string;
  }>;
  completedAt?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface STEMProject {
  id: string;
  title: string;
  description: string;
  category: "Science" | "Technology" | "Engineering" | "Math";
  status: "draft" | "in-progress" | "review" | "completed" | "published";
  teamMembers: TeamMember[];
  instructor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  progress: number;
  milestones: Milestone[];
  resources: Array<{
    id: string;
    title: string;
    type: "document" | "image" | "video" | "link";
    url: string;
  }>;
  notes: string;
  isPublic: boolean;
  thumbnail?: string;
  feedback: Array<{
    id: string;
    author: string;
    content: string;
    type: "suggestion" | "approval" | "revision" | "question";
    date: string;
    isResolved: boolean;
  }>;
}

const STEMProjectDetail = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [project, setProject] = useState<STEMProject | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { getProject, projects } = useSTEM();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        console.log('Looking for project ID:', resolvedParams.id);
        
        // Try to get project from context
        const fetchedProject = await getProject(resolvedParams.id);
        
        if (fetchedProject) {
          console.log('Found project:', fetchedProject.title);
          setProject(fetchedProject);
        } else {
          console.log('Project not found, using first available project for demo');
          // For demo purposes, if specific project not found, show first project
          if (projects && projects.length > 0) {
            setProject(projects[0]);
          } else {
            setProject(null);
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [resolvedParams.id, getProject]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
                    <p className="text-gray-600">Đang tải dự án...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy dự án</h1>
            <p className="text-gray-600 mb-2">Dự án với ID <code className="bg-gray-100 px-2 py-1 rounded text-sm">{resolvedParams.id}</code> không tồn tại.</p>
            <p className="text-sm text-gray-500">Có thể dự án đã bị xóa hoặc ID không chính xác.</p>
          </div>
          <div className="space-y-3">
            <Button asChild className="w-full">
              <LinkIcon href="/dashboard/stem">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại danh sách dự án
              </LinkIcon>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <LinkIcon href="/dashboard/stem/create">
                <Plus className="h-4 w-4 mr-2" />
                Tạo dự án mới
              </LinkIcon>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        return <FlaskConical className="h-6 w-6 text-blue-600" />;
      case "Technology":
        return <Cpu className="h-6 w-6 text-green-600" />;
      case "Engineering":
        return <Wrench className="h-6 w-6 text-orange-600" />;
      case "Math":
        return <Calculator className="h-6 w-6 text-purple-600" />;
      default:
        return <Zap className="h-6 w-6 text-gray-600" />;
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

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" href="#" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case "suggestion":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "approval":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "revision":
        return <Edit className="h-4 w-4 text-orange-500" />;
      case "question":
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <LinkIcon href="/dashboard/stem">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </LinkIcon>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                <p className="text-gray-600">Chi tiết dự án STEM • {project.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <LinkIcon href={`/dashboard/stem/${resolvedParams.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </LinkIcon>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <LinkIcon href={`/dashboard/stem/${resolvedParams.id}/timeline`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </LinkIcon>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Share className="mr-2 h-4 w-4" />
                    Chia sẻ
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 h-4 w-4" />
                    Xuất PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Xóa dự án
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  {getCategoryIcon(project.category)}
                  {getStatusBadge(project.status)}
                  <Badge className={getCategoryColor(project.category)}>
                    {project.category}
                  </Badge>
                  <Badge className={getDifficultyColor(project.difficulty)}>
                    {project.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">{project.title}</CardTitle>
                <CardDescription className="text-base">{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Tiến độ dự án
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Tổng tiến độ</span>
                    <span className="text-sm font-bold text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {project.milestones?.filter(m => m.status === "completed").length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Hoàn thành</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {project.milestones?.filter(m => m.status === "in-progress").length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Đang làm</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-600">
                        {project.milestones?.filter(m => m.status === "pending").length || 0}
                      </p>
                      <p className="text-sm text-gray-600">Chờ làm</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Các giai đoạn dự án
                </CardTitle>
                <CardDescription>
                  {project.milestones?.length || 0} giai đoạn • {project.milestones?.filter(m => m.status === "completed").length || 0} hoàn thành
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.milestones?.map((milestone, index) => (
                    <div key={milestone.id} className="relative">
                      {/* Timeline Line */}
                      {index < (project.milestones?.length || 0) - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                      )}
                      
                      <div className="relative flex gap-4">
                        {/* Status Icon */}
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                          milestone.status === "completed" 
                            ? "bg-green-100 border-green-500" 
                            : milestone.status === "in-progress"
                            ? "bg-blue-100 border-blue-500"
                            : "bg-gray-100 border-gray-300"
                        }`}>
                          {getMilestoneStatusIcon(milestone.status)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedMilestone(milestone as unknown as Milestone)}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{milestone.title}</CardTitle>
                                <Badge className={
                                  milestone.status === "completed" ? "bg-green-100 text-green-800" :
                                  milestone.status === "in-progress" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                                }>
                                  {milestone.status}
                                </Badge>
                              </div>
                              <CardDescription>{milestone.description}</CardDescription>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                                {milestone.status === "completed" && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>Hoàn thành</span>
                                  </div>
                                )}
                              </div>
                            </CardHeader>
                            {milestone.deliverables.length > 0 && (
                              <CardContent className="pt-0">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FileText className="h-4 w-4" />
                                  <span>{milestone.deliverables.length} sản phẩm</span>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Tài liệu tham khảo
                </CardTitle>
                <CardDescription>
                  {project.milestones?.length || 0} giai đoạn trong dự án
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.milestones?.map((milestone) => (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      {getMilestoneStatusIcon(milestone.status)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{milestone.title}</p>
                        <p className="text-xs text-gray-600">{milestone.description}</p>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {project.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Ghi chú
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Nhóm dự án
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.teamMembers?.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Instructor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Giảng viên hướng dẫn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-green-600">
                      {project.instructor.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{project.instructor.name}</p>
                    <p className="text-sm text-gray-600">{project.instructor.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Thông tin dự án
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tạo lúc:</span>
                  <span>{new Date(project.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Cập nhật:</span>
                  <span>{new Date(project.updatedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Hạn nộp:</span>
                  <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString('vi-VN') : 'Chưa xác định'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Công khai:</span>
                  <Badge className={project.isPublic ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                    {project.isPublic ? "Có" : "Không"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            {(project.feedback?.length || 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Phản hồi từ giáo viên
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.feedback?.map((feedback) => (
                      <div key={feedback.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          {getFeedbackTypeIcon(feedback.type)}
                          <span className="text-sm font-medium capitalize">{feedback.type}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(feedback.date).toLocaleDateString('vi-VN')}
                          </span>
                          {feedback.type === "approval" && (
                            <Badge className="bg-green-100 text-green-800 text-xs">Đã phê duyệt</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{feedback.content}</p>
                        <p className="text-xs text-gray-500 mt-1">- {feedback.author}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {getMilestoneStatusIcon(selectedMilestone.status)}
                    {selectedMilestone.title}
                  </CardTitle>
                  <CardDescription>{selectedMilestone.description}</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedMilestone(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Hạn nộp:</span>
                    <p className="font-medium">{new Date(selectedMilestone.dueDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  {selectedMilestone.completedAt && (
                    <div>
                      <span className="text-gray-600">Hoàn thành:</span>
                      <p className="font-medium">{new Date(selectedMilestone.completedAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  )}
                </div>

                {selectedMilestone.deliverables.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Sản phẩm:</h4>
                    <div className="space-y-2">
                      {selectedMilestone.deliverables.map((deliverable) => (
                        <div key={deliverable.id} className="flex items-center gap-3 p-2 border rounded">
                          {getResourceIcon(deliverable.type)}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{deliverable.title}</p>
                            <p className="text-xs text-gray-600">{deliverable.description}</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default STEMProjectDetail;
