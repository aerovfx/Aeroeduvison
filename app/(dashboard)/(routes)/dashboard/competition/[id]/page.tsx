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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';
import {
  ArrowLeft, Calendar, Clock, Users, Trophy, Award, 
  Code, Calculator, Eye, Play, Pause, Square, Star, Target,
  CheckCircle, XCircle, AlertCircle, Timer, Zap, Flame,
  Send, Download, BookOpen, Lightbulb, Lock, Unlock
} from "lucide-react";

interface CompetitionDetailProps {
  params: Promise<{ id: string }>;
}

const StudentCompetitionDetailPage = ({ params }: CompetitionDetailProps) => {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { getCompetition, submitSolution, getMySubmissions } = useCompetition();
  const [competition, setCompetition] = useState<any>(null);
  const [selectedProblem, setSelectedProblem] = useState<any>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submissionCode, setSubmissionCode] = useState("");
  const [submissionLanguage, setSubmissionLanguage] = useState("python");
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/sign-in");
      return;
    }

    if (session.user.role !== "STUDENT") {
      router.push("/teacher/dashboard");
      return;
    }

    // Get competition data
    const comp = getCompetition(resolvedParams.id);
    if (comp) {
      setCompetition(comp);
      // Get my submissions
      const submissions = getMySubmissions(resolvedParams.id, session.user.id || "user_1");
      setMySubmissions(submissions);
    } else {
      // Competition not found, redirect back
      router.push("/dashboard/competition");
    }
  }, [session, resolvedParams.id, getCompetition, getMySubmissions, router]);

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

  const canSubmit = () => {
  const { t } = useLanguage();
    return competition.status === "active" && 
           new Date() >= new Date(competition.startDate) && 
           new Date() <= new Date(competition.endDate);
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const end = new Date(competition.endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Đã kết thúc";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const handleSubmitSolution = async () => {
    if (!submissionCode.trim() || !selectedProblem) return;
    
    setIsSubmitting(true);
    
    // Simulate submission
    setTimeout(() => {
      const newSubmission = {
        competitionId: competition.id,
        problemId: selectedProblem.id,
        userId: session?.user?.id || "user_1",
        userName: session?.user?.name || "Student",
        code: submissionCode,
        language: submissionLanguage as any,
        status: Math.random() > 0.5 ? "accepted" : "wrong-answer" as "accepted" | "wrong-answer",
        score: Math.random() > 0.5 ? selectedProblem.points : 0,
        executionTime: Math.floor(Math.random() * 1000) + 100,
        memoryUsed: Math.floor(Math.random() * 100) + 50
      };
      
      submitSolution(competition.id, selectedProblem.id, newSubmission);
      
      // Update local state
      setMySubmissions([...mySubmissions, newSubmission]);
      setSubmissionCode("");
      setShowSubmitDialog(false);
      setIsSubmitting(false);
    }, 2000);
  };

  const getMyScore = () => {
    return mySubmissions
      .filter(s => s.status === "accepted")
      .reduce((sum, s) => sum + s.score, 0);
  };

  const getMyRank = () => {
    const myScore = getMyScore();
    const betterScores = competition.leaderboard.filter((user: any) => user.totalScore > myScore).length;
    return betterScores + 1;
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
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Tải đề
          </Button>
          <Button variant="outline" size="sm">
            <Trophy className="h-4 w-4 mr-2" />
            Bảng xếp hạng
          </Button>
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

              {competition.status === "active" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Clock className="h-5 w-5" />
                    <span className="font-medium">
                      Còn lại: {getTimeRemaining()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tiến độ của bạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{getMyScore()}</div>
                  <div className="text-sm text-muted-foreground">Điểm</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">#{getMyRank()}</div>
                  <div className="text-sm text-muted-foreground">Xếp hạng</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{mySubmissions.length}</div>
                  <div className="text-sm text-muted-foreground">Bài nộp</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {mySubmissions.filter(s => s.status === "accepted").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Bài đúng</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
              </div>
            </CardContent>
          </Card>

          {/* Prizes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Giải thưởng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {competition.prizes.map((prize: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{prize.title}</p>
                      <p className="text-xs text-muted-foreground">{prize.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{prize.value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Problems List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Danh sách bài tập
          </CardTitle>
          <CardDescription>
            {competition.problems.length} bài tập • Tổng điểm: {competition.problems.reduce((sum: number, p: any) => sum + p.points, 0)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competition.problems.map((problem: any, index: number) => {
              const myProblemSubmissions = mySubmissions.filter(s => s.problemId === problem.id);
              const isSolved = myProblemSubmissions.some(s => s.status === "accepted");
              const bestScore = Math.max(...myProblemSubmissions.map(s => s.score), 0);
              
              return (
                <div key={problem.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    
              </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{problem.title}</h3>
                        {isSolved && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {problem.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{problem.points} điểm</Badge>
                        <Badge className={`text-xs ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyText(problem.difficulty)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {problem.timeLimit} phút
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {isSolved && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">{bestScore} điểm</p>
                        <p className="text-xs text-muted-foreground">
                          {myProblemSubmissions.length} lần nộp
                        </p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedProblem(problem)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem đề
                    </Button>
                    {canSubmit() && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedProblem(problem);
                          setShowSubmitDialog(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Nộp bài
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* My Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Bài nộp của tôi
          </CardTitle>
          <CardDescription>
            {mySubmissions.length} bài nộp • {mySubmissions.filter(s => s.status === "accepted").length} bài đúng
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mySubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có bài nộp nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mySubmissions.map((submission: any) => (
                <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSubmissionStatusIcon(submission.status)}
                    <div>
                      <p className="font-medium text-sm">
                        {competition.problems.find((p: any) => p.id === submission.problemId)?.title || "Unknown Problem"}
                      </p>
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">
                        {submission.executionTime}ms
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowSubmitDialog(true);
                  }}
                  disabled={!canSubmit()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Nộp bài
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Tải đề
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Solution Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nộp bài: {selectedProblem?.title}</DialogTitle>
            <DialogDescription>
              Viết code để giải bài tập này
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium">Ngôn ngữ lập trình:</label>
                <Select value={submissionLanguage} onValueChange={setSubmissionLanguage}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Thời gian còn lại:</label>
                <p className="text-lg font-semibold text-green-600">{getTimeRemaining()}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Code của bạn:</label>
              <Textarea
                value={submissionCode}
                onChange={(e) => setSubmissionCode(e.target.value)}
                placeholder="Viết code của bạn ở đây..."
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSubmitDialog(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button 
                onClick={handleSubmitSolution}
                disabled={!submissionCode.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Đang nộp...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Nộp bài
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentCompetitionDetailPage;
