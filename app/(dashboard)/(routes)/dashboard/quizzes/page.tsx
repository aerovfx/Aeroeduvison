import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  Users, 
  BarChart3, 
  Play,
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";

// Mock quiz data - replace with real API call
const getStudentQuizzes = async () => {
  return [
    {
      id: "quiz-1",
      title: "Đề thi Hóa học - Chuyên đề Este",
      description: "Kiểm tra kiến thức về este, axit cacboxylic và các hợp chất liên quan",
      category: "Toán 10",
      course: "Hóa học 12",
      totalQuestions: 18,
      timeLimit: 60,
      status: "available", // available, completed, locked
      dueDate: "2024-02-15",
      attempts: 0,
      maxAttempts: 3,
      lastScore: null,
      bestScore: null,
      createdAt: "2024-01-20"
    },
    {
      id: "quiz-2", 
      title: "Bài kiểm tra Đại số - Chương 1",
      description: "Kiểm tra kiến thức về phương trình bậc nhất, bậc hai",
      category: "Toán 10",
      course: "Toán học 10",
      totalQuestions: 15,
      timeLimit: 45,
      status: "completed",
      dueDate: "2024-02-10",
      attempts: 2,
      maxAttempts: 3,
      lastScore: 85,
      bestScore: 87,
      createdAt: "2024-01-15"
    },
    {
      id: "quiz-3",
      title: "Quiz Giải tích - Đạo hàm",
      description: "Kiểm tra kiến thức về đạo hàm và ứng dụng",
      category: "Toán 11", 
      course: "Toán học 11",
      totalQuestions: 20,
      timeLimit: 60,
      status: "locked",
      dueDate: "2024-02-20",
      attempts: 0,
      maxAttempts: 2,
      lastScore: null,
      bestScore: null,
      createdAt: "2024-01-25"
    }
  ];
};

const QuizzesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return redirect("/");
  }

  // Allow both STUDENT and TEACHER to view quizzes
  // Teachers can see student view for testing
  // if (session.user.role !== "STUDENT") {
  //   return redirect("/teacher");
  // }

  const quizzes = await getStudentQuizzes();

  const getStatusBadge = (quiz: any) => {
    switch (quiz.status) {
      case "available":
        return <Badge className="bg-green-100 text-green-700">Có thể làm</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700">Đã hoàn thành</Badge>;
      case "locked":
        return <Badge variant="secondary">Chưa mở khóa</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const getActionButton = (quiz: any) => {
    switch (quiz.status) {
      case "available":
        return (
          <Link href={`/dashboard/quiz/${quiz.id}`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />
              Làm bài
            </Button>
          </Link>
        );
      case "completed":
        return (
          <div className="flex gap-2">
            <Link href={`/dashboard/quiz/${quiz.id}`}>
              <Button variant="outline">
                <Play className="h-4 w-4 mr-2" />
                Làm lại
              </Button>
            </Link>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Xem kết quả
            </Button>
          </div>
        );
      case "locked":
        return (
          <Button disabled variant="outline">
            <AlertCircle className="h-4 w-4 mr-2" />
            Chưa mở khóa
          </Button>
        );
      default:
        return <Button disabled variant="outline">Không khả dụng</Button>;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bài kiểm tra của tôi</h1>
        <p className="text-gray-600">
          Quản lý và thực hiện các bài kiểm tra trắc nghiệm
        </p>
      </div>

      <div className="grid gap-6">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{quiz.title}</CardTitle>
                    {getStatusBadge(quiz)}
                  </div>
                  <p className="text-gray-600 mb-3">{quiz.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">{quiz.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {quiz.course}
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {quiz.totalQuestions} câu hỏi
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {quiz.timeLimit} phút
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Hạn: {quiz.dueDate}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3">
                  {getActionButton(quiz)}
                  
                  {quiz.status === "completed" && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Lần cuối: {quiz.lastScore}%
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        Điểm cao nhất: {quiz.bestScore}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {quiz.attempts}/{quiz.maxAttempts} lần thử
                      </div>
                    </div>
                  )}
                  
                  {quiz.status === "available" && (
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        Còn {quiz.maxAttempts} lần thử
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            {quiz.status === "completed" && (
              <CardContent className="pt-0">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Đã hoàn thành bài kiểm tra</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Bạn có thể làm lại bài để cải thiện điểm số
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Chưa có bài kiểm tra nào
          </h3>
          <p className="text-gray-500">
            Giáo viên sẽ giao bài kiểm tra cho bạn trong thời gian sớm nhất
          </p>
        </div>
      )}
    </div>
  );
};

// Disable static generation
export const dynamic = 'force-dynamic'

export default QuizzesPage;
