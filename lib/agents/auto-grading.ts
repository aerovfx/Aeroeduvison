import { db } from "@/lib/db"

export interface GradingResult {
  questionId: string
  points: number
  maxPoints: number
  isCorrect: boolean
  feedback: string
  rubric?: RubricScores
}

export interface RubricScores {
  content: number
  structure: number
  language: number
  total: number
}

export interface ExamGradingResult {
  examId: string
  studentId: string
  totalScore: number
  maxScore: number
  percentage: number
  results: GradingResult[]
  feedback: string
  gradedAt: Date
}

export class AutoGradingAgent {
  /**
   * Chấm điểm một câu hỏi
   */
  async gradeQuestion(
    question: {
      id: string
      questionType: string
      correctAnswer: string
      options?: string[]
      points: number
    },
    studentAnswer: string
  ): Promise<GradingResult> {
    const { questionType, correctAnswer, points, options } = question

    switch (questionType) {
      case 'MCQ':
      case 'TRUE_FALSE':
        return this.gradeMCQ(question, studentAnswer)
      
      case 'SHORT_ANSWER':
        return this.gradeShortAnswer(question, studentAnswer)
      
      case 'ESSAY':
        return await this.gradeEssay(question, studentAnswer)
      
      default:
        return {
          questionId: question.id,
          points: 0,
          maxPoints: points,
          isCorrect: false,
          feedback: 'Loại câu hỏi không hợp lệ',
        }
    }
  }

  /**
   * Chấm trắc nghiệm (MCQ, True/False)
   */
  private gradeMCQ(
    question: { id: string; correctAnswer: string; points: number },
    studentAnswer: string
  ): GradingResult {
    const isCorrect = studentAnswer.trim().toLowerCase() === 
                     question.correctAnswer.trim().toLowerCase()
    
    return {
      questionId: question.id,
      points: isCorrect ? question.points : 0,
      maxPoints: question.points,
      isCorrect,
      feedback: isCorrect 
        ? '✅ Chính xác!' 
        : `❌ Sai. Đáp án đúng là: ${question.correctAnswer}`,
    }
  }

  /**
   * Chấm câu trả lời ngắn (semantic similarity)
   */
  private gradeShortAnswer(
    question: { id: string; correctAnswer: string; points: number },
    studentAnswer: string
  ): GradingResult {
    const similarity = this.calculateTextSimilarity(
      studentAnswer,
      question.correctAnswer
    )

    const points = similarity >= 0.8 ? question.points :
                   similarity >= 0.6 ? question.points * 0.7 :
                   similarity >= 0.4 ? question.points * 0.4 : 0

    return {
      questionId: question.id,
      points,
      maxPoints: question.points,
      isCorrect: similarity >= 0.6,
      feedback: similarity >= 0.8 ? '✅ Chính xác!' :
                similarity >= 0.6 ? '⚠️ Gần đúng' :
                `❌ Chưa chính xác. Gợi ý: ${question.correctAnswer}`,
    }
  }

  /**
   * Chấm tự luận với LLM Rubric
   */
  private async gradeEssay(
    question: { id: string; correctAnswer: string; points: number },
    studentAnswer: string
  ): Promise<GradingResult> {
    // Extract rubric from correctAnswer (which contains rubric JSON)
    let rubric = {
      content: 40,
      structure: 30,
      language: 30,
    }

    try {
      const response = await fetch('/api/agents/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Bạn là giám khảo chấm bài tự luận.

Nhiệm vụ: Chấm điểm bài làm theo rubric và đưa ra nhận xét chi tiết.

Rubric:
- Content (40%): Độ chính xác, độ sâu, sự liên quan
- Structure (30%): Tổ chức, mạch lạc, logic
- Language (30%): Ngữ pháp, từ vựng, phong cách

Output JSON:
{
  "content_score": 0-10,
  "structure_score": 0-10,
  "language_score": 0-10,
  "total_score": 0-10,
  "feedback": "Nhận xét chi tiết..."
}`
            },
            {
              role: 'user',
              content: `Đề bài: ${question.correctAnswer}\n\nBài làm: ${studentAnswer}`
            }
          ],
          config: { model: 'gpt-4o-mini', temperature: 0.3 }
        }),
      })

      if (!response.ok) throw new Error('LLM grading failed')

      const data = await response.json()
      const rubricScores = JSON.parse(data.content)

      const totalPoints = (
        (rubricScores.content_score / 10) * rubric.content +
        (rubricScores.structure_score / 10) * rubric.structure +
        (rubricScores.language_score / 10) * rubric.language
      ) / 100 * question.points

      return {
        questionId: question.id,
        points: Math.round(totalPoints * 10) / 10,
        maxPoints: question.points,
        isCorrect: totalPoints >= question.points * 0.6,
        feedback: rubricScores.feedback,
        rubric: {
          content: rubricScores.content_score,
          structure: rubricScores.structure_score,
          language: rubricScores.language_score,
          total: rubricScores.total_score,
        },
      }
    } catch (error) {
      console.error('Essay grading error:', error)
      return {
        questionId: question.id,
        points: 0,
        maxPoints: question.points,
        isCorrect: false,
        feedback: 'Không thể chấm bài tự luận. Vui lòng thử lại.',
      }
    }
  }

  /**
   * Tính text similarity đơn giản (cosine similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const normalize = (text: string) => 
      text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)

    const words1 = normalize(text1)
    const words2 = normalize(text2)

    const wordFreq1 = new Map<string, number>()
    const wordFreq2 = new Map<string, number>()

    words1.forEach(w => wordFreq1.set(w, (wordFreq1.get(w) || 0) + 1))
    words2.forEach(w => wordFreq2.set(w, (wordFreq2.get(w) || 0) + 1))

    const intersection = new Set([...wordFreq1.keys()].filter(w => wordFreq2.has(w)))
    
    let dotProduct = 0
    let magnitude1 = 0
    let magnitude2 = 0

    intersection.forEach(word => {
      dotProduct += (wordFreq1.get(word) || 0) * (wordFreq2.get(word) || 0)
    })

    wordFreq1.forEach(count => magnitude1 += count * count)
    wordFreq2.forEach(count => magnitude2 += count * count)

    magnitude1 = Math.sqrt(magnitude1)
    magnitude2 = Math.sqrt(magnitude2)

    if (magnitude1 === 0 || magnitude2 === 0) return 0

    return dotProduct / (magnitude1 * magnitude2)
  }

  /**
   * Chấm cả bài thi
   */
  async gradeExam(
    examRoomId: string,
    studentId: string
  ): Promise<ExamGradingResult> {
    // Lấy participant với answers
    const participant = await db.examRoomParticipant.findUnique({
      where: {
        examRoomId_studentId: {
          examRoomId,
          studentId,
        },
      },
      include: {
        answers: {
          include: {
            Question: {
              include: {
                Question: true,
              },
            },
          },
        },
      },
    })

    if (!participant) {
      throw new Error('Participant not found')
    }

    const results: GradingResult[] = []
    let totalScore = 0
    let maxScore = 0

    // Grade từng câu hỏi
    for (const examRoomAnswer of participant.answers) {
      const examRoomQuestion = examRoomAnswer.Question
      const question = examRoomQuestion.Question

      const result = await this.gradeQuestion(
        {
          id: question.id,
          questionType: question.questionType,
          correctAnswer: question.correctAnswer || '',
          options: question.options,
          points: examRoomQuestion.points,
        },
        examRoomAnswer.answer
      )

      results.push(result)
      totalScore += result.points
      maxScore += result.maxPoints
    }

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    // Generate overall feedback
    const feedback = this.generateOverallFeedback(percentage, results)

    // Update participant status
    await db.examRoomParticipant.update({
      where: {
        examRoomId_studentId: {
          examRoomId,
          studentId,
        },
      },
      data: {
        status: 'graded',
        submittedAt: new Date(),
        score: percentage,
      },
    })

    // Save individual answers with grading results
    for (const result of results) {
      await db.examRoomAnswer.update({
        where: { id: result.questionId },
        data: {
          isCorrect: result.isCorrect,
          pointsEarned: result.points,
        },
      })
    }

    return {
      examId: examRoomId,
      studentId,
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore,
      percentage: Math.round(percentage),
      results,
      feedback,
      gradedAt: new Date(),
    }
  }

  /**
   * Generate overall feedback cho cả bài
   */
  private generateOverallFeedback(
    percentage: number,
    results: GradingResult[]
  ): string {
    const correctCount = results.filter(r => r.isCorrect).length
    const totalCount = results.length

    if (percentage >= 90) {
      return `🎉 Xuất sắc! Bạn làm đúng ${correctCount}/${totalCount} câu. Tiếp tục phát huy!`
    } else if (percentage >= 70) {
      return `👍 Tốt! Bạn làm đúng ${correctCount}/${totalCount} câu. Cố gắng hơn nữa!`
    } else if (percentage >= 50) {
      return `📚 Khá. Bạn làm đúng ${correctCount}/${totalCount} câu. Cần ôn tập thêm.`
    } else {
      return `⚠️ Cần cố gắng nhiều hơn. Bạn làm đúng ${correctCount}/${totalCount} câu. Hãy xem lại các câu sai và ôn tập kỹ hơn.`
    }
  }

  /**
   * Bulk grade cho cả lớp
   */
  async bulkGradeExam(
    examRoomId: string
  ): Promise<{
    totalStudents: number
    gradedCount: number
    averageScore: number
    results: ExamGradingResult[]
  }> {
    const participants = await db.examRoomParticipant.findMany({
      where: { examRoomId },
      select: { studentId: true },
    })

    const results: ExamGradingResult[] = []
    let totalScore = 0

    for (const participant of participants) {
      try {
        const result = await this.gradeExam(examRoomId, participant.studentId)
        results.push(result)
        totalScore += result.percentage
      } catch (error) {
        console.error(`Failed to grade student ${participant.studentId}:`, error)
      }
    }

    return {
      totalStudents: participants.length,
      gradedCount: results.length,
      averageScore: results.length > 0 ? Math.round(totalScore / results.length) : 0,
      results,
    }
  }
}

// Export singleton
export const autoGrading = new AutoGradingAgent()
