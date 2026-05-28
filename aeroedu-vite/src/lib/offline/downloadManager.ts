/**
 * Offline download manager — tải nội dung học (video/PDF/ảnh) về thiết bị
 * để xem khi không có mạng.
 *
 * Native (Capacitor): lưu file vào Filesystem (Directory.Data), serve lại qua
 *   Capacitor.convertFileSrc() → playable src cho <video>/<img>/pdf viewer.
 * Web: lưu vào Cache Storage API (cache name 'aero-offline-content'), serve
 *   lại qua cache.match() → blob URL.
 *
 * Manifest (danh mục đã tải) lưu localStorage để UI list/manage. Mỗi entry:
 *   { key, url, title, type, size, downloadedAt }
 */
import { isNative } from '@/lib/capacitor/native'

export type OfflineType = 'video' | 'pdf' | 'image' | 'audio' | 'other'

export interface OfflineEntry {
  key: string          // định danh (vd 'course:123:lesson:5:video')
  url: string          // remote URL gốc
  title: string        // tên hiển thị
  type: OfflineType
  size: number         // bytes
  downloadedAt: number // ms epoch
  localPath?: string   // Filesystem path (native) — không dùng cho web
}

const MANIFEST_KEY = 'aero:offline-manifest'
const CACHE_NAME = 'aero-offline-content'
const SUBDIR = 'offline'

// ── Manifest CRUD (localStorage) ──
export function getManifest(): OfflineEntry[] {
  try {
    const raw = localStorage.getItem(MANIFEST_KEY)
    return raw ? (JSON.parse(raw) as OfflineEntry[]) : []
  } catch {
    return []
  }
}
function saveManifest(entries: OfflineEntry[]) {
  try { localStorage.setItem(MANIFEST_KEY, JSON.stringify(entries)) } catch { /* quota */ }
}
function upsertManifest(entry: OfflineEntry) {
  const list = getManifest().filter((e) => e.key !== entry.key)
  list.push(entry)
  saveManifest(list)
}
function removeManifest(key: string) {
  saveManifest(getManifest().filter((e) => e.key !== key))
}

export function isDownloaded(key: string): boolean {
  return getManifest().some((e) => e.key === key)
}

export function totalOfflineSize(): number {
  return getManifest().reduce((sum, e) => sum + (e.size || 0), 0)
}

// ── Download ──
export interface DownloadProgress {
  loaded: number
  total: number
  percent: number
}

/**
 * Tải file về offline. Trả về OfflineEntry khi xong.
 * @param onProgress callback tiến độ (chỉ web fetch streaming — native tải nguyên khối)
 */
export async function downloadFile(
  key: string,
  url: string,
  title: string,
  type: OfflineType,
  onProgress?: (p: DownloadProgress) => void,
): Promise<OfflineEntry> {
  if (isNative()) {
    return downloadNative(key, url, title, type)
  }
  return downloadWeb(key, url, title, type, onProgress)
}

// ── Native: Capacitor Filesystem ──
async function downloadNative(key: string, url: string, title: string, type: OfflineType): Promise<OfflineEntry> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')
  const safeName = `${SUBDIR}/${key.replace(/[^a-zA-Z0-9]/g, '_')}`
  // Filesystem.downloadFile (Capacitor 5+) — tải trực tiếp, không qua JS memory
  const result = await Filesystem.downloadFile({
    url,
    path: safeName,
    directory: Directory.Data,
  })
  // Lấy size
  let size = 0
  try {
    const stat = await Filesystem.stat({ path: safeName, directory: Directory.Data })
    size = stat.size
  } catch { /* ignore */ }
  const entry: OfflineEntry = {
    key, url, title, type, size,
    downloadedAt: Date.now(),
    localPath: result.path ?? safeName,
  }
  upsertManifest(entry)
  return entry
}

// ── Web: Cache Storage ──
async function downloadWeb(
  key: string, url: string, title: string, type: OfflineType,
  onProgress?: (p: DownloadProgress) => void,
): Promise<OfflineEntry> {
  const cache = await caches.open(CACHE_NAME)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Download fail HTTP ${resp.status}`)

  // Stream để track progress (nếu có Content-Length)
  const total = Number(resp.headers.get('content-length') || 0)
  let size = total
  if (onProgress && total > 0 && resp.body) {
    const reader = resp.body.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress({ loaded, total, percent: Math.round((loaded / total) * 100) })
    }
    const blob = new Blob(chunks as BlobPart[])
    size = blob.size
    await cache.put(url, new Response(blob, { headers: resp.headers }))
  } else {
    const cloned = resp.clone()
    await cache.put(url, resp)
    const blob = await cloned.blob()
    size = blob.size
  }

  const entry: OfflineEntry = { key, url, title, type, size, downloadedAt: Date.now() }
  upsertManifest(entry)
  return entry
}

/**
 * Lấy URL phát được (offline). Trả null nếu chưa tải.
 * Native: convertFileSrc(localPath). Web: blob URL từ Cache.
 */
export async function getPlayableUrl(key: string): Promise<string | null> {
  const entry = getManifest().find((e) => e.key === key)
  if (!entry) return null

  if (isNative() && entry.localPath) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const uri = await Filesystem.getUri({ path: entry.localPath, directory: Directory.Data })
      // convertFileSrc — biến file:// → http://localhost/_capacitor_file_/... playable
      const cap = (window as Window & { Capacitor?: { convertFileSrc?: (u: string) => string } }).Capacitor
      return cap?.convertFileSrc?.(uri.uri) ?? uri.uri
    } catch {
      return null
    }
  }
  // Web: lấy từ Cache → blob URL
  try {
    const cache = await caches.open(CACHE_NAME)
    const resp = await cache.match(entry.url)
    if (!resp) return null
    const blob = await resp.blob()
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}

// ── Remove ──
export async function removeDownload(key: string): Promise<void> {
  const entry = getManifest().find((e) => e.key === key)
  if (!entry) return
  if (isNative() && entry.localPath) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      await Filesystem.deleteFile({ path: entry.localPath, directory: Directory.Data })
    } catch { /* ignore */ }
  } else {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.delete(entry.url)
    } catch { /* ignore */ }
  }
  removeManifest(key)
}

export async function clearAllDownloads(): Promise<void> {
  const list = getManifest()
  for (const e of list) {
    await removeDownload(e.key).catch(() => {})
  }
  saveManifest([])
}

/** Format bytes → human readable (KB/MB/GB) */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
