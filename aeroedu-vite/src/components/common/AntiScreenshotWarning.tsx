/**
 * AntiScreenshotWarning — overlay hiển thị khi phát hiện screenshot
 * Như Udemy: cảnh báo rõ ràng, auto-dismiss 5 giây
 */
import { ShieldAlert, X } from 'lucide-react'
import { useAntiScreenshot } from '@/hooks/useAntiScreenshot'

export function AntiScreenshotWarning() {
  const { showWarning, dismissWarning } = useAntiScreenshot()

  if (!showWarning) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={dismissWarning}
    >
      <div
        className="relative mx-4 max-w-sm w-full rounded-2xl border border-red-500/25 bg-[hsl(0,0%,8%)] p-8 text-center shadow-[0_0_60px_rgba(239,68,68,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={dismissWarning}
          className="absolute right-3 top-3 w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-5">
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-white/90 mb-2">Nội dung được bảo vệ</h2>

        {/* Subtitle */}
        <p className="text-sm text-white/50 leading-relaxed mb-6">
          Ảnh chụp màn hình bị hạn chế để bảo vệ tài liệu học tập
        </p>

        {/* Dismiss button */}
        <button
          onClick={dismissWarning}
          className="w-full py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-sm font-semibold text-white/70 hover:bg-white/[0.10] hover:text-white/90 transition-all"
        >
          Đã hiểu
        </button>

        {/* Auto-dismiss hint */}
        <p className="text-[0.65rem] text-white/20 mt-3">Tự động đóng sau 5 giây</p>
      </div>
    </div>
  )
}
