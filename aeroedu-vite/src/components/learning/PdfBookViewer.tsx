/**
 * PdfBookViewer — hiển thị PDF dạng sách cho học sinh đọc trong khoá học
 *
 * Features:
 * - iframe-based PDF renderer (browser native)
 * - Book-frame UI: nền giấy ấm, shadow, spine trung tâm
 * - Điều hướng trang: Trước / Tiếp / sidebar số trang
 * - Zoom: 50% – 200%
 * - Fullscreen API
 * - In ấn
 * - Keyboard: ← → chuyển trang; Esc thoát fullscreen
 * - Google Drive URL auto-convert sang /preview
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Printer, X, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PdfBookViewerProps {
  pdfUrl: string
  title?: string
  onClose?: () => void
  /** Compact mode: ẩn sidebar thumbnail, phù hợp nhúng trong tab */
  compact?: boolean
}

/** Convert Google Drive share URL → embed preview URL */
function normalizeGoogleDriveUrl(url: string): string {
  // https://drive.google.com/file/d/FILE_ID/view → .../preview
  const m1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (m1) return `https://drive.google.com/file/d/${m1[1]}/preview`
  // https://drive.google.com/open?id=FILE_ID
  const m2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
  if (m2) return `https://drive.google.com/file/d/${m2[1]}/preview`
  return url
}

/** Tạo src cho iframe với page anchor */
function buildIframeSrc(rawUrl: string, page: number, zoom: number): string {
  const url = normalizeGoogleDriveUrl(rawUrl)
  // Google Drive preview không cần/support anchor #page
  if (url.includes('drive.google.com')) return url
  // Standard PDF: browser renderer accepts #page=N&zoom=X
  return `${url}#page=${page}&zoom=${zoom}&toolbar=0&navpanes=0&scrollbar=0`
}

export default function PdfBookViewer({ pdfUrl, title, onClose, compact = false }: PdfBookViewerProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages] = useState(50) // iframe không expose page count; dùng số mặc định cao
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ── Keyboard nav ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrentPage(p => p + 1)
      else if (e.key === 'ArrowLeft') setCurrentPage(p => Math.max(1, p - 1))
      else if (e.key === 'Escape' && isFullscreen) exitFs()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen])

  // ── Fullscreen API ────────────────────────────────────────
  const enterFs = useCallback(() => {
    containerRef.current?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
  }, [])
  const exitFs = useCallback(() => {
    document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
  }, [])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // ── Helpers ───────────────────────────────────────────────
  const goTo = (page: number) => setCurrentPage(Math.max(1, page))
  const zoomIn  = () => setZoom(z => Math.min(200, z + 25))
  const zoomOut = () => setZoom(z => Math.max(50, z - 25))
  const print = () => iframeRef.current?.contentWindow?.print()

  const isGdrive = pdfUrl.includes('drive.google.com')
  const iframeSrc = buildIframeSrc(pdfUrl, currentPage, zoom)

  // Thumbnail pages (1-20 cố định, chỉ scroll-jump khi click)
  const THUMBNAIL_COUNT = 20

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col bg-gray-900 text-white select-none',
        isFullscreen ? 'fixed inset-0 z-[9999]' : 'relative w-full rounded-2xl overflow-hidden border border-white/10',
      )}
      style={{ minHeight: compact ? '500px' : '600px' }}
    >
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        {/* Book icon + title */}
        <BookOpen className="w-5 h-5 text-amber-400 flex-shrink-0" />
        <span className="text-sm font-semibold text-white/90 flex-1 truncate min-w-0">
          {title || 'Sách giáo trình PDF'}
        </span>

        {/* Page nav */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
          <button
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 disabled:opacity-30 transition-colors"
            title="Trang trước (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-300 px-1.5 min-w-[60px] text-center">
            Tr. {currentPage}
            {isGdrive ? '' : ` / ?`}
          </span>
          <button
            onClick={() => goTo(currentPage + 1)}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 transition-colors"
            title="Trang tiếp (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
          <button
            onClick={zoomOut}
            disabled={zoom <= 50}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 disabled:opacity-30 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-300 px-1 min-w-[36px] text-center">{zoom}%</span>
          <button
            onClick={zoomIn}
            disabled={zoom >= 200}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-600 disabled:opacity-30 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Print */}
        <button
          onClick={print}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title="In tài liệu"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={isFullscreen ? exitFs : enterFs}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        >
          {isFullscreen
            ? <Minimize2 className="w-4 h-4" />
            : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Close button (if provided) */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Body: sidebar + book ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — page thumbnails (ẩn khi compact trên mobile) */}
        {!compact && (
          <div className="hidden md:flex flex-col w-16 bg-gray-800/80 border-r border-gray-700 overflow-y-auto flex-shrink-0">
            <div className="p-1 space-y-1">
              {Array.from({ length: THUMBNAIL_COUNT }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => goTo(n)}
                  className={cn(
                    'w-full aspect-[3/4] rounded text-xs font-medium transition-all flex items-center justify-center border',
                    currentPage === n
                      ? 'bg-amber-500/30 border-amber-400/60 text-amber-300'
                      : 'bg-gray-700/50 border-transparent hover:bg-gray-600/70 text-gray-400 hover:text-gray-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Book display area */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 p-4 overflow-auto">
          {/* Book frame */}
          <div
            className="relative flex rounded-sm overflow-hidden"
            style={{
              width: `${zoom}%`,
              maxWidth: '960px',
              minWidth: '280px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* Left page shadow (spine effect) */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent pointer-events-none z-10" />
            {/* Right page shadow */}
            <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-black/20 to-transparent pointer-events-none z-10" />
            {/* Center spine */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1.5 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.25), rgba(101,72,42,0.4), rgba(0,0,0,0.25))',
                boxShadow: '0 0 8px rgba(0,0,0,0.5)',
              }}
            />

            {/* PDF iframe */}
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title={title || 'PDF Book'}
              className="w-full border-0"
              style={{
                height: isFullscreen ? 'calc(100vh - 60px)' : '70vh',
                minHeight: '400px',
                background: '#fef9f0',
              }}
              allow="fullscreen"
            />
          </div>
        </div>
      </div>

      {/* ── Bottom nav bar — mobile-friendly ────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-t border-gray-700 flex-shrink-0">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Trang trước
        </button>

        <div className="text-xs text-gray-400 flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-mono text-[10px]">←</kbd>
          <span>chuyển trang</span>
          <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-mono text-[10px]">→</kbd>
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
        >
          Trang tiếp
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
