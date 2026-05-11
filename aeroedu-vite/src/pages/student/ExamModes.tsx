/**
 * ExamModes — Trang chọn chế độ học cho 1 đề thi (giống Wayground preview)
 *
 * Route: /exam/:examId/modes
 *
 * 3 chế độ:
 *   1. ▶ Preview as student  — làm thử 1 mình (single player, fullscreen)
 *      → /exam/:examId/solo
 *   2. 👥 Challenge friends   — chia sẻ link/QR cho bạn bè cùng làm
 *      → modal QR + copy link
 *   3. 📚 Flashcards          — học bằng thẻ lật, không tính điểm
 *      → /exam/:examId/flashcards
 *
 * Bottom: settings (Read aloud, Timer, Power-ups toggle — lưu localStorage)
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Play, Users, BookOpen, Volume2, Clock, Sparkles, ArrowLeft, X, Copy, Check, FileText } from 'lucide-react'
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
type Prefs = { readAloud: boolean; timer: boolean; powerups: boolean }
const defaultPrefs: Prefs = { readAloud: false, timer: true, powerups: true }

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
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
        <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!exam) return <div className="min-h-screen flex items-center justify-center text-white">Không tìm thấy đề</div>

  return (
    <div className="min-h-screen text-white"
      style={{ background: 'radial-gradient(ellipse at center, #4a1366 0%, #1a0b2e 70%)' }}>
      {/* Top */}
      <div className="px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white/70 hover:text-white text-sm">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">

        {/* LEFT: Exam card */}
        <div className="bg-white/[0.04] backdrop-blur rounded-2xl p-5 self-start">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-xl">
            Q
          </div>
          <h2 className="text-white font-bold text-lg leading-snug mb-1">{exam.title}</h2>
          <p className="text-white/50 text-sm">{exam.totalQuestions} câu hỏi</p>
          {exam.subject && (
            <p className="text-white/40 text-xs mt-2">{exam.subject} · Lớp {exam.grade || '?'} · {exam.duration} phút</p>
          )}
          <div className="border-t border-white/10 mt-4 pt-3">
            <button onClick={copyLink}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/80 text-xs font-medium flex items-center justify-center gap-2 transition">
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã copy' : 'Chia sẻ'}
            </button>
          </div>
        </div>

        {/* RIGHT: 3 Mode buttons */}
        <div>
          <h3 className="text-white/90 text-center font-semibold text-sm mb-4">Xem trước đề bằng cách làm như học sinh</h3>

          <div className="space-y-3 mb-6">
            {/* Mode 1: Preview as student */}
            <button onClick={() => navigate(`/exam/${examId}/solo`)}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600
                hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl
                shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3">
              <Play className="w-6 h-6 fill-white" /> Preview as student
            </button>

            {/* Mode 2: Challenge friends */}
            <button onClick={() => setShowShare(true)}
              className="w-full py-5 rounded-2xl bg-white text-slate-800 font-bold text-xl
                hover:bg-white/95 shadow-xl transition-all flex items-center justify-center gap-3">
              <Users className="w-6 h-6" /> Challenge friends
            </button>

            {/* Mode 3: Flashcards */}
            <button onClick={() => navigate(`/exam/${examId}/flashcards`)}
              className="w-full py-5 rounded-2xl bg-white text-slate-800 font-bold text-xl
                hover:bg-white/95 shadow-xl transition-all flex items-center justify-center gap-3">
              <BookOpen className="w-6 h-6" /> Flashcards
            </button>

            {/* Mode 4 (bonus): Bộ-style answer sheet */}
            <button onClick={() => navigate(`/exam-sheet/${examId}`)}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white/80 font-medium text-sm
                border border-white/[0.1] transition-all flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Phiếu trả lời chuẩn Bộ GD&ĐT
            </button>
          </div>

          {/* Settings */}
          <div className="bg-white/[0.04] rounded-2xl p-4">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Settings</p>
            <SettingRow icon={<Volume2 className="w-4 h-4" />} label="Read text aloud"
              on={prefs.readAloud} onToggle={() => toggle('readAloud')} />
            <SettingRow icon={<Clock className="w-4 h-4" />} label="Timer"
              on={prefs.timer} onToggle={() => toggle('timer')} />
            <SettingRow icon={<Sparkles className="w-4 h-4" />} label="Power-ups"
              on={prefs.powerups} onToggle={() => toggle('powerups')} />
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShare(false)}>
          <div className="bg-[#1a0b2e] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowShare(false)}
              className="float-right w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-xl mb-1">Mời bạn bè làm chung</h3>
            <p className="text-white/50 text-sm mb-5">Gửi link cho bạn bè để cùng làm đề. Mỗi người làm độc lập + xem điểm so sánh.</p>
            <div className="bg-white p-3 rounded-2xl inline-block mb-4">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`}
                alt="QR" className="w-44 h-44" />
            </div>
            <code className="block text-xs text-white/70 bg-black/30 p-3 rounded-lg break-all mb-3">{shareUrl}</code>
            <div className="flex gap-2">
              <button onClick={copyLink}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy link
              </button>
              <Link to={`/teacher/exams/${examId}/play`}
                className="flex-1 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5">
                Mở phòng LIVE
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingRow({ icon, label, on, onToggle }: { icon: React.ReactNode; label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
      <span className="text-white/60">{icon}</span>
      <span className="flex-1 text-white/80 text-sm">{label}</span>
      <button onClick={onToggle}
        className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-green-500' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  )
}
