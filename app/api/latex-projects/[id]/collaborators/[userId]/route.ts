import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

async function isOwner(projectId: string, userId: string): Promise<boolean> {
  const p = await prisma.latexProject.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  return p?.userId === userId;
}

// DELETE /api/latex-projects/[id]/collaborators/[userId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: projectId, userId: targetUserId } = await params;

    if (!(await isOwner(projectId, session.user.id))) {
      return NextResponse.json({ error: "Only owner can remove collaborators" }, { status: 403 });
    }

    await prisma.latexProjectCollaborator.deleteMany({
      where: { projectId, userId: targetUserId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[latex-projects/collaborators] DELETE", error);
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}
