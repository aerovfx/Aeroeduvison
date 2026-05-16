/**
 * LabTwin — Virtual Labs Index
 * Clone từ: app/(dashboard)/(routes)/dashboard/labtwin/page.tsx
 * Dark-first Tailwind — giống hoàn toàn bố cục bản gốc
 */
import { Link } from 'react-router-dom'
import {
  FlaskConical, Star, Clock, ArrowRight, Sparkles,
  TrendingUp, Award, Zap, ArrowLeft,
  FunctionSquare, Wrench, Wind, QrCode,
} from 'lucide-react'
import { QuickScanQr } from '@/components/common/QuickScanQr'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimPreview {
  name: string
  duration: string
  xp: number
}

interface CategorySummary {
  category: string
  count: number
  totalXP: number
  preview: SimPreview[]
}

// ─── Static Python simulation category data ───────────────────────────────────

const PYTHON_TOTAL = 38

const PYTHON_CATEGORIES: CategorySummary[] = [
  {
    category: 'Cơ học', count: 12, totalXP: 2670,
    preview: [
      { name: 'Aerodynamics Simulation', duration: '45 phút', xp: 250 },
      { name: 'AeroFlow 3D Advanced',    duration: '60 phút', xp: 300 },
    ],
  },
  // 📌 Category "Học qua trò chơi" đã chuyển sang /dashboard/games (Game Hub)
  // — tách bạch lab khoa học với trò chơi để dễ quản lí.
  {
    category: 'Machine Learning', count: 3, totalXP: 880,
    preview: [
      { name: 'DataSim AI',             duration: '60 phút', xp: 300 },
      { name: 'Neural Network Simulator', duration: '65 phút', xp: 300 },
    ],
  },
  {
    category: 'Computer Vision', count: 2, totalXP: 550,
    preview: [
      { name: 'Motion Tracking CV',  duration: '50 phút', xp: 250 },
      { name: 'OCR Grading System',  duration: '55 phút', xp: 300 },
    ],
  },
  {
    category: 'Thị giác máy tính', count: 2, totalXP: 450,
    preview: [
      { name: 'Video Trajectory Tracking', duration: '45 phút', xp: 200 },
      { name: 'AI Vision & Emotion Hub',   duration: 'Unlimited', xp: 250 },
    ],
  },
  {
    category: 'Hóa học', count: 3, totalXP: 500,
    preview: [
      { name: 'Chemistry Lab Basic',   duration: '25 phút', xp: 120 },
      { name: 'ChemLab 3D Advanced',   duration: '40 phút', xp: 200 },
    ],
  },
  {
    category: 'Sóng', count: 3, totalXP: 530,
    preview: [
      { name: 'Dao động điều hòa - Con lắc lò xo', duration: '30 phút', xp: 180 },
      { name: 'Con lắc đơn',                       duration: '30 phút', xp: 150 },
    ],
  },
  {
    category: 'Quang học', count: 2, totalXP: 300,
    preview: [
      { name: 'Optics Lab',          duration: '35 phút', xp: 180 },
      { name: 'Refraction Explorer', duration: '20 phút', xp: 120 },
    ],
  },
  {
    category: 'Sinh học', count: 1, totalXP: 180,
    preview: [
      { name: 'BioGrowth Simulation', duration: '35 phút', xp: 180 },
    ],
  },
  {
    category: 'Nhiệt học', count: 1, totalXP: 250,
    preview: [
      { name: 'ThermoFlow Simulation', duration: '45 phút', xp: 250 },
    ],
  },
  {
    category: 'Procedural Generation', count: 1, totalXP: 350,
    preview: [
      { name: 'WFC Builder', duration: '75 phút', xp: 350 },
    ],
  },
  {
    category: 'Điện tử', count: 1, totalXP: 200,
    preview: [
      { name: 'Electronics Simulator', duration: '30 phút', xp: 200 },
    ],
  },
]

// ─── Category display helpers ─────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  'Cơ học':                '⚡',
  'Quang học':             '💡',
  'Điện từ':               '🔋',
  'Sóng':                  '🌊',
  'Nhiệt học':             '🔥',
  'Thị giác máy tính':     '👁️',
  'Computer Vision':       '📷',
  'Procedural Generation': '🎲',
  'Machine Learning':      '🤖',
  'Hóa học':               '🧪',
  'Sinh học':              '🌿',
  'Học qua trò chơi':      '🎮',
  'Điện tử':               '🔌',
}

// Dark-first card gradient per category
const CATEGORY_GRADIENT: Record<string, string> = {
  'Cơ học':                'from-[hsl(280,60%,15%)] to-[hsl(300,55%,18%)]',
  'Quang học':             'from-[hsl(38,80%,14%)] to-[hsl(50,80%,17%)]',
  'Điện từ':               'from-[hsl(210,80%,14%)] to-[hsl(225,80%,17%)]',
  'Sóng':                  'from-[hsl(185,75%,13%)] to-[hsl(200,70%,16%)]',
  'Nhiệt học':             'from-[hsl(20,80%,14%)] to-[hsl(35,80%,17%)]',
  'Thị giác máy tính':     'from-[hsl(175,65%,13%)] to-[hsl(185,60%,16%)]',
  'Computer Vision':       'from-[hsl(145,60%,13%)] to-[hsl(160,55%,16%)]',
  'Procedural Generation': 'from-[hsl(245,70%,14%)] to-[hsl(260,65%,17%)]',
  'Machine Learning':      'from-[hsl(262,65%,14%)] to-[hsl(280,60%,17%)]',
  'Hóa học':               'from-[hsl(160,60%,13%)] to-[hsl(175,55%,16%)]',
  'Sinh học':              'from-[hsl(130,60%,13%)] to-[hsl(145,55%,16%)]',
  'Học qua trò chơi':      'from-[hsl(80,55%,13%)] to-[hsl(95,50%,16%)]',
  'Điện tử':               'from-[hsl(225,70%,14%)] to-[hsl(240,65%,17%)]',
}
const DEFAULT_GRADIENT = 'from-[hsl(220,30%,12%)] to-[hsl(230,25%,15%)]'

const CATEGORY_BORDER: Record<string, string> = {
  'Cơ học':                'border-[hsl(280,60%,35%)]/25',
  'Quang học':             'border-[hsl(38,80%,40%)]/25',
  'Điện từ':               'border-[hsl(210,80%,40%)]/25',
  'Sóng':                  'border-[hsl(185,75%,40%)]/25',
  'Nhiệt học':             'border-[hsl(20,80%,40%)]/25',
  'Thị giác máy tính':     'border-[hsl(175,65%,38%)]/25',
  'Computer Vision':       'border-[hsl(145,60%,38%)]/25',
  'Procedural Generation': 'border-[hsl(245,70%,40%)]/25',
  'Machine Learning':      'border-[hsl(262,65%,40%)]/25',
  'Hóa học':               'border-[hsl(160,60%,38%)]/25',
  'Sinh học':              'border-[hsl(130,60%,38%)]/25',
  'Học qua trò chơi':      'border-[hsl(80,55%,38%)]/25',
  'Điện tử':               'border-[hsl(225,70%,40%)]/25',
}

// ─── Popular labs (hiển thị thẻ QR riêng cho từng thí nghiệm) ────────────────
// Học sinh quét QR là vào thẳng đúng thí nghiệm, không cần điều hướng qua menu.
interface PopularLab {
  name: string
  emoji: string
  path: string
  desc: string
  accent: 'indigo' | 'cyan' | 'emerald' | 'fuchsia' | 'amber' | 'rose'
}

const POPULAR_LABS: PopularLab[] = [
  {
    name: 'AirflowCFD 3D',
    emoji: '💨',
    path: '/dashboard/labtwin/labs/airflow-cfd',
    desc: 'Dòng không khí qua vật thể 3D',
    accent: 'fuchsia',
  },
  {
    name: 'Graph Lab',
    emoji: '📈',
    path: '/dashboard/labtwin/labs/graph-lab',
    desc: 'Máy tính đồ thị y = f(x)',
    accent: 'cyan',
  },
  {
    name: 'Physics Motion',
    emoji: '🎯',
    path: '/dashboard/labtwin/labs/physics-motion',
    desc: 'Chuyển động ném xiên · va chạm',
    accent: 'rose',
  },
  {
    name: 'Con lắc lò xo',
    emoji: '🌀',
    path: '/dashboard/labtwin/labs/spring-pendulum',
    desc: 'Dao động điều hòa',
    accent: 'indigo',
  },
  {
    name: 'Con lắc đơn',
    emoji: '⚖️',
    path: '/dashboard/labtwin/labs/simple-pendulum',
    desc: 'Chu kỳ T = 2π√(l/g)',
    accent: 'emerald',
  },
  {
    name: 'Wave Interference',
    emoji: '🌊',
    path: '/dashboard/labtwin/labs/wave-interference',
    desc: 'Giao thoa sóng',
    accent: 'cyan',
  },
  {
    name: 'Chemistry Lab',
    emoji: '🧪',
    path: '/dashboard/labtwin/labs/chemistry-lab',
    desc: 'Phản ứng · phương trình',
    accent: 'emerald',
  },
  {
    name: 'Optics Lab',
    emoji: '🔬',
    path: '/dashboard/labtwin/labs/optics-lab',
    desc: 'Thấu kính · khúc xạ',
    accent: 'amber',
  },
  {
    name: 'Circuit Simulator',
    emoji: '🔌',
    path: '/dashboard/labtwin/labs/circuit-simulator',
    desc: 'Mạch điện RLC · Ohm · Kirchhoff',
    accent: 'indigo',
  },
  {
    name: 'Digital Logic Lab',
    emoji: '⚙️',
    path: '/dashboard/labtwin/labs/digital-logic-lab',
    desc: 'Cổng logic số · Boole · bảng chân lý',
    accent: 'cyan',
  },
  {
    name: 'Arduino Emulator',
    emoji: '⚡',
    path: '/dashboard/iot-lab/emulator',
    desc: 'Viết code C++ → chạy real-time trong browser',
    accent: 'emerald',
  },
  {
    name: 'MechaForce',
    emoji: '🤖',
    path: '/dashboard/labtwin/labs/mechaforce',
    desc: 'Lực · động lực học',
    accent: 'rose',
  },
  {
    name: 'Pixel Agents',
    emoji: '🧠',
    path: '/dashboard/labtwin/labs/pixel-agents',
    desc: 'AI multi-agent · game',
    accent: 'fuchsia',
  },
  {
    name: 'Gesture Swarm',
    emoji: '👋',
    path: '/dashboard/labtwin/labs/gesture-swarm',
    desc: 'CV nhận diện cử chỉ',
    accent: 'amber',
  },
]

// Lấy origin của site — fallback inphysic.com nếu chạy SSR/test
function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'https://inphysic.com'
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabsIndexPage() {
  const totalExperiments = PYTHON_TOTAL
  const origin = siteOrigin()
  const labsCatalogUrl = `${origin}/dashboard/labtwin/labs`

  const achievements = [
    { icon: '🏆', title: 'Nhà khoa học mới',  desc: 'Hoàn thành 3 thí nghiệm đầu',     xp: 150, locked: true },
    { icon: '⚡', title: 'Chuyên gia vật lý', desc: 'Hoàn thành tất cả thí nghiệm',     xp: 500, locked: true },
    { icon: '🌟', title: 'Bậc thầy Python',   desc: 'Xem code của 5 simulations',       xp: 200, locked: true },
  ]

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)]">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-4 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Dashboard
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-2xl text-white shadow-xl hover:scale-105 transition-transform">
              <FlaskConical className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                🧪 LabTwin
              </h1>
              <p className="text-white/50 mt-1 text-xl">
                Phòng thí nghiệm ảo siêu cool! Khám phá khoa học như chơi game! 🚀
              </p>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { emoji: '🎯', value: totalExperiments, label: 'Thí nghiệm', border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', sub: 'text-purple-300/60' },
              { emoji: '✅', value: 0,                label: 'Hoàn thành', border: 'border-green-500/20',  bg: 'bg-green-500/10',  text: 'text-green-400',  sub: 'text-green-300/60' },
              { emoji: '⭐', value: '0/1000',         label: 'XP Points',  border: 'border-yellow-500/20', bg: 'bg-yellow-500/10', text: 'text-yellow-400', sub: 'text-yellow-300/60' },
              { emoji: '📊', value: '0%',             label: 'Tiến độ',    border: 'border-pink-500/20',   bg: 'bg-pink-500/10',   text: 'text-pink-400',   sub: 'text-pink-300/60' },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} border-2 ${s.border} rounded-2xl p-4 text-center hover:shadow-lg transition-shadow`}
              >
                <div className="text-3xl mb-2">{s.emoji}</div>
                <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
                <div className={`text-sm ${s.sub}`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── QR truy cập nhanh — học sinh quét là vào thẳng LabTwin ── */}
          <div className="mb-8">
            <QuickScanQr
              targetUrl={labsCatalogUrl}
              accent="indigo"
              title="Quét QR để mở LabTwin trên điện thoại"
              description={`Học sinh chỉ cần mở camera, quét mã là vào thẳng danh mục ${PYTHON_TOTAL} thí nghiệm Python — không cần đăng nhập, không cần gõ link.`}
              downloadName="labtwin-qr.png"
            />
          </div>

          {/* ── Python Simulations — All Categories ── */}
          <div className="mb-8 rounded-2xl border-2 border-indigo-500/25 bg-gradient-to-br from-[hsl(245,50%,10%)] via-[hsl(270,45%,9%)] to-[hsl(290,45%,10%)] overflow-hidden relative">
            <div className="absolute top-0 right-0 text-[9rem] opacity-[0.06] select-none pointer-events-none leading-none">🐍</div>

            {/* Header */}
            <div className="relative z-10 px-6 pt-6 pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-indigo-100 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-yellow-400" />
                    Python Simulations &amp; Labs
                  </h2>
                  <p className="text-lg mt-2 text-indigo-300/70">
                    {PYTHON_TOTAL} thí nghiệm được code bằng Python thật! Mỗi danh mục có nhiều labs cool! 🎨
                  </p>
                </div>
                <Link to="/dashboard/labtwin/labs">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all">
                    Xem tất cả
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </Link>
              </div>
            </div>

            {/* Category cards grid */}
            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PYTHON_CATEGORIES.map((cat) => {
                  const emoji = CATEGORY_ICON[cat.category] ?? '🔬'
                  const gradient = CATEGORY_GRADIENT[cat.category] ?? DEFAULT_GRADIENT
                  const border = CATEGORY_BORDER[cat.category] ?? 'border-white/10'

                  return (
                    <div
                      key={cat.category}
                      className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${gradient} border-2 ${border} overflow-hidden relative rounded-2xl`}
                    >
                      {/* Decorative circles */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.04] rounded-full -mr-10 -mt-10" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/[0.04] rounded-full -ml-8 -mb-8" />

                      <div className="p-5 relative z-10">
                        <div className="text-center mb-4">
                          <div className="text-6xl mb-3 group-hover:scale-125 transition-transform inline-block">
                            {emoji}
                          </div>
                          <h3 className="font-bold text-xl text-white/90 mb-2">{cat.category}</h3>
                          <div className="flex items-center justify-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.1] text-white/70 border border-white/10">
                              {cat.count} labs
                            </span>
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/25 text-yellow-300">
                              <Star className="h-3 w-3" />
                              {cat.totalXP} XP
                            </span>
                          </div>
                        </div>

                        {/* Preview of first 2 sims */}
                        <div className="space-y-2 mb-4">
                          {cat.preview.map((sim, i) => (
                            <div
                              key={i}
                              className="text-xs bg-white/[0.07] rounded-lg p-2 border border-white/[0.08]"
                            >
                              <div className="font-semibold text-white/80 line-clamp-1">{sim.name}</div>
                              <div className="text-white/40 flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {sim.duration}
                                </span>
                                <span>•</span>
                                <span>+{sim.xp} XP</span>
                              </div>
                            </div>
                          ))}
                          {cat.count > 2 && (
                            <div className="text-xs text-center text-white/40 font-medium">
                              +{cat.count - 2} thí nghiệm nữa
                            </div>
                          )}
                        </div>

                        <Link to={`/dashboard/labtwin/labs?category=${encodeURIComponent(cat.category)}`}>
                          <button className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                            Khám phá {cat.category}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Quick access bar */}
              <div className="mt-6 p-4 bg-white/[0.04] rounded-xl border-2 border-indigo-500/15">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🎯</div>
                    <div>
                      <h4 className="font-bold text-indigo-200">Tất cả Python Simulations</h4>
                      <p className="text-sm text-indigo-300/60">
                        Xem danh sách đầy đủ {PYTHON_TOTAL} thí nghiệm Python
                      </p>
                    </div>
                  </div>
                  <Link to="/dashboard/labtwin/labs">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-indigo-300 hover:bg-indigo-500/20 border-2 border-indigo-500/20 rounded-xl font-semibold transition-all">
                      Xem tất cả
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Labs & Công cụ ── */}
          <div className="mb-8 rounded-2xl border-2 border-cyan-500/25 bg-gradient-to-br from-[hsl(200,50%,9%)] via-[hsl(220,45%,10%)] to-[hsl(260,40%,11%)] overflow-hidden relative">
            <div className="absolute top-0 right-0 text-[9rem] opacity-[0.06] select-none pointer-events-none leading-none">🧰</div>

            {/* Header */}
            <div className="relative z-10 px-6 pt-6 pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-cyan-100 flex items-center gap-2">
                    <Wrench className="h-8 w-8 text-cyan-300" />
                    Labs &amp; Công cụ
                  </h2>
                  <p className="text-lg mt-2 text-cyan-300/70">
                    Bộ công cụ tương tác cho học sinh — vẽ đồ thị, tính toán, khám phá trực quan. ✨
                  </p>
                </div>
              </div>
            </div>

            {/* Tool cards */}
            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Graph — featured */}
                <Link
                  to="/dashboard/labtwin/labs/graph-lab"
                  className="group relative rounded-2xl border-2 border-cyan-400/30 bg-gradient-to-br from-[hsl(190,70%,12%)] to-[hsl(220,65%,14%)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="absolute inset-0 opacity-[0.12] pointer-events-none">
                    <svg viewBox="0 0 200 120" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="ggrid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60, 80, 100].map((y) => (
                        <line key={`gy${y}`} x1="0" y1={y} x2="200" y2={y} stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.4" />
                      ))}
                      {[40, 80, 120, 160].map((x) => (
                        <line key={`gx${x}`} x1={x} y1="0" x2={x} y2="120" stroke="#22d3ee" strokeOpacity="0.15" strokeWidth="0.4" />
                      ))}
                      <path
                        d="M0,100 Q25,60 50,70 T100,40 T150,55 T200,20"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0,70 Q25,90 50,50 T100,80 T150,40 T200,90"
                        fill="none"
                        stroke="#f472b6"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <div className="relative z-10 p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/20 ring-1 ring-cyan-400/40 group-hover:scale-110 transition-transform">
                        <FunctionSquare className="h-7 w-7 text-cyan-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-2xl text-white">Graph</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-200 border border-cyan-400/40 uppercase tracking-wider">
                            Mới
                          </span>
                        </div>
                        <p className="text-xs text-cyan-200/70 mt-0.5 font-mono">y = f(x) • nhiều đồ thị</p>
                      </div>
                    </div>

                    <p className="text-sm text-white/70 mb-3 leading-relaxed">
                      Máy tính đồ thị kiểu GeoGebra — nhập phương trình, vẽ trực quan, kéo &amp; zoom, bàn phím toán học tích hợp.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['Đại số', 'Hàm số', 'Lượng giác', 'Mũ & log'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10.5px] bg-white/[0.06] text-cyan-100/80 border border-cyan-400/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                      Mở Graph
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Link>

                {/* AirflowCFD — featured (R3F airflow simulator) */}
                <Link
                  to="/dashboard/labtwin/labs/airflow-cfd"
                  className="group relative rounded-2xl border-2 border-fuchsia-400/30 bg-gradient-to-br from-[hsl(280,55%,12%)] to-[hsl(220,60%,12%)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  {/* Decorative streamlines */}
                  <div className="absolute inset-0 opacity-[0.18] pointer-events-none">
                    <svg viewBox="0 0 200 120" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id="streamGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%"  stopColor="#22d3ee" />
                          <stop offset="50%" stopColor="#a78bfa" />
                          <stop offset="100%" stopColor="#e879f9" />
                        </linearGradient>
                      </defs>
                      {[20, 40, 60, 80, 100].map((y, i) => (
                        <path
                          key={`s${i}`}
                          d={`M0,${y} Q60,${y - 10 + i * 4} 100,${y} T200,${y + (i % 2 === 0 ? -8 : 8)}`}
                          fill="none"
                          stroke="url(#streamGrad)"
                          strokeWidth="1.2"
                        />
                      ))}
                      <circle cx="100" cy="60" r="14" fill="#e879f9" fillOpacity="0.3" />
                    </svg>
                  </div>

                  <div className="relative z-10 p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-fuchsia-500/20 ring-1 ring-fuchsia-400/40 group-hover:scale-110 transition-transform">
                        <Wind className="h-7 w-7 text-fuchsia-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-2xl text-white">AirflowCFD</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 text-fuchsia-200 border border-fuchsia-400/40 uppercase tracking-wider">
                            R3F
                          </span>
                        </div>
                        <p className="text-xs text-fuchsia-200/70 mt-0.5 font-mono">streamlines · pressure · CFD</p>
                      </div>
                    </div>

                    <p className="text-sm text-white/70 mb-3 leading-relaxed">
                      Mô phỏng dòng không khí qua 5 vật thể 3D — cánh máy bay, hình cầu, trụ, thân xe, rotor bơm. Có streamlines, áp suất bề mặt, đồ thị hội tụ.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['Reynolds', 'CL/CD', 'AoA', 'Streamlines'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10.5px] bg-white/[0.06] text-fuchsia-100/80 border border-fuchsia-400/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button className="w-full py-2.5 px-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                      Mở AirflowCFD
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </Link>

                <div className="relative rounded-2xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 overflow-hidden opacity-70">
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 ring-1 ring-slate-700">
                        <Wrench className="h-7 w-7 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-2xl text-slate-300">Đổi đơn vị</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                            Sắp ra
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">m ↔ cm · kg ↔ g · K ↔ °C</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                      Chuyển đổi giữa các đơn vị đo lường trong vật lý &amp; hóa học, kèm công thức và ví dụ minh họa.
                    </p>
                    <div className="flex-1" />
                    <button
                      disabled
                      className="w-full py-2.5 px-3 bg-slate-800 text-slate-500 text-sm font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      Đang phát triển
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick tip */}
              <div className="mt-6 p-4 bg-white/[0.04] rounded-xl border-2 border-cyan-500/15 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💡</div>
                  <div>
                    <h4 className="font-bold text-cyan-200">Mẹo dùng Graph</h4>
                    <p className="text-sm text-cyan-300/60">
                      Nhấn vào bàn phím toán học để chèn hàm, lăn chuột để zoom, kéo để di chuyển — giống GeoGebra Calculator.
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/labtwin/labs/graph-lab">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-cyan-300 hover:bg-cyan-500/20 border-2 border-cyan-500/20 rounded-xl font-semibold transition-all">
                    Thử ngay
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Achievements + Goals ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Achievements */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-400/5 border-2 border-amber-500/20 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-500/10">
                <h3 className="flex items-center gap-2 text-amber-200 font-bold text-lg">
                  <Award className="h-6 w-6 text-amber-400" />
                  Thành tích của bạn
                </h3>
              </div>
              <div className="p-6 space-y-3">
                {achievements.map((a, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl flex items-center gap-3 bg-white/[0.04] border border-white/[0.06]"
                  >
                    <div className="text-3xl">{a.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white/80">{a.title}</h4>
                      <p className="text-xs text-white/40">{a.desc}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/20">
                      +{a.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly goals */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-400/5 border-2 border-blue-500/20 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-blue-500/10">
                <h3 className="flex items-center gap-2 text-blue-200 font-bold text-lg">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  Mục tiêu tuần này
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-200">Hoàn thành 2 thí nghiệm</span>
                    <span className="text-sm text-blue-300/60">0/2</span>
                  </div>
                  <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 w-0 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-200">Kiếm 200 XP</span>
                    <span className="text-sm text-blue-300/60">0/200</span>
                  </div>
                  <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 w-0 rounded-full" />
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-500/15">
                  <Link to="/dashboard/labtwin/labs">
                    <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      Bắt đầu thí nghiệm ngay!
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Mã QR cho từng thí nghiệm — tiện in ra dán lớp học ── */}
          <div className="mb-8 rounded-2xl border-2 border-indigo-500/25 bg-gradient-to-br from-[hsl(240,50%,9%)] via-[hsl(260,45%,10%)] to-[hsl(225,45%,10%)] overflow-hidden relative">
            <div className="absolute top-0 right-0 text-[9rem] opacity-[0.05] select-none pointer-events-none leading-none">📱</div>

            <div className="relative z-10 px-6 pt-6 pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-indigo-100 flex items-center gap-2">
                    <QrCode className="h-7 w-7 text-indigo-300" />
                    Mã QR cho từng thí nghiệm
                  </h2>
                  <p className="text-base mt-1.5 text-indigo-300/70">
                    Dành cho giáo viên — nhấn "Tải PNG" rồi in ra dán lớp, học sinh quét là vào thẳng đúng thí nghiệm.
                  </p>
                </div>
                <Link to="/dashboard/labtwin/labs">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-indigo-300 hover:bg-indigo-500/20 border-2 border-indigo-500/20 rounded-xl font-semibold transition-all text-sm">
                    Xem tất cả labs
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>

            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {POPULAR_LABS.map((lab) => {
                  const url = `${origin}${lab.path}`
                  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(url)}`
                  const qrHires = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=8&data=${encodeURIComponent(url)}`
                  return (
                    <div
                      key={lab.path}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all p-4 flex flex-col items-center text-center"
                    >
                      <div className="p-2 bg-white rounded-xl mb-3 shadow-[0_0_24px_rgba(99,102,241,0.18)]">
                        <img src={qrImg} alt={`QR ${lab.name}`} className="w-28 h-28 object-contain" loading="lazy" />
                      </div>
                      <div className="text-2xl mb-1">{lab.emoji}</div>
                      <h4 className="text-sm font-bold text-white/90 mb-0.5 line-clamp-1">{lab.name}</h4>
                      <p className="text-[11px] text-white/45 leading-snug mb-3 line-clamp-2 min-h-[28px]">
                        {lab.desc}
                      </p>
                      <div className="flex items-center gap-1.5 w-full">
                        <Link
                          to={lab.path}
                          className="flex-1 text-center text-[11px] font-semibold px-2 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/25 transition-all"
                        >
                          Mở
                        </Link>
                        <a
                          href={qrHires}
                          download={`qr-${lab.path.split('/').pop()}.png`}
                          className="text-[11px] font-medium px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] transition-all"
                          title="Tải QR độ phân giải cao"
                        >
                          Tải PNG
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-start gap-3">
                <div className="text-2xl shrink-0">💡</div>
                <p className="text-xs text-indigo-200/70 leading-relaxed">
                  <span className="font-semibold text-indigo-100">Mẹo:</span> Tải PNG rồi in khổ A5 dán vào bàn thí nghiệm /
                  bảng lớp. Học sinh quét bằng app Camera (iOS) hoặc Google Lens (Android) để vào thẳng thí nghiệm mà
                  không cần đăng nhập. URL được sinh tự động theo domain hiện tại của trang — phù hợp cả staging lẫn production.
                </p>
              </div>
            </div>
          </div>

          {/* ── CTA Banner ── */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🎓✨</div>
              <h2 className="text-3xl font-bold mb-3">Sẵn sàng khám phá khoa học?</h2>
              <p className="text-xl mb-6 text-white/90">
                Hơn {PYTHON_TOTAL} thí nghiệm đang chờ bạn! Mỗi thí nghiệm là một cuộc phiêu lưu mới! 🚀
              </p>
              <Link to="/dashboard/labtwin/labs">
                <button className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg rounded-xl shadow-xl transition-all hover:scale-105">
                  <FlaskConical className="h-6 w-6" />
                  Khám phá ngay!
                  <ArrowRight className="h-6 w-6" />
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
