'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  BookOpen, Clock, CheckCircle, Play, Star, Target, TrendingUp,
  Filter, Search, Calendar, Award, Zap, Brain, FileText, 
  Eye, Download, Share2, MoreVertical, Plus, RefreshCw
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  type: 'lesson' | 'quiz' | 'project' | 'ai-generated';
  status: 'completed' | 'in-progress' | 'pending' | 'recommended';
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number; // minutes
  xpReward: number;
  accuracy?: number;
  completedAt?: Date;
  assignedAt: Date;
  description: string;
  tags: string[];
  aiGenerated?: boolean;
  progress?: number;
}

export default function AssignmentsPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress' | 'pending' | 'recommended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'xp' | 'difficulty' | 'progress'>('date');

  // Load assignments from localStorage on mount
  useEffect(() => {
    const savedAssignments = localStorage.getItem('ai-tutor-assignments');
    if (savedAssignments) {
      const parsed = JSON.parse(savedAssignments);
      // Convert date strings back to Date objects
      const withDates = parsed.map((assignment: any) => ({
        ...assignment,
        assignedAt: new Date(assignment.assignedAt),
        completedAt: assignment.completedAt ? new Date(assignment.completedAt) : undefined
      }));
      setAssignments(withDates);
    } else {
      // Initialize with demo data
      const demoAssignments = getDemoAssignments();
      setAssignments(demoAssignments);
      localStorage.setItem('ai-tutor-assignments', JSON.stringify(demoAssignments));
    }
  }, []);

  const getDemoAssignments = (): Assignment[] => [
    // Completed assignments
    {
      id: 'math-quadratic-1',
      title: 'Phương trình bậc hai',
      subject: 'mathematics',
      type: 'lesson',
      status: 'completed',
      difficulty: 'medium',
      duration: 45,
      xpReward: 150,
      accuracy: 92,
      completedAt: new Date('2024-10-18'),
      assignedAt: new Date('2024-10-18'),
      description: 'Giải các bài toán phương trình bậc hai từ cơ bản đến nâng cao',
      tags: ['algebra', 'quadratic', 'problem-solving'],
      aiGenerated: true,
      progress: 100
    },
    {
      id: 'physics-motion-1',
      title: 'Chuyển động thẳng đều',
      subject: 'physics',
      type: 'lesson',
      status: 'completed',
      difficulty: 'easy',
      duration: 30,
      xpReward: 100,
      accuracy: 88,
      completedAt: new Date('2024-10-17'),
      assignedAt: new Date('2024-10-17'),
      description: 'Phân tích chuyển động thẳng đều và các đại lượng liên quan',
      tags: ['kinematics', 'motion', 'velocity'],
      aiGenerated: true,
      progress: 100
    },
    {
      id: 'chemistry-atom-1',
      title: 'Cấu tạo nguyên tử',
      subject: 'chemistry',
      type: 'lesson',
      status: 'completed',
      difficulty: 'hard',
      duration: 55,
      xpReward: 180,
      accuracy: 95,
      completedAt: new Date('2024-10-16'),
      assignedAt: new Date('2024-10-16'),
      description: 'Tìm hiểu cấu trúc nguyên tử và các hạt cơ bản',
      tags: ['atomic-structure', 'protons', 'electrons'],
      aiGenerated: true,
      progress: 100
    },

    // In-progress assignments
    {
      id: 'math-integral-1',
      title: 'Tích phân cơ bản',
      subject: 'mathematics',
      type: 'lesson',
      status: 'in-progress',
      difficulty: 'hard',
      duration: 60,
      xpReward: 200,
      assignedAt: new Date('2024-10-18'),
      description: 'Học về tích phân và các phương pháp tính tích phân',
      tags: ['calculus', 'integration', 'advanced'],
      aiGenerated: true,
      progress: 65
    },
    {
      id: 'physics-newton-1',
      title: 'Định luật Newton',
      subject: 'physics',
      type: 'lesson',
      status: 'in-progress',
      difficulty: 'medium',
      duration: 40,
      xpReward: 130,
      assignedAt: new Date('2024-10-17'),
      description: 'Áp dụng các định luật Newton trong giải bài tập',
      tags: ['newton-laws', 'mechanics', 'forces'],
      aiGenerated: true,
      progress: 30
    },

    // Pending assignments
    {
      id: 'chemistry-organic-1',
      title: 'Hóa hữu cơ cơ bản',
      subject: 'chemistry',
      type: 'lesson',
      status: 'pending',
      difficulty: 'medium',
      duration: 50,
      xpReward: 160,
      assignedAt: new Date('2024-10-19'),
      description: 'Tìm hiểu các hợp chất hữu cơ và phản ứng cơ bản',
      tags: ['organic-chemistry', 'compounds', 'reactions'],
      aiGenerated: true,
      progress: 0
    },
    {
      id: 'math-linear-1',
      title: 'Phương trình bậc nhất',
      subject: 'mathematics',
      type: 'lesson',
      status: 'pending',
      difficulty: 'easy',
      duration: 25,
      xpReward: 80,
      assignedAt: new Date('2024-10-19'),
      description: 'Ôn tập và nâng cao kỹ năng giải phương trình bậc nhất',
      tags: ['linear-equations', 'algebra', 'basic'],
      aiGenerated: true,
      progress: 0
    },

    // AI Recommended assignments
    {
      id: 'ai-recommend-1',
      title: 'Bài tập tổng hợp Toán-Lý',
      subject: 'mathematics',
      type: 'project',
      status: 'recommended',
      difficulty: 'medium',
      duration: 90,
      xpReward: 250,
      assignedAt: new Date('2024-10-19'),
      description: 'AI đề xuất: Bài tập liên môn giúp củng cố kiến thức Toán và Vật lý',
      tags: ['interdisciplinary', 'problem-solving', 'ai-recommended'],
      aiGenerated: true,
      progress: 0
    },
    {
      id: 'ai-recommend-2',
      title: 'Thử thách lập trình Python',
      subject: 'programming',
      type: 'project',
      status: 'recommended',
      difficulty: 'hard',
      duration: 120,
      xpReward: 300,
      assignedAt: new Date('2024-10-19'),
      description: 'AI đề xuất: Dựa trên tiến độ học tập, thử thách này sẽ giúp bạn phát triển kỹ năng lập trình',
      tags: ['python', 'programming', 'challenge', 'ai-recommended'],
      aiGenerated: true,
      progress: 0
    }
  ];

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = filter === 'all' || assignment.status === filter;
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    switch (sortBy) {
      case 'xp':
        return b.xpReward - a.xpReward;
      case 'difficulty':
        const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      case 'progress':
        return (b.progress || 0) - (a.progress || 0);
      default:
        return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'recommended': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'mathematics': return '🧮';
      case 'physics': return '⚛️';
      case 'chemistry': return '🧪';
      case 'biology': return '🧬';
      case 'programming': return '💻';
      case 'ai_ml': return '🤖';
      default: return '📚';
    }
  };

  const startAssignment = (assignment: Assignment) => {
    // Navigate to AI-generated lesson page using Next.js router
    // This ensures proper client-side navigation without cache issues
    console.log('🚀 Starting assignment:', assignment.id, assignment.title);
    router.push(`/learning-paths/lesson/${assignment.id}`);
  };

  const refreshAssignments = () => {
    // Simulate refreshing assignments from AI
    const newAssignments = [...assignments];
    // Add some AI recommendations
    const aiRecommendation: Assignment = {
      id: `ai-rec-${Date.now()}`,
      title: 'AI Đề xuất: Bài học mới',
      subject: 'mathematics',
      type: 'lesson',
      status: 'recommended',
      difficulty: 'medium',
      duration: 40,
      xpReward: 120,
      assignedAt: new Date(),
      description: 'AI đã phân tích tiến độ học tập và đề xuất bài học này',
      tags: ['ai-recommended', 'personalized'],
      aiGenerated: true,
      progress: 0
    };
    
    newAssignments.unshift(aiRecommendation);
    setAssignments(newAssignments);
    localStorage.setItem('ai-tutor-assignments', JSON.stringify(newAssignments));
  };

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    inProgress: assignments.filter(a => a.status === 'in-progress').length,
    pending: assignments.filter(a => a.status === 'pending').length,
    recommended: assignments.filter(a => a.status === 'recommended').length,
    totalXP: assignments.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.xpReward, 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📝 AI Assignments</h1>
              <p className="text-blue-100">Quản lý bài học và bài tập được AI đề xuất</p>
            
              </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.totalXP} XP</div>
              <div className="text-blue-100">Total Earned</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.recommended}</div>
            <div className="text-sm text-gray-600">AI Recommended</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {(['all', 'completed', 'in-progress', 'pending', 'recommended'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === filterType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filterType === 'all' && 'All'}
                  {filterType === 'completed' && '✅ Completed'}
                  {filterType === 'in-progress' && '🔄 In Progress'}
                  {filterType === 'pending' && '⏳ Pending'}
                  {filterType === 'recommended' && '🤖 AI Recommended'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Sort by Date</option>
                <option value="xp">Sort by XP</option>
                <option value="difficulty">Sort by Difficulty</option>
                <option value="progress">Sort by Progress</option>
              </select>

              <button
                onClick={refreshAssignments}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh AI
              </button>
            </div>
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getSubjectIcon(assignment.subject)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{assignment.title}</h3>
                    <p className="text-sm text-gray-600 capitalize">{assignment.subject}</p>
                  </div>
                </div>
                {assignment.aiGenerated && (
                  <div className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    🤖 AI
                  </div>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{assignment.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                  {assignment.status === 'completed' && '✅ Completed'}
                  {assignment.status === 'in-progress' && '🔄 In Progress'}
                  {assignment.status === 'pending' && '⏳ Pending'}
                  {assignment.status === 'recommended' && '🤖 Recommended'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                  {assignment.difficulty}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{assignment.duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">XP Reward:</span>
                  <span className="font-medium text-green-600">+{assignment.xpReward}</span>
                </div>
                {assignment.accuracy && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-medium text-blue-600">{assignment.accuracy}%</span>
                  </div>
                )}
                {assignment.progress !== undefined && assignment.progress > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress:</span>
                    <span className="font-medium text-purple-600">{assignment.progress}%</span>
                  </div>
                )}
              </div>

              {assignment.progress !== undefined && assignment.progress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                    style={{ width: `${assignment.progress}%` }}
                  ></div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => startAssignment(assignment)}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                    assignment.status === 'completed'
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  disabled={assignment.status === 'completed'}
                >
                  {assignment.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      {assignment.status === 'in-progress' ? 'Continue' : 'Start'}
                    </>
                  )}
                </button>
                <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Assigned: {assignment.assignedAt.toLocaleDateString()}
                {assignment.completedAt && (
                  <span className="ml-2">
                    Completed: {assignment.completedAt.toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {sortedAssignments.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
