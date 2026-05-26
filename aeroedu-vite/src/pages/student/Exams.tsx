/**
 * Student "Phòng thi trực tuyến" — danh sách phòng + leaderboard inline
 *
 * Backend: GET /api/student/exam-rooms — trả:
 *   - rooms[]: public-and-open HOẶC student đã từng tham gia
 *   - Mỗi room kèm:
 *       leaderboard: top 10 ParticipantsByScore (có cờ isMe)
 *       myParticipant: { score, joinedAt, submittedAt }
 *       Teacher: { id, name }
 *       _count: { participants, questions }
 *
 * UI:
 *   - 3 tab: Đang diễn ra / Sắp tới / Đã kết thúc
 *   - Mỗi card mở rộng để xem full leaderboard (top 10)
 *   - "Vào thi" cho phòng active; chip điểm khi đã nộp
 *   - QR cho truy cập nhanh
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Clock, Calendar, User, PlayCircle, Loader2, FileText, Trophy,
  Medal, Crown, ChevronDown, ChevronUp, Users, RefreshCw, BookOpen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '@/services/api'
import { QuickScanQr } from '@/components/common/QuickScanQr'
import usePageTitle from '@/hooks/usePageTitle'
import { recommendationService as rs } from '@/services/recommendation.service'

// Theme-aware palette via CSS vars (auto light/dark switching)
const D = {
  bg:          'var(--td-bg)',
  card:        'var(--td-card)',
  card2:       'var(--td-card2)',
  border:      'var(--td-border)',
  border2:     'var(--td-border2)',
  text:        'var(--td-text)',
  muted:       'var(--td-muted)',
  purple:      'var(--td-purple)',
  cyan:        'var(--td-cyan)',
  green:       'var(--td-green)',
  amber:       'var(--td-amber)',
  red:         'var(--td-red)',
  blue:        'var(--td-blue)',
  white:   (a: number) => `rgba(var(--td-overlay-rgb), ${a})`,
  purpleA: (a: number) => `rgba(var(--td-purple-rgb), ${a})`,
} as const

// ── Types khớp với /api/student/exam-rooms response ───────────
interface LeaderboardEntry {
  userId: string
  name: string
  score: number | null
  rank: number
  submittedAt: string | null
  isMe: boolean
}

interface StudentExamRoom {
  id: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  startTime: string
  endTime: string
  duration: number
  isPublic: boolean
  maxStudents: number | null
  Teacher: { id: string; name: string } | null
  Exam: { id: string; title: string; examType: string } | null
  _count: { participants: number; questions: number }
  myParticipant: {
    score: number | null
    joinedAt: string | null
    submittedAt: string | null
    completed: boolean
  } | null
  leaderboard: LeaderboardEntry[]
}

type TabType = 'active' | 'upcoming' | 'completed'

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft:     { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: '📅 Sắp tới' },
    active:    { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '🟢 Đang mở' },
    completed: { bg: 'rgba(148,163,184,0.12)', color: 'var(--td-muted)', label: '✅ Kết thúc' },
    cancelled: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '❌ Huỷ' },
  }
  const s = map[status] || { bg: 'rgba(148,163,184,0.1)', color: D.muted, label: status }
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

// ── Rank medal icon (top 3) ────────────────────────────────────
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <Crown style={{ width: 14, height: 14, color: '#fbbf24' }} />
  if (rank === 2) return <Medal style={{ width: 14, height: 14, color: '#cbd5e1' }} />
  if (rank === 3) return <Medal style={{ width: 14, height: 14, color: '#fb923c' }} />
  return <span style={{ fontSize: 11, fontFamily: 'monospace', color: D.muted, fontWeight: 700 }}>
    #{rank}
  </span>
}

// ── Avatar circle với initials + màu hash ──────────────────────
function MiniAvatar({ name, highlight = false }: { name: string; highlight?: boolean }) {
  const initial = (name || '?').trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() || '?'
  // Hash name → màu HSL nhất quán
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      background: `linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue + 40) % 360},70%,45%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: '#fff',
      border: highlight ? '2px solid #fbbf24' : '1px solid rgba(0,0,0,0.4)',
      flexShrink: 0,
    }}>{initial}</div>
  )
}

// ── Inline leaderboard (compact view — top 3 + "+N khác") ─────
function LeaderboardCompact({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) return null
  const top3 = leaderboard.slice(0, 3)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Trophy style={{ width: 14, height: 14, color: '#fbbf24', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {top3.map((e, i) => (
          <div key={e.userId + i} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: e.isMe ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
            border: e.isMe ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '2px 6px 2px 3px',
          }}>
            <MiniAvatar name={e.name} highlight={e.isMe} />
            <span style={{ fontSize: 11, color: D.text, maxWidth: 60, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {e.isMe ? 'Bạn' : e.name.split(' ').slice(-1)[0]}
            </span>
            {e.score != null && (
              <span style={{ fontSize: 10, color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
                {e.score.toFixed(1)}
              </span>
            )}
          </div>
        ))}
      </div>
      {leaderboard.length > 3 && (
        <span style={{ fontSize: 11, color: D.muted }}>
          +{leaderboard.length - 3} khác
        </span>
      )}
    </div>
  )
}

// ── Full leaderboard (expanded view — top 10) ─────────────────
function LeaderboardFull({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 12px', fontSize: 12, color: D.muted }}>
        Chưa có ai làm bài. Hãy là người đầu tiên!
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {leaderboard.slice(0, 10).map((e) => (
        <div key={e.userId + e.rank} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: e.isMe ? 'rgba(251,191,36,0.08)' : 'transparent',
          border: e.isMe ? '1px solid rgba(251,191,36,0.3)' : '1px solid transparent',
          borderRadius: 8, padding: '6px 10px',
        }}>
          <div style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <RankMedal rank={e.rank} />
          </div>
          <MiniAvatar name={e.name} highlight={e.isMe} />
          <span style={{
            flex: 1, fontSize: 13, color: D.text, fontWeight: e.isMe ? 700 : 500,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {e.isMe ? `${e.name} (bạn)` : e.name}
          </span>
          {e.score != null ? (
            <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>
              {e.score.toFixed(2)}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: D.muted, fontStyle: 'italic' }}>chưa nộp</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Single room card ─────────────────────────────────────────
function ExamRoomCard({
  room, onJoin,
}: {
  room: StudentExamRoom
  onJoin: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isActive = room.status === 'active'
  const canJoin = isActive
  const myCompleted = room.myParticipant?.completed
  const myScore = room.myParticipant?.score

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })

  return (
    <div
      style={{
        background: D.card,
        border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : D.border}`,
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'all 0.2s',
        boxShadow: isActive ? '0 0 20px rgba(16,185,129,0.08)' : 'none',
      }}
    >
      {/* Main card content */}
      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 4 }}>
              {room.name}
            </h3>
            {room.description && (
              <p style={{ margin: 0, fontSize: 13, color: D.muted, lineHeight: 1.4 }}>
                {room.description}
              </p>
            )}
          </div>
          <StatusBadge status={room.status} />
        </div>

        {/* Meta info row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 12, fontSize: 12, color: D.muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar style={{ width: 12, height: 12 }} /> {formatDate(room.startTime)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock style={{ width: 12, height: 12 }} /> {room.duration}p
          </span>
          {room.Teacher && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <User style={{ width: 12, height: 12 }} /> GV: {room.Teacher.name}
            </span>
          )}
          {room._count.questions > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText style={{ width: 12, height: 12 }} /> {room._count.questions} câu
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users style={{ width: 12, height: 12 }} /> {room._count.participants}/{room.maxStudents ?? '∞'}
          </span>
        </div>

        {/* My result chip (if submitted) */}
        {myCompleted && myScore != null && (
          <div style={{
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Trophy style={{ width: 14, height: 14, color: '#10b981' }} />
            <span style={{ fontSize: 13, color: D.text, fontWeight: 600 }}>
              Điểm của bạn: {myScore.toFixed(2)}
            </span>
          </div>
        )}

        {/* Leaderboard compact (always visible if has data) */}
        {room.leaderboard.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <LeaderboardCompact leaderboard={room.leaderboard} />
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'transparent', border: '1px solid ' + D.border,
              color: D.muted, fontSize: 12, fontWeight: 500,
              padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = D.text; e.currentTarget.style.borderColor = D.purpleL }}
            onMouseLeave={e => { e.currentTarget.style.color = D.muted; e.currentTarget.style.borderColor = D.border }}
          >
            <Trophy style={{ width: 12, height: 12 }} />
            {expanded ? 'Ẩn bảng xếp hạng' : 'Xem bảng xếp hạng'}
            {expanded ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
          </button>
          {canJoin ? (
            <button
              onClick={() => onJoin(room.id)}
              style={{
                padding: '8px 18px', borderRadius: 10,
                background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 0 14px rgba(16,185,129,0.25)',
              }}
            >
              <PlayCircle style={{ width: 14, height: 14 }} />
              {myCompleted ? 'Xem lại' : 'Vào thi'}
            </button>
          ) : room.status === 'draft' ? (
            <span style={{ fontSize: 12, color: D.muted, fontStyle: 'italic' }}>
              Bắt đầu {formatDate(room.startTime)}
            </span>
          ) : myCompleted ? (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
              ✓ Đã hoàn thành
            </span>
          ) : null}
        </div>
      </div>

      {/* Expanded leaderboard */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${D.border}`,
          background: D.card2, padding: '12px 22px 16px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: D.muted,
            textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Trophy style={{ width: 12, height: 12, color: '#fbbf24' }} />
            Bảng xếp hạng — Top 10
          </div>
          <LeaderboardFull leaderboard={room.leaderboard} />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────
export default function StudentExamsPage() {
  usePageTitle('Phòng thi Live')
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('active')

  const { data, isLoading, refetch, dataUpdatedAt } = useQuery<{ rooms: StudentExamRoom[]; count: number }>({
    queryKey: ['student-exam-rooms'],
    queryFn: async () => {
      const r = await api.get<{ rooms: StudentExamRoom[]; count: number }>('/student/exam-rooms')
      return r.data || { rooms: [], count: 0 }
    },
    staleTime: 30_000,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    retry: false,
  })

  // Global leaderboard 30 ngày — top HS theo avg score PracticeExam
  interface GlobalLeader {
    rank: number
    userId: string
    name: string
    avatar: string | null
    avgScore: number
    bestScore: number
    examCount: number
    isMe: boolean
  }
  const { data: lbData } = useQuery<{ leaderboard: GlobalLeader[]; myEntry: GlobalLeader | null }>({
    queryKey: ['exam-rooms-global-leaderboard'],
    queryFn: async () => {
      const r = await api.get('/student/exam-rooms/leaderboard?days=30')
      return r.data || { leaderboard: [], myEntry: null }
    },
    staleTime: 5 * 60_000,
    retry: false,
  })

  const rooms = data?.rooms ?? []
  const now = new Date()
  const active    = rooms.filter(r => r.status === 'active')
  const upcoming  = rooms.filter(r => r.status === 'draft' && new Date(r.startTime) > now)
  const completed = rooms.filter(r => r.status === 'completed' || r.status === 'cancelled')

  const TABS: { id: TabType; label: string; count: number }[] = [
    { id: 'active',    label: 'Đang mở',     count: active.length },
    { id: 'upcoming',  label: 'Sắp tới',     count: upcoming.length },
    { id: 'completed', label: 'Đã kết thúc', count: completed.length },
  ]

  const currentList =
    activeTab === 'active'   ? active   :
    activeTab === 'upcoming' ? upcoming : completed

  const handleJoin = useCallback(async (roomId: string) => {
    try {
      const { data } = await api.post('/online-exam-room/join', { roomId })
      const res = data.data ?? data
      const id = res.room?.id || res.roomId || roomId
      // RS: track join signal (mạnh hơn click — user thực sự commit làm bài)
      rs.track({
        action: 'click',
        targetType: 'exam_room',
        targetId: roomId,
        metadata: { alreadyJoined: !!res.alreadyJoined },
      })
      toast.success(res.alreadyJoined ? 'Tiếp tục bài thi' : 'Đã vào phòng thi!')
      navigate(`/student/exam/${id}`)
    } catch (e: any) {
      toast.error(e.response?.data?.error || e.message || 'Không thể vào phòng')
    }
  }, [navigate])

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetch])

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: D.text, display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileText style={{ width: 26, height: 26, color: D.purpleL }} />
              Phòng thi trực tuyến
              <span
                title="Trang tự cập nhật mỗi 45 giây — không cần bấm làm mới"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(16,185,129,0.15)', color: '#34d399',
                  border: '1px solid rgba(16,185,129,0.35)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#34d399', animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                Live
              </span>
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: D.muted }}>
              Tham gia bài kiểm tra do GV tổ chức · xem bảng xếp hạng từng phòng
              {dataUpdatedAt > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>
                  · Cập nhật {Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000))}s trước
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            style={{
              padding: '8px 14px', borderRadius: 10,
              background: D.card2, border: `1px solid ${D.border}`,
              color: D.muted, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
              cursor: isLoading ? 'wait' : 'pointer', opacity: isLoading ? 0.5 : 1,
            }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: isLoading ? 'spin 1s linear infinite' : '' }} />
            Làm mới
          </button>
        </div>

        {/* QR truy cập nhanh */}
        <div style={{ marginBottom: 20 }}>
          <QuickScanQr
            accent="fuchsia"
            title="Quét QR để vào phòng thi trên điện thoại"
            description="Học sinh dùng camera điện thoại quét mã QR để vào trang phòng thi này ngay — không cần nhớ link, không cần đăng nhập lại. GV có thể tải PNG in dán lên bảng lớp."
            downloadName="exam-rooms-qr.png"
          />
        </div>

        {/* Active exam alert */}
        {active.length > 0 && (
          <div style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 14, padding: '14px 20px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 14, color: '#6ee7b7', fontWeight: 600 }}>
              {active.length} phòng thi đang mở — vào ngay để không bỏ lỡ!
            </span>
          </div>
        )}

        {/* ── Global leaderboard banner (TOP 10 HS 30 ngày qua PracticeExam) ── */}
        {(lbData?.leaderboard?.length ?? 0) > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,101,101,0.05) 100%)',
            border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 14, padding: 16, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy style={{ width: 16, height: 16, color: '#fbbf24' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: D.text }}>
                  Top HS Phòng Thi · 30 ngày qua
                </span>
              </div>
              {lbData?.myEntry && !lbData.leaderboard.some(e => e.isMe) && (
                <div style={{
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.4)',
                  fontSize: 11, fontWeight: 700, color: '#fbbf24',
                }}>
                  Bạn xếp #{lbData.myEntry.rank} · {lbData.myEntry.avgScore.toFixed(1)}đ
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {(lbData?.leaderboard ?? []).slice(0, 10).map(e => (
                <div key={e.userId} style={{
                  flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 10, minWidth: 140,
                  background: e.isMe ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                  border: e.isMe ? '1px solid rgba(251,191,36,0.5)' : '1px solid rgba(255,255,255,0.08)',
                }}>
                  <RankMedal rank={e.rank} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: D.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {e.isMe ? '⭐ Bạn' : e.name}
                    </div>
                    <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>
                      {e.avgScore.toFixed(1)}đ TB · {e.examCount} bài
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4, background: D.card,
          border: `1px solid ${D.border}`, borderRadius: 12, padding: 4,
          marginBottom: 20, width: 'fit-content',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 9, border: 'none',
                background: activeTab === tab.id ? 'linear-gradient(135deg,#7c3aed,#9333ea)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : D.muted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)',
                  color: activeTab === tab.id ? '#fff' : D.purpleL,
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 style={{ width: 32, height: 32, color: D.muted, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: D.muted }}>
            <FileText style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'rgba(148,163,184,0.2)' }} />
            <div style={{ fontSize: 16, marginBottom: 8, color: D.text }}>
              {activeTab === 'active' ? 'Không có phòng thi nào đang mở'
               : activeTab === 'upcoming' ? 'Chưa có phòng thi nào sắp tới'
               : 'Chưa có lịch sử thi'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', marginBottom: 24 }}>
              {activeTab === 'finished'
                ? 'Sau khi tham gia phòng thi, kết quả sẽ hiện ở đây.'
                : 'Giáo viên sẽ tạo phòng thi khi đến lịch — quay lại sau.'}
            </div>

            {/* Actionable CTAs */}
            <div style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'wrap',
              maxWidth: 480,
              margin: '0 auto',
            }}>
              <button
                onClick={() => navigate('/student/teachers')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${D.indigo}40`,
                  background: `${D.indigo}15`,
                  color: D.indigo,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${D.indigo}25`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${D.indigo}15`)}
              >
                <Users style={{ width: 14, height: 14 }} />
                Giáo viên của tôi
              </button>
              <button
                onClick={() => navigate('/student/exam-prep')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${D.cyan}40`,
                  background: `${D.cyan}15`,
                  color: D.cyan,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${D.cyan}25`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${D.cyan}15`)}
              >
                <BookOpen style={{ width: 14, height: 14 }} />
                Tự ôn thi
              </button>
              <button
                onClick={() => refetch()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${D.border}`,
                  background: 'transparent',
                  color: D.muted,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = D.text)}
                onMouseLeave={e => (e.currentTarget.style.color = D.muted)}
              >
                <RefreshCw style={{ width: 13, height: 13 }} />
                Tải lại
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {currentList.map(room => (
              <ExamRoomCard key={room.id} room={room} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
