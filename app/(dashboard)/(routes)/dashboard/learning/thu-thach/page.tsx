'use client';

"use client";

import { useState } from "react";
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
  Crown,
  Flame
} from "lucide-react";

export default function ThuThachPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>(new Array(5).fill(""));
  const [showResults, setShowResults] = useState<boolean[]>(new Array(5).fill(false));
  const [score, setScore] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [challengeStarted, setChallengeStarted] = useState(false);

  const challenges = [
    {
      id: 1,
      question: "Giải phương trình: 3x² - 12x + 9 = 0",
      correctAnswer: "1,3",
      explanation: "3x² - 12x + 9 = 0 → 3(x² - 4x + 3) = 0 → 3(x-1)(x-3) = 0 → x = 1 hoặc x = 3",
      difficulty: "Khó",
      points: 20
    },
    {
      id: 2,
      question: "Giải hệ phương trình: { 2x + 3y = 13\n                   x - 2y = -4 }",
      correctAnswer: "2,3",
      explanation: "Từ x - 2y = -4 → x = 2y - 4. Thế vào: 2(2y-4) + 3y = 13 → 4y - 8 + 3y = 13 → 7y = 21 → y = 3, x = 2",
      difficulty: "Rất khó",
      points: 25
    },
    {
      id: 3,
      question: "Tìm nghiệm của: x³ - 6x² + 11x - 6 = 0",
      correctAnswer: "1,2,3",
      explanation: "x³ - 6x² + 11x - 6 = 0 → (x-1)(x-2)(x-3) = 0 → x = 1, x = 2, hoặc x = 3",
      difficulty: "Cực khó",
      points: 30
    },
    {
      id: 4,
      question: "Giải phương trình: √(2x + 3) = x + 1",
      correctAnswer: "2",
      explanation: "Bình phương 2 vế: 2x + 3 = (x+1)² → 2x + 3 = x² + 2x + 1 → x² = 2 → x = ±√2. Kiểm tra: x = 2 thỏa mãn",
      difficulty: "Rất khó",
      points: 35
    },
    {
      id: 5,
      question: "Giải hệ phương trình: { x² + y² = 25\n                   x + y = 7 }",
      correctAnswer: "3,4",
      explanation: "Từ x + y = 7 → y = 7 - x. Thế vào: x² + (7-x)² = 25 → x² + 49 - 14x + x² = 25 → 2x² - 14x + 24 = 0 → x² - 7x + 12 = 0 → (x-3)(x-4) = 0 → x = 3, y = 4",
      difficulty: "Cực khó",
      points: 40
    }
  ];

  const handleAnswerSubmit = (challengeIndex: number) => {
    const newShowResults = [...showResults];
    newShowResults[challengeIndex] = true;
    setShowResults(newShowResults);

    const userAnswer = userAnswers[challengeIndex].trim();
    const correctAnswer = challenges[challengeIndex].correctAnswer;
    
    // Check if answer is correct
    const isCorrect = userAnswer === correctAnswer || 
                     correctAnswer.includes(',') && 
                     correctAnswer.split(',').includes(userAnswer);
    
    if (isCorrect) {
      setScore(score + challenges[challengeIndex].points);
    }
  };

  const handleNextChallenge = () => {
    if (currentChallenge < challenges.length - 1) {
      setCurrentChallenge(currentChallenge + 1);
    } else {
      setChallengeCompleted(true);
    }
  };

  const handlePreviousChallenge = () => {
    if (currentChallenge > 0) {
      setCurrentChallenge(currentChallenge - 1);
    }
  };

  const handleStartChallenge = () => {
    setChallengeStarted(true);
  };

  const handleBack = () => {
    router.push("/dashboard/learning");
  };

  const currentC = challenges[currentChallenge];
  const progress = ((currentChallenge + 1) / challenges.length) * 100;

  if (!challengeStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
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
                  <h1 className="text-2xl font-bold">Thử thách cuối cùng</h1>
                  <p className="text-gray-600">Những bài toán khó nhất</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+50 XP</Badge>
                <Badge className="bg-red-100 text-red-700">Thử thách</Badge>
              </div>
            </div>
          </div>
        
              </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">🔥</div>
              <CardTitle className="text-3xl">Thử thách BOSS!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <Crown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">5 thử thách</h3>
                    <p className="text-sm text-gray-600">Những bài toán khó nhất</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <Flame className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">150 điểm tối đa</h3>
                    <p className="text-sm text-gray-600">Phần thưởng hấp dẫn</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h3 className="font-semibold mb-2">+50 XP</h3>
                    <p className="text-sm text-gray-600">Hoàn thành thử thách</p>
                  </div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">⚠️ Cảnh báo:</h3>
                  <ul className="text-sm text-red-700 space-y-1 text-left">
                    <li>• Đây là những thử thách khó nhất trong hệ thống</li>
                    <li>• Yêu cầu kiến thức sâu về đại số và giải tích</li>
                    <li>• Có thể bao gồm phương trình bậc cao, hệ phương trình phức tạp</li>
                    <li>• Chỉ dành cho những học sinh đã nắm vững kiến thức cơ bản</li>
                  </ul>
                </div>
              </div>

              <Button 
                onClick={handleStartChallenge} 
                className="bg-red-600 hover:bg-red-700 text-lg px-8 py-3"
              >
                <Flame className="h-5 w-5 mr-2" />
                Bắt đầu thử thách
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (challengeCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
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
                  <h1 className="text-2xl font-bold">Kết quả thử thách</h1>
                  <p className="text-gray-600">Hoàn thành thử thách BOSS</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+50 XP</Badge>
                <Badge className="bg-red-100 text-red-700">Thử thách</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center">
            <CardHeader>
              <div className="text-6xl mb-4">
                {score >= 120 ? "🏆" : score >= 80 ? "🥈" : score >= 40 ? "🥉" : "💪"}
              </div>
              <CardTitle className="text-3xl">
                {score >= 120 ? "LEGENDARY!" : score >= 80 ? "EPIC!" : score >= 40 ? "GOOD!" : "KEEP TRYING!"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600 mb-4">
                {score}/150 điểm
              </div>
              <div className="text-lg text-gray-600 mb-6">
                Đánh giá: {score >= 120 ? "Xuất sắc!" : score >= 80 ? "Rất tốt!" : score >= 40 ? "Khá tốt!" : "Cần cố gắng hơn!"}
              </div>
              <p className="text-gray-600 mb-6">
                {score >= 120 ? "Bạn thực sự là một thiên tài toán học! Chúc mừng!" : 
                 score >= 80 ? "Tuyệt vời! Bạn đã chứng minh được khả năng vượt trội!" : 
                 score >= 40 ? "Không tệ! Hãy tiếp tục rèn luyện để trở nên tốt hơn!" : 
                 "Đừng nản lòng! Hãy ôn lại kiến thức và thử lại!"}
              </p>
              <Button 
                onClick={() => {
                  // Hoàn thành bài học - chúc mừng và mở khóa bài tiếp theo
                  router.push("/dashboard/learning?completed=8");
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Hoàn thành (+50 XP)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
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
                <h1 className="text-2xl font-bold">Thử thách BOSS</h1>
                <p className="text-gray-600">Thử thách {currentChallenge + 1}/{challenges.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-lg font-bold text-red-600">
                🔥 {currentC.difficulty}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">+{currentC.points} điểm</Badge>
                <Badge className="bg-red-100 text-red-700">Thử thách</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ thử thách</span>
            <span className="text-sm text-gray-600">{currentChallenge + 1}/{challenges.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Challenge */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl">Thử thách {currentChallenge + 1}</CardTitle>
              <Badge className={`${
                currentC.difficulty === 'Khó' ? 'bg-yellow-100 text-yellow-700' :
                currentC.difficulty === 'Rất khó' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentC.difficulty}
              </Badge>
            </div>
            <p className="text-lg">{currentC.question}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <span className="text-lg">Đáp án:</span>
                <Input
                  value={userAnswers[currentChallenge]}
                  onChange={(e) => {
                    const newAnswers = [...userAnswers];
                    newAnswers[currentChallenge] = e.target.value;
                    setUserAnswers(newAnswers);
                  }}
                  className="w-32 text-center text-lg"
                  placeholder="Nhập đáp án"
                  disabled={showResults[currentChallenge]}
                />
              </div>

              <Button 
                onClick={() => handleAnswerSubmit(currentChallenge)}
                disabled={showResults[currentChallenge] || !userAnswers[currentChallenge].trim()}
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Xác nhận đáp án
              </Button>

              {showResults[currentChallenge] && (
                <div className={`p-4 rounded-lg border ${
                  userAnswers[currentChallenge].trim() === currentC.correctAnswer ||
                  currentC.correctAnswer.includes(',') && 
                  currentC.correctAnswer.split(',').includes(userAnswers[currentChallenge].trim())
                    ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                }`}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {userAnswers[currentChallenge].trim() === currentC.correctAnswer ||
                     currentC.correctAnswer.includes(',') && 
                     currentC.correctAnswer.split(',').includes(userAnswers[currentChallenge].trim()) ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-800">Chính xác! +{currentC.points} điểm</span>
                      </>
                    ) : (
                      <>
                        <X className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-800">Chưa đúng</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">
                    Đáp án đúng: {currentC.correctAnswer}
                  </p>
                  <p className="text-sm text-gray-600">
                    {currentC.explanation}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousChallenge}
                  disabled={currentChallenge === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Thử thách trước
                </Button>
                <Button 
                  onClick={handleNextChallenge}
                  disabled={!showResults[currentChallenge]}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {currentChallenge === challenges.length - 1 ? (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Hoàn thành
                    </>
                  ) : (
                    <>
                      Thử thách tiếp
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

