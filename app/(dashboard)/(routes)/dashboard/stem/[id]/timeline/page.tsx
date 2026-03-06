'use client';

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  FileText,
  Image,
  Video,
  Download,
  ExternalLink,
  Users,
  Target,
  Award,
  Lightbulb,
  Search,
  Wrench,
  Presentation,
  Trophy
} from "lucide-react";

// Mock data for STEM project timeline
const mockProject = {
  id: "1",
  title: "Hệ thống AI hỗ trợ học toán",
  description: "Phát triển một hệ thống AI sử dụng machine learning để hỗ trợ học sinh học toán hiệu quả hơn",
  status: "In Progress",
  progress: 65,
  team: [
    { id: "1", name: "Nguyễn Văn A", role: "Team Leader", avatar: "/avatars/1.jpg" },
    { id: "2", name: "Trần Thị B", role: "AI Developer", avatar: "/avatars/2.jpg" },
    { id: "3", name: "Lê Văn C", role: "UI/UX Designer", avatar: "/avatars/3.jpg" },
    { id: "4", name: "Phạm Thị D", role: "Data Analyst", avatar: "/avatars/4.jpg" }
  ],
  instructor: {
    name: "TS. Nguyễn Văn E",
    email: "nguyen.e@university.edu"
  },
  milestones: [
    {
      id: "1",
      title: "Nghiên cứu và phân tích yêu cầu",
      description: "Tìm hiểu về các vấn đề trong việc học toán của học sinh và xác định các yêu cầu chức năng",
      status: "completed",
      dueDate: "2024-01-15",
      completedAt: "2024-01-14",
      deliverables: [
        { id: "1", name: "Báo cáo nghiên cứu", type: "document", url: "#" },
        { id: "2", name: "Sơ đồ use case", type: "image", url: "#" }
      ]
    },
    {
      id: "2",
      title: "Thiết kế kiến trúc hệ thống",
      description: "Thiết kế kiến trúc tổng thể của hệ thống AI và các module chính",
      status: "completed",
      dueDate: "2024-01-30",
      completedAt: "2024-01-28",
      deliverables: [
        { id: "3", name: "Sơ đồ kiến trúc", type: "image", url: "#" },
        { id: "4", name: "Tài liệu thiết kế", type: "document", url: "#" }
      ]
    },
    {
      id: "3",
      title: "Phát triển module AI cơ bản",
      description: "Xây dựng các thuật toán machine learning cơ bản để nhận diện và giải bài toán",
      status: "in_progress",
      dueDate: "2024-02-15",
      completedAt: null,
      deliverables: [
        { id: "5", name: "Code AI module", type: "code", url: "#" },
        { id: "6", name: "Test cases", type: "document", url: "#" }
      ]
    },
    {
      id: "4",
      title: "Phát triển giao diện người dùng",
      description: "Tạo giao diện web/mobile để học sinh tương tác với hệ thống AI",
      status: "pending",
      dueDate: "2024-03-01",
      completedAt: null,
      deliverables: [
        { id: "7", name: "UI Mockups", type: "image", url: "#" },
        { id: "8", name: "Frontend code", type: "code", url: "#" }
      ]
    },
    {
      id: "5",
      title: "Tích hợp và testing",
      description: "Tích hợp các module và thực hiện testing toàn diện",
      status: "pending",
      dueDate: "2024-03-15",
      completedAt: null,
      deliverables: [
        { id: "9", name: "Integration tests", type: "document", url: "#" },
        { id: "10", name: "Performance report", type: "document", url: "#" }
      ]
    },
    {
      id: "6",
      title: "Triển lãm và báo cáo",
      description: "Trình bày sản phẩm tại triển lãm khoa học và viết báo cáo cuối kỳ",
      status: "pending",
      dueDate: "2024-03-30",
      completedAt: null,
      deliverables: [
        { id: "11", name: "Presentation slides", type: "document", url: "#" },
        { id: "12", name: "Final report", type: "document", url: "#" },
        { id: "13", name: "Demo video", type: "video", url: "#" }
      ]
    }
  ]
};

const STEMProjectTimeline = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [project, setProject] = useState(mockProject);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "STUDENT") {
      router.push("/teacher/dashboard");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
              </div>
    );
  }

  if (!session || session.user.role !== "STUDENT") {
    return null;
  }

  const getMilestoneStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-blue-500" />;
      case "pending":
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getDeliverableIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "code":
        return <Wrench className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const completedMilestones = project.milestones.filter(m => m.status === "completed").length;
  const totalMilestones = project.milestones.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/stem/${resolvedParams.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.title}</h1>
            <p className="text-muted-foreground">Timeline dự án STEM</p>
          </div>
        </div>
        <Badge variant={project.status === "In Progress" ? "default" : "secondary"}>
          {project.status}
        </Badge>
      </div>

      {/* Project Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tổng quan dự án
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Mô tả dự án</h4>
              <p className="text-sm text-muted-foreground">{project.description}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Tiến độ</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hoàn thành</span>
                  <span>{completedMilestones}/{totalMilestones} giai đoạn</span>
                </div>
                <Progress value={project.progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{project.progress}% hoàn thành</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Nhóm thực hiện</h4>
              <div className="flex -space-x-2">
                {project.team.map((member) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                    title={member.name}
                  >
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {project.team.length} thành viên
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline dự án
          </CardTitle>
          <CardDescription>
            Các giai đoạn phát triển và milestone của dự án
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {project.milestones.map((milestone, index) => (
              <div key={milestone.id} className="relative">
                {/* Timeline line */}
                {index < project.milestones.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                )}
                
                <div className="flex items-start gap-4">
                  {/* Milestone icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    {getMilestoneStatusIcon(milestone.status)}
                  </div>
                  
                  {/* Milestone content */}
                  <div className="flex-1 min-w-0">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader 
                        className="cursor-pointer"
                        onClick={() => setExpandedMilestone(
                          expandedMilestone === milestone.id ? null : milestone.id
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{milestone.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {milestone.description}
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              milestone.status === "completed" ? "default" :
                              milestone.status === "in_progress" ? "secondary" :
                              "outline"
                            }>
                              {milestone.status === "completed" ? "Hoàn thành" :
                               milestone.status === "in_progress" ? "Đang thực hiện" :
                               "Chưa bắt đầu"}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}
                            </p>
                            {milestone.completedAt && (
                              <p className="text-sm text-green-600 mt-1">
                                Hoàn thành: {new Date(milestone.completedAt).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {expandedMilestone === milestone.id && (
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Deliverables</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {milestone.deliverables.map((deliverable) => (
                                  <div
                                    key={deliverable.id}
                                    className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50"
                                  >
                                    {getDeliverableIcon(deliverable.type)}
                                    <span className="text-sm flex-1">{deliverable.name}</span>
                                    <Button size="sm" variant="outline">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Xem chi tiết
                              </Button>
                              {milestone.status === "in_progress" && (
                                <Button size="sm">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Đánh dấu hoàn thành
                                </Button>
                              )}
                            </div>
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

      {/* Team and Instructor Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nhóm thực hiện
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {project.team.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Giảng viên hướng dẫn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium">
                {project.instructor.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="font-medium">{project.instructor.name}</p>
                <p className="text-sm text-muted-foreground">{project.instructor.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default STEMProjectTimeline;

