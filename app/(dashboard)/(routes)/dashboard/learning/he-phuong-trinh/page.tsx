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
  X
} from "lucide-react";

export default function HePhuongTrinhPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [userAnswer1, setUserAnswer1] = useState("");
  const [userAnswer2, setUserAnswer2] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const steps = [
    {
      title: "Định nghĩa hệ phương trình",
      content: "Hệ phương trình bậc nhất hai ẩn là hệ gồm hai phương trình bậc nhất hai ẩn x và y",
      example: "Ví dụ: { x + y = 5\n     2x - y = 1 }",
      icon: "📊"
    },
    {
      title: "Phương pháp thế",
      content: "Từ một phương trình, biểu diễn một ẩn theo ẩn kia, rồi thế vào phương trình còn lại",
      example: "Từ x + y = 5 → y = 5 - x\nThế vào 2x - y = 1 → 2x - (5-x) = 1",
      icon: "🔄"
    },
    {
      title: "Phương pháp cộng đại số",
      content: "Nhân các phương trình với số thích hợp để hệ số của một ẩn bằng nhau, rồi cộng hoặc trừ",
      example: "x + y = 5\n2x - y = 1\nCộng: 3x = 6 → x = 2",
      icon: "➕"
    },
    {
      title: "Bài tập thực hành",
      content: "Giải hệ phương trình: { x + y = 7\n                    x - y = 3 }",
      example: "Hãy nhập nghiệm của hệ phương trình:",
      icon: "🎯"
    }
  ];

  const correctAnswers = ["5", "2"];

  const handleAnswerSubmit = () => {
    setShowResult(true);
    const answers = [userAnswer1.trim(), userAnswer2.trim()].sort();
    const correct = correctAnswers.sort();
    setIsCorrect(answers.join(",") === correct.join(","));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setUserAnswer1("");
      setUserAnswer2("");
      setShowResult(false);
    } else {
      // Hoàn thành bài học - chúc mừng và mở khóa bài tiếp theo
      // Sử dụng URL parameter thay vì custom event
      router.push("/dashboard/learning?completed=7");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setUserAnswer1("");
      setUserAnswer2("");
      setShowResult(false);
    } else {
      router.push("/dashboard/learning/luyen-tap");
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

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
                <h1 className="text-2xl font-bold">Bài học: Hệ phương trình</h1>
                <p className="text-gray-600">Học cách giải hệ phương trình bậc nhất hai ẩn</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">+35 XP</Badge>
              <Badge className="bg-purple-100 text-purple-700">Bài học</Badge>
            </div>
          </div>
        </div>
      
              </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ bài học</span>
            <span className="text-sm text-gray-600">{currentStep + 1}/{steps.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Content */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">{steps[currentStep].icon}</div>
            <CardTitle className="text-3xl">{steps[currentStep].title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg text-gray-700 mb-6">{steps[currentStep].content}</p>
            
            {/* Example */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <h3 className="font-semibold mb-2">Ví dụ:</h3>
              <pre className="text-gray-700 font-mono text-sm whitespace-pre-line text-left">{steps[currentStep].example}</pre>
            </div>

            {/* Interactive Exercise */}
            {currentStep === 3 && (
              <div className="bg-purple-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold mb-4">Bài tập: Giải hệ phương trình</h3>
                <div className="mb-4 p-4 bg-white rounded-lg">
                  <pre className="text-center font-mono text-lg">
{`{ x + y = 7
  x - y = 3 }`}
                  </pre>
                </div>
                <div className="space-y-4 mb-4">
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-lg">x =</span>
                    <Input
                      value={userAnswer1}
                      onChange={(e) => setUserAnswer1(e.target.value)}
                      className="w-20 text-center text-lg"
                      placeholder="?"
                      disabled={showResult}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-lg">y =</span>
                    <Input
                      value={userAnswer2}
                      onChange={(e) => setUserAnswer2(e.target.value)}
                      className="w-20 text-center text-lg"
                      placeholder="?"
                      disabled={showResult}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAnswerSubmit}
                  disabled={showResult || !userAnswer1.trim() || !userAnswer2.trim()}
                  className="mb-4"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Kiểm tra
                </Button>
                
                {showResult && (
                  <div className={`p-4 rounded-lg ${
                    isCorrect ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                  } border`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {isCorrect ? (
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
                    <p className="text-sm text-gray-700">
                      Đáp án đúng là: x = 5, y = 2
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Cộng hai phương trình: (x+y) + (x-y) = 7+3 → 2x = 10 → x = 5
                    </p>
                    <p className="text-sm text-gray-600">
                      Thay x = 5 vào: 5 + y = 7 → y = 2
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-4">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Trước đó
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={currentStep === 3 && !showResult}
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Hoàn thành (+35 XP)
                  </>
                ) : (
                  <>
                    Tiếp theo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Points */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">Điểm quan trọng</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Hệ phương trình có thể có 1 nghiệm, vô nghiệm hoặc vô số nghiệm</li>
                  <li>• Phương pháp thế: biểu diễn ẩn này theo ẩn kia</li>
                  <li>• Phương pháp cộng đại số: cộng/trừ để loại bỏ một ẩn</li>
                  <li>• Luôn kiểm tra lại nghiệm bằng cách thay vào hệ ban đầu</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

