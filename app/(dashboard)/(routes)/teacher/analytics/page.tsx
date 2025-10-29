'use client';

import { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Users, Target, Calendar, Award, Brain, Zap } from 'lucide-react';
import { updateButtonHandlers } from '../update-event-handlers';
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
    // Simulate loading analytics data
    const loadAnalytics = async () => {
      setLoading(true);
      
      try {
        console.log('📊 [Analytics] Loading teacher analytics...');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockData: AnalyticsData = {
          totalStudents: 25,
          averageScore: 78.5,
          completionRate: 85.2,
          engagementScore: 72.8,
          topPerformingStudents: [
            { name: 'Nguyễn Văn A', score: 95, improvement: 12 },
            { name: 'Trần Thị B', score: 92, improvement: 8 },
            { name: 'Lê Văn C', score: 89, improvement: 15 }
          ],
          strugglingStudents: [
            { name: 'Phạm Thị D', score: 45, issues: ['Đạo hàm', 'Tích phân'] },
            { name: 'Hoàng Văn E', score: 52, issues: ['Cơ học', 'Động lực học'] }
          ],
          subjectPerformance: [
            { subject: 'Toán học', averageScore: 82.3, trend: 'up' },
            { subject: 'Vật lý', averageScore: 75.1, trend: 'stable' },
            { subject: 'Hóa học', averageScore: 78.9, trend: 'up' }
          ],
          weeklyProgress: [
            { week: 'Tuần 1', completion: 78, averageScore: 72 },
            { week: 'Tuần 2', completion: 82, averageScore: 75 },
            { week: 'Tuần 3', completion: 85, averageScore: 78 },
            { week: 'Tuần 4', completion: 88, averageScore: 81 }
          ]
        };
        
        setAnalytics(mockData);
        console.log('✅ [Analytics] Analytics loaded successfully');
        
      } catch (error) {
        console.error('❌ [Analytics] Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedPeriod]);

  const handlePeriodChange = (period: 'week' | 'month' | 'semester') => {
    setSelectedPeriod(period);
    updateButtonHandlers.handlePeriodChange(period);
  };

  const handleExportReport = () => {
    updateButtonHandlers.handleExportReport('analytics');
  };

  const handleViewStudentDetail = (studentName: string) => {
    updateButtonHandlers.handleViewStudent(`student_${studentName.toLowerCase().replace(/\s+/g, '_')}`, studentName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu phân tích...</p>
              </div>
            </div>
          </div>
        </div>
      
              </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <p className="text-gray-600">Không thể tải dữ liệu phân tích</p>
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
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <BarChart className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">📊 Phân tích Chi tiết</h1>
                <p className="text-purple-100">Thống kê và phân tích hiệu suất học tập của lớp</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Period Selector */}
              <div className="flex bg-white/20 rounded-lg p-1">
                {(['week', 'month', 'semester'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodChange(period)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedPeriod === period
                        ? 'bg-white text-purple-600'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {period === 'week' ? 'Tuần' : period === 'month' ? 'Tháng' : 'Học kỳ'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportReport}
                className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
              >
                Xuất báo cáo
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tổng học sinh</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.totalStudents}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Điểm trung bình</p>
                <p className="text-3xl font-bold text-green-600">{analytics.averageScore}%</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tỷ lệ hoàn thành</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.completionRate}%</p>
              </div>
              <Target className="w-12 h-12 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Mức độ tương tác</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.engagementScore}%</p>
              </div>
              <Zap className="w-12 h-12 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performing Students */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3 text-yellow-500" />
              Học sinh xuất sắc
            </h2>
            <div className="space-y-4">
              {analytics.topPerformingStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-yellow-600 font-bold">#{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-600 font-semibold">+{student.improvement}%</p>
                    <p className="text-xs text-gray-500">Cải thiện</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Struggling Students */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Brain className="w-6 h-6 mr-3 text-red-500" />
              Học sinh cần hỗ trợ
            </h2>
            <div className="space-y-4">
              {analytics.strugglingStudents.map((student, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold">!</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <p className="text-sm text-gray-600">Điểm: {student.score}%</p>
                      <p className="text-xs text-red-600">Khó khăn: {student.issues.join(', ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewStudentDetail(student.name)}
                    className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
                  >
                    Hỗ trợ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Hiệu suất theo môn học</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.subjectPerformance.map((subject, index) => (
              <div key={index} className="p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{subject.subject}</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    subject.trend === 'up' ? 'bg-green-100 text-green-800' :
                    subject.trend === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {subject.trend === 'up' ? '↗ Tăng' : subject.trend === 'down' ? '↘ Giảm' : '→ Ổn định'}
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-2">{subject.averageScore}%</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${subject.averageScore}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tiến độ theo tuần</h2>
          <div className="space-y-4">
            {analytics.weeklyProgress.map((week, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
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
