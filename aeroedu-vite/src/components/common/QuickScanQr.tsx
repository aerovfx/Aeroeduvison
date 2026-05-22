/**
 * QuickScanQr — Card QR dùng chung cho nhiều trang
 *
 * Mục đích: Học sinh quét QR bằng camera điện thoại để mở nhanh
 *   · Trang bài test hướng nghiệp
 *   · Thí nghiệm giả lập trong LabTwin
 *   · Danh sách / đề bài tập ôn thi
 *
 * Không thêm dependency — dùng api public qrserver.com để render PNG.
 * Tự động suy ra URL hiện tại khi không truyền `targetUrl`, rất tiện khi
 * nhúng vào từng trang con (ví dụ mỗi lab sẽ tự có QR của chính nó).
 */
import { useMemo, useState } from 'react'
import { Copy, CheckCircle, Download, QrCode, Smartphone, X, ExternalLink } from 'lucide-react'

interface QuickScanQrProps {
  /** URL đích (mặc định: window.location.href) */
  targetUrl?: string
  /** Tiêu đề card */
  title?: string
  /** Mô tả phụ dưới tiêu đề */
  description?: string
  /** Cường độ accent (gradient) */
  accent?: 'indigo' | 'cyan' | 'emerald' | 'fuchsia' | 'amber' | 'rose'
  /** Variant "banner" rộng hoặc "compact" nhỏ gọn */
  variant?: 'banner' | 'compact'
  /** Tên file PNG khi tải xuống */
  downloadName?: string
  className?: string
}

const ACCENT: Record<
  NonNullable<QuickScanQrProps['accent']>,
  { from: string; via: string; to: string; border: string; text: string; glow: string; btn: string }
> = {
  indigo: {
    from: 'from-[hsl(245,60%,14%)]/70',
    via: 'via-[hsl(265,65%,16%)]/70',
    to: 'to-[hsl(225,65%,14%)]/70',
    border: 'border-indigo-400/25',
    text: 'text-indigo-200',
    glow: 'shadow-[0_0_40px_rgba(99,102,241,0.25)]',
    btn: 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/30',
  },
  cyan: {
    from: 'from-[hsl(190,65%,12%)]/70',
    via: 'via-[hsl(200,60%,14%)]/70',
    to: 'to-[hsl(215,60%,13%)]/70',
    border: 'border-cyan-400/25',
    text: 'text-cyan-200',
    glow: 'shadow-[0_0_40px_rgba(34,211,238,0.25)]',
    btn: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30',
  },
  emerald: {
    from: 'from-[hsl(155,55%,12%)]/70',
    via: 'via-[hsl(170,55%,13%)]/70',
    to: 'to-[hsl(185,55%,13%)]/70',
    border: 'border-emerald-400/25',
    text: 'text-emerald-200',
    glow: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
    btn: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30',
  },
  fuchsia: {
    from: 'from-[hsl(295,55%,14%)]/70',
    via: 'via-[hsl(275,55%,14%)]/70',
    to: 'to-[hsl(250,55%,14%)]/70',
    border: 'border-fuchsia-400/25',
    text: 'text-fuchsia-200',
    glow: 'shadow-[0_0_40px_rgba(217,70,239,0.25)]',
    btn: 'bg-fuchsia-500/20 border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/30',
  },
  amber: {
    from: 'from-[hsl(30,60%,12%)]/70',
    via: 'via-[hsl(40,65%,13%)]/70',
    to: 'to-[hsl(20,60%,12%)]/70',
    border: 'border-amber-400/25',
    text: 'text-amber-200',
    glow: 'shadow-[0_0_40px_rgba(245,158,11,0.25)]',
    btn: 'bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30',
  },
  rose: {
    from: 'from-[hsl(345,60%,13%)]/70',
    via: 'via-[hsl(330,55%,13%)]/70',
    to: 'to-[hsl(10,60%,13%)]/70',
    border: 'border-rose-400/25',
    text: 'text-rose-200',
    glow: 'shadow-[0_0_40px_rgba(244,63,94,0.25)]',
    btn: 'bg-rose-500/20 border-rose-400/40 text-rose-200 hover:bg-rose-500/30',
  },
}

function buildQrUrl(url: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    url,
  )}`
}

/** Tải ảnh cross-origin về máy dùng fetch → blob → object URL.
 *  Fallback: mở tab mới nếu CORS thất bại. */
async function downloadQrImage(src: string, filename: string) {
  try {
    const resp = await fetch(src)
    const blob = await resp.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
  } catch {
    window.open(src, '_blank', 'noopener')
  }
}

export function QuickScanQr({
  targetUrl,
  title = 'Mở nhanh trên điện thoại',
  description = 'Dùng camera điện thoại quét QR để mở trang này ngay — không cần gõ link.',
  accent = 'indigo',
  variant = 'banner',
  downloadName = 'qr-code.png',
  className = '',
}: QuickScanQrProps) {
  const url = useMemo(() => {
    if (targetUrl) return targetUrl
    if (typeof window !== 'undefined') return window.location.href
    return ''
  }, [targetUrl])

  const qr = useMemo(() => buildQrUrl(url, 360), [url])
  const qrHires = useMemo(() => buildQrUrl(url, 1024), [url])

  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const a = ACCENT[accent]

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* noop */
    }
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${a.border} bg-white/[0.04] hover:bg-white/[0.08] transition-all ${className}`}
          title="Quét QR để mở trên điện thoại"
        >
          <QrCode className={`h-3.5 w-3.5 ${a.text}`} />
          <span className={`text-xs font-medium ${a.text}`}>Quét QR</span>
        </button>
        {open && (
          <QrZoomModal
            url={url}
            qrHires={qrHires}
            title={title}
            downloadName={downloadName}
            accent={accent}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div
        className={`bg-gradient-to-br ${a.from} ${a.via} ${a.to} backdrop-blur-xl rounded-2xl border ${a.border} p-5 md:p-6 ${className}`}
      >
        <div className="flex flex-col md:flex-row items-center gap-5">
          {/* QR image */}
          <div className="shrink-0">
            <div className={`p-3 bg-white rounded-2xl ${a.glow}`}>
              <img
                src={qr}
                alt={`Mã QR — ${title}`}
                className="w-32 h-32 md:w-36 md:h-36 object-contain cursor-pointer"
                onClick={() => setOpen(true)}
                loading="lazy"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
              <Smartphone className={`h-4 w-4 ${a.text}`} />
              <h3 className="text-sm md:text-base font-semibold text-white/90">{title}</h3>
            </div>
            <p className="text-xs md:text-[13px] text-white/55 leading-relaxed mb-3">{description}</p>

            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-center md:justify-start">
              <code className="flex-1 sm:flex-initial min-w-0 text-[0.7rem] font-mono text-white/60 bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2 truncate">
                {url || '—'}
              </code>
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 hover:bg-white/[0.1] transition-all"
                >
                  {copied ? (
                    <CheckCircle className={`h-3.5 w-3.5 ${a.text}`} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? 'Đã copy' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-all ${a.btn}`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Phóng to
                </button>
                <button
                  type="button"
                  onClick={() => downloadQrImage(qrHires, downloadName)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 hover:bg-white/[0.1] transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <QrZoomModal
          url={url}
          qrHires={qrHires}
          title={title}
          downloadName={downloadName}
          accent={accent}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

// ── Modal phóng to ──────────────────────────────────────────
function QrZoomModal({
  url,
  qrHires,
  title,
  downloadName,
  accent,
  onClose,
}: {
  url: string
  qrHires: string
  title: string
  downloadName: string
  accent: NonNullable<QuickScanQrProps['accent']>
  onClose: () => void
}) {
  const a = ACCENT[accent]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-[hsl(240,20%,12%)] border border-white/[0.08] rounded-3xl p-6 md:p-8 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 flex items-center justify-center transition-all"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <QrCode className={`h-5 w-5 ${a.text}`} />
            <h3 className="text-lg font-semibold text-white/90">{title}</h3>
          </div>
          <p className="text-xs text-white/50">Mở camera điện thoại, hướng vào mã QR để truy cập ngay.</p>
        </div>

        <div className="flex justify-center mb-5">
          <div className={`p-4 bg-white rounded-2xl ${a.glow}`}>
            <img src={qrHires} alt="QR phóng to" className="w-64 h-64 md:w-80 md:h-80 object-contain" />
          </div>
        </div>

        <div className="bg-black/30 border border-white/[0.08] rounded-xl px-4 py-3 mb-4">
          <p className="text-[0.65rem] uppercase text-white/40 tracking-wider mb-1">Link đích</p>
          <code className="block text-xs font-mono text-white/80 break-all">{url}</code>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-white/70 hover:bg-white/[0.1] transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Mở trong tab mới
          </a>
          <button
            type="button"
            onClick={() => downloadQrImage(qrHires, downloadName)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-all ${a.btn}`}
          >
            <Download className="h-3.5 w-3.5" />
            Tải PNG in giấy
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuickScanQr
