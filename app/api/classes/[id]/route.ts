import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// GET /api/classes/[id] - Get class details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    return NextResponse.json({ class: classData })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Get class error:", error)
    
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
      { error: error.message || "Failed to fetch class" },
      { status: 500 }
    )
  }
}

// DELETE /api/classes/[id] - Delete class
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Delete class (cascade will delete ClassStudent records)
    await prisma.class.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ [CLASSES_API] Delete class error:", error)
    
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
      { error: error.message || "Failed to delete class" },
      { status: 500 }
    )
  }
}
