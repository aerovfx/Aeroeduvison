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
  Video, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Play,
  Clock,
  Eye,
  Download,
  Upload,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileVideo,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoLesson {
  id: string;
  title: string;
  description: string;
  course: string;
  instructor: string;
  duration: string;
  fileSize: string;
  views: number;
  uploadDate: string;
  status: "processing" | "ready" | "published" | "archived";
  quality: "480p" | "720p" | "1080p";
  thumbnail?: string;
}

const VideoManagement = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [videos] = useState<VideoLesson[]>([
    {
      id: "1",
      title: "Bài giảng Toán lớp 6 - Phân số",
      description: "Giới thiệu về phân số và các phép tính cơ bản",
      course: "Toán học lớp 6",
      instructor: "Trần Thị Bình",
      duration: "45:30",
      fileSize: "1.2 GB",
      views: 1250,
      uploadDate: "2024-12-15",
      status: "published",
      quality: "1080p"
    },
    {
      id: "2",
      title: "Thí nghiệm Vật lý - Định luật Ohm",
      description: "Thực hành đo điện trở và kiểm tra định luật Ohm",
      course: "Vật lý lớp 8",
      instructor: "Lê Văn Minh",
      duration: "38:15",
      fileSize: "980 MB",
      views: 890,
      uploadDate: "2024-12-10",
      status: "published",
      quality: "720p"
    },
    {
      id: "3",
      title: "Phản ứng Hóa học - Axit và Bazơ",
      description: "Giải thích về phản ứng giữa axit và bazơ",
      course: "Hóa học lớp 9",
      instructor: "Phạm Thị Lan",
      duration: "52:45",
      fileSize: "1.5 GB",
      views: 0,
      uploadDate: "2024-12-18",
      status: "processing",
      quality: "1080p"
    },
    {
      id: "4",
      title: "Tiếng Anh - Thì hiện tại đơn",
      description: "Học ngữ pháp về thì hiện tại đơn trong tiếng Anh",
      course: "Tiếng Anh lớp 7",
      instructor: "John Smith",
      duration: "41:20",
      fileSize: "1.1 GB",
      views: 2100,
      uploadDate: "2024-12-05",
      status: "published",
      quality: "720p"
    },
    {
      id: "5",
      title: "Lịch sử Việt Nam - Thời kỳ phong kiến",
      description: "Tìm hiểu về lịch sử Việt Nam thời kỳ phong kiến",
      course: "Lịch sử lớp 8",
      instructor: "Nguyễn Văn Cường",
      duration: "48:10",
      fileSize: "1.3 GB",
      views: 0,
      uploadDate: "2024-12-20",
      status: "ready",
      quality: "1080p"
    }
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800">Đã xuất bản</Badge>;
      case "ready":
        return <Badge className="bg-blue-100 text-blue-800">Sẵn sàng</Badge>;
      case "processing":
        return <Badge className="bg-yellow-100 text-yellow-800">Đang xử lý</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Đã lưu trữ</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case "1080p":
        return <Badge className="bg-purple-100 text-purple-800">1080p</Badge>;
      case "720p":
        return <Badge className="bg-blue-100 text-blue-800">720p</Badge>;
      case "480p":
        return <Badge className="bg-green-100 text-green-800">480p</Badge>;
      default:
        return <Badge variant="secondary">{quality}</Badge>;
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || video.course === courseFilter;
    const matchesStatus = statusFilter === "all" || video.status === statusFilter;
    
    return matchesSearch && matchesCourse && matchesStatus;
  });

  const totalVideos = videos.length;
  const publishedVideos = videos.filter(v => v.status === "published").length;
  const processingVideos = videos.filter(v => v.status === "processing").length;
  const readyVideos = videos.filter(v => v.status === "ready").length;
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalSize = videos.reduce((sum, v) => {
    const size = parseFloat(v.fileSize.replace(/[^\d.]/g, ''));
    const unit = v.fileSize.includes('GB') ? 1 : 0.001;
    return sum + (size * unit);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quản lý video
              </h1>
              <p className="text-gray-600">
                Quản lý thư viện video bài giảng
              </p>
            
              <LanguageSwitcherCompact /></div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Tạo video mới
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng video</p>
                  <p className="text-2xl font-bold text-gray-900">{totalVideos}</p>
                </div>
                <Video className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã xuất bản</p>
                  <p className="text-2xl font-bold text-green-600">{publishedVideos}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang xử lý</p>
                  <p className="text-2xl font-bold text-yellow-600">{processingVideos}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sẵn sàng</p>
                  <p className="text-2xl font-bold text-blue-600">{readyVideos}</p>
                </div>
                <FileVideo className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng lượt xem</p>
                  <p className="text-2xl font-bold text-purple-600">{totalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dung lượng</p>
                  <p className="text-2xl font-bold text-orange-600">{totalSize.toFixed(1)} GB</p>
                </div>
                <Download className="h-8 w-8 text-orange-600" />
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
                    placeholder="Tìm kiếm video..."
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
                  <option value="Lịch sử lớp 8">Lịch sử lớp 8</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="ready">Sẵn sàng</option>
                  <option value="processing">Đang xử lý</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card key={video.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{video.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">
                      {video.description}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Xem video
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Video Thumbnail Placeholder */}
                  <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Play className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Video Preview</p>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Khóa học:</span>
                      <span className="text-sm font-medium">{video.course}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Giảng viên:</span>
                      <span className="text-sm font-medium">{video.instructor}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Chất lượng:</span>
                      {getQualityBadge(video.quality)}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Trạng thái:</span>
                      {getStatusBadge(video.status)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{video.duration}</p>
                      <p className="text-xs text-gray-600">Thời lượng</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{video.views.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Lượt xem</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{video.fileSize}</p>
                      <p className="text-xs text-gray-600">Dung lượng</p>
                    </div>
                  </div>

                  {/* Upload Date */}
                  <div className="flex items-center text-xs text-gray-600 pt-4 border-t">
                    <Clock className="h-3 w-3 mr-1" />
                    Uploaded: {video.uploadDate}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Xem
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Sửa
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredVideos.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy video nào
              </h3>
              <p className="text-gray-600 mb-4">
                Thử thay đổi bộ lọc hoặc upload video mới
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VideoManagement;
