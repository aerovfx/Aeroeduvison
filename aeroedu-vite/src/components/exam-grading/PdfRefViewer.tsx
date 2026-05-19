/**
 * PdfRefViewer — Khung xem PDF tham chiếu khi nhập đáp án.
 *
 * Dùng trong /teacher/exam-grading tab "① Nhập đáp án":
 *   - GV upload file PDF đề thi
 *   - Display ở bên trái (sticky) để vừa xem đề vừa điền đáp án bên phải
 *   - Hỗ trợ zoom (in/out + preset levels + fit), fullscreen, đổi file
 *   - 🆕 PERSIST QUA F5: lưu Blob vào IndexedDB, auto-restore khi reload
 *
 * Stack: native iframe (browser PDF viewer) — không cần PDF.js dep.
 *   Pros: zero deps, hoạt động trên Chrome/Edge/Safari/Firefox
 *   Cons: không tùy biến UI nhiều (browser quản render)
 *
 * Zoom mechanism: dùng URL fragment `#zoom=NNN` mà PDFium (Chrome/Edge)
 * + PDF.js (Firefox) hỗ trợ. Mỗi lần đổi zoom sẽ reload iframe.
 *
 * Persistence (2026-05-20):
 *   - savePdf(storageKey, file) ngay khi user upload
 *   - loadPdf(storageKey) on mount → restore Blob → tạo lại Object URL
 *   - deletePdf(storageKey) khi user bấm ✕
 *   IndexedDB quota multi-GB, an toàn cho PDF tới 50MB.
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

// Preset zoom levels — discrete steps để [+] [-] step qua dễ
// 'page-width' / 'page-fit' là keyword PDFium/PDF.js hiểu trực tiếp
type ZoomLevel = number | 'page-width' | 'page-fit'
const ZOOM_PRESETS: ZoomLevel[] = [50, 75, 100, 125, 150, 200, 300]

export function PdfRefViewer({ hint = 'đề thi PDF', compact = false, storageKey = null }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<number>(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)  // bump để force reload iframe
  const [zoom, setZoom] = useState<ZoomLevel>('page-width')
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

  /* Zoom helpers — dùng để map [+] / [-] qua preset numeric levels.
     Chỉ áp dụng khi zoom hiện tại là số; nếu đang là 'page-width' /
     'page-fit' thì step vào preset gần 100% nhất. */
  const zoomIn = () => {
    setZoom(prev => {
      const current = typeof prev === 'number' ? prev : 100
      const next = ZOOM_PRESETS.find(z => typeof z === 'number' && z > current) as number | undefined
      return next ?? ZOOM_PRESETS[ZOOM_PRESETS.length - 1] // max 300%
    })
  }
  const zoomOut = () => {
    setZoom(prev => {
      const current = typeof prev === 'number' ? prev : 100
      // Find largest preset < current
      const numericPresets = ZOOM_PRESETS.filter((z): z is number => typeof z === 'number')
      const candidates = numericPresets.filter(z => z < current)
      return candidates.length > 0 ? candidates[candidates.length - 1] : numericPresets[0] // min 50%
    })
  }

  /* Build iframe src với fragment `#zoom=` — Chrome/Edge dùng PDFium,
     Firefox dùng PDF.js, cả 2 đều hiểu syntax này. Safari có thể
     không support — sẽ degrade về default zoom. */
  const iframeSrc = useMemo(() => {
    if (!pdfUrl) return ''
    const zoomStr = typeof zoom === 'number' ? String(zoom) : zoom
    return `${pdfUrl}#zoom=${zoomStr}`
  }, [pdfUrl, zoom])

  /* Khi zoom thay đổi, force reload iframe để fragment được áp dụng
     (một số browser không re-render khi chỉ hash đổi). */
  useEffect(() => {
    if (pdfUrl) setIframeKey(k => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

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
            {/* ── Zoom controls ───────────────────────────────────── */}
            <div className="flex items-center gap-0.5 rounded-md border bg-background px-0.5">
              <button
                onClick={zoomOut}
                title="Thu nhỏ (zoom out)"
                disabled={typeof zoom === 'number' && zoom <= 50}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <select
                value={String(zoom)}
                onChange={e => {
                  const v = e.target.value
                  setZoom(v === 'page-width' || v === 'page-fit' ? v : Number(v))
                }}
                title="Mức phóng to"
                className="text-[11px] font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-foreground px-1 py-0.5"
                style={{ minWidth: 60 }}
              >
                <option value="page-width">Vừa rộng</option>
                <option value="page-fit">Vừa trang</option>
                {ZOOM_PRESETS.filter(z => typeof z === 'number').map(z => (
                  <option key={z} value={z}>{z}%</option>
                ))}
              </select>
              <button
                onClick={zoomIn}
                title="Phóng to (zoom in)"
                disabled={typeof zoom === 'number' && zoom >= 300}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
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
          <iframe
            key={iframeKey}
            src={iframeSrc}
            title="Đề thi PDF"
            className="w-full h-full"
            style={{ border: 'none', minHeight: compact ? 400 : 600 }}
          />
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
