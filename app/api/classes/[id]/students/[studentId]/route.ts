import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// DELETE /api/classes/[id]/students/[studentId] - Remove student from class
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, studentId } = await params
    // Verify class ownership
    const classData = await prisma.class.findUnique({
      where: { id },
    })

    if (!classData) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      )
    }

    if (classData.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Find and delete ClassStudent record
    const classStudent = await prisma.classStudent.findFirst({
      where: {
        classId: id,
        studentId,
      },
    })

    if (!classStudent) {
      return NextResponse.json(
        { error: "Student not found in class" },
        { status: 404 }
      )
    }

    await prisma.classStudent.delete({
      where: { id: classStudent.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing student:", error)
    return NextResponse.json(
      { error: "Failed to remove student" },
      { status: 500 }
    )
  }
}
