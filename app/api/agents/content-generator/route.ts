import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { contentGenerator } from "@/lib/agents/content-generator"
import { checkAISubscription } from "@/lib/subscription-check"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Subscription check for AI features
    const subscriptionCheck = await checkAISubscription(session.user.id)
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: subscriptionCheck.message,
          plan: subscriptionCheck.plan,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { action, subject, grade, topic, duration, content } = body

    if (action === 'generate-lesson-plan') {
      const lessonPlan = await contentGenerator.generateLessonPlan(
        subject,
        grade,
        topic,
        duration || 45
      )

      return NextResponse.json({
        success: true,
        data: { lessonPlan }
      })
    }

    if (action === 'generate-slides') {
      const slides = await contentGenerator.generateSlides(content)
      return NextResponse.json({
        success: true,
        data: { slides }
      })
    }

    if (action === 'generate-quiz') {
      const quiz = await contentGenerator.generateQuiz(topic, body.count || 10)
      return NextResponse.json({
        success: true,
        data: { quiz }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Content generator error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Subscription check for AI features
    const subscriptionCheck = await checkAISubscription(session.user.id)
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: subscriptionCheck.message,
          plan: subscriptionCheck.plan,
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    if (action === 'templates') {
      // Return lesson plan templates
      return NextResponse.json({
        success: true,
        data: {
          templates: [
            { id: '1', name: 'Giáo án chuẩn CV 2018', type: 'lesson-plan' },
            { id: '2', name: 'Bài giảng điện tử', type: 'slides' },
            { id: '3', name: 'Kiểm tra 15 phút', type: 'quiz' },
          ]
        }
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Content generator error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get templates" },
      { status: 500 }
    )
  }
}
