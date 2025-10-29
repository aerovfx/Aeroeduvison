'use client';

"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import { 
  ArrowLeft,
  Lightbulb,
  BookOpen,
  Wrench,
  CheckCircle,
  Trophy,
  Users,
  Clock,
  Calendar,
  FileText,
  Video,
  Image,
  Download,
  ExternalLink,
  Play,
  Eye,
  Edit,
  Share,
  Bookmark,
  Star,
  MessageSquare,
  ThumbsUp,
  Flag,
  Zap,
  FlaskConical,
  Cpu,
  Wrench as WrenchIcon,
  Calculator,
  Home,
  UserCheck,
  FileText as FileTextIcon,
  Video as VideoIcon,
  Settings,
  BarChart3,
  Target,
  Award,
  ChevronRight,
  ChevronDown,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Circle
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "locked";
  icon: React.ComponentType<any>;
  color: string;
  completedAt?: string;
  estimatedDuration: number; // in days
  actualDuration?: number;
  deliverables: Array<{
    id: string;
    title: string;
    type: "image" | "video" | "document" | "code" | "presentation";
    url: string;
    description: string;
  }>;
  notes: string;
  teamMembers: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  challenges: string[];
  learnings: string[];
}

interface STEMProject {
  id: string;
  title: string;
  description: string;
  category: "Science" | "Technology" | "Engineering" | "Math";
  status: "researching" | "completed" | "exhibition";
  team: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: number; // in weeks
  participants: number;
  rating: number;
  isFeatured: boolean;
  milestones: Milestone[];
  finalResults: {
    images: string[];
    videos: string[];
    documents: string[];
    demoUrl?: string;
    githubUrl?: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    type: "award" | "recognition" | "publication";
  }>;
  feedback: Array<{
    id: string;
    author: string;
    content: string;
    rating: number;
    date: string;
  }>;
}

const STEMProjectTimeline = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [selectedDeliverable, setSelectedDeliverable] = useState<any>(null);

  // Mock data - in real app, this would be fetched based on resolvedParams.id
  const project: STEMProject = {
    id: resolvedParams.id,
    title: "Robot Tự Động Dọn Rác",
    description: "Thiết kế và chế tạo robot có khả năng nhận diện và thu gom rác thải tự động sử dụng AI và computer vision",
    category: "Engineering",
    status: "completed",
    team: [
      { id: "1", name: "Nguyễn Văn A", role: "Team Leader & AI Developer" },
      { id: "2", name: "Trần Thị B", role: "Hardware Engineer" },
      { id: "3", name: "Lê Văn C", role: "Software Developer" },
      { id: "4", name: "Phạm Thị D", role: "Designer & UI/UX" }
    ],
    thumbnail: "/images/stem/robot-cleaner.jpg",
    createdAt: "2024-10-01",
    updatedAt: "2024-12-15",
    instructor: {
      id: "teacher1",
      name: "Thầy Nguyễn Minh Kỹ thuật",
      bio: "Giáo viên Kỹ thuật với 10 năm kinh nghiệm, chuyên gia về AI, Robotics và IoT"
    },
    tags: ["AI", "Robotics", "Environment", "Arduino", "Computer Vision"],
    difficulty: "advanced",
    estimatedDuration: 12,
    participants: 4,
    rating: 4.8,
    isFeatured: true,
    milestones: [
      {
        id: "m1",
        title: "Ý tưởng - Đặt vấn đề",
        description: "Phân tích vấn đề rác thải trong môi trường và đề xuất giải pháp sử dụng robot tự động",
        status: "completed",
        icon: Lightbulb,
        color: "text-yellow-600",
        completedAt: "2024-10-15",
        estimatedDuration: 7,
        actualDuration: 5,
        deliverables: [
          {
            id: "d1",
            title: "Báo cáo nghiên cứu vấn đề",
            type: "document",
            url: "/documents/robot-cleaner-problem-analysis.pdf",
            description: "Phân tích chi tiết về tình trạng rác thải và tác động môi trường"
          },
          {
            id: "d2",
            title: "Mindmap ý tưởng",
            type: "image",
            url: "/images/stem/robot-cleaner-mindmap.jpg",
            description: "Sơ đồ tư duy các ý tưởng và giải pháp"
          }
        ],
        notes: "Nhóm đã thực hiện khảo sát tại 5 khu vực khác nhau trong thành phố để hiểu rõ vấn đề rác thải",
        teamMembers: [
          { id: "1", name: "Nguyễn Văn A", role: "Research Lead" },
          { id: "4", name: "Phạm Thị D", role: "Data Collection" }
        ],
        challenges: [
          "Thu thập dữ liệu thực tế về rác thải",
          "Xác định các loại rác phổ biến cần xử lý"
        ],
        learnings: [
          "Hiểu rõ tác động của rác thải đến môi trường",
          "Nắm được quy trình thu gom rác hiện tại"
        ]
      },
      {
        id: "m2",
        title: "Nghiên cứu - Tìm tài liệu",
        description: "Tìm hiểu về AI, computer vision, robotics và các công nghệ liên quan",
        status: "completed",
        icon: BookOpen,
        color: "text-blue-600",
        completedAt: "2024-11-01",
        estimatedDuration: 10,
        actualDuration: 12,
        deliverables: [
          {
            id: "d3",
            title: "Tài liệu nghiên cứu AI",
            type: "document",
            url: "/documents/ai-research-paper.pdf",
            description: "Tổng hợp các nghiên cứu về AI và computer vision"
          },
          {
            id: "d4",
            title: "Video demo các công nghệ",
            type: "video",
            url: "/videos/ai-technologies-demo.mp4",
            description: "Video giới thiệu các công nghệ AI và robotics"
          }
        ],
        notes: "Nhóm đã nghiên cứu hơn 50 bài báo khoa học và 20 dự án tương tự trên thế giới",
        teamMembers: [
          { id: "1", name: "Nguyễn Văn A", role: "AI Research" },
          { id: "3", name: "Lê Văn C", role: "Software Research" }
        ],
        challenges: [
          "Tìm hiểu các thuật toán AI phức tạp",
          "Hiểu cách tích hợp hardware và software"
        ],
        learnings: [
          "Nắm vững các thuật toán computer vision",
          "Hiểu về machine learning và deep learning"
        ]
      },
      {
        id: "m3",
        title: "Thiết kế - Thử nghiệm",
        description: "Thiết kế hệ thống robot và thử nghiệm các module chức năng",
        status: "completed",
        icon: Wrench,
        color: "text-orange-600",
        completedAt: "2024-11-20",
        estimatedDuration: 14,
        actualDuration: 16,
        deliverables: [
          {
            id: "d5",
            title: "Bản vẽ thiết kế robot",
            type: "image",
            url: "/images/stem/robot-design-blueprint.jpg",
            description: "Bản vẽ kỹ thuật chi tiết của robot"
          },
          {
            id: "d6",
            title: "Code AI model",
            type: "code",
            url: "/code/ai-model.py",
            description: "Mã nguồn mô hình AI nhận diện rác"
          },
          {
            id: "d7",
            title: "Video thử nghiệm",
            type: "video",
            url: "/videos/robot-testing.mp4",
            description: "Video quá trình thử nghiệm các chức năng"
          }
        ],
        notes: "Đã thử nghiệm hơn 100 lần với các loại rác khác nhau để tối ưu hóa độ chính xác",
        teamMembers: [
          { id: "2", name: "Trần Thị B", role: "Hardware Design" },
          { id: "3", name: "Lê Văn C", role: "Software Development" },
          { id: "1", name: "Nguyễn Văn A", role: "AI Integration" }
        ],
        challenges: [
          "Tích hợp camera với AI model",
          "Thiết kế cơ chế gắp rác hiệu quả",
          "Tối ưu hóa tốc độ xử lý"
        ],
        learnings: [
          "Kỹ năng thiết kế 3D và in 3D",
          "Lập trình Arduino và Raspberry Pi",
          "Tích hợp AI với hardware"
        ]
      },
      {
        id: "m4",
        title: "Kết quả - Sản phẩm",
        description: "Hoàn thiện robot và test thực tế trong môi trường thật",
        status: "completed",
        icon: CheckCircle,
        color: "text-green-600",
        completedAt: "2024-12-10",
        estimatedDuration: 10,
        actualDuration: 8,
        deliverables: [
          {
            id: "d8",
            title: "Robot hoàn thiện",
            type: "image",
            url: "/images/stem/final-robot.jpg",
            description: "Hình ảnh robot hoàn thiện"
          },
          {
            id: "d9",
            title: "Demo hoạt động",
            type: "video",
            url: "/videos/final-demo.mp4",
            description: "Video demo robot hoạt động thực tế"
          },
          {
            id: "d10",
            title: "Báo cáo kỹ thuật",
            type: "document",
            url: "/documents/technical-report.pdf",
            description: "Báo cáo chi tiết về kỹ thuật và hiệu suất"
          }
        ],
        notes: "Robot đạt độ chính xác 95% trong việc nhận diện và thu gom rác",
        teamMembers: [
          { id: "1", name: "Nguyễn Văn A", role: "Project Lead" },
          { id: "2", name: "Trần Thị B", role: "Hardware Finalization" },
          { id: "3", name: "Lê Văn C", role: "Software Optimization" },
          { id: "4", name: "Phạm Thị D", role: "Documentation" }
        ],
        challenges: [
          "Tối ưu hóa hiệu suất trong môi trường thực tế",
          "Xử lý các trường hợp edge case",
          "Đảm bảo độ bền và ổn định"
        ],
        learnings: [
          "Kỹ năng testing và debugging",
          "Tối ưu hóa hiệu suất hệ thống",
          "Làm việc nhóm hiệu quả"
        ]
      },
      {
        id: "m5",
        title: "Báo cáo - Triển lãm",
        description: "Viết báo cáo cuối cùng và tham gia triển lãm khoa học",
        status: "completed",
        icon: Trophy,
        color: "text-purple-600",
        completedAt: "2024-12-15",
        estimatedDuration: 5,
        actualDuration: 4,
        deliverables: [
          {
            id: "d11",
            title: "Poster triển lãm",
            type: "image",
            url: "/images/stem/exhibition-poster.jpg",
            description: "Poster giới thiệu dự án tại triển lãm"
          },
          {
            id: "d12",
            title: "Presentation slides",
            type: "presentation",
            url: "/presentations/robot-cleaner-presentation.pptx",
            description: "Slide thuyết trình dự án"
          },
          {
            id: "d13",
            title: "Video thuyết trình",
            type: "video",
            url: "/videos/presentation-video.mp4",
            description: "Video ghi lại buổi thuyết trình"
          }
        ],
        notes: "Dự án đã giành giải Nhất tại Hội chợ Khoa học Kỹ thuật cấp thành phố",
        teamMembers: [
          { id: "1", name: "Nguyễn Văn A", role: "Presenter" },
          { id: "4", name: "Phạm Thị D", role: "Visual Design" }
        ],
        challenges: [
          "Thuyết trình trước hội đồng giám khảo",
          "Trả lời câu hỏi kỹ thuật phức tạp",
          "Truyền đạt ý tưởng một cách dễ hiểu"
        ],
        learnings: [
          "Kỹ năng thuyết trình và giao tiếp",
          "Cách trình bày dự án khoa học",
          "Tự tin trước đám đông"
        ]
      }
    ],
    finalResults: {
      images: [
        "/images/stem/robot-cleaner-1.jpg",
        "/images/stem/robot-cleaner-2.jpg",
        "/images/stem/robot-cleaner-3.jpg"
      ],
      videos: [
        "/videos/robot-cleaner-demo.mp4",
        "/videos/robot-cleaner-testing.mp4"
      ],
      documents: [
        "/documents/robot-cleaner-final-report.pdf",
        "/documents/robot-cleaner-manual.pdf"
      ],
      demoUrl: "https://demo.robot-cleaner.com",
      githubUrl: "https://github.com/team/robot-cleaner"
    },
    achievements: [
      {
        id: "a1",
        title: "Giải Nhất Hội chợ Khoa học Kỹ thuật",
        description: "Dự án đã giành giải Nhất tại Hội chợ Khoa học Kỹ thuật cấp thành phố",
        date: "2024-12-15",
        type: "award"
      },
      {
        id: "a2",
        title: "Được đăng trên báo Khoa học & Đời sống",
        description: "Dự án được đăng tải trên trang nhất báo Khoa học & Đời sống",
        date: "2024-12-20",
        type: "publication"
      }
    ],
    feedback: [
      {
        id: "f1",
        author: "GS. Nguyễn Văn Khoa học",
        content: "Dự án rất ấn tượng, thể hiện sự sáng tạo và khả năng ứng dụng thực tế cao",
        rating: 5,
        date: "2024-12-15"
      },
      {
        id: "f2",
        author: "TS. Trần Thị Công nghệ",
        content: "Nhóm đã thể hiện kỹ năng kỹ thuật xuất sắc và tinh thần làm việc nhóm tốt",
        rating: 5,
        date: "2024-12-16"
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case "in-progress":
        return <Circle className="h-6 w-6 text-blue-600" />;
      case "locked":
        return <Lock className="h-6 w-6 text-gray-400" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getDeliverableIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      case "code":
        return <Cpu className="h-4 w-4" />;
      case "presentation":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Science":
        return <FlaskConical className="h-5 w-5 text-blue-600" />;
      case "Technology":
        return <Cpu className="h-5 w-5 text-green-600" />;
      case "Engineering":
        return <WrenchIcon className="h-5 w-5 text-orange-600" />;
      case "Math":
        return <Calculator className="h-5 w-5 text-purple-600" />;
      default:
        return <Zap className="h-5 w-5 text-gray-600" />;
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
                <Link href="/admin/stem">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                <p className="text-gray-600">Timeline dự án • {project.category}</p>
              
              <LanguageSwitcherCompact /></div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href={`/admin/stem/${resolvedParams.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem chi tiết
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/admin/stem/${resolvedParams.id}/analytics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Thống kê
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  {getCategoryIcon(project.category)}
                  <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">Nổi bật</Badge>
                </div>
                <CardTitle className="text-xl">{project.title}</CardTitle>
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

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Hành trình dự án
                </CardTitle>
                <CardDescription>
                  {project.milestones.length} giai đoạn • {project.estimatedDuration} tuần
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {project.milestones.map((milestone, index) => {
                    const IconComponent = milestone.icon;
                    const isExpanded = expandedMilestone === milestone.id;
                    
                    return (
                      <div key={milestone.id} className="relative">
                        {/* Timeline Line */}
                        {index < project.milestones.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-200"></div>
                        )}
                        
                        {/* Milestone Card */}
                        <div className="relative flex gap-4">
                          {/* Icon */}
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                            milestone.status === "completed" 
                              ? "bg-green-100 border-green-500" 
                              : milestone.status === "in-progress"
                              ? "bg-blue-100 border-blue-500"
                              : "bg-gray-100 border-gray-300"
                          }`}>
                            <IconComponent className={`h-6 w-6 ${
                              milestone.status === "completed" 
                                ? "text-green-600" 
                                : milestone.status === "in-progress"
                                ? "text-blue-600"
                                : "text-gray-400"
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1">
                            <Card className={`cursor-pointer transition-all ${
                              isExpanded ? "shadow-lg" : "hover:shadow-md"
                            }`} onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <CardTitle className="text-lg">{milestone.title}</CardTitle>
                                    {getStatusIcon(milestone.status)}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {milestone.estimatedDuration} ngày
                                    </Badge>
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500" />
                                    )}
                                  </div>
                                </div>
                                <CardDescription>{milestone.description}</CardDescription>
                                {milestone.completedAt && (
                                  <p className="text-sm text-green-600 mt-2">
                                    Hoàn thành: {new Date(milestone.completedAt).toLocaleDateString('vi-VN')}
                                  </p>
                                )}
                              </CardHeader>
                              
                              {isExpanded && (
                                <CardContent className="pt-0">
                                  <div className="space-y-4">
                                    {/* Notes */}
                                    {milestone.notes && (
                                      <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Ghi chú:</h4>
                                        <p className="text-sm text-gray-600">{milestone.notes}</p>
                                      </div>
                                    )}

                                    {/* Team Members */}
                                    <div>
                                      <h4 className="font-medium text-gray-900 mb-2">Thành viên tham gia:</h4>
                                      <div className="flex flex-wrap gap-2">
                                        {milestone.teamMembers.map((member) => (
                                          <Badge key={member.id} variant="outline" className="text-xs">
                                            {member.name} - {member.role}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Deliverables */}
                                    <div>
                                      <h4 className="font-medium text-gray-900 mb-2">Sản phẩm:</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {milestone.deliverables.map((deliverable) => (
                                          <div key={deliverable.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                            {getDeliverableIcon(deliverable.type)}
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

                                    {/* Challenges & Learnings */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Thách thức:</h4>
                                        <ul className="space-y-1">
                                          {milestone.challenges.map((challenge, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                              {challenge}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Bài học:</h4>
                                        <ul className="space-y-1">
                                          {milestone.learnings.map((learning, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                              {learning}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Nhóm dự án
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.team.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
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
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-green-600">
                      {project.instructor.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{project.instructor.name}</p>
                    <p className="text-sm text-gray-600">{project.category}</p>
                  </div>
                </div>
                {project.instructor.bio && (
                  <p className="text-sm text-gray-700">{project.instructor.bio}</p>
                )}
              </CardContent>
            </Card>

            {/* Final Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Kết quả cuối cùng
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Images */}
                {project.finalResults.images.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Hình ảnh:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {project.finalResults.images.map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Videos */}
                {project.finalResults.videos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Video:</h4>
                    <div className="space-y-2">
                      {project.finalResults.videos.map((video, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <Video className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Video {index + 1}</span>
                          <Button size="sm" variant="outline" className="ml-auto">
                            <Play className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Links */}
                <div className="space-y-2">
                  {project.finalResults.demoUrl && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={project.finalResults.demoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Demo trực tuyến
                      </a>
                    </Button>
                  )}
                  {project.finalResults.githubUrl && (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={project.finalResults.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Cpu className="h-4 w-4 mr-2" />
                        Mã nguồn GitHub
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Thành tích
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.achievements.map((achievement) => (
                    <div key={achievement.id} className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-sm">{achievement.title}</span>
                      </div>
                      <p className="text-xs text-gray-600">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{achievement.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Đánh giá
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.feedback.map((feedback) => (
                    <div key={feedback.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{feedback.author}</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${
                              i < feedback.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                            }`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{feedback.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{feedback.date}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default STEMProjectTimeline;
