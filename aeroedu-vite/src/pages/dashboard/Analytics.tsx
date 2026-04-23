/**
 * Analytics — clone chính xác của app/(dashboard)/(routes)/dashboard/analytics/_AnalyticsContent.tsx
 * Recharts giữ nguyên 100%, bỏ useLanguage → text tĩnh tiếng Việt
 */
import React, { useState } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Brain, Heart, Target, Award, Zap, Star
} from 'lucide-react';

// ─────────────────────────────────────────────
// Static data (mirrors Next.js source)
// ─────────────────────────────────────────────
const skillData = [
  { skill: 'Toán học',    current: 75, target: 90, trend: 12 },
  { skill: 'Vật lý',     current: 68, target: 85, trend: 8  },
  { skill: 'Hóa học',    current: 82, target: 90, trend: 15 },
  { skill: 'Programming', current: 45, target: 70, trend: 25 },
  { skill: 'AI/ML',       current: 30, target: 60, trend: 18 },
];

const performanceData = [
  { date: '10/01', xp: 120, lessons: 3, accuracy: 85 },
  { date: '11/01', xp: 150, lessons: 4, accuracy: 88 },
  { date: '12/01', xp: 90,  lessons: 2, accuracy: 82 },
  { date: '13/01', xp: 200, lessons: 5, accuracy: 92 },
  { date: '14/01', xp: 180, lessons: 4, accuracy: 89 },
  { date: '15/01', xp: 160, lessons: 3, accuracy: 87 },
  { date: '16/01', xp: 220, lessons: 6, accuracy: 94 },
];

const emotionData = [
  { emotion: 'Vui vẻ',   value: 45, color: '#10B981' },
  { emotion: 'Bình thường', value: 30, color: '#6B7280' },
  { emotion: 'Mệt mỏi',  value: 15, color: '#F59E0B' },
  { emotion: 'Căng thẳng', value: 10, color: '#EF4444' },
];

const radarData = [
  { subject: 'Engagement', A: 85, B: 100, fullMark: 100 },
  { subject: 'Motivation',  A: 78, B: 100, fullMark: 100 },
  { subject: 'Focus',       A: 82, B: 100, fullMark: 100 },
  { subject: 'Retention',   A: 75, B: 100, fullMark: 100 },
  { subject: 'Speed',       A: 88, B: 100, fullMark: 100 },
  { subject: 'Accuracy',    A: 90, B: 100, fullMark: 100 },
];

const achievements = [
  { id: 1, title: 'Math Master',   description: 'Completed 50 math lessons',        icon: '🧮', earned: true  },
  { id: 2, title: 'Streak King',   description: '7 days learning streak',            icon: '🔥', earned: true  },
  { id: 3, title: 'AI Explorer',   description: 'First AI/ML lesson',                icon: '🤖', earned: true  },
  { id: 4, title: 'Speed Demon',   description: 'Complete 10 lessons in 1 day',      icon: '⚡', earned: false },
  { id: 5, title: 'Perfectionist', description: '100% accuracy for 5 lessons',       icon: '🎯', earned: false },
];

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function StudentAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📈 Skill &amp; Performance Analytics</h1>
              <p className="text-indigo-100">Phân tích năng lực và tiến độ học tập của bạn</p>
            </div>
            <div className="flex space-x-2">
              <select
                value={timeRange}
                onChange={e => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-800"
              >
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="90d">3 tháng</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Key Metrics ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Tổng XP</p>
                <p className="text-2xl font-bold">2,450</p>
                <p className="text-xs text-green-200">+12% so với tuần trước</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">Engagement Score</p>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-xs text-green-200">Excellent</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Learning Streak</p>
                <p className="text-2xl font-bold">7 ngày</p>
                <p className="text-xs text-orange-200">Keep it up!</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Avg. Accuracy</p>
                <p className="text-2xl font-bold">89%</p>
                <p className="text-xs text-blue-200">Very Good</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Charts Grid: Skill Progress + Emotion ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Skill Progress */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              Skill Progress
            </h3>
            <div className="space-y-4">
              {skillData.map((skill, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                    <span className="text-sm text-gray-600">{skill.current}% / {skill.target}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(skill.current / skill.target) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Current: {skill.current}%</span>
                    <span className="text-green-600">+{skill.trend}% this week</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emotion Distribution */}
          <div className="bg-gradient-to-br from-white to-pink-50 rounded-xl shadow-lg p-6 border border-pink-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">💝</span>
              Emotion Distribution
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={emotionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {emotionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {emotionData.map((emotion, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emotion.color }} />
                    <span>{emotion.emotion}</span>
                  </div>
                  <span>{emotion.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Performance Trend (Line Chart) ── */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 mb-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">📈</span>
            Performance Trend (7 days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="xp"       stroke="#8B5CF6" strokeWidth={2} name="XP Earned"  />
              <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ── Learning Profile Radar + Achievements ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Radar */}
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg p-6 border border-purple-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Learning Profile
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Your Performance" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                <Radar name="Target"           dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.1} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Achievements */}
          <div className="bg-gradient-to-br from-white to-yellow-50 rounded-xl shadow-lg p-6 border border-yellow-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">🏆</span>
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {achievements.map(achievement => (
                <div
                  key={achievement.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg ${
                    achievement.earned
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${achievement.earned ? 'text-green-900' : 'text-gray-600'}`}>
                      {achievement.title}
                    </h4>
                    <p className={`text-sm ${achievement.earned ? 'text-green-700' : 'text-gray-500'}`}>
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.earned && (
                    <div className="text-green-600">
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── AI Insights ── */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">🤖 AI Insights &amp; Recommendations</h3>
              <div className="space-y-2 text-sm">
                <p>• <strong>Strengths:</strong> Bạn học Toán và Hóa rất tốt! Tiếp tục phát huy.</p>
                <p>• <strong>Focus Area:</strong> Programming cần cải thiện. Thử làm thêm bài tập cơ bản.</p>
                <p>• <strong>Learning Style:</strong> Bạn học tốt nhất vào buổi sáng với năng lượng cao.</p>
                <p>• <strong>Next Goal:</strong> Hoàn thành 5 bài Programming trong tuần tới để đạt 60%.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
