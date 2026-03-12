import { apiLogger } from "@/lib/logging-simple"

/**
 * Service để tạo ma trận đề thi tự động theo tỉ lệ cognitive level
 * Tỉ lệ: 40% Nhận biết, 30% Thông hiểu, 30% Vận dụng
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

  private static readonly QUESTION_TYPE_RATIOS = {
    "TNKQ_Nhiều_lựa_chọn": 0.6,
    "TNKQ_Đúng_Sai": 0.2,
    "TNKQ_Trả_lời_ngắn": 0.1,
    "Tự_luận": 0.1,
  }

  private static readonly COGNITIVE_LEVELS = ["Biết", "Hiểu", "Vận dụng"]
  private static readonly QUESTION_TYPES = [
    "TNKQ_Nhiều_lựa_chọn",
    "TNKQ_Đúng_Sai",
    "TNKQ_Trả_lời_ngắn",
    "Tự_luận",
  ]

  static generateMatrix(
    topics: TopicInput[],
    totalScore: number = 10,
    totalQuestions: number = 30,
    examType: string = "Kiểm tra giữa kỳ"
  ): GeneratedMatrix {
    if (topics.length === 0) {
      throw new Error("Cần ít nhất một đơn vị kiến thức")
    }

    const normalizedTopics = this.normalizeTopicWeights(topics)
    
    const generatedTopics: GeneratedTopic[] = normalizedTopics.map((topic, index) => {
      const topicQuestionCount = Math.round(totalQuestions * (topic.weight || 0))
      const topicScore = totalScore * (topic.weight || 0)
      
      const distributions = this.generateDistributionsForTopic(
        topicQuestionCount,
        topicScore
      )

      return {
        order: index + 1,
        topic: topic.name,
        content: topic.content || "",
        distributions,
        percentageScore: Math.round(topicScore / totalScore * 100),
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
    score: number
  ): Distribution[] {
    const distributions: Distribution[] = []

    const cognitiveQuestions = {
      "Biết": Math.round(questionCount * this.COGNITIVE_RATIOS["Biết"]),
      "Hiểu": Math.round(questionCount * this.COGNITIVE_RATIOS["Hiểu"]),
      "Vận dụng": Math.round(questionCount * this.COGNITIVE_RATIOS["Vận dụng"]),
    }

    const totalCognitiveQuestions = Object.values(cognitiveQuestions).reduce((a, b) => a + b, 0)
    if (totalCognitiveQuestions !== questionCount) {
      const diff = questionCount - totalCognitiveQuestions
      cognitiveQuestions["Biết"] += diff
    }

    for (const level of this.COGNITIVE_LEVELS) {
      const levelCount = cognitiveQuestions[level as keyof typeof cognitiveQuestions]
      if (levelCount === 0) continue

      const typeDistribution = this.distributeByQuestionType(levelCount)
      
      for (const [questionType, count] of Object.entries(typeDistribution)) {
        if (count > 0) {
          distributions.push({
            questionType,
            cognitiveLevel: level,
            count,
          })
        }
      }
    }

    return distributions
  }

  private static distributeByQuestionType(count: number): Record<string, number> {
    const distribution: Record<string, number> = {}
    let remaining = count

    const types = [...this.QUESTION_TYPES]
    
    for (let i = 0; i < types.length - 1; i++) {
      const type = types[i]
      const ratio = this.QUESTION_TYPE_RATIOS[type as keyof typeof this.QUESTION_TYPE_RATIOS]
      const typeCount = Math.round(count * ratio)
      distribution[type] = typeCount
      remaining -= typeCount
    }

    distribution[types[types.length - 1]] = remaining

    return distribution
  }

  private static adjustQuestionCounts(
    topics: GeneratedTopic[],
    targetTotal: number
  ): GeneratedTopic[] {
    const currentTotal = topics.reduce((sum, t) => {
      return sum + t.distributions.reduce((s, d) => s + d.count, 0)
    }, 0)

    if (currentTotal === targetTotal) {
      return topics
    }

    const diff = targetTotal - currentTotal
    const sortedTopics = [...topics].sort((a, b) => b.percentageScore - a.percentageScore)
    
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const topicIndex = i % sortedTopics.length
        const topic = sortedTopics[topicIndex]
        
        const bietDist = topic.distributions.find(
          d => d.cognitiveLevel === "Biết" && d.questionType === "TNKQ_Nhiều_lựa_chọn"
        )
        if (bietDist) {
          bietDist.count++
        }
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        const topicIndex = i % sortedTopics.length
        const topic = sortedTopics[topicIndex]
        
        const vanDungDist = topic.distributions.find(
          d => d.cognitiveLevel === "Vận dụng" && d.questionType === "Tự_luận"
        )
        if (vanDungDist && vanDungDist.count > 0) {
          vanDungDist.count--
        }
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
        levelCounts[dist.cognitiveLevel] += dist.count
        totalQuestions += dist.count
      }
    }

    return this.COGNITIVE_LEVELS.map(level => ({
      level,
      percentage: totalQuestions > 0 
        ? Math.round((levelCounts[level] / totalQuestions) * 100) 
        : 0,
      questionCount: levelCounts[level],
    }))
  }

  static generateMatrixVariants(
    topics: TopicInput[],
    totalScore: number = 10,
    totalQuestions: number = 30,
    variantCount: number = 3
  ): GeneratedMatrix[] {
    const variants: GeneratedMatrix[] = []

    for (let i = 0; i < variantCount; i++) {
      const randomizedTopics = topics.map(topic => ({
        ...topic,
        weight: (topic.weight || 1) * (0.9 + Math.random() * 0.2),
      }))

      const variant = this.generateMatrix(
        randomizedTopics,
        totalScore,
        totalQuestions
      )

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
      const deviation = Math.abs(actualRatio - expectedRatio)
      
      actualRatios[dist.level] = Math.round(actualRatio * 100)
      deviations[dist.level] = Math.round(deviation * 100)
    }

    const valid = Object.values(deviations).every(d => d <= 5)

    return { valid, actualRatios, deviations }
  }
}
