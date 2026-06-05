/** API cho module thiết kế mạch — lưu trữ dùng chung OfficeDoc (kind='pcb'). */
import { api } from './api'
import type { PcbComponent, PcbNet } from '@/types/pcb'

export interface PcbAiResult { title: string; components: Array<Omit<PcbComponent, 'x' | 'y' | 'id'>>; nets: PcbNet[] }

/** AI sinh mạch từ mô tả → netlist (chưa có toạ độ; FE tự bố trí). */
export async function aiGenerateCircuit(prompt: string): Promise<PcbAiResult> {
  const { data } = await api.post('/pcb/ai-generate', { prompt }, { timeout: 90000 })
  return { title: data.title || 'Mạch', components: data.components || [], nets: data.nets || [] }
}
