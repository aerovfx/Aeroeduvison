'use client';

/**
 * Multi-Disciplinary Learning Paths Dashboard
 * For teachers to manage cross-domain learning paths
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BookOpen, Users, Brain, Network, CheckCircle, Clock,
  AlertTriangle, TrendingUp, MessageSquare, Eye, Plus,
  GitBranch, Target, Award, Sparkles, ChevronRight
} from 'lucide-react';

interface LearningPath {
  id: string;
  studentName: string;
  title: string;
  involvedDomains: string[];
  progress: number;
  status: string;
  mentors: string[];
  transitionsCount: number;
  lastUpdate: string;
}

export default function MultiDisciplinaryPathsPage() {
  const { t } = useLanguage();
  
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      setLoading(true);

      // Mock data - in production, fetch from API
      const mockPaths: LearningPath[] = [
        {
          id: 'path_1',
          studentName: 'Nguyễn Văn A',
          title: 'Lộ trình: AI & Âm nhạc',
          involvedDomains: ['Toán học', 'Vật lý', 'Âm nhạc', 'Tin học'],
          progress: 45,
          status: 'active',
          mentors: ['Mentor Toán', 'Mentor Vật lý', 'Mentor Âm nhạc', 'Mentor Tin học'],
          transitionsCount: 3,
          lastUpdate: '2 giờ trước',
        },
        {
          id: 'path_2',
          studentName: 'Trần Thị B',
          title: 'Lộ trình: Thiết kế & Lập trình Web',
          involvedDomains: ['Nghệ thuật', 'Tin học'],
          progress: 78,
          status: 'active',
          mentors: ['Mentor Nghệ thuật', 'Mentor Tin học'],
          transitionsCount: 2,
          lastUpdate: '1 ngày trước',
        },
        {
          id: 'path_3',
          studentName: 'Lê Văn C',
          title: 'Lộ trình: Sinh học & AI',
          involvedDomains: ['Sinh học', 'Tin học', 'Toán học'],
          progress: 20,
          status: 'pending',
          mentors: ['Mentor Sinh học', 'Mentor Tin học', 'Mentor Toán'],
          transitionsCount: 2,
          lastUpdate: '3 giờ trước',
        },
      ];

      setPaths(mockPaths);
    } catch (error) {
      console.error('Error loading paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPaths = paths.filter(path => {
    if (filter === 'all') return true;
    return path.status === filter;
  });

  const getDomainColor = (domain: string): string => {
    const colors: Record<string, string> = {
      'Toán học': 'bg-blue-100 text-blue-700',
      'Vật lý': 'bg-purple-100 text-purple-700',
      'Hóa học': 'bg-green-100 text-green-700',
      'Sinh học': 'bg-emerald-100 text-emerald-700',
      'Tin học': 'bg-indigo-100 text-indigo-700',
      'Âm nhạc': 'bg-pink-100 text-pink-700',
      'Nghệ thuật': 'bg-rose-100 text-rose-700',
      'Ngôn ngữ': 'bg-yellow-100 text-yellow-700',
    };
    return colors[domain] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải lộ trình học...</p>
            </div>
          </div>
        </div>
      
              </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🎼 Lộ trình Đa Chuyên Môn
              </h1>
              <p className="text-gray-600">
                AI-Orchestrated Multi-Disciplinary Learning Paths
              </p>
            </div>
            <button
              onClick={() => router.push('/teacher/multi-disciplinary-paths/create')}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo lộ trình mới</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Network className="w-8 h-8 text-purple-500" />
                <span className="text-2xl font-bold text-gray-900">{paths.length}</span>
              </div>
              <div className="text-sm text-gray-600">Tổng lộ trình</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <span className="text-2xl font-bold text-gray-900">
                  {paths.filter(p => p.status === 'active').length}
                </span>
              </div>
              <div className="text-sm text-gray-600">Đang hoạt động</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-8 h-8 text-orange-500" />
                <span className="text-2xl font-bold text-gray-900">
                  {paths.filter(p => p.status === 'pending').length}
                </span>
              </div>
              <div className="text-sm text-gray-600">Chờ xác nhận</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <GitBranch className="w-8 h-8 text-blue-500" />
                <span className="text-2xl font-bold text-gray-900">
                  {paths.reduce((sum, p) => sum + p.transitionsCount, 0)}
                </span>
              </div>
              <div className="text-sm text-gray-600">Điểm chuyển ngành</div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm">
            {['all', 'active', 'pending', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === status
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status === 'all' && 'Tất cả'}
                {status === 'active' && 'Đang hoạt động'}
                {status === 'pending' && 'Chờ xác nhận'}
                {status === 'completed' && 'Hoàn thành'}
              </button>
            ))}
          </div>
        </div>

        {/* Paths List */}
        <div className="space-y-4">
          {filteredPaths.map((path) => (
            <div
              key={path.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{path.title}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          path.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : path.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {path.status === 'active' && 'Đang học'}
                        {path.status === 'pending' && 'Chờ duyệt'}
                        {path.status === 'completed' && 'Hoàn thành'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{path.studentName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{path.lastUpdate}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <GitBranch className="w-4 h-4" />
                        <span>{path.transitionsCount} chuyển ngành</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push(`/teacher/multi-disciplinary-paths/${path.id}`)}
                      className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem chi tiết</span>
                    </button>
                    <button className="flex items-center space-x-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>

                {/* Domains */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Lĩnh vực liên quan:</div>
                  <div className="flex flex-wrap gap-2">
                    {path.involvedDomains.map((domain, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getDomainColor(domain)}`}
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mentors */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Giáo viên phụ trách:</div>
                  <div className="flex flex-wrap gap-2">
                    {path.mentors.map((mentor, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full"
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs">
                          {mentor.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-700">{mentor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Tiến độ</span>
                    <span className="text-xs font-bold text-purple-600">{path.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${path.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPaths.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có lộ trình học nào
            </h3>
            <p className="text-gray-600 mb-6">
              Tạo lộ trình đa chuyên môn đầu tiên cho học sinh
            </p>
            <button
              onClick={() => router.push('/teacher/multi-disciplinary-paths/create')}
              className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo lộ trình mới</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

