'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Brain, Target, TrendingUp, Clock, Star, Award, Users, Zap,
  BookOpen, Play, CheckCircle, ArrowRight, BarChart3, PieChart,
  Lightbulb, MessageCircle, Trophy, Calendar, Activity, Heart,
  Cpu, Database, Gamepad2, Rocket, Beaker, Sparkles, Eye
} from 'lucide-react';

export default function DashboardPage() {
  const { t } = useLanguage();
  
  const [selectedSkill, setSelectedSkill] = useState<any>(null);
  const [showSkillDetail, setShowSkillDetail] = useState(false);

  // AI-Driven XP System Data
  const competencies = [
    { 
      name: t('labs.mathematics'), 
      level: 85, 
      color: 'from-blue-400 to-blue-600', 
      icon: '🔢',
      xp: 2450,
      breakdown: {
        knowledge: 980,    // 40% - số bài hoàn thành * mức độ khó * tỉ lệ đúng
        engagement: 490,   // 20% - thời gian học * engagement score
        mastery: 490,      // 20% - tiến độ module / dự đoán nắm vững
        achievements: 245, // 10% - huy hiệu, milestone
        social: 245        // 10% - tham gia nhóm, peer review
      },
      learningVelocity: 12.5, // XP/tuần
      lastActivity: '2 giờ trước'
    },
    { 
      name: t('labs.physics'), 
      level: 72, 
      color: 'from-purple-400 to-purple-600', 
      icon: '⚛️',
      xp: 1890,
      breakdown: {
        knowledge: 756,
        engagement: 378,
        mastery: 378,
        achievements: 189,
        social: 189
      },
      learningVelocity: 8.2,
      lastActivity: '1 ngày trước'
    },
    { 
      name: t('labs.chemistry'), 
      level: 68, 
      color: 'from-green-400 to-green-600', 
      icon: '🧪',
      xp: 1650,
      breakdown: {
        knowledge: 660,
        engagement: 330,
        mastery: 330,
        achievements: 165,
        social: 165
      },
      learningVelocity: 6.8,
      lastActivity: '3 ngày trước'
    },
    { 
      name: t('labs.biology'), 
      level: 74, 
      color: 'from-emerald-400 to-emerald-600', 
      icon: '🧬',
      xp: 1920,
      breakdown: {
        knowledge: 768,
        engagement: 384,
        mastery: 384,
        achievements: 192,
        social: 192
      },
      learningVelocity: 9.1,
      lastActivity: '5 giờ trước'
    },
    { 
      name: 'Programming', 
      level: 91, 
      color: 'from-orange-400 to-orange-600', 
      icon: '💻',
      xp: 3200,
      breakdown: {
        knowledge: 1280,
        engagement: 640,
        mastery: 640,
        achievements: 320,
        social: 320
      },
      learningVelocity: 18.5,
      lastActivity: '30 phút trước'
    },
    { 
      name: 'AI/ML', 
      level: 78, 
      color: 'from-pink-400 to-pink-600', 
      icon: '🤖',
      xp: 2100,
      breakdown: {
        knowledge: 840,
        engagement: 420,
        mastery: 420,
        achievements: 210,
        social: 210
      },
      learningVelocity: 11.2,
      lastActivity: '1 giờ trước'
    }
  ];

  // Sample emotional state data
  const emotionalStates = [
    { name: t('emotion.motivation'), level: 88, color: 'from-yellow-400 to-yellow-600' },
    { name: 'Confidence', level: 75, color: 'from-blue-400 to-blue-600' },
    { name: 'Curiosity', level: 92, color: 'from-purple-400 to-purple-600' },
    { name: t('vision.focus'), level: 69, color: 'from-green-400 to-green-600' },
    { name: 'Creativity', level: 81, color: 'from-pink-400 to-pink-600' }
  ];

  const handleSkillClick = (skill: any) => {
    setSelectedSkill(skill);
    setShowSkillDetail(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-600 mr-3" />
            <h1 className="text-4xl font-bold text-purple-900">
              You're learning with AI-Driven Edu
            </h1>
          
              </div>
          <div className="max-w-4xl mx-auto space-y-3 mb-6">
            <p className="text-lg text-gray-700">
              Học sinh được học theo não bộ và cảm xúc của chính mình.
            </p>
            <p className="text-lg text-gray-700">
              Giáo viên trở thành người thiết kế hành trình học.
            </p>
            <p className="text-lg text-gray-700 font-medium">
              Xã hội tiến tới một nền giáo dục cá nhân hóa đại chúng (Mass Personalization Education).
            </p>
          </div>
        </div>

        {/* LAYER 1: TOP - TỔNG QUAN & TIẾN ĐỘ */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
            Tổng quan & Tiến độ học tập
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Overall Progress */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-blue-600">78%</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Tiến độ tổng</h3>
              <p className="text-sm text-gray-600">Tuần này +12%</p>
              <div className="mt-3 bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" style={{width: '78%'}}></div>
          </div>
        </div>

            {/* Learning Streak */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-orange-600">15</span>
          </div>
              <h3 className="font-bold text-gray-900 mb-1">Ngày liên tiếp</h3>
              <p className="text-sm text-gray-600">Kỷ lục: 23 ngày</p>
        </div>

            {/* AI-Driven XP */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-yellow-600">13,210</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">AI-Driven XP</h3>
              <p className="text-sm text-gray-600">Tuần này +1,250 XP</p>
              <div className="mt-2 text-xs text-gray-500">
                Knowledge: 40% | Engagement: 20% | Mastery: 20% | Achievements: 10% | Social: 10%
          </div>
        </div>

            {/* Level */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-purple-600">Lv.8</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Cấp độ hiện tại</h3>
              <p className="text-sm text-gray-600">550 XP đến Lv.9</p>
            </div>
          </div>
        </div>

        {/* LAYER 2: GIỮA - NĂNG LỰC, CẢM XÚC, LỘ TRÌNH */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-green-600" />
            Năng lực & Cảm xúc học tập
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Competency Heatmap */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-blue-600" />
                Bản đồ năng lực
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {competencies.map((skill, index) => (
                  <div 
                    key={index}
                    className="cursor-pointer transform hover:scale-105 transition-all duration-200"
                    onClick={() => handleSkillClick(skill)}
                  >
                    <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{skill.icon}</span>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-700">{skill.level}%</span>
                          <div className="text-xs text-gray-500">{skill.xp} XP</div>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900 text-sm mb-2">{skill.name}</h4>
                      <div className="bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className={`bg-gradient-to-r ${skill.color} h-2 rounded-full transition-all duration-500`}
                          style={{width: `${skill.level}%`}}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>⚡ {skill.learningVelocity} XP/tuần</span>
                        <span>🕒 {skill.lastActivity}</span>
                      </div>
                    </div>
          </div>
                ))}
        </div>
      </div>

            {/* Emotional State Radar */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-pink-600" />
                Trạng thái cảm xúc
              </h3>
              <div className="space-y-4">
                {emotionalStates.map((emotion, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600"></div>
                      <span className="font-medium text-gray-900">{emotion.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-200 rounded-full h-2 w-20">
                        <div 
                          className={`bg-gradient-to-r ${emotion.color} h-2 rounded-full transition-all duration-500`}
                          style={{width: `${emotion.level}%`}}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-8">{emotion.level}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Learning Path */}
          <div className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-green-600" />
              Lộ trình học tập cá nhân hóa
            </h3>
            <div className="flex items-center space-x-4 overflow-x-auto">
              <div className="flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                Tuần 1: Toán cơ bản
              </div>
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                Tuần 2: Vật lý
              </div>
              <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                Tuần 3: Lập trình
              </div>
              <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                Tuần 4: AI/ML
              </div>
              <div className="flex-shrink-0 bg-gray-300 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
                Tuần 5: Dự án tổng hợp
              </div>
            </div>
          </div>
        </div>

        {/* LAYER 3: DƯỚI CÙNG - NHIỆM VỤ, AI GỢI Ý, THÀNH TÍCH */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Lightbulb className="w-6 h-6 mr-2 text-yellow-600" />
            Nhiệm vụ & Gợi ý AI
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Tasks */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Nhiệm vụ hôm nay
              </h3>
              <div className="space-y-3">
                <a href="/dashboard/assignments" className="block">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-700">Hoàn thành bài toán khó</span>
                  </div>
                </a>
                <a href="/dashboard/quizzes" className="block">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors cursor-pointer">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm text-gray-700">Làm 3 bài quiz Vật lý</span>
                  </div>
                </a>
                <a href="/dashboard/labtwin" className="block">
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
                    <Play className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-gray-700">Thí nghiệm LabTwin</span>
                  </div>
                </a>
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                Gợi ý AI
              </h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    "Dựa trên tiến độ của bạn, tôi đề xuất tập trung vào bài tập tích phân hôm nay."
                  </p>
                  <span className="text-xs text-purple-600 font-medium">AI Tutor</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700 mb-2">
                    "Bạn đang có động lực cao, hãy thử thách bản thân với bài toán khó hơn!"
                  </p>
                  <span className="text-xs text-blue-600 font-medium">AI Coach</span>
                </div>
              </div>
            </div>

            {/* Recent Achievements */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600" />
                Thành tích gần đây
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-600" />
            <div>
                    <p className="text-sm font-medium text-gray-900">Master Mathematician</p>
                    <p className="text-xs text-gray-600">Hoàn thành 50 bài toán khó</p>
            </div>
          </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <Star className="w-5 h-5 text-green-600" />
            <div>
                    <p className="text-sm font-medium text-gray-900">Lab Explorer</p>
                    <p className="text-xs text-gray-600">Khám phá 10 thí nghiệm mới</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Access Modules */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <a href="/dashboard/labtwin" className="block">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">LabTwin</h3>
                <Beaker className="w-8 h-8" />
              </div>
              <p className="text-blue-100 mb-4">25+ thí nghiệm ảo tương tác</p>
              <div className="flex items-center text-blue-200">
                <Play className="w-4 h-4 mr-1" />
                <span className="text-sm">Khám phá ngay →</span>
              </div>
            </div>
          </a>

          <a href="/dashboard/study-dashboard" className="block">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Study Dashboard</h3>
                <Target className="w-8 h-8" />
              </div>
              <p className="text-green-100 mb-4">Giao diện học tập hiện đại</p>
              <div className="flex items-center text-green-200">
                <Play className="w-4 h-4 mr-1" />
                <span className="text-sm">Học tập thông minh →</span>
              </div>
            </div>
          </a>

          <a href="/dashboard/learning-paths-demo" className="block">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Learning Paths</h3>
                <Brain className="w-8 h-8" />
              </div>
              <p className="text-purple-100 mb-4">Lộ trình học tập cá nhân hóa</p>
              <div className="flex items-center text-purple-200">
                <Play className="w-4 h-4 mr-1" />
                <span className="text-sm">Xem lộ trình →</span>
              </div>
            </div>
          </a>

          <a href="/dashboard/stem" className="block">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">STEM Projects</h3>
                <Rocket className="w-8 h-8" />
              </div>
              <p className="text-orange-100 mb-4">Dự án STEM thực tế</p>
              <div className="flex items-center text-orange-200">
                <Play className="w-4 h-4 mr-1" />
                <span className="text-sm">Bắt đầu dự án →</span>
              </div>
            </div>
          </a>
        </div>

        {/* AI-Driven XP Detail Modal */}
        {showSkillDetail && selectedSkill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="text-2xl mr-2">{selectedSkill.icon}</span>
                  {selectedSkill.name} - AI Analysis
                </h3>
                <button 
                  onClick={() => setShowSkillDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* XP Overview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Tổng XP</span>
                  <span className="text-2xl font-bold text-blue-600">{selectedSkill.xp} XP</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Mức độ thành thạo</span>
                  <span className="text-lg font-bold text-green-600">{selectedSkill.level}%</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">Tốc độ học</span>
                  <span className="text-lg font-bold text-orange-600">{selectedSkill.learningVelocity} XP/tuần</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div 
                    className={`bg-gradient-to-r ${selectedSkill.color} h-3 rounded-full`}
                    style={{width: `${selectedSkill.level}%`}}
                  ></div>
                </div>
              </div>

              {/* XP Breakdown */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3">Phân tích XP theo AI-Driven Formula</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-blue-900">Knowledge (40%)</span>
                      <p className="text-xs text-blue-700">Bài học × độ khó × tỉ lệ đúng</p>
                    </div>
                    <span className="font-bold text-blue-600">{selectedSkill.breakdown.knowledge} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-green-900">Engagement (20%)</span>
                      <p className="text-xs text-green-700">Thời gian học × engagement score</p>
                    </div>
                    <span className="font-bold text-green-600">{selectedSkill.breakdown.engagement} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-purple-900">Mastery (20%)</span>
                      <p className="text-xs text-purple-700">Tiến độ module / dự đoán nắm vững</p>
                    </div>
                    <span className="font-bold text-purple-600">{selectedSkill.breakdown.mastery} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <span className="font-medium text-yellow-900">Achievements (10%)</span>
                      <p className="text-xs text-yellow-700">Huy hiệu, milestone</p>
                    </div>
                    <span className="font-bold text-yellow-600">{selectedSkill.breakdown.achievements} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                    <div>
                      <span className="font-medium text-pink-900">Social (10%)</span>
                      <p className="text-xs text-pink-700">Tham gia nhóm, peer review</p>
                    </div>
                    <span className="font-bold text-pink-600">{selectedSkill.breakdown.social} XP</span>
                  </div>
                </div>
              </div>

              {/* AI Recommendations */}
              <div className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3">AI Recommendations</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-1">📚 Lộ trình học tập</h5>
                    <p className="text-sm text-blue-700">
                      {selectedSkill.level > 80 ? 
                        "Bạn đã thành thạo! Hãy thử thách với dự án nâng cao và liên ngành." :
                        selectedSkill.level > 60 ?
                        "Tốt! Tập trung vào luyện tập nâng cao và củng cố kiến thức." :
                        "Bắt đầu với lộ trình cơ bản và củng cố nền tảng."
                      }
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h5 className="font-medium text-green-900 mb-1">🎯 Mục tiêu tuần này</h5>
                    <p className="text-sm text-green-700">
                      Tăng {selectedSkill.learningVelocity} XP thông qua {selectedSkill.level > 70 ? "dự án thực hành" : "bài tập cơ bản"}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <h5 className="font-medium text-purple-900 mb-1">🤖 AI Tutor Suggestion</h5>
                    <p className="text-sm text-purple-700">
                      {selectedSkill.breakdown.engagement < 300 ? 
                        "Tăng engagement bằng cách học 30 phút/ngày" :
                        "Duy trì momentum! Bạn đang học rất hiệu quả."
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all">
                  Bắt đầu học
                </button>
                <button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all">
                  Xem lộ trình
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}