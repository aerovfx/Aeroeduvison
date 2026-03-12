import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { canEditProject, createVersion } from "@/lib/latex-project-access";

// POST /api/latex-projects/[id]/versions/restore - Restore a version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: projectId } = await params;

    const canEdit = await canEditProject(projectId, session.user.id);
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { versionId } = body;
    if (!versionId || typeof versionId !== "string") {
      return NextResponse.json(
        { error: "versionId is required" },
        { status: 400 }
      );
    }

    const version = await prisma.latexProjectVersion.findFirst({
      where: { id: versionId, projectId },
    });
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const updated = await prisma.latexProject.update({
      where: { id: projectId },
      data: {
        mainContent: version.mainContent,
        ...(version.titleSnapshot != null && { title: version.titleSnapshot }),
      },
    });

    await createVersion(projectId, {
      mainContent: updated.mainContent,
      titleSnapshot: updated.title,
      trigger: "save",
    }).catch(() => {});

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      mainContent: updated.mainContent,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[latex-projects/versions/restore] POST", error);
    return NextResponse.json(
      { error: "Failed to restore version" },
      { status: 500 }
    );
  }
}
