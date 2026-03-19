'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Brain, Target, TrendingUp, TrendingDown, Award,
  BookOpen, Clock, Star, Zap, MessageSquare, Edit, Save,
  BarChart3, Activity, Heart, Eye, AlertCircle, CheckCircle,
  Calendar
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StudentInsightPage() {
  const { t } = useLanguage();
  
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'strengths' | 'velocity' | 'ai-feedback' | 'notes' | 'assessment'>('overview');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [softSkills, setSoftSkills] = useState({
    collaboration: 85,
    creativity: 78,
    criticalThinking: 90,
    communication: 82,
    problemSolving: 88
  });

  // Fetch student data from API
  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📊 [Student Detail] Fetching data for student ID: ${studentId}`);
        
        const response = await fetch(`/api/teacher/students/${studentId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Học sinh không tồn tại');
          }
          throw new Error('Không thể tải dữ liệu học sinh');
        }
        
        const data = await response.json();
        console.log(`✅ [Student Detail] Loaded data for: ${data.student.name}`);
        
        setStudent(data.student);
      } catch (err: any) {
        console.error('❌ [Student Detail] Error:', err);
        setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-blue-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu học sinh...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Quay lại Dashboard
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy học sinh</h2>
            <p className="text-gray-600 mb-4">{error || 'Học sinh không tồn tại'}</p>
            <button
              onClick={() => router.push('/teacher/dashboard')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Về Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const strengths = [
    { skill: 'Đại số', score: 92, trend: 'up' },
    { skill: 'Hình học', score: 88, trend: 'up' },
    { skill: 'Giải tích', score: 85, trend: 'stable' },
    { skill: 'Xác suất', score: 78, trend: 'down' },
    { skill: 'Logic toán học', score: 90, trend: 'up' }
  ];

  const weaknesses = [
    { topic: 'Phương trình vi phân', avgScore: 58, attempts: 3, recommendation: 'Thêm bài tập cơ bản' },
    { topic: 'Tích phân', avgScore: 62, attempts: 2, recommendation: 'Cần giảng giải chi tiết hơn' }
  ];

  const learningVelocity = {
    current: 1.8, // lessons per week
    classAverage: 1.5,
    trend: 'faster',
    consistency: 85
  };

  const aiFeedback = [
    {
      category: 'Learning Style',
      insight: 'Học sinh có xu hướng học tốt qua video và hình ảnh trực quan. Khả năng ghi nhớ qua text yếu hơn.',
      recommendation: 'Thêm visual modules và animation vào learning path.',
      confidence: 92
    },
    {
      category: 'Engagement Pattern',
      insight: 'Engagement cao nhất vào buổi sáng (8-10AM) và tối (7-9PM). Thấp nhất vào buổi chiều.',
      recommendation: 'Lên lịch bài tập quan trọng vào 2 khung giờ peak.',
      confidence: 88
    },
    {
      category: 'Skill Gap',
      insight: 'Học sinh mạnh về tư duy logic nhưng yếu về tính toán. Điểm số thấp chủ yếu do sai số tính toán.',
      recommendation: 'Thêm drill exercises cho kỹ năng tính toán nhanh.',
      confidence: 85
    },
    {
      category: t('emotion.motivation'),
      insight: 'Học sinh phản ứng tích cực với hệ thống XP và achievements. Streak 7 ngày cho thấy động lực cao.',
      recommendation: 'Tiếp tục khuyến khích qua gamification. Có thể thêm leaderboard.',
      confidence: 95
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-5xl">{student.avatar}</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{student.name}</h1>
                  <p className="text-gray-600 mb-2">{student.email}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Last active: {student.lastActive}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Joined: {new Date(student.joinedAt).toLocaleDateString('vi-VN')}
                    </span>
                  
              </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-orange-500">🔥</span>
                  <span className="text-2xl font-bold text-gray-900">{student.streak}</span>
                  <span className="text-sm text-gray-600">day streak</span>
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    student.engagement >= 80 ? 'bg-green-500' :
                    student.engagement >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">
                    Engagement: {student.engagement}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{student.totalXP}</p>
                <p className="text-sm text-gray-600">Total XP</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{student.lessonsCompleted}/{student.totalLessons}</p>
                <p className="text-sm text-gray-600">Lessons</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{student.averageScore}%</p>
                <p className="text-sm text-gray-600">Avg Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{student.progress}%</p>
                <p className="text-sm text-gray-600">{t('analytics.progress')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('strengths')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'strengths' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Strengths & Weaknesses
          </button>
          <button
            onClick={() => setActiveTab('velocity')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'velocity' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Learning Velocity
          </button>
          <button
            onClick={() => setActiveTab('ai-feedback')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'ai-feedback' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Brain className="h-4 w-4 inline mr-2" />
            AI Feedback
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'notes' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Teacher Notes
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'assessment' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Award className="h-4 w-4 inline mr-2" />
            Assessment
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* XP & Progress Timeline */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">XP & Progress Timeline</h3>
                  <div className="space-y-4">
                    {[
                      { date: 'Oct 18', xp: 150, lessons: 2, score: 88 },
                      { date: 'Oct 17', xp: 200, lessons: 3, score: 92 },
                      { date: 'Oct 16', xp: 100, lessons: 1, score: 78 },
                      { date: 'Oct 15', xp: 180, lessons: 2, score: 85 },
                      { date: 'Oct 14', xp: 120, lessons: 1, score: 82 }
                    ].map((day, idx) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600 w-16">{day.date}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{day.lessons} lessons</span>
                            <span className="text-sm text-purple-600 font-semibold">+{day.xp} XP</span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                              style={{ width: `${day.score}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">Score: {day.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emotion Timeline */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">😊 Emotion Timeline</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const emotions = ['happy', 'happy', 'neutral', 'happy', 'neutral', 'happy', 'happy'];
                      const emotion = emotions[idx];
                      return (
                        <div key={day} className="text-center">
                          <p className="text-xs text-gray-600 mb-2">{day}</p>
                          <div className={`rounded-lg p-4 ${
                            emotion === 'happy' ? 'bg-green-100' :
                            emotion === 'neutral' ? 'bg-yellow-100' : 'bg-red-100'
                          }`}>
                            {emotion === 'happy' && <span className="text-2xl">😊</span>}
                            {emotion === 'neutral' && <span className="text-2xl">😐</span>}
                            {emotion === 'sad' && <span className="text-2xl">😢</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses Tab */}
            {activeTab === 'strengths' && (
              <div className="space-y-6">
                {/* Strengths */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Star className="h-5 w-5 text-yellow-500 mr-2" />
                    Điểm mạnh
                  </h3>
                  <div className="space-y-4">
                    {strengths.map((item, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{item.skill}</span>
                          <div className="flex items-center space-x-2">
                            {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {item.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <span className="text-sm font-semibold text-purple-600">{item.score}%</span>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.score >= 90 ? 'bg-green-500' :
                              item.score >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${item.score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                    Điểm cần cải thiện
                  </h3>
                  <div className="space-y-4">
                    {weaknesses.map((item, idx) => (
                      <div key={idx} className="border-l-4 border-orange-500 bg-orange-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{item.topic}</span>
                          <span className="text-sm text-orange-600">
                            {item.attempts} attempts • {item.avgScore}%
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-3 mt-2">
                          <p className="text-sm text-gray-700">
                            <strong className="text-purple-600">🤖 AI Recommendation:</strong> {item.recommendation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Learning Velocity Tab */}
            {activeTab === 'velocity' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  🚀 Tốc độ Học tập
                </h3>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Học sinh này</p>
                    <p className="text-4xl font-bold text-purple-600 mb-1">{learningVelocity.current}</p>
                    <p className="text-sm text-gray-700">lessons/week</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600 mb-2">Trung bình lớp</p>
                    <p className="text-4xl font-bold text-blue-600 mb-1">{learningVelocity.classAverage}</p>
                    <p className="text-sm text-gray-700">lessons/week</p>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 rounded-r-lg p-4 mb-6">
                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 mb-1">Nhanh hơn trung bình</p>
                      <p className="text-sm text-green-800">
                        Học sinh này học nhanh hơn {((learningVelocity.current / learningVelocity.classAverage - 1) * 100).toFixed(0)}% 
                        so với trung bình lớp.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Tính nhất quán</span>
                    <span className="font-semibold text-purple-600">{learningVelocity.consistency}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full"
                      style={{ width: `${learningVelocity.consistency}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Học sinh có lịch học đều đặn, hiếm khi bỏ bài.
                  </p>
                </div>
              </div>
            )}

            {/* AI Feedback Tab */}
            {activeTab === 'ai-feedback' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center mb-4">
                    <Brain className="h-6 w-6 mr-2" />
                    <h3 className="text-lg font-semibold">AI Analysis Summary</h3>
                  </div>
                  <p className="text-purple-100 text-sm leading-relaxed">
                    &quot;Học sinh <strong>{student.name}</strong> có thiên hướng học qua <strong>video và visual content</strong>. 
                    Engagement cao nhất vào <strong>buổi sáng và tối</strong>. Mạnh về <strong>logic</strong> nhưng 
                    yếu về <strong>tính toán nhanh</strong>. Động lực học tập cao nhờ hệ thống gamification.&quot;
                  </p>
                </div>

                {aiFeedback.map((feedback, idx) => (
                  <div key={idx} className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">{feedback.category}</h4>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {feedback.confidence}% confidence
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>💡 Insight:</strong> {feedback.insight}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <strong className="text-purple-600">✨ Recommendation:</strong> {feedback.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Assessment Tab */}
            {activeTab === 'assessment' && (
              <div className="space-y-6">
                {/* Soft Skills Assessment */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="h-5 w-5 text-purple-600 mr-2" />
                    Năng lực Mềm (Soft Skills)
                  </h3>
                  
                  <div className="space-y-4">
                    {Object.entries(softSkills).map(([skill, score]) => (
                      <div key={skill} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {skill === 'collaboration' && '🤝 Hợp tác'}
                            {skill === 'creativity' && '🎨 Sáng tạo'}
                            {skill === 'criticalThinking' && '🧠 Tư duy phản biện'}
                            {skill === 'communication' && '💬 Giao tiếp'}
                            {skill === 'problemSolving' && '🔧 Giải quyết vấn đề'}
                          </span>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-semibold text-purple-600">{score}%</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={score}
                              onChange={(e) => setSoftSkills({
                                ...softSkills,
                                [skill]: parseInt(e.target.value)
                              })}
                              className="w-24"
                            />
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 85 ? 'bg-green-500' :
                              score >= 70 ? 'bg-blue-500' :
                              score >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="w-full mt-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                    <Save className="h-4 w-4 inline mr-2" />
                    Save Assessment
                  </button>
                </div>

                {/* Overall Rating */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ⭐ Đánh giá Tổng thể
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Academic Performance</p>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            className="h-6 w-6 text-yellow-500 fill-yellow-500 cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-2">Effort & Attitude</p>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            className="h-6 w-6 text-yellow-500 fill-yellow-500 cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong className="text-purple-600">🤖 AI Summary:</strong> 
                    </p>
                    <p className="text-sm text-gray-700">
                      Học sinh {student.name} thể hiện năng lực học tập tốt với điểm trung bình {student.averageScore}%. 
                      Đặc biệt xuất sắc về <strong>tư duy phản biện</strong> (90%) và <strong>giải quyết vấn đề</strong> (88%). 
                      Cần cải thiện thêm kỹ năng <strong>sáng tạo</strong>. 
                      Engagement cao ({student.engagement}%) cho thấy học sinh có động lực học tập tốt.
                    </p>
                  </div>
                </div>

                {/* Quick Feedback */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    💬 Quick Feedback
                  </h3>
                  <textarea
                    placeholder="Nhập phản hồi cho học sinh..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-2">
                      <button className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200">
                        👍 Positive
                      </button>
                      <button className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200">
                        💡 Suggestion
                      </button>
                      <button className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm hover:bg-orange-200">
                        ⚠️ Needs Improvement
                      </button>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                      Send Feedback
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Teacher Notes Tab */}
            {activeTab === 'notes' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    📝 Ghi chú của Giáo viên
                  </h3>
                  {!isEditingNotes ? (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="flex items-center text-purple-600 hover:text-purple-800"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsEditingNotes(false);
                        // Save to localStorage or DB
                        localStorage.setItem(`teacher-notes-${studentId}`, teacherNotes);
                      }}
                      className="flex items-center text-green-600 hover:text-green-800"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </button>
                  )}
                </div>

                {isEditingNotes ? (
                  <textarea
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Nhập ghi chú về học sinh..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 min-h-64">
                    {teacherNotes ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{teacherNotes}</p>
                    ) : (
                      <p className="text-gray-400 italic">Chưa có ghi chú. Click {t('common.edit')} để thêm.</p>
                    )}
                  </div>
                )}

                {/* Auto-saved notes history */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Quick Info */}
          <div className="space-y-6">
            {/* Recent Lessons */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                📚 Bài học gần đây
              </h3>
              <div className="space-y-3">
                {[
                  { title: 'Đạo hàm hàm hợp', score: 92, date: '2h ago', status: 'completed' },
                  { title: 'Ứng dụng đạo hàm', score: 88, date: '1 day ago', status: 'completed' },
                  { title: 'Tích phân', score: null, date: 'In progress', status: 'in-progress' }
                ].map((lesson, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{lesson.title}</span>
                      {lesson.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-orange-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{lesson.date}</span>
                      {lesson.score && (
                        <span className="text-xs font-semibold text-purple-600">{lesson.score}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚡ Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Send Message</span>
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Adjust Learning Path</span>
                  <Target className="h-4 w-4 text-blue-600" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <span className="text-sm font-medium text-gray-900">View All Progress</span>
                  <Eye className="h-4 w-4 text-green-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

