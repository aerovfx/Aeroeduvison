'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Search, Filter, Users, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, Clock, Brain, Heart, Zap,
  Eye, MessageSquare, ChevronRight, Activity, Award, Target
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  class: string;
  currentXP: number;
  xpChange: number;
  masteryPercentage: number;
  emotionScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastActive: string;
  avatar: string;
}

interface TimelineEvent {
  id: string;
  type: 'quiz' | 'login' | 'emotion_spike' | 'intervention' | 'achievement';
  title: string;
  timestamp: string;
  details?: string;
  xpGained?: number;
  emotionChange?: { from: string; to: string };
}

interface PLGSkill {
  name: string;
  mastery: number;
  status: 'mastered' | 'learning' | 'review' | 'struggling';
  nextReview?: string;
  predictedGain?: number;
}

interface AISuggestion {
  id: string;
  type: 'alert' | 'suggestion' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  action: string;
}

export default function AdminStudentsPage() {
  const { t } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentDetail, setStudentDetail] = useState<any>(null);

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        class: selectedClass,
        risk: selectedRisk
      });
      
      const response = await fetch(`/api/admin/students?${params}`);
      if (!response.ok) throw new Error('Failed to fetch students');
      
      const data = await response.json();
      console.log('✅ [Admin Students] Fetched:', data.students.length, 'students');
      setStudents(data.students);
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [Admin Students] Error:', error);
      setIsLoading(false);
    }
  };

  // Fetch student detail
  const fetchStudentDetail = async (studentId: string) => {
    try {
      const response = await fetch(`/api/admin/students/${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch student detail');
      
      const data = await response.json();
      console.log('✅ [Admin Students] Detail fetched for:', data.student.name);
      setStudentDetail(data);
    } catch (error) {
      console.error('❌ [Admin Students] Error fetching detail:', error);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedClass, selectedRisk]);

  // Mock timeline for selected student
  const mockTimeline: TimelineEvent[] = [
    {
      id: '1',
      type: 'quiz',
      title: 'Completed Algebra Quiz',
      timestamp: '2 hours ago',
      details: 'Score: 85% • Time: 15 minutes',
      xpGained: 120
    },
    {
      id: '2',
      type: 'emotion_spike',
      title: 'Emotion Change Detected',
      timestamp: '5 hours ago',
      emotionChange: { from: 'Confused', to: t('emotion.focused') }
    },
    {
      id: '3',
      type: 'achievement',
      title: 'Unlocked: Problem Solver',
      timestamp: '1 day ago',
      details: 'Solved 10 challenging problems in a row',
      xpGained: 250
    },
    {
      id: '4',
      type: 'intervention',
      title: 'Teacher Check-in',
      timestamp: '2 days ago',
      details: 'Ms. Sarah provided personalized feedback'
    },
    {
      id: '5',
      type: 'login',
      title: 'Started Learning Session',
      timestamp: '2 days ago'
    }
  ];

  // Mock PLG skills
  const mockPLGSkills: PLGSkill[] = [
    { name: 'Linear Equations', mastery: 0.92, status: 'mastered', nextReview: '5 days' },
    { name: 'Quadratic Functions', mastery: 0.75, status: 'learning', predictedGain: 0.15 },
    { name: 'Trigonometry', mastery: 0.45, status: 'struggling', predictedGain: 0.08 },
    { name: 'Calculus Basics', mastery: 0.68, status: 'learning', predictedGain: 0.12 },
    { name: t('dashboard.stats'), mastery: 0.88, status: 'mastered', nextReview: '3 days' },
    { name: 'Geometry', mastery: 0.52, status: 'review', nextReview: 'today' }
  ];

  // Mock AI suggestions
  const mockAISuggestions: AISuggestion[] = [
    {
      id: '1',
      type: 'alert',
      title: 'Low Engagement Alert',
      description: 'Student hasn\'t logged in for 3 consecutive days. Consider sending a check-in message.',
      confidence: 0.87,
      action: 'Send Message'
    },
    {
      id: '2',
      type: 'suggestion',
      title: 'Recommend Reteach Module',
      description: 'Trigonometry mastery is below 50%. A targeted review module could help.',
      confidence: 0.82,
      action: 'Assign Module'
    },
    {
      id: '3',
      type: 'opportunity',
      title: 'Ready for Advancement',
      description: 'Student shows high consistency in Linear Equations. Consider advancing to next topic.',
      confidence: 0.91,
      action: 'Adjust Path'
    }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default: return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return 'bg-green-500';
      case 'learning': return 'bg-blue-500';
      case 'review': return 'bg-yellow-500';
      case 'struggling': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Award className="w-5 h-5 text-blue-500" />;
      case 'login': return <Activity className="w-5 h-5 text-green-500" />;
      case 'emotion_spike': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'intervention': return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case 'achievement': return <Zap className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleViewStudent = async (student: Student) => {
    console.log('👀 [Admin Students] Viewing student:', student.name);
    setSelectedStudent(student);
    setViewMode('detail');
    await fetchStudentDetail(student.id);
  };

  if (viewMode === 'detail' && selectedStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setViewMode('list')}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2 mb-4"
          >
            ← Back to Students
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                {selectedStudent.avatar}
              
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedStudent.name}</h1>
                <p className="text-gray-600">{selectedStudent.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Class {selectedStudent.class}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(selectedStudent.riskLevel)}`}>
                    {selectedStudent.riskLevel.toUpperCase()} Risk
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Target className="w-4 h-4" />
                Adjust Path
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Current XP</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{selectedStudent.currentXP}</p>
            <p className="text-sm text-green-600">+{selectedStudent.xpChange}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Mastery</span>
              <Award className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{selectedStudent.masteryPercentage}%</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Emotion Score</span>
              <Heart className="w-4 h-4 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{selectedStudent.emotionScore}/10</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Last Active</span>
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-900">{selectedStudent.lastActive}</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: PLG Skills + Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* PLG Skills Mini-Map */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Personal Learning Graph
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(studentDetail?.plgSkills || mockPLGSkills).map((skill: any, idx: number) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-600">{skill.name}</span>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(skill.status)}`} />
                    </div>
                    <div className="mb-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${skill.mastery * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {skill.predictedGain ? (
                        <span className="text-green-600">+{Math.round(skill.predictedGain * 100)}% gain predicted</span>
                      ) : skill.nextReview ? (
                        <span>Review in {skill.nextReview}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Activity Timeline
              </h2>
              <div className="space-y-4">
                {(studentDetail?.timeline || mockTimeline).map((event: any) => (
                  <div key={event.id} className="flex gap-4 border-l-2 border-gray-200 pl-4 pb-4 last:pb-0">
                    <div className="mt-1">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        <span className="text-xs text-gray-500">{event.timestamp}</span>
                      </div>
                      {event.details && (
                        <p className="text-sm text-gray-600 mt-1">{event.details}</p>
                      )}
                      {event.xpGained && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          +{event.xpGained} XP
                        </span>
                      )}
                      {event.emotionChange && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-gray-600">{event.emotionChange.from}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <span className="text-blue-600 font-medium">{event.emotionChange.to}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: AI Suggestions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-500" />
              AI Suggestions
            </h2>
            <div className="space-y-4">
              {(studentDetail?.aiSuggestions || mockAISuggestions).map((suggestion: any) => {
                const bgColor = 
                  suggestion.type === 'alert' ? 'bg-red-50 border-red-200' :
                  suggestion.type === 'suggestion' ? 'bg-blue-50 border-blue-200' :
                  'bg-green-50 border-green-200';
                
                const icon =
                  suggestion.type === 'alert' ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                  suggestion.type === 'suggestion' ? <Brain className="w-5 h-5 text-blue-500" /> :
                  <Zap className="w-5 h-5 text-green-500" />;

                return (
                  <div key={suggestion.id} className={`border rounded-lg p-4 ${bgColor}`}>
                    <div className="flex items-start gap-3 mb-3">
                      {icon}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm">{suggestion.title}</h3>
                        <p className="text-xs text-gray-700 mt-1">{suggestion.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                      <button className="px-3 py-1 bg-white text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors">
                        {suggestion.action}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-700">
                <strong className="text-purple-700">💡 AI Tip:</strong> These suggestions are generated in real-time based on PLG, XP, and emotion data. Click &quot;Apply&quot; to execute automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Student Insights Hub
        </h1>
        <p className="text-gray-600">Track student behavior, emotions, and progress in real-time</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Classes</option>
            <option value="10A">Class 10A</option>
            <option value="10B">Class 10B</option>
            <option value="10C">Class 10C</option>
          </select>

          {/* Risk Filter */}
          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      )}

      {/* Students Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4">
          {students.map((student) => (
          <div
            key={student.id}
            className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {student.avatar}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-600">{student.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {student.class}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(student.riskLevel)}`}>
                      {student.riskLevel.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {/* XP */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">XP</p>
                  <p className="text-xl font-bold text-gray-900">{student.currentXP}</p>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    {student.xpChange > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : student.xpChange < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-500" />
                    )}
                    <span className={student.xpChange > 0 ? 'text-green-600' : student.xpChange < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {student.xpChange > 0 ? '+' : ''}{student.xpChange}%
                    </span>
                  </div>
                </div>

                {/* Mastery */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Mastery</p>
                  <div className="relative w-16 h-16">
                    <svg className="transform -rotate-90 w-16 h-16">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#e5e7eb"
                        strokeWidth="4"
                        fill="none"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="url(#gradient)"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${student.masteryPercentage * 1.76} 176`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
                      {student.masteryPercentage}%
                    </span>
                  </div>
                </div>

                {/* Emotion */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Emotion</p>
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    <p className="text-xl font-bold text-gray-900">{student.emotionScore}</p>
                    <span className="text-sm text-gray-600">/10</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleViewStudent(student)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600">Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  );
}

