import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Receipt, BookOpen, Clock, DollarSign } from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { LearningNav } from '@/components/student/LearningNav'

function fmt(date: string) {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function PurchaseHistory() {
  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['purchase-history'],
    queryFn: learningService.getPurchaseHistory,
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/5 animate-pulse h-28" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <LearningNav title="Học tập của tôi" count={enrollments.length} />

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <Receipt className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-gray-400">Chưa có giao dịch nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map(({ id, course, price, createdAt }) => (
            <div
              key={id}
              className="flex flex-col sm:flex-row gap-4 items-start sm:items-center rounded-xl bg-white/5 border border-white/10 p-4 hover:border-white/20 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-full sm:w-32 h-24 sm:h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
                {course.image ? (
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <Link
                  to={`/learning/course/${(course as any).slug || course.id}/${course.id}`}
                  className="block font-semibold text-white hover:text-purple-300 transition-colors truncate"
                >
                  {course.title}
                </Link>
                <p className="text-sm text-gray-400">Giảng viên: {course.user?.name || '—'}</p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {(course as any).lessons ?? '—'} bài học
                  </span>
                  {(course as any).duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {(course as any).duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & date */}
              <div className="flex sm:flex-col items-center sm:items-end gap-4 sm:gap-1 flex-shrink-0">
                <span className="flex items-center gap-1 text-green-400 font-bold text-lg">
                  <DollarSign className="w-4 h-4" />
                  {price > 0 ? price.toLocaleString() : 'Miễn phí'}
                </span>
                <span className="text-xs text-gray-500">{fmt(createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
