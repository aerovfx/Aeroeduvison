"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Zap,
  Users,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  CheckCircle,
  Play,
  Eye,
  Edit,
  MoreHorizontal,
  Home,
  UserCheck,
  FileText,
  Video,
  Settings,
  BarChart3,
  Target,
  Lightbulb,
  Cpu,
  Database,
  Globe,
  Smartphone,
  Wrench,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  RefreshCw
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface STEMProject {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'in_progress' | 'completed' | 'published';
  author: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  materials: string[];
  instructions: string[];
  images: string[];
  videos: string[];
  likes: number;
  views: number;
  downloads: number;
}

interface AdminSTEMClientProps {
  initialProjects: STEMProject[];
  userEmail: string;
}

const CATEGORIES = [
  { value: 'all', label: 'Tất cả danh mục' },
  { value: 'science', label: 'Khoa học' },
  { value: 'technology', label: 'Công nghệ' },
  { value: 'engineering', label: 'Kỹ thuật' },
  { value: 'mathematics', label: 'Toán học' },
  { value: 'robotics', label: 'Robot' },
  { value: 'programming', label: 'Lập trình' },
  { value: 'electronics', label: 'Điện tử' },
  { value: 'biology', label: 'Sinh học' },
  { value: 'chemistry', label: 'Hóa học' },
  { value: 'physics', label: 'Vật lý' }
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'published', label: 'Đã xuất bản' }
];

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'Tất cả độ khó' },
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'intermediate', label: 'Trung bình' },
  { value: 'advanced', label: 'Nâng cao' }
];

export default function AdminSTEMClient({ initialProjects, userEmail }: AdminSTEMClientProps) {
  const [projects, setProjects] = useState<STEMProject[]>(initialProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);

  // Load projects from localStorage on mount
  useEffect(() => {
    const loadProjectsFromStorage = () => {
      try {
        const storedProjects = localStorage.getItem('stem-projects');
        if (storedProjects) {
          const parsedProjects = JSON.parse(storedProjects);
          setProjects(parsedProjects);
        }
      } catch (error) {
        console.error('Error loading projects from localStorage:', error);
      }
    };

    loadProjectsFromStorage();
  }, []);

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesDifficulty = difficultyFilter === "all" || project.difficulty === difficultyFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
  });

  const handleSyncSTEMProjects = async () => {
    try {
      // Get STEM projects from localStorage (from STEMContext)
      const stemProjectsData = localStorage.getItem('stem-projects');
      if (!stemProjectsData) {
        alert('Không tìm thấy dữ liệu STEM projects trong localStorage');
        return;
      }

      const stemProjects = JSON.parse(stemProjectsData);
      
      // Send to API to sync with database
      const response = await fetch('/api/admin/stem/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stemProjects }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Đã đồng bộ ${result.syncedProjects} STEM projects thành công!`);
        
        // Refresh page to get updated data
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Lỗi đồng bộ: ${error.error}`);
      }
    } catch (error) {
      console.error('Error syncing STEM projects:', error);
      alert('Lỗi khi đồng bộ STEM projects');
    }
  };

  const handlePopulateTestData = () => {
    const testProjects = [
      {
        id: '1',
        title: 'Robot điều khiển bằng giọng nói',
        description: 'Tạo robot có thể điều khiển bằng lệnh giọng nói tiếng Việt',
        category: 'robotics',
        status: 'completed',
        author: 'Nguyễn Văn A',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['AI', 'Voice Control', 'Arduino'],
        difficulty: 'intermediate',
        estimatedTime: 120,
        materials: ['Arduino Uno', 'Microphone', 'Motor', 'Wheels'],
        instructions: ['Lắp ráp phần cứng', 'Lập trình AI', 'Test thử nghiệm'],
        images: [],
        videos: [],
        likes: 15,
        views: 120,
        downloads: 8
      },
      {
        id: '2',
        title: 'Hệ thống tưới cây tự động',
        description: 'Hệ thống tưới cây thông minh sử dụng cảm biến độ ẩm',
        category: 'engineering',
        status: 'in_progress',
        author: 'Trần Thị B',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['IoT', 'Sensor', 'Automation'],
        difficulty: 'beginner',
        estimatedTime: 90,
        materials: ['ESP32', 'Soil Sensor', 'Water Pump', 'Relay'],
        instructions: ['Kết nối cảm biến', 'Lập trình logic', 'Lắp đặt hệ thống'],
        images: [],
        videos: [],
        likes: 8,
        views: 85,
        downloads: 5
      },
      {
        id: '3',
        title: 'Game học toán với Scratch',
        description: 'Tạo game học toán thú vị cho học sinh tiểu học',
        category: 'programming',
        status: 'published',
        author: 'Lê Văn C',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['Scratch', 'Education', 'Game'],
        difficulty: 'beginner',
        estimatedTime: 60,
        materials: ['Computer', 'Scratch Software'],
        instructions: ['Thiết kế game', 'Lập trình logic', 'Test và hoàn thiện'],
        images: [],
        videos: [],
        likes: 25,
        views: 200,
        downloads: 15
      }
    ];

    localStorage.setItem('stem-projects', JSON.stringify(testProjects));
    setProjects(testProjects as STEMProject[]);
    alert('Đã tạo dữ liệu test thành công!');
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'science': return <BookOpen className="h-4 w-4" />;
      case 'technology': return <Cpu className="h-4 w-4" />;
      case 'engineering': return <Wrench className="h-4 w-4" />;
      case 'mathematics': return <Target className="h-4 w-4" />;
      case 'robotics': return <Zap className="h-4 w-4" />;
      case 'programming': return <Database className="h-4 w-4" />;
      case 'electronics': return <Globe className="h-4 w-4" />;
      case 'biology': return <Users className="h-4 w-4" />;
      case 'chemistry': return <Lightbulb className="h-4 w-4" />;
      case 'physics': return <BarChart3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý dự án STEM</h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các dự án STEM của học sinh
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handlePopulateTestData} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Tạo dữ liệu test
          </Button>
          <Button onClick={handleSyncSTEMProjects} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Đồng bộ từ Students
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng dự án</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">
              +{projects.filter(p => p.status === 'published').length} đã xuất bản
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang thực hiện</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'in_progress').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((projects.filter(p => p.status === 'in_progress').length / projects.length) * 100)}% tổng số
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((projects.filter(p => p.status === 'completed').length / projects.length) * 100)}% tổng số
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt xem</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((sum, p) => sum + p.views, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Trung bình {Math.round(projects.reduce((sum, p) => sum + p.views, 0) / projects.length)} lượt/dự án
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc và tìm kiếm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, mô tả hoặc tác giả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Danh mục" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Độ khó" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_OPTIONS.map(difficulty => (
                  <SelectItem key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(project.category)}
                  <CardTitle className="text-lg">{project.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(project.status)}>
                    {STATUS_OPTIONS.find(s => s.value === project.status)?.label}
                  </Badge>
                  <Badge className={getDifficultyColor(project.difficulty)}>
                    {DIFFICULTY_OPTIONS.find(d => d.value === project.difficulty)?.label}
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-3 w-3" />
                  {project.author}
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {project.estimatedTime} phút
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star className="mr-1 h-3 w-3" />
                      {project.likes}
                    </div>
                    <div className="flex items-center">
                      <Eye className="mr-1 h-3 w-3" />
                      {project.views}
                    </div>
                    <div className="flex items-center">
                      <Download className="mr-1 h-3 w-3" />
                      {project.downloads}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {project.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Không tìm thấy dự án STEM nào</h3>
            <p className="text-muted-foreground text-center mb-4">
              {projects.length === 0 
                ? "Chưa có dự án STEM nào. Hãy tạo dữ liệu test hoặc đồng bộ từ students."
                : "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
              }
            </p>
            {projects.length === 0 && (
              <div className="flex space-x-2">
                <Button onClick={handlePopulateTestData} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo dữ liệu test
                </Button>
                <Button onClick={handleSyncSTEMProjects}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Đồng bộ từ Students
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
