import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { generateTexFromQuestions } from "@/lib/latex-export";

// POST /api/latex-projects/export-from-exam - Create LaTeX project from exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { examId } = body;
    if (!examId || typeof examId !== "string") {
      return NextResponse.json(
        { error: "examId is required" },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, userId: session.user.id },
      include: {
        examQuestions: {
          orderBy: { order: "asc" },
          include: { Question: true },
        },
      },
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const questions = exam.examQuestions.map((eq) => ({
      id: eq.Question.id,
      content: eq.Question.content,
      options: eq.Question.options,
      correctAnswer: eq.Question.correctAnswer,
      questionType: eq.Question.questionType,
    }));

    const title = `Đề thi - ${exam.title}`;
    const subtitle = `${exam.examType} | ${exam.totalQuestions} câu | ${exam.duration} phút`;
    const mainContent = generateTexFromQuestions(title, subtitle, questions);

    const project = await prisma.latexProject.create({
      data: {
        userId: session.user.id,
        title: title.slice(0, 500),
        mainContent,
      },
    });

    return NextResponse.json({
      id: project.id,
      title: project.title,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[latex-projects/export-from-exam]", error);
    return NextResponse.json(
      { error: "Failed to export from exam" },
      { status: 500 }
    );
  }
}
