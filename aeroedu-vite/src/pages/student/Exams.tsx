import { useState, useEffect } from 'react'
import { Clock, Calendar, User, PlayCircle, CheckCircle, XCircle, Loader2, FileText, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { tokenStore } from '@/services/api'
import { QuickScanQr } from '@/components/common/QuickScanQr'

const D = {
  bg: '#0d0e17',
  card: '#10111e',
  card2: '#161728',
  border: 'rgba(255,255,255,0.07)',
  text: '#f1f5f9',
  muted: '#94a3b8',
  purple: '#7c3aed',
  purpleL: '#a78bfa',
}

interface ExamRoom {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  duration: number
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  totalQuestions?: number
  totalScore?: number
  examType?: string
  teacher?: { name: string }
  myParticipation?: {
    status: 'joined' | 'submitted' | 'absent'
    score?: number
    submittedAt?: string
  }
}

type TabType = 'upcoming' | 'active' | 'completed'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    scheduled:  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6', label: '📅 Sắp diễn ra' },
    active:     { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '🟢 Đang diễn ra' },
    completed:  { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8', label: '✅ Đã kết thúc' },
    cancelled:  { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '❌ Đã hủy' },
    joined:     { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa', label: '📝 Đã tham gia' },
    submitted:  { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: '✅ Đã nộp bài' },
    absent:     { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: '❌ Vắng mặt' },
  }
  const s = map[status] || { bg: 'rgba(148,163,184,0.1)', color: D.muted, label: status }
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function ExamCard({ exam, onJoin }: { exam: ExamRoom; onJoin: (id: string) => void }) {
  const now = new Date()
  const start = new Date(exam.startTime)
  const end = new Date(exam.endTime)
  const canJoin = exam.status === 'active' && (!exam.myParticipation || exam.myParticipation.status === 'joined')

  const formatDate = (d: Date) => d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div
      style={{
        background: D.card, border: `1px solid ${exam.status === 'active' ? 'rgba(16,185,129,0.3)' : D.border}`,
        borderRadius: 16, padding: '20px 24px', transition: 'all 0.2s',
        boxShadow: exam.status === 'active' ? '0 0 20px rgba(16,185,129,0.08)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = D.purple + '44' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = exam.status === 'active' ? 'rgba(16,185,129,0.3)' : D.border }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: D.text, marginBottom: 4 }}>{exam.title}</h3>
          {exam.description && <p style={{ margin: 0, fontSize: 13, color: D.muted, lineHeight: 1.5 }}>{exam.description}</p>}
        </div>
        <StatusBadge status={exam.myParticipation?.status || exam.status} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: D.muted }}>
          <Calendar style={{ width: 14, height: 14 }} /> {formatDate(start)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: D.muted }}>
          <Clock style={{ width: 14, height: 14 }} /> {exam.duration} phút
        </div>
        {exam.teacher && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: D.muted }}>
            <User style={{ width: 14, height: 14 }} /> {exam.teacher.name}
          </div>
        )}
        {exam.totalQuestions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: D.muted }}>
            <FileText style={{ width: 14, height: 14 }} /> {exam.totalQuestions} câu
          </div>
        )}
      </div>

      {/* Result if submitted */}
      {exam.myParticipation?.status === 'submitted' && exam.myParticipation.score != null && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trophy style={{ width: 16, height: 16, color: '#10b981' }} />
            <span style={{ fontSize: 14, color: D.text, fontWeight: 600 }}>
              Điểm: {exam.myParticipation.score}/{exam.totalScore ?? '?'}
            </span>
            {exam.totalScore && (
              <span style={{ fontSize: 12, color: D.muted }}>
                ({Math.round((exam.myParticipation.score / exam.totalScore) * 100)}%)
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {canJoin ? (
          <button
            onClick={() => onJoin(exam.id)}
            style={{ padding: '9px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 0 16px rgba(16,185,129,0.2)' }}
          >
            <PlayCircle style={{ width: 16, height: 16 }} /> Thi ngay
          </button>
        ) : exam.status === 'scheduled' ? (
          <div style={{ fontSize: 12, color: D.muted, fontStyle: 'italic' }}>
            Bắt đầu lúc {formatDate(start)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function Exams() {
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [rooms, setRooms] = useState<ExamRoom[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers: HeadersInit = tokenStore.getAccessToken() ? { Authorization: `Bearer ${tokenStore.getAccessToken()}` } : {}
    fetch('/api/online-exam-room', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.rooms ?? data.data ?? [])
        setRooms(list)
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false))
  }, [])

  const handleJoin = (id: string) => {
    navigate(`/student/exam/${id}`)
  }

  const now = new Date()
  const upcoming  = rooms.filter(r => r.status === 'scheduled' && new Date(r.startTime) > now)
  const active    = rooms.filter(r => r.status === 'active')
  const completed = rooms.filter(r => r.status === 'completed' || r.status === 'cancelled')

  const TABS: { id: TabType; label: string; count: number }[] = [
    { id: 'active',    label: 'Đang diễn ra', count: active.length },
    { id: 'upcoming',  label: 'Sắp tới',       count: upcoming.length },
    { id: 'completed', label: 'Đã kết thúc',   count: completed.length },
  ]

  const currentList = activeTab === 'active' ? active : activeTab === 'upcoming' ? upcoming : completed

  return (
    <div style={{ minHeight: '100%', background: D.bg }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: D.text, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText style={{ width: 26, height: 26, color: D.purpleL }} /> Phòng thi trực tuyến
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: D.muted }}>Tham gia bài kiểm tra do giáo viên tổ chức</p>
        </div>

        {/* QR truy cập nhanh — học sinh quét là vào thẳng phòng thi trên điện thoại */}
        <div style={{ marginBottom: 20 }}>
          <QuickScanQr
            accent="fuchsia"
            title="Quét QR để vào phòng thi trên điện thoại"
            description="Học sinh dùng camera điện thoại quét mã QR để vào trang phòng thi này ngay — không cần nhớ link, không cần đăng nhập lại. Giáo viên có thể tải PNG in dán lên bảng lớp."
            downloadName="exam-rooms-qr.png"
          />
        </div>

        {/* Active exam alert */}
        {active.length > 0 && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 14, color: '#6ee7b7', fontWeight: 600 }}>
              {active.length} bài thi đang diễn ra! Vào thi ngay để không bỏ lỡ.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: D.card, border: `1px solid ${D.border}`, borderRadius: 12, padding: 4, marginBottom: 20, width: 'fit-content' }}>
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
                <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', color: activeTab === tab.id ? '#fff' : D.purpleL, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 style={{ width: 32, height: 32, color: D.muted, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: D.muted }}>
            <FileText style={{ width: 48, height: 48, margin: '0 auto 16px', color: 'rgba(148,163,184,0.2)' }} />
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              {activeTab === 'active' ? 'Không có bài thi nào đang diễn ra' : activeTab === 'upcoming' ? 'Chưa có bài thi nào sắp tới' : 'Chưa có lịch sử thi'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)' }}>Giáo viên sẽ tạo phòng thi khi đến lịch</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {currentList.map(exam => (
              <ExamCard key={exam.id} exam={exam} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
