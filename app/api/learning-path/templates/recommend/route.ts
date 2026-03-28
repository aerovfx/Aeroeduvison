import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

interface SurveyData {
  interestedDomains?: string[]
  strongSubjects?: string[]
  primaryGoal?: string
  academicLevel?: string
  preferredDifficulty?: string
  weeklyHours?: string
}

interface TemplateWithScore {
  id: string
  title: string
  description?: string | null
  imageUrl?: string | null
  createdById: string
  goals: any
  domains: any
  segments: any
  weeklyPlan: any
  metadata: any
  targetAcademicLevels: any
  targetGoalTypes: any
  targetDomains: any
  difficultyLevel: string
  estimatedWeeks: number
  weeklyHoursRequired: string
  isPublished: boolean
  rating: number
  enrollmentCount: number
  completionRate: number
  category?: string | null
  tags: any
  createdAt: Date
  updatedAt: Date
  createdBy: {
    id: string
    name: string | null
    email: string | null
  }
  learningPaths?: any[]
  matchScore: number
  matchReasons: string[]
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { surveyData } = body

    if (!surveyData) {
      return NextResponse.json(
        { error: "Survey data is required" },
        { status: 400 }
      )
    }

    // Fetch all published templates
    const allTemplates = await db.learningPathTemplate.findMany({
      where: { isPublished: true },
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

    // Calculate match scores for each template
    const templatesWithScores: TemplateWithScore[] = allTemplates.map(
      (template: any) => {
        let matchScore = 0
        const matchReasons: string[] = []

        // 1. Domain match (40%)
        const studentDomains = [
          ...(surveyData.interestedDomains || []),
          ...(surveyData.strongSubjects || []),
        ]
        const templateDomains = (template.targetDomains || []) as string[]

        if (studentDomains.length > 0 && templateDomains.length > 0) {
          const domainOverlap = studentDomains.filter((d: string) =>
            templateDomains.includes(d)
          ).length

          const domainScore =
            (domainOverlap / Math.max(studentDomains.length, templateDomains.length)) *
            40

          matchScore += domainScore

          if (domainScore > 0) {
            matchReasons.push(
              `Domain match: ${domainOverlap} overlapping subject(s)`
            )
          }
        }

        // 2. Goal type match (25%)
        const studentGoal = surveyData.primaryGoal
        const templateGoalTypes = (template.targetGoalTypes || []) as string[]

        if (
          studentGoal &&
          templateGoalTypes.length > 0 &&
          templateGoalTypes.includes(studentGoal)
        ) {
          const goalScore = 25
          matchScore += goalScore
          matchReasons.push(`Goal alignment: matches your primary goal`)
        }

        // 3. Academic level match (20%)
        const studentLevel = surveyData.academicLevel
        const templateLevels = (template.targetAcademicLevels || []) as string[]

        if (
          studentLevel &&
          templateLevels.length > 0 &&
          templateLevels.includes(studentLevel)
        ) {
          const levelScore = 20
          matchScore += levelScore
          matchReasons.push(`Academic level: matches your level`)
        }

        // 4. Difficulty level match (10%)
        const studentDifficulty = surveyData.preferredDifficulty
        const templateDifficulty = template.difficultyLevel

        if (
          studentDifficulty &&
          studentDifficulty === templateDifficulty
        ) {
          const difficultyScore = 10
          matchScore += difficultyScore
          matchReasons.push(`Difficulty: matches your preference`)
        }

        // 5. Weekly hours match (5%)
        const studentHours = surveyData.weeklyHours
        const templateHours = template.weeklyHoursRequired

        if (
          studentHours &&
          studentHours === templateHours
        ) {
          const hoursScore = 5
          matchScore += hoursScore
          matchReasons.push(`Time commitment: matches your availability`)
        }

        return {
          ...template,
          matchScore: Math.min(100, matchScore),
          matchReasons,
        }
      }
    )

    // Sort by match score descending
    templatesWithScores.sort((a, b) => b.matchScore - a.matchScore)

    // Filter out templates with 0 match score (optional)
    const recommendedTemplates = templatesWithScores.filter(
      (t) => t.matchScore > 0
    )

    return NextResponse.json({
      recommendations: recommendedTemplates,
      count: recommendedTemplates.length,
    })
  } catch (error) {
    console.error("Error getting recommendations:", error)
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    )
  }
}
