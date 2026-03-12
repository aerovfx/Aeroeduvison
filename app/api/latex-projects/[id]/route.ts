import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";
import { canEditProject, canViewProject, createVersion } from "@/lib/latex-project-access";

async function getProject(id: string) {
  return prisma.latexProject.findUnique({
    where: { id },
  });
}

// GET /api/latex-projects/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const canView = await canViewProject(id, session.user.id);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      mainContent: project.mainContent,
      folderId: project.folderId,
      extraFiles: project.extraFiles,
      isOwner: project.userId === session.user.id,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[latex-projects] GET [id]", error);
    return NextResponse.json(
      { error: "Failed to get LaTeX project" },
      { status: 500 }
    );
  }
}

// PUT /api/latex-projects/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const canEdit = await canEditProject(id, session.user.id);
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { title, mainContent, folderId, extraFiles } = body;

    const data: { title?: string; mainContent?: string; folderId?: string | null; extraFiles?: unknown } = {};
    if (title !== undefined) data.title = String(title).slice(0, 500);
    if (mainContent !== undefined) data.mainContent = typeof mainContent === "string" ? mainContent : project.mainContent;
    if (folderId !== undefined) data.folderId = folderId || null;
    if (extraFiles !== undefined) data.extraFiles = extraFiles;

    const updated = await prisma.latexProject.update({
      where: { id },
      data,
    });

    if (mainContent !== undefined || title !== undefined) {
      await createVersion(id, {
        mainContent: updated.mainContent,
        titleSnapshot: updated.title,
        trigger: "save",
      }).catch(() => {});
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      mainContent: updated.mainContent,
      folderId: updated.folderId,
      extraFiles: updated.extraFiles,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[latex-projects] PUT [id]", error);
    return NextResponse.json(
      { error: "Failed to update LaTeX project" },
      { status: 500 }
    );
  }
}

// DELETE /api/latex-projects/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const project = await getProject(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const canEdit = await canEditProject(id, session.user.id);
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (project.userId !== session.user.id) {
      return NextResponse.json({ error: "Only owner can delete project" }, { status: 403 });
    }

    await prisma.latexProject.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[latex-projects] DELETE [id]", error);
    return NextResponse.json(
      { error: "Failed to delete LaTeX project" },
      { status: 500 }
    );
  }
}
