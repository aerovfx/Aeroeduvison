'use client';

import LinkIcon from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSTEM } from "@/contexts/STEMContext";
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
  BarChart3,
  Home,
  BookOpen,
  FileText as FileTextIcon,
  Video as VideoIcon
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  deliverables: string[];
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

const CreateSTEMProject = () => {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newMilestone, setNewMilestone] = useState({ title: "", description: "", dueDate: "" });
  const [newTeamMember, setNewTeamMember] = useState({ name: "", role: "", email: "" });
  const [newResource, setNewResource] = useState({ title: "", type: "document" as const, url: "" });
  
  const { addProject } = useSTEM();
  const searchParams = useSearchParams();

  // Handle template data from URL
  useEffect(() => {
    const templateData = searchParams.get('template');
    if (templateData) {
      try {
        const template = JSON.parse(decodeURIComponent(templateData));
        setProject(prev => ({
          ...prev,
          title: template.title || "",
          description: template.description || "",
          category: template.category || "Science",
          difficulty: template.difficulty || "beginner",
          tags: template.tags || [],
        }));
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

  const [project, setProject] = useState<Partial<STEMProject>>({
    title: "",
    description: "",
    category: "Science",
    status: "draft",
    teamMembers: [],
    instructor: {
      id: "teacher1",
      name: "Thầy Nguyễn Minh Kỹ thuật",
      email: "nguyen.minh@teacher.edu.vn"
    },
    dueDate: "",
    tags: [],
    difficulty: "beginner",
    milestones: [],
    resources: [],
    notes: "",
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

  const handleSave = async () => {
    if (!project.title?.trim() || !project.description?.trim()) {
      alert("Vui lòng điền đầy đủ tên dự án và mô tả");
      return;
    }

    setIsSaving(true);
    
    try {
      // Add project to context
      const newProject = addProject({
        title: project.title.trim(),
        description: project.description.trim(),
        category: project.category || "Science",
        status: project.status || "draft",
        teamMembers: project.teamMembers || [],
        instructor: project.instructor || {
          id: "teacher1",
          name: "Thầy Nguyễn Minh Kỹ thuật",
          email: "nguyen.minh@teacher.edu.vn"
        },
        dueDate: project.dueDate || "",
        tags: project.tags || [],
        difficulty: project.difficulty || "beginner",
        milestones: project.milestones || [],
        isPublic: project.isPublic || false,
        progress: 0,
        feedback: []
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to project detail
      if (typeof window !== 'undefined') { location.href = `/dashboard/stem/1`; }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Có lỗi xảy ra khi lưu dự án. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !project.tags?.includes(newTag.trim())) {
      setProject({
        ...project,
        tags: [...(project.tags || []), newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProject({
      ...project,
      tags: project.tags?.filter(tag => tag !== tagToRemove) || []
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
        milestones: [...(project.milestones || []), milestone]
      });
      setNewMilestone({ title: "", description: "", dueDate: "" });
    }
  };

  const removeMilestone = (milestoneId: string) => {
    setProject({
      ...project,
      milestones: project.milestones?.filter(m => m.id !== milestoneId) || []
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
        teamMembers: [...(project.teamMembers || []), member]
      });
      setNewTeamMember({ name: "", role: "", email: "" });
    }
  };

  const removeTeamMember = (memberId: string) => {
    setProject({
      ...project,
      teamMembers: project.teamMembers?.filter(m => m.id !== memberId) || []
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
        resources: [...(project.resources || []), resource]
      });
      setNewResource({ title: "", type: "document", url: "" });
    }
  };

  const removeResource = (resourceId: string) => {
    setProject({
      ...project,
      resources: project.resources?.filter(r => r.id !== resourceId) || []
    });
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
                <h1 className="text-2xl font-bold text-gray-900">Tạo dự án STEM mới</h1>
                <p className="text-gray-600">Bắt đầu một dự án STEM sáng tạo và thú vị</p>
              
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    location.href = "/dashboard/stem";
                  }
                }}
              >
                Hủy
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving || !project.title?.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Đang tạo..." : "Tạo dự án"}
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
                <CardDescription>
                  Điền thông tin cơ bản về dự án STEM của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên dự án *
                  </label>
                  <Input
                    value={project.title || ""}
                    onChange={(e) => setProject({ ...project, title: e.target.value })}
                    placeholder="Nhập tên dự án STEM..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả dự án *
                  </label>
                  <Textarea
                    value={project.description || ""}
                    onChange={(e) => setProject({ ...project, description: e.target.value })}
                    placeholder="Mô tả chi tiết về dự án, mục tiêu, và cách thức thực hiện..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lĩnh vực *
                    </label>
                    <select
                      value={project.category || "Science"}
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
                      value={project.difficulty || "beginner"}
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
                    value={project.dueDate || ""}
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
                <CardDescription>
                  Thêm các tag để phân loại và tìm kiếm dự án dễ dàng hơn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tags?.map((tag, index) => (
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
                <CardDescription>
                  Lập kế hoạch các giai đoạn chính của dự án
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4">
                  {project.milestones?.map((milestone) => (
                    <div key={milestone.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{milestone.title}</h4>
                        <Button
                          variant="ghost"
                          onClick={() => removeMilestone(milestone.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{milestone.description}</p>
                      <p className="text-xs text-gray-500">
                        Hạn: {new Date(milestone.dueDate).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
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
                <CardDescription>
                  Thêm các tài liệu, video, link hữu ích cho dự án
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  {project.resources?.map((resource) => (
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
                <CardDescription>
                  Ghi chú thêm về dự án, ý tưởng, hoặc lưu ý quan trọng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={project.notes || ""}
                  onChange={(e) => setProject({ ...project, notes: e.target.value })}
                  placeholder="Ghi chú về dự án, ý tưởng, thách thức..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Project Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Xem trước dự án
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-lg">
                      {getCategoryIcon(project.category || "Science")}
                    </div>
                    <div>
                      <h3 className="font-semibold">{project.title || "Tên dự án"}</h3>
                      <p className="text-sm text-gray-600">{project.category}</p>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="text-sm text-gray-600">{project.description}</p>
                  )}

                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <p>Độ khó: {project.difficulty}</p>
                    {project.dueDate && (
                      <p>Hạn nộp: {new Date(project.dueDate).toLocaleDateString('vi-VN')}</p>
                    )}
                    <p>Thành viên: {project.teamMembers?.length || 0}</p>
                    <p>Giai đoạn: {project.milestones?.length || 0}</p>
                  </div>
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
                  {project.teamMembers?.map((member) => (
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
                      {project.instructor?.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{project.instructor?.name}</p>
                    <p className="text-sm text-gray-600">{project.instructor?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Cài đặt dự án
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={project.isPublic || false}
                    onChange={(e) => setProject({ ...project, isPublic: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isPublic" className="text-sm text-gray-700">
                    Công khai dự án
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Dự án công khai sẽ hiển thị trong danh sách dự án STEM của trường
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Hành động nhanh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={handleSave}
                  disabled={!project.title?.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Lưu dự án
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      location.href = "/dashboard/stem";
                    }
                  }}
                >
                  Hủy bỏ
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component wrapper với Suspense boundary
const CreateSTEMProjectWithSuspense = () => {
  const { t } = useLanguage();
  
  return (
    <Suspense fallback={<div>{t('common.loading')}</div>}>
      <CreateSTEMProject />
    </Suspense>
  );
};

export default CreateSTEMProjectWithSuspense;
