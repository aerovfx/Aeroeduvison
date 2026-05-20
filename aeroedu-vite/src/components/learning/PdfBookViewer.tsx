/**
 * PdfBookViewer — Kho sách Flipbook
 *
 * ✦ Desktop (≥ 768 px): 2 trang side-by-side với hiệu ứng lật trang 3D
 * ✦ Mobile (< 768 px): 1 trang, vuốt trái/phải như iOS Books
 * ✦ Nhạc nền ambient piano/library tạo bằng Web Audio API (không cần file)
 * ✦ pdfjs-dist 5.x: render từng trang PDF ra canvas → hiệu ứng flip chính xác
 *
 * Props:
 *   pdfUrl   — URL PDF (GCS / Google Drive / direct link)
 *   title    — tiêu đề hiển thị trên toolbar
 *   onClose  — callback đóng modal (tuỳ chọn)
 *   compact  — nhúng inline trong tab (không có close & fullscreen bar)
 */

import {
  useState, useEffect, useRef, useCallback, useMemo
} from 'react'
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  BookOpen, X, Loader2, AlertTriangle,
  Volume2, VolumeX,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── pdfjs ────────────────────────────────────────────────────────────────────
// Worker source từ CDN (tránh Vite worker bundling complexity)
let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const mod = await import('pdfjs-dist')
  mod.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`
  pdfjsLib = mod
  return mod
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PdfBookViewerProps {
  pdfUrl: string
  title?: string
  onClose?: () => void
  compact?: boolean
}

type FlipDir = 'forward' | 'backward' | null

// ─── Ambient music engine ─────────────────────────────────────────────────────
/**
 * Tạo nhạc nền piano/library ambient bằng Web Audio API.
 * Không cần file âm thanh ngoài — synthesize trực tiếp trên browser.
 */
class AmbientMusicEngine {
  private ctx: AudioContext | null = null
  private gainNode: GainNode | null = null
  private playing = false
  private timerId: ReturnType<typeof setTimeout> | null = null

  // Bộ hợp âm nhẹ nhàng: C major → F major → Am → G → lặp lại
  private readonly CHORD_PROG = [
    [261.63, 329.63, 392.00],   // C major
    [349.23, 440.00, 523.25],   // F major
    [220.00, 261.63, 329.63],   // A minor
    [196.00, 246.94, 293.66],   // G major
  ]
  private chordIdx = 0

  private async ensureCtx() {
    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContext()
      this.gainNode = this.ctx.createGain()
      this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime)
      this.gainNode.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  private playChord(freqs: number[]) {
    if (!this.ctx || !this.gainNode || !this.playing) return
    const now = this.ctx.currentTime
    const DURATION = 3.0  // giây mỗi hợp âm

    freqs.forEach(freq => {
      const osc = this.ctx!.createOscillator()
      const envGain = this.ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      // ADSR: attack 0.3s → sustain → release 1.0s
      envGain.gain.setValueAtTime(0, now)
      envGain.gain.linearRampToValueAtTime(0.07, now + 0.3)
      envGain.gain.setValueAtTime(0.06, now + DURATION - 1.0)
      envGain.gain.linearRampToValueAtTime(0, now + DURATION)
      osc.connect(envGain)
      envGain.connect(this.gainNode!)
      osc.start(now)
      osc.stop(now + DURATION)
    })

    // Thêm bass note 1 octave thấp hơn
    const bassFreq = freqs[0] / 2
    const bassOsc = this.ctx.createOscillator()
    const bassGain = this.ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(bassFreq, now)
    bassGain.gain.setValueAtTime(0, now)
    bassGain.gain.linearRampToValueAtTime(0.04, now + 0.5)
    bassGain.gain.setValueAtTime(0.03, now + DURATION - 1.2)
    bassGain.gain.linearRampToValueAtTime(0, now + DURATION)
    bassOsc.connect(bassGain)
    bassGain.connect(this.gainNode!)
    bassOsc.start(now)
    bassOsc.stop(now + DURATION)
  }

  private scheduleNext() {
    if (!this.playing) return
    const chord = this.CHORD_PROG[this.chordIdx % this.CHORD_PROG.length]
    this.playChord(chord)
    this.chordIdx++
    this.timerId = setTimeout(() => this.scheduleNext(), 3200)
  }

  async start() {
    await this.ensureCtx()
    if (this.playing) return
    this.playing = true
    // Fade master in
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime)
      this.gainNode.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1)
    }
    this.scheduleNext()
  }

  pause() {
    this.playing = false
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null }
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.8)
    }
  }

  destroy() {
    this.pause()
    setTimeout(() => this.ctx?.close(), 1000)
  }
}

// ─── URL normalizer ───────────────────────────────────────────────────────────
function normalizePdfUrl(raw: string): string {
  const m1 = raw.match(/drive\.google\.com\/file\/d\/([^/?]+)/)
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`
  const m2 = raw.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return raw
}

function isGoogleDriveUrl(url: string) {
  return url.includes('drive.google.com')
}

// ─── Page renderer ─────────────────────────────────────────────────────────────
async function renderPageToDataUrl(
  pdf: import('pdfjs-dist').PDFDocumentProxy,
  pageNum: number,
  scale = 1.4,
): Promise<string> {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  // pdfjs-dist v5: primary API uses `canvas` (not canvasContext)
  await page.render({ canvas, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.88)
}

// ─── Flip Page (3D CSS) ───────────────────────────────────────────────────────
interface FlipPageProps {
  frontImg: string | null
  backImg: string | null
  isFlipping: boolean
  dir: FlipDir
  onAnimEnd: () => void
}
function FlipPage({ frontImg, backImg, isFlipping, dir, onAnimEnd }: FlipPageProps) {
  const angle = isFlipping ? (dir === 'forward' ? -180 : 180) : 0
  return (
    <div
      className="absolute inset-0"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        pointerEvents: isFlipping ? 'none' : 'auto',
        zIndex: isFlipping ? 20 : 1,
      }}
    >
      <div
        style={{
          width: '100%', height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg)`,
          transition: isFlipping ? 'transform 0.55s cubic-bezier(0.645, 0.045, 0.355, 1.000)' : 'none',
        }}
        onTransitionEnd={onAnimEnd}
      >
        {/* Front face */}
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          {frontImg
            ? <img src={frontImg} className="w-full h-full object-contain" draggable={false} />
            : <PagePlaceholder />}
        </div>
        {/* Back face */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        }}>
          {backImg
            ? <img src={backImg} className="w-full h-full object-contain" draggable={false} />
            : <PagePlaceholder />}
        </div>
      </div>
    </div>
  )
}

function PagePlaceholder() {
  return (
    <div className="w-full h-full bg-[#fef9f0] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-amber-300/50 animate-spin" />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PdfBookViewer({
  pdfUrl, title, onClose, compact = false,
}: PdfBookViewerProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [pdf, setPdf] = useState<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Rendered page cache: pageNum → dataUrl
  const pageCache = useRef<Map<number, string>>(new Map())

  // Current page: 1-indexed
  const [curPage, setCurPage] = useState(1)

  // For the flip animation
  const [flipDir, setFlipDir] = useState<FlipDir>(null)
  const [isFlipping, setIsFlipping] = useState(false)
  // Pages displayed on the "stage" during animation
  const [stagePages, setStagePages] = useState<{
    leftOld: string|null; rightOld: string|null;
    leftNew: string|null; rightNew: string|null;
  }>({ leftOld: null, rightOld: null, leftNew: null, rightNew: null })
  const [visibleImgs, setVisibleImgs] = useState<{ left: string|null; right: string|null }>({
    left: null, right: null,
  })

  // UI
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [musicOn, setMusicOn] = useState(false)
  const [musicReady, setMusicReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Touch / swipe
  const touchStartX = useRef<number | null>(null)

  // Music engine (singleton per mount)
  const musicEngine = useRef<AmbientMusicEngine | null>(null)

  const isGdrive = isGoogleDriveUrl(normalizePdfUrl(pdfUrl))

  // ── PDF load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    pageCache.current.clear()
    setCurPage(1)

    if (isGdrive) {
      // Google Drive: fallback to iframe mode
      setLoading(false)
      setTotalPages(0)
      return
    }

    ;(async () => {
      try {
        const pdfjs = await getPdfjs()
        const doc = await pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
        }).promise
        if (cancelled) return
        setPdf(doc)
        setTotalPages(doc.numPages)
        setLoading(false)
        // Pre-render first 4 pages
        const toPrerender = Math.min(4, doc.numPages)
        for (let i = 1; i <= toPrerender; i++) {
          const dataUrl = await renderPageToDataUrl(doc, i)
          if (cancelled) return
          pageCache.current.set(i, dataUrl)
        }
        updateVisibleImgs(1, doc.numPages, isMobile)
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError((e as Error).message || 'Không thể tải PDF')
          setLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [pdfUrl])

  // ── Pre-render ahead ────────────────────────────────────────────────────
  const prerender = useCallback(async (page: number, docRef: typeof pdf) => {
    if (!docRef) return
    const pages = isMobile
      ? [page - 1, page, page + 1, page + 2]
      : [page - 2, page - 1, page, page + 1, page + 2, page + 3]
    for (const p of pages) {
      if (p >= 1 && p <= docRef.numPages && !pageCache.current.has(p)) {
        try {
          const url = await renderPageToDataUrl(docRef, p)
          pageCache.current.set(p, url)
        } catch { /* ignore */ }
      }
    }
  }, [isMobile])

  // ── Update visible images ────────────────────────────────────────────────
  const updateVisibleImgs = useCallback((page: number, total: number, mobile: boolean) => {
    if (mobile) {
      setVisibleImgs({
        left: pageCache.current.get(page) ?? null,
        right: null,
      })
    } else {
      // Desktop: spread pages (left = even, right = odd) OR (left = page, right = page+1)
      // Treat first page as cover (right page only)
      if (page === 1) {
        setVisibleImgs({ left: null, right: pageCache.current.get(1) ?? null })
      } else {
        const leftP = page % 2 === 0 ? page : page - 1
        const rightP = leftP + 1
        setVisibleImgs({
          left: leftP <= total ? (pageCache.current.get(leftP) ?? null) : null,
          right: rightP <= total ? (pageCache.current.get(rightP) ?? null) : null,
        })
      }
    }
  }, [])

  useEffect(() => {
    if (pdf) {
      updateVisibleImgs(curPage, totalPages, isMobile)
      prerender(curPage, pdf)
    }
  }, [curPage, pdf, totalPages, isMobile])

  // ── Responsive ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (pdf) updateVisibleImgs(curPage, totalPages, mobile)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [curPage, pdf, totalPages])

  // ── Fullscreen ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const enterFs = () => containerRef.current?.requestFullscreen?.().catch(() => {})
  const exitFs  = () => document.exitFullscreen?.().catch(() => {})

  // ── Music ────────────────────────────────────────────────────────────────
  const toggleMusic = useCallback(async () => {
    if (!musicEngine.current) {
      musicEngine.current = new AmbientMusicEngine()
      setMusicReady(true)
    }
    if (musicOn) {
      musicEngine.current.pause()
      setMusicOn(false)
    } else {
      await musicEngine.current.start()
      setMusicOn(true)
    }
  }, [musicOn])

  useEffect(() => {
    return () => musicEngine.current?.destroy()
  }, [])

  // ── Navigation ────────────────────────────────────────────────────────────
  const canGoBack = curPage > 1
  const canGoNext = totalPages > 0 ? curPage < totalPages : true

  const navigateTo = useCallback(async (newPage: number, dir: FlipDir) => {
    if (isFlipping || !pdf) return
    const clamped = Math.max(1, Math.min(totalPages, newPage))
    if (clamped === curPage) return

    // Ensure target pages are rendered
    await prerender(clamped, pdf)
    // Ensure current pages also cached
    await prerender(curPage, pdf)

    const getImg = (p: number) => pageCache.current.get(p) ?? null

    if (isMobile) {
      setIsFlipping(true)
      setFlipDir(dir)
      setStagePages({
        leftOld: getImg(curPage),
        rightOld: null,
        leftNew: getImg(clamped),
        rightNew: null,
      })
    } else {
      const calcSpread = (p: number) => {
        if (p === 1) return { left: null, right: getImg(1) }
        const lp = p % 2 === 0 ? p : p - 1
        return { left: getImg(lp), right: getImg(lp + 1) }
      }
      const oldSpread = calcSpread(curPage)
      const newSpread = calcSpread(clamped)
      setIsFlipping(true)
      setFlipDir(dir)
      setStagePages({
        leftOld: oldSpread.left, rightOld: oldSpread.right,
        leftNew: newSpread.left, rightNew: newSpread.right,
      })
    }

    setCurPage(clamped)
  }, [isFlipping, pdf, curPage, totalPages, isMobile, prerender])

  const goNext = useCallback(() => {
    if (!pdf) return
    const step = isMobile ? 1 : 2
    navigateTo(curPage + step, 'forward')
  }, [pdf, curPage, isMobile, navigateTo])

  const goPrev = useCallback(() => {
    if (!pdf) return
    const step = isMobile ? 1 : 2
    navigateTo(curPage - step, 'backward')
  }, [pdf, curPage, isMobile, navigateTo])

  const onFlipEnd = useCallback(() => {
    setIsFlipping(false)
    setFlipDir(null)
  }, [])

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrev() }
      else if (e.key === 'Escape' && isFullscreen) exitFs()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, isFullscreen])

  // ── Touch / Swipe ─────────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else goPrev()
  }

  // ── Page display ──────────────────────────────────────────────────────────
  // What to show in the "static" behind-animation layer
  const displayLeft  = isFlipping ? stagePages.leftNew : visibleImgs.left
  const displayRight = isFlipping ? stagePages.rightNew : visibleImgs.right

  // ── Spread page label ─────────────────────────────────────────────────────
  const spreadLabel = useMemo(() => {
    if (isMobile || !totalPages) return `Trang ${curPage}`
    if (curPage === 1) return `Trang bìa`
    const lp = curPage % 2 === 0 ? curPage : curPage - 1
    const rp = lp + 1
    if (rp <= totalPages) return `Trang ${lp} – ${rp} / ${totalPages}`
    return `Trang ${lp} / ${totalPages}`
  }, [curPage, totalPages, isMobile])

  // ── GDrive fallback ───────────────────────────────────────────────────────
  if (isGdrive) {
    return <GDriveFallback url={normalizePdfUrl(pdfUrl)} title={title} onClose={onClose} />
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-900 rounded-2xl text-white min-h-[300px]">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-red-300 text-center max-w-xs">{loadError}</p>
        <p className="text-xs text-white/40 break-all max-w-xs text-center">{pdfUrl}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col select-none overflow-hidden',
        isFullscreen
          ? 'fixed inset-0 z-[9999]'
          : 'w-full rounded-2xl border border-white/10',
        'bg-[#1a1208]',   // warm dark wood bookshelf color
      )}
      style={{ minHeight: compact ? 480 : 560 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ═══════════════════ TOOLBAR ═══════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#2a1f10] border-b border-amber-900/30 flex-shrink-0 z-10">
        <BookOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-100/80 flex-1 truncate min-w-0">
          {title ?? 'Sách giáo trình'}
        </span>

        {/* Page label */}
        {totalPages > 0 && (
          <span className="text-[10px] text-amber-300/60 hidden sm:block flex-shrink-0">
            {spreadLabel}
          </span>
        )}

        {/* Music toggle */}
        <button
          onClick={toggleMusic}
          title={musicOn ? 'Tắt nhạc nền' : 'Bật nhạc nền thư viện'}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg transition-all',
            musicOn
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
              : 'text-white/30 hover:text-amber-400 hover:bg-amber-500/10',
          )}
        >
          {musicOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen */}
        {!compact && (
          <button
            onClick={isFullscreen ? exitFs : enterFs}
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ═══════════════════ BOOK STAGE ════════════════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse at center, #2d1f0e 0%, #120c04 100%)',
          padding: isMobile ? '12px 8px' : '20px 32px',
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs text-amber-300/60">Đang tải sách...</p>
          </div>
        ) : (
          /* ── Book object ── */
          <div
            className="relative flex"
            style={{
              maxWidth: isMobile ? '100%' : '880px',
              width: '100%',
              height: isFullscreen
                ? (isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 130px)')
                : (isMobile ? '420px' : '540px'),
              filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.8))',
            }}
          >
            {isMobile ? (
              /* ═══ MOBILE: single page ═══════════════════════════════════ */
              <div
                className="relative flex-1 rounded-sm overflow-hidden"
                style={{
                  background: '#fef9f0',
                  boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.15), 4px 0 8px rgba(0,0,0,0.2)',
                }}
              >
                {/* Static bg page */}
                {displayLeft && (
                  <img
                    src={displayLeft}
                    className="absolute inset-0 w-full h-full object-contain"
                    draggable={false}
                  />
                )}

                {/* Flip animation overlay */}
                {isFlipping && (
                  <FlipPage
                    frontImg={stagePages.leftOld}
                    backImg={stagePages.leftNew}
                    isFlipping={isFlipping}
                    dir={flipDir}
                    onAnimEnd={onFlipEnd}
                  />
                )}

                {/* iOS-style page curl shadow (bottom right) */}
                <div
                  className="absolute bottom-0 right-0 pointer-events-none"
                  style={{
                    width: 40, height: 40,
                    background: 'radial-gradient(circle at 100% 100%, rgba(0,0,0,0.18) 0%, transparent 70%)',
                  }}
                />
              </div>
            ) : (
              /* ═══ DESKTOP: 2-page spread ════════════════════════════════ */
              <div className="relative flex w-full h-full">
                {/* Left page */}
                <div
                  className="relative flex-1 overflow-hidden"
                  style={{
                    background: '#f5efe4',
                    borderRadius: '4px 0 0 4px',
                    boxShadow: 'inset -6px 0 12px rgba(0,0,0,0.12)',
                  }}
                >
                  {displayLeft ? (
                    <img src={displayLeft} className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                  ) : (
                    /* Cover / blank left page */
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center opacity-30">
                        <BookOpen className="w-12 h-12 text-amber-800 mx-auto mb-2" />
                        <p className="text-xs text-amber-900">Bìa sách</p>
                      </div>
                    </div>
                  )}

                  {/* Left page edge shadow */}
                  <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none"
                    style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.08), transparent)' }} />
                </div>

                {/* ── Center spine ── */}
                <div
                  className="w-4 flex-shrink-0 relative"
                  style={{
                    background: 'linear-gradient(to right, #5c3d1a, #8b6035, #c8965a, #8b6035, #5c3d1a)',
                    boxShadow: '0 0 16px rgba(0,0,0,0.6)',
                    zIndex: 5,
                  }}
                >
                  {/* Spine highlight */}
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-amber-300/20" />
                </div>

                {/* Right page */}
                <div
                  className="relative flex-1 overflow-hidden"
                  style={{
                    background: '#fef9f0',
                    borderRadius: '0 4px 4px 0',
                    boxShadow: 'inset 6px 0 12px rgba(0,0,0,0.08)',
                  }}
                >
                  {displayRight ? (
                    <img src={displayRight} className="absolute inset-0 w-full h-full object-contain" draggable={false} />
                  ) : (
                    <div className="w-full h-full bg-[#fef9f0]" />
                  )}

                  {/* Right page edge shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none"
                    style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.06), transparent)' }} />
                </div>

                {/* Flip animation — forward: covers right page sweeping left */}
                {isFlipping && (
                  <div
                    className="absolute right-0 top-0"
                    style={{
                      width: '50%', height: '100%',
                      transformOrigin: 'left center',
                      perspective: '1200px',
                      zIndex: 20,
                    }}
                  >
                    <div
                      style={{
                        width: '100%', height: '100%',
                        transformStyle: 'preserve-3d',
                        transform: `rotateY(${isFlipping && flipDir === 'forward' ? -180 : 0}deg)`,
                        transition: 'transform 0.55s cubic-bezier(0.645, 0.045, 0.355, 1.000)',
                      }}
                      onTransitionEnd={onFlipEnd}
                    >
                      {/* Front = old right page */}
                      <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: '#fef9f0' }}>
                        {stagePages.rightOld && (
                          <img src={stagePages.rightOld} className="w-full h-full object-contain" draggable={false} />
                        )}
                      </div>
                      {/* Back = new left page (revealed after flip) */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: '#f5efe4',
                      }}>
                        {stagePages.leftNew && (
                          <img src={stagePages.leftNew} className="w-full h-full object-contain" draggable={false} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Outer book shadow frames */}
                <div className="absolute inset-0 pointer-events-none rounded-sm"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(139,96,53,0.2)' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════ BOTTOM NAV ════════════════════════════════════ */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[#2a1f10]/80 border-t border-amber-900/30 flex-shrink-0">
        {/* Prev */}
        <button
          onClick={goPrev}
          disabled={!canGoBack || isFlipping}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            canGoBack && !isFlipping
              ? 'bg-amber-800/40 hover:bg-amber-700/50 text-amber-200 border border-amber-700/30'
              : 'opacity-30 text-amber-800 cursor-not-allowed bg-transparent border border-transparent',
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {isMobile ? '' : 'Trang trước'}
        </button>

        {/* Center info */}
        <div className="flex items-center gap-2">
          {totalPages > 0 && (
            <span className="text-[10px] text-amber-400/60 block sm:hidden">{spreadLabel}</span>
          )}
          {/* Music wave animation when playing */}
          {musicOn && (
            <div className="flex items-end gap-[2px] h-3">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="w-[2px] bg-amber-400/60 rounded-full"
                  style={{
                    height: `${[8, 12, 6, 10][i]}px`,
                    animation: `musicPulse${i} 0.8s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}
          {/* Keyboard hint — desktop only */}
          <span className="hidden md:flex items-center gap-1 text-[9px] text-amber-900/60">
            <kbd className="px-1 rounded bg-amber-900/30 font-mono">←</kbd>
            <span>/</span>
            <kbd className="px-1 rounded bg-amber-900/30 font-mono">→</kbd>
          </span>
        </div>

        {/* Next */}
        <button
          onClick={goNext}
          disabled={!canGoNext || isFlipping}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            canGoNext && !isFlipping
              ? 'bg-amber-800/40 hover:bg-amber-700/50 text-amber-200 border border-amber-700/30'
              : 'opacity-30 text-amber-800 cursor-not-allowed bg-transparent border border-transparent',
          )}
        >
          {isMobile ? '' : 'Trang tiếp'}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Music pulse animation keyframes */}
      <style>{`
        @keyframes musicPulse0 { from{height:4px} to{height:10px} }
        @keyframes musicPulse1 { from{height:8px} to{height:14px} }
        @keyframes musicPulse2 { from{height:3px} to{height:9px} }
        @keyframes musicPulse3 { from{height:6px} to{height:12px} }
      `}</style>
    </div>
  )
}

// ─── Google Drive fallback ────────────────────────────────────────────────────
function GDriveFallback({
  url, title, onClose,
}: { url: string; title?: string; onClose?: () => void }) {
  const [musicOn, setMusicOn] = useState(false)
  const engine = useRef<AmbientMusicEngine | null>(null)
  const toggleMusic = async () => {
    if (!engine.current) engine.current = new AmbientMusicEngine()
    if (musicOn) { engine.current.pause(); setMusicOn(false) }
    else { await engine.current.start(); setMusicOn(true) }
  }
  useEffect(() => () => engine.current?.destroy(), [])

  return (
    <div className="flex flex-col bg-[#1a1208] rounded-2xl overflow-hidden border border-amber-900/20" style={{ minHeight: 540 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#2a1f10] border-b border-amber-900/30">
        <BookOpen className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-amber-100/80 flex-1 truncate">{title ?? 'Sách PDF'}</span>
        <button
          onClick={toggleMusic}
          className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all',
            musicOn ? 'bg-amber-500/20 text-amber-400' : 'text-white/30 hover:text-amber-400 hover:bg-amber-500/10')}
        >
          {musicOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Iframe */}
      <div className="flex-1 relative" style={{ minHeight: 460 }}>
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full border-0"
          title={title ?? 'PDF Sách'}
          allow="fullscreen"
        />
      </div>

      {/* Bottom hint */}
      <div className="px-4 py-2 bg-[#2a1f10]/80 border-t border-amber-900/30 text-center">
        <p className="text-[10px] text-amber-900/60">Hiển thị qua Google Drive Viewer</p>
      </div>
    </div>
  )
}
