/**
 * ShareMenu — nút chia sẻ tái dùng: Copy link · Facebook · Zalo · Mã nhúng iframe.
 *
 *   <ShareMenu path="/dashboard/iot-lab/sketch/blink-uno" title="Blink LED" embeddable />
 *
 * - Facebook: mở hộp chia sẻ sharer.php (cần URL public mới có preview OG).
 * - Nhúng: copy <iframe src="...?embed=1"> để dán vào bài học.
 */
import { useEffect, useRef, useState } from 'react'
import { Share2, Check, Link2, Code2 } from 'lucide-react'

interface Props {
  path: string            // đường dẫn (tương đối) hoặc URL tuyệt đối
  title?: string
  embeddable?: boolean    // hiện tuỳ chọn "Copy mã nhúng"
  className?: string
}

export default function ShareMenu({ path, title = 'AeroEduVision', embeddable = false, className }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
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

  const copy = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(tag); setTimeout(() => setCopied(null), 1500) })
  }
  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  const facebook = (e: React.MouseEvent) => {
    stop(e)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=640,height=580')
    setOpen(false)
  }
  const zalo = (e: React.MouseEvent) => {
    stop(e)
    window.open(`https://zalo.me/share/link?url=${encodeURIComponent(url)}`, '_blank')
    setOpen(false)
  }

  const item = 'w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-slate-200 hover:bg-white/10 rounded-md'
  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      <button onClick={(e) => { stop(e); setOpen((o) => !o) }} title="Chia sẻ / nhúng"
        className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-cyan-300 hover:bg-slate-700">
        <Share2 size={14} />
      </button>
      {open && (
        <div onClick={stop} className="absolute right-0 top-9 z-50 w-52 p-1.5 rounded-xl bg-slate-900 border border-white/15 shadow-2xl">
          <button className={item} onClick={(e) => { stop(e); copy(url, 'link') }}>
            <Link2 size={14} className="text-cyan-300" /> {copied === 'link' ? 'Đã copy link ✓' : 'Copy link'}
          </button>
          <button className={item} onClick={facebook}>
            <span style={{ color: '#1877f2', fontWeight: 800, width: 14, textAlign: 'center' }}>f</span> Chia sẻ Facebook
          </button>
          <button className={item} onClick={zalo}>
            <span style={{ color: '#0068ff', fontWeight: 800, fontSize: 10, width: 14, textAlign: 'center' }}>Z</span> Chia sẻ Zalo
          </button>
          {embeddable && (
            <button className={item} onClick={(e) => { stop(e); copy(iframeCode, 'embed') }}>
              <Code2 size={14} className="text-emerald-300" /> {copied === 'embed' ? 'Đã copy mã nhúng ✓' : 'Copy mã nhúng (iframe)'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
