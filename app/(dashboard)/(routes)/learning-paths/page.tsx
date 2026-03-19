'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Map, Target, Brain, Calendar, TrendingUp, Award, Clock,
  CheckCircle, Circle, Lock, Sparkles, ChevronRight, Play,
  BarChart, Zap, Star, BookOpen, MessageCircle, RefreshCw,
  ArrowRight, Trophy, Flame, Heart, AlertCircle, Code, X
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
  duration: number;
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

  const [pathData, setPathData] = useState<WeekData[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [stats, setStats] = useState({
    totalDays: 0, completedDays: 0, totalXP: 0, earnedXP: 0,
    currentStreak: 0, longestStreak: 0
  });
  const [selectedLesson, setSelectedLesson] = useState<LearningPathLesson | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [showAIForm, setShowAIForm] = useState(false);
  const [formData, setFormData] = useState<LearningPathFormData>({
    experience: '', goal: '', timeCommit: '', interest: '', budget: ''
  });
  const [aiResult, setAiResult] = useState<LearningPathResult[] | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [canGenerateAI, setCanGenerateAI] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  useEffect(() => {
    const savedPath = localStorage.getItem('learningPath');
    if (savedPath) {
      generateWeeklyPath(JSON.parse(savedPath));
    } else {
      generateDemoPath();
    }
    updateLessonLocks();
    checkAIGenerationLimit();
    const lastGen = localStorage.getItem('learning-path-ai-last-generated');
    if (lastGen) setLastGenerated(new Date(lastGen));
  }, []);

  useEffect(() => {
    if (lastGenerated && !canGenerateAI) {
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [lastGenerated, canGenerateAI]);

  const updateLessonLocks = () => {
    const pathProgress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
    setPathData(prevWeeks => prevWeeks.map(week => ({
      ...week,
      lessons: week.lessons.map((lesson) => {
        const progress = pathProgress[lesson.id];
        if (progress?.completed) {
          return { ...lesson, status: 'completed' as const, completedAt: new Date(progress.completedAt), progress: 100 };
        }
        if (lesson.status === 'locked' && lesson.prerequisites) {
          const allPrereqsPassed = lesson.prerequisites.every(prereqId => pathProgress[prereqId]?.passed === true);
          if (allPrereqsPassed) return { ...lesson, status: 'available' as const };
        }
        return lesson;
      })
    })));
  };

  const checkAIGenerationLimit = () => {
    if (session?.user?.role === 'STUDENT') {
      const lastGen = localStorage.getItem('learning-path-ai-last-generated');
      if (lastGen) {
        const diffInDays = (Date.now() - new Date(lastGen).getTime()) / (1000 * 60 * 60 * 24);
        if (diffInDays < 7) { setCanGenerateAI(false); setLastGenerated(new Date(lastGen)); }
        else setCanGenerateAI(true);
      }
    } else {
      setCanGenerateAI(true);
    }
  };

  const updateCountdown = useCallback(() => {
    if (!lastGenerated) return;
    const diffInMs = lastGenerated.getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now();
    if (diffInMs <= 0) { setCanGenerateAI(true); setTimeUntilNext(''); return; }
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    setTimeUntilNext(`${days} ngày ${hours} giờ ${minutes} phút`);
  }, [lastGenerated]);

  const generateDemoPath = () => {
    const today = new Date();
    const weeks: WeekData[] = [];
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(today); weekStart.setDate(today.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
      const lessons: LearningPathLesson[] = [];
      for (let day = 1; day <= 5; day++) {
        const lessonDate = new Date(weekStart); lessonDate.setDate(weekStart.getDate() + day - 1);
        const dayNumber = (week - 1) * 5 + day;
        const isCompleted = week === 1 && day <= 3;
        const isInProgress = week === 1 && day === 4;
        const isAvailable = week === 1 && day === 5;
        lessons.push({
          id: `lesson-w${week}-d${day}`, title: getDemoLessonTitle(dayNumber),
          subject: getDemoSubject(dayNumber), type: 'lesson',
          difficulty: getDemoDifficulty(dayNumber),
          duration: 45 + Math.floor(Math.random() * 30),
          xpReward: 100 + Math.floor(Math.random() * 100),
          status: isCompleted ? 'completed' : isInProgress ? 'in-progress' : isAvailable ? 'available' : 'locked',
          day: dayNumber, date: lessonDate.toISOString().split('T')[0],
          completedAt: isCompleted ? new Date(lessonDate) : undefined,
          progress: isInProgress ? 65 : undefined, aiGenerated: true,
          objectives: ['Hiểu khái niệm cơ bản', 'Áp dụng công thức', 'Giải bài tập thực tế'],
          prerequisites: day > 1 ? [`lesson-w${week}-d${day - 1}`] : week > 1 ? [`lesson-w${week - 1}-d5`] : undefined
        });
      }
      weeks.push({
        weekNumber: week, startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0], lessons,
        totalXP: lessons.reduce((s, l) => s + l.xpReward, 0),
        completedLessons: lessons.filter(l => l.status === 'completed').length
      });
    }
    setPathData(weeks);
    calculateStats(weeks);
  };

  const getDemoLessonTitle = (day: number): string => {
    const titles = ['Phương trình bậc hai cơ bản', 'Hệ phương trình tuyến tính', 'Hàm số và đồ thị', 'Đạo hàm cơ bản', 'Ứng dụng đạo hàm', 'Tích phân cơ bản', 'Ứng dụng tích phân', 'Phương trình vi phân', 'Chuỗi số', 'Giới hạn và liên tục', 'Hình học không gian', 'Vectơ và ma trận', 'Xác suất cơ bản', 'Thống kê mô tả', 'Phân phối xác suất', 'Kiểm định giả thuyết', 'Hồi quy tuyến tính', 'Phân tích phương sai', 'Chuỗi thời gian', 'Tối ưu hóa'];
    return titles[day - 1] || `Bài học ngày ${day}`;
  };

  const getDemoSubject = (day: number): string => {
    return ['mathematics', 'physics', 'chemistry', 'biology', 'programming'][day % 5];
  };

  const getDemoDifficulty = (day: number): 'beginner' | 'intermediate' | 'advanced' => {
    if (day <= 5) return 'beginner';
    if (day <= 15) return 'intermediate';
    return 'advanced';
  };

  const generateWeeklyPath = (savedData: any) => { generateDemoPath(); };

  const calculateStats = (weeks: WeekData[]) => {
    let totalDays = 0, completedDays = 0, totalXP = 0, earnedXP = 0;
    weeks.forEach(w => w.lessons.forEach(l => {
      totalDays++; totalXP += l.xpReward;
      if (l.status === 'completed') { completedDays++; earnedXP += l.xpReward; }
    }));
    setStats({ totalDays, completedDays, totalXP, earnedXP, currentStreak: 3, longestStreak: 5 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'in-progress': return <Circle className="w-5 h-5 text-blue-400 animate-pulse" />;
      case 'available': return <Play className="w-5 h-5 text-violet-400" />;
      case 'locked': return <Lock className="w-5 h-5 text-white/20" />;
      default: return <Circle className="w-5 h-5 text-white/10" />;
    }
  };

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400';
      case 'intermediate': return 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400';
      case 'advanced': return 'border-rose-500/20 bg-rose-500/[0.06] text-rose-400';
      default: return 'border-white/10 bg-white/[0.04] text-white/50';
    }
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'mathematics': return '🧮'; case 'physics': return '⚛️';
      case 'chemistry': return '🧪'; case 'biology': return '🧬';
      case 'programming': return '💻'; default: return '📚';
    }
  };

  const regenerateLessons = useCallback(async () => {
    const confirmed = window.confirm('AI sẽ tạo lộ trình mới dựa trên tiến độ, điểm số và mục tiêu của bạn.\n\nBạn có muốn tiếp tục?');
    if (!confirmed) return;
    setIsGenerating(true);
    try {
      const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}');
      const completedLessons = Object.keys(progress).filter(key => progress[key].completed);
      const keys = Object.keys(progress);
      const avgScore = keys.length
        ? Object.values(progress).reduce((sum: number, p: any) => sum + (p.percentage || 0), 0) / keys.length
        : 0;
      const response = await fetch('/api/ai-intelligent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'lesson',
          subject: 'Toán học',
          grade: '12',
          topic: 'Lộ trình học tập cá nhân hóa',
          difficulty: avgScore >= 80 ? 'advanced' : avgScore >= 60 ? 'intermediate' : 'beginner',
          freeformPrompt: `Tạo lộ trình học tập 4 tuần (20 bài) cho học sinh lớp 12. Đã hoàn thành: ${completedLessons.length} bài, Điểm TB: ${avgScore.toFixed(1)}%`,
          priority: ['quality', 'speed'],
          useHybrid: true,
          enableCache: false,
        }),
      });
      if (!response.ok) throw new Error('AI generation failed');
      generateDemoPath();
    } catch (error: unknown) {
      console.error('AI generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const calculateAIMatch = (data: LearningPathFormData) => {
    const scores = { openai: 0, gemini: 0, grok: 0, claude: 0 };
    if (data.experience === 'beginner') { scores.gemini += 30; scores.claude += 25; scores.openai += 20; scores.grok += 15; }
    else if (data.experience === 'intermediate') { scores.openai += 30; scores.claude += 25; scores.gemini += 20; scores.grok += 15; }
    else if (data.experience === 'advanced') { scores.openai += 35; scores.claude += 25; scores.grok += 20; scores.gemini += 15; }
    if (data.goal === 'chat') { scores.claude += 25; scores.openai += 20; scores.gemini += 20; scores.grok += 15; }
    else if (data.goal === 'coding') { scores.openai += 30; scores.claude += 25; scores.gemini += 15; scores.grok += 10; }
    else if (data.goal === 'research') { scores.gemini += 30; scores.claude += 25; scores.openai += 20; scores.grok += 10; }
    else if (data.goal === 'realtime') { scores.grok += 35; scores.gemini += 20; scores.openai += 15; scores.claude += 10; }
    // Học sinh THPT
    else if (data.goal === 'exam_thpt') { scores.gemini += 28; scores.claude += 25; scores.openai += 22; scores.grok += 15; }
    else if (data.goal === 'improve_grades') { scores.claude += 26; scores.gemini += 24; scores.openai += 22; scores.grok += 12; }
    else if (data.goal === 'curriculum') { scores.gemini += 26; scores.claude += 24; scores.openai += 22; scores.grok += 12; }
    else if (data.goal === 'career_orientation') { scores.claude += 28; scores.openai += 24; scores.gemini += 22; scores.grok += 14; }
    else if (data.goal === 'foreign_lang_thpt') { scores.openai += 26; scores.claude += 24; scores.gemini += 22; scores.grok += 12; }
    else if (data.goal === 'admission') { scores.claude += 26; scores.gemini += 24; scores.openai += 22; scores.grok += 12; }
    else if (data.goal === 'soft_skills_thpt') { scores.claude += 26; scores.openai += 24; scores.gemini += 22; scores.grok += 14; }
    // Sinh viên
    else if (data.goal === 'major') { scores.gemini += 27; scores.claude += 25; scores.openai += 23; scores.grok += 12; }
    else if (data.goal === 'internship') { scores.openai += 26; scores.claude += 25; scores.gemini += 22; scores.grok += 14; }
    else if (data.goal === 'certificates') { scores.gemini += 26; scores.claude += 24; scores.openai += 23; scores.grok += 13; }
    else if (data.goal === 'soft_skills_uni') { scores.claude += 27; scores.openai += 24; scores.gemini += 22; scores.grok += 14; }
    else if (data.goal === 'grad_school') { scores.gemini += 28; scores.claude += 26; scores.openai += 22; scores.grok += 10; }
    else if (data.goal === 'foreign_lang_uni') { scores.openai += 26; scores.claude += 24; scores.gemini += 22; scores.grok += 12; }
    if (data.timeCommit === 'casual') { scores.claude += 20; scores.gemini += 15; scores.openai += 10; scores.grok += 10; }
    else if (data.timeCommit === 'regular') { scores.openai += 20; scores.claude += 15; scores.gemini += 15; scores.grok += 10; }
    else if (data.timeCommit === 'intensive') { scores.openai += 25; scores.gemini += 20; scores.claude += 15; scores.grok += 10; }
    if (data.interest === 'nlp') { scores.openai += 25; scores.claude += 20; scores.gemini += 15; scores.grok += 10; }
    else if (data.interest === 'multimodal') { scores.gemini += 30; scores.openai += 20; scores.claude += 15; scores.grok += 10; }
    else if (data.interest === 'social') { scores.grok += 30; scores.gemini += 15; scores.claude += 15; scores.openai += 10; }
    else if (data.interest === 'creative') { scores.claude += 25; scores.openai += 20; scores.gemini += 15; scores.grok += 10; }
    if (data.budget === 'free') { scores.gemini += 25; scores.grok += 20; scores.claude += 15; scores.openai += 10; }
    else if (data.budget === 'moderate') { scores.claude += 20; scores.openai += 20; scores.gemini += 15; scores.grok += 15; }
    else if (data.budget === 'premium') { scores.openai += 25; scores.claude += 20; scores.gemini += 15; scores.grok += 10; }
    return scores;
  };

  const generateAILearningPath = (scores: any) => {
    const sorted = Object.entries(scores).sort(([, a], [, b]) => (b as number) - (a as number)).map(([platform, score]) => ({ platform, score }));
    const paths: Record<string, any> = {
      openai: { name: 'OpenAI (GPT-4, ChatGPT)', weeks: ['Tuần 1-2: Cơ bản về API, prompt engineering', 'Tuần 3-4: Function calling và embeddings', 'Tuần 5-6: Fine-tuning và optimization', 'Tuần 7-8: Xây dựng ứng dụng thực tế'], resources: ['OpenAI Cookbook', 'Official Documentation', 'Community Forums'], gradient: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-500/15', accent: 'text-emerald-400' },
      gemini: { name: 'Google Gemini', weeks: ['Tuần 1-2: Khởi đầu với Gemini API', 'Tuần 3-4: Xử lý đa phương thức (text, image, video)', 'Tuần 5-6: Tích hợp với Google Workspace', 'Tuần 7-8: Dự án tổng hợp'], resources: ['Google AI Studio', 'Gemini Documentation', 'Vertex AI Tutorials'], gradient: 'from-blue-500/10 to-indigo-500/10', border: 'border-blue-500/15', accent: 'text-blue-400' },
      grok: { name: 'xAI Grok', weeks: ['Tuần 1-2: Làm quen với Grok và X Platform', 'Tuần 3-4: Real-time data processing', 'Tuần 5-6: Social media analysis', 'Tuần 7-8: Ứng dụng thời gian thực'], resources: ['xAI Documentation', 'X Developer Portal', 'Community Guides'], gradient: 'from-violet-500/10 to-purple-500/10', border: 'border-violet-500/15', accent: 'text-violet-400' },
      claude: { name: 'Anthropic Claude', weeks: ['Tuần 1-2: Constitutional AI và cơ bản API', 'Tuần 3-4: Long context và document analysis', 'Tuần 5-6: Tool use và agentic workflows', 'Tuần 7-8: Ứng dụng nâng cao'], resources: ['Claude Documentation', 'Anthropic Cookbook', 'Prompt Library'], gradient: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/15', accent: 'text-amber-400' }
    };
    return sorted.map(({ platform, score }) => ({
      ...paths[platform], platform, score,
      recommendation: (score as number) >= 80 ? 'Rất phù hợp' : (score as number) >= 60 ? 'Phù hợp' : 'Có thể xem xét'
    }));
  };

  const handleAISubmit = useCallback(async () => {
    if (!formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget) return;
    if (!canGenerateAI) return;
    setIsGeneratingAI(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const scores = calculateAIMatch(formData);
      const path = generateAILearningPath(scores);
      setAiResult(path);
      const now = new Date();
      localStorage.setItem('learning-path-ai-last-generated', now.toISOString());
      setLastGenerated(now);
      setCanGenerateAI(false);
    } catch (error) {
      console.error('Error generating AI learning path:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  }, [formData, canGenerateAI]);

  const handleAIChange = useCallback((field: keyof LearningPathFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleToggleAIForm = useCallback(() => {
    setShowAIForm((prev) => !prev);
  }, []);

  const handleCloseAIForm = useCallback(() => {
    setShowAIForm(false);
  }, []);

  const handleLessonSelect = useCallback((lesson: LearningPathLesson) => {
    if (lesson.status !== 'locked') setSelectedLesson(lesson);
  }, []);

  const handleLessonKeyDown = useCallback((e: React.KeyboardEvent, lesson: LearningPathLesson) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (lesson.status !== 'locked') setSelectedLesson(lesson);
    }
  }, []);

  const handleLinkClickStopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  /* ── Shared select style ── */
  const selectClass = "w-full p-3 rounded-lg bg-black/25 border border-white/[0.08] text-white/80 text-sm focus:outline-none focus:border-[hsl(245,85%,65%)]/50 focus:shadow-[0_0_15px_rgba(120,100,255,0.1)] transition-all [&>option]:bg-[hsl(225,15%,10%)] [&>option]:text-white/80";

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-8">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(245,85%,65%)] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[hsl(280,75%,60%)] opacity-[0.03] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-2">
                Lộ trình học tập của bạn
              </h1>
              <p className="text-sm text-white/40">Theo dõi tiến độ và hoàn thành mục tiêu từng ngày</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleAIForm}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all"
                aria-expanded={showAIForm}
                aria-controls="ai-learning-path-form"
              >
                <Sparkles className="w-4 h-4" />
                AI Learning Path
              </button>
              <button
                type="button"
                onClick={regenerateLessons}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 text-sm font-medium hover:bg-white/[0.06] hover:text-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'AI đang tạo...' : 'Tạo lộ trình mới'}
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Learning Path Form ── */}
        {showAIForm && (
          <div id="ai-learning-path-form" className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 animate-scale-in" role="region" aria-labelledby="ai-form-heading">
            <div className="flex items-center justify-between mb-6">
              <h2 id="ai-form-heading" className="text-lg font-bold text-white/90 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[hsl(245,85%,65%)]" />
                AI Learning Path Algorithm
              </h2>
              <button type="button" onClick={handleCloseAIForm} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-white/40 hover:text-white/70" aria-label="Đóng form AI Learning Path">
                <X className="w-4 h-4" />
              </button>
            </div>

            {session?.user?.role === 'STUDENT' && !canGenerateAI && (
              <div className="mb-5 p-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.04]">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/50">
                    <span className="font-medium text-amber-400">Giới hạn 1 lần/tuần.</span> Thời gian tạo lại: <span className="text-amber-400">{timeUntilNext}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Trình độ hiện tại
                </label>
                <select value={formData.experience} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAIChange('experience', e.target.value)} className={selectClass} aria-label="Trình độ hiện tại">
                  <option value="">Chọn trình độ</option>
                  <option value="beginner">Mới bắt đầu</option>
                  <option value="intermediate">Trung cấp - Đã dùng chatbot AI</option>
                  <option value="advanced">Nâng cao - Đã code với AI API</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" /> Mục tiêu học tập
                </label>
                <select value={formData.goal} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAIChange('goal', e.target.value)} className={selectClass} aria-label="Mục tiêu học tập">
                  <option value="">Chọn mục tiêu</option>
                  <optgroup label="——— Công nghệ & AI ———">
                    <option value="chat">Sử dụng chatbot hiệu quả</option>
                    <option value="coding">Lập trình với AI</option>
                    <option value="research">Nghiên cứu và phân tích</option>
                    <option value="realtime">Ứng dụng thời gian thực</option>
                  </optgroup>
                  <optgroup label="——— Học sinh THPT ———">
                    <option value="exam_thpt">Ôn thi THPT Quốc gia / Đại học</option>
                    <option value="improve_grades">Nâng cao điểm số các môn</option>
                    <option value="curriculum">Học theo chương trình phổ thông (Toán, Lý, Hóa, Văn, Anh…)</option>
                    <option value="career_orientation">Định hướng nghề nghiệp</option>
                    <option value="foreign_lang_thpt">Ngoại ngữ (Tiếng Anh, chứng chỉ)</option>
                    <option value="admission">Chuẩn bị hồ sơ đại học / tuyển sinh</option>
                    <option value="soft_skills_thpt">Kỹ năng mềm (thuyết trình, tư duy phản biện)</option>
                  </optgroup>
                  <optgroup label="——— Sinh viên ———">
                    <option value="major">Chuyên ngành / môn chuyên ngành</option>
                    <option value="internship">Thực tập & kỹ năng nghề nghiệp</option>
                    <option value="certificates">Chứng chỉ (tin học, ngoại ngữ, chuyên môn)</option>
                    <option value="soft_skills_uni">Kỹ năng mềm (làm việc nhóm, quản lý thời gian)</option>
                    <option value="grad_school">Ôn thi sau đại học / cao học</option>
                    <option value="foreign_lang_uni">Học thêm ngoại ngữ</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" /> Thời gian cam kết
                </label>
                <select value={formData.timeCommit} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAIChange('timeCommit', e.target.value)} className={selectClass} aria-label="Thời gian cam kết">
                  <option value="">Chọn thời gian</option>
                  <option value="casual">1-2 giờ/tuần</option>
                  <option value="regular">5-10 giờ/tuần</option>
                  <option value="intensive">15+ giờ/tuần</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Lĩnh vực quan tâm</label>
                <select value={formData.interest} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAIChange('interest', e.target.value)} className={selectClass} aria-label="Lĩnh vực quan tâm">
                  <option value="">Chọn lĩnh vực</option>
                  <option value="nlp">Xử lý ngôn ngữ tự nhiên</option>
                  <option value="multimodal">Đa phương thức</option>
                  <option value="social">Mạng xã hội & real-time</option>
                  <option value="creative">Sáng tạo nội dung</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-white/50 mb-1.5">Ngân sách</label>
                <select value={formData.budget} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleAIChange('budget', e.target.value)} className={selectClass} aria-label="Ngân sách">
                  <option value="">Chọn ngân sách</option>
                  <option value="free">Miễn phí - Free tier</option>
                  <option value="moderate">Vừa phải - $10-30/tháng</option>
                  <option value="premium">Cao - $30+/tháng</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAISubmit}
              disabled={isGeneratingAI || !canGenerateAI || !formData.experience || !formData.goal || !formData.timeCommit || !formData.interest || !formData.budget}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[hsl(245,85%,60%)] to-[hsl(280,75%,55%)] text-white text-sm font-medium shadow-[0_0_20px_rgba(120,100,255,0.2)] hover:shadow-[0_0_30px_rgba(120,100,255,0.3)] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              aria-busy={isGeneratingAI}
            >
              {isGeneratingAI ? <><RefreshCw className="w-4 h-4 animate-spin" /> AI đang tạo lộ trình...</> : <><Sparkles className="w-4 h-4" /> Tạo AI Learning Path</>}
            </button>
          </div>
        )}

        {/* ── AI Learning Path Results ── */}
        {aiResult && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 animate-scale-in">
            <h2 className="text-lg font-bold text-white/90 text-center mb-6">AI Learning Path Recommendations</h2>
            <div className="space-y-4">
              {aiResult.map((path: any, index: number) => (
                <div key={path.name} className={`rounded-xl border ${path.border} bg-gradient-to-br ${path.gradient} p-5 transition-all hover:border-white/[0.1]`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-white/40' : index === 2 ? 'text-orange-400' : 'text-white/30'}`}>
                        #{index + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white/90">{path.name}</h3>
                        <p className="text-xs text-white/40">{path.recommendation} - {path.score}/100</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/50">
                      {path.score >= 80 ? '★★★' : path.score >= 60 ? '★★' : '★'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-white/50 mb-2 flex items-center gap-1.5">
                      <ChevronRight className="w-3 h-3" /> Lộ trình 8 tuần
                    </h4>
                    <div className="space-y-1.5">
                      {path.weeks.map((week: string, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04] text-xs text-white/60">{week}</div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {path.resources.map((resource: string, i: number) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[0.65rem] text-white/50">{resource}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats Overview ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Calendar, label: 'Ngày hoàn thành', value: `${stats.completedDays}/${stats.totalDays}`, color: 'text-blue-400', glow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.08)]', barPct: stats.totalDays ? (stats.completedDays / stats.totalDays) * 100 : 0, barColor: 'from-blue-500 to-indigo-500', sub: '' },
            { icon: Trophy, label: 'XP đã kiếm', value: stats.earnedXP.toLocaleString(), color: 'text-amber-400', glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]', barPct: 0, barColor: '', sub: `Mục tiêu: ${stats.totalXP.toLocaleString()} XP` },
            { icon: Flame, label: 'Streak hiện tại', value: String(stats.currentStreak), color: 'text-orange-400', glow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.08)]', barPct: 0, barColor: '', sub: `Kỷ lục: ${stats.longestStreak} ngày` },
            { icon: TrendingUp, label: 'Tiến độ tổng', value: `${stats.totalDays ? ((stats.completedDays / stats.totalDays) * 100).toFixed(0) : 0}%`, color: 'text-emerald-400', glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]', barPct: 0, barColor: '', sub: 'Đang tiến bộ tốt!' },
          ].map((card) => (
            <div key={card.label} className={`group rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] ${card.glow}`}>
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className={`text-xl font-bold ${card.color}`}>{card.value}</span>
              </div>
              <p className="text-xs text-white/50 mb-1">{card.label}</p>
              {card.barPct > 0 && (
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mt-2">
                  <div className={`h-full rounded-full bg-gradient-to-r ${card.barColor}`} style={{ width: `${card.barPct}%` }} />
                </div>
              )}
              {card.sub && <p className="text-[0.65rem] text-white/30 mt-1">{card.sub}</p>}
            </div>
          ))}
        </div>

        {/* ── Weekly Timeline ── */}
        <div className="space-y-4">
          {pathData.map((week) => (
            <div key={week.weekNumber} className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
              {/* Week Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                <div>
                  <h2 className="text-base font-bold text-white/90 mb-0.5">Tuần {week.weekNumber}</h2>
                  <p className="text-xs text-white/30">
                    {new Date(week.startDate).toLocaleDateString('vi-VN')} - {new Date(week.endDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-violet-400">{week.completedLessons}/{week.lessons.length}</span>
                  <p className="text-[0.65rem] text-white/30">Hoàn thành</p>
                </div>
              </div>

              {/* Lessons */}
              <div className="p-4 space-y-2">
                {week.lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    role="button"
                    tabIndex={lesson.status === 'locked' ? -1 : 0}
                    className={`relative flex items-start gap-4 p-4 rounded-lg transition-all ${
                      lesson.status === 'locked'
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-white/[0.03] cursor-pointer group'
                    }`}
                    onClick={() => handleLessonSelect(lesson)}
                    onKeyDown={(e) => handleLessonKeyDown(e, lesson)}
                  >
                    {/* Timeline line + icon */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      {getStatusIcon(lesson.status)}
                      {index < week.lessons.length - 1 && (
                        <div className="w-px h-10 bg-white/[0.06] mt-1.5" />
                      )}
                    </div>

                    {/* Lesson content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{getSubjectIcon(lesson.subject)}</span>
                          <h3 className="text-sm font-semibold text-white/85 truncate">{lesson.title}</h3>
                          {lesson.aiGenerated && (
                            <span className="nav-badge flex-shrink-0 text-[0.55rem] px-1.5 py-0.5">AI</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[0.6rem] font-medium border flex-shrink-0 ${getDifficultyStyle(lesson.difficulty)}`}>
                          {lesson.difficulty === 'beginner' ? 'Cơ bản' : lesson.difficulty === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[0.7rem] text-white/30 mb-1.5">
                        <span>Ngày {lesson.day}</span>
                        <span className="w-px h-3 bg-white/10" />
                        <span>{new Date(lesson.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-white/40">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{lesson.duration} phút</span>
                        <span className="flex items-center gap-1 text-emerald-400/70"><Zap className="w-3 h-3" />+{lesson.xpReward} XP</span>
                      </div>

                      {/* Progress bar for in-progress */}
                      {lesson.progress !== undefined && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[0.65rem] mb-1">
                            <span className="text-white/30">Tiến độ</span>
                            <span className="text-blue-400">{lesson.progress}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]" style={{ width: `${lesson.progress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Action links */}
                      {(lesson.status === 'available' || lesson.status === 'in-progress') && (
                        <Link
                          href={`/learning-paths/lesson/${lesson.id}`}
                          className="inline-flex items-center mt-2.5 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors gap-1"
                          onClick={handleLinkClickStopPropagation}
                        >
                          <Play className="w-3 h-3" />
                          {lesson.status === 'available' ? 'Bắt đầu học' : 'Tiếp tục học'}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}

                      {/* Completed info */}
                      {lesson.status === 'completed' && lesson.completedAt && (
                        <div className="mt-2 space-y-0.5">
                          <div className="text-[0.7rem] text-emerald-400/70 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Hoàn thành {lesson.completedAt.toLocaleDateString('vi-VN')}
                          </div>
                          {(() => {
                            try {
                              const progress = JSON.parse(localStorage.getItem('learning-path-progress') || '{}')[lesson.id];
                              if (progress) {
                                return (
                                  <span className={`text-[0.7rem] ${progress.passed ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                                    Điểm: {progress.score}/{progress.maxScore} ({progress.percentage}%)
                                  </span>
                                );
                              }
                            } catch { /* ignore */ }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Locked message */}
                      {lesson.status === 'locked' && (
                        <div className="mt-2.5 p-2.5 rounded-lg border border-amber-500/10 bg-amber-500/[0.03]">
                          <div className="flex items-start gap-2">
                            <Lock className="w-3 h-3 text-amber-400/60 flex-shrink-0 mt-0.5" />
                            <p className="text-[0.65rem] text-white/35">
                              Hoàn thành bài trước với điểm <span className="text-amber-400/70 font-medium">&ge; 60%</span> để mở khóa
                            </p>
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

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/student/ai-tutor', icon: Brain, label: 'AI Tutor', desc: 'Chat với AI để được hỗ trợ học tập', gradient: 'from-violet-600 to-purple-600', glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.12)]' },
            { href: '/dashboard/assignments', icon: BookOpen, label: 'Assignments', desc: 'Xem tất cả bài tập và bài học', gradient: 'from-blue-600 to-indigo-600', glow: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.12)]' },
            { href: '/dashboard/analytics', icon: BarChart, label: 'Analytics', desc: 'Phân tích chi tiết tiến độ học tập', gradient: 'from-emerald-600 to-teal-600', glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.12)]' },
          ].map((action) => (
            <Link key={action.href} href={action.href} className={`group block rounded-xl bg-gradient-to-br ${action.gradient} p-5 transition-all duration-300 ${action.glow} hover:translate-y-[-2px]`}>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                <action.icon className="w-8 h-8 text-white/70 mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">{action.label}</h3>
                <p className="text-xs text-white/50">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
