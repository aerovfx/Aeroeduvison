/**
 * /student/teachers — HS quản lý kết nối với giáo viên
 *
 * 3 tab:
 *   - Đã kết nối (approved teachers)
 *   - Đang chờ duyệt (outgoing requests + incoming invites)
 *   - Tìm GV mới (search modal trigger)
 *
 * Sau khi approve/disconnect: invalidate query cache → refresh list.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, Search, UserPlus, Check, X, Clock, Mail,
  Loader2, AlertCircle, ArrowRight, Trash2, MessageSquare,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  teacherStudentLinkService,
  type LinkedUser,
  type TeacherStudentLink,
  type SearchUser,
} from '@/services/teacherStudentLink.service'

type Tab = 'connected' | 'pending' | 'find'

export default function MyTeachers() {
  const [tab, setTab] = useState<Tab>('connected')
  const [teachers, setTeachers] = useState<LinkedUser[]>([])
  const [pending, setPending] = useState<{
    incoming: TeacherStudentLink[]
    outgoing: TeacherStudentLink[]
  }>({ incoming: [], outgoing: [] })
  const [loading, setLoading] = useState(true)
  const [findOpen, setFindOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [t, p] = await Promise.all([
        teacherStudentLinkService.myTeachers(),
        teacherStudentLinkService.pending(),
      ])
      setTeachers(t)
      setPending(p)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const acceptInvite = async (linkId: string) => {
    try {
      await teacherStudentLinkService.approve(linkId)
      toast.success('Đã đồng ý kết nối — bài tập sẽ được đồng bộ')
      reload()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không đồng ý được')
    }
  }
  const rejectInvite = async (linkId: string) => {
    if (!confirm('Từ chối lời mời này? GV sẽ phải chờ 30 ngày mới mời lại được.')) return
    try {
      await teacherStudentLinkService.reject(linkId)
      toast.success('Đã từ chối')
      reload()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không từ chối được')
    }
  }
  const cancelOutgoing = async (linkId: string) => {
    if (!confirm('Huỷ yêu cầu đã gửi?')) return
    try {
      await teacherStudentLinkService.disconnect(linkId)
      toast.success('Đã huỷ')
      reload()
    } catch {
      toast.error('Không huỷ được')
    }
  }
  const disconnect = async (linkId: string, name: string) => {
    if (!confirm(`Gỡ kết nối với GV ${name}? Bài tập + điểm cũ vẫn được lưu, chỉ ngừng đồng bộ mới.`)) return
    try {
      await teacherStudentLinkService.disconnect(linkId)
      toast.success('Đã gỡ kết nối')
      reload()
    } catch {
      toast.error('Không gỡ được')
    }
  }

  const totalPending = pending.incoming.length + pending.outgoing.length

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6 text-white">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Giáo viên dạy tôi</h1>
            <p className="text-sm text-white/50">
              Kết nối với GV để đồng bộ bài tập, điểm số và thông báo realtime
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-white/[0.08]">
          {([
            { key: 'connected' as const, label: 'Đã kết nối', count: teachers.length },
            { key: 'pending'   as const, label: 'Đang chờ',   count: totalPending },
            { key: 'find'      as const, label: 'Tìm GV mới', count: null },
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'find') setFindOpen(true)
                else setTab(key)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === key && key !== 'find'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {key === 'find' && <UserPlus className="w-4 h-4" />}
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${count > 0 && key === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white/60'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
          </div>
        ) : tab === 'connected' ? (
          teachers.length === 0 ? (
            <EmptyConnected onFind={() => setFindOpen(true)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map(t => (
                <div key={t.linkId} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold flex-shrink-0">
                      {t.image
                        ? <img src={t.image} alt={t.name || ''} className="w-12 h-12 rounded-full object-cover" />
                        : (t.name || t.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{t.name || '(chưa đặt tên)'}</h3>
                      <p className="text-xs text-white/50 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />{t.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mb-3">
                    <Clock className="w-3 h-3" />
                    {t.initiatedBy === 'auto' && '🔗 Tự động kết nối'}
                    {t.initiatedBy === 'student' && 'Bạn đã yêu cầu'}
                    {t.initiatedBy === 'teacher' && 'GV đã mời'}
                    {' • '}
                    {t.approvedAt && new Date(t.approvedAt).toLocaleDateString('vi-VN')}
                  </div>
                  <button
                    onClick={() => disconnect(t.linkId, t.name || t.email)}
                    className="w-full text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20"
                  >
                    <Trash2 className="w-3 h-3" />Gỡ kết nối
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Pending tab */
          <div className="space-y-6">
            {pending.incoming.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">
                  📥 GV mời bạn ({pending.incoming.length})
                </h3>
                <div className="space-y-2">
                  {pending.incoming.map(p => (
                    <div key={p.id} className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-300 font-bold">
                        {(p.otherName || p.otherEmail || 'G')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{p.otherName || p.otherEmail}</p>
                        <p className="text-xs text-white/50 truncate">{p.otherEmail}</p>
                        {p.message && (
                          <p className="text-xs text-white/70 mt-1 italic flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />"{p.message}"
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptInvite(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />Đồng ý
                        </button>
                        <button
                          onClick={() => rejectInvite(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-red-400 text-sm font-semibold flex items-center gap-1 border border-red-500/30"
                        >
                          <X className="w-3.5 h-3.5" />Từ chối
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pending.outgoing.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">
                  📤 Bạn đã gửi ({pending.outgoing.length})
                </h3>
                <div className="space-y-2">
                  {pending.outgoing.map(p => (
                    <div key={p.id} className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                        {(p.otherName || p.otherEmail || 'G')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{p.otherName || p.otherEmail}</p>
                        <p className="text-xs text-white/50 truncate">Đang chờ GV duyệt</p>
                      </div>
                      <button
                        onClick={() => cancelOutgoing(p.id)}
                        className="text-xs text-white/50 hover:text-red-400 px-3 py-1.5"
                      >Huỷ yêu cầu</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {totalPending === 0 && (
              <div className="text-center py-12 text-white/40">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                Không có yêu cầu nào đang chờ
              </div>
            )}
          </div>
        )}

        {/* Find teacher modal */}
        {findOpen && (
          <FindTeacherModal
            onClose={() => setFindOpen(false)}
            onSent={() => { setFindOpen(false); reload() }}
          />
        )}
      </div>
    </div>
  )
}

function EmptyConnected({ onFind }: { onFind: () => void }) {
  return (
    <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <AlertCircle className="w-14 h-14 mx-auto text-yellow-400 mb-4" />
      <h2 className="text-xl font-bold mb-2">Bạn chưa kết nối với GV nào</h2>
      <p className="text-white/50 max-w-md mx-auto mb-6 text-sm">
        Bài tập và điểm số chỉ được đồng bộ sau khi GV duyệt yêu cầu kết nối của bạn.
        Hãy bắt đầu bằng việc tìm GV dạy mình.
      </p>
      <button
        onClick={onFind}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold"
      >
        <Search className="w-4 h-4" />Tìm giáo viên
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FindTeacherModal — search GV theo email/tên + gửi request
// ─────────────────────────────────────────────────────────────
function FindTeacherModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState<SearchUser | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Debounce search
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const users = await teacherStudentLinkService.searchUsers(query.trim(), 'TEACHER')
        setResults(users)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const sendRequest = async () => {
    if (!picked) return
    setSending(true)
    try {
      await teacherStudentLinkService.request({
        teacherId: picked.id,
        message: message.trim() || undefined,
      })
      toast.success(`Đã gửi yêu cầu tới ${picked.name || picked.email}`)
      onSent()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không gửi được')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[hsl(260,30%,12%)] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-400" />
            Tìm giáo viên
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {!picked ? (
          <div className="p-5 space-y-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Email hoặc tên GV (vd thay@inphysic.com)..."
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500"
            />
            {query.length < 2 ? (
              <p className="text-xs text-white/40 text-center py-6">Gõ ≥ 2 ký tự để tìm</p>
            ) : loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6">Không tìm thấy GV nào — chắc rằng GV đã đăng ký tài khoản</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {results.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setPicked(u)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm">
                      {u.image
                        ? <img src={u.image} alt={u.name || ''} className="w-9 h-9 rounded-full object-cover" />
                        : (u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{u.name || '(chưa đặt tên)'}</p>
                      <p className="text-xs text-white/50 truncate">{u.email}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/30" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-purple-300">
                {picked.image
                  ? <img src={picked.image} alt={picked.name || ''} className="w-10 h-10 rounded-full object-cover" />
                  : (picked.name || picked.email)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{picked.name}</p>
                <p className="text-xs text-white/50">{picked.email}</p>
              </div>
              <button
                onClick={() => setPicked(null)}
                className="text-xs text-white/40 hover:text-white"
              >Đổi</button>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1.5">Lời nhắn (tuỳ chọn)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="VD: Em là Nguyễn Văn A, lớp 12A1, học môn Lý của thầy/cô..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 resize-none"
              />
              <p className="text-[10px] text-white/30 mt-1 text-right">{message.length}/500</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium border border-white/10"
              >Huỷ</button>
              <button
                onClick={sendRequest}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi yêu cầu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Banner reminder cho HS chưa kết nối GV nào
// Export riêng để dùng ở Student Dashboard
// ─────────────────────────────────────────────────────────────
export function ConnectTeacherBanner() {
  const [hasTeachers, setHasTeachers] = useState<boolean | null>(null)
  useEffect(() => {
    teacherStudentLinkService.myTeachers()
      .then(t => setHasTeachers(t.length > 0))
      .catch(() => setHasTeachers(true))   // fail = ẩn banner cho an toàn
  }, [])
  if (hasTeachers === null || hasTeachers) return null
  return (
    <div className="rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-4 flex items-center gap-3 mb-6">
      <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-yellow-200">Bạn chưa kết nối với giáo viên nào</p>
        <p className="text-xs text-white/60">Bài tập và điểm số sẽ KHÔNG được đồng bộ cho tới khi bạn kết nối với GV dạy mình</p>
      </div>
      <Link
        to="/student/teachers"
        className="flex-shrink-0 px-4 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-xs"
      >Kết nối ngay →</Link>
    </div>
  )
}
