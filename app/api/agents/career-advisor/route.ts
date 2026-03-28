import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { careerAdvisor } from "@/lib/agents/career-advisor"
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
    const { action } = body

    if (action === 'analyze') {
      const result = await careerAdvisor.analyzeAndRecommend(session.user.id)
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'connect-alumni') {
      const { career } = body
      const result = await careerAdvisor.connectWithAlumni(career, session.user.id)
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Career advisor error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    )
  }
}
