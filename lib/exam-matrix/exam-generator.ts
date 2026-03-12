import { db as prisma } from "@/lib/db"
import { apiLogger } from "@/lib/logging-simple"

/**
 * Service để tạo đề thi từ ma trận
 * Tham khảo: exam.vuonminh.org/matrix?importId=132
 */
export class MatrixExamGenerator {
  /**
   * Map question type từ matrix format sang database format
   */
  private static mapQuestionType(matrixType: string): string {
    const typeMap: { [key: string]: string } = {
      "TNKQ_Nhiều_lựa_chọn": "MCQ",
      "TNKQ_Đúng_Sai": "TRUE_FALSE",
      "TNKQ_Trả_lời_ngắn": "SHORT_ANSWER",
      "Tự_luận": "ESSAY",
    }
    return typeMap[matrixType] || matrixType
  }

  /**
   * Map cognitive level từ matrix format sang difficulty
   */
  private static mapCognitiveLevelToDifficulty(level: string): string {
    const levelMap: { [key: string]: string } = {
      "Biết": "EASY",
      "Hiểu": "MEDIUM",
      "Vận dụng": "HARD",
    }
    return levelMap[level] || "MEDIUM"
  }

  /**
   * Tìm câu hỏi phù hợp từ question bank
   */
  private static async findMatchingQuestions(
    requirements: {
      topic: string
      questionType: string
      cognitiveLevel: string
      count: number
      grade: string
      subject?: string
    }
  ): Promise<any[]> {
    const { topic, questionType, cognitiveLevel, count, grade, subject } = requirements

    // Map types
    const dbQuestionType = this.mapQuestionType(questionType)
    const difficulty = this.mapCognitiveLevelToDifficulty(cognitiveLevel)

    // Build where clause
    const where: any = {
      status: "Đã duyệt", // Chỉ lấy câu hỏi đã duyệt
      questionType: dbQuestionType,
      difficulty: difficulty,
      grade: grade,
    }

    // Topic matching - tìm câu hỏi có topic tương tự
    if (topic) {
      where.OR = [
        { topic: { contains: topic, mode: "insensitive" } },
        { keywords: { hasSome: [topic] } },
        { content: { contains: topic, mode: "insensitive" } },
      ]
    }

    // Subject matching
    if (subject) {
      where.subject = subject
    }

    try {
      // Lấy nhiều hơn count để có thể random
      const questions = await prisma.question.findMany({
        where,
        orderBy: [
          { qualityScore: "desc" }, // Ưu tiên câu hỏi chất lượng cao
          { usageCount: "asc" }, // Ưu tiên câu hỏi ít dùng
        ],
        take: count * 3, // Lấy nhiều hơn để random
      })

      // Random và lấy đúng số lượng
      const shuffled = questions.sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count)
    } catch (error: any) {
      apiLogger.error("Error finding matching questions", {
        error: error.message,
        requirements,
      })
      return []
    }
  }

  /**
   * Generate exam từ matrix
   */
  static async generateExamFromMatrix(
    matrixId: string,
    userId: string,
    options?: {
      title?: string
      description?: string
      allowDuplicates?: boolean
      useAIForMissing?: boolean
    }
  ) {
    try {
      // Fetch matrix với topics và distributions
      const matrix = await prisma.examMatrix.findUnique({
        where: { id: matrixId },
        include: {
          topics: {
            include: {
              distributions: true,
            },
            orderBy: { order: "asc" },
          },
        },
      })

      if (!matrix) {
        throw new Error("Matrix not found")
      }

      if (matrix.userId !== userId) {
        throw new Error("Forbidden")
      }

      if (matrix.status !== "Hoàn tất") {
        throw new Error("Matrix must be completed to generate exam")
      }

      // Collect all question requirements
      const questionRequirements: Array<{
        topic: string
        questionType: string
        cognitiveLevel: string
        count: number
        grade: string
        subject?: string
      }> = []

      for (const topic of matrix.topics) {
        for (const dist of topic.distributions) {
          if (dist.count > 0) {
            questionRequirements.push({
              topic: topic.topic,
              questionType: dist.questionType,
              cognitiveLevel: dist.cognitiveLevel,
              count: dist.count,
              grade: matrix.grade,
              // TODO: Extract subject from matrix name or add to matrix
            })
          }
        }
      }

      // Find matching questions for each requirement
      const selectedQuestions: any[] = []
      const missingRequirements: typeof questionRequirements = []

      for (const req of questionRequirements) {
        const questions = await this.findMatchingQuestions(req)

        if (questions.length >= req.count) {
          selectedQuestions.push(...questions.slice(0, req.count))
        } else {
          // Không đủ câu hỏi
          selectedQuestions.push(...questions)
          missingRequirements.push({
            ...req,
            count: req.count - questions.length,
          })
        }
      }

      // Check if we have enough questions
      const totalRequired = questionRequirements.reduce(
        (sum, req) => sum + req.count,
        0
      )
      const totalSelected = selectedQuestions.length

      if (totalSelected < totalRequired) {
        apiLogger.warn("Not enough questions found", {
          matrixId,
          required: totalRequired,
          found: totalSelected,
          missing: totalRequired - totalSelected,
        })

        // TODO: Use AI to generate missing questions if useAIForMissing is true
        if (options?.useAIForMissing) {
          // Generate missing questions with AI
          // This would call AI service to generate questions
        }
      }

      // Calculate points per question
      const pointsPerQuestion = totalSelected > 0 ? matrix.totalScore / totalSelected : 0
      
      const examData = {
        title: options?.title || `${matrix.name} - Đề thi`,
        description:
          options?.description ||
          `Đề thi được tạo tự động từ ma trận: ${matrix.name}`,
        examType: matrix.examType,
        duration: matrix.duration,
        totalScore: matrix.totalScore,
        totalQuestions: totalSelected,
        status: "Nháp",
        matrixId: matrixId,
        userId: userId,
      }

      // Return exam data and selected questions (will be created by API route)
      return {
        success: true,
        examData,
        selectedQuestions,
        missingRequirements,
        stats: {
          totalRequired,
          totalSelected,
          missing: totalRequired - totalSelected,
          coverage: totalRequired > 0 ? totalSelected / totalRequired : 1,
        },
      }
    } catch (error: any) {
      apiLogger.error("Error generating exam from matrix", {
        error: error.message,
        matrixId,
        userId,
      })
      throw error
    }
  }

  /**
   * Calculate points for each question
   */
  private static calculateQuestionPoints(
    question: any,
    totalScore: number,
    totalQuestions: number
  ): number {
    // Simple distribution: equal points for all questions
    // TODO: Implement smarter point distribution based on difficulty, type, etc.
    return totalScore / totalQuestions
  }

  /**
   * Preview exam generation (không tạo exam, chỉ preview)
   */
  static async previewExamFromMatrix(matrixId: string, userId: string) {
    try {
      const matrix = await prisma.examMatrix.findUnique({
        where: { id: matrixId },
        include: {
          topics: {
            include: {
              distributions: true,
            },
            orderBy: { order: "asc" },
          },
        },
      })

      if (!matrix || matrix.userId !== userId) {
        throw new Error("Matrix not found or forbidden")
      }

      // Analyze requirements
      const requirements: Array<{
        topic: string
        questionType: string
        cognitiveLevel: string
        required: number
        available: number
        status: "sufficient" | "insufficient" | "missing"
      }> = []

      for (const topic of matrix.topics) {
        for (const dist of topic.distributions) {
          if (dist.count > 0) {
            const matching = await this.findMatchingQuestions({
              topic: topic.topic,
              questionType: dist.questionType,
              cognitiveLevel: dist.cognitiveLevel,
              count: dist.count,
              grade: matrix.grade,
            })

            requirements.push({
              topic: topic.topic,
              questionType: dist.questionType,
              cognitiveLevel: dist.cognitiveLevel,
              required: dist.count,
              available: matching.length,
              status:
                matching.length >= dist.count
                  ? "sufficient"
                  : matching.length > 0
                  ? "insufficient"
                  : "missing",
            })
          }
        }
      }

      const totalRequired = requirements.reduce(
        (sum, r) => sum + r.required,
        0
      )
      const totalAvailable = requirements.reduce(
        (sum, r) => sum + r.available,
        0
      )

      return {
        matrix: {
          id: matrix.id,
          name: matrix.name,
          grade: matrix.grade,
          examType: matrix.examType,
          totalQuestions: matrix.totalQuestions,
          totalScore: matrix.totalScore,
        },
        requirements,
        summary: {
          totalRequired,
          totalAvailable,
          coverage: totalRequired > 0 ? totalAvailable / totalRequired : 1,
          canGenerate: totalRequired === 0 || totalAvailable >= totalRequired * 0.8, // 80% coverage minimum
        },
      }
    } catch (error: any) {
      apiLogger.error("Error previewing exam from matrix", {
        error: error.message,
        matrixId,
        userId,
      })
      throw error
    }
  }
}
