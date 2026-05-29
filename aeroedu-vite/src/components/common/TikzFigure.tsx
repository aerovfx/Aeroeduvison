/**
 * TikzFigure — render hình vẽ LaTeX/TikZ trong trình duyệt bằng tikzjax.
 *
 * tikzjax biên dịch TeX → SVG ngay trên client (tải engine 1 lần, ~vài MB,
 * cache lại). Hình TikZ mặc định nét đen → đặt trên nền TRẮNG để nhìn rõ trên
 * giao diện tối. Có trạng thái "đang vẽ" + fallback nếu engine không tải được.
 *
 * Dùng: <TikzFigure code={"\\begin{tikzpicture}...\\end{tikzpicture}"} />
 */
import { useEffect, useRef, useState } from 'react'

const TIKZJAX_JS = 'https://tikzjax.com/v1/tikzjax.js'
const TIKZJAX_CSS = 'https://tikzjax.com/v1/fonts.css'

function ensureCss() {
  if (typeof document === 'undefined') return
  if (document.querySelector(`link[href="${TIKZJAX_CSS}"]`)) return
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = TIKZJAX_CSS
  document.head.appendChild(l)
}

export default function TikzFigure({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    const host = ref.current
    if (!host) return
    ensureCss()
    host.innerHTML = ''
    setStatus('loading')

    // 1) chèn mã TikZ dưới dạng <script type="text/tikz">
    const tikz = document.createElement('script')
    tikz.setAttribute('type', 'text/tikz')
    tikz.setAttribute('data-show-console', 'false')
    tikz.textContent = code
    host.appendChild(tikz)

    // 2) quan sát: tikzjax thay script bằng <svg> khi xong
    const obs = new MutationObserver(() => {
      if (host.querySelector('svg')) { setStatus('done'); obs.disconnect() }
    })
    obs.observe(host, { childList: true, subtree: true })

    // 3) nạp tikzjax.js (cache sau lần đầu) → IIFE chạy lại, xử lý script chưa render
    const js = document.createElement('script')
    js.src = TIKZJAX_JS
    js.async = true
    js.onerror = () => setStatus('error')
    document.body.appendChild(js)

    const timeout = setTimeout(() => setStatus(s => (s === 'loading' ? 'error' : s)), 15000)
    return () => { obs.disconnect(); clearTimeout(timeout) }
  }, [code])

  return (
    <div className="my-4 flex flex-col items-center">
      <div
        style={{
          background: '#ffffff', borderRadius: 12, padding: '14px 18px',
          minHeight: 56, minWidth: 120, display: 'flex', alignItems: 'center',
          justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          maxWidth: '100%', overflow: 'auto',
        }}
      >
        <div ref={ref} style={{ color: '#111' }} />
        {status === 'loading' && <span style={{ fontSize: 12, color: '#64748b' }}>Đang vẽ hình…</span>}
        {status === 'error' && <span style={{ fontSize: 12, color: '#94a3b8' }}>(Không tải được hình vẽ TikZ)</span>}
      </div>
    </div>
  )
}
