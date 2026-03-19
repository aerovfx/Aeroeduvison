import { EXAM_TYPE_PRESETS, ExamType } from "@/lib/constants/question-bank"

/**
 * Service để tạo ma trận đề thi tự động theo tỉ lệ cognitive level
 * Tỉ lệ mặc định: 40% Biết, 30% Hiểu, 30% Vận dụng
 */

interface TopicInput {
  name: string
  content?: string
  weight?: number
}

interface Distribution {
  questionType: string
  cognitiveLevel: string
  count: number
}

interface GeneratedTopic {
  order: number
  topic: string
  content: string
  distributions: Distribution[]
  percentageScore: number
}

interface GeneratedMatrix {
  topics: GeneratedTopic[]
  totalQuestions: number
  totalScore: number
  cognitiveLevelDistribution: {
    level: string
    percentage: number
    questionCount: number
  }[]
}

export class AutoMatrixGenerator {
  private static readonly COGNITIVE_RATIOS = {
    "Biết": 0.4,
    "Hiểu": 0.3,
    "Vận dụng": 0.3,
  }

  private static readonly COGNITIVE_LEVELS = ["Biết", "Hiểu", "Vận dụng"]
  private static readonly QUESTION_TYPES = [
    "TNKQ_Nhiều_lựa_chọn",
    "TNKQ_Đúng_Sai",
    "TNKQ_Trả_lời_ngắn",
    "Tự_luận",
  ]

  /**
   * Lấy tỉ lệ phân bổ loại câu hỏi dựa theo examType.
   * Kiểm tra ngắn thiên về MCQ; kiểm tra học kỳ có nhiều tự luận hơn.
   */
  private static getQuestionTypeRatios(examType?: string): Record<string, number> {
    const preset = examType ? EXAM_TYPE_PRESETS[examType as ExamType] : null
    const mcqRatio = preset?.mcqRatio ?? 0.6

    // Distribute remaining ratio equally across the other 3 types
    const remaining = 1 - mcqRatio
    return {
      "TNKQ_Nhiều_lựa_chọn": mcqRatio,
      "TNKQ_Đúng_Sai": Math.round((remaining * 0.5) * 100) / 100,
      "TNKQ_Trả_lời_ngắn": Math.round((remaining * 0.25) * 100) / 100,
      "Tự_luận": Math.round((remaining * 0.25) * 100) / 100,
    }
  }

  /**
   * Trả về số câu hỏi gợi ý cho một loại kiểm tra.
   */
  static getSuggestedQuestionCount(examType: string): number | null {
    const preset = EXAM_TYPE_PRESETS[examType as ExamType]
    return preset?.suggestedQuestions ?? null
  }

  /**
   * Trả về thời gian làm bài gợi ý cho một loại kiểm tra.
   */
  static getSuggestedDuration(examType: string): number | null {
    const preset = EXAM_TYPE_PRESETS[examType as ExamType]
    return preset?.suggestedDuration ?? null
  }

  static generateMatrix(
    topics: TopicInput[],
    totalScore: number = 10,
    totalQuestions: number = 30,
    examType: string = "Kiểm tra giữa kỳ"
  ): GeneratedMatrix {
    if (topics.length === 0) {
      throw new Error("Cần ít nhất một đơn vị kiến thức")
    }

    const questionTypeRatios = this.getQuestionTypeRatios(examType)
    const normalizedTopics = this.normalizeTopicWeights(topics)

    const generatedTopics: GeneratedTopic[] = normalizedTopics.map((topic, index) => {
      const topicQuestionCount = Math.round(totalQuestions * (topic.weight || 0))
      const topicScore = totalScore * (topic.weight || 0)

      const distributions = this.generateDistributionsForTopic(
        topicQuestionCount,
        topicScore,
        questionTypeRatios
      )

      return {
        order: index + 1,
        topic: topic.name,
        content: topic.content || "",
        distributions,
        percentageScore: Math.round((topicScore / totalScore) * 100),
      }
    })

    const adjustedTopics = this.adjustQuestionCounts(generatedTopics, totalQuestions)
    const cognitiveDistribution = this.calculateCognitiveDistribution(adjustedTopics)

    return {
      topics: adjustedTopics,
      totalQuestions,
      totalScore,
      cognitiveLevelDistribution: cognitiveDistribution,
    }
  }

  private static normalizeTopicWeights(topics: TopicInput[]): TopicInput[] {
    const totalWeight = topics.reduce((sum, t) => sum + (t.weight || 1), 0)

    return topics.map(topic => ({
      ...topic,
      weight: (topic.weight || 1) / totalWeight,
    }))
  }

  private static generateDistributionsForTopic(
    questionCount: number,
    _score: number,
    questionTypeRatios: Record<string, number>
  ): Distribution[] {
    const distributions: Distribution[] = []

    const cognitiveQuestions = {
      "Biết": Math.round(questionCount * this.COGNITIVE_RATIOS["Biết"]),
      "Hiểu": Math.round(questionCount * this.COGNITIVE_RATIOS["Hiểu"]),
      "Vận dụng": Math.round(questionCount * this.COGNITIVE_RATIOS["Vận dụng"]),
    }

    // Fix rounding drift
    const totalCognitiveQuestions = Object.values(cognitiveQuestions).reduce((a, b) => a + b, 0)
    if (totalCognitiveQuestions !== questionCount) {
      cognitiveQuestions["Biết"] += questionCount - totalCognitiveQuestions
    }

    for (const level of this.COGNITIVE_LEVELS) {
      const levelCount = cognitiveQuestions[level as keyof typeof cognitiveQuestions]
      if (levelCount === 0) continue

      const typeDistribution = this.distributeByQuestionType(levelCount, questionTypeRatios)

      for (const [questionType, count] of Object.entries(typeDistribution)) {
        if (count > 0) {
          distributions.push({ questionType, cognitiveLevel: level, count })
        }
      }
    }

    return distributions
  }

  private static distributeByQuestionType(
    count: number,
    questionTypeRatios: Record<string, number>
  ): Record<string, number> {
    const distribution: Record<string, number> = {}
    let remaining = count

    const types = [...this.QUESTION_TYPES]

    for (let i = 0; i < types.length - 1; i++) {
      const type = types[i]
      const ratio = questionTypeRatios[type] ?? 0
      const typeCount = Math.round(count * ratio)
      distribution[type] = typeCount
      remaining -= typeCount
    }

    // Last type absorbs rounding remainder
    distribution[types[types.length - 1]] = Math.max(0, remaining)

    return distribution
  }

  private static adjustQuestionCounts(
    topics: GeneratedTopic[],
    targetTotal: number
  ): GeneratedTopic[] {
    const currentTotal = topics.reduce((sum, t) => {
      return sum + t.distributions.reduce((s, d) => s + d.count, 0)
    }, 0)

    if (currentTotal === targetTotal) return topics

    const diff = targetTotal - currentTotal
    const sortedTopics = [...topics].sort((a, b) => b.percentageScore - a.percentageScore)

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const topic = sortedTopics[i % sortedTopics.length]
        const bietDist = topic.distributions.find(
          d => d.cognitiveLevel === "Biết" && d.questionType === "TNKQ_Nhiều_lựa_chọn"
        )
        if (bietDist) bietDist.count++
      }
    } else {
      for (let i = 0; i < Math.abs(diff); i++) {
        const topic = sortedTopics[i % sortedTopics.length]
        const vanDungDist = topic.distributions.find(
          d => d.cognitiveLevel === "Vận dụng" && d.questionType === "Tự_luận"
        )
        if (vanDungDist && vanDungDist.count > 0) vanDungDist.count--
      }
    }

    return topics
  }

  private static calculateCognitiveDistribution(topics: GeneratedTopic[]) {
    const levelCounts: Record<string, number> = {
      "Biết": 0,
      "Hiểu": 0,
      "Vận dụng": 0,
    }

    let totalQuestions = 0

    for (const topic of topics) {
      for (const dist of topic.distributions) {
        levelCounts[dist.cognitiveLevel] = (levelCounts[dist.cognitiveLevel] ?? 0) + dist.count
        totalQuestions += dist.count
      }
    }

    return this.COGNITIVE_LEVELS.map(level => ({
      level,
      percentage:
        totalQuestions > 0 ? Math.round((levelCounts[level] / totalQuestions) * 100) : 0,
      questionCount: levelCounts[level],
    }))
  }

  static generateMatrixVariants(
    topics: TopicInput[],
    totalScore: number = 10,
    totalQuestions: number = 30,
    variantCount: number = 3,
    examType: string = "Kiểm tra giữa kỳ"
  ): GeneratedMatrix[] {
    const variants: GeneratedMatrix[] = []

    for (let i = 0; i < variantCount; i++) {
      // ±20% weight randomization (was ±10%) for more differentiated variants
      const randomizedTopics = topics.map(topic => ({
        ...topic,
        weight: (topic.weight || 1) * (0.8 + Math.random() * 0.4),
      }))

      const variant = this.generateMatrix(randomizedTopics, totalScore, totalQuestions, examType)
      variants.push(variant)
    }

    return variants
  }

  static validateCognitiveRatio(matrix: GeneratedMatrix): {
    valid: boolean
    actualRatios: Record<string, number>
    deviations: Record<string, number>
  } {
    const actualRatios: Record<string, number> = {}
    const deviations: Record<string, number> = {}

    const totalQuestions = matrix.totalQuestions

    for (const dist of matrix.cognitiveLevelDistribution) {
      const actualRatio = dist.questionCount / totalQuestions
      const expectedRatio = this.COGNITIVE_RATIOS[dist.level as keyof typeof this.COGNITIVE_RATIOS]
      const deviation = Math.abs(actualRatio - (expectedRatio ?? 0))

      actualRatios[dist.level] = Math.round(actualRatio * 100)
      deviations[dist.level] = Math.round(deviation * 100)
    }

    const valid = Object.values(deviations).every(d => d <= 5)

    return { valid, actualRatios, deviations }
  }
}
