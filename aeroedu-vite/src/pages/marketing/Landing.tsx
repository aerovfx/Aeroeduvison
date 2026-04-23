import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  Brain, Atom, TrendingUp, Camera, FileText, Heart,
  ArrowRight, Menu, X, Cpu, FlaskConical, BookOpen,
  BarChart3, Shield, Zap, Users, Star, ChevronRight,
  Play, Sparkles, Globe, Activity, Eye, Layers, MapPin,
} from 'lucide-react'
import WorldMonitorGlobe from '@/components/world-monitor/WorldMonitorGlobe'
import IntelDashboard from '@/components/world-monitor/IntelDashboard'
import StemMonitor2DMap from '@/components/world-monitor/StemMonitor2DMap'
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

/* ─── Testimonials ──────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: 'Linh Nguyễn', role: 'Học sinh lớp 11', avatar: 'LN', color: C.cyan,   quote: 'Lab 3D giúp mình hiểu Khí Động Học trực quan hơn rất nhiều. AI Gia Sư giải thích tận tình như thầy giáo thật!' },
  { name: 'Thầy Minh',   role: 'Giáo viên STEM',  avatar: 'TM', color: C.purple, quote: 'Camera AI và bản đồ cảm xúc giúp tôi quan tâm đúng lúc đến từng học sinh. Giảm 70% thời gian chấm bài nhờ AI.' },
  { name: 'Tuấn Anh',    role: 'Phụ huynh',        avatar: 'TA', color: C.green,  quote: 'Con em tiến bộ vượt bậc. Hệ thống theo dõi cảm xúc giúp phát hiện kịp thời khi con gặp khó khăn tâm lý.' },
  { name: 'Hiệu Trưởng', role: 'Trường THPT ABC',  avatar: 'HT', color: C.amber,  quote: 'Hệ thống IoT và camera AI giúp BGH nắm bắt tình hình toàn trường theo thời gian thực. Ấn tượng!' },
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
  // 'svg' = procedural 1024×512 SVG renderer, 'deck' = real MapLibre + deck.gl
  const [monitorEngine, setMonitorEngine] = useState<'svg' | 'deck'>('deck')

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

        .land-nav-link { color:${C.muted}; text-decoration:none; font-size:14px; font-weight:500; transition:color .2s; }
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
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.blue}, ${C.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 13, color: '#fff',
              boxShadow: `0 0 16px ${C.cyanA(0.5)}`,
              animation: 'flicker 8s infinite',
            }}>AE</div>
            <span style={{ fontWeight: 800, fontSize: 17, background: `linear-gradient(135deg, ${C.cyan}, ${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AeroEduVision
            </span>
          </div>

          {/* Desktop nav */}
          <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden-mobile">
            <a href="#features" className="land-nav-link">Tính năng</a>
            <a href="#platform" className="land-nav-link">Nền tảng</a>
            <a href="#ai"       className="land-nav-link">AI & Labs</a>
            <a href="#testimonials" className="land-nav-link">Nhận xét</a>
          </div>

          {/* Desktop CTA */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="hidden-mobile">
            <Link to="/auth/login" style={{ padding: '8px 18px', color: C.muted, textDecoration: 'none', fontSize: 14, fontWeight: 500, borderRadius: 8, transition: 'color .2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.cyan)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              Đăng nhập
            </Link>
            <Link to="/auth/register" className="land-btn-primary" style={{
              padding: '9px 22px', background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
              color: '#fff', textDecoration: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14,
              boxShadow: `0 4px 20px ${C.blueA(0.4)}`,
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
            {['features', 'platform', 'ai', 'testimonials'].map(s => (
              <a key={s} href={`#${s}`} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', color: C.muted, textDecoration: 'none', fontSize: 15 }}>
                {{ features: 'Tính năng', platform: 'Nền tảng', ai: 'AI & Labs', testimonials: 'Nhận xét' }[s]}
              </a>
            ))}
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
            onClick={() => { setFullScreenMonitor(true); setMonitorEngine('svg') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: fullScreenMonitor && monitorEngine === 'svg' ? '#020412' : C.muted,
              background: fullScreenMonitor && monitorEngine === 'svg'
                ? `linear-gradient(135deg, ${C.cyan}, ${C.purple})`
                : 'transparent',
              transition: 'all .2s',
            }}
          >
            <Layers size={12} /> Stem Monitor
            <span style={{
              marginLeft: 2,
              padding: '1px 5px',
              fontSize: 9,
              borderRadius: 4,
              background: fullScreenMonitor && monitorEngine === 'svg' ? 'rgba(0,0,0,0.25)' : C.cyanA(0.15),
              color: fullScreenMonitor && monitorEngine === 'svg' ? '#020412' : C.cyan,
              fontWeight: 800,
            }}>
              SVG
            </span>
          </button>
          <button
            onClick={() => { setFullScreenMonitor(true); setMonitorEngine('deck') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px',
              borderRadius: 99,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: fullScreenMonitor && monitorEngine === 'deck' ? '#020412' : C.muted,
              background: fullScreenMonitor && monitorEngine === 'deck'
                ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})`
                : 'transparent',
              transition: 'all .2s',
            }}
          >
            <MapPin size={12} /> Stem Monitor
            <span style={{
              marginLeft: 2,
              padding: '1px 5px',
              fontSize: 9,
              borderRadius: 4,
              background: fullScreenMonitor && monitorEngine === 'deck' ? 'rgba(0,0,0,0.25)' : C.purpleA(0.15),
              color: fullScreenMonitor && monitorEngine === 'deck' ? '#020412' : C.purple,
              fontWeight: 800,
            }}>
              MAP
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
                display: 'block', textDecoration: 'none',
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
                {/* Arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 16, fontSize: 12, color: f.color, fontWeight: 600 }}>
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

      {/* ══ TESTIMONIALS ══ */}
      <section id="testimonials" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 16 }}>
            <Star size={13} fill={C.amber} /> Đánh giá từ người dùng
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 42px)', fontWeight: 900, color: '#fff' }}>
            Hàng nghìn người tin dùng mỗi ngày
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="land-test-card" style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 16, padding: 24,
            }}>
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={13} fill={C.amber} style={{ color: C.amber }} />)}
              </div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 18, fontStyle: 'italic' }}>"{t.quote}"</p>
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
              <Sparkles size={13} /> Miễn phí hoàn toàn để bắt đầu
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, marginBottom: 16, background: `linear-gradient(135deg, #fff, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Sẵn sàng chuyển đổi<br />phòng học của bạn?
            </h2>
            <p style={{ fontSize: 17, color: C.muted, marginBottom: 36, maxWidth: 480, margin: '0 auto 36px' }}>
              Tham gia cùng hàng nghìn giáo viên đang đổi mới phương pháp giảng dạy với AI
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
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${C.cyan},${C.blue},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff' }}>AE</div>
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

            {/* Legal */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Pháp lý</p>
              {['Chính sách bảo mật', 'Điều khoản sử dụng', 'Liên hệ hỗ trợ'].map(l => (
                <p key={l} style={{ fontSize: 13, color: C.muted, marginBottom: 8, cursor: 'pointer' }}>{l}</p>
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
      {fullScreenMonitor && monitorEngine === 'svg' && (
        <StemMonitor2DMap onClose={() => setFullScreenMonitor(false)} initialView="asia" />
      )}
      {fullScreenMonitor && monitorEngine === 'deck' && (
        <StemMonitorDeckMap onClose={() => setFullScreenMonitor(false)} initialView="asia" />
      )}
    </div>
  )
}
