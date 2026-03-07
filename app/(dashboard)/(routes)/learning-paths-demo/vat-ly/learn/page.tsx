'use client';

"use client"

import { useState } from "react";
import { QuizletStyleLearning } from "@/components/quizlet-style-learning";
import { useLanguage } from '@/contexts/LanguageContext';

export default function VatLyLearnPage() {
  const { t } = useLanguage();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const questions = [
    {
      term: "Chuyển động cơ học",
      definition: "Sự thay đổi vị trí của vật theo thời gian",
      options: [
        { id: "1", text: "Sự thay đổi vị trí của vật theo thời gian", isCorrect: true },
        { id: "2", text: "Sự thay đổi hình dạng của vật", isCorrect: false },
        { id: "3", text: "Sự thay đổi nhiệt độ của vật", isCorrect: false },
        { id: "4", text: "Sự thay đổi khối lượng của vật", isCorrect: false }
      ]
    },
    {
      term: "Vận tốc",
      definition: "Đại lượng đặc trưng cho sự nhanh chậm và hướng của chuyển động",
      options: [
        { id: "1", text: "Quãng đường vật đi được", isCorrect: false },
        { id: "2", text: "Đại lượng đặc trưng cho sự nhanh chậm và hướng của chuyển động", isCorrect: true },
        { id: "3", text: "Thời gian vật chuyển động", isCorrect: false },
        { id: "4", text: "Khối lượng của vật", isCorrect: false }
      ]
    },
    {
      term: "Gia tốc",
      definition: "Đại lượng đặc trưng cho sự thay đổi vận tốc theo thời gian",
      options: [
        { id: "1", text: "Vận tốc của vật", isCorrect: false },
        { id: "2", text: "Đại lượng đặc trưng cho sự thay đổi vận tốc theo thời gian", isCorrect: true },
        { id: "3", text: "Quãng đường vật đi được", isCorrect: false },
        { id: "4", text: "Thời gian chuyển động", isCorrect: false }
      ]
    },
    {
      term: "Chuyển động thẳng đều",
      definition: "Chuyển động có vận tốc không đổi theo thời gian",
      options: [
        { id: "1", text: "Chuyển động có vận tốc không đổi theo thời gian", isCorrect: true },
        { id: "2", text: "Chuyển động có gia tốc không đổi", isCorrect: false },
        { id: "3", text: "Chuyển động theo đường cong", isCorrect: false },
        { id: "4", text: "Chuyển động rơi tự do", isCorrect: false }
      ]
    },
    {
      term: "Chuyển động thẳng biến đổi đều",
      definition: "Chuyển động có gia tốc không đổi theo thời gian",
      options: [
        { id: "1", text: "Chuyển động có vận tốc không đổi", isCorrect: false },
        { id: "2", text: "Chuyển động có gia tốc không đổi theo thời gian", isCorrect: true },
        { id: "3", text: "Chuyển động theo đường tròn", isCorrect: false },
        { id: "4", text: "Chuyển động dao động", isCorrect: false }
      ]
    },
    {
      term: "Sự rơi tự do",
      definition: "Chuyển động của vật chỉ dưới tác dụng của trọng lực",
      options: [
        { id: "1", text: "Chuyển động của vật có lực đẩy", isCorrect: false },
        { id: "2", text: "Chuyển động của vật chỉ dưới tác dụng của trọng lực", isCorrect: true },
        { id: "3", text: "Chuyển động của vật trên mặt phẳng", isCorrect: false },
        { id: "4", text: "Chuyển động của vật trong nước", isCorrect: false }
      ]
    },
    {
      term: "Định luật I Newton",
      definition: "Vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực tác dụng",
      options: [
        { id: "1", text: "F = ma", isCorrect: false },
        { id: "2", text: "Vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không có lực tác dụng", isCorrect: true },
        { id: "3", text: "Mọi lực đều có phản lực", isCorrect: false },
        { id: "4", text: "Năng lượng được bảo toàn", isCorrect: false }
      ]
    },
    {
      term: "Định luật II Newton",
      definition: "Gia tốc của vật tỉ lệ thuận với lực tác dụng và tỉ lệ nghịch với khối lượng",
      options: [
        { id: "1", text: "F = ma", isCorrect: true },
        { id: "2", text: "Vật giữ nguyên trạng thái", isCorrect: false },
        { id: "3", text: "Mọi lực đều có phản lực", isCorrect: false },
        { id: "4", text: "Năng lượng bảo toàn", isCorrect: false }
      ]
    }
  ];

  const currentQuestion = questions[currentQuestionIndex];
  const isCorrect = selectedAnswer ? currentQuestion.options.find(opt => opt.id === selectedAnswer)?.isCorrect : false;

  const handleAnswer = (answerId: string) => {
    setSelectedAnswer(answerId);
    setShowResult(true);
    if (currentQuestion.options.find(opt => opt.id === answerId)?.isCorrect) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowResult(false);
      setSelectedAnswer(null);
    } else {
      // Quiz completed - redirect to learning path page
      setTimeout(() => {
        if (typeof window !== 'undefined') { location.href = '/learning-paths-demo/vat-ly'; }
      }, 3000); // Wait 3 seconds to show celebration
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const isCompleted = currentQuestionIndex === questions.length - 1 && showResult;
  const totalXP = score * 10; // 10 XP per correct answer

  return (
    <QuizletStyleLearning
      subject="Vật lý - Chuyển động cơ học"
      totalQuestions={questions.length}
      currentQuestion={currentQuestionIndex + 1}
      question={currentQuestion}
      onAnswer={handleAnswer}
      onNext={handleNext}
      onSkip={handleSkip}
      showResult={showResult}
      selectedAnswer={selectedAnswer}
      isCorrect={isCorrect}
      isCompleted={isCompleted}
      totalXP={totalXP}
    />
  );
}
