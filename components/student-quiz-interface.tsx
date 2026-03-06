"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw
} from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  type?: "multiple-choice" | "true-false";
  points?: number;
}

interface StudentQuizInterfaceProps {
  quizData: {
    id: string;
    title: string;
    description: string;
    timeLimit: number; // in minutes
    totalQuestions: number;
    questions: Question[];
  };
  onSubmit: (answers: Record<number, number>) => void;
  onBack?: () => void;
}

export const StudentQuizInterface = ({
  quizData,
  onSubmit,
  onBack
}: StudentQuizInterfaceProps) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quizData.timeLimit * 60); // Convert to seconds
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleSubmit();
    }
  }, [timeLeft, isSubmitted]);

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmit = useCallback(() => {
    setIsSubmitted(true);
    onSubmit(answers);
  }, [onSubmit, answers]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quizData.totalQuestions) * 100;

  const getAnswerStatus = (questionIndex: number) => {
    const questionId = quizData.questions[questionIndex]?.id;
    return questionId ? answers[questionId] !== undefined : false;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Bộ Giáo dục Header */}
      <div className="bg-white border-b-2 border-black py-4">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="text-sm font-bold mb-2">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div className="text-sm font-bold mb-1">ĐỀ THI CHÍNH THỨC</div>
            <div className="text-sm font-bold mb-4">(Đề thi có {quizData.totalQuestions} trang)</div>
            <div className="text-lg font-bold">{quizData.title}</div>
            <div className="text-sm mt-2">Thời gian làm bài: {quizData.timeLimit} phút (không kể thời gian phát đề)</div>
            <div className="text-sm">Mã đề thi: {quizData.id.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Timer và Progress - Fixed Top */}
      <div className="bg-blue-600 text-white py-2 px-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{answeredCount}/{quizData.totalQuestions} câu</span>
            </div>
          </div>
          <Progress value={progress} className="w-48" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Đề thi (Test Questions) */}
          <div className="bg-white border-2 border-gray-300">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 border-b-2 border-blue-700">
              <h2 className="text-xl font-bold text-center">ĐỀ THI</h2>
              <p className="text-blue-100 text-center text-sm mt-1">Thí sinh chỉ chọn một phương án</p>
            </div>
            {/* Content */}
            <div className="p-6">
              {/* Question Display */}
              <div className="mb-6">
                <div className="mb-4">
                  <span className="text-lg font-semibold">
                    Câu {currentQuestion + 1}. {quizData.questions[currentQuestion]?.question}
                  </span>
                </div>

                {/* Answer Options */}
                <div className="space-y-3 mt-4">
                  {quizData.questions[currentQuestion]?.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`question-${quizData.questions[currentQuestion]?.id}`}
                        id={`option-${currentQuestion}-${index}`}
                        checked={answers[quizData.questions[currentQuestion]?.id || 0] === index}
                        onChange={() => handleAnswerSelect(quizData.questions[currentQuestion]?.id || 0, index)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <label 
                        htmlFor={`option-${currentQuestion}-${index}`}
                        className="flex-1 cursor-pointer text-base"
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestion(Math.min(quizData.totalQuestions - 1, currentQuestion + 1))}
                    disabled={currentQuestion === quizData.totalQuestions - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <span className="px-3 py-1 bg-gray-100 rounded text-sm">
                  {currentQuestion + 1} / {quizData.totalQuestions}
                </span>
              </div>

              {/* Question Navigation Grid */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-sm">Điều hướng câu hỏi:</h4>
                <div className="grid grid-cols-10 gap-2">
                  {quizData.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-8 h-8 rounded text-sm font-medium border ${
                        index === currentQuestion
                          ? 'bg-blue-600 text-white border-blue-600'
                          : getAnswerStatus(index)
                          ? 'bg-green-100 text-green-700 border-green-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Back Button */}
              <div className="mt-6">
                <Button 
                  variant="outline" 
                  onClick={onBack}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Phiếu trả lời (Answer Sheet) */}
          <div className="bg-white border-2 border-gray-300">
            {/* Header */}
            <div className="bg-white border-b-2 border-gray-300 p-4">
              <h2 className="text-xl font-bold text-blue-600 text-center">PHIẾU TRẢ LỜI</h2>
              <p className="text-gray-600 text-sm text-center mt-1">Phần I</p>
            </div>
            {/* Content */}
            <div className="p-6">
              {/* Answer Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-8">
                  {/* Left Column - Questions 1-10 */}
                  <div className="space-y-3">
                    {Array.from({ length: Math.min(10, quizData.totalQuestions) }, (_, index) => {
                      const questionId = quizData.questions[index]?.id;
                      const selectedAnswer = questionId ? answers[questionId] : undefined;
                      
                      return (
                        <div key={index} className="flex items-center gap-3">
                          <span className="w-8 text-sm font-medium">
                            {index + 1}.
                          </span>
                          <div className="flex gap-4">
                            {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                              <div key={letter} className="flex items-center gap-1">
                                <span className="text-xs w-4 font-medium">{letter}</span>
                                <div
                                  className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-colors ${
                                    selectedAnswer === letterIndex
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-red-500 hover:border-blue-400'
                                  }`}
                                  onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                >
                                  {selectedAnswer === letterIndex && (
                                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column - Questions 11-20 */}
                  {quizData.totalQuestions > 10 && (
                    <div className="space-y-3">
                      {Array.from({ length: Math.min(10, quizData.totalQuestions - 10) }, (_, index) => {
                        const actualIndex = index + 10;
                        const questionId = quizData.questions[actualIndex]?.id;
                        const selectedAnswer = questionId ? answers[questionId] : undefined;
                        
                        return (
                          <div key={actualIndex} className="flex items-center gap-3">
                            <span className="w-8 text-sm font-medium">
                              {actualIndex + 1}.
                            </span>
                            <div className="flex gap-4">
                              {['A', 'B', 'C', 'D'].map((letter, letterIndex) => (
                                <div key={letter} className="flex items-center gap-1">
                                  <span className="text-xs w-4 font-medium">{letter}</span>
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-colors ${
                                      selectedAnswer === letterIndex
                                        ? 'bg-blue-600 border-blue-600'
                                        : 'border-red-500 hover:border-blue-400'
                                    }`}
                                    onClick={() => handleAnswerSelect(questionId || 0, letterIndex)}
                                  >
                                    {selectedAnswer === letterIndex && (
                                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="mt-8 pt-6 border-t-2 border-gray-300">
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitted || answeredCount === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
                  >
                    {isSubmitted ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        ĐÃ NỘP BÀI
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5 mr-2" />
                        NẠP BÀI ({answeredCount}/{quizData.totalQuestions})
                      </>
                    )}
                  </Button>
                  
                  {answeredCount < quizData.totalQuestions && (
                    <p className="text-center text-sm text-orange-600 mt-3 font-medium">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Bạn chưa trả lời {quizData.totalQuestions - answeredCount} câu hỏi
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
