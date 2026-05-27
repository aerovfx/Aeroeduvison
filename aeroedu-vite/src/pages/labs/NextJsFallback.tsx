/**
 * LabNextJsFallback — Hiển thị cho labs chưa được triển khai
 *
 * Thay thế iframe cũ bằng trang thông tin lab đẹp mắt.
 * Khi lab được port xong → thêm route riêng trong router/index.tsx.
 */
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, FlaskConical, Clock, Star, Zap, BookOpen, AlertCircle } from 'lucide-react'

interface SimMeta {
  slug: string
  title: string
  titleEn: string
  desc: string
  category: string
  level: 'Cơ bản' | 'Trung bình' | 'Nâng cao'
  duration: string
  xp: number
  features: string[]
  objectives: string[]
  icon: string
}

const SIMULATIONS: SimMeta[] = [
  {
    slug: 'kinematics-1d',
    title: 'Chuyển động 1D',
    titleEn: 'Kinematics 1D',
    desc: 'Mô phỏng chuyển động thẳng đều và thẳng biến đổi đều. Vẽ đồ thị x-t, v-t, a-t theo thời gian thực.',
    category: 'Cơ học',
    level: 'Cơ bản',
    duration: '20 phút',
    xp: 100,
    icon: '📏',
    features: ['Đồ thị vị trí, vận tốc, gia tốc', 'Điều chỉnh v₀ và a', 'So sánh nhiều vật thể'],
    objectives: ['Phân biệt chuyển động đều và biến đổi', 'Đọc đồ thị động học', 'Áp dụng phương trình chuyển động'],
  },
  {
    slug: 'projectile',
    title: 'Ném xiên',
    titleEn: 'Projectile Motion',
    desc: 'Phân tích chuyển động ném xiên với góc và vận tốc ban đầu tùy chỉnh. Hiển thị quỹ đạo parabol và thành phần vận tốc.',
    category: 'Cơ học',
    level: 'Cơ bản',
    duration: '25 phút',
    xp: 120,
    icon: '🎯',
    features: ['Quỹ đạo parabol thời gian thực', 'Vector vận tốc vx / vy', 'Tầm xa, độ cao cực đại'],
    objectives: ['Phân tích thành phần chuyển động', 'Tìm tầm bay xa tối đa', 'Ảnh hưởng của góc ném'],
  },
  {
    slug: 'circular-motion',
    title: 'Chuyển động tròn',
    titleEn: 'Circular Motion',
    desc: 'Mô phỏng chuyển động tròn đều với lực hướng tâm, tốc độ góc và gia tốc hướng tâm.',
    category: 'Cơ học',
    level: 'Trung bình',
    duration: '25 phút',
    xp: 130,
    icon: '⭕',
    features: ['Vector lực hướng tâm', 'Đồ thị ω và v theo bán kính', 'Liên kết với chuyển động hành tinh'],
    objectives: ['Tính lực hướng tâm', 'Phân biệt ω và v dài', 'Ứng dụng: vệ tinh, quay tròn'],
  },
  {
    slug: 'energy-conservation',
    title: 'Bảo toàn năng lượng',
    titleEn: 'Energy Conservation',
    desc: 'Theo dõi thế năng, động năng và cơ năng toàn phần trong các hệ thống cơ học đơn giản.',
    category: 'Nhiệt động lực học',
    level: 'Trung bình',
    duration: '30 phút',
    xp: 140,
    icon: '⚡',
    features: ['Thanh năng lượng KE / PE / E', 'Con lắc, dốc trơn, lò xo', 'Mất năng lượng do ma sát'],
    objectives: ['Phát biểu định luật bảo toàn cơ năng', 'So sánh KE ↔ PE', 'Tính vận tốc tại các điểm'],
  },
  {
    slug: 'thermodynamics',
    title: 'Nhiệt động lực học',
    titleEn: 'Thermodynamics',
    desc: 'Khám phá các chu trình nhiệt động: đẳng nhiệt, đẳng áp, đẳng tích và chu trình Carnot.',
    category: 'Nhiệt động lực học',
    level: 'Nâng cao',
    duration: '45 phút',
    xp: 200,
    icon: '🌡️',
    features: ['Đồ thị P-V tương tác', 'Chu trình Carnot và hiệu suất', 'Nguyên lý I & II nhiệt động'],
    objectives: ['Phân tích các quá trình đẳng', 'Tính công và nhiệt lượng', 'Hiệu suất động cơ nhiệt'],
  },
  {
    slug: 'electromagnetic',
    title: 'Điện từ trường',
    titleEn: 'Electromagnetic Fields',
    desc: 'Trực quan hoá đường sức điện và từ trường, lực Lorentz và cảm ứng điện từ.',
    category: 'Điện từ',
    level: 'Nâng cao',
    duration: '40 phút',
    xp: 180,
    icon: '🔌',
    features: ['Đường sức điện trường', 'Từ trường của dây dẫn thẳng', 'Lực Lorentz trên điện tích'],
    objectives: ['Vẽ đường sức điện / từ', 'Tính lực trên điện tích chuyển động', 'Ứng dụng quy tắc bàn tay trái'],
  },
]

const LEVEL_COLOR: Record<string, string> = {
  'Cơ bản':   'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  'Trung bình': 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
  'Nâng cao': 'text-rose-400 bg-rose-500/15 border-rose-500/30',
}

export default function NextJsFallback() {
  const { labSlug } = useParams<{ labSlug: string }>()

  const meta = SIMULATIONS.find(s => s.slug === labSlug)

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          to="/dashboard/labtwin/labs"
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 text-sm font-medium transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>

        {meta ? (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
              <div className="text-5xl leading-none mt-1">{meta.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-3xl font-bold">{meta.title}</h1>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${LEVEL_COLOR[meta.level]}`}>
                    {meta.level}
                  </span>
                </div>
                <p className="text-white/50 text-sm italic mb-3">{meta.titleEn} · {meta.category}</p>
                <p className="text-white/75 leading-relaxed">{meta.desc}</p>
                <div className="flex items-center gap-5 mt-3 text-sm text-white/50">
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{meta.duration}</span>
                  <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-yellow-400" />+{meta.xp} XP</span>
                </div>
              </div>
            </div>

            {/* Coming Soon banner */}
            <div className="flex items-center gap-3 px-5 py-4 mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-amber-300 font-semibold text-sm">Lab đang được phát triển</p>
                <p className="text-amber-200/60 text-xs mt-0.5">
                  Mô phỏng này sẽ sớm ra mắt. Hãy thử các labs đã sẵn sàng bên dưới trong khi chờ đợi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Features */}
              <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-cyan-300 mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Tính năng nổi bật
                </h3>
                <ul className="space-y-2.5">
                  {meta.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                      <span className="text-cyan-400 mt-0.5">✦</span>{f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Objectives */}
              <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-5">
                <h3 className="text-sm font-bold text-cyan-300 mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Mục tiêu học tập
                </h3>
                <ul className="space-y-2.5">
                  {meta.objectives.map(o => (
                    <li key={o} className="flex items-start gap-2.5 text-sm text-white/70">
                      <span className="text-emerald-400 mt-0.5">▸</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          /* Unknown slug */
          <div className="text-center py-24">
            <div className="text-6xl mb-6">🔬</div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <FlaskConical className="h-5 w-5 text-cyan-400" />
              <h1 className="text-2xl font-bold">Lab không tìm thấy</h1>
            </div>
            <p className="text-white/50 mb-2">
              Lab <code className="font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">{labSlug}</code> chưa được triển khai hoặc không tồn tại.
            </p>
            <p className="text-white/40 text-sm mb-8">Vui lòng chọn một lab khác từ danh sách.</p>
            <Link
              to="/dashboard/labtwin/labs"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Xem tất cả labs
            </Link>
          </div>
        )}

        {/* Available labs shortcut */}
        <div className="mt-10 pt-8 border-t border-white/5">
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4 font-semibold">Labs đã sẵn sàng</p>
          <div className="flex flex-wrap gap-2">
            {[
              { slug: 'spring-pendulum',  label: '🌀 Lò xo con lắc' },
              { slug: 'simple-pendulum',  label: '🔴 Con lắc đơn' },
              { slug: 'optics-lab',       label: '🔦 Quang học' },
              { slug: 'wave-interference',label: '🌊 Giao thoa sóng' },
              { slug: 'mechaforce',       label: '⚙️ Cơ học lực' },
              { slug: 'aerodynamics',     label: '✈️ Khí động học' },
              { slug: 'circuit-simulator',label: '⚡ Mạch điện' },
              { slug: 'chemistry-lab',    label: '🧪 Hoá học' },
            ].map(({ slug, label }) => (
              <Link
                key={slug}
                to={`/dashboard/labtwin/${slug}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  slug === labSlug
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 cursor-default'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/90 border border-transparent'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
