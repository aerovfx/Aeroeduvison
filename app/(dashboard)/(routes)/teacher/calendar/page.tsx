'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, Users, BookOpen, Bell, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
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

// AI Native Glass Card
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {children}
    </div>
  );
}

// AI Native Badge
function AIBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' }) {
  const variants = {
    default: 'bg-[hsl(var(--primary)/0.15)] text-purple-600 border-purple-200',
    success: 'bg-[hsl(var(--success)/0.15)] text-green-600 border-green-200',
    warning: 'bg-[hsl(var(--warning)/0.15)] text-yellow-600 border-[hsl(var(--warning)/0.3)]',
    danger: 'bg-[hsl(var(--destructive)/0.15)] text-red-600 border-red-200',
    info: 'bg-[hsl(var(--info)/0.15)] text-blue-600 border-[hsl(var(--info)/0.3)]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${variants[variant]}`}>
      {children}
    </span>
  );
}

export default function CalendarPage() {
  const { t } = useLanguage();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'class': return <AIBadge variant="info"><BookOpen className="w-3 h-3 mr-1" /> Lớp học</AIBadge>;
      case 'exam': return <AIBadge className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"><Bell className="w-3 h-3 mr-1" /> Kiểm tra</AIBadge>;
      case 'assignment': return <AIBadge variant="success">Bài tập</AIBadge>;
      case 'meeting': return <AIBadge variant="warning"><Users className="w-3 h-3 mr-1" /> Họp</AIBadge>;
      default: return <AIBadge>Sự kiện</AIBadge>;
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(event => event.date >= today);
  const todayEvents = events.filter(event => event.date === today);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay, year, month };
  };

  const { daysInMonth, startingDay, year, month } = getDaysInMonth(currentDate);
  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const hasEvent = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(e => e.date === dateStr);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* AI Native Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--primary))/20] to-[hsl(var(--secondary))/20] opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--secondary))] flex items-center justify-center text-white shadow-sm">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">Lịch trình Giảng dạy</h1>
                <p className="text-sm text-gray-600">Quản lý lịch học, kiểm tra và sự kiện</p>
              </div>
            </div>
            <button className="ai-button-primary text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tạo sự kiện
            </button>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <GlassCard className="lg:col-span-2">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {monthNames[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="ai-button text-gray-900 p-2 rounded-xl">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextMonth} className="ai-button text-gray-900 p-2 rounded-xl">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startingDay }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;
                const eventExists = hasEvent(day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                      isSelected
                        ? 'ai-button-primary text-white'
                        : isToday
                        ? 'bg-[hsl(var(--primary))/20] border-2 border-[hsl(var(--primary))] text-gray-900'
                        : 'glass-panel hover:bg-white/5 text-gray-900'
                    }`}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    {eventExists && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Events Sidebar */}
          <div className="space-y-6">
            {/* Today's Events */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Hôm nay</h2>
              </div>
              {todayEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayEvents.map(event => (
                    <div key={event.id} className="p-4 rounded-xl glass-panel border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{event.title}</h3>
                        {getTypeBadge(event.type)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </span>
                        {event.participants && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.participants} HV
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Không có sự kiện hôm nay</p>
                </div>
              )}
            </GlassCard>

            {/* Upcoming Events */}
            <GlassCard>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Bell className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Sắp tới</h2>
              </div>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map(event => (
                  <div key={event.id} className="p-3 rounded-xl glass-panel border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{event.title}</h3>
                      {getTypeBadge(event.type)}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {event.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
