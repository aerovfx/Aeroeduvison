'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Trophy, Award, Star, Target, Zap, Brain, Heart, 
  BookOpen, Clock, TrendingUp, Crown, Medal, Shield
} from 'lucide-react';

export default function AchievementsPage() {
  const { t } = useLanguage();
  
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Tất cả', icon: '🏆' },
    { id: 'learning', name: 'Học tập', icon: '📚' },
    { id: 'streak', name: 'Chuỗi', icon: '🔥' },
    { id: 'skill', name: 'Kỹ năng', icon: '⚡' },
    { id: 'social', name: 'Xã hội', icon: '👥' },
    { id: 'special', name: 'Đặc biệt', icon: '💎' }
  ];

  const achievements = [
    // Learning Achievements
    {
      id: 1,
      title: 'First Steps',
      description: 'Hoàn thành bài học đầu tiên',
      icon: '👶',
      category: 'learning',
      earned: true,
      earnedDate: '2025-01-10',
      xp: 50,
      rarity: 'common'
    },
    {
      id: 2,
      title: 'Math Master',
      description: 'Hoàn thành 50 bài học Toán',
      icon: '🧮',
      category: 'learning',
      earned: true,
      earnedDate: '2025-01-15',
      xp: 200,
      rarity: 'rare'
    },
    {
      id: 3,
      title: 'Physics Explorer',
      description: 'Hoàn thành 25 bài học Vật lý',
      icon: '⚛️',
      category: 'learning',
      earned: true,
      earnedDate: '2025-01-12',
      xp: 150,
      rarity: 'uncommon'
    },
    {
      id: 4,
      title: 'Chemistry Wizard',
      description: 'Hoàn thành 100 bài học Hóa học',
      icon: '🧪',
      category: 'learning',
      earned: false,
      progress: 75,
      xp: 500,
      rarity: 'epic'
    },

    // Streak Achievements
    {
      id: 5,
      title: 'Week Warrior',
      description: 'Học liên tục 7 ngày',
      icon: '🔥',
      category: 'streak',
      earned: true,
      earnedDate: '2025-01-16',
      xp: 100,
      rarity: 'uncommon'
    },
    {
      id: 6,
      title: 'Month Master',
      description: 'Học liên tục 30 ngày',
      icon: '📅',
      category: 'streak',
      earned: false,
      progress: 23,
      xp: 1000,
      rarity: 'legendary'
    },

    // Skill Achievements
    {
      id: 7,
      title: 'Speed Demon',
      description: 'Hoàn thành 10 bài học trong 1 ngày',
      icon: '⚡',
      category: 'skill',
      earned: true,
      earnedDate: '2025-01-14',
      xp: 300,
      rarity: 'rare'
    },
    {
      id: 8,
      title: 'Perfectionist',
      description: 'Đạt 100% accuracy cho 5 bài học liên tiếp',
      icon: '🎯',
      category: 'skill',
      earned: false,
      progress: 3,
      xp: 400,
      rarity: 'epic'
    },
    {
      id: 9,
      title: 'AI Explorer',
      description: 'Hoàn thành bài học AI/ML đầu tiên',
      icon: '🤖',
      category: 'skill',
      earned: true,
      earnedDate: '2025-01-11',
      xp: 100,
      rarity: 'uncommon'
    },

    // Social Achievements
    {
      id: 10,
      title: 'Helper',
      description: 'Giúp đỡ 5 bạn học khác',
      icon: '🤝',
      category: 'social',
      earned: false,
      progress: 2,
      xp: 250,
      rarity: 'rare'
    },
    {
      id: 11,
      title: 'Mentor',
      description: 'Hướng dẫn 10 bạn học mới',
      icon: '👨‍🏫',
      category: 'social',
      earned: false,
      progress: 0,
      xp: 500,
      rarity: 'epic'
    },

    // Special Achievements
    {
      id: 12,
      title: 'Night Owl',
      description: 'Học sau 10 giờ tối',
      icon: '🦉',
      category: 'special',
      earned: true,
      earnedDate: '2025-01-13',
      xp: 75,
      rarity: 'uncommon'
    },
    {
      id: 13,
      title: 'Early Bird',
      description: 'Học trước 6 giờ sáng',
      icon: '🐦',
      category: 'special',
      earned: false,
      progress: 0,
      xp: 100,
      rarity: 'rare'
    },
    {
      id: 14,
      title: 'Century Club',
      description: 'Đạt 1000 XP trong 1 ngày',
      icon: '💯',
      category: 'special',
      earned: false,
      progress: 0,
      xp: 1000,
      rarity: 'legendary'
    }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 bg-gray-50';
      case 'uncommon': return 'border-green-300 bg-green-50';
      case 'rare': return 'border-blue-300 bg-blue-50';
      case 'epic': return 'border-purple-300 bg-purple-50';
      case 'legendary': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getRarityText = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Common';
      case 'uncommon': return 'Uncommon';
      case 'rare': return 'Rare';
      case 'epic': return 'Epic';
      case 'legendary': return 'Legendary';
      default: return 'Common';
    }
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;
  const completionRate = Math.round((earnedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🏆 Achievements & Gamification</h1>
              <p className="text-yellow-100">Thành tích, huy hiệu và milestone của bạn</p>
            
              </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{earnedCount}/{totalCount}</div>
              <div className="text-sm text-gray-600">{t('achievements.title')}</div>
              <div className="text-xs text-green-600">{completionRate}% Complete</div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-100">Total XP</p>
                <p className="text-2xl font-bold">2,450</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-100">Current Streak</p>
                <p className="text-2xl font-bold">7 days</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-100">Rank</p>
                <p className="text-2xl font-bold">#15</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-100">{t('achievements.level')}</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            Filter by Category
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all duration-300 ${
                achievement.earned 
                  ? getRarityColor(achievement.rarity)
                  : 'border-gray-200 bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{achievement.icon}</div>
                <div className="text-right">
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                    achievement.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
                    achievement.rarity === 'epic' ? 'bg-purple-100 text-purple-800' :
                    achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                    achievement.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getRarityText(achievement.rarity)}
                  </div>
                </div>
              </div>

              <h3 className={`text-lg font-semibold mb-2 ${
                achievement.earned ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {achievement.title}
              </h3>

              <p className={`text-sm mb-4 ${
                achievement.earned ? 'text-gray-700' : 'text-gray-500'
              }`}>
                {achievement.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">{achievement.xp} XP</span>
                </div>

                {achievement.earned ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs font-medium">Earned</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {achievement.progress !== undefined ? `${achievement.progress}%` : 'Not started'}
                  </div>
                )}
              </div>

              {achievement.earned && achievement.earnedDate && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Earned on {new Date(achievement.earnedDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}

              {!achievement.earned && achievement.progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${achievement.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Progress: {achievement.progress}%
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* AI Motivation */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">🤖 AI Motivation</h3>
              <p className="text-sm mb-3">
                Bạn đang làm rất tốt! Với {earnedCount} achievements đã đạt được, bạn đang trên con đường trở thành một học sinh xuất sắc.
              </p>
              <div className="space-y-1 text-sm">
                <p>• <strong>Next Goal:</strong> Hoàn thành "Chemistry Wizard" (75% done)</p>
                <p>• <strong>Tip:</strong> Học đều đặn mỗi ngày để duy trì streak!</p>
                <p>• <strong>Challenge:</strong> Thử đạt "Perfectionist" bằng cách làm chính xác 100%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
