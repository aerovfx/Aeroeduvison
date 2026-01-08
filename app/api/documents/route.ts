import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const path = searchParams.get("path")

    const where: any = {
      userId: session.user.id,
    }

    if (status && status !== "Tất cả") {
      where.status = status
    }

    if (path) {
      // Find folder by path
      const folder = await prisma.documentFolder.findFirst({
        where: {
          userId: session.user.id,
          path: path,
        },
      })
      if (folder) {
        where.folderId = folder.id
      }
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        folder: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        displayName: doc.displayName,
        type: doc.type,
        status: doc.status,
        createdAt: doc.createdAt.toISOString(),
        executionTime: doc.executionTime,
        folderPath: doc.folder?.path,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}
