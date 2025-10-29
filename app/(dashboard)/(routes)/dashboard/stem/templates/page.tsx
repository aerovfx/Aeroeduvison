'use client';

"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Search,
  Filter,
  Eye,
  Copy,
  Download,
  Plus,
  Star,
  Users,
  Calendar,
  Clock,
  Zap,
  FlaskConical,
  Cpu,
  Wrench,
  Calculator,
  BookOpen,
  Lightbulb,
  Target,
  Award,
  TrendingUp,
  BarChart3,
  ChevronLeft,
} from "lucide-react";

interface TemplateProject {
  id: string;
  title: string;
  description: string;
  category: "Science" | "Technology" | "Engineering" | "Math";
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string; // Thời gian ước tính
  tags: string[];
  features: string[];
  requirements: string[];
  learningOutcomes: string[];
  thumbnail?: string;
  rating: number;
  downloads: number;
  author: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

const templateProjects: TemplateProject[] = [
  {
    id: "t1",
    title: "Smart Home Automation System",
    description: "Xây dựng hệ thống nhà thông minh điều khiển đèn, quạt, cửa sổ thông qua ứng dụng di động",
    category: "Technology",
    difficulty: "intermediate",
    duration: "4-6 tuần",
    tags: ["IoT", "Mobile App", "Arduino", "Home Automation"],
    features: [
      "Điều khiển từ xa qua smartphone",
      "Lập lịch tự động",
      "Cảm biến nhiệt độ và độ ẩm",
      "Báo động an ninh"
    ],
    requirements: [
      "Arduino Uno hoặc ESP32",
      "Cảm biến DHT22",
      "Relay module",
      "LED, quạt mini",
      "Smartphone với Android/iOS"
    ],
    learningOutcomes: [
      "Hiểu về IoT và kết nối không dây",
      "Lập trình Arduino cơ bản",
      "Phát triển ứng dụng mobile",
      "Thiết kế giao diện người dùng"
    ],
    rating: 4.8,
    downloads: 1250,
    author: {
      name: "Thầy Nguyễn Minh IoT",
      avatar: "/avatars/teacher-iot.jpg"
    },
    createdAt: "2024-01-15",
    thumbnail: "/images/templates/smart-home.jpg"
  },
  {
    id: "t2",
    title: "AI Chatbot for Education",
    description: "Phát triển chatbot AI hỗ trợ học tập, trả lời câu hỏi và gợi ý tài liệu học",
    category: "Technology",
    difficulty: "advanced",
    duration: "6-8 tuần",
    tags: ["AI", "NLP", "Python", "Machine Learning", "Education"],
    features: [
      "Trả lời câu hỏi tự nhiên",
      "Gợi ý tài liệu học tập",
      "Theo dõi tiến độ học",
      "Tích hợp với LMS"
    ],
    requirements: [
      "Python 3.8+",
      "TensorFlow hoặc PyTorch",
      "OpenAI API hoặc Hugging Face",
      "Database (SQLite/PostgreSQL)",
      "Web framework (Flask/FastAPI)"
    ],
    learningOutcomes: [
      "Lập trình AI và Machine Learning",
      "Xử lý ngôn ngữ tự nhiên (NLP)",
      "Thiết kế API và database",
      "Tích hợp AI vào ứng dụng thực tế"
    ],
    rating: 4.9,
    downloads: 2100,
    author: {
      name: "Cô Trần Lan AI",
      avatar: "/avatars/teacher-ai.jpg"
    },
    createdAt: "2024-02-20",
    thumbnail: "/images/templates/ai-chatbot.jpg"
  },
  {
    id: "t3",
    title: "Solar Panel Efficiency Optimizer",
    description: "Thiết kế hệ thống tối ưu hóa hiệu suất pin mặt trời bằng AI và IoT",
    category: "Engineering",
    difficulty: "advanced",
    duration: "8-10 tuần",
    tags: ["Renewable Energy", "AI", "IoT", "Arduino", "Data Analysis"],
    features: [
      "Theo dõi hiệu suất real-time",
      "Tự động điều chỉnh góc nghiêng",
      "Dự đoán sản lượng điện",
      "Báo cáo chi tiết"
    ],
    requirements: [
      "Arduino hoặc Raspberry Pi",
      "Cảm biến ánh sáng và nhiệt độ",
      "Servo motor",
      "Solar panel mini",
      "Cloud platform (AWS/Azure)"
    ],
    learningOutcomes: [
      "Hiểu về năng lượng tái tạo",
      "Lập trình AI cho tối ưu hóa",
      "Phân tích dữ liệu IoT",
      "Thiết kế hệ thống thông minh"
    ],
    rating: 4.7,
    downloads: 980,
    author: {
      name: "Thầy Lê Văn Năng lượng",
      avatar: "/avatars/teacher-energy.jpg"
    },
    createdAt: "2024-01-30",
    thumbnail: "/images/templates/solar-optimizer.jpg"
  },
  {
    id: "t4",
    title: "Virtual Reality Chemistry Lab",
    description: "Tạo phòng thí nghiệm hóa học ảo với VR để thực hành an toàn",
    category: "Science",
    difficulty: "advanced",
    duration: "10-12 tuần",
    tags: ["VR", "Unity", "Chemistry", "Education", "3D Modeling"],
    features: [
      "Mô phỏng phản ứng hóa học",
      "Tương tác 3D với dụng cụ",
      "Hướng dẫn từng bước",
      "Đánh giá kết quả tự động"
    ],
    requirements: [
      "Unity 3D",
      "VR Headset (Oculus/Meta)",
      "Blender (3D modeling)",
      "C# programming",
      "Chemistry knowledge"
    ],
    learningOutcomes: [
      "Lập trình VR/AR",
      "3D modeling và animation",
      "Mô phỏng khoa học",
      "Thiết kế trải nghiệm người dùng"
    ],
    rating: 4.9,
    downloads: 1650,
    author: {
      name: "Cô Phạm Minh Hóa học",
      avatar: "/avatars/teacher-chemistry.jpg"
    },
    createdAt: "2024-03-10",
    thumbnail: "/images/templates/vr-chemistry.jpg"
  },
  {
    id: "t5",
    title: "Math Learning Game with AI",
    description: "Phát triển game học toán thông minh với AI điều chỉnh độ khó theo khả năng học sinh",
    category: "Math",
    difficulty: "intermediate",
    duration: "6-8 tuần",
    tags: ["Gamification", "AI", "Mobile App", "Mathematics", "Education"],
    features: [
      "AI điều chỉnh độ khó",
      "Hệ thống điểm và thành tích",
      "Nhiều chế độ chơi",
      "Báo cáo tiến độ chi tiết"
    ],
    requirements: [
      "React Native hoặc Flutter",
      "Python (AI backend)",
      "Firebase hoặc Supabase",
      "Machine Learning library",
      "Game design tools"
    ],
    learningOutcomes: [
      "Phát triển ứng dụng mobile",
      "Lập trình AI cho giáo dục",
      "Thiết kế game mechanics",
      "Phân tích dữ liệu học tập"
    ],
    rating: 4.6,
    downloads: 3200,
    author: {
      name: "Thầy Hoàng Văn Toán",
      avatar: "/avatars/teacher-math.jpg"
    },
    createdAt: "2024-02-05",
    thumbnail: "/images/templates/math-game.jpg"
  },
  {
    id: "t6",
    title: "Water Quality Monitoring System",
    description: "Hệ thống giám sát chất lượng nước tự động với cảm biến và báo cáo real-time",
    category: "Science",
    difficulty: "intermediate",
    duration: "5-7 tuần",
    tags: ["Environmental Science", "IoT", "Arduino", "Data Visualization", "Sensors"],
    features: [
      "Đo pH, nhiệt độ, độ đục",
      "Báo cáo real-time",
      "Cảnh báo khi có vấn đề",
      "Lưu trữ dữ liệu lịch sử"
    ],
    requirements: [
      "Arduino hoặc ESP32",
      "Cảm biến pH, TDS, nhiệt độ",
      "LCD display",
      "SD card module",
      "Web dashboard"
    ],
    learningOutcomes: [
      "Hiểu về môi trường và bảo tồn",
      "Lập trình IoT và cảm biến",
      "Phân tích dữ liệu khoa học",
      "Thiết kế dashboard web"
    ],
    rating: 4.5,
    downloads: 890,
    author: {
      name: "Cô Vũ Thị Môi trường",
      avatar: "/avatars/teacher-environment.jpg"
    },
    createdAt: "2024-01-25",
    thumbnail: "/images/templates/water-monitor.jpg"
  }
];

const STEMTemplatesPage = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [selectedProject, setSelectedProject] = useState<TemplateProject | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  // Functions for button actions
  const handleViewDetails = (project: TemplateProject) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  const handleCopyProject = (project: TemplateProject) => {
    // Copy project to clipboard or create new project based on template
    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    toast({
      title: "Đã sao chép dự án",
      description: `Dự án "${project.title}" đã được sao chép vào clipboard`,
    });
  };

  const handleDownloadProject = (project: TemplateProject) => {
    // Create and download project documentation
    const projectData = {
      title: project.title,
      description: project.description,
      category: project.category,
      difficulty: project.difficulty,
      duration: project.duration,
      tags: project.tags,
      features: project.features,
      requirements: project.requirements,
      learningOutcomes: project.learningOutcomes,
      author: project.author,
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Đã tải xuống",
      description: `Tài liệu dự án "${project.title}" đã được tải xuống`,
    });
  };

  const handleCreateFromTemplate = (project: TemplateProject) => {
    // Navigate to create page with template data
    const templateData = encodeURIComponent(JSON.stringify({
      title: `${project.title} - Copy`,
      description: project.description,
      category: project.category,
      difficulty: project.difficulty,
      tags: project.tags,
    }));
    
    if (typeof window !== 'undefined') { location.href = `/dashboard/stem/create?template=${templateData}`; }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <Badge className="bg-green-100 text-green-800">Cơ bản</Badge>;
      case "intermediate":
        return <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>;
      case "advanced":
        return <Badge className="bg-red-100 text-red-800">Nâng cao</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{difficulty}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Science":
        return <FlaskConical className="h-5 w-5 text-blue-600" />;
      case "Technology":
        return <Cpu className="h-5 w-5 text-purple-600" />;
      case "Engineering":
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case "Math":
        return <Calculator className="h-5 w-5 text-green-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredProjects = templateProjects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === "all" || project.difficulty === difficultyFilter;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "popular":
        return b.downloads - a.downloads;
      case "rating":
        return b.rating - a.rating;
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "title":
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/stem">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dự án mẫu STEM</h1>
              <p className="text-gray-600 mt-2">
                Khám phá các dự án mẫu để lấy cảm hứng và học hỏi kinh nghiệm
              </p>
            
              </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả lĩnh vực</option>
              <option value="Science">Khoa học</option>
              <option value="Technology">Công nghệ</option>
              <option value="Engineering">Kỹ thuật</option>
              <option value="Math">Toán học</option>
            </select>

            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả mức độ</option>
              <option value="beginner">Cơ bản</option>
              <option value="intermediate">Trung bình</option>
              <option value="advanced">Nâng cao</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popular">Phổ biến nhất</option>
              <option value="rating">Đánh giá cao</option>
              <option value="newest">Mới nhất</option>
              <option value="title">Tên A-Z</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng mẫu</p>
                  <p className="text-2xl font-bold text-gray-900">{templateProjects.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã tải xuống</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {templateProjects.reduce((sum, p) => sum + p.downloads, 0).toLocaleString()}
                  </p>
                </div>
                <Download className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đánh giá TB</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(templateProjects.reduce((sum, p) => sum + p.rating, 0) / templateProjects.length).toFixed(1)}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Kết quả tìm kiếm</p>
                  <p className="text-2xl font-bold text-gray-900">{sortedProjects.length}</p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(project.category)}
                    <Badge variant="outline">{project.category}</Badge>
                  </div>
                  {getDifficultyBadge(project.difficulty)}
                </div>
                
                <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                <CardDescription className="line-clamp-3">
                  {project.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Author and Stats */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">
                        {project.author.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{project.author.name}</p>
                      <p className="text-xs text-gray-500">{project.createdAt}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{project.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      <span>{project.downloads}</span>
                    </div>
                  </div>
                </div>

                {/* Duration and Tags */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{project.duration}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {project.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>

                {/* Features Preview */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Tính năng chính:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {project.features.slice(0, 2).map((feature, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                    {project.features.length > 2 && (
                      <li className="text-gray-500">+{project.features.length - 2} tính năng khác</li>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleViewDetails(project)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Xem chi tiết
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCopyProject(project)}
                    title="Sao chép dự án"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownloadProject(project)}
                    title="Tải xuống tài liệu"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {sortedProjects.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy dự án mẫu</h3>
            <p className="text-gray-600 mb-4">
              Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
            </p>
            <Button onClick={() => {
              setSearchTerm("");
              setCategoryFilter("all");
              setDifficultyFilter("all");
            }}>
              Xóa bộ lọc
            </Button>
          </div>
        )}

        {/* Project Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedProject && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {getCategoryIcon(selectedProject.category)}
                    {selectedProject.title}
                    {getDifficultyBadge(selectedProject.difficulty)}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {selectedProject.description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Project Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Thông tin cơ bản</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Lĩnh vực:</span> {selectedProject.category}</p>
                        <p><span className="font-medium">Thời gian:</span> {selectedProject.duration}</p>
                        <p><span className="font-medium">Tác giả:</span> {selectedProject.author.name}</p>
                        <p><span className="font-medium">Ngày tạo:</span> {selectedProject.createdAt}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Thống kê</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{selectedProject.rating}/5.0</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4 text-blue-500" />
                          <span>{selectedProject.downloads.toLocaleString()} lượt tải</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-900">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedProject.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Tính năng chính</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedProject.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Yêu cầu kỹ thuật</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedProject.requirements.map((req, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Learning Outcomes */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Kết quả học tập</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedProject.learningOutcomes.map((outcome, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button 
                      onClick={() => handleCreateFromTemplate(selectedProject)}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo dự án từ mẫu này
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleCopyProject(selectedProject)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Sao chép
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleDownloadProject(selectedProject)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default STEMTemplatesPage;
