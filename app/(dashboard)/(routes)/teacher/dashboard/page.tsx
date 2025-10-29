'use client';

import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Brain, AlertTriangle, Star, Award,
  Activity, Calendar, Target, MessageSquare, Zap, Eye,
  ChevronRight, BarChart3, Clock, Trophy, BookOpen, Heart,
  ThumbsUp, ThumbsDown, Meh, Smile, Frown, Send, X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllStudentsDataForTeacher, getClassStatistics, sendNotificationToStudent, assignMaterialToStudent } from '@/lib/teacher-data-access';
import { useLanguage } from '@/contexts/LanguageContext';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalXP: number;
  progress: number;
  averageScore: number;
  lessonsCompleted: number;
  lastActive: string;
  emotion: 'happy' | 'neutral' | 'sad';
  atRisk: boolean;
  engagement: number;
  streak: number;
}

interface ClassStats {
  totalStudents: number;
  averageXP: number;
  averageProgress: number;
  averageScore: number;
  totalLessonsCompleted: number;
  averageEngagement: number;
  atRiskCount: number;
}

export default function TeacherDashboard() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<ClassStats | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'engagement' | 'emotion'>('overview');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  
  // Modals state
  const [showEncouragementModal, setShowEncouragementModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<Student | null>(null);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialType, setMaterialType] = useState<'video' | 'pdf' | 'quiz' | 'exercise'>('video');
  const [materialUrl, setMaterialUrl] = useState('');

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = () => {
    // Load real student data from localStorage via teacher-data-access
    const realStudents = getAllStudentsDataForTeacher();
    const realStats = getClassStatistics();

    setStudents(realStudents);
    setClassStats(realStats);
    setLoading(false);
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadClassData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quick action handlers
  const handleSendEncouragement = (student: Student) => {
    console.log(`💝 [Dashboard] Opening encouragement modal for: ${student.name}`);
    console.log(`📊 [Dashboard] Student stats - Engagement: ${student.engagement}%, XP: ${student.totalXP}`);
    setSelectedStudentForAction(student);
    setEncouragementMessage('');
    setShowEncouragementModal(true);
  };

  const handleSendMaterial = (student: Student) => {
    console.log(`📚 [Dashboard] Opening material modal for: ${student.name}`);
    console.log(`📊 [Dashboard] Student needs: Learning materials`);
    setSelectedStudentForAction(student);
    setMaterialTitle('');
    setMaterialUrl('');
    setShowMaterialModal(true);
  };

  const handleViewStudentDetail = (student: Student) => {
    console.log(`👀 [Dashboard] Viewing details for: ${student.name}`);
    console.log(`📊 [Dashboard] Navigating to: /teacher/student/${student.id}`);
    router.push(`/teacher/student/${student.id}`);
  };

  const submitEncouragement = () => {
    if (!selectedStudentForAction || !encouragementMessage) return;
    
    console.log(`💝 [Dashboard] Sending encouragement to: ${selectedStudentForAction.name}`);
    console.log(`📝 [Dashboard] Message: "${encouragementMessage}"`);
    
    sendNotificationToStudent(
      selectedStudentForAction.id,
      encouragementMessage,
      'encouragement'
    );
    
    setShowEncouragementModal(false);
    setEncouragementMessage('');
    
    console.log(`✅ [Dashboard] Encouragement sent successfully!`);
    alert(`✅ Đã gửi lời động viên đến ${selectedStudentForAction.name}!\n\n"${encouragementMessage}"`);
  };

  const submitMaterial = () => {
    if (!selectedStudentForAction || !materialTitle) return;
    
    console.log(`📚 [Dashboard] Sending material to: ${selectedStudentForAction.name}`);
    console.log(`📄 [Dashboard] Material: "${materialTitle}" (${materialType})`);
    console.log(`🔗 [Dashboard] URL: ${materialUrl || 'No URL'}`);
    
    assignMaterialToStudent(
      selectedStudentForAction.id,
      {
        type: materialType,
        title: materialTitle,
        url: materialUrl,
        description: `Tài liệu từ giáo viên`
      }
    );
    
    setShowMaterialModal(false);
    setMaterialTitle('');
    setMaterialUrl('');
    
    console.log(`✅ [Dashboard] Material sent successfully!`);
    alert(`✅ Đã gửi tài liệu "${materialTitle}" đến ${selectedStudentForAction.name}!`);
  };

  // New event handlers for buttons
  const handleTimeRangeChange = (range: 'week' | 'month' | 'all') => {
    console.log(`📅 Changing time range to: ${range}`);
    setTimeRange(range);
    
    // Show notification
    const rangeText = range === 'week' ? 'tuần này' : range === 'month' ? '30 ngày' : 'tất cả thời gian';
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-right';
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="text-sm font-medium text-gray-900">Đã lọc theo ${rangeText}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  const handleAIInsights = () => {
    console.log('🧠 Opening AI Insights...');
    router.push('/teacher/ai-insights');
  };

  const handleSendReminders = () => {
    const incompleteStudents = students.filter(s => s.progress < 80);
    if (incompleteStudents.length === 0) {
      alert('✅ Tất cả học sinh đã hoàn thành bài tập tuần này!');
      return;
    }
    
    const confirmed = confirm(`Gửi nhắc nhở đến ${incompleteStudents.length} học sinh chưa hoàn thành bài tập?`);
    if (confirmed) {
      incompleteStudents.forEach(student => {
        sendNotificationToStudent(
          student.id,
          'Nhắc nhở: Bạn còn bài tập chưa hoàn thành tuần này. Hãy cố gắng hoàn thành nhé! 💪',
          'reminder'
        );
      });
      alert(`✅ Đã gửi nhắc nhở đến ${incompleteStudents.length} học sinh!`);
    }
  };

  const handleCreateModule = () => {
    console.log('📚 Creating new advanced module...');
    const highPerformers = students.filter(s => s.averageScore >= 85);
    router.push(`/teacher/create-module?targetStudents=${highPerformers.map(s => s.id).join(',')}`);
  };

  const handleSendBroadcastNotification = () => {
    const message = prompt('Nhập thông báo muốn gửi cho toàn lớp:');
    if (message && message.trim()) {
      students.forEach(student => {
        sendNotificationToStudent(student.id, message, 'info');
      });
      alert(`✅ Đã gửi thông báo đến ${students.length} học sinh!`);
    }
  };

  const handleViewClassAnalytics = () => {
    console.log('📊 Opening class analytics...');
    router.push('/teacher/analytics');
  };

  const handleAdjustLearningPath = (student: Student) => {
    console.log(`🎯 Adjusting learning path for ${student.name}`);
    router.push(`/teacher/learning-path-adjust?student=${student.id}&current=${student.progress}`);
  };

  const encouragementTemplates = [
    '🌟 Em đang làm rất tốt! Tiếp tục phát huy nhé!',
    '💪 Thầy/cô thấy em đã cố gắng rất nhiều. Cứ tiếp tục như vậy!',
    '🎯 Em đã hoàn thành xuất sắc bài học hôm qua. Giữ vững phong độ nhé!',
    '🚀 Em có tiềm năng rất lớn. Đừng bỏ cuộc nhé!',
    '⭐ Thầy/cô rất tự hào về tiến bộ của em!'
  ];

  const getEmotionIcon = (emotion: string) => {
    switch (emotion) {
      case 'happy': return <Smile className="h-5 w-5 text-green-500" />;
      case 'neutral': return <Meh className="h-5 w-5 text-yellow-500" />;
      case 'sad': return <Frown className="h-5 w-5 text-red-500" />;
      default: return <Meh className="h-5 w-5 text-gray-500" />;
    }
  };

  const getEngagementColor = (engagement: number) => {
    if (engagement >= 80) return 'bg-green-500';
    if (engagement >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
                    <p className="text-gray-600">Đang tải dữ liệu lớp học...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
        <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📊 Class Dashboard
              </h1>
              <p className="text-gray-600">
                Quản lý lớp học với AI • {classStats?.totalStudents} học sinh
              </p>
        </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => handleTimeRangeChange('week')}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 inline mr-2" />
                Tuần này
              </button>
              <button 
                onClick={handleAIInsights}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                <Brain className="h-5 w-5 inline mr-2" />
                AI Insights
              </button>
            </div>
        </div>
      </div>

        {/* Real-time AI Insights Banner */}
        <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 border-l-4 border-purple-500 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Brain className="h-6 w-6 text-purple-600 mr-3 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
                🤖 Real-time AI Insights
                <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">LIVE</span>
              </h3>
              <div className="space-y-2 text-sm">
                {classStats && classStats.atRiskCount > 0 && (
                  <p className="text-orange-800">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    <strong>{classStats.atRiskCount} học sinh cần quan tâm:</strong> Giảm engagement đáng kể. 
                    <Link href="#at-risk-students" className="underline ml-1 font-medium">
                      Hỗ trợ ngay →
                    </Link>
                  </p>
                )}
                <p className="text-green-800">
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  <strong>Tin tốt:</strong> Điểm trung bình lớp tăng 5% tuần này. Học sinh phản hồi tích cực với bài tập AI.
                </p>
                <p className="text-blue-800">
                  <Target className="h-4 w-4 inline mr-1" />
                  <strong>Đề xuất:</strong> 3 học sinh đã sẵn sàng cho level khó hơn. AI gợi ý tăng độ phức tạp.
                </p>
      </div>
          </div>
                      </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
                      <div>
                <p className="text-gray-600 text-sm mb-1">XP Trung bình</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageXP}</p>
                <p className="text-green-600 text-sm mt-1">↑ +12% tuần này</p>
                      </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Trophy className="h-6 w-6 text-blue-600" />
                    </div>
                    </div>
                  </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Tiến độ TB</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageProgress}%</p>
                <p className="text-green-600 text-sm mt-1">↑ +8% tuần này</p>
          </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Điểm TB</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageScore}%</p>
                <p className="text-green-600 text-sm mt-1">↑ +5% tuần này</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Star className="h-6 w-6 text-green-600" />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{t('vision.engagement')}</p>
                <p className="text-3xl font-bold text-gray-900">{classStats?.averageEngagement}%</p>
                <p className="text-orange-600 text-sm mt-1">
                  {classStats?.atRiskCount} at risk
                </p>
                      </div>
              <div className="bg-orange-100 rounded-full p-3">
                <Activity className="h-6 w-6 text-orange-600" />
                        </div>
                        </div>
                      </div>
                    </div>

        {/* View Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-1 mb-6 inline-flex">
          <button
            onClick={() => setSelectedView('overview')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'overview'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setSelectedView('engagement')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'engagement'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Activity className="h-4 w-4 inline mr-2" />
            Engagement Heatmap
          </button>
          <button
            onClick={() => setSelectedView('emotion')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              selectedView === 'emotion'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Heart className="h-4 w-4 inline mr-2" />
            Emotion Overview
          </button>
                      </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* XP Trend Chart */}
            {selectedView === 'overview' && (
              <>
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      📈 Xu hướng XP của lớp
                    </h3>
                    <select 
                      value={timeRange}
                      onChange={(e) => handleTimeRangeChange(e.target.value as 'week' | 'month' | 'all')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="week">7 ngày qua</option>
                      <option value="month">30 ngày qua</option>
                      <option value="all">Tất cả</option>
                    </select>
                    </div>
                  
                  {/* Simple bar chart */}
                  <div className="space-y-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const height = Math.random() * 100 + 50;
                      return (
                        <div key={day} className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600 w-12">{day}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all flex items-center justify-end pr-3"
                              style={{ width: `${height}%` }}
                            >
                              <span className="text-white text-xs font-semibold">
                                {Math.round(height * 10)} XP
                              </span>
                  </div>
              </div>
                        </div>
                      );
                    })}
                  </div>
          </div>

                {/* Performance Distribution */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    📊 Phân bố Thành tích
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="bg-green-100 rounded-lg p-4 mb-2">
                        <p className="text-2xl font-bold text-green-600">1</p>
                      </div>
                      <p className="text-sm text-gray-600">Xuất sắc (90-100%)</p>
                        </div>
                    <div className="text-center">
                      <div className="bg-blue-100 rounded-lg p-4 mb-2">
                        <p className="text-2xl font-bold text-blue-600">2</p>
                        </div>
                      <p className="text-sm text-gray-600">Giỏi (80-89%)</p>
                        </div>
                    <div className="text-center">
                      <div className="bg-yellow-100 rounded-lg p-4 mb-2">
                        <p className="text-2xl font-bold text-yellow-600">1</p>
                        </div>
                      <p className="text-sm text-gray-600">Khá (70-79%)</p>
                      </div>
                    <div className="text-center">
                      <div className="bg-orange-100 rounded-lg p-4 mb-2">
                        <p className="text-2xl font-bold text-orange-600">1</p>
                    </div>
                      <p className="text-sm text-gray-600">TB (60-69%)</p>
                    </div>
                  </div>
                    </div>
              </>
            )}

            {/* Engagement Heatmap */}
            {selectedView === 'engagement' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  🔥 Engagement Heatmap - 7 ngày qua
                </h3>
                <div className="space-y-2">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3">
                      <span className="text-sm w-32 truncate">{student.name}</span>
                      <div className="flex-1 flex space-x-1">
                        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                          const activity = Math.random() * student.engagement;
                          let color = 'bg-gray-200';
                          if (activity >= 80) color = 'bg-green-500';
                          else if (activity >= 60) color = 'bg-yellow-500';
                          else if (activity >= 40) color = 'bg-orange-400';
                          else if (activity >= 20) color = 'bg-red-400';
                          
                          return (
                            <div
                              key={day}
                              className={`h-8 flex-1 rounded ${color} hover:opacity-80 transition-opacity cursor-pointer`}
                              title={`Day ${day + 1}: ${Math.round(activity)}%`}
                            ></div>
                          );
                        })}
                    </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {student.engagement}%
                      </span>
                  </div>
            ))}
          </div>
                <div className="mt-6 flex items-center justify-center space-x-6 text-xs text-gray-600">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                    No activity
          </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
                    Low (20-40%)
                      </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-400 rounded mr-2"></div>
                    Medium (40-60%)
                        </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                    Good (60-80%)
                        </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                    Excellent (80%+)
                        </div>
                        </div>
                      </div>
            )}

            {/* Emotion Overview */}
            {selectedView === 'emotion' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  😊 Emotion Overview - Tuần này
                </h3>
                
                {/* Emotion Distribution */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="bg-green-100 rounded-lg p-6 mb-2">
                      <Smile className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-green-600">
                        {students.filter(s => s.emotion === 'happy').length}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">{t('emotion.happy')}</p>
                      </div>
                  <div className="text-center">
                    <div className="bg-yellow-100 rounded-lg p-6 mb-2">
                      <Meh className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-yellow-600">
                        {students.filter(s => s.emotion === 'neutral').length}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">Neutral</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-red-100 rounded-lg p-6 mb-2">
                      <Frown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-red-600">
                        {students.filter(s => s.emotion === 'sad').length}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">Sad</p>
                    </div>
                  </div>

                {/* Emotion Timeline */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Emotion vs Performance</h4>
                  {students.slice(0, 3).map((student) => (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{student.avatar}</span>
                          <div>
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">Score: {student.averageScore}%</p>
                          </div>
                        </div>
                        {getEmotionIcon(student.emotion)}
                      </div>
                      <div className="flex space-x-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                          const emotions = ['happy', 'neutral', 'sad'];
                          const emotion = emotions[Math.floor(Math.random() * emotions.length)];
                          let color = 'bg-gray-200';
                          if (emotion === 'happy') color = 'bg-green-400';
                          else if (emotion === 'neutral') color = 'bg-yellow-400';
                          else if (emotion === 'sad') color = 'bg-red-400';
                          
                          return (
                            <div
                              key={day}
                              className={`h-6 flex-1 rounded ${color}`}
                              title={`${day}: ${emotion}`}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
            ))}
          </div>
              </div>
            )}
          </div>

          {/* Right Column - AI Insights */}
          <div className="space-y-6">
            {/* AI Co-Teacher Panel */}
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center mb-4">
                <Brain className="h-6 w-6 mr-2" />
                <h3 className="text-lg font-semibold">AI Co-Teacher</h3>
          </div>

              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-start">
                    <Zap className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Gợi ý hôm nay</p>
                      <p className="text-sm opacity-90">
                        2 học sinh chưa hoàn thành bài tập tuần này. Gửi nhắc nhở?
                      </p>
                      <button 
                        onClick={handleSendReminders}
                        className="mt-2 text-sm bg-white text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Gửi nhắc nhở
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-start">
                    <Target className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Phân tích xu hướng</p>
                      <p className="text-sm opacity-90">
                        Engagement tăng 15% so với tuần trước. Học sinh phản ứng tốt với bài tập AI.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Learning Path Suggestion</p>
                      <p className="text-sm opacity-90">
                        Đề xuất thêm module "Giải tích nâng cao" cho nhóm học sinh đạt điểm cao.
                      </p>
                      <button 
                        onClick={handleCreateModule}
                        className="mt-2 text-sm bg-white text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Tạo module
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/teacher/learning-path-builder')}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-cyan-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">Create Learning Path</span>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
                
                <button 
                  onClick={handleSendBroadcastNotification}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg hover:from-purple-100 hover:to-pink-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">Send Notification</span>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
                
                <button 
                  onClick={handleViewClassAnalytics}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:from-green-100 hover:to-emerald-100 transition-colors"
                >
                  <span className="font-medium text-gray-900">View Analytics</span>
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
          </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              👥 Danh sách Học sinh
            </h3>
            <div className="flex items-center space-x-3">
              <input
                type="search"
                placeholder="Tìm học sinh..."
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>Tất cả</option>
                <option>At Risk</option>
                <option>High Performers</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Học sinh</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">XP</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tiến độ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Điểm TB</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('vision.engagement')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cảm xúc</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Streak</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr 
                    key={student.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      student.atRisk ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{student.avatar}</span>
                <div>
                          <p className="font-medium text-gray-900 flex items-center">
                            {student.name}
                            {student.atRisk && (
                              <AlertTriangle className="h-4 w-4 text-orange-600 ml-2" />
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{student.email}</p>
                </div>
                </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <Trophy className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-semibold text-gray-900">{student.totalXP}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        student.averageScore >= 90 ? 'bg-green-100 text-green-800' :
                        student.averageScore >= 80 ? 'bg-blue-100 text-blue-800' :
                        student.averageScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {student.averageScore}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{
                          backgroundColor: student.engagement >= 80 ? '#10b981' :
                                         student.engagement >= 60 ? '#f59e0b' : '#ef4444'
                        }}></div>
                        <span className="text-sm font-medium text-gray-700">{student.engagement}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getEmotionIcon(student.emotion)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {student.streak > 0 ? (
                          <>
                            <span className="text-orange-500 mr-1">🔥</span>
                            <span className="text-sm font-semibold text-gray-900">{student.streak}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/teacher/interaction-center?student=${student.id}`)}
                          className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Send Message"
                        >
                          <MessageSquare className="h-4 w-4 text-purple-600" />
                        </button>
                        <button
                          onClick={() => handleAdjustLearningPath(student)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Adjust Learning Path"
                        >
                          <Target className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => router.push(`/teacher/student/${student.id}`)}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                </div>
                </div>

        {/* At-Risk Students Section */}
        {students.filter(s => s.atRisk).length > 0 && (
          <div id="at-risk-students" className="bg-white rounded-xl shadow-lg p-6 mt-6 border-l-4 border-red-500">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Học sinh cần quan tâm ({students.filter(s => s.atRisk).length})
            </h3>
            <div className="space-y-4">
              {students.filter(s => s.atRisk).map((student) => (
                <div key={student.id} className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{student.avatar}</span>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-600">Last active: {student.lastActive}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium mb-1">
                        Engagement: {student.engagement}%
                      </p>
                      <p className="text-xs text-gray-600">
                        {student.lessonsCompleted} lessons completed
                      </p>
                    </div>
                </div>
                
                  {/* AI Suggestions with Quick Actions */}
                  <div className="mt-3 bg-white rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      <strong className="text-purple-600">🤖 AI Analysis:</strong> Học sinh {student.name} có engagement thấp ({student.engagement}%).
                    </p>
                    
                    {/* AI Recommendations */}
                    <div className="bg-purple-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-purple-900 mb-2">✨ AI Recommendations:</p>
                      <ul className="text-xs text-purple-800 space-y-1">
                        <li>• Gửi tin nhắn động viên (response rate: 85%)</li>
                        <li>• Giảm độ khó bài học 1 level (success rate: 78%)</li>
                        <li>• Thêm video visual (phù hợp learning style)</li>
                  </ul>
          </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleSendEncouragement(student)}
                        className="text-xs px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center transition-all hover:scale-105"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Gửi động viên
                      </button>
                      <button 
                        onClick={() => handleSendMaterial(student)}
                        className="text-xs px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center transition-all hover:scale-105"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        Gửi tài liệu
                      </button>
                      <button 
                        onClick={() => handleViewStudentDetail(student)}
                        className="text-xs px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center transition-all hover:scale-105"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Chi tiết
                      </button>
                      </div>
                      </div>
                    </div>
              ))}
                    </div>
                  </div>
        )}
              </div>
      {/* Encouragement Modal */}
      {showEncouragementModal && selectedStudentForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-green-600" />
                Gửi lời động viên
              </h3>
              <button
                onClick={() => setShowEncouragementModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Học sinh:</strong> {selectedStudentForAction.name}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Engagement: {selectedStudentForAction.engagement}% | XP: {selectedStudentForAction.totalXP}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn mẫu tin nhắn nhanh:
              </label>
              <div className="space-y-2">
                {encouragementTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEncouragementMessage(template)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-green-50 rounded-lg text-sm border border-gray-200 hover:border-green-300 transition-colors"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoặc viết tin nhắn tự do:
              </label>
              <textarea
                value={encouragementMessage}
                onChange={(e) => setEncouragementMessage(e.target.value)}
                placeholder="Nhập lời động viên cho học sinh..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEncouragementModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Hủy
              </button>
              <button
                onClick={submitEncouragement}
                disabled={!encouragementMessage}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Gửi động viên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Assignment Modal */}
      {showMaterialModal && selectedStudentForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
                Gửi tài liệu học tập
              </h3>
              <button
                onClick={() => setShowMaterialModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-900">
                <strong>Học sinh:</strong> {selectedStudentForAction.name}
              </p>
              <p className="text-sm text-purple-700 mt-1">
                Điểm TB: {selectedStudentForAction.averageScore}% | Bài hoàn thành: {selectedStudentForAction.lessonsCompleted}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại tài liệu:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['video', 'pdf', 'quiz', 'exercise'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setMaterialType(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      materialType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'video' && '📹 Video'}
                    {type === 'pdf' && '📄 PDF'}
                    {type === 'quiz' && '📝 Quiz'}
                    {type === 'exercise' && '✏️ Bài tập'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề tài liệu: *
              </label>
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="VD: Video hướng dẫn đạo hàm hàm hợp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link tài liệu: (tùy chọn)
              </label>
              <input
                type="url"
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMaterialModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Hủy
              </button>
              <button
                onClick={submitMaterial}
                disabled={!materialTitle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center"
              >
                <Send className="h-4 w-4 mr-2" />
                Gửi tài liệu
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
