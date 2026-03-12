import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { canViewProject, canEditProject } from "@/lib/latex-project-access";

const MAX_LIST = 50;

// GET /api/latex-projects/[id]/versions - List version history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: projectId } = await params;

    const canView = await canViewProject(projectId, session.user.id);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const versions = await prisma.latexProjectVersion.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: MAX_LIST,
      select: {
        id: true,
        titleSnapshot: true,
        trigger: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        titleSnapshot: v.titleSnapshot,
        trigger: v.trigger,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[latex-projects/versions] GET", error);
    return NextResponse.json(
      { error: "Failed to list versions" },
      { status: 500 }
    );
  }
}
