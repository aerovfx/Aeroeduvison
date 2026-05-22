/**
 * NotFound — 404 page
 *
 * Thay cho redirect âm thầm trước đây tới /dashboard. User gõ sai URL
 * giờ thấy thông báo rõ ràng + suggestions thay vì bị tống sang trang
 * khác (gây nhầm lẫn không biết link mình share có hợp lệ không).
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Compass, ArrowLeft, Home, BookOpen, FileText,
  Brain, GraduationCap, Map, Search,
} from 'lucide-react'
import usePageTitle from '@/hooks/usePageTitle'

export default function NotFound() {
  usePageTitle('Không tìm thấy trang')
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Suggestion thông minh dựa vào URL hint
  const suggestions = (() => {
    const p = pathname.toLowerCase()
    const all = [
      { icon: Home, label: 'Trang chủ', to: '/', desc: 'Khám phá AeroEduVision' },
      { icon: GraduationCap, label: 'Dashboard học sinh', to: '/dashboard', desc: 'Tổng quan học tập' },
      { icon: FileText, label: 'Phòng thi Live', to: '/student/exams', desc: 'Phòng thi đang mở' },
      { icon: Map, label: 'Lộ trình học', to: '/learning-paths', desc: 'Lộ trình từ GV' },
      { icon: Brain, label: 'AI Gia Sư', to: '/ai-tutor', desc: 'Hỏi đáp với AI' },
      { icon: BookOpen, label: 'Tài liệu', to: '/docs', desc: 'Hướng dẫn sử dụng' },
    ]
    // Heuristic: ưu tiên match từ khoá trong path
    const scored = all.map(s => {
      let score = 0
      if (p.includes('exam')   && s.to.includes('exam'))   score += 3
      if (p.includes('path')   && s.to.includes('path'))   score += 3
      if (p.includes('tutor')  && s.to.includes('tutor'))  score += 3
      if (p.includes('doc')    && s.to.includes('doc'))    score += 3
      if (p.includes('teacher')&& s.to.includes('teacher')) score += 3
      if (p.includes('student')&& s.to.includes('student')) score += 3
      return { ...s, score }
    })
    return scored.sort((a, b) => b.score - a.score)
  })()

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-zinc-100 px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full text-center">
        {/* Big 404 */}
        <div className="relative inline-block mb-6">
          <span
            className="text-[120px] sm:text-[160px] font-black leading-none"
            style={{
              background: 'linear-gradient(135deg, #22d3ee, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
            <Compass className="w-24 h-24 sm:w-32 sm:h-32 text-cyan-300 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-3">
          Không tìm thấy trang này
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto mb-2">
          Đường dẫn <code className="font-mono text-xs bg-zinc-800/80 text-cyan-300 px-2 py-1 rounded mx-1 break-all">{pathname}</code>
          không tồn tại hoặc đã bị di chuyển.
        </p>
        <p className="text-xs text-zinc-500 mb-8">
          Có thể bạn gõ sai URL, link bị cũ, hoặc trang đã đổi tên.
        </p>

        {/* Quick actions */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
          >
            <Home className="w-4 h-4" /> Trang chủ
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          >
            <Search className="w-4 h-4" /> Tìm trong tài liệu
          </Link>
        </div>

        {/* Suggestions grid */}
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-3 text-center">
            Có thể bạn đang tìm:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestions.slice(0, 6).map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-cyan-500/30 transition-colors group"
              >
                <div className="p-2 rounded-md bg-cyan-500/10 border border-cyan-500/20 shrink-0">
                  <s.icon className="w-4 h-4 text-cyan-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-zinc-100 truncate group-hover:text-cyan-300">
                    {s.label}
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate">{s.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 italic mt-10">
          Nếu bạn cho rằng đây là lỗi của chúng tôi, vui lòng
          <Link to="/contact-sales" className="text-cyan-400 hover:underline mx-1">báo cho admin</Link>
          để xử lý.
        </p>
      </div>
    </div>
  )
}
