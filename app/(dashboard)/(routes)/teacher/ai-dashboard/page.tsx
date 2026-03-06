/**
 * AI-Driven Teacher Dashboard
 * 
 * Modern teacher interface powered by PLG & XP Analytics
 * Features:
 * - Real-time learning insights
 * - AI Co-Teacher suggestions
 * - Student engagement heatmap
 * - Emotion tracking
 * - At-risk detection
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { updateButtonHandlers, initializeEventHandlers } from '../update-event-handlers';
import {
  Users, Brain, TrendingUp, AlertTriangle, Sparkles,
  BarChart3, Heart, Zap, Target, Clock, Award, Eye,
  MessageSquare, BookOpen, Settings, ChevronDown,
  Activity, Calendar, Filter, Search, Bell, Plus, Trophy
} from 'lucide-react';

// Components imports (we'll create these)
import ClassOverview from '@/components/teacher/ClassOverview';
import StudentList from '@/components/teacher/StudentList';
import AICoTeacherPanel from '@/components/teacher/AICoTeacherPanel';
import EngagementHeatmap from '@/components/teacher/EngagementHeatmap';
import EmotionTimeline from '@/components/teacher/EmotionTimeline';
import QuickActions from '@/components/teacher/QuickActions';
import { useLanguage } from '@/contexts/LanguageContext';

interface StudentWithAnalytics {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  
  // XP Analytics
  totalXP: number;
  level: number;
  xpSignal: {
    capability: {
      overallScore: number;
      cognitive: number;
      metacognitive: number;
      behavioral: number;
    };
    learningSpeed: {
      xpPerHour: number;
      optimalPace: string;
    };
    motivation: {
      score: number;
      trend: string;
    };
    trends: {
      overall: string;
      atRisk: boolean;
      riskFactors: string[];
    };
  };
  
  // PLG Data
  currentEmotion: string;
  emotionIntensity: number;
  streak: number;
  lastActive: Date;
  
  // Progress
  progress: number;
  completedLessons: number;
  averageScore: number;
}

export default function AIDrivenTeacherDashboard() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const { data: session } = useSession();
  const [students, setStudents] = useState<StudentWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'heatmap' | 'emotions'>('overview');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'at-risk' | 'excelling'>('all');

  useEffect(() => {
    // Initialize event handlers with router
    initializeEventHandlers(router);
    
    loadStudentsWithAnalytics();
  }, [router]);

  const loadStudentsWithAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get all students
      // TODO: Replace with actual API call
      const studentIds = ['student_1', 'student_2', 'student_3']; // Demo
      
      // Load PLG and XP analytics for each student
      const studentsData = await Promise.all(
        studentIds.map(async (id) => {
          try {
            // Get PLG
            const plgRes = await fetch(`/api/plg/${id}`);
            const plgData = await plgRes.json();
            
            // Get XP Analytics
            const xpRes = await fetch(`/api/xp/analyze/${id}`);
            const xpData = await xpRes.json();
            
            return {
              id,
              name: `Student ${id}`,
              email: `${id}@example.com`,
              avatar: null,
              totalXP: xpData.data?.totalXP || 0,
              level: xpData.data?.level || 1,
              xpSignal: xpData.data || {},
              currentEmotion: plgData.data?.currentEmotion?.primary || 'neutral',
              emotionIntensity: plgData.data?.currentEmotion?.intensity || 0.5,
              streak: plgData.data?.streaks?.current || 0,
              lastActive: new Date(plgData.data?.lastActive || Date.now()),
              progress: 0, // Calculate from PLG skills
              completedLessons: plgData.data?.streaks?.streakHistory?.length || 0,
              averageScore: xpData.data?.capability?.recentPerformance || 0,
            };
          } catch (error) {
            console.error(`Error loading analytics for ${id}:`, error);
            return null;
          }
        })
      );
      
      setStudents(studentsData.filter(Boolean) as StudentWithAnalytics[]);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate class statistics
  const classStats = {
    totalStudents: students.length,
    averageXP: students.reduce((sum, s) => sum + s.totalXP, 0) / students.length || 0,
    averageCapability: students.reduce((sum, s) => sum + (s.xpSignal.capability?.overallScore || 0), 0) / students.length || 0,
    averageMotivation: students.reduce((sum, s) => sum + (s.xpSignal.motivation?.score || 0), 0) / students.length || 0,
    atRiskCount: students.filter(s => s.xpSignal.trends?.atRisk).length,
    excellingCount: students.filter(s => s.xpSignal.trends?.overall === 'improving' && (s.xpSignal.capability?.overallScore || 0) >= 80).length,
  };

  // Filter students
  const filteredStudents = students.filter(student => {
    // Search filter
    if (searchQuery && !student.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (filterStatus === 'at-risk' && !student.xpSignal.trends?.atRisk) {
      return false;
    }
    if (filterStatus === 'excelling' && student.xpSignal.trends?.overall !== 'improving') {
      return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
                    <p className="text-gray-600">Đang tải dữ liệu học sinh...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title & Class Selector */}
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Brain className="w-6 h-6 mr-2 text-purple-600" />
                  AI Teacher Dashboard
                </h1>
                <p className="text-sm text-gray-600">Lớp 12A1 - Toán học</p>
              </div>
            </div>

            {/* Center: Time Range */}
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              {['today', 'week', 'month'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setTimeRange(range as any);
                    updateButtonHandlers.handleTimeRangeChange(range as any);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === 'today' && 'Hôm nay'}
                  {range === 'week' && 'Tuần này'}
                  {range === 'month' && 'Tháng này'}
                </button>
              ))}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => updateButtonHandlers.handleNotificationsClick()}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {classStats.atRiskCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <button 
                onClick={() => updateButtonHandlers.handleSettingsClick()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex items-center space-x-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateButtonHandlers.handleSearch(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                updateButtonHandlers.handleFilterChange(e.target.value as any);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">Tất cả ({students.length})</option>
              <option value="at-risk">Cần hỗ trợ ({classStats.atRiskCount})</option>
              <option value="excelling">Xuất sắc ({classStats.excellingCount})</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setSelectedView('overview');
                  updateButtonHandlers.handleViewOverview();
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  selectedView === 'overview' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedView('heatmap');
                  updateButtonHandlers.handleViewHeatmap();
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  selectedView === 'heatmap' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedView('emotions');
                  updateButtonHandlers.handleViewEmotions();
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium ${
                  selectedView === 'emotions' ? 'bg-white shadow-sm' : 'text-gray-600'
                }`}
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Main View */}
          <div className="col-span-8 space-y-6">
            {/* Class Statistics Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-500" />
                  <span className="text-2xl font-bold text-gray-900">{classStats.totalStudents}</span>
                </div>
                <div className="text-sm text-gray-600">Học sinh</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(classStats.averageXP)}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Trung bình XP</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-8 h-8 text-purple-500" />
                  <span className="text-2xl font-bold text-gray-900">
                    {Math.round(classStats.averageCapability)}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">Năng lực TB</div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className={`w-8 h-8 ${classStats.atRiskCount > 0 ? 'text-red-500' : 'text-green-500'}`} />
                  <span className={`text-2xl font-bold ${classStats.atRiskCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {classStats.atRiskCount}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Cần hỗ trợ</div>
              </div>
            </div>

            {/* Main View Area */}
            {selectedView === 'overview' && (
              <ClassOverview students={filteredStudents} timeRange={timeRange} />
            )}

            {selectedView === 'heatmap' && (
              <EngagementHeatmap students={filteredStudents} />
            )}

            {selectedView === 'emotions' && (
              <EmotionTimeline students={filteredStudents} />
            )}

            {/* Student List */}
            <StudentList students={filteredStudents} />
          </div>

          {/* Right Column: AI Co-Teacher & Quick Actions */}
          <div className="col-span-4 space-y-6">
            {/* AI Co-Teacher Panel */}
            <AICoTeacherPanel students={students} classStats={classStats} />

            {/* Quick Actions */}
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}

