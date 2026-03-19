import { db as prisma } from "@/lib/db"
import { apiLogger } from "@/lib/logging-simple"
import {
  QUESTION_TYPE_MATRIX_TO_DB,
  COGNITIVE_TO_DIFFICULTY,
} from "@/lib/constants/question-bank"

export class MatrixExamGenerator {
  private static mapQuestionType(matrixType: string): string {
    return (
      QUESTION_TYPE_MATRIX_TO_DB[matrixType as keyof typeof QUESTION_TYPE_MATRIX_TO_DB] ||
      matrixType
    )
  }

  private static mapCognitiveLevelToDifficulty(level: string): string {
    return COGNITIVE_TO_DIFFICULTY[level] || "MEDIUM"
  }

  /**
   * Build topic-matching OR clauses with word-level fallback.
   * Priority: exact topic → keyword match → each word in topic text/content.
   */
  private static buildTopicFilter(topic: string): any[] | undefined {
    if (!topic) return undefined

    const clauses: any[] = [
      { topic: { contains: topic, mode: "insensitive" } },
      { keywords: { hasSome: [topic] } },
      { content: { contains: topic, mode: "insensitive" } },
    ]

    const words = topic
      .split(/[\s,\-–—·/\\]+/)
      .filter((w) => w.length >= 2)

    for (const word of words) {
      clauses.push({ topic: { contains: word, mode: "insensitive" } })
    }

    return clauses
  }

  /**
   * Find matching questions with a progressive fallback strategy:
   *   Pass 1 – exact (type + difficulty + grade + topic + subject)
   *   Pass 2 – drop topic constraint
   *   Pass 3 – drop difficulty constraint (any difficulty)
   *   Pass 4 – drop subject constraint
   *
   * At every pass, questions already selected by prior requirements are excluded.
   */
  private static async findMatchingQuestions(
    requirements: {
      topic: string
      questionType: string
      cognitiveLevel: string
      count: number
      grade: string
      subject?: string
    },
    excludeIds: Set<string> = new Set()
  ): Promise<any[]> {
    const { topic, questionType, cognitiveLevel, count, grade, subject } = requirements

    const dbQuestionType = this.mapQuestionType(questionType)
    const difficulty = this.mapCognitiveLevelToDifficulty(cognitiveLevel)

    const passes: { label: string; where: any }[] = []

    // ── Pass 1: exact match ──────────────────────────────────────────────
    const baseWhere: any = {
      status: { in: ["Đã duyệt", "Nháp"] },
      questionType: dbQuestionType,
      difficulty,
      grade,
    }

    if (subject) baseWhere.subject = subject
    const topicClauses = this.buildTopicFilter(topic)
    if (topicClauses) baseWhere.OR = topicClauses

    passes.push({ label: "exact", where: { ...baseWhere } })

    // ── Pass 2: drop topic ───────────────────────────────────────────────
    const pass2: any = { ...baseWhere }
    delete pass2.OR
    passes.push({ label: "no-topic", where: pass2 })

    // ── Pass 3: drop difficulty ──────────────────────────────────────────
    const pass3: any = { ...pass2 }
    delete pass3.difficulty
    passes.push({ label: "no-difficulty", where: pass3 })

    // ── Pass 4: drop subject ─────────────────────────────────────────────
    const pass4: any = { ...pass3 }
    delete pass4.subject
    passes.push({ label: "no-subject", where: pass4 })

    for (const { label, where } of passes) {
      try {
        if (excludeIds.size > 0) {
          where.id = { notIn: Array.from(excludeIds) }
        }

        const questions = await prisma.question.findMany({
          where,
          orderBy: [
            { status: "asc" },
            { qualityScore: "desc" },
            { usageCount: "asc" },
          ],
          take: count * 3,
        })

        if (questions.length >= count) {
          const shuffled = questions.sort(() => Math.random() - 0.5)
          const selected = shuffled.slice(0, count)

          apiLogger.info(`[exam-gen] pass=${label} found=${questions.length} selected=${selected.length}`, {
            questionType: dbQuestionType,
            difficulty,
            grade,
            topic,
          })

          return selected
        }

        if (questions.length > 0 && label === passes[passes.length - 1].label) {
          apiLogger.warn(`[exam-gen] last pass=${label}, returning partial ${questions.length}/${count}`)
          return questions
        }
      } catch (error: any) {
        apiLogger.error(`[exam-gen] pass=${label} error: ${error.message}`)
      }
    }

    return []
  }

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
    const matrix = await prisma.examMatrix.findUnique({
      where: { id: matrixId },
      include: {
        topics: {
          include: { distributions: true },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!matrix) throw new Error("Matrix not found")
    if (matrix.userId !== userId) throw new Error("Forbidden")
    if (matrix.status !== "Hoàn tất")
      throw new Error("Matrix must be completed to generate exam")

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
            subject: matrix.subject || undefined,
          })
        }
      }
    }

    const selectedQuestions: any[] = []
    const missingRequirements: typeof questionRequirements = []
    const usedIds = new Set<string>()

    for (const req of questionRequirements) {
      const questions = await this.findMatchingQuestions(
        req,
        options?.allowDuplicates ? new Set() : usedIds
      )

      if (questions.length >= req.count) {
        const picked = questions.slice(0, req.count)
        selectedQuestions.push(...picked)
        picked.forEach((q: any) => usedIds.add(q.id))
      } else {
        selectedQuestions.push(...questions)
        questions.forEach((q: any) => usedIds.add(q.id))
        missingRequirements.push({
          ...req,
          count: req.count - questions.length,
        })
      }
    }

    const totalRequired = questionRequirements.reduce((s, r) => s + r.count, 0)
    const totalSelected = selectedQuestions.length

    if (totalSelected < totalRequired) {
      apiLogger.warn("Not enough questions found", {
        matrixId,
        required: totalRequired,
        found: totalSelected,
        missing: totalRequired - totalSelected,
        missingRequirements,
      })
    }

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
      matrixId,
      userId,
    }

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
  }

  static async previewExamFromMatrix(matrixId: string, userId: string) {
    const matrix = await prisma.examMatrix.findUnique({
      where: { id: matrixId },
      include: {
        topics: {
          include: { distributions: true },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!matrix || matrix.userId !== userId) {
      throw new Error("Matrix not found or forbidden")
    }

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
            subject: matrix.subject || undefined,
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

    const totalRequired = requirements.reduce((s, r) => s + r.required, 0)
    const totalAvailable = requirements.reduce((s, r) => s + Math.min(r.available, r.required), 0)

    return {
      matrix: {
        id: matrix.id,
        name: matrix.name,
        grade: matrix.grade,
        subject: matrix.subject,
        examType: matrix.examType,
        totalQuestions: matrix.totalQuestions,
        totalScore: matrix.totalScore,
      },
      requirements,
      summary: {
        totalRequired,
        totalAvailable,
        coverage: totalRequired > 0 ? totalAvailable / totalRequired : 1,
        canGenerate: totalRequired === 0 || totalAvailable >= totalRequired * 0.5,
      },
    }
  }
}
