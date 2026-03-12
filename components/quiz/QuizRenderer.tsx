/**
 * QuizRenderer Component
 * Interactive quiz display and answer management
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle, SkipForward, Volume2 } from 'lucide-react';
import type { Quiz, Question } from '@/lib/validators/quiz-validator';

interface QuizRendererProps {
  quiz: Quiz;
  onComplete?: (result: QuizResult) => void;
  onSkip?: () => void;
  showExplanations?: boolean;
  allowSkip?: boolean;
  autoAdvance?: boolean;
}

interface QuizAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
}

interface QuizResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number; // percentage
  timeSpent: number; // in seconds
  answers: QuizAnswer[];
  difficulty: string;
}

export function QuizRenderer({
  quiz,
  onComplete,
  onSkip,
  showExplanations = true,
  allowSkip = false,
  autoAdvance = false,
}: QuizRendererProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const answeredCount = answers.size;
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSelectAnswer = useCallback(
    (answerIndex: number) => {
      const newAnswers = new Map(answers);
      newAnswers.set(currentQuestionIndex, answerIndex);
      setAnswers(newAnswers);
      setShowAnswer(true);

      // Auto-advance if enabled
      if (autoAdvance && !isLastQuestion) {
        setTimeout(() => {
          handleNextQuestion();
        }, 2000);
      }
    },
    [answers, currentQuestionIndex, isLastQuestion, autoAdvance]
  );

  const handleNextQuestion = useCallback(() => {
    if (isLastQuestion) {
      handleSubmitQuiz();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
      setQuestionStartTime(Date.now());
    }
  }, [isLastQuestion, currentQuestionIndex]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowAnswer(false);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex]);

  const handleSkipQuestion = useCallback(() => {
    if (allowSkip && !isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
      setQuestionStartTime(Date.now());
    }
  }, [allowSkip, isLastQuestion]);

  const handleSubmitQuiz = useCallback(() => {
    const correctAnswers = Array.from(answers.entries()).filter(
      ([qIndex, answer]) =>
        quiz.questions[qIndex].correctAnswer === answer
    ).length;

    const result: QuizResult = {
      totalQuestions: quiz.questions.length,
      correctAnswers,
      score: Math.round((correctAnswers / quiz.questions.length) * 100),
      timeSpent: Math.round((Date.now() - quizStartTime) / 1000),
      answers: Array.from(answers.entries()).map(([qIndex, answer]) => ({
        questionIndex: qIndex,
        selectedAnswer: answer,
        isCorrect: quiz.questions[qIndex].correctAnswer === answer,
        timeSpent: 0, // Would need to track per question
      })),
      difficulty: quiz.metadata?.topic || 'unknown',
    };

    onComplete?.(result);
  }, [answers, quiz, quizStartTime, onComplete]);

  const isAnswered = answers.has(currentQuestionIndex);
  const userAnswer = answers.get(currentQuestionIndex);
  const isUserAnswerCorrect = userAnswer !== undefined && 
    quiz.questions[currentQuestionIndex].correctAnswer === userAnswer;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
        <div className="flex justify-between items-center text-sm">
          <span>Câu {currentQuestionIndex + 1}/{quiz.questions.length}</span>
          <span>Đã trả lời: {answeredCount}/{quiz.questions.length}</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Question Section */}
      <div className="p-8">
        {/* Question */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex-1">
              {currentQuestion.question}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              currentQuestion.difficulty === 'easy'
                ? 'bg-green-100 text-green-700'
                : currentQuestion.difficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {currentQuestion.difficulty === 'easy' ? 'Dễ' :
               currentQuestion.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
            </span>
          </div>

          {/* Tags */}
          {currentQuestion.tags && currentQuestion.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentQuestion.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            const isSelected = userAnswer === index;
            const isCorrectOption = currentQuestion.correctAnswer === index;
            const shouldHighlight = showAnswer && isSelected;
            const showCorrect = showAnswer && isCorrectOption;

            return (
              <button
                key={index}
                onClick={() => !showAnswer && handleSelectAnswer(index)}
                disabled={showAnswer}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  shouldHighlight && isCorrectOption
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : shouldHighlight && !isCorrectOption
                    ? 'border-red-500 bg-red-50 text-red-900'
                    : showCorrect
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${showAnswer ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {String.fromCharCode(65 + index)}. {option}
                  </span>
                  {shouldHighlight && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {shouldHighlight && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  {showCorrect && !isSelected && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showAnswer && showExplanations && (
          <div className={`p-4 rounded-lg mb-6 ${
            isUserAnswerCorrect
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {isUserAnswerCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`font-semibold mb-2 ${
                  isUserAnswerCorrect ? 'text-green-900' : 'text-blue-900'
                }`}>
                  {isUserAnswerCorrect ? 'Chính xác! 🎉' : 'Giải thích'}
                </p>
                <p className={isUserAnswerCorrect ? 'text-green-800' : 'text-blue-800'}>
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Learning Objective */}
        {currentQuestion.learningObjective && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg mb-6">
            <p className="text-sm text-purple-900">
              <strong>Mục tiêu học tập:</strong> {currentQuestion.learningObjective}
            </p>
          </div>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="bg-gray-50 px-8 py-6 flex justify-between items-center border-t">
        <div className="flex gap-2">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
          >
            ← Câu trước
          </button>

          {allowSkip && !isAnswered && (
            <button
              onClick={handleSkipQuestion}
              disabled={isLastQuestion}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Bỏ qua
            </button>
          )}
        </div>

        <button
          onClick={handleNextQuestion}
          disabled={!isAnswered && !showAnswer}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            isAnswered && showAnswer
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-300 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isLastQuestion ? 'Nộp bài' : 'Câu tiếp →'}
        </button>
      </div>
    </div>
  );
}

/**
 * Quiz Results Display Component
 */
interface QuizResultsProps {
  result: QuizResult;
  quiz: Quiz;
  onRetry?: () => void;
  onExit?: () => void;
}

export function QuizResults({
  result,
  quiz,
  onRetry,
  onExit,
}: QuizResultsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-900', border: 'border-green-300' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-900', border: 'border-yellow-300' };
    return { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300' };
  };

  const scoreColor = getScoreColor(result.score);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Kết Quả Bài Kiểm Tra</h2>
        <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${scoreColor.bg} ${scoreColor.text} border-4 ${scoreColor.border}`}>
          <span className="text-5xl font-bold">{result.score}%</span>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Câu đúng</p>
            <p className="text-2xl font-bold text-blue-900">
              {result.correctAnswers}/{result.totalQuestions}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Thời gian</p>
            <p className="text-2xl font-bold text-purple-900">
              {Math.floor(result.timeSpent / 60)}:{String(result.timeSpent % 60).padStart(2, '0')}
            </p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg text-center">
            <p className="text-sm text-gray-600">Độ khó</p>
            <p className="text-2xl font-bold text-indigo-900">{result.difficulty}</p>
          </div>
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          {result.score >= 80 && (
            <p className="text-lg text-green-900 font-semibold">Tuyệt vời! Bạn làm rất tốt! 🎉</p>
          )}
          {result.score >= 60 && result.score < 80 && (
            <p className="text-lg text-yellow-900 font-semibold">Rất tốt! Hãy tiếp tục cố gắng! 💪</p>
          )}
          {result.score < 60 && (
            <p className="text-lg text-red-900 font-semibold">Bạn cần ôn tập lại các kiến thức này! 📚</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
            >
              Làm lại bài
            </button>
          )}
          {onExit && (
            <button
              onClick={onExit}
              className="px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              Thoát
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
