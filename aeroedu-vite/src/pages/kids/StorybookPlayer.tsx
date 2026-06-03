/**
 * StorybookPlayer — trình đọc Flipbook có audio cho thiếu nhi.
 *
 * • Mode 'perPage'  : mỗi trang có 1 đoạn audio kể; nghe xong tự lật (nếu bật).
 * • Mode 'narration': 1 file kể chuyện chạy liên tục, tự LẬT trang theo mốc thời gian.
 *
 * Giao diện to, nhiều màu, nút bấm lớn — bé vừa xem tranh vừa nghe kể.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw, Home,
  Loader2, BookOpen, Volume2, Sparkles,
} from 'lucide-react'
import { getStorybook } from '@/services/storybook.service'
import type { Storybook } from '@/types/storybook'
import ShareMenu from '@/components/common/ShareMenu'

export default function StorybookPlayer() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1'
  const bookRef = useRef<HTMLDivElement | null>(null)   // vùng chụp thumbnail khi chia sẻ
  const [book, setBook] = useState<Storybook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(0)
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true); setError(null)
    getStorybook(id!)
      .then((b) => { if (alive) { setBook(b); setLoading(false) } })
      .catch((e) => { if (alive) { setError(e?.response?.data?.error || 'Không tải được sách'); setLoading(false) } })
    return () => { alive = false }
  }, [id])

  const pages = book?.pages || []
  const isNarration = book?.mode === 'narration'
  const total = pages.length
  const last = page >= total - 1

  // Mốc lật cho narration (sắp xếp theo thời gian)
  const cues = useMemo(() => (
    pages.map((p, i) => ({ i, at: typeof p.flipAtSec === 'number' ? p.flipAtSec : (i === 0 ? 0 : null) }))
      .filter((c) => c.at != null) as { i: number; at: number }[]
  ), [pages])

  const goTo = useCallback((idx: number, dir: 'next' | 'prev') => {
    if (idx < 0 || idx >= total) return
    setFlipDir(dir)
    setPage(idx)
  }, [total])

  const next = useCallback(() => goTo(page + 1, 'next'), [page, goTo])
  const prev = useCallback(() => goTo(page - 1, 'prev'), [page, goTo])

  // ── Mode perPage: phát audio của trang hiện tại ──
  useEffect(() => {
    if (!started || isNarration) return
    const a = audioRef.current
    const url = pages[page]?.audioUrl
    if (!a) return
    if (url) {
      a.src = url
      a.currentTime = 0
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      a.removeAttribute('src'); setPlaying(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, started, isNarration])

  // perPage: nghe xong → tự sang trang
  const onEnded = useCallback(() => {
    setPlaying(false)
    if (!isNarration && book?.autoAdvance && !last) {
      setTimeout(() => next(), 700)
    }
  }, [isNarration, book?.autoAdvance, last, next])

  // ── Mode narration: 1 file, tự lật theo timestamp ──
  const onTimeUpdate = useCallback(() => {
    if (!isNarration) return
    const a = audioRef.current
    if (!a) return
    const t = a.currentTime
    let target = 0
    for (const c of cues) if (c.at <= t + 0.05) target = c.i
    setPage((cur) => {
      if (target !== cur) { setFlipDir(target > cur ? 'next' : 'prev'); return target }
      return cur
    })
  }, [isNarration, cues])

  const start = useCallback(() => {
    setStarted(true)
    const a = audioRef.current
    if (isNarration && a && book?.narrationUrl) {
      a.src = book.narrationUrl
      a.currentTime = 0
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else if (!isNarration) {
      // useEffect[page] sẽ phát audio trang đầu
      setPage((p) => p) // trigger
    }
  }, [isNarration, book?.narrationUrl])

  const togglePlay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => {}) }
    else { a.pause(); setPlaying(false) }
  }, [])

  const replay = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (isNarration) { a.currentTime = (pages[page]?.flipAtSec ?? 0) }
    else { a.currentTime = 0 }
    a.play().then(() => setPlaying(true)).catch(() => {})
  }, [isNarration, page, pages])

  // narration: prev/next seek audio tới mốc trang
  const seekToPage = useCallback((idx: number) => {
    const a = audioRef.current
    if (a && isNarration) {
      const at = pages[idx]?.flipAtSec
      if (typeof at === 'number') { a.currentTime = at; if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {}) }
    }
  }, [isNarration, pages])

  // Bàn phím: ← → space
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { next(); if (isNarration) seekToPage(Math.min(page + 1, total - 1)) }
      else if (e.key === 'ArrowLeft') { prev(); if (isNarration) seekToPage(Math.max(page - 1, 0)) }
      else if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [next, prev, togglePlay, isNarration, seekToPage, page, total])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-amber-50">
      <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
    </div>
  }
  if (error || !book) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sky-100 to-amber-50 p-6 text-center">
      <BookOpen className="w-14 h-14 text-amber-400" />
      <p className="text-lg font-bold text-slate-700">{error || 'Không tìm thấy sách'}</p>
      <Link to="/kids/storybooks" className="px-5 py-2.5 rounded-full bg-amber-400 text-white font-bold shadow">← Về thư viện</Link>
    </div>
  }

  const cur = pages[page]
  const progress = isNarration && audioRef.current?.duration
    ? Math.min(100, (audioRef.current.currentTime / audioRef.current.duration) * 100) : 0

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-200 via-indigo-100 to-amber-100 select-none">
      {/* Thanh trên */}
      <div className="flex items-center gap-2 px-4 py-3">
        {!embed && (
          <button onClick={() => navigate('/kids/storybooks')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/80 text-slate-700 font-bold shadow hover:bg-white">
            <Home className="w-4 h-4" /> <span className="hidden sm:inline">Thư viện</span>
          </button>
        )}
        <h1 className="flex-1 text-center text-lg sm:text-2xl font-black text-indigo-700 truncate drop-shadow-sm">
          {book.title}
        </h1>
        {!embed && (
          <ShareMenu path={`/kids/storybooks/${book.id}`} title={book.title} embeddable
            captureNode={() => bookRef.current} />
        )}
        <div className="px-3.5 py-2 rounded-full bg-white/80 text-indigo-600 font-black shadow text-sm">
          {page + 1}/{total}
        </div>
      </div>

      {/* Khu vực trang sách */}
      <div className="flex-1 flex items-center justify-center px-2 sm:px-6 pb-3 min-h-0">
        <button onClick={() => { prev(); if (isNarration) seekToPage(Math.max(page - 1, 0)) }} disabled={page === 0}
          className="hidden sm:flex shrink-0 w-14 h-14 rounded-full bg-white/90 shadow-lg items-center justify-center text-indigo-600 disabled:opacity-30 hover:scale-110 transition mr-2">
          <ChevronLeft className="w-8 h-8" />
        </button>

        <div ref={bookRef} className="relative w-full max-w-3xl" style={{ perspective: '1800px' }}>
          <div
            key={page}
            className="relative rounded-3xl overflow-hidden shadow-2xl bg-white border-4 border-white"
            style={{
              aspectRatio: '4 / 3',
              animation: `${flipDir === 'next' ? 'sbFlipNext' : 'sbFlipPrev'} 0.5s ease`,
              transformOrigin: flipDir === 'next' ? 'left center' : 'right center',
            }}
          >
            {cur?.imageUrl
              ? <img src={cur.imageUrl} alt={`Trang ${page + 1}`} className="w-full h-full object-contain bg-white" draggable={false} />
              : <div className="w-full h-full flex items-center justify-center text-slate-300"><BookOpen className="w-20 h-20" /></div>}

            {/* tap zones trái/phải trên ảnh (mobile) */}
            <button aria-label="Trang trước" onClick={() => { prev(); if (isNarration) seekToPage(Math.max(page - 1, 0)) }}
              className="sm:hidden absolute left-0 top-0 h-full w-1/4" />
            <button aria-label="Trang sau" onClick={() => { next(); if (isNarration) seekToPage(Math.min(page + 1, total - 1)) }}
              className="sm:hidden absolute right-0 top-0 h-full w-1/4" />
          </div>

          {/* Lời thoại / caption */}
          {cur?.caption && (
            <div className="mt-3 mx-auto max-w-2xl text-center text-lg sm:text-2xl font-extrabold text-slate-700 bg-white/80 rounded-2xl px-4 py-2.5 shadow">
              {cur.caption}
            </div>
          )}
        </div>

        <button onClick={() => { next(); if (isNarration) seekToPage(Math.min(page + 1, total - 1)) }} disabled={last}
          className="hidden sm:flex shrink-0 w-14 h-14 rounded-full bg-white/90 shadow-lg items-center justify-center text-indigo-600 disabled:opacity-30 hover:scale-110 transition ml-2">
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Thanh điều khiển dưới */}
      <div className="px-4 pb-5">
        {isNarration && (
          <div className="max-w-xl mx-auto mb-3 h-2.5 rounded-full bg-white/70 overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-amber-400 to-pink-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button onClick={replay} title="Nghe lại"
            className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-indigo-600 hover:scale-110 transition">
            <RotateCcw className="w-6 h-6" />
          </button>
          <button onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-pink-500 shadow-xl flex items-center justify-center text-white hover:scale-110 transition">
            {playing ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-0.5" />}
          </button>
          <div className="w-12 h-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-amber-500">
            <Volume2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Overlay bắt đầu (cần cử chỉ người dùng để phát audio) */}
      {!started && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-indigo-900/70 backdrop-blur-sm p-6 text-center">
          {book.coverUrl && (
            <img src={book.coverUrl} alt={book.title}
              className="w-44 h-44 sm:w-56 sm:h-56 object-cover rounded-3xl shadow-2xl border-4 border-white" />
          )}
          <h2 className="text-2xl sm:text-4xl font-black text-white drop-shadow flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-amber-300" /> {book.title}
          </h2>
          {book.description && <p className="text-white/90 max-w-md text-base sm:text-lg">{book.description}</p>}
          <button onClick={start}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-white text-xl font-black shadow-2xl hover:scale-105 transition flex items-center gap-2">
            <Play className="w-7 h-7" /> Bắt đầu đọc
          </button>
          <p className="text-white/70 text-sm">🔊 Nhớ bật loa để nghe kể chuyện nhé!</p>
        </div>
      )}

      <audio ref={audioRef} onEnded={onEnded} onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} preload="auto" />

      <style>{`
        @keyframes sbFlipNext { from { transform: rotateY(-35deg); opacity: .3 } to { transform: rotateY(0); opacity: 1 } }
        @keyframes sbFlipPrev { from { transform: rotateY(35deg);  opacity: .3 } to { transform: rotateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
