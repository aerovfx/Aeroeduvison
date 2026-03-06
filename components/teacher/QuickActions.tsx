/**
 * Quick Actions Panel
 * Shortcuts for common teacher tasks
 */

'use client';

import { Plus, Send, BookOpen, Users, Target, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { updateButtonHandlers, initializeEventHandlers } from '../../app/(dashboard)/(routes)/teacher/update-event-handlers';

export default function QuickActions() {
  const router = useRouter();

  // Initialize event handlers with router
  useEffect(() => {
    initializeEventHandlers(router);
  }, [router]);

  const actions = [
    { icon: Plus, label: 'Tạo Learning Path', href: '/teacher/learning-path-builder', color: 'bg-purple-500' },
    { icon: Send, label: 'Gửi thông báo', href: '/teacher/notifications', color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Tạo bài học', href: '/teacher/create-lesson', color: 'bg-green-500' },
    { icon: Users, label: 'Quản lý nhóm', href: '/teacher/groups', color: 'bg-yellow-500' },
    { icon: Target, label: 'Đặt mục tiêu', href: '/teacher/goals', color: 'bg-red-500' },
    { icon: Calendar, label: 'Lịch học', href: '/teacher/calendar', color: 'bg-indigo-500' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.label === 'Tạo Learning Path') {
                updateButtonHandlers.handleCreateLearningPath();
              } else if (action.label === 'Gửi thông báo') {
                updateButtonHandlers.handleSendNotification('class');
              } else if (action.label === 'Tạo bài học') {
                updateButtonHandlers.handleCreateModule('lesson');
              } else if (action.label === 'Quản lý nhóm') {
                updateButtonHandlers.handleCreateEvent('meeting');
              } else if (action.label === 'Đặt mục tiêu') {
                updateButtonHandlers.handleCreateEvent('assignment');
              } else if (action.label === 'Lịch học') {
                updateButtonHandlers.handleCreateEvent('class');
              } else {
                router.push(action.href);
              }
            }}
            className={`${action.color} text-white rounded-lg p-4 flex flex-col items-center justify-center space-y-2 hover:opacity-90 transition-opacity`}
          >
            <action.icon className="w-6 h-6" />
            <span className="text-xs font-medium text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

