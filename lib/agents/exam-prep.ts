import { db } from "@/lib/db"

export interface ExamPractice {
  id: string
  studentId: string
  subject: string
  grade: string
  examType: string
  questions: PracticeQuestion[]
  timeLimit: number
  score?: number
  completed: boolean
  createdAt: Date
}

export interface PracticeQuestion {
  questionId: string
  position: number
  userAnswer?: string
  correctAnswer: string
  isCorrect?: boolean
  timeSpent: number
}

export class ExamPrepAgent {
  /**
   * Tạo đề thi thử từ ngân hàng câu hỏi
   */
  async createPracticeExam(
    studentId: string,
    subject: string,
    grade: string,
    examType: string,
    questionCount: number,
    timeLimit: number
  ): Promise<ExamPractice> {
    // Lấy câu hỏi từ question bank với matrix 40-30-30
    const questions = await this.selectQuestions(subject, grade, questionCount)
    
    const practice: ExamPractice = {
      id: `practice-${Date.now()}`,
      studentId,
      subject,
      grade,
      examType,
      questions: questions.map((q, i) => ({
        questionId: q.id,
        position: i + 1,
        correctAnswer: q.correctAnswer,
        timeSpent: 0,
      })),
      timeLimit,
      completed: false,
      createdAt: new Date(),
    }

    // TODO: Save to database
    return practice
  }

  /**
   * Chọn câu hỏi với tỉ lệ cognitive level 40-30-30
   */
  private async selectQuestions(
    subject: string,
    grade: string,
    count: number
  ): Promise<any[]> {
    // 40% Biết, 30% Hiểu, 30% Vận dụng
    const bietCount = Math.round(count * 0.4)
    const hieuCount = Math.round(count * 0.3)
    const vanDungCount = count - bietCount - hieuCount

    const [bietQuestions, hieuQuestions, vanDungQuestions] = await Promise.all([
      db.question.findMany({
        where: { subject, grade, difficulty: 'EASY' },
        take: bietCount,
      }),
      db.question.findMany({
        where: { subject, grade, difficulty: 'MEDIUM' },
        take: hieuCount,
      }),
      db.question.findMany({
        where: { subject, grade, difficulty: 'HARD' },
        take: vanDungCount,
      }),
    ])

    return [...bietQuestions, ...hieuQuestions, ...vanDungQuestions]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
  }

  /**
   * Chấm điểm và phân tích kết quả
   */
  async gradeAndAnalyze(
    practiceId: string,
    answers: Record<string, string>
  ): Promise<{
    score: number
    percentage: number
    breakdown: {
      correct: number
      incorrect: number
      byTopic: Record<string, { correct: number; total: number }>
    }
    recommendations: string[]
  }> {
    // TODO: Load practice from DB
    const practice = await this.loadPractice(practiceId)
    
    let correct = 0
    const byTopic: Record<string, { correct: number; total: number }> = {}

    // Grade từng câu
    for (const q of practice.questions) {
      const userAnswer = answers[q.questionId]
      q.userAnswer = userAnswer
      q.isCorrect = userAnswer?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
      
      if (q.isCorrect) correct++

      // Track by topic
      const topic = 'Toán' // TODO: Get from question
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 }
      byTopic[topic].total++
      if (q.isCorrect) byTopic[topic].correct++
    }

    const percentage = Math.round((correct / practice.questions.length) * 100)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(byTopic, percentage)

    return {
      score: correct,
      percentage,
      breakdown: {
        correct,
        incorrect: practice.questions.length - correct,
        byTopic,
      },
      recommendations,
    }
  }

  /**
   * Generate đề xuất ôn tập dựa trên kết quả
   */
  private generateRecommendations(
    byTopic: Record<string, { correct: number; total: number }>,
    percentage: number
  ): string[] {
    const recommendations: string[] = []

    // Tìm topics yếu
    for (const [topic, stats] of Object.entries(byTopic)) {
      const accuracy = stats.correct / stats.total
      if (accuracy < 0.5) {
        recommendations.push(`Cần ôn tập kỹ hơn: ${topic} (${Math.round(accuracy * 100)}% đúng)`)
      }
    }

    // General recommendations based on overall score
    if (percentage >= 90) {
      recommendations.push('Xuất sắc! Sẵn sàng cho đề thi thật.')
    } else if (percentage >= 70) {
      recommendations.push('Làm tốt! Ôn lại các câu sai để cải thiện.')
    } else if (percentage >= 50) {
      recommendations.push('Cần cố gắng hơn. Tập trung vào các topics yếu.')
    } else {
      recommendations.push('Cần ôn tập nhiều hơn. Đề xuất học lại lý thuyết.')
    }

    return recommendations
  }

  private async loadPractice(practiceId: string): Promise<ExamPractice> {
    // TODO: Load from database
    // Mock data for now
    return {
      id: practiceId,
      studentId: 'student-1',
      subject: 'Toán',
      grade: 'Khối 6',
      examType: 'Kiểm tra 1 tiết',
      questions: [],
      timeLimit: 45,
      completed: false,
      createdAt: new Date(),
    }
  }

  /**
   * Get statistics cho học sinh
   */
  async getStudentStats(studentId: string): Promise<{
    totalExams: number
    avgScore: number
    bestScore: number
    recentTrend: number[]
    weakTopics: string[]
  }> {
    // TODO: Query from database
    return {
      totalExams: 12,
      avgScore: 7.8,
      bestScore: 9.5,
      recentTrend: [7.0, 7.5, 8.0, 7.8, 8.2],
      weakTopics: ['Phương trình bậc 2', 'Tích phân'],
    }
  }
}

export const examPrep = new ExamPrepAgent()
