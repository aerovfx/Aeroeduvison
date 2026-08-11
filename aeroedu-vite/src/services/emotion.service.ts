import api from './api'

/**
 * Dịch vụ Cảm xúc (Emotion) — ghi nhận và truy vấn trạng thái cảm xúc của học sinh.
 * EmotionType liệt kê các trạng thái cảm xúc; intensity là mức độ 1-10.
 */
export type EmotionType = 'happy' | 'neutral' | 'sad' | 'stressed' | 'excited' | 'focused'

export interface EmotionRecord {
  id: string
  emotion: EmotionType
  intensity: number // 1-10
  note?: string
  timestamp: string
  sessionId?: string
}

export interface EmotionStats {
  dominant: EmotionType
  averageIntensity: number
  focusRatio: number
  studyQuality: 'excellent' | 'good' | 'average' | 'poor'
  records: EmotionRecord[]
  weeklyTrend: { date: string; happy: number; focused: number; stressed: number }[]
}

export const emotionService = {
  getStats: (days = 30) =>
    api.get<EmotionStats>('/emotion/stats', { params: { days } }).then((r) => r.data),

  log: (emotion: EmotionType, intensity: number, note?: string) =>
    api.post<EmotionRecord>('/emotion', { emotion, intensity, note }).then((r) => r.data),
}
