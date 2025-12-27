'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, Users, BookOpen, Bell } from 'lucide-react';
import { updateButtonHandlers } from '../update-event-handlers';
import { useLanguage } from '@/contexts/LanguageContext';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'class' | 'exam' | 'assignment' | 'meeting';
  participants?: number;
}

export default function CalendarPage() {
  const { t } = useLanguage();
  
  const [events] = useState<Event[]>([
    {
      id: '1',
      title: 'Lớp Toán - Đạo hàm',
      description: 'Bài học về đạo hàm cơ bản',
      date: '2024-10-25',
      time: '08:00',
      type: 'class',
      participants: 25
    },
    {
      id: '2',
      title: 'Kiểm tra Vật lý',
      description: 'Kiểm tra 1 tiết - Cơ học',
      date: '2024-10-26',
      time: '10:00',
      type: 'exam',
      participants: 25
    },
    {
      id: '3',
      title: 'Họp phụ huynh',
      description: 'Họp phụ huynh học kỳ 1',
      date: '2024-10-28',
      time: '14:00',
      type: 'meeting',
      participants: 50
    },
    {
      id: '4',
      title: 'Lớp Hóa học',
      description: 'Bài học về phản ứng hóa học',
      date: '2024-10-29',
      time: '09:00',
      type: 'class',
      participants: 25
    }
  ]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'exam': return 'bg-red-100 text-red-800 border-red-200';
      case 'assignment': return 'bg-green-100 text-green-800 border-green-200';
      case 'meeting': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'class': return 'Lớp học';
      case 'exam': return 'Kiểm tra';
      case 'assignment': return 'Bài tập';
      case 'meeting': return 'Cuộc họp';
      default: return 'Sự kiện';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return BookOpen;
      case 'exam': return Bell;
      case 'assignment': return BookOpen;
      case 'meeting': return Users;
      default: return CalendarIcon;
    }
  };

  const handleCreateEvent = () => {
    updateButtonHandlers.handleCreateEvent('class');
  };

  const handleEditEvent = (id: string) => {
    updateButtonHandlers.handleEditEvent(id);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(event => event.date >= today).length;
  const todayEvents = events.filter(event => event.date === today).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <CalendarIcon className="w-8 h-8" />
              
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">📅 Lịch học & Sự kiện</h1>
                <p className="text-purple-100">Quản lý lịch học và các sự kiện quan trọng</p>
              </div>
            </div>
            <button
              onClick={handleCreateEvent}
              className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo sự kiện</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Hôm nay</p>
                <p className="text-3xl font-bold text-blue-600">{todayEvents}</p>
              </div>
              <CalendarIcon className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Sắp tới</p>
                <p className="text-3xl font-bold text-green-600">{upcomingEvents}</p>
              </div>
              <Clock className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tổng sự kiện</p>
                <p className="text-3xl font-bold text-purple-600">{events.length}</p>
              </div>
              <Bell className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Danh sách Sự kiện</h2>
          <div className="space-y-4">
            {events.map((event) => {
              const TypeIcon = getTypeIcon(event.type);
              return (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <TypeIcon className="w-5 h-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {event.title}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(event.type)}`}>
                          {getTypeText(event.type)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{event.description}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-4 h-4" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>{event.time}</span>
                        </div>
                        {event.participants && (
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4" />
                            <span>{event.participants} người</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleEditEvent(event.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
