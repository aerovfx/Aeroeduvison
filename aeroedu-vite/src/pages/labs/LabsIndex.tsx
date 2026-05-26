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

// ─── LabTwin catalog — đã sắp xếp lại, gộp các category trùng lặp ───────────
// User: "sắp xếp lại toàn bộ labtwin, xoá các lab trùng lặp"
//
// Đã GỘP:
//   - "Computer Vision" + "Thị giác máy tính" → 1 category "Thị giác máy tính"
// Đã BỎ:
//   - "Procedural Generation" (WFC Builder — chưa có FE)
//   - Category trùng (Computer Vision EN dup)
// Đã THÊM:
//   - Toán & Trực quan hoá (Graph Lab + Fourier Epicycles + Periodic Table)
//   - Periodic Table vào Hoá học
//   - Video Tracking vào Thị giác máy tính
// Categories cuối: 8 (vs 11 cũ) — clean hơn

const PYTHON_TOTAL = 32

const PYTHON_CATEGORIES: CategorySummary[] = [
  {
    category: 'Cơ học', count: 8, totalXP: 2100,
    preview: [
      { name: 'Physics Motion',          duration: '40 phút', xp: 220 },
      { name: 'AirflowCFD 3D',           duration: '60 phút', xp: 300 },
    ],
  },
  {
    category: 'Sóng', count: 4, totalXP: 700,
    preview: [
      { name: 'Wave Interference',                 duration: '35 phút', xp: 200 },
      { name: 'Dao động điều hòa - Con lắc lò xo', duration: '30 phút', xp: 180 },
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
    category: 'Toán & Trực quan', count: 3, totalXP: 480,
    preview: [
      { name: 'Graph Lab',          duration: '30 phút', xp: 150 },
      { name: 'Fourier Epicycles',  duration: '20 phút', xp: 180 },
    ],
  },
  {
    category: 'Hóa học', count: 4, totalXP: 700,
    preview: [
      { name: 'Periodic Table 3D',   duration: '30 phút', xp: 200 },
      { name: 'Chemistry Lab',       duration: '25 phút', xp: 120 },
    ],
  },
  {
    category: 'Sinh học', count: 1, totalXP: 180,
    preview: [
      { name: 'BioGrowth Simulation', duration: '35 phút', xp: 180 },
    ],
  },
  {
    category: 'Thị giác máy tính', count: 4, totalXP: 1000,
    preview: [
      { name: 'Video Trajectory Tracking', duration: '45 phút', xp: 250 },
      { name: 'Motion Tracking CV',        duration: '50 phút', xp: 250 },
    ],
  },
  {
    category: 'Machine Learning', count: 3, totalXP: 880,
    preview: [
      { name: 'DataSim AI',               duration: '60 phút', xp: 300 },
      { name: 'Neural Network Simulator', duration: '65 phút', xp: 300 },
    ],
  },
  {
    category: 'Điện tử & IoT', count: 3, totalXP: 600,
    preview: [
      { name: 'Circuit Simulator',     duration: '30 phút', xp: 200 },
      { name: 'Digital Logic Lab',     duration: '40 phút', xp: 200 },
    ],
  },
]

// ─── Category display helpers ─────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, string> = {
  'Cơ học':                '⚡',
  'Sóng':                  '🌊',
  'Quang học':             '💡',
  'Toán & Trực quan':      '📈',
  'Hóa học':               '🧪',
  'Sinh học':              '🌿',
  'Thị giác máy tính':     '👁️',
  'Machine Learning':      '🤖',
  'Điện tử & IoT':         '🔌',
}

/* Card gradient per category — light first, dark variant cho dark mode.
   Light: tailwind palette nhạt (100 shade) cho readable text overlay.
   Dark: HSL cosmic dark như cũ — giữ visual identity. */
const CATEGORY_GRADIENT: Record<string, string> = {
  'Cơ học':            'from-purple-100 to-fuchsia-100 dark:from-[hsl(280,60%,15%)] dark:to-[hsl(300,55%,18%)]',
  'Sóng':              'from-cyan-100 to-sky-100 dark:from-[hsl(185,75%,13%)] dark:to-[hsl(200,70%,16%)]',
  'Quang học':         'from-amber-100 to-yellow-100 dark:from-[hsl(38,80%,14%)] dark:to-[hsl(50,80%,17%)]',
  'Toán & Trực quan':  'from-indigo-100 to-blue-100 dark:from-[hsl(220,70%,14%)] dark:to-[hsl(235,65%,17%)]',
  'Hóa học':           'from-emerald-100 to-teal-100 dark:from-[hsl(160,60%,13%)] dark:to-[hsl(175,55%,16%)]',
  'Sinh học':          'from-green-100 to-emerald-100 dark:from-[hsl(130,60%,13%)] dark:to-[hsl(145,55%,16%)]',
  'Thị giác máy tính': 'from-teal-100 to-cyan-100 dark:from-[hsl(175,65%,13%)] dark:to-[hsl(185,60%,16%)]',
  'Machine Learning':  'from-violet-100 to-purple-100 dark:from-[hsl(262,65%,14%)] dark:to-[hsl(280,60%,17%)]',
  'Điện tử & IoT':     'from-blue-100 to-indigo-100 dark:from-[hsl(225,70%,14%)] dark:to-[hsl(240,65%,17%)]',
}
const DEFAULT_GRADIENT = 'from-slate-100 to-gray-100 dark:from-[hsl(220,30%,12%)] dark:to-[hsl(230,25%,15%)]'

const CATEGORY_BORDER: Record<string, string> = {
  'Cơ học':            'border-[hsl(280,60%,35%)]/25',
  'Sóng':              'border-[hsl(185,75%,40%)]/25',
  'Quang học':         'border-[hsl(38,80%,40%)]/25',
  'Toán & Trực quan':  'border-[hsl(220,70%,40%)]/25',
  'Hóa học':           'border-[hsl(160,60%,38%)]/25',
  'Sinh học':          'border-[hsl(130,60%,38%)]/25',
  'Thị giác máy tính': 'border-[hsl(175,65%,38%)]/25',
  'Machine Learning':  'border-[hsl(262,65%,40%)]/25',
  'Điện tử & IoT':     'border-[hsl(225,70%,40%)]/25',
}

// ─── Popular labs (hiển thị thẻ QR riêng cho từng thí nghiệm) ────────────────
// Học sinh quét QR là vào thẳng đúng thí nghiệm, không cần điều hướng qua menu.
interface PopularLab {
  name: string
  emoji: string
  path: string
  desc: string
  accent: 'indigo' | 'cyan' | 'emerald' | 'fuchsia' | 'amber' | 'rose'
  group: 'physics' | 'math' | 'chemistry' | 'electronics' | 'ai' | 'aero'
}

// POPULAR_LABS — sắp xếp lại theo nhóm domain, bỏ trùng lặp:
// - Bỏ Optics Lab duplicate (đã có /labs/optics-lab trong PYTHON_CATEGORIES)
// - Thêm Periodic Table + Video Tracking (vừa làm mới)
// - Đổi accent 'pink' không hợp lệ → 'rose'
// - Group field để có thể filter/section sau này
const POPULAR_LABS: PopularLab[] = [
  // ── Vật lý cơ bản (5) ──
  { name: 'Physics Motion',     emoji: '🎯', path: '/dashboard/labtwin/labs/physics-motion',     desc: 'Ném xiên · va chạm · gia tốc', accent: 'rose',     group: 'physics' },
  { name: 'Con lắc lò xo',      emoji: '🌀', path: '/dashboard/labtwin/labs/spring-pendulum',    desc: 'Dao động điều hòa F = -kx',     accent: 'indigo',   group: 'physics' },
  { name: 'Con lắc đơn',        emoji: '⚖️', path: '/dashboard/labtwin/labs/simple-pendulum',    desc: 'Chu kỳ T = 2π√(l/g)',          accent: 'emerald',  group: 'physics' },
  { name: 'MechaForce',         emoji: '🤖', path: '/dashboard/labtwin/labs/mechaforce',         desc: 'Lực · động lực học Newton',     accent: 'rose',     group: 'physics' },
  { name: 'Wave Interference',  emoji: '🌊', path: '/dashboard/labtwin/labs/wave-interference',  desc: 'Giao thoa sóng · 2 nguồn',     accent: 'cyan',     group: 'physics' },

  // ── Toán & Trực quan (3) ──
  { name: 'Graph Lab',          emoji: '📈', path: '/dashboard/labtwin/labs/graph-lab',          desc: 'Máy tính đồ thị y = f(x)',     accent: 'cyan',     group: 'math' },
  { name: 'Fourier Epicycles',  emoji: '🌀', path: '/dashboard/labtwin/labs/fourier-epicycles',  desc: 'Chuỗi Fourier vẽ sóng vuông',  accent: 'fuchsia',  group: 'math' },
  { name: 'Periodic Table 3D',  emoji: '⚛️', path: '/dashboard/periodic-table',                  desc: 'Bảng tuần hoàn + nguyên tử R3F', accent: 'fuchsia', group: 'math' },
  { name: 'Hình học không gian', emoji: '📐', path: '/dashboard/labtwin/labs/geometry-unfold',   desc: 'Trải phẳng khối · diện tích · thể tích', accent: 'amber', group: 'math' },

  // ── Hoá & Quang (2) ──
  { name: 'Chemistry Lab',      emoji: '🧪', path: '/dashboard/labtwin/labs/chemistry-lab',      desc: 'Phản ứng · phương trình hoá',  accent: 'emerald',  group: 'chemistry' },
  { name: 'Optics Lab',         emoji: '🔬', path: '/dashboard/labtwin/labs/optics-lab',         desc: 'Thấu kính · khúc xạ ánh sáng', accent: 'amber',    group: 'chemistry' },

  // ── Điện tử & IoT (3) ──
  { name: 'Circuit Simulator',  emoji: '🔌', path: '/dashboard/labtwin/labs/circuit-simulator',  desc: 'Mạch RLC · Ohm · Kirchhoff',   accent: 'indigo',   group: 'electronics' },
  { name: 'Digital Logic Lab',  emoji: '⚙️', path: '/dashboard/labtwin/labs/digital-logic-lab',  desc: 'Cổng logic · bảng chân lý',    accent: 'cyan',     group: 'electronics' },
  { name: 'Arduino Emulator',   emoji: '⚡', path: '/dashboard/iot-lab/emulator',                desc: 'Code C++ real-time browser',   accent: 'emerald',  group: 'electronics' },

  // ── AI & Vision (1 — IoT custom move to IoT lab page) ──
  { name: 'Video Tracking',     emoji: '🎥', path: '/dashboard/labtwin/labs/video-tracking',     desc: 'Tracking quỹ đạo từ video · NCC', accent: 'fuchsia', group: 'ai' },

  // ── Aero (1) ──
  { name: 'AirflowCFD 3D',      emoji: '💨', path: '/dashboard/labtwin/labs/airflow-cfd',        desc: 'Dòng không khí qua vật thể 3D', accent: 'fuchsia', group: 'aero' },

  // 📌 Pixel Agents + Gesture Swarm đã chuyển sang Game Hub
  //    /dashboard/games/pixel-agents · /dashboard/games/gesture-swarm
  // 📌 Mạch Custom Wokwi đã có entry tại /dashboard/iot-lab — không cần dup ở đây
]

// Lấy origin của site — fallback inphysic.com nếu chạy SSR/test
function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'https://inphysic.com'
}

/** Tải ảnh QR cross-origin: fetch → blob → object URL → click.
 *  Fallback mở tab mới nếu CORS thất bại. */
async function downloadQrImage(src: string, filename: string) {
  try {
    const resp = await fetch(src)
    const blob = await resp.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  } catch {
    window.open(src, '_blank', 'noopener')
  }
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
    <div className="min-h-screen bg-background">
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
              { emoji: '🎯', value: totalExperiments, label: 'Thí nghiệm', border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', sub: 'text-purple-700/80 dark:text-purple-300/60' },
              { emoji: '✅', value: 0,                label: 'Hoàn thành', border: 'border-green-500/20',  bg: 'bg-green-500/10',  text: 'text-green-400',  sub: 'text-green-700/80 dark:text-green-300/60' },
              { emoji: '⭐', value: '0/1000',         label: 'XP Points',  border: 'border-yellow-500/20', bg: 'bg-yellow-500/10', text: 'text-yellow-400', sub: 'text-yellow-700/80 dark:text-yellow-300/60' },
              { emoji: '📊', value: '0%',             label: 'Tiến độ',    border: 'border-pink-500/20',   bg: 'bg-pink-500/10',   text: 'text-pink-400',   sub: 'text-pink-700/80 dark:text-pink-300/60' },
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

          {/* ── 🚀 TẤT CẢ THÍ NGHIỆM — flat grid, không cần drill category ──
              User: "tất cả đưa ra ngoài route labtwin"
              Hiển thị thẳng 15 lab popular ngay trên /dashboard/labtwin
              để HS không phải bấm vào category mới thấy lab. */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-7 w-7 text-purple-500" />
                  Tất cả thí nghiệm
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Bấm vào để vào thẳng — không cần drill qua category
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                {POPULAR_LABS.length} labs
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 auto-rows-fr">
              {POPULAR_LABS.map(lab => {
                const accentColors: Record<string, string> = {
                  rose:    'from-rose-500/15 to-pink-500/10 border-rose-300/40 dark:border-rose-500/30 hover:border-rose-500',
                  indigo:  'from-indigo-500/15 to-blue-500/10 border-indigo-300/40 dark:border-indigo-500/30 hover:border-indigo-500',
                  emerald: 'from-emerald-500/15 to-teal-500/10 border-emerald-300/40 dark:border-emerald-500/30 hover:border-emerald-500',
                  cyan:    'from-cyan-500/15 to-sky-500/10 border-cyan-300/40 dark:border-cyan-500/30 hover:border-cyan-500',
                  amber:   'from-amber-500/15 to-orange-500/10 border-amber-300/40 dark:border-amber-500/30 hover:border-amber-500',
                  fuchsia: 'from-fuchsia-500/15 to-purple-500/10 border-fuchsia-300/40 dark:border-fuchsia-500/30 hover:border-fuchsia-500',
                }
                const groupLabel: Record<string, string> = {
                  physics: 'Vật lý', math: 'Toán', chemistry: 'Hoá',
                  electronics: 'Điện tử', ai: 'AI', aero: 'Aero',
                }
                return (
                  <Link
                    key={lab.path}
                    to={lab.path}
                    className={`group relative rounded-2xl border-2 bg-gradient-to-br ${accentColors[lab.accent]} p-4 flex flex-col items-center text-center transition-all hover:scale-[1.04] hover:shadow-xl h-full`}
                  >
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-white/40 dark:bg-black/30 text-foreground/70">
                      {groupLabel[lab.group]}
                    </span>
                    <div className="text-4xl md:text-5xl mb-2 group-hover:scale-125 transition-transform">
                      {lab.emoji}
                    </div>
                    <h3 className="font-bold text-sm md:text-base text-foreground mb-1 leading-tight">
                      {lab.name}
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-2 mt-auto pt-2">
                      {lab.desc}
                    </p>
                  </Link>
                )
              })}
            </div>
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

          {/* ── Python Simulations — All Categories ──
              2026-05-20: light mode dùng gradient nhạt indigo→purple→pink,
              dark mode giữ cosmic deep HSL như cũ. */}
          <div className="mb-8 rounded-2xl border-2 border-indigo-500/25 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[hsl(245,50%,10%)] dark:via-[hsl(270,45%,9%)] dark:to-[hsl(290,45%,10%)] overflow-hidden relative">
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
                <Link
                  to="/dashboard/labtwin/labs"
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Xem tất cả
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>

            {/* Category cards grid — auto-rows-fr để mọi card cùng chiều cao */}
            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
                {PYTHON_CATEGORIES.map((cat) => {
                  const emoji = CATEGORY_ICON[cat.category] ?? '🔬'
                  const gradient = CATEGORY_GRADIENT[cat.category] ?? DEFAULT_GRADIENT
                  const border = CATEGORY_BORDER[cat.category] ?? 'border-white/10'

                  return (
                    <Link
                      key={cat.category}
                      to={`/dashboard/labtwin/labs?category=${encodeURIComponent(cat.category)}`}
                      className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br ${gradient} border-2 ${border} overflow-hidden relative rounded-2xl flex flex-col h-full`}
                    >
                      {/* Decorative circles */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.04] rounded-full -mr-10 -mt-10" />
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/[0.04] rounded-full -ml-8 -mb-8" />

                      <div className="p-5 relative z-10 flex flex-col flex-1">
                        <div className="text-center mb-4">
                          <div className="text-6xl mb-3 group-hover:scale-125 transition-transform inline-block">
                            {emoji}
                          </div>
                          <h3 className="font-bold text-xl text-white/90 mb-2">{cat.category}</h3>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.1] text-white/70 border border-white/10">
                              {cat.count} labs
                            </span>
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/25 text-yellow-300">
                              <Star className="h-3 w-3" />
                              {cat.totalXP} XP
                            </span>
                          </div>
                        </div>

                        {/* Preview of first 2 sims — flex-1 để chiếm space, CTA push xuống đáy */}
                        <div className="space-y-2 mb-4 flex-1">
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

                        <div className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 group-hover:from-indigo-500 group-hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-auto">
                          Khám phá {cat.category}
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
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
                  <Link
                    to="/dashboard/labtwin/labs"
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-indigo-300 hover:bg-indigo-500/20 border-2 border-indigo-500/20 rounded-xl font-semibold transition-all"
                  >
                    Xem tất cả
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Labs & Công cụ ── */}
          {/* CFD/Graph section — light gradient cyan→blue→purple, dark giữ cosmic */}
          <div className="mb-8 rounded-2xl border-2 border-cyan-500/25 bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 dark:from-[hsl(200,50%,9%)] dark:via-[hsl(220,45%,10%)] dark:to-[hsl(260,40%,11%)] overflow-hidden relative">
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

            {/* Tool cards — auto-rows-fr + h-full flex flex-col chuẩn hoá chiều cao */}
            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
                {/* Graph — featured */}
                <Link
                  to="/dashboard/labtwin/labs/graph-lab"
                  className="group relative rounded-2xl border-2 border-cyan-400/30 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-[hsl(190,70%,12%)] dark:to-[hsl(220,65%,14%)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full"
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

                  <div className="relative z-10 p-5 flex flex-col flex-1">
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
                        <p className="text-xs text-cyan-700/80 dark:text-cyan-200/70 mt-0.5 font-mono">y = f(x) • nhiều đồ thị</p>
                      </div>
                    </div>

                    <p className="text-sm text-white/70 mb-3 leading-relaxed">
                      Máy tính đồ thị kiểu GeoGebra — nhập phương trình, vẽ trực quan, kéo &amp; zoom, bàn phím toán học tích hợp.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                      {['Đại số', 'Hàm số', 'Lượng giác', 'Mũ & log'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10.5px] bg-white/[0.06] text-cyan-800 dark:text-cyan-100/80 border border-cyan-400/20 self-start"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-blue-500 group-hover:from-cyan-400 group-hover:to-blue-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-auto">
                      Mở Graph
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>

                {/* AirflowCFD — featured (R3F airflow simulator) */}
                <Link
                  to="/dashboard/labtwin/labs/airflow-cfd"
                  className="group relative rounded-2xl border-2 border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-100 to-purple-100 dark:from-[hsl(280,55%,12%)] dark:to-[hsl(220,60%,12%)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full"
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

                  <div className="relative z-10 p-5 flex flex-col flex-1">
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
                        <p className="text-xs text-fuchsia-700/80 dark:text-fuchsia-200/70 mt-0.5 font-mono">streamlines · pressure · CFD</p>
                      </div>
                    </div>

                    <p className="text-sm text-white/70 mb-3 leading-relaxed">
                      Mô phỏng dòng không khí qua 5 vật thể 3D — cánh máy bay, hình cầu, trụ, thân xe, rotor bơm. Có streamlines, áp suất bề mặt, đồ thị hội tụ.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                      {['Reynolds', 'CL/CD', 'AoA', 'Streamlines'].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10.5px] bg-white/[0.06] text-fuchsia-800 dark:text-fuchsia-100/80 border border-fuchsia-400/20 self-start"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="w-full py-2.5 px-3 bg-gradient-to-r from-fuchsia-500 to-cyan-500 group-hover:from-fuchsia-400 group-hover:to-cyan-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-auto">
                      Mở AirflowCFD
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>

                <div className="relative rounded-2xl border-2 border-dashed border-border/60 bg-slate-900/40 overflow-hidden opacity-70 flex flex-col h-full">
                  <div className="p-5 flex flex-col h-full flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-secondary ring-1 ring-slate-700">
                        <Wrench className="h-7 w-7 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-2xl text-foreground/80">Đổi đơn vị</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-slate-400 border border-border uppercase tracking-wider">
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
                      className="w-full py-2.5 px-3 bg-secondary text-slate-500 text-sm font-semibold rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
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
                <Link
                  to="/dashboard/labtwin/labs/graph-lab"
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-cyan-300 hover:bg-cyan-500/20 border-2 border-cyan-500/20 rounded-xl font-semibold transition-all"
                >
                  Thử ngay
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* ── Achievements + Goals — auto-rows-fr cho cùng chiều cao ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 auto-rows-fr">
            {/* Achievements */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-400/5 border-2 border-amber-500/20 rounded-2xl overflow-hidden flex flex-col">
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
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-400/5 border-2 border-blue-500/20 rounded-2xl overflow-hidden flex flex-col">
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
                    <span className="text-sm text-blue-700/80 dark:text-blue-300/60">0/2</span>
                  </div>
                  <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 w-0 rounded-full" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-200">Kiếm 200 XP</span>
                    <span className="text-sm text-blue-700/80 dark:text-blue-300/60">0/200</span>
                  </div>
                  <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 w-0 rounded-full" />
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-500/15">
                  <Link
                    to="/dashboard/labtwin/labs"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Bắt đầu thí nghiệm ngay!
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
                <Link
                  to="/dashboard/labtwin/labs"
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] text-indigo-300 hover:bg-indigo-500/20 border-2 border-indigo-500/20 rounded-xl font-semibold transition-all text-sm"
                >
                  Xem tất cả labs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative z-10 px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                {POPULAR_LABS.map((lab) => {
                  const url = `${origin}${lab.path}`
                  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(url)}`
                  const qrHires = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=8&data=${encodeURIComponent(url)}`
                  return (
                    <div
                      key={lab.path}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05] transition-all p-4 flex flex-col items-center text-center h-full"
                    >
                      <div className="p-2 bg-white rounded-xl mb-3 shadow-[0_0_24px_rgba(99,102,241,0.18)]">
                        <img src={qrImg} alt={`QR ${lab.name}`} className="w-28 h-28 object-contain" loading="lazy" />
                      </div>
                      <div className="text-2xl mb-1">{lab.emoji}</div>
                      <h4 className="text-sm font-bold text-white/90 mb-0.5 line-clamp-1">{lab.name}</h4>
                      <p className="text-[11px] text-white/45 leading-snug mb-3 line-clamp-2 min-h-[28px] flex-1">
                        {lab.desc}
                      </p>
                      <div className="flex items-center gap-1.5 w-full mt-auto">
                        <Link
                          to={lab.path}
                          className="flex-1 text-center text-[11px] font-semibold px-2 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-200 hover:bg-indigo-500/25 transition-all"
                        >
                          Mở
                        </Link>
                        <button
                          type="button"
                          onClick={() => downloadQrImage(qrHires, `qr-${lab.path.split('/').pop()}.png`)}
                          className="text-[11px] font-medium px-2 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white/70 hover:bg-white/[0.1] transition-all"
                          title="Tải QR độ phân giải cao"
                        >
                          Tải PNG
                        </button>
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
              <Link
                to="/dashboard/labtwin/labs"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg rounded-xl shadow-xl transition-all hover:scale-105"
              >
                <FlaskConical className="h-6 w-6" />
                Khám phá ngay!
                <ArrowRight className="h-6 w-6" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
