import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart, BookOpen, Users, Trash2 } from 'lucide-react'
import { learningService } from '@/services/learning.service'
import { toast } from 'react-hot-toast'
import { LearningNav } from '@/components/student/LearningNav'

export default function Wishlist() {
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: learningService.getWishlist,
  })

  const remove = useMutation({
    mutationFn: (courseId: string) => learningService.removeFromWishlist(courseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Đã xoá khỏi danh sách yêu thích')
    },
  })

  if (isLoading) {
    return (
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/5 animate-pulse h-64" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <LearningNav title="Học tập của tôi" count={items.length} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-white">Chưa có khoá học nào</h2>
          <p className="text-gray-400">Nhấn ♡ trên khoá học để lưu vào đây.</p>
          <Link
            to="/dashboard/courses"
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
          >
            Khám phá khoá học
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(({ id, courseId, course }) => (
            <div
              key={id}
              className="group rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all overflow-hidden"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-gray-800">
                {course.image ? (
                  <img
                    src={course.image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => remove.mutate(courseId)}
                  disabled={remove.isPending}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-red-500/80 flex items-center justify-center transition-colors"
                  title="Xoá khỏi wishlist"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>

                {/* Discount badge */}
                {(course as any).beforePrice > 0 && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-red-500 text-white text-xs font-bold">
                    -{Math.round((1 - (course as any).regularPrice / (course as any).beforePrice) * 100)}%
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <Link
                  to={`/courses/${course.id}`}
                  className="block text-white font-semibold hover:text-purple-300 transition-colors line-clamp-2"
                >
                  {course.title}
                </Link>

                <p className="text-gray-400 text-sm">
                  {course.user?.name || 'AeroEduVision'}
                </p>

                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {(course as any).lessons ?? '—'} bài
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-purple-300 font-bold">
                    {(course as any).regularPrice > 0
                      ? `${((course as any).regularPrice as number).toLocaleString()}₫`
                      : 'Miễn phí'}
                  </span>
                  {(course as any).beforePrice > 0 && (
                    <span className="text-gray-500 line-through text-sm">
                      {((course as any).beforePrice as number).toLocaleString()}₫
                    </span>
                  )}
                </div>

                <Link
                  to={`/courses/${course.id}`}
                  className="block w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium text-center transition-colors"
                >
                  Xem khoá học
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
