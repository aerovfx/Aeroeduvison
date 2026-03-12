import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { adminAnalytics } from "@/lib/agents/admin-analytics"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const metric = searchParams.get("metric")

    if (metric === "usage") {
      const usage = await adminAnalytics.getAgentUsage()
      return NextResponse.json({ success: true, data: { usage } })
    } else if (metric === "cost") {
      const days = parseInt(searchParams.get("days") || "30")
      const cost = await adminAnalytics.getCostBreakdown(days)
      return NextResponse.json({ success: true, data: { cost } })
    } else if (metric === "performance") {
      const perf = await adminAnalytics.getPerformanceMetrics()
      return NextResponse.json({ success: true, data: { perf } })
    } else if (metric === "engagement") {
      const engagement = await adminAnalytics.getUserEngagement()
      return NextResponse.json({ success: true, data: { engagement } })
    } else if (metric === "alerts") {
      const alerts = await adminAnalytics.getSystemAlerts()
      return NextResponse.json({ success: true, data: { alerts } })
    } else {
      const overview = await adminAnalytics.getSystemOverview()
      return NextResponse.json({ success: true, data: { overview } })
    }
  } catch (error: any) {
    console.error("Admin analytics error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get analytics" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === "hourly-update") {
      const result = await adminAnalytics.runHourlyUpdate()
      return NextResponse.json({ success: true, data: result })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error: any) {
    console.error("Admin POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    )
  }
}
