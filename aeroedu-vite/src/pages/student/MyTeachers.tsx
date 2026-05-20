/**
 * /student/teachers — HS quản lý kết nối + khám phá giáo viên
 *
 * 4 tab:
 *   - Khám phá GV   — danh sách TẤT CẢ GV trên hệ thống + CPD profile
 *   - Đã kết nối    — approved teachers
 *   - Đang chờ      — outgoing requests + incoming invites
 *   - Tìm GV mới    — modal search-and-connect
 *
 * CPD summary được lấy từ /api/teachers/all (server aggregate từ TeacherCPD table).
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  GraduationCap, Search, UserPlus, Check, X, Clock, Mail,
  Loader2, AlertCircle, ArrowRight, Trash2, MessageSquare,
  Brain, Star, Award, ChevronRight, Users, MapPin, Navigation,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { api } from '@/services/api'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  teacherStudentLinkService,
  type LinkedUser,
  type TeacherStudentLink,
  type SearchUser,
} from '@/services/teacherStudentLink.service'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CpdMilestone {
  emoji: string
  label: string
}

interface TeacherCpdSummary {
  avgScore: number
  skillCount: number
  expertCount: number
  proficientCount: number
  milestone: CpdMilestone | null
  updatedAt: string | null
}

interface TeacherProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  bio: string | null
  phone: string | null
  website: string | null
  joinedAt: string | null
  lat: number | null
  lon: number | null
  province: string | null
  isConnected: boolean
  cpd: TeacherCpdSummary
}

type Tab = 'explore' | 'connected' | 'pending' | 'find'

// ── Component ─────────────────────────────────────────────────────────────────

export default function MyTeachers() {
  const [tab, setTab]         = useState<Tab>('explore')
  const [teachers, setTeachers]   = useState<LinkedUser[]>([])
  const [pending, setPending]     = useState<{ incoming: TeacherStudentLink[]; outgoing: TeacherStudentLink[] }>({ incoming: [], outgoing: [] })
  const [allTeachers, setAllTeachers] = useState<TeacherProfile[]>([])
  const [loading, setLoading]     = useState(true)
  const [exploreLoading, setExploreLoading] = useState(true)
  const [findOpen, setFindOpen]   = useState(false)
  const [searchQ, setSearchQ]     = useState('')

  // Load connected + pending
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

  // Load all teachers for explore
  const loadAllTeachers = useCallback(async () => {
    setExploreLoading(true)
    try {
      const res = await api.get('/teachers/all')
      setAllTeachers(res.data?.teachers || [])
    } catch {
      setAllTeachers([])
    } finally {
      setExploreLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { loadAllTeachers() }, [loadAllTeachers])

  const acceptInvite = async (linkId: string) => {
    try {
      await teacherStudentLinkService.approve(linkId)
      toast.success('Đã đồng ý kết nối — bài tập sẽ được đồng bộ')
      reload()
      loadAllTeachers()
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
      loadAllTeachers()
    } catch {
      toast.error('Không gỡ được')
    }
  }

  // Request kết nối từ trang Khám phá
  const requestConnect = async (teacher: TeacherProfile) => {
    try {
      await teacherStudentLinkService.request({ teacherId: teacher.id })
      toast.success(`Đã gửi yêu cầu tới ${teacher.name || teacher.email}`)
      reload()
      loadAllTeachers()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      toast.error(e.response?.data?.error || 'Không gửi được yêu cầu')
    }
  }

  const totalPending = pending.incoming.length + pending.outgoing.length

  // Filter explore
  const filteredTeachers = allTeachers.filter(t => {
    if (!searchQ.trim()) return true
    const q = searchQ.toLowerCase()
    return (t.name || '').toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || (t.bio || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-background p-6 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Giáo viên</h1>
            <p className="text-sm text-white/50">
              Khám phá đội ngũ GV trên hệ thống · kết nối để đồng bộ bài tập & điểm số
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 border-b border-white/[0.08]">
          {([
            { key: 'explore'   as const, label: 'Khám phá GV',  count: allTeachers.length, icon: <Users className="w-4 h-4" /> },
            { key: 'connected' as const, label: 'Đã kết nối',   count: teachers.length,    icon: null },
            { key: 'pending'   as const, label: 'Đang chờ',     count: totalPending,       icon: null },
            { key: 'find'      as const, label: 'Tìm GV mới',   count: null,               icon: <UserPlus className="w-4 h-4" /> },
          ]).map(({ key, label, count, icon }) => (
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
              {icon}
              {label}
              {count !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  count > 0 && key === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                  count > 0 && key === 'explore' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-white/10 text-white/60'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab: Khám phá GV ── */}
        {tab === 'explore' && (
          <div>
            {/* Search bar */}
            <div className="mb-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Tìm GV theo tên, email hoặc chuyên môn..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/60"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {exploreLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                <GraduationCap className="w-14 h-14 mx-auto mb-3 opacity-30" />
                {searchQ ? 'Không tìm thấy GV phù hợp' : 'Chưa có giáo viên nào đăng ký'}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map(t => (
                  <TeacherCard
                    key={t.id}
                    teacher={t}
                    onConnect={() => requestConnect(t)}
                  />
                ))}
              </div>
            )}

            {/* ── Bản đồ GV gần địa phương ── */}
            <TeacherMap teachers={allTeachers} />
          </div>
        )}

        {/* ── Tab: Đã kết nối ── */}
        {tab === 'connected' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : teachers.length === 0 ? (
            <EmptyConnected onFind={() => setFindOpen(true)} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map(t => {
                // Tìm CPD data cho GV đã kết nối
                const profile = allTeachers.find(p => p.id === t.id)
                return (
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
                    {/* CPD mini badge nếu có */}
                    {profile?.cpd?.milestone && (
                      <div className="mb-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                        <span className="text-base">{profile.cpd.milestone.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-purple-300 truncate">{profile.cpd.milestone.label}</p>
                          {profile.cpd.avgScore > 0 && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex-1 h-1 rounded-full bg-white/10">
                                <div className="h-1 rounded-full bg-purple-500" style={{ width: `${profile.cpd.avgScore}%` }} />
                              </div>
                              <span className="text-[10px] text-white/40">{profile.cpd.avgScore}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
                )
              })}
            </div>
          )
        )}

        {/* ── Tab: Đang chờ ── */}
        {tab === 'pending' && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : (
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
          )
        )}

        {/* Find teacher modal */}
        {findOpen && (
          <FindTeacherModal
            onClose={() => setFindOpen(false)}
            onSent={() => { setFindOpen(false); reload(); loadAllTeachers() }}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TeacherCard — hiển thị GV với đầy đủ thông tin + CPD
// ─────────────────────────────────────────────────────────────

function TeacherCard({ teacher, onConnect }: { teacher: TeacherProfile; onConnect: () => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [requesting, setRequesting] = useState(false)
  const cpd = teacher.cpd

  const handleConnect = async () => {
    setRequesting(true)
    try {
      await onConnect()
    } finally {
      setRequesting(false)
    }
  }

  // Màu progress bar theo score
  const scoreColor = (s: number) =>
    s >= 100 ? 'bg-green-500' :
    s >= 75  ? 'bg-blue-500'  :
    s >= 50  ? 'bg-amber-500' :
    s >= 25  ? 'bg-red-500'   :
    'bg-gray-600'

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden transition-all hover:border-white/[0.14]">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-white font-bold text-lg border-2 border-white/10 overflow-hidden">
              {teacher.image
                ? <img src={teacher.image} alt={teacher.name || ''} className="w-full h-full object-cover" />
                : (teacher.name || teacher.email)[0].toUpperCase()}
            </div>
            {/* Connected badge */}
            {teacher.isConnected && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0a0f1e] flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{teacher.name || '(chưa đặt tên)'}</h3>
            <p className="text-xs text-white/50 truncate flex items-center gap-1">
              <Mail className="w-3 h-3 flex-shrink-0" />{teacher.email}
            </p>
            {/* Milestone badge */}
            {cpd.milestone && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[11px] font-semibold">
                <span>{cpd.milestone.emoji}</span>
                <span>{cpd.milestone.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {teacher.bio && (
          <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">{teacher.bio}</p>
        )}

        {/* CPD progress summary */}
        {cpd.skillCount > 0 ? (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>Cây tri thức nghề nghiệp</span>
              </div>
              <span className="text-xs font-bold text-white/70">{cpd.avgScore}%</span>
            </div>
            {/* Overall progress bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${scoreColor(cpd.avgScore)}`}
                style={{ width: `${cpd.avgScore}%` }}
              />
            </div>
            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-white/40">
              {cpd.expertCount > 0 && (
                <span className="flex items-center gap-1 text-green-400">
                  <Star className="w-3 h-3" />{cpd.expertCount} chuyên gia
                </span>
              )}
              {cpd.proficientCount > cpd.expertCount && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Award className="w-3 h-3" />{cpd.proficientCount - cpd.expertCount} thành thạo
                </span>
              )}
              <span>{cpd.skillCount} kỹ năng</span>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-2 text-xs text-white/30 py-1">
            <Brain className="w-3.5 h-3.5" />
            <span>Chưa có dữ liệu CPD</span>
          </div>
        )}

        {/* Connect / Connected button */}
        {teacher.isConnected ? (
          <div className="w-full text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold">
            <Check className="w-3.5 h-3.5" />Đã kết nối
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={requesting}
            className="w-full text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {requesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Gửi yêu cầu kết nối
          </button>
        )}
      </div>

      {/* Expandable CPD detail */}
      {cpd.skillCount > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-5 py-2 flex items-center justify-between text-xs text-white/40 hover:text-white/70 bg-white/[0.02] border-t border-white/[0.06] transition-colors"
          >
            <span>Xem chi tiết kỹ năng</span>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          {expanded && cpd.skillCount > 0 && (
            <div className="px-5 pb-4 space-y-3 bg-white/[0.01] border-t border-white/[0.04]">
              <CpdDetailPanel avgScore={cpd.avgScore} milestone={cpd.milestone} updatedAt={cpd.updatedAt} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── CPD Detail Panel (expanded view) ─────────────────────────────────────────

function CpdDetailPanel({
  avgScore,
  milestone,
  updatedAt,
}: {
  avgScore: number
  milestone: CpdMilestone | null
  updatedAt: string | null
}) {
  const MILESTONES = [
    { minScore: 95, emoji: '🌟', label: 'Chuyên gia Quốc gia' },
    { minScore: 88, emoji: '🏆', label: 'Hiệu trưởng' },
    { minScore: 80, emoji: '🎖️', label: 'Phó Hiệu trưởng' },
    { minScore: 75, emoji: '🏅', label: 'Tổ trưởng bộ môn' },
    { minScore: 65, emoji: '⭐', label: 'Giáo viên cốt cán' },
    { minScore: 50, emoji: '📚', label: 'GV có kinh nghiệm' },
    { minScore: 30, emoji: '🌱', label: 'Giáo viên trẻ' },
  ]

  return (
    <div className="pt-3">
      {/* Milestone roadmap mini */}
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2 font-semibold">Lộ trình sự nghiệp</p>
      <div className="space-y-1.5">
        {MILESTONES.slice().reverse().map(m => {
          const achieved = avgScore >= m.minScore
          const isCurrent = milestone?.label === m.label
          return (
            <div
              key={m.label}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                isCurrent
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200 font-semibold'
                  : achieved
                  ? 'bg-white/5 text-white/60'
                  : 'text-white/25'
              }`}
            >
              <span className={`text-sm ${!achieved ? 'grayscale opacity-40' : ''}`}>{m.emoji}</span>
              <span className="flex-1">{m.label}</span>
              <span className="text-[10px] text-white/40">{m.minScore}%</span>
              {achieved && <Check className="w-3 h-3 text-emerald-400" />}
            </div>
          )
        })}
      </div>
      {updatedAt && (
        <p className="text-[10px] text-white/25 mt-2">
          Cập nhật: {new Date(updatedAt).toLocaleDateString('vi-VN')}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// EmptyConnected
// ─────────────────────────────────────────────────────────────
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
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [picked, setPicked]   = useState<SearchUser | null>(null)
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
      <div className="relative bg-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
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
// TeacherMap — OpenFreeMap map với GPS request + teacher markers
// ─────────────────────────────────────────────────────────────

const VN_CENTER: [number, number] = [106.0, 16.0]
const VN_ZOOM = 5.5
const BASEMAP = 'https://tiles.openfreemap.org/styles/liberty'

function TeacherMap({ teachers }: { teachers: TeacherProfile[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const markersRef   = useRef<maplibregl.Marker[]>([])
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [gpsStatus, setGpsStatus]   = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')
  const [collapsed, setCollapsed]   = useState(false)
  const [nearbyCount, setNearbyCount] = useState(0)

  const teachersWithLocation = teachers.filter(t => t.lat !== null && t.lon !== null)

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP,
      center: VN_CENTER,
      zoom: VN_ZOOM,
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    mapRef.current = map
    return () => {
      markersRef.current.forEach(m => m.remove())
      if (userMarkerRef.current) userMarkerRef.current.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Add teacher markers when map ready
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    teachersWithLocation.forEach(t => {
      const el = document.createElement('div')
      el.style.cssText = `
        width:28px;height:28px;border-radius:50%;
        background:${t.isConnected ? '#10b981' : '#7c3aed'};
        border:2px solid ${t.isConnected ? '#34d399' : '#a78bfa'};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:11px;font-weight:700;cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
      `
      el.title = `${t.name || t.email}${t.province ? ' · ' + t.province : ''}`
      el.textContent = (t.name || t.email)[0].toUpperCase()

      const popup = new maplibregl.Popup({ offset: 16, closeButton: false, maxWidth: '220px' })
        .setHTML(`
          <div style="font-family:system-ui;padding:8px;min-width:160px">
            <div style="font-weight:700;font-size:13px;margin-bottom:2px">${t.name || '(chưa đặt tên)'}</div>
            <div style="font-size:11px;color:#888;margin-bottom:4px">${t.email}</div>
            ${t.province ? `<div style="font-size:11px;color:#7c3aed">📍 ${t.province}</div>` : ''}
            ${t.cpd.milestone ? `<div style="font-size:11px;margin-top:4px">${t.cpd.milestone.emoji} ${t.cpd.milestone.label}</div>` : ''}
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([t.lon!, t.lat!])
        .setPopup(popup)
        .addTo(map)
      markersRef.current.push(marker)
    })
  }, [teachersWithLocation])

  // Request GPS
  const requestGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ GPS')
      setGpsStatus('denied')
      return
    }
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        setGpsStatus('granted')
        const map = mapRef.current
        if (map) {
          // Fly to user location
          map.flyTo({ center: [lon, lat], zoom: 9, duration: 1200 })
          // User marker
          if (userMarkerRef.current) userMarkerRef.current.remove()
          const el = document.createElement('div')
          el.style.cssText = `
            width:18px;height:18px;border-radius:50%;
            background:#3b82f6;border:3px solid #fff;
            box-shadow:0 0 0 4px rgba(59,130,246,0.3);
          `
          userMarkerRef.current = new maplibregl.Marker({ element: el })
            .setLngLat([lon, lat])
            .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false })
              .setHTML('<div style="font-family:system-ui;padding:6px;font-size:12px;font-weight:600">📍 Vị trí của bạn</div>'))
            .addTo(map)
          // Count nearby teachers (within ~100km ≈ 0.9 degrees)
          const nearby = teachersWithLocation.filter(t => {
            const dlat = (t.lat! - lat) * 111
            const dlon = (t.lon! - lon) * 111 * Math.cos(lat * Math.PI / 180)
            return Math.sqrt(dlat * dlat + dlon * dlon) <= 100
          })
          setNearbyCount(nearby.length)
          if (nearby.length > 0) {
            toast.success(`Tìm thấy ${nearby.length} GV trong bán kính 100km`)
          } else {
            toast(`Không có GV nào gần vị trí bạn (bán kính 100km)\nGV có thể cập nhật vị trí trong phần Cây tri thức nghề nghiệp`, { icon: '📍' })
          }
        }
      },
      (err) => {
        setGpsStatus('denied')
        if (err.code === 1) toast.error('Bạn đã từ chối cấp quyền GPS')
        else toast.error('Không lấy được vị trí GPS')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  return (
    <div className="mt-8 rounded-2xl border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-white">Bản đồ GV theo khu vực</span>
          {teachersWithLocation.length > 0 && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">
              {teachersWithLocation.length} GV có vị trí
            </span>
          )}
          {gpsStatus === 'granted' && nearbyCount > 0 && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full">
              {nearbyCount} GV gần bạn
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {gpsStatus === 'idle' && (
            <button
              onClick={requestGPS}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Dùng GPS
            </button>
          )}
          {gpsStatus === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-blue-300">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Đang xác định...
            </span>
          )}
          {gpsStatus === 'granted' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-300">
              <Check className="w-3.5 h-3.5" />GPS đang dùng
            </span>
          )}
          {gpsStatus === 'denied' && (
            <span className="text-xs text-red-400">GPS bị từ chối</span>
          )}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`} />
          </button>
        </div>
      </div>

      {/* Map */}
      {!collapsed && (
        <div className="relative" style={{ height: 420 }}>
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          {/* Overlay hint */}
          {teachersWithLocation.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-xl px-6 py-4 text-center max-w-sm">
                <GraduationCap className="w-8 h-8 text-white/40 mx-auto mb-2" />
                <p className="text-sm text-white/70 font-medium">Chưa có GV nào chia sẻ vị trí</p>
                <p className="text-xs text-white/40 mt-1">GV có thể cập nhật vị trí trong Cây tri thức nghề nghiệp</p>
              </div>
            </div>
          )}
          {/* Legend */}
          <div className="absolute bottom-8 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white/70 space-y-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600 border border-purple-400 flex-shrink-0" />
              GV chưa kết nối
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400 flex-shrink-0" />
              GV đã kết nối
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 border border-white flex-shrink-0" />
              Vị trí của bạn
            </div>
          </div>
        </div>
      )}
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
