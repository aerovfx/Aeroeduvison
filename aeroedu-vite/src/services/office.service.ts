/** API + autosave cho bộ công cụ Văn phòng online (OfficeDoc). */
import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { OfficeDoc, OfficeKind } from '@/types/office'

export async function listOfficeDocs(kind?: OfficeKind): Promise<OfficeDoc[]> {
  const { data } = await api.get('/office/docs', { params: kind ? { kind } : {} })
  return data.docs || []
}
export async function getOfficeDoc(id: string): Promise<OfficeDoc> {
  const { data } = await api.get(`/office/docs/${id}`)
  return data.doc
}
export async function createOfficeDoc(kind: OfficeKind, title: string, data: unknown): Promise<OfficeDoc> {
  const { data: r } = await api.post('/office/docs', { kind, title, data })
  return r.doc
}
export async function updateOfficeDoc(id: string, body: { title?: string; data?: unknown }): Promise<void> {
  await api.put(`/office/docs/${id}`, body)
}
export async function deleteOfficeDoc(id: string): Promise<void> {
  await api.delete(`/office/docs/${id}`)
}

export type SaveStatus = 'saved' | 'saving' | 'idle'

/**
 * Autosave debounced 1.5s. Chỉ lưu khi `ready` và payload KHÁC bản đã lưu.
 * getPayload phải trả về {title,data} hiện tại; watch là mảng deps theo dõi.
 */
export function useOfficeAutosave(
  id: string | undefined,
  ready: boolean,
  getPayload: () => { title: string; data: unknown },
  watch: unknown[],
): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('')
  // Khi nạp xong, ghi nhận snapshot ban đầu để không lưu thừa ngay sau khi mở
  useEffect(() => { if (ready) lastSaved.current = JSON.stringify(getPayload()) /* eslint-disable-next-line */ }, [ready])
  useEffect(() => {
    if (!ready || !id) return
    const snap = JSON.stringify(getPayload())
    if (snap === lastSaved.current) return
    setStatus('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try { await updateOfficeDoc(id, getPayload()); lastSaved.current = snap; setStatus('saved') }
      catch { setStatus('idle') }
    }, 1500)
    return () => { if (timer.current) clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch)
  return status
}
