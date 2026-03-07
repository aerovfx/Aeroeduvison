import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/exam-matrices/[id] - Get matrix details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const matrix = await prisma.examMatrix.findUnique({
      where: { id: params.id },
      include: {
        topics: {
          include: {
            distributions: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        processingLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!matrix) {
      return NextResponse.json(
        { error: "Matrix not found" },
        { status: 404 }
      )
    }

    if (matrix.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    return NextResponse.json({ matrix })
  } catch (error: any) {
    console.error("Get matrix error:", error)
    return NextResponse.json(
      { error: "Failed to fetch matrix" },
      { status: 500 }
    )
  }
}

// DELETE /api/exam-matrices/[id] - Delete matrix
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const matrix = await prisma.examMatrix.findUnique({
      where: { id: params.id },
    })

    if (!matrix) {
      return NextResponse.json(
        { error: "Matrix not found" },
        { status: 404 }
      )
    }

    if (matrix.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Delete matrix (cascade will delete topics and distributions)
    await prisma.examMatrix.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete error:", error)
    return NextResponse.json(
      { error: "Failed to delete matrix" },
      { status: 500 }
    )
  }
}
