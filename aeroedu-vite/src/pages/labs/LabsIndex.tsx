/**
 * LabTwin — Virtual Labs Index
 * Clone từ: app/(dashboard)/(routes)/dashboard/labtwin/page.tsx
 * Dark-first Tailwind — giống hoàn toàn bố cục bản gốc
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FlaskConical, Star, Clock, ArrowRight, Sparkles,
  TrendingUp, Award, Zap, ArrowLeft,
  FunctionSquare, Wrench, Wind, QrCode,
} from 'lucide-react'
import { SIMULATIONS, type Simulation } from './PythonLabs'

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
    category: 'Hoá học', count: 4, totalXP: 700,
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
  'Hoá học':               '🧪',
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
  'Hoá học':           'from-emerald-100 to-teal-100 dark:from-[hsl(160,60%,13%)] dark:to-[hsl(175,55%,16%)]',
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
  'Hoá học':           'border-[hsl(160,60%,38%)]/25',
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
  { name: 'Physics Motion',     emoji: '🎯', path: '/dashboard/labtwin/physics-motion',     desc: 'Ném xiên · va chạm · gia tốc', accent: 'rose',     group: 'physics' },
  { name: 'Con lắc lò xo',      emoji: '🌀', path: '/dashboard/labtwin/spring-pendulum',    desc: 'Dao động điều hòa F = -kx',     accent: 'indigo',   group: 'physics' },
  { name: 'Con lắc đơn',        emoji: '⚖️', path: '/dashboard/labtwin/simple-pendulum',    desc: 'Chu kỳ T = 2π√(l/g)',          accent: 'emerald',  group: 'physics' },
  { name: 'MechaForce',         emoji: '🤖', path: '/dashboard/labtwin/mechaforce',         desc: 'Lực · động lực học Newton',     accent: 'rose',     group: 'physics' },
  { name: 'Wave Interference',  emoji: '🌊', path: '/dashboard/labtwin/wave-interference',  desc: 'Giao thoa sóng · 2 nguồn',     accent: 'cyan',     group: 'physics' },
  { name: 'Giao thoa Young',    emoji: '💡', path: '/dashboard/labtwin/young-double-slit',  desc: 'Ánh sáng đơn sắc qua 2 khe hẹp', accent: 'fuchsia',  group: 'physics' },
  { name: 'Khúc xạ Snell',     emoji: '🔬', path: '/dashboard/labtwin/refraction',         desc: 'n₁sin(i) = n₂sin(r) · TIR',   accent: 'cyan',     group: 'physics' },
  { name: 'SHM nâng cao',      emoji: '〰️', path: '/dashboard/labtwin/harmonic-motion',    desc: 'Phase plot · Energy · damping', accent: 'fuchsia',  group: 'physics' },
  { name: 'Archimedes',        emoji: '🛁', path: '/dashboard/labtwin/density-buoyancy',   desc: 'Lực đẩy · 5 chất lỏng phân tầng', accent: 'cyan',  group: 'chemistry' },
  { name: 'Scratch Kids',      emoji: '🐱', path: '/dashboard/labtwin/scratch-kids',       desc: 'Lập trình kéo thả · vẽ · phát nhạc', accent: 'amber', group: 'ai' },
  { name: 'CFD Dòng chảy',     emoji: '🌀', path: '/dashboard/labtwin/cfd-flow',           desc: 'Lattice Boltzmann · Karman vortex', accent: 'cyan', group: 'physics' },
  { name: 'Sóng dừng',         emoji: '〰️', path: '/dashboard/labtwin/standing-waves',     desc: 'Hài âm n · Nốt + Bụng', accent: 'amber', group: 'physics' },
  { name: 'Thư viện DIY STEM', emoji: '📚', path: '/dashboard/labtwin/stem-diy',           desc: '16 dự án tự làm theo bước', accent: 'emerald', group: 'physics' },
  { name: 'BioGrowth',         emoji: '🌱', path: '/dashboard/labtwin/biogrowth',          desc: 'Exponential · Logistic · Predator-prey', accent: 'emerald', group: 'physics' },
  { name: 'Chất khí + Nhiệt',  emoji: '🌡', path: '/dashboard/labtwin/thermal-gas',        desc: 'Boyle · Charles · Gay-Lussac · PV=nRT', accent: 'amber', group: 'chemistry' },
  { name: 'WFC Builder',       emoji: '🧩', path: '/dashboard/labtwin/wfc-builder',        desc: 'Wave Function Collapse procedural', accent: 'fuchsia', group: 'ai' },

  // ── Toán & Trực quan (3) ──
  { name: 'Graph Lab',          emoji: '📈', path: '/dashboard/labtwin/graph-lab',          desc: 'Máy tính đồ thị y = f(x)',     accent: 'cyan',     group: 'math' },
  { name: 'Fourier Epicycles',  emoji: '🌀', path: '/dashboard/labtwin/fourier-epicycles',  desc: 'Chuỗi Fourier vẽ sóng vuông',  accent: 'fuchsia',  group: 'math' },
  { name: 'Tròn ↔ Dao động',    emoji: '🎯', path: '/dashboard/labtwin/circular-shm',       desc: 'Hình chiếu CĐ tròn = SHM',     accent: 'cyan',     group: 'physics' },
  { name: 'Tròn 3D + Helix',   emoji: '🌀', path: '/dashboard/labtwin/circular-motion-3d', desc: 'Helix 3D + chiếu lên XY/XZ/YZ', accent: 'cyan',     group: 'physics' },
  { name: 'Periodic Table 3D',  emoji: '⚛️', path: '/dashboard/periodic-table',                  desc: 'Bảng tuần hoàn + nguyên tử R3F', accent: 'fuchsia', group: 'math' },
  { name: 'Hình học không gian', emoji: '📐', path: '/dashboard/labtwin/geometry-unfold',   desc: 'Trải phẳng khối · diện tích · thể tích', accent: 'amber', group: 'math' },

  // ── Game RPG (1) ──
  { name: 'Pixel Office RPG',   emoji: '🎮', path: '/dashboard/labtwin/pixel-office-rpg', desc: 'AI agent VS Code · top-down pixel + chat', accent: 'fuchsia', group: 'ai' },

  // ── Hoá & Quang (2) ──
  { name: 'Chemistry Lab',      emoji: '🧪', path: '/dashboard/labtwin/chemistry-lab',      desc: 'Phản ứng · phương trình hoá',  accent: 'emerald',  group: 'chemistry' },
  { name: 'Optics Lab',         emoji: '🔬', path: '/dashboard/labtwin/optics-lab',         desc: 'Thấu kính · khúc xạ ánh sáng', accent: 'amber',    group: 'chemistry' },

  // ── Điện tử & IoT (3) ──
  { name: 'Circuit Simulator',  emoji: '🔌', path: '/dashboard/labtwin/circuit-simulator',  desc: 'Mạch RLC · Ohm · Kirchhoff',   accent: 'indigo',   group: 'electronics' },
  { name: 'Digital Logic Lab',  emoji: '⚙️', path: '/dashboard/labtwin/digital-logic-lab',  desc: 'Cổng logic · bảng chân lý',    accent: 'cyan',     group: 'electronics' },
  { name: 'Arduino Emulator',   emoji: '⚡', path: '/dashboard/iot-lab/emulator',                desc: 'Code C++ real-time browser',   accent: 'emerald',  group: 'electronics' },

  // ── AI & Vision (1 — IoT custom move to IoT lab page) ──
  { name: 'Video Tracking',     emoji: '🎥', path: '/dashboard/labtwin/video-tracking',     desc: 'Tracking quỹ đạo từ video · NCC', accent: 'fuchsia', group: 'ai' },

  // ── Aero (1) ──
  { name: 'AirflowCFD 3D',      emoji: '💨', path: '/dashboard/labtwin/airflow-cfd',        desc: 'Dòng không khí qua vật thể 3D', accent: 'fuchsia', group: 'aero' },

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

// ─── QR helpers ──────────────────────────────────────────────────────────────
// User: "đưa mã QR vào trong các card · Tối ưu không gian của labtwin"
// QR thumbnail nhỏ inline trong card + click mở modal lớn để in/quét.

function qrThumbnailUrl(url: string, size = 120) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(url)}`
}
function qrHiResUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=8&data=${encodeURIComponent(url)}`
}

interface QrModalState {
  url: string
  title: string
  emoji?: string
}

function QrModal({ state, onClose, onDownload }: {
  state: QrModalState
  onClose: () => void
  onDownload: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-card border-2 border-indigo-500/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_60px_rgba(99,102,241,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/70"
        >
          ✕
        </button>
        <div className="text-center">
          {state.emoji && <div className="text-3xl mb-2">{state.emoji}</div>}
          <h3 className="font-bold text-lg text-foreground mb-3 px-6">{state.title}</h3>
          <div className="inline-block p-4 bg-white rounded-2xl mb-4 shadow-xl">
            <img
              src={qrThumbnailUrl(state.url, 280)}
              alt={`QR ${state.title}`}
              className="w-64 h-64 object-contain"
            />
          </div>
          <p className="text-xs text-muted-foreground mb-4 px-4 leading-relaxed">
            📱 Mở Camera điện thoại quét mã · Hoặc nhấn "Tải PNG" để in giấy dán lớp
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm transition-all"
            >
              📥 Tải PNG (1024×1024)
            </button>
            <a
              href={state.url}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-border text-foreground/80 hover:text-foreground font-bold text-sm flex items-center justify-center transition-all"
            >
              Mở lab →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LabsIndexPage() {
  const totalExperiments = PYTHON_TOTAL
  const origin = siteOrigin()
  const labsCatalogUrl = `${origin}/dashboard/labtwin/labs`
  const [qrModal, setQrModal] = useState<QrModalState | null>(null)
  const openQrModal = (lab: { name: string; emoji: string; path: string }) => {
    setQrModal({ url: `${origin}${lab.path}`, title: lab.name, emoji: lab.emoji })
  }
  const downloadCurrentQr = () => {
    if (qrModal) downloadQrImage(qrHiResUrl(qrModal.url), `qr-${qrModal.title.toLowerCase().replace(/\s+/g, '-')}.png`)
  }

  const achievements = [
    { icon: '🏆', title: 'Nhà khoa học mới',  desc: 'Hoàn thành 3 thí nghiệm đầu',     xp: 150, locked: true },
    { icon: '⚡', title: 'Chuyên gia vật lý', desc: 'Hoàn thành tất cả thí nghiệm',     xp: 500, locked: true },
    { icon: '🌟', title: 'Bậc thầy Python',   desc: 'Xem code của 5 simulations',       xp: 200, locked: true },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">

        {/* ── Header ── */}
        <div className="mb-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-3 font-medium transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Dashboard
          </Link>

          {/* Compact header — inline stats */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl text-white shadow-lg hover:scale-105 transition-transform">
              <FlaskConical className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                🧪 LabTwin
              </h1>
              <p className="text-white/50 text-sm">
                {POPULAR_LABS.length} lab phổ biến + {SIMULATIONS.length} Python labs · Quét QR mở trên điện thoại
              </p>
            </div>
          </div>

          {/* ── Quick Stats — compact 4-col ── */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { emoji: '🎯', value: totalExperiments, label: 'Thí nghiệm', border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', sub: 'text-purple-700/80 dark:text-purple-300/60' },
              { emoji: '✅', value: 0,                label: 'Hoàn thành', border: 'border-green-500/20',  bg: 'bg-green-500/10',  text: 'text-green-400',  sub: 'text-green-700/80 dark:text-green-300/60' },
              { emoji: '⭐', value: '0/1000',         label: 'XP Points',  border: 'border-yellow-500/20', bg: 'bg-yellow-500/10', text: 'text-yellow-400', sub: 'text-yellow-700/80 dark:text-yellow-300/60' },
              { emoji: '📊', value: '0%',             label: 'Tiến độ',    border: 'border-pink-500/20',   bg: 'bg-pink-500/10',   text: 'text-pink-400',   sub: 'text-pink-700/80 dark:text-pink-300/60' },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.bg} border ${s.border} rounded-lg p-2 text-center hover:shadow-md transition-shadow`}
              >
                <div className="text-xl mb-0.5">{s.emoji}</div>
                <div className={`text-base font-bold ${s.text}`}>{s.value}</div>
                <div className={`text-[10px] ${s.sub} leading-tight`}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── 🚀 TẤT CẢ THÍ NGHIỆM — GỘP 3 section thành 1 ──
              User: "gộp Python Simulations & Labs 32 thí nghiệm... và Quét QR... vào Tất cả thí nghiệm"
              Cấu trúc mới:
              1. Header với QR card compact ở góc phải
              2. Phổ biến: 15 POPULAR_LABS flat grid (icon + name + desc)
              3. Theo chủ đề: 32 SIMULATIONS grouped by category
              4. Bottom CTA */}
          <div className="mb-8 rounded-2xl border-2 border-purple-500/25 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-[hsl(280,45%,9%)] dark:via-[hsl(310,40%,10%)] dark:to-[hsl(20,40%,10%)] overflow-hidden relative">
            <div className="absolute top-0 right-0 text-[9rem] opacity-[0.05] select-none pointer-events-none leading-none">🧪</div>

            {/* Header — title + QR compact card.
                Mobile (< sm): stack DỌC, title FULL width trên, QR ngang dưới.
                Desktop (≥ sm): side-by-side, QR góc phải.
                Bỏ flex-wrap (gây overlap khi QR width = 320 + title min-content) */}
            <div className="relative z-10 px-4 sm:px-6 pt-5 sm:pt-6 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-purple-500 shrink-0" />
                    <span className="truncate">Tất cả thí nghiệm</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-snug">
                    {POPULAR_LABS.length} lab phổ biến + {SIMULATIONS.length} thí nghiệm Python theo chủ đề — bấm là vào thẳng
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3 flex-wrap">
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30">
                      ⭐ {POPULAR_LABS.length} phổ biến
                    </span>
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30">
                      🐍 {SIMULATIONS.length} Python labs
                    </span>
                    <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/30">
                      {PYTHON_CATEGORIES.length} chủ đề
                    </span>
                  </div>
                </div>

                {/* QR card — mobile: full width strip · desktop: góc phải shrink-0 */}
                <div className="w-full sm:w-auto sm:shrink-0 rounded-xl border-2 border-indigo-300/50 dark:border-indigo-500/30 bg-white dark:bg-indigo-950/40 p-2.5 sm:p-3 flex items-center gap-3 sm:max-w-xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=4&data=${encodeURIComponent(labsCatalogUrl)}`}
                    alt="QR LabTwin"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <QrCode className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Quét QR</span>
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug mb-1.5 line-clamp-2">
                      Mở LabTwin trên điện thoại — không cần đăng nhập
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        downloadQrImage(
                          `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=8&data=${encodeURIComponent(labsCatalogUrl)}`,
                          'labtwin-qr.png',
                        )
                      }
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all"
                    >
                      Tải PNG
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ⭐ Phổ biến — 15 POPULAR_LABS flat grid ── */}
            <div className="relative z-10 px-6 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⭐</span>
                <h3 className="font-bold text-lg text-foreground">Phổ biến nhất</h3>
                <span className="text-xs text-muted-foreground">— mỗi lab có UI riêng, vào thẳng</span>
              </div>
              {/* Compact grid: 6 cols xl · QR inline corner — tối ưu không gian */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 auto-rows-fr">
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
                    physics: 'Vật lí', math: 'Toán', chemistry: 'Hoá',
                    electronics: 'Điện tử', ai: 'AI', aero: 'Aero',
                  }
                  const labUrl = `${origin}${lab.path}`
                  return (
                    <div key={lab.path} className="relative h-full">
                      <Link
                        to={lab.path}
                        className={`group block relative rounded-xl border bg-gradient-to-br ${accentColors[lab.accent]} p-2.5 flex flex-col items-center text-center transition-all hover:scale-[1.03] hover:shadow-xl h-full`}
                      >
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold bg-white/40 dark:bg-black/30 text-foreground/70">
                          {groupLabel[lab.group]}
                        </span>
                        <div className="text-3xl md:text-4xl mb-1.5 mt-1 group-hover:scale-125 transition-transform">
                          {lab.emoji}
                        </div>
                        <h3 className="font-bold text-xs md:text-sm text-foreground mb-1 leading-tight line-clamp-1">
                          {lab.name}
                        </h3>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-auto leading-snug">
                          {lab.desc}
                        </p>
                      </Link>
                      {/* QR thumbnail — bấm để mở modal lớn */}
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openQrModal(lab) }}
                        className="absolute top-1.5 right-1.5 p-1 bg-white rounded-md shadow-md hover:scale-110 transition-transform z-10"
                        title="Quét QR để mở trên điện thoại"
                      >
                        <img
                          src={qrThumbnailUrl(labUrl, 80)}
                          alt={`QR ${lab.name}`}
                          className="w-7 h-7 object-contain"
                          loading="lazy"
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 🐍 Theo chủ đề — 32 SIMULATIONS grouped ── */}
            <div className="relative z-10 px-6 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🐍</span>
                <h3 className="font-bold text-lg text-foreground">Theo chủ đề — Python Simulations</h3>
                <span className="text-xs text-muted-foreground">— {PYTHON_TOTAL} thí nghiệm code bằng Python thật</span>
              </div>
              <div className="space-y-5">
                {(() => {
                  // Group SIMULATIONS by category
                  const grouped: Record<string, Simulation[]> = {}
                  for (const s of SIMULATIONS) {
                    if (!grouped[s.category]) grouped[s.category] = []
                    grouped[s.category].push(s)
                  }
                  const catOrder = PYTHON_CATEGORIES.map(c => c.category)
                  const extraCats = Object.keys(grouped).filter(c => !catOrder.includes(c))
                  const orderedCats = [...catOrder, ...extraCats].filter(c => grouped[c]?.length > 0)

                  return orderedCats.map(catName => {
                    const emoji = CATEGORY_ICON[catName] ?? '🔬'
                    const gradient = CATEGORY_GRADIENT[catName] ?? DEFAULT_GRADIENT
                    const border = CATEGORY_BORDER[catName] ?? 'border-white/10'
                    const labs = grouped[catName]
                    return (
                      <div key={catName}
                        className={`rounded-2xl border-2 ${border} bg-gradient-to-br ${gradient} p-5`}>
                        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{emoji}</span>
                            <div>
                              <h4 className="font-bold text-lg text-foreground">{catName}</h4>
                              <p className="text-xs text-muted-foreground">{labs.length} thí nghiệm</p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/25 text-yellow-700 dark:text-yellow-300">
                            <Star className="h-3 w-3" />
                            {labs.reduce((s, l) => s + l.xp, 0)} XP
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                          {labs.map(lab => {
                            const href = lab.internal_link ?? `/dashboard/labtwin/${lab.id}`
                            const labUrl = `${origin}${href}`
                            const diffColor = lab.difficulty === 'Dễ' ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                                            : lab.difficulty === 'Trung bình' ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/30'
                                            : 'text-rose-700 dark:text-rose-300 bg-rose-500/15 border-rose-500/30'
                            return (
                              <div key={lab.id} className="relative">
                                {/* QR thumbnail — top-right corner */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation()
                                    openQrModal({ name: lab.name, emoji: '🐍', path: href })
                                  }}
                                  className="absolute top-1.5 right-1.5 p-0.5 bg-white rounded shadow-md hover:scale-110 transition-transform z-10"
                                  title="QR cho thí nghiệm này"
                                >
                                  <img
                                    src={qrThumbnailUrl(labUrl, 60)}
                                    alt="QR"
                                    className="w-5 h-5 object-contain"
                                    loading="lazy"
                                  />
                                </button>
                              <Link to={href}
                                className="rounded-lg bg-white/60 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/40 border border-border/60 hover:border-foreground/30 p-2.5 pr-8 transition-all hover:scale-[1.02] group flex flex-col">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h5 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-yellow-300">
                                    {lab.name}
                                  </h5>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mb-2 flex-1">
                                  {lab.description}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap text-[10px] mt-auto">
                                  <span className={`px-1.5 py-0.5 rounded font-bold border ${diffColor}`}>
                                    {lab.difficulty}
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="h-2.5 w-2.5" />
                                    {lab.duration}
                                  </span>
                                  <span className="ml-auto text-yellow-600 dark:text-yellow-300 font-bold">
                                    +{lab.xp} XP
                                  </span>
                                </div>
                              </Link>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Bottom CTA inside merged section */}
            <div className="relative z-10 px-6 pb-6 pt-2">
              <div className="p-4 bg-white/60 dark:bg-white/[0.04] rounded-xl border-2 border-purple-300/40 dark:border-purple-500/15">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">🎯</div>
                    <div>
                      <h4 className="font-bold text-foreground">
                        Hiển thị đầy đủ {POPULAR_LABS.length + SIMULATIONS.length} thí nghiệm
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Đã gộp: ⭐ phổ biến + 🐍 Python labs + 📱 QR vào 1 chỗ — không cần drill
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/dashboard/labtwin"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-white/[0.06] text-purple-700 dark:text-indigo-300 hover:bg-purple-200 dark:hover:bg-indigo-500/20 border-2 border-purple-300 dark:border-indigo-500/20 rounded-xl font-semibold transition-all"
                  >
                    Tìm kiếm &amp; filter
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
                  to="/dashboard/labtwin/graph-lab"
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
                  to="/dashboard/labtwin/airflow-cfd"
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
                  to="/dashboard/labtwin/graph-lab"
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
                    to="/dashboard/labtwin"
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Bắt đầu thí nghiệm ngay!
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── QR section đã được INLINE vào mỗi card (xem nút QR góc trên-phải)
              User: "đưa mã QR vào trong các card · Tối ưu không gian"
              → Section riêng đã bỏ để tránh trùng lặp · Click QR thumbnail
                trong card mở modal lớn để in / tải PNG. */}

          {/* QR usage tip — compact strip */}
          <div className="mb-6 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-start gap-3">
            <QrCode className="w-5 h-5 text-indigo-300 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              <span className="font-semibold text-indigo-100">QR trên mỗi card</span>:
              Click vào thumbnail QR góc trên-phải để mở modal lớn → "Tải PNG" in khổ A5
              dán bàn thí nghiệm. HS quét bằng Camera (iOS) hoặc Google Lens (Android) → vào thẳng lab.
            </p>
          </div>

          {/* ── CTA Banner — compact ── */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 md:p-6 text-center">
              <div className="text-4xl mb-2">🎓✨</div>
              <h2 className="text-xl md:text-2xl font-bold mb-2">Sẵn sàng khám phá khoa học?</h2>
              <p className="text-base mb-4 text-white/90">
                Hơn {PYTHON_TOTAL} thí nghiệm đang chờ bạn! 🚀
              </p>
              <Link
                to="/dashboard/labtwin"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-purple-600 hover:bg-gray-100 font-bold text-sm rounded-xl shadow-xl transition-all hover:scale-105"
              >
                <FlaskConical className="h-4 w-4" />
                Khám phá ngay!
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* QR modal — hiển thị khi click QR thumbnail trong card */}
      {qrModal && (
        <QrModal state={qrModal} onClose={() => setQrModal(null)} onDownload={downloadCurrentQr} />
      )}
    </div>
  )
}
