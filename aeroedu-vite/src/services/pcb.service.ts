/** API cho module thiết kế mạch — lưu trữ dùng chung OfficeDoc (kind='pcb'). */
import { api } from './api'
import type { PcbComponent, PcbNet } from '@/types/pcb'

export interface PcbAiResult { title: string; components: Array<Omit<PcbComponent, 'x' | 'y' | 'id'>>; nets: PcbNet[] }

/** AI sinh mạch từ mô tả → netlist (chưa có toạ độ; FE tự bố trí). */
export async function aiGenerateCircuit(prompt: string): Promise<PcbAiResult> {
  const { data } = await api.post('/pcb/ai-generate', { prompt }, { timeout: 90000 })
  return { title: data.title || 'Mạch', components: data.components || [], nets: data.nets || [] }
}

interface NetlistPayload { title: string; components: { ref: string; type: string; value: string; pins: string[] }[]; nets: { name: string; nodes: { comp: string; pin: string }[] }[] }

/** AI kiểm tra mạch (ERC) → markdown nhận xét. */
export async function aiReviewCircuit(p: NetlistPayload): Promise<string> {
  const { data } = await api.post('/pcb/ai-review', p, { timeout: 90000 })
  return data.review || ''
}
/** AI sinh firmware khớp mạch. */
export async function aiGenerateFirmware(p: NetlistPayload): Promise<{ code: string; board: string }> {
  const { data } = await api.post('/pcb/ai-firmware', p, { timeout: 90000 })
  return { code: data.code || '', board: data.board || '' }
}
