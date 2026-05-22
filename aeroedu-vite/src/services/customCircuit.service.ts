/**
 * Custom Circuit service — quản lý mạch Wokwi-style do user tạo.
 *
 * Backend:
 *   GET    /api/iot/custom-circuits?includePublic=1
 *   POST   /api/iot/custom-circuits
 *   PUT    /api/iot/custom-circuits/:id
 *   DELETE /api/iot/custom-circuits/:id
 */
import { api } from './api'

export type CircuitDifficulty = 'Dễ' | 'Trung bình' | 'Nâng cao'

/** Danh mục có thể chọn khi lưu mạch — hiển thị icon trong UI. */
export const CIRCUIT_CATEGORIES = [
  { id: 'gpio',       emoji: '💡', label: 'LED & GPIO cơ bản' },
  { id: 'input',      emoji: '🔘', label: 'Input (button, switch)' },
  { id: 'display',    emoji: '📺', label: 'Hiển thị (7-seg, LCD, OLED)' },
  { id: 'sensor',     emoji: '🌡', label: 'Cảm biến (DHT, LDR, ultrasonic)' },
  { id: 'sound',      emoji: '🎵', label: 'Âm thanh (buzzer, speaker)' },
  { id: 'motor',      emoji: '🤖', label: 'Motor & Servo' },
  { id: 'mcu',        emoji: '🧮', label: 'Vi điều khiển nâng cao (74HC595…)' },
  { id: 'game',       emoji: '🎮', label: 'Game & Trò chơi' },
  { id: 'iot',        emoji: '🌐', label: 'IoT / WiFi / Bluetooth' },
  { id: 'general',    emoji: '🔌', label: 'Mạch khác' },
] as const

export type CircuitCategoryId = (typeof CIRCUIT_CATEGORIES)[number]['id']

export function categoryLabel(id: string): string {
  return CIRCUIT_CATEGORIES.find(c => c.id === id)?.label ?? 'Mạch khác'
}

export function categoryEmoji(id: string): string {
  return CIRCUIT_CATEGORIES.find(c => c.id === id)?.emoji ?? '🔌'
}

export interface CustomCircuit {
  id: string
  ownerId: string
  name: string
  description: string
  board: string
  difficulty: CircuitDifficulty | string
  category: string
  diagram: { parts: unknown[]; connections: unknown[]; [k: string]: unknown }
  sketch: string
  objectives: string[]
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomCircuitInput {
  name: string
  description?: string
  board?: string
  difficulty?: CircuitDifficulty
  category?: string
  diagram: unknown
  sketch?: string
  objectives?: string[]
  isPublic?: boolean
}

export const customCircuitService = {
  /** GET — list mạch của user (+ public nếu includePublic) */
  async list(includePublic = false): Promise<CustomCircuit[]> {
    try {
      const r = await api.get<{ circuits: CustomCircuit[]; count: number }>(
        `/iot/custom-circuits${includePublic ? '?includePublic=1' : ''}`
      )
      return r.data?.circuits ?? []
    } catch {
      return []
    }
  },

  /** POST — lưu mạch mới */
  async create(input: CreateCustomCircuitInput): Promise<CustomCircuit | null> {
    try {
      const r = await api.post<{ ok: true; circuit: CustomCircuit }>(
        '/iot/custom-circuits',
        input
      )
      return r.data?.circuit ?? null
    } catch (e: any) {
      throw new Error(e?.response?.data?.error || e?.message || 'Lưu mạch thất bại')
    }
  },

  /** PUT — cập nhật mạch (chỉ owner) */
  async update(
    id: string,
    patch: Partial<CreateCustomCircuitInput>
  ): Promise<CustomCircuit | null> {
    try {
      const r = await api.put<{ ok: true; circuit: CustomCircuit }>(
        `/iot/custom-circuits/${id}`,
        patch
      )
      return r.data?.circuit ?? null
    } catch (e: any) {
      throw new Error(e?.response?.data?.error || e?.message || 'Cập nhật mạch thất bại')
    }
  },

  /** DELETE — xoá mạch (chỉ owner) */
  async delete(id: string): Promise<boolean> {
    try {
      await api.delete(`/iot/custom-circuits/${id}`)
      return true
    } catch (e: any) {
      throw new Error(e?.response?.data?.error || e?.message || 'Xoá mạch thất bại')
    }
  },
}

export default customCircuitService
