/**
 * pdfToImageBlobs — chuyển từng trang PDF thành ảnh JPEG (client-side, pdfjs-dist).
 *
 * Dùng cho StorybookEditor: GV upload PDF → rasterize mỗi trang → upload ảnh lên GCS
 * → mỗi trang thành 1 trang sách flipbook.
 */
let pdfjsLib: typeof import('pdfjs-dist') | null = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const mod = await import('pdfjs-dist')
  mod.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${mod.version}/pdf.worker.min.mjs`
  pdfjsLib = mod
  return mod
}

export async function pdfToImageBlobs(
  file: File,
  opts: { scale?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<Blob[]> {
  const pdfjs = await getPdfjs()
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise
  const scale = opts.scale ?? 1.6
  const blobs: Blob[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    // Nền trắng để JPEG không bị đen ở vùng trong suốt
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob lỗi'))), 'image/jpeg', 0.85),
    )
    blobs.push(blob)
    opts.onProgress?.(i, pdf.numPages)
  }
  return blobs
}
