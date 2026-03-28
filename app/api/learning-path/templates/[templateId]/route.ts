import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params

    const template = await db.learningPathTemplate.findUnique({
      where: { id: templateId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        learningPaths: {
          select: {
            id: true,
            studentId: true,
            status: true,
          },
          take: 10,
        },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { templateId } = await params

    // Get the template first to check ownership
    const template = await db.learningPathTemplate.findUnique({
      where: { id: templateId },
      select: { createdById: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Check if user is creator or admin
    if (
      template.createdById !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only creator or admin can update this template" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const updatedTemplate = await db.learningPathTemplate.update({
      where: { id: templateId },
      data: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        goals: body.goals,
        domains: body.domains,
        segments: body.segments,
        weeklyPlan: body.weeklyPlan,
        metadata: body.metadata,
        targetAcademicLevels: body.targetAcademicLevels,
        targetGoalTypes: body.targetGoalTypes,
        targetDomains: body.targetDomains,
        difficultyLevel: body.difficultyLevel,
        estimatedWeeks: body.estimatedWeeks,
        weeklyHoursRequired: body.weeklyHoursRequired,
        category: body.category,
        tags: body.tags,
        isPublished: body.isPublished,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      template: updatedTemplate,
      message: "Template updated successfully",
    })
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { templateId } = await params

    // Get the template first to check ownership
    const template = await db.learningPathTemplate.findUnique({
      where: { id: templateId },
      select: { createdById: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Check if user is creator or admin
    if (
      template.createdById !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only creator or admin can delete this template" },
        { status: 403 }
      )
    }

    await db.learningPathTemplate.delete({
      where: { id: templateId },
    })

    return NextResponse.json(
      { message: "Template deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    )
  }
}
