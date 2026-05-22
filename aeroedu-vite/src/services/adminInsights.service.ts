/**
 * Admin Insights Service
 *
 * 4 endpoints (admin only):
 *  - getBehavior()         → user behavior (DAU/WAU/MAU, hourly, bounce)
 *  - getTrendingTopics()   → top subjects last 7d
 *  - getTrendingExams()    → top exams last 30d
 *  - getRecommendations()  → auto-generated insights
 */
import { api } from './api'

export interface BehaviorData {
  hourly: Array<{ hour: number; views: number; unique_sessions: number }>
  dau: number
  wau: number
  mau: number
  stickiness: number
  sessionDurByRole: Array<{ role: string | null; avg_min: number; sessions: number }>
  topEntries: Array<{ path: string; sessions: number }>
  bounceByRole: Array<{ role: string | null; bounced: number; total: number; bounce_rate_pct: number }>
  period: string
}

export interface TrendingTopic {
  subject: string
  attempts: number
  uniqueStudents: number
  examCount: number
  avgAttemptsPerStudent: number
  growthPct: number
  trend: 'up' | 'down' | 'stable'
}

export interface TrendingExam {
  id: string
  title: string
  subject: string | null
  totalQuestions: number
  attempts: number
  unique_students: number
  avg_percentage: number
  avg_score: number
  pass_count: number
  pass_rate: number
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: 'engagement' | 'ux' | 'content'
  icon: string
  title: string
  insight: string
  action: string
}

export const adminInsightsService = {
  getBehavior: () => api.get<BehaviorData>('/admin/insights/behavior').then(r => r.data),
  getTrendingTopics: () => api.get<{ topics: TrendingTopic[] }>('/admin/insights/trending-topics').then(r => r.data.topics),
  getTrendingExams: () => api.get<{ exams: TrendingExam[] }>('/admin/insights/trending-exams').then(r => r.data.exams),
  getRecommendations: () => api.get<{ recommendations: Recommendation[] }>('/admin/insights/recommendations').then(r => r.data.recommendations),
}
