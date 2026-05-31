/**
 * ExamModes — Trang chọn chế độ học cho 1 đề thi (Wayground style)
 *
 * Route: /exam/:examId/modes
 *
 * 5 chế độ visual cards:
 *   1. ▶ Classic       — Solo / single player tốc độ riêng + leaderboard
 *   2. ⛰ Mastery Peak  — Leo núi, mỗi câu đúng tiến 1 bước (mới)
 *   3. 🎮 Playground    — Mini-game (Coming soon)
 *   4. 📝 Test mode    — Phiếu trả lời chuẩn Bộ GD&ĐT, strict timer
 *   5. 👥 Team mode    — Chia sẻ QR/link mời bạn bè cùng làm
 *
 * Bonus: 📚 Flashcards — flip cards (link nhỏ ở dưới)
 *
 * Settings panel: shuffle / read aloud / timer / power-ups
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play, Users, BookOpen, Volume2, Clock, Sparkles, ArrowLeft, X, Copy, Check,
  FileText, Shuffle, Layers, Mountain, Gamepad2, ClipboardCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

interface Exam {
  id: string
  title: string
  subject?: string
  grade?: string
  totalQuestions: number
  duration: number
  userId: string
}

const PREFS_KEY = 'exam-prefs-v1'
type Prefs = {
  readAloud: boolean; timer: boolean; powerups: boolean
  shuffleOrder: boolean; shuffleOptions: boolean
}
const defaultPrefs: Prefs = {
  readAloud: false, timer: true, powerups: true,
  shuffleOrder: false, shuffleOptions: false,
}

export default function ExamModesPage() {
  const { examId } = useParams<{ examId: string }>()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShare, setShowShare] = useState(false)
  const [copied, setCopied] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') } }
    catch { return defaultPrefs }
  })

  useEffect(() => {
    if (!examId) return
    axios.get<{ exam: Exam }>(`/api/exams/${examId}`)
      .then(r => setExam(r.data.exam))
      .catch(() => toast.error('Không tải được đề thi'))
      .finally(() => setLoading(false))
  }, [examId])

  const toggle = (k: keyof Prefs) => {
    const next = { ...prefs, [k]: !prefs[k] }
    setPrefs(next)
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  }

  const shareUrl = `${window.location.origin}/exam/${examId}/solo`
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
    toast.success('Đã copy link')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!exam) return <div className="min-h-screen flex items-center justify-center text-slate-600">Không tìm thấy đề</div>

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-200 bg-white sticky top-0 z-20">
        <button onClick={() => navigate(-1)}
          title="Quay lại trang trước"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <h1 className="flex-1 text-slate-800 font-bold text-base truncate">Chọn chế độ làm bài</h1>
        {/* Nút Thoát rõ ràng — luôn về trang DS đề (an toàn kể cả khi mở từ deep-link / QR / thông báo) */}
        <button onClick={() => navigate('/student/exams')}
          title="Thoát về danh sách đề thi"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold transition">
          <X className="w-4 h-4" /> Thoát
        </button>
      </div>

      {/* Exam header strip */}
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-md">
          Q
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base truncate">{exam.title}</p>
          <p className="text-slate-500 text-xs">
            {exam.totalQuestions} câu · {exam.subject || 'Vật lí'} · Lớp {exam.grade || '11'} · {exam.duration} phút
          </p>
        </div>
        <button onClick={copyLink}
          className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Đã copy' : 'Chia sẻ'}
        </button>
      </div>

      {/* Mode cards — Wayground style */}
      <div className="max-w-6xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Card 1: Classic */}
          <ModeCard
            title="Classic"
            description="Làm bài theo tốc độ riêng + bảng xếp hạng trực tiếp"
            bg="linear-gradient(135deg, #6b1846 0%, #4a0f2e 100%)"
            illustration={<ClassicIllustration />}
            onClick={() => navigate(`/exam/${examId}/solo`)}
            tall
          />

          {/* Card 2: Mastery Peak */}
          <ModeCard
            title="Mastery Peak"
            titleColor="text-teal-900"
            description="Leo núi — mỗi câu đúng tiến gần đỉnh hơn"
            bg="linear-gradient(180deg, #a7f3d0 0%, #10b981 100%)"
            illustration={<MountainIllustration />}
            onClick={() => navigate(`/exam/${examId}/mastery`)}
            badge="Mới"
            tall
          />

          {/* Card 3: Playground */}
          <ModeCard
            title="Playground"
            description="Mini-game arcade với câu hỏi"
            bg="linear-gradient(135deg, #fb923c 0%, #f97316 100%)"
            illustration={<PlaygroundIllustration />}
            onClick={() => toast('🎮 Chế độ Playground sắp ra mắt — đang phát triển', { duration: 2500 })}
            badge="Sắp ra mắt"
            disabled
            tall
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card 4: Test mode */}
          <ModeCard
            title="Test mode"
            description="Phiếu trả lời chuẩn Bộ GD&ĐT — tô bubble, không leaderboard"
            bg="linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)"
            illustration={<TestIllustration />}
            onClick={() => navigate(`/exam-sheet/${examId}`)}
          />

          {/* Card 5: Team mode */}
          <ModeCard
            title="Team mode"
            description="Mời bạn bè cùng thi — đội nào điểm cao thắng"
            bg="linear-gradient(135deg, #9f1239 0%, #be123c 100%)"
            illustration={<TeamIllustration />}
            onClick={() => setShowShare(true)}
          />
        </div>

        {/* Bonus: Flashcards link */}
        <button onClick={() => navigate(`/exam/${examId}/flashcards`)}
          className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50
            text-slate-700 font-medium text-sm flex items-center justify-center gap-2 transition mb-6">
          <BookOpen className="w-4 h-4 text-purple-500" />
          📚 Học bằng Flashcards (lật thẻ)
        </button>

        {/* Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-2">Tuỳ chỉnh</p>
          <SettingRow icon={<Shuffle className="w-4 h-4" />} label="Xáo trộn câu hỏi"
            hint="Đổi thứ tự câu mỗi lần làm"
            on={prefs.shuffleOrder} onToggle={() => toggle('shuffleOrder')} />
          <SettingRow icon={<Layers className="w-4 h-4" />} label="Xáo trộn đáp án"
            hint="Đổi vị trí A/B/C/D"
            on={prefs.shuffleOptions} onToggle={() => toggle('shuffleOptions')} />
          <SettingRow icon={<Volume2 className="w-4 h-4" />} label="Đọc to câu hỏi"
            on={prefs.readAloud} onToggle={() => toggle('readAloud')} />
          <SettingRow icon={<Clock className="w-4 h-4" />} label="Đếm ngược thời gian"
            on={prefs.timer} onToggle={() => toggle('timer')} />
          <SettingRow icon={<Sparkles className="w-4 h-4" />} label="Power-ups (bonus điểm)"
            on={prefs.powerups} onToggle={() => toggle('powerups')} />
        </div>
      </div>

      {/* Team mode share modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowShare(false)}
              className="float-right w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 mx-auto mb-3 flex items-center justify-center">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-slate-800 font-bold text-xl mb-1">Team mode — Mời bạn bè</h3>
            <p className="text-slate-500 text-sm mb-5">Gửi link/QR cho bạn cùng làm. Mỗi người làm độc lập + so sánh điểm.</p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl inline-block mb-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`}
                alt="QR" className="w-44 h-44" />
            </div>
            <code className="block text-xs text-slate-600 bg-slate-100 p-3 rounded-lg break-all mb-3">{shareUrl}</code>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy link
              </button>
              <Link to={`/teacher/exams/${examId}/play`}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5">
                Mở phòng LIVE
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mode Card Component ──────────────────────────────────
function ModeCard({
  title, description, bg, illustration, onClick, badge, disabled, tall, titleColor,
}: {
  title: string
  description: string
  bg: string
  illustration: React.ReactNode
  onClick: () => void
  badge?: string
  disabled?: boolean
  tall?: boolean
  titleColor?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-3xl text-left overflow-hidden transition-all
        ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-2xl active:scale-95'}
        ${tall ? 'h-[280px]' : 'h-[180px]'} shadow-xl`}
      style={{ background: bg }}
    >
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/40 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm z-10">
          {badge}
        </span>
      )}
      <div className="absolute top-4 left-5 right-5 z-10">
        <h3 className={`text-2xl md:text-3xl font-black mb-1 ${titleColor || 'text-white'}`}>
          {title}
        </h3>
        <p className={`text-xs ${titleColor === 'text-teal-900' ? 'text-teal-800/80' : 'text-white/85'} leading-snug max-w-[80%]`}>
          {description}
        </p>
      </div>
      <div className="absolute bottom-0 right-0 left-0 h-3/5 flex items-end justify-center pointer-events-none">
        {illustration}
      </div>
    </button>
  )
}

// ─── Illustrations (SVG inline) ────────────────────────────
function ClassicIllustration() {
  return (
    <div className="flex gap-2 mb-4">
      {['#92400e', '#a855f7', '#f97316', '#475569'].map((c, i) => (
        <div key={i} style={{ background: c }}
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
          {['A','B','C','D'][i]}
        </div>
      ))}
    </div>
  )
}

function MountainIllustration() {
  return (
    <svg viewBox="0 0 200 100" className="w-full h-full max-h-[140px]">
      <path d="M 0 100 L 60 50 L 80 70 L 110 30 L 140 60 L 200 100 Z" fill="#065f46" opacity="0.6" />
      <path d="M 100 30 L 110 20 L 120 30 L 110 32 Z" fill="#fff" />
      <circle cx="115" cy="22" r="3" fill="#ef4444" />
      <rect x="115" y="14" width="1.5" height="8" fill="#ef4444" />
      {/* climbing avatars */}
      <circle cx="60" cy="58" r="7" fill="#7c3aed" />
      <circle cx="80" cy="70" r="7" fill="#10b981" />
      <circle cx="100" cy="50" r="7" fill="#f59e0b" />
    </svg>
  )
}

function PlaygroundIllustration() {
  return (
    <div className="w-32 h-32 rounded-t-2xl bg-orange-700/60 border-4 border-orange-800 relative mb-2">
      <div className="absolute top-2 left-2 right-2 h-8 rounded bg-yellow-300/80 flex items-center justify-center">
        <div className="flex gap-0.5">
          {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-700" />)}
        </div>
      </div>
      <div className="absolute top-12 left-3 right-3 bottom-10 bg-green-200/90 rounded grid grid-cols-3 grid-rows-3 gap-0.5 p-1">
        <div className="bg-purple-500 rounded-sm col-start-2" />
        <div className="bg-pink-500 rounded-sm col-start-3 row-start-2" />
        <div className="bg-red-400 rounded-sm row-start-3 col-start-1" />
      </div>
      <div className="absolute bottom-2 left-2 right-2 h-6 bg-orange-900 rounded flex gap-1 px-2 items-center">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-blue-400" />
      </div>
    </div>
  )
}

function TestIllustration() {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3 px-4">
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-pink-100/95 rounded-lg p-2 w-16 h-12 flex flex-col gap-0.5">
          <div className="text-[8px] font-bold text-pink-600">PHẦN {['I','II','III','IV'][i-1]}</div>
          <div className="flex gap-0.5 mt-auto">
            {[1,2,3,4].map(j => <div key={j} className={`w-1.5 h-1.5 rounded-full ${j === 2 ? 'bg-pink-600' : 'bg-pink-200'}`} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamIllustration() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-10 h-14 bg-rose-200 rounded-t-full" />
      <div className="w-10 h-16 bg-rose-100 rounded-t-full" />
      <div className="w-10 h-12 bg-rose-300 rounded-t-full" />
      <div className="w-10 h-14 bg-rose-200 rounded-t-full" />
    </div>
  )
}

// ─── Setting Row ────────────────────────────────────────
function SettingRow({ icon, label, hint, on, onToggle }: {
  icon: React.ReactNode; label: string; hint?: string; on: boolean; onToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-slate-500">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 text-sm font-medium">{label}</p>
        {hint && <p className="text-slate-400 text-[10px] leading-tight mt-0.5">{hint}</p>}
      </div>
      <button onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
