/**
 * contentApi.ts — cầu nối nội dung English giữa FE và backend.
 *
 * - Learner: nạp bản admin đã xuất bản (GET /english/curriculum) → setJourneyOverride.
 *   Nếu chưa có / lỗi mạng → dùng seed tĩnh (JOURNEY) trong curriculum.ts.
 * - Admin: lưu bản biên tập (PUT /english/curriculum).
 *
 * Dùng pub-sub nhỏ + hook useEnglishContent() để các trang re-render khi nạp xong.
 */
import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { setJourneyOverride, type Destination } from './curriculum'

let _loaded = false
let _version = 0
const _subs = new Set<() => void>()

function _bump() { _version++; _subs.forEach(fn => fn()) }

export function englishContentVersion(): number { return _version }

/** Nạp bản admin (1 lần / phiên). Không chặn render — fallback seed nếu lỗi. */
// Nạp bản admin đã xuất bản một lần; fallback về seed tĩnh nếu mạng lỗi/data rỗng
export function ensureEnglishContent(): void {
  if (_loaded) return
  _loaded = true
  api.get('/english/curriculum')
    .then(({ data }) => {
      const j = data?.journey
      if (Array.isArray(j) && j.length) {
        setJourneyOverride(j as Destination[])
        _bump()
      }
    })
    .catch(() => { /* dùng seed */ })
}

/** Hook: gọi trong các trang English → tự nạp + re-render khi có bản admin. */
// Hook cho các trang English: tự nạp nội dung + re-render khi admin đổi bản
export function useEnglishContent(): number {
  const [v, setV] = useState(_version)
  useEffect(() => {
    ensureEnglishContent()
    const cb = () => setV(_version)
    _subs.add(cb)
    return () => { _subs.delete(cb) }
  }, [])
  return v
}

/** Admin: lấy bản hiện hành (admin hoặc seed) — trả journey + thời điểm cập nhật. */
export async function fetchCurriculum(): Promise<{ journey: Destination[] | null; updatedAt?: string }> {
  const { data } = await api.get('/english/curriculum')
  return { journey: (data?.journey as Destination[]) || null, updatedAt: data?.updatedAt }
}

/** Admin: lưu bản biên tập. */
export async function saveCurriculum(journey: Destination[]): Promise<{ ok: boolean; destinations: number }> {
  const { data } = await api.put('/english/curriculum', { journey })
  // Áp dụng ngay cho phiên hiện tại + thông báo
  setJourneyOverride(journey)
  _bump()
  return data
}
