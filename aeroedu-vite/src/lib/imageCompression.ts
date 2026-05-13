/**
 * imageCompression — nén ảnh client-side trước khi upload.
 *
 * Dùng canvas để resize về max 1920px wide rồi xuất JPEG quality 0.85.
 * Tiết kiệm 60-90% dung lượng ảnh chụp từ điện thoại (thường 4-12MB → 0.5-2MB).
 *
 * Cách dùng:
 *   const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.85 })
 *   // compressed là Blob (image/jpeg) hoặc File nếu kết quả lớn hơn original
 */

export interface CompressOptions {
  maxWidth?: number      // mặc định 1920
  maxHeight?: number     // mặc định 1920
  quality?: number       // 0.1-1.0, mặc định 0.85
  format?: 'jpeg' | 'webp'  // mặc định 'jpeg' (max compatibility)
  /** Skip compression nếu file nhỏ hơn ngưỡng này (KB). Mặc định 500KB */
  skipBelowKB?: number
}

export interface CompressResult {
  blob: Blob
  file: File
  originalSizeKB: number
  newSizeKB: number
  ratio: number  // 0-1, tỷ lệ giảm (vd 0.7 = giảm 70%)
  skipped: boolean
}

/** Nén 1 file ảnh. PDF / file không phải ảnh sẽ trả về nguyên gốc. */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'jpeg',
    skipBelowKB = 500,
  } = opts

  const originalSizeKB = file.size / 1024
  const baseResult = (skipped: boolean): CompressResult => ({
    blob: file, file, originalSizeKB,
    newSizeKB: originalSizeKB, ratio: 0, skipped,
  })

  // Skip nếu không phải image
  if (!file.type.startsWith('image/')) return baseResult(true)
  // Skip nếu file đã đủ nhỏ
  if (originalSizeKB < skipBelowKB) return baseResult(true)

  try {
    // Load image
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('FileReader fail'))
      reader.readAsDataURL(file)
    })
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Image load fail'))
      i.src = dataUrl
    })

    // Resize giữ aspect ratio
    let { width, height } = img
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    // Draw vào canvas
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return baseResult(true)
    ctx.drawImage(img, 0, 0, width, height)

    // Export blob
    const mime = format === 'webp' ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob fail')), mime, quality)
    })
    const newSizeKB = blob.size / 1024
    // Nếu kết quả KHÔNG nhỏ hơn original → giữ original
    if (newSizeKB >= originalSizeKB) return baseResult(true)

    // Tạo File mới với tên giữ nguyên + .jpg/.webp
    const ext = format === 'webp' ? '.webp' : '.jpg'
    const baseName = file.name.replace(/\.[^.]+$/, '')
    const newFile = new File([blob], baseName + ext, { type: mime, lastModified: Date.now() })

    return {
      blob, file: newFile, originalSizeKB, newSizeKB,
      ratio: 1 - (newSizeKB / originalSizeKB),
      skipped: false,
    }
  } catch (e) {
    console.warn('[imageCompression] fail, keep original:', e)
    return baseResult(true)
  }
}

/** Nén batch — trả về { files, savedKB, compressedCount } */
export async function compressImageBatch(
  files: File[],
  opts: CompressOptions = {},
): Promise<{
  files: File[]
  savedKB: number
  compressedCount: number
  skippedCount: number
}> {
  const results = await Promise.all(files.map(f => compressImage(f, opts)))
  const compressed = results.filter(r => !r.skipped)
  const savedKB = compressed.reduce((s, r) => s + (r.originalSizeKB - r.newSizeKB), 0)
  return {
    files: results.map(r => r.file),
    savedKB,
    compressedCount: compressed.length,
    skippedCount: results.length - compressed.length,
  }
}

/** Format size đẹp: 1234 → "1.2 MB" */
export function formatSize(kb: number): string {
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}
