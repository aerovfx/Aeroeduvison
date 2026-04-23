/**
 * Quick Actions Panel
 * Shortcuts for common teacher tasks
 */

import { Plus, Send, BookOpen, Users, Target, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    { icon: Plus,     label: 'Tạo Learning Path', href: '/teacher/learning-path-builder', color: 'bg-purple-500' },
    { icon: Send,     label: 'Gửi thông báo',     href: null,                              color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Tạo bài học',        href: '/teacher/create-module',          color: 'bg-green-500' },
    { icon: Users,    label: 'Quản lý lớp',        href: '/teacher/classes',               color: 'bg-yellow-500' },
    { icon: Target,   label: 'Đặt mục tiêu',       href: '/teacher/exam-generator',         color: 'bg-red-500' },
    { icon: Calendar, label: 'Lịch học',            href: '/teacher/calendar',               color: 'bg-indigo-500' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Thao tác nhanh</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => {
              if (action.href) {
                navigate(action.href)
              } else {
                toast.success(`Đã mở: ${action.label}`)
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
  )
}
