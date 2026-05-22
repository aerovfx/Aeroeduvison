/**
 * pdfStorage — Persist PDF files qua F5 / chuyển trang bằng IndexedDB.
 *
 * Tại sao IndexedDB thay vì localStorage:
 *   - localStorage chỉ có 5-10MB quota, lưu base64 inflate ×1.33
 *     → 1 PDF 30MB = 40MB base64 → vượt quota
 *   - IndexedDB hỗ trợ Blob native (không cần base64), quota multi-GB
 *
 * API đơn giản:
 *   await savePdf('exam-grading-ref', file)   → lưu File/Blob + metadata
 *   const entry = await loadPdf('exam-grading-ref')  → { blob, filename, savedAt }
 *   await deletePdf('exam-grading-ref')        → xoá
 *   await listPdfs()                            → liệt kê tất cả keys
 *
 * Hạn chế:
 *   - Per origin (inphysic.com), không share giữa device
 *   - User clear browser data → mất
 *   - Quota có thể bị evict khi disk đầy (rare)
 *
 * Dùng cho:
 *   - PdfRefViewer trong /teacher/exam-grading (key='exam-grading-ref')
 *   - Tương lai: tài liệu lesson-plan PDF, đề thi PDF cache, ...
 */

const DB_NAME = 'inphysic-pdf-storage'
const DB_VERSION = 1
const STORE_NAME = 'pdfs'

export interface PdfEntry {
  key: string         // unique identifier
  blob: Blob          // binary content
  filename: string    // tên file gốc
  mimeType: string    // application/pdf
  size: number        // bytes
  savedAt: number     // unix ms
}

/* ─── Singleton DB connection ───────────────────────────────── */
let _dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không khả dụng'))
      return
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Open DB failed'))
  })
  return _dbPromise
}

/* ─── API ───────────────────────────────────────────────────── */

/** Lưu hoặc thay thế PDF tại key cho trước. Overwrite nếu đã tồn tại. */
export async function savePdf(key: string, file: File | Blob, filename?: string): Promise<void> {
  const db = await openDb()
  const entry: PdfEntry = {
    key,
    blob: file,
    filename: filename || ('name' in file ? file.name : 'untitled.pdf'),
    mimeType: file.type || 'application/pdf',
    size: file.size,
    savedAt: Date.now(),
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(entry)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error || new Error('Save failed'))
  })
}

/** Load PDF entry từ key. Trả null nếu không tồn tại. */
export async function loadPdf(key: string): Promise<PdfEntry | null> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve((req.result as PdfEntry | undefined) ?? null)
      req.onerror = () => reject(req.error || new Error('Load failed'))
    })
  } catch (err) {
    // IndexedDB không khả dụng (private mode, very old browser) → fail gracefully
    console.warn('[pdfStorage] load failed:', err)
    return null
  }
}

/** Xoá PDF tại key. No-op nếu không tồn tại. */
export async function deletePdf(key: string): Promise<void> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(key)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error || new Error('Delete failed'))
    })
  } catch (err) {
    console.warn('[pdfStorage] delete failed:', err)
  }
}

/** Liệt kê tất cả keys đã lưu — dùng để debug/admin. */
export async function listPdfs(): Promise<Array<Omit<PdfEntry, 'blob'>>> {
  try {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => {
        const list = (req.result as PdfEntry[] | undefined) ?? []
        // Strip blob để tiết kiệm memory cho caller
        resolve(list.map(({ blob: _blob, ...rest }) => rest))
      }
      req.onerror = () => reject(req.error || new Error('List failed'))
    })
  } catch (err) {
    console.warn('[pdfStorage] list failed:', err)
    return []
  }
}

/** Tính dung lượng IndexedDB đang dùng (approximate). */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator?.storage?.estimate) return null
  try {
    const est = await navigator.storage.estimate()
    return { usage: est.usage || 0, quota: est.quota || 0 }
  } catch {
    return null
  }
}
