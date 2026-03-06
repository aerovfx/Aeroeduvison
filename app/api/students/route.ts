import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/students - List students
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role") || "STUDENT"
    const search = searchParams.get("search")

    const where: any = {
      role: role,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { idNumber: { contains: search } },
      ]
    }

    const students = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        idNumber: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 1000, // Limit to prevent too large results
    })

    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        idNumber: student.idNumber,
        dateOfBirth: student.dateOfBirth?.toISOString(),
        gender: student.gender,
        role: student.role,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}
