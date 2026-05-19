/**
 * /join/:token — PUBLIC landing page khi HS quét QR / mở link mời của GV.
 *
 * Flow:
 *   1. Fetch /api/teacher-student-link/invite-link/:token/info → teacher info
 *   2. Nếu chưa login → CTA "Đăng nhập / Đăng ký" với redirect về lại trang này
 *   3. Đã login → CTA "Gửi yêu cầu vào lớp" → POST join endpoint
 *   4. Sau khi gửi → redirect về /student/teachers (HS xem GV của mình)
 *
 * KHÔNG yêu cầu auth để xem teacher info (HS check trước khi đăng ký).
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, Loader2, LogIn, UserPlus, ArrowRight,
  Mail, GraduationCap, Sparkles,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { teacherStudentLinkService } from '@/services/teacherStudentLink.service'
import { useAuthContext } from '@/contexts/AuthContext'

interface InviteInfo {
  valid: boolean
  label: string | null
  teacher: { id: string; name: string | null; email: string; image: string | null }
  usedCount: number
  maxUses: number | null
  expiresAt: string | null
}

export default function JoinByToken() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading: authLoading } = useAuthContext()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    teacherStudentLinkService.getInviteLinkInfo(token)
      .then(setInfo)
      .catch(err => {
        setError(err?.response?.data?.error || 'Link không hợp lệ')
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleJoin = async () => {
    if (!token) return
    setJoining(true)
    try {
      await teacherStudentLinkService.joinViaInviteLink(token, message.trim() || undefined)
      setJoined(true)
      toast.success('Đã gửi yêu cầu — chờ GV duyệt')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number } }
      const errMsg = e.response?.data?.error
      if (e.response?.status === 409 && errMsg?.includes('đã ở trong lớp')) {
        setJoined(true)
        toast(errMsg, { icon: '✅', duration: 4000 })
      } else if (e.response?.status === 409 && errMsg?.includes('đang chờ')) {
        setJoined(true)
        toast(errMsg, { icon: '⏳', duration: 4000 })
      } else {
        toast.error(errMsg || 'Không gửi được yêu cầu')
      }
    } finally {
      setJoining(false)
    }
  }

  // Login redirect — quay lại trang này sau khi login
  // App dùng pattern /auth/login + /auth/register (xem router/index.tsx)
  const goLogin = (mode: 'login' | 'register') => {
    const returnTo = encodeURIComponent(location.pathname)
    navigate(`/auth/${mode === 'login' ? 'login' : 'register'}?returnTo=${returnTo}`)
  }

  if (loading || authLoading) {
    return (
      <Wrap>
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
        <p className="text-center text-zinc-400 text-sm mt-4">Đang kiểm tra link mời...</p>
      </Wrap>
    )
  }

  if (error || !info) {
    return (
      <Wrap>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/15 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Link không hợp lệ</h1>
          <p className="text-zinc-400 text-sm mb-6">
            {error || 'Link này đã bị thu hồi, hết hạn hoặc không tồn tại.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold"
          >
            Về trang chủ
          </button>
        </div>
      </Wrap>
    )
  }

  // Đã gửi yêu cầu thành công
  if (joined) {
    return (
      <Wrap>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center mb-5">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Đã gửi yêu cầu!</h1>
          <p className="text-zinc-300 text-sm mb-2">
            Yêu cầu của em đã được gửi tới
          </p>
          <p className="text-emerald-300 font-bold mb-6">
            {info.teacher.name || info.teacher.email}
          </p>
          <p className="text-zinc-500 text-xs mb-8 max-w-sm mx-auto">
            Khi GV xác thực, em sẽ tự động vào lớp và thấy các bài tập, đề thi mà GV giao.
          </p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <button
              onClick={() => navigate('/student/teachers')}
              className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              Xem GV của tôi
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold"
            >
              Về bảng điều khiển
            </button>
          </div>
        </div>
      </Wrap>
    )
  }

  // Teacher info preview + CTA
  return (
    <Wrap>
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-4">
          <Sparkles className="w-3 h-3" /> LỜI MỜI VÀO LỚP
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">
          {info.teacher.name || 'Giáo viên'} mời bạn vào lớp
        </h1>
        {info.label && (
          <p className="text-emerald-300 font-semibold text-sm">
            "{info.label}"
          </p>
        )}
      </div>

      {/* Teacher card */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 mb-5 flex items-center gap-4">
        {info.teacher.image ? (
          <img src={info.teacher.image} alt="" className="w-14 h-14 rounded-full object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xl">
            {(info.teacher.name || info.teacher.email)[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{info.teacher.name || '(chưa đặt tên)'}</h3>
          <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
            <Mail className="w-3 h-3" /> {info.teacher.email}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-5 text-center text-xs">
        <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800">
          <div className="text-emerald-300 font-bold text-lg">{info.usedCount}{info.maxUses ? `/${info.maxUses}` : ''}</div>
          <div className="text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Đã tham gia</div>
        </div>
        <div className="bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800">
          <div className="text-amber-300 font-bold text-sm pt-1">
            {info.expiresAt
              ? new Date(info.expiresAt).toLocaleDateString('vi-VN')
              : 'Vĩnh viễn'}
          </div>
          <div className="text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Hết hạn</div>
        </div>
      </div>

      {!user ? (
        // Chưa login
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 text-center mb-3">
            Em cần đăng nhập / đăng ký tài khoản học sinh để vào lớp
          </p>
          <button
            onClick={() => goLogin('register')}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Đăng ký tài khoản mới
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => goLogin('login')}
            className="w-full px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Tôi đã có tài khoản
          </button>
        </div>
      ) : (
        // Đã login
        <>
          {/* Optional message */}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Lời nhắn cho GV (tuỳ chọn): em là HS lớp..., mã định danh..."
            rows={2}
            maxLength={500}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 mb-3 resize-none"
          />
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Gửi yêu cầu vào lớp
          </button>
          <p className="text-[10px] text-zinc-500 text-center mt-2">
            GV sẽ xác thực thông tin của em trước khi đồng ý
          </p>
        </>
      )}
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(260,30%,6%)] via-[hsl(260,30%,8%)] to-[hsl(220,30%,6%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl p-6">
        {children}
      </div>
    </div>
  )
}
