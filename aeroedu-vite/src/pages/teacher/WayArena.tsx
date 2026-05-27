/**
 * WayArena — Game show quiz hosting tương tự Wayground.com/Way-arena
 *
 * Route: /teacher/way-arena (+ /teacher/way-arena/:code reconnect)
 *
 * User: screenshot wayground.com/admin/way-arena/dashboard/WAYNFCH +
 * "When students create, the class wants to play" student creation page.
 *
 * Layout (ref image 1):
 *   - Pixel dungeon background full-screen
 *   - Top-left: WAYARENA logo
 *   - Top-right: mute + "End game" red button
 *   - Center: join panel
 *     • Row 1: "Join using any device" + joinmyquiz.com (copy btn) + QR
 *     • Row 2: "Enter the join code" + WAYNFCH (copy btn)
 *     • START button (pink) + 0 participants counter
 *     • "Waiting for participants to join…"
 *   - Bottom-left: "Select an arena" mini-map preview
 *
 * Layout (ref image 2 — student creation section):
 *   - "When students create, the class wants to play"
 *   - 6 student-designed arenas grid
 *   - Qbit avatars (cute fluffy chars)
 *   - "Host WayArena" CTA + "Select activity" button
 *   - "Fresh every time you play" card with arcade emoji
 */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  Copy, Check, Volume2, VolumeX, Users, Crown, Sparkles,
  ArrowLeft, Home, Wand2, ArrowRight, Gamepad2, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Arena demos (student-designed maps) ──────────────────────────
interface Arena {
  id: string
  name: string
  emoji: string
  gradient: string
  desc: string
  byStudent?: string
}

const ARENAS: Arena[] = [
  { id: 'quad-grid',    name: 'Quad Grid',    emoji: '🌍',  gradient: 'linear-gradient(135deg, #fb923c 0%, #c084fc 33%, #4ade80 66%, #60a5fa 100%)', desc: '4 vùng đất khác nhau · vũ trụ + rừng + biển + tuyết', byStudent: 'Minh Khôi · Lớp 5A' },
  { id: 'ghost-space',  name: 'Ghost Space',  emoji: '👻',  gradient: 'linear-gradient(135deg, #1e1b4b, #581c87 50%, #06b6d4 100%)', desc: 'Hành tinh ma · neon spirits trôi nổi', byStudent: 'Bảo Trân · Lớp 6B' },
  { id: 'penguin-path', name: 'Penguin Path', emoji: '🐧',  gradient: 'linear-gradient(135deg, #38bdf8, #67e8f9 50%, #e0f2fe 100%)', desc: 'Đường băng giá · chim cánh cụt dẫn lối', byStudent: 'An Hùng · Lớp 4C' },
  { id: 'neon-block',   name: 'Neon Block',   emoji: '✨',  gradient: 'linear-gradient(135deg, #581c87, #ec4899 50%, #06b6d4 100%)', desc: 'Cyberpunk neon city · synthwave', byStudent: 'Trang Nhi · Lớp 7A' },
  { id: 'forest-play',  name: 'Forest Play',  emoji: '🌳',  gradient: 'linear-gradient(135deg, #15803d, #84cc16 50%, #fef9c3 100%)', desc: 'Rừng nhiệt đới · nấm + sông + cầu gỗ', byStudent: 'Đức Anh · Lớp 5B' },
  { id: 'pixel-arena',  name: 'Pixel Arena',  emoji: '👾',  gradient: 'linear-gradient(135deg, #fb923c, #e11d48 50%, #7c3aed 100%)', desc: 'Castle dungeon · pixel art retro', byStudent: 'Hà Phương · Lớp 6A' },
]

// ── Qbit avatars (student personalities) ─────────────────────────
interface Qbit {
  id: string
  name: string
  accessory: string
  bg: string
}

const QBITS: Qbit[] = [
  { id: 'astro', name: 'Phi hành gia', accessory: '🧑‍🚀', bg: 'linear-gradient(135deg, #60a5fa, #c084fc)' },
  { id: 'star',  name: 'Sao đêm',      accessory: '⭐',    bg: 'linear-gradient(135deg, #c084fc, #fb923c)' },
  { id: 'explorer', name: 'Thám hiểm', accessory: '🤠',   bg: 'linear-gradient(135deg, #f59e0b, #84cc16)' },
  { id: 'princess', name: 'Công chúa', accessory: '👑',   bg: 'linear-gradient(135deg, #ec4899, #f472b6)' },
]

// ── Helpers ──────────────────────────────────────────────────────
function generateJoinCode(len = 7): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'  // tránh I/O ambiguous
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// ── Sub-components ───────────────────────────────────────────────
function ArenaPicker({ open, current, onClose, onSelect }: {
  open: boolean; current: Arena; onClose: () => void; onSelect: (a: Arena) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-950 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ border: '2px solid rgba(192,132,252,0.4)' }}>
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-10">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-pink-500 text-xs font-black uppercase tracking-[0.2em] mb-1">Student Creation</div>
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                Khi học sinh sáng tạo, cả lớp muốn chơi
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Bản đồ luôn mới vì HS tự thiết kế · GV chọn bản đồ để dùng
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-4 md:p-6">
          {/* Arenas */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-md bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-orange-500" />
              </span>
              <span className="font-black text-sm md:text-base text-slate-900 dark:text-white">Bản đồ HS thiết kế</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Bản đồ sáng tạo · phép toán mới · do HS làm.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ARENAS.map(a => {
                const isCurrent = current.id === a.id
                return (
                  <button key={a.id}
                    onClick={() => { onSelect(a); onClose() }}
                    className="text-left transition-transform hover:scale-105 group">
                    <div
                      className="aspect-square rounded-2xl flex items-center justify-center text-6xl shadow-lg relative overflow-hidden"
                      style={{ background: a.gradient }}>
                      <span className="drop-shadow-lg">{a.emoji}</span>
                      {isCurrent && (
                        <div className="absolute inset-0 ring-4 ring-pink-500 rounded-2xl flex items-center justify-center bg-black/30 backdrop-blur-sm">
                          <Check className="w-12 h-12 text-white drop-shadow" />
                        </div>
                      )}
                    </div>
                    <p className="mt-2 font-bold text-sm text-slate-800 dark:text-slate-200">{a.name}</p>
                    {a.byStudent && (
                      <p className="text-[10px] text-slate-500 mt-0.5">by {a.byStudent}</p>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white">Host WayArena</p>
                <p className="text-xs text-slate-500 truncate">HS thiết kế, bạn chọn. Khởi động sôi nổi.</p>
              </div>
              <button onClick={onClose}
                className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">
                Chọn <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right column — Qbits + Fresh card */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 md:p-5">
              <p className="font-black text-sm md:text-base text-slate-900 dark:text-white mb-1">
                HS thể hiện cá tính
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Qbits không chỉ là avatar — chúng là cá tính riêng.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {QBITS.map(q => (
                  <div key={q.id} className="aspect-square rounded-2xl flex items-center justify-center text-5xl shadow-md"
                    style={{ background: q.bg }} title={q.name}>
                    <span className="drop-shadow">{q.accessory}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 md:p-5 flex items-center gap-3">
              <span className="text-4xl">🕹️</span>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-900 dark:text-white">Mới mỗi lần chơi</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bản đồ mới · Qbits mới · chiến lược mới. Mỗi phiên chơi cảm giác hoàn toàn mới.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pixel dungeon background (SVG procedural) ───────────────────
function PixelDungeonBg() {
  // Sử dụng gradient + SVG tile pattern thay vì image asset
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 100%, rgba(112, 76, 48, 0.4), transparent 70%),
            linear-gradient(180deg, #0a0a0f 0%, #1a0f0a 40%, #2a1810 70%, #3a2418 100%)
          `,
        }}
      />
      {/* Pixel "stones" pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="stones" x="0" y="0" width="64" height="64" patternUnits="userSpaceOnUse">
            <rect width="64" height="64" fill="#3a2418" />
            <rect x="0" y="0" width="28" height="28" fill="#52311e" stroke="#1a0f0a" strokeWidth="1" />
            <rect x="32" y="0" width="28" height="28" fill="#46291a" stroke="#1a0f0a" strokeWidth="1" />
            <rect x="0" y="32" width="28" height="28" fill="#4a2c1c" stroke="#1a0f0a" strokeWidth="1" />
            <rect x="32" y="32" width="28" height="28" fill="#5a3622" stroke="#1a0f0a" strokeWidth="1" />
            {/* Highlights */}
            <rect x="2" y="2" width="6" height="6" fill="#6e4128" opacity="0.6" />
            <rect x="34" y="34" width="6" height="6" fill="#6e4128" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#stones)" />
      </svg>
      {/* Dark vignette */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)' }} />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────
export default function WayArena() {
  const navigate = useNavigate()
  const { code: urlCode } = useParams<{ code?: string }>()
  const [code] = useState(() => urlCode || generateJoinCode())
  const [muted, setMuted] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [arena, setArena] = useState<Arena>(ARENAS[5]) // Pixel Arena default
  const [pickerOpen, setPickerOpen] = useState(false)
  const [copied, setCopied] = useState<'url' | 'code' | null>(null)
  const [showHowto, setShowHowto] = useState(false)

  // Demo: simulate participants joining (random tick)
  useEffect(() => {
    const id = setInterval(() => {
      setParticipantCount(c => Math.random() > 0.7 ? c + 1 : c)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  // URL HS sẽ join — dùng existing /play/join route hoặc inphysic shortlink
  const joinUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://inphysic.com'
    return `${origin.replace(/^https?:\/\//, '')}/play/${code}`
  }, [code])

  const fullJoinUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://inphysic.com'
    return `${origin}/play/${code}`
  }, [code])

  const copyToClipboard = (val: string, kind: 'url' | 'code') => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(kind)
      toast.success(kind === 'url' ? 'Đã copy link' : 'Đã copy mã')
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const handleStart = () => {
    if (participantCount === 0) {
      toast('Chờ HS tham gia trước khi bắt đầu', { icon: '⏳' })
      return
    }
    toast.success(`🎮 Bắt đầu! ${participantCount} HS trong phòng ${arena.name}`)
    // TODO: navigate to actual playroom
  }

  const handleEndGame = () => {
    if (window.confirm('Kết thúc game?')) {
      navigate('/teacher/dashboard')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <PixelDungeonBg />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/teacher/dashboard"
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 transition group"
          title="Về Dashboard">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25), 0 4px 12px rgba(220,38,38,0.4)',
            }}>
            <Crown className="w-6 h-6 md:w-7 md:h-7 text-yellow-200 drop-shadow" />
          </div>
          <span className="hidden sm:block font-black text-base md:text-lg text-white tracking-wider drop-shadow"
            style={{ textShadow: '2px 2px 0 #000' }}>
            WAYARENA
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(m => !m)}
            className="w-10 h-10 md:w-11 md:h-11 rounded-lg bg-black/40 backdrop-blur hover:bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
            title={muted ? 'Bật âm' : 'Tắt âm'}>
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            onClick={handleEndGame}
            className="px-4 md:px-5 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm md:text-base transition shadow-lg"
            style={{ boxShadow: '0 4px 0 rgb(159 18 57)' }}>
            End game
          </button>
        </div>
      </div>

      {/* Center join panel */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-32">
        <div className="rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md w-full max-w-3xl"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(20,15,10,0.9))',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4 md:gap-6 items-center">
              {/* Info rows */}
              <div className="space-y-4 md:space-y-5">
                {/* Row 1: URL */}
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white/70 text-base font-bold">
                    1
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/60 font-bold mb-0.5">
                      Tham gia
                    </div>
                    <div className="text-[10px] text-white/60 leading-tight">qua web/mobile</div>
                  </div>
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="text-white text-lg md:text-2xl font-black truncate"
                      style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '-0.02em' }}>
                      {joinUrl}
                    </div>
                    <button
                      onClick={() => copyToClipboard(fullJoinUrl, 'url')}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 flex-shrink-0">
                      {copied === 'url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Row 2: Code */}
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white/70 text-base font-bold">
                    2
                  </div>
                  <div className="flex-shrink-0">
                    <div className="text-[10px] md:text-xs uppercase tracking-wider text-white/60 font-bold mb-0.5">
                      Nhập mã
                    </div>
                    <div className="text-[10px] text-white/60 leading-tight">phòng chơi</div>
                  </div>
                  <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
                    <div className="text-white text-3xl md:text-5xl font-black tracking-wider truncate"
                      style={{ fontFamily: '"Inter", sans-serif', letterSpacing: '0.05em' }}>
                      {code}
                    </div>
                    <button
                      onClick={() => copyToClipboard(code, 'code')}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 flex-shrink-0">
                      {copied === 'code' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR code */}
              <div className="hidden md:flex items-center justify-center bg-white p-2 rounded-xl shadow-lg">
                <QRCodeSVG value={fullJoinUrl} size={120} level="M" />
              </div>
            </div>
          </div>

          {/* Start button + counter */}
          <div className="border-t border-white/10 p-4 md:p-5 flex items-center justify-center gap-3 bg-black/30">
            <button
              onClick={handleStart}
              className="flex-1 max-w-md px-6 py-3 md:py-4 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xl md:text-2xl font-black uppercase tracking-widest transition active:translate-y-0.5"
              style={{ boxShadow: '0 4px 0 rgb(157 23 77)' }}>
              START
            </button>
            <div className="flex items-center gap-2 px-4 py-3 md:py-4 rounded-xl bg-black/60 backdrop-blur border border-white/10 text-white">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              <span className="font-black text-base md:text-lg tabular-nums">{participantCount}</span>
            </div>
          </div>
        </div>

        {/* Waiting status */}
        <p className="mt-6 text-white/40 text-sm md:text-base font-semibold tracking-wide italic"
          style={{ textShadow: '1px 1px 0 #000' }}>
          {participantCount === 0
            ? 'Đang chờ HS tham gia…'
            : `${participantCount} HS đã sẵn sàng — bấm START để bắt đầu`}
        </p>
      </div>

      {/* Bottom-left arena selector */}
      <button
        onClick={() => setPickerOpen(true)}
        className="absolute bottom-4 left-4 z-20 group rounded-2xl bg-white hover:bg-slate-50 transition shadow-2xl p-3 max-w-[280px] cursor-pointer"
        style={{ border: '2px solid rgba(255,255,255,0.2)' }}>
        <div className="aspect-[16/10] rounded-xl flex items-center justify-center text-5xl shadow-inner"
          style={{ background: arena.gradient }}>
          <span className="drop-shadow-lg">{arena.emoji}</span>
        </div>
        <div className="mt-2 px-2 pb-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-800 truncate">{arena.name}</p>
            <p className="text-[10px] text-slate-500 truncate">Bấm để đổi bản đồ</p>
          </div>
          <Sparkles className="w-4 h-4 text-purple-500 group-hover:scale-125 transition" />
        </div>
      </button>

      {/* How-to tooltip */}
      <button
        onClick={() => setShowHowto(s => !s)}
        className="absolute bottom-4 right-4 z-20 w-12 h-12 rounded-full bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-2xl font-black shadow-2xl flex items-center justify-center"
        style={{ boxShadow: '0 4px 0 rgb(157 23 77)' }}
        title="Hướng dẫn">
        ?
      </button>

      {showHowto && (
        <div className="absolute bottom-20 right-4 z-30 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl p-4 text-sm"
          style={{ border: '2px solid rgba(217,70,239,0.4)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-900 dark:text-white">Hướng dẫn nhanh</h3>
            <button onClick={() => setShowHowto(false)}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4">
            <li>HS scan QR hoặc vào <strong>{joinUrl}</strong></li>
            <li>Nhập mã <strong>{code}</strong> + tên</li>
            <li>Đợi GV bấm <strong>START</strong></li>
            <li>Trả lời câu hỏi · điểm vào leaderboard</li>
          </ol>
          <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
            💡 Tip: chọn bản đồ HS thiết kế ở góc trái dưới để tăng hứng thú!
          </p>
        </div>
      )}

      <ArenaPicker
        open={pickerOpen}
        current={arena}
        onClose={() => setPickerOpen(false)}
        onSelect={(a) => setArena(a)}
      />
    </div>
  )
}
