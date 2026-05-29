/**
 * skill-overlay — lớp phủ nội dung do ADMIN quản lý (DB) gộp với curriculum gốc.
 * Áp cho Toán + AI (cùng shape câu hỏi). Tiếng Anh dùng trình biên tập riêng.
 *
 * data = {
 *   extraQuestions: { [stopId]: OverlayQuestion[] },  // câu hỏi admin thêm
 *   stopOverrides:  { [stopId]: { blurbVi?, topicVi? } }
 * }
 */
import { api } from '@/services/api'

export interface OverlayQuestion {
  id: string
  prompt: string
  options: string[]
  correctIdx: number
  explain: string
}
export interface SkillOverlay {
  extraQuestions?: Record<string, OverlayQuestion[]>
  stopOverrides?: Record<string, { blurbVi?: string; topicVi?: string }>
}

export type SkillKey = 'english' | 'math' | 'ai'

const _cache: Partial<Record<SkillKey, SkillOverlay>> = {}

/** Lấy overlay (cache trong phiên). Trả {} nếu lỗi/không có. */
export async function fetchOverlay(skill: SkillKey): Promise<SkillOverlay> {
  if (_cache[skill]) return _cache[skill] as SkillOverlay
  try {
    const r = await api.get<{ skill: string; data: SkillOverlay }>(`/skills/${skill}/overlay`)
    _cache[skill] = r.data?.data || {}
  } catch { _cache[skill] = {} }
  return _cache[skill] as SkillOverlay
}

/** Đọc overlay cho admin (bỏ cache). */
export async function loadOverlayFresh(skill: SkillKey): Promise<SkillOverlay> {
  const r = await api.get<{ skill: string; data: SkillOverlay }>(`/skills/${skill}/overlay`)
  const data = r.data?.data || {}
  _cache[skill] = data
  return data
}

/** Lưu overlay (admin). */
export async function saveOverlay(skill: SkillKey, data: SkillOverlay): Promise<void> {
  await api.put(`/admin/skills/${skill}/overlay`, { data })
  _cache[skill] = data
}

/** Gộp extraQuestions của 1 chặng vào danh sách câu hỏi gốc. */
export function mergeStopQuestions<T extends { id: string; prompt: string; options: string[]; correctIdx: number; explain: string }>(
  builtin: T[], overlay: SkillOverlay | null | undefined, stopId: string,
): T[] {
  const extra = overlay?.extraQuestions?.[stopId]
  if (!extra || !extra.length) return builtin
  return [...builtin, ...extra.filter(q => q && q.prompt && Array.isArray(q.options) && q.options.length >= 2) as unknown as T[]]
}
