import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/classes/[id]/students - Get students in class
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify class ownership
    const classData = await prisma.class.findUnique({
      where: { id: params.id },
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

    const classStudents = await prisma.classStudent.findMany({
      where: {
        classId: params.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            idNumber: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
      orderBy: [
        { studentNumber: "asc" },
        { enrollmentDate: "asc" },
      ],
    })

    return NextResponse.json({
      students: classStudents.map((cs) => ({
        id: cs.id,
        studentId: cs.studentId,
        student: cs.student,
        studentNumber: cs.studentNumber,
        attendanceRate: cs.attendanceRate,
        averageScore: cs.averageScore,
        totalXP: cs.totalXP,
        completedExams: cs.completedExams,
        passedExams: cs.passedExams,
        status: cs.status,
        enrollmentDate: cs.enrollmentDate.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Error fetching class students:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch students" },
      { status: 500 }
    )
  }
}

// POST /api/classes/[id]/students - Add students to class
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify class ownership
    const classData = await prisma.class.findUnique({
      where: { id: params.id },
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

    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid studentIds" },
        { status: 400 }
      )
    }

    // Get current student count to assign student numbers
    const currentCount = await prisma.classStudent.count({
      where: { classId: params.id },
    })

    // Check which students are already in the class
    const existingStudents = await prisma.classStudent.findMany({
      where: {
        classId: params.id,
        studentId: { in: studentIds },
      },
    })

    const existingStudentIds = new Set(
      existingStudents.map((es) => es.studentId)
    )
    const newStudentIds = studentIds.filter(
      (id: string) => !existingStudentIds.has(id)
    )

    if (newStudentIds.length === 0) {
      return NextResponse.json(
        { error: "Tất cả học sinh đã có trong lớp" },
        { status: 400 }
      )
    }

    // Verify students exist and are STUDENT role
    const students = await prisma.user.findMany({
      where: {
        id: { in: newStudentIds },
        role: "STUDENT",
      },
    })

    if (students.length !== newStudentIds.length) {
      return NextResponse.json(
        { error: "Một số học sinh không hợp lệ" },
        { status: 400 }
      )
    }

    // Add students to class
    const classStudents = await prisma.classStudent.createMany({
      data: newStudentIds.map((studentId: string, index: number) => ({
        classId: params.id,
        studentId,
        studentNumber: currentCount + index + 1,
        status: "active",
      })),
    })

    return NextResponse.json({
      success: true,
      added: classStudents.count,
      message: `Đã thêm ${classStudents.count} học sinh vào lớp`,
    })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Error adding students:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to add students" },
      { status: 500 }
    )
  }
}
