import { db } from "@/lib/db"

export interface ExamPracticeResult {
  id: string
  studentId: string
  subject: string
  grade: string
  examType: string
  source: "question_bank" | "teacher_exam" | "mixed"
  sourceExamId?: string
  questions: PracticeQuestionItem[]
  timeLimit: number
  completed: boolean
  createdAt: Date
}

export interface PracticeQuestionItem {
  questionId: string
  position: number
  content: string
  questionType: string
  options: string[]
  correctAnswer: string
  explanation?: string
  difficulty: string
  topic?: string
  userAnswer?: string
  isCorrect?: boolean
}

export class ExamPrepAgent {
  /**
   * Tạo đề thi thử từ ngân hàng câu hỏi (Question Bank)
   * Sử dụng tỉ lệ cognitive level 40-30-30
   */
  /**
   * Lấy danh sách chủ đề có sẵn theo môn/khối
   */
  async getAvailableTopics(subject: string, grade?: string): Promise<string[]> {
    const where: any = { subject }
    if (grade) where.grade = grade

    const topics = await db.question.findMany({
      where,
      select: { topic: true },
      distinct: ["topic"],
      orderBy: { topic: "asc" },
    })

    return topics.map((t) => t.topic).filter(Boolean) as string[]
  }

  async createFromQuestionBank(
    studentId: string,
    subject: string,
    grade: string,
    examType: string,
    questionCount: number,
    timeLimit: number,
    topic?: string
  ): Promise<ExamPracticeResult> {
    // Lấy câu hỏi theo tỉ lệ 40% Dễ, 30% TB, 30% Khó
    const easyCount = Math.round(questionCount * 0.4)
    const mediumCount = Math.round(questionCount * 0.3)
    const hardCount = questionCount - easyCount - mediumCount

    // Build base filter — optionally include topic
    const baseWhere: any = { subject, grade, status: "Đã duyệt" }
    if (topic && topic !== "__all__") baseWhere.topic = topic

    const [easyQs, mediumQs, hardQs] = await Promise.all([
      db.question.findMany({
        where: { ...baseWhere, difficulty: "EASY" },
        take: easyCount * 2, // Take more for random selection
        select: {
          id: true, content: true, questionType: true, options: true,
          correctAnswer: true, explanation: true, difficulty: true, topic: true,
        },
      }),
      db.question.findMany({
        where: { ...baseWhere, difficulty: "MEDIUM" },
        take: mediumCount * 2,
        select: {
          id: true, content: true, questionType: true, options: true,
          correctAnswer: true, explanation: true, difficulty: true, topic: true,
        },
      }),
      db.question.findMany({
        where: { ...baseWhere, difficulty: "HARD" },
        take: hardCount * 2,
        select: {
          id: true, content: true, questionType: true, options: true,
          correctAnswer: true, explanation: true, difficulty: true, topic: true,
        },
      }),
    ])

    // Shuffle and pick exact counts
    const shuffle = <T,>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5)
    const selected = [
      ...shuffle(easyQs).slice(0, easyCount),
      ...shuffle(mediumQs).slice(0, mediumCount),
      ...shuffle(hardQs).slice(0, hardCount),
    ]

    // If not enough approved questions, also try "Nháp" (draft) status
    if (selected.length < questionCount) {
      const remaining = questionCount - selected.length
      const selectedIds = selected.map((q) => q.id)
      const extraWhere: any = { subject, grade, id: { notIn: selectedIds } }
      if (topic && topic !== "__all__") extraWhere.topic = topic
      const extraQs = await db.question.findMany({
        where: extraWhere,
        take: remaining,
        select: {
          id: true, content: true, questionType: true, options: true,
          correctAnswer: true, explanation: true, difficulty: true, topic: true,
        },
      })
      selected.push(...extraQs)
    }

    const shuffledAll = shuffle(selected)

    const questions: PracticeQuestionItem[] = shuffledAll.map((q, i) => ({
      questionId: q.id,
      position: i + 1,
      content: q.content,
      questionType: q.questionType,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || undefined,
      difficulty: q.difficulty,
      topic: q.topic || undefined,
    }))

    // Save to PracticeExam table
    const practice = await db.practiceExam.create({
      data: {
        studentId,
        subject,
        grade,
        examType,
        questionCount: questions.length,
        timeLimit,
        questions: JSON.parse(JSON.stringify(questions)),
        completed: false,
      },
    })

    return {
      id: practice.id,
      studentId,
      subject,
      grade,
      examType,
      source: "question_bank",
      questions,
      timeLimit,
      completed: false,
      createdAt: practice.createdAt,
    }
  }

  /**
   * Tạo đề thi thử từ đề thi của giáo viên (ExamMatrix → Question)
   */
  async createFromTeacherExam(
    studentId: string,
    examId: string,
    timeLimit?: number
  ): Promise<ExamPracticeResult> {
    // Lấy exam + questions
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            Question: {
              select: {
                id: true, content: true, questionType: true, options: true,
                correctAnswer: true, explanation: true, difficulty: true,
                topic: true, subject: true, grade: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!exam) throw new Error("Đề thi không tồn tại")

    const questions: PracticeQuestionItem[] = exam.examQuestions
      .filter((eq: any) => eq.Question)
      .map((eq: any, i: number) => ({
        questionId: eq.Question.id,
        position: i + 1,
        content: eq.Question.content,
        questionType: eq.Question.questionType,
        options: eq.Question.options || [],
        correctAnswer: eq.Question.correctAnswer,
        explanation: eq.Question.explanation || undefined,
        difficulty: eq.Question.difficulty,
        topic: eq.Question.topic || undefined,
      }))

    // Infer subject from the first question's subject
    const inferredSubject = questions[0]?.topic || exam.title || exam.examType || "General"
    const firstQ = exam.examQuestions[0]?.Question as any
    const subject = firstQ?.subject || inferredSubject
    const grade = firstQ?.grade || ""

    const practice = await db.practiceExam.create({
      data: {
        studentId,
        subject,
        grade,
        examType: exam.examType || "Kiểm tra",
        questionCount: questions.length,
        timeLimit: timeLimit || exam.duration || 45,
        questions: JSON.parse(JSON.stringify(questions)),
        completed: false,
      },
    })

    return {
      id: practice.id,
      studentId,
      subject,
      grade,
      examType: exam.examType || "Kiểm tra",
      source: "teacher_exam",
      sourceExamId: examId,
      questions,
      timeLimit: timeLimit || exam.duration || 45,
      completed: false,
      createdAt: practice.createdAt,
    }
  }

  /**
   * Tạo đề thi thử từ ExamMatrix (ma trận đề)
   */
  async createFromExamMatrix(
    studentId: string,
    matrixId: string,
    timeLimit?: number
  ): Promise<ExamPracticeResult> {
    const matrix = await db.examMatrix.findUnique({
      where: { id: matrixId },
      include: {
        selectedQuestions: {
          include: {
            Question: {
              select: {
                id: true, content: true, questionType: true, options: true,
                correctAnswer: true, explanation: true, difficulty: true,
                topic: true, subject: true, grade: true,
              },
            },
          },
        },
        topics: true,
      },
    })

    if (!matrix) throw new Error("Ma trận đề không tồn tại")

    const questions: PracticeQuestionItem[] = matrix.selectedQuestions
      .filter((sq: any) => sq.Question)
      .map((sq: any, i: number) => ({
        questionId: sq.Question.id,
        position: i + 1,
        content: sq.Question.content,
        questionType: sq.Question.questionType,
        options: sq.Question.options || [],
        correctAnswer: sq.Question.correctAnswer,
        explanation: sq.Question.explanation || undefined,
        difficulty: sq.Question.difficulty,
        topic: sq.Question.topic || undefined,
      }))
      .sort(() => Math.random() - 0.5) // Shuffle

    const practice = await db.practiceExam.create({
      data: {
        studentId,
        subject: matrix.subject,
        grade: matrix.grade,
        examType: matrix.examType || "Kiểm tra",
        questionCount: questions.length,
        timeLimit: timeLimit || matrix.duration || 45,
        questions: JSON.parse(JSON.stringify(questions)),
        completed: false,
      },
    })

    return {
      id: practice.id,
      studentId,
      subject: matrix.subject,
      grade: matrix.grade,
      examType: matrix.examType || "Kiểm tra",
      source: "teacher_exam",
      sourceExamId: matrixId,
      questions,
      timeLimit: timeLimit || matrix.duration || 45,
      completed: false,
      createdAt: practice.createdAt,
    }
  }

  /**
   * Lấy danh sách đề thi của giáo viên mà student có thể luyện tập
   */
  async getAvailableTeacherExams(subject?: string, grade?: string) {
    const where: any = {}
    if (subject) where.examType = subject

    // Get exams that have questions
    const exams = await db.exam.findMany({
      where: {
        ...where,
        status: { in: ["published", "Đã phê duyệt", "active"] },
        examQuestions: { some: {} },
      },
      select: {
        id: true,
        title: true,
        description: true,
        examType: true,
        duration: true,
        totalQuestions: true,
        totalScore: true,
        createdAt: true,
        User: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Also get ExamMatrices that have selected questions
    const matrices = await db.examMatrix.findMany({
      where: {
        subject: subject || undefined,
        grade: grade || undefined,
        selectedQuestions: { some: {} },
      },
      select: {
        id: true,
        name: true,
        subject: true,
        grade: true,
        examType: true,
        duration: true,
        totalQuestions: true,
        totalScore: true,
        createdAt: true,
        User: { select: { name: true } },
        _count: { select: { selectedQuestions: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Normalize relation names for frontend (User → user)
    const normalizedExams = exams.map((e: any) => ({
      ...e,
      user: e.User || null,
      User: undefined,
    }))
    const normalizedMatrices = matrices.map((m: any) => ({
      ...m,
      user: m.User || null,
      User: undefined,
    }))

    return { exams: normalizedExams, matrices: normalizedMatrices }
  }

  /**
   * Chấm điểm và phân tích kết quả
   */
  async gradeAndAnalyze(
    practiceId: string,
    answers: Record<string, string>
  ): Promise<{
    score: number
    total: number
    percentage: number
    breakdown: {
      correct: number
      incorrect: number
      unanswered: number
      byTopic: Record<string, { correct: number; total: number; accuracy: number }>
      byDifficulty: Record<string, { correct: number; total: number; accuracy: number }>
    }
    recommendations: string[]
    details: Array<{
      questionId: string
      position: number
      content: string
      userAnswer: string | null
      correctAnswer: string
      isCorrect: boolean
      explanation?: string
      topic?: string
    }>
  }> {
    // Load from database
    const practice = await db.practiceExam.findUnique({
      where: { id: practiceId },
    })

    if (!practice) throw new Error("Bài thi không tồn tại")

    const questions = practice.questions as unknown as PracticeQuestionItem[]
    let correct = 0
    let unanswered = 0
    const byTopic: Record<string, { correct: number; total: number; accuracy: number }> = {}
    const byDifficulty: Record<string, { correct: number; total: number; accuracy: number }> = {}
    const details: any[] = []

    for (const q of questions) {
      const userAnswer = answers[q.questionId] || null
      const isCorrect = userAnswer
        ? userAnswer.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
        : false

      if (!userAnswer) unanswered++
      if (isCorrect) correct++

      // Track by topic
      const topic = q.topic || "Chung"
      if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0, accuracy: 0 }
      byTopic[topic].total++
      if (isCorrect) byTopic[topic].correct++

      // Track by difficulty
      const diff = q.difficulty || "MEDIUM"
      if (!byDifficulty[diff]) byDifficulty[diff] = { correct: 0, total: 0, accuracy: 0 }
      byDifficulty[diff].total++
      if (isCorrect) byDifficulty[diff].correct++

      details.push({
        questionId: q.questionId,
        position: q.position,
        content: q.content,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        topic: q.topic,
      })

      // Update question usage stats
      try {
        await db.question.update({
          where: { id: q.questionId },
          data: { usageCount: { increment: 1 } },
        })
      } catch {}
    }

    const total = questions.length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    // Calculate accuracy for each group
    for (const key of Object.keys(byTopic)) {
      byTopic[key].accuracy = Math.round((byTopic[key].correct / byTopic[key].total) * 100)
    }
    for (const key of Object.keys(byDifficulty)) {
      byDifficulty[key].accuracy = Math.round(
        (byDifficulty[key].correct / byDifficulty[key].total) * 100
      )
    }

    const recommendations = this.generateRecommendations(byTopic, byDifficulty, percentage)

    // Save results to database
    await db.practiceExam.update({
      where: { id: practiceId },
      data: {
        answers: answers as any,
        score: correct,
        percentage,
        breakdown: { correct, incorrect: total - correct - unanswered, unanswered, byTopic, byDifficulty } as any,
        recommendations: recommendations as any,
        completed: true,
        completedAt: new Date(),
      },
    })

    return {
      score: correct,
      total,
      percentage,
      breakdown: {
        correct,
        incorrect: total - correct - unanswered,
        unanswered,
        byTopic,
        byDifficulty,
      },
      recommendations,
      details,
    }
  }

  /**
   * Đề xuất ôn tập thông minh
   */
  private generateRecommendations(
    byTopic: Record<string, { correct: number; total: number; accuracy: number }>,
    byDifficulty: Record<string, { correct: number; total: number; accuracy: number }>,
    percentage: number
  ): string[] {
    const recommendations: string[] = []

    // Topics yếu
    const weakTopics = Object.entries(byTopic)
      .filter(([_, stats]) => stats.accuracy < 50)
      .sort((a, b) => a[1].accuracy - b[1].accuracy)

    for (const [topic, stats] of weakTopics) {
      recommendations.push(
        `📚 Cần ôn tập kỹ: "${topic}" (${stats.correct}/${stats.total} đúng, ${stats.accuracy}%)`
      )
    }

    // Difficulty analysis
    if (byDifficulty["EASY"]?.accuracy < 80) {
      recommendations.push("⚠️ Kiến thức cơ bản chưa vững. Ôn lại lý thuyết nền tảng.")
    }
    if (byDifficulty["HARD"]?.accuracy > 70) {
      recommendations.push("🌟 Giỏi với câu hỏi khó! Thử thách bản thân với đề nâng cao.")
    }

    // Overall
    if (percentage >= 90) {
      recommendations.push("🏆 Xuất sắc! Bạn đã sẵn sàng cho kỳ thi.")
    } else if (percentage >= 70) {
      recommendations.push("👍 Tốt! Xem lại các câu sai để nâng điểm.")
    } else if (percentage >= 50) {
      recommendations.push("💪 Cố gắng hơn! Tập trung ôn các chủ đề yếu.")
    } else {
      recommendations.push("📖 Cần học lại lý thuyết. Đề xuất ôn theo từng chủ đề nhỏ.")
    }

    return recommendations
  }

  /**
   * Thống kê thực tế từ database
   */
  async getStudentStats(studentId: string) {
    const practices = await db.practiceExam.findMany({
      where: { studentId, completed: true },
      select: {
        score: true,
        percentage: true,
        questionCount: true,
        subject: true,
        createdAt: true,
        breakdown: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const totalExams = practices.length
    const avgScore =
      totalExams > 0
        ? Math.round(
            (practices.reduce((sum, p) => sum + (p.percentage || 0), 0) / totalExams) * 10
          ) / 10
        : 0
    const bestScore =
      totalExams > 0
        ? Math.max(...practices.map((p) => p.percentage || 0))
        : 0

    // Recent 5 scores trend
    const recentTrend = practices.slice(0, 5).map((p) => p.percentage || 0).reverse()

    // Find weak topics from all practice breakdowns
    const topicStats: Record<string, { correct: number; total: number }> = {}
    for (const p of practices) {
      const breakdown = p.breakdown as any
      if (breakdown?.byTopic) {
        for (const [topic, stats] of Object.entries(breakdown.byTopic) as any) {
          if (!topicStats[topic]) topicStats[topic] = { correct: 0, total: 0 }
          topicStats[topic].correct += stats.correct || 0
          topicStats[topic].total += stats.total || 0
        }
      }
    }

    const weakTopics = Object.entries(topicStats)
      .filter(([_, s]) => s.total > 0 && s.correct / s.total < 0.5)
      .map(([topic]) => topic)

    // Question bank stats
    const questionBankCount = await db.question.count({
      where: { status: "Đã duyệt" },
    })

    return {
      totalExams,
      avgScore,
      bestScore,
      recentTrend,
      weakTopics,
      questionBankCount,
    }
  }

  /**
   * Lịch sử bài thi
   */
  async getHistory(studentId: string, limit = 20) {
    return db.practiceExam.findMany({
      where: { studentId },
      select: {
        id: true,
        subject: true,
        grade: true,
        examType: true,
        questionCount: true,
        score: true,
        percentage: true,
        completed: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }
}

export const examPrep = new ExamPrepAgent()
