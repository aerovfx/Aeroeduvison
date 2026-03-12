import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { compileLatexToPdf } from "@/lib/latex-compile";
import { canEditProject, createVersion } from "@/lib/latex-project-access";

const MAX_CONTENT_LENGTH = 500_000; // ~500KB

// POST /api/latex-projects/compile - Compile LaTeX to PDF
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { projectId, content: rawContent } = body;

    let content: string;
    let project: { mainContent: string; title: string } | null = null;
    if (projectId) {
      const proj = await prisma.latexProject.findUnique({
        where: { id: projectId },
      });
      if (!proj) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      const canEdit = await canEditProject(projectId, session.user.id);
      if (!canEdit) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      project = { mainContent: proj.mainContent ?? "", title: proj.title };
      content = project.mainContent;
    } else if (typeof rawContent === "string") {
      content = rawContent;
    } else {
      return NextResponse.json(
        { error: "Provide projectId or content" },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Content too long", maxLength: MAX_CONTENT_LENGTH },
        { status: 400 }
      );
    }

    const result = await compileLatexToPdf(content);

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          code: result.code ?? "COMPILE_ERROR",
          log: result.log,
        },
        { status: result.code === "COMPILE_NOT_AVAILABLE" ? 503 : 422 }
      );
    }

    if (!result.pdf) {
      return NextResponse.json(
        { error: "No PDF produced", log: result.log },
        { status: 422 }
      );
    }

    if (projectId && project) {
      await createVersion(projectId, {
        mainContent: content,
        titleSnapshot: project.title,
        trigger: "compile",
      }).catch(() => {});
    }

    return new NextResponse(result.pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="output.pdf"',
      },
    });
  } catch (e) {
    console.error("[latex-projects/compile]", e);
    return NextResponse.json(
      { error: "Compilation failed" },
      { status: 500 }
    );
  }
}
