'use client';

"use client";

import LinkIcon from "next/link";
import { useState, use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  Calendar,
  Users,
  Tag,
  Target,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Bookmark,
  Share,
  Download,
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
  Settings,
  BarChart3
} from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  deliverables: string[];
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
  status: "draft" | "in-progress" | "review" | "completed";
  teamMembers: TeamMember[];
  instructor: {
    id: string;
    name: string;
    email: string;
  };
  dueDate: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  milestones: Milestone[];
  resources: Array<{
    id: string;
    title: string;
    type: "document" | "image" | "video" | "link";
    url: string;
  }>;
  notes: string;
  isPublic: boolean;
}

const STEMProjectEditor = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [newTeamMember, setNewTeamMember] = useState({ name: "", role: "", email: "" });
  const [newResource, setNewResource] = useState({ title: "", type: "document" as const, url: "" });

  // Mock data - in real app, this would be fetched based on resolvedParams.id
  const [project, setProject] = useState<STEMProject>({
    id: resolvedParams.id,
    title: "Robot Tự Động Dọn Rác",
    description: "Thiết kế và chế tạo robot có khả năng nhận diện và thu gom rác thải tự động sử dụng AI và computer vision. Dự án này nhằm giải quyết vấn đề rác thải trong môi trường đô thị và tạo ra một giải pháp công nghệ bền vững.",
    category: "Engineering",
    status: "in-progress",
    teamMembers: [
      { id: "1", name: "Nguyễn Văn A", role: "Team Leader & AI Developer", email: "nguyen.a@student.edu.vn" },
      { id: "2", name: "Trần Thị B", role: "Hardware Engineer", email: "tran.b@student.edu.vn" },
      { id: "3", name: "Lê Văn C", role: "Software Developer", email: "le.c@student.edu.vn" }
    ],
    instructor: {
      id: "teacher1",
      name: "Thầy Nguyễn Minh Kỹ thuật",
      email: "nguyen.minh@teacher.edu.vn"
    },
    dueDate: "2024-12-30",
    tags: ["AI", "Robotics", "Environment", "Arduino", "Computer Vision"],
    difficulty: "advanced",
    milestones: [
      {
        id: "m1",
        title: "Ý tưởng và nghiên cứu",
        description: "Phân tích vấn đề rác thải và nghiên cứu các giải pháp hiện có",
        dueDate: "2024-10-15",
        status: "completed",
        deliverables: ["Báo cáo nghiên cứu", "Mindmap ý tưởng", "Khảo sát thực tế"]
      },
      {
        id: "m2",
        title: "Thiết kế hệ thống",
        description: "Thiết kế kiến trúc tổng thể và các module chức năng",
        dueDate: "2024-11-01",
        status: "completed",
        deliverables: ["Bản vẽ thiết kế", "Sơ đồ hệ thống", "Danh sách linh kiện"]
      },
      {
        id: "m3",
        title: "Chế tạo và thử nghiệm",
        description: "Chế tạo robot và thử nghiệm các chức năng cơ bản",
        dueDate: "2024-11-20",
        status: "in-progress",
        deliverables: ["Robot prototype", "Code AI model", "Video thử nghiệm"]
      },
      {
        id: "m4",
        title: "Hoàn thiện và báo cáo",
        description: "Tối ưu hóa hệ thống và viết báo cáo cuối cùng",
        dueDate: "2024-12-10",
        status: "pending",
        deliverables: ["Robot hoàn thiện", "Báo cáo kỹ thuật", "Demo video"]
      }
    ],
    resources: [
      { id: "r1", title: "Tài liệu nghiên cứu AI", type: "document", url: "/documents/ai-research.pdf" },
      { id: "r2", title: "Video hướng dẫn Arduino", type: "video", url: "/videos/arduino-tutorial.mp4" },
      { id: "r3", title: "Thư viện OpenCV", type: "link", url: "https://opencv.org" }
    ],
    notes: "Dự án đang trong giai đoạn thử nghiệm. Cần chú ý đến việc tối ưu hóa thuật toán nhận diện để tăng độ chính xác.",
    isPublic: false
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Science":
        return <FlaskConical className="h-5 w-5 text-blue-600" />;
      case "Technology":
        return <Cpu className="h-5 w-5 text-green-600" />;
      case "Engineering":
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case "Math":
        return <Calculator className="h-5 w-5 text-purple-600" />;
      default:
        return <Zap className="h-5 w-5 text-gray-600" />;
    }
  };

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
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    // Show success message
  };

  const addTag = () => {
  const { t } = useLanguage();
    if (newTag.trim() && !project.tags.includes(newTag.trim())) {
      setProject({
        ...project,
        tags: [...project.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProject({
      ...project,
      tags: project.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const addMilestone = () => {
    if (newMilestone.title.trim() && newMilestone.dueDate) {
      const milestone: Milestone = {
        id: `m${Date.now()}`,
        title: newMilestone.title.trim(),
        description: newMilestone.description.trim(),
        dueDate: newMilestone.dueDate,
        status: "pending",
        deliverables: []
      };
      setProject({
        ...project,
        milestones: [...project.milestones, milestone]
      });
      setNewMilestone({ title: "", description: "", dueDate: "" });
    }
  };

  const removeMilestone = (milestoneId: string) => {
    setProject({
      ...project,
      milestones: project.milestones.filter(m => m.id !== milestoneId)
    });
  };

  const addTeamMember = () => {
    if (newTeamMember.name.trim() && newTeamMember.role.trim() && newTeamMember.email.trim()) {
      const member: TeamMember = {
        id: `member${Date.now()}`,
        name: newTeamMember.name.trim(),
        role: newTeamMember.role.trim(),
        email: newTeamMember.email.trim()
      };
      setProject({
        ...project,
        teamMembers: [...project.teamMembers, member]
      });
      setNewTeamMember({ name: "", role: "", email: "" });
    }
  };

  const removeTeamMember = (memberId: string) => {
    setProject({
      ...project,
      teamMembers: project.teamMembers.filter(m => m.id !== memberId)
    });
  };

  const addResource = () => {
    if (newResource.title.trim() && newResource.url.trim()) {
      const resource = {
        id: `r${Date.now()}`,
        title: newResource.title.trim(),
        type: newResource.type,
        url: newResource.url.trim()
      };
      setProject({
        ...project,
        resources: [...project.resources, resource]
      });
      setNewResource({ title: "", type: "document", url: "" });
    }
  };

  const removeResource = (resourceId: string) => {
    setProject({
      ...project,
      resources: project.resources.filter(r => r.id !== resourceId)
    });
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
                <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa dự án STEM</h1>
                <p className="text-gray-600">Biên tập và cập nhật thông tin dự án</p>
              
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <LinkIcon href={`/dashboard/stem/${resolvedParams.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Xem trước
                </LinkIcon>
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Thông tin cơ bản
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên dự án *
                  </label>
                  <Input
                    value={project.title}
                    onChange={(e) => setProject({ ...project, title: e.target.value })}
                    placeholder="Nhập tên dự án..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả dự án *
                  </label>
                  <Textarea
                    value={project.description}
                    onChange={(e) => setProject({ ...project, description: e.target.value })}
                    placeholder="Mô tả chi tiết về dự án..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lĩnh vực *
                    </label>
                    <select
                      value={project.category}
                      onChange={(e) => setProject({ ...project, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Science">Khoa học</option>
                      <option value="Technology">Công nghệ</option>
                      <option value="Engineering">Kỹ thuật</option>
                      <option value="Math">Toán học</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Độ khó
                    </label>
                    <select
                      value={project.difficulty}
                      onChange={(e) => setProject({ ...project, difficulty: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="beginner">Cơ bản</option>
                      <option value="intermediate">Trung bình</option>
                      <option value="advanced">Nâng cao</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hạn nộp
                  </label>
                  <Input
                    type="date"
                    value={project.dueDate}
                    onChange={(e) => setProject({ ...project, dueDate: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Tag className="h-5 w-5 mr-2" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Thêm tag mới..."
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button onClick={addTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.milestones.map((milestone) => (
                    <div key={milestone.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(milestone.status)}>
                            {milestone.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            onClick={() => removeMilestone(milestone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      <p className="text-xs text-gray-500">
                        Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <h4 className="font-medium mb-3">Thêm giai đoạn mới</h4>
                  <div className="space-y-3">
                    <Input
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      placeholder="Tên giai đoạn..."
                    />
                    <Textarea
                      value={newMilestone.description}
                      onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                      placeholder="Mô tả giai đoạn..."
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newMilestone.dueDate}
                        onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                      />
                      <Button onClick={addMilestone} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm
                      </Button>
                    </div>
                  </div>
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
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {project.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getResourceIcon(resource.type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{resource.title}</p>
                        <p className="text-xs text-gray-600">{resource.url}</p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeResource(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <h4 className="font-medium mb-3">Thêm tài liệu</h4>
                  <div className="space-y-3">
                    <Input
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="Tên tài liệu..."
                    />
                    <div className="flex gap-2">
                      <select
                        value={newResource.type}
                        onChange={(e) => setNewResource({ ...newResource, type: e.target.value as any })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="document">Tài liệu</option>
                        <option value="image">Hình ảnh</option>
                        <option value="video">Video</option>
                        <option value="link">LinkIcon</option>
                      </select>
                      <Input
                        value={newResource.url}
                        onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        placeholder="URL hoặc đường dẫn..."
                        className="flex-1"
                      />
                      <Button onClick={addResource} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Ghi chú
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={project.notes}
                  onChange={(e) => setProject({ ...project, notes: e.target.value })}
                  placeholder="Ghi chú về dự án, ý tưởng, thách thức..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Trạng thái dự án
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={project.status}
                    onChange={(e) => setProject({ ...project, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="in-progress">Đang thực hiện</option>
                    <option value="review">Chờ duyệt</option>
                    <option value="completed">Hoàn thành</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={project.isPublic}
                    onChange={(e) => setProject({ ...project, isPublic: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    Công khai dự án
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Thành viên nhóm
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {project.teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 border rounded">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-gray-600">{member.role}</p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeTeamMember(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg">
                  <h4 className="font-medium mb-2 text-sm">Thêm thành viên</h4>
                  <div className="space-y-2">
                    <Input
                      value={newTeamMember.name}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, name: e.target.value })}
                      placeholder="Tên thành viên..."
                    />
                    <Input
                      value={newTeamMember.role}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, role: e.target.value })}
                      placeholder="Vai trò..."
                    />
                    <Input
                      value={newTeamMember.email}
                      onChange={(e) => setNewTeamMember({ ...newTeamMember, email: e.target.value })}
                      placeholder="Email..."
                    />
                    <Button onClick={addTeamMember} size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm
                    </Button>
                  </div>
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
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Hành động nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <LinkIcon href={`/dashboard/stem/${resolvedParams.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    Xem trước
                  </LinkIcon>
                </Button>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <LinkIcon href={`/dashboard/stem/${resolvedParams.id}/timeline`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Timeline
                  </LinkIcon>
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Share className="h-4 w-4 mr-2" />
                  Chia sẻ
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Xuất PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default STEMProjectEditor;
