'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, Target, CheckCircle, ArrowRight, BookOpen, Lightbulb,
  Clock, Star, Trophy, Send, X, Check, AlertCircle, Sparkles,
  ArrowLeft, BarChart3, Award
} from 'lucide-react';

export default function LessonPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [lesson, setLesson] = useState<any>(null);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<any>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSection, setCurrentSection] = useState<'content' | 'exercises' | 'results'>('content');

  useEffect(() => {
    // Load lesson from localStorage or props
    const lessonData = localStorage.getItem('currentLesson');
    if (lessonData) {
      const parsedLesson = JSON.parse(lessonData);
      setLesson(parsedLesson);
    } else {
      // Redirect back if no lesson
      router.push('/learning-paths-demo/planner');
    }
  }, []);

  const handleAnswerChange = (exerciseIndex: number, answer: string) => {
    setUserAnswers({
      ...userAnswers,
      [exerciseIndex]: answer
    });
  };

  const submitExercises = async () => {
    if (!lesson || !lesson.exercises) return;

    setIsSubmitting(true);

    // Auto-grading logic
    let correctCount = 0;
    const results: any = {};

    lesson.exercises.forEach((exercise: any, index: number) => {
      const userAnswer = userAnswers[index] || '';
      const correctAnswer = exercise.answer || '';
      
      // Simple comparison (case-insensitive, trimmed)
      const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      
      if (isCorrect) {
        correctCount++;
      }

      results[index] = {
        userAnswer,
        correctAnswer,
        isCorrect,
        explanation: exercise.explanation
      };
    });

    const finalScore = Math.round((correctCount / lesson.exercises.length) * 100);
    setScore(finalScore);
    setShowResults(true);
    setCurrentSection('results');
    setIsSubmitting(false);

    // Save results
    const completedLesson = {
      ...lesson,
      completedAt: new Date().toISOString(),
      score: finalScore,
      results
    };

    // Add to completed lessons
    const savedLessons = localStorage.getItem('completedLessons') || '[]';
    const completedLessons = JSON.parse(savedLessons);
    completedLessons.push(completedLesson);
    localStorage.setItem('completedLessons', JSON.stringify(completedLessons));

    // Update XP
    const earnedXP = Math.round((lesson.xpReward || 0) * (finalScore / 100));
    const totalXP = parseInt(localStorage.getItem('totalXPEarned') || '0');
    localStorage.setItem('totalXPEarned', (totalXP + earnedXP).toString());
  };

  const completeLesson = () => {
    router.push('/learning-paths-demo/planner');
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bài học...</p>
        </div>
      
              </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/learning-paths-demo/planner')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {lesson.estimatedTime} phút
                  </span>
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-500" />
                    {lesson.xpReward} XP
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    lesson.difficulty === 'expert' ? 'bg-red-100 text-red-600' :
                    lesson.difficulty === 'advanced' ? 'bg-orange-100 text-orange-600' :
                    lesson.difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {lesson.difficulty}
                  </span>
                  {lesson.provider && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-600">
                      {lesson.provider === 'grok' ? '🚀 Grok AI' : '✨ Gemini 2.5 Pro'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Progress */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Tiến độ</div>
                <div className="text-lg font-bold text-purple-600">
                  {currentSection === 'content' ? 'Học tập' :
                   currentSection === 'exercises' ? 'Bài tập' : 'Kết quả'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {currentSection === 'content' && (
          <div className="space-y-6">
            {/* Learning Objectives */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-blue-600" />
                  Mục tiêu học tập
                </h2>
                <ul className="space-y-2">
                  {lesson.objectives.map((obj: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Main Content */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                Nội dung bài học
              </h2>
              <div className="prose max-w-none text-gray-700">
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: lesson.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                  }} 
                />
              </div>
            </div>

            {/* Resources */}
            {lesson.resources && lesson.resources.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-green-600" />
                  Tài liệu tham khảo
                </h2>
                <ul className="space-y-2">
                  {lesson.resources.map((resource: string, index: number) => (
                    <li key={index} className="text-blue-600 hover:text-blue-800">
                      <a href={resource} target="_blank" rel="noopener noreferrer" className="flex items-center">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        {resource}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentSection('exercises')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center space-x-2"
              >
                <Lightbulb className="w-6 h-6" />
                <span>Bắt đầu làm bài tập</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {currentSection === 'exercises' && lesson.exercises && lesson.exercises.length > 0 && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-white rounded-2xl shadow-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Bài tập {currentExercise + 1} / {lesson.exercises.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Object.keys(userAnswers).length} / {lesson.exercises.length} đã trả lời
                </span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${((currentExercise + 1) / lesson.exercises.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Current Exercise */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Bài tập {currentExercise + 1}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {lesson.exercises[currentExercise].difficulty || 'moderate'}
                  </span>
                </div>
                <p className="text-lg text-gray-700 mb-6">
                  {lesson.exercises[currentExercise].question}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Câu trả lời của bạn:
                </label>
                <textarea
                  value={userAnswers[currentExercise] || ''}
                  onChange={(e) => handleAnswerChange(currentExercise, e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
                <div className="mt-2 text-sm text-gray-500">
                  {(userAnswers[currentExercise] || '').length} ký tự
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentExercise(Math.max(0, currentExercise - 1))}
                  disabled={currentExercise === 0}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Bài trước</span>
                </button>

                {currentExercise < lesson.exercises.length - 1 ? (
                  <button
                    onClick={() => setCurrentExercise(currentExercise + 1)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <span>Bài tiếp theo</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={submitExercises}
                    disabled={isSubmitting || Object.keys(userAnswers).length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-5 h-5" />
                    <span>{isSubmitting ? 'Đang chấm...' : 'Nộp bài'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Exercise Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Tổng quan bài tập</h3>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
                {lesson.exercises.map((_: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setCurrentExercise(index)}
                    className={`w-12 h-12 rounded-lg font-medium transition-all ${
                      currentExercise === index
                        ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                        : userAnswers[index]
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentSection === 'results' && (
          <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className={`w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center ${
                score >= 80 ? 'bg-green-100' :
                score >= 60 ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                <div>
                  <div className={`text-4xl font-bold ${
                    score >= 80 ? 'text-green-600' :
                    score >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {score}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Điểm số</div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {score >= 80 ? '🎉 Xuất sắc!' :
                 score >= 60 ? '👍 Khá tốt!' :
                 '💪 Cố gắng lên!'}
              </h2>
              <p className="text-gray-600 mb-6">
                Bạn đã trả lời đúng {Math.round((score / 100) * lesson.exercises.length)} / {lesson.exercises.length} câu
              </p>

              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    +{Math.round((lesson.xpReward || 0) * (score / 100))} XP
                  </div>
                  <div className="text-sm text-gray-500">XP earned</div>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                Chi tiết kết quả
              </h3>
              
              <div className="space-y-4">
                {lesson.exercises.map((exercise: any, index: number) => {
                  const userAnswer = userAnswers[index] || '';
                  const correctAnswer = exercise.answer || '';
                  const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

                  return (
                    <div key={index} className={`border rounded-xl p-4 ${
                      isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">
                          Bài {index + 1}: {exercise.question}
                        </h4>
                        {isCorrect ? (
                          <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-6 h-6 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Câu trả lời của bạn: </span>
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {userAnswer || '(Không trả lời)'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div>
                            <span className="font-medium text-gray-700">Đáp án đúng: </span>
                            <span className="text-green-700">{correctAnswer}</span>
                          </div>
                        )}
                        {exercise.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium text-blue-900">💡 Giải thích: </span>
                            <span className="text-blue-800">{exercise.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setCurrentSection('exercises');
                  setCurrentExercise(0);
                  setShowResults(false);
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Làm lại bài tập
              </button>
              <button
                onClick={completeLesson}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2"
              >
                <Trophy className="w-5 h-5" />
                <span>Hoàn thành và về Planner</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

