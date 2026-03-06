'use client';

"use client";

import { useState, useEffect } from "react";
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
  RotateCcw
} from "lucide-react";

export default function LuyenTapPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>(new Array(5).fill(""));
  const [showResults, setShowResults] = useState<boolean[]>(new Array(5).fill(false));
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Don't auto-complete on page load, wait for user to complete lesson

  const questions = [
    {
      id: 1,
      question: "Giải phương trình: 3x + 9 = 0",
      correctAnswer: "-3",
      explanation: "3x + 9 = 0 → 3x = -9 → x = -3"
    },
    {
      id: 2,
      question: "Giải phương trình: 2x - 6 = 0",
      correctAnswer: "3",
      explanation: "2x - 6 = 0 → 2x = 6 → x = 3"
    },
    {
      id: 3,
      question: "Giải phương trình: x² - 4 = 0",
      correctAnswer: "2,-2",
      explanation: "x² - 4 = 0 → x² = 4 → x = ±2"
    },
    {
      id: 4,
      question: "Giải phương trình: x² + 2x - 3 = 0",
      correctAnswer: "1,-3",
      explanation: "x² + 2x - 3 = 0 → (x+3)(x-1) = 0 → x = -3 hoặc x = 1"
    },
    {
      id: 5,
      question: "Giải phương trình: 4x - 8 = 0",
      correctAnswer: "2",
      explanation: "4x - 8 = 0 → 4x = 8 → x = 2"
    }
  ];

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
      setScore(score + 1);
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

  const handleRestart = () => {
    setCurrentQuestion(0);
    setUserAnswers(new Array(5).fill(""));
    setShowResults(new Array(5).fill(false));
    setScore(0);
    setQuizCompleted(false);
  };

  const handleBack = () => {
    router.push("/dashboard/learning");
  };

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
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
                  <h1 className="text-2xl font-bold">Kết quả Luyện tập</h1>
                  <p className="text-gray-600">Hoàn thành bài luyện tập</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+15 XP</Badge>
                <Badge className="bg-purple-100 text-purple-700">Luyện tập</Badge>
              </div>
            </div>
          </div>
        
              </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">
                {score >= 4 ? "🏆" : score >= 3 ? "🥈" : "🥉"}
              </div>
              <CardTitle className="text-3xl">
                {score >= 4 ? "Xuất sắc!" : score >= 3 ? "Tốt lắm!" : "Cần cố gắng hơn!"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 mb-4">
                {score}/{questions.length} câu đúng
              </div>
              <p className="text-gray-600 mb-6">
                {score >= 4 ? "Bạn đã nắm vững kiến thức về phương trình!" : 
                 score >= 3 ? "Bạn đã hiểu khá tốt, hãy luyện tập thêm!" : 
                 "Hãy ôn lại lý thuyết và thử lại nhé!"}
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleRestart} className="bg-blue-600 hover:bg-blue-700">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Làm lại
                </Button>
                <Button 
                  onClick={() => {
                    // Hoàn thành bài học - chúc mừng và mở khóa bài tiếp theo
                    router.push("/dashboard/learning?completed=4");
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Hoàn thành (+15 XP)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
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
                <h1 className="text-2xl font-bold">Luyện tập</h1>
                <p className="text-gray-600">Củng cố kiến thức về phương trình</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">+15 XP</Badge>
              <Badge className="bg-purple-100 text-purple-700">Luyện tập</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ bài luyện tập</span>
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
                Kiểm tra đáp án
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
                        <span className="font-semibold text-green-800">Chính xác!</span>
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
                  className="bg-purple-600 hover:bg-purple-700"
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
              <Target className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Mẹo luyện tập</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Đọc kỹ đề bài trước khi giải</li>
                  <li>• Kiểm tra lại kết quả bằng cách thay vào phương trình gốc</li>
                  <li>• Với phương trình bậc hai, có thể có 2 nghiệm</li>
                  <li>• Luyện tập thường xuyên để nắm vững kiến thức</li>
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
                        const newCompleted = [...completed, 4];
                        localStorage.setItem('completedLessons', JSON.stringify(newCompleted));
                        router.push("/dashboard/learning?completed=4");
                      }}
                    >
                      Complete Lesson 4 (Luyện tập)
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
