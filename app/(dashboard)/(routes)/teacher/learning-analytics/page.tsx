"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Brain,
  AlertTriangle,
  CheckCircle,
  Target,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Sparkles,
  FileText,
  Clock,
  Award
} from "lucide-react";
import toast from "react-hot-toast";

// Mock student data - replace with real API
const mockStudentData = [
  {
    id: "student-1",
    name: "Nguyễn Văn A",
    email: "student1@example.com",
    avatar: null,
    overallProgress: 75,
    strongTopics: ["Đại số", "Hình học"],
    weakTopics: ["Giải tích", "Xác suất"],
    recentScores: [85, 90, 78, 82, 88],
    lastActivity: "2025-10-10",
    totalQuizzes: 15,
    completedQuizzes: 12,
    averageScore: 84.6,
    trend: "up" // up, down, stable
  },
  {
    id: "student-2",
    name: "Trần Thị B",
    email: "student2@example.com",
    avatar: null,
    overallProgress: 45,
    strongTopics: ["Hình học"],
    weakTopics: ["Đại số", "Giải tích", "Lượng giác"],
    recentScores: [45, 50, 42, 48, 44],
    lastActivity: "2025-10-09",
    totalQuizzes: 15,
    completedQuizzes: 8,
    averageScore: 45.8,
    trend: "down"
  },
  {
    id: "student-3",
    name: "Lê Văn C",
    email: "student3@example.com",
    avatar: null,
    overallProgress: 92,
    strongTopics: ["Đại số", "Giải tích", "Hình học", "Lượng giác"],
    weakTopics: [],
    recentScores: [95, 92, 98, 90, 94],
    lastActivity: "2025-10-10",
    totalQuizzes: 15,
    completedQuizzes: 15,
    averageScore: 93.8,
    trend: "up"
  }
];

export default function LearningAnalyticsPage() {
  const { data: session } = useSession();
  const [students, setStudents] = useState(mockStudentData);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<any>(null);

  // Generate AI insights for a student
  const generateAIInsights = async (student: any) => {
    setIsGeneratingInsights(true);
    const loadingToast = toast.loading('🤖 AI đang phân tích dữ liệu học sinh...');

    try {
      // Simulate AI analysis (replace with real AI call to Ollama/Cursor)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const insights = {
        summary: `${student.name} đang có xu hướng ${student.trend === 'up' ? 'tiến bộ' : student.trend === 'down' ? 'tụt lại' : 'ổn định'}. Điểm trung bình: ${student.averageScore}%.`,
        
        strengths: student.strongTopics.length > 0 
          ? `Học sinh xuất sắc ở các chủ đề: ${student.strongTopics.join(', ')}. Nên khuyến khích làm thêm bài nâng cao.`
          : 'Chưa xác định được điểm mạnh rõ ràng.',
        
        weaknesses: student.weakTopics.length > 0
          ? `Cần cải thiện ở: ${student.weakTopics.join(', ')}. Đây là những chủ đề cần ưu tiên ôn tập.`
          : 'Không có điểm yếu rõ rệt.',
        
        reteachStrategy: student.weakTopics.length > 0 ? [
          {
            topic: student.weakTopics[0],
            action: "Dạy lại với phương pháp trực quan",
            reason: "Học sinh học tốt hơn với hình ảnh và ví dụ thực tế",
            resources: ["Video bài giảng", "Bài tập thực hành có hướng dẫn", "Quiz nhỏ 5 câu/ngày"],
            timeline: "2 tuần"
          },
          {
            topic: student.weakTopics[1] || student.weakTopics[0],
            action: "Luyện tập chuyên sâu theo nhóm nhỏ",
            reason: "Cần củng cố nền tảng trước khi học tiếp",
            resources: ["Bài tập theo cấp độ", "Tài liệu tham khảo", "Video giảng chi tiết"],
            timeline: "1 tuần"
          }
        ] : [
          {
            topic: "Tổng quát",
            action: "Duy trì và phát triển",
            reason: "Học sinh đang tiến bộ tốt",
            resources: ["Bài tập nâng cao", "Đề thi thử", "Projects thực tế"],
            timeline: "Liên tục"
          }
        ],
        
        recommendations: [
          student.averageScore < 50 
            ? "Cần gặp phụ huynh để thảo luận về kế hoạch học tập"
            : student.averageScore < 70
              ? "Nên tăng cường luyện tập thêm 30 phút/ngày"
              : "Khuyến khích tham gia các hoạt động nâng cao",
          
          student.completedQuizzes < student.totalQuizzes * 0.7
            ? "Nhắc nhở hoàn thành các quiz còn lại"
            : "Tạo thêm quiz mới để duy trì đà học tập",
          
          student.trend === 'down'
            ? "⚠️ Cảnh báo: Điểm số đang giảm - cần can thiệp sớm"
            : student.trend === 'up'
              ? "✅ Xu hướng tích cực - tiếp tục phương pháp hiện tại"
              : "Duy trì phương pháp hiện tại"
        ]
      };

      setAiInsights(insights);
      toast.dismiss(loadingToast);
      toast.success('✅ AI đã hoàn thành phân tích!', { duration: 3000 });

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('❌ Không thể tạo insights!');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Class overview stats
  const classStats = {
    totalStudents: students.length,
    averageProgress: Math.round(students.reduce((acc, s) => acc + s.overallProgress, 0) / students.length),
    averageScore: Math.round(students.reduce((acc, s) => acc + s.averageScore, 0) / students.length * 10) / 10,
    studentsImproving: students.filter(s => s.trend === 'up').length,
    studentsNeedHelp: students.filter(s => s.averageScore < 50).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              Learning Analytics Dashboard
            </h1>
            <p className="text-blue-100 text-lg">
              Theo dõi tiến độ và phân tích học sinh với AI
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{classStats.totalStudents}</div>
            <div className="text-blue-100">Học sinh</div>
          </div>
        </div>
      </div>

      {/* Class Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Tiến độ TB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">{classStats.averageProgress}%</div>
              <Target className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Điểm TB</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">{classStats.averageScore}%</div>
              <Award className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Đang tiến bộ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-emerald-600">{classStats.studentsImproving}</div>
              <TrendingUp className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Cần hỗ trợ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">{classStats.studentsNeedHelp}</div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students List & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Danh sách học sinh
            </CardTitle>
            <CardDescription>
              Click vào học sinh để xem phân tích chi tiết
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    setAiInsights(null);
                  }}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStudent?.id === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </div>
                    </div>
                    {student.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : student.trend === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <div className="h-4 w-4 text-gray-400">→</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          student.overallProgress >= 70
                            ? 'bg-green-500'
                            : student.overallProgress >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${student.overallProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{student.overallProgress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Student Analytics & AI Insights */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Chi tiết phân tích {selectedStudent ? `- ${selectedStudent.name}` : ''}
            </CardTitle>
            <CardDescription>
              {selectedStudent 
                ? 'Phân tích AI về điểm mạnh, điểm yếu và chiến lược dạy lại'
                : 'Chọn một học sinh để xem phân tích chi tiết'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedStudent ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="analysis">Phân tích</TabsTrigger>
                  <TabsTrigger value="reteach">Chiến lược dạy lại</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-700 mb-1">Tiến độ tổng thể</div>
                      <div className="text-3xl font-bold text-blue-900">{selectedStudent.overallProgress}%</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-sm text-green-700 mb-1">Điểm trung bình</div>
                      <div className="text-3xl font-bold text-green-900">{selectedStudent.averageScore}%</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-sm text-purple-700 mb-1">Quiz hoàn thành</div>
                      <div className="text-3xl font-bold text-purple-900">
                        {selectedStudent.completedQuizzes}/{selectedStudent.totalQuizzes}
                      </div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="text-sm text-orange-700 mb-1">Hoạt động gần nhất</div>
                      <div className="text-sm font-bold text-orange-900">{selectedStudent.lastActivity}</div>
                    </div>
                  </div>

                  {/* Recent Scores Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Điểm 5 lần làm gần nhất
                    </h3>
                    <div className="flex items-end gap-2 h-32">
                      {selectedStudent.recentScores.map((score: number, idx: number) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className={`w-full rounded-t-lg transition-all ${
                              score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ height: `${score}%` }}
                          />
                          <div className="text-xs font-semibold text-gray-600">{score}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Analysis Tab */}
                <TabsContent value="analysis" className="space-y-4">
                  {/* Strengths */}
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">Điểm mạnh</h3>
                    </div>
                    {selectedStudent.strongTopics.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-green-800">
                          Học sinh xuất sắc ở các chủ đề:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.strongTopics.map((topic: string) => (
                            <Badge key={topic} className="bg-green-500 text-white">
                              ✓ {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">Chưa xác định được điểm mạnh rõ ràng.</p>
                    )}
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold text-red-900">Điểm yếu cần cải thiện</h3>
                    </div>
                    {selectedStudent.weakTopics.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-800">
                          Các chủ đề cần ưu tiên ôn tập:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedStudent.weakTopics.map((topic: string) => (
                            <Badge key={topic} className="bg-red-500 text-white">
                              ⚠️ {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-700">Không có điểm yếu rõ rệt. Tiếp tục duy trì!</p>
                    )}
                  </div>

                  {/* AI Generate Insights Button */}
                  <Button
                    onClick={() => generateAIInsights(selectedStudent)}
                    disabled={isGeneratingInsights}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isGeneratingInsights ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        AI đang phân tích...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Tạo phân tích AI chi tiết
                      </>
                    )}
                  </Button>

                  {/* AI Insights Display */}
                  {aiInsights && (
                    <div className="mt-4 space-y-4 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <h3 className="font-bold text-purple-900">AI Insights</h3>
                      </div>

                      {/* Summary */}
                      <div className="bg-white p-3 rounded-lg border border-purple-200">
                        <p className="text-sm text-gray-800">{aiInsights.summary}</p>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                          <div className="font-semibold text-green-900 text-sm mb-1">✓ Điểm mạnh</div>
                          <p className="text-xs text-green-800">{aiInsights.strengths}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg border border-red-300">
                          <div className="font-semibold text-red-900 text-sm mb-1">⚠️ Điểm yếu</div>
                          <p className="text-xs text-red-800">{aiInsights.weaknesses}</p>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="bg-white p-3 rounded-lg border border-purple-200">
                        <div className="font-semibold text-purple-900 mb-2 text-sm">💡 Đề xuất</div>
                        <ul className="space-y-1">
                          {aiInsights.recommendations.map((rec: string, idx: number) => (
                            <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                              <span className="text-purple-600">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Reteach Strategy Tab */}
                <TabsContent value="reteach" className="space-y-4">
                  {aiInsights ? (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Lightbulb className="h-5 w-5 text-orange-600" />
                          <h3 className="font-bold text-orange-900">Chiến lược dạy lại do AI đề xuất</h3>
                        </div>
                        <p className="text-sm text-orange-800 mb-4">
                          Dựa trên phân tích điểm yếu của học sinh, AI đề xuất các chiến lược sau:
                        </p>
                      </div>

                      {aiInsights.reteachStrategy.map((strategy: any, idx: number) => (
                        <Card key={idx} className="border-2 border-orange-200 hover:border-orange-400 transition-all">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base flex items-center gap-2">
                                <Target className="h-4 w-4 text-orange-600" />
                                Chủ đề: {strategy.topic}
                              </CardTitle>
                              <Badge className="bg-orange-100 text-orange-700">
                                <Clock className="h-3 w-3 mr-1" />
                                {strategy.timeline}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Action */}
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">🎯 Hành động</div>
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 text-sm text-blue-900">
                                {strategy.action}
                              </div>
                            </div>

                            {/* Reason */}
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">💭 Lý do</div>
                              <div className="bg-purple-50 p-2 rounded border border-purple-200 text-sm text-purple-900">
                                {strategy.reason}
                              </div>
                            </div>

                            {/* Resources */}
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">📚 Tài nguyên đề xuất</div>
                              <div className="space-y-1">
                                {strategy.resources.map((resource: string, rIdx: number) => (
                                  <div key={rIdx} className="flex items-center gap-2 text-sm">
                                    <ArrowRight className="h-3 w-3 text-green-600" />
                                    <span className="text-gray-700">{resource}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 mt-2">
                              <BookOpen className="h-4 w-4 mr-2" />
                              Tạo tài liệu dạy lại với AI
                            </Button>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Generate More Strategies */}
                      <Button
                        variant="outline"
                        className="w-full border-2 border-purple-300 hover:bg-purple-50"
                        onClick={() => generateAIInsights(selectedStudent)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Tạo thêm chiến lược
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Chưa có chiến lược dạy lại
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Click "Tạo phân tích AI chi tiết" ở tab "Phân tích" để AI tạo chiến lược
                      </p>
                      <Button
                        onClick={() => generateAIInsights(selectedStudent)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Tạo ngay
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Chọn một học sinh
                </h3>
                <p className="text-gray-500">
                  Click vào học sinh ở danh sách bên trái để xem phân tích chi tiết
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Hành động nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Tạo Quiz mới với AI
            </Button>
            <Button variant="outline" className="justify-start">
              <BookOpen className="h-4 w-4 mr-2" />
              Tạo tài liệu ôn tập
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Phân nhóm học sinh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




