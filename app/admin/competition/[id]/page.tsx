'use client';

"use client";

import { useState, use, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCompetition } from "@/contexts/CompetitionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
import {
  ArrowLeft, Calendar, Clock, Users, Trophy, Award, 
  Code, Calculator, Eye, Edit, Trash2, Play, Pause, Square,
  RefreshCw, BarChart3, Download, Settings, Star, Target,
  CheckCircle, XCircle, AlertCircle, Timer, Zap, Flame
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompetitionDetailProps {
  params: Promise<{ id: string }>;
}

const AdminCompetitionDetailPage = ({ params }: CompetitionDetailProps) => {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { getCompetition, updateCompetition, deleteCompetition } = useCompetition();
  const [competition, setCompetition] = useState<any>(null);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);

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

    // Get competition data
    const comp = getCompetition(resolvedParams.id);
    if (comp) {
      setCompetition(comp);
    } else {
      // Competition not found, redirect back
      router.push("/admin/competition");
    }
  }, [session, resolvedParams.id, getCompetition, router]);

  if (!competition) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "Dễ";
      case "medium":
        return "Trung bình";
      case "hard":
        return "Khó";
      default:
        return difficulty;
    }
  };

  const getSubmissionStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "wrong-answer":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "time-limit":
        return <Timer className="h-4 w-4 text-orange-500" />;
      case "runtime-error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "compilation-error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSubmissionStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Đúng";
      case "wrong-answer":
        return "Sai đáp án";
      case "time-limit":
        return "Quá thời gian";
      case "runtime-error":
        return "Lỗi runtime";
      case "compilation-error":
        return "Lỗi biên dịch";
      case "pending":
        return "Đang chấm";
      default:
        return status;
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateCompetition(competition.id, { status: newStatus as any });
    setCompetition({ ...competition, status: newStatus });
  };

  const handleDeleteCompetition = () => {
  const { t } = useLanguage();
    if (confirm("Bạn có chắc chắn muốn xóa cuộc thi này?")) {
      deleteCompetition(competition.id);
      router.push("/admin/competition");
    }
  };

  const getCompetitionStats = () => {
    const totalSubmissions = competition.submissions.length;
    const acceptedSubmissions = competition.submissions.filter((s: any) => s.status === 'accepted').length;
    const averageScore = competition.leaderboard.length > 0 
      ? competition.leaderboard.reduce((sum: number, user: any) => sum + user.totalScore, 0) / competition.leaderboard.length
      : 0;
    const participationRate = Math.round((competition.currentParticipants / competition.maxParticipants) * 100);
    
    return {
      totalSubmissions,
      acceptedSubmissions,
      averageScore: Math.round(averageScore * 100) / 100,
      participationRate
    };
  };

  const stats = getCompetitionStats();

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Thao tác
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                <Play className="h-4 w-4 mr-2" />
                Bắt đầu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusChange('ended')}>
                <Square className="h-4 w-4 mr-2" />
                Kết thúc
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDeleteCompetition}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa cuộc thi
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Competition Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(competition.type)}
                  <div>
                    <CardTitle className="text-2xl">{competition.title}</CardTitle>
                    <CardDescription>{competition.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(competition.status)}>
                    {getStatusText(competition.status)}
                  </Badge>
                  <Badge variant="outline">
                    {getTypeText(competition.type)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Thời gian bắt đầu</p>
                  <p className="text-lg font-semibold">
                    {new Date(competition.startDate).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Thời gian kết thúc</p>
                  <p className="text-lg font-semibold">
                    {new Date(competition.endDate).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Thời gian thi</p>
                  <p className="text-lg font-semibold">{competition.duration} phút</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Số thí sinh</p>
                  <p className="text-lg font-semibold">
                    {competition.currentParticipants}/{competition.maxParticipants}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Thống kê cuộc thi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                  <div className="text-sm text-muted-foreground">Tổng bài nộp</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.acceptedSubmissions}</div>
                  <div className="text-sm text-muted-foreground">Bài đúng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.averageScore}</div>
                  <div className="text-sm text-muted-foreground">Điểm TB</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.participationRate}%</div>
                  <div className="text-sm text-muted-foreground">Tỷ lệ tham gia</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa cuộc thi
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Xem chi tiết
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Tải xuống báo cáo
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="destructive"
                onClick={handleDeleteCompetition}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa cuộc thi
              </Button>
            </CardContent>
          </Card>

          {/* Competition Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Thông tin cuộc thi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Trạng thái:</span>
                  <Badge className={getStatusColor(competition.status)}>
                    {getStatusText(competition.status)}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Loại:</span>
                  <span>{getTypeText(competition.type)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Số bài tập:</span>
                  <span>{competition.problems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Thời gian:</span>
                  <span>{competition.duration} phút</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Thí sinh:</span>
                  <span>{competition.currentParticipants}/{competition.maxParticipants}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Công khai:</span>
                  <span>{competition.isPublic ? "Có" : "Không"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="problems" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="problems">Bài tập</TabsTrigger>
          <TabsTrigger value="submissions">Bài nộp</TabsTrigger>
          <TabsTrigger value="leaderboard">Bảng xếp hạng</TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
        </TabsList>
        
        <TabsContent value="problems" className="space-y-4">
          <div className="space-y-4">
            {competition.problems.map((problem: any, index: number) => (
              <Card key={problem.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Bài {index + 1}: {problem.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{problem.points} điểm</Badge>
                      <Badge className={getDifficultyColor(problem.difficulty)}>
                        {getDifficultyText(problem.difficulty)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{problem.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Thời gian giới hạn:</span> {problem.timeLimit} phút
                    </div>
                    <div>
                      <span className="font-medium">Thể loại:</span> {problem.category}
                    </div>
                    <div>
                      <span className="font-medium">Test cases:</span> {problem.testCases.length}
                    </div>
                    <div>
                      <span className="font-medium">Tags:</span> {problem.tags.join(", ")}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Sample Input:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm">{problem.sampleInput}</pre>
                    <h4 className="font-medium">Sample Output:</h4>
                    <pre className="bg-gray-100 p-3 rounded text-sm">{problem.sampleOutput}</pre>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedProblem(problem)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem chi tiết
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Chỉnh sửa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="submissions" className="space-y-4">
          <div className="space-y-2">
            {competition.submissions.map((submission: any) => (
              <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {getSubmissionStatusIcon(submission.status)}
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
                    {getSubmissionStatusText(submission.status)}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold">{submission.score}</p>
                    <p className="text-sm text-muted-foreground">
                      {submission.executionTime}ms • {submission.memoryUsed}MB
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="leaderboard" className="space-y-4">
          <div className="space-y-2">
            {competition.leaderboard.map((user: any, index: number) => (
              <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    {user.rank}
                  
              <LanguageSwitcherCompact /></div>
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
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt cuộc thi</CardTitle>
              <CardDescription>Quản lý các cài đặt và quy tắc cuộc thi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Quy tắc cuộc thi:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {competition.rules.map((rule: string, index: number) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Giải thưởng:</h4>
                <div className="space-y-2">
                  {competition.prizes.map((prize: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{prize.title}</p>
                        <p className="text-sm text-muted-foreground">{prize.description}</p>
                      </div>
                      <Badge variant="outline">{prize.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Problem Detail Dialog */}
      <Dialog open={!!selectedProblem} onOpenChange={() => setSelectedProblem(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProblem?.title}</DialogTitle>
            <DialogDescription>{selectedProblem?.description}</DialogDescription>
          </DialogHeader>
          {selectedProblem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Độ khó:</span>
                  <Badge className={`ml-2 ${getDifficultyColor(selectedProblem.difficulty)}`}>
                    {getDifficultyText(selectedProblem.difficulty)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Điểm:</span> {selectedProblem.points}
                </div>
                <div>
                  <span className="font-medium">Thời gian:</span> {selectedProblem.timeLimit} phút
                </div>
                <div>
                  <span className="font-medium">Thể loại:</span> {selectedProblem.category}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Ràng buộc:</h4>
                <p className="text-sm text-muted-foreground">{selectedProblem.constraints}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Sample Input:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm">{selectedProblem.sampleInput}</pre>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Sample Output:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm">{selectedProblem.sampleOutput}</pre>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Gợi ý:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {selectedProblem.hints.map((hint: string, index: number) => (
                    <li key={index}>{hint}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tags:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProblem.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa cuộc thi</DialogTitle>
            <DialogDescription>
              Chỉnh sửa thông tin cuộc thi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Tính năng chỉnh sửa cuộc thi sẽ được phát triển trong phiên bản tiếp theo
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowEditDialog(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Thống kê chi tiết cuộc thi</DialogTitle>
            <DialogDescription>
              Phân tích chi tiết về cuộc thi {competition.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tổng bài nộp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bài đúng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.acceptedSubmissions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tỷ lệ đúng</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalSubmissions > 0 ? Math.round((stats.acceptedSubmissions / stats.totalSubmissions) * 100) : 0}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Điểm TB</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.averageScore}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCompetitionDetailPage;
