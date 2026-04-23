/**
 * LearningNav — Tab navigation cho khu vực học tập của học sinh
 * Ported từ elearniv: nav-style1 trong /learning/*
 *
 * Dùng ở: MyCourses, Wishlist, PurchaseHistory
 */
import { NavLink } from 'react-router-dom'
import { BookOpen, Heart, ShoppingBag, Award, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/student/my-courses',       label: 'Khoá học của tôi',  icon: BookOpen   },
  { to: '/student/wishlist',         label: 'Yêu thích',          icon: Heart      },
  { to: '/student/purchase-history', label: 'Lịch sử mua',        icon: ShoppingBag},
  { to: '/student/schedule',         label: 'Lịch học',           icon: Calendar   },
]

interface LearningNavProps {
  /** Tiêu đề phần (mặc định: "Học tập của tôi") */
  title?: string
  /** Hiển thị số lượng bên cạnh tiêu đề */
  count?: number
}

export function LearningNav({ title = 'Học tập của tôi', count }: LearningNavProps) {
  return (
    <div className="mb-6">
      {/* Tiêu đề */}
      <div className="flex items-baseline gap-3 mb-4">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {count !== undefined && (
          <span className="text-sm text-white/40">{count} khoá học</span>
        )}
      </div>

      {/* Tab bar */}
      <nav className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-px">
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px',
                isActive
                  ? 'text-purple-400 border-purple-500 bg-purple-500/10'
                  : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/5'
              )
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
