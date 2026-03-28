import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { progressTracker } from "@/lib/agents/progress-tracker"
import { checkAISubscription } from "@/lib/subscription-check"

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
    const studentId = searchParams.get("studentId")

    // Nếu không có studentId, lấy progress của chính user
    const targetStudentId = studentId || session.user.id

    const progress = await progressTracker.calculateProgress(targetStudentId)

    return NextResponse.json({
      success: true,
      data: { progress },
    })
  } catch (error: any) {
    console.error("Progress tracker error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to calculate progress" },
      { status: 500 }
    )
  }
}

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

    // Chỉ teacher/admin mới có thể chạy daily update
    if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await progressTracker.runDailyUpdate()

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error("Daily update error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to run daily update" },
      { status: 500 }
    )
  }
}
