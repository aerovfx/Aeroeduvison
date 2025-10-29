'use client';

"use client"

import { useState } from "react";
import { QuizletStyleLearning } from "@/components/quizlet-style-learning";
import { useLanguage } from '@/contexts/LanguageContext';

export default function SinhHocLearnPage() {
  const { t } = useLanguage();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const questions = [
    {
      term: "Tế bào",
      definition: "Đơn vị cơ bản của sự sống",
      options: [
        { id: "1", text: "Đơn vị cơ bản của sự sống", isCorrect: true },
        { id: "2", text: "Đơn vị cơ bản của vật chất", isCorrect: false },
        { id: "3", text: "Đơn vị cơ bản của năng lượng", isCorrect: false },
        { id: "4", text: "Đơn vị cơ bản của thông tin", isCorrect: false }
      ]
    },
    {
      term: "ADN",
      definition: "Axit deoxyribonucleic - vật chất di truyền",
      options: [
        { id: "1", text: "Axit ribonucleic", isCorrect: false },
        { id: "2", text: "Axit deoxyribonucleic - vật chất di truyền", isCorrect: true },
        { id: "3", text: "Protein cấu trúc", isCorrect: false },
        { id: "4", text: "Enzyme xúc tác", isCorrect: false }
      ]
    },
    {
      term: "Gen",
      definition: "Đơn vị di truyền chứa thông tin mã hóa protein",
      options: [
        { id: "1", text: "Đơn vị di truyền chứa thông tin mã hóa protein", isCorrect: true },
        { id: "2", text: "Đơn vị cấu trúc của tế bào", isCorrect: false },
        { id: "3", text: "Đơn vị chức năng của cơ thể", isCorrect: false },
        { id: "4", text: "Đơn vị trao đổi chất", isCorrect: false }
      ]
    },
    {
      term: "Quang hợp",
      definition: "Quá trình tổng hợp chất hữu cơ từ CO₂ và H₂O nhờ năng lượng ánh sáng",
      options: [
        { id: "1", text: "Quá trình phân giải chất hữu cơ", isCorrect: false },
        { id: "2", text: "Quá trình tổng hợp chất hữu cơ từ CO₂ và H₂O nhờ năng lượng ánh sáng", isCorrect: true },
        { id: "3", text: "Quá trình trao đổi khí", isCorrect: false },
        { id: "4", text: "Quá trình vận chuyển nước", isCorrect: false }
      ]
    },
    {
      term: "Hô hấp tế bào",
      definition: "Quá trình phân giải chất hữu cơ để giải phóng năng lượng",
      options: [
        { id: "1", text: "Quá trình tổng hợp chất hữu cơ", isCorrect: false },
        { id: "2", text: "Quá trình phân giải chất hữu cơ để giải phóng năng lượng", isCorrect: true },
        { id: "3", text: "Quá trình trao đổi khí", isCorrect: false },
        { id: "4", text: "Quá trình vận chuyển chất", isCorrect: false }
      ]
    },
    {
      term: "Nguyên phân",
      definition: "Quá trình phân chia tế bào tạo ra 2 tế bào con giống hệt tế bào mẹ",
      options: [
        { id: "1", text: "Quá trình phân chia tạo giao tử", isCorrect: false },
        { id: "2", text: "Quá trình phân chia tế bào tạo ra 2 tế bào con giống hệt tế bào mẹ", isCorrect: true },
        { id: "3", text: "Quá trình tổng hợp protein", isCorrect: false },
        { id: "4", text: "Quá trình trao đổi chất", isCorrect: false }
      ]
    },
    {
      term: "Giảm phân",
      definition: "Quá trình phân chia tế bào tạo giao tử với số lượng NST giảm đi một nửa",
      options: [
        { id: "1", text: "Quá trình phân chia tế bào thường", isCorrect: false },
        { id: "2", text: "Quá trình phân chia tế bào tạo giao tử với số lượng NST giảm đi một nửa", isCorrect: true },
        { id: "3", text: "Quá trình tổng hợp ADN", isCorrect: false },
        { id: "4", text: "Quá trình trao đổi khí", isCorrect: false }
      ]
    },
    {
      term: "Đột biến gen",
      definition: "Sự thay đổi cấu trúc của gen",
      options: [
        { id: "1", text: "Sự thay đổi cấu trúc của gen", isCorrect: true },
        { id: "2", text: "Sự thay đổi số lượng NST", isCorrect: false },
        { id: "3", text: "Sự thay đổi hình dạng tế bào", isCorrect: false },
        { id: "4", text: "Sự thay đổi chức năng protein", isCorrect: false }
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
        if (typeof window !== 'undefined') { location.href = '/learning-paths-demo/sinh-hoc'; }
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
      subject="Sinh học - Thành phần hóa học của tế bào"
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
