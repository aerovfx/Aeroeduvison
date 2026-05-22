/**
 * PdfRefViewer — Khung xem PDF tham chiếu khi nhập đáp án.
 *
 * Dùng trong /teacher/exam-grading tab "① Nhập đáp án":
 *   - GV upload file PDF đề thi
 *   - Display ở bên trái (sticky) để vừa xem đề vừa điền đáp án bên phải
 *   - Hỗ trợ zoom THỰC SỰ (CSS transform), fullscreen, đổi file
 *   - PERSIST QUA F5: lưu Blob vào IndexedDB, auto-restore khi reload
 *
 * Stack: native iframe (browser PDF viewer) — không cần PDF.js dep.
 *
 * Zoom mechanism (2026-05-20 REDESIGN v2):
 *   - URL fragment `#zoom=NNN` cũ KHÔNG đảm bảo visible cross-browser
 *     (Chrome PDFium tự reset khi load, Firefox chỉ apply 1 lần, Safari
 *     hoàn toàn ignore) → user phản hồi "phóng to không đạt yêu cầu".
 *   - GIẢI PHÁP: CSS transform: scale() trên iframe wrapper
 *     → zoom THẬT, hoạt động đồng nhất Chrome/Firefox/Safari/Edge
 *     → wrapper overflow:auto cho phép scroll khi zoom > 100%
 *     → calc(100% / scale) giữ tỷ lệ iframe đúng container
 *   - UX cho GV lớn tuổi:
 *     · Buttons 40px (gần touch target)
 *     · Label tiếng Việt rõ ràng "Phóng to", "Thu nhỏ", "Đặt lại"
 *     · Display % zoom hiện tại ở giữa, font cỡ to
 *     · Ctrl/Cmd + scroll wheel để zoom (PWA pattern)
 *     · Ctrl/Cmd + / - keyboard shortcut
 *
 * Persistence:
 *   - savePdf(storageKey, file) ngay khi user upload
 *   - loadPdf(storageKey) on mount → restore Blob → tạo lại Object URL
 *   - deletePdf(storageKey) khi user bấm ✕
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Upload, X, Maximize2, Minimize2, FileText, ExternalLink, RotateCw,
  ZoomIn, ZoomOut, Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { savePdf, loadPdf, deletePdf } from '@/lib/pdfStorage'

interface Props {
  /** Initial file name hint hiển thị khi chưa upload */
  hint?: string
  /** Compact mode — giảm height, dùng cho mobile/narrow column */
  compact?: boolean
  /**
   * IndexedDB storage key để persist PDF qua F5.
   * Mỗi instance dùng key riêng (vd: 'exam-grading-ref') để tránh xung đột.
   * Truyền null hoặc không truyền → KHÔNG persist (behavior cũ).
   */
  storageKey?: string | null
}

/* 2026-05-20 v2: zoom giờ là số nguyên 50..1000 (% scale).
   CSS transform: scale() hoạt động tốt với mọi giá trị,
   không còn dùng URL fragment hay 'page-width' keywords. */
const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200, 300, 400, 500, 600, 800, 1000] as const
const ZOOM_MIN = 25
const ZOOM_MAX = 1000
const ZOOM_DEFAULT = 100

export function PdfRefViewer({ hint = 'đề thi PDF', compact = false, storageKey = null }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<number>(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)  // bump để force reload iframe
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT)
  const scrollRef = useRef<HTMLDivElement>(null)
  /* 2026-05-20: trạng thái restoring để show spinner khi đọc IndexedDB */
  const [restoring, setRestoring] = useState<boolean>(!!storageKey)
  const inputRef = useRef<HTMLInputElement>(null)

  /* On mount: nếu có storageKey, thử restore PDF từ IndexedDB.
     User F5 / quay lại tab → PDF tự load lại không cần upload lại. */
  useEffect(() => {
    if (!storageKey) {
      setRestoring(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const entry = await loadPdf(storageKey)
        if (cancelled || !entry) {
          setRestoring(false)
          return
        }
        const url = URL.createObjectURL(entry.blob)
        setPdfUrl(url)
        setFileName(entry.filename)
        setFileSize(entry.size)
        setIframeKey(k => k + 1)
        console.log(`[PdfRefViewer] ✓ restored "${entry.filename}" (${(entry.size/1024).toFixed(0)} KB) từ IndexedDB`)
      } catch (e) {
        console.warn('[PdfRefViewer] restore failed:', e)
      } finally {
        if (!cancelled) setRestoring(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // Cleanup blob URL khi unmount hoặc đổi file
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFile = useCallback((f: File | undefined | null) => {
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Chỉ chấp nhận file PDF')
      return
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('File PDF tối đa 50MB')
      return
    }
    // Revoke URL cũ trước khi tạo mới
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    const url = URL.createObjectURL(f)
    setPdfUrl(url)
    setFileName(f.name)
    setFileSize(f.size)
    setIframeKey(k => k + 1)
    /* Persist vào IndexedDB — không await để UI mở PDF ngay,
       lưu chạy background. Lỗi (vượt quota) chỉ warn không block. */
    if (storageKey) {
      savePdf(storageKey, f, f.name)
        .then(() => console.log(`[PdfRefViewer] ✓ saved "${f.name}" → IndexedDB key=${storageKey}`))
        .catch(e => {
          console.warn('[PdfRefViewer] save failed:', e)
          toast(`⚠️ Không lưu được vào trình duyệt (sẽ mất khi F5): ${e.message}`, { duration: 5000 })
        })
    }
    toast.success(`Đã mở: ${f.name}${storageKey ? ' (đã lưu phiên)' : ''}`)
  }, [pdfUrl, storageKey])

  const onPickFile = () => inputRef.current?.click()

  const removePdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfUrl(null)
    setFileName('')
    setFileSize(0)
    /* Xoá khỏi IndexedDB để F5 không restore lại */
    if (storageKey) {
      deletePdf(storageKey).catch(e => console.warn('[PdfRefViewer] delete failed:', e))
    }
  }

  const reloadPdf = () => setIframeKey(k => k + 1)

  /* Zoom step: tìm preset kế tiếp/trước đó. Giữ trong [25..1000]. */
  const zoomIn = useCallback(() => {
    setZoom(prev => {
      const next = ZOOM_PRESETS.find(z => z > prev)
      return Math.min(ZOOM_MAX, next ?? prev + 25)
    })
  }, [])
  const zoomOut = useCallback(() => {
    setZoom(prev => {
      const candidates = ZOOM_PRESETS.filter(z => z < prev)
      const next = candidates[candidates.length - 1]
      return Math.max(ZOOM_MIN, next ?? prev - 25)
    })
  }, [])
  const resetZoom = useCallback(() => setZoom(ZOOM_DEFAULT), [])

  /* iframe src — KHÔNG còn dùng URL fragment, zoom xử lý bằng CSS transform.
     Giữ Object URL nguyên xi để browser cache PDF. */
  const iframeSrc = pdfUrl ?? ''

  /* Ctrl/Cmd + scroll wheel = zoom (standard zoom UX).
     Pattern phổ biến trong PWA + native apps.
     Preventdefault để ngăn browser zoom toàn trang. */
  useEffect(() => {
    if (!pdfUrl) return
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return  // chỉ zoom khi nhấn Ctrl/Cmd
      e.preventDefault()
      // Wheel up = zoom in, down = zoom out
      if (e.deltaY < 0) zoomIn()
      else zoomOut()
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [pdfUrl, zoomIn, zoomOut])

  /* Ctrl/Cmd + (+/=/-/0) keyboard shortcuts khi PDF được focus.
     Apple HIG + Microsoft Fluent conventions. */
  useEffect(() => {
    if (!pdfUrl) return
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut() }
      else if (e.key === '0') { e.preventDefault(); resetZoom() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pdfUrl, zoomIn, zoomOut, resetZoom])

  /* Scale factor for CSS transform — clamped to [0.25, 10] */
  const scaleFactor = Math.max(0.25, Math.min(10, zoom / 100))

  // Esc đóng fullscreen
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [fullscreen])

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 100, background: 'hsl(var(--background))' }
    : { display: 'flex', flexDirection: 'column', height: '100%' }

  return (
    <div style={containerStyle} className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {pdfUrl ? (
            <>
              <p className="text-xs font-semibold text-foreground truncate" title={fileName}>
                {fileName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {(fileSize / 1024).toFixed(0)} KB · PDF đề tham chiếu
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-foreground">📑 Xem {hint} song song</p>
          )}
        </div>
        {pdfUrl && (
          <>
            {/* ── Zoom controls — large + label cho GV lớn tuổi ───── */}
            <div className="flex items-center gap-1 rounded-lg border-2 bg-background p-0.5 shadow-sm">
              <button
                onClick={zoomOut}
                title="Thu nhỏ (Ctrl + Trừ)"
                disabled={zoom <= ZOOM_MIN}
                className="inline-flex items-center gap-1 px-2.5 h-9 rounded-md hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition"
              >
                <ZoomOut className="w-4 h-4" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </button>
              {/* Current % — clickable to pick preset */}
              <select
                value={String(zoom)}
                onChange={e => setZoom(Number(e.target.value))}
                title="Chọn mức phóng to"
                className="h-9 px-2 text-sm font-bold bg-transparent border-none focus:outline-none cursor-pointer text-foreground tabular-nums text-center"
                style={{ minWidth: 76 }}
              >
                {/* Show current value first if not in presets */}
                {!ZOOM_PRESETS.includes(zoom as any) && (
                  <option value={zoom}>{zoom}%</option>
                )}
                {ZOOM_PRESETS.map(z => (
                  <option key={z} value={z}>{z}%</option>
                ))}
              </select>
              <button
                onClick={zoomIn}
                title="Phóng to (Ctrl + Cộng)"
                disabled={zoom >= ZOOM_MAX}
                className="inline-flex items-center gap-1 px-2.5 h-9 rounded-md hover:bg-accent text-foreground disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">Phóng to</span>
              </button>
              {zoom !== ZOOM_DEFAULT && (
                <button
                  onClick={resetZoom}
                  title="Đặt lại 100% (Ctrl + 0)"
                  className="inline-flex items-center gap-1 px-2.5 h-9 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-xs transition border-l"
                >
                  100%
                </button>
              )}
            </div>

            <button
              onClick={reloadPdf}
              title="Tải lại"
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở tab mới"
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setFullscreen(v => !v)}
              title={fullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình'}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={removePdf}
              title="Xoá PDF"
              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        {!pdfUrl && (
          <button
            onClick={onPickFile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5" /> Upload PDF
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />

      {/* Body */}
      <div className="flex-1 min-h-0 relative">
        {restoring ? (
          // Đang restore từ IndexedDB sau F5
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 text-center"
            style={{ minHeight: compact ? 400 : 600 }}
          >
            <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
            <p className="text-sm text-muted-foreground">
              Đang khôi phục PDF từ phiên trước...
            </p>
          </div>
        ) : pdfUrl ? (
          /* 🔍 ZOOM CONTAINER — CSS transform: scale() trên iframe wrapper.
             Strategy:
             - scrollRef: overflow:auto cho phép scroll khi zoom > 100%
             - Inner div: width/height = 100% / scale (làm wrapper bự lên
               sao cho sau khi scale × scaleFactor = 100% × 100% × scale)
             - iframe: width/height = 100% (unscaled), transform: scale
               → visual size = scaleFactor × 100% (đủ rộng để scrollbar
               xuất hiện và user thấy nội dung lớn hơn)
             - Cursor: chỉ dẫn user dùng Ctrl+scroll để zoom */
          <div
            ref={scrollRef}
            className="w-full h-full overflow-auto"
            style={{ minHeight: compact ? 400 : 600 }}
          >
            <div
              style={{
                width: `${100 * scaleFactor}%`,
                height: `${100 * scaleFactor}%`,
                minHeight: (compact ? 400 : 600) * scaleFactor,
              }}
            >
              <iframe
                key={iframeKey}
                src={iframeSrc}
                title="Đề thi PDF"
                style={{
                  border: 'none',
                  display: 'block',
                  width: `${100 / scaleFactor}%`,
                  height: `${100 / scaleFactor}%`,
                  minHeight: compact ? 400 : 600,
                  transform: `scale(${scaleFactor})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          </div>
        ) : (
          // Drop zone
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files?.[0])
            }}
            onClick={onPickFile}
            className={`flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors p-8 text-center ${
              dragOver ? 'bg-purple-100 dark:bg-purple-900/20' : ''
            }`}
            style={{ minHeight: compact ? 400 : 600 }}
          >
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Upload className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Kéo-thả file PDF vào đây
              </p>
              <p className="text-xs text-muted-foreground">
                hoặc click để chọn file ({hint}, ≤ 50MB)
              </p>
            </div>
            <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 text-[11px] text-amber-900 dark:text-amber-200 max-w-xs">
              <strong>💡 Mẹo:</strong> Upload PDF đề thi để vừa xem đề vừa nhập đáp án bên phải.
              {storageKey && <> File <strong>tự lưu trong trình duyệt</strong> — F5 không mất.</>}
            </div>
          </div>
        )}
      </div>

      {/* Footer hướng dẫn zoom — chỉ hiện khi có PDF mở */}
      {pdfUrl && !fullscreen && (
        <div className="px-3 py-1.5 border-t bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-center gap-4 shrink-0 flex-wrap">
          <span>
            💡 <strong>Mẹo:</strong> Giữ <kbd className="px-1.5 py-0.5 rounded bg-card border font-mono text-[10px]">Ctrl</kbd> + lăn chuột để phóng to/thu nhỏ
          </span>
          <span className="hidden md:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-card border font-mono text-[10px]">Ctrl</kbd>
            +
            <kbd className="px-1.5 py-0.5 rounded bg-card border font-mono text-[10px]">+</kbd>
            /
            <kbd className="px-1.5 py-0.5 rounded bg-card border font-mono text-[10px]">−</kbd>
            /
            <kbd className="px-1.5 py-0.5 rounded bg-card border font-mono text-[10px]">0</kbd>
          </span>
        </div>
      )}

      {/* Footer khi fullscreen — nút Esc */}
      {fullscreen && (
        <div className="px-3 py-2 border-t bg-muted/30 text-center text-xs text-muted-foreground shrink-0">
          Nhấn <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono">Esc</kbd> để thoát toàn màn hình
        </div>
      )}
    </div>
  )
}

export default PdfRefViewer
