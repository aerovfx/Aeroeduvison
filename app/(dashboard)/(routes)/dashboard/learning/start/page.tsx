'use client';

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Play, 
  CheckCircle, 
  Star, 
  Trophy, 
  ArrowRight,
  BookOpen,
  Target,
  Zap
} from "lucide-react";

export default function StartLessonPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Don't auto-complete on page load, wait for user to click "Bắt đầu học"

  const steps = [
    {
      title: "Chào mừng đến với LabTwin!",
      content: "Hệ thống học tập thông minh giúp bạn học toán hiệu quả hơn.",
      icon: "🎉"
    },
    {
      title: "Cách học hiệu quả",
      content: "Học từng bước một, làm bài tập thường xuyên và không ngại thử thách.",
      icon: "✈️"
    },
    {
      title: "Hệ thống điểm thưởng",
      content: "Mỗi bài học hoàn thành sẽ cho bạn XP và gems. Càng học nhiều, càng có nhiều phần thưởng!",
      icon: "💎"
    },
    {
      title: "Sẵn sàng bắt đầu?",
      content: "Bạn đã hiểu rõ cách sử dụng LabTwin. Hãy bắt đầu hành trình học tập của mình!",
      icon: "🚀"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Hoàn thành bài học START - chúc mừng và mở khóa bài tiếp theo
      // Sử dụng URL parameter thay vì custom event
      router.push("/dashboard/learning?completed=1");
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.push("/dashboard/learning");
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                ← Quay lại
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Bài học: START</h1>
                <p className="text-gray-600">Bắt đầu hành trình học tập</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">+0 XP</Badge>
              <Badge className="bg-green-100 text-green-700">Bắt đầu</Badge>
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
            <p className="text-lg text-gray-700 mb-8">{steps[currentStep].content}</p>
            
            {/* Features Grid */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Học tập</h3>
                  <p className="text-sm text-gray-600">Học kiến thức mới từng bước</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Luyện tập</h3>
                  <p className="text-sm text-gray-600">Củng cố kiến thức qua bài tập</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <Trophy className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Kiểm tra</h3>
                  <p className="text-sm text-gray-600">Đánh giá năng lực học tập</p>
                </div>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack}>
                  ← Trước đó
                </Button>
              )}
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
                {currentStep === steps.length - 1 ? (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Bắt đầu học
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

        {/* Tips */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-yellow-600 mt-1" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-2">Mẹo học hiệu quả</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Học đều đặn mỗi ngày để duy trì streak</li>
                  <li>• Làm bài tập đầy đủ để nhận XP và gems</li>
                  <li>• Không ngại thử thách các bài khó</li>
                  <li>• Sử dụng tính năng luyện tập để củng cố kiến thức</li>
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
                        const newCompleted = [...completed, 1];
                        localStorage.setItem('completedLessons', JSON.stringify(newCompleted));
                        router.push("/dashboard/learning?completed=1");
                      }}
                    >
                      Complete Lesson 1 (START)
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
