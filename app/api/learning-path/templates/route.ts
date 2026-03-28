import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const domain = searchParams.get("domain")
    const difficulty = searchParams.get("difficulty")
    const search = searchParams.get("search")

    // Build where clause
    const where: any = {
      isPublished: true,
    }

    if (category) {
      where.category = category
    }

    if (difficulty) {
      where.difficultyLevel = difficulty
    }

    if (domain) {
      where.targetDomains = {
        hasSome: [domain],
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const templates = await db.learningPathTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ rating: "desc" }, { enrollmentCount: "desc" }],
    })

    return NextResponse.json({
      templates,
      count: templates.length,
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is TEACHER or ADMIN
    if (!["TEACHER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Only teachers and admins can create templates" },
        { status: 403 }
      )
    }

    const body = await request.json()

    const {
      title,
      description,
      imageUrl,
      goals,
      domains,
      segments,
      weeklyPlan,
      metadata,
      targetAcademicLevels,
      targetGoalTypes,
      targetDomains,
      difficultyLevel,
      estimatedWeeks,
      weeklyHoursRequired,
      category,
      tags,
    } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const template = await db.learningPathTemplate.create({
      data: {
        title,
        description,
        imageUrl,
        createdById: session.user.id,
        goals: goals || [],
        domains: domains || [],
        segments: segments || [],
        weeklyPlan: weeklyPlan || [],
        metadata: metadata || {},
        targetAcademicLevels: targetAcademicLevels || [],
        targetGoalTypes: targetGoalTypes || [],
        targetDomains: targetDomains || [],
        difficultyLevel: difficultyLevel || "balanced",
        estimatedWeeks: estimatedWeeks || 4,
        weeklyHoursRequired: weeklyHoursRequired || "moderate",
        category,
        tags: tags || [],
        isPublished: false,
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

    return NextResponse.json(
      { template, message: "Template created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    )
  }
}
