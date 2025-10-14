'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
// import { useXP } from '@/contexts/XPContext';
// import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Trophy, 
  Star, 
  Flame, 
  Gem, 
  Heart, 
  Lock, 
  CheckCircle, 
  Play,
  Target,
  Award,
  Users,
  Crown,
  Zap,
  Gift
} from "lucide-react";

// Mock data for Aeroschool-style learning
const mockLearningData = {
  user: {
    name: "Học sinh",
    xp: 1250,
    streak: 12,
    gems: 500,
    hearts: 5,
    level: 8
  },
  currentSection: {
    id: 1,
    title: "Toán học cơ bản",
    unit: 1,
    lessonTitle: "Phương trình bậc nhất"
  },
  learningPath: [
    { id: 1, type: "lesson", title: "START", status: "current", xp: 5, completed: false },
    { id: 2, type: "lesson", title: "Phương trình bậc nhất", status: "locked", xp: 20, completed: false },
    { id: 3, type: "lesson", title: "Phương trình bậc hai", status: "locked", xp: 25, completed: false },
    { id: 4, type: "practice", title: "Luyện tập", status: "locked", xp: 15, completed: false },
    { id: 5, type: "quiz", title: "Kiểm tra", status: "locked", xp: 30, completed: false },
    { id: 6, type: "treasure", title: "Kho báu", status: "locked", xp: 0, completed: false },
    { id: 7, type: "lesson", title: "Hệ phương trình", status: "locked", xp: 35, completed: false },
    { id: 8, type: "boss", title: "Thử thách", status: "locked", xp: 50, completed: false }
  ],
  dailyQuests: [
    { id: 1, title: "Kiếm 50 XP", progress: 25, target: 50, reward: "💎 10 gems", completed: false },
    { id: 2, title: "Hoàn thành 3 bài học", progress: 1, target: 3, reward: "❤️ 1 heart", completed: false },
    { id: 3, title: "Duy trì streak 7 ngày", progress: 12, target: 7, reward: "🔥 2x XP", completed: true }
  ],
  leaderboard: [
    { rank: 1, name: "Nguyễn Văn A", xp: 2450, badge: "🥇", streak: 25 },
    { rank: 2, name: "Trần Thị B", xp: 2380, badge: "🥈", streak: 20 },
    { rank: 3, name: "Bạn", xp: 1250, badge: "🥉", streak: 12 },
    { rank: 4, name: "Lê Văn C", xp: 1920, badge: "🏅", streak: 15 },
    { rank: 5, name: "Phạm Thị D", xp: 1850, badge: "🏅", streak: 18 }
  ],
  sections: [
    { id: 1, title: "Toán học cơ bản", progress: 25, totalLessons: 20, completedLessons: 5, color: "bg-blue-500" },
    { id: 2, title: "Hóa học", progress: 60, totalLessons: 15, completedLessons: 9, color: "bg-green-500" },
    { id: 3, title: "Vật lý", progress: 10, totalLessons: 18, completedLessons: 2, color: "bg-purple-500" },
    { id: 4, title: "Sinh học", progress: 0, totalLessons: 12, completedLessons: 0, color: "bg-pink-500" },
    { id: 5, title: "Python Programming", progress: 0, totalLessons: 32, completedLessons: 0, color: "bg-orange-500" }
  ]
};

const AeroschoolLearning: React.FC = () => {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  // Safe fallback for XP context
  const xpData = {
    totalXP: 1250,
    streak: 12,
    gems: 500,
    hearts: 5,
    completedLessons: [],
    achievements: []
  };
  
  const completeLesson = (id: string, xp: number) => {
    console.log(`Lesson completed: ${id}, XP: ${xp}`);
  };
  
  const updateStreak = () => {
    console.log('Streak updated');
  };
  
  const addXP = (xp: number) => {
    console.log(`XP added: ${xp}`);
  };
  
  const t = (key: string) => key; // Simple fallback for translation
  
  console.log('🔄 AeroschoolLearning component render, XP data:', xpData);
  const [selectedSection, setSelectedSection] = useState(1);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lastCompletedLesson, setLastCompletedLesson] = useState<number | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);

  // Get user-specific localStorage key
  const getStorageKey = () => {
    if (session?.user?.email) {
      return `completedLessons_${session.user.email}`;
    }
    return 'completedLessons'; // fallback for non-authenticated users
  };

  // Load completed lessons from localStorage on component mount
  useEffect(() => {
    if (!session?.user?.email) return; // Wait for session to load
    
    try {
      const storageKey = getStorageKey();
      const savedCompletedLessons = localStorage.getItem(storageKey);
      console.log(`Loading from localStorage (${storageKey}):`, savedCompletedLessons);
      if (savedCompletedLessons) {
        const parsed = JSON.parse(savedCompletedLessons);
        console.log('Parsed completed lessons:', parsed);
        if (Array.isArray(parsed)) {
          setCompletedLessons(parsed);
        } else {
          console.error('Invalid data in localStorage, resetting');
          localStorage.removeItem(storageKey);
          setCompletedLessons([]);
        }
      } else {
        console.log('No saved lessons found, starting fresh');
        setCompletedLessons([]);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      const storageKey = getStorageKey();
      localStorage.removeItem(storageKey);
      setCompletedLessons([]);
    }
  }, [session?.user?.email]);

  // Handle URL parameters for lesson completion
  useEffect(() => {
    const completedLessonId = searchParams.get('completed');
    console.log('URL params changed:', completedLessonId);
    if (completedLessonId) {
      const lessonId = parseInt(completedLessonId);
      console.log('Processing lesson completion:', lessonId, 'Current completed:', completedLessons);
      
      if (!completedLessons.includes(lessonId)) {
        const newCompletedLessons = [...completedLessons, lessonId];
        console.log('Adding lesson to completed:', newCompletedLessons);
        setCompletedLessons(newCompletedLessons);
        setLastCompletedLesson(lessonId);
        setShowCompletionModal(true);
        
        // Save to localStorage
        try {
          const storageKey = getStorageKey();
          localStorage.setItem(storageKey, JSON.stringify(newCompletedLessons));
          console.log(`Lesson completed via URL (${storageKey}):`, lessonId, newCompletedLessons);
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
        
        // Clear URL parameter
        window.history.replaceState({}, '', '/dashboard/learning');
      } else {
        console.log('Lesson already completed, clearing URL');
        // Clear URL parameter even if already completed
        window.history.replaceState({}, '', '/dashboard/learning');
      }
    }
  }, [searchParams]);

  // Sync with XP context completed lessons
  useEffect(() => {
    console.log('=== SYNC EFFECT TRIGGERED ===');
    console.log('XP Context completed lessons:', xpData.completedLessons);
    console.log('XP Context total XP:', xpData.totalXP);
    console.log('Current aeroschool completed lessons:', completedLessons);
    console.log('Session user:', session?.user?.email);
    
    // Always try to sync, even if XP context is empty (it might have data later)
    // Filter only aeroschool lessons (with aero_ prefix) and convert to numbers
    const xpCompletedLessons = xpData.completedLessons
      .filter(id => id.startsWith('aero_')) // Only aeroschool lessons
      .map(id => parseInt(id.replace('aero_', ''))) // Remove prefix and convert to number
      .filter(id => !isNaN(id) && id >= 1 && id <= 8); // Only valid lesson IDs
    
    console.log('Filtered aeroschool lessons from XP:', xpCompletedLessons);
    
    // Check if we need to add any new lessons
    const newLessons = xpCompletedLessons.filter(id => !completedLessons.includes(id));
    
    if (newLessons.length > 0) {
      const mergedCompleted = [...new Set([...completedLessons, ...xpCompletedLessons])];
      console.log('🔄 Syncing aeroschool lessons from XP context:', xpCompletedLessons, 'New lessons:', newLessons, 'Merged:', mergedCompleted);
      setCompletedLessons(mergedCompleted);
      
      // Save to localStorage
      try {
        const storageKey = getStorageKey();
        localStorage.setItem(storageKey, JSON.stringify(mergedCompleted));
        console.log('✅ Saved merged lessons to localStorage:', storageKey);
      } catch (error) {
        console.error('❌ Error saving synced lessons to localStorage:', error);
      }
    } else {
      console.log('ℹ️ No new lessons to sync');
    }
  }, [xpData.completedLessons, xpData.totalXP, session?.user?.email]);

  const getLessonIcon = (type: string, status: string) => {
    if (status === "locked") return <Lock className="w-4 h-4 text-gray-400" />;
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-blue-500" />;
    
    switch (type) {
      case "lesson": return <BookOpen className="w-4 h-4" />;
      case "practice": return <Target className="w-4 h-4" />;
      case "quiz": return <Award className="w-4 h-4" />;
      case "treasure": return <Gift className="w-4 h-4" />;
      case "boss": return <Crown className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getLessonColor = (type: string, status: string) => {
    if (status === "locked") return "bg-gray-300 border-gray-300";
    if (status === "completed") return "bg-blue-500 border-blue-500";
    if (status === "current") return "bg-blue-600 border-blue-600";
    
    switch (type) {
      case "lesson": return "bg-blue-500 border-blue-500";
      case "practice": return "bg-yellow-500 border-yellow-500";
      case "quiz": return "bg-purple-500 border-purple-500";
      case "treasure": return "bg-orange-500 border-orange-500";
      case "boss": return "bg-red-500 border-red-500";
      default: return "bg-gray-500 border-gray-500";
    }
  };

  const getLessonPath = (lesson: any) => {
    const title = lesson.title.toLowerCase();
    if (title === "start") return "/dashboard/learning/start";
    if (title === "phương trình bậc nhất") return "/dashboard/learning/phuong-trinh-bac-nhat";
    if (title === "phương trình bậc hai") return "/dashboard/learning/phuong-trinh-bac-hai";
    if (title === "luyện tập") return "/dashboard/learning/luyen-tap";
    if (title === "kiểm tra") return "/dashboard/learning/kiem-tra";
    if (title === "kho báu") return "/dashboard/learning/kho-bau";
    if (title === "hệ phương trình") return "/dashboard/learning/he-phuong-trinh";
    if (title === "thử thách") return "/dashboard/learning/thu-thach";
    return "/dashboard/learning";
  };

  const getLessonStatus = (lessonId: number) => {
    console.log(`🎯 NEW LOGIC: Getting status for lesson ${lessonId}, completed:`, completedLessons);
    
    // Completed lessons are always available (can be replayed)
    if (completedLessons.includes(lessonId)) {
      console.log(`Lesson ${lessonId} is completed (always unlocked)`);
      return "completed";
    }
    
    // START is always available (if not completed)
    if (lessonId === 1) {
      console.log(`Lesson ${lessonId} is current (START available)`);
      return "current";
    }
    
    // For lesson 2: only need lesson 1 to exist (START doesn't need to be completed)
    if (lessonId === 2) {
      console.log(`Lesson ${lessonId} is current (lesson 2 is always unlocked after START)`);
      return "current";
    }
    
    // For lessons 3+: unlock if ANY previous lesson (except START) is completed
    // This allows for non-sequential completion while still maintaining some progression
    const previousLessonId = lessonId - 1;
    const hasAnyPreviousCompleted = completedLessons.some(id => id >= 2 && id < lessonId);
    
    console.log(`🔍 UPDATED LOGIC - Lesson ${lessonId}: previousLessonId=${previousLessonId}, hasAnyPreviousCompleted=${hasAnyPreviousCompleted}, completedLessons:`, completedLessons);
    
    // If immediately previous lesson is completed, unlock
    if (previousLessonId >= 2 && completedLessons.includes(previousLessonId)) {
      console.log(`✅ Lesson ${lessonId} is current (previous lesson ${previousLessonId} completed)`);
      return "current";
    }
    
    // If any previous lesson (2+) is completed, also unlock (allows catching up)
    if (hasAnyPreviousCompleted) {
      console.log(`✅ Lesson ${lessonId} is current (has previous completed lessons)`);
      return "current";
    }
    
    console.log(`❌ Lesson ${lessonId} is locked (need any lesson 2+ completed)`);
    return "locked";
  };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-blue-600">✈️ inPhysic</div>
              <div className="text-sm text-gray-600">Học tập bay cao</div>
            </div>
            
            {/* User Stats */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{xpData.totalXP}</span>
                <span className="text-xs text-gray-500">XP</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">{xpData.streak}</span>
                <span className="text-xs text-gray-500">ngày</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                <Gem className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{xpData.gems}</span>
                <span className="text-xs text-gray-500">gems</span>
              </div>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-1">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium">{xpData.hearts}</span>
                <span className="text-xs text-gray-500">hearts</span>
              </div>
              <div className="text-xs text-gray-500">
                Completed: [{completedLessons.join(", ")}]
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Main Learning Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Section Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-90">← SECTION {mockLearningData.currentSection.id}, UNIT {mockLearningData.currentSection.unit}</div>
                  <h1 className="text-2xl font-bold mt-1">{mockLearningData.currentSection.lessonTitle}</h1>
                </div>
                <Button 
                  variant="secondary" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  onClick={() => window.location.href = '/dashboard/courses'}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  GUIDEBOOK
                </Button>
              </div>
            </div>

            {/* Learning Path */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2 text-yellow-500" />
                  Lộ trình học tập
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  {mockLearningData.learningPath.map((lesson, index) => {
                    const currentStatus = getLessonStatus(lesson.id);
                    console.log(`Rendering lesson ${lesson.id} (${lesson.title}) with status:`, currentStatus, 'completedLessons:', completedLessons);
                    return (
                      <div key={`lesson-${lesson.id}-${completedLessons.length}`} className="flex items-center space-x-4">
                        {/* Lesson Circle */}
                        <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center text-white ${getLessonColor(lesson.type, currentStatus)}`}>
                          {getLessonIcon(lesson.type, currentStatus)}
                        </div>
                        
                        {/* Lesson Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{lesson.title}</span>
                            {lesson.xp > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                +{lesson.xp} XP
                              </Badge>
                            )}
                          </div>
                          {(currentStatus === "current" || currentStatus === "completed") && (
                            <div className="mt-2 flex items-center gap-2">
                              {currentStatus === "completed" && (
                                <span className="text-sm text-blue-600 font-medium">
                                  ✓ Hoàn thành
                                </span>
                              )}
                              <Button 
                                size="sm" 
                                className={`${currentStatus === "completed" ? "bg-green-500 hover:bg-green-600" : "bg-blue-500 hover:bg-blue-600"}`}
                                onClick={() => {
                                  if (currentStatus === "current" || currentStatus === "completed") {
                                    console.log('🎯 Button clicked for lesson:', lesson.id, lesson.title);
                                    console.log('🎯 Calling completeLesson with ID:', `aero_${lesson.id}`, 'XP:', lesson.xp);
                                    
                                    // Complete lesson and add XP (use aero_ prefix to distinguish from real chapter IDs)
                                    completeLesson(`aero_${lesson.id}`, lesson.xp);
                                    updateStreak();
                                    
                                    console.log('🎯 After completeLesson call, XP data:', xpData);
                                    
                                    // Update local completed lessons state
                                    if (!completedLessons.includes(lesson.id)) {
                                      const newCompletedLessons = [...completedLessons, lesson.id];
                                      setCompletedLessons(newCompletedLessons);
                                      
                                      // Save to localStorage
                                      try {
                                        const storageKey = getStorageKey();
                                        localStorage.setItem(storageKey, JSON.stringify(newCompletedLessons));
                                        console.log(`Lesson completed manually (${storageKey}):`, lesson.id, newCompletedLessons);
                                      } catch (error) {
                                        console.error('Error saving to localStorage:', error);
                                      }
                                    }
                                    
                                    // Show completion modal
                                    setLastCompletedLesson(lesson.id);
                                    setShowCompletionModal(true);
                                    
                                    // Check for new achievements
                                    setTimeout(() => {
                                      const newAchievements = xpData.achievements.filter(a => 
                                        !completedLessons.includes(parseInt(a.id)) && 
                                        a.unlockedAt && 
                                        new Date(a.unlockedAt) > new Date(Date.now() - 1000)
                                      );
                                      if (newAchievements.length > 0) {
                                        setNewAchievements(newAchievements);
                                        setShowAchievementModal(true);
                                      }
                                    }, 1000);
                                  }
                                  
                                  // Navigate to lesson
                                  window.location.href = getLessonPath(lesson);
                                }}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                {currentStatus === "completed" ? "Học lại" : "Bắt đầu"}
                              </Button>
                            </div>
                          )}
                          {currentStatus === "locked" && (
                            <div className="mt-2 text-sm text-gray-400">
                              🔒 Khóa
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Learning Paths Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Chọn lộ trình học tập</CardTitle>
                <CardDescription>Chọn môn học bạn muốn học</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockLearningData.sections.map((section) => (
                    <div
                      key={section.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
                        selectedSection === section.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedSection(section.id);
                        // Navigate to learning path based on section
                        const pathMap: { [key: number]: string } = {
                          1: '/learning-paths-demo/toan-hoc',
                          2: '/learning-paths-demo/hoa-hoc', 
                          3: '/learning-paths-demo/vat-ly',
                          4: '/learning-paths-demo/sinh-hoc',
                          5: '/learning-paths-demo/python'
                        };
                        const path = pathMap[section.id];
                        if (path) {
                          window.location.href = path;
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">{section.title}</h3>
                        <div className={`w-4 h-4 rounded-full ${section.color}`}></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tiến độ học tập</span>
                          <span>{section.completedLessons}/{section.totalLessons} bài học</span>
                        </div>
                        <Progress value={section.progress} className="h-2" />
                        <div className="text-xs text-gray-500">
                          {section.progress}% hoàn thành
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`w-3 h-3 rounded-full ${
                            section.progress === 0 ? 'bg-gray-300' :
                            section.progress < 30 ? 'bg-red-500' :
                            section.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <span className="text-xs text-blue-600 font-medium">Nhấn để xem chi tiết →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Special Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Hoạt động đặc biệt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Kiểm tra */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Award className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Kiểm tra</span>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      +30 XP
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Bài kiểm tra kiến thức cơ bản</p>
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    🔒 Hoàn thành ít nhất 5 bài học để mở khóa
                  </div>
                </div>

                {/* Kho báu */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Kho báu</span>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Thu thập điểm thưởng và phần thưởng</p>
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    🔒 Đạt cấp độ 3 để mở khóa
                  </div>
                </div>

                {/* Hệ phương trình */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Target className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Hệ phương trình</span>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      +35 XP
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Giải hệ phương trình nâng cao</p>
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    🔒 Hoàn thành chương Đại số để mở khóa
                  </div>
                </div>

                {/* Thử thách */}
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium">Thử thách</span>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      +50 XP
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Thử thách lập trình Python</p>
                  <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                    🔒 Hoàn thành khóa Python cơ bản để mở khóa
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Daily Quests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                    Nhiệm vụ hàng ngày
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = '/dashboard/achievements'}
                  >
                    XEM TẤT CẢ
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockLearningData.dailyQuests.map((quest) => (
                  <div key={quest.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{quest.title}</span>
                      <span className="text-xs text-gray-500">{quest.reward}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={(quest.progress / quest.target) * 100} className="flex-1 h-2" />
                      <span className="text-xs text-gray-600">{quest.progress}/{quest.target}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Bảng xếp hạng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockLearningData.leaderboard.map((user) => (
                    <div key={user.rank} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{user.badge}</span>
                        <div>
                          <div className="font-medium text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.streak} ngày streak</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{user.xp} XP</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile CTA */}
            <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold mb-2">Tạo hồ sơ để lưu tiến độ!</h3>
                <p className="text-sm opacity-90 mb-4">Đăng nhập để đồng bộ tiến độ học tập</p>
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-white text-blue-600 hover:bg-gray-100"
                    onClick={() => window.location.href = '/sign-up'}
                  >
                    TẠO HỒ SƠ
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-white text-white hover:bg-white/10"
                    onClick={() => window.location.href = '/sign-in'}
                  >
                    ĐĂNG NHẬP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold text-blue-600 mb-4">Chúc mừng!</h2>
            <p className="text-gray-600 mb-6">
              Bạn đã hoàn thành bài học &quot;{mockLearningData.learningPath.find(l => l.id === lastCompletedLesson)?.title}&quot;!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-700 font-semibold">
                +{mockLearningData.learningPath.find(l => l.id === lastCompletedLesson)?.xp || 0} XP
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Bài học tiếp theo đã được mở khóa!
            </p>
            <Button 
              onClick={() => setShowCompletionModal(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Tiếp tục học tập
            </Button>
          </div>
        </div>
      )}

      {/* Achievement Modal */}
      {showAchievementModal && newAchievements.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Thành tích mới!</h3>
              {newAchievements.map((achievement, index) => (
                <div key={achievement.id} className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                  {achievement.xpReward > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-semibold text-yellow-600">
                        +{achievement.xpReward} XP
                      </span>
                    </div>
                  )}
                </div>
              ))}
              <Button 
                onClick={() => {
                  setShowAchievementModal(false);
                  setNewAchievements([]);
                }}
                className="w-full"
              >
                Tuyệt vời!
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AeroschoolLearning;

