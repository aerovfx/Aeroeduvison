'use client';

import VisionThemeWrapper from '@/components/theme/vision-theme-wrapper';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Bell, CheckCircle, AlertCircle, Info, Clock, 
  BookOpen, Target, Heart, Zap, Award, Brain
} from 'lucide-react';

export default function NotificationsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Sample notifications data
  const sampleNotifications = [
    {
      id: 1,
      type: 'achievement',
      title: '🏆 Achievement Unlocked!',
      message: 'Bạn đã đạt được "Math Master" - Hoàn thành 50 bài học Toán!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      priority: 'high',
      action: {
        text: 'Xem Achievement',
        url: '/dashboard/achievements'
      }
    },
    {
      id: 2,
      type: 'reminder',
      title: '⏰ Learning Reminder',
      message: 'Đã đến giờ học rồi! AI Tutor đã chuẩn bị lộ trình học hôm nay cho bạn.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: false,
      priority: 'medium',
      action: {
        text: 'Bắt đầu học',
        url: '/ai-tutor'
      }
    },
    {
      id: 3,
      type: 'progress',
      title: '📈 Progress Update',
      message: 'Chúc mừng! Bạn đã hoàn thành 75% mục tiêu tuần này.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      read: true,
      priority: 'low',
      action: {
        text: 'Xem Analytics',
        url: '/dashboard/analytics'
      }
    },
    {
      id: 4,
      type: 'emotion',
      title: '💝 Emotion Check-in',
      message: 'AI nhận thấy bạn có vẻ mệt mỏi. Hãy nghỉ ngơi một chút nhé!',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
      read: true,
      priority: 'medium',
      action: {
        text: 'Check-in cảm xúc',
        url: '/ai-tutor/emotion'
      }
    },
    {
      id: 5,
      type: 'assignment',
      title: '📝 New Assignment',
      message: 'Bạn có 1 bài tập mới: "Hệ phương trình bậc hai" - Deadline: 2 ngày',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      read: false,
      priority: 'high',
      action: {
        text: 'Làm bài tập',
        url: '/ai-tutor/assignments'
      }
    },
    {
      id: 6,
      type: 'streak',
      title: '🔥 Streak Alert!',
      message: 'Chuỗi học tập 7 ngày của bạn sắp bị mất! Hãy học ngay hôm nay.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: false,
      priority: 'high',
      action: {
        text: 'Duy trì streak',
        url: '/ai-tutor'
      }
    },
    {
      id: 7,
      type: 'ai_insight',
      title: '🤖 AI Insight',
      message: 'AI phát hiện bạn học tốt nhất vào buổi sáng. Hãy thử học sớm hơn!',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: true,
      priority: 'low',
      action: {
        text: 'Xem chi tiết',
        url: '/dashboard/analytics'
      }
    },
    {
      id: 8,
      type: 'milestone',
      title: '🎯 Milestone Reached',
      message: 'Bạn đã đạt 1000 XP! Level up lên cấp 12.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      read: true,
      priority: 'medium',
      action: {
        text: 'Xem Profile',
        url: '/dashboard'
      }
    }
  ];

  useEffect(() => {
    setNotifications(sampleNotifications);
    setUnreadCount(sampleNotifications.filter(n => !n.read).length);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'achievement': return <Award className="w-5 h-5 text-yellow-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'progress': return <Target className="w-5 h-5 text-green-500" />;
      case 'emotion': return <Heart className="w-5 h-5 text-pink-500" />;
      case 'assignment': return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'streak': return <Zap className="w-5 h-5 text-orange-500" />;
      case 'ai_insight': return <Brain className="w-5 h-5 text-indigo-500" />;
      case 'milestone': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} ngày trước`;
    if (hours > 0) return `${hours} giờ trước`;
    return 'Vừa xong';
  };

  return (


    <VisionThemeWrapper title="Notifications" subtitle="Hệ thống học tập thông minh">
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🔔 Notifications & Alerts</h1>
              <p className="text-blue-100">Thông báo và nhắc nhở thông minh từ AI</p>
            
              </div>
            <div className="flex items-center space-x-4">
              {unreadCount > 0 && (
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {unreadCount} chưa đọc
                </div>
              )}
              <button
                onClick={markAllAsRead}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🎯</span>
            Filter Notifications
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('achievement')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'achievement'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏆 Achievements
            </button>
            <button
              onClick={() => setFilter('reminder')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'reminder'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏰ Reminders
            </button>
            <button
              onClick={() => setFilter('assignment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'assignment'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 Assignments
            </button>
            <button
              onClick={() => setFilter('ai_insight')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'ai_insight'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🤖 AI Insights
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có thông báo</h3>
              <p className="text-gray-600">Bạn đã xem tất cả thông báo rồi!</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-l-4 transition-all duration-200 ${
                  notification.read 
                    ? 'opacity-75' 
                    : getPriorityColor(notification.priority)
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold mb-1 ${
                          notification.read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className={`text-sm mb-3 ${
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          
                          {notification.action && (
                            <button
                              onClick={() => {
                                markAsRead(notification.id);
                                router.push(notification.action.url);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                            >
                              {notification.action.text}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="ml-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Notification Settings */}
        <div className="mt-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">🤖 AI Notification Settings</h3>
              <p className="text-sm mb-4">
                AI sẽ gửi thông báo thông minh dựa trên hành vi học tập của bạn:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">📊 Analytics-based:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Progress milestones</li>
                    <li>• Performance insights</li>
                    <li>• Learning pattern analysis</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">💝 Emotion-aware:</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Motivation reminders</li>
                    <li>• Break suggestions</li>
                    <li>• Encouragement messages</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </VisionThemeWrapper>
  );
}
