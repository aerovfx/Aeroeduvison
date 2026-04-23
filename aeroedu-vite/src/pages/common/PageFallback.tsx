/**
 * PageFallback — Trang "Đang phát triển"
 *
 * Dùng cho các route chưa được port sang Vite.
 * Next.js đã bị xoá — không còn iframe fallback nữa.
 *
 * Khi một trang đã được port xong → thay bằng import component thực sự.
 */
import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'

export default function PageFallback() {
  const { pathname } = useLocation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20">
        <Construction className="w-8 h-8 text-amber-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white/90">Đang phát triển</h2>
        <p className="text-sm text-white/50 max-w-xs">
          Trang <code className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{pathname}</code> đang được port sang Vite và sẽ sớm ra mắt.
        </p>
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
