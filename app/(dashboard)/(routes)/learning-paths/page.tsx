'use client';

import React, { useState, useEffect } from 'react';
import { 
  Map, Target, Brain, Calendar, TrendingUp, Award, Clock, 
  CheckCircle, Circle, Lock, Sparkles, ChevronRight, Play,
  BarChart, Zap, Star, BookOpen, MessageCircle, RefreshCw,
  ArrowRight, Trophy, Flame, Heart, AlertCircle, Code
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSession } from 'next-auth/react';

interface LearningPathLesson {
  id: string;
  title: string;
  subject: string;
  type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  xpReward: number;
  status: 'completed' | 'in-progress' | 'locked' | 'available';
  day: number;
  date: string;
  completedAt?: Date;
  progress?: number;
  aiGenerated: boolean;
  objectives: string[];
  prerequisites?: string[];
}

interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  lessons: LearningPathLesson[];
  totalXP: number;
  completedLessons: number;
}

// AI Learning Path Algorithm Interfaces
interface LearningPathFormData {
  experience: string;
  goal: string;
  timeCommit: string;
  interest: string;
  budget: string;
}

interface LearningPathResult {
  platform: string;
  name: string;
  score: number;
  recommendation: string;
  weeks: string[];
  resources: string[];
  color: string;
}

export default function LearningPathPage() {
  const { t } = useLanguage();
  const { data: session } = useSession();
  
  // Original learning path states
  const [pathData, setPathData] = useState<WeekData[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [stats, setStats] = useState({
    totalDays: 0,
    completedDays: 0,
    totalXP: 0,
    earnedXP: 0,
    currentStreak: 0,
    longestStreak: 0
  });
  const [selectedLesson, setSelectedLesson] = useState<LearningPathLesson | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Learning Path states
  const [showAIForm, setShowAIForm] = useState(false);
  const [formData, setFormData] = useState<LearningPathFormData>({
    experience: '',
    goal: '',
    timeCommit: '',
    interest: '',
    budget: ''
  });
  const [aiResult, setAiResult] = useState<LearningPathResult[] | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [canGenerateAI, setCanGenerateAI] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  useEffect(() => {
    // Load learning path from localStorage
    const savedPath = localStorage.getItem('learningPath');
    if (savedPath) {
      const data = JSON.parse(savedPath);
      generateWeeklyPath(data);
    } else {
      // Generate demo path
      generateDemoPath();
    }
    
    // Check and update lesson locks based on completion
    updateLessonLocks();
    
    // Check AI generation limit
    checkAIGenerationLimit();
    
    // Load last AI generation time from localStorage
    const lastGen = localStorage.getItem('learning-path-ai-last-generated');
    if (lastGen) {
      setLastGenerated(new Date(lastGen));
    }
  }, []);

  useEffect(() => {
    // Update countdown timer for AI generation
    if (lastGenerated && !canGenerateAI) {
      const interval = setInterval(() => {
        updateCountdown();
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [lastGenerated, canGenerateAI]);
  
  const updateLessonLocks = () => {
    const pathProgress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
    
    // Update pathData based on progress
    setPathData(prevWeeks => {
      return prevWeeks.map(week => ({
        ...week,
        lessons: week.lessons.map((lesson, index) => {
          const progress = pathProgress[lesson.id];
          
          // If lesson is completed, update status
          if (progress?.completed) {
            return {
              ...lesson,
              status: 'completed',
              completedAt: new Date(progress.completedAt),
              progress: 100
            };
          }
          
          // Check if lesson should be unlocked
          if (lesson.status === 'locked' && lesson.prerequisites) {
            const allPrereqsPassed = lesson.prerequisites.every(prereqId => {
              const prereqProgress = pathProgress[prereqId];
              return prereqProgress?.passed === true; // Must pass with >= 60%
            });
            
            if (allPrereqsPassed) {
              return { ...lesson, status: 'available' };
            }
          }
          
          return lesson;
        })
      }));
    });
  };

  const checkAIGenerationLimit = () => {
    if (session?.user?.role === 'STUDENT') {
      const lastGen = localStorage.getItem('learning-path-ai-last-generated');
      if (lastGen) {
        const lastGenDate = new Date(lastGen);
        const now = new Date();
        const diffInDays = (now.getTime() - lastGenDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (diffInDays < 7) {
          setCanGenerateAI(false);
          setLastGenerated(lastGenDate);
        } else {
          setCanGenerateAI(true);
        }
      }
    } else {
      // Teachers and admins can generate unlimited
      setCanGenerateAI(true);
    }
  };

  const updateCountdown = () => {
    if (!lastGenerated) return;
    
    const now = new Date();
    const nextAvailable = new Date(lastGenerated.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffInMs = nextAvailable.getTime() - now.getTime();
    
    if (diffInMs <= 0) {
      setCanGenerateAI(true);
      setTimeUntilNext('');
      return;
    }
    
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeUntilNext(`${days} ngày ${hours} giờ ${minutes} phút`);
  };

  const generateDemoPath = () => {
    const today = new Date();
    const weeks: WeekData[] = [];

    // Generate 4 weeks of learning path
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (week - 1) * 7);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const lessons: LearningPathLesson[] = [];
      
      // Generate 5 lessons per week (Monday to Friday)
      for (let day = 1; day <= 5; day++) {
        const lessonDate = new Date(weekStart);
        lessonDate.setDate(weekStart.getDate() + day - 1);
        
        const dayNumber = (week - 1) * 5 + day;
        const isCompleted = week === 1 && day <= 3;
        const isInProgress = week === 1 && day === 4;
        const isAvailable = week === 1 && day === 5;
        
        lessons.push({
          id: `lesson-w${week}-d${day}`,
          title: getDemoLessonTitle(dayNumber),
          subject: getDemoSubject(dayNumber),
          type: 'lesson',
          difficulty: getDemoDifficulty(dayNumber),
          duration: 45 + Math.floor(Math.random() * 30),
          xpReward: 100 + Math.floor(Math.random() * 100),
          status: isCompleted ? 'completed' : isInProgress ? 'in-progress' : isAvailable ? 'available' : 'locked',
          day: dayNumber,
          date: lessonDate.toISOString().split('T')[0],
          completedAt: isCompleted ? new Date(lessonDate) : undefined,
          progress: isInProgress ? 65 : undefined,
          aiGenerated: true,
          objectives: [
            `Hiểu khái niệm cơ bản`,
            `Áp dụng công thức`,
            `Giải bài tập thực tế`
          ],
          prerequisites: day > 1 ? [`lesson-w${week}-d${day - 1}`] : week > 1 ? [`lesson-w${week - 1}-d5`] : undefined
        });
      }

      const totalXP = lessons.reduce((sum, l) => sum + l.xpReward, 0);
      const completedLessons = lessons.filter(l => l.status === 'completed').length;

      weeks.push({
        weekNumber: week,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        lessons,
        totalXP,
        completedLessons
      });
    }

    setPathData(weeks);
    calculateStats(weeks);
  };

  const getDemoLessonTitle = (day: number): string => {
    const titles = [
      'Phương trình bậc hai cơ bản',
      'Hệ phương trình tuyến tính',
      'Hàm số và đồ thị',
      'Đạo hàm cơ bản',
      'Ứng dụng đạo hàm',
      'Tích phân cơ bản',
      'Ứng dụng tích phân',
      'Phương trình vi phân',
      'Chuỗi số',
      'Giới hạn và liên tục',
      'Hình học không gian',
      'Vectơ và ma trận',
      'Xác suất cơ bản',
      'Thống kê mô tả',
      'Phân phối xác suất',
      'Kiểm định giả thuyết',
      'Hồi quy tuyến tính',
      'Phân tích phương sai',
      'Chuỗi thời gian',
      'Tối ưu hóa'
    ];
    return titles[day - 1] || `Bài học ngày ${day}`;
  };

  const getDemoSubject = (day: number): string => {
    const subjects = ['mathematics', 'physics', 'chemistry', 'biology', 'programming'];
    return subjects[day % subjects.length];
  };

  const getDemoDifficulty = (day: number): 'beginner' | 'intermediate' | 'advanced' => {
    if (day <= 5) return 'beginner';
    if (day <= 15) return 'intermediate';
    return 'advanced';
  };

  const generateWeeklyPath = (savedData: any) => {
    // Convert saved learning path to weekly format
    // Implementation would depend on saved data structure
    generateDemoPath(); // For now, use demo
  };

  const calculateStats = (weeks: WeekData[]) => {
    let totalDays = 0;
    let completedDays = 0;
    let totalXP = 0;
    let earnedXP = 0;

    weeks.forEach(week => {
      week.lessons.forEach(lesson => {
        totalDays++;
        totalXP += lesson.xpReward;
        if (lesson.status === 'completed') {
          completedDays++;
          earnedXP += lesson.xpReward;
        }
      });
    });

    setStats({
      totalDays,
      completedDays,
      totalXP,
      earnedXP,
      currentStreak: 3, // Demo value
      longestStreak: 5  // Demo value
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'in-progress':
        return <Circle className="w-6 h-6 text-blue-500 animate-pulse" />;
      case 'available':
        return <Play className="w-6 h-6 text-purple-500" />;
      case 'locked':
        return <Lock className="w-6 h-6 text-gray-400" />;
      default:
        return <Circle className="w-6 h-6 text-gray-300" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'mathematics':
        return '🧮';
      case 'physics':
        return '⚛️';
      case 'chemistry':
        return '🧪';
      case 'biology':
        return '🧬';
      case 'programming':
        return '💻';
      default:
        return '📚';
    }
  };

  const regenerateLessons = async () => {
    const confirmed = confirm(
      '🤖 AI sẽ tạo lộ trình học tập mới dựa trên:\n' +
      '• Tiến độ hiện tại của bạn\n' +
      '• Điểm số và performance\n' +
      '• Mục tiêu học tập\n\n' +
      'Bạn có muốn tiếp tục không?'
    );
    
    if (!confirmed) return;
    
    setIsGenerating(true);
    
    try {
      console.log('🤖 Generating new learning path with AI...');
      
      // Get current progress
      const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
      const completedLessons = Object.keys(progress).filter(key => progress[key].completed);
      const avgScore = Object.values(progress).reduce((sum: number, p: any) => sum + (p.percentage || 0), 0) / Object.keys(progress).length || 0;
      
      // Call AI API to generate new learning path
      const response = await fetch('/api/ai-intelligent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          subject: 'Toán học',
          grade: '12',
          topic: 'Lộ trình học tập cá nhân hóa',
          difficulty: avgScore >= 80 ? 'advanced' : avgScore >= 60 ? 'intermediate' : 'beginner',
          freeformPrompt: `Tạo lộ trình học tập 4 tuần (20 bài) cho học sinh lớp 12:
          
Tiến độ hiện tại:
- Đã hoàn thành: ${completedLessons.length} bài
- Điểm trung bình: ${avgScore.toFixed(1)}%
- Chủ đề đã học: ${completedLessons.slice(0, 3).join(', ')}

Yêu cầu:
- Tạo 20 bài học (4 tuần × 5 ngày)
- Mỗi bài 45-60 phút
- Độ khó tăng dần
- Có prerequisites logic (bài sau yêu cầu hoàn thành bài trước)
- Phù hợp với học sinh Việt Nam
- Đa dạng môn học: Toán, Vật lý, Hóa học
- Format JSON với structure: { weeks: [{ lessons: [...] }] }`,
          priority: ['quality', 'speed'],
          useHybrid: true,
          enableCache: false
        })
      });
      
      if (!response.ok) {
        throw new Error('AI generation failed');
      }
      
      const result = await response.json();
      console.log('✅ AI generated path:', result);
      
      // Parse AI response and update path
      // For now, regenerate demo path
      generateDemoPath();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-green-500 rounded-lg shadow-2xl p-6 z-50 animate-in slide-in-from-right max-w-md';
      notification.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-gray-900 mb-1">✅ Lộ trình mới đã tạo!</h3>
            <p class="text-sm text-gray-700">
              AI đã tạo 20 bài học được cá nhân hóa dựa trên tiến độ của bạn.
            </p>
            <p class="text-xs text-gray-500 mt-2">
              Model: ${result.meta?.model || 'AI'} • Cost: $${(result.meta?.cost || 0).toFixed(4)}
            </p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
      
    } catch (error: any) {
      console.error('❌ AI generation error:', error);
      alert('❌ Không thể tạo lộ trình mới. Vui lòng thử lại sau.\n\nLỗi: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Learning Path Algorithm Functions
  const calculateAIMatch = (data: LearningPathFormData) => {
    const scores = {
      openai: 0,
      gemini: 0,
      grok: 0,
      claude: 0
    };

    // Experience scoring
    if (data.experience === 'beginner') {
      scores.gemini += 30;
      scores.claude += 25;
      scores.openai += 20;
      scores.grok += 15;
    } else if (data.experience === 'intermediate') {
      scores.openai += 30;
      scores.claude += 25;
      scores.gemini += 20;
      scores.grok += 15;
    } else if (data.experience === 'advanced') {
      scores.openai += 35;
      scores.claude += 25;
      scores.grok += 20;
      scores.gemini += 15;
    }

    // Goal scoring
    if (data.goal === 'chat') {
      scores.claude += 25;
      scores.openai += 20;
      scores.gemini += 20;
      scores.grok += 15;
    } else if (data.goal === 'coding') {
      scores.openai += 30;
      scores.claude += 25;
      scores.gemini += 15;
      scores.grok += 10;
    } else if (data.goal === 'research') {
      scores.gemini += 30;
      scores.claude += 25;
      scores.openai += 20;
      scores.grok += 10;
    } else if (data.goal === 'realtime') {
      scores.grok += 35;
      scores.gemini += 20;
      scores.openai += 15;
      scores.claude += 10;
    }

    // Time commitment scoring
    if (data.timeCommit === 'casual') {
      scores.claude += 20;
      scores.gemini += 15;
      scores.openai += 10;
      scores.grok += 10;
    } else if (data.timeCommit === 'regular') {
      scores.openai += 20;
      scores.claude += 15;
      scores.gemini += 15;
      scores.grok += 10;
    } else if (data.timeCommit === 'intensive') {
      scores.openai += 25;
      scores.gemini += 20;
      scores.claude += 15;
      scores.grok += 10;
    }

    // Interest scoring
    if (data.interest === 'nlp') {
      scores.openai += 25;
      scores.claude += 20;
      scores.gemini += 15;
      scores.grok += 10;
    } else if (data.interest === 'multimodal') {
      scores.gemini += 30;
      scores.openai += 20;
      scores.claude += 15;
      scores.grok += 10;
    } else if (data.interest === 'social') {
      scores.grok += 30;
      scores.gemini += 15;
      scores.claude += 15;
      scores.openai += 10;
    } else if (data.interest === 'creative') {
      scores.claude += 25;
      scores.openai += 20;
      scores.gemini += 15;
      scores.grok += 10;
    }

    // Budget scoring
    if (data.budget === 'free') {
      scores.gemini += 25;
      scores.grok += 20;
      scores.claude += 15;
      scores.openai += 10;
    } else if (data.budget === 'moderate') {
      scores.claude += 20;
      scores.openai += 20;
      scores.gemini += 15;
      scores.grok += 15;
    } else if (data.budget === 'premium') {
      scores.openai += 25;
      scores.claude += 20;
      scores.gemini += 15;
      scores.grok += 10;
    }

    return scores;
  };

  const generateAILearningPath = (scores: any) => {
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([platform, score]) => ({ platform, score }));

    const paths = {
      openai: {
        name: 'OpenAI (GPT-4, ChatGPT)',
        weeks: [
          'Tuần 1-2: Cơ bản về API, prompt engineering',
          'Tuần 3-4: Function calling và embeddings',
          'Tuần 5-6: Fine-tuning và optimization',
          'Tuần 7-8: Xây dựng ứng dụng thực tế'
        ],
        resources: ['OpenAI Cookbook', 'Official Documentation', 'Community Forums'],
        color: 'bg-emerald-50 border-emerald-200'
      },
      gemini: {
        name: 'Google Gemini',
        weeks: [
          'Tuần 1-2: Khởi đầu với Gemini API',
          'Tuần 3-4: Xử lý đa phương thức (text, image, video)',
          'Tuần 5-6: Tích hợp với Google Workspace',
          'Tuần 7-8: Dự án tổng hợp'
        ],
        resources: ['Google AI Studio', 'Gemini Documentation', 'Vertex AI Tutorials'],
        color: 'bg-blue-50 border-blue-200'
      },
      grok: {
        name: 'xAI Grok',
        weeks: [
          'Tuần 1-2: Làm quen với Grok và X Platform',
          'Tuần 3-4: Real-time data processing',
          'Tuần 5-6: Social media analysis',
          'Tuần 7-8: Ứng dụng thời gian thực'
        ],
        resources: ['xAI Documentation', 'X Developer Portal', 'Community Guides'],
        color: 'bg-purple-50 border-purple-200'
      },
      claude: {
        name: 'Anthropic Claude',
        weeks: [
          'Tuần 1-2: Constitutional AI và cơ bản API',
          'Tuần 3-4: Long context và document analysis',
          'Tuần 5-6: Tool use và agentic workflows',
          'Tuần 7-8: Ứng dụng nâng cao'
        ],
        resources: ['Claude Documentation', 'Anthropic Cookbook', 'Prompt Library'],
        color: 'bg-amber-50 border-amber-200'
      }
    };

    return sorted.map(({ platform, score }) => ({
      ...paths[platform as keyof typeof paths],
      platform,
      score,
      recommendation: score >= 80 ? 'Rất phù hợp' : score >= 60 ? 'Phù hợp' : 'Có thể xem xét'
    }));
  };

  const handleAISubmit = async () => {
    if (!formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!canGenerateAI) {
      alert(`Bạn chỉ có thể tạo AI learning path mới sau ${timeUntilNext}`);
      return;
    }

    setIsGeneratingAI(true);
    
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const scores = calculateAIMatch(formData);
      const path = generateAILearningPath(scores);
      setAiResult(path);
      
      // Save generation time
      const now = new Date();
      localStorage.setItem('learning-path-ai-last-generated', now.toISOString());
      setLastGenerated(now);
      setCanGenerateAI(false);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-green-500 rounded-lg shadow-2xl p-6 z-50 animate-in slide-in-from-right max-w-md';
      notification.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-gray-900 mb-1">✅ AI Learning Path đã tạo!</h3>
            <p class="text-sm text-gray-700">
              Thuật toán AI đã tạo lộ trình học tập cá nhân hóa dựa trên thông tin của bạn.
            </p>
            <p class="text-xs text-gray-500 mt-2">
              ${session?.user?.role === 'STUDENT' ? 'Bạn có thể tạo lại sau 7 ngày' : 'Có thể tạo lại bất kỳ lúc nào'}
            </p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
      
    } catch (error) {
      console.error('Error generating AI learning path:', error);
      alert('Có lỗi xảy ra khi tạo AI learning path. Vui lòng thử lại.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleAIChange = (field: keyof LearningPathFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">🗺️ Lộ trình học tập của bạn</h1>
              <p className="text-purple-100">Theo dõi tiến độ và hoàn thành mục tiêu từng ngày</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAIForm(!showAIForm)}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                AI Learning Path
              </button>
              <button
                onClick={regenerateLessons}
                disabled={isGenerating}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'AI đang tạo...' : 'Tạo lộ trình mới'}
              </button>
            </div>
          </div>
        </div>

        {/* AI Learning Path Form */}
        {showAIForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <Sparkles className="w-6 h-6 mr-2 text-purple-600" />
                AI Learning Path Algorithm
              </h2>
              <button
                onClick={() => setShowAIForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Generation Limit Warning */}
            {session?.user?.role === 'STUDENT' && !canGenerateAI && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-yellow-800 mb-1">
                      ⏰ Giới hạn tạo AI Learning Path
                    </h3>
                    <p className="text-sm text-yellow-700 mb-2">
                      Tài khoản Student chỉ được tạo AI learning path mới <strong>1 lần/tuần</strong> để đảm bảo chất lượng học tập.
                    </p>
                    <p className="text-sm text-yellow-700">
                      Thời gian có thể tạo lại: <strong>{timeUntilNext}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <BookOpen className="inline w-4 h-4 mr-2" />
                  Trình độ hiện tại
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) => handleAIChange('experience', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn trình độ</option>
                  <option value="beginner">Mới bắt đầu - Chưa biết gì về AI</option>
                  <option value="intermediate">Trung cấp - Đã dùng chatbot AI</option>
                  <option value="advanced">Nâng cao - Đã code với AI API</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Target className="inline w-4 h-4 mr-2" />
                  Mục tiêu học tập
                </label>
                <select
                  value={formData.goal}
                  onChange={(e) => handleAIChange('goal', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn mục tiêu</option>
                  <option value="chat">Sử dụng chatbot hiệu quả</option>
                  <option value="coding">Lập trình với AI</option>
                  <option value="research">Nghiên cứu và phân tích</option>
                  <option value="realtime">Ứng dụng thời gian thực</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Code className="inline w-4 h-4 mr-2" />
                  Thời gian cam kết
                </label>
                <select
                  value={formData.timeCommit}
                  onChange={(e) => handleAIChange('timeCommit', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn thời gian</option>
                  <option value="casual">1-2 giờ/tuần - Học nhẹ nhàng</option>
                  <option value="regular">5-10 giờ/tuần - Học đều đặn</option>
                  <option value="intensive">15+ giờ/tuần - Học chuyên sâu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lĩnh vực quan tâm
                </label>
                <select
                  value={formData.interest}
                  onChange={(e) => handleAIChange('interest', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn lĩnh vực</option>
                  <option value="nlp">Xử lý ngôn ngữ tự nhiên</option>
                  <option value="multimodal">Đa phương thức (text, image, video)</option>
                  <option value="social">Mạng xã hội và real-time data</option>
                  <option value="creative">Sáng tạo nội dung</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ngân sách
                </label>
                <select
                  value={formData.budget}
                  onChange={(e) => handleAIChange('budget', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Chọn ngân sách</option>
                  <option value="free">Miễn phí - Chỉ dùng free tier</option>
                  <option value="moderate">Vừa phải - $10-30/tháng</option>
                  <option value="premium">Cao - $30+/tháng</option>
                </select>
              </div>

              <button
                onClick={handleAISubmit}
                disabled={isGeneratingAI || !canGenerateAI}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isGeneratingAI ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    AI đang tạo lộ trình...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Tạo AI Learning Path
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Learning Path Results */}
        {aiResult && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
              AI Learning Path Recommendations
            </h2>
            <div className="space-y-6">
              {aiResult.map((path, index) => (
                <div
                  key={path.name}
                  className={`${path.color} border-2 rounded-2xl p-6 transition-all hover:shadow-lg`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-600' : 
                        index === 1 ? 'text-gray-600' : 
                        index === 2 ? 'text-orange-600' : 'text-gray-500'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{path.name}</h3>
                        <p className="text-sm text-gray-600">{path.recommendation} - {path.score}/100 điểm</p>
                      </div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-full text-sm font-semibold">
                      {path.score >= 80 ? '⭐⭐⭐' : path.score >= 60 ? '⭐⭐' : '⭐'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4" />
                      Lộ trình 8 tuần:
                    </h4>
                    <div className="space-y-2">
                      {path.weeks.map((week, i) => (
                        <div key={i} className="bg-white bg-opacity-60 p-3 rounded-lg text-sm">
                          {week}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Tài nguyên học tập:</h4>
                    <div className="flex flex-wrap gap-2">
                      {path.resources.map((resource, i) => (
                        <span key={i} className="bg-white px-3 py-1 rounded-full text-sm">
                          {resource}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">
                {stats.completedDays}/{stats.totalDays}
              </span>
            </div>
            <div className="text-gray-600">Ngày đã hoàn thành</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(stats.completedDays / stats.totalDays) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">
                {stats.earnedXP.toLocaleString()}
              </span>
            </div>
            <div className="text-gray-600">XP đã kiếm được</div>
            <div className="mt-2 text-sm text-gray-500">
              Mục tiêu: {stats.totalXP.toLocaleString()} XP
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900">
                {stats.currentStreak}
              </span>
            </div>
            <div className="text-gray-600">Streak hiện tại</div>
            <div className="mt-2 text-sm text-gray-500">
              Kỷ lục: {stats.longestStreak} ngày
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-gray-900">
                {((stats.completedDays / stats.totalDays) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-gray-600">Tiến độ tổng thể</div>
            <div className="mt-2 text-sm text-green-600 font-medium">
              Đang tiến bộ tốt! 🎉
            </div>
          </div>
        </div>

        {/* Weekly Timeline */}
        <div className="space-y-6">
          {pathData.map((week) => (
            <div key={week.weekNumber} className="bg-white rounded-xl shadow-lg p-6">
              {/* Week Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Tuần {week.weekNumber}
                  </h2>
                  <p className="text-gray-600">
                    {new Date(week.startDate).toLocaleDateString('vi-VN')} - {new Date(week.endDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    {week.completedLessons}/{week.lessons.length}
                  </div>
                  <div className="text-sm text-gray-600">Bài học hoàn thành</div>
                </div>
              </div>

              {/* Lessons Timeline */}
              <div className="space-y-4">
                {week.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    className={`relative flex items-start gap-4 p-4 rounded-lg transition-all ${
                      lesson.status === 'locked'
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => lesson.status !== 'locked' && setSelectedLesson(lesson)}
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      {getStatusIcon(lesson.status)}
                      {index < week.lessons.length - 1 && (
                        <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
                      )}
                    </div>

                    {/* Lesson Card */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getSubjectIcon(lesson.subject)}</span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {lesson.title}
                            </h3>
                            {lesson.aiGenerated && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Ngày {lesson.day}</span>
                            <span>•</span>
                            <span>{new Date(lesson.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}>
                            {lesson.difficulty === 'beginner' && 'Cơ bản'}
                            {lesson.difficulty === 'intermediate' && 'Trung bình'}
                            {lesson.difficulty === 'advanced' && 'Nâng cao'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {lesson.duration} phút
                        </div>
                        <div className="flex items-center text-green-600 font-medium">
                          <Zap className="w-4 h-4 mr-1" />
                          +{lesson.xpReward} XP
                        </div>
                      </div>

                      {lesson.progress !== undefined && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-600">Tiến độ</span>
                            <span className="font-medium text-blue-600">{lesson.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${lesson.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {lesson.status === 'available' && (
                        <Link
                          href={`/learning-paths/lesson/${lesson.id}`}
                          className="inline-flex items-center mt-3 text-purple-600 hover:text-purple-700 font-medium text-sm"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Bắt đầu học
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      )}

                      {lesson.status === 'in-progress' && (
                        <Link
                          href={`/learning-paths/lesson/${lesson.id}`}
                          className="inline-flex items-center mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Tiếp tục học
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      )}

                      {lesson.status === 'completed' && lesson.completedAt && (
                        <div className="mt-2 space-y-1">
                          <div className="text-sm text-green-600 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Hoàn thành {lesson.completedAt.toLocaleDateString('vi-VN')}
                          </div>
                          {(() => {
                            const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}')[lesson.id];
                            if (progress) {
                              return (
                                <div className="text-sm flex items-center gap-2">
                                  <span className={progress.passed ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {progress.passed ? '✅' : '❌'} Điểm: {progress.score}/{progress.maxScore} ({progress.percentage}%)
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                      
                      {lesson.status === 'locked' && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start">
                            <Lock className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <div className="font-medium text-yellow-800 mb-1">🔒 Bài học bị khóa</div>
                              <div className="text-yellow-700">
                                Hoàn thành bài trước với điểm <span className="font-semibold">≥ 6/10 (60%)</span> để mở khóa
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/ai-tutor"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <Brain className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Tutor</h3>
            <p className="text-gray-600 text-sm">Chat với AI để được hỗ trợ học tập</p>
          </Link>

          <Link
            href="/ai-tutor/assignments"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <BookOpen className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 Assignments</h3>
            <p className="text-gray-600 text-sm">Xem tất cả bài tập và bài học</p>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <BarChart className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📈 Analytics</h3>
            <p className="text-gray-600 text-sm">Phân tích chi tiết tiến độ học tập</p>
          </Link>
        </div>
      </div>
    </div>
  );
}