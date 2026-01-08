import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/classes - List classes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if prisma.class exists (Prisma client might need regeneration)
    if (!prisma.class) {
      console.error("❌ [CLASSES_API] Prisma client missing 'class' model. Run: npx prisma generate")
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }

    const classes = await prisma.class.findMany({
      where: {
        teacherId: session.user.id,
      },
      include: {
        students: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      classes: classes.map((cls) => ({
        id: cls.id,
        name: cls.name,
        grade: cls.grade,
        schoolYear: cls.schoolYear,
        description: cls.description,
        studentCount: cls.students.length,
        createdAt: cls.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Error fetching classes:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.message?.includes("findMany") ||
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED",
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch classes" },
      { status: 500 }
    )
  }
}

// POST /api/classes - Create new class
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, grade, schoolYear, description } = body

    if (!name || !grade || !schoolYear) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if prisma.class exists
    if (!prisma.class) {
      console.error("❌ [CLASSES_API] Prisma client missing 'class' model. Run: npx prisma generate")
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED"
        },
        { status: 500 }
      )
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        grade,
        schoolYear,
        description: description || "",
        teacherId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      class: {
        id: newClass.id,
        name: newClass.name,
        grade: newClass.grade,
        schoolYear: newClass.schoolYear,
      },
    })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Error creating class:", error)
    
    // Check for Prisma schema errors
    if (error.message?.includes("Cannot read properties of undefined") || 
        error.message?.includes("create") ||
        error.code === "P2001" || 
        error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Database schema not synced. Please run: npx prisma generate && npx prisma db push",
          code: "PRISMA_SCHEMA_NOT_SYNCED",
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create class" },
      { status: 500 }
    )
  }
}
