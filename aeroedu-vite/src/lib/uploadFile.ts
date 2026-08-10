/**
 * uploadFileToGcs — tải 1 file (ảnh/audio/pdf) lên storage qua vé (ticket) rồi
 * PUT thẳng, không qua Cloud Run body limit.
 *
 * Dùng endpoint Node `/api/upload/video-signed-url` (ổn định, không phụ thuộc
 * media-service) để lấy { uploadUrl, publicUrl }. Server tự quyết định nơi
 * lưu: GCS signed URL khi DEPLOYMENT_MODE=cloud, hoặc file local dưới
 * DATA_DIR khi chạy desktop/on-premise (xem lib/local-storage.cjs) — client
 * không cần biết sự khác biệt, chỉ PUT vào uploadUrl như cũ.
 */
import { api } from '@/services/api'

export async function uploadFileToGcs(
  file: File | Blob,
  opts: { filename?: string; folder?: string; onProgress?: (pct: number) => void } = {},
): Promise<string> {
  const filename = opts.filename || (file as File).name || 'file'
  const contentType = file.type || 'application/octet-stream'

  const { data } = await api.post<{ uploadUrl: string; publicUrl: string }>(
    '/upload/video-signed-url',
    { filename, contentType, courseId: opts.folder },
  )
  if (!data?.uploadUrl) throw new Error('Không lấy được liên kết tải lên')

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', data.uploadUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve()
      : reject(new Error(`Tải lên lỗi ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải lên'))
    xhr.send(file)
  })

  return data.publicUrl
}
