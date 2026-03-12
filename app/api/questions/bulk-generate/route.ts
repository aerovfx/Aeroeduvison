import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { apiLogger } from "@/lib/logging-simple"

interface QuestionTemplate {
  topic: string
  questionType: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY"
  difficulty: "EASY" | "MEDIUM" | "HARD"
  content: string
  options?: string[]
  correctAnswer: string
  explanation: string
}

interface BulkGenerateRequest {
  subject: string
  grade: string
  topics: {
    name: string
    questionCount: number
    questionTypes?: {
      type: string
      count: number
    }[]
  }[]
  useAI?: boolean
}

/**
 * POST /api/questions/bulk-generate
 * Sinh hàng loạt câu hỏi vào ngân hàng đề
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body: BulkGenerateRequest = await req.json()
    
    const {
      subject,
      grade,
      topics,
      useAI = false,
    } = body

    // Validate input
    if (!subject || !grade || !topics || topics.length === 0) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      )
    }

    const generatedQuestions: any[] = []
    const errors: string[] = []

    // Generate questions for each topic
    for (const topic of topics) {
      const totalQuestions = topic.questionCount || 10
      
      // Distribute by question type if specified
      const typeDistribution = topic.questionTypes || [
        { type: "MCQ", count: Math.round(totalQuestions * 0.6) },
        { type: "TRUE_FALSE", count: Math.round(totalQuestions * 0.2) },
        { type: "SHORT_ANSWER", count: Math.round(totalQuestions * 0.1) },
        { type: "ESSAY", count: totalQuestions - Math.round(totalQuestions * 0.9) },
      ]

      // Generate questions for each type
      for (const qt of typeDistribution) {
        for (let i = 0; i < qt.count; i++) {
          const difficulty = i < qt.count * 0.4 ? "EASY" : 
                            i < qt.count * 0.7 ? "MEDIUM" : "HARD"
          
          const question = await generateQuestion({
            topic: topic.name,
            subject,
            grade,
            questionType: qt.type,
            difficulty,
            index: i,
            useAI,
            userId: session.user.id,
          })

          if (question) {
            generatedQuestions.push(question)
          } else {
            errors.push(`Failed to generate question for ${topic.name} - ${qt.type}`)
          }
        }
      }
    }

    // Bulk insert questions - ADD NEW without deleting old ones
    if (generatedQuestions.length > 0) {
      try {
        const result = await db.question.createMany({
          data: generatedQuestions,
          skipDuplicates: true,
        })

        apiLogger.info("Bulk questions generated", {
          count: generatedQuestions.length,
          inserted: result.count,
          subject,
          grade,
          userId: session.user.id,
        })

        // Get total questions count after insert
        const totalQuestions = await db.question.count({
          where: {
            createdBy: session.user.id,
            subject,
            grade,
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            generated: generatedQuestions.length,
            inserted: result.count,
            totalInBank: totalQuestions,
            errors: errors.slice(0, 10),
            stats: {
              byTopic: topics.map(t => ({
                topic: t.name,
                count: t.questionCount,
              })),
              byType: countByType(generatedQuestions),
              byDifficulty: countByDifficulty(generatedQuestions),
              totalInBank: totalQuestions,
            },
          },
        })
      } catch (error: any) {
        apiLogger.error("Bulk insert error", { error: error.message })
        // If createMany fails, try one by one
        let successCount = 0
        for (const q of generatedQuestions) {
          try {
            await db.question.create({ data: q })
            successCount++
          } catch (e: any) {
            errors.push(`Insert failed: ${e.message}`)
          }
        }
        apiLogger.info("Individual inserts completed", { successCount })
        
        // Get total questions count after insert
        const totalQuestions = await db.question.count({
          where: {
            createdBy: session.user.id,
            subject,
            grade,
          },
        })

        return NextResponse.json({
          success: true,
          data: {
            generated: generatedQuestions.length,
            inserted: successCount,
            totalInBank: totalQuestions,
            errors: errors.slice(0, 10),
            stats: {
              byTopic: topics.map(t => ({
                topic: t.name,
                count: t.questionCount,
              })),
              byType: countByType(generatedQuestions),
              byDifficulty: countByDifficulty(generatedQuestions),
              totalInBank: totalQuestions,
            },
          },
        })
      }
    }
  } catch (error: any) {
    apiLogger.error("Bulk generate error", {
      error: error.message,
      stack: error.stack,
    })
    
    return NextResponse.json(
      { error: error.message || "Không thể sinh câu hỏi" },
      { status: 500 }
    )
  }
}

// Helper functions
async function generateQuestion(params: {
  topic: string
  subject: string
  grade: string
  questionType: string
  difficulty: string
  index: number
  useAI: boolean
  userId: string
}) {
  const { topic, subject, grade, questionType, difficulty, index, useAI, userId } = params

  // Generate content based on question type
  let content = ""
  let options: string[] = []
  let correctAnswer = ""
  let explanation = ""

  if (questionType === "MCQ") {
    const mcqData = generateMCQ(topic, subject, grade, index)
    content = mcqData.content
    options = mcqData.options
    correctAnswer = mcqData.correctAnswer
    explanation = mcqData.explanation
  } else if (questionType === "TRUE_FALSE") {
    const tfData = generateTrueFalse(topic, subject, grade, index)
    content = tfData.content
    options = ["Đúng", "Sai"]
    correctAnswer = tfData.correctAnswer
    explanation = tfData.explanation
  } else if (questionType === "SHORT_ANSWER") {
    const saData = generateShortAnswer(topic, subject, grade, index)
    content = saData.content
    correctAnswer = saData.correctAnswer
    explanation = saData.explanation
  } else if (questionType === "ESSAY") {
    const essayData = generateEssay(topic, subject, grade, index)
    content = essayData.content
    correctAnswer = ""
    explanation = essayData.explanation
  }

  return {
    topic,
    subject,
    grade,
    questionType,
    difficulty,
    content,
    options,
    correctAnswer,
    explanation,
    learningObjectives: [topic],
    keywords: [topic, subject],
    aiGenerated: useAI,
    aiModel: useAI ? "auto-generator" : null,
    humanReviewed: false,
    status: "Đã duyệt",
    createdBy: userId,
    qualityScore: 0.8,
  }
}

function generateMCQ(topic: string, subject: string, grade: string, index: number) {
  const templates = [
    {
      content: `Câu {index}: Trong chủ đề {topic} ({subject} - {grade}), phát biểu nào sau đây ĐÚNG?`,
      options: [
        "Phát biểu A - Đây là đáp án đúng",
        "Phát biểu B - Sai vì lý do X",
        "Phát biểu C - Sai vì lý do Y",
        "Phát biểu D - Sai vì lý do Z",
      ],
      correctAnswer: "Phát biểu A - Đây là đáp án đúng",
      explanation: "Giải thích chi tiết tại sao A đúng và các phương án khác sai.",
    },
    {
      content: `Câu {index}: Kết quả của phép tính liên quan đến {topic} là:`,
      options: ["Đáp án A (đúng)", "Đáp án B", "Đáp án C", "Đáp án D"],
      correctAnswer: "Đáp án A (đúng)",
      explanation: "Hướng dẫn cách giải chi tiết.",
    },
    {
      content: `Câu {index}: Khái niệm {topic} được định nghĩa là:`,
      options: [
        "Định nghĩa chính xác (đúng)",
        "Định nghĩa sai 1",
        "Định nghĩa sai 2",
        "Định nghĩa sai 3",
      ],
      correctAnswer: "Định nghĩa chính xác (đúng)",
      explanation: "Giải thích về khái niệm này.",
    },
  ]

  const template = templates[index % templates.length]
  
  return {
    content: template.content
      .replace("{index}", String(index + 1))
      .replace("{topic}", topic)
      .replace("{subject}", subject)
      .replace("{grade}", grade),
    options: template.options,
    correctAnswer: template.correctAnswer,
    explanation: template.explanation,
  }
}

function generateTrueFalse(topic: string, subject: string, grade: string, index: number) {
  const isCorrect = index % 2 === 0
  
  return {
    content: `Câu {index}: Trong {subject} ({grade}), về chủ đề {topic}: "Phát biểu này là {status}"`.replace("{index}", String(index + 1)).replace("{topic}", topic).replace("{subject}", subject).replace("{grade}", grade).replace("{status}", isCorrect ? "đúng" : "sai"),
    correctAnswer: isCorrect ? "Đúng" : "Sai",
    explanation: isCorrect 
      ? "Phát biểu này đúng vì..." 
      : "Phát biểu này sai vì...",
  }
}

function generateShortAnswer(topic: string, subject: string, grade: string, index: number) {
  return {
    content: `Câu {index}: Hãy trình bày ngắn gọn về {topic} trong {subject} ({grade}).`.replace("{index}", String(index + 1)).replace("{topic}", topic).replace("{subject}", subject).replace("{grade}", grade),
    correctAnswer: "Câu trả lời mẫu: " + topic + " là...",
    explanation: "Hướng dẫn trả lời chi tiết.",
  }
}

function generateEssay(topic: string, subject: string, grade: string, index: number) {
  return {
    content: `Câu {index}: Phân tích và chứng minh các tính chất của {topic} trong {subject} ({grade}). Trình bày đầy đủ các bước giải và lập luận.`.replace("{index}", String(index + 1)).replace("{topic}", topic).replace("{subject}", subject).replace("{grade}", grade),
    explanation: "Hướng dẫn chấm bài tự luận chi tiết với các tiêu chí đánh giá.",
  }
}

function countByType(questions: any[]) {
  const counts: Record<string, number> = {}
  questions.forEach(q => {
    counts[q.questionType] = (counts[q.questionType] || 0) + 1
  })
  return counts
}

function countByDifficulty(questions: any[]) {
  const counts: Record<string, number> = {}
  questions.forEach(q => {
    counts[q.difficulty] = (counts[q.difficulty] || 0) + 1
  })
  return counts
}
