import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { coursesService } from '@/services/courses.service'
import {
  BookOpen, Search, Star, Users, Clock, ChevronRight,
  Filter, Flame, TrendingUp, GraduationCap, Beaker, Cpu, Atom
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Category = 'all' | 'physics' | 'chemistry' | 'biology' | 'engineering' | 'math'
type Level = 'all' | 'beginner' | 'intermediate' | 'advanced'

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: BookOpen },
  { id: 'physics', label: 'Vật lý', icon: Atom },
  { id: 'chemistry', label: 'Hoá học', icon: Beaker },
  { id: 'biology', label: 'Sinh học', icon: TrendingUp },
  { id: 'engineering', label: 'Kỹ thuật', icon: Cpu },
  { id: 'math', label: 'Toán học', icon: GraduationCap },
]

const DEMO_COURSES = [
  {
    id: 'c1', name: 'Vật Lý Cơ Học Nâng Cao', description: 'Newton, chuyển động, lực, năng lượng — từ cơ bản đến nâng cao với 3D lab.',
    category: 'physics', level: 'intermediate', price: 0, rating: 4.8, enrollCount: 1248, chapterCount: 6, duration: 2400,
    imageGradient: 'from-blue-600 to-cyan-500', icon: '⚡', isNew: false, isPopular: true, progress: 47,
  },
  {
    id: 'c2', name: 'Hoá Học Hữu Cơ', description: 'Cấu trúc phân tử, phản ứng hữu cơ và thực hành phòng thí nghiệm ảo.',
    category: 'chemistry', level: 'intermediate', price: 0, rating: 4.6, enrollCount: 876, chapterCount: 8, duration: 3600,
    imageGradient: 'from-purple-600 to-pink-500', icon: '🧪', isNew: true, isPopular: false, progress: 0,
  },
  {
    id: 'c3', name: 'Nhập Môn Lập Trình Python', description: 'Học Python từ zero — biến, vòng lặp, hàm, OOP và ứng dụng AI.',
    category: 'engineering', level: 'beginner', price: 0, rating: 4.9, enrollCount: 2341, chapterCount: 10, duration: 4200,
    imageGradient: 'from-green-600 to-emerald-500', icon: '🐍', isNew: false, isPopular: true, progress: 23,
  },
  {
    id: 'c4', name: 'Toán Cao Cấp A1', description: 'Giới hạn, đạo hàm, tích phân — nền tảng cho kỹ thuật và khoa học.',
    category: 'math', level: 'intermediate', price: 0, rating: 4.5, enrollCount: 1567, chapterCount: 12, duration: 5400,
    imageGradient: 'from-orange-600 to-yellow-500', icon: '📐', isNew: false, isPopular: false, progress: 0,
  },
  {
    id: 'c5', name: 'Sinh Học Tế Bào', description: 'Cấu trúc tế bào, chuyển hoá năng lượng, di truyền học phân tử.',
    category: 'biology', level: 'beginner', price: 0, rating: 4.7, enrollCount: 654, chapterCount: 7, duration: 3000,
    imageGradient: 'from-teal-600 to-cyan-500', icon: '🔬', isNew: true, isPopular: false, progress: 0,
  },
  {
    id: 'c6', name: 'Điện Tử Cơ Bản', description: 'Mạch điện, linh kiện, mô phỏng và thiết kế PCB với lab ảo.',
    category: 'engineering', level: 'beginner', price: 0, rating: 4.4, enrollCount: 789, chapterCount: 9, duration: 3600,
    imageGradient: 'from-red-600 to-orange-500', icon: '💡', isNew: false, isPopular: false, progress: 0,
  },
  {
    id: 'c7', name: 'Cơ Học Lượng Tử', description: 'Nhập môn cơ học lượng tử, hàm sóng, nguyên lý bất định Heisenberg.',
    category: 'physics', level: 'advanced', price: 0, rating: 4.9, enrollCount: 412, chapterCount: 14, duration: 6000,
    imageGradient: 'from-indigo-600 to-purple-500', icon: '🌌', isNew: true, isPopular: false, progress: 0,
  },
  {
    id: 'c8', name: 'Thống Kê và Xác Suất', description: 'Phân phối xác suất, kiểm định giả thuyết, phân tích dữ liệu.',
    category: 'math', level: 'intermediate', price: 0, rating: 4.6, enrollCount: 934, chapterCount: 8, duration: 3200,
    imageGradient: 'from-cyan-600 to-blue-500', icon: '📊', isNew: false, isPopular: false, progress: 0,
  },
]

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  return h > 0 ? `${h}g` : `${minutes}p`
}

function CourseCard({ course }: { course: typeof DEMO_COURSES[0] }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all"
    >
      {/* Gradient banner */}
      <div className={cn('relative h-32 bg-gradient-to-br', course.imageGradient, 'flex items-center justify-center')}>
        <span className="text-5xl">{course.icon}</span>
        <div className="absolute top-2 left-2 flex gap-1.5">
          {course.isNew && (
            <span className="text-xs bg-white/20 text-white backdrop-blur px-2 py-0.5 rounded-full font-medium">Mới</span>
          )}
          {course.isPopular && (
            <span className="text-xs bg-white/20 text-white backdrop-blur px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Flame className="w-3 h-3" /> Hot
            </span>
          )}
        </div>
        {course.progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div className="h-full bg-white/70" style={{ width: `${course.progress}%` }} />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {course.name}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">{course.description}</p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {course.rating}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {course.enrollCount.toLocaleString()}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(course.duration)}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {course.chapterCount} chương</span>
        </div>

        <div className="flex items-center justify-between">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            course.level === 'beginner' ? 'bg-green-500/10 text-green-600' :
            course.level === 'intermediate' ? 'bg-blue-500/10 text-blue-600' :
            'bg-purple-500/10 text-purple-600'
          )}>
            {course.level === 'beginner' ? 'Cơ bản' : course.level === 'intermediate' ? 'Trung cấp' : 'Nâng cao'}
          </span>
          <span className="text-xs font-semibold text-primary flex items-center gap-1">
            {course.progress > 0 ? `${course.progress}%` : 'Bắt đầu'}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CoursesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [activeLevel, setActiveLevel] = useState<Level>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: apiData } = useQuery({
    queryKey: ['courses', activeCategory],
    queryFn: () => coursesService.getAll({ categoryId: activeCategory === 'all' ? undefined : activeCategory }),
    retry: false,
  })

  // Merge API data with demo
  const allCourses = DEMO_COURSES

  const filtered = allCourses.filter(c => {
    if (activeCategory !== 'all' && c.category !== activeCategory) return false
    if (activeLevel !== 'all' && c.level !== activeLevel) return false
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const inProgress = allCourses.filter(c => c.progress > 0 && c.progress < 100)

  return (
    <div className="p-6 animate-fade-in space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Khoá Học</h1>
            <p className="text-sm text-muted-foreground">{allCourses.length} khoá học miễn phí</p>
          </div>
        </div>
      </div>

      {/* In progress strip */}
      {inProgress.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Đang học
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {inProgress.map(course => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="shrink-0 flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary transition-colors min-w-[240px]"
              >
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-lg', course.imageGradient)}>
                  {course.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{course.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${course.progress}%` }} />
                    </div>
                    <span className="text-xs text-primary font-medium">{course.progress}%</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khoá học..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={activeLevel}
            onChange={e => setActiveLevel(e.target.value as Level)}
            className="bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Mọi cấp độ</option>
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung cấp</option>
            <option value="advanced">Nâng cao</option>
          </select>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as Category)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                activeCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div>
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} khoá học{searchQuery ? ` cho "${searchQuery}"` : ''}
        </p>
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Không tìm thấy khoá học nào</p>
            <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); setActiveLevel('all') }} className="text-sm text-primary mt-2 hover:underline">
              Xoá bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
