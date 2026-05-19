/**
 * /teacher/student-requests — GV quản lý kết nối với HS
 *
 * 3 tab:
 *   - Yêu cầu chờ duyệt (incoming + outgoing pending)
 *   - HS đã kết nối (approved students)
 *   - Mời HS mới (modal: search email HOẶC QR/link share)
 *
 * Bonus: bulk approve nhiều HS cùng lúc + QR/share link cho HS tự đăng ký.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, UserPlus, Check, X, Clock, Mail,
  Loader2, ArrowRight, Trash2, MessageSquare, CheckCheck,
  QrCode, Link2, Copy as CopyIcon, RefreshCw, Calendar, Hash,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'
import {
  teacherStudentLinkService,
  type LinkedUser,
  type TeacherStudentLink,
  type SearchUser,
} from '@/services/teacherStudentLink.service'

type Tab = 'requests' | 'students' | 'invite'

export default function StudentRequests() {
  const [tab, setTab] = useState<Tab>('requests')
  const [students, setStudents] = useState<LinkedUser[]>([])
  const [pending, setPending] = useState<{
    incoming: TeacherStudentLink[]
    outgoing: TeacherStudentLink[]
  }>({ incoming: [], outgoing: [] })
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set())

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([
        teacherStudentLinkService.myStudents(),
        teacherStudentLinkService.pending(),
      ])
      setStudents(s)
      setPending(p)
      setBulkSelected(new Set())
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const approveOne = async (linkId: string) => {
    try {
      await teacherStudentLinkService.approve(linkId)
      toast.success('Đã đồng ý — HS sẽ thấy bài tập của bạn')
      reload()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Lỗi')
    }
  }
  const rejectOne = async (linkId: string) => {
    if (!confirm('Từ chối yêu cầu này? HS sẽ phải chờ 30 ngày mới gửi lại được.')) return
    try {
      await teacherStudentLinkService.reject(linkId)
      toast.success('Đã từ chối')
      reload()
    } catch {
      toast.error('Lỗi')
    }
  }
  const cancelOutgoing = async (linkId: string) => {
    if (!confirm('Huỷ lời mời đã gửi?')) return
    try {
      await teacherStudentLinkService.disconnect(linkId)
      toast.success('Đã huỷ')
      reload()
    } catch {
      toast.error('Lỗi')
    }
  }
  const disconnectStudent = async (linkId: string, name: string) => {
    if (!confirm(`Gỡ kết nối với HS ${name}? Bài tập + điểm cũ vẫn được lưu, chỉ ngừng đồng bộ mới.`)) return
    try {
      await teacherStudentLinkService.disconnect(linkId)
      toast.success('Đã gỡ kết nối')
      reload()
    } catch {
      toast.error('Lỗi')
    }
  }

  const bulkApprove = async () => {
    if (bulkSelected.size === 0) return
    if (!confirm(`Đồng ý ${bulkSelected.size} yêu cầu cùng lúc?`)) return
    let ok = 0, fail = 0
    for (const id of bulkSelected) {
      try { await teacherStudentLinkService.approve(id); ok++ }
      catch { fail++ }
    }
    toast.success(`Đã duyệt ${ok}${fail ? `, lỗi ${fail}` : ''}`)
    reload()
  }
  const toggleBulk = (id: string) => {
    const next = new Set(bulkSelected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setBulkSelected(next)
  }
  const selectAllIncoming = () => {
    if (bulkSelected.size === pending.incoming.length) setBulkSelected(new Set())
    else setBulkSelected(new Set(pending.incoming.map(p => p.id)))
  }

  const totalPending = pending.incoming.length + pending.outgoing.length

  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] p-6 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Học sinh & yêu cầu kết nối</h1>
            <p className="text-sm text-white/50">
              Duyệt yêu cầu HS, mời HS mới, hoặc xem danh sách đã kết nối
            </p>
          </div>
          {pending.incoming.length > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-bold animate-pulse">
              🔔 {pending.incoming.length} yêu cầu mới
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-white/[0.08]">
          {([
            { key: 'requests' as const, label: 'Yêu cầu chờ duyệt', count: totalPending, highlight: pending.incoming.length },
            { key: 'students' as const, label: 'HS đã kết nối',     count: students.length, highlight: 0 },
            { key: 'invite'   as const, label: 'Mời HS mới',        count: null, highlight: 0 },
          ]).map(({ key, label, count, highlight }) => (
            <button
              key={key}
              onClick={() => {
                if (key === 'invite') setInviteOpen(true)
                else setTab(key)
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                tab === key && key !== 'invite'
                  ? 'border-emerald-500 text-emerald-300'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {key === 'invite' && <UserPlus className="w-4 h-4" />}
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${highlight > 0 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white/60'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          </div>
        ) : tab === 'requests' ? (
          totalPending === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <CheckCheck className="w-14 h-14 mx-auto text-emerald-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">Không có yêu cầu nào</h2>
              <p className="text-white/50 max-w-md mx-auto mb-6 text-sm">
                Khi HS gửi yêu cầu kết nối, sẽ hiện ở đây. HS được tự động kết nối nếu email đã có trong lớp bạn import trước đó.
              </p>
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
              >
                <UserPlus className="w-4 h-4" />Mời HS mới
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Incoming với bulk action */}
              {pending.incoming.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider">
                      📥 HS yêu cầu kết nối ({pending.incoming.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllIncoming}
                        className="text-xs text-white/50 hover:text-white/80 px-2 py-1"
                      >
                        {bulkSelected.size === pending.incoming.length ? 'Bỏ chọn' : 'Chọn tất cả'}
                      </button>
                      {bulkSelected.size > 0 && (
                        <button
                          onClick={bulkApprove}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          Duyệt {bulkSelected.size} HS
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {pending.incoming.map(p => (
                      <div key={p.id} className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={bulkSelected.has(p.id)}
                          onChange={() => toggleBulk(p.id)}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-300 font-bold">
                          {p.otherImage
                            ? <img src={p.otherImage} alt="" className="w-10 h-10 rounded-full object-cover" />
                            : (p.otherName || p.otherEmail || 'H')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{p.otherName || p.otherEmail}</p>
                          <p className="text-xs text-white/50 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3" />{p.otherEmail}
                          </p>
                          {p.message && (
                            <p className="text-xs text-white/70 mt-1 italic flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />"{p.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => approveOne(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />Duyệt
                          </button>
                          <button
                            onClick={() => rejectOne(p.id)}
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
                    📤 Bạn đã mời ({pending.outgoing.length})
                  </h3>
                  <div className="space-y-2">
                    {pending.outgoing.map(p => (
                      <div key={p.id} className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                          {(p.otherName || p.otherEmail || 'H')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{p.otherName || p.otherEmail}</p>
                          <p className="text-xs text-white/50">Đang chờ HS duyệt</p>
                        </div>
                        <button
                          onClick={() => cancelOutgoing(p.id)}
                          className="text-xs text-white/50 hover:text-red-400 px-3 py-1.5"
                        >Huỷ lời mời</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : (
          /* Students tab */
          students.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <Users className="w-14 h-14 mx-auto text-white/20 mb-4" />
              <h2 className="text-xl font-bold mb-2">Chưa có HS nào</h2>
              <p className="text-white/50 mb-6 text-sm">Mời HS mới hoặc đợi HS gửi yêu cầu</p>
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
              >
                <UserPlus className="w-4 h-4" />Mời HS mới
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map(s => (
                <div key={s.linkId} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold flex-shrink-0">
                      {s.image
                        ? <img src={s.image} alt={s.name || ''} className="w-12 h-12 rounded-full object-cover" />
                        : (s.name || s.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{s.name || '(chưa đặt tên)'}</h3>
                      <p className="text-xs text-white/50 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3" />{s.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/40 mb-3">
                    <Clock className="w-3 h-3" />
                    {s.initiatedBy === 'auto' && '🔗 Tự động (đã import lớp)'}
                    {s.initiatedBy === 'student' && 'HS đã yêu cầu'}
                    {s.initiatedBy === 'teacher' && 'Bạn đã mời'}
                    {' • '}
                    {s.approvedAt && new Date(s.approvedAt).toLocaleDateString('vi-VN')}
                  </div>
                  <button
                    onClick={() => disconnectStudent(s.linkId, s.name || s.email)}
                    className="w-full text-xs flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20"
                  >
                    <Trash2 className="w-3 h-3" />Gỡ kết nối
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* Invite student modal */}
        {inviteOpen && (
          <InviteStudentModal
            onClose={() => setInviteOpen(false)}
            onSent={() => { setInviteOpen(false); reload() }}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// InviteStudentModal — 2 chế độ:
//   1. Tìm HS theo email + gửi invite trực tiếp (HS phải có account)
//   2. Tạo QR code / share link cho HS đăng ký + GV approve (KHUYÊN DÙNG)
// ─────────────────────────────────────────────────────────────
type InviteMode = 'email' | 'qr'

function InviteStudentModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [mode, setMode] = useState<InviteMode>('qr')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked] = useState<SearchUser | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [directEmail, setDirectEmail] = useState('')

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const users = await teacherStudentLinkService.searchUsers(query.trim(), 'STUDENT')
        setResults(users)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const sendInvite = async (toEmail: string) => {
    setSending(true)
    try {
      await teacherStudentLinkService.invite({
        studentEmail: toEmail,
        message: message.trim() || undefined,
      })
      toast.success(`Đã gửi lời mời tới ${toEmail}`)
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
      <div className="relative bg-[hsl(260,30%,12%)] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Mời học sinh vào lớp
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Mode tabs */}
        <div className="px-5 pt-3 flex gap-2 flex-shrink-0">
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
              mode === 'qr'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR / Link share
          </button>
          <button
            onClick={() => setMode('email')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
              mode === 'email'
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            <Mail className="w-4 h-4" />
            Tìm theo email
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
        {mode === 'qr' ? (
          <QrInviteSection onClose={onClose} />
        ) : !picked ? (
          <div className="p-5 space-y-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tìm HS theo email/tên..."
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
            />
            {query.length < 2 ? (
              <div>
                <p className="text-xs text-white/40 text-center py-3">Hoặc gửi trực tiếp tới email HS:</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={directEmail}
                    onChange={e => setDirectEmail(e.target.value)}
                    placeholder="hs@example.com"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => directEmail.trim() && sendInvite(directEmail.trim())}
                    disabled={!directEmail.trim() || sending}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mời'}
                  </button>
                </div>
                <p className="text-[10px] text-white/30 mt-2">⚠️ HS phải đã đăng ký tài khoản với email này</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-white/40" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6">Không tìm thấy — thử dùng "Mời trực tiếp qua email" ở trên</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {results.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setPicked(u)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
                      {(u.name || u.email)[0].toUpperCase()}
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
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-300">
                {(picked.name || picked.email)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{picked.name}</p>
                <p className="text-xs text-white/50">{picked.email}</p>
              </div>
              <button onClick={() => setPicked(null)} className="text-xs text-white/40 hover:text-white">Đổi</button>
            </div>
            <div>
              <label className="text-xs text-white/60 block mb-1.5">Lời nhắn (tuỳ chọn)</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="VD: Em là HS lớp 12A1 môn Lý của thầy/cô, bấm đồng ý để nhận bài tập..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium border border-white/10"
              >Huỷ</button>
              <button
                onClick={() => sendInvite(picked.email)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                Gửi lời mời
              </button>
            </div>
          </div>
        )}
        </div>{/* end overflow-y-auto */}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// QrInviteSection — GV tạo link/QR mời HS đăng ký vào lớp
// HS quét QR → /join/:token → bấm "Yêu cầu vào lớp" → GV approve.
// ─────────────────────────────────────────────────────────────
interface InviteLinkRow {
  token: string
  label: string | null
  usedCount: number
  maxUses: number | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
  url: string
  isActive: boolean
}

function QrInviteSection({ onClose: _onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<InviteLinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>(30)
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const [selectedToken, setSelectedToken] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await teacherStudentLinkService.listInviteLinks()
      setLinks(r.links)
      // Auto-select first active link if none selected
      if (!selectedToken && r.links.find(l => l.isActive)) {
        setSelectedToken(r.links.find(l => l.isActive)!.token)
      }
    } catch {
      setLinks([])
    } finally {
      setLoading(false)
    }
  }, [selectedToken])

  useEffect(() => { load() }, [load])

  const createLink = async () => {
    setCreating(true)
    try {
      const r = await teacherStudentLinkService.createInviteLink({
        label: label.trim() || undefined,
        expiresInDays: typeof expiresInDays === 'number' ? expiresInDays : undefined,
        maxUses: typeof maxUses === 'number' ? maxUses : undefined,
      })
      toast.success('Đã tạo link mời mới')
      setLabel('')
      setSelectedToken(r.token)
      load()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không tạo được link')
    } finally {
      setCreating(false)
    }
  }

  const revokeLink = async (token: string) => {
    if (!confirm('Thu hồi link này? Các HS chưa join sẽ không vào được nữa.')) return
    try {
      await teacherStudentLinkService.revokeInviteLink(token)
      toast.success('Đã thu hồi')
      if (selectedToken === token) setSelectedToken(null)
      load()
    } catch {
      toast.error('Lỗi')
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Đã copy link — chia sẻ cho HS')
    } catch {
      toast.error('Không copy được')
    }
  }

  const downloadQr = (token: string, url: string) => {
    // Lấy SVG element của QR rồi convert sang PNG để download
    const svg = document.getElementById(`qr-svg-${token}`) as SVGSVGElement | null
    if (!svg) return
    const xml = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 600; canvas.height = 600
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, 600, 600)
      ctx.drawImage(img, 0, 0, 600, 600)
      canvas.toBlob(b => {
        if (!b) return
        const dlUrl = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = dlUrl
        a.download = `qr-invite-${token}.png`
        a.click()
        URL.revokeObjectURL(dlUrl)
      }, 'image/png')
      URL.revokeObjectURL(blobUrl)
    }
    img.src = blobUrl
  }

  const selected = selectedToken ? links.find(l => l.token === selectedToken) : null

  return (
    <div className="p-5 space-y-4">
      {/* Create form */}
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
          <UserPlus className="w-3.5 h-3.5" />
          Tạo link mời mới
        </div>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder='Nhãn (VD: "Lớp 12A1 môn Vật lý")'
          maxLength={200}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-white/50 uppercase font-bold mb-1 block flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Hết hạn (ngày)
            </label>
            <input
              type="number"
              value={expiresInDays}
              onChange={e => setExpiresInDays(e.target.value === '' ? '' : Math.max(1, Math.min(365, Number(e.target.value))))}
              placeholder="30"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/50 uppercase font-bold mb-1 block flex items-center gap-1">
              <Hash className="w-3 h-3" /> Giới hạn lượt
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value === '' ? '' : Math.max(1, Math.min(1000, Number(e.target.value))))}
              placeholder="(bỏ trống = ∞)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={createLink}
          disabled={creating}
          className="w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Tạo link + QR
        </button>
      </div>

      {/* Existing links */}
      {loading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-white/40" />
        </div>
      ) : links.length === 0 ? (
        <p className="text-xs text-white/50 text-center py-4 italic">
          Chưa có link nào — tạo link đầu tiên ở trên
        </p>
      ) : (
        <>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Link đã tạo ({links.length})
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {links.map(l => (
              <button
                key={l.token}
                onClick={() => setSelectedToken(l.token)}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition border ${
                  selectedToken === l.token
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/5'
                } ${!l.isActive ? 'opacity-50' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full ${l.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {l.label || `Link ${l.token}`}
                  </div>
                  <div className="text-[10px] text-white/40">
                    {l.usedCount}{l.maxUses ? `/${l.maxUses}` : ''} lượt
                    {l.expiresAt && ` · HH ${new Date(l.expiresAt).toLocaleDateString('vi-VN')}`}
                    {l.revokedAt && ' · (đã thu hồi)'}
                  </div>
                </div>
                {l.isActive && (
                  <button
                    onClick={e => { e.stopPropagation(); revokeLink(l.token) }}
                    title="Thu hồi link"
                    className="p-1 rounded text-white/40 hover:bg-rose-500/20 hover:text-rose-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* QR display cho link đang chọn */}
      {selected && selected.isActive && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              QR cho HS quét
            </span>
            <span className="text-[10px] text-white/50">
              {selected.usedCount}{selected.maxUses ? `/${selected.maxUses}` : ''} lượt dùng
            </span>
          </div>

          {/* QR code — white background để contrast cao khi HS quét */}
          <div className="flex justify-center bg-white p-4 rounded-lg">
            <QRCodeSVG
              id={`qr-svg-${selected.token}`}
              value={selected.url}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* URL row + copy */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={selected.url}
              readOnly
              onFocus={e => e.target.select()}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
            />
            <button
              onClick={() => copyUrl(selected.url)}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
              title="Copy link"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => downloadQr(selected.token, selected.url)}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
              title="Tải QR (PNG)"
            >
              <ArrowRight className="w-4 h-4 rotate-90" />
            </button>
          </div>

          <p className="text-[10px] text-white/50 leading-relaxed">
            📲 <strong className="text-white/70">HS quét QR</strong> hoặc <strong className="text-white/70">mở link</strong> →
            đăng nhập → bấm <strong className="text-emerald-300">"Yêu cầu vào lớp"</strong>.
            Bạn sẽ thấy yêu cầu ở tab <strong className="text-yellow-300">"Yêu cầu chờ duyệt"</strong> để xác thực.
          </p>
        </div>
      )}
    </div>
  )
}
