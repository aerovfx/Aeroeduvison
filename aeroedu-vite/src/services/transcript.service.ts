/**
 * Transcript Service — lưu trữ transcript đã ghi qua /teacher/transcript.
 */
import { api } from './api'

export interface TranscriptSummary {
  id: string
  title: string
  summary: string
  type: 'lecture' | 'meeting' | 'other' | string
  duration: number          // seconds
  sourceLanguage: string
  targetLanguage: string
  provider: string
  wordCount: number
  preview?: string
  createdAt: string
  updatedAt: string
}

export interface Transcript extends TranscriptSummary {
  transcript: string        // full text
}

export interface TranscriptUpdatePayload {
  title?: string
  type?: string
  summary?: string
}

export const transcriptService = {
  list: () =>
    api.get<{ history: TranscriptSummary[]; count: number }>('/transcript/history').then(r => r.data),
  get: (id: string) =>
    api.get<Transcript>(`/transcript/${id}`).then(r => r.data),
  update: (id: string, payload: TranscriptUpdatePayload) =>
    api.patch<{ ok: boolean; transcript: Transcript }>(`/transcript/${id}`, payload).then(r => r.data.transcript),
  remove: (id: string) =>
    api.delete<{ ok: boolean }>(`/transcript/${id}`).then(r => r.data),
}
