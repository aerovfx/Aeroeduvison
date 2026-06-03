/**
 * ShareMenu — nút chia sẻ tái dùng: Copy link · X (Twitter) · Facebook · Zalo · Mã nhúng iframe.
 *
 *   <ShareMenu path="/dashboard/iot-lab/sketch/blink-uno" title="Blink LED" embeddable />
 *
 * THUMBNAIL TỰ ĐỘNG (X/Facebook/Telegram):
 *   Truyền `captureNode` (hàm trả về phần tử DOM của thí nghiệm) → khi bấm chia sẻ,
 *   ShareMenu CHỤP ẢNH MÀN HÌNH phần tử đó (html-to-image), tải lên server
 *   (POST /api/share/snapshot) rồi server gắn ảnh đó vào thẻ og:image/twitter:image
 *   cho đúng URL → bài viết chia sẻ có ảnh xem trước là chính thí nghiệm.
 *
 * - X (Twitter): twitter:card=summary_large_image đọc ảnh đã chụp.
 * - Facebook cache OG khá lâu — lần chia sẻ đầu có thể chưa thấy ảnh mới (FB tự refresh sau).
 * - Nhúng: copy <iframe src="...?embed=1"> để dán vào bài học.
 */
import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { Share2, Check, Link2, Code2, Camera, Loader2 } from 'lucide-react'
import { api } from '@/services/api'

interface Props {
  path: string                                  // đường dẫn (tương đối) hoặc URL tuyệt đối
  title?: string
  embeddable?: boolean                          // hiện tuỳ chọn "Copy mã nhúng"
  captureNode?: () => HTMLElement | null        // phần tử để CHỤP làm thumbnail (vd vùng thí nghiệm)
  className?: string
}

export default function ShareMenu({ path, title = 'AeroEduVision', embeddable = false, captureNode, className }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)            // đang chụp + tải ảnh
  const [snapped, setSnapped] = useState(false)      // đã có thumbnail cho lần chia sẻ này
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const url = /^https?:/.test(path) ? path : `${window.location.origin}${path}`
  const embedUrl = url.includes('?') ? `${url}&embed=1` : `${url}?embed=1`
  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border:0;border-radius:12px" allow="fullscreen; xr-spatial-tracking"></iframe>`
  const shareText = `${title} — AeroEduVision`

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(tag); setTimeout(() => setCopied(null), 1500) })
  }
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }

  /** Chụp màn hình phần tử captureNode → tải lên server làm thumbnail OG. */
  const captureAndUpload = async (): Promise<boolean> => {
    if (!captureNode) return false
    const node = captureNode()
    if (!node) return false
    setBusy(true)
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 1.5,
        backgroundColor: '#0a0f1e',
        // bỏ qua chính nút chia sẻ / phần đánh dấu không-chụp
        filter: (el) => !(el instanceof HTMLElement && el.dataset?.noCapture === '1'),
      })
      await api.post('/api/share/snapshot', { path: url, image: dataUrl, title })
      setSnapped(true)
      return true
    } catch (e) {
      console.warn('[ShareMenu] capture/upload failed:', e)
      return false
    } finally {
      setBusy(false)
    }
  }

  /** Mở cửa sổ chia sẻ giữ user-gesture (mở blank ngay), chụp ảnh xong mới điều hướng. */
  const shareTo = async (e: React.MouseEvent, target: string) => {
    stop(e)
    const win = (target === 'fb' || target === 'x' || target === 'zalo')
      ? window.open('about:blank', '_blank', target === 'fb' ? 'width=640,height=580' : 'noopener,noreferrer')
      : null
    if (captureNode && !snapped) await captureAndUpload()
    let dest = ''
    if (target === 'x')    dest = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    if (target === 'fb')   dest = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    if (target === 'zalo') dest = `https://zalo.me/share/link?url=${encodeURIComponent(url)}`
    if (win) win.location.href = dest
    else window.open(dest, '_blank')
    setOpen(false)
  }

  const item = 'w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-slate-200 hover:bg-white/10 rounded-md disabled:opacity-50'
  return (
    <div ref={ref} data-no-capture="1" className={`relative ${className || ''}`}>
      <button onClick={(e) => { stop(e); setOpen((o) => !o) }} title="Chia sẻ / nhúng"
        className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-700">
        <Share2 size={14} />
      </button>
      {open && (
        <div onClick={stop} className="absolute right-0 top-9 z-50 w-56 p-1.5 rounded-xl bg-slate-900 border border-white/15 shadow-2xl">
          <button className={item} onClick={(e) => { stop(e); copy(url, 'link') }}>
            <Link2 size={14} className="text-cyan-300" /> {copied === 'link' ? 'Đã copy link ✓' : 'Copy link'}
          </button>
          <button className={item} onClick={(e) => shareTo(e, 'x')} disabled={busy}>
            <span style={{ fontWeight: 900, width: 14, textAlign: 'center' }}>𝕏</span> Chia sẻ lên X (Twitter)
          </button>
          <button className={item} onClick={(e) => shareTo(e, 'fb')} disabled={busy}>
            <span style={{ color: '#1877f2', fontWeight: 800, width: 14, textAlign: 'center' }}>f</span> Chia sẻ Facebook
          </button>
          <button className={item} onClick={(e) => shareTo(e, 'zalo')} disabled={busy}>
            <span style={{ color: '#0068ff', fontWeight: 800, fontSize: 10, width: 14, textAlign: 'center' }}>Z</span> Chia sẻ Zalo
          </button>
          {captureNode && (
            <button className={item} onClick={async (e) => { stop(e); await captureAndUpload() }} disabled={busy}>
              {busy
                ? <><Loader2 size={14} className="text-amber-300 animate-spin" /> Đang chụp ảnh xem trước…</>
                : <><Camera size={14} className="text-amber-300" /> {snapped ? 'Đã tạo ảnh xem trước ✓' : 'Chụp ảnh màn hình làm thumbnail'}</>}
            </button>
          )}
          {embeddable && (
            <button className={item} onClick={(e) => { stop(e); copy(iframeCode, 'embed') }}>
              <Code2 size={14} className="text-emerald-300" /> {copied === 'embed' ? 'Đã copy mã nhúng ✓' : 'Copy mã nhúng (iframe)'}
            </button>
          )}
          {captureNode && (
            <p className="px-3 pt-1 pb-0.5 text-[10px] leading-snug text-slate-500">
              Ảnh xem trước được chụp tự động từ thí nghiệm khi chia sẻ lên X / Facebook.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
