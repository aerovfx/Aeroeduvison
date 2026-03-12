import { db } from "@/lib/db"

export class StudentInsightAgent {
  async analyzeStudent(studentId: string): Promise<any> {
    const student = await db.user.findUnique({ where: { id: studentId } })
    return {
      studentId,
      name: student?.name,
      learningStyle: 'Visual',
      peakPerformanceTime: 'Morning',
      struggleTopics: ['Phương trình bậc 2'],
      predictedScore: 8.5,
      interventionNeeded: false,
    }
  }

  async predictExamPerformance(studentId: string, examId: string): Promise<{ predictedScore: number; confidence: number }> {
    return { predictedScore: 8.2, confidence: 0.85 }
  }

  async recommendInterventions(studentId: string): Promise<string[]> {
    return ['Ôn tập thêm phần đại số', 'Làm nhiều bài tập thực hành']
  }
}

export const studentInsight = new StudentInsightAgent()
