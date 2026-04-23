export interface LearningSession {
  duration: number
  engagement: number
}

export interface StudentProgress {
  studentId: string
  completionRate: number
  accuracyTrend: number[]
  timeSpent: number
  engagementScore: number
  riskLevel: 'low' | 'medium' | 'high'
  predictedScore: number
  struggleTopics: string[]
}
