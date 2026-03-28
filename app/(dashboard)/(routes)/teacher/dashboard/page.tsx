"use client";

import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, Brain, AlertTriangle, Trophy,
  Activity, MessageSquare, Eye, BarChart3, Heart, CheckCircle,
  Search
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllStudentsDataForTeacher, getClassStatistics } from '@/lib/teacher-data-access';

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
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classStats, setClassStats] = useState<ClassStats | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'engagement' | 'emotion'>('overview');
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = async () => {
    try {
      const response = await fetch('/api/teacher/students');
      if (response.ok) {
        const data = await response.json();
        const studentsData = (data.students || []).map((s: any) => ({
          id: s.id, name: s.name, email: s.email, avatar: s.avatar,
          totalXP: s.totalXP, progress: s.progress, averageScore: s.averageScore,
          lessonsCompleted: s.lessonsCompleted, lastActive: s.lastActive,
          emotion: s.emotion, atRisk: s.atRisk, engagement: s.engagement, streak: s.streak,
        }));
        setStudents(studentsData);

        const totalStudents = studentsData.length;
        const averageXP = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.totalXP, 0) / totalStudents) : 0;
        const averageProgress = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.progress, 0) / totalStudents) : 0;
        const averageScore = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.averageScore, 0) / totalStudents) : 0;
        const totalLessonsCompleted = studentsData.reduce((sum: number, s: any) => sum + s.lessonsCompleted, 0);
        const averageEngagement = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.engagement, 0) / totalStudents) : 0;
        const atRiskCount = studentsData.filter((s: any) => s.atRisk).length;

        setClassStats({ totalStudents, averageXP, averageProgress, averageScore, totalLessonsCompleted, averageEngagement, atRiskCount });
      } else {
        const realStudents = getAllStudentsDataForTeacher();
        const realStats = getClassStatistics();
        setStudents(realStudents);
        setClassStats(realStats);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
      const realStudents = getAllStudentsDataForTeacher();
      const realStats = getClassStatistics();
      setStudents(realStudents);
      setClassStats(realStats);
    } finally {
      setLoading(false);
    }
  };

  const emotionIcons = { happy: '😊', neutral: '😐', sad: '😢' };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu lớp học...</p>
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
            {/* Left: Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
                <p className="text-sm text-gray-600">Theo dõi và quản lý lớp học</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/teacher/analytics')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/teacher/classes')}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Quản lý lớp
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Time Range */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {(['week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === 'week' ? 'Tuần này' : range === 'month' ? 'Tháng này' : 'Tất cả'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{classStats?.totalStudents || 0}</span>
            </div>
            <div className="text-sm text-gray-600">Tổng số học sinh</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{classStats?.averageXP || 0}</span>
            </div>
            <div className="text-sm text-gray-600">XP trung bình</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{classStats?.averageProgress || 0}%</span>
            </div>
            <div className="text-sm text-gray-600">Tiến độ trung bình</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                classStats?.atRiskCount || 0 > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <AlertTriangle className={`w-6 h-6 ${
                  classStats?.atRiskCount || 0 > 0 ? 'text-red-500' : 'text-green-500'
                }`} />
              </div>
              <span className={`text-2xl font-bold ${
                classStats?.atRiskCount || 0 > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {classStats?.atRiskCount || 0}
              </span>
            </div>
            <div className="text-sm text-gray-600">Cần hỗ trợ</div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-1 p-2 border-b border-gray-200">
            {[
              { id: 'overview' as const, label: 'Tổng quan', icon: BarChart3 },
              { id: 'engagement' as const, label: 'Tương tác', icon: Activity },
              { id: 'emotion' as const, label: 'Cảm xúc', icon: Heart },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedView === view.id
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Học sinh</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">XP</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Tiến độ</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Điểm TB</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Cảm xúc</th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                  <th className="text-right p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-700">{student.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900">{student.totalXP} XP</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full" style={{ width: `${student.progress}%` }} />
                        </div>
                        <span className="text-sm text-gray-600">{student.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        {student.averageScore}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-2xl">{emotionIcons[student.emotion]}</span>
                    </td>
                    <td className="p-4">
                      {student.atRisk ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" />
                          Cần hỗ trợ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3 h-3" />
                          Ổn định
                        </span>
                      )}
                    </td>
                    <td className="text-right p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/teacher/student/${student.id}`)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => router.push(`/teacher/interaction-center?student=${student.id}`)}
                          className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Tương tác"
                        >
                          <MessageSquare className="w-4 h-4 text-purple-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
