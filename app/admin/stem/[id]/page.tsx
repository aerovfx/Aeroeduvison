'use client';

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  ArrowLeft, Calendar, Clock, Users, User, MessageSquare, CheckCircle, Circle, 
  FileText, Image, Video, Code, Download, Star, TrendingUp, Award, BookOpen,
  RefreshCw, Edit, Trash2, Eye, EyeOff
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDataSync } from "@/contexts/DataSyncContext";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

interface STEMProjectDetailProps {
  params: Promise<{ id: string }>;
}

const STEMProjectDetail = ({ params }: STEMProjectDetailProps) => {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { syncData, syncSTEMProjects, isLoading } = useDataSync();
  const [project, setProject] = useState<any>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"approval" | "revision" | "suggestion">("suggestion");

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    // Find project from syncData
    const foundProject = syncData.stemProjects.find(p => p.id === resolvedParams.id);
    if (foundProject) {
      setProject(foundProject);
    } else {
      // Project not found, redirect back
      router.push("/admin/stem");
    }
  }, [session, status, router, resolvedParams.id, syncData.stemProjects]);

  if (status === "loading" || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900">
              <LanguageSwitcherCompact /></div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "in-progress":
        return "Đang thực hiện";
      case "review":
        return "Chờ đánh giá";
      default:
        return "Chưa bắt đầu";
    }
  };

  const getMilestoneStatusIcon = (index: number, completedMilestones: number) => {
    if (index < completedMilestones) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (index === completedMilestones) {
      return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const handleAddFeedback = () => {
  const { t } = useLanguage();
    if (!feedbackText.trim()) return;

    // In a real app, this would save to backend
    console.log("Adding feedback:", {
      projectId: project.id,
      type: feedbackType,
      content: feedbackText,
      author: "Admin",
      date: new Date().toISOString()
    });

    setFeedbackText("");
    setFeedbackType("suggestion");
    setShowFeedbackDialog(false);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 mr-2" />
          Quay lại danh sách
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncSTEMProjects}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Chỉnh sửa
          </Button>
        </div>
      </div>

      {/* Project Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{project.title}</CardTitle>
                  <CardDescription>Dự án STEM của {project.studentName}</CardDescription>
                </div>
                <Badge className={`${getStatusColor(project.status)} px-3 py-1`}>
                  {getStatusText(project.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Học sinh</p>
                  <p className="text-lg font-semibold">{project.studentName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ngày tạo</p>
                  <p className="text-lg font-semibold">
                    {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cập nhật cuối</p>
                  <p className="text-lg font-semibold">
                    {new Date(project.updatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tiến độ</p>
                  <div className="flex items-center gap-2">
                    <Progress value={(project.completedMilestones / project.milestones) * 100} className="flex-1" />
                    <span className="text-sm font-medium">
                      {project.completedMilestones}/{project.milestones}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestones Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lộ trình dự án
              </CardTitle>
              <CardDescription>Các giai đoạn phát triển dự án</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-8">
                <div className="absolute left-4 top-0 bottom-0 w-1 bg-gray-200 rounded-full" />
                {Array.from({ length: project.milestones }, (_, index) => (
                  <div key={index} className="mb-8 relative">
                    <div className="absolute left-0 -ml-4 mt-1">
                      {getMilestoneStatusIcon(index, project.completedMilestones)}
                    </div>
                    <div className="ml-8">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        Giai đoạn {index + 1}
                        <Badge 
                          variant={
                            index < project.completedMilestones ? "default" :
                            index === project.completedMilestones ? "secondary" :
                            "outline"
                          }
                          className="text-xs"
                        >
                          {index < project.completedMilestones ? "Hoàn thành" :
                           index === project.completedMilestones ? "Đang thực hiện" :
                           "Chưa bắt đầu"}
                        </Badge>
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Mô tả chi tiết cho giai đoạn {index + 1} của dự án
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Thông tin học sinh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/avatars/student.jpg" alt={project.studentName} />
                  <AvatarFallback>{project.studentName.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{project.studentName}</p>
                  <p className="text-sm text-muted-foreground">Học sinh</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dự án đã hoàn thành:</span>
                  <span className="font-medium">1/3</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Điểm trung bình:</span>
                  <span className="font-medium">8.5/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Thời gian học:</span>
                  <span className="font-medium">45h</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowFeedbackDialog(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Thêm phản hồi
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Tải xuống báo cáo
              </Button>
              <Button className="w-full justify-start" variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa dự án
              </Button>
            </CardContent>
          </Card>

          {/* Project Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Thống kê
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tiến độ</span>
                <span className="font-medium">
                  {Math.round((project.completedMilestones / project.milestones) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Thời gian dự kiến</span>
                <span className="font-medium">12 tuần</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Độ khó</span>
                <Badge variant="secondary">Trung bình</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Đánh giá</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="font-medium">4.2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm phản hồi cho dự án</DialogTitle>
            <DialogDescription>
              Gửi phản hồi, gợi ý hoặc yêu cầu sửa đổi cho học sinh
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Loại phản hồi</label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={feedbackType === "approval" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackType("approval")}
                >
                  Phê duyệt
                </Button>
                <Button
                  variant={feedbackType === "revision" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackType("revision")}
                >
                  Yêu cầu sửa đổi
                </Button>
                <Button
                  variant={feedbackType === "suggestion" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFeedbackType("suggestion")}
                >
                  Gợi ý
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Nội dung phản hồi</label>
              <textarea
                className="w-full mt-2 p-3 border rounded-lg resize-none"
                rows={4}
                placeholder="Nhập nội dung phản hồi..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddFeedback} disabled={!feedbackText.trim()}>
                Gửi phản hồi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default STEMProjectDetail;
