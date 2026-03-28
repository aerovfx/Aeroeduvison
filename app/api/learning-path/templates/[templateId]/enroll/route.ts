import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { templateId } = await params

    // Get the template
    const template = await db.learningPathTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        goals: true,
        domains: true,
        segments: true,
        weeklyPlan: true,
        metadata: true,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // Check if student already has an active learning path from this template
    const existingPath = await db.learningPath.findFirst({
      where: {
        studentId: session.user.id,
        templateId: templateId,
        status: { not: "completed" },
      },
    })

    if (existingPath) {
      return NextResponse.json(
        { error: "You already have an active learning path from this template" },
        { status: 409 }
      )
    }

    // Create a learning path from the template
    const learningPath = await db.learningPath.create({
      data: {
        studentId: session.user.id,
        templateId: templateId,
        title: template.title,
        description: template.description,
        goals: template.goals,
        domains: template.domains,
        segments: template.segments,
        weeklyPlan: template.weeklyPlan,
        metadata: template.metadata,
        status: "active", // Automatically approved, no review needed
        progress: 0,
        startedAt: new Date(),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        template: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    // Increment enrollment count on template
    await db.learningPathTemplate.update({
      where: { id: templateId },
      data: {
        enrollmentCount: {
          increment: 1,
        },
      },
    })

    return NextResponse.json(
      {
        learningPath,
        message: "Successfully enrolled in learning path template",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error enrolling in template:", error)
    return NextResponse.json(
      { error: "Failed to enroll in template" },
      { status: 500 }
    )
  }
}
