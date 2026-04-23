/**
 * Student Schedule — thời khóa biểu và lịch thi
 * Mapping từ: app/(dashboard)/(routes)/dashboard/schedule/* (Next.js)
 */
import { useState } from 'react'
import { Calendar, Clock, MapPin, BookOpen, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const DEMO_SCHEDULE: Record<string, { time: string; title: string; room: string; type: 'lesson' | 'exam' | 'lab' }[]> = {
  T2: [
    { time: '07:00–08:30', title: 'Vật Lý - Dao động cơ', room: 'P.201', type: 'lesson' },
    { time: '14:00–15:30', title: 'Lab: Con lắc đơn', room: 'Lab 3D', type: 'lab' },
  ],
  T3: [
    { time: '07:00–08:30', title: 'Toán - Tích phân', room: 'P.102', type: 'lesson' },
    { time: '09:00–10:30', title: 'Hóa - Oxi hóa khử', room: 'P.305', type: 'lesson' },
  ],
  T4: [
    { time: '07:00–08:30', title: 'Kiểm tra Vật Lý', room: 'P.201', type: 'exam' },
    { time: '14:00–15:30', title: 'Tiếng Anh', room: 'P.401', type: 'lesson' },
  ],
  T5: [
    { time: '07:00–08:30', title: 'Toán - Phương trình vi phân', room: 'P.102', type: 'lesson' },
    { time: '09:00–10:30', title: 'Lab: Mạch điện RLC', room: 'Lab 3D', type: 'lab' },
  ],
  T6: [
    { time: '07:00–08:30', title: 'Văn học', room: 'P.203', type: 'lesson' },
    { time: '14:00–15:30', title: 'Hóa - Thực hành', room: 'Phòng hóa', type: 'lab' },
  ],
  T7: [
    { time: '07:00–09:00', title: 'Ôn tập tổng hợp', room: 'Online', type: 'lesson' },
  ],
}

const TYPE_STYLES = {
  lesson: 'bg-blue-50 border-blue-200 text-blue-800',
  exam: 'bg-red-50 border-red-200 text-red-800',
  lab: 'bg-purple-50 border-purple-200 text-purple-800',
}
const TYPE_ICONS = {
  lesson: BookOpen,
  exam: Calendar,
  lab: FlaskConical,
}

export default function StudentSchedule() {
  const [activeDay, setActiveDay] = useState('T2')
  const sessions = DEMO_SCHEDULE[activeDay] ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Thời khóa biểu</h1>
        <p className="text-muted-foreground mt-1">Lịch học và kiểm tra trong tuần</p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeDay === day
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            {day}
            {DEMO_SCHEDULE[day]?.some((s) => s.type === 'exam') && (
              <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Không có lịch học hôm nay</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s, i) => {
            const Icon = TYPE_ICONS[s.type]
            return (
              <div key={i} className={cn('rounded-xl border p-4 flex items-start gap-4', TYPE_STYLES[s.type])}>
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold">{s.title}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm opacity-80">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.time}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.room}</span>
                  </div>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide opacity-60">
                  {s.type === 'exam' ? 'Kiểm tra' : s.type === 'lab' ? 'Thực hành' : 'Học'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-300 inline-block" />Học lý thuyết</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-300 inline-block" />Kiểm tra</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-300 inline-block" />Thực hành</span>
      </div>
    </div>
  )
}
