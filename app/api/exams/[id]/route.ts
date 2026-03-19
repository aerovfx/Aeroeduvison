import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

async function ensureAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return session.user.id
}

/**
 * GET /api/exams/[id]
 * Backward-compatible exam detail endpoint (no Firebase dependency).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureAuth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { success: false, error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const { id } = await params
    const exam = await (prisma as any).exam.findFirst({
      where: { id, userId },
      include: {
        examQuestions: {
          orderBy: { order: "asc" },
          include: {
            Question: {
              select: {
                id: true,
                content: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                questionType: true,
              },
            },
          },
        },
      },
    })

    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 }
      )
    }

    let matrixMeta: { subject?: string | null; grade?: string | null } = {}
    if (exam.matrixId && typeof (prisma as any).examMatrix?.findUnique === "function") {
      const matrix = await (prisma as any).examMatrix.findUnique({
        where: { id: exam.matrixId },
        select: { subject: true, grade: true },
      })
      matrixMeta = matrix || {}
    }

    const payload = {
      ...exam,
      subject: matrixMeta.subject || "Vật lý",
      grade: matrixMeta.grade || "10",
      createdAt: exam.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: exam.updatedAt?.toISOString?.() || new Date().toISOString(),
      examQuestions: (exam.examQuestions || []).map((eq: any) => ({
        id: eq.id,
        order: Number(eq.order || 0),
        points: Number(eq.points || 0),
        questionId: eq.questionId,
        question: {
          id: eq.Question?.id,
          content: eq.Question?.content || "",
          options: Array.isArray(eq.Question?.options) ? eq.Question.options : [],
          correctAnswer: eq.Question?.correctAnswer ?? "",
          explanation: eq.Question?.explanation || "",
          questionType: eq.Question?.questionType || "MCQ",
        },
      })),
    }

    return NextResponse.json({
      success: true,
      data: { exam: payload },
    })
  } catch (error: any) {
    console.error("Error getting exam:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to get exam" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/exams/[id]
 * Backward-compatible update endpoint.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureAuth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { success: false, error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { title, description, examType, duration, subject, grade, questions } = body

    const existing = await (prisma as any).exam.findFirst({
      where: { id, userId },
      include: {
        examQuestions: {
          orderBy: { order: "asc" },
          include: {
            Question: {
              select: {
                id: true,
                content: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                questionType: true,
              },
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 }
      )
    }

    const examUpdateData: Record<string, unknown> = {
      ...(typeof title === "string" ? { title: title.trim() || "Untitled exam" } : {}),
      ...(typeof description === "string" ? { description } : {}),
      ...(typeof examType === "string" ? { examType } : {}),
      ...(Number.isFinite(duration) ? { duration: Number(duration) } : {}),
    }

    const existingExamQuestions = existing.examQuestions || []
    const examQuestionMap = new Map(existingExamQuestions.map((eq: any) => [eq.id, eq]))
    const examQuestionByQuestionId = new Map(
      existingExamQuestions.map((eq: any) => [eq.questionId, eq])
    )

    if (Array.isArray(questions)) {
      const seenQuestionIds = new Set<string>()

      // Separate existing-linked questions from brand-new inline questions
      const rawItems = questions.filter((q: any) => q && typeof q === "object")
      const linkedItems: any[] = []
      const inlineItems: any[] = []

      for (const q of rawItems) {
        const qid = typeof q.questionId === "string" ? q.questionId.trim() : ""
        if (qid && !qid.startsWith("new-inline-") && !qid.startsWith("tmp_")) {
          linkedItems.push(q)
        } else {
          inlineItems.push(q)
        }
      }

      // Normalize existing-linked questions
      const normalized = linkedItems
        .map((q: any, index: number) => {
          const byId = typeof q.id === "string" ? examQuestionMap.get(q.id) : undefined
          const questionIdRaw =
            typeof q.questionId === "string" && q.questionId.trim()
              ? q.questionId.trim()
              : byId?.questionId

          if (!questionIdRaw || seenQuestionIds.has(questionIdRaw)) return null
          seenQuestionIds.add(questionIdRaw)

          const old = byId || examQuestionByQuestionId.get(questionIdRaw)
          const points = Number(q.points)
          return {
            id: old?.id as string | undefined,
            order: index + 1,
            points: Number.isFinite(points) ? Math.max(0, points) : Number(old?.points || 0),
            content:
              typeof q.content === "string"
                ? q.content.trim()
                : String(old?.Question?.content || ""),
            options: Array.isArray(q.options)
              ? q.options.map((v: any) => String(v).trim()).filter(Boolean)
              : Array.isArray(old?.Question?.options)
                ? old.Question.options
                : [],
            correctAnswer:
              q.correctAnswer === null
                ? null
                : typeof q.correctAnswer === "string"
                  ? q.correctAnswer.trim()
                  : (old?.Question?.correctAnswer ?? null),
            explanation:
              typeof q.explanation === "string"
                ? q.explanation
                : String(old?.Question?.explanation || ""),
            questionType:
              typeof q.questionType === "string" && q.questionType.trim()
                ? q.questionType.trim()
                : String(old?.Question?.questionType || "MCQ"),
            questionId: String(questionIdRaw),
            isNew: false,
          }
        })
        .filter(Boolean) as Array<{
          id?: string
          order: number
          points: number
          content: string
          options: string[]
          correctAnswer: string | null
          explanation: string
          questionType: string
          questionId: string
          isNew: boolean
        }>

      const desiredQuestionIds = new Set(normalized.map((q) => q.questionId))
      const deleteIds = existingExamQuestions
        .filter((eq: any) => !desiredQuestionIds.has(eq.questionId))
        .map((eq: any) => eq.id)

      const questionIds = Array.from(desiredQuestionIds)
      if (questionIds.length > 0) {
        const existingQuestions = await (prisma as any).question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true },
        })
        const existingSet = new Set(existingQuestions.map((q: any) => q.id))
        const missing = questionIds.filter((qid) => !existingSet.has(qid))
        if (missing.length > 0) {
          return NextResponse.json(
            { success: false, error: `Question not found: ${missing.join(", ")}` },
            { status: 400 }
          )
        }
      }

      // Create new Question records for inline items
      const createdInlineIds: string[] = []
      for (const q of inlineItems) {
        const content = typeof q.content === "string" ? q.content.trim() : ""
        if (!content) continue

        const newQ = await (prisma as any).question.create({
          data: {
            content,
            questionType: typeof q.questionType === "string" ? q.questionType : "ESSAY",
            options: Array.isArray(q.options) ? q.options.map((v: any) => String(v).trim()).filter(Boolean) : [],
            correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : null,
            explanation: typeof q.explanation === "string" ? q.explanation : "",
            subject: subject || "Vật lý",
            grade: grade || "10",
            difficulty: "MEDIUM",
            topic: "",
            status: "ACTIVE",
            createdBy: userId,
            learningObjectives: [],
            keywords: [],
            tags: [],
          },
        })
        createdInlineIds.push(newQ.id)
        const pts = Number(q.points)
        normalized.push({
          order: normalized.length + 1,
          points: Number.isFinite(pts) ? Math.max(0, pts) : 1,
          content,
          options: Array.isArray(q.options) ? q.options.map((v: any) => String(v).trim()).filter(Boolean) : [],
          correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : null,
          explanation: typeof q.explanation === "string" ? q.explanation : "",
          questionType: typeof q.questionType === "string" ? q.questionType : "ESSAY",
          questionId: newQ.id,
          isNew: true,
        })
      }

      // Re-index orders
      normalized.forEach((q, i) => { q.order = i + 1 })

      const txOps: any[] = []

      if (deleteIds.length > 0) {
        txOps.push(
          (prisma as any).examQuestion.deleteMany({
            where: { id: { in: deleteIds } },
          })
        )
      }

      for (const q of normalized) {
        if (!q.isNew) {
          txOps.push(
            (prisma as any).question.update({
              where: { id: q.questionId },
              data: {
                content: q.content,
                options: q.options,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                questionType: q.questionType,
              },
            })
          )
        }

        if (q.id) {
          txOps.push(
            (prisma as any).examQuestion.update({
              where: { id: q.id },
              data: {
                order: q.order,
                points: q.points,
              },
            })
          )
        } else {
          txOps.push(
            (prisma as any).examQuestion.create({
              data: {
                examId: existing.id,
                questionId: q.questionId,
                order: q.order,
                points: q.points,
              },
            })
          )
        }
      }

      if (txOps.length > 0) {
        await (prisma as any).$transaction(txOps)
      }

      examUpdateData.totalQuestions = normalized.length
      examUpdateData.totalScore = normalized.reduce((sum, q) => sum + q.points, 0)
    }

    await (prisma as any).exam.update({
      where: { id: existing.id },
      data: examUpdateData,
    })

    if (existing.matrixId && typeof (prisma as any).examMatrix?.update === "function") {
      const matrixData: Record<string, unknown> = {}
      if (typeof subject === "string" && subject.trim()) matrixData.subject = subject.trim()
      if (typeof grade === "string" && grade.trim()) matrixData.grade = grade.trim()
      if (Object.keys(matrixData).length > 0) {
        await (prisma as any).examMatrix.update({
          where: { id: existing.matrixId },
          data: matrixData,
        }).catch(() => undefined)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Exam updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating exam:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update exam" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/exams/[id]
 * Backward-compatible delete endpoint.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureAuth()
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (typeof (prisma as any).exam?.findFirst !== "function") {
      return NextResponse.json(
        { success: false, error: "Schema chưa đồng bộ. Chạy: npx prisma generate && npx prisma db push" },
        { status: 500 }
      )
    }

    const { id } = await params
    const existing = await (prisma as any).exam.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Exam not found" },
        { status: 404 }
      )
    }

    await (prisma as any).exam.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({
      success: true,
      message: "Exam deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting exam:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete exam" },
      { status: 500 }
    )
  }
}
