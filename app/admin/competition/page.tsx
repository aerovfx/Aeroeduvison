"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCompetition } from "@/contexts/CompetitionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Plus, Search, Filter, Calendar, Clock, Users, Trophy, Award, 
  Code, Calculator, Eye, Edit, Trash2, Play, Pause, Square,
  RefreshCw, BarChart3, Download, Settings, Star, Target
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Disable static generation
export const dynamic = 'force-dynamic'

const AdminCompetitionPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { competitions, deleteCompetition, updateCompetition } = useCompetition();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedCompetition, setSelectedCompetition] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  if (!session || session.user.role !== "ADMIN") {
    router.push("/sign-in");
    return null;
  }

  const filteredCompetitions = competitions.filter(comp => {
    const matchesSearch = comp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         comp.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || comp.status === statusFilter;
    const matchesType = typeFilter === "all" || comp.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "upcoming":
        return "Sắp diễn ra";
      case "active":
        return "Đang diễn ra";
      case "ended":
        return "Đã kết thúc";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "programming":
        return <Code className="h-5 w-5" />;
      case "mathematics":
        return <Calculator className="h-5 w-5" />;
      case "mixed":
        return <Target className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "programming":
        return "Lập trình";
      case "mathematics":
        return "Toán học";
      case "mixed":
        return "Tổng hợp";
      default:
        return type;
    }
  };

  const handleStatusChange = (competitionId: string, newStatus: string) => {
    updateCompetition(competitionId, { status: newStatus as any });
  };

  const handleDeleteCompetition = (competitionId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa cuộc thi này?")) {
      deleteCompetition(competitionId);
    }
  };

  const getCompetitionStats = (competition: any) => {
    const totalSubmissions = competition.submissions.length;
    const acceptedSubmissions = competition.submissions.filter((s: any) => s.status === 'accepted').length;
    const averageScore = competition.leaderboard.length > 0 
      ? competition.leaderboard.reduce((sum: number, user: any) => sum + user.totalScore, 0) / competition.leaderboard.length
      : 0;
    
    return {
      totalSubmissions,
      acceptedSubmissions,
      averageScore: Math.round(averageScore * 100) / 100,
      participationRate: Math.round((competition.currentParticipants / competition.maxParticipants) * 100)
    };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Cuộc thi</h1>
          <p className="text-muted-foreground">
            Quản lý các cuộc thi lập trình và toán học
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowStatsDialog(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Thống kê
          </Button>
          <Button 
            variant="outline" 
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo cuộc thi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Tìm kiếm cuộc thi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Trạng thái: {statusFilter === "all" ? "Tất cả" : getStatusText(statusFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("all")}>Tất cả</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("upcoming")}>Sắp diễn ra</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("active")}>Đang diễn ra</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("ended")}>Đã kết thúc</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("cancelled")}>Đã hủy</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Loại: {typeFilter === "all" ? "Tất cả" : getTypeText(typeFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setTypeFilter("all")}>Tất cả</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("programming")}>Lập trình</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("mathematics")}>Toán học</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTypeFilter("mixed")}>Tổng hợp</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng cuộc thi</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{competitions.length}</div>
            <p className="text-xs text-muted-foreground">
              {competitions.filter(c => c.status === 'active').length} đang diễn ra
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng thí sinh</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitions.reduce((sum, comp) => sum + comp.currentParticipants, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng số người tham gia
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng bài nộp</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitions.reduce((sum, comp) => sum + comp.submissions.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng số bài nộp
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ tham gia</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(competitions.reduce((sum, comp) => sum + (comp.currentParticipants / comp.maxParticipants), 0) / competitions.length * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Trung bình
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competitions List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCompetitions.map((competition) => {
          const stats = getCompetitionStats(competition);
          return (
            <Card key={competition.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(competition.type)}
                    <div>
                      <CardTitle className="text-lg">{competition.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {competition.description}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedCompetition(competition)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(competition.id, 'active')}>
                        <Play className="h-4 w-4 mr-2" />
                        Bắt đầu
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(competition.id, 'ended')}>
                        <Square className="h-4 w-4 mr-2" />
                        Kết thúc
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteCompetition(competition.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getStatusColor(competition.status)}>
                    {getStatusText(competition.status)}
                  </Badge>
                  <Badge variant="outline">
                    {getTypeText(competition.type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(competition.startDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.duration} phút</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <span>{competition.problems.length} bài</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tổng bài nộp:</span>
                    <span className="font-medium">{stats.totalSubmissions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bài đúng:</span>
                    <span className="font-medium text-green-600">{stats.acceptedSubmissions}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Điểm TB:</span>
                    <span className="font-medium">{stats.averageScore}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tỷ lệ tham gia:</span>
                    <span className="font-medium">{stats.participationRate}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedCompetition(competition)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Xem chi tiết
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/admin/competition/${competition.id}`)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Báo cáo
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Competition Detail Dialog */}
      <Dialog open={!!selectedCompetition} onOpenChange={() => setSelectedCompetition(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCompetition?.title}</DialogTitle>
            <DialogDescription>{selectedCompetition?.description}</DialogDescription>
          </DialogHeader>
          {selectedCompetition && (
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="problems">Bài tập</TabsTrigger>
                  <TabsTrigger value="leaderboard">Bảng xếp hạng</TabsTrigger>
                  <TabsTrigger value="submissions">Bài nộp</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Thông tin cơ bản</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Loại:</span>
                          <span>{getTypeText(selectedCompetition.type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Trạng thái:</span>
                          <Badge className={getStatusColor(selectedCompetition.status)}>
                            {getStatusText(selectedCompetition.status)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Thời gian bắt đầu:</span>
                          <span>{new Date(selectedCompetition.startDate).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thời gian kết thúc:</span>
                          <span>{new Date(selectedCompetition.endDate).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Thời gian thi:</span>
                          <span>{selectedCompetition.duration} phút</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Thống kê</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Số thí sinh:</span>
                          <span>{selectedCompetition.currentParticipants}/{selectedCompetition.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Số bài tập:</span>
                          <span>{selectedCompetition.problems.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tổng bài nộp:</span>
                          <span>{selectedCompetition.submissions.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Bài đúng:</span>
                          <span className="text-green-600">
                            {selectedCompetition.submissions.filter((s: any) => s.status === 'accepted').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="problems" className="space-y-4">
                  <div className="space-y-4">
                    {selectedCompetition.problems.map((problem: any, index: number) => (
                      <Card key={problem.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Bài {index + 1}: {problem.title}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{problem.points} điểm</Badge>
                              <Badge variant={
                                problem.difficulty === 'easy' ? 'default' :
                                problem.difficulty === 'medium' ? 'secondary' : 'destructive'
                              }>
                                {problem.difficulty === 'easy' ? 'Dễ' :
                                 problem.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {problem.description}
                          </p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Thời gian giới hạn:</span> {problem.timeLimit} phút
                            </div>
                            <div>
                              <span className="font-medium">Thể loại:</span> {problem.category}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="leaderboard" className="space-y-4">
                  <div className="space-y-2">
                    {selectedCompetition.leaderboard.map((user: any, index: number) => (
                      <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                            {user.rank}
                          </div>
                          <div>
                            <p className="font-medium">{user.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.problemsSolved} bài • {user.submissions} lần nộp
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{user.totalScore}</p>
                          <p className="text-sm text-muted-foreground">{user.totalTime} phút</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="submissions" className="space-y-4">
                  <div className="space-y-2">
                    {selectedCompetition.submissions.map((submission: any) => (
                      <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{submission.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {submission.language} • {new Date(submission.submittedAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant={
                            submission.status === 'accepted' ? 'default' :
                            submission.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {submission.status === 'accepted' ? 'Đúng' :
                             submission.status === 'pending' ? 'Chờ' : 'Sai'}
                          </Badge>
                          <div className="text-right">
                            <p className="font-bold">{submission.score}</p>
                            <p className="text-sm text-muted-foreground">
                              {submission.executionTime}ms
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Competition Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo cuộc thi mới</DialogTitle>
            <DialogDescription>
              Tạo một cuộc thi lập trình hoặc toán học mới
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Tính năng tạo cuộc thi sẽ được phát triển trong phiên bản tiếp theo
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Statistics Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Thống kê cuộc thi</DialogTitle>
            <DialogDescription>
              Tổng quan về tất cả các cuộc thi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tổng cuộc thi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{competitions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Đang diễn ra</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {competitions.filter(c => c.status === 'active').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Đã kết thúc</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">
                    {competitions.filter(c => c.status === 'ended').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Sắp diễn ra</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {competitions.filter(c => c.status === 'upcoming').length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompetitionPage;
