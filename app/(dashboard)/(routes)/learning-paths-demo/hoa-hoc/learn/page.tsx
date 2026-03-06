'use client';

"use client"

import { useState } from "react";
import { QuizletStyleLearning } from "@/components/quizlet-style-learning";
import { useLanguage } from '@/contexts/LanguageContext';

export default function HoaHocLearnPage() {
  const { t } = useLanguage();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const questions = [
    {
      term: "Nguyên tử",
      definition: "Đơn vị cơ bản của vật chất",
      options: [
        { id: "1", text: "Hạt nhỏ nhất của nguyên tố hóa học", isCorrect: true },
        { id: "2", text: "Phân tử của hợp chất", isCorrect: false },
        { id: "3", text: "Ion dương", isCorrect: false },
        { id: "4", text: "Ion âm", isCorrect: false }
      ]
    },
    {
      term: "Proton",
      definition: "Hạt mang điện tích dương trong hạt nhân",
      options: [
        { id: "1", text: "Hạt không mang điện", isCorrect: false },
        { id: "2", text: "Hạt mang điện tích âm", isCorrect: false },
        { id: "3", text: "Hạt mang điện tích dương trong hạt nhân", isCorrect: true },
        { id: "4", text: "Hạt quay quanh hạt nhân", isCorrect: false }
      ]
    },
    {
      term: "Electron",
      definition: "Hạt mang điện tích âm quay quanh hạt nhân",
      options: [
        { id: "1", text: "Hạt trong hạt nhân", isCorrect: false },
        { id: "2", text: "Hạt mang điện tích âm quay quanh hạt nhân", isCorrect: true },
        { id: "3", text: "Hạt không mang điện", isCorrect: false },
        { id: "4", text: "Hạt mang điện tích dương", isCorrect: false }
      ]
    },
    {
      term: "Neutron",
      definition: "Hạt không mang điện trong hạt nhân",
      options: [
        { id: "1", text: "Hạt mang điện tích dương", isCorrect: false },
        { id: "2", text: "Hạt mang điện tích âm", isCorrect: false },
        { id: "3", text: "Hạt không mang điện trong hạt nhân", isCorrect: true },
        { id: "4", text: "Hạt quay quanh hạt nhân", isCorrect: false }
      ]
    },
    {
      term: "Số hiệu nguyên tử",
      definition: "Số proton trong hạt nhân nguyên tử",
      options: [
        { id: "1", text: "Số electron trong nguyên tử", isCorrect: false },
        { id: "2", text: "Số neutron trong hạt nhân", isCorrect: false },
        { id: "3", text: "Số proton trong hạt nhân nguyên tử", isCorrect: true },
        { id: "4", text: "Tổng số hạt trong nguyên tử", isCorrect: false }
      ]
    },
    {
      term: "Khối lượng nguyên tử",
      definition: "Tổng khối lượng của proton và neutron",
      options: [
        { id: "1", text: "Khối lượng của electron", isCorrect: false },
        { id: "2", text: "Tổng khối lượng của proton và neutron", isCorrect: true },
        { id: "3", text: "Khối lượng của proton", isCorrect: false },
        { id: "4", text: "Khối lượng của neutron", isCorrect: false }
      ]
    },
    {
      term: "Đồng vị",
      definition: "Các nguyên tử cùng nguyên tố có số neutron khác nhau",
      options: [
        { id: "1", text: "Các nguyên tử khác nguyên tố", isCorrect: false },
        { id: "2", text: "Các nguyên tử cùng nguyên tố có số neutron khác nhau", isCorrect: true },
        { id: "3", text: "Các nguyên tử có số proton khác nhau", isCorrect: false },
        { id: "4", text: "Các nguyên tử có số electron khác nhau", isCorrect: false }
      ]
    },
    {
      term: "Bảng tuần hoàn",
      definition: "Bảng sắp xếp các nguyên tố theo số hiệu nguyên tử",
      options: [
        { id: "1", text: "Bảng sắp xếp các nguyên tố theo số hiệu nguyên tử", isCorrect: true },
        { id: "2", text: "Bảng sắp xếp các hợp chất", isCorrect: false },
        { id: "3", text: "Bảng sắp xếp các ion", isCorrect: false },
        { id: "4", text: "Bảng sắp xếp các phân tử", isCorrect: false }
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
        if (typeof window !== 'undefined') { location.href = '/learning-paths-demo/hoa-hoc'; }
      }, 3000); // Wait 3 seconds to show celebration
    }
  };

  const isCompleted = currentQuestionIndex === questions.length - 1 && showResult;
  const totalXP = score * 10; // 10 XP per correct answer

  const handleSkip = () => {
    handleNext();
  };

  return (
    <QuizletStyleLearning
      subject="Hóa học - Cấu tạo nguyên tử"
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
