/**
 * useDraftPersistence — auto-save state vào localStorage với debounce.
 *
 * Dùng cho các form dài (vd /teacher/exams/create) để khi user chuyển
 * tab / refresh / navigate đi và quay lại không bị mất dữ liệu.
 *
 * Usage:
 *   const [form, setForm] = useState(defaultForm)
 *   const draft = useDraftPersistence('aero_create_exam_v1', form, setForm, {
 *     // optional: filter ra fields không nên save (vd File objects)
 *     omit: ['pdfFile'],
 *     ttlMs: 7 * 86400_000,  // 7 ngày
 *   })
 *
 *   // draft.lastSavedAt: timestamp ms · draft.clear(): xoá draft · draft.hasDraft: bool
 */
import { useEffect, useRef, useState, useCallback } from 'react'

interface DraftMeta {
  lastSavedAt: number | null
  hasDraft: boolean
  clear: () => void
  forceSave: () => void
}

interface Options<T> {
  /** Fields trong T cần loại trừ khi save (vd File objects, blob URLs) */
  omit?: (keyof T)[]
  /** Time-to-live: draft cũ hơn TTL sẽ bị xoá khi mount (mặc định 7 ngày) */
  ttlMs?: number
  /** Debounce ms (mặc định 600) */
  debounceMs?: number
  /** Disable persistence (vd khi đang edit có ID, không phải tạo mới) */
  disabled?: boolean
}

export function useDraftPersistence<T extends Record<string, unknown>>(
  key: string,
  state: T,
  setState: (next: T) => void,
  options: Options<T> = {},
): DraftMeta {
  const { omit = [], ttlMs = 7 * 86400_000, debounceMs = 600, disabled = false } = options
  const omitSet = useRef(new Set(omit.map(String)))
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const restoredRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Restore from localStorage on mount (1 lần) ──
  useEffect(() => {
    if (disabled || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw) as { savedAt?: number; data?: Partial<T> }
      if (!parsed?.savedAt || !parsed?.data) return
      // Check TTL
      if (Date.now() - parsed.savedAt > ttlMs) {
        localStorage.removeItem(key)
        return
      }
      // Merge: ưu tiên draft, giữ default cho field không có trong draft
      const merged = { ...state, ...parsed.data } as T
      setState(merged)
      setLastSavedAt(parsed.savedAt)
      setHasDraft(true)
    } catch {
      // Ignore corrupted draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save with debounce on state change ──
  useEffect(() => {
    if (disabled || !restoredRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        const data: Record<string, unknown> = {}
        for (const k of Object.keys(state)) {
          if (omitSet.current.has(k)) continue
          const v = (state as Record<string, unknown>)[k]
          // Skip File / Blob / FileList — không serialize được
          if (
            v instanceof File ||
            v instanceof Blob ||
            (typeof FileList !== 'undefined' && v instanceof FileList)
          ) continue
          data[k] = v
        }
        const now = Date.now()
        localStorage.setItem(key, JSON.stringify({ savedAt: now, data }))
        setLastSavedAt(now)
        setHasDraft(true)
      } catch {
        // localStorage quota exceeded — ignore
      }
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, key, debounceMs, disabled])

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setLastSavedAt(null)
      setHasDraft(false)
    } catch { /* ignore */ }
  }, [key])

  const forceSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      const data: Record<string, unknown> = {}
      for (const k of Object.keys(state)) {
        if (omitSet.current.has(k)) continue
        const v = (state as Record<string, unknown>)[k]
        if (v instanceof File || v instanceof Blob) continue
        data[k] = v
      }
      const now = Date.now()
      localStorage.setItem(key, JSON.stringify({ savedAt: now, data }))
      setLastSavedAt(now)
      setHasDraft(true)
    } catch { /* ignore */ }
  }, [state, key])

  return { lastSavedAt, hasDraft, clear, forceSave }
}
