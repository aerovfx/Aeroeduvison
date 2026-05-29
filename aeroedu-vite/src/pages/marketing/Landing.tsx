import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  Brain, Atom, TrendingUp, Camera, FileText, Heart,
  ArrowRight, Menu, X, Cpu, FlaskConical, BookOpen,
  BarChart3, Shield, Zap, Users, Star, ChevronRight,
  Play, Sparkles, Globe, Activity, Eye, Layers, MapPin,
  Plug, Terminal, Key, Download, Bot,
} from 'lucide-react'
import WorldMonitorGlobe from '@/components/world-monitor/WorldMonitorGlobe'
import IntelDashboard from '@/components/world-monitor/IntelDashboard'
import StemMonitorDeckMap from '@/components/world-monitor/StemMonitorDeckMap'
import { useAeroGeo } from '@/services/aeroBackend.service'

/* ─── Palette ─────────────────────────────────────────────────────── */
const C = {
  bg0:    '#020412',
  bg1:    '#050b1e',
  bg2:    '#080f28',
  card:   'rgba(8,15,40,0.8)',
  border: 'rgba(99,179,255,0.12)',
  borderB:'rgba(99,179,255,0.22)',
  text:   '#e2e8f0',
  muted:  '#94a3b8',
  cyan:   '#22d3ee',
  blue:   '#3b82f6',
  purple: '#7c3aed',
  purpleL:'#a78bfa',
  pink:   '#e879f9',
  green:  '#10b981',
  amber:  '#f59e0b',
  white: (a: number) => `rgba(255,255,255,${a})`,
  cyanA: (a: number) => `rgba(34,211,238,${a})`,
  blueA: (a: number) => `rgba(59,130,246,${a})`,
  purpleA:(a:number) => `rgba(124,58,237,${a})`,
  pinkA:  (a:number) => `rgba(232,121,249,${a})`,
}

/* ─── Animated Counter ────────────────────────────────────────────── */
function Counter({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3)
        setVal(Math.floor(ease * target))
        if (t < 1) requestAnimationFrame(tick)
        else setVal(target)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target, duration])
  return <span ref={ref}>{val.toLocaleString('vi-VN')}{suffix}</span>
}

/* ─── Feature data ────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Camera,      color: C.cyan,   label: 'Camera AI',          desc: 'Phân tích hành vi & cảm xúc học sinh theo thời gian thực qua camera thông minh', path: '/teacher/camera-management' },
  { icon: Brain,       color: C.purpleL,label: 'AI Gia Sư',           desc: 'Trợ lý AI cá nhân hóa giải thích bài tập, trả lời câu hỏi 24/7', path: '/ai-tutor' },
  { icon: Atom,        color: C.green,  label: 'Lab 3D Tương Tác',    desc: '50+ thí nghiệm khoa học 3D: Khí động học, Hóa học, Mạch điện, Lưu chất', path: '/dashboard/labtwin' },
  { icon: FileText,    color: C.amber,  label: 'Thi Trực Tuyến AI',   desc: 'Ngân hàng câu hỏi tự động, giám sát thông minh, chấm điểm tức thì bởi AI', path: '/teacher/exams' },
  { icon: Heart,       color: C.pink,   label: 'Bản Đồ Cảm Xúc',     desc: 'Theo dõi trạng thái tâm lý cả lớp, cảnh báo học sinh cần hỗ trợ', path: '/teacher/emotion-map' },
  { icon: Activity,    color: C.blue,   label: 'Môi Trường IoT',      desc: 'Cảm biến nhiệt độ, độ ẩm, CO₂, ánh sáng — cảnh báo tự động thời gian thực', path: '/teacher/environment-monitoring' },
  { icon: TrendingUp,  color: C.cyan,   label: 'Học Thích Nghi',      desc: 'Lộ trình AI động điều chỉnh theo điểm mạnh và điểm yếu từng học sinh', path: '/teacher/learning-path-builder' },
  { icon: FlaskConical,color: C.green,  label: 'Số Hóa Tài Liệu',    desc: 'OCR thông minh nhận dạng và chuyển đổi tài liệu thành bài giảng kỹ thuật số', path: '/teacher/document-digitization' },
  { icon: BarChart3,   color: C.purpleL,label: 'Phân Tích Sâu',       desc: 'Dashboard toàn diện: tiến độ học sinh, hiệu quả giảng dạy, xu hướng điểm số', path: '/teacher/analytics' },
]

/* ─── Platform preview cards ────────────────────────────────────────── */
const PLATFORMS = [
  {
    title: 'Giáo Viên',
    color: C.blue,
    glow: C.blueA(0.15),
    icon: Users,
    items: ['Quản lý lớp học & bài giảng', 'Camera AI theo dõi học sinh', 'Chấm thi tự động bởi AI', 'Bản đồ cảm xúc toàn lớp', 'Phân tích hiệu quả giảng dạy'],
    path: '/teacher/dashboard',
  },
  {
    title: 'Học Sinh',
    color: C.purple,
    glow: C.purpleA(0.15),
    icon: BookOpen,
    items: ['Lộ trình học cá nhân hóa', 'Lab 3D khoa học tương tác', 'AI Gia Sư giải đáp 24/7', 'Theo dõi tiến độ & thành tích', 'Bài tập AI chấm tức thì'],
    path: '/student/dashboard',
  },
  {
    title: 'Quản Trị Viên',
    color: C.cyan,
    glow: C.cyanA(0.15),
    icon: Shield,
    items: ['Tổng quan toàn trường', 'Giám sát hệ thống camera NVR', 'Quản lý IoT & cảm biến', 'Phân tích dữ liệu toàn diện', 'Cài đặt & bảo mật hệ thống'],
    path: '/admin/overview',
  },
]

/* ─── Phản hồi từ người dùng thử nghiệm ─────────────────────────────────
   Quote viết theo phong cách trung thực: mô tả lợi ích cụ thể, có số đo
   được kèm theo những hạn chế thẳng thắn. Không hứa hẹn quá mức. */
const TESTIMONIALS = [
  {
    name: 'Linh Nguyễn', role: 'Học sinh lớp 11 — THPT Phước Bửu',
    avatar: 'LN', color: C.cyan,
    quote: 'Lab 3D về dao động cơ học giúp em hình dung được hiện tượng — đọc sách giáo khoa thì chỉ thấy công thức. AI Gia Sư đôi khi còn nhầm bước trong bài khó, nhưng giải thích kiên nhẫn nên hợp với việc luyện tập.',
  },
  {
    name: 'Thầy Minh', role: 'Giáo viên Vật lý 12',
    avatar: 'TM', color: C.purple,
    quote: 'Module ma trận đề + sinh đề từ ngân hàng câu hỏi tiết kiệm cho tôi khoảng 1-2 giờ mỗi tuần. AI chấm trắc nghiệm chính xác; bài tự luận tôi vẫn xem lại trước khi vào điểm.',
  },
  {
    name: 'Anh Tuấn', role: 'Phụ huynh học sinh lớp 9',
    avatar: 'TA', color: C.green,
    quote: 'Tôi không kỳ vọng AI thay được thầy cô, nhưng dashboard tiến độ giúp tôi biết khi nào con đang chững lại, không cần đoán mò hay hỏi liên tục.',
  },
  {
    name: 'Cô Hương', role: 'GV STEM — THPT Chuyên Lê Quý Đôn',
    avatar: 'CH', color: C.amber,
    quote: 'QR đề thi in ra giấy A4 hữu ích — học sinh quét cái là vào thẳng đề, không phải đọc link. Đã chạy 4 tiết kiểm tra, ổn định. Cold-start đôi khi mất 5 giây nhưng có thông báo rõ.',
  },
]

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)
  const [videoPaused, setVideoPaused] = useState(true)
  const [fullScreenMonitor, setFullScreenMonitor] = useState(false)

  // Live startup + user geo data from aero-backend (inphysic.com Rust API).
  // When VITE_AERO_BACKEND_URL is unset these return [] and the globe falls
  // back to the static STARTUP_HUBS + VN_PROVINCES_2025 seed data.
  const { startups: liveStartups, users: liveUsers } = useAeroGeo()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Rotate active feature highlight
  useEffect(() => {
    const id = setInterval(() => setActiveFeature(p => (p + 1) % FEATURES.length), 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, color: C.text, overflowX: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Global CSS ── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        @keyframes float      { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-14px)} }
        @keyframes floatSlow  { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-glow { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes spin-slow  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes spin-rev   { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes scan-line  { 0%{top:-2px} 100%{top:100%} }
        @keyframes twinkle    { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes slide-up   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes count-in   { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
        @keyframes data-flow  { 0%{stroke-dashoffset:1000} 100%{stroke-dashoffset:0} }
        @keyframes border-run { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes flicker    { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:0.6} 94%{opacity:1} 97%{opacity:0.8} }

        .land-nav-link { color:${C.muted}; text-decoration:none; font-size:14px; font-weight:500; transition:color .2s; white-space:nowrap; }
        .land-nav-link:hover { color:${C.cyan}; }
        .land-feature-card { cursor:pointer; transition:border-color .25s, transform .25s, box-shadow .25s; }
        .land-feature-card:hover { transform:translateY(-4px) !important; }
        .land-plat-card { transition: transform .3s, box-shadow .3s; }
        .land-plat-card:hover { transform: translateY(-6px); }
        .land-test-card { transition: border-color .25s, transform .25s; }
        .land-test-card:hover { border-color:rgba(99,179,255,0.35) !important; transform:translateY(-3px); }
        .land-btn-primary { transition:background .2s, transform .15s, box-shadow .2s; }
        .land-btn-primary:hover { background:${C.blue} !important; transform:translateY(-2px); box-shadow:0 8px 30px ${C.blueA(0.5)} !important; }
        .land-btn-outline { transition:background .2s, transform .15s; }
        .land-btn-outline:hover { background:${C.white(0.08)} !important; transform:translateY(-2px); }
        .land-stat-card { transition:transform .25s, box-shadow .25s; }
        .land-stat-card:hover { transform:translateY(-3px); }
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:rgba(99,179,255,0.3); border-radius:4px; }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(2,4,18,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo — chỉ icon (bỏ chữ "AeroEduVision" để menu đủ chỗ, không xuống dòng) */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-label="AeroEduVision">
            <img src="/logo.png" alt="AeroEduVision" style={{
              width: 38, height: 38, borderRadius: 10, objectFit: 'contain',
              boxShadow: `0 0 16px ${C.cyanA(0.5)}`,
            }} />
          </Link>

          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }} className="hidden-mobile">
            <a href="#features" className="land-nav-link">Tính năng</a>
            <a href="#platform" className="land-nav-link">Nền tảng</a>
            <a href="#ai"       className="land-nav-link">AI & Labs</a>
            <a href="#mcp"      className="land-nav-link" style={{ color: '#c4b5fd' }}>MCP 🔌</a>
            <Link to="/docs" className="land-nav-link">Tài liệu</Link>
            <Link to="/news" className="land-nav-link">Tin tức</Link>
            <a href="#testimonials" className="land-nav-link">Phản hồi</a>
            <a href="#team" className="land-nav-link">Đội ngũ</a>
            <a href="#awards" className="land-nav-link">Giải thưởng</a>
            <Link to="/free-courses/llm-mastery" className="land-nav-link" style={{ color: C.cyan, fontWeight: 700 }}>
              🎓 Khoá AI MIỄN PHÍ
            </Link>
          </div>

          {/* Desktop CTA */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }} className="hidden-mobile">
            <Link to="/auth/login" style={{ padding: '8px 18px', color: C.muted, textDecoration: 'none', fontSize: 14, fontWeight: 500, borderRadius: 8, transition: 'color .2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              Đăng nhập
            </Link>
            <Link to="/auth/register" className="land-btn-primary" style={{
              padding: '9px 22px', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
              color: '#fff', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
              boxShadow: `0 4px 20px ${C.blueA(0.4)}`, whiteSpace: 'nowrap',
            }}>
              Bắt đầu miễn phí
            </Link>
          </div>

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: 8 }} className="mobile-only">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ background: 'rgba(2,4,18,0.98)', borderTop: `1px solid ${C.border}`, padding: '16px 24px 24px' }}>
            {['features', 'platform', 'ai', 'testimonials', 'team', 'awards'].map(s => (
              <a key={s} href={`#${s}`} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', color: C.muted, textDecoration: 'none', fontSize: 15 }}>
                {{ features: 'Tính năng', platform: 'Nền tảng', ai: 'AI & Labs', testimonials: 'Phản hồi', team: 'Đội ngũ', awards: 'Giải thưởng' }[s]}
              </a>
            ))}
            <Link to="/docs" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', color: C.muted, textDecoration: 'none', fontSize: 15 }}>
              Tài liệu
            </Link>
            <Link to="/news" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', color: C.muted, textDecoration: 'none', fontSize: 15 }}>
              Tin tức
            </Link>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/auth/login" style={{ padding: '10px', textAlign: 'center', color: C.muted, textDecoration: 'none', border: `1px solid ${C.border}`, borderRadius: 10 }}>Đăng nhập</Link>
              <Link to="/auth/register" style={{ padding: '10px', textAlign: 'center', color: '#fff', textDecoration: 'none', background: `linear-gradient(135deg,${C.blue},${C.purple})`, borderRadius: 10, fontWeight: 700 }}>Đăng ký</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 80, overflow: 'hidden' }}>

        {/* ── STEM MONITOR view toggle (worldmonitor-style segmented control) ── */}
        <div style={{
          position: 'absolute',
          top: 84, left: '50%', transform: 'translateX(-50%)',
          zIndex: 5,
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(8,12,20,0.85)',
          border: `1px solid ${C.borderB}`,
          borderRadius: 99,
          padding: 4,
          gap: 2,
          backdropFilter: 'blur(12px)',
          fontFamily: "'SF Mono','Monaco','Cascadia Code','Fira Code','DejaVu Sans Mono',monospace",
          boxShadow: `0 4px 24px ${C.cyanA(0.15)}`,
        }}>
          <button
            onClick={() => setFullScreenMonitor(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: !fullScreenMonitor ? '#020412' : C.muted,
              background: !fullScreenMonitor
                ? `linear-gradient(135deg, ${C.cyan}, ${C.blue})`
                : 'transparent',
              transition: 'all .2s',
            }}
          >
            <Globe size={12} /> Hero
          </button>
          <button
            onClick={() => setFullScreenMonitor(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: fullScreenMonitor ? '#020412' : C.muted,
              background: fullScreenMonitor
                ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})`
                : 'transparent',
              transition: 'all .2s',
            }}
          >
            <MapPin size={12} /> STEM·MONITOR
            <span style={{
              marginLeft: 2, padding: '1px 5px', fontSize: 9, borderRadius: 4,
              background: fullScreenMonitor ? 'rgba(0,0,0,0.25)' : C.purpleA(0.15),
              color: fullScreenMonitor ? '#020412' : C.purple, fontWeight: 800,
            }}>
              LIVE
            </span>
          </button>
        </div>

        {/* Stars background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: Math.random() * 2.5 + 0.5, height: Math.random() * 2.5 + 0.5,
              background: '#fff', borderRadius: '50%',
              animation: `twinkle ${2 + Math.random() * 4}s ${Math.random() * 4}s infinite`,
            }} />
          ))}
        </div>

        {/* Gradient blobs */}
        <div style={{ position: 'absolute', top: '15%', left: '5%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${C.blueA(0.08)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${C.purpleA(0.1)} 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '30%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${C.cyanA(0.06)} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 48, position: 'relative', zIndex: 1 }}>

          {/* Left: Text */}
          <div style={{ flex: '1 1 480px', animation: 'slide-up .8s ease both' }}>
            {/* Badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', borderRadius: 99,
              background: C.cyanA(0.1), border: `1px solid ${C.cyanA(0.3)}`,
              fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 24,
            }}>
              <Sparkles size={13} />
              Nền tảng giáo dục AI thế hệ mới
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan, animation: 'pulse-glow 2s infinite' }} />
            </div>

            <h1 style={{
              fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.1,
              marginBottom: 24,
              background: `linear-gradient(135deg, #fff 0%, ${C.cyan} 40%, ${C.blue} 70%, ${C.purpleL} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Học STEM với<br />AI & 3D Labs
            </h1>

            <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, marginBottom: 36, maxWidth: 520 }}>
              Nền tảng tích hợp <strong style={{ color: C.text }}>Camera AI</strong>,{' '}
              <strong style={{ color: C.text }}>Lab 3D tương tác</strong>, giám sát{' '}
              <strong style={{ color: C.text }}>IoT thời gian thực</strong> và{' '}
              <strong style={{ color: C.text }}>AI Gia Sư cá nhân hóa</strong> — nâng tầm giáo dục STEM Việt Nam.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 48 }}>
              <Link to="/auth/register" className="land-btn-primary" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', background: `linear-gradient(135deg,${C.cyan},${C.blue})`,
                color: '#000', textDecoration: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15,
                boxShadow: `0 6px 28px ${C.cyanA(0.45)}`,
              }}>
                Bắt đầu miễn phí <ArrowRight size={18} />
              </Link>
              <button className="land-btn-outline" onClick={() => setVideoPaused(false)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', background: C.white(0.05),
                color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer',
              }}>
                <Play size={16} fill="currentColor" /> Xem Demo
              </button>
            </div>

            {/* Micro stats */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {[
                { val: '10,000+', label: 'Học sinh', color: C.cyan },
                { val: '50+',     label: 'Lab 3D',   color: C.purple },
                { val: '11',      label: 'Dịch vụ AI', color: C.pink },
                { val: '98%',     label: 'Hài lòng', color: C.green },
              ].map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: World Monitor hero globe (defaults to Vietnam focus) */}
          <div style={{ flex: '1 1 420px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 500 }}>

            {/* 3D Globe — R3F canvas with 34 VN provinces + landmarks + global startups + live users */}
            <div style={{
              position: 'relative', width: '100%', maxWidth: 560, height: 500,
              borderRadius: 20, overflow: 'hidden',
              border: `1px solid ${C.cyanA(0.2)}`,
              boxShadow: `0 0 60px ${C.blueA(0.25)}, 0 0 120px ${C.purpleA(0.15)}, inset 0 0 60px ${C.cyanA(0.05)}`,
              background: `radial-gradient(ellipse at center, ${C.bg1}, ${C.bg0})`,
            }}>
              <WorldMonitorGlobe
                liveStartups={liveStartups}
                liveUsers={liveUsers}
                initialFocus="vietnam"
                height="100%"
              />
            </div>

            {/* Floating metric cards — overlaid on top of the 3D globe */}
            {/* Card top-left */}
            <div style={{
              position: 'absolute', top: 20, left: -10, zIndex: 10,
              background: 'rgba(8,15,40,0.9)', border: `1px solid ${C.cyanA(0.3)}`,
              borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)',
              animation: 'floatSlow 5s 0.5s ease-in-out infinite',
              pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 10, color: C.cyan, fontWeight: 700, marginBottom: 3 }}>📹 CAMERA AI</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.text }}>3,705</p>
              <p style={{ fontSize: 10, color: C.muted }}>Học sinh đang theo dõi</p>
              <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
                {[40, 65, 45, 80, 60, 75].map((h, i) => (
                  <div key={i} style={{ width: 4, height: h * 0.3, background: C.cyan, borderRadius: 2, opacity: 0.7 }} />
                ))}
              </div>
            </div>

            {/* Card bottom-right */}
            <div style={{
              position: 'absolute', bottom: 20, right: -20, zIndex: 10,
              background: 'rgba(8,15,40,0.9)', border: `1px solid ${C.purpleA(0.3)}`,
              borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)',
              animation: 'floatSlow 4s 1s ease-in-out infinite',
              pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 10, color: C.purpleL, fontWeight: 700, marginBottom: 3 }}>🧠 AI GRADING</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.text }}>98.2%</p>
              <p style={{ fontSize: 10, color: C.muted }}>Độ chính xác chấm bài</p>
              <div style={{ height: 4, background: C.white(0.1), borderRadius: 99, marginTop: 6 }}>
                <div style={{ width: '98%', height: '100%', background: `linear-gradient(90deg,${C.purple},${C.purpleL})`, borderRadius: 99 }} />
              </div>
            </div>

            {/* Card top-right */}
            <div style={{
              position: 'absolute', top: 80, right: -30, zIndex: 10,
              background: 'rgba(8,15,40,0.9)', border: `1px solid rgba(16,185,129,0.3)`,
              borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(12px)',
              animation: 'floatSlow 6s 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}>
              <p style={{ fontSize: 10, color: C.green, fontWeight: 700, marginBottom: 3 }}>🌡 IOT SENSORS</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.text }}>24.5°</p>
                  <p style={{ fontSize: 9, color: C.muted }}>Nhiệt độ</p>
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.text }}>68%</p>
                  <p style={{ fontSize: 9, color: C.muted }}>Độ ẩm</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(transparent, ${C.bg0})`, pointerEvents: 'none' }} />
      </section>

      {/* ══ INTEL DASHBOARD (worldmonitor.app-style panels) ══ */}
      <IntelDashboard />

      {/* ══ LIVE STATS BAR ══ */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: `linear-gradient(90deg, ${C.blueA(0.05)}, ${C.purpleA(0.05)}, ${C.cyanA(0.05)})` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, textAlign: 'center' }}>
            {[
              { val: 10000, suffix: '+', label: 'Học sinh tích cực',    color: C.cyan   },
              { val: 50,    suffix: '+', label: 'Lab 3D tương tác',     color: C.purple },
              { val: 98,    suffix: '%', label: 'Mức hài lòng',         color: C.green  },
              { val: 11,    suffix: '',  label: 'Dịch vụ AI tích hợp',  color: C.amber  },
              { val: 1200,  suffix: '+', label: 'Bài giảng số',         color: C.pink   },
              { val: 500,   suffix: '+', label: 'Camera được kết nối',  color: C.blue   },
            ].map((s, i) => (
              <div key={i} className="land-stat-card" style={{ padding: '16px 8px', borderRadius: 12, background: C.white(0.02) }}>
                <p style={{ fontSize: 32, fontWeight: 900, color: s.color, lineHeight: 1 }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="features" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: C.purpleA(0.1), border: `1px solid ${C.purpleA(0.3)}`, fontSize: 12, fontWeight: 700, color: C.purpleL, marginBottom: 16 }}>
            <Zap size={13} /> Tính năng nổi bật
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, marginBottom: 16, background: `linear-gradient(135deg, #fff, ${C.purpleL})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Hệ sinh thái AI toàn diện<br />cho giáo dục STEM
          </h2>
          <p style={{ fontSize: 16, color: C.muted, maxWidth: 520, margin: '0 auto' }}>
            9 tính năng cốt lõi được tích hợp liền mạch — từ phòng học thực đến không gian số
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            const active = activeFeature === i
            return (
              <Link key={i} to={f.path} className="land-feature-card" style={{
                display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none',
                padding: 24, borderRadius: 16,
                background: active ? `linear-gradient(135deg, ${C.card}, rgba(8,15,40,0.95))` : C.card,
                border: `1px solid ${active ? f.color + '55' : C.border}`,
                boxShadow: active ? `0 8px 40px ${f.color}22` : 'none',
                transform: active ? 'translateY(-4px)' : 'none',
              }}>
                {/* Icon */}
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${f.color}18`, border: `1px solid ${f.color}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                  boxShadow: active ? `0 0 16px ${f.color}44` : 'none',
                }}>
                  <Icon size={22} style={{ color: f.color }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{f.label}</h3>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{f.desc}</p>
                {/* Arrow — ghim xuống đáy để "Khám phá" thẳng hàng giữa các card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto', paddingTop: 16, fontSize: 12, color: f.color, fontWeight: 600 }}>
                  Khám phá <ChevronRight size={14} />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ══ PLATFORM CARDS ══ */}
      <section id="platform" style={{ background: `linear-gradient(180deg, ${C.bg0} 0%, ${C.bg2} 50%, ${C.bg0} 100%)`, padding: '96px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: C.cyanA(0.1), border: `1px solid ${C.cyanA(0.3)}`, fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 16 }}>
              <Globe size={13} /> Dành cho mọi đối tượng
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, marginBottom: 16, color: '#fff' }}>
              Nền tảng tích hợp cho<br />
              <span style={{ background: `linear-gradient(135deg,${C.cyan},${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Giáo Viên · Học Sinh · Quản Trị</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {PLATFORMS.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={i} className="land-plat-card" style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden',
                  boxShadow: `0 4px 40px ${p.glow}`,
                }}>
                  {/* Glow corner */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}18, transparent 70%)`, pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: `${p.color}1a`, border: `1px solid ${p.color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={22} style={{ color: p.color }} />
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: p.color }}>{p.title}</h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {p.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 14, color: C.text }}>{item}</span>
                      </div>
                    ))}
                  </div>

                  <Link to={p.path} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 20px', borderRadius: 10,
                    background: `${p.color}18`, border: `1px solid ${p.color}33`,
                    color: p.color, textDecoration: 'none', fontSize: 13, fontWeight: 700,
                    transition: 'background .2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${p.color}2e`)}
                    onMouseLeave={e => (e.currentTarget.style.background = `${p.color}18`)}>
                    Vào dashboard <ArrowRight size={14} />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ AI & LABS SHOWCASE ══ */}
      <section id="ai" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 16 }}>
            <Cpu size={13} /> Công nghệ lõi
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, marginBottom: 16, color: '#fff' }}>
            AI & Công Nghệ Tiên Tiến
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>

          {/* MediaPipe AI Vision */}
          <div style={{ background: C.card, border: `1px solid ${C.cyanA(0.2)}`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.cyanA(0.04)}, transparent)`, pointerEvents: 'none' }} />
            <Eye size={28} style={{ color: C.cyan, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>MediaPipe AI Vision</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Phân tích thời gian thực: nhận diện 42 trạng thái cảm xúc, phát hiện tư thế, theo dõi chuyển động với độ chính xác &gt;98% trực tiếp trên trình duyệt — không cần máy chủ.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Face Landmarks', 'Pose Detection', 'Object Detection', 'Emotion AI'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: C.cyanA(0.1), border: `1px solid ${C.cyanA(0.2)}`, fontSize: 11, color: C.cyan, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* 3D Lab Engine */}
          <div style={{ background: C.card, border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(16,185,129,0.04), transparent)`, pointerEvents: 'none' }} />
            <FlaskConical size={28} style={{ color: C.green, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>Three.js Lab Engine</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              50+ thí nghiệm STEM với vật lý mô phỏng thực tế: khí động học, lưu chất, mạch điện, phản ứng hóa học — tương tác 3D hoàn toàn trên trình duyệt.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Three.js r162', 'WebGL 2.0', 'Physics Engine', 'WebAssembly'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 11, color: C.green, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* LLM AI Tutor */}
          <div style={{ background: C.card, border: `1px solid ${C.purpleA(0.2)}`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.purpleA(0.04)}, transparent)`, pointerEvents: 'none' }} />
            <Brain size={28} style={{ color: C.purpleL, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>AI Gia Sư Thông Minh</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              LLM tinh chỉnh cho giáo dục Việt Nam: giải thích khái niệm, hướng dẫn bài tập, tạo đề thi tự động, chấm điểm tự luận — hỗ trợ 24/7 không giới hạn.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['RAG Pipeline', 'Exam Generator', 'Auto Grading', 'LaTeX Support'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: C.purpleA(0.1), border: `1px solid ${C.purpleA(0.2)}`, fontSize: 11, color: C.purpleL, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* IoT Monitoring */}
          <div style={{ background: C.card, border: `1px solid rgba(245,158,11,0.2)`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(245,158,11,0.04), transparent)`, pointerEvents: 'none' }} />
            <Activity size={28} style={{ color: C.amber, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>IoT Smart Classroom</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Mạng lưới cảm biến thông minh theo dõi nhiệt độ, độ ẩm, CO₂, ánh sáng và chất lượng không khí — cảnh báo tự động đảm bảo môi trường học tập tối ưu.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['MQTT Protocol', 'Real-time Alerts', 'CO₂ Monitor', 'Auto Control'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 11, color: C.amber, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* NVR Camera */}
          <div style={{ background: C.card, border: `1px solid ${C.blueA(0.2)}`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.blueA(0.04)}, transparent)`, pointerEvents: 'none' }} />
            <Camera size={28} style={{ color: C.blue, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>NVR/DMSS Camera System</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Hệ thống giám sát đa camera tích hợp NVR/DMSS: stream 4K, PTZ điều khiển từ xa, ghi hình liên tục, replay và phân tích AI theo từng học sinh.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['HLS Stream', 'PTZ Control', 'DMSS API', 'NVR Recording'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: C.blueA(0.1), border: `1px solid ${C.blueA(0.2)}`, fontSize: 11, color: C.blue, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Document AI */}
          <div style={{ background: C.card, border: `1px solid ${C.pinkA(0.2)}`, borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${C.pinkA(0.04)}, transparent)`, pointerEvents: 'none' }} />
            <Layers size={28} style={{ color: C.pink, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 10 }}>Document AI & OCR</h3>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Số hóa tài liệu thông minh: nhận dạng công thức LaTeX, sơ đồ khoa học, bảng biểu — tự động chuyển sang bài giảng kỹ thuật số có thể chỉnh sửa.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['LaTeX OCR', 'MathJax', 'PDF Export', 'Smart Scan'].map(t => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 99, background: C.pinkA(0.1), border: `1px solid ${C.pinkA(0.2)}`, fontSize: 11, color: C.pink, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══ MCP INTEGRATION — Connect your LLM ══ */}
      <section id="mcp" style={{
        position: 'relative', overflow: 'hidden',
        background: `linear-gradient(180deg, ${C.bg0} 0%, rgba(124,58,237,0.04) 50%, ${C.bg0} 100%)`,
        borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        padding: '96px 0',
      }}>
        {/* Ambient blobs */}
        <div style={{ position: 'absolute', top: '20%', left: '-100px', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-100px', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 18px', borderRadius: 99,
              background: 'linear-gradient(90deg, rgba(139,92,246,0.15), rgba(6,182,212,0.15))',
              border: '1px solid rgba(139,92,246,0.4)',
              fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 16,
            }}>
              <Plug size={13} /> MCP — Model Context Protocol
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, marginBottom: 16, color: '#fff' }}>
              Kết nối Claude · DeepSeek · GPT trực tiếp với inphysic.com
            </h2>
            <p style={{ color: C.muted, fontSize: 15, maxWidth: 720, margin: '0 auto', lineHeight: 1.6 }}>
              Dùng <strong style={{ color: C.purpleL }}>AI bạn yêu thích</strong> để thao tác dữ liệu giảng dạy:
              tạo khoá học, sinh đề thi, phân tích KG, chấm bài — tất cả qua prompt tự nhiên,
              KHÔNG cần code, KHÔNG cần copy-paste qua nhiều tab.
            </p>
          </div>

          {/* LLM logos row */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
            marginBottom: 56,
          }}>
            {[
              { name: 'Claude', sub: 'Anthropic', emoji: '🤖', color: '#d97706' },
              { name: 'DeepSeek', sub: 'V3 · R1', emoji: '🧠', color: '#06b6d4' },
              { name: 'GPT', sub: 'OpenAI', emoji: '✨', color: '#10a37f' },
              { name: 'Codex', sub: 'OpenAI', emoji: '💻', color: '#10b981' },
              { name: 'Gemini', sub: 'Google', emoji: '💎', color: '#4285f4' },
              { name: 'Llama', sub: 'Meta', emoji: '🦙', color: '#1877f2' },
              { name: 'Qwen', sub: 'Alibaba', emoji: '🐲', color: '#ff6a00' },
            ].map(p => (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 18px', borderRadius: 99,
                background: C.card, border: `1px solid ${C.border}`,
                transition: 'all .2s', cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'translateY(0)' }}>
                <span style={{ fontSize: 22 }}>{p.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{p.name}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, lineHeight: 1.1 }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 3 capability cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
            {[
              {
                icon: Bot,
                color: '#a78bfa',
                bg: 'rgba(139,92,246,0.08)',
                border: 'rgba(139,92,246,0.3)',
                title: '24 Tools sẵn sàng',
                desc: 'Course / KG / Block / Exam / Question / Student / Report — gọi qua prompt tự nhiên trong Claude Desktop, Cursor, Cherry Studio, Cline.',
                tags: ['aeroedu_course_*', 'aeroedu_kg_*', 'aeroedu_exam_*'],
              },
              {
                icon: Key,
                color: '#06b6d4',
                bg: 'rgba(6,182,212,0.08)',
                border: 'rgba(6,182,212,0.3)',
                title: 'API Key đơn giản',
                desc: 'Tạo key AERO-xxx ở /teacher/api-keys → paste vào config → AI tự xác thực + thao tác dữ liệu của bạn an toàn (JWT cache 90 ngày).',
                tags: ['Bcrypt hashed', 'Auto-rotate', 'Per-user audit'],
              },
              {
                icon: Download,
                color: '#10b981',
                bg: 'rgba(16,185,129,0.08)',
                border: 'rgba(16,185,129,0.3)',
                title: 'Bản đóng gói sẵn',
                desc: 'Tải zip 5.3MB cho macOS hoặc Windows → giải nén → cấu hình → done. Không cần git, không cần build.',
                tags: ['macOS · Linux', 'Windows', 'Node ≥ 18'],
              },
            ].map((card, i) => {
              const Icon = card.icon
              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${card.border}`, borderRadius: 20,
                  padding: 28, position: 'relative', overflow: 'hidden',
                  transition: 'all .25s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = card.color }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = card.border }}>
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${card.bg}, transparent 60%)`, pointerEvents: 'none' }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: card.bg, border: `1px solid ${card.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16,
                    }}>
                      <Icon size={22} style={{ color: card.color }} />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 10 }}>{card.title}</h3>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>{card.desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {card.tags.map(t => (
                        <span key={t} style={{
                          padding: '3px 9px', borderRadius: 99,
                          background: card.bg, border: `1px solid ${card.border}`,
                          fontSize: 10, fontWeight: 700, color: card.color, fontFamily: 'monospace',
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Demo prompt + CTA */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24,
            alignItems: 'center',
            padding: 28, borderRadius: 20,
            background: `linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06))`,
            border: `1px solid rgba(139,92,246,0.25)`,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Terminal size={16} style={{ color: '#a78bfa' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  Ví dụ prompt
                </span>
              </div>
              <div style={{
                background: '#0a0a18', border: `1px solid ${C.border}`, borderRadius: 12,
                padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7,
                color: '#c4b5fd',
              }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>// Trong Claude / Cursor / Cherry Studio:</div>
                <div>"Tạo cho tôi 1 đề thi Vật lí 11 chương Dao động</div>
                <div>cơ — 10 câu MCQ, độ khó trung bình, có lời giải"</div>
                <div style={{ color: '#10b981', marginTop: 8 }}>→ AI gọi <span style={{ color: '#fbbf24' }}>aeroedu_exam_publish</span></div>
                <div style={{ color: '#10b981' }}>→ Đề mới xuất hiện trong /teacher/exams ✓</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.25 }}>
                Cài đặt trong{' '}
                <span style={{ background: 'linear-gradient(90deg,#a78bfa,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  3 phút
                </span>
              </h3>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Tải gói đóng gói → tạo API key → paste config vào client AI bạn yêu thích →
                xong. Hỗ trợ <strong style={{ color: '#fff' }}>Claude Desktop · Cursor · Cherry Studio · Cline</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to="/teacher/api-keys" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 22px', borderRadius: 99,
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  textDecoration: 'none', boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
                  transition: 'transform .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <Key size={15} /> Bắt đầu cài MCP
                  <ArrowRight size={14} />
                </Link>
                <a
                  href="https://github.com/aerovfx/MCPaeroedu/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 22px', borderRadius: 99,
                    background: '#10b981',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                  }}>
                  <Download size={14} /> Tải bản đóng gói
                </a>
                <a
                  href="https://github.com/aerovfx/MCPaeroedu"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 22px', borderRadius: 99,
                    background: 'transparent',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    textDecoration: 'none',
                    border: `1px solid ${C.border}`,
                  }}>
                  <Terminal size={14} /> Source code
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ background: `linear-gradient(180deg, ${C.bg0}, ${C.bg2})`, borderTop: `1px solid ${C.border}`, padding: '96px 0' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>
              Bắt Đầu Trong 3 Bước
            </h2>
            <p style={{ color: C.muted, fontSize: 15 }}>Đơn giản, nhanh chóng, hiệu quả ngay từ ngày đầu tiên</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, position: 'relative' }}>
            {[
              { n: '01', title: 'Tạo tài khoản',         desc: 'Đăng ký miễn phí, thiết lập trường học và tạo danh sách lớp học trong vài phút', color: C.cyan,   icon: Users },
              { n: '02', title: 'Kết nối hệ thống',       desc: 'Tích hợp camera, cảm biến IoT và nhập dữ liệu học sinh — hỗ trợ import Excel/CSV', color: C.blue,   icon: Cpu },
              { n: '03', title: 'Học & Phân tích thực',   desc: 'AI tự động theo dõi, phân tích và đưa ra khuyến nghị — giáo viên tập trung giảng dạy', color: C.purple, icon: BarChart3 },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} style={{ position: 'relative', textAlign: 'center' }}>
                  {/* Step number */}
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: `${step.color}1a`, border: `2px solid ${step.color}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px',
                    boxShadow: `0 0 24px ${step.color}33`,
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: step.color }}>{step.n}</span>
                  </div>
                  <Icon size={20} style={{ color: step.color, marginBottom: 12 }} />
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS — Phản hồi đang thu thập ══ */}
      <section id="testimonials" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', borderRadius: 99,
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
            fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 16,
          }}>
            <Sparkles size={13} /> Đang thử nghiệm tại một số trường THPT
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: '#fff', marginBottom: 16 }}>
            Phản hồi từ người dùng đầu tiên
          </h2>
          <p style={{
            maxWidth: 720, margin: '0 auto', fontSize: 15,
            color: C.muted, lineHeight: 1.7,
          }}>
            AeroEduVision đang trong giai đoạn thử nghiệm. Chúng tôi chọn cách lắng nghe người dùng
            thật — kể cả những điểm chưa hoàn thiện — hơn là tự đánh giá. Các phản hồi dưới đây từ
            giáo viên và học sinh đã đồng hành từ những ngày đầu.
          </p>
        </div>

        {/* 3 điểm nổi bật — mô tả ngắn, khiêm tốn */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16, marginBottom: 48,
          maxWidth: 1080, marginLeft: 'auto', marginRight: 'auto',
        }}>
          {[
            {
              icon: '📐',
              title: 'Soạn đề chuẩn Bộ GD&ĐT 2026',
              text: 'Ma trận 4 phần — 24 câu — 10 điểm tự sinh đề từ ngân hàng + AI bổ sung. Tiết kiệm 1-2 giờ/tuần soạn đề thường lệ.',
            },
            {
              icon: '⛰',
              title: '5 chế độ làm bài',
              text: 'Classic, Mastery Peak (leo núi — không trừng phạt khi sai), Test, Team, Playground. Học sinh chọn cách học hợp tính.',
            },
            {
              icon: '🇻🇳',
              title: 'LaTeX tiếng Việt mượt',
              text: 'XeLaTeX + Tectonic + Latin Modern. Compile tài liệu Việt không lỗi font, không cần tự sửa template cũ.',
            },
          ].map((f, idx) => (
            <div key={idx} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: 20,
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{f.title}</p>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* Quote cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="land-test-card" style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 24,
            }}>
              <p style={{
                fontSize: 14, color: C.text, lineHeight: 1.75,
                marginBottom: 18,
              }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${t.color}22`, border: `1px solid ${t.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: t.color,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: C.muted }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Honest note */}
        <p style={{
          textAlign: 'center', marginTop: 32,
          fontSize: 13, color: C.muted, fontStyle: 'italic',
        }}>
          Nếu anh chị đang dùng AeroEduVision và muốn chia sẻ trải nghiệm —
          {' '}<Link to="/contact-sales" style={{ color: C.cyan, textDecoration: 'underline' }}>liên hệ với chúng tôi</Link>.
          Ý kiến trung thực, kể cả phê bình, đều giúp sản phẩm tốt hơn.
        </p>
      </section>

      {/* ══ TEAM SECTION ══ */}
      <section id="team" style={{
        background: `linear-gradient(180deg, ${C.bg0} 0%, ${C.bg2} 50%, ${C.bg0} 100%)`,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '96px 0',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 16px', borderRadius: 99,
              background: C.purpleA(0.1), border: `1px solid ${C.purpleA(0.3)}`,
              fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 20,
            }}>
              <Sparkles size={13} /> Đội ngũ sáng lập
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 16,
              background: `linear-gradient(135deg, #fff, ${C.purple})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Người tạo ra AeroEduVision
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 640, margin: '0 auto', lineHeight: 1.65 }}>
              AeroEduVision được xây dựng bởi 2 giáo viên đang trực tiếp đứng lớp tại
              các trường THPT — hiểu rõ nhất nỗi đau và niềm vui của việc dạy và học
              ở Việt Nam.
            </p>
          </div>

          {/* Cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32, maxWidth: 880, margin: '0 auto',
          }}>
            {[
              {
                name: 'Đặng Việt Chung',
                role: 'Founder',
                roleColor: C.cyan,
                photo: '/team/dang-viet-chung.jpg',
                affiliation: 'Giáo viên trường THPT Phước Bửu',
                location: 'Xã Hồ Tràm · TP. Hồ Chí Minh',
                bio: 'Khởi xướng AeroEduVision với tầm nhìn đưa AI và mô phỏng vật lý vào lớp học chính khoá. Trực tiếp viết phần lớn kiến trúc nền tảng + chế độ ôn thi.',
                accent: C.cyan,
              },
              {
                name: 'Trần Thị Hương',
                role: 'Co-Founder',
                roleColor: C.purple,
                photo: '/team/tran-thi-huong.jpg',
                affiliation: 'Giáo viên trường THPT Bưng Riềng',
                location: 'Xã Xuyên Mộc · TP. Hồ Chí Minh',
                bio: 'Đồng sáng lập, phụ trách thiết kế trải nghiệm sư phạm + thư viện đề thi. Đảm bảo mọi tính năng phải dùng được thực sự trong tiết học 45 phút.',
                accent: C.purple,
              },
            ].map((m) => (
              <div key={m.name} style={{
                background: `linear-gradient(180deg, ${C.white(0.04)}, ${C.white(0.015)})`,
                border: `1px solid ${C.border}`,
                borderRadius: 20, padding: 28,
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                transition: 'transform .2s, box-shadow .2s, border-color .2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 16px 48px ${m.accent}33`
                e.currentTarget.style.borderColor = `${m.accent}66`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = C.border
              }}
              >
                {/* Glow accent at top */}
                <div style={{
                  position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
                  width: 180, height: 180, borderRadius: '50%',
                  background: `radial-gradient(circle, ${m.accent}30, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                {/* Photo */}
                <div style={{
                  width: 140, height: 140, borderRadius: '50%',
                  overflow: 'hidden',
                  border: `3px solid ${m.accent}`,
                  boxShadow: `0 8px 32px ${m.accent}55`,
                  marginBottom: 20, position: 'relative', zIndex: 1,
                  background: C.bg2,
                }}>
                  <img
                    src={m.photo}
                    alt={m.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      // Graceful fallback nếu ảnh chưa upload — show initials
                      const t = e.currentTarget
                      t.style.display = 'none'
                      const parent = t.parentElement
                      if (parent && !parent.querySelector('.team-initials')) {
                        const initials = m.name.split(' ').map(s => s[0]).slice(-2).join('')
                        const div = document.createElement('div')
                        div.className = 'team-initials'
                        div.textContent = initials
                        Object.assign(div.style, {
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '40px', fontWeight: '800',
                          background: `linear-gradient(135deg, ${m.accent}, ${C.blue})`,
                          color: 'white',
                        })
                        parent.appendChild(div)
                      }
                    }}
                  />
                </div>

                {/* Role badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 14px', borderRadius: 99,
                  background: `${m.roleColor}1f`,
                  border: `1px solid ${m.roleColor}55`,
                  fontSize: 11, fontWeight: 700, color: m.roleColor,
                  textTransform: 'uppercase', letterSpacing: 1,
                  marginBottom: 12, position: 'relative', zIndex: 1,
                }}>
                  {m.role}
                </div>

                {/* Name */}
                <h3 style={{
                  fontSize: 22, fontWeight: 800, color: C.text,
                  margin: '0 0 8px', position: 'relative', zIndex: 1,
                }}>
                  {m.name}
                </h3>

                {/* Affiliation + location */}
                <div style={{ position: 'relative', zIndex: 1, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: C.text, fontWeight: 500, margin: '0 0 4px' }}>
                    {m.affiliation}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    📍 {m.location}
                  </p>
                </div>

                {/* Bio */}
                <p style={{
                  fontSize: 13, color: C.muted, lineHeight: 1.6,
                  margin: 0, position: 'relative', zIndex: 1,
                  maxWidth: 320,
                }}>
                  {m.bio}
                </p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p style={{
            textAlign: 'center', marginTop: 48,
            fontSize: 13, color: C.muted, fontStyle: 'italic',
          }}>
            Chúng tôi tin rằng công nghệ giáo dục tốt nhất phải được tạo bởi chính người
            đang dạy học — không phải kỹ sư xa lạ.
          </p>
        </div>
      </section>

      {/* ══ AWARDS / RECOGNITION SECTION ══ */}
      <section id="awards" style={{
        background: `linear-gradient(180deg, ${C.bg0}, ${C.bg2})`,
        borderTop: `1px solid ${C.border}`,
        padding: '96px 0',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 16px', borderRadius: 99,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)',
              fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 20,
            }}>
              🏆 Giải thưởng & Công nhận
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 16,
              background: `linear-gradient(135deg, #fff, #fbbf24)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Được công nhận bởi Sở KH&CN TP.HCM
            </h2>
            <p style={{ fontSize: 16, color: C.muted, maxWidth: 720, margin: '0 auto', lineHeight: 1.65 }}>
              AeroEduVision là <strong style={{ color: '#fbbf24' }}>1 trong 60 dự án</strong> được tuyển chọn vào
              vòng ươm tạo của Chương trình <strong>Ednovation 2025</strong> — chương trình quốc gia
              tuyển chọn dự án đổi mới sáng tạo trong lĩnh vực Công nghệ Giáo dục.
            </p>
          </div>

          {/* Award card — 2 cột: ảnh + thông tin */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32, alignItems: 'center',
            maxWidth: 1024, margin: '0 auto',
          }}>
            {/* Certificate image */}
            <a
              href="/awards/ednovation-2025-cert.jpg"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', position: 'relative',
                borderRadius: 16, overflow: 'hidden',
                border: `1px solid ${C.border}`,
                background: C.bg2,
                aspectRatio: '4 / 3',
                boxShadow: `0 12px 48px rgba(251,191,36,0.15)`,
                transition: 'transform .25s, box-shadow .25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.boxShadow = '0 16px 64px rgba(251,191,36,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 12px 48px rgba(251,191,36,0.15)'
              }}
              title="Click để xem ảnh full size"
            >
              <img
                src="/awards/ednovation-2025-cert.jpg"
                alt="Chứng nhận Ednovation 2025 — Sở KH&CN TP.HCM"
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Subtle overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4))',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', bottom: 12, left: 12,
                fontSize: 11, color: 'rgba(255,255,255,0.9)',
                background: 'rgba(0,0,0,0.6)', padding: '4px 10px', borderRadius: 99,
                fontWeight: 600,
              }}>
                🔍 Click để phóng to
              </div>
            </a>

            {/* Award info */}
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>
                Ednovation 2025 — Vòng ươm tạo
              </h3>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 20, lineHeight: 1.65 }}>
                Trao bởi <strong style={{ color: C.text }}>Trung tâm Khởi nghiệp Sáng tạo TP.HCM</strong>,
                thuộc Sở Khoa học và Công nghệ TP. Hồ Chí Minh.
              </p>

              {/* Stats inline */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                {[
                  { v: 'Top 60', l: 'dự án ươm tạo 2025' },
                  { v: '2026', l: 'tiếp tục vòng tăng tốc' },
                  { v: '25/11/2025', l: 'ngày công nhận' },
                ].map((s) => (
                  <div key={s.v} style={{
                    flex: '1 1 100px',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24', marginBottom: 2 }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Decision details */}
              <div style={{
                padding: 14, borderRadius: 12,
                background: C.white(0.03), border: `1px solid ${C.border}`,
                fontSize: 12, color: C.muted, lineHeight: 1.7,
              }}>
                <div><strong style={{ color: C.text }}>Quyết định:</strong> 233/QĐ-KNST</div>
                <div><strong style={{ color: C.text }}>Người ký:</strong> Q. Giám đốc Đặng Thị Luận</div>
                <div><strong style={{ color: C.text }}>Nhóm tác giả:</strong> Đặng Việt Chung · Trần Thị Hương</div>
                <div style={{ marginTop: 8, fontStyle: 'italic', color: 'rgba(148,163,184,0.7)' }}>
                  Sau vòng ươm tạo 2025, dự án tiếp tục được lựa chọn vào vòng thi
                  <strong style={{ color: '#fbbf24' }}> Tăng tốc 2026 </strong>để phát triển sản phẩm thương mại.
                </div>
              </div>
            </div>
          </div>

          {/* Trust note */}
          <p style={{
            textAlign: 'center', marginTop: 40,
            fontSize: 13, color: C.muted,
          }}>
            Sự công nhận từ cơ quan nhà nước là động lực để chúng tôi tiếp tục phát triển,
            phục vụ ngày càng nhiều giáo viên và học sinh Việt Nam.
          </p>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{ margin: '0 24px 96px', borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          background: `linear-gradient(135deg, #0a0f2e, #0d1435, #110d30)`,
          border: `1px solid ${C.border}`,
          padding: '72px 40px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Decorative orbs */}
          <div style={{ position: 'absolute', top: '50%', left: '10%', transform: 'translateY(-50%)', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.blueA(0.12)}, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translateY(-50%)', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.purpleA(0.12)}, transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: C.cyanA(0.1), border: `1px solid ${C.cyanA(0.3)}`, fontSize: 12, fontWeight: 700, color: C.cyan, marginBottom: 20 }}>
              <Sparkles size={13} /> Tài khoản miễn phí — dùng đủ tính năng cốt lõi
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, marginBottom: 16, background: `linear-gradient(135deg, #fff, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Thử AeroEduVision<br />trong tiết kiểm tra tới
            </h2>
            <p style={{ fontSize: 16, color: C.muted, marginBottom: 36, maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.65 }}>
              Đăng ký mất ~30 giây. Bắt đầu với chế độ Classic + Mastery Peak — không yêu cầu thẻ tín dụng,
              không có khoản phí ẩn. Gói trả phí mở thêm AI sinh đề và transcript chi tiết.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
              <Link to="/auth/register" className="land-btn-primary" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', background: `linear-gradient(135deg,${C.cyan},${C.blue})`,
                color: '#000', textDecoration: 'none', borderRadius: 12, fontWeight: 800, fontSize: 16,
                boxShadow: `0 6px 28px ${C.cyanA(0.45)}`,
              }}>
                Đăng Ký Miễn Phí <ArrowRight size={18} />
              </Link>
              <Link to="/auth/login" className="land-btn-outline" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 32px', background: C.white(0.05),
                color: C.text, textDecoration: 'none', border: `1px solid ${C.border}`, borderRadius: 12, fontWeight: 700, fontSize: 16,
              }}>
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: 'rgba(2,4,18,0.9)', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <img src="/logo.png" alt="AeroEduVision" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: 15, background: `linear-gradient(135deg,${C.cyan},${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AeroEduVision</span>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>Nền tảng giáo dục STEM thông minh tích hợp AI, Lab 3D và IoT cho trường học Việt Nam.</p>
            </div>

            {/* Features */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Tính năng</p>
              {['Camera AI', 'AI Gia Sư', 'Lab 3D', 'Thi trực tuyến', 'IoT Monitoring', 'Phân tích cảm xúc'].map(f => (
                <p key={f} style={{ fontSize: 13, color: C.muted, marginBottom: 8 }}>{f}</p>
              ))}
            </div>

            {/* Platform */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Nền tảng</p>
              {[
                { label: 'Giáo viên',   path: '/teacher/dashboard' },
                { label: 'Học sinh',    path: '/student/dashboard' },
                { label: 'Quản trị',    path: '/admin/overview' },
                { label: 'Lab 3D',      path: '/dashboard/labtwin' },
                { label: 'AI Gia Sư',   path: '/ai-tutor' },
              ].map(l => (
                <p key={l.label} style={{ marginBottom: 8 }}>
                  <Link to={l.path} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                    {l.label}
                  </Link>
                </p>
              ))}
            </div>

            {/* Đội ngũ */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Đội ngũ</p>
              <a href="#team" style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 8, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                Đặng Việt Chung — Founder
              </a>
              <a href="#team" style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 8, textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                Trần Thị Hương — Co-Founder
              </a>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.6 }}>
                Sáng lập bởi 2 giáo viên THPT đang trực tiếp đứng lớp tại TP. Hồ Chí Minh.
              </p>
            </div>

            {/* Legal */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Pháp lý</p>
              {[
                { label: 'Chính sách bảo mật', path: '/cookies' },
                { label: 'Điều khoản sử dụng', path: '/terms' },
                { label: 'Liên hệ hỗ trợ',     path: '/contact-sales' },
              ].map(l => (
                <p key={l.label} style={{ marginBottom: 8 }}>
                  <Link to={l.path} style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                    {l.label}
                  </Link>
                </p>
              ))}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, color: C.muted }}>© 2026 AeroEduVision. Tất cả quyền được bảo lưu.</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 12, color: C.muted }}>Hệ thống hoạt động bình thường</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive helpers */}
      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-only   { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-only   { display: none !important; }
          .hidden-mobile { display: flex !important; }
        }
      `}</style>

      {/* ══ Full-screen STEM MONITOR overlay (worldmonitor.app-style) ══ */}
      {fullScreenMonitor && (
        <StemMonitorDeckMap onClose={() => setFullScreenMonitor(false)} initialView="asia" />
      )}
    </div>
  )
}
