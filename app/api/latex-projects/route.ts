import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db as prisma } from "@/lib/db";

// GET /api/latex-projects - List projects for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const whereAccess = {
      OR: [
        { userId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } },
      ],
    };
    const [projects, total] = await Promise.all([
      prisma.latexProject.findMany({
        where: whereAccess,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          folderId: true,
          userId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.latexProject.count({ where: whereAccess }),
    ]);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        folderId: p.folderId,
        isOwner: p.userId === session.user.id,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error("[latex-projects] GET", error);
    return NextResponse.json(
      { error: "Failed to list LaTeX projects" },
      { status: 500 }
    );
  }
}

// POST /api/latex-projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { title = "Tài liệu LaTeX mới", mainContent = "", folderId } = body;

    const project = await prisma.latexProject.create({
      data: {
        userId: session.user.id,
        title: String(title).slice(0, 500),
        mainContent: typeof mainContent === "string" ? mainContent : "",
        folderId: folderId || null,
      },
    });

    return NextResponse.json({
      id: project.id,
      title: project.title,
      mainContent: project.mainContent,
      folderId: project.folderId,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("[latex-projects] POST", error);
    return NextResponse.json(
      { error: "Failed to create LaTeX project" },
      { status: 500 }
    );
  }
}
