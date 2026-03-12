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

// GET /api/latex-projects/[id]/collaborators
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

    const project = await prisma.latexProject.findUnique({
      where: { id: projectId },
      include: {
        collaborators: {
          include: {
            User: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const owner = project.userId === session.user.id;
    const isCollab = project.collaborators.some((c) => c.userId === session.user.id);
    if (!owner && !isCollab) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      collaborators: project.collaborators.map((c) => ({
        userId: c.userId,
        email: c.User.email,
        name: c.User.name,
        role: c.role,
        createdAt: c.createdAt.toISOString(),
      })),
      isOwner: owner,
    });
  } catch (error) {
    console.error("[latex-projects/collaborators] GET", error);
    return NextResponse.json(
      { error: "Failed to list collaborators" },
      { status: 500 }
    );
  }
}

// POST /api/latex-projects/[id]/collaborators - Add collaborator
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

    if (!(await isOwner(projectId, session.user.id))) {
      return NextResponse.json({ error: "Only owner can add collaborators" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { userId, email, role = "VIEW" } = body;
    const targetUserId = userId || (email ? (await prisma.user.findUnique({ where: { email: String(email) }, select: { id: true } }))?.id : null);
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Provide userId or email of user to add" },
        { status: 400 }
      );
    }
    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot add yourself as collaborator" }, { status: 400 });
    }

    const project = await prisma.latexProject.findUnique({ where: { id: projectId }, select: { userId: true } });
    if (project?.userId === targetUserId) {
      return NextResponse.json({ error: "Owner is already full access" }, { status: 400 });
    }

    const roleVal = role === "EDIT" ? "EDIT" : "VIEW";
    await prisma.latexProjectCollaborator.upsert({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      create: { projectId, userId: targetUserId, role: roleVal },
      update: { role: roleVal },
    });

    const added = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json({
      userId: targetUserId,
      email: added?.email,
      name: added?.name,
      role: roleVal,
    });
  } catch (error) {
    console.error("[latex-projects/collaborators] POST", error);
    return NextResponse.json(
      { error: "Failed to add collaborator" },
      { status: 500 }
    );
  }
}
