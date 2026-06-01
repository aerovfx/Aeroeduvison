/**
 * Nạp Google model-viewer (web component) từ CDN một lần duy nhất, lazy.
 * Không thêm vào bundle — chỉ tải khi người dùng bấm nút AR.
 */
const MODEL_VIEWER_CDN =
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'

let loader: Promise<void> | null = null

export function ensureModelViewer(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.customElements?.get('model-viewer')) return Promise.resolve()
  if (loader) return loader

  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-model-viewer]')
    const done = () =>
      window.customElements
        ? window.customElements.whenDefined('model-viewer').then(() => resolve())
        : resolve()

    if (existing) {
      done()
      return
    }
    const s = document.createElement('script')
    s.type = 'module'
    s.src = MODEL_VIEWER_CDN
    s.dataset.modelViewer = 'true'
    s.onload = done
    s.onerror = () => {
      loader = null
      reject(new Error('Không tải được model-viewer (kiểm tra kết nối mạng)'))
    }
    document.head.appendChild(s)
  })
  return loader
}
