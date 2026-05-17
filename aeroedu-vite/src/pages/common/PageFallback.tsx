/**
 * PageFallback — Trang "Đang phát triển"
 *
 * Dùng cho các route đã đăng ký nhưng feature chưa hoàn thiện.
 * Khác với 404 (URL không tồn tại) — đây là URL hợp lệ nhưng nội dung
 * chưa sẵn sàng. Phân biệt rõ để user không bị nhầm.
 *
 * Khi 1 trang được port xong → thay PageFallback bằng component thực.
 */
import { Link, useLocation } from 'react-router-dom'
import { Construction, ArrowLeft, Home, Mail, BookOpen } from 'lucide-react'
import usePageTitle from '@/hooks/usePageTitle'

export default function PageFallback() {
  usePageTitle('Đang phát triển')
  const { pathname } = useLocation()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="max-w-lg w-full">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30 mb-6">
          <Construction className="w-10 h-10 text-amber-400" />
        </div>

        <h2 className="text-2xl font-bold text-zinc-100 mb-3">
          Tính năng đang phát triển
        </h2>
        <p className="text-sm text-zinc-400 mb-1">
          Trang <code className="font-mono text-xs bg-zinc-800/80 text-amber-300 px-2 py-1 rounded mx-1 break-all">{pathname}</code>
          đã có trong roadmap nhưng chưa hoàn thiện.
        </p>
        <p className="text-xs text-zinc-500 mb-8">
          Đội ngũ đang ưu tiên các tính năng quan trọng theo phản hồi của giáo viên — bạn sẽ thấy nó sớm thôi.
        </p>

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors"
          >
            <Home className="w-4 h-4" /> Về Dashboard
          </Link>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Xem tài liệu
          </Link>
        </div>

        {/* Suggest feature box */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 shrink-0">
              <Mail className="w-4 h-4 text-blue-300" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-zinc-100 mb-1">Muốn ưu tiên feature này?</h3>
              <p className="text-xs text-zinc-400 mb-2">
                Gửi nhu cầu thực tế của bạn — giáo viên / học sinh dùng để làm gì → giúp đội ngũ
                quyết định nên xây trước.
              </p>
              <a
                href={`mailto:hello@inphysic.com?subject=${encodeURIComponent('Yêu cầu feature: ' + pathname)}&body=${encodeURIComponent('Tôi muốn tính năng này được hoàn thiện sớm vì:\n\n')}`}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                Gửi yêu cầu qua email →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Tạo fallback với path ghi đè (giữ API tương thích).
 */
export function makeFallback(_nextPath?: string) {
  return function FallbackPage() {
    return <PageFallback />
  }
}
