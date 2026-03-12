import { db } from "@/lib/db"

export class FeedbackGeneratorAgent {
  async generateComment(studentId: string, semester: string): Promise<string> {
    const student = await db.user.findUnique({ where: { id: studentId } })
    return `${student?.name} là học sinh chăm chỉ. Điểm TB: 8.5. Cần cố gắng môn Toán.`
  }

  async generateBulkComments(classId: string, semester: string): Promise<any[]> {
    return []
  }

  async personalizeFeedback(studentId: string, achievements: string[], improvements: string[]): Promise<string> {
    return `Thành tích: ${achievements.join(', ')}. Cần cải thiện: ${improvements.join(', ')}`
  }
}

export const feedbackGenerator = new FeedbackGeneratorAgent()
