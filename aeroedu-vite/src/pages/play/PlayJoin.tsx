/**
 * PlayJoin — Trang landing /play
 * Học sinh nhập 6-digit code → navigate /play/:code
 *
 * Mobile-first, chữ to, dễ chạm. Tham khảo Wayground/Kahoot landing.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function PlayJoin() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const c = code.replace(/\D/g, '')
    if (c.length !== 6) {
      toast.error('Mã phòng phải đủ 6 chữ số')
      return
    }
    navigate(`/play/${c}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10"
      style={{ background: 'radial-gradient(ellipse at top, #4a1366 0%, #1a0b2e 70%)' }}>
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🎯</div>
        <h1 className="text-white text-4xl font-black mb-2">Vào phòng thi</h1>
        <p className="text-white/60 text-base">Nhập mã 6 chữ số mà giáo viên đưa</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <input
          type="tel"
          inputMode="numeric"
          autoFocus
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="123 456"
          className="w-full text-center text-5xl md:text-6xl font-black tracking-[0.3em] py-6 rounded-2xl
            bg-white text-purple-900 placeholder-purple-200 focus:outline-none focus:ring-4 focus:ring-purple-400"
        />
        <button type="submit" disabled={code.length !== 6}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600
            hover:from-pink-600 hover:to-purple-700 text-white font-black text-2xl shadow-2xl
            disabled:opacity-50 disabled:cursor-not-allowed">
          Tiếp tục
        </button>
      </form>

      <p className="mt-10 text-white/40 text-sm text-center">
        Chưa có mã? Hỏi giáo viên hoặc xem trên màn hình lớp.
      </p>
    </div>
  )
}
