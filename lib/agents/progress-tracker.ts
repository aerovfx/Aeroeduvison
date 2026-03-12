import { db } from "@/lib/db"
import { agentCache } from "@/lib/redis/cache-agents"
import { StudentProgress, LearningSession } from './types'

export class ProgressTrackerAgent {
  /**
   * Tính toán tiến độ học tập của học sinh
   */
  async calculateProgress(studentId: string): Promise<StudentProgress> {
    // Check cache first (5 min TTL for progress)
    const cached = await agentCache.getJson<StudentProgress>(`progress:${studentId}`);
    if (cached) {
      return cached;
    }

    // Lấy tất cả sessions của học sinh trong 30 ngày qua
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sessions = await this.getLearningSessions(studentId, thirtyDaysAgo)
    
    // Tính completion rate
    const completionRate = await this.calculateCompletionRate(studentId)
    
    // Tính accuracy trend (7 ngày qua)
    const accuracyTrend = await this.calculateAccuracyTrend(studentId)
    
    // Tính time spent (tuần này)
    const timeSpent = await this.calculateTimeSpent(studentId)
    
    // Tính engagement score
    const engagementScore = this.calculateEngagementScore(sessions)
    
    // Xác định risk level
    const riskLevel = this.determineRiskLevel({
      completionRate,
      accuracyTrend,
      timeSpent,
      engagementScore,
    })
    
    // Tìm topics học sinh gặp khó khăn
    const struggleTopics = await this.identifyStruggleTopics(studentId)
    
    // Dự đoán điểm số
    const predictedScore = this.predictScore(accuracyTrend, engagementScore)

    const progress: StudentProgress = {
      studentId,
      completionRate,
      accuracyTrend,
      timeSpent,
      engagementScore,
      riskLevel,
      predictedScore,
      struggleTopics,
    }

    // Cache for 5 minutes
    await agentCache.setJson(`progress:${studentId}`, progress, 300)

    return progress
  }

  private async getLearningSessions(studentId: string, since: Date): Promise<LearningSession[]> {
    // TODO: Implement when we have learning_sessions table
    // For now, return mock data
    return []
  }

  private async calculateCompletionRate(studentId: string): Promise<number> {
    // Lấy số bài đã hoàn thành / tổng số bài được giao
    const completedAssignments = await db.examRoomParticipant.count({
      where: {
        studentId,
        status: 'submitted',
      },
    })

    const totalAssignments = await db.examRoomParticipant.count({
      where: { studentId },
    })

    if (totalAssignments === 0) return 0
    return Math.round((completedAssignments / totalAssignments) * 100)
  }

  private async calculateAccuracyTrend(studentId: string): Promise<number[]> {
    // Lấy accuracy 7 ngày qua
    const trend: number[] = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // TODO: Calculate daily accuracy from exam results
      // For now, return mock data
      trend.push(75 + Math.random() * 20) // 75-95%
    }

    return trend
  }

  private async calculateTimeSpent(studentId: string): Promise<number> {
    // Tính thời gian học trong tuần này (seconds)
    // TODO: Implement from activity logs
    return Math.floor(Math.random() * 10000) + 5000 // 5000-15000 seconds
  }

  private calculateEngagementScore(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 50
    
    const avgDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    const avgEngagement = sessions.reduce((sum, s) => sum + s.engagement, 0) / sessions.length
    
    return Math.round((avgDuration / 1800) * 50 + avgEngagement * 50) // Max 100
  }

  private determineRiskLevel(metrics: {
    completionRate: number
    accuracyTrend: number[]
    timeSpent: number
    engagementScore: number
  }): 'low' | 'medium' | 'high' {
    const { completionRate, accuracyTrend, timeSpent, engagementScore } = metrics
    
    // High risk: completion < 50% OR engagement < 30 OR accuracy declining
    const accuracyDeclining = accuracyTrend.length >= 3 && 
      accuracyTrend[accuracyTrend.length - 1] < accuracyTrend[0] - 10
    
    if (completionRate < 50 || engagementScore < 30 || accuracyDeclining) {
      return 'high'
    }
    
    // Medium risk: completion < 70% OR engagement < 50
    if (completionRate < 70 || engagementScore < 50) {
      return 'medium'
    }
    
    return 'low'
  }

  private async identifyStruggleTopics(studentId: string): Promise<string[]> {
    // Tìm topics mà học sinh có accuracy thấp nhất
    // TODO: Implement from exam results analysis
    return ['Phương trình bậc 2', 'Tích phân', 'Hàm số mũ']
  }

  private predictScore(accuracyTrend: number[], engagementScore: number): number {
    const recentAccuracy = accuracyTrend.slice(-3).reduce((a, b) => a + b, 0) / 3
    const predicted = recentAccuracy * 0.7 + engagementScore * 0.3
    return Math.round(predicted * 10) / 10
  }

  /**
   * Generate alert nếu học sinh có nguy cơ cao
   */
  async generateAlert(studentId: string, progress: StudentProgress): Promise<{
    type: 'info' | 'warning' | 'critical'
    message: string
    recommendations: string[]
  } | null> {
    if (progress.riskLevel === 'low') return null

    const student = await db.user.findUnique({
      where: { id: studentId },
      select: { name: true, email: true },
    })

    if (progress.riskLevel === 'high') {
      return {
        type: 'critical',
        message: `${student?.name} đang có nguy cơ cao tụt lại`,
        recommendations: [
          'Gửi email cho phụ huynh',
          'Đề xuất buổi học thêm',
          'Giảm khối lượng bài tập',
          'Tặng badge động viên',
        ],
      }
    }

    return {
      type: 'warning',
      message: `${student?.name} cần được quan tâm nhiều hơn`,
      recommendations: [
        'Nhắc nhở học bài đều đặn',
        'Đề xuất bài tập bổ sung',
        'Theo dõi sát trong 1 tuần',
      ],
    }
  }

  /**
   * Background job: Chạy mỗi ngày để update progress
   */
  async runDailyUpdate(): Promise<{
    totalStudents: number
    highRisk: number
    mediumRisk: number
    alerts: any[]
  }> {
    const students = await db.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true },
    })

    const alerts: any[] = []
    let highRisk = 0
    let mediumRisk = 0

    for (const student of students) {
      const progress = await this.calculateProgress(student.id)
      
      if (progress.riskLevel === 'high') {
        highRisk++
        const alert = await this.generateAlert(student.id, progress)
        if (alert) {
          alerts.push({
            studentId: student.id,
            ...alert,
            timestamp: new Date(),
          })
        }
      } else if (progress.riskLevel === 'medium') {
        mediumRisk++
      }
    }

    return {
      totalStudents: students.length,
      highRisk,
      mediumRisk,
      alerts,
    }
  }
}

// Export singleton instance
export const progressTracker = new ProgressTrackerAgent()
