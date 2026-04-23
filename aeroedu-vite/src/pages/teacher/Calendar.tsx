import { useState } from 'react'
import {
  Calendar as CalendarIcon, Plus, Clock, Users,
  BookOpen, Bell, ChevronLeft, ChevronRight, CheckCircle,
} from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  type: 'class' | 'exam' | 'assignment' | 'meeting'
  participants?: number
}

const EVENTS: CalEvent[] = [
  { id: '1', title: 'Lớp Toán - Đạo hàm', description: 'Bài học về đạo hàm cơ bản', date: '2024-10-25', time: '08:00', type: 'class', participants: 25 },
  { id: '2', title: 'Kiểm tra Vật lý', description: 'Kiểm tra 1 tiết - Cơ học', date: '2024-10-26', time: '10:00', type: 'exam', participants: 25 },
  { id: '3', title: 'Họp phụ huynh', description: 'Họp phụ huynh học kỳ 1', date: '2024-10-28', time: '14:00', type: 'meeting', participants: 50 },
  { id: '4', title: 'Lớp Hóa học', description: 'Bài học về phản ứng hóa học', date: '2024-10-29', time: '09:00', type: 'class', participants: 25 },
]

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

function TypeBadge({ type }: { type: CalEvent['type'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    class:      { label: 'Lớp học',  cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    exam:       { label: 'Kiểm tra', cls: 'bg-red-50 text-red-600 border-red-200' },
    assignment: { label: 'Bài tập',  cls: 'bg-green-50 text-green-600 border-green-200' },
    meeting:    { label: 'Họp',      cls: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  }
  const { label, cls } = map[type] ?? { label: 'Sự kiện', cls: 'bg-gray-50 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${cls}`}>
      {type === 'class' && <BookOpen className="w-3 h-3" />}
      {type === 'meeting' && <Users className="w-3 h-3" />}
      {type === 'exam' && <Bell className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const today = new Date().toISOString().split('T')[0]
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const hasEvent = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return EVENTS.some(e => e.date === d)
  }

  const todayEvents = EVENTS.filter(e => e.date === today)
  const upcomingEvents = EVENTS.filter(e => e.date >= today)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-blue-50 opacity-60" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-md">
                <CalendarIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-600">Lịch trình Giảng dạy</h1>
                <p className="text-sm text-gray-600">Quản lý lịch học, kiểm tra và sự kiện</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors">
              <Plus className="w-4 h-4" />
              Tạo sự kiện
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {MONTH_NAMES[month]} {year}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                <div key={d} className="text-center text-sm font-semibold text-gray-500 py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                const eventDot = hasEvent(day)
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all text-sm font-medium
                      ${isSelected ? 'bg-purple-600 text-white shadow-md' :
                        isToday ? 'bg-purple-50 border-2 border-purple-500 text-gray-900' :
                        'bg-gray-50 hover:bg-gray-100 text-gray-700'}`}
                  >
                    {day}
                    {eventDot && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Today */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Hôm nay</h2>
              </div>
              {todayEvents.length > 0 ? (
                <div className="space-y-3">
                  {todayEvents.map(ev => (
                    <div key={ev.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{ev.title}</h3>
                        <TypeBadge type={ev.type} />
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{ev.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ev.time}</span>
                        {ev.participants && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{ev.participants} HV</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-sm text-gray-500">Không có sự kiện hôm nay</p>
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                  <Bell className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Sắp tới</h2>
              </div>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map(ev => (
                  <div key={ev.id} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm truncate flex-1 mr-2">{ev.title}</h3>
                      <TypeBadge type={ev.type} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(ev.date).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ev.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
