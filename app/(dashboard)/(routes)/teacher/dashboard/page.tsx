'use client';

import { useState, useEffect } from 'react';
import {
  Users, TrendingUp, Brain, AlertTriangle, Star, Award,
  Activity, Calendar, Target, MessageSquare, Zap, Eye,
  BarChart3, Clock, Trophy, BookOpen, Heart, Send, CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllStudentsDataForTeacher, getClassStatistics } from '@/lib/teacher-data-access';
import { NeumorphicCard } from '@/components/ui/neumorphic-card';
import { NeumorphicButton } from '@/components/ui/neumorphic-button';
import { NeumorphicInput } from '@/components/ui/neumorphic-input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import '@/styles/neumorphic-theme.css';

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

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = async () => {
    try {
      const response = await fetch('/api/teacher/students')
      if (response.ok) {
        const data = await response.json()
        const studentsData = (data.students || []).map((s: any) => ({
          id: s.id, name: s.name, email: s.email, avatar: s.avatar,
          totalXP: s.totalXP, progress: s.progress, averageScore: s.averageScore,
          lessonsCompleted: s.lessonsCompleted, lastActive: s.lastActive,
          emotion: s.emotion, atRisk: s.atRisk, engagement: s.engagement, streak: s.streak,
        }))
        setStudents(studentsData)

        const totalStudents = studentsData.length
        const averageXP = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.totalXP, 0) / totalStudents) : 0
        const averageProgress = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.progress, 0) / totalStudents) : 0
        const averageScore = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.averageScore, 0) / totalStudents) : 0
        const totalLessonsCompleted = studentsData.reduce((sum: number, s: any) => sum + s.lessonsCompleted, 0)
        const averageEngagement = totalStudents > 0 ? Math.round(studentsData.reduce((sum: number, s: any) => sum + s.engagement, 0) / totalStudents) : 0
        const atRiskCount = studentsData.filter((s: any) => s.atRisk).length

        setClassStats({ totalStudents, averageXP, averageProgress, averageScore, totalLessonsCompleted, averageEngagement, atRiskCount })
      } else {
        const realStudents = getAllStudentsDataForTeacher();
        const realStats = getClassStatistics();
        setStudents(realStudents);
        setClassStats(realStats);
      }
    } catch (error) {
      console.error('Error loading class data:', error)
      const realStudents = getAllStudentsDataForTeacher();
      const realStats = getClassStatistics();
      setStudents(realStudents);
      setClassStats(realStats);
    } finally {
      setLoading(false);
    }
  };

  const emotionIcons = { happy: '😊', neutral: '😐', sad: '😢' }

  return (
    <div className="flex flex-col h-full neu-container">
      {/* Header with Gradient Text */}
      <div className="border-b bg-gradient-to-r from-white via-gray-50 to-white neu-shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard Giảng Dạy</h1>
              <p className="text-gray-600">Theo dõi và quản lý lớp học với AI insights</p>
            </div>
            <div className="flex gap-2">
              <NeumorphicButton variant="outline" onClick={() => router.push('/teacher/analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </NeumorphicButton>
              <NeumorphicButton variant="primary" onClick={() => router.push('/teacher/classes')}>
                <Users className="h-4 w-4 mr-2" />
                Quản lý lớp
              </NeumorphicButton>
            </div>
          </div>

          {/* Time Range Tabs */}
          <NeumorphicCard variant="default" size="sm" className="inline-block">
            <div className="flex gap-2">
              {(['week', 'month', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white neu-shadow'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {range === 'week' ? 'Tuần này' : range === 'month' ? 'Tháng này' : 'Tất cả'}
                </button>
              ))}
            </div>
          </NeumorphicCard>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="container mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Tổng số học sinh', value: classStats?.totalStudents || 0, color: 'from-blue-500 to-blue-600', icon: Users },
              { label: 'XP trung bình', value: classStats?.averageXP || 0, color: 'from-purple-500 to-purple-600', icon: Trophy },
              { label: 'Tiến độ trung bình', value: `${classStats?.averageProgress || 0}%`, color: 'from-green-500 to-green-600', icon: TrendingUp },
              { label: 'Cần hỗ trợ', value: classStats?.atRiskCount || 0, color: 'from-orange-500 to-orange-600', icon: AlertTriangle },
            ].map((stat) => (
              <NeumorphicCard key={stat.label} variant="gradient" hover className="text-center p-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center neu-shadow-inner`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                </div>
                <div className="text-sm text-gray-700">{stat.label}</div>
              </NeumorphicCard>
            ))}
          </div>

          {/* View Tabs */}
          <NeumorphicCard variant="default" size="md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                {[
                  { id: 'overview' as const, label: 'Tổng quan', icon: BarChart3 },
                  { id: 'engagement' as const, label: 'Tương tác', icon: Activity },
                  { id: 'emotion' as const, label: 'Cảm xúc', icon: Heart },
                ].map((view) => (
                  <button
                    key={view.id}
                    onClick={() => setSelectedView(view.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedView === view.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white neu-shadow'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <view.icon className="w-4 h-4" />
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
          </NeumorphicCard>

          {/* Students Table */}
          <NeumorphicCard variant="gradient" size="lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold text-gray-700">Học sinh</th>
                    <th className="text-left p-4 font-semibold text-gray-700">XP</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Tiến độ</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Điểm TB</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Cảm xúc</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-right p-4 font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-gray-600">Đang tải...</p>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                            <Users className="w-8 h-8 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700">Chưa có học sinh</h3>
                          <p className="text-gray-500">Thêm học sinh vào lớp của bạn</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center neu-shadow-inner">
                              <span className="text-blue-600 font-semibold">{student.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{student.name}</div>
                              <div className="text-xs text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white neu-shadow">
                            {student.totalXP} XP
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: `${student.progress}%` }} />
                            </div>
                            <span className="text-sm text-gray-600">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="neu-shadow-sm">{student.averageScore}</Badge>
                        </td>
                        <td className="p-4">
                          <span className="text-2xl">{emotionIcons[student.emotion]}</span>
                        </td>
                        <td className="p-4">
                          {student.atRisk ? (
                            <Badge className="bg-orange-100 text-orange-800 neu-shadow-sm">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Cần hỗ trợ
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 neu-shadow-sm">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ổn định
                            </Badge>
                          )}
                        </td>
                        <td className="text-right p-4">
                          <div className="flex justify-end gap-1">
                            <NeumorphicButton variant="outline" size="sm" onClick={() => router.push(`/teacher/student/${student.id}`)}>
                              <Eye className="w-4 h-4" />
                            </NeumorphicButton>
                            <NeumorphicButton variant="primary" size="sm" onClick={() => toast.success(`Gửi tin nhắn cho ${student.name}`)}>
                              <MessageSquare className="w-4 h-4" />
                            </NeumorphicButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </NeumorphicCard>
        </div>
      </div>
    </div>
  )
}
