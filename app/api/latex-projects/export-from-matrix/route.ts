import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { generateTexFromQuestions } from "@/lib/latex-export";

// POST /api/latex-projects/export-from-matrix - Create LaTeX project from exam matrix
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { matrixId } = body;
    if (!matrixId || typeof matrixId !== "string") {
      return NextResponse.json(
        { error: "matrixId is required" },
        { status: 400 }
      );
    }

    const matrix = await prisma.examMatrix.findFirst({
      where: { id: matrixId, userId: session.user.id },
      include: {
        selectedQuestions: {
          orderBy: { createdAt: "asc" },
          include: {
            Question: true,
          },
        },
      },
    });
    if (!matrix) {
      return NextResponse.json({ error: "Matrix not found" }, { status: 404 });
    }

    const questions = matrix.selectedQuestions.map((sq) => ({
      id: sq.Question.id,
      content: sq.Question.content,
      options: sq.Question.options,
      correctAnswer: sq.Question.correctAnswer,
      questionType: sq.Question.questionType,
    }));

    const title = `Đề thi - ${matrix.name}`;
    const subtitle = `Khối ${matrix.grade} | ${matrix.examType} | ${matrix.totalQuestions} câu`;
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
    console.error("[latex-projects/export-from-matrix]", error);
    return NextResponse.json(
      { error: "Failed to export from matrix" },
      { status: 500 }
    );
  }
}
