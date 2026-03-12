import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { studyPlanner } from "@/lib/agents/study-planner"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")

    if (action === "stats") {
      const stats = await studyPlanner.getStudyStats(session.user.id)
      return NextResponse.json({ success: true, data: stats })
    } else if (action === "reminders") {
      const reminders = await studyPlanner.generateDailyReminders(session.user.id)
      return NextResponse.json({ success: true, data: reminders })
    } else {
      const plan = await studyPlanner.getStudyPlan(session.user.id)
      return NextResponse.json({ success: true, data: { plan } })
    }
  } catch (error: any) {
    console.error("Study planner error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get study plan" },
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

    const body = await req.json()
    const { action, goal, targetScore, deadline, weeklyHours, sessionId, completed, notes } = body

    if (action === "create") {
      const plan = await studyPlanner.createStudyPlan(
        session.user.id,
        goal,
        targetScore,
        new Date(deadline),
        weeklyHours
      )
      return NextResponse.json({ success: true, data: { plan } })
    } else if (action === "update-session") {
      await studyPlanner.updateSessionProgress(sessionId, completed, notes)
      return NextResponse.json({ success: true })
    } else if (action === "send-reminders") {
      // Admin/teacher only
      if (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const result = await studyPlanner.runDailyReminders()
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Study planner POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    )
  }
}
