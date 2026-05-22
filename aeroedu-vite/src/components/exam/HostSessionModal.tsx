/**
 * HostSessionModal — Modal chọn kiểu host bài thi (Wayground-style).
 *
 * Hiển thị 2 card:
 *  1. Student paced (Học sinh tự do) — share link/QR để HS làm theo tốc độ riêng.
 *  2. Teacher led (Giáo viên dẫn dắt) — đồng bộ realtime, GV bấm "Câu kế tiếp".
 *
 * Hiển thị khi GV bấm "Bắt đầu phiên" / "Play" trên exam.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Users, Presentation, ArrowRight } from 'lucide-react'

interface HostSessionModalProps {
  open: boolean
  onClose: () => void
  examId: string
  examTitle?: string
}

export function HostSessionModal({ open, onClose, examId, examTitle }: HostSessionModalProps) {
  const navigate = useNavigate()

  // Đóng khi bấm ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const studentPacedUrl = `${window.location.origin}/student/exam-prep?startExam=${examId}&type=exam`

  const onStudentPaced = () => {
    // Mở tab share — copy link, hiển thị QR. Đơn giản: navigate tới student URL
    // để giáo viên xem trải nghiệm, đồng thời copy link vào clipboard.
    if (navigator.clipboard) navigator.clipboard.writeText(studentPacedUrl)
    window.open(studentPacedUrl, '_blank')
    onClose()
  }

  const onTeacherLed = () => {
    navigate(`/teacher/exams/${examId}/play`)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-3xl rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition z-10"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Bạn muốn tổ chức phiên thi thế nào?
          </h2>
          {examTitle && (
            <p className="text-sm text-muted-foreground mt-1 truncate">
              Đề: <span className="text-foreground/80 font-medium">{examTitle}</span>
            </p>
          )}
        </div>

        {/* 2 options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 pt-0">
          {/* Student paced — purple */}
          <button
            onClick={onStudentPaced}
            className="group relative overflow-hidden rounded-2xl text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, hsl(262,75%,35%), hsl(290,70%,28%))',
            }}
          >
            <div className="relative p-5 sm:p-6 min-h-[260px] flex flex-col">
              {/* Illustration area */}
              <div className="flex-1 relative mb-4">
                {/* Computer-with-character SVG illustration */}
                <svg viewBox="0 0 200 140" className="w-full h-32 sm:h-36" aria-hidden="true">
                  {/* Laptop */}
                  <rect x="50" y="50" width="120" height="75" rx="6" fill="#1a0a2e" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                  <rect x="56" y="56" width="108" height="63" rx="3" fill="#2d0f4d" />
                  {/* Screen content lines */}
                  <rect x="62" y="63" width="40" height="4" rx="2" fill="rgba(255,255,255,0.3)" />
                  <rect x="62" y="71" width="60" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
                  <rect x="62" y="79" width="50" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
                  {/* Answer buttons */}
                  <rect x="62"  y="92" width="22" height="22" rx="3" fill="#f59e0b" opacity="0.9" />
                  <rect x="88"  y="92" width="22" height="22" rx="3" fill="#a855f7" opacity="0.9" />
                  <rect x="114" y="92" width="22" height="22" rx="3" fill="#ec4899" opacity="0.9" />
                  <rect x="140" y="92" width="22" height="22" rx="3" fill="#10b981" opacity="0.9" />
                  {/* Character head */}
                  <circle cx="115" cy="42" r="22" fill="#f5f5f4" />
                  <circle cx="108" cy="42" r="2.5" fill="#1a0a2e" />
                  <circle cx="122" cy="42" r="2.5" fill="#1a0a2e" />
                  <path d="M 108 50 Q 115 53 122 50" stroke="#1a0a2e" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  {/* Body shoulders */}
                  <path d="M 92 75 Q 115 60 138 75 L 138 90 L 92 90 Z" fill="#3b82f6" />
                </svg>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-white/80" />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-white/60">Tốc độ riêng</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                    Học sinh tự làm
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">
                    Mỗi HS làm theo tốc độ riêng. Share QR + link, kết quả tự lưu.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          </button>

          {/* Teacher led — blue */}
          <button
            onClick={onTeacherLed}
            className="group relative overflow-hidden rounded-2xl text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, hsl(218,75%,40%), hsl(200,75%,35%))',
            }}
          >
            <div className="relative p-5 sm:p-6 min-h-[260px] flex flex-col">
              {/* Illustration */}
              <div className="flex-1 relative mb-4">
                <svg viewBox="0 0 200 140" className="w-full h-32 sm:h-36" aria-hidden="true">
                  {/* Whiteboard */}
                  <rect x="55" y="20" width="120" height="75" rx="4" fill="#fefce8" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
                  <rect x="60" y="25" width="110" height="65" fill="#fef3c7" opacity="0.5" />
                  {/* Question marks on board */}
                  <rect x="65"  y="35" width="22" height="22" rx="3" fill="#f59e0b" />
                  <rect x="92"  y="35" width="22" height="22" rx="3" fill="#a855f7" />
                  <rect x="119" y="35" width="22" height="22" rx="3" fill="#ec4899" />
                  <rect x="146" y="35" width="22" height="22" rx="3" fill="#10b981" />
                  <text x="76"  y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">A</text>
                  <text x="103" y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">B</text>
                  <text x="130" y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">C</text>
                  <text x="157" y="51" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">D</text>
                  <rect x="65"  y="65" width="100" height="3" rx="1.5" fill="rgba(0,0,0,0.25)" />
                  <rect x="65"  y="73" width="80"  height="3" rx="1.5" fill="rgba(0,0,0,0.15)" />
                  {/* Teacher character (right) */}
                  <circle cx="155" cy="115" r="14" fill="#f5f5f4" />
                  <circle cx="151" cy="115" r="2" fill="#1a0a2e" />
                  <circle cx="159" cy="115" r="2" fill="#1a0a2e" />
                  <path d="M 152 120 Q 155 122 158 120" stroke="#1a0a2e" strokeWidth="1.5" fill="none" />
                  <rect x="142" y="128" width="26" height="12" rx="3" fill="#ef4444" />
                  {/* Student character (left) */}
                  <circle cx="40" cy="115" r="14" fill="#f5f5f4" />
                  <circle cx="36" cy="115" r="2" fill="#1a0a2e" />
                  <circle cx="44" cy="115" r="2" fill="#1a0a2e" />
                  <path d="M 36 120 Q 40 122 44 120" stroke="#1a0a2e" strokeWidth="1.5" fill="none" />
                  <rect x="27" y="128" width="26" height="12" rx="3" fill="#f97316" />
                  {/* Pointer line from teacher to whiteboard */}
                  <line x1="148" y1="105" x2="120" y2="60" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeDasharray="2,2" />
                </svg>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Presentation className="w-4 h-4 text-white/80" />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-white/60">Đồng bộ realtime</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white leading-tight">
                    Giáo viên dẫn dắt
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 mt-1 leading-relaxed">
                    GV chiếu màn hình, HS trả lời trên điện thoại theo cùng nhịp.
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform flex-shrink-0 mt-1" />
              </div>
            </div>
          </button>
        </div>

        {/* Footer hint */}
        <div className="px-6 sm:px-8 py-3 bg-muted/30 border-t border-border text-xs text-muted-foreground text-center">
          💡 Cả 2 kiểu đều tự chấm và xuất báo cáo điểm sau khi xong.
        </div>
      </div>
    </div>
  )
}

export default HostSessionModal
