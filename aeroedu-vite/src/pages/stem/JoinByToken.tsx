/**
 * /stem/join/:token — HS tham gia dự án STEM qua link/QR
 *
 * Flow:
 *   1. HS quét QR / mở link → page này
 *   2. GET invite info → preview project + GV
 *   3. Yêu cầu login nếu chưa
 *   4. POST join → thành công → redirect /student/stem-projects
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Zap, Loader2, CheckCircle2, AlertCircle, LogIn, Users, BookOpen,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

interface InviteInfo {
  valid: boolean
  reason?: string
  project: {
    id: string
    title: string
    description: string | null
    category: string
    subject: string | null
    grade: string | null
  }
  teacher: { name: string; image: string | null }
  usedCount: number
  maxUses: number | null
  expiresAt: string | null
}

export default function JoinByToken() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!token) return
    api.get<InviteInfo>(`/stem/invite/${token}/info`)
      .then(r => setInfo(r.data))
      .catch(err => {
        setInfo({
          valid: false,
          reason: err?.response?.data?.error || 'Link không hợp lệ',
          project: { id: '', title: '', description: null, category: '', subject: null, grade: null },
          teacher: { name: '', image: null },
          usedCount: 0, maxUses: null, expiresAt: null,
        })
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleJoin = async () => {
    if (!token) return
    setJoining(true)
    try {
      const { data } = await api.post<{ ok: boolean; projectId: string; alreadyMember: boolean; message: string }>(
        `/stem/invite/${token}/join`
      )
      setJoined(true)
      toast.success(data.message)
      setTimeout(() => navigate('/student/stem-projects'), 1500)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Không tham gia được')
    } finally {
      setJoining(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-950/20 via-background to-rose-950/20">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-card border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 text-center border-b border-border bg-gradient-to-br from-amber-500/10 to-rose-500/10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/40 mb-3">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-black">Tham gia dự án STEM</h1>
            <p className="text-xs text-muted-foreground mt-1">inphysic.com</p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {!info?.valid ? (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 text-center">
                <AlertCircle className="w-10 h-10 mx-auto text-rose-400 mb-2" />
                <h2 className="text-base font-bold text-rose-300 mb-1">Link không khả dụng</h2>
                <p className="text-xs text-rose-200/80">{info?.reason || 'Link không tồn tại hoặc đã hết hạn'}</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-muted/40 hover:bg-muted text-foreground text-sm font-semibold"
                >
                  Về trang chủ
                </Link>
              </div>
            ) : (
              <>
                {/* Project info */}
                <div className="rounded-xl bg-muted/20 border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {info.project.category}
                    </span>
                    {info.project.subject && (
                      <span className="text-[10px] text-muted-foreground">📚 {info.project.subject}</span>
                    )}
                    {info.project.grade && (
                      <span className="text-[10px] text-muted-foreground">· Lớp {info.project.grade}</span>
                    )}
                  </div>
                  <h2 className="text-lg font-black">{info.project.title}</h2>
                  {info.project.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {info.project.description}
                    </p>
                  )}
                </div>

                {/* Teacher */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border">
                  {info.teacher.image ? (
                    <img src={info.teacher.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                      {(info.teacher.name || 'G')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Giáo viên</p>
                    <p className="text-sm font-bold">{info.teacher.name}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 text-center">
                    <p className="font-black text-emerald-300">{info.usedCount}{info.maxUses ? `/${info.maxUses}` : ''}</p>
                    <p className="text-[10px] text-emerald-200/70 font-bold uppercase">Đã join</p>
                  </div>
                  <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-2 text-center">
                    <p className="font-black text-cyan-300">
                      {info.expiresAt ? new Date(info.expiresAt).toLocaleDateString('vi-VN') : '∞'}
                    </p>
                    <p className="text-[10px] text-cyan-200/70 font-bold uppercase">Hết hạn</p>
                  </div>
                </div>

                {/* Action */}
                {joined ? (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-emerald-300">Tham gia thành công!</p>
                    <p className="text-xs text-emerald-200/70 mt-1">Đang chuyển hướng...</p>
                  </div>
                ) : !user ? (
                  <Link
                    to={`/auth/login?next=${encodeURIComponent(`/stem/join/${token}`)}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/30"
                  >
                    <LogIn className="w-4 h-4" /> Đăng nhập để tham gia
                  </Link>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-500/30 disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    {joining
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tham gia...</>
                      : <><Users className="w-4 h-4" /> Tham gia dự án</>}
                  </button>
                )}

                <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed">
                  Bằng cách tham gia, bạn đồng ý chia sẻ thông tin học tập với GV phụ trách dự án này
                  để theo dõi tiến độ và cộng tác trong nhóm.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
