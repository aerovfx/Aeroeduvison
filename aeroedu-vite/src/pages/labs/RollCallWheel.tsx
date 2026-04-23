/**
 * Vòng quay gọi tên — Roll Call Wheel
 *
 * Tính năng chính:
 *  • Dán danh sách học sinh trực tiếp (mỗi dòng 1 tên, hoặc phân tách bằng ,/;/tab)
 *  • Thêm/xoá tên thủ công
 *  • Tải danh sách từ lớp học đã có (/api/classes)
 *  • Vòng quay canvas, spin vật lý, âm tanh tick khi đổi múi
 *  • Tự động loại trừ tên đã gọi (tuỳ chọn)
 *  • Lưu danh sách + lịch sử vào localStorage để không mất khi refresh
 *  • Hiệu ứng confetti khi chọn trúng
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, Clipboard, Play, RotateCcw, Trash2, Users, Volume2, VolumeX,
  Plus, Sparkles, X, Download, Upload, Check,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────
interface ClassRow {
  id: string
  name: string
  grade?: string
  studentCount?: number
}
interface StudentRow {
  id?: string
  name?: string
  fullName?: string
  full_name?: string
}

// ── Storage keys ───────────────────────────────────────────────────
const LS_NAMES = 'rcw_names_v1'
const LS_CALLED = 'rcw_called_v1'
const LS_EXCLUDE = 'rcw_exclude_v1'
const LS_SOUND = 'rcw_sound_v1'

// ── Helpers ────────────────────────────────────────────────────────
function parseNameBlob(blob: string): string[] {
  if (!blob) return []
  // Split on newlines, then further split each chunk on common delimiters.
  const seen = new Set<string>()
  const out: string[] = []
  const stripOrder = /^\s*(?:\d+[\.\)]|[-*•▪◦])\s*/
  blob.split(/\r?\n/).forEach((line) => {
    const parts = line.split(/[\t,;|]/)
    parts.forEach((raw) => {
      let n = raw.trim()
      if (!n) return
      n = n.replace(stripOrder, '').trim()
      if (!n) return
      // Dedupe case-insensitively
      const k = n.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      out.push(n)
    })
  })
  return out
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#0ea5e9',
]
function colorAt(i: number) {
  return PALETTE[i % PALETTE.length]
}

// Audio beep (tick + fanfare) via WebAudio — no assets needed.
function useAudioBeep(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)
  const get = useCallback(() => {
    if (!enabled) return null
    if (!ctxRef.current) {
      try {
        const Ctor = (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
        ctxRef.current = new Ctor()
      } catch { return null }
    }
    return ctxRef.current
  }, [enabled])
  const tick = useCallback(() => {
    const ctx = get(); if (!ctx) return
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'triangle'; o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05)
    o.connect(g).connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.06)
  }, [get])
  const fanfare = useCallback(() => {
    const ctx = get(); if (!ctx) return
    const now = ctx.currentTime
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((hz, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = hz
      g.gain.setValueAtTime(0.0001, now + i * 0.09)
      g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.09 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.35)
      o.connect(g).connect(ctx.destination)
      o.start(now + i * 0.09)
      o.stop(now + i * 0.09 + 0.4)
    })
  }, [get])
  return { tick, fanfare }
}

// Fire-and-forget confetti via canvas.
function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d'); if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const W = canvas.width / dpr, H = canvas.height / dpr
  type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; c: string; s: number }
  const pieces: Piece[] = Array.from({ length: 120 }).map(() => ({
    x: W / 2 + (Math.random() - 0.5) * 60,
    y: H / 2,
    vx: (Math.random() - 0.5) * 10,
    vy: -Math.random() * 12 - 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    s: 4 + Math.random() * 6,
  }))
  let frames = 0
  const step = () => {
    frames++
    ctx.clearRect(0, 0, W, H)
    pieces.forEach((p) => {
      p.vy += 0.35
      p.x += p.vx; p.y += p.vy; p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y); ctx.rotate(p.rot)
      ctx.fillStyle = p.c
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.5)
      ctx.restore()
    })
    if (frames < 160) requestAnimationFrame(step)
    else ctx.clearRect(0, 0, W, H)
  }
  requestAnimationFrame(step)
}

// ── Wheel canvas ───────────────────────────────────────────────────
function drawWheel(
  canvas: HTMLCanvasElement,
  names: string[],
  angle: number,
  highlight: number | null,
) {
  const dpr = window.devicePixelRatio || 1
  const cssSize = Math.min(canvas.clientWidth, canvas.clientHeight)
  if (canvas.width !== cssSize * dpr) {
    canvas.width = cssSize * dpr
    canvas.height = cssSize * dpr
  }
  const ctx = canvas.getContext('2d'); if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const W = cssSize, H = cssSize
  ctx.clearRect(0, 0, W, H)
  const cx = W / 2, cy = H / 2
  const r = Math.min(cx, cy) - 8

  if (names.length === 0) {
    // Placeholder disk
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('Dán hoặc nhập danh sách', cx, cy)
    return
  }

  const n = names.length
  const arc = (Math.PI * 2) / n
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)

  for (let i = 0; i < n; i++) {
    const a0 = i * arc
    const a1 = a0 + arc
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, r, a0, a1)
    ctx.closePath()
    const base = colorAt(i)
    if (highlight === i) {
      // Bright highlight wedge
      ctx.fillStyle = base
      ctx.fill()
      ctx.save()
      ctx.globalCompositeOperation = 'source-atop'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fill()
      ctx.restore()
    } else {
      ctx.fillStyle = base
      ctx.fill()
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Label
    ctx.save()
    ctx.rotate(a0 + arc / 2)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    const maxChars = Math.max(6, Math.floor(18 - n * 0.15))
    const label = names[i].length > maxChars ? names[i].slice(0, maxChars - 1) + '…' : names[i]
    const size = Math.max(10, Math.min(18, 22 - n * 0.4))
    ctx.font = `600 ${size}px system-ui, sans-serif`
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 3
    ctx.fillText(label, r - 14, 0)
    ctx.restore()
  }
  ctx.restore()

  // Hub
  ctx.beginPath()
  ctx.arc(cx, cy, 26, 0, Math.PI * 2)
  const g = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 26)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#94a3b8')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.stroke()

  // Pointer (triangle at right, pointing left)
  ctx.save()
  ctx.translate(W - 4, cy)
  ctx.beginPath()
  ctx.moveTo(0, -18)
  ctx.lineTo(0, 18)
  ctx.lineTo(-28, 0)
  ctx.closePath()
  ctx.fillStyle = '#fde047'
  ctx.strokeStyle = '#713f12'
  ctx.lineWidth = 2
  ctx.fill(); ctx.stroke()
  ctx.restore()
}

// ── Page ───────────────────────────────────────────────────────────
export default function RollCallWheel() {
  // Core state
  const [names, setNames] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_NAMES) || '[]') } catch { return [] }
  })
  const [called, setCalled] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(LS_CALLED) || '[]') } catch { return [] }
  })
  const [excludeCalled, setExcludeCalled] = useState<boolean>(() => {
    return (localStorage.getItem(LS_EXCLUDE) ?? '1') === '1'
  })
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    return (localStorage.getItem(LS_SOUND) ?? '1') === '1'
  })

  const [blob, setBlob] = useState('')
  const [manualName, setManualName] = useState('')

  // Wheel animation
  const [angle, setAngle] = useState(0)
  const angleRef = useRef(0)
  const spinningRef = useRef(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<number | null>(null)

  // Canvases
  const wheelRef = useRef<HTMLCanvasElement | null>(null)
  const confettiRef = useRef<HTMLCanvasElement | null>(null)

  // Classes import
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loadingClass, setLoadingClass] = useState(false)
  const [classPicker, setClassPicker] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')

  const { tick, fanfare } = useAudioBeep(soundOn)

  // Pool of names to spin over (optionally filtered)
  const pool = useMemo(
    () => (excludeCalled ? names.filter((n) => !called.includes(n)) : names),
    [names, called, excludeCalled],
  )

  // Persist state
  useEffect(() => { localStorage.setItem(LS_NAMES, JSON.stringify(names)) }, [names])
  useEffect(() => { localStorage.setItem(LS_CALLED, JSON.stringify(called)) }, [called])
  useEffect(() => { localStorage.setItem(LS_EXCLUDE, excludeCalled ? '1' : '0') }, [excludeCalled])
  useEffect(() => { localStorage.setItem(LS_SOUND, soundOn ? '1' : '0') }, [soundOn])

  // Redraw on pool or angle change
  useEffect(() => {
    const c = wheelRef.current; if (!c) return
    drawWheel(c, pool, angle, isSpinning ? null : highlight)
  }, [pool, angle, highlight, isSpinning])

  // Resize canvas with container
  useEffect(() => {
    const c = wheelRef.current; if (!c) return
    const ro = new ResizeObserver(() => drawWheel(c, pool, angleRef.current, highlight))
    ro.observe(c)
    return () => ro.disconnect()
  }, [pool, highlight])

  // Resize confetti to fill
  useEffect(() => {
    const c = confettiRef.current; if (!c) return
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      c.width = c.clientWidth * dpr
      c.height = c.clientHeight * dpr
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────
  const handleImport = useCallback(() => {
    const parsed = parseNameBlob(blob)
    if (parsed.length === 0) return
    const existing = new Set(names.map((n) => n.toLowerCase()))
    const fresh = parsed.filter((n) => !existing.has(n.toLowerCase()))
    setNames([...names, ...fresh])
    setBlob('')
  }, [blob, names])

  const handleReplace = useCallback(() => {
    const parsed = parseNameBlob(blob)
    setNames(parsed)
    setCalled([])
    setBlob('')
    setWinner(null)
    setHighlight(null)
  }, [blob])

  const handlePasteClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setBlob((prev) => (prev ? prev + '\n' + text : text))
    } catch {
      // ignore — user may need to paste manually
    }
  }, [])

  const handleAddOne = useCallback(() => {
    const n = manualName.trim()
    if (!n) return
    if (names.some((x) => x.toLowerCase() === n.toLowerCase())) {
      setManualName('')
      return
    }
    setNames([...names, n])
    setManualName('')
  }, [manualName, names])

  const handleRemove = useCallback((name: string) => {
    setNames((prev) => prev.filter((n) => n !== name))
    setCalled((prev) => prev.filter((n) => n !== name))
  }, [])

  const handleClearAll = useCallback(() => {
    if (!confirm('Xoá toàn bộ danh sách và lịch sử gọi tên?')) return
    setNames([])
    setCalled([])
    setWinner(null)
    setHighlight(null)
  }, [])

  const handleResetCalled = useCallback(() => {
    setCalled([])
    setWinner(null)
    setHighlight(null)
  }, [])

  const handleExport = useCallback(() => {
    const csv = 'name,called\n' +
      names.map((n) => `"${n.replace(/"/g, '""')}",${called.includes(n) ? 1 : 0}`).join('\n')
    const blob2 = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob2)
    const a = document.createElement('a')
    a.href = url; a.download = `roll-call-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [names, called])

  const handleRemovePicked = useCallback(() => {
    if (!winner) return
    setNames((prev) => prev.filter((n) => n !== winner))
    setCalled((prev) => prev.filter((n) => n !== winner))
    setWinner(null)
    setHighlight(null)
  }, [winner])

  // Classes integration
  const fetchClasses = useCallback(async () => {
    try {
      setLoadingClass(true)
      const res = await fetch('/api/classes')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setClasses(data.classes || [])
    } catch {
      setClasses([])
    } finally {
      setLoadingClass(false)
    }
  }, [])

  const handleOpenClassPicker = useCallback(() => {
    setClassPicker(true)
    if (classes.length === 0) fetchClasses()
  }, [classes.length, fetchClasses])

  const handleLoadClass = useCallback(async (classId: string) => {
    if (!classId) return
    try {
      const res = await fetch(`/api/classes/${classId}/students`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      const arr: StudentRow[] = data.students || data || []
      const studentNames = arr
        .map((s) => (s.fullName || s.full_name || s.name || '').trim())
        .filter(Boolean)
      if (studentNames.length === 0) return
      const existing = new Set(names.map((n) => n.toLowerCase()))
      const fresh = studentNames.filter((n) => !existing.has(n.toLowerCase()))
      setNames([...names, ...fresh])
      setClassPicker(false)
    } catch {
      alert('Không tải được danh sách học sinh từ lớp này.')
    }
  }, [names])

  // ── Spin ─────────────────────────────────────────────────────────
  const spin = useCallback(() => {
    if (spinningRef.current) return
    if (pool.length < 2) {
      if (pool.length === 1) {
        setWinner(pool[0]); setHighlight(0); fanfare()
        if (confettiRef.current) launchConfetti(confettiRef.current)
      }
      return
    }
    setWinner(null)
    spinningRef.current = true
    setIsSpinning(true)

    // Pre-pick winner index, compute target angle so wedge lands under pointer (angle 0 = right).
    const rand = mulberry32(Date.now() & 0xffffffff)
    const winIdx = Math.floor(rand() * pool.length)
    const arc = (Math.PI * 2) / pool.length
    // Wedge i covers [i*arc, (i+1)*arc] in wheel space; after rotation by `angle`, wedge centre sits
    // at angle + (i+0.5)*arc. Pointer is at 0 (3 o'clock). Want that = 0 (mod 2π).
    const targetBase = -((winIdx + 0.5) * arc)
    const turns = 5 + Math.floor(rand() * 4)
    const target = targetBase + Math.PI * 2 * turns + (Math.random() - 0.5) * (arc * 0.6)
    const start = angleRef.current
    const total = target - start
    const dur = 4600 + Math.random() * 1200
    const t0 = performance.now()

    let lastWedge = -1
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const a = start + total * easeOut(t)
      angleRef.current = a
      setAngle(a)
      // Tick when pointer crosses a boundary
      const normalized = ((-a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      const wedge = Math.floor(normalized / arc)
      if (wedge !== lastWedge) {
        lastWedge = wedge
        tick()
      }
      if (t < 1) requestAnimationFrame(step)
      else {
        spinningRef.current = false
        setIsSpinning(false)
        const name = pool[winIdx]
        setWinner(name)
        setHighlight(winIdx)
        setCalled((prev) => (prev.includes(name) ? prev : [...prev, name]))
        fanfare()
        if (confettiRef.current) launchConfetti(confettiRef.current)
      }
    }
    requestAnimationFrame(step)
  }, [pool, fanfare, tick])

  const SAMPLE = `Nguyễn An
Trần Bình
Lê Chi
Phạm Dũng
Hoàng Em
Vũ Giang`

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[hsl(260,30%,8%)] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">

        <Link
          to="/dashboard/labtwin/labs"
          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 text-sm font-medium"
        >
          <ChevronLeft className="h-4 w-4" /> Quay lại danh sách labs
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">🎯</div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Vòng quay gọi tên</h1>
            <p className="text-white/60 text-sm">
              Dán danh sách học sinh hoặc nạp từ lớp → quay chọn ngẫu nhiên, công bằng.
            </p>
          </div>
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
            title={soundOn ? 'Tắt âm' : 'Bật âm'}
          >
            {soundOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-white/50" />}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* ── LEFT: Wheel ── */}
          <div className="relative">
            <div className="aspect-square max-w-[560px] mx-auto relative">
              <canvas ref={wheelRef} className="absolute inset-0 w-full h-full" />
              <canvas
                ref={confettiRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />
            </div>

            {/* Winner banner */}
            {winner && !isSpinning && (
              <div className="mt-4 px-5 py-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-center animate-in fade-in">
                <div className="text-xs uppercase tracking-widest text-amber-200/80 mb-1">Được chọn</div>
                <div className="text-3xl font-bold text-amber-200 flex items-center justify-center gap-2">
                  <Sparkles className="h-6 w-6" />{winner}<Sparkles className="h-6 w-6" />
                </div>
                <div className="flex gap-2 justify-center mt-3">
                  <button
                    onClick={handleRemovePicked}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5 inline mr-1" />Xoá khỏi danh sách
                  </button>
                  <button
                    onClick={() => { setWinner(null); setHighlight(null) }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white/80"
                  >
                    <Check className="h-3.5 w-3.5 inline mr-1" />Đã ghi nhận
                  </button>
                </div>
              </div>
            )}

            {/* Spin controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={spin}
                disabled={pool.length === 0 || isSpinning}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-lg flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                <Play className="h-5 w-5" />
                {isSpinning ? 'Đang quay…' : 'QUAY'}
              </button>
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeCalled}
                  onChange={(e) => setExcludeCalled(e.target.checked)}
                  className="accent-cyan-500 h-4 w-4"
                />
                Loại trừ tên đã gọi
              </label>
            </div>

            <p className="text-center text-white/40 text-xs mt-3">
              Số tên trong vòng quay:&nbsp;
              <span className="text-white/80 font-semibold">{pool.length}</span>
              {excludeCalled && called.length > 0 && (
                <> &nbsp;·&nbsp; đã gọi: <span className="text-white/80">{called.length}/{names.length}</span></>
              )}
            </p>
          </div>

          {/* ── RIGHT: Manage names ── */}
          <div className="space-y-4">
            {/* Paste card */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Clipboard className="h-4 w-4" />Dán danh sách
                </h3>
                <button
                  onClick={handlePasteClipboard}
                  className="text-xs text-white/60 hover:text-cyan-300"
                  title="Dán từ clipboard"
                >
                  Dán từ clipboard
                </button>
              </div>
              <textarea
                value={blob}
                onChange={(e) => setBlob(e.target.value)}
                placeholder={`Mỗi tên một dòng, hoặc phân tách bằng ,\n\nVí dụ:\n${SAMPLE}`}
                rows={6}
                className="w-full bg-black/40 text-sm rounded-lg border border-white/10 p-3 focus:border-cyan-400 outline-none resize-y font-mono"
                spellCheck={false}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleImport}
                  disabled={!blob.trim()}
                  className="flex-1 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />Thêm vào danh sách
                </button>
                <button
                  onClick={handleReplace}
                  disabled={!blob.trim()}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-sm"
                  title="Thay thế toàn bộ danh sách"
                >
                  Thay thế
                </button>
              </div>
              <p className="text-[11px] text-white/40 mt-2">
                Hỗ trợ ngăn cách bằng xuống dòng, dấu phẩy, chấm phẩy hoặc tab. Tự lọc trùng.
              </p>
            </div>

            {/* Quick add + actions */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddOne()}
                  placeholder="Thêm một tên…"
                  className="flex-1 bg-black/40 text-sm rounded-lg border border-white/10 px-3 py-2 focus:border-cyan-400 outline-none"
                />
                <button
                  onClick={handleAddOne}
                  disabled={!manualName.trim()}
                  className="px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40"
                  aria-label="Thêm"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleOpenClassPicker}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5" />Nạp từ lớp
                </button>
                <button
                  onClick={handleExport}
                  disabled={names.length === 0}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />Tải CSV
                </button>
                <button
                  onClick={handleResetCalled}
                  disabled={called.length === 0}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />Reset đã gọi
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={names.length === 0}
                  className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />Xoá tất cả
                </button>
              </div>
            </div>

            {/* Names list */}
            <div className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-4">
              <h3 className="text-sm font-bold text-cyan-300 mb-3 flex items-center justify-between">
                <span>Danh sách ({names.length})</span>
                {called.length > 0 && (
                  <span className="text-xs text-white/40 font-normal">{called.length} đã gọi</span>
                )}
              </h3>
              {names.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-8">
                  Chưa có tên nào. Hãy dán danh sách ở trên.
                </p>
              ) : (
                <ul className="max-h-[320px] overflow-y-auto divide-y divide-white/5 -mx-2">
                  {names.map((n, i) => {
                    const wasCalled = called.includes(n)
                    return (
                      <li
                        key={n + i}
                        className={`flex items-center gap-2 px-2 py-1.5 text-sm ${wasCalled ? 'text-white/35 line-through' : 'text-white/90'}`}
                      >
                        <span className="text-[10px] w-5 text-white/30 text-right">{i + 1}</span>
                        <span
                          className="h-2 w-2 rounded-full inline-block"
                          style={{ background: colorAt(i) }}
                        />
                        <span className="flex-1 truncate">{n}</span>
                        {wasCalled && <span className="text-[10px] text-amber-300/70">✓</span>}
                        <button
                          onClick={() => handleRemove(n)}
                          className="opacity-50 hover:opacity-100 hover:text-rose-300"
                          title="Xoá"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Class picker modal ── */}
        {classPicker && (
          <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setClassPicker(false)}
          >
            <div
              className="bg-[hsl(260,25%,11%)] rounded-2xl border border-white/10 p-5 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-cyan-300" />Nạp từ lớp học
                </h3>
                <button onClick={() => setClassPicker(false)} className="text-white/40 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {loadingClass ? (
                <p className="text-center text-white/50 py-8">Đang tải…</p>
              ) : classes.length === 0 ? (
                <p className="text-center text-white/50 py-8">
                  Chưa có lớp nào. Hãy vào <Link to="/teacher/classes" className="text-cyan-300 underline">Quản lý lớp</Link> để tạo.
                </p>
              ) : (
                <>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-black/40 rounded-lg border border-white/10 px-3 py-2 text-sm mb-3"
                  >
                    <option value="">— Chọn lớp —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.grade ? ` · ${c.grade}` : ''}
                        {typeof c.studentCount === 'number' ? ` · ${c.studentCount} HS` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleLoadClass(selectedClassId)}
                    disabled={!selectedClassId}
                    className="w-full px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-sm font-semibold"
                  >
                    Nạp danh sách học sinh
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
