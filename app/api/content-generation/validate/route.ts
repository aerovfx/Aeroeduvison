import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createContentValidator } from "@/lib/ai/quality/content-validator"
import { ContentGeneratorService } from "@/lib/ai/services/content-generator"

// POST /api/content-generation/validate - Validate generated content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only teachers and admins can validate content
    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only teachers and admins can validate content" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      contentType, // 'lesson' | 'quiz' | 'slides'
      content, // Generated content object
      context // { subject, grade, topic, curriculum? }
    } = body

    if (!contentType || !content || !context) {
      return NextResponse.json(
        { error: "Missing required fields: contentType, content, context" },
        { status: 400 }
      )
    }

    const validator = createContentValidator()

    let validationResult

    switch (contentType) {
      case 'lesson':
        validationResult = await validator.validateLesson(content, {
          subject: context.subject,
          grade: context.grade,
          topic: context.topic,
          curriculum: context.curriculum || 'Vietnam GDPT 2018',
        })
        break

      case 'quiz':
        validationResult = await validator.validateQuiz(content, {
          subject: context.subject,
          grade: context.grade,
          topic: context.topic,
        })
        break

      case 'slides':
        validationResult = await validator.validateSlides(content, {
          subject: context.subject,
          grade: context.grade,
          topic: context.topic,
        })
        break

      default:
        return NextResponse.json(
          { error: `Invalid contentType: ${contentType}. Must be 'lesson', 'quiz', or 'slides'` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      validation: {
        passed: validationResult.passed,
        canPublish: validationResult.canPublish,
        overallScore: validationResult.score.overall,
        dimensions: validationResult.score.dimensions,
        curriculumCompliance: {
          aligned: validationResult.curriculumCompliance.aligned,
          score: validationResult.curriculumCompliance.complianceScore,
          issues: validationResult.curriculumCompliance.issues,
        },
        biasDetection: {
          detected: validationResult.biasDetection.detected,
          types: validationResult.biasDetection.types,
          severity: validationResult.biasDetection.severity,
          recommendations: validationResult.biasDetection.recommendations,
        },
        readability: validationResult.score.readability,
        issues: validationResult.score.issues,
        warnings: validationResult.warnings,
        errors: validationResult.errors,
        recommendations: validationResult.score.recommendations,
      },
    })
  } catch (error: any) {
    console.error("Error validating content:", error)
    return NextResponse.json(
      { error: error.message || "Failed to validate content" },
      { status: 500 }
    )
  }
}
