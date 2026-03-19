'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3, TrendingUp, Users, Target, Award, Brain, Zap,
  Download, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AnalyticsData {
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  engagementScore: number;
  topPerformingStudents: Array<{
    name: string;
    score: number;
    improvement: number;
  }>;
  strugglingStudents: Array<{
    name: string;
    score: number;
    issues: string[];
  }>;
  subjectPerformance: Array<{
    subject: string;
    averageScore: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  weeklyProgress: Array<{
    week: string;
    completion: number;
    averageScore: number;
  }>;
}

export default function TeacherAnalyticsPage() {
  const { t } = useLanguage();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'semester'>('month');

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        let studentsData: any[] = [];
        try {
          const studentsResponse = await fetch('/api/teacher/students');
          if (studentsResponse.ok) {
            const studentsResult = await studentsResponse.json();
            studentsData = studentsResult.students || [];
          }
        } catch (error) {
          console.error('Error fetching students:', error);
        }

        const topPerformingStudents = studentsData
          .sort((a, b) => b.averageScore - a.averageScore)
          .slice(0, 3)
          .map((s: any) => ({
            name: s.name,
            score: s.averageScore,
            improvement: s.improvement || 0,
          }));

        const strugglingStudents = studentsData
          .filter((s: any) => s.averageScore < 70)
          .sort((a: any, b: any) => a.averageScore - b.averageScore)
          .slice(0, 2)
          .map((s: any) => ({
            name: s.name,
            score: s.averageScore,
            issues: ['Cần cải thiện', 'Cần hỗ trợ thêm'],
          }));

        const totalStudents = studentsData.length || 25;
        const averageScore = studentsData.length > 0
          ? studentsData.reduce((sum: number, s: any) => sum + s.averageScore, 0) / studentsData.length
          : 78.5;
        const completionRate = studentsData.length > 0
          ? studentsData.reduce((sum: number, s: any) => sum + s.progress, 0) / studentsData.length
          : 85.2;
        const engagementScore = studentsData.length > 0
          ? studentsData.reduce((sum: number, s: any) => sum + s.engagement, 0) / studentsData.length
          : 72.8;

        const mockData: AnalyticsData = {
          totalStudents,
          averageScore: Math.round(averageScore * 10) / 10,
          completionRate: Math.round(completionRate * 10) / 10,
          engagementScore: Math.round(engagementScore * 10) / 10,
          topPerformingStudents: topPerformingStudents.length > 0
            ? topPerformingStudents
            : [
                { name: 'Nguyễn Văn A', score: 95, improvement: 12 },
                { name: 'Trần Thị B', score: 92, improvement: 8 },
                { name: 'Lê Văn C', score: 89, improvement: 15 },
              ],
          strugglingStudents: strugglingStudents.length > 0
            ? strugglingStudents
            : [
                { name: 'Phạm Thị D', score: 45, issues: ['Đạo hàm', 'Tích phân'] },
                { name: 'Hoàng Văn E', score: 52, issues: ['Cơ học', 'Động lực học'] },
              ],
          subjectPerformance: [
            { subject: 'Toán học', averageScore: 82.3, trend: 'up' },
            { subject: 'Vật lý', averageScore: 75.1, trend: 'stable' },
            { subject: 'Hóa học', averageScore: 78.9, trend: 'up' },
          ],
          weeklyProgress: [
            { week: 'Tuần 1', completion: 78, averageScore: 72 },
            { week: 'Tuần 2', completion: 82, averageScore: 75 },
            { week: 'Tuần 3', completion: 85, averageScore: 78 },
            { week: 'Tuần 4', completion: 88, averageScore: 81 },
          ],
        };

        setAnalytics(mockData);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedPeriod]);

  const handleExportReport = () => {
    console.log('Exporting report...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Không thể tải dữ liệu phân tích</p>
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
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">Phân tích hiệu suất học tập</p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {(['week', 'month', 'semester'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedPeriod === period
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period === 'week' ? 'Tuần' : period === 'month' ? 'Tháng' : 'Học kỳ'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportReport}
                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo
              </button>
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
              <span className="text-2xl font-bold text-gray-900">{analytics.totalStudents}</span>
            </div>
            <div className="text-sm text-gray-600">Tổng học sinh</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</span>
            </div>
            <div className="text-sm text-gray-600">Điểm trung bình</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</span>
            </div>
            <div className="text-sm text-gray-600">Tỷ lệ hoàn thành</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{analytics.engagementScore}%</span>
            </div>
            <div className="text-sm text-gray-600">Mức độ tương tác</div>
          </div>
        </div>

        {/* Top & Struggling Students */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Performing Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Học sinh xuất sắc</h2>
            </div>
            <div className="space-y-3">
              {analytics.topPerformingStudents.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-50/50 border border-yellow-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">+{student.improvement}%</p>
                    <p className="text-xs text-gray-500">Cải thiện</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Struggling Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Brain className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Học sinh cần hỗ trợ</h2>
            </div>
            <div className="space-y-3">
              {analytics.strugglingStudents.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-50/50 border border-red-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center text-white font-bold text-sm">
                      !
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                      <p className="text-xs text-red-600">Khó khăn: {student.issues.join(', ')}</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
                    Hỗ trợ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Hiệu suất theo môn học</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.subjectPerformance.map((subject, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{subject.subject}</h3>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    subject.trend === 'up' ? 'text-green-600' :
                    subject.trend === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {subject.trend === 'up' ? <ArrowUp className="w-3 h-3" /> :
                     subject.trend === 'down' ? <ArrowDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {subject.trend === 'up' ? 'Tăng' : subject.trend === 'down' ? 'Giảm' : 'Ổn định'}
                  </span>
                </div>
                <div className="text-3xl font-bold text-purple-600 mb-3">
                  {subject.averageScore}%
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    style={{ width: `${subject.averageScore}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Tiến độ theo tuần</h2>
          <div className="space-y-3">
            {analytics.weeklyProgress.map((week, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{week.week}</h3>
                    <p className="text-sm text-gray-600">Hoàn thành: {week.completion}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{week.averageScore}%</p>
                  <p className="text-xs text-gray-500">Điểm TB</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
