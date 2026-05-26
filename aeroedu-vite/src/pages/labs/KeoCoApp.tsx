/**
 * Kéo Co Kiến Thức — Teacher Control Panel
 *   /dashboard/labtwin/keo-co-app
 *
 * Two tabs:
 *   1) "Lớp học"  (Classroom)  — create session → QR → live tug-of-war
 *   2) "Thách đấu" (1v1)      — generate a 1v1 challenge link to share
 *
 * Live state polled every 1.5s while a session is "running".
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, Plus, Play, SkipForward, StopCircle, Trash2,
  Users, Trophy, Swords, QrCode, Copy, Check, RefreshCw, Zap,
  Zap as Bolt, Flag, Clock,
} from 'lucide-react'
import keocoService, {
  KcSession, KcSessionFull, KcChallenge, KcLiveMatch,
  KcCatalogItem, KcLeaderboardEntry,
} from '@/services/keoco.service'

type Tab = 'classroom' | 'live' | 'challenge'

const SUBJECTS = ['Vật lý', 'Toán', 'Hóa học', 'Sinh học', 'Tin học', 'Tiếng Anh', 'Ngữ văn', 'Lịch sử', 'Địa lý']
const GRADES = ['Khối 6', 'Khối 7', 'Khối 8', 'Khối 9', 'Khối 10', 'Khối 11', 'Khối 12']
const DIFFICULTIES: Array<{ key: string; label: string }> = [
  { key: '', label: 'Tất cả' },
  { key: 'EASY', label: 'Dễ' },
  { key: 'MEDIUM', label: 'Trung bình' },
  { key: 'HARD', label: 'Khó' },
]

function qrUrlFor(text: string, size = 320) {
  const enc = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${enc}`
}

export default function KeoCoApp() {
  const [tab, setTab] = useState<Tab>('classroom')
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* ── Header ── */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/dashboard/labtwin/labs"
            className="text-slate-400 hover:text-white inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại Labs
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪢</span>
            <h1 className="text-lg sm:text-xl font-bold">Kéo Co Kiến Thức</h1>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2">
          <button
            onClick={() => setTab('classroom')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'classroom'
                ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Lớp học
          </button>
          <button
            onClick={() => setTab('live')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'live'
                ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Bolt className="w-4 h-4 inline mr-1.5" />
            Đấu Live 2 người
          </button>
          <button
            onClick={() => setTab('challenge')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === 'challenge'
                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Swords className="w-4 h-4 inline mr-1.5" />
            Thách đấu 1v1
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'classroom'
          ? <ClassroomTab />
          : tab === 'live'
            ? <LiveMatchTab />
            : <ChallengeTab />}
      </main>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   CLASSROOM TAB
═══════════════════════════════════════════════════════════════════════ */

function Leaderboard() {
  const [list, setList] = useState<KcLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    keocoService.getLeaderboard()
      .then(r => { if (!cancelled) setList(r) })
      .catch(e => console.warn('keoco leaderboard', e?.message))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) return null
  if (list.length === 0) return null

  return (
    <div className="mb-6 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/5 border border-amber-500/25 rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
            🏆 Bảng xếp hạng — Top {list.length} người chơi Kéo Co
          </h3>
        </div>
        <span className="text-xs text-amber-300/80">{collapsed ? '▼ Mở rộng' : '▲ Thu gọn'}</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-amber-200/60 border-b border-amber-500/20">
                  <th className="text-left py-2 px-2 font-medium">#</th>
                  <th className="text-left py-2 px-2 font-medium">Người chơi</th>
                  <th className="text-right py-2 px-2 font-medium">Thắng</th>
                  <th className="text-right py-2 px-2 font-medium">Tổng trận</th>
                  <th className="text-right py-2 px-2 font-medium">Tỉ lệ</th>
                  <th className="text-right py-2 px-2 font-medium">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => {
                  const rankStyle = e.rank === 1
                    ? 'bg-gradient-to-r from-amber-500/20 to-transparent'
                    : e.rank === 2
                      ? 'bg-gradient-to-r from-slate-400/15 to-transparent'
                      : e.rank === 3
                        ? 'bg-gradient-to-r from-orange-700/15 to-transparent'
                        : ''
                  const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`
                  return (
                    <tr key={e.rank} className={`border-b border-white/5 ${rankStyle}`}>
                      <td className="py-2 px-2 text-amber-200 font-bold">{medal}</td>
                      <td className="py-2 px-2 text-white font-medium">{e.name}</td>
                      <td className="py-2 px-2 text-right text-emerald-300 font-bold">{e.wins}</td>
                      <td className="py-2 px-2 text-right text-slate-300">{e.totalPlayed}</td>
                      <td className="py-2 px-2 text-right text-cyan-300">{e.winRate}%</td>
                      <td className="py-2 px-2 text-right text-amber-300">{e.totalScore.toLocaleString('vi-VN')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ClassroomTab() {
  const [sessions, setSessions] = useState<KcSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  async function refresh() {
    try {
      const list = await keocoService.listSessions()
      setSessions(list)
    } catch (err) {
      console.error('list sessions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const active = sessions.find((s) => s.id === activeId) || null

  return (
    <>
    <Leaderboard />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ── Left: session list ── */}
      <aside className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Cuộc thi của tôi
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tạo mới
          </button>
        </div>

        {loading && <p className="text-slate-500 text-sm">Đang tải...</p>}

        {!loading && sessions.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-slate-400 text-sm">
            Chưa có cuộc thi nào.<br />Bấm "Tạo mới" để bắt đầu.
          </div>
        )}

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                activeId === s.id
                  ? 'bg-rose-500/15 border-rose-400/40'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  s.status === 'lobby' ? 'bg-amber-400'
                  : s.status === 'running' ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-500'
                }`} />
                <span className="text-xs font-medium text-slate-400 uppercase">
                  {s.status === 'lobby' ? 'Chờ' : s.status === 'running' ? 'Đang chơi' : 'Đã xong'}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto">{s.shortCode}</span>
              </div>
              <div className="font-medium text-sm leading-snug">{s.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {s.subject} · {s.questionCount} câu
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Right: active session detail ── */}
      <section className="lg:col-span-8">
        {active ? (
          <SessionDetail sessionId={active.id} onChange={refresh} />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🪢</div>
            <h2 className="text-xl font-bold mb-2">Chọn một cuộc thi</h2>
            <p className="text-slate-400 text-sm">
              Chọn cuộc thi từ danh sách bên trái, hoặc tạo cuộc thi mới để xem QR và điều khiển trận đấu.
            </p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreated={(s) => {
            setShowCreate(false)
            refresh().then(() => setActiveId(s.id))
          }}
        />
      )}
    </div>
    </>
  )
}

/* ── Create session modal ─────────────────────────────────────── */

function CreateSessionModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (s: KcSession) => void }) {
  const [title, setTitle] = useState('Kéo Co Kiến Thức')
  const [subject, setSubject] = useState('Vật lý')
  const [grade, setGrade] = useState('Khối 12')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(20)
  const [ropeMax, setRopeMax] = useState(100)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // ── Exam picker (game catalog) ────────────────────────────────
  const [catalog, setCatalog] = useState<KcCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [selectedExamId, setSelectedExamId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    keocoService.listGameCatalog('keo-co')
      .then(items => { if (!cancelled) setCatalog(items) })
      .catch(e => console.warn('catalog load', e?.message))
      .finally(() => { if (!cancelled) setCatalogLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Khi chọn 1 đề → auto-fill subject + topic + question count
  function pickExam(id: string) {
    setSelectedExamId(id)
    if (!id) return
    const ex = catalog.find(c => c.examId === id)
    if (!ex) return
    if (ex.subject) setSubject(ex.subject)
    if (ex.examTitle) setTopic(ex.examTitle)
    if (ex.questionCount > 0) setQuestionCount(Math.min(50, Math.max(3, ex.questionCount)))
    if (!title || title === 'Kéo Co Kiến Thức') setTitle(`Kéo Co — ${ex.examTitle.slice(0, 40)}`)
  }

  async function submit() {
    setErr(null)
    setCreating(true)
    try {
      const ex = catalog.find(c => c.examId === selectedExamId)
      const s = await keocoService.createSession({
        title, subject, grade, difficulty: difficulty || undefined,
        topic: topic || undefined,
        questionCount, timePerQuestion, ropeMax,
        examId: selectedExamId || undefined,
        examTitle: ex?.examTitle,
      })
      onCreated(s)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-lg">Tạo cuộc thi mới</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Exam picker từ game catalog ── */}
          <Field label="📋 Đề thi từ danh mục thi đấu (tuỳ chọn)">
            {catalogLoading ? (
              <div className="text-xs text-slate-500 italic px-3 py-2">Đang tải danh mục…</div>
            ) : catalog.length === 0 ? (
              <div className="text-xs text-slate-500 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                Chưa có đề nào trong catalog. Vào{' '}
                <Link to="/teacher/exams" className="text-rose-300 underline">/teacher/exams</Link>{' '}
                → bấm nút ⚔️ Swords để add đề vào trò chơi đối kháng.
              </div>
            ) : (
              <select
                value={selectedExamId}
                onChange={(e) => pickExam(e.target.value)}
                className={selectCls}
              >
                <option value="">— Tự generate từ ngân hàng câu hỏi —</option>
                {catalog.map(c => (
                  <option key={c.id} value={c.examId}>
                    {c.examTitle}{c.subject ? ` · ${c.subject}` : ''}{c.questionCount > 0 ? ` · ${c.questionCount} câu` : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Tên cuộc thi">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400/50"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Môn">
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectCls}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Khối">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Độ khó">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectCls}>
              {DIFFICULTIES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Chủ đề (lọc theo từ khóa)">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="vd: Dao động điều hòa"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400/50"
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Số câu">
              <input type="number" min={3} max={50} value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                className={selectCls} />
            </Field>
            <Field label="Giây / câu">
              <input type="number" min={5} max={120} value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 20)}
                className={selectCls} />
            </Field>
            <Field label="Độ dài dây">
              <input type="number" min={50} max={500} value={ropeMax}
                onChange={(e) => setRopeMax(parseInt(e.target.value) || 100)}
                className={selectCls} />
            </Field>
          </div>

          {err && (
            <div className="bg-rose-500/10 border border-rose-400/30 text-rose-300 text-sm rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={creating || !title.trim()}
            className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {creating ? 'Đang tạo...' : (<>Tạo & lấy QR <QrCode className="w-4 h-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  )
}

const selectCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rose-400/50'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}

/* ── Session detail (live tug-of-war) ─────────────────────────── */

function SessionDetail({
  sessionId, onChange,
}: { sessionId: string; onChange: () => void }) {
  const [data, setData] = useState<KcSessionFull | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollRef = useRef<number | null>(null)

  async function load() {
    try {
      const d = await keocoService.getSession(sessionId)
      setData(d)
    } catch (err) {
      console.error('load session', err)
    }
  }

  useEffect(() => {
    load()
    const tick = () => { load() }
    pollRef.current = window.setInterval(tick, 1500)
    return () => { if (pollRef.current) window.clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  if (!data) return <div className="text-slate-400 text-sm">Đang tải...</div>

  async function start() {
    setBusy(true)
    try { await keocoService.startSession(sessionId); await load(); onChange() }
    finally { setBusy(false) }
  }
  async function next() {
    setBusy(true)
    try { await keocoService.nextQuestion(sessionId); await load(); onChange() }
    finally { setBusy(false) }
  }
  async function finish() {
    if (!confirm('Kết thúc cuộc thi?')) return
    setBusy(true)
    try { await keocoService.finishSession(sessionId); await load(); onChange() }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!confirm('Xóa hẳn cuộc thi này?')) return
    setBusy(true)
    try { await keocoService.deleteSession(sessionId); onChange() }
    finally { setBusy(false) }
  }

  const scanUrl = data.scanUrl || `${window.location.origin}/k/${data.qrToken}`

  function copy() {
    navigator.clipboard.writeText(scanUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold mb-1">{data.title}</h2>
            <div className="text-xs text-slate-400">
              {data.subject} · {data.grade} · {data.questionCount} câu · {data.timePerQuestion}s/câu
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data.status === 'lobby' && (
              <button onClick={start} disabled={busy}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50">
                <Play className="w-4 h-4" /> Bắt đầu
              </button>
            )}
            {data.status === 'running' && (
              <>
                <button onClick={next} disabled={busy}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50">
                  <SkipForward className="w-4 h-4" /> Câu tiếp
                </button>
                <button onClick={finish} disabled={busy}
                  className="bg-rose-500/80 hover:bg-rose-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50">
                  <StopCircle className="w-4 h-4" /> Kết thúc
                </button>
              </>
            )}
            <button onClick={remove} disabled={busy}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── QR + scan link ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 flex flex-col items-center">
          <img
            src={qrUrlFor(scanUrl, 320)}
            alt="QR"
            className="w-full max-w-[280px]"
          />
          <div className="text-slate-700 text-xs mt-2 text-center">
            Học sinh quét QR bằng điện thoại để tham gia
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Link tham gia</div>
            <div className="flex gap-1.5">
              <input
                readOnly value={scanUrl}
                className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono"
              />
              <button onClick={copy}
                className="bg-white/10 hover:bg-white/20 px-3 rounded-lg inline-flex items-center gap-1 text-sm">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Mã ngắn</div>
            <div className="text-3xl font-bold tracking-widest text-amber-300 font-mono">
              {data.shortCode}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Học sinh có thể vào <code className="text-slate-300">{window.location.host}/k/{data.shortCode}</code>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tug-of-war visualization ── */}
      <RopeVisualization data={data} />

      {/* ── Players ── */}
      <PlayersList data={data} />

      {/* ── Current question (teacher monitor) ── */}
      {data.status === 'running' && data.currentQuestion && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-amber-300 uppercase">
              Câu {data.currentQuestion.index + 1} / {data.questionCount}
            </span>
            <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
          </div>
          <div className="font-medium mb-3 text-sm">{data.currentQuestion.content}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(data.currentQuestion.options as Array<unknown>).map((opt, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <span className="font-bold text-amber-300 mr-2">{String.fromCharCode(65 + i)}.</span>
                {typeof opt === 'string' ? opt : (opt as { text?: string; label?: string })?.text || JSON.stringify(opt)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Winner banner ── */}
      {data.status === 'finished' && (
        <div className={`rounded-xl p-6 text-center border ${
          data.winner === 'red' ? 'bg-rose-500/10 border-rose-400/40'
          : data.winner === 'blue' ? 'bg-blue-500/10 border-blue-400/40'
          : 'bg-slate-500/10 border-slate-400/40'
        }`}>
          <Trophy className={`w-12 h-12 mx-auto mb-2 ${
            data.winner === 'red' ? 'text-rose-400'
            : data.winner === 'blue' ? 'text-blue-400'
            : 'text-slate-400'
          }`} />
          <div className="text-2xl font-bold">
            {data.winner === 'tie' ? 'Hòa!' : `Đội ${data.winner === 'red' ? 'ĐỎ' : 'XANH'} chiến thắng!`}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            Vị trí dây cuối: {data.ropePosition} / ±{data.ropeMax}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Rope SVG ─────────────────────────────────────────────────── */

function RopeVisualization({ data }: { data: KcSessionFull }) {
  const pct = useMemo(() => {
    const max = data.ropeMax || 100
    const p = data.ropePosition / max // -1..+1
    return Math.max(-1, Math.min(1, p))
  }, [data.ropePosition, data.ropeMax])

  // Mark center: x = 50%; ribbon shifts proportionally to pct.
  // pct = -1 → ribbon at left (RED won pulling); pct = +1 → ribbon at right (BLUE won pulling)
  const ribbonX = 50 + pct * 35 // shift up to ±35% from center

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 text-xs font-medium uppercase tracking-wide">
        <div className="text-rose-300 flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-400" /> Đội ĐỎ ({data.teamCounts.red || 0})
        </div>
        <div className="text-slate-400">Vị trí: {data.ropePosition}</div>
        <div className="text-blue-300 flex items-center gap-1.5">
          Đội XANH ({data.teamCounts.blue || 0}) <span className="w-3 h-3 rounded-full bg-blue-400" />
        </div>
      </div>

      <div className="relative h-16 bg-slate-950 rounded-lg overflow-hidden">
        {/* Tick marks */}
        <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="w-px h-full bg-white/5" />
          ))}
        </div>

        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-amber-400/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] text-amber-300 font-mono mt-1">VẠCH ĐÍCH</div>

        {/* Rope (the bar) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-rose-500 via-amber-300 to-blue-500 transition-all duration-500"
          style={{
            left: `${Math.min(50, 50 + pct * 35) - 2}%`,
            width: `${Math.abs(pct) * 35 + 4}%`,
          }}
        />

        {/* Ribbon (center marker that shifts) */}
        <div
          className="absolute top-0 bottom-0 w-1.5 bg-yellow-300 shadow-lg shadow-yellow-300/50 transition-all duration-500"
          style={{ left: `calc(${ribbonX}% - 3px)` }}
        />

        {/* Edge markers */}
        <div className="absolute left-1 top-1/2 -translate-y-1/2 text-rose-400 font-bold text-sm">
          🚩
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-400 font-bold text-sm">
          🚩
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-rose-500/10 border border-rose-400/20 rounded-lg p-3 text-center">
          <div className="text-xs text-rose-300 uppercase tracking-wide">Điểm Đội ĐỎ</div>
          <div className="text-2xl font-bold">{data.teamScores.red || 0}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3 text-center">
          <div className="text-xs text-blue-300 uppercase tracking-wide">Điểm Đội XANH</div>
          <div className="text-2xl font-bold">{data.teamScores.blue || 0}</div>
        </div>
      </div>
    </div>
  )
}

/* ── Players list ─────────────────────────────────────────────── */

function PlayersList({ data }: { data: KcSessionFull }) {
  const red = data.players.filter((p) => p.team === 'red').sort((a, b) => b.score - a.score)
  const blue = data.players.filter((p) => p.team === 'blue').sort((a, b) => b.score - a.score)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PlayerColumn team="red" players={red} />
      <PlayerColumn team="blue" players={blue} />
    </div>
  )
}

function PlayerColumn({ team, players }: { team: 'red' | 'blue'; players: KcSessionFull['players'] }) {
  const list = players
  const isRed = team === 'red'
  return (
    <div className={`rounded-xl p-3 border ${
      isRed ? 'bg-rose-500/5 border-rose-400/20' : 'bg-blue-500/5 border-blue-400/20'
    }`}>
      <h3 className={`text-sm font-bold mb-2 ${isRed ? 'text-rose-300' : 'text-blue-300'}`}>
        Đội {isRed ? 'ĐỎ' : 'XANH'} · {list.length}
      </h3>
      {list.length === 0 ? (
        <p className="text-slate-500 text-xs">Chưa có ai...</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between bg-black/20 rounded-lg px-2.5 py-1.5 text-sm">
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{p.name}</span>
                {p.streak >= 3 && <span className="text-amber-300 text-xs">🔥{p.streak}</span>}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
                <span className="text-emerald-400">✓ {p.correct}</span>
                <span className="text-rose-400">✗ {p.wrong}</span>
                <span className="font-bold text-amber-300">{p.score}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   LIVE 2-PLAYER MATCH TAB  — synchronous, both scan QR, scoreboard on PC
═══════════════════════════════════════════════════════════════════════ */

function LiveMatchTab() {
  const [matches, setMatches] = useState<KcLiveMatch[]>([])
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  async function refresh() {
    try {
      const list = await keocoService.listLives()
      setMatches(list)
    } catch (err) {
      console.error('list lives', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const active = matches.find((m) => m.token === activeToken) || null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Trận đấu live
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-sm font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Trận mới
          </button>
        </div>

        {loading && <p className="text-slate-500 text-sm">Đang tải...</p>}

        {!loading && matches.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-slate-400 text-sm">
            Chưa có trận nào.<br />Tạo trận mới và mời bạn bè quét QR.
          </div>
        )}

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {matches.map((m) => (
            <button
              key={m.token}
              onClick={() => setActiveToken(m.token)}
              className={`w-full text-left p-3 rounded-lg border transition ${
                activeToken === m.token
                  ? 'bg-cyan-500/15 border-cyan-400/40'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${
                  m.status === 'waiting' ? 'bg-amber-400 animate-pulse'
                  : m.status === 'running' ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-500'
                }`} />
                <span className="text-xs font-medium text-slate-400 uppercase">
                  {m.status === 'waiting' ? 'Chờ 2 người' : m.status === 'running' ? 'Đang đấu' : 'Đã xong'}
                </span>
                <span className="text-[10px] text-slate-600 ml-auto">{m.players.length}/2</span>
              </div>
              <div className="font-medium text-sm leading-snug">{m.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {m.subject} · {m.questionCount} câu
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="lg:col-span-8">
        {active ? (
          <LiveMatchDetail token={active.token} onChange={refresh} />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-xl font-bold mb-2">Đấu Live 2 người chơi</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Tạo trận đấu 1v1 — cả hai bên cùng quét QR, trả lời cùng câu hỏi, màn hình máy tính hiển thị tỉ số live theo thời gian thực.
            </p>
          </div>
        )}
      </section>

      {showCreate && (
        <CreateLiveModal
          onClose={() => setShowCreate(false)}
          onCreated={(m) => {
            setShowCreate(false)
            refresh().then(() => setActiveToken(m.token))
          }}
        />
      )}
    </div>
  )
}

function CreateLiveModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (m: KcLiveMatch) => void }) {
  const [title, setTitle] = useState('Đối kháng Kéo Co')
  const [subject, setSubject] = useState('Vật lý')
  const [grade, setGrade] = useState('Khối 12')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(8)
  const [timePerQuestion, setTimePerQuestion] = useState(20)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setErr(null); setCreating(true)
    try {
      const m = await keocoService.createLive({
        title, subject, grade,
        difficulty: difficulty || undefined,
        topic: topic || undefined,
        questionCount, timePerQuestion,
      })
      onCreated(m)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-bold text-lg">Tạo trận đấu Live</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Tên trận đấu">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={selectCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Môn">
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectCls}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Khối">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Độ khó">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectCls}>
              {DIFFICULTIES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Chủ đề (tùy chọn)">
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="vd: Chuyển động thẳng" className={selectCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số câu">
              <input type="number" min={3} max={30} value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 8)}
                className={selectCls} />
            </Field>
            <Field label="Giây / câu">
              <input type="number" min={5} max={120} value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 20)}
                className={selectCls} />
            </Field>
          </div>
          {err && (
            <div className="bg-rose-500/10 border border-rose-400/30 text-rose-300 text-sm rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Hủy</button>
          <button onClick={submit} disabled={creating || !title.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-900 text-sm font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
            {creating ? 'Đang tạo...' : (<>Tạo & lấy QR <QrCode className="w-4 h-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  )
}

function LiveMatchDetail({
  token, onChange,
}: { token: string; onChange: () => void }) {
  const [data, setData] = useState<KcLiveMatch | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const pollRef = useRef<number | null>(null)

  async function load() {
    try {
      const d = await keocoService.getLive(token)
      setData(d)
    } catch (err) {
      console.error('load live', err)
    }
  }

  useEffect(() => {
    load()
    pollRef.current = window.setInterval(() => { load() }, 1200)
    return () => { if (pollRef.current) window.clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!data) return <div className="text-slate-400 text-sm">Đang tải...</div>

  const scanUrl = data.scanUrl || `${window.location.origin}/kl/${data.token}`

  function copy() {
    navigator.clipboard.writeText(scanUrl).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  async function remove() {
    if (!confirm('Xóa trận đấu này?')) return
    setBusy(true)
    try { await keocoService.deleteLive(token); onChange() }
    finally { setBusy(false) }
  }

  // Find red/blue players (may be empty until join)
  const red = data.players.find((p) => p.slot === 'red')
  const blue = data.players.find((p) => p.slot === 'blue')
  const redScore = red?.score || 0
  const blueScore = blue?.score || 0
  const maxScore = Math.max(redScore, blueScore, 1)
  const redPct = Math.round((redScore / maxScore) * 100)
  const bluePct = Math.round((blueScore / maxScore) * 100)

  // Progress (how many questions completed — player answered state is ephemeral)
  const progressCurrent = data.status === 'finished' ? data.questionCount : Math.max(0, data.currentIndex)
  const progressPct = Math.min(100, (progressCurrent / data.questionCount) * 100)

  // Time left on current question
  const timeLeft = (() => {
    if (data.status !== 'running' || !data.currentStartedAt) return null
    const started = new Date(data.currentStartedAt).getTime()
    const elapsed = (Date.now() - started) / 1000
    return Math.max(0, Math.round(data.timePerQuestion - elapsed))
  })()

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold mb-1">{data.title}</h2>
            <div className="text-xs text-slate-400">
              {data.subject} · {data.grade} · {data.questionCount} câu · {data.timePerQuestion}s/câu
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            <button onClick={remove} disabled={busy}
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Waiting / QR area ── */}
      {data.status === 'waiting' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 flex flex-col items-center">
            <img src={qrUrlFor(scanUrl, 320)} alt="QR" className="w-full max-w-[280px]" />
            <div className="text-slate-700 text-xs mt-2 text-center">
              Cả 2 người chơi cùng quét QR. Ai quét trước sẽ chờ đối thủ.
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Link tham gia</div>
              <div className="flex gap-1.5">
                <input readOnly value={scanUrl}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono" />
                <button onClick={copy}
                  className="bg-white/10 hover:bg-white/20 px-3 rounded-lg inline-flex items-center gap-1 text-sm">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3 text-sm">
              <div className="text-amber-300 font-medium mb-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Đang chờ người chơi ({data.players.length}/2)
              </div>
              <div className="text-xs text-amber-200/80">
                Trận đấu sẽ tự động bắt đầu khi đủ 2 người.
              </div>
              {data.players.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.players.map((p) => (
                    <span key={p.token || p.name}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.slot === 'red'
                          ? 'bg-rose-500/20 text-rose-200 ring-1 ring-rose-400/40'
                          : 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                      }`}>
                      ✓ {p.name} ({p.slot === 'red' ? 'ĐỎ' : 'XANH'})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Live scoreboard ── */}
      {(data.status === 'running' || data.status === 'finished') && (
        <>
          {/* Leader banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Đội dẫn trước
              </div>
              {timeLeft != null && data.status === 'running' && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-mono font-bold text-amber-300">{timeLeft}s</span>
                </div>
              )}
            </div>
            <LeaderBanner data={data} />
          </div>

          {/* Scoreboard: big 2-column layout */}
          <div className="grid grid-cols-2 gap-4">
            <TeamCard side="red" player={red} score={redScore} pct={redPct}
              leading={data.leader === 'red'} />
            <TeamCard side="blue" player={blue} score={blueScore} pct={bluePct}
              leading={data.leader === 'blue'} />
          </div>

          {/* Progress bar */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-400 mb-2">
              <span>Tiến độ làm bài</span>
              <span className="font-mono text-slate-300">
                Câu {Math.min(data.currentIndex + 1, data.questionCount)} / {data.questionCount}
              </span>
            </div>
            <div className="h-3 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-lg px-2 py-1.5 font-medium ${
                red?.hasAnswered ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-500'
              }`}>
                {red ? (red.hasAnswered ? '✓ ĐỎ đã trả lời' : '⏳ ĐỎ đang suy nghĩ...') : '— Chưa có người chơi ĐỎ'}
              </div>
              <div className={`rounded-lg px-2 py-1.5 font-medium text-right ${
                blue?.hasAnswered ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-slate-500'
              }`}>
                {blue ? (blue.hasAnswered ? '✓ XANH đã trả lời' : '⏳ XANH đang suy nghĩ...') : '— Chưa có người chơi XANH'}
              </div>
            </div>
          </div>

          {/* Current question (teacher view) */}
          {data.status === 'running' && data.currentQuestion && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-cyan-300 uppercase">
                  Câu {data.currentQuestion.index + 1} / {data.questionCount}
                </span>
                <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
              </div>
              <div className="font-medium mb-3 text-sm">{data.currentQuestion.content}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(data.currentQuestion.options as Array<unknown>).map((opt, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="font-bold text-cyan-300 mr-2">{String.fromCharCode(65 + i)}.</span>
                    {typeof opt === 'string' ? opt : (opt as { text?: string; label?: string })?.text || JSON.stringify(opt)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Winner */}
          {data.status === 'finished' && (
            <div className={`rounded-xl p-6 text-center border ${
              data.winner === 'red' ? 'bg-rose-500/10 border-rose-400/40'
              : data.winner === 'blue' ? 'bg-cyan-500/10 border-cyan-400/40'
              : 'bg-slate-500/10 border-slate-400/40'
            }`}>
              <Trophy className={`w-12 h-12 mx-auto mb-2 ${
                data.winner === 'red' ? 'text-rose-400'
                : data.winner === 'blue' ? 'text-cyan-400'
                : 'text-slate-400'
              }`} />
              <div className="text-2xl font-bold">
                {data.winner === 'tie' ? 'Hòa!' :
                  `${data.winner === 'red' ? (red?.name || 'ĐỎ') : (blue?.name || 'XANH')} chiến thắng!`}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                Tỉ số: {redScore} - {blueScore}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: KcLiveMatch['status'] }) {
  const cfg = status === 'waiting'
    ? { text: 'Chờ 2 người', cls: 'bg-amber-500/15 text-amber-300 ring-amber-400/30' }
    : status === 'running'
      ? { text: 'Đang đấu', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30' }
      : { text: 'Đã xong', cls: 'bg-slate-500/15 text-slate-300 ring-slate-400/30' }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${cfg.cls}`}>
      {cfg.text}
    </span>
  )
}

function LeaderBanner({ data }: { data: KcLiveMatch }) {
  const red = data.players.find((p) => p.slot === 'red')
  const blue = data.players.find((p) => p.slot === 'blue')
  const leader = data.leader
  if (!leader || leader === 'tie') {
    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-slate-300">Đang hoà</div>
        <div className="text-sm text-slate-500 mt-1">
          {red?.name || '...'} vs {blue?.name || '...'}
        </div>
      </div>
    )
  }
  const leaderPlayer = leader === 'red' ? red : blue
  const diff = Math.abs((red?.score || 0) - (blue?.score || 0))
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold ${
        leader === 'red' ? 'text-rose-400' : 'text-cyan-400'
      }`}>
        {leaderPlayer?.name || (leader === 'red' ? 'ĐỎ' : 'XANH')}
      </div>
      <div className="text-sm text-slate-400 mt-1">
        đang dẫn trước <span className="font-bold text-amber-300">{diff}</span> điểm
      </div>
    </div>
  )
}

function TeamCard({
  side, player, score, pct, leading,
}: {
  side: 'red' | 'blue'
  player: KcLiveMatch['players'][number] | undefined
  score: number
  pct: number
  leading: boolean
}) {
  const isRed = side === 'red'
  return (
    <div className={`rounded-xl p-5 border-2 transition-all ${
      leading
        ? (isRed ? 'bg-rose-500/15 border-rose-400/60 shadow-lg shadow-rose-500/20'
                 : 'bg-cyan-500/15 border-cyan-400/60 shadow-lg shadow-cyan-500/20')
        : (isRed ? 'bg-rose-500/5 border-rose-400/20' : 'bg-cyan-500/5 border-cyan-400/20')
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`text-xs font-bold uppercase tracking-wider ${
            isRed ? 'text-rose-300' : 'text-cyan-300'
          }`}>
            Đội {isRed ? 'ĐỎ' : 'XANH'}
          </div>
          <div className="font-bold text-lg mt-0.5 truncate">
            {player?.name || <span className="text-slate-600 italic font-normal">Đang chờ...</span>}
          </div>
        </div>
        {leading && (
          <span className="text-amber-300 text-xl" title="Đội dẫn trước">👑</span>
        )}
      </div>

      <div className="mb-3">
        <div className={`text-5xl font-black font-mono ${
          isRed ? 'text-rose-200' : 'text-cyan-200'
        }`}>
          {score}
        </div>
        <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">điểm</div>
      </div>

      <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-500 ${
            isRed ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                  : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {player && (
        <div className="grid grid-cols-3 gap-1.5 text-xs">
          <div className="bg-black/30 rounded px-2 py-1 text-center">
            <span className="text-emerald-400 font-bold">✓ {player.correct}</span>
          </div>
          <div className="bg-black/30 rounded px-2 py-1 text-center">
            <span className="text-rose-400 font-bold">✗ {player.wrong}</span>
          </div>
          <div className="bg-black/30 rounded px-2 py-1 text-center">
            {player.streak >= 3
              ? <span className="text-amber-300 font-bold">🔥 {player.streak}</span>
              : <span className="text-slate-400 font-bold">⚡ {player.streak}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   1v1 CHALLENGE TAB
═══════════════════════════════════════════════════════════════════════ */

function ChallengeTab() {
  const [creatorName, setCreatorName] = useState('')
  const [subject, setSubject] = useState('Vật lý')
  const [grade, setGrade] = useState('Khối 12')
  const [difficulty, setDifficulty] = useState('')
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [timePerQuestion, setTimePerQuestion] = useState(15)
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<KcChallenge | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function create() {
    if (!creatorName.trim()) {
      setErr('Vui lòng nhập tên của bạn')
      return
    }
    setCreating(true); setErr(null)
    try {
      const c = await keocoService.createChallenge({
        creatorName: creatorName.trim(),
        subject, grade,
        difficulty: difficulty || undefined,
        topic: topic || undefined,
        questionCount, timePerQuestion,
      })
      setResult(c)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setCreating(false)
    }
  }

  if (result) {
    const url = result.challengeUrl || `${window.location.origin}/kc/${result.token}`
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-6">
          <div className="text-center mb-5">
            <Swords className="w-12 h-12 mx-auto mb-2 text-amber-400" />
            <h2 className="text-xl font-bold mb-1">Sẵn sàng thách đấu!</h2>
            <p className="text-sm text-slate-400">
              Bước 1: Bạn chơi trước để tạo điểm chuẩn → Bước 2: Gửi link cho bạn bè
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 mb-4 flex flex-col items-center">
            <img src={qrUrlFor(url, 280)} alt="QR" className="w-48 h-48" />
            <div className="text-slate-700 text-xs mt-2">Quét QR hoặc gửi link bên dưới</div>
          </div>

          <div className="flex gap-1.5 mb-4">
            <input readOnly value={url}
              className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono" />
            <button
              onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
              className="bg-white/10 hover:bg-white/20 px-3 rounded-lg inline-flex items-center gap-1 text-sm">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <a href={url}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg py-3 text-center inline-flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Tôi chơi trước
            </a>
            <button
              onClick={() => setResult(null)}
              className="px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm">
              Tạo cuộc khác
            </button>
          </div>
        </div>

        <ChallengeLeaderboard />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="text-center mb-5">
          <Swords className="w-12 h-12 mx-auto mb-2 text-amber-400" />
          <h2 className="text-xl font-bold mb-1">Tạo Thách đấu 1v1</h2>
          <p className="text-sm text-slate-400">
            Chơi tự do — không cần lớp học. Tạo bộ câu hỏi, đặt điểm chuẩn, rồi thách bạn bè vượt qua!
          </p>
        </div>

        <div className="space-y-4">
          <Field label="Tên của bạn">
            <input value={creatorName} onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Vd: Minh Anh"
              className={selectCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Môn">
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectCls}>
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Khối">
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Độ khó">
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={selectCls}>
              {DIFFICULTIES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Chủ đề (tùy chọn)">
            <input value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="vd: Sóng cơ"
              className={selectCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số câu">
              <input type="number" min={3} max={30} value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                className={selectCls} />
            </Field>
            <Field label="Giây / câu">
              <input type="number" min={5} max={60} value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 15)}
                className={selectCls} />
            </Field>
          </div>

          {err && (
            <div className="bg-rose-500/10 border border-rose-400/30 text-rose-300 text-sm rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <button onClick={create} disabled={creating}
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg py-3 text-base disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {creating ? 'Đang tạo...' : (<><Zap className="w-4 h-4" /> Tạo & Lấy Link</>)}
          </button>
        </div>
      </div>

      <ChallengeLeaderboard />
    </div>
  )
}

function ChallengeLeaderboard() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof keocoService.challengeLeaderboard>> | null>(null)
  useEffect(() => { keocoService.challengeLeaderboard().then(setRows).catch(() => setRows([])) }, [])
  if (!rows) return null
  if (rows.length === 0) return null
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-300 mb-3 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" /> Bảng Xếp Hạng
      </h3>
      <div className="space-y-1.5">
        {rows.slice(0, 10).map((r, i) => (
          <a key={r.token} href={`/kc/${r.token}`}
            className="flex items-center gap-3 bg-black/20 rounded-lg px-3 py-2 hover:bg-black/40 transition">
            <span className="w-6 text-amber-300 font-bold text-sm">{i + 1}</span>
            <div className="flex-1 min-w-0 text-sm truncate">
              <span className="text-slate-300">{r.creatorName}</span>
              {r.opponentName && (
                <span className="text-slate-500"> vs {r.opponentName}</span>
              )}
              <span className="text-slate-600 text-xs ml-2 truncate">{r.title}</span>
            </div>
            <div className="text-xs font-mono text-slate-300">
              {r.creatorScore || 0}{r.opponentScore != null && ` : ${r.opponentScore}`}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
