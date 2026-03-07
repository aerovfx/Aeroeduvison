'use client';

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Play, 
  CheckCircle, 
  Star, 
  Trophy, 
  ArrowRight,
  BookOpen,
  Target,
  Zap,
  Calculator,
  ArrowLeft,
  X,
  Clock,
  Award
} from "lucide-react";

export default function KiemTraPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>(new Array(10).fill(""));
  const [showResults, setShowResults] = useState<boolean[]>(new Array(10).fill(false));
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [quizStarted, setQuizStarted] = useState(false);

  const questions = [
    {
      id: 1,
      question: "Giải phương trình: 2x + 5 = 13",
      correctAnswer: "4",
      explanation: "2x + 5 = 13 → 2x = 8 → x = 4",
      points: 3
    },
    {
      id: 2,
      question: "Giải phương trình: 3x - 7 = 2x + 1",
      correctAnswer: "8",
      explanation: "3x - 7 = 2x + 1 → 3x - 2x = 1 + 7 → x = 8",
      points: 3
    },
    {
      id: 3,
      question: "Giải phương trình: x² - 9 = 0",
      correctAnswer: "3,-3",
      explanation: "x² - 9 = 0 → x² = 9 → x = ±3",
      points: 4
    },
    {
      id: 4,
      question: "Giải phương trình: x² - 5x + 6 = 0",
      correctAnswer: "2,3",
      explanation: "x² - 5x + 6 = 0 → (x-2)(x-3) = 0 → x = 2 hoặc x = 3",
      points: 4
    },
    {
      id: 5,
      question: "Giải hệ phương trình: { x + y = 8\n                   x - y = 2 }",
      correctAnswer: "5,3",
      explanation: "Cộng hai phương trình: 2x = 10 → x = 5, y = 3",
      points: 5
    },
    {
      id: 6,
      question: "Giải phương trình: 4x + 12 = 0",
      correctAnswer: "-3",
      explanation: "4x + 12 = 0 → 4x = -12 → x = -3",
      points: 3
    },
    {
      id: 7,
      question: "Giải phương trình: x² + 4x + 4 = 0",
      correctAnswer: "-2",
      explanation: "x² + 4x + 4 = 0 → (x+2)² = 0 → x = -2",
      points: 4
    },
    {
      id: 8,
      question: "Giải hệ phương trình: { 2x + 3y = 13\n                   x - y = 1 }",
      correctAnswer: "2,3",
      explanation: "Từ x - y = 1 → x = y + 1. Thế vào: 2(y+1) + 3y = 13 → 5y = 11 → y = 3, x = 2",
      points: 5
    },
    {
      id: 9,
      question: "Giải phương trình: 5x - 3 = 2x + 9",
      correctAnswer: "4",
      explanation: "5x - 3 = 2x + 9 → 5x - 2x = 9 + 3 → 3x = 12 → x = 4",
      points: 3
    },
    {
      id: 10,
      question: "Giải phương trình: x² - 6x + 9 = 0",
      correctAnswer: "3",
      explanation: "x² - 6x + 9 = 0 → (x-3)² = 0 → x = 3",
      points: 4
    }
  ];

  // Timer effect
  React.useEffect(() => {
    if (quizStarted && !quizCompleted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !quizCompleted) {
      setQuizCompleted(true);
    }
  }, [quizStarted, timeLeft, quizCompleted]);

  const handleAnswerSubmit = (questionIndex: number) => {
    const newShowResults = [...showResults];
    newShowResults[questionIndex] = true;
    setShowResults(newShowResults);

    const userAnswer = userAnswers[questionIndex].trim();
    const correctAnswer = questions[questionIndex].correctAnswer;
    
    // Check if answer is correct
    const isCorrect = userAnswer === correctAnswer || 
                     correctAnswer.includes(',') && 
                     correctAnswer.split(',').includes(userAnswer);
    
    if (isCorrect) {
      setScore(score + questions[questionIndex].points);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleBack = () => {
    router.push("/dashboard/learning");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const maxScore = questions.reduce((total, q) => total + q.points, 0);

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Kiểm tra tổng hợp</h1>
                  <p className="text-gray-600">Đánh giá kiến thức toàn diện</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+30 XP</Badge>
                <Badge className="bg-blue-100 text-blue-700">Kiểm tra</Badge>
              </div>
            </div>
          </div>
        
              </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">📝</div>
              <CardTitle className="text-3xl">Kiểm tra tổng hợp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <BookOpen className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">10 câu hỏi</h3>
                    <p className="text-sm text-gray-600">Bao gồm tất cả kiến thức đã học</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Clock className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">10 phút</h3>
                    <p className="text-sm text-gray-600">Thời gian làm bài</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">{maxScore} điểm tối đa</h3>
                    <p className="text-sm text-gray-600">Điểm số cao nhất</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">📋 Nội dung kiểm tra:</h3>
                  <ul className="text-sm text-blue-700 space-y-1 text-left">
                    <li>• Phương trình bậc nhất một ẩn</li>
                    <li>• Phương trình bậc hai một ẩn</li>
                    <li>• Hệ phương trình bậc nhất hai ẩn</li>
                    <li>• Các phương pháp giải phương trình</li>
                    <li>• Kiểm tra lại nghiệm</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý:</h3>
                  <ul className="text-sm text-yellow-700 space-y-1 text-left">
                    <li>• Bạn có 10 phút để hoàn thành bài kiểm tra</li>
                    <li>• Mỗi câu hỏi có điểm số khác nhau</li>
                    <li>• Có thể quay lại sửa câu trả lời trước đó</li>
                    <li>• Bài kiểm tra sẽ tự động nộp khi hết thời gian</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={handleStartQuiz} 
                className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                Bắt đầu kiểm tra
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    const percentage = Math.round((score / maxScore) * 100);
    const grade = percentage >= 90 ? "A" : percentage >= 80 ? "B" : percentage >= 70 ? "C" : percentage >= 60 ? "D" : "F";
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Kết quả kiểm tra</h1>
                  <p className="text-gray-600">Hoàn thành bài kiểm tra</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+30 XP</Badge>
                <Badge className="bg-blue-100 text-blue-700">Kiểm tra</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">
                {percentage >= 90 ? "🏆" : percentage >= 80 ? "🥈" : percentage >= 70 ? "🥉" : "📚"}
              </div>
              <CardTitle className="text-3xl">
                {percentage >= 90 ? "Xuất sắc!" : percentage >= 80 ? "Tốt lắm!" : percentage >= 70 ? "Khá tốt!" : "Cần cố gắng hơn!"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{score}/{maxScore}</div>
                  <div className="text-sm text-gray-600">Điểm số</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{percentage}%</div>
                  <div className="text-sm text-gray-600">Phần trăm</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">{grade}</div>
                  <div className="text-sm text-gray-600">Xếp loại</div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                {percentage >= 90 ? "Chúc mừng! Bạn đã nắm vững kiến thức về phương trình!" : 
                 percentage >= 80 ? "Tuyệt vời! Bạn đã hiểu rất tốt các khái niệm!" : 
                 percentage >= 70 ? "Không tệ! Hãy ôn lại một số phần để cải thiện!" : 
                 "Hãy ôn lại kiến thức và thử lại nhé!"}
              </p>
              
              <Button 
                onClick={() => {
                  // Hoàn thành bài học - chúc mừng và mở khóa bài tiếp theo
                  router.push("/dashboard/learning?completed=5");
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Hoàn thành (+30 XP)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Kiểm tra tổng hợp</h1>
                <p className="text-gray-600">Câu {currentQuestion + 1}/{questions.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-red-600">
                <Clock className="h-5 w-5" />
                <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+{currentQ.points} điểm</Badge>
                <Badge className="bg-blue-100 text-blue-700">Kiểm tra</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ bài kiểm tra</span>
            <span className="text-sm text-gray-600">{currentQuestion + 1}/{questions.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Câu {currentQuestion + 1}: {currentQ.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-lg">Đáp án:</span>
                <Input
                  value={userAnswers[currentQuestion]}
                  onChange={(e) => {
                    const newAnswers = [...userAnswers];
                    newAnswers[currentQuestion] = e.target.value;
                    setUserAnswers(newAnswers);
                  }}
                  className="w-32 text-center text-lg"
                  placeholder="Nhập đáp án"
                  disabled={showResults[currentQuestion]}
                />
              </div>

              <Button 
                onClick={() => handleAnswerSubmit(currentQuestion)}
                disabled={showResults[currentQuestion] || !userAnswers[currentQuestion].trim()}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Xác nhận đáp án
              </Button>

              {showResults[currentQuestion] && (
                <div className={`p-4 rounded-lg border ${
                  userAnswers[currentQuestion].trim() === currentQ.correctAnswer ||
                  currentQ.correctAnswer.includes(',') && 
                  currentQ.correctAnswer.split(',').includes(userAnswers[currentQuestion].trim())
                    ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {userAnswers[currentQuestion].trim() === currentQ.correctAnswer ||
                     currentQ.correctAnswer.includes(',') && 
                     currentQ.correctAnswer.split(',').includes(userAnswers[currentQuestion].trim()) ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Chính xác! +{currentQ.points} điểm</span>
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-800">Chưa đúng</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    Đáp án đúng: {currentQ.correctAnswer}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Câu trước
                </Button>
                <Button 
                  onClick={handleNextQuestion}
                  disabled={!showResults[currentQuestion]}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentQuestion === questions.length - 1 ? (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Hoàn thành
                    </>
                  ) : (
                    <>
                      Câu tiếp
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Mẹo làm bài kiểm tra</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Đọc kỹ đề bài trước khi giải</li>
                  <li>• Kiểm tra lại kết quả bằng cách thay vào phương trình gốc</li>
                  <li>• Với phương trình bậc hai, có thể có 2 nghiệm</li>
                  <li>• Quản lý thời gian hợp lý cho mỗi câu hỏi</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Section - Only for development */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-red-50 border-red-200 mt-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Zap className="h-6 w-6 text-red-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-2">🔧 Debug Tools (Development Only)</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        localStorage.removeItem('completedLessons');
                        typeof window !== 'undefined' && location.reload();
                      }}
                    >
                      Reset All Progress
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const completed = JSON.parse(localStorage.getItem('completedLessons') || '[]');
                        alert(`Completed: [${completed.join(', ')}]`);
                      }}
                    >
                      Debug Progress
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        const completed = JSON.parse(localStorage.getItem('completedLessons') || '[]');
                        const newCompleted = [...completed, 5];
                        localStorage.setItem('completedLessons', JSON.stringify(newCompleted));
                        router.push("/dashboard/learning?completed=5");
                      }}
                    >
                      Complete Lesson 5 (Kiểm tra)
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
