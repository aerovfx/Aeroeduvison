/**
 * NameStartModal — Modal đặt tên + chọn avatar trước khi bắt đầu làm bài.
 *
 * Style Wayground: "Tên Wayground của bạn là..." + grid avatar emoji + nút "Bắt đầu".
 * Lưu vào sessionStorage để dùng lại trong lobby leaderboard.
 */
import { useState, useEffect } from 'react'
import { Sparkles, Volume2, VolumeX, BookOpen } from 'lucide-react'

const AVATAR_POOL = [
  '🦊','🐯','🐱','🐰','🐼','🐧','🦁','🐻','🐨','🐸',
  '🐵','🐺','🦝','🦄','🐲','🐳','🦋','🐢','🦉','🐝',
  '🧑‍🎓','🧑‍🚀','🧑‍🔬','🧑‍💻','🧑‍🎨','🥷','🧙','🦸','🧚','🤖',
]

interface NameStartModalProps {
  open: boolean
  onClose: () => void
  /** Tên gợi ý lấy từ user.name nếu có */
  defaultName?: string
  /** Tiêu đề (vd "Bắt đầu làm bài" hoặc "Tham gia phòng thi") */
  title?: string
  /** Subtitle dưới title */
  subtitle?: string
  /** Tên đề thi để hiển thị */
  examTitle?: string
  /** Callback khi xác nhận */
  onStart: (params: { name: string; avatar: string; soundOn: boolean }) => void
}

export function NameStartModal({
  open, onClose,
  defaultName = '', title = 'Bắt đầu làm bài',
  subtitle, examTitle, onStart,
}: NameStartModalProps) {
  const stored = (() => {
    try {
      return {
        name: sessionStorage.getItem('aero_player_name') || defaultName,
        avatar: sessionStorage.getItem('aero_player_avatar') || AVATAR_POOL[0],
        soundOn: sessionStorage.getItem('aero_player_sound') !== 'off',
      }
    } catch { return { name: defaultName, avatar: AVATAR_POOL[0], soundOn: true } }
  })()

  const [name, setName] = useState(stored.name)
  const [avatar, setAvatar] = useState(stored.avatar)
  const [soundOn, setSoundOn] = useState(stored.soundOn)

  // Đóng bằng ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    try {
      sessionStorage.setItem('aero_player_name', trimmed)
      sessionStorage.setItem('aero_player_avatar', avatar)
      sessionStorage.setItem('aero_player_sound', soundOn ? 'on' : 'off')
    } catch { /* ignore */ }
    onStart({ name: trimmed, avatar, soundOn })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at center, rgba(76,29,149,0.85), rgba(15,7,30,0.95))' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-[hsl(260,40%,15%)] border border-white/10 shadow-2xl p-5 sm:p-7">
        {/* Heading */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold mb-2">
            <Sparkles className="w-3 h-3" /> {title}
          </div>
          {examTitle && (
            <p className="text-white/85 text-base font-semibold leading-tight mb-1 line-clamp-2">
              {examTitle}
            </p>
          )}
          {subtitle && <p className="text-xs text-white/55">{subtitle}</p>}
        </div>

        {/* Avatar selected preview */}
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/40 flex items-center justify-center text-4xl shadow-lg">
            {avatar}
          </div>
        </div>

        {/* Name input */}
        <label className="block mb-3">
          <span className="block text-xs uppercase tracking-wider font-bold text-white/55 mb-1.5 px-1">
            Tên của bạn
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSubmit() }}
            placeholder="Điền tên của bạn"
            maxLength={24}
            className="w-full h-12 sm:h-14 px-4 rounded-xl bg-white text-purple-900 text-lg font-bold placeholder-purple-300/60 focus:outline-none focus:ring-4 focus:ring-purple-400/40"
          />
        </label>

        {/* Avatar grid */}
        <div className="mb-4">
          <span className="block text-xs uppercase tracking-wider font-bold text-white/55 mb-1.5 px-1">
            Chọn linh vật
          </span>
          <div className="grid grid-cols-10 gap-1 max-h-24 overflow-y-auto rounded-xl bg-black/20 p-2 border border-white/[0.06]">
            {AVATAR_POOL.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`text-xl sm:text-2xl aspect-square flex items-center justify-center rounded-md transition ${
                  avatar === a
                    ? 'bg-purple-500/40 ring-2 ring-purple-300 scale-110'
                    : 'hover:bg-white/[0.08]'
                }`}
                aria-label={`Avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="mb-5 space-y-1.5">
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/80 hover:bg-white/[0.07] transition"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Hiệu ứng âm thanh
            </span>
            <div className={`relative w-10 h-5 rounded-full transition ${soundOn ? 'bg-emerald-500' : 'bg-white/15'}`}>
              <div className={`absolute top-0.5 ${soundOn ? 'left-5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`} />
            </div>
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🚀 Bắt đầu
        </button>

        <p className="text-[11px] text-center text-white/40 mt-3 flex items-center justify-center gap-1">
          <BookOpen className="w-3 h-3" />
          Tên hiển thị trên bảng xếp hạng &amp; lịch sử.
        </p>
      </div>
    </div>
  )
}

export default NameStartModal
