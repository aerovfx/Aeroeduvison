'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, Target, TrendingUp, Clock, Star, Award, Users, Zap,
  BookOpen, Play, CheckCircle, ArrowRight, BarChart3, PieChart,
  Lightbulb, MessageCircle, Trophy, Calendar, Activity, Heart,
  Cpu, Database, Gamepad2, Rocket, Beaker, Sparkles, Eye,
  Calculator, Atom, Dna, Code2, ChevronRight, ChevronLeft, X
} from 'lucide-react';

export default function LearningPlannerPage() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const [aiGeneratedLesson, setAiGeneratedLesson] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lessonStarted, setLessonStarted] = useState(false);

  // Sample lesson data structure
  const sampleLessons = [
    {
      id: 'math-integral-1',
      title: 'Hoàn thành bài toán tích phân',
      subject: 'mathematics',
      difficulty: 'high',
      duration: 60,
      xpReward: 150,
      estimatedTime: 45, // Based on current XP
      tags: ['lesson', 'advanced'],
      date: '2024-01-15',
      description: 'Giải các bài toán tích phân từ cơ bản đến nâng cao với AI hỗ trợ',
      objectives: [
        'Hiểu khái niệm tích phân',
        'Áp dụng các công thức tích phân',
        'Giải bài tập thực tế'
      ],
      prerequisites: ['Đạo hàm', 'Giới hạn'],
      aiFeatures: [
        'AI giải thích từng bước',
        'Gợi ý phương pháp giải',
        'Đánh giá tiến độ real-time'
      ]
    },
    {
      id: 'physics-motion-2',
      title: 'Chuyển động ném xiên',
      subject: 'physics',
      difficulty: 'medium',
      duration: 45,
      xpReward: 120,
      estimatedTime: 35,
      tags: ['lesson', 'intermediate'],
      date: '2024-01-16',
      description: 'Phân tích chuyển động ném xiên trong không gian 2D',
      objectives: [
        'Phân tích vector vận tốc',
        'Tính toán quỹ đạo',
        'Ứng dụng trong thực tế'
      ],
      prerequisites: ['Vector', 'Động học'],
      aiFeatures: [
        'Mô phỏng 3D chuyển động',
        'AI phân tích lỗi sai',
        'Gợi ý công thức phù hợp'
      ]
    },
    {
      id: 'chemistry-organic-1',
      title: 'Phản ứng hữu cơ cơ bản',
      subject: 'chemistry',
      difficulty: 'medium',
      duration: 50,
      xpReward: 130,
      estimatedTime: 40,
      tags: ['lesson', 'intermediate'],
      date: '2024-01-17',
      description: 'Tìm hiểu các phản ứng hữu cơ quan trọng',
      objectives: [
        'Nhận biết các nhóm chức',
        'Dự đoán sản phẩm phản ứng',
        'Cân bằng phương trình'
      ],
      prerequisites: ['Cấu trúc phân tử', 'Liên kết hóa học'],
      aiFeatures: [
        'AI vẽ cấu trúc phân tử',
        'Dự đoán sản phẩm',
        'Giải thích cơ chế phản ứng'
      ]
    }
  ];

  // Load saved lesson from localStorage
  useEffect(() => {
    const savedLesson = localStorage.getItem('ai-generated-lesson');
    if (savedLesson) {
      setAiGeneratedLesson(JSON.parse(savedLesson));
      setLessonStarted(true);
    }
  }, []);

  const generateAILesson = async () => {
    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Select a random lesson (in real app, this would be AI-generated)
    const randomLesson = sampleLessons[Math.floor(Math.random() * sampleLessons.length)];
    
    // Add AI-specific data
    const aiLesson = {
      ...randomLesson,
      generatedAt: new Date().toISOString(),
      aiGenerated: true,
      personalizedFor: 'student@example.com',
      adaptiveContent: true,
      realTimeFeedback: true
    };
    
    setAiGeneratedLesson(aiLesson);
    setLessonStarted(true);
    
    // Save to localStorage
    localStorage.setItem('ai-generated-lesson', JSON.stringify(aiLesson));
    
    setIsGenerating(false);
  };

  const continueLesson = () => {
    // Navigate to AI Tutor with the lesson
    router.push(`/ai-tutor?lesson=${aiGeneratedLesson.id}`);
  };

  const resetLesson = () => {
    setAiGeneratedLesson(null);
    setLessonStarted(false);
    localStorage.removeItem('ai-generated-lesson');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'easy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'mathematics': return <Calculator className="w-5 h-5" />;
      case 'physics': return <Atom className="w-5 h-5" />;
      case 'chemistry': return <Beaker className="w-5 h-5" />;
      case 'biology': return <Dna className="w-5 h-5" />;
      case 'programming': return <Code2 className="w-5 h-5" />;
      case 'ai_ml': return <Brain className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🤖 AI Learning Planner</h1>
              <p className="text-purple-100">Lập kế hoạch học tập thông minh với AI</p>
            
              </div>
            <div className="text-right">
              <div className="text-2xl font-bold">2,450 XP</div>
              <div className="text-purple-100">Current Level</div>
            </div>
          </div>
        </div>

        {!aiGeneratedLesson ? (
          /* Generate New Lesson Section */
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Tạo bài học AI-driven
              </h2>
              
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                AI sẽ phân tích năng lực hiện tại và tạo ra một bài học cá nhân hóa 
                phù hợp với trình độ và sở thích học tập của bạn.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cá nhân hóa</h3>
                  <p className="text-sm text-gray-600">Dựa trên XP và sở thích</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Thích ứng</h3>
                  <p className="text-sm text-gray-600">Điều chỉnh theo tiến độ</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">AI hỗ trợ</h3>
                  <p className="text-sm text-gray-600">Giải thích và gợi ý</p>
                </div>
              </div>

              <button
                onClick={generateAILesson}
                disabled={isGenerating}
                className={`px-8 py-4 rounded-lg font-medium text-lg transition-all shadow-lg ${
                  isGenerating
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    AI đang tạo bài học...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    ✨ Học ngay với AI
                  </div>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Generated Lesson Display */
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-4">
                  {getSubjectIcon(aiGeneratedLesson.subject)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {aiGeneratedLesson.title}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(aiGeneratedLesson.difficulty)}`}>
                      {aiGeneratedLesson.difficulty}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {aiGeneratedLesson.duration} min
                    </span>
                    <span className="text-green-600 font-semibold">
                      +{aiGeneratedLesson.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={resetLesson}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Tạo bài học mới"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Lesson Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">📚 Thông tin bài học</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Môn học:</span>
                    <span className="font-medium">{aiGeneratedLesson.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loại:</span>
                    <span className="font-medium">{aiGeneratedLesson.tags.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ngày tạo:</span>
                    <span className="font-medium">{aiGeneratedLesson.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cấp độ:</span>
                    <span className="font-medium">{aiGeneratedLesson.tags[1]}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">🎯 Mục tiêu học tập</h3>
                <ul className="space-y-1 text-sm">
                  {aiGeneratedLesson.objectives.map((objective: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Features */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Tính năng AI
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiGeneratedLesson.aiFeatures.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* XP-based Estimate */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Lightbulb className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  Dựa trên XP hiện tại, bạn có thể hoàn thành trong {aiGeneratedLesson.estimatedTime} phút
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={continueLesson}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg flex items-center justify-center"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                ✨ Học ngay với AI
              </button>
              
              <button
                onClick={continueLesson}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all flex items-center justify-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Tiếp tục học
              </button>
            </div>
          </div>
        )}

        {/* Back to Learning Paths */}
        <div className="text-center">
          <a
            href="/learning-paths-demo"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Quay lại Learning Paths
          </a>
        </div>
      </div>
    </div>
  );
}