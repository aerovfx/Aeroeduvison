"use client"

import { useState } from "react";
import { QuizletStyleLearning } from "@/components/quizlet-style-learning";
import { getQuestionsForLesson } from "@/lib/learning-questions";

export default function ToanHocLearnPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  // Lấy câu hỏi từ database dựa trên lesson ID
  const lessonId = "toan-hoc-10-1"; // Có thể lấy từ URL params hoặc state
  const questions = getQuestionsForLesson(lessonId);

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
        window.location.href = '/learning-paths-demo/toan-hoc';
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
      subject="Toán học - Tập hợp và mệnh đề"
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
